import type { ECommandKind } from "../enums/command-kind.enum";
import type { TBaseCommand } from "./base-command.type";



/**
 * @description
 * A command representing a pause in the timeline for a specified duration
 */
export type TWaitCommand = TBaseCommand & {
  readonly kind: typeof ECommandKind.WAIT;
  readonly duration: number;
};
