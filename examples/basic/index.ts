import { rollString, SYSTEMS } from "@planarally/dice/core";

import { loadDiceEnv } from "./environment";

async function main(): Promise<void> {
    // Rolls without 3D dice, using Math.random
    const { DX } = await SYSTEMS.DX();
    const quick = await rollString("1d20 + 5", DX, { d100Mode: 100 });
    console.log(`Rolled ${quick.result}`);

    // Rolls with 3D dice, the result is read from the face that ends up on top
    const canvas = document.getElementById("babylon") as HTMLCanvasElement;
    const thrower = await loadDiceEnv(canvas, "/meshes/dnd.babylon");
    const { DX3 } = await SYSTEMS.DX3();

    const roll = await rollString("4d6kh3 + 2", DX3, {
        thrower,
        d100Mode: 100,
        dieDefaults: { color: "#b83232" },
    });
    console.log(`Rolled ${roll.result}`);
    for (const part of roll.parts) {
        console.log(`  ${part.input}: ${part.longResult ?? part.shortResult}`);
    }
}

void main();
