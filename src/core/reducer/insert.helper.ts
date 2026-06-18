import type { TInsertEvent } from "../events/insert-event.type";
import type { TCursorState } from "../state/cursor-state.type";
import type { TTextMark } from "../state/rich-text-document.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { withCursor, withSelectionCleared } from "../state/typewriter-state.type";



/**
 * @description
 * Apply an insert event to the typewriter state.
 * The text is inserted at the cursor's current index, the cursor advances
 * forward by the length of the inserted text, and any style is recorded as a style.
 * All other cursors whose index is strictly after the insertion point are shifted
 * forward by the inserted length so that their logical positions remain correct.
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

  // Shift all other cursors and selections that are positioned after the insertion point
  const updatedCursors = Object.fromEntries(
    Object.entries(ensured.cursors).map(([id, cur]) => {
      if (id === event.cursorId) {
        return [id, { ...cur, index: nextIndex }];
      }

      if (cur.index > insertIndex) {
        return [id, { ...cur, index: cur.index + insertedLength }];
      }

      return [id, cur];
    }),
  ) as TTypewriterState["cursors"];

  // Shift selections of other cursors that reference positions after the insertion point
  const updatedSelections = Object.fromEntries(
    Object.entries(ensured.selections).map(([id, sel]) => {
      if (id === event.cursorId || sel === undefined) {
        return [id, sel];
      }

      return [id, {
        from: sel.from > insertIndex ? sel.from + insertedLength : sel.from,
        to: sel.to > insertIndex ? sel.to + insertedLength : sel.to,
      }];
    }),
  ) as TTypewriterState["selections"];

  const afterInsert: TTypewriterState = {
    ...ensured,
    document: {
      text: nextText,
      marks: nextMarks,
    },
    cursors: updatedCursors,
    selections: updatedSelections,
  };

  return withSelectionCleared(afterInsert, event.cursorId);
}
