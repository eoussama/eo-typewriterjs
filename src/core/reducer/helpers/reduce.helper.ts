import type { TDeleteEvent } from "../../events/types/delete-event.type";
import type { TInsertEvent } from "../../events/types/insert-event.type";
import type { TMoveEvent } from "../../events/types/move-event.type";
import type { TSelectEvent } from "../../events/types/select-event.type";
import type { TStyleEvent } from "../../events/types/style-event.type";
import type { TTimelineEvent } from "../../events/types/timeline-event.type";
import type { TUnselectEvent } from "../../events/types/unselect-event.type";
import type { TUnstyleEvent } from "../../events/types/unstyle-event.type";
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
      return insertTextAtCursor(state, event as TInsertEvent);

    case EEventKind.DELETE:
      return deleteTextAtCursor(state, event as TDeleteEvent);

    case EEventKind.MOVE:
      return move(state, event as TMoveEvent);

    case EEventKind.SELECT:
      return selectText(state, event as TSelectEvent);

    case EEventKind.UNSELECT:
      return unselect(state, event as TUnselectEvent);

    case EEventKind.STYLE:
      return applyStyle(state, event as TStyleEvent);

    case EEventKind.UNSTYLE:
      return removeStyles(state, event as TUnstyleEvent);

    default:
      return state;
  }
}
