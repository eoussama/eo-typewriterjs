import type { TBaseCommand } from "./base-command.type";
import type { ECommandKind } from "./command-kind.enum";
import type { TMarkRange } from "./mark-command.type";
import type { TCursorSelector } from "./type-command.type";



/**
 * @description
 * A command that removes all style marks that overlap a given document range.
 * The range may be specified as absolute document indices via `range`,
 * or as `"selection"` to use each targeted cursor's active selection.
 * Marks that partially overlap the range are clipped rather than fully removed.
 */
export type TUnmarkCommand = TBaseCommand & {
  readonly kind: typeof ECommandKind.UNMARK;
  readonly cursor: TCursorSelector;
  readonly range: TMarkRange | "selection";
};
