import type { TCursorSelector } from "./type-command.type";



/**
 * @description
 * Normalize a TCursorSelector into an ordered array of cursor ids.
 * A string selector becomes a single-element array.
 * An array selector is returned as-is.
 *
 * @param selector - The cursor selector to normalize
 * @returns An ordered array of cursor id strings
 */
export function normalizeCursors(selector: TCursorSelector): readonly string[] {
  return typeof selector === "string" ? [selector] : selector;
}
