import type { TMarkEvent } from "../events/mark-event.type";
import type { TTypewriterState } from "../state/typewriter-state.type";



/**
 * @description
 * Apply a mark event to the typewriter state by appending a new text mark to the document.
 * When the event is selection-based (`from === -1 && to === -1`), the actual range is
 * resolved from the named cursor's active selection. If the cursor has no active selection
 * the state is returned unchanged.
 *
 * @param state - The current typewriter state
 * @param event - The mark event to apply
 * @returns A new TTypewriterState with the mark appended to the document
 */
export function applyMark(state: TTypewriterState, event: TMarkEvent): TTypewriterState {
  let from = event.from;
  let to = event.to;

  // Selection-based mark: resolve range from cursor selection
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
  }

  if (from >= to) {
    return state;
  }

  return {
    ...state,
    document: {
      ...state.document,
      marks: [
        ...state.document.marks,
        { from, to, style: event.style },
      ],
    },
  };
}
