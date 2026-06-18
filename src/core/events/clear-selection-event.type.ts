import type { TBaseEvent } from "./base-event.type";



/**
 * @description
 * A low-level scheduled event that clears the active selection for a specific cursor.
 * This event is instant and does not consume any timeline duration.
 */
export type TClearSelectionEvent = TBaseEvent & {
  readonly time: number;
  readonly cursorId: string;
  readonly sourceCommandId: string;
};
