import type { TNullable } from "@eoussama/core";
import type { TInsertEvent } from "../events/insert-event.type";
import type { TCursorState } from "../state/cursor-state.type";
import type { TTextMark } from "../state/rich-text-document.type";

import type { TTypewriterState } from "../state/typewriter-state.type";



/**
 * @description
 * Apply an insert event to the typewriter state.
 * The text is inserted at the cursor's current index, the cursor advances
 * forward by the length of the inserted text, and any style is recorded as a mark.
 *
 * @param state - The current typewriter state
 * @param event - The insert event to apply
 * @returns A new TTypewriterState with the text inserted and cursor advanced
 */
export function insertTextAtCursor(state: TTypewriterState, event: TInsertEvent): TTypewriterState {
  const cursor: TNullable<TCursorState> = state.cursors[event.cursorId] ?? null;

  if (cursor === null) {
    return state;
  }

  const insertIndex = cursor.index;
  const text = event.text;
  const currentText = state.document.text;

  const nextText = currentText.slice(0, insertIndex) + text + currentText.slice(insertIndex);

  const insertedLength = text.length;
  const nextIndex = insertIndex + insertedLength;

  const nextMarks: TTextMark[] = [...state.document.marks];

  if (event.style !== undefined) {
    nextMarks.push({
      from: insertIndex,
      to: nextIndex,
      style: event.style,
    });
  }

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
    selection: null,
  };
}
