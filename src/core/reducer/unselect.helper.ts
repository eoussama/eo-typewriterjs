import type { TUnselectEvent } from "../events/unselect-event.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { withSelectionCleared } from "../state/typewriter-state.type";



/**
 * @description
 * Apply an unselect event to the typewriter state by removing the active
 * selection for the targeted cursor. If the cursor has no active selection the
 * state is returned unchanged.
 *
 * @param state - The current typewriter state
 * @param event - The unselect event to apply
 * @returns A new TTypewriterState with the cursor's selection removed
 */
export function unselect(state: TTypewriterState, event: TUnselectEvent): TTypewriterState {
  return withSelectionCleared(state, event.cursorId);
}
