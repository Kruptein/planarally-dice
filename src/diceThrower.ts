import { Ray } from "@babylonjs/core/Culling/ray";
import { Engine } from "@babylonjs/core/Engines/engine";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { AmmoJSPlugin } from "@babylonjs/core/Physics/Plugins/ammoJSPlugin";
import { Scene } from "@babylonjs/core/scene";
import { Dice, DieOptions } from "./types";
import { getColliderFromDie, getValueFromFace, stringToDice } from "./utils/geom";

// Load side-effects that are not by default loaded with the tree-shaking above
import "@babylonjs/core/Loading";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Materials/PBR/pbrMaterial";
import "@babylonjs/core/Physics/physicsEngineComponent";

export class DiceThrower {
    private loaded = false;
    scene: Scene;

    tresholds = {
        linear: 0.1,
        angular: 0.075,
    };

    freezeOnDecision = true;

    private meshMap: Map<Dice, Mesh> = new Map();

    private dice: {
        die: Dice;
        mesh: Mesh;
        resolve: (value: number) => void;
        reject: () => void;
        registerFunc: () => void;
        resolved: boolean;
    }[] = [];

    constructor(options: {
        scene?: Scene;
        canvas?: HTMLCanvasElement;
        tresholds?: { linear: number; angular: number };
        freezeOnDecision?: boolean;
    }) {
        if (options.scene) {
            this.scene = options.scene;
        } else if (options.canvas) {
            const engine = new Engine(options.canvas);
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
     * Loads the ammo.js physics and imports meshes
     *
     * This NEEDS to be run before any dice throwing can happen.
     *
     * For now you require to always pass the URL to a .babylon file.
     */
    async load(meshUrl: string, ammo: any): Promise<void> {
        const gravity = new Vector3(0, -10, 0);
        const physicsPlugin = new AmmoJSPlugin(undefined, ammo);
        this.scene.enablePhysics(gravity, physicsPlugin);

        const asyncLoad = await SceneLoader.ImportMeshAsync("", meshUrl);
        for (const mesh of asyncLoad.meshes) {
            mesh.setEnabled(false);
            mesh.isVisible = true;
            this.meshMap.set(stringToDice(mesh.name), mesh as Mesh);
        }
        this.loaded = true;
    }

    startRenderLoop(): void {
        this.scene.getEngine().runRenderLoop(() => this.scene.render());
    }

    /**
     * This function throws the provided dice, returning in the same order the result they landed on.
     * An optional callback function can be provided to interact with the created Meshes just after their creation,
     * this will be called for each individual die thrown with the die type and
     * the root mesh containing both the Die mesh and the collider as children
     */
    async throwDice(dice: DieOptions[], cb?: (die: Dice, mesh: Mesh) => void): Promise<number[]> {
        if (!this.loaded) {
            throw new Error("DiceThrower has not been properly loaded. first call .load()!");
        }

        this.reset();

        const promises: Promise<number>[] = [];

        for (const [i, options] of dice.entries()) {
            const registerFunc = (): void => this.checkSolution(i);

            const mesh = this.createDie(options);

            cb?.(options.die, mesh);

            promises.push(
                new Promise((resolve, reject) => {
                    this.dice.push({ die: options.die, mesh, registerFunc, resolve, reject, resolved: false });
                }),
            );
            mesh.physicsImpostor!.registerAfterPhysicsStep(registerFunc);
        }

        return await Promise.all(promises);
    }

    private createDie(options: DieOptions): Mesh {
        const collider = getColliderFromDie(options.die, options.size);
        collider.isVisible = false;
        const impostor = new PhysicsImpostor(collider, PhysicsImpostor.ConvexHullImpostor, {
            mass: 0,
            restitution: 0.7,
            ...options.impostor,
        });
        collider.physicsImpostor = impostor;

        const root = new Mesh("", this.scene);

        const mesh = this.meshMap.get(options.die)!.clone();
        mesh.setEnabled(true);
        root.addChild(mesh);
        root.addChild(collider);

        // custom colours
        if (options.color) (mesh.material as PBRMaterial).albedoColor = Color3.FromHexString(options.color);

        const defaultLinearVelocity = new Vector3(Math.random() * 10, 0, Math.random() * 10);
        const defaultAngularVelocity = new Vector3(Math.random() * 4, 0, Math.random() * 4);

        root.physicsImpostor = new PhysicsImpostor(root, PhysicsImpostor.NoImpostor, { mass: 1 });

        root.position = options?.position ?? new Vector3(0, 2, 0);
        root.physicsImpostor.setLinearVelocity(options?.linear ?? defaultLinearVelocity);
        root.physicsImpostor.setAngularVelocity(options?.angular ?? defaultAngularVelocity);

        return root;
    }

    reset(): void {
        for (const dieInfo of this.dice) {
            if (!dieInfo.resolved) {
                dieInfo.mesh.physicsImpostor!.unregisterAfterPhysicsStep(dieInfo.registerFunc);
                dieInfo.reject();
            }
            dieInfo.mesh.dispose();
        }
        this.dice = [];
    }

    private checkSolution(index: number): void {
        const dieInfo = this.dice[index];
        const mesh = dieInfo.mesh;
        const impostor = mesh.physicsImpostor!;

        const angularVelocity = impostor!.getAngularVelocity()!;
        const velocity = impostor!.getLinearVelocity()!;

        const isDone =
            Math.abs(angularVelocity.x) < this.tresholds.angular &&
            Math.abs(angularVelocity.y) < this.tresholds.angular &&
            Math.abs(angularVelocity.z) < this.tresholds.angular &&
            Math.abs(velocity.x) < this.tresholds.linear &&
            Math.abs(velocity.y) < this.tresholds.linear &&
            Math.abs(velocity.z) < this.tresholds.linear;

        if (isDone) {
            impostor.unregisterAfterPhysicsStep(dieInfo.registerFunc);

            if (this.freezeOnDecision) {
                // Once a solution has been decided, freeze the die in place to prevent mishaps
                impostor.setLinearVelocity(Vector3.Zero());
                impostor.setAngularVelocity(Vector3.Zero());
            }

            let vector = new Vector3(0, 1, 0);
            if (dieInfo.die === Dice.D4) vector = new Vector3(0, -1, 0);
            const pickResult = this.scene.pickWithRay(new Ray(mesh.position, vector, 100))!;
            if (pickResult.hit) {
                dieInfo.resolved = true;
                dieInfo.resolve(getValueFromFace(dieInfo.die, pickResult.faceId));
            } else {
                dieInfo.reject();
            }
        }
    }
}
