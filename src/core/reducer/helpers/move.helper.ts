import type { TAdvanceModeInput } from "../../commands/types/type-command.type";
import type { TMoveEvent } from "../../events/types/move-event.type";
import type { TCursorState } from "../../state/types/cursor-state.type";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";

import { withCursor, withSelectionCleared } from "../../state/helpers/typewriter-state.helper";
import { advanceIndex } from "./advance-index.helper";



/**
 * @description
 * Compute the index reached by advancing `offset` steps of the advance mode from `startIndex`.
 *
 * @param text - The current document text
 * @param startIndex - The cursor position to start from
 * @param offset - Number of steps to move; positive = right, negative = left
 * @param by - The advance mode controlling unit granularity and units per step
 * @returns The resolved absolute index clamped to [0, text.length]
 */
function resolveIndex(text: string, startIndex: number, offset: number, by: TAdvanceModeInput): number {
  const unit = typeof by === "string" ? by : by.unit;
  const amount = typeof by === "string" ? 1 : by.amount;

  return advanceIndex(text, startIndex, offset * amount, unit);
}

/**
 * @description
 * Apply a move event to the typewriter state.
 *
 * Boundary operand semantics:
 * - `"start"`: jump cursor to absolute document start (index 0)
 * - `"end"`: jump cursor to absolute document end (index text.length)
 *
 * Numeric operand semantics:
 * - Moves the cursor forward or backward by `offset` units relative to its current position.
 *
 * The cursor's active selection is cleared.
 * If the cursor does not exist it is created at index 0 before moving.
 *
 * @param state - The current typewriter state
 * @param event - The move event to apply
 * @returns A new TTypewriterState with the cursor repositioned
 */
export function move(state: TTypewriterState, event: TMoveEvent): TTypewriterState {
  const ensured = withCursor(state, event.cursorId);
  const cursor = ensured.cursors[event.cursorId] as TCursorState;

  let newIndex: number;

  if (event.boundary === "start") {
    newIndex = 0;
  }
  else if (event.boundary === "end") {
    newIndex = ensured.document.text.length;
  }
  else {
    newIndex = resolveIndex(ensured.document.text, cursor.index, event.offset, event.by);
  }

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
