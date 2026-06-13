import type { TInsertEvent } from "./insert-event.type";



/**
 * @description
 * Union of all low-level scheduled playback events.
 * Additional event kinds (delete, move, etc.) will be added in future phases.
 */
export type TTimelineEvent = TInsertEvent;
