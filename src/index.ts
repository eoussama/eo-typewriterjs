import type { TCursorSelector } from "./core/commands/type-command.type";
import type { TCursorRenderOptions } from "./core/cursor/index";
import type { TPlaybackControllerState } from "./core/player/index";
import type { IRenderer } from "./core/renderer/index";

import { normalizeCursors } from "./core/commands/index";
import { compile } from "./core/compiler/index";
import { mergeCursorOptions } from "./core/cursor/index";
import { PlaybackController } from "./core/player/index";
import { createInitialState } from "./core/state/index";
import { TimelineBuilder } from "./core/timeline/index";



export { ECommandKind } from "./core/commands/index";
export type { TBaseCommand } from "./core/commands/index";

export { normalizeCursors } from "./core/commands/index";
export type { TCallbackContext, TCallbackFn, TCallbackHook } from "./core/commands/index";
export type { TCallCommand } from "./core/commands/index";
export type { TAdvanceMode, TAdvanceModeInput, TAdvanceUnit, TCommandKind, TCursorSelector, TDeleteCommand, TMarkCommand, TMarkRange, TMoveCursorCommand, TSelectCommand, TTypeCommand, TWaitCommand } from "./core/commands/index";
export type { TCommand } from "./core/compiler/index";
export { ECursorKind } from "./core/cursor/index";

export type { TCursorAnimation, TCursorAnimationOptions, TCursorKind, TCursorRenderOptions, TResolvedCursorRenderOptions } from "./core/cursor/index";

export { EEventKind } from "./core/events/index";
export type { TBaseEvent } from "./core/events/index";
export type { TDeleteEvent, TEventKind, TInsertEvent, TMarkEvent, TMoveCursorEvent, TSelectEvent, TTimelineEvent } from "./core/events/index";

export { EPlaybackStatus } from "./core/player/index";
export type { TCheckpoint, TPlaybackControllerState, TPlaybackStatus } from "./core/player/index";

export type { IRenderer } from "./core/renderer/index";

export type { TCursorState } from "./core/state/index";
export type { TRichTextDocument, TStyleObject, TStyleRef, TTextMark } from "./core/state/index";
export { mergeStyles, resolveStyleRef, segmentRichText } from "./core/state/index";
export type { TRichTextSegment } from "./core/state/index";
export type { TSelectionState, TTypewriterState } from "./core/state/index";
export { getSelection, withCursor, withSelection, withSelectionCleared } from "./core/state/index";

export { TimelineBuilder } from "./core/timeline/index";
export type { TCommandHookOptions, TDeleteOptions, TMarkOptions, TMoveCursorOptions, TSelectOptions, TTypeOptions, TWaitOptions } from "./core/timeline/index";

export { DomRenderer, domRenderer } from "./renderers/index";
export { StringRenderer, stringRenderer } from "./renderers/index";

/**
 * @description
 * Options for creating a typewriter instance
 */
export type TTypewriterOptions = {
  readonly renderer: IRenderer;

  /**
   * @description
   * Default render options applied to all cursors.
   * Individual cursors inherit these at creation time.
   */
  readonly cursor?: TCursorRenderOptions;
};

/**
 * @description
 * A typewriter instance returned by createTypewriter.
 * Provides a fluent timeline builder and full playback controls.
 */
export type TTypewriter = {
  readonly timeline: TimelineBuilder;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  cancel: () => void;
  replay: () => Promise<void>;
  seek: (time: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  setRate: (rate: number) => void;
  getState: () => TPlaybackControllerState;

  /**
   * @description
   * Show or hide one or all cursors at runtime.
   * Changes take effect immediately on the next render.
   *
   * @param visible - Whether the cursor(s) should be visible
   * @param cursor - Optional cursor selector; defaults to all cursors when omitted
   */
  setCursorVisible: (visible: boolean, cursor?: TCursorSelector) => void;

  /**
   * @description
   * Update the render options of one or all cursors at runtime.
   * Only the provided fields are changed; others keep their current values.
   * Changes take effect immediately on the next render.
   *
   * @param options - Partial render options to apply
   * @param cursor - Optional cursor selector; defaults to all cursors when omitted
   */
  setCursorOptions: (options: TCursorRenderOptions, cursor?: TCursorSelector) => void;
};

/**
 * @description
 * Create a new typewriter instance with the given renderer.
 * Use `tw.timeline.type(...)` to schedule commands, then call `tw.play()` to execute them.
 * All playback controls (pause, stop, cancel, seek, step, rate) are available on the returned object.
 *
 * @param options - Configuration options including the renderer to use
 * @returns A TTypewriter instance with a timeline builder and full playback controls
 */
export function createTypewriter(options: TTypewriterOptions): TTypewriter {
  const { renderer, cursor: cursorDefaults } = options;
  const timeline = new TimelineBuilder();

  // Build the initial state using any cursor defaults provided
  let currentState = createInitialState(cursorDefaults);
  const controller = new PlaybackController(renderer, currentState);

  let cachedVersion = -1;

  /**
   * @description
   * Recompile the timeline if the version has changed since last load.
   * Also syncs the current state into the controller so runtime cursor
   * mutations (setCursorVisible / setCursorOptions) are preserved across
   * a load() call.
   */
  function ensureLoaded(): void {
    if (timeline.version !== cachedVersion) {
      const commands = [...timeline.commands];

      controller.load(compile(commands), commands);
      cachedVersion = timeline.version;
    }
  }

  return {
    timeline,

    play(): Promise<void> {
      ensureLoaded();

      return controller.play();
    },

    pause(): void {
      controller.pause();
    },

    stop(): void {
      controller.stop();
    },

    cancel(): void {
      controller.cancel();
    },

    replay(): Promise<void> {
      ensureLoaded();

      return controller.replay();
    },

    seek(time: number): void {
      ensureLoaded();
      controller.seek(time);
    },

    stepForward(): void {
      ensureLoaded();
      controller.stepForward();
    },

    stepBackward(): void {
      ensureLoaded();
      controller.stepBackward();
    },

    setRate(rate: number): void {
      controller.setRate(rate);
    },

    getState() {
      return controller.getState();
    },

    setCursorVisible(visible: boolean, cursor?: TCursorSelector): void {
      // Apply onto the controller's live state (which has typed text etc.)
      // so that the re-render is visually correct.
      const liveState = controller.getLiveState();
      const ids = resolveCursorIds(cursor, liveState);
      let updatedLive = liveState;

      for (const id of ids) {
        const existing = updatedLive.cursors[id];

        if (existing === undefined) {
          continue;
        }

        const updated = mergeCursorOptions(existing.renderOptions, { visible });

        updatedLive = {
          ...updatedLive,
          cursors: {
            ...updatedLive.cursors,
            [id]: { ...existing, visible, renderOptions: updated },
          },
        };

        // Keep the cursor-config baseline (initial state) in sync too
        const baseExisting = currentState.cursors[id];

        if (baseExisting !== undefined) {
          currentState = {
            ...currentState,
            cursors: {
              ...currentState.cursors,
              [id]: { ...baseExisting, visible, renderOptions: updated },
            },
          };
        }
      }

      controller.setInitialState(currentState);
      controller.setLiveState(updatedLive);
      renderer.render(updatedLive);
    },

    setCursorOptions(opts: TCursorRenderOptions, cursor?: TCursorSelector): void {
      const liveState = controller.getLiveState();
      const ids = resolveCursorIds(cursor, liveState);
      let updatedLive = liveState;

      for (const id of ids) {
        const existing = updatedLive.cursors[id];

        if (existing === undefined) {
          continue;
        }

        const updated = mergeCursorOptions(existing.renderOptions, opts);
        const newVisible = opts.visible ?? existing.visible;

        updatedLive = {
          ...updatedLive,
          cursors: {
            ...updatedLive.cursors,
            [id]: { ...existing, visible: newVisible, renderOptions: updated },
          },
        };

        const baseExisting = currentState.cursors[id];

        if (baseExisting !== undefined) {
          currentState = {
            ...currentState,
            cursors: {
              ...currentState.cursors,
              [id]: { ...baseExisting, visible: newVisible, renderOptions: updated },
            },
          };
        }
      }

      controller.setInitialState(currentState);
      controller.setLiveState(updatedLive);
      renderer.render(updatedLive);
    },
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * @description
 * Resolve a TCursorSelector to an array of cursor IDs present in state.
 * When no selector is provided all cursor IDs are returned.
 *
 * @param cursor - Optional cursor selector
 * @param state - Current typewriter state
 * @returns Array of matching cursor IDs
 */
function resolveCursorIds(
  cursor: TCursorSelector | undefined,
  state: ReturnType<typeof createInitialState>,
): string[] {
  if (cursor === undefined) {
    return Object.keys(state.cursors);
  }

  return normalizeCursors(cursor).filter(id => id in state.cursors);
}
