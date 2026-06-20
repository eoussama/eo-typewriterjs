import type { TAdvanceModeInput } from "../commands/type-command.type";
import type { TSelectEvent } from "../events/select-event.type";
import type { TCursorState } from "../state/cursor-state.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { withCursor, withSelection } from "../state/typewriter-state.type";
import { segmentText } from "../stepping/segment-text.helper";



/**
 * @description
 * Resolve an advance mode input into a canonical unit string
 *
 * @param by - The advance mode input
 * @returns The canonical advance unit string
 */
function resolveUnit(by: TAdvanceModeInput): string {
  return typeof by === "string" ? by : by.unit;
}

/**
 * @description
 * Resolve an advance mode input into the number of units per step
 *
 * @param by - The advance mode input
 * @returns The amount of units per step
 */
function resolveAmount(by: TAdvanceModeInput): number {
  return typeof by === "string" ? 1 : by.amount;
}

/**
 * @description
 * Compute the character index boundary reached by advancing `n` whole units
 * (forward or backward) from `startIndex` in `text`.
 * Returns the clamped absolute index.
 *
 * @param text - The current document text
 * @param startIndex - The cursor position to start from
 * @param count - Number of units; positive selects forward, negative selects backward
 * @param by - The advance mode controlling unit granularity
 * @returns The resolved endpoint index clamped to [0, text.length]
 */
function resolveEndIndex(text: string, startIndex: number, count: number, by: TAdvanceModeInput): number {
  const unit = resolveUnit(by) as Parameters<typeof segmentText>[1];
  const amount = Math.max(1, resolveAmount(by));
  const absCount = Math.abs(count) * amount;

  if (count > 0) {
    const tail = text.slice(startIndex);
    const segments = segmentText(tail, unit);
    const taken = segments.slice(0, absCount).join("").length;

    return Math.min(text.length, startIndex + taken);
  }
  else {
    const head = text.slice(0, startIndex);
    const segments = segmentText(head, unit);
    const taken = segments.slice(Math.max(0, segments.length - absCount)).join("").length;

    return Math.max(0, startIndex - taken);
  }
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
