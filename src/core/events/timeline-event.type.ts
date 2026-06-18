import type { TClearSelectionEvent } from "./clear-selection-event.type";
import type { TDeleteEvent } from "./delete-event.type";
import type { TInsertEvent } from "./insert-event.type";
import type { TMarkEvent } from "./mark-event.type";
import type { TMoveCursorEvent } from "./move-cursor-event.type";
import type { TSelectEvent } from "./select-event.type";
import type { TUnmarkEvent } from "./unmark-event.type";



/**
 * @description
 * Union of all low-level scheduled playback events.
 */
export type TTimelineEvent = TInsertEvent | TDeleteEvent | TMoveCursorEvent | TSelectEvent | TClearSelectionEvent | TMarkEvent | TUnmarkEvent;
