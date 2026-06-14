import type { TNullable } from "@eoussama/core";
import type { TMoveCursorEvent } from "../events/move-cursor-event.type";
import type { TCursorState } from "../state/cursor-state.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { withCursor, withSelectionCleared } from "../state/typewriter-state.type";



/**
 * @description
 * Apply a move-cursor event to the typewriter state.
 * Teleports the cursor to the given absolute index, clamped to [0, document length].
 * The cursor's active selection is cleared.
 * If the cursor does not exist it is created at the clamped index.
 *
 * @param state - The current typewriter state
 * @param event - The move-cursor event to apply
 * @returns A new TTypewriterState with the cursor repositioned
 */
export function moveCursor(state: TTypewriterState, event: TMoveCursorEvent): TTypewriterState {
  const ensured = withCursor(state, event.cursorId);
  // withCursor guarantees the cursor exists
  const cursor = ensured.cursors[event.cursorId] as TCursorState;

  const clampedIndex = Math.max(0, Math.min(event.index, ensured.document.text.length));

  const afterMove: TTypewriterState = {
    ...ensured,
    cursors: {
      ...ensured.cursors,
      [event.cursorId]: {
        ...cursor,
        index: clampedIndex,
      },
    },
  };

  return withSelectionCleared(afterMove, event.cursorId);
}
