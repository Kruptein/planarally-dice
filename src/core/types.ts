export enum Status {
    Unknown = 0,
    PendingRoll = 1,
    PendingEvaluation = 2,
    Resolved = 3,
}

export type WithStatus<P extends Part, S extends Status> = P & { status: S };

export interface Part<T = string | undefined> {
    input: T;
}

export function hasStatus<P extends Part, S extends Status>(
    p: WithStatus<P, Status>,
    status: S,
): p is WithStatus<P, S> {
    return p.status === status;
}

export interface DiceSystem<P extends Part, Q = {}> {
    collect(parts: WithStatus<P, Status.Resolved>[]): RollResult<P>;
    evaluate(part: WithStatus<P, Status.PendingEvaluation>): WithStatus<P, Status.PendingRoll | Status.Resolved>;
    parse(input: string): WithStatus<P, Status.PendingEvaluation | Status.PendingRoll | Status.Resolved>[];
    roll(part: WithStatus<P, Status.PendingRoll>, rollOptions?: Q): Promise<WithStatus<P, Status.PendingEvaluation>>;
}

export interface RollResult<P extends Part> {
    result: string;
    parts: (P & { shortResult: string; longResult?: string })[];
}
