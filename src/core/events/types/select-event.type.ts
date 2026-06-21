import type { TAdvanceModeInput } from "../../commands/types/type-command.type";
import type { TBaseEvent } from "./base-event.type";



/**
 * @description
 * A scheduled event that sets the active document selection.
 *
 * When `boundary` is present it takes precedence:
 * - `"start"`: select from cursor to document start
 * - `"end"`: select from cursor to document end
 * - `"whole"`: select the entire document
 *
 * When `boundary` is absent the reducer uses `count` and `by`:
 * - positive `count` selects forward; negative `count` selects backward
 *
 * This event is instant - it does not consume any timeline duration.
 */
export type TSelectEvent = TBaseEvent & {
  readonly time: number;
  readonly cursorId: string;
  readonly boundary?: "start" | "end" | "whole";
  readonly count: number;
  readonly by: TAdvanceModeInput;
  readonly sourceCommandId: string;
};
