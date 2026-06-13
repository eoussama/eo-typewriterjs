import type { TBaseEvent } from "./base-event.type";



/**
 * @description
 * A scheduled event that removes a number of characters backward from the cursor
 */
export type TDeleteEvent = TBaseEvent & {
  readonly time: number;
  readonly cursorId: string;
  readonly count: number;
  readonly sourceCommandId: string;
};
