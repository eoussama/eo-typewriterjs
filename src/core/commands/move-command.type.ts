import type { TBaseCommand } from "./base-command.type";
import type { TAdvanceModeInput, TCursorSelector } from "./type-command.type";



/**
 * @description
 * The operand for a move command.
 * - `"start"`: move cursor to the absolute start of the document
 * - `"end"`: move cursor to the absolute end of the document
 * - `number`: relative offset - positive = right, negative = left, zero = no-op
 */
export type TMoveValue = number | "start" | "end";

/**
 * @description
 * A command that moves a cursor relative to its current position by a given number of units,
 * or jumps to an absolute document boundary.
 *
 * Operand semantics:
 * - `number`: relative move; positive = right, negative = left, zero = no-op
 * - `"start"`: jump to absolute document start (index 0)
 * - `"end"`: jump to absolute document end (index text.length)
 *
 * When `interval` is provided the timeline clock advances by that many milliseconds
 * after the event is emitted. Omit `interval` to use the default of 50 ms.
 * A zero numeric offset is a no-op and does not advance the clock regardless of interval.
 */
export type TMoveCommand = TBaseCommand & {
  readonly cursor: TCursorSelector;
  readonly offset: TMoveValue;
  readonly by?: TAdvanceModeInput;
  readonly interval?: number;
};
