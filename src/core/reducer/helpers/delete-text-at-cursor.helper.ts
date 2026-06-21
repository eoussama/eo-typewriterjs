import type { TDeleteEvent } from "../../events/types/delete-event.type";
import type { TCursorState } from "../../state/types/cursor-state.type";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";

import { getSelection, withCursor, withSelectionCleared } from "../../state/helpers/typewriter-state.helper";
import { segmentText } from "../../stepping/helpers/segment-text.helper";



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
 * Delete the text covered by the cursor's active selection and clear the selection.
 * The cursor is placed at the start of the removed range.
 * Other cursors and selections are reflowed around the removed range.
 *
 * @param state - The current typewriter state (cursor already ensured, selection present)
 * @param event - The originating delete event (used only for cursorId)
 * @param removeStart - The start index of the selection (inclusive)
 * @param removeEnd - The end index of the selection (exclusive)
 * @returns A new TTypewriterState with the selection range removed
 */
function applySelectionDelete(
  state: TTypewriterState,
  event: TDeleteEvent,
  removeStart: number,
  removeEnd: number,
): TTypewriterState {
  const text = state.document.text;
  const deletedLength = removeEnd - removeStart;
  const nextText = text.slice(0, removeStart) + text.slice(removeEnd);
  const nextIndex = removeStart;

  const nextStyles = state.document.styles
    .filter(entry => !(entry.from >= removeStart && entry.to <= removeEnd))
    .map(entry => ({
      ...entry,
      /* v8 ignore next */
      from: entry.from > removeStart ? Math.max(removeStart, entry.from - deletedLength) : entry.from,
      /* v8 ignore next */
      to: entry.to > removeStart ? Math.max(removeStart, entry.to - deletedLength) : entry.to,
    }));

  const updatedCursors = Object.fromEntries(
    Object.entries(state.cursors).map(([id, cur]) => {
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
    Object.entries(state.selections).map(([id, sel]) => {
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
    ...state,
    document: { text: nextText, styles: nextStyles },
    cursors: updatedCursors,
    selections: updatedSelections,
  };

  return withSelectionCleared(afterDelete, event.cursorId);
}

/**
 * @description
 * Apply a delete event to the typewriter state.
 *
 * If the cursor has an active selection and the operand is not `"whole"`, the
 * selection range is deleted and the directional/boundary operand is ignored.
 *
 * Boundary operand semantics (when no selection is active):
 * - `"whole"`: delete the entire document
 * - `"start"`: delete from cursor back to document start
 * - `"end"`: delete from cursor forward to document end
 *
 * Numeric direction semantics (when no selection is active):
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

  // "whole" always clears everything regardless of selection
  if (event.boundary === "whole") {
    return applyWholeDelete(ensured);
  }

  // If the cursor has an active selection, delete that range and ignore the operand
  const selection = getSelection(ensured, event.cursorId);

  if (selection !== null) {
    return applySelectionDelete(ensured, event, selection.from, selection.to);
  }

  // No active selection: apply directional / boundary semantics as before
  if (event.boundary === "start") {
    if (cursorIndex === 0) {
      return withSelectionCleared(ensured, event.cursorId);
    }

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
    const unit = event.unit;

    if (unit === "char" || unit === "grapheme") {
      removeEnd = cursorIndex;
      removeStart = Math.max(0, cursorIndex - event.count);
    }
    else {
      const head = text.slice(0, cursorIndex);
      const segments = segmentText(head, unit);

      if (unit === "line" && segments.length === 0 && cursorIndex < text.length) {
        // Cursor is at document start on a line with no preceding newline; consume forward.
        const tail = text.slice(cursorIndex);
        const fwdSegments = segmentText(tail, "line");
        const taken = fwdSegments.slice(0, event.count);

        removeStart = cursorIndex;
        removeEnd = Math.min(text.length, cursorIndex + taken.join("").length);
      }
      else {
        const taken = segments.slice(Math.max(0, segments.length - event.count));

        removeEnd = cursorIndex;
        removeStart = Math.max(0, cursorIndex - taken.join("").length);
      }
    }
  }
  else {
    const unit = event.unit;

    if (unit === "char" || unit === "grapheme") {
      removeStart = cursorIndex;
      removeEnd = Math.min(text.length, cursorIndex + event.count);
    }
    else {
      const tail = text.slice(cursorIndex);
      const segments = segmentText(tail, unit);

      if (unit === "line" && segments.length === 0 && cursorIndex > 0) {
        // Cursor is at end of a line with no trailing newline; consume backward to line start.
        const lineStart = text.lastIndexOf("\n", cursorIndex - 1) + 1;

        removeStart = lineStart;
        removeEnd = cursorIndex;
      }
      else {
        const taken = segments.slice(0, event.count);

        removeStart = cursorIndex;
        removeEnd = Math.min(text.length, cursorIndex + taken.join("").length);
      }
    }
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
