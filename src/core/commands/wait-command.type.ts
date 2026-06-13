import type { TBaseCommand } from "./base-command.type";



/**
 * @description
 * A command representing a pause in the timeline for a specified duration
 */
export type TWaitCommand = TBaseCommand & {
  readonly duration: number;
};
