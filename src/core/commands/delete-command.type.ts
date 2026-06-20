import type { TBaseCommand } from "./base-command.type";
import type { TAdvanceModeInput, TCursorSelector } from "./type-command.type";



/**
 * @description
 * The boundary operand for a delete command.
 * - `"start"`: delete from the cursor back to the start of the document
 * - `"end"`: delete from the cursor forward to the end of the document
 * - `"whole"`: delete the entire document text
 * - `number`: signed count — positive = forward, negative = backward
 */
export type TDeleteValue = number | "start" | "end" | "whole";

/**
 * @description
 * A command representing the user's intent to delete text from the document.
 *
 * Signed count semantics when `count` is a number:
 * - positive: delete forward from the cursor
 * - negative: delete backward from the cursor
 *
 * String operand semantics:
 * - `"start"`: delete from cursor back to document start
 * - `"end"`: delete from cursor forward to document end
 * - `"whole"`: delete the entire document
 */
export type TDeleteCommand = TBaseCommand & {
  readonly cursor: TCursorSelector;
  readonly count: TDeleteValue;
  readonly by?: TAdvanceModeInput;
  readonly interval?: number;
};
