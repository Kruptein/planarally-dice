import { Vector3 } from "@babylonjs/core";
import { Dice, optionsFromString } from "babylonjs-dice";
import { loadDiceEnv } from "./environment";

async function main(): Promise<void> {
    const diceThrower = await loadDiceEnv();

    let results = await diceThrower.throwDice({ die: Dice.D20 });
    console.log(`Threw a ${results[0]}!`);

    results = await diceThrower.throwDice({ die: Dice.D10, linear: new Vector3(2, 0, 3) });

    results = await diceThrower.throwDice(optionsFromString("3d6 5d20"));
}
