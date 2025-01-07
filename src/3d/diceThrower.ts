import { Ray } from "@babylonjs/core/Culling/ray";
import { HavokPlugin, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core/Physics";
import { Engine } from "@babylonjs/core/Engines/engine";
import { type EngineOptions } from "@babylonjs/core/Engines/thinEngine";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { type PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import HavokPhysics from "@babylonjs/havok";

import { rollParts } from "../core/roll";
import type { DiceSystem, Part, RollResult, Status, WithStatus } from "../core/types";
import { uuidv4 } from "../utils/uuid";

import type { DieOptions } from "./options";

// Load side-effects that are not by default loaded with the tree-shaking above
import "@babylonjs/core/Loading";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Materials/PBR/pbrMaterial";
import "@babylonjs/core/Physics/physicsEngineComponent";
import "@babylonjs/core/Physics/v1/physicsEngineComponent";

interface ActiveRoll {
    dieName: string;
    mesh: Mesh;
    resolve: (value: { faceId: number; dieName: string }) => void;
    reject: () => void;
    pickVector?: Vector3;
    done: boolean;
}

export class DiceThrower {
    private loaded = false;
    scene: Scene;

    tresholds = {
        linear: 0.1,
        angular: 0.075,
    };

    freezeOnDecision = true;

    private activeDiceSystem: DiceSystem<Part, unknown> | undefined;

    private meshMap: Map<string, Mesh> = new Map();
    private activeRolls: Map<string, ActiveRoll[]> = new Map();

    constructor(options: {
        scene?: Scene;
        canvas?: HTMLCanvasElement;
        tresholds?: { linear: number; angular: number };
        freezeOnDecision?: boolean;
        antialias?: boolean;
        engineOptions?: EngineOptions;
    }) {
        if (options.scene) {
            this.scene = options.scene;
        } else if (options.canvas) {
            const engine = new Engine(options.canvas, options.antialias, options.engineOptions);
            this.scene = new Scene(engine);
        } else {
            throw new Error("Expected either a scene or a canvas element");
        }
        if (options.tresholds) {
            this.tresholds = options.tresholds;
        }
        if (options.freezeOnDecision) {
            this.freezeOnDecision = options.freezeOnDecision;
        }
    }

    /**
     * Loads the physics engine
     *
     * This NEEDS to be run before any dice throwing can happen.
     */
    async loadPhysics(gravity?: Vector3): Promise<void> {
        const havokInstance = await HavokPhysics();
        const hk = new HavokPlugin(true, havokInstance);
        this.scene.enablePhysics(gravity ?? new Vector3(0, -10, 0), hk);
        this.loaded = true;
    }

    async loadMeshes(meshUrl: string, scene?: Scene): Promise<void> {
        const asyncLoad = await SceneLoader.ImportMeshAsync("", meshUrl, undefined, scene);
        for (const mesh of asyncLoad.meshes) {
            mesh.setEnabled(false);
            mesh.isVisible = true;
            this.meshMap.set(mesh.name, mesh as Mesh);
        }
    }

    async loadSystem(diceSystem: DiceSystem<Part, unknown>): Promise<void> {
        this.activeDiceSystem = diceSystem;
    }

    startRenderLoop(): void {
        this.scene.getEngine().runRenderLoop(() => this.scene.render());
        this.scene.onAfterPhysicsObservable.add(this.checkSolutions.bind(this));
    }

    private checkSolutions(): void {
        for (const [key, activeRolls] of this.activeRolls.entries()) {
            let allDone = true;

            for (const activeRoll of activeRolls) {
                if (activeRoll.done) continue;

                const physicsBody = activeRoll.mesh.physicsBody;
                if (!physicsBody) {
                    console.warn("No physics body found for mesh", activeRoll.mesh.name);
                    this.activeRolls.delete(key);
                    continue;
                }

                const angularVelocity = physicsBody.getAngularVelocity();
                const velocity = physicsBody.getLinearVelocity();

                const isDone =
                    Math.abs(angularVelocity.x) < this.tresholds.angular &&
                    Math.abs(angularVelocity.y) < this.tresholds.angular &&
                    Math.abs(angularVelocity.z) < this.tresholds.angular &&
                    Math.abs(velocity.x) < this.tresholds.linear &&
                    Math.abs(velocity.y) < this.tresholds.linear &&
                    Math.abs(velocity.z) < this.tresholds.linear;

                if (isDone) {
                    activeRoll.done = true;

                    const ray = new Ray(activeRoll.mesh.position, activeRoll.pickVector ?? new Vector3(0, 1, 0), 100);
                    const pickResult = this.scene.pickWithRay(ray);
                    if (pickResult?.hit) {
                        activeRoll.resolve({ faceId: pickResult.faceId, dieName: activeRoll.dieName });
                    } else {
                        activeRoll.reject();
                    }
                } else {
                    allDone = false;
                }
            }
            if (allDone) {
                this.activeRolls.delete(key);
                setTimeout(() => {
                    for (const activeRoll of activeRolls) {
                        activeRoll.mesh.dispose();
                    }
                }, 5000);
            }
        }
    }

    async rollString<Q>(inputString: string, rollOptions?: Q): Promise<RollResult<Part>> {
        if (!this.activeDiceSystem) {
            throw new Error("No dice system loaded. Call .loadSystem() first!");
        }
        return await this.rollParts(this.activeDiceSystem.parse(inputString), rollOptions);
    }

    async rollParts<Q>(parts: WithStatus<Part, Status>[], rollOptions?: Q): Promise<RollResult<Part>> {
        if (!this.activeDiceSystem) {
            throw new Error("No dice system loaded. Call .loadSystem() first!");
        }
        return await rollParts(parts, this.activeDiceSystem, rollOptions);
    }

    async throwDice(
        rolls: { name: string; options?: Omit<DieOptions, "key"> }[],
        defaultOptions?: DieOptions,
    ): Promise<{ results: { faceId: number; dieName: string }[]; key: string }> {
        if (!this.loaded) {
            throw new Error("Physics Engine has not been properly loaded. first call .load()!");
        }

        const key = uuidv4();
        const keyRolls: ActiveRoll[] = [];
        this.activeRolls.set(key, keyRolls);

        const promises: Promise<{ faceId: number; dieName: string }>[] = [];

        for (const roll of rolls) {
            const mesh = this.createDie(roll.name, roll.options ?? defaultOptions);
            promises.push(
                new Promise((resolve, reject) =>
                    keyRolls.push({
                        dieName: roll.name,
                        mesh,
                        resolve,
                        reject,
                        done: false,
                    }),
                ),
            );
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, 50)); // wait 50ms to throw next die
        }

        return { results: await Promise.all(promises), key };
    }

    private createDie(meshName: string, options?: Omit<DieOptions, "die">): Mesh {
        const ogMesh = this.meshMap.get(meshName);
        if (ogMesh === undefined) {
            throw new Error(`Mesh ${meshName} not found`);
        }

        const mesh = ogMesh.clone();
        mesh.setEnabled(true);

        // custom colours
        if (options?.color !== undefined) {
            const newMat = (mesh.material as PBRMaterial).clone(options.color);
            newMat.albedoColor = Color3.FromHexString(options.color);
            mesh.material = newMat;
        }

        const defaultLinearVelocity = new Vector3(Math.random() * 10, 0, Math.random() * 10);
        const defaultAngularVelocity = new Vector3(Math.random() * 4, 0, Math.random() * 4);

        const vectors = options?.physics?.();

        mesh.position = vectors?.position ?? new Vector3(0, 10, 0);
        mesh.rotation = vectors?.rotation ?? new Vector3(
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI
        );
        const agg = new PhysicsAggregate(mesh, PhysicsShapeType.CONVEX_HULL, { mass: 20 });
        agg.body.setLinearVelocity(vectors?.linear ?? defaultLinearVelocity);
        agg.body.setAngularVelocity(vectors?.angular ?? defaultAngularVelocity);
        return mesh;
    }

    remove(key: string): void {
        const activeRolls = this.activeRolls.get(key);
        for (const activeRoll of activeRolls ?? []) {
            activeRoll.mesh.dispose();
            this.activeRolls.delete(key);
        }
    }

    removeAll(): void {
        for (const activeRolls of this.activeRolls.values()) {
            for (const activeRoll of activeRolls) activeRoll.mesh.dispose();
        }
        this.activeRolls.clear();
    }
}
