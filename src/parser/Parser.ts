import { DiceThrower } from "../diceThrower";
import { DieOptions } from "../types";

export abstract class Parser<T> {
    constructor(private diceThrower?: DiceThrower) {}

    protected abstract inputToOptions(input: string): DieOptions[];
    protected abstract resultsToOutput(results: number[]): T;

    async fromString(input: string, options?: (Omit<DieOptions, "die"> | undefined)[]): Promise<T> {
        const converted = this.inputToOptions(input);
        for (const [i, option] of (options ?? []).entries()) {
            if (option) {
                converted[i] = { ...converted[i], ...option };
            }
        }
        return this.fromOptions(converted);
    }

    async fromOptions(options: DieOptions[]): Promise<T> {
        const results = (await this.diceThrower?.throwDice(options)) ?? [2, 3, 4, 5];
        return this.resultsToOutput(results);
    }
}
