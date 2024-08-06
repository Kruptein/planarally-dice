import { type Vector3 } from "@babylonjs/core/Maths/math.vector";
import { type PhysicsImpostorParameters } from "@babylonjs/core/Physics/physicsImpostor";

export enum Dice {
    D4 = 4,
    D6 = 6,
    D8 = 8,
    D10 = 10,
    D12 = 12,
    D20 = 20,
    D100 = 100,
}

export interface DieOptions {
    die: Dice;
    position?: Vector3;
    linear?: Vector3;
    angular?: Vector3;
    size?: number;
    impostor?: PhysicsImpostorParameters;
    color?: string;
}
