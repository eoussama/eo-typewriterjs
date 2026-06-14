import type { TTimelineEvent } from "../events/timeline-event.type";
import type { IRenderer } from "../renderer/renderer.interface";
import type { TTypewriterState } from "../state/typewriter-state.type";
import type { TCheckpoint } from "./checkpoint.type";

import type { TPlaybackStatus } from "./playback-status.enum";
import { reduce } from "../reducer/reduce.helper";
import { createInitialState } from "../state/typewriter-state.type";
import { EPlaybackStatus } from "./playback-status.enum";



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

  while (idx < events.length && (events[idx]?.time ?? Infinity) <= time) {
    idx++;
  }

  return idx;
}

/**
 * @description
 * A persistent playback controller that wraps a compiled event list and drives
 * a renderer through play, pause, stop, replay, seek, step, and rate changes.
 *
 * The controller maintains a lazy playback cache — call `load()` whenever the
 * compiled event list changes before invoking any playback method.
 */
export class PlaybackController {
  private readonly _renderer: IRenderer;
  private readonly _initialState: TTypewriterState;

  private _events: TTimelineEvent[] = [];
  private _checkpoints: TCheckpoint[] = [];
  private _duration = 0;

  private _status: TPlaybackStatus = EPlaybackStatus.IDLE;
  private _rate = 1;

  private _currentTime = 0;
  private _currentEventIndex = 0;
  private _state: TTypewriterState;

  // Wall-clock bookkeeping for accurate rate-aware scheduling
  private _playStartWall = 0;
  private _playStartTimeline = 0;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _resolvePlay: (() => void) | null = null;

  /**
   * @description
   * Create a new PlaybackController
   *
   * @param renderer - The renderer to mount, render, and unmount
   * @param initialState - The typewriter state to start from (defaults to blank state)
   */
  constructor(renderer: IRenderer, initialState?: TTypewriterState) {
    this._renderer = renderer;
    this._initialState = initialState ?? createInitialState();
    this._state = this._initialState;
  }

  // ---------------------------------------------------------------------------
  // Public read-only state
  // ---------------------------------------------------------------------------

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
   * Load a new compiled event list into the controller, rebuilding checkpoints.
   * Must be called before any playback method when the timeline has changed.
   * Resets playback to idle.
   *
   * @param events - The compiled, time-sorted list of timeline events
   */
  load(events: TTimelineEvent[]): void {
    this._cancelTimer();

    this._events = [...events].sort((a, b) => a.time - b.time);
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
      return this._startPlayback();
    }

    // idle or stopped — mount renderer then start
    this._renderer.mount?.(this._state);

    return this._startPlayback();
  }

  /**
   * @description
   * Pause at the current position.
   * No-op if not currently playing.
   */
  pause(): void {
    if (this._status !== EPlaybackStatus.PLAYING) {
      return;
    }

    this._cancelTimer();
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
    this._cancelTimer();
    this._resolvePlay?.();
    this._resolvePlay = null;
    this._reset();
    this._status = EPlaybackStatus.STOPPED;
    this._renderer.render(this._state);
  }

  /**
   * @description
   * Replay from the beginning regardless of current status.
   *
   * @returns A promise that resolves when playback completes naturally or is interrupted
   */
  replay(): Promise<void> {
    this._cancelTimer();
    this._resolvePlay?.();
    this._resolvePlay = null;
    this._reset();
    this._renderer.render(this._state);
    this._renderer.mount?.(this._state);

    return this._startPlayback();
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

    this._cancelTimer();

    const targetEventIndex = findEventIndexAtTime(this._events, targetTime);
    const cp = findCheckpointBefore(this._checkpoints, targetEventIndex);

    this._state = reconstructState(cp, this._events, targetEventIndex);
    this._currentTime = targetTime;
    this._currentEventIndex = targetEventIndex;

    this._renderer.render(this._state);

    if (wasPlaying) {
      this._scheduleNext();
    }
    else if (targetEventIndex >= this._events.length && this._events.length > 0) {
      this._status = EPlaybackStatus.COMPLETED;
    }
  }

  /**
   * @description
   * Apply the next event-group (all events sharing the same timestamp) and pause.
   * If already at the end, status becomes completed.
   */
  stepForward(): void {
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
    this._cancelTimer();

    if (this._currentEventIndex === 0) {
      this._status = EPlaybackStatus.PAUSED;

      return;
    }

    // Determine the timestamp of the last applied group
    const lastAppliedTime = this._events[this._currentEventIndex - 1]?.time ?? this._currentTime;

    // Walk back to find the start index of that group
    let groupStart = this._currentEventIndex - 1;

    while (groupStart > 0 && this._events[groupStart - 1]?.time === lastAppliedTime) {
      groupStart--;
    }

    if (groupStart === 0) {
      // The only applied group was the first one — return to index 0 / initial state
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
   * Set the playback rate. Must be > 0.
   * If currently playing, reschedules the pending timer at the new rate immediately.
   *
   * @param rate - Playback speed multiplier (e.g. 0.5 = half speed, 2 = double speed)
   */
  setRate(rate: number): void {
    if (rate <= 0) {
      return;
    }

    this._rate = rate;

    if (this._status === EPlaybackStatus.PLAYING) {
      this._cancelTimer();
      this._scheduleNext();
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

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
   * Cancel the currently pending timer, if any
   */
  private _cancelTimer(): void {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /**
   * @description
   * Start (or resume) playback from the current position.
   * Records wall-clock origin for rate-aware delay calculation.
   *
   * @returns A promise that resolves when playback completes or is interrupted
   */
  private _startPlayback(): Promise<void> {
    this._status = EPlaybackStatus.PLAYING;
    this._playStartWall = Date.now();
    this._playStartTimeline = this._currentTime;

    return new Promise<void>((resolve) => {
      this._resolvePlay = resolve;
      this._scheduleNext();
    });
  }

  /**
   * @description
   * Compute the current playhead time accounting for rate.
   * A rate > 1 means the timeline advances faster than wall-clock time.
   * playhead = playStartTimeline + elapsed_wall * rate
   *
   * @returns The current playhead position in timeline milliseconds
   */
  private _playhead(): number {
    const elapsedWall = Date.now() - this._playStartWall;

    return this._playStartTimeline + elapsedWall * this._rate;
  }

  /**
   * @description
   * Apply all due events, render, then schedule the next tick.
   * When all events are exhausted, resolves the play promise and marks completed.
   */
  private _scheduleNext(): void {
    /* v8 ignore next 3 */
    if (this._status !== EPlaybackStatus.PLAYING) {
      return;
    }

    const playhead = this._playhead();
    let advanced = false;

    // Apply all events whose timeline time <= current playhead
    while (
      this._currentEventIndex < this._events.length
      && (this._events[this._currentEventIndex]?.time ?? Infinity) <= playhead
    ) {
      const ev = this._events[this._currentEventIndex];

      if (ev !== undefined) {
        this._state = reduce(this._state, ev);
      }

      this._currentEventIndex++;
      advanced = true;
    }

    if (advanced) {
      this._currentTime = this._events[this._currentEventIndex - 1]?.time ?? playhead;
      this._renderer.render(this._state);
    }

    if (this._currentEventIndex >= this._events.length) {
      // All events exhausted — playback complete
      this._status = EPlaybackStatus.COMPLETED;
      this._resolvePlay?.();
      this._resolvePlay = null;

      return;
    }

    // Schedule the next tick when the next event becomes due.
    // `nextEventTime - playhead` is the remaining timeline duration.
    // Dividing by rate converts that to wall-clock milliseconds.
    const nextEventTime = this._events[this._currentEventIndex]?.time ?? 0;
    const timeUntilNext = (nextEventTime - this._playhead()) / this._rate;
    const delay = Math.max(0, timeUntilNext);

    this._timer = setTimeout(() => {
      this._timer = null;
      this._scheduleNext();
    }, delay);
  }
}
