import type { ECommandKind } from "../enums/command-kind.enum";
import type { TBaseCommand } from "./base-command.type";
import type { TCallbackFn } from "./callback-hook.type";



/**
 * @description
 * A command that invokes a callback function as a named step in the timeline.
 * The callback may be async - playback waits for the returned promise to settle
 * before advancing to the next command.
 */
export type TCallCommand = TBaseCommand & {
  readonly kind: typeof ECommandKind.CALL;

  /**
   * @description
   * The function to invoke when this command is executed
   */
  readonly callback: TCallbackFn;
};
