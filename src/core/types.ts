export enum Status {
    Unknown = 0,
    PendingRoll = 1,
    PendingEvaluation = 2,
    Resolved = 3,
}

export type WithStatus<P extends Part, S extends Status> = P & { status: S };

// eslint-disable-next-line no-empty-interface
export interface Part {}

export function hasStatus<P extends Part, S extends Status>(
    p: WithStatus<P, Status>,
    status: S,
): p is WithStatus<P, S> {
    return p.status === status;
}

export interface DiceSystem<P extends Part> {
    name: string;
    collect(parts: WithStatus<P, Status.Resolved>[]): RollResult<P>;
    evaluate(part: WithStatus<P, Status.PendingEvaluation>): WithStatus<P, Status.PendingRoll | Status.Resolved>;
    parse(input: string): WithStatus<P, Status.PendingEvaluation | Status.PendingRoll | Status.Resolved>[];
    roller: Roller<P>;
}

export interface Roller<P extends Part> {
    roll(part: WithStatus<P, Status.PendingRoll>): Promise<WithStatus<P, Status.PendingEvaluation>>;
}

export interface RollResult<P extends Part> {
    endResult: string;
    parts: P[];
    description: string;
}
