import type { TNullable } from "@eoussama/core";
import type { TDeleteEvent } from "../events/delete-event.type";
import type { TCursorState } from "../state/cursor-state.type";
import type { TTypewriterState } from "../state/typewriter-state.type";



/**
 * @description
 * Apply a delete event to the typewriter state.
 * Removes `count` characters backward from the cursor position,
 * moves the cursor backward by the same amount, and trims any marks
 * that overlap the deleted range.
 *
 * @param state - The current typewriter state
 * @param event - The delete event to apply
 * @returns A new TTypewriterState with the text removed and cursor moved back
 */
export function deleteTextAtCursor(state: TTypewriterState, event: TDeleteEvent): TTypewriterState {
  const cursor: TNullable<TCursorState> = state.cursors[event.cursorId] ?? null;

  if (cursor === null) {
    return state;
  }

  const removeEnd = cursor.index;
  const removeStart = Math.max(0, removeEnd - event.count);

  if (removeStart === removeEnd) {
    return state;
  }

  const currentText = state.document.text;
  const nextText = currentText.slice(0, removeStart) + currentText.slice(removeEnd);
  const nextIndex = removeStart;

  // Adjust marks: remove marks fully within the deleted range,
  // clamp marks that partially overlap it
  const nextMarks = state.document.marks
    .filter(mark => !(mark.from >= removeStart && mark.to <= removeEnd))
    .map(mark => ({
      ...mark,
      from: mark.from > removeStart ? Math.max(removeStart, mark.from - (removeEnd - removeStart)) : mark.from,
      to: mark.to > removeStart ? Math.max(removeStart, mark.to - (removeEnd - removeStart)) : mark.to,
    }));

  return {
    document: {
      text: nextText,
      marks: nextMarks,
    },
    cursors: {
      ...state.cursors,
      [event.cursorId]: {
        ...cursor,
        index: nextIndex,
      },
    },
  };
}
