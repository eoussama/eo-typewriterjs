export { ECommandKind } from "./commands/index";
export type { TAdvanceMode, TAdvanceModeInput, TAdvanceUnit, TCommandKind, TCursorSelector, TTypeCommand } from "./commands/index";
export { compile } from "./compiler/index";
export type { TCommand } from "./compiler/index";
export { EEventKind } from "./events/index";
export type { TEventKind, TInsertEvent, TTimelineEvent } from "./events/index";
export { play } from "./player/index";
export type { TPlayerOptions } from "./player/index";

export { insertTextAtCursor, reduce } from "./reducer/index";
export type { IRenderer } from "./renderer/index";
export { createInitialState } from "./state/index";
export type { TCursorState, TRichTextDocument, TStyleObject, TStyleRef, TTextMark, TTypewriterState } from "./state/index";
export { chunkSteps, segmentText } from "./stepping/index";
export { TimelineBuilder } from "./timeline/index";
export type { TCommandTimeline, TTypeOptions } from "./timeline/index";
