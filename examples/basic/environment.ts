import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core/Physics";
import type { Scene } from "@babylonjs/core/scene";
import { DiceThrower } from "@planarally/dice/3d";

export async function loadDiceEnv(canvas: HTMLCanvasElement, meshUrl: string): Promise<DiceThrower> {
    const diceThrower = new DiceThrower({ canvas, antialias: true });
    const scene = diceThrower.scene;

    // Physics has to be enabled before any physics bodies (including the dice box) are created
    await diceThrower.loadPhysics();
    await diceThrower.loadMeshes(meshUrl);

    const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 5, 40, Vector3.Zero(), scene);
    camera.attachControl(canvas);

    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    loadDiceBox(scene);

    diceThrower.startRenderLoop();

    return diceThrower;
}

function loadDiceBox(scene: Scene): void {
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
    new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.7, restitution: 0.3 });

    const walls = [
        { name: "north", width: 20, depth: 1, x: 0, z: 10 },
        { name: "south", width: 20, depth: 1, x: 0, z: -10 },
        { name: "east", width: 1, depth: 20, x: 10, z: 0 },
        { name: "west", width: 1, depth: 20, x: -10, z: 0 },
    ];
    for (const { name, width, depth, x, z } of walls) {
        const wall = MeshBuilder.CreateBox(name, { width, depth, height: 6 }, scene);
        wall.position = new Vector3(x, 3, z);
        new PhysicsAggregate(wall, PhysicsShapeType.BOX, { mass: 0, restitution: 0.9 });
    }
}
