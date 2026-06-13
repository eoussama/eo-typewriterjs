import type { IRenderer } from "./core/renderer/index";
import { compile } from "./core/compiler/index";
import { play } from "./core/player/index";
import { createInitialState } from "./core/state/index";
import { TimelineBuilder } from "./core/timeline/index";



export { ECommandKind } from "./core/commands/index";
export type { TAdvanceMode, TAdvanceModeInput, TAdvanceUnit, TCommandKind, TCursorSelector, TTypeCommand } from "./core/commands/index";

export { EEventKind } from "./core/events/index";
export type { TEventKind, TInsertEvent, TTimelineEvent } from "./core/events/index";
export type { IRenderer } from "./core/renderer/index";
export type { TCursorState } from "./core/state/index";
export type { TRichTextDocument, TStyleObject, TStyleRef, TTextMark } from "./core/state/index";
export type { TTypewriterState } from "./core/state/index";
export type { TTypeOptions } from "./core/timeline/index";

export { DomRenderer, domRenderer } from "./renderers/index";
export { StringRenderer, stringRenderer } from "./renderers/index";

/**
 * @description
 * Options for creating a typewriter instance
 */
export type TTypewriterOptions = {
  readonly renderer: IRenderer;
};

/**
 * @description
 * A typewriter instance returned by createTypewriter
 */
export type TTypewriter = {
  readonly timeline: TimelineBuilder;
  readonly play: () => Promise<void>;
};

/**
 * @description
 * Create a new typewriter instance with the given renderer.
 * Use `tw.timeline.type(...)` to schedule commands, then call `tw.play()` to execute them.
 *
 * @param options - Configuration options including the renderer to use
 * @returns A TTypewriter instance with a timeline builder and play method
 */
export function createTypewriter(options: TTypewriterOptions): TTypewriter {
  const { renderer } = options;
  const timeline = new TimelineBuilder();

  return {
    timeline,
    async play(): Promise<void> {
      const events = compile([...timeline.commands]);

      await play(events, {
        renderer,
        initialState: createInitialState(),
      });
    },
  };
}
