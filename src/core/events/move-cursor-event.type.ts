import type { TBaseEvent } from "./base-event.type";



/**
 * @description
 * A scheduled event that teleports a cursor to an absolute document index.
 * This event is instant — it does not consume any timeline duration.
 */
export type TMoveCursorEvent = TBaseEvent & {
  readonly time: number;
  readonly cursorId: string;
  readonly index: number;
  readonly sourceCommandId: string;
};
