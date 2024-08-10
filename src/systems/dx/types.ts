import { Part, type Status, type WithStatus } from "../../core/types";

export enum DxSegmentType {
    Die = 0,
    Literal = 1,
    Operator = 2,
}

const addOptions = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"] as const;
const limitOperatorOptions = ["keep", "drop", "min", "max"] as const;
const rerollOperatorOptions = ["inf", "once", "add", "explode"] as const;
type operatorOptions = (typeof limitOperatorOptions)[number] | (typeof rerollOperatorOptions)[number];
const selectorOptions = ["=", ">", "<", "highest", "lowest"] as const;
const symbolOptions = ["+", "-"] as const;

export const DxConfig = {
    addOptions,
    limitOperatorOptions,
    rerollOperatorOptions,
    selectorOptions,
    symbolOptions,
};

export interface DieSegment extends Part {
    type: DxSegmentType.Die;
    die: (typeof addOptions)[number];
    amount: number;
    operator?: operatorOptions;
    selector?: (typeof selectorOptions)[number];
    selectorValue?: number;
}

type RolledDieOutput = number[];
export type ResolvedDieOutput = { roll: number; status?: "kept" | "dropped" | "overridden" }[];

export interface OperatorSegment extends Part<(typeof symbolOptions)[number]> {
    type: DxSegmentType.Operator;
    // value: (typeof symbolOptions)[number];
}
interface LiteralSegment extends Part {
    type: DxSegmentType.Literal;
    value: number;
}
export type DxSegment = DieSegment | LiteralSegment | OperatorSegment;

// Extend extra info on WithStatus
export type WithDxStatus<D extends DxSegment, S extends Status> = S extends Status.PendingEvaluation
    ? D extends DieSegment
        ? WithStatus<D, S> & { output: RolledDieOutput }
        : WithStatus<D, S>
    : S extends Status.Resolved
      ? D extends DieSegment
          ? WithStatus<D, S> & { output: ResolvedDieOutput }
          : WithStatus<D, S>
      : WithStatus<D, S>;
