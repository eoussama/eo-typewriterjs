import type { TInsertEvent } from "../events/insert-event.type";
import type { TCursorState } from "../state/cursor-state.type";
import type { TTextMark } from "../state/rich-text-document.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { withCursor, withSelectionCleared } from "../state/typewriter-state.type";



/**
 * @description
 * Apply an insert event to the typewriter state.
 * The text is inserted at the cursor's current index, the cursor advances
 * forward by the length of the inserted text, and any style is recorded as a mark.
 * The cursor's active selection is cleared.
 * If the cursor does not exist it is created at index 0 before inserting.
 *
 * @param state - The current typewriter state
 * @param event - The insert event to apply
 * @returns A new TTypewriterState with the text inserted and cursor advanced
 */
export function insertTextAtCursor(state: TTypewriterState, event: TInsertEvent): TTypewriterState {
  const ensured = withCursor(state, event.cursorId);
  // withCursor guarantees the cursor exists
  const cursor = ensured.cursors[event.cursorId] as TCursorState;

  const insertIndex = cursor.index;
  const text = event.text;
  const currentText = ensured.document.text;

  const nextText = currentText.slice(0, insertIndex) + text + currentText.slice(insertIndex);

  const insertedLength = text.length;
  const nextIndex = insertIndex + insertedLength;

  const nextMarks: TTextMark[] = [...ensured.document.marks];

  if (event.style !== undefined) {
    nextMarks.push({
      from: insertIndex,
      to: nextIndex,
      style: event.style,
    });
  }

  const afterInsert: TTypewriterState = {
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

  return withSelectionCleared(afterInsert, event.cursorId);
}
