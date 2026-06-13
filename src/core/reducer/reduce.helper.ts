import type { TTimelineEvent } from "../events/timeline-event.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { EEventKind } from "../events/event-kind.enum";
import { insertTextAtCursor } from "./insert.helper";



/**
 * @description
 * Apply a single timeline event to the current typewriter state and return
 * the next state. The reducer is pure — no DOM access, no timers, no side effects.
 *
 * @param state - The current typewriter state
 * @param event - The event to apply
 * @returns The next typewriter state after the event has been applied
 */
export function reduce(state: TTypewriterState, event: TTimelineEvent): TTypewriterState {
  switch (event.kind) {
    case EEventKind.INSERT:
      return insertTextAtCursor(state, event);

    default:
      return state;
  }
}
