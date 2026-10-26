import type { TDeleteEvent } from "../../events/types/delete-event.type";
import type { TCursorState } from "../../state/types/cursor-state.type";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";

import { getSelection, withCursor } from "../../state/helpers/typewriter-state.helper";
import { advanceIndex } from "./advance-index.helper";
import { removeRange } from "./remove-range.helper";



/**
 * @description
 * Erase the entire document and reset all cursors to index 0, clearing all selections.
 *
 * @param state - The current typewriter state (with the event cursor already ensured)
 * @returns A new TTypewriterState with empty text and all cursors at 0
 */
function applyWholeDelete(state: TTypewriterState): TTypewriterState {
  const cursors = Object.fromEntries(
    Object.entries(state.cursors).map(([id, cur]) => [id, { ...cur, index: 0 }]),
  );

  return {
    document: { text: "", styles: [] },
    cursors,
    selections: {},
  };
}

/**
 * @description
 * Resolve the `[start, end)` range removed by a numeric delete event.
 *
 * Deleting by line is special-cased at the edges of the text: a backward line delete
 * with no line before the cursor removes the line after it, and a forward line delete
 * with no line after the cursor removes back to the start of the current line.
 *
 * @param text - The document text
 * @param cursorIndex - The deleting cursor's index
 * @param event - The numeric delete event
 * @returns The range to remove
 */
function resolveDeleteRange(text: string, cursorIndex: number, event: TDeleteEvent): [number, number] {
  if (event.unit === "line") {
    if (event.direction === -1 && cursorIndex === 0) {
      return [0, advanceIndex(text, 0, event.count, "line")];
    }

    if (event.direction === 1 && cursorIndex === text.length) {
      return [text.lastIndexOf("\n") + 1, cursorIndex];
    }
  }

  const target = advanceIndex(text, cursorIndex, event.direction * event.count, event.unit);

  return event.direction === -1 ? [target, cursorIndex] : [cursorIndex, target];
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
 * Character and grapheme deletes always remove whole grapheme clusters.
 * The cursor's active selection is cleared.
 * All other cursors whose index overlaps or follows the deleted range are adjusted.
 *
 * @param state - The current typewriter state
 * @param event - The delete event to apply
 * @returns A new TTypewriterState with the text removed and cursor adjusted
 */
export function deleteTextAtCursor(state: TTypewriterState, event: TDeleteEvent): TTypewriterState {
  const ensured = withCursor(state, event.cursorId);
  const cursorIndex = (ensured.cursors[event.cursorId] as TCursorState).index;
  const text = ensured.document.text;

  // "whole" always clears everything regardless of selection
  if (event.boundary === "whole") {
    return applyWholeDelete(ensured);
  }

  // If the cursor has an active selection, delete that range and ignore the operand
  const selection = getSelection(ensured, event.cursorId);

  if (selection !== null) {
    return removeRange(ensured, event.cursorId, selection.from, selection.to);
  }

  let removeStart: number;
  let removeEnd: number;

  if (event.boundary === "start") {
    [removeStart, removeEnd] = [0, cursorIndex];
  }
  else if (event.boundary === "end") {
    [removeStart, removeEnd] = [cursorIndex, text.length];
  }
  else {
    [removeStart, removeEnd] = resolveDeleteRange(text, cursorIndex, event);
  }

  return removeRange(ensured, event.cursorId, removeStart, removeEnd);
}
