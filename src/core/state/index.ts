export type { TCursorState } from "./cursor-state.type";

export type { TRichTextDocument, TStyleObject, TStyleRef, TTextMark } from "./rich-text-document.type";
export { mergeStyles, resolveStyleRef, segmentRichText } from "./segment-rich-text.helper";
export type { TRichTextSegment } from "./segment-rich-text.helper";
export { createInitialState, getSelection, withCursor, withSelection, withSelectionCleared } from "./typewriter-state.type";
export type { TSelectionState, TTypewriterState } from "./typewriter-state.type";
