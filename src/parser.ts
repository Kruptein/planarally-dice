import { DieOptions } from "./types";
import { stringToDice } from "./utils";

export function optionsFromString(command: string): DieOptions[] {
    const dice: DieOptions[] = [];
    let number = 0;

    let numberOfDice = 0;
    for (const char of command) {
        const numberParse = Number.parseInt(char);
        if (!Number.isNaN(numberParse)) {
            number *= 10;
            number += numberParse;
        } else {
            if (char === "d") {
                numberOfDice = number;
                number = 0;
            } else if (char === " ") {
                for (let i = 0; i < numberOfDice; i++) {
                    dice.push({ die: stringToDice(`d${number}`) });
                }
                numberOfDice = 0;
                number = 0;
            }
        }
    }
    for (let i = 0; i < numberOfDice; i++) {
        dice.push({ die: stringToDice(`d${number}`) });
    }
    return dice;
}
