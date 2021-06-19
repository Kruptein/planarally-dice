import { Vector3 } from "@babylonjs/core";
import { Dice, DndParser } from "@planarally/dice";
import { loadDiceEnv } from "./environment";

async function main(): Promise<void> {
    const diceThrower = await loadDiceEnv();
    const dndParser = new DndParser(diceThrower);

    let results = await diceThrower.throwDice([{ die: Dice.D20 }]);
    console.log(`Threw a ${results[0]}!`);

    results = await diceThrower.throwDice([{ die: Dice.D10, linear: new Vector3(2, 0, 3) }]);

    const dndResults = await dndParser.fromString("3d6 5d20");
    for (const result of dndResults) {
        console.log(`Rolled ${result.total} [${result.details}]`);
    }
}
