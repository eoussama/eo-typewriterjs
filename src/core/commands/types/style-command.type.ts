import type { TStyleRef } from "../../state/types/rich-text-document.type";

import type { ECommandKind } from "../enums/command-kind.enum";
import type { TBaseCommand } from "./base-command.type";
import type { TCursorSelector } from "./type-command.type";



/**
 * @description
 * Defines a fixed document range to apply a style to
 */
export type TStyleRange = {
  readonly from: number;
  readonly to: number;
};

/**
 * @description
 * A command that applies a style to a range of already-typed text.
 * The range may be specified as absolute document indices via `range`,
 * or as `"selection"` to apply the style to each targeted cursor's active selection.
 */
export type TStyleCommand = TBaseCommand & {
  readonly kind: typeof ECommandKind.STYLE;
  readonly cursor: TCursorSelector;
  readonly style: TStyleRef;
  readonly range: TStyleRange | "selection";
};
