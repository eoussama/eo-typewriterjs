import type { TDeferred, TValueOf } from "@eoussama/core";
import type { AudioManagerHelper } from "../../audio/helpers/audio-manager.helper";
import type { TCallbackContext, TCallbackFn } from "../../commands/types/callback-hook.type";
import type { TPlaybackProgram, TPlaybackStep } from "../../compiler/types/playback-step.type";
import type { IRenderer } from "../../renderer/interfaces/renderer.interface";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";
import type { TPlaybackStatus } from "../enums/playback-status.enum";
import type { TCheckpoint } from "../types/checkpoint.type";

import { deferred, toError } from "@eoussama/core";
import { ECommandKind } from "../../commands/enums/command-kind.enum";
import { reduce } from "../../reducer/helpers/reduce.helper";
import { createInitialState } from "../../state/helpers/typewriter-state.helper";
import { EPlaybackStatus } from "../enums/playback-status.enum";



/**
 * @description
 * Number of steps between consecutive checkpoints
 */
const CHECKPOINT_INTERVAL = 50;

/**
 * @description
 * Progress through the step at the playhead, so a paused step resumes where it stopped
 * instead of firing its hooks or callback twice
 */
const EStepPhase = {
  PENDING: 0,
  BEFORE: 1,
  CALL: 2,
  APPLIED: 3,
  AFTER: 4,
} as const;

type TStepPhase = TValueOf<typeof EStepPhase>;

/**
 * @description
 * Observable controller state exposed via `getState()`
 */
export type TPlaybackControllerState = {
  readonly status: TPlaybackStatus;
  readonly currentTime: number;
  readonly duration: number;
  readonly rate: number;
};

/**
 * @description
 * One run of the playback loop. Pausing, stopping or seeking aborts the session;
 * `done` settles the promise returned to `play()` callers.
 */
type TSession = {
  readonly controller: AbortController;
  readonly done: TDeferred<void>;
};

/**
 * @description
 * Apply the events of a range of steps to a state, without side effects
 *
 * @param state - The state to start from
 * @param steps - The step list
 * @param from - The first step index to apply
 * @param to - The step index to stop before
 * @returns The resulting state
 */
function applySteps(state: TTypewriterState, steps: readonly TPlaybackStep[], from: number, to: number): TTypewriterState {
  let next = state;

  for (let i = from; i < to; i++) {
    for (const event of steps[i]!.events) {
      next = reduce(next, event);
    }
  }

  return next;
}

/**
 * @description
 * Build the checkpoint list for a step list: one at index 0, then one every
 * CHECKPOINT_INTERVAL steps.
 *
 * @param steps - The compiled step list
 * @param initialState - The typewriter state before any step is applied
 * @returns An ordered array of checkpoints from earliest to latest
 */
function buildCheckpoints(steps: readonly TPlaybackStep[], initialState: TTypewriterState): TCheckpoint[] {
  const checkpoints: TCheckpoint[] = [{ time: 0, eventIndex: 0, state: initialState }];
  let state = initialState;

  for (let i = CHECKPOINT_INTERVAL; i <= steps.length; i += CHECKPOINT_INTERVAL) {
    state = applySteps(state, steps, i - CHECKPOINT_INTERVAL, i);
    checkpoints.push({ time: steps[i - 1]!.time, eventIndex: i, state });
  }

  return checkpoints;
}

/**
 * @description
 * Whether a step visibly changed the document or moved one of its cursors
 *
 * @param prev - The state before the step
 * @param next - The state after the step
 * @param step - The step that was applied
 * @returns True when the step had a visible effect
 */
function stepChanged(prev: TTypewriterState, next: TTypewriterState, step: TPlaybackStep): boolean {
  return prev.document.text !== next.document.text
    || step.events.some(event => "cursorId" in event && prev.cursors[event.cursorId]?.index !== next.cursors[event.cursorId]?.index);
}

/**
 * @description
 * Drives a renderer through a compiled list of playback steps.
 *
 * A single scheduler handles play, resume and seek alike: every step fires its hooks,
 * callback and sound wherever playback starts from. The timeline clock is frozen while
 * an async hook or callback is pending. Seek and step navigation rebuild state from
 * checkpoints and skip the side effects of the steps they jump over.
 */
export class PlaybackController {
  private readonly _renderer: IRenderer;
  private readonly _audioManager: AudioManagerHelper | null;
  private _initialState: TTypewriterState;

  private _steps: readonly TPlaybackStep[] = [];
  private _checkpoints: TCheckpoint[] = [];
  private _duration = 0;

  private _status: TPlaybackStatus = EPlaybackStatus.IDLE;
  private _rate = 1;
  private _state: TTypewriterState;
  private _mounted = false;

  // Playhead: the next step to run, how far into it playback got, and the timeline time.
  private _index = 0;
  private _phase: TStepPhase = EStepPhase.PENDING;
  private _time = 0;

  // While playing, the timeline time advances from `_anchorTime` at `_rate` since `_anchorWall`.
  private _anchorTime = 0;
  private _anchorWall = 0;
  private _session: TSession | null = null;
  private _wake: { readonly timer: ReturnType<typeof setTimeout>; readonly reschedule: () => void } | null = null;
  private _callbackDepth = 0;

  /**
   * @description
   * Create a new PlaybackController
   *
   * @param renderer - The renderer to mount, render, and unmount
   * @param initialState - The typewriter state to start from (defaults to blank state)
   * @param audioManager - Optional audio manager instance for typing/delete sounds
   */
  constructor(
    renderer: IRenderer,
    initialState: TTypewriterState = createInitialState(),
    audioManager: AudioManagerHelper | null = null,
  ) {
    this._renderer = renderer;
    this._initialState = initialState;
    this._state = initialState;
    this._audioManager = audioManager;
  }

  // ---------------------------------------------------------------------------
  // Public read-only state
  // ---------------------------------------------------------------------------

  /**
   * @description
   * Return the current live typewriter state (document + cursors + selections)
   *
   * @returns The current TTypewriterState
   */
  getLiveState(): TTypewriterState {
    return this._state;
  }

  /**
   * @description
   * Replace the live state, e.g. after a runtime cursor change.
   * Playback continues from the new state.
   *
   * @param state - The new live state to adopt
   */
  setLiveState(state: TTypewriterState): void {
    this._state = state;
  }

  /**
   * @description
   * Return the baseline state that playback starts from
   *
   * @returns The initial TTypewriterState
   */
  getInitialState(): TTypewriterState {
    return this._initialState;
  }

  /**
   * @description
   * Replace the baseline state that play, replay, seek and step start from.
   * Checkpoints are rebuilt so seeking reflects the new baseline.
   *
   * @param initialState - The new initial state to use as the playback baseline
   */
  setInitialState(initialState: TTypewriterState): void {
    this._initialState = initialState;
    this._checkpoints = buildCheckpoints(this._steps, initialState);
  }

  /**
   * @description
   * Whether a hook or `call` callback is currently running
   *
   * @returns True while inside a playback callback
   */
  isRunningCallback(): boolean {
    return this._callbackDepth > 0;
  }

  /**
   * @description
   * Return an observable snapshot of the current controller state.
   * While playing, `currentTime` follows the playhead live.
   *
   * @returns A TPlaybackControllerState snapshot
   */
  getState(): TPlaybackControllerState {
    return {
      status: this._status,
      currentTime: this._status === EPlaybackStatus.PLAYING ? this._playhead() : this._time,
      duration: this._duration,
      rate: this._rate,
    };
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  /**
   * @description
   * Load a compiled program. Interrupts any active playback and resets to idle.
   *
   * @param program - The compiled playback steps and duration
   */
  load(program: TPlaybackProgram): void {
    this._interrupt();
    this._steps = program.steps;
    this._duration = program.duration;
    this._checkpoints = buildCheckpoints(this._steps, this._initialState);
    this._rewind();
    this._status = EPlaybackStatus.IDLE;
  }

  // ---------------------------------------------------------------------------
  // Playback controls
  // ---------------------------------------------------------------------------

  /**
   * @description
   * Start or resume playback.
   * - idle / stopped / cancelled → play from the beginning
   * - paused → resume from the current position
   * - completed → replay from the beginning
   * - playing → return the in-flight promise
   *
   * @returns A promise that resolves when playback completes or is paused, stopped or cancelled,
   * and rejects when a hook, callback or the renderer throws
   */
  play(): Promise<void> {
    if (this._session !== null) {
      return this._session.done.promise;
    }

    if (this._status === EPlaybackStatus.COMPLETED) {
      return this.replay();
    }

    if (this._status !== EPlaybackStatus.PAUSED) {
      this._restart();
    }

    return this._start(deferred<void>());
  }

  /**
   * @description
   * Pause at the current position, keeping exactly what is on screen.
   * No-op if not currently playing.
   */
  pause(): void {
    if (this._status !== EPlaybackStatus.PLAYING) {
      return;
    }

    this._time = this._playhead();
    this._interrupt();
    this._status = EPlaybackStatus.PAUSED;
  }

  /**
   * @description
   * Stop playback and reset to the initial state.
   * Renders the blank initial state but does not unmount.
   */
  stop(): void {
    this._interrupt();
    this._rewind();
    this._status = EPlaybackStatus.STOPPED;
    this._renderSync();
  }

  /**
   * @description
   * Cancel any active playback session without resetting state.
   * Status transitions to CANCELLED and the rendered output is preserved.
   * No-op unless playing or paused.
   */
  cancel(): void {
    if (this._status !== EPlaybackStatus.PLAYING && this._status !== EPlaybackStatus.PAUSED) {
      return;
    }

    this._time = this._status === EPlaybackStatus.PLAYING ? this._playhead() : this._time;
    this._interrupt();
    this._status = EPlaybackStatus.CANCELLED;
  }

  /**
   * @description
   * Replay from the beginning regardless of current status.
   *
   * @returns A promise that resolves when playback completes or is interrupted
   */
  replay(): Promise<void> {
    this._interrupt();
    this._restart();

    return this._start(deferred<void>());
  }

  /**
   * @description
   * Seek to an absolute timeline time, clamped to [0, duration].
   * Steps at or before the target are applied without their hooks, callbacks or sounds.
   * - If playing: continues playing from the new position; the pending `play()` promise
   *   settles when playback ends
   * - Otherwise: pauses at the new position, or completes when seeking to the end
   *
   * @param time - The target timeline time in milliseconds; NaN is ignored
   */
  seek(time: number): void {
    if (Number.isNaN(time)) {
      return;
    }

    const target = Math.max(0, Math.min(time, this._duration));
    const session = this._session;

    this._detach();

    let index = 0;

    while (index < this._steps.length && this._steps[index]!.time <= target) {
      index++;
    }

    this._moveTo(index, target);

    if (session !== null) {
      void this._start(session.done);
    }
    else {
      this._status = index >= this._steps.length && this._steps.length > 0
        ? EPlaybackStatus.COMPLETED
        : EPlaybackStatus.PAUSED;
    }
  }

  /**
   * @description
   * Apply the next group of steps (all steps sharing the next timestamp) and pause.
   * Hooks, callbacks and sounds are not fired. At the end, status becomes completed.
   */
  stepForward(): void {
    this._interrupt();
    this._settlePhase();

    if (this._index >= this._steps.length) {
      this._mountSync();
      this._status = EPlaybackStatus.COMPLETED;

      return;
    }

    const time = this._steps[this._index]!.time;
    let end = this._index;

    while (end < this._steps.length && this._steps[end]!.time === time) {
      end++;
    }

    this._state = applySteps(this._state, this._steps, this._index, end);
    this._index = end;
    this._time = time;
    this._mountSync();
    this._renderSync();
    this._status = end >= this._steps.length ? EPlaybackStatus.COMPLETED : EPlaybackStatus.PAUSED;
  }

  /**
   * @description
   * Undo the most recently applied group of steps and pause.
   * At the beginning, stays at time 0 in paused status.
   */
  stepBackward(): void {
    this._interrupt();
    this._settlePhase();

    let start = this._index;

    if (start > 0) {
      const time = this._steps[start - 1]!.time;

      while (start > 0 && this._steps[start - 1]!.time === time) {
        start--;
      }
    }

    this._moveTo(start, start > 0 ? this._steps[start - 1]!.time : 0);
    this._status = EPlaybackStatus.PAUSED;
  }

  /**
   * @description
   * Set the playback rate. Non-finite and non-positive values are ignored.
   * Changing the rate mid-play keeps the playhead where it is.
   *
   * @param rate - Playback speed multiplier (e.g. 0.5 = half speed, 2 = double speed)
   */
  setRate(rate: number): void {
    if (!Number.isFinite(rate) || rate <= 0) {
      return;
    }

    if (this._status === EPlaybackStatus.PLAYING) {
      this._anchorTime = this._playhead();
      this._anchorWall = Date.now();
    }

    this._rate = rate;
    this._wake?.reschedule();
  }

  /**
   * @description
   * Stop playback, unmount the renderer and return to idle.
   * Playing again mounts the renderer afresh.
   */
  destroy(): void {
    this._interrupt();
    this._rewind();
    this._status = EPlaybackStatus.IDLE;

    if (this._mounted) {
      this._mounted = false;
      void Promise.resolve(this._renderer.unmount?.()).catch(() => {});
    }
  }

  // ---------------------------------------------------------------------------
  // Playback loop
  // ---------------------------------------------------------------------------

  /**
   * @description
   * Start a playback session from the current playhead
   *
   * @param done - The deferred settled when this playback ends
   * @returns The promise of `done`
   */
  private _start(done: TDeferred<void>): Promise<void> {
    const session: TSession = { controller: new AbortController(), done };

    this._session = session;
    this._status = EPlaybackStatus.PLAYING;
    this._anchorTime = this._time;
    this._anchorWall = Date.now();

    void this._run(session);

    return done.promise;
  }

  /**
   * @description
   * Run steps from the playhead until the end or until the session is aborted
   *
   * @param session - The session driving this run
   * @returns A promise that settles when the run ends
   */
  private async _run(session: TSession): Promise<void> {
    const { signal } = session.controller;

    try {
      if (!this._mounted) {
        await this._renderer.mount?.(this._state);
        this._mounted = true;
      }

      while (!signal.aborted && this._index < this._steps.length) {
        const step = this._steps[this._index]!;

        if (this._phase === EStepPhase.PENDING) {
          await this._sleepUntil(step.time, signal);
        }

        // The clock is frozen at the step's time while it runs.
        this._anchorTime = step.time;
        this._anchorWall = Date.now();

        await this._runStep(step, signal);

        if (!signal.aborted) {
          this._index++;
          this._phase = EStepPhase.PENDING;
          this._anchorWall = Date.now();
        }
      }

      if (!signal.aborted) {
        this._session = null;
        this._time = this._duration;
        this._status = EPlaybackStatus.COMPLETED;
        session.done.resolve();
      }
    }
    catch (error) {
      if (!signal.aborted) {
        this._time = this._playhead();
        this._detach();
        this._status = EPlaybackStatus.CANCELLED;
        session.done.reject(toError(error));
      }
    }
  }

  /**
   * @description
   * Run the remaining phases of a step: before hook, call callback, state change with
   * render and sound, then after hook. Stops early when the session is aborted.
   *
   * @param step - The step to run
   * @param signal - The session's abort signal
   * @returns A promise that settles when the step's remaining phases have run
   */
  private async _runStep(step: TPlaybackStep, signal: AbortSignal): Promise<void> {
    const { command } = step;

    if (this._phase < EStepPhase.BEFORE) {
      this._phase = EStepPhase.BEFORE;

      if (step.before) {
        await this._invoke(command.before, step, signal);
      }
    }

    if (signal.aborted) {
      return;
    }

    if (this._phase < EStepPhase.CALL) {
      this._phase = EStepPhase.CALL;

      if (step.call && command.kind === ECommandKind.CALL) {
        await this._invoke(command.callback, step, signal);
      }
    }

    if (signal.aborted) {
      return;
    }

    if (this._phase < EStepPhase.APPLIED) {
      this._phase = EStepPhase.APPLIED;

      if (step.events.length > 0) {
        const prev = this._state;

        this._state = applySteps(prev, [step], 0, 1);

        if (step.sound !== null && stepChanged(prev, this._state, step)) {
          this._playSound(step);
        }

        await this._renderer.render(this._state);
      }
    }

    if (signal.aborted) {
      return;
    }

    if (this._phase < EStepPhase.AFTER) {
      this._phase = EStepPhase.AFTER;

      if (step.after) {
        await this._invoke(command.after, step, signal);
      }
    }
  }

  /**
   * @description
   * Invoke a hook or callback with the step's context
   *
   * @param fn - The function to invoke, if any
   * @param step - The step being run
   * @param signal - The session's abort signal
   * @returns A promise that settles when the function has finished
   */
  private async _invoke(fn: TCallbackFn | undefined, step: TPlaybackStep, signal: AbortSignal): Promise<void> {
    if (fn === undefined) {
      return;
    }

    const context: TCallbackContext = {
      state: this._state,
      stepIndex: step.stepIndex,
      stepCount: step.stepCount,
      unit: step.unit,
      signal,
    };

    this._callbackDepth++;

    try {
      await fn(context);
    }
    finally {
      this._callbackDepth--;
    }
  }

  /**
   * @description
   * Play the step's sound through the audio manager
   *
   * @param step - The step whose sound to play
   */
  private _playSound(step: TPlaybackStep): void {
    switch (step.sound) {
      case "delete":
        this._audioManager?.playDelete(step.command.audio);
        break;

      case "move":
        this._audioManager?.playMove(step.command.audio);
        break;

      default:
        this._audioManager?.playTyping(step.command.audio);
    }
  }

  /**
   * @description
   * Wait until the playhead reaches a timeline time. The wait is recomputed when the
   * rate changes, and rejects when the signal aborts.
   *
   * @param time - The timeline time to wait for
   * @param signal - The session's abort signal
   * @returns A promise that resolves when the time is reached
   */
  private _sleepUntil(time: number, signal: AbortSignal): Promise<void> {
    if (time <= this._playhead()) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const onAbort = (): void => {
        clearTimeout(this._wake?.timer);
        this._wake = null;
        reject(signal.reason);
      };

      const schedule = (): void => {
        clearTimeout(this._wake?.timer);

        const delay = (time - this._playhead()) / this._rate;
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", onAbort);
          this._wake = null;
          resolve();
        }, Math.max(0, delay));

        this._wake = { timer, reschedule: schedule };
      };

      signal.addEventListener("abort", onAbort, { once: true });
      schedule();
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * @description
   * Return the live timeline position. While a step runs or before playback starts it is
   * the anchor; while waiting for the next step it advances with wall-clock time and the
   * rate, without passing the next step's time.
   *
   * @returns The playhead time in timeline milliseconds
   */
  private _playhead(): number {
    if (this._wake === null) {
      return this._anchorTime;
    }

    // While waiting, the playhead is always heading towards the step at `_index`.
    const next = this._steps[this._index]!.time;
    const elapsed = (Date.now() - this._anchorWall) * this._rate;

    return Math.min(next, this._anchorTime + elapsed);
  }

  /**
   * @description
   * Abort the active session, if any, without settling its promise
   */
  private _detach(): void {
    const session = this._session;

    this._session = null;
    session?.controller.abort();
  }

  /**
   * @description
   * Abort the active session, if any, and resolve its promise
   */
  private _interrupt(): void {
    const session = this._session;

    this._detach();
    session?.done.resolve();
  }

  /**
   * @description
   * Move the playhead back to the start with the initial state
   */
  private _rewind(): void {
    this._state = this._initialState;
    this._index = 0;
    this._phase = EStepPhase.PENDING;
    this._time = 0;
    this._anchorTime = 0;
  }

  /**
   * @description
   * Rewind for a fresh run, repainting the initial state when the renderer already
   * shows an earlier run
   */
  private _restart(): void {
    this._rewind();

    if (this._mounted) {
      this._renderSync();
    }
  }

  /**
   * @description
   * Complete a partially run step for navigation: if its events were applied it counts
   * as done, otherwise it is retried from the start
   */
  private _settlePhase(): void {
    if (this._phase >= EStepPhase.APPLIED) {
      this._index++;
    }

    this._phase = EStepPhase.PENDING;
  }

  /**
   * @description
   * Jump to a step index, rebuilding state from the nearest checkpoint, then render
   *
   * @param index - The first step index not applied
   * @param time - The timeline time to report
   */
  private _moveTo(index: number, time: number): void {
    let checkpoint = this._checkpoints[0]!;

    for (const candidate of this._checkpoints) {
      if (candidate.eventIndex <= index) {
        checkpoint = candidate;
      }
    }

    this._state = applySteps(checkpoint.state, this._steps, checkpoint.eventIndex, index);
    this._index = index;
    this._phase = EStepPhase.PENDING;
    this._time = time;
    this._anchorTime = time;
    this._mountSync();
    this._renderSync();
  }

  /**
   * @description
   * Mount the renderer from a synchronous control, if not mounted yet.
   * Asynchronous mount failures cannot be reported here and are ignored.
   */
  private _mountSync(): void {
    if (!this._mounted) {
      const result = this._renderer.mount?.(this._state);

      this._mounted = true;
      void Promise.resolve(result).catch(() => {});
    }
  }

  /**
   * @description
   * Render the live state from a synchronous control.
   * Asynchronous render failures cannot be reported here and are ignored.
   */
  private _renderSync(): void {
    void Promise.resolve(this._renderer.render(this._state)).catch(() => {});
  }
}
