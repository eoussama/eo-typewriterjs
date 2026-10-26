import type { TAdvanceModeInput } from "../../commands/types/type-command.type";
import type { TSelectEvent } from "../../events/types/select-event.type";
import type { TCursorState } from "../../state/types/cursor-state.type";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";

import { withCursor, withSelection } from "../../state/helpers/typewriter-state.helper";
import { advanceIndex } from "./advance-index.helper";



/**
 * @description
 * Compute the selection endpoint reached by advancing `count` steps of the advance mode
 * from `startIndex`.
 *
 * @param text - The current document text
 * @param startIndex - The cursor position to start from
 * @param count - Number of steps; positive selects forward, negative selects backward
 * @param by - The advance mode controlling unit granularity and units per step
 * @returns The resolved endpoint index clamped to [0, text.length]
 */
function resolveEndIndex(text: string, startIndex: number, count: number, by: TAdvanceModeInput): number {
  const unit = typeof by === "string" ? by : by.unit;
  const amount = typeof by === "string" ? 1 : by.amount;

  return advanceIndex(text, startIndex, count * amount, unit);
}

/**
 * @description
 * Apply a select event to the typewriter state.
 *
 * Boundary operand semantics:
 * - `"whole"`: select the entire document [0, text.length]
 * - `"start"`: select from cursor to document start [0, cursorIndex]
 * - `"end"`: select from cursor to document end [cursorIndex, text.length]
 *
 * Numeric count semantics:
 * - positive: select forward from cursor
 * - negative: select backward from cursor
 *
 * If the cursor does not exist it is created at index 0 before selecting.
 *
 * @param state - The current typewriter state
 * @param event - The select event to apply
 * @returns A new TTypewriterState with the cursor's selection updated
 */
export function selectText(state: TTypewriterState, event: TSelectEvent): TTypewriterState {
  const ensured = withCursor(state, event.cursorId);
  const cursor = ensured.cursors[event.cursorId] as TCursorState;
  const cursorIndex = cursor.index;
  const textLength = ensured.document.text.length;

  if (event.boundary === "whole") {
    return withSelection(ensured, event.cursorId, 0, textLength);
  }

  if (event.boundary === "start") {
    return withSelection(ensured, event.cursorId, 0, cursorIndex);
  }

  if (event.boundary === "end") {
    return withSelection(ensured, event.cursorId, cursorIndex, textLength);
  }

  const endIndex = resolveEndIndex(ensured.document.text, cursorIndex, event.count, event.by);
  const from = Math.min(cursorIndex, endIndex);
  const to = Math.max(cursorIndex, endIndex);

  return withSelection(ensured, event.cursorId, from, to);
}
