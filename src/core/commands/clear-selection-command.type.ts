import type { TBaseCommand } from "./base-command.type";
import type { ECommandKind } from "./command-kind.enum";
import type { TCursorSelector } from "./type-command.type";



/**
 * @description
 * A command that clears the active text selection for one or more cursors.
 * If the targeted cursor has no active selection the state is left unchanged.
 */
export type TClearSelectionCommand = TBaseCommand & {
  readonly kind: typeof ECommandKind.CLEAR_SELECTION;
  readonly cursor: TCursorSelector;
};
