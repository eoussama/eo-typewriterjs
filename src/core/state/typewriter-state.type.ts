import type { TCursorState } from "./cursor-state.type";

import type { TRichTextDocument } from "./rich-text-document.type";



/**
 * @description
 * The full runtime state of the typewriter at any point in time
 */
export type TTypewriterState = {
  readonly document: TRichTextDocument;
  readonly cursors: Readonly<Record<string, TCursorState>>;
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
  };
}
