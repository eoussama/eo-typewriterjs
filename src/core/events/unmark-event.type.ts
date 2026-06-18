import type { TBaseEvent } from "./base-event.type";



/**
 * @description
 * A low-level scheduled event that removes style marks overlapping a document range.
 * When `from` and `to` are both `-1`, the event is selection-based and `cursorId`
 * must be present — the reducer resolves the actual range from the cursor's selection.
 * Marks that partially overlap the range are clipped rather than fully removed.
 */
export type TUnmarkEvent = TBaseEvent & {
  readonly time: number;
  readonly from: number;
  readonly to: number;
  readonly sourceCommandId: string;
  /** Present only for selection-based unmark events (from === -1 && to === -1) */
  readonly cursorId?: string;
};
