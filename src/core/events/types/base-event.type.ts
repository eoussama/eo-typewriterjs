import type { TEventKind } from "../enums/event-kind.enum";



/**
 * @description
 * Shared fields present on every scheduled playback event
 */
export type TBaseEvent = {
  readonly id: string;
  readonly kind: TEventKind;
};
