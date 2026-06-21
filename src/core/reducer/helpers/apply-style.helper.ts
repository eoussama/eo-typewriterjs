import type { TStyleEvent } from "../../events/types/style-event.type";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";

import { withSelectionCleared } from "../../state/helpers/typewriter-state.helper";



/**
 * @description
 * Apply a style event to the typewriter state by appending a new text style to the document.
 * When the event is selection-based (`from === -1 && to === -1`), the actual range is
 * resolved from the named cursor's active selection. If the cursor has no active selection
 * the state is returned unchanged.
 *
 * @param state - The current typewriter state
 * @param event - The style event to apply
 * @returns A new TTypewriterState with the style appended to the document
 */
export function applyStyle(state: TTypewriterState, event: TStyleEvent): TTypewriterState {
  let from = event.from;
  let to = event.to;

  // Selection-based style: resolve range from cursor selection
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

  const withStyle: TTypewriterState = {
    ...state,
    document: {
      ...state.document,
      styles: [
        ...state.document.styles,
        { from, to, style: event.style },
      ],
    },
  };

  if (clearedSelection && event.cursorId !== undefined) {
    return withSelectionCleared(withStyle, event.cursorId);
  }

  return withStyle;
}
