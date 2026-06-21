import type { TStyleRef } from "../../state/types/rich-text-document.type";

import type { TBaseEvent } from "./base-event.type";



/**
 * @description
 * A low-level scheduled event that inserts text at a cursor position
 */
export type TInsertEvent = TBaseEvent & {
  readonly time: number;
  readonly cursorId: string;
  readonly text: string;
  readonly style?: TStyleRef;
  readonly sourceCommandId: string;
};
