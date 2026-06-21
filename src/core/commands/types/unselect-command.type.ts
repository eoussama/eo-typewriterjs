import type { ECommandKind } from "../enums/command-kind.enum";
import type { TBaseCommand } from "./base-command.type";
import type { TCursorSelector } from "./type-command.type";



/**
 * @description
 * A command that clears the active text selection for one or more cursors.
 * If the targeted cursor has no active selection the state is left unchanged.
 */
export type TUnselectCommand = TBaseCommand & {
  readonly kind: typeof ECommandKind.UNSELECT;
  readonly cursor: TCursorSelector;
};
