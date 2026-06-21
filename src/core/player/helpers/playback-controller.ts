import type { AudioManagerHelper } from "../../audio/helpers/audio-manager.helper";
import type { TCommand } from "../../compiler/helpers/compile.helper";
import type { TTimelineEvent } from "../../events/types/timeline-event.type";
import type { IRenderer } from "../../renderer/interfaces/renderer.interface";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";
import type { TPlaybackStatus } from "../enums/playback-status.enum";
import type { TCheckpoint } from "../types/checkpoint.type";

import type { TExecuteCommandsResult } from "./execute-commands.helper";
import { reduce } from "../../reducer/helpers/reduce.helper";
import { createInitialState } from "../../state/helpers/typewriter-state.helper";
import { EPlaybackStatus } from "../enums/playback-status.enum";
import { executeCommands } from "./execute-commands.helper";



/**
 * @description
 * Number of events between consecutive checkpoints
 */
const CHECKPOINT_INTERVAL = 50;

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
 * Build the checkpoint list for a compiled event list.
 * A checkpoint is stored at index 0 and then every CHECKPOINT_INTERVAL events.
 *
 * @param events - The sorted compiled event list
 * @param initialState - The typewriter state before any event is applied
 * @returns An ordered array of checkpoints from earliest to latest
 */
function buildCheckpoints(events: readonly TTimelineEvent[], initialState: TTypewriterState): TCheckpoint[] {
  const checkpoints: TCheckpoint[] = [
    { time: 0, eventIndex: 0, state: initialState },
  ];

  let state = initialState;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    /* v8 ignore next 3 */
    if (event === undefined) {
      continue;
    }

    state = reduce(state, event);

    const isCheckpointBoundary = (i + 1) % CHECKPOINT_INTERVAL === 0;
    const isLastEvent = i === events.length - 1;

    if (isCheckpointBoundary || isLastEvent) {
      checkpoints.push({
        time: event.time,
        eventIndex: i + 1,
        state,
      });
    }
  }

  return checkpoints;
}

/**
 * @description
 * Find the latest checkpoint at or before the given event index.
 *
 * @param checkpoints - The ordered checkpoint list
 * @param targetEventIndex - The upper bound event index (exclusive)
 * @returns The nearest usable checkpoint
 */
function findCheckpointBefore(checkpoints: readonly TCheckpoint[], targetEventIndex: number): TCheckpoint {
  let best = checkpoints[0]!;

  for (const cp of checkpoints) {
    if (cp.eventIndex <= targetEventIndex) {
      best = cp;
    }
    else {
      break;
    }
  }

  return best;
}

/**
 * @description
 * Reduce events from a checkpoint up to (but not including) a target event index.
 *
 * @param checkpoint - The starting checkpoint
 * @param events - The full sorted event list
 * @param targetEventIndex - The first event index NOT to apply
 * @returns The resulting state after applying events [checkpoint.eventIndex, targetEventIndex)
 */
function reconstructState(
  checkpoint: TCheckpoint,
  events: readonly TTimelineEvent[],
  targetEventIndex: number,
): TTypewriterState {
  let state = checkpoint.state;

  for (let i = checkpoint.eventIndex; i < targetEventIndex; i++) {
    const event = events[i];

    /* v8 ignore next 3 */
    if (event !== undefined) {
      state = reduce(state, event);
    }
  }

  return state;
}

/**
 * @description
 * Return the event index of the first event AFTER the given timeline time.
 * All events at or before `time` will have indices < the returned value.
 *
 * @param events - The sorted compiled event list
 * @param time - The target timeline time in milliseconds
 * @returns The exclusive end index for events at or before `time`
 */
function findEventIndexAtTime(events: readonly TTimelineEvent[], time: number): number {
  let idx = 0;

  /* v8 ignore next */
  while (idx < events.length && (events[idx]?.time ?? Infinity) <= time) {
    idx++;
  }

  return idx;
}

/**
 * @description
 * A persistent playback controller that wraps a compiled event list and drives
 * a renderer through play, pause, stop, cancel, replay, seek, step, and rate changes.
 *
 * Play and replay use the async command executor which supports lifecycle hooks
 * and async callbacks. Seek, step, and backward navigation use the compiled-event
 * + checkpoint model for instant, deterministic state reconstruction.
 */
export class PlaybackController {
  private readonly _renderer: IRenderer;
  private _audioManager: AudioManagerHelper | null;
  private _initialState: TTypewriterState;

  private _commands: TCommand[] = [];
  private _events: TTimelineEvent[] = [];
  private _checkpoints: TCheckpoint[] = [];
  private _duration = 0;

  private _status: TPlaybackStatus = EPlaybackStatus.IDLE;
  private _rate = 1;

  private _currentTime = 0;
  private _currentEventIndex = 0;
  private _state: TTypewriterState;

  // Timer-based seek-resume path
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _playStartWall = 0;
  private _playStartTimeline = 0;

  // Async executor session
  private _execAbortController: AbortController | null = null;
  private _resolvePlay: (() => void) | null = null;

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
    initialState?: TTypewriterState,
    audioManager?: AudioManagerHelper | null,
  ) {
    this._renderer = renderer;
    /* v8 ignore next */
    this._initialState = initialState ?? createInitialState();
    this._state = this._initialState;
    /* v8 ignore next */
    this._audioManager = audioManager ?? null;
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
   * Replace the controller's current live state and immediately re-render.
   * Used by runtime cursor mutations so their changes persist even during active
   * playback where the executor would otherwise overwrite the old state.
   *
   * @param state - The new live state to adopt
   */
  setLiveState(state: TTypewriterState): void {
    this._state = state;
  }

  /**
   * @description
   * Return an observable snapshot of the current controller state
   *
   * @returns A TPlaybackControllerState snapshot
   */
  getState(): TPlaybackControllerState {
    return {
      status: this._status,
      currentTime: this._currentTime,
      duration: this._duration,
      rate: this._rate,
    };
  }

  // ---------------------------------------------------------------------------
  // Cache loading
  // ---------------------------------------------------------------------------

  /**
   * @description
   * Replace the initial state used by load(), play(), and replay().
   * Useful for propagating runtime cursor mutations back into the controller
   * so that replay() and post-seek play() start from the updated cursor configuration.
   *
   * @param initialState - The new initial state to use as the playback baseline
   */
  setInitialState(initialState: TTypewriterState): void {
    this._initialState = initialState;
  }

  /**
   * @description
   * Load a new compiled event list and command list into the controller.
   * Must be called before any playback method when the timeline has changed.
   * Resets playback to idle.
   *
   * @param events - The compiled, time-sorted list of timeline events
   * @param commands - The original ordered command list (used by the async executor)
   */
  load(events: TTimelineEvent[], commands: TCommand[] = []): void {
    this._cancelExec();
    this._cancelTimer();

    this._commands = [...commands];
    this._events = [...events].sort((a, b) => a.time - b.time);
    /* v8 ignore next */
    this._duration = this._events.length > 0 ? (this._events[this._events.length - 1]?.time ?? 0) : 0;
    this._checkpoints = buildCheckpoints(this._events, this._initialState);

    this._reset();
  }

  // ---------------------------------------------------------------------------
  // Playback controls
  // ---------------------------------------------------------------------------

  /**
   * @description
   * Start or resume playback.
   * - idle / stopped → mount renderer, play from beginning
   * - paused → resume from current position
   * - completed → replay from beginning
   * - playing → no-op
   *
   * @returns A promise that resolves when playback completes naturally or is interrupted
   */
  play(): Promise<void> {
    if (this._status === EPlaybackStatus.PLAYING) {
      return Promise.resolve();
    }

    if (this._status === EPlaybackStatus.COMPLETED) {
      return this.replay();
    }

    if (this._status === EPlaybackStatus.PAUSED) {
      // Resume from the current event-stream position using the timer path,
      // so playback continues from exactly where it was visually paused.
      return this._resumeFromPause();
    }

    // idle, stopped, or cancelled, mount renderer then start
    this._renderer.mount?.(this._state);

    return this._startExecution(this._initialState);
  }

  /**
   * @description
   * Pause at the current position.
   * No-op if not currently playing.
   * When pausing mid-execution, the current timeline position is derived from the
   * elapsed wall-clock time and state is reconstructed from compiled events at
   * that position, so resume() can continue from the exact visual pause point.
   */
  pause(): void {
    if (this._status !== EPlaybackStatus.PLAYING) {
      return;
    }

    // Snapshot the current playhead position before cancelling the executor.
    // _playStartWall / _playStartTimeline are set by _startExecution and
    // _startTimerResume, so _playhead() is always valid while playing.
    const pauseTime = Math.min(this._playhead(), this._duration);
    const pauseEventIndex = findEventIndexAtTime(this._events, pauseTime);
    const cp = findCheckpointBefore(this._checkpoints, pauseEventIndex);

    this._cancelExec();
    this._cancelTimer();

    this._currentTime = pauseTime;
    this._currentEventIndex = pauseEventIndex;
    this._state = reconstructState(cp, this._events, pauseEventIndex);
    this._renderer.render(this._state);

    this._status = EPlaybackStatus.PAUSED;
    this._resolvePlay?.();
    this._resolvePlay = null;
  }

  /**
   * @description
   * Stop playback and reset to the initial state.
   * Renders the blank initial state but does not unmount.
   */
  stop(): void {
    this._cancelExec();
    this._cancelTimer();
    this._resolvePlay?.();
    this._resolvePlay = null;
    this._reset();
    this._status = EPlaybackStatus.STOPPED;
    this._renderer.render(this._state);
  }

  /**
   * @description
   * Cancel any active playback session without resetting state.
   * Status transitions to CANCELLED.
   * Unlike stop(), the rendered output is preserved at the point of cancellation.
   */
  cancel(): void {
    if (
      this._status !== EPlaybackStatus.PLAYING
      && this._status !== EPlaybackStatus.PAUSED
    ) {
      return;
    }

    this._cancelExec();
    this._cancelTimer();
    this._status = EPlaybackStatus.CANCELLED;
    this._resolvePlay?.();
    this._resolvePlay = null;
  }

  /**
   * @description
   * Replay from the beginning regardless of current status.
   *
   * @returns A promise that resolves when playback completes naturally or is interrupted
   */
  replay(): Promise<void> {
    this._cancelExec();
    this._cancelTimer();
    this._resolvePlay?.();
    this._resolvePlay = null;
    this._reset();
    this._renderer.render(this._state);
    this._renderer.mount?.(this._state);

    return this._startExecution(this._initialState);
  }

  /**
   * @description
   * Seek to an absolute timeline time, clamped to [0, duration].
   * - If playing: continues playing from the new position
   * - Otherwise: jumps and stays in current status
   *
   * @param time - The target timeline time in milliseconds
   */
  seek(time: number): void {
    const targetTime = Math.max(0, Math.min(time, this._duration));
    const wasPlaying = this._status === EPlaybackStatus.PLAYING;

    // If the renderer has never been mounted (idle, stopped, cancelled),
    // mount it first so the render call below is visible immediately.
    const needsMount = this._status === EPlaybackStatus.IDLE
      || this._status === EPlaybackStatus.STOPPED
      || this._status === EPlaybackStatus.CANCELLED;

    this._cancelExec();
    this._cancelTimer();

    const targetEventIndex = findEventIndexAtTime(this._events, targetTime);
    const cp = findCheckpointBefore(this._checkpoints, targetEventIndex);

    this._state = reconstructState(cp, this._events, targetEventIndex);
    this._currentTime = targetTime;
    this._currentEventIndex = targetEventIndex;

    if (needsMount) {
      this._renderer.mount?.(this._state);
    }

    this._renderer.render(this._state);

    if (wasPlaying) {
      void this._startTimerResume();
    }
    else if (targetEventIndex >= this._events.length && this._events.length > 0) {
      this._status = EPlaybackStatus.COMPLETED;
    }
    else if (needsMount) {
      // Stay in PAUSED so subsequent play() resumes from the seek position
      this._status = EPlaybackStatus.PAUSED;
    }
  }

  /**
   * @description
   * Apply the next event-group (all events sharing the same timestamp) and pause.
   * If already at the end, status becomes completed.
   */
  stepForward(): void {
    this._cancelExec();
    this._cancelTimer();

    if (this._currentEventIndex >= this._events.length) {
      this._status = EPlaybackStatus.COMPLETED;

      return;
    }

    const nextEvent = this._events[this._currentEventIndex];

    /* v8 ignore next 4 */
    if (nextEvent === undefined) {
      this._status = EPlaybackStatus.COMPLETED;

      return;
    }

    const groupTime = nextEvent.time;
    let i = this._currentEventIndex;

    while (i < this._events.length && this._events[i]?.time === groupTime) {
      const ev = this._events[i];

      /* v8 ignore next 3 */
      if (ev !== undefined) {
        this._state = reduce(this._state, ev);
      }

      i++;
    }

    this._currentEventIndex = i;
    this._currentTime = groupTime;
    this._renderer.render(this._state);

    this._status = this._currentEventIndex >= this._events.length
      ? EPlaybackStatus.COMPLETED
      : EPlaybackStatus.PAUSED;
  }

  /**
   * @description
   * Undo the most recently applied event-group and pause.
   * Reconstructs state from the nearest checkpoint.
   * If already at the beginning, stays at time 0 in paused status.
   */
  stepBackward(): void {
    this._cancelExec();
    this._cancelTimer();

    if (this._currentEventIndex === 0) {
      this._status = EPlaybackStatus.PAUSED;

      return;
    }

    // Determine the timestamp of the last applied group
    /* v8 ignore next */
    const lastAppliedTime = this._events[this._currentEventIndex - 1]?.time ?? this._currentTime;

    // Walk back to find the start index of that group
    let groupStart = this._currentEventIndex - 1;

    while (groupStart > 0 && this._events[groupStart - 1]?.time === lastAppliedTime) {
      groupStart--;
    }

    if (groupStart === 0) {
      // The only applied group was the first one, return to index 0 / initial state
      this._state = this._initialState;
      this._currentEventIndex = 0;
      this._currentTime = 0;
      this._renderer.render(this._state);
      this._status = EPlaybackStatus.PAUSED;

      return;
    }

    // The target is the state at the end of the group immediately before groupStart
    const targetEventIndex = groupStart;
    const cp = findCheckpointBefore(this._checkpoints, targetEventIndex);

    this._state = reconstructState(cp, this._events, targetEventIndex);
    this._currentEventIndex = targetEventIndex;
    // targetEventIndex > 0 is guaranteed by the groupStart > 0 check above
    this._currentTime = (this._events[targetEventIndex - 1] as TTimelineEvent).time;
    this._renderer.render(this._state);
    this._status = EPlaybackStatus.PAUSED;
  }

  /**
   * @description
   * Set the audio manager instance used during playback.
   * Changes take effect on the next play or replay.
   * Pass `null` to disable audio.
   *
   * @param audioManager - The new audio manager, or null to disable audio
   */
  setAudioManager(audioManager: AudioManagerHelper | null): void {
    this._audioManager = audioManager;
  }

  /**
   * @description
   * Set the playback rate. Must be > 0.
   *
   * @param rate - Playback speed multiplier (e.g. 0.5 = half speed, 2 = double speed)
   */
  setRate(rate: number): void {
    if (rate <= 0) {
      return;
    }

    this._rate = rate;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * @description
   * Resume playback from the current paused position using the timer-based
   * event loop, continuing from _currentEventIndex / _currentTime.
   * Returns a promise that resolves when playback completes or is interrupted.
   *
   * @returns A promise that resolves when playback ends
   */
  private _resumeFromPause(): Promise<void> {
    return this._startTimerResume();
  }

  /**
   * @description
   * Resume playback from _currentEventIndex using the timer-based event loop.
   * Used by seek() when wasPlaying and by _resumeFromPause().
   *
   * @returns A promise that resolves when the timer run completes or is interrupted
   */
  private _startTimerResume(): Promise<void> {
    this._status = EPlaybackStatus.PLAYING;
    this._playStartWall = Date.now();
    this._playStartTimeline = this._currentTime;

    return new Promise<void>((resolve) => {
      this._resolvePlay = resolve;
      this._tickTimer();
    });
  }

  /**
   * @description
   * Return the current playhead position accounting for rate
   *
   * @returns Current playhead time in timeline milliseconds
   */
  private _playhead(): number {
    const elapsedWall = Date.now() - this._playStartWall;

    return this._playStartTimeline + elapsedWall * this._rate;
  }

  /**
   * @description
   * Event-timer tick: apply all due events, render, then schedule the next tick.
   * Used only by the seek-resume path.
   */
  private _tickTimer(): void {
    /* v8 ignore next 3 */
    if (this._status !== EPlaybackStatus.PLAYING) {
      return;
    }

    const playhead = this._playhead();
    let advanced = false;

    /* v8 ignore next 4 */
    while (
      this._currentEventIndex < this._events.length
      && (this._events[this._currentEventIndex]?.time ?? Infinity) <= playhead
    ) {
      const ev = this._events[this._currentEventIndex];

      /* v8 ignore next 3 */
      if (ev !== undefined) {
        this._state = reduce(this._state, ev);
      }

      this._currentEventIndex++;
      advanced = true;
    }

    if (advanced) {
      /* v8 ignore next */
      this._currentTime = this._events[this._currentEventIndex - 1]?.time ?? playhead;
      this._renderer.render(this._state);
    }

    if (this._currentEventIndex >= this._events.length) {
      this._status = EPlaybackStatus.COMPLETED;
      this._resolvePlay?.();
      this._resolvePlay = null;

      return;
    }

    /* v8 ignore next */
    const nextEventTime = this._events[this._currentEventIndex]?.time ?? 0;
    const timeUntilNext = (nextEventTime - this._playhead()) / this._rate;
    const delay = Math.max(0, timeUntilNext);

    this._timer = setTimeout(() => {
      this._timer = null;
      this._tickTimer();
    }, delay);
  }

  /**
   * @description
   * Reset runtime playback position to the beginning without changing status
   */
  private _reset(): void {
    this._state = this._initialState;
    this._currentTime = 0;
    this._currentEventIndex = 0;
    this._status = EPlaybackStatus.IDLE;
  }

  /**
   * @description
   * Cancel the pending legacy timer, if any
   */
  private _cancelTimer(): void {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /**
   * @description
   * Abort the active async executor session, if any
   */
  private _cancelExec(): void {
    if (this._execAbortController !== null) {
      this._execAbortController.abort();
      this._execAbortController = null;
    }
  }

  /**
   * @description
   * Start the async executor from the given state.
   * Creates a fresh AbortController for the session and returns a promise
   * that resolves when execution completes or is interrupted.
   *
   * @param startState - The typewriter state to begin execution from
   * @returns A promise that resolves when playback completes or is interrupted
   */
  private _startExecution(startState: TTypewriterState): Promise<void> {
    this._status = EPlaybackStatus.PLAYING;

    // Record wall-clock start so _playhead() correctly reflects elapsed time
    // while the executor is running (used by pause() to snapshot position).
    this._playStartWall = Date.now();
    this._playStartTimeline = this._currentTime;

    const ac = new AbortController();

    this._execAbortController = ac;

    // Wrap the renderer so that every render() call keeps _state in sync.
    // This ensures getLiveState() always returns the evolving execution state
    // rather than the stale initial state, which is critical for runtime
    // cursor mutations (setCursorVisible, setCursorOptions) to read the
    // correct live document text and not re-render from an empty baseline.
    const trackingRenderer: IRenderer = {
      mount: this._renderer.mount?.bind(this._renderer),
      render: (state: TTypewriterState) => {
        this._state = state;
        this._renderer.render(state);
      },
      unmount: this._renderer.unmount?.bind(this._renderer),
    };

    return new Promise<void>((resolve) => {
      this._resolvePlay = resolve;

      executeCommands(
        this._commands,
        startState,
        trackingRenderer,
        {
          signal: ac.signal,
          getRate: () => this._rate,
          getLiveState: () => this._state,
          getAudioManager: () => this._audioManager,
        },
      ).then((result: TExecuteCommandsResult) => {
        // Only update status if this session is still the active one
        if (this._execAbortController === ac) {
          this._execAbortController = null;
          this._state = result.state;

          /* v8 ignore next 5 */
          if (!ac.signal.aborted) {
            this._status = EPlaybackStatus.COMPLETED;
            this._currentEventIndex = this._events.length;
            this._currentTime = this._duration;
          }
        }

        resolve();

        // Only clear _resolvePlay if it still belongs to this session.
        // A pause() + resume() sequence may have already replaced it with the
        // timer session's resolver; clearing it there would break the timer.
        if (this._resolvePlay === resolve) {
          this._resolvePlay = null;
        }
        /* v8 ignore start */
      }).catch(() => {
        // executeCommands never rejects in practice, AbortErrors are caught internally
        resolve();

        if (this._resolvePlay === resolve) {
          this._resolvePlay = null;
        }
      });
      /* v8 ignore stop */
    });
  }
}
