import type { TDeleteEvent } from "../events/delete-event.type";
import type { TInsertEvent } from "../events/insert-event.type";
import type { TMoveCursorEvent } from "../events/move-cursor-event.type";
import type { TTimelineEvent } from "../events/timeline-event.type";
import type { TTypewriterState } from "../state/typewriter-state.type";

import { EEventKind } from "../events/event-kind.enum";
import { deleteTextAtCursor } from "./delete-text-at-cursor.helper";
import { insertTextAtCursor } from "./insert.helper";
import { moveCursor } from "./move-cursor.helper";



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
      return insertTextAtCursor(state, event as TInsertEvent);

    case EEventKind.DELETE:
      return deleteTextAtCursor(state, event as TDeleteEvent);

    case EEventKind.MOVE_CURSOR:
      return moveCursor(state, event as TMoveCursorEvent);

    default:
      return state;
  }
}
