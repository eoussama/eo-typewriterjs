import type { TAudioOptions } from "./core/audio/index";
import type { TCursorSelector } from "./core/commands/type-command.type";
import type { TCursorRenderOptions } from "./core/cursor/index";
import type { TPlaybackControllerState } from "./core/player/index";
import type { IRenderer } from "./core/renderer/index";
import type { TTypewriterState } from "./core/state/index";

import { AudioManagerHelper } from "./core/audio/index";
import { normalizeCursors } from "./core/commands/index";
import { compile } from "./core/compiler/index";
import { mergeCursorOptions } from "./core/cursor/index";
import { PlaybackController } from "./core/player/index";
import { createInitialState } from "./core/state/index";
import { TimelineBuilder } from "./core/timeline/index";



export { AudioManagerHelper } from "./core/audio/index";
export { EAudioStrategy } from "./core/audio/index";
export { DEFAULT_VOICE_PACK } from "./core/audio/index";

export type { TAudioChannelOptions, TAudioCommandOverride, TAudioOptions, TAudioStrategy, TAudioVoice, TAudioVoicePack } from "./core/audio/index";

export { ECommandKind } from "./core/commands/index";
export type { TBaseCommand } from "./core/commands/index";

export { normalizeCursors } from "./core/commands/index";
export type { TCallbackContext, TCallbackFn, TCallbackHook } from "./core/commands/index";
export type { TCallCommand } from "./core/commands/index";
export type { TUnselectCommand } from "./core/commands/index";
export type { TAdvanceMode, TAdvanceModeInput, TAdvanceUnit, TCommandKind, TCursorSelector, TDeleteCommand, TMoveCommand, TSelectCommand, TStyleCommand, TStyleRange, TTypeCommand, TUnstyleCommand, TWaitCommand } from "./core/commands/index";
export type { TCommand } from "./core/compiler/index";
export { ECursorKind } from "./core/cursor/index";

export type { TCursorAnimation, TCursorAnimationOptions, TCursorKind, TCursorRenderOptions, TResolvedCursorRenderOptions } from "./core/cursor/index";

export { EEventKind } from "./core/events/index";
export type { TBaseEvent } from "./core/events/index";
export type { TDeleteEvent, TEventKind, TInsertEvent, TMoveEvent, TSelectEvent, TStyleEvent, TTimelineEvent, TUnselectEvent, TUnstyleEvent } from "./core/events/index";

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
   * voices and strategies take effect immediately on the next keystroke.
   *
   * @param options - The new audio options to apply
   */
  setAudioOptions: (options: TAudioOptions) => void;

  /**
   * @description
   * Return a snapshot of the current audio options
   *
   * @returns The current TAudioOptions, or null if audio was never configured
   */
  getAudioOptions: () => TAudioOptions | null;

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
  const {
    renderer,
    cursor: cursorDefaults,
    audio: audioOptions,
  } = options;
  const timeline = new TimelineBuilder();

  // Build the initial state using any cursor defaults provided
  let currentState = createInitialState(cursorDefaults);

  // Audio is disabled by default when no audio config is provided.
  // Passing audio: { enabled: true } (or any options) opts into sound.
  const audioManager: AudioManagerHelper | null
    = audioOptions === undefined
      ? new AudioManagerHelper({ enabled: false })
      : new AudioManagerHelper(audioOptions);

  const controller = new PlaybackController(renderer, currentState, audioManager);

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
      controller.setAudioManager(audioManager);
    },

    getAudioOptions(): TAudioOptions | null {
      return audioManager.getOptions();
    },

    setCursorVisible(visible: boolean, cursor?: TCursorSelector): void {
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
