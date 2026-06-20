import type { TAdvanceModeInput } from "../commands/type-command.type";

import type { TBaseEvent } from "./base-event.type";



/**
 * @description
 * A scheduled event that moves a cursor relative to its current position.
 * Positive offset moves right; negative offset moves left; zero is a no-op.
 * This event is instant — it does not consume any timeline duration.
 */
export type TMoveEvent = TBaseEvent & {
  readonly time: number;
  readonly cursorId: string;
  readonly offset: number;
  readonly by: TAdvanceModeInput;
  readonly sourceCommandId: string;
};
