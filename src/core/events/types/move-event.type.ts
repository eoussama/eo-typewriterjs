import type { TAdvanceModeInput } from "../../commands/types/type-command.type";
import type { TBaseEvent } from "./base-event.type";



/**
 * @description
 * A scheduled event that moves a cursor.
 *
 * When `boundary` is present it takes precedence:
 * - `"start"`: jump to absolute document start (index 0)
 * - `"end"`: jump to absolute document end (index text.length)
 *
 * When `boundary` is absent the reducer moves by `offset` units using `by`:
 * - positive offset moves right, negative offset moves left
 *
 * This event is instant - it does not consume any timeline duration.
 */
export type TMoveEvent = TBaseEvent & {
  readonly time: number;
  readonly cursorId: string;
  readonly boundary?: "start" | "end";
  readonly offset: number;
  readonly by: TAdvanceModeInput;
  readonly sourceCommandId: string;
};
