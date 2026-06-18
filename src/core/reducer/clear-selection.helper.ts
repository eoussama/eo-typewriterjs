import type { TClearSelectionEvent } from "../events/clear-selection-event.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { withSelectionCleared } from "../state/typewriter-state.type";



/**
 * @description
 * Apply a clear-selection event to the typewriter state by removing the active
 * selection for the targeted cursor. If the cursor has no active selection the
 * state is returned unchanged.
 *
 * @param state - The current typewriter state
 * @param event - The clear-selection event to apply
 * @returns A new TTypewriterState with the cursor's selection removed
 */
export function clearSelection(state: TTypewriterState, event: TClearSelectionEvent): TTypewriterState {
  return withSelectionCleared(state, event.cursorId);
}
