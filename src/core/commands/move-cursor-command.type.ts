import type { TBaseCommand } from "./base-command.type";
import type { TCursorSelector } from "./type-command.type";



/**
 * @description
 * A command that teleports a cursor to an absolute document index.
 * Produces a single instant event — it does not advance the timeline clock.
 */
export type TMoveCursorCommand = TBaseCommand & {
  readonly cursor: TCursorSelector;
  readonly index: number;
};
