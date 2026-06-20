import type { TAdvanceUnit } from "../commands/type-command.type";

import type { TBaseEvent } from "./base-event.type";



/**
 * @description
 * A scheduled event that removes a number of units from the document relative to the cursor.
 * `count` is the number of logical units (as defined by `unit`) to remove.
 * `direction` is `1` for forward deletion and `-1` for backward deletion.
 * The reducer resolves the unit to a character count at apply time.
 */
export type TDeleteEvent = TBaseEvent & {
  readonly time: number;
  readonly cursorId: string;
  readonly count: number;
  readonly unit: TAdvanceUnit;
  readonly direction: 1 | -1;
  readonly sourceCommandId: string;
};
