export { mergeStyles, resolveStyleRef, segmentRichText } from "./helpers/segment-rich-text.helper";
export { createInitialState, getCursor, getSelection, withCursor, withSelection, withSelectionCleared } from "./helpers/typewriter-state.helper";
export type { TCursorState } from "./types/cursor-state.type";
export type { TRichTextDocument, TStyleObject, TStyleRef, TTextStyle } from "./types/rich-text-document.type";

export type { TRichTextSegment } from "./types/rich-text-segment.type";
export type { TSelectionState, TTypewriterState } from "./types/typewriter-state.type";
