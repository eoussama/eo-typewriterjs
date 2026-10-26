import type { TStyleEvent } from "../../events/types/style-event.type";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";

import { withSelectionCleared } from "../../state/helpers/typewriter-state.helper";
import { resolveStyleTarget } from "./resolve-style-target.helper";



/**
 * @description
 * Apply a style event to the typewriter state by appending a new text style to the document.
 * Fixed ranges are clamped to the current text. Selection-based events use the named
 * cursor's active selection, which is then cleared. When the resolved range is empty
 * the state is returned unchanged.
 *
 * @param state - The current typewriter state
 * @param event - The style event to apply
 * @returns A new TTypewriterState with the style appended to the document
 */
export function applyStyle(state: TTypewriterState, event: TStyleEvent): TTypewriterState {
  const range = resolveStyleTarget(state, event);

  if (range === null) {
    return state;
  }

  const withStyle: TTypewriterState = {
    ...state,
    document: {
      ...state.document,
      styles: [...state.document.styles, { from: range.from, to: range.to, style: event.style }],
    },
  };

  return event.mode === "selection" ? withSelectionCleared(withStyle, event.cursorId) : withStyle;
}
