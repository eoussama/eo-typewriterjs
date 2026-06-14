import type { TNullable } from "@eoussama/core";
import type { TMoveCursorEvent } from "../events/move-cursor-event.type";
import type { TCursorState } from "../state/cursor-state.type";
import type { TTypewriterState } from "../state/typewriter-state.type";



/**
 * @description
 * Apply a move-cursor event to the typewriter state.
 * Teleports the cursor to the given absolute index, clamped to [0, document length].
 *
 * @param state - The current typewriter state
 * @param event - The move-cursor event to apply
 * @returns A new TTypewriterState with the cursor repositioned
 */
export function moveCursor(state: TTypewriterState, event: TMoveCursorEvent): TTypewriterState {
  const cursor: TNullable<TCursorState> = state.cursors[event.cursorId] ?? null;

  if (cursor === null) {
    return state;
  }

  const clampedIndex = Math.max(0, Math.min(event.index, state.document.text.length));

  return {
    ...state,
    cursors: {
      ...state.cursors,
      [event.cursorId]: {
        ...cursor,
        index: clampedIndex,
      },
    },
  };
}
