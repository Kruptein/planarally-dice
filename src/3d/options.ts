import type { Vector3 } from "@babylonjs/core";

export interface DieOptions {
    size?: number;
    color?: string;
    physics?: () => {
        position?: Vector3;
        linear?: Vector3;
        angular?: Vector3;
    };
}
