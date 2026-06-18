import type { TBaseCommand } from "./base-command.type";
import type { ECommandKind } from "./command-kind.enum";
import type { TStyleRange } from "./style-command.type";
import type { TCursorSelector } from "./type-command.type";



/**
 * @description
 * A command that removes all styles that overlap a given document range.
 * The range may be specified as absolute document indices via `range`,
 * or as `"selection"` to use each targeted cursor's active selection.
 * Styles that partially overlap the range are clipped rather than fully removed.
 */
export type TUnstyleCommand = TBaseCommand & {
  readonly kind: typeof ECommandKind.UNSTYLE;
  readonly cursor: TCursorSelector;
  readonly range: TStyleRange | "selection";
};
