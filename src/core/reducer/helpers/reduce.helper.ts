import type { TTimelineEvent } from "../../events/types/timeline-event.type";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";

import { EEventKind } from "../../events/enums/event-kind.enum";
import { applyStyle } from "./apply-style.helper";
import { deleteTextAtCursor } from "./delete-text-at-cursor.helper";
import { insertTextAtCursor } from "./insert.helper";
import { move } from "./move.helper";
import { removeStyles } from "./remove-styles.helper";
import { selectText } from "./select-text.helper";
import { unselect } from "./unselect.helper";



/**
 * @description
 * Apply a single timeline event to the current typewriter state and return
 * the next state. The reducer is pure - no DOM access, no timers, no side effects.
 *
 * @param state - The current typewriter state
 * @param event - The event to apply
 * @returns The next typewriter state after the event has been applied
 */
export function reduce(state: TTypewriterState, event: TTimelineEvent): TTypewriterState {
  switch (event.kind) {
    case EEventKind.INSERT:
      return insertTextAtCursor(state, event);

    case EEventKind.DELETE:
      return deleteTextAtCursor(state, event);

    case EEventKind.MOVE:
      return move(state, event);

    case EEventKind.SELECT:
      return selectText(state, event);

    case EEventKind.UNSELECT:
      return unselect(state, event);

    case EEventKind.STYLE:
      return applyStyle(state, event);

    case EEventKind.UNSTYLE:
      return removeStyles(state, event);

    default:
      return state;
  }
}
