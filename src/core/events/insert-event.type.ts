import type { TStyleRef } from "../state/rich-text-document.type";

import type { TEventKind } from "./event-kind.enum";



/**
 * @description
 * A low-level scheduled event that inserts text at a cursor position
 */
export type TInsertEvent = {
  readonly id: string;
  readonly kind: TEventKind;
  readonly time: number;
  readonly cursorId: string;
  readonly text: string;
  readonly style?: TStyleRef;
  readonly sourceCommandId: string;
};
