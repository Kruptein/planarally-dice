import type { Vector3 } from "@babylonjs/core/Maths/math.vector.js";

export interface DieOptions {
    color?: string;
    physics?: () => {
        position?: Vector3;
        linear?: Vector3;
        angular?: Vector3;
        rotation?: Vector3;
    };
}
