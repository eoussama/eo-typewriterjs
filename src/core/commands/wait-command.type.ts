import type { TCommandKind } from "./command-kind.enum";



/**
 * @description
 * A command representing a pause in the timeline for a specified duration
 */
export type TWaitCommand = {
  readonly id: string;
  readonly kind: TCommandKind;
  readonly duration: number;
};
