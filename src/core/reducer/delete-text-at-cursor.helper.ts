import type { TDeleteEvent } from "../events/delete-event.type";
import type { TCursorState } from "../state/cursor-state.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { withCursor, withSelectionCleared } from "../state/typewriter-state.type";
import { segmentText } from "../stepping/segment-text.helper";



/**
 * @description
 * Erase the entire document and reset all cursors to index 0, clearing all selections.
 *
 * @param state - The current typewriter state (with the event cursor already ensured)
 * @returns A new TTypewriterState with empty text and all cursors at 0
 */
function applyWholeDelete(state: TTypewriterState): TTypewriterState {
  const updatedCursors = Object.fromEntries(
    Object.entries(state.cursors).map(([id, cur]) => [id, { ...cur, index: 0 }]),
  ) as TTypewriterState["cursors"];

  let next: TTypewriterState = {
    ...state,
    document: { text: "", styles: [] },
    cursors: updatedCursors,
  };

  for (const id of Object.keys(state.selections)) {
    next = withSelectionCleared(next, id);
  }

  return next;
}

/**
 * @description
 * Apply a delete event to the typewriter state.
 *
 * Boundary operand semantics:
 * - `"whole"`: delete the entire document
 * - `"start"`: delete from cursor back to document start
 * - `"end"`: delete from cursor forward to document end
 *
 * Numeric direction semantics:
 * - direction === -1 (backward): removes `count` units before the cursor
 * - direction === 1 (forward): removes `count` units after the cursor
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
  const cursor = ensured.cursors[event.cursorId] as TCursorState;
  const cursorIndex = cursor.index;
  const text = ensured.document.text;

  // Boundary string operands
  if (event.boundary === "whole") {
    return applyWholeDelete(ensured);
  }

  if (event.boundary === "start") {
    if (cursorIndex === 0) {
      return withSelectionCleared(ensured, event.cursorId);
    }

    // Synthesise a backward-delete event for the range [0, cursorIndex]
    return deleteTextAtCursor(ensured, {
      ...event,
      boundary: undefined,
      count: cursorIndex,
      unit: "char",
      direction: -1,
    });
  }

  if (event.boundary === "end") {
    const remaining = text.length - cursorIndex;

    if (remaining <= 0) {
      return withSelectionCleared(ensured, event.cursorId);
    }

    return deleteTextAtCursor(ensured, {
      ...event,
      boundary: undefined,
      count: remaining,
      unit: "char",
      direction: 1,
    });
  }

  // Numeric deletion
  let removeStart: number;
  let removeEnd: number;

  if (event.direction === -1) {
    const charCount = (() => {
      const unit = event.unit;

      if (unit === "char" || unit === "grapheme") {
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
    const charCount = (() => {
      const unit = event.unit;

      if (unit === "char" || unit === "grapheme") {
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
  const nextIndex = removeStart;

  const nextStyles = ensured.document.styles
    .filter(entry => !(entry.from >= removeStart && entry.to <= removeEnd))
    .map(entry => ({
      ...entry,
      /* v8 ignore next */
      from: entry.from > removeStart ? Math.max(removeStart, entry.from - (removeEnd - removeStart)) : entry.from,
      /* v8 ignore next */
      to: entry.to > removeStart ? Math.max(removeStart, entry.to - (removeEnd - removeStart)) : entry.to,
    }));

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
