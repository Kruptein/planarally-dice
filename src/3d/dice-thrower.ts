import { Ray } from "@babylonjs/core/Culling/ray.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { type EngineOptions } from "@babylonjs/core/Engines/thinEngine.js";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader.js";
import { type PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { HavokPlugin, PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core/Physics/index.js";
import { Scene } from "@babylonjs/core/scene.js";
import HavokPhysics from "@babylonjs/havok";

import { uuidv4 } from "../utils/uuid.js";

import type { DieOptions } from "./options.js";

// Load side-effects that are not by default loaded with the tree-shaking above
import "@babylonjs/core/Loading/index.js";
import "@babylonjs/core/Materials/standardMaterial.js";
import "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import "@babylonjs/core/Physics/physicsEngineComponent.js";
import "@babylonjs/core/Physics/v1/physicsEngineComponent.js";

function signed(max: number): number {
    return (Math.random() * 2 - 1) * max;
}

interface DieResult {
    faceId: number;
    dieName: string;
}

interface ThrownDie {
    dieName: string;
    mesh: Mesh;
    resolve: (value: DieResult) => void;
    reject: (reason: Error) => void;
    pickVector?: Vector3;
    done: boolean;
    // Consecutive physics steps the die has been below the velocity tresholds
    stableFrames: number;
}

interface ActiveRoll {
    dice: ThrownDie[];
    // Dice are thrown one by one, a roll can only finish once all of them are in play
    throwing: boolean;
    finished: boolean;
    // While rolling this is the timeout, once finished it removes the dice after `clearAfter`
    timer?: ReturnType<typeof setTimeout>;
}

export class DiceThrower {
    private loaded = false;
    scene: Scene;

    tresholds = {
        angular: 0.075,
        linear: 0.1,
    };
    // A die can briefly be below the tresholds at the top of a bounce
    stableFrames = 10;
    physics = {
        friction: 0.5,
        mass: 20,
        restitution: 0.3,
    };

    clearAfter = 5000;
    timeout = 30_000;

    private meshMap = new Map<string, Mesh>();
    // Keyed by the source material's uniqueId and the colour, shared by all dice using that combination
    private colouredMaterials = new Map<string, PBRMaterial>();
    private activeRolls = new Map<string, ActiveRoll>();
    private checkingSolutions = false;

    constructor(options: {
        scene?: Scene;
        canvas?: HTMLCanvasElement;
        tresholds?: { linear: number; angular: number };
        stableFrames?: number;
        physics?: { mass: number; friction: number; restitution: number };
        clearAfter?: number;
        timeout?: number;
        antialias?: boolean;
        engineOptions?: EngineOptions;
    }) {
        if (options.scene !== undefined) {
            this.scene = options.scene;
        } else if (options.canvas) {
            const engine = new Engine(options.canvas, options.antialias, options.engineOptions);
            this.scene = new Scene(engine);
        } else {
            throw new Error("Expected either a scene or a canvas element");
        }
        if (options.tresholds !== undefined) {
            this.tresholds = options.tresholds;
        }
        if (options.stableFrames !== undefined) {
            this.stableFrames = Math.max(1, options.stableFrames);
        }
        if (options.physics !== undefined) {
            this.physics = options.physics;
        }
        if (options.clearAfter !== undefined) {
            this.clearAfter = options.clearAfter;
        }
        if (options.timeout !== undefined) {
            this.timeout = options.timeout;
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
        // The observable only exists once physics is enabled
        if (!this.checkingSolutions) {
            this.scene.onAfterPhysicsObservable.add(() => this.checkSolutions());
            this.checkingSolutions = true;
        }
        this.loaded = true;
    }

    async loadMeshes(meshUrl: string, scene?: Scene): Promise<void> {
        const asyncLoad = await ImportMeshAsync(meshUrl, scene ?? this.scene);
        for (const mesh of asyncLoad.meshes) {
            mesh.setEnabled(false);
            mesh.isVisible = true;
            this.meshMap.set(mesh.name, mesh as Mesh);
        }
    }

    startRenderLoop(): void {
        this.scene.getEngine().runRenderLoop(() => this.scene.render());
    }

    private checkSolutions(): void {
        for (const [key, roll] of this.activeRolls.entries()) {
            if (roll.finished) continue;

            for (const die of roll.dice) {
                if (die.done) continue;

                const physicsBody = die.mesh.physicsBody;
                if (!physicsBody) {
                    this.discard(key, new Error(`No physics body found for die ${die.dieName}`));
                    break;
                }

                const angularVelocity = physicsBody.getAngularVelocity();
                const velocity = physicsBody.getLinearVelocity();

                const isStill =
                    Math.abs(angularVelocity.x) < this.tresholds.angular &&
                    Math.abs(angularVelocity.y) < this.tresholds.angular &&
                    Math.abs(angularVelocity.z) < this.tresholds.angular &&
                    Math.abs(velocity.x) < this.tresholds.linear &&
                    Math.abs(velocity.y) < this.tresholds.linear &&
                    Math.abs(velocity.z) < this.tresholds.linear;

                die.stableFrames = isStill ? die.stableFrames + 1 : 0;
                if (die.stableFrames < this.stableFrames) continue;

                die.done = true;

                const ray = new Ray(die.mesh.position, die.pickVector ?? new Vector3(0, 1, 0), 100);
                const pickResult = this.scene.pickWithRay(ray, (mesh) => mesh === die.mesh);
                if (pickResult?.hit) {
                    die.resolve({ dieName: die.dieName, faceId: pickResult.faceId });
                } else {
                    die.reject(new Error(`Could not determine the result of die ${die.dieName}`));
                }
            }

            if (!roll.finished && !roll.throwing && roll.dice.every((die) => die.done)) {
                this.finish(key, roll);
            }
        }
    }

    private finish(key: string, roll: ActiveRoll): void {
        roll.finished = true;
        clearTimeout(roll.timer);
        roll.timer = this.clearAfter > 0 ? setTimeout(() => this.remove(key), this.clearAfter) : undefined;
    }

    /**
     * Removes the dice of a roll and rejects any of its dice that haven't settled yet
     */
    private discard(key: string, reason: Error): void {
        const roll = this.activeRolls.get(key);
        if (roll === undefined) return;

        roll.finished = true;
        clearTimeout(roll.timer);
        for (const die of roll.dice) {
            if (!die.done) {
                die.done = true;
                die.reject(reason);
            }
            die.mesh.dispose();
        }
        this.activeRolls.delete(key);
    }

    async throwDice(
        rolls: { name: string; options?: Omit<DieOptions, "key">; pickVector?: Vector3 }[],
        defaultOptions?: DieOptions,
    ): Promise<{ results: DieResult[]; key: string }> {
        if (!this.loaded) {
            throw new Error("Physics Engine has not been properly loaded. first call .loadPhysics()!");
        }

        const key = uuidv4();
        const roll: ActiveRoll = { dice: [], throwing: true, finished: false };
        this.activeRolls.set(key, roll);
        if (this.timeout > 0) {
            roll.timer = setTimeout(
                () => this.discard(key, new Error(`The dice did not settle within ${this.timeout}ms`)),
                this.timeout,
            );
        }

        const promises: Promise<DieResult>[] = [];

        for (const [i, die] of rolls.entries()) {
            if (i > 0) {
                // eslint-disable-next-line no-await-in-loop
                await new Promise((r) => setTimeout(r, 50)); // wait 50ms to throw next die
                // The roll can time out or be removed while its dice are still being thrown
                if (roll.finished) break;
            }

            let mesh: Mesh;
            try {
                mesh = this.createDie(die.name, die.options ?? defaultOptions);
            } catch (error) {
                this.discard(key, error as Error);
                throw error;
            }

            const promise = new Promise<DieResult>((resolve, reject) =>
                roll.dice.push({
                    dieName: die.name,
                    done: false,
                    stableFrames: 0,
                    mesh,
                    reject,
                    resolve,
                    pickVector: die.pickVector,
                }),
            );
            // Dice can be rejected before Promise.all below attaches its handlers
            promise.catch(() => undefined);
            promises.push(promise);
        }
        roll.throwing = false;

        return { key, results: await Promise.all(promises) };
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
            const source = mesh.material as PBRMaterial;
            const color = options.color.toLowerCase();
            const key = `${source.uniqueId}:${color}`;
            let material = this.colouredMaterials.get(key);
            if (material === undefined) {
                material = source.clone(`${source.name}-${color}`);
                material.albedoColor = Color3.FromHexString(color);
                this.colouredMaterials.set(key, material);
            }
            mesh.material = material;
        }

        const defaultLinearVelocity = new Vector3(signed(10), 0, signed(10));
        const defaultAngularVelocity = new Vector3(signed(4), 0, signed(4));

        const vectors = options?.physics?.();

        mesh.position = vectors?.position ?? new Vector3(0, 10, 0);
        mesh.rotation =
            vectors?.rotation ??
            new Vector3(Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI);
        const agg = new PhysicsAggregate(mesh, PhysicsShapeType.CONVEX_HULL, {
            friction: this.physics.friction,
            mass: this.physics.mass,
            restitution: this.physics.restitution,
        });
        agg.body.setLinearVelocity(vectors?.linear ?? defaultLinearVelocity);
        agg.body.setAngularVelocity(vectors?.angular ?? defaultAngularVelocity);
        return mesh;
    }

    /**
     * Removes the dice of a roll, a roll that is still in progress is rejected
     */
    remove(key: string): void {
        this.discard(key, new Error("The roll was removed before it finished"));
    }

    removeAll(): void {
        for (const key of this.activeRolls.keys()) this.remove(key);
    }
}
