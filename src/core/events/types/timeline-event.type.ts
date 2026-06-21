import type { TDeleteEvent } from "./delete-event.type";
import type { TInsertEvent } from "./insert-event.type";
import type { TMoveEvent } from "./move-event.type";
import type { TSelectEvent } from "./select-event.type";
import type { TStyleEvent } from "./style-event.type";
import type { TUnselectEvent } from "./unselect-event.type";
import type { TUnstyleEvent } from "./unstyle-event.type";



/**
 * @description
 * Union of all low-level scheduled playback events.
 */
export type TTimelineEvent = TInsertEvent | TDeleteEvent | TMoveEvent | TSelectEvent | TUnselectEvent | TStyleEvent | TUnstyleEvent;
