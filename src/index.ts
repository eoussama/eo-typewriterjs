import type { TAudioOptions } from "./core/audio/index";
import type { TCursorSelector } from "./core/commands/types/type-command.type";
import type { TCursorRenderOptions } from "./core/cursor/index";
import type { TPlaybackControllerState } from "./core/player/index";
import type { IRenderer } from "./core/renderer/index";
import type { TCursorState, TTypewriterState } from "./core/state/index";

import { AudioManagerHelper } from "./core/audio/index";
import { normalizeCursors } from "./core/commands/index";
import { compileSteps } from "./core/compiler/index";
import { mergeCursorOptions } from "./core/cursor/index";
import { PlaybackController } from "./core/player/index";
import { createInitialState } from "./core/state/index";
import { TimelineBuilder } from "./core/timeline/index";



export { AudioManagerHelper } from "./core/audio/index";
export { EAudioStrategy } from "./core/audio/index";
export type { TAudioChannelOptions, TAudioCommandOverride, TAudioOptions, TAudioSfx, TAudioSfxPack, TAudioStrategy } from "./core/audio/index";

export { ECommandKind } from "./core/commands/index";
export type { TBaseCommand } from "./core/commands/index";

export { normalizeCursors } from "./core/commands/index";
export type { TCallbackContext, TCallbackFn, TCallbackHook } from "./core/commands/index";
export type { TCallCommand } from "./core/commands/index";
export type { TUnselectCommand } from "./core/commands/index";
export type { TAdvanceMode, TAdvanceModeInput, TAdvanceUnit, TCommandKind, TCursorSelector, TDeleteCommand, TDeleteValue, TMoveCommand, TMoveValue, TSelectCommand, TSelectValue, TStyleCommand, TStyleRange, TTypeCommand, TUnstyleCommand, TWaitCommand } from "./core/commands/index";
export type { TCommand } from "./core/compiler/index";
export { ECursorKind } from "./core/cursor/index";

export type { TCursorAnimation, TCursorAnimationOptions, TCursorKind, TCursorRenderOptions, TResolvedCursorRenderOptions } from "./core/cursor/index";

export { EEventKind } from "./core/events/index";
export type { TBaseEvent } from "./core/events/index";
export type { TDeleteEvent, TEventKind, TInsertEvent, TMoveEvent, TSelectEvent, TStyleEvent, TStyleTarget, TTimelineEvent, TUnselectEvent, TUnstyleEvent } from "./core/events/index";

export { EPlaybackStatus } from "./core/player/index";
export type { TCheckpoint, TPlaybackControllerState, TPlaybackStatus } from "./core/player/index";

export type { IRenderer } from "./core/renderer/index";

export type { TCursorState } from "./core/state/index";
export type { TRichTextDocument, TStyleObject, TStyleRef, TTextStyle } from "./core/state/index";
export { mergeStyles, resolveStyleRef, segmentRichText } from "./core/state/index";
export type { TRichTextSegment } from "./core/state/index";
export type { TSelectionState, TTypewriterState } from "./core/state/index";
export { getSelection, withCursor, withSelection, withSelectionCleared } from "./core/state/index";

export { TimelineBuilder } from "./core/timeline/index";
export type { TCommandHookOptions, TDeleteOptions, TMoveOptions, TSelectOptions, TStyleOptions, TTypeOptions, TUnselectOptions, TUnstyleOptions, TWaitOptions } from "./core/timeline/index";

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

  /**
   * @description
   * Audio configuration for typing and delete sounds.
   * Audio is **disabled by default** when this field is omitted.
   * Pass `{ enabled: true }` (or any options object) to turn on typing sounds.
   */
  readonly audio?: TAudioOptions;
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

  /**
   * @description
   * Stop playback and unmount the renderer.
   * Call it when the typewriter is no longer needed, e.g. when its element is removed.
   * Playing again mounts the renderer afresh.
   */
  destroy: () => void;

  getState: () => TPlaybackControllerState;

  /**
   * @description
   * Return the current live typewriter state (document, cursors, selections).
   * Unlike getState() which returns playback metadata, this returns the full
   * document content and cursor positions at the current point in playback.
   *
   * @returns The live TTypewriterState
   */
  getLiveState: () => TTypewriterState;

  /**
   * @description
   * Enable or disable typing/delete audio at runtime.
   *
   * @param enabled - Whether audio should be active
   */
  setAudioEnabled: (enabled: boolean) => void;

  /**
   * @description
   * Set the master audio volume at runtime. Clamped to [0, 1].
   *
   * @param volume - New master volume
   */
  setAudioVolume: (volume: number) => void;

  /**
   * @description
   * Replace the full audio configuration at runtime.
   * Channel selection state (shuffle-bag, round-robin) is reset so new
   * sfxs and strategies take effect immediately on the next keystroke.
   *
   * @param options - The new audio options to apply
   */
  setAudioOptions: (options: TAudioOptions) => void;

  /**
   * @description
   * Return a snapshot of the current audio options
   *
   * @returns The current TAudioOptions
   */
  getAudioOptions: () => TAudioOptions;

  /**
   * @description
   * Show or hide one or all cursors at runtime.
   * Changes take effect immediately. Called from inside a hook or `call` callback,
   * the change only applies to the current run; called anywhere else, it also
   * applies to replays and seeks.
   *
   * @param visible - Whether the cursor(s) should be visible
   * @param cursor - Optional cursor selector; defaults to all cursors when omitted
   */
  setCursorVisible: (visible: boolean, cursor?: TCursorSelector) => void;

  /**
   * @description
   * Update the render options of one or all cursors at runtime.
   * Only the provided fields are changed; others keep their current values.
   * Changes take effect immediately. Called from inside a hook or `call` callback,
   * the change only applies to the current run; called anywhere else, it also
   * applies to replays and seeks.
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
  const { renderer, cursor: cursorDefaults, audio: audioOptions } = options;
  const timeline = new TimelineBuilder();

  // Audio is disabled by default when no audio config is provided.
  // Passing audio: { enabled: true } (or any options) opts into sound.
  const audioManager = new AudioManagerHelper(audioOptions ?? { enabled: false });
  const controller = new PlaybackController(renderer, createInitialState(cursorDefaults), audioManager);

  let cachedVersion = -1;

  /**
   * @description
   * Recompile the timeline if it changed since it was last loaded
   */
  function ensureLoaded(): void {
    if (timeline.version !== cachedVersion) {
      controller.load(compileSteps(timeline.commands, controller.getInitialState()));
      cachedVersion = timeline.version;
    }
  }

  /**
   * @description
   * Apply a change to the selected cursors and re-render.
   * Changes made from inside a hook or `call` callback only affect the current run;
   * changes made anywhere else also become the baseline for replay and seek.
   *
   * @param cursor - Optional cursor selector; all cursors when omitted
   * @param update - Returns the updated cursor
   */
  function updateCursors(cursor: TCursorSelector | undefined, update: (state: TCursorState) => TCursorState): void {
    const apply = (state: TTypewriterState): TTypewriterState => {
      const ids = cursor === undefined ? Object.keys(state.cursors) : normalizeCursors(cursor);
      const cursors = { ...state.cursors };

      for (const id of ids) {
        const existing = cursors[id];

        if (existing !== undefined) {
          cursors[id] = update(existing);
        }
      }

      return { ...state, cursors };
    };

    if (!controller.isRunningCallback()) {
      controller.setInitialState(apply(controller.getInitialState()));
    }

    const live = apply(controller.getLiveState());

    controller.setLiveState(live);
    void Promise.resolve(renderer.render(live)).catch(() => {});
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

    destroy(): void {
      controller.destroy();
    },

    getState() {
      return controller.getState();
    },

    getLiveState() {
      return controller.getLiveState();
    },

    setAudioEnabled(enabled: boolean): void {
      audioManager.setEnabled(enabled);
    },

    setAudioVolume(volume: number): void {
      audioManager.setVolume(volume);
    },

    setAudioOptions(opts: TAudioOptions): void {
      audioManager.setOptions(opts);
    },

    getAudioOptions(): TAudioOptions {
      return audioManager.getOptions();
    },

    setCursorVisible(visible: boolean, cursor?: TCursorSelector): void {
      updateCursors(cursor, existing => ({
        ...existing,
        visible,
        renderOptions: mergeCursorOptions(existing.renderOptions, { visible }),
      }));
    },

    setCursorOptions(opts: TCursorRenderOptions, cursor?: TCursorSelector): void {
      updateCursors(cursor, existing => ({
        ...existing,
        visible: opts.visible ?? existing.visible,
        renderOptions: mergeCursorOptions(existing.renderOptions, opts),
      }));
    },
  };
}
