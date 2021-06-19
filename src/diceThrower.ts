import {
    AmmoJSPlugin,
    Color3,
    Engine,
    Mesh,
    PBRMaterial,
    PhysicsImpostor,
    Ray,
    Scene,
    SceneLoader,
    Vector3,
} from "@babylonjs/core";
import Ammo from "ammo.js";

import { Dice, DieOptions } from "./types";
import { getColliderFromDie, getValueFromFace, stringToDice } from "./utils/geom";

export class DiceThrower {
    private loaded = false;
    scene: Scene;

    private meshMap: Map<Dice, Mesh> = new Map();

    private dice: {
        die: Dice;
        mesh: Mesh;
        resolve: (value: number) => void;
        reject: () => void;
        registerFunc: () => void;
        resolved: boolean;
    }[] = [];

    constructor(options: { scene?: Scene; canvas?: HTMLCanvasElement }) {
        if (options.scene) {
            this.scene = options.scene;
        } else if (options.canvas) {
            const engine = new Engine(options.canvas);
            this.scene = new Scene(engine);
        } else {
            throw new Error("Expected either a scene or a canvas element");
        }
    }

    /**
     * Loads the ammo.js physics and imports meshes
     *
     * This NEEDS to be run before any dice throwing can happen.
     *
     * For now you require to always pass the URL to a .babylon file.
     */
    async load(meshUrl: string, ammo?: any): Promise<void> {
        ammo ??= await Ammo();
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

    async throwDice(dice: DieOptions[]): Promise<number[]> {
        if (!this.loaded) {
            throw new Error("DiceThrower has not been properly loaded. first call .load()!");
        }

        this.reset();

        const promises: Promise<number>[] = [];

        for (const [i, options] of dice.entries()) {
            const registerFunc = (): void => this.checkSolution(i);

            const mesh = this.createDie(options);

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

    private reset(): void {
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

        const threshold = 0.1;
        const angularVelocity = impostor!.getAngularVelocity()!;
        const velocity = impostor!.getLinearVelocity()!;

        const isDone =
            Math.abs(angularVelocity.x) < threshold &&
            Math.abs(angularVelocity.y) < threshold &&
            Math.abs(angularVelocity.z) < threshold &&
            Math.abs(velocity.x) < threshold &&
            Math.abs(velocity.y) < threshold &&
            Math.abs(velocity.z) < threshold;

        if (isDone) {
            impostor!.unregisterAfterPhysicsStep(dieInfo.registerFunc);
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
