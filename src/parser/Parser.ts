import { DiceThrower } from "../diceThrower";
import { DieOptions } from "../types";

type SimpleOptions = Omit<DieOptions, "die">;

export abstract class Parser<T> {
    constructor(private diceThrower: DiceThrower) {}

    protected abstract inputToOptions(input: string): DieOptions[];
    protected abstract resultsToOutput(results: number[]): T;

    async fromString(input: string, options?: SimpleOptions | undefined | (SimpleOptions | undefined)[]): Promise<T> {
        const converted = this.inputToOptions(input);
        for (const [i, c] of converted.entries()) {
            converted[i] = { ...c, ...(Array.isArray(options) ? options[i] : options) };
        }
        return this.fromOptions(converted);
    }

    async fromOptions(options: DieOptions[]): Promise<T> {
        const results = await this.diceThrower.throwDice(options);
        return this.resultsToOutput(results);
    }
}
