import { type DiceSystem, type RollResult, Status } from "../../core/types";
import {
    type DieSegment,
    type DxSegment,
    DxSegmentType,
    type OperatorSegment,
    type ResolvedDieOutput,
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

export class DxRoller {
    roll(
        part: WithDxStatus<DxSegment, Status.PendingRoll>,
    ): Promise<WithDxStatus<DieSegment, Status.PendingEvaluation>> {
        if (part.type !== DxSegmentType.Die) {
            throw new Error(`Received a part of an unexpected type (${part.type})`);
        }
        return Promise.resolve({
            ...part,
            status: Status.PendingEvaluation,
            output: Array.from({ length: part.amount }, () =>
                Math.round(randomInterval(1, Number.parseInt(part.die.slice(1), 10))),
            ),
        });
    }
}

function collect(parts: WithDxStatus<DxSegment, Status.Resolved>[]): RollResult<DxSegment> {
    let total = 0;
    let opMode: OperatorSegment["value"] = "+";
    let description = "";

    for (const part of parts) {
        if (description.length > 0) description += " ";

        if (part.type === DxSegmentType.Literal) {
            total += part.value * (opMode === "+" ? 1 : -1);
            description += part.value.toString();
        } else if (part.type === DxSegmentType.Operator) {
            opMode = part.value;
            description += part.value.toString();
        } else if (part.type === DxSegmentType.Die) {
            let subSum = 0;
            for (const result of part.output) {
                if (part.operator === "keep") {
                    if (result.status === "kept") subSum += result.roll;
                } else if (part.operator === "drop") {
                    if (result.status !== "dropped") subSum += result.roll;
                } else {
                    subSum += result.roll;
                }
            }
            total += subSum * (opMode === "+" ? 1 : -1);

            description += subSum.toString();
            if (part.output.length > 1) {
                description += ` [${part.output.map((r) => r.roll).join(", ")}]`;
            }
        }
    }

    return {
        endResult: total.toString(),
        parts,
        description,
    };
}

function evaluate(part: WithDxStatus<DxSegment, Status.PendingEvaluation>): WithDxStatus<DieSegment, Status.Resolved> {
    if (part.type !== DxSegmentType.Die) {
        throw new Error(`Received a part of an unexpected type (${part.type})`);
    }

    const rolls: ResolvedDieOutput = [];

    // First resolve all dice minima/maxima
    for (let result of part.output) {
        if (part.operator === "min" && result < part.selectorValue!) result = part.selectorValue!;
        if (part.operator === "max" && result > part.selectorValue!) result = part.selectorValue!;
        rolls.push({ roll: result });
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
                    (?<selector>[hl<>])?      // selectors
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
        /(?:^|(?<op>[+-]))\s*(?:(?<dice>(?<numDice>\d+)d(?<diceSize>\d+))(?:(?:(?:(?<selMod>[kpe]|(?:r[aor]))(?<selector>[hl<>])?)|(?<nselMod>m[ai]))(?<selval>\d+))?|(?<fixed>\d+))/g;
    for (const part of input.matchAll(regex)) {
        if (part.groups?.op !== undefined) {
            data.push({
                type: DxSegmentType.Operator,
                value: part.groups.op as OperatorSegment["value"],
                status: Status.Resolved,
            });
        }
        if (part.groups?.fixed !== undefined) {
            data.push({
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
                else if (s === "h") selector = "highest";
                else if (s === "l") selector = "lowest";
            }
            data.push({
                type: DxSegmentType.Die,
                die: `d${part.groups.diceSize!}` as DieSegment["die"],
                amount: Number.parseInt(part.groups.numDice!, 10),
                operator,
                selector,
                selectorValue: part.groups.selval !== undefined ? Number.parseInt(part.groups.selval, 10) : undefined,
                status: Status.PendingRoll,
            });
        }
    }
    return data;
}

export const DX: DiceSystem<DxSegment> = {
    collect,
    evaluate,
    name: "Dx",
    parse,
    roller: new DxRoller(),
};
