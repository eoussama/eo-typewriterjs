import type { TAdvanceUnit } from "../../commands/types/type-command.type";
import type { TBaseEvent } from "./base-event.type";



/**
 * @description
 * A scheduled event that removes text from the document relative to the cursor.
 *
 * When `boundary` is present, it takes precedence and removes text to the named boundary:
 * - `"start"`: delete from the cursor back to document start
 * - `"end"`: delete from the cursor forward to document end
 * - `"whole"`: delete the entire document
 *
 * When `boundary` is absent the reducer uses `count`, `unit`, and `direction`:
 * - `count`: number of logical units to remove
 * - `direction`: `1` for forward deletion, `-1` for backward deletion
 *
 * The reducer resolves the unit to a character count at apply time.
 */
export type TDeleteEvent = TBaseEvent & {
  readonly time: number;
  readonly cursorId: string;
  readonly boundary?: "start" | "end" | "whole";
  readonly count: number;
  readonly unit: TAdvanceUnit;
  readonly direction: 1 | -1;
  readonly sourceCommandId: string;
};
