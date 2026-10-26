/**
 * @description
 * The document range targeted by a style or unstyle event.
 * - `"range"`: the fixed `[from, to)` range, clamped to the document at apply time
 * - `"selection"`: the active selection of `cursorId`, resolved at apply time
 */
export type TStyleTarget
  = | {
    readonly mode: "range";
    readonly from: number;
    readonly to: number;
  }
  | {
    readonly mode: "selection";
    readonly cursorId: string;
  };
