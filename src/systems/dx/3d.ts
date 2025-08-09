import { Vector3 } from "@babylonjs/core";

import type { DiceThrower, DieOptions } from "../../3d";
import { type DiceSystem, Status } from "../../core/types";

import { type DieSegment, type DxSegment, DxSegmentType, type RollOptions, type WithDxStatus } from "./types";
import { DX } from ".";

async function roll(
    part: WithDxStatus<DxSegment, Status.PendingRoll>,
    rollOptions: RollOptions3d,
): Promise<WithDxStatus<DieSegment, Status.PendingEvaluation>> {
    if (part.type !== DxSegmentType.Die) {
        throw new Error(`Received a part of an unexpected type (${part.type})`);
    }

    const handleD100 = part.die === Dice.D100;

    // Prepare the list of dice to roll
    // Splice in an extra D10 for every D100 if we're handling D100
    const diceRollArray = Array.from({ length: part.amount * (handleD100 ? 2 : 1) }, (_, index) => ({
        name: handleD100 && index % 2 !== 0 ? Dice.D10 : part.die,
        pickVector: part.die === Dice.D4 ? new Vector3(0, -1, 0) : undefined,
    }));

    const { results } = await rollOptions.thrower.throwDice(diceRollArray, rollOptions.dieDefaults);

    let output = results.map((r) => FACE_VALUE_MAPPING[r.dieName as DieSegment["die"]]?.[r.faceId]) ?? [];

    // Combine D100 results into a single number
    if (handleD100) {
        output = output
            .filter((_, index) => index % 2 === 0)
            .map((_, index) => {
                let tens = output[2 * index];
                let units = output[2 * index + 1];
                if (tens === 100) tens = 0;
                if (units === 10) units = 0;
                if (tens === 0 && units === 0) return rollOptions.d100Mode === 0 ? 0 : 100;

                return tens + units;
            });
    }

    return {
        ...part,
        output,
        status: Status.PendingEvaluation,
    };
}

// The below mapping corresponds to the meshes from all_dice.babylon + uv mapping
// Currently these are still located in the main PA server folder,
// they should be moved to this lib when we move to the mod version

export enum Dice {
    D4 = "d4",
    D6 = "d6",
    D8 = "d8",
    D10 = "d10",
    D12 = "d12",
    D20 = "d20",
    D100 = "d100",
}

const FACE_VALUE_MAPPING: Record<DieSegment["die"], number[]> = {
    [Dice.D4]: [4, 3, 1, 2],
    [Dice.D6]: [6, 2, 1, 5, 3, 4, 6, 2, 1, 5, 3, 4],
    [Dice.D8]: [1, 7, 8, 2, 3, 5, 6, 4],
    [Dice.D10]: [5, 9, 1, 7, 3, 4, 10, 8, 2, 6, 5, 9, 1, 7, 3, 4, 10, 8, 2, 6],
    [Dice.D12]: [
        1, 4, 2, 5, 6, 3, 12, 9, 11, 8, 7, 10, 1, 1, 4, 4, 2, 2, 5, 5, 6, 6, 3, 3, 12, 12, 9, 9, 11, 11, 8, 8, 7, 7, 10,
        10,
    ],
    [Dice.D20]: [6, 9, 16, 3, 19, 11, 14, 8, 17, 1, 4, 20, 10, 7, 13, 18, 2, 12, 15, 5],
    [Dice.D100]: [50, 90, 10, 70, 30, 40, 100, 80, 20, 60, 50, 90, 10, 70, 30, 40, 100, 80, 20, 60],
};

interface RollOptions3d extends RollOptions {
    thrower: DiceThrower;
    dieDefaults?: Partial<DieOptions>;
}

export const DX3: DiceSystem<DxSegment, RollOptions3d> = {
    ...DX,
    roll,
};
