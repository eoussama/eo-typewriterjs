import type { TBaseCommand } from "./base-command.type";
import type { TAdvanceModeInput, TCursorSelector } from "./type-command.type";



/**
 * @description
 * A command that moves a cursor relative to its current position by a given number of units.
 * Positive offset moves right; negative offset moves left; zero is a no-op.
 * Produces a single instant event — it does not advance the timeline clock.
 */
export type TMoveCommand = TBaseCommand & {
  readonly cursor: TCursorSelector;
  readonly offset: number;
  readonly by?: TAdvanceModeInput;
};
