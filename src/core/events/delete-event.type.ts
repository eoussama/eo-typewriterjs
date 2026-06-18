import type { TAdvanceUnit } from "../commands/type-command.type";

import type { TBaseEvent } from "./base-event.type";



/**
 * @description
 * A scheduled event that removes a number of units backward from the cursor.
 * `count` is the number of logical units (as defined by `unit`) to remove.
 * The reducer resolves the unit to a character count at apply time.
 */
export type TDeleteEvent = TBaseEvent & {
  readonly time: number;
  readonly cursorId: string;
  readonly count: number;
  readonly unit: TAdvanceUnit;
  readonly sourceCommandId: string;
};
