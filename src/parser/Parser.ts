import { Mesh } from "@babylonjs/core/Meshes/mesh";

import { DiceThrower } from "../diceThrower";
import { Dice, DieOptions } from "../types";

type SimpleOptions = Omit<DieOptions, "die">;

export abstract class Parser<T> {
    constructor(private diceThrower: DiceThrower) {}

    protected abstract inputToOptions(input: string): DieOptions[];
    protected abstract resultsToOutput(results: number[]): T;

    /**
     * This function throws the provided dice based on string input,
     * returning the result based on the Parser used.
     *
     * An optional callback function can be provided to interact with the created Meshes just after their creation,
     * this will be called for each individual die thrown with the die type and
     * the root mesh containing both the Die mesh and the collider as children
     */
    async fromString(
        input: string,
        options?: SimpleOptions | undefined | (SimpleOptions | undefined)[],
        cb?: (die: Dice, mesh: Mesh) => void,
    ): Promise<T> {
        const converted = this.inputToOptions(input);
        for (const [i, c] of converted.entries()) {
            converted[i] = { ...c, ...(Array.isArray(options) ? options[i] : options) };
        }
        return this.fromOptions(converted, cb);
    }

    /**
     * This function throws the provided dice based on manual options input,
     * returning the result based on the Parser used.
     *
     * An optional callback function can be provided to interact with the created Meshes just after their creation,
     * this will be called for each individual die thrown with the die type and
     * the root mesh containing both the Die mesh and the collider as children
     */
    async fromOptions(options: DieOptions[], cb?: (die: Dice, mesh: Mesh) => void): Promise<T> {
        const results = await this.diceThrower.throwDice(options, cb);
        return this.resultsToOutput(results);
    }
}
