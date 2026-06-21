import type { TCursorState } from "./cursor-state.type";
import type { TRichTextDocument } from "./rich-text-document.type";



/**
 * @description
 * An active text selection range within the document owned by a specific cursor
 */
export type TSelectionState = {
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
  readonly selections: Readonly<Record<string, TSelectionState>>;
};
