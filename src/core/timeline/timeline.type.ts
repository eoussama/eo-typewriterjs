import type { TCommand } from "../compiler/compile.helper";



/**
 * @description
 * A read-only snapshot of the accumulated command list.
 * Used internally by the player to compile and play back commands.
 */
export type TCommandTimeline = {
  readonly commands: ReadonlyArray<TCommand>;
};
