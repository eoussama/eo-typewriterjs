import type { TAudioChannelOptions } from "./audio-channel-options.type";
import type { TAudioCommandOverride } from "./audio-command-override.type";
import type { TAudioOptions } from "./audio-options.type";

import { EAudioStrategy } from "./audio-strategy.enum";
import { DEFAULT_VOICE_PACK } from "./default-voice-pack.const";



// ---------------------------------------------------------------------------
// Internal strategy helpers
// ---------------------------------------------------------------------------

/**
 * @description
 * Manages a shuffle-bag sample selection state.
 * Drains a shuffled copy of the sample pool before re-shuffling,
 * preventing repetitive streaks that plain random can produce.
 */
class ShuffleBagHelper {
  private _bag: string[] = [];
  private _lastPlayed: string | null = null;

  /**
   * @description
   * Pick the next sample from the bag for the given pool.
   * Refills and reshuffles when the bag is empty.
   *
   * @param pool - The full set of available sample URLs
   * @param avoidImmediateRepeat - When true, prevent the same sample playing back-to-back across refills
   * @returns The selected sample URL
   */
  next(pool: readonly string[], avoidImmediateRepeat: boolean): string {
    if (this._bag.length === 0) {
      this._bag = this._shuffle([...pool]);

      if (
        avoidImmediateRepeat
        && this._lastPlayed !== null
        && this._bag.length > 1
        && this._bag[0] === this._lastPlayed
      ) {
        const swapIdx = 1 + Math.floor(Math.random() * (this._bag.length - 1));

        [this._bag[0], this._bag[swapIdx]] = [this._bag[swapIdx]!, this._bag[0]!];
      }
    }

    /* v8 ignore next */
    const sample = this._bag.shift() ?? pool[0]!;

    this._lastPlayed = sample;

    return sample;
  }

  /**
   * @description
   * Reset the bag and discard last-played memory
   */
  reset(): void {
    this._bag = [];
    this._lastPlayed = null;
  }

  /**
   * @description
   * Fisher-Yates in-place shuffle
   *
   * @param arr - The array to shuffle
   * @returns The shuffled array
   */
  private _shuffle(arr: string[]): string[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }

    return arr;
  }
}

/**
 * @description
 * Manages round-robin sample selection state.
 * Cycles through samples in order, looping back to the first.
 */
class RoundRobinHelper {
  private _index = 0;

  /**
   * @description
   * Pick the next sample in round-robin order
   *
   * @param pool - The full set of available sample URLs
   * @returns The selected sample URL
   */
  next(pool: readonly string[]): string {
    const sample = pool[this._index % pool.length]!;

    this._index = (this._index + 1) % pool.length;

    return sample;
  }

  /**
   * @description
   * Reset the round-robin index to the beginning
   */
  reset(): void {
    this._index = 0;
  }
}

// ---------------------------------------------------------------------------
// Channel state
// ---------------------------------------------------------------------------

type TChannelState = {
  readonly bag: ShuffleBagHelper;
  readonly roundRobin: RoundRobinHelper;
  currentAudio: HTMLAudioElement | null;
  lastPlayed: string | null;
};

function createChannelState(): TChannelState {
  return {
    bag: new ShuffleBagHelper(),
    roundRobin: new RoundRobinHelper(),
    currentAudio: null,
    lastPlayed: null,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * @description
 * Pick a random sample, optionally avoiding the last played one
 *
 * @param pool - The available samples
 * @param lastPlayed - The most recently played sample URL, or null
 * @param avoidImmediateRepeat - When true, exclude the last-played sample from the pick
 * @returns The selected sample URL
 */
function pickRandom(
  pool: readonly string[],
  lastPlayed: string | null,
  avoidImmediateRepeat: boolean,
): string {
  if (!avoidImmediateRepeat || lastPlayed === null) {
    return pool[Math.floor(Math.random() * pool.length)]!;
  }

  const eligible = pool.filter(s => s !== lastPlayed);

  return eligible.length > 0
    ? eligible[Math.floor(Math.random() * eligible.length)]!
    : pool[Math.floor(Math.random() * pool.length)]!;
}

// ---------------------------------------------------------------------------
// AudioManagerHelper
// ---------------------------------------------------------------------------

/**
 * @description
 * Runtime audio manager for the typing sound system.
 *
 * Handles voice pack resolution, sample selection strategies (shuffle-bag,
 * round-robin, random), volume/playback-rate jitter, overlap control,
 * and graceful no-op in non-browser environments.
 *
 * Create one instance per typewriter and keep it alive for the session.
 * All settings can be mutated at runtime without restarting playback.
 */
export class AudioManagerHelper {
  private _options: TAudioOptions;
  private _typing: TChannelState;
  private _delete: TChannelState;

  /**
   * @description
   * Create a new AudioManagerHelper
   *
   * @param options - Initial audio configuration. Defaults to enabled with master volume 1 and the built-in voice pack.
   */
  constructor(options: TAudioOptions = {}) {
    this._options = options;
    this._typing = createChannelState();
    this._delete = createChannelState();
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  /**
   * @description
   * Replace the full audio configuration.
   * Resets internal channel selection state so the new voices and strategy
   * take effect immediately on the next play call.
   *
   * @param options - The new audio options to apply
   */
  setOptions(options: TAudioOptions): void {
    this._options = options;
    this._typing.bag.reset();
    this._typing.roundRobin.reset();
    this._delete.bag.reset();
    this._delete.roundRobin.reset();
  }

  /**
   * @description
   * Enable or disable audio globally at runtime
   *
   * @param enabled - Whether audio should be enabled
   */
  setEnabled(enabled: boolean): void {
    this._options = { ...this._options, enabled };
  }

  /**
   * @description
   * Set the master volume. Clamped to [0, 1].
   *
   * @param volume - New master volume
   */
  setVolume(volume: number): void {
    this._options = { ...this._options, volume: Math.max(0, Math.min(1, volume)) };
  }

  /**
   * @description
   * Return a snapshot of the current audio options
   *
   * @returns The current TAudioOptions
   */
  getOptions(): TAudioOptions {
    return this._options;
  }

  // ---------------------------------------------------------------------------
  // Playback
  // ---------------------------------------------------------------------------

  /**
   * @description
   * Play a typing (insert) sound.
   * Pass a per-command override to use a specific voice or volume for this keystroke.
   * Pass `false` to silence this specific keystroke regardless of global settings.
   *
   * @param override - Optional per-command audio override
   */
  playTyping(override?: TAudioCommandOverride): void {
    this._play("typing", override);
  }

  /**
   * @description
   * Play a delete sound.
   * Falls back to typing sounds when no dedicated delete channel is configured.
   * Pass `false` to silence this specific deletion regardless of global settings.
   *
   * @param override - Optional per-command audio override
   */
  playDelete(override?: TAudioCommandOverride): void {
    this._play("delete", override);
  }

  // ---------------------------------------------------------------------------
  // Private implementation
  // ---------------------------------------------------------------------------

  /**
   * @description
   * Core play dispatch used by playTyping and playDelete
   *
   * @param channel - Which channel to play ("typing" or "delete")
   * @param override - Optional per-command override
   */
  private _play(channel: "typing" | "delete", override?: TAudioCommandOverride): void {
    if (this._options.enabled === false) {
      return;
    }

    if (override === false) {
      return;
    }

    const pool = this._resolveSamples(channel, override);

    if (pool.length === 0) {
      return;
    }

    const channelOpts = this._resolveChannelOpts(channel);
    const state = channel === "typing" ? this._typing : this._delete;
    const sample = this._pickSample(pool, channelOpts, state);

    state.lastPlayed = sample;

    const masterVolume = this._options.volume ?? 1;
    const commandVolume = override !== undefined ? (override as Exclude<TAudioCommandOverride, false>).volume : undefined;
    let volume = masterVolume * (commandVolume ?? 1);

    if (channelOpts?.volumeJitter !== undefined) {
      const { min, max } = channelOpts.volumeJitter;

      volume *= min + Math.random() * (max - min);
    }

    volume = Math.max(0, Math.min(1, volume));

    let playbackRate = 1;

    if (channelOpts?.playbackRateJitter !== undefined) {
      const { min, max } = channelOpts.playbackRateJitter;

      playbackRate = min + Math.random() * (max - min);
      playbackRate = Math.max(Number.EPSILON, playbackRate);
    }

    this._emit(sample, volume, playbackRate, channelOpts?.overlap ?? true, state);
  }

  /**
   * @description
   * Resolve the effective channel options for a given channel.
   * The delete channel falls back to the typing channel when not configured.
   *
   * @param channel - The channel name
   * @returns The resolved channel options, or undefined if none are set
   */
  private _resolveChannelOpts(channel: "typing" | "delete"): TAudioChannelOptions | undefined {
    return channel === "typing"
      ? this._options.typing
      : (this._options.delete ?? this._options.typing);
  }

  /**
   * @description
   * Collect the flat list of sample URLs to draw from for a given channel,
   * applying any per-command voice override.
   *
   * Precedence (highest to lowest):
   * 1. Command override `voices` (array of voice names)
   * 2. Command override `voice` (single voice name)
   * 3. Channel `voices` (array of voice names)
   * 4. Channel `voice` (single voice name)
   * 5. All voices in the pack
   *
   * @param channel - The channel being played
   * @param override - Optional command override (never `false` at this point)
   * @returns Flat list of sample URL strings
   */
  private _resolveSamples(channel: "typing" | "delete", override?: Exclude<TAudioCommandOverride, false>): string[] {
    const voices = this._options.voices ?? DEFAULT_VOICE_PACK;
    const channelOpts = this._resolveChannelOpts(channel);

    let voiceNames: readonly string[];

    if (override?.voices !== undefined && override.voices.length > 0) {
      voiceNames = override.voices;
    }
    else if (override?.voice !== undefined) {
      voiceNames = [override.voice];
    }
    else if (channelOpts?.voices !== undefined && channelOpts.voices.length > 0) {
      voiceNames = channelOpts.voices;
    }
    else if (channelOpts?.voice !== undefined) {
      voiceNames = [channelOpts.voice];
    }
    else {
      voiceNames = Object.keys(voices);
    }

    const samples: string[] = [];

    for (const name of voiceNames) {
      const voice = voices[name];

      if (voice !== undefined) {
        samples.push(...voice.samples);
      }
    }

    return samples;
  }

  /**
   * @description
   * Pick the next sample URL from the pool using the configured strategy
   *
   * @param pool - The available sample URLs
   * @param channelOpts - The channel configuration
   * @param state - The mutable channel state (bag / round-robin / last-played)
   * @returns The selected sample URL
   */
  private _pickSample(
    pool: readonly string[],
    channelOpts: TAudioChannelOptions | undefined,
    state: TChannelState,
  ): string {
    if (pool.length === 1) {
      return pool[0]!;
    }

    const strategy = channelOpts?.strategy ?? EAudioStrategy.SHUFFLE_BAG;
    const avoidRepeat = channelOpts?.avoidImmediateRepeat ?? true;

    switch (strategy) {
      case EAudioStrategy.SHUFFLE_BAG:
        return state.bag.next(pool, avoidRepeat);

      case EAudioStrategy.ROUND_ROBIN:
        return state.roundRobin.next(pool);

      case EAudioStrategy.RANDOM:
        return pickRandom(pool, state.lastPlayed, avoidRepeat);

      /* v8 ignore next */
      default:
        return state.bag.next(pool, avoidRepeat);
    }
  }

  /**
   * @description
   * Emit audio for the given sample. No-ops gracefully in non-browser environments
   * or when the browser blocks autoplay.
   *
   * @param src - The audio source URL or data URL
   * @param volume - Resolved volume in [0, 1]
   * @param playbackRate - Resolved playback rate (positive)
   * @param overlap - When true, always create a new element so sounds layer; when false, interrupt the previous
   * @param state - The mutable channel state that holds the non-overlap audio element reference
   */
  private _emit(
    src: string,
    volume: number,
    playbackRate: number,
    overlap: boolean,
    state: TChannelState,
  ): void {
    /* v8 ignore start */
    if (typeof Audio === "undefined") {
      return;
    }

    try {
      let audio: HTMLAudioElement;

      if (!overlap && state.currentAudio !== null) {
        state.currentAudio.pause();
        state.currentAudio.currentTime = 0;
        state.currentAudio.src = src;
        audio = state.currentAudio;
      }
      else {
        audio = new Audio(src);

        if (!overlap) {
          state.currentAudio = audio;
        }
      }

      audio.volume = volume;
      audio.playbackRate = playbackRate;

      void audio.play();
    }
    catch {
      // Swallow DOMException from autoplay policy and any other play errors
    }
    /* v8 ignore stop */
  }
}
