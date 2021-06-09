import { PhysicsImpostorParameters, Vector3 } from "@babylonjs/core";

export enum Dice {
    D4,
    D6,
    D8,
    D10,
    D12,
    D20,
    D100,
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
