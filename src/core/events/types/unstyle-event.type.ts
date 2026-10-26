import type { EEventKind } from "../enums/event-kind.enum";
import type { TBaseEvent } from "./base-event.type";
import type { TStyleTarget } from "./style-target.type";



/**
 * @description
 * A low-level scheduled event that removes styles overlapping a document range.
 * The range is either fixed or resolved from a cursor's selection, see `TStyleTarget`.
 * Styles that partially overlap the range are clipped rather than fully removed.
 */
export type TUnstyleEvent = TBaseEvent & TStyleTarget & {
  readonly kind: typeof EEventKind.UNSTYLE;
  readonly time: number;
  readonly sourceCommandId: string;
};
