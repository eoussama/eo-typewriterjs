import type { TDeleteEvent } from "../events/delete-event.type";
import type { TCursorState } from "../state/cursor-state.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { withCursor, withSelectionCleared } from "../state/typewriter-state.type";



/**
 * @description
 * Apply a delete event to the typewriter state.
 * Removes `count` characters backward from the cursor position,
 * moves the cursor backward by the same amount, and trims any marks
 * that overlap the deleted range.
 * The cursor's active selection is cleared.
 * If the cursor does not exist it is created at index 0 (no deletion occurs).
 *
 * @param state - The current typewriter state
 * @param event - The delete event to apply
 * @returns A new TTypewriterState with the text removed and cursor moved back
 */
export function deleteTextAtCursor(state: TTypewriterState, event: TDeleteEvent): TTypewriterState {
  const ensured = withCursor(state, event.cursorId);
  // withCursor guarantees the cursor exists
  const cursor = ensured.cursors[event.cursorId] as TCursorState;

  const removeEnd = cursor.index;
  const removeStart = Math.max(0, removeEnd - event.count);

  if (removeStart === removeEnd) {
    return withSelectionCleared(ensured, event.cursorId);
  }

  const currentText = ensured.document.text;
  const nextText = currentText.slice(0, removeStart) + currentText.slice(removeEnd);
  const nextIndex = removeStart;

  // Adjust marks: remove marks fully within the deleted range,
  // clamp marks that partially overlap it
  const nextMarks = ensured.document.marks
    .filter(mark => !(mark.from >= removeStart && mark.to <= removeEnd))
    .map(mark => ({
      ...mark,
      /* v8 ignore next */
      from: mark.from > removeStart ? Math.max(removeStart, mark.from - (removeEnd - removeStart)) : mark.from,
      /* v8 ignore next */
      to: mark.to > removeStart ? Math.max(removeStart, mark.to - (removeEnd - removeStart)) : mark.to,
    }));

  const afterDelete: TTypewriterState = {
    ...ensured,
    document: {
      text: nextText,
      marks: nextMarks,
    },
    cursors: {
      ...ensured.cursors,
      [event.cursorId]: {
        ...cursor,
        index: nextIndex,
      },
    },
  };

  return withSelectionCleared(afterDelete, event.cursorId);
}
