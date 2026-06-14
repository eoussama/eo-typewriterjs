import type { TNullable } from "@eoussama/core";
import type { TAdvanceModeInput } from "../commands/type-command.type";
import type { TSelectEvent } from "../events/select-event.type";
import type { TCursorState } from "../state/cursor-state.type";
import type { TSelectionState, TTypewriterState } from "../state/typewriter-state.type";

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

  if (count === 0 || text.length === 0) {
    return startIndex;
  }

  if (count > 0) {
    // Select forward: segment text from startIndex to end, take `absCount` segments
    const tail = text.slice(startIndex);
    const segments = segmentText(tail, unit);
    const taken = segments.slice(0, absCount).join("").length;

    return Math.min(text.length, startIndex + taken);
  }
  else {
    // Select backward: segment text from 0 to startIndex, take last `absCount` segments
    const head = text.slice(0, startIndex);
    const segments = segmentText(head, unit);
    const taken = segments.slice(Math.max(0, segments.length - absCount)).join("").length;

    return Math.max(0, startIndex - taken);
  }
}

/**
 * @description
 * Apply a select event to the typewriter state.
 * Computes a concrete `{from, to}` selection range from the event's `count` and `by`
 * fields relative to the cursor's current index.
 * A positive `count` selects forward; a negative `count` selects backward.
 *
 * @param state - The current typewriter state
 * @param event - The select event to apply
 * @returns A new TTypewriterState with the selection field updated
 */
export function selectText(state: TTypewriterState, event: TSelectEvent): TTypewriterState {
  const cursor: TNullable<TCursorState> = state.cursors[event.cursorId] ?? null;

  if (cursor === null) {
    return state;
  }

  const cursorIndex = cursor.index;
  const endIndex = resolveEndIndex(state.document.text, cursorIndex, event.count, event.by);

  const from = Math.min(cursorIndex, endIndex);
  const to = Math.max(cursorIndex, endIndex);

  if (from === to) {
    return { ...state, selection: null };
  }

  const selection: TSelectionState = {
    cursorId: event.cursorId,
    from,
    to,
  };

  return { ...state, selection };
}
