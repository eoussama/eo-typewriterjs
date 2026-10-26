import type { TInsertEvent } from "../../events/types/insert-event.type";
import type { TCursorState } from "../../state/types/cursor-state.type";
import type { TTextStyle } from "../../state/types/rich-text-document.type";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";

import { getSelection, withCursor, withSelectionCleared } from "../../state/helpers/typewriter-state.helper";



/**
 * @description
 * Apply an insert event to the typewriter state.
 * The text is inserted at the cursor's current index, the cursor advances
 * forward by the length of the inserted text, and any style is recorded as a style.
 * Existing styles after the insertion point shift right, and a style that the
 * insertion lands strictly inside grows to include the new text.
 * All other cursors whose index is strictly after the insertion point are shifted
 * forward by the inserted length so that their logical positions remain correct.
 * The cursor's active selection is cleared.
 * If the cursor does not exist it is created at index 0 before inserting.
 * If the cursor has an active selection the selected range is replaced with the
 * new text rather than inserted alongside the existing content.
 *
 * @param state - The current typewriter state
 * @param event - The insert event to apply
 * @returns A new TTypewriterState with the text inserted and cursor advanced
 */
export function insertTextAtCursor(state: TTypewriterState, event: TInsertEvent): TTypewriterState {
  const ensured = withCursor(state, event.cursorId);
  const cursor = ensured.cursors[event.cursorId] as TCursorState;
  const selection = getSelection(ensured, event.cursorId);

  const text = event.text;
  const insertedLength = text.length;
  const currentText = ensured.document.text;

  if (selection === null) {
    // No active selection: plain insertion at cursor position (original behaviour)
    const insertIndex = cursor.index;
    const nextText = currentText.slice(0, insertIndex) + text + currentText.slice(insertIndex);
    const nextIndex = insertIndex + insertedLength;

    // Styles after the insertion point shift right; a style the insertion lands inside grows with it.
    const nextStyles: TTextStyle[] = ensured.document.styles.map((entry) => {
      if (entry.from >= insertIndex) {
        return { ...entry, from: entry.from + insertedLength, to: entry.to + insertedLength };
      }

      return entry.to > insertIndex ? { ...entry, to: entry.to + insertedLength } : entry;
    });

    if (event.style !== undefined) {
      const last = nextStyles[nextStyles.length - 1];

      // Consecutive chunks typed with the same style extend one entry instead of stacking new ones.
      if (last !== undefined && last.style === event.style && last.to === insertIndex) {
        nextStyles[nextStyles.length - 1] = { ...last, to: nextIndex };
      }
      else {
        nextStyles.push({ from: insertIndex, to: nextIndex, style: event.style });
      }
    }

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
      document: { text: nextText, styles: nextStyles },
      cursors: updatedCursors,
      selections: updatedSelections,
    };

    return withSelectionCleared(afterInsert, event.cursorId);
  }

  // Active selection: replace the selected range with the new text
  const removeStart = selection.from;
  const removeEnd = selection.to;
  const deletedLength = removeEnd - removeStart;
  const netDelta = insertedLength - deletedLength;

  const nextText = currentText.slice(0, removeStart) + text + currentText.slice(removeEnd);
  const nextIndex = removeStart + insertedLength;

  // Drop styles fully within the removed range; shift styles after it by netDelta
  const nextStyles: TTextStyle[] = ensured.document.styles
    .filter(entry => !(entry.from >= removeStart && entry.to <= removeEnd))
    .map((entry) => {
      const shiftPoint = (p: number): number => {
        if (p > removeEnd) {
          return p + netDelta;
        }

        if (p > removeStart) {
          return removeStart + insertedLength;
        }

        return p;
      };

      return { ...entry, from: shiftPoint(entry.from), to: shiftPoint(entry.to) };
    });

  if (event.style !== undefined) {
    nextStyles.push({ from: removeStart, to: nextIndex, style: event.style });
  }

  const updatedCursors = Object.fromEntries(
    Object.entries(ensured.cursors).map(([id, cur]) => {
      if (id === event.cursorId) {
        return [id, { ...cur, index: nextIndex }];
      }

      if (cur.index > removeEnd) {
        return [id, { ...cur, index: cur.index + netDelta }];
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

      const shiftPoint = (p: number): number => {
        if (p > removeEnd) {
          return p + netDelta;
        }

        if (p > removeStart) {
          return removeStart;
        }

        return p;
      };

      return [id, { from: shiftPoint(sel.from), to: shiftPoint(sel.to) }];
    }),
  ) as TTypewriterState["selections"];

  const afterInsert: TTypewriterState = {
    ...ensured,
    document: { text: nextText, styles: nextStyles },
    cursors: updatedCursors,
    selections: updatedSelections,
  };

  return withSelectionCleared(afterInsert, event.cursorId);
}
