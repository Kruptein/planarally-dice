import { type DiceSystem, hasStatus, type Part, type RollResult, Status, type WithStatus } from "./types";

export async function rollString<P extends Part, Q, DS extends DiceSystem<P, Q>>(
    inputString: string,
    diceSystem: DS,
    rollOptions?: Q,
): Promise<RollResult<P>> {
    return await rollParts(diceSystem.parse(inputString), diceSystem, rollOptions);
}

export async function rollParts<P extends Part, Q, DS extends DiceSystem<P, Q>>(
    parts: WithStatus<P, Status>[],
    diceSystem: DS,
    rollOptions?: Q,
): Promise<RollResult<P>> {
    let allResolved = false;

    // AS LONG AS THERE ARE PENDING PARTS
    while (!allResolved) {
        // 1 COLLECT ALL PENDING ROLLS
        const collectRolls: { index: number; promise: Promise<WithStatus<P, Status.PendingEvaluation>> }[] = [];

        for (const [i, part] of parts.entries()) {
            if (hasStatus(part, Status.PendingRoll)) {
                collectRolls.push({ index: i, promise: diceSystem.roll(part, rollOptions) });
            }
        }

        // 2 ROLL
        // eslint-disable-next-line
        const resolvedRolls = await Promise.all(collectRolls.map(({ promise }) => promise));
        for (const [index, resolvedPart] of resolvedRolls.entries()) {
            parts[collectRolls[index].index] = resolvedPart;
        }

        // 3 EVALUATE ALL PARTS
        for (const [i, part] of parts.entries()) {
            if (hasStatus(part, Status.PendingEvaluation)) {
                parts[i] = diceSystem.evaluate(part);
            }
        }

        allResolved = parts.every((part) => hasStatus(part, Status.Resolved));
    }

    // COLLECT RESULTS
    return diceSystem.collect(parts as WithStatus<P, Status.Resolved>[]);
}
