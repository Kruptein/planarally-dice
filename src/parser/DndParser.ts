import { DieOptions } from "../types";
import { stringToDice } from "../utils/geom";
import { Parser } from "./Parser";
import { DndResult, Operator, Part, ResolvedPart } from "./types";

const OPERATORS = ["+", "-"];

export class DndParser extends Parser<DndResult[]> {
    private groups: Part[][] = [];

    private reset(): void {
        this.groups = [];
    }

    protected inputToOptions(input: string): DieOptions[] {
        this.reset();
        const options: DieOptions[] = [];
        const groups = input.match(/(.*?\d)(?=(?:\s+\d)|$)/g) ?? [];
        for (const group of groups) {
            const parsedGroup = this.parseGroup(group);
            options.push(...parsedGroup);
        }
        return options;
    }

    protected resultsToOutput(key: string, results: number[]): { key: string; data: DndResult[] } {
        const dndResults: DndResult[] = [];
        let i = 0;
        for (const group of this.groups) {
            // Fill group with dice results
            const parts: ResolvedPart[] = [];
            for (const part of group) {
                if (part.type === "dice") {
                    parts.push({
                        ...part,
                        output: results.slice(i, i + part.output.length),
                    });
                    i += part.output.length;
                } else {
                    parts.push(part);
                }
            }
            // Calculate total
            dndResults.push({
                total: this.solveGroup(parts),
                details: parts,
            });
        }
        return { key, data: dndResults };
    }

    protected parseGroup(groupInput: string): DieOptions[] {
        const group: Part[] = [];

        const regex = /(?:^|(?<op>[\+-]))\s*(?:(?<dice>(?<numdice>\d+)d(?<dicesize>\d+))|(?<fixed>\d+))/g;
        const dieOptions: DieOptions[] = [];
        for (const part of groupInput.matchAll(regex)) {
            if (part.groups?.op) {
                if (!OPERATORS.includes(part.groups.op)) {
                    throw new Error("Malformed input: Operator is not known");
                }
                group.push({ type: "op", value: part.groups.op as Operator });
            }
            if (part.groups?.fixed) {
                group.push({
                    type: "fixed",
                    input: part.groups.fixed,
                    output: Number.parseInt(part.groups.fixed),
                });
            } else if (part.groups?.dice) {
                if (part.groups.numdice === undefined || part.groups.dicesize === undefined) {
                    throw new Error("Malformed input: Missing either number of dice or dice type");
                }
                const numDice = Number.parseInt(part.groups.numdice);
                const diceType = Number.parseInt(part.groups.dicesize);
                group.push({ type: "dice", input: part.groups.dice, output: new Array(numDice) });
                for (let i = 0; i < numDice; i++) dieOptions.push({ die: stringToDice(`d${diceType}`) });
            } else {
                throw new Error("Malformed input: Missing Fixed or Dice part");
            }
        }
        this.groups.push(group);
        return dieOptions;
    }

    protected solveGroup(group: ResolvedPart[]): number {
        let value = 0;
        let operator: Operator = "+";
        for (const part of group) {
            if (part.type === "fixed") {
                value = this.operate(value, part.output, operator);
            } else if (part.type === "dice") {
                value = this.operate(
                    value,
                    part.output.reduce((acc, v) => acc + v),
                    operator,
                );
            } else {
                operator = part.value;
            }
        }
        return value;
    }

    protected operate(accumulator: number, value: number, operator: Operator): number {
        if (operator === "+") {
            return accumulator + value;
        } else {
            return accumulator - value;
        }
    }
}
