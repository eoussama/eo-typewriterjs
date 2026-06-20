import type { TAdvanceModeInput } from "../commands/type-command.type";
import type { TMoveEvent } from "../events/move-event.type";
import type { TCursorState } from "../state/cursor-state.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { withCursor, withSelectionCleared } from "../state/typewriter-state.type";
import { segmentText } from "../stepping/segment-text.helper";



/**
 * @description
 * Compute the absolute character index reached by advancing `offset` units from
 * `startIndex` in `text`. Positive offset moves right; negative offset moves left.
 *
 * @param text - The current document text
 * @param startIndex - The cursor position to start from
 * @param offset - Number of units to move; positive = right, negative = left
 * @param by - The advance mode controlling unit granularity
 * @returns The resolved absolute index clamped to [0, text.length]
 */
function resolveIndex(text: string, startIndex: number, offset: number, by: TAdvanceModeInput): number {
  const unit = (typeof by === "string" ? by : by.unit) as Parameters<typeof segmentText>[1];
  const amount = Math.max(1, typeof by === "string" ? 1 : by.amount);
  const absOffset = Math.abs(offset) * amount;

  if (offset > 0) {
    const tail = text.slice(startIndex);
    const segments = segmentText(tail, unit);
    const taken = segments.slice(0, absOffset).join("").length;

    return Math.min(text.length, startIndex + taken);
  }

  const head = text.slice(0, startIndex);
  const segments = segmentText(head, unit);
  const taken = segments.slice(Math.max(0, segments.length - absOffset)).join("").length;

  return Math.max(0, startIndex - taken);
}

/**
 * @description
 * Apply a move event to the typewriter state.
 * Moves the cursor forward or backward by `offset` units relative to its current position.
 * The cursor's active selection is cleared.
 * If the cursor does not exist it is created at index 0 before moving.
 *
 * @param state - The current typewriter state
 * @param event - The move event to apply
 * @returns A new TTypewriterState with the cursor repositioned
 */
export function move(state: TTypewriterState, event: TMoveEvent): TTypewriterState {
  const ensured = withCursor(state, event.cursorId);
  // withCursor guarantees the cursor exists
  const cursor = ensured.cursors[event.cursorId] as TCursorState;

  const newIndex = resolveIndex(ensured.document.text, cursor.index, event.offset, event.by);

  const afterMove: TTypewriterState = {
    ...ensured,
    cursors: {
      ...ensured.cursors,
      [event.cursorId]: {
        ...cursor,
        index: newIndex,
      },
    },
  };

  return withSelectionCleared(afterMove, event.cursorId);
}
