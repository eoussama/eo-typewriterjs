import type { TDeleteEvent } from "../events/delete-event.type";
import type { TCursorState } from "../state/cursor-state.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { withCursor, withSelectionCleared } from "../state/typewriter-state.type";
import { segmentText } from "../stepping/segment-text.helper";



/**
 * @description
 * Apply a delete event to the typewriter state.
 *
 * Direction semantics:
 * - direction === -1 (backward): removes `count` units before the cursor
 * - direction === 1 (forward): removes `count` units after the cursor
 * - count === 0: removes the entire document text
 *
 * The cursor's active selection is cleared.
 * All other cursors whose index overlaps or follows the deleted range are adjusted.
 *
 * @param state - The current typewriter state
 * @param event - The delete event to apply
 * @returns A new TTypewriterState with the text removed and cursor adjusted
 */
export function deleteTextAtCursor(state: TTypewriterState, event: TDeleteEvent): TTypewriterState {
  const ensured = withCursor(state, event.cursorId);
  // withCursor guarantees the cursor exists
  const cursor = ensured.cursors[event.cursorId] as TCursorState;
  const cursorIndex = cursor.index;
  const text = ensured.document.text;

  // Whole-document deletion
  if (event.count === 0) {
    const updatedCursors = Object.fromEntries(
      Object.entries(ensured.cursors).map(([id, cur]) => [id, { ...cur, index: 0 }]),
    ) as TTypewriterState["cursors"];

    let afterWhole: TTypewriterState = {
      ...ensured,
      document: { text: "", styles: [] },
      cursors: updatedCursors,
    };

    for (const id of Object.keys(ensured.selections)) {
      afterWhole = withSelectionCleared(afterWhole, id);
    }

    return afterWhole;
  }

  let removeStart: number;
  let removeEnd: number;

  if (event.direction === -1) {
    // Backward deletion: resolve `count` units before the cursor
    const charCount = (() => {
      const unit = event.unit;

      if (unit === "char" || unit === "grapheme" || unit === "whole") {
        return event.count;
      }

      const head = text.slice(0, cursorIndex);
      const segments = segmentText(head, unit);
      const taken = segments.slice(Math.max(0, segments.length - event.count));

      return taken.join("").length;
    })();

    removeEnd = cursorIndex;
    removeStart = Math.max(0, cursorIndex - charCount);
  }
  else {
    // Forward deletion: resolve `count` units after the cursor
    const charCount = (() => {
      const unit = event.unit;

      if (unit === "char" || unit === "grapheme" || unit === "whole") {
        return event.count;
      }

      const tail = text.slice(cursorIndex);
      const segments = segmentText(tail, unit);
      const taken = segments.slice(0, event.count);

      return taken.join("").length;
    })();

    removeStart = cursorIndex;
    removeEnd = Math.min(text.length, cursorIndex + charCount);
  }

  if (removeStart === removeEnd) {
    return withSelectionCleared(ensured, event.cursorId);
  }

  const deletedLength = removeEnd - removeStart;
  const nextText = text.slice(0, removeStart) + text.slice(removeEnd);
  const nextIndex = event.direction === -1 ? removeStart : removeStart;

  // Adjust styles: remove styles fully within the deleted range,
  // clamp styles that partially overlap it
  const nextStyles = ensured.document.styles
    .filter(entry => !(entry.from >= removeStart && entry.to <= removeEnd))
    .map(entry => ({
      ...entry,
      /* v8 ignore next */
      from: entry.from > removeStart ? Math.max(removeStart, entry.from - (removeEnd - removeStart)) : entry.from,
      /* v8 ignore next */
      to: entry.to > removeStart ? Math.max(removeStart, entry.to - (removeEnd - removeStart)) : entry.to,
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
      styles: nextStyles,
    },
    cursors: updatedCursors,
    selections: updatedSelections,
  };

  return withSelectionCleared(afterDelete, event.cursorId);
}
