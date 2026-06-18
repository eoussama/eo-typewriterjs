import type { TAdvanceModeInput } from "../commands/type-command.type";
import type { TBaseEvent } from "./base-event.type";



/**
 * @description
 * A scheduled event that sets the active document selection relative to the cursor.
 * The reducer computes the concrete `from/to` range from `count` and `by` at runtime.
 * A positive `count` selects forward from the cursor; a negative selects backward.
 * This event is instant — it does not consume any timeline duration.
 */
export type TSelectEvent = TBaseEvent & {
  readonly time: number;
  readonly cursorId: string;
  readonly count: number;
  readonly by: TAdvanceModeInput;
  readonly sourceCommandId: string;
};
