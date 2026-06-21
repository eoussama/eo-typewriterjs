import type { TBaseCommand } from "./base-command.type";
import type { ECommandKind } from "./command-kind.enum";
import type { TAdvanceModeInput, TCursorSelector } from "./type-command.type";



/**
 * @description
 * The operand for a select command.
 * - `"start"`: select from current cursor position to document start
 * - `"end"`: select from current cursor position to document end
 * - `"whole"`: select the entire document
 * - `number`: signed count - positive = forward, negative = backward
 */
export type TSelectValue = number | "start" | "end" | "whole";

/**
 * @description
 * A command that selects a range of text relative to the cursor's current position,
 * or selects an absolute document boundary range.
 *
 * Operand semantics:
 * - `number`: relative selection; positive = forward, negative = backward
 * - `"start"`: select from cursor to document start
 * - `"end"`: select from cursor to document end
 * - `"whole"`: select the entire document
 *
 * Selection is computed at reduce time using the runtime document state.
 * Any subsequent type, delete, or move command clears the selection.
 *
 * When `interval` is provided the timeline clock advances by that many milliseconds
 * after the event is emitted. Omit `interval` to use the default of 50 ms.
 */
export type TSelectCommand = TBaseCommand & {
  readonly kind: typeof ECommandKind.SELECT;
  readonly cursor: TCursorSelector;
  readonly count: TSelectValue;
  readonly by?: TAdvanceModeInput;
  readonly interval?: number;
};
