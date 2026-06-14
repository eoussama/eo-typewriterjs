import type { TNullable } from "@eoussama/core";

import type { TCursorState } from "./cursor-state.type";
import type { TRichTextDocument } from "./rich-text-document.type";



/**
 * @description
 * An active text selection range within the document.
 * `from` is the start index (inclusive) and `to` is the end index (exclusive),
 * always in document string index space.
 * `cursorId` identifies which cursor anchored the selection.
 */
export type TSelectionState = {
  readonly cursorId: string;
  readonly from: number;
  readonly to: number;
};

/**
 * @description
 * The full runtime state of the typewriter at any point in time
 */
export type TTypewriterState = {
  readonly document: TRichTextDocument;
  readonly cursors: Readonly<Record<string, TCursorState>>;
  readonly selection: TNullable<TSelectionState>;
};

/**
 * @description
 * Create the default initial typewriter state with a single main cursor
 *
 * @returns A fresh initial TTypewriterState
 */
export function createInitialState(): TTypewriterState {
  return {
    document: {
      text: "",
      marks: [],
    },
    cursors: {
      main: {
        id: "main",
        index: 0,
        visible: true,
      },
    },
    selection: null,
  };
}
