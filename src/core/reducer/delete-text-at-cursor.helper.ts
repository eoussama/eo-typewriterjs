import type { TDeleteEvent } from "../events/delete-event.type";
import type { TCursorState } from "../state/cursor-state.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { withCursor, withSelectionCleared } from "../state/typewriter-state.type";
import { segmentText } from "../stepping/segment-text.helper";



/**
 * @description
 * Apply a delete event to the typewriter state.
 * Removes `count` characters backward from the cursor position,
 * moves the cursor backward by the same amount, and trims any marks
 * that overlap the deleted range.
 * All other cursors whose index is at or after the deletion end are shifted
 * backward by the deleted length; cursors inside the deleted range are clamped
 * to removeStart.
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

  // Resolve the logical unit count to an actual character count.
  // For "char" and "grapheme" this is a 1:1 mapping; for "word" and "line"
  // we segment the text before the cursor and take the last `count` segments.
  const charCount = (() => {
    const unit = event.unit;

    if (unit === "char" || unit === "grapheme" || unit === "custom") {
      return event.count;
    }

    const head = ensured.document.text.slice(0, removeEnd);
    const segments = segmentText(head, unit);
    const taken = segments.slice(Math.max(0, segments.length - event.count));

    return taken.join("").length;
  })();

  const removeStart = Math.max(0, removeEnd - charCount);

  if (removeStart === removeEnd) {
    return withSelectionCleared(ensured, event.cursorId);
  }

  const deletedLength = removeEnd - removeStart;
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

  // Shift all other cursors whose index falls at or after the deleted range
  const updatedCursors = Object.fromEntries(
    Object.entries(ensured.cursors).map(([id, cur]) => {
      if (id === event.cursorId) {
        return [id, { ...cur, index: nextIndex }];
      }

      if (cur.index >= removeEnd) {
        return [id, { ...cur, index: cur.index - deletedLength }];
      }

      if (cur.index > removeStart) {
        return [id, { ...cur, index: removeStart }];
      }

      return [id, cur];
    }),
  ) as TTypewriterState["cursors"];

  // Shift selections of other cursors
  const updatedSelections = Object.fromEntries(
    Object.entries(ensured.selections).map(([id, sel]) => {
      if (id === event.cursorId || sel === undefined) {
        return [id, sel];
      }

      const shiftedFrom = sel.from >= removeEnd
        ? sel.from - deletedLength
        : sel.from > removeStart
          ? removeStart
          : sel.from;

      const shiftedTo = sel.to >= removeEnd
        ? sel.to - deletedLength
        : sel.to > removeStart
          ? removeStart
          : sel.to;

      return [id, { from: shiftedFrom, to: shiftedTo }];
    }),
  ) as TTypewriterState["selections"];

  const afterDelete: TTypewriterState = {
    ...ensured,
    document: {
      text: nextText,
      marks: nextMarks,
    },
    cursors: updatedCursors,
    selections: updatedSelections,
  };

  return withSelectionCleared(afterDelete, event.cursorId);
}
