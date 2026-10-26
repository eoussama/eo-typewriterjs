import type { TSelectionState, TTypewriterState } from "../../state/types/typewriter-state.type";

import { withSelectionCleared } from "../../state/helpers/typewriter-state.helper";



/**
 * @description
 * Remove the text in `[removeStart, removeEnd)` on behalf of a cursor.
 * The acting cursor is placed at `removeStart` and its selection is cleared.
 * Styles fully inside the range are dropped and the others are clipped or shifted.
 * Other cursors and selections are reflowed around the removed range.
 *
 * @param state - The current typewriter state, with the acting cursor present
 * @param cursorId - The cursor performing the removal
 * @param removeStart - The start index of the range (inclusive)
 * @param removeEnd - The end index of the range (exclusive)
 * @returns A new TTypewriterState with the range removed
 */
export function removeRange(
  state: TTypewriterState,
  cursorId: string,
  removeStart: number,
  removeEnd: number,
): TTypewriterState {
  const deletedLength = removeEnd - removeStart;
  const text = state.document.text;

  const shiftPoint = (point: number): number => {
    if (point >= removeEnd) {
      return point - deletedLength;
    }

    return point > removeStart ? removeStart : point;
  };

  const styles = state.document.styles
    .filter(entry => !(entry.from >= removeStart && entry.to <= removeEnd))
    .map(entry => ({ ...entry, from: shiftPoint(entry.from), to: shiftPoint(entry.to) }));

  const cursors = Object.fromEntries(
    Object.entries(state.cursors).map(([id, cur]) => [
      id,
      { ...cur, index: id === cursorId ? removeStart : shiftPoint(cur.index) },
    ]),
  );

  const selections = Object.fromEntries(
    Object.entries(state.selections).map(([id, sel]): [string, TSelectionState] => [
      id,
      id === cursorId ? sel : { from: shiftPoint(sel.from), to: shiftPoint(sel.to) },
    ]),
  );

  return withSelectionCleared({
    document: { text: text.slice(0, removeStart) + text.slice(removeEnd), styles },
    cursors,
    selections,
  }, cursorId);
}
