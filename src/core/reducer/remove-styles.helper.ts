import type { TUnstyleEvent } from "../events/unstyle-event.type";
import type { TTextStyle } from "../state/rich-text-document.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { withSelectionCleared } from "../state/typewriter-state.type";



/**
 * @description
 * Clip or remove styles that overlap a given [from, to) range.
 * Styles entirely outside the range are preserved unchanged.
 * Styles entirely inside the range are removed.
 * Styles that partially overlap the range are clipped to exclude the range.
 * Styles that span across the entire range are split into two fragments.
 *
 * @param styles - The current array of text styles
 * @param from - The start of the range to remove (inclusive)
 * @param to - The end of the range to remove (exclusive)
 * @returns A new array of text styles with the range cleared
 */
function clipStyles(styles: readonly TTextStyle[], from: number, to: number): readonly TTextStyle[] {
  const result: TTextStyle[] = [];

  for (const entry of styles) {
    if (entry.to <= from || entry.from >= to) {
      result.push(entry);
    }
    else if (entry.from < from && entry.to > to) {
      result.push({ ...entry, to: from });
      result.push({ ...entry, from: to });
    }
    else if (entry.from < from) {
      result.push({ ...entry, to: from });
    }
    else if (entry.to > to) {
      result.push({ ...entry, from: to });
    }
  }

  return result;
}

/**
 * @description
 * Apply an unstyle event to the typewriter state by removing or clipping all styles
 * that overlap the target range.
 * When the event is selection-based (`from === -1 && to === -1`), the actual range is
 * resolved from the named cursor's active selection. If the cursor has no active selection
 * the state is returned unchanged.
 *
 * @param state - The current typewriter state
 * @param event - The unstyle event to apply
 * @returns A new TTypewriterState with styles in the range removed or clipped
 */
export function removeStyles(state: TTypewriterState, event: TUnstyleEvent): TTypewriterState {
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

  const withUpdatedStyles: TTypewriterState = {
    ...state,
    document: {
      ...state.document,
      styles: clipStyles(state.document.styles, from, to),
    },
  };

  if (clearedSelection && event.cursorId !== undefined) {
    return withSelectionCleared(withUpdatedStyles, event.cursorId);
  }

  return withUpdatedStyles;
}
