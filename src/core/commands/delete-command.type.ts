import type { TBaseCommand } from "./base-command.type";
import type { TAdvanceModeInput, TCursorSelector } from "./type-command.type";



/**
 * @description
 * A command representing the user's intent to delete text from the document.
 * Deletion is backward from the cursor position.
 */
export type TDeleteCommand = TBaseCommand & {
  readonly cursor: TCursorSelector;
  readonly count: number;
  readonly by?: TAdvanceModeInput;
  readonly interval?: number;
};
