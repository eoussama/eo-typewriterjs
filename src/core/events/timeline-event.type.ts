import type { TDeleteEvent } from "./delete-event.type";
import type { TInsertEvent } from "./insert-event.type";
import type { TMoveCursorEvent } from "./move-cursor-event.type";



/**
 * @description
 * Union of all low-level scheduled playback events.
 */
export type TTimelineEvent = TInsertEvent | TDeleteEvent | TMoveCursorEvent;
