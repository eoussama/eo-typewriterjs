import type { TStyleRef } from "../state/rich-text-document.type";

import type { TBaseEvent } from "./base-event.type";



/**
 * @description
 * A low-level scheduled event that applies a style mark to a document range.
 * When `from` and `to` are both `-1`, the event is selection-based and `cursorId`
 * must be present — the reducer resolves the actual range from the cursor's selection.
 */
export type TMarkEvent = TBaseEvent & {
  readonly time: number;
  readonly from: number;
  readonly to: number;
  readonly style: TStyleRef;
  readonly sourceCommandId: string;
  /** Present only for selection-based mark events (from === -1 && to === -1) */
  readonly cursorId?: string;
};
