import { ArcRotateCamera, HemisphericLight, MeshBuilder, PhysicsImpostor, Vector3 } from "@babylonjs/core";
import { DiceThrower } from "@planarally/dice";

export async function loadDiceEnv(): Promise<DiceThrower> {
    const canvas = document.getElementById("babylon") as HTMLCanvasElement;

    const diceThrower = new DiceThrower({ canvas });
    await diceThrower.load("/static/meshes.babylon");

    const scene = diceThrower.scene;

    // Create basic setup: camera + light

    const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 15, new Vector3(0, 0, 0), scene);
    camera.attachControl(true);

    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    // Create a dice box
    loadDiceBox();

    diceThrower.startRenderLoop();

    return diceThrower;
}

function loadDiceBox(): void {
    // Visual
    const wall1 = MeshBuilder.CreateBox("north", { width: 20, depth: 1, height: 2 });
    wall1.position.z = 10;
    const wall2 = MeshBuilder.CreateBox("south", { width: 20, depth: 1, height: 2 });
    wall2.position.z = -10;
    const wall3 = MeshBuilder.CreateBox("east", { width: 1, depth: 20, height: 2 });
    wall3.position.x = 10;
    const wall4 = MeshBuilder.CreateBox("west", { width: 1, depth: 20, height: 2 });
    wall4.position.x = -10;
    const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 20, subdivisions: 2 });
    ground.position.y = -1;

    // Physics
    new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, {
        mass: 0,
        restitution: 0.3,
        friction: 0.7,
    });
    new PhysicsImpostor(wall1, PhysicsImpostor.BoxImpostor, {
        mass: 0,
        restitution: 0.9,
    });
    new PhysicsImpostor(wall2, PhysicsImpostor.BoxImpostor, {
        mass: 0,
        restitution: 0.9,
    });
    new PhysicsImpostor(wall3, PhysicsImpostor.BoxImpostor, {
        mass: 0,
        restitution: 0.9,
    });
    new PhysicsImpostor(wall4, PhysicsImpostor.BoxImpostor, {
        mass: 0,
        restitution: 0.9,
    });
}
