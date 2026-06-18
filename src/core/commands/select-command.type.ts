import type { TBaseCommand } from "./base-command.type";
import type { ECommandKind } from "./command-kind.enum";
import type { TAdvanceModeInput, TCursorSelector } from "./type-command.type";



/**
 * @description
 * A command that selects a range of text relative to the cursor's current position.
 * A positive `count` selects forward; a negative `count` selects backward.
 * Selection is computed at reduce time using the runtime document state.
 * Any subsequent type, delete, or moveCursor command clears the selection.
 */
export type TSelectCommand = TBaseCommand & {
  readonly kind: typeof ECommandKind.SELECT;
  readonly cursor: TCursorSelector;
  readonly count: number;
  readonly by?: TAdvanceModeInput;
};
