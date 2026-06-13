import type { TCommandKind } from "./command-kind.enum";



/**
 * @description
 * Shared fields present on every command in the timeline
 */
export type TBaseCommand = {
  readonly id: string;
  readonly kind: TCommandKind;
};
