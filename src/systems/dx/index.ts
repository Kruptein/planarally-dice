import { type DiceSystem, type RollResult, Status } from "../../core/types";
import {
    type DieSegment,
    type DxSegment,
    DxSegmentType,
    type OperatorSegment,
    type ResolvedDieOutput,
    RollOptions,
    type WithDxStatus,
} from "./types";

export * from "./types";

function selects(index: number, rolls: ResolvedDieOutput, part: DieSegment): boolean {
    const value = rolls[index]!.roll;
    if (part.selector === undefined) return false;
    if (part.selector === "=" || part.selectorValue === undefined) return value === part.selectorValue;
    else if (part.selector === "<") return value < part.selectorValue;
    else if (part.selector === ">") return value > part.selectorValue;
    else if (part.selector === "highest")
        return [...rolls.entries()]
            .sort((a, b) => b[1].roll - a[1].roll)
            .slice(0, part.selectorValue)
            .some(([i]) => i === index);
    else if (part.selector === "lowest")
        return [...rolls.entries()]
            .sort((a, b) => a[1].roll - b[1].roll)
            .slice(0, part.selectorValue)
            .some(([i]) => i === index);
    return false;
}

function randomInterval(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export async function roll(
    part: WithDxStatus<DxSegment, Status.PendingRoll>,
    rollOptions: RollOptions,
): Promise<WithDxStatus<DieSegment, Status.PendingEvaluation>> {
    if (part.type !== DxSegmentType.Die) {
        throw new Error(`Received a part of an unexpected type (${part.type})`);
    }
    return Promise.resolve({
        ...part,
        status: Status.PendingEvaluation,
        output: Array.from({ length: part.amount }, () => {
            const result = Math.round(randomInterval(1, Number.parseInt(part.die.slice(1), 10)));
            if (part.die === "d100" && result === 100 && rollOptions.d100Mode === 0) return 0;
            return result;
        }),
    });
}

function collect(parts: WithDxStatus<DxSegment, Status.Resolved>[]): RollResult<DxSegment> {
    let total = 0;
    let opMode: OperatorSegment["input"] = "+";

    const partsWithResults: RollResult<DxSegment>["parts"] = [];

    for (const part of parts) {
        let shortResult = "";
        let longResult = undefined;

        if (part.type === DxSegmentType.Literal) {
            total += part.value * (opMode === "+" ? 1 : -1);
            shortResult += part.value.toString();
        } else if (part.type === DxSegmentType.Operator) {
            opMode = part.input;
            shortResult += part.input.toString();
        } else if (part.type === DxSegmentType.Die) {
            let subSum = 0;
            longResult = "";
            for (const result of part.output) {
                if (longResult.length > 0) longResult += ",";
                let syntaxWrap = "";

                if (result.status === "overridden") {
                    syntaxWrap = "~";
                } else if (part.operator === "keep") {
                    if (result.status === "kept") {
                        subSum += result.roll;
                        syntaxWrap = "*";
                    }
                } else if (part.operator === "drop") {
                    if (result.status !== "dropped") {
                        subSum += result.roll;
                        syntaxWrap = "~";
                    }
                } else {
                    subSum += result.roll;
                }

                longResult += `${syntaxWrap}${result.roll}${syntaxWrap}`;
            }

            shortResult += subSum.toString();
            total += subSum * (opMode === "+" ? 1 : -1);
        }
        partsWithResults.push({ ...part, shortResult, longResult });
    }

    return {
        result: total.toString(),
        parts: partsWithResults,
    };
}

function evaluate(part: WithDxStatus<DxSegment, Status.PendingEvaluation>): WithDxStatus<DieSegment, Status.Resolved> {
    if (part.type !== DxSegmentType.Die) {
        throw new Error(`Received a part of an unexpected type (${part.type})`);
    }

    const rolls: ResolvedDieOutput = [];

    // First resolve all dice minima/maxima
    for (let result of part.output) {
        let newResult = result;
        if (part.operator === "min" && result < part.selectorValue!) newResult = part.selectorValue!;
        if (part.operator === "max" && result > part.selectorValue!) newResult = part.selectorValue!;
        if (result !== newResult) rolls.push({ roll: result, status: "overridden" });
        rolls.push({ roll: newResult });
    }

    // Then resolve all selectors
    for (const [i, roll] of rolls.entries()) {
        if (part.operator === "keep" || part.operator === "drop") {
            if (selects(i, rolls, part)) {
                roll.status = part.operator === "keep" ? "kept" : "dropped";
            }
        }
    }

    return {
        ...part,
        output: rolls,
        status: Status.Resolved,
    };
}

function parse(
    input: string,
): WithDxStatus<DxSegment, Status.PendingEvaluation | Status.PendingRoll | Status.Resolved>[] {
    const data: WithDxStatus<DxSegment, Status.PendingEvaluation | Status.PendingRoll | Status.Resolved>[] = [];
    /*
    (?:^|(?<op>[+-]))\s*                      // Operator
    (?:
        (?<dice>
            (?<numDice>\d+)d(?<diceSize>\d+)  // XdY
        )
        (?:
            (?:                               // Start of optional modifiers
                (?:
                    (?<selMod>                // Modifiers that can use selectors
                        [kpe]
                        |
                        (?:r[aor])
                    )
                    (?<selector>[hl<>=])?      // selectors
                )
                |
                (?<nselModifier>m[ai])        // modifiers that only work on literal values
            )
            (?<selval>\d+)                    // literal value for modifier
        )?
        |
        (?<fixed>\d+)                         // literal value instead of XdY
    )
    */
    const regex =
        /(?:^|(?<op>[+-]))\s*(?:(?<dice>(?<numDice>\d+)d(?<diceSize>\d+))(?:(?:(?:(?<selMod>[kpe]|(?:r[aor]))(?<selector>[hl<>=])?)|(?<nselMod>m[ai]))(?<selval>\d+))?|(?<fixed>\d+))/g;
    for (const part of input.matchAll(regex)) {
        if (part.groups?.op !== undefined) {
            data.push({
                input: part.groups.op as OperatorSegment["input"],
                type: DxSegmentType.Operator,
                status: Status.Resolved,
            });
        }
        if (part.groups?.fixed !== undefined) {
            data.push({
                input: part.groups.fixed,
                type: DxSegmentType.Literal,
                value: Number.parseInt(part.groups.fixed, 10),
                status: Status.Resolved,
            });
        } else if (part.groups?.dice !== undefined) {
            let operator: DieSegment["operator"];
            if (part.groups.selMod !== undefined) {
                const m = part.groups.selMod;
                if (m === "k") operator = "keep";
                else if (m === "p") operator = "drop";
                else if (m === "rr") operator = "inf";
                else if (m === "ro") operator = "once";
                else if (m === "ra") operator = "add";
                else if (m === "e") operator = "explode";
            } else if (part.groups?.nselMod !== undefined) {
                const m = part.groups.nselMod;
                if (m === "mi") operator = "min";
                else if (m === "ma") operator = "max";
            }
            let selector: DieSegment["selector"];
            if (part.groups.selector !== undefined) {
                const s = part.groups.selector;
                if (s === ">") selector = ">";
                else if (s === "<") selector = "<";
                else if (s === "=") selector = "=";
                else if (s === "h") selector = "highest";
                else if (s === "l") selector = "lowest";
            }

            const die = `d${part.groups.diceSize}` as DieSegment["die"];
            const amount = part.groups.numDice;
            data.push({
                input: `${amount}${die}${part.groups?.selMod ?? ""}${part.groups?.selector ?? ""}${part.groups?.nselMod ?? ""}${part.groups?.selval ?? ""}`,
                type: DxSegmentType.Die,
                die,
                amount: Number.parseInt(amount, 10),
                operator,
                selector,
                selectorValue: part.groups.selval !== undefined ? Number.parseInt(part.groups.selval, 10) : undefined,
                status: Status.PendingRoll,
            });
        }
    }
    return data;
}

export const DX: DiceSystem<DxSegment, RollOptions> = {
    collect,
    evaluate,
    parse,
    roll,
};
