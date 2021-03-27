export type Operator = "+" | "-";

export interface OperatorPart extends IPart {
    type: "op";
    value: Operator;
}
export interface FixedPart extends IPart {
    type: "fixed";
    input: string;
    output: number;
}
interface DicePart extends IPart {
    type: "dice";
    input: string;
    output: (number | undefined)[];
}
export interface ResolvedDicePart extends DicePart {
    output: number[];
}
interface IPart {
    type: string;
}

export type Part = DicePart | FixedPart | OperatorPart;
export type ResolvedPart = FixedPart | OperatorPart | ResolvedDicePart;

export interface DndResult {
    total: number;
    details: ResolvedPart[];
}
