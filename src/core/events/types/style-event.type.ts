import type { TStyleRef } from "../../state/types/rich-text-document.type";

import type { EEventKind } from "../enums/event-kind.enum";
import type { TBaseEvent } from "./base-event.type";
import type { TStyleTarget } from "./style-target.type";



/**
 * @description
 * A low-level scheduled event that applies a style to a document range.
 * The range is either fixed or resolved from a cursor's selection, see `TStyleTarget`.
 */
export type TStyleEvent = TBaseEvent & TStyleTarget & {
  readonly kind: typeof EEventKind.STYLE;
  readonly time: number;
  readonly style: TStyleRef;
  readonly sourceCommandId: string;
};
