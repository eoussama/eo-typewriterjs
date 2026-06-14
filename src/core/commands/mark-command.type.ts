import type { TStyleRef } from "../state/rich-text-document.type";

import type { TBaseCommand } from "./base-command.type";
import type { ECommandKind } from "./command-kind.enum";
import type { TCursorSelector } from "./type-command.type";



/**
 * @description
 * Defines a fixed document range to apply a style mark to
 */
export type TMarkRange = {
  readonly from: number;
  readonly to: number;
};

/**
 * @description
 * A command that applies a style mark to a range of already-typed text.
 * The range may be specified as absolute document indices via `range`,
 * or as `"selection"` to apply the mark to each targeted cursor's active selection.
 */
export type TMarkCommand = TBaseCommand & {
  readonly kind: typeof ECommandKind.MARK;
  readonly cursor: TCursorSelector;
  readonly style: TStyleRef;
  readonly range: TMarkRange | "selection";
};
