import type { TUnmarkEvent } from "../events/unmark-event.type";
import type { TTextMark } from "../state/rich-text-document.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { withSelectionCleared } from "../state/typewriter-state.type";



/**
 * @description
 * Clip or remove marks that overlap a given [from, to) range.
 * Marks entirely outside the range are preserved unchanged.
 * Marks entirely inside the range are removed.
 * Marks that partially overlap the range are clipped to exclude the range.
 * Marks that span across the entire range are split into two fragments.
 *
 * @param marks - The current array of text marks
 * @param from - The start of the range to remove (inclusive)
 * @param to - The end of the range to remove (exclusive)
 * @returns A new array of text marks with the range cleared
 */
function clipMarks(marks: readonly TTextMark[], from: number, to: number): readonly TTextMark[] {
  const result: TTextMark[] = [];

  for (const mark of marks) {
    if (mark.to <= from || mark.from >= to) {
      result.push(mark);
    }
    else if (mark.from < from && mark.to > to) {
      result.push({ ...mark, to: from });
      result.push({ ...mark, from: to });
    }
    else if (mark.from < from) {
      result.push({ ...mark, to: from });
    }
    else if (mark.to > to) {
      result.push({ ...mark, from: to });
    }
  }

  return result;
}

/**
 * @description
 * Apply an unmark event to the typewriter state by removing or clipping all marks
 * that overlap the target range.
 * When the event is selection-based (`from === -1 && to === -1`), the actual range is
 * resolved from the named cursor's active selection. If the cursor has no active selection
 * the state is returned unchanged.
 *
 * @param state - The current typewriter state
 * @param event - The unmark event to apply
 * @returns A new TTypewriterState with marks in the range removed or clipped
 */
export function removeMarks(state: TTypewriterState, event: TUnmarkEvent): TTypewriterState {
  let from = event.from;
  let to = event.to;

  let clearedSelection = false;

  if (from === -1 && to === -1) {
    const cursorId = event.cursorId;

    if (cursorId === undefined) {
      return state;
    }

    const selection = state.selections[cursorId];

    if (selection === undefined) {
      return state;
    }

    from = selection.from;
    to = selection.to;
    clearedSelection = true;
  }

  if (from >= to) {
    return state;
  }

  const withUpdatedMarks: TTypewriterState = {
    ...state,
    document: {
      ...state.document,
      marks: clipMarks(state.document.marks, from, to),
    },
  };

  if (clearedSelection && event.cursorId !== undefined) {
    return withSelectionCleared(withUpdatedMarks, event.cursorId);
  }

  return withUpdatedMarks;
}
