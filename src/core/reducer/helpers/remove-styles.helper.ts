import type { TUnstyleEvent } from "../../events/types/unstyle-event.type";
import type { TTextStyle } from "../../state/types/rich-text-document.type";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";

import { withSelectionCleared } from "../../state/helpers/typewriter-state.helper";
import { resolveStyleTarget } from "./resolve-style-target.helper";



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

  // Keep the part of each style before the range and the part after it, when non-empty.
  for (const entry of styles) {
    if (entry.from < from) {
      result.push({ ...entry, to: Math.min(entry.to, from) });
    }

    if (entry.to > to) {
      result.push({ ...entry, from: Math.max(entry.from, to) });
    }
  }

  return result;
}

/**
 * @description
 * Apply an unstyle event to the typewriter state by removing or clipping all styles
 * that overlap the target range.
 * Fixed ranges are clamped to the current text. Selection-based events use the named
 * cursor's active selection, which is then cleared. When the resolved range is empty
 * the state is returned unchanged.
 *
 * @param state - The current typewriter state
 * @param event - The unstyle event to apply
 * @returns A new TTypewriterState with styles in the range removed or clipped
 */
export function removeStyles(state: TTypewriterState, event: TUnstyleEvent): TTypewriterState {
  const range = resolveStyleTarget(state, event);

  if (range === null) {
    return state;
  }

  const withUpdatedStyles: TTypewriterState = {
    ...state,
    document: {
      ...state.document,
      styles: clipStyles(state.document.styles, range.from, range.to),
    },
  };

  // Stryker disable next-line ConditionalExpression: a range event has no cursor id, so clearing its selection changes nothing.
  return event.mode === "selection" ? withSelectionCleared(withUpdatedStyles, event.cursorId) : withUpdatedStyles;
}
