import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Dice } from "../types";
import { toRadians } from "./math";

export function getColliderFromDie(die: Dice, size?: number): Mesh {
    let collider;
    switch (die) {
        case Dice.D4: {
            collider = MeshBuilder.CreatePolyhedron("d4", {
                type: 0,
                size: size ?? 0.6,
            });
            collider.rotate(new Vector3(1, 0, 0), toRadians(20));
            collider.rotate(new Vector3(0, 0, 1), toRadians(90));
            break;
        }
        case Dice.D6: {
            collider = MeshBuilder.CreateBox("d6", { size: size ?? 1.4 });
            break;
        }
        case Dice.D8: {
            collider = MeshBuilder.CreatePolyhedron("d8", {
                type: 1,
                size: size ?? 0.8,
            });
            collider.rotate(new Vector3(0, 1, 0), toRadians(45));
            break;
        }
        case Dice.D10:
        case Dice.D100: {
            collider = MeshBuilder.CreatePolyhedron("d10", {
                custom: d10Custom,
                size,
            });
            collider.rotate(new Vector3(0, 1, 0), toRadians(36));
            break;
        }
        case Dice.D12: {
            collider = MeshBuilder.CreatePolyhedron("d12", {
                type: 2,
                size: size ?? 1.1,
            });
            collider.rotate(new Vector3(1, 0, 0), toRadians(10));
            collider.rotate(new Vector3(0, 0, 1), toRadians(30));
            break;
        }
        default: {
            collider = MeshBuilder.CreatePolyhedron("d20", {
                type: 3,
                size,
            });
            collider.rotate(new Vector3(1, 0, 0), toRadians(-25));
            collider.rotate(new Vector3(0, 1, 0), toRadians(20));
            collider.rotate(new Vector3(0, 0, 1), toRadians(25));
        }
    }
    return collider;
}

export function getValueFromFace(die: Dice, face: number): number {
    return FACE_VALUE_MAPPING[die][face];
}

export function stringToDice(dice: string): Dice {
    switch (dice) {
        case "d4": {
            return Dice.D4;
        }
        case "d6": {
            return Dice.D6;
        }
        case "d8": {
            return Dice.D8;
        }
        case "d10": {
            return Dice.D10;
        }
        case "d12": {
            return Dice.D12;
        }
        case "d100": {
            return Dice.D100;
        }
        default:
            return Dice.D20;
    }
}

const FACE_VALUE_MAPPING: Record<Dice, number[]> = {
    [Dice.D4]: [4, 3, 1, 2],
    [Dice.D6]: [6, 2, 1, 5, 3, 4, 6, 2, 1, 5, 3, 4],
    [Dice.D8]: [1, 7, 8, 2, 3, 5, 6, 4],
    [Dice.D10]: [5, 9, 1, 7, 3, 4, 10, 8, 2, 6, 5, 9, 1, 7, 3, 4, 10, 8, 2, 6],
    [Dice.D12]: [
        1,
        4,
        2,
        5,
        6,
        3,
        12,
        9,
        11,
        8,
        7,
        10,
        1,
        1,
        4,
        4,
        2,
        2,
        5,
        5,
        6,
        6,
        3,
        3,
        12,
        12,
        9,
        9,
        11,
        11,
        8,
        8,
        7,
        7,
        10,
        10,
    ],
    [Dice.D20]: [6, 9, 16, 3, 19, 11, 14, 8, 17, 1, 4, 20, 10, 7, 13, 18, 2, 12, 15, 5],
    [Dice.D100]: [50, 90, 10, 70, 30, 40, 100, 80, 20, 60, 50, 90, 10, 70, 30, 40, 100, 80, 20, 60],
};

const d10Custom = {
    vertex: [
        [-0.95, -0.1, -0.31],
        [-0.59, -0.1, 0.81],
        [0, -1, 0],
        [0, -0.1, -1],
        [0, 1, 0],
        [0.59, -0.1, 0.81],
        [0.95, -0.1, -0.31],
        [0, 0.1, 1],
        [0.95, 0.1, 0.31],
        [0.59, 0.1, -0.81],
        [-0.59, 0.1, -0.81],
        [-0.95, 0.1, 0.31],
    ],
    face: [
        [2, 0, 10, 3],
        [2, 1, 11, 0],
        [2, 5, 7, 1],
        [2, 3, 9, 6],
        [2, 6, 8, 5],
        [4, 9, 3, 10],
        [4, 10, 0, 11],
        [4, 11, 1, 7],
        [4, 7, 5, 8],
        [4, 8, 6, 9],
    ],
};
