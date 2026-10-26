import type { TAudioChannelOptions } from "../types/audio-channel-options.type";
import type { TAudioChannel } from "../types/audio-channel.type";
import type { TAudioCommandOverride } from "../types/audio-command-override.type";
import type { TAudioOptions } from "../types/audio-options.type";

import { defaultChannelVariance } from "../consts/channel-variance.const";
import { EAudioStrategy } from "../enums/audio-strategy.enum";
import { getLoadedDefaultSfxPack, loadDefaultSfxPack } from "./load-default-sfx-pack.helper";



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

      if (avoidImmediateRepeat && this._bag.length > 1 && this._bag[0] === this._lastPlayed) {
        const swapIdx = 1 + Math.floor(Math.random() * (this._bag.length - 1));

        [this._bag[0], this._bag[swapIdx]] = [this._bag[swapIdx]!, this._bag[0]!];
      }
    }

    // The bag was refilled above if it was empty, so it always holds a sample here.
    const sample = this._bag.shift()!;

    this._lastPlayed = sample;

    return sample;
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
}

/**
 * @description
 * Selection state for one sample pool. Each distinct pool keeps its own bag and
 * round-robin position, so switching pools never plays leftovers from another one.
 */
type TPoolState = {
  readonly bag: ShuffleBagHelper;
  readonly roundRobin: RoundRobinHelper;
};

/**
 * @description
 * Mutable playback state of one audio channel
 */
type TChannelState = {
  readonly pools: Map<string, TPoolState>;
  currentAudio: HTMLAudioElement | null;
  lastPlayed: string | null;
};

/**
 * @description
 * A resolved sample pool, keyed by the sfx names it was built from
 */
type TSamplePool = {
  readonly key: string;
  readonly samples: readonly string[];
};

function createChannelState(): TChannelState {
  return {
    pools: new Map(),
    currentAudio: null,
    lastPlayed: null,
  };
}

/**
 * @description
 * Create fresh playback state for every channel
 *
 * @returns The channel states
 */
function createChannelStates(): Record<TAudioChannel, TChannelState> {
  return { typing: createChannelState(), delete: createChannelState(), move: createChannelState() };
}

/**
 * @description
 * Sample selection settings that the delete and move channels inherit from typing
 *
 * @param options - The typing channel options
 * @returns The inheritable subset
 */
function pickSelection(options: TAudioChannelOptions | undefined): TAudioChannelOptions {
  if (options === undefined) {
    return {};
  }

  const { playbackRateJitter: _rate, volumeJitter: _volume, ...selection } = options;

  return selection;
}

/**
 * @description
 * Return the selection state of a pool, creating it on first use
 *
 * @param state - The channel state owning the pools
 * @param key - The pool key
 * @returns The pool's selection state
 */
function getPoolState(state: TChannelState, key: string): TPoolState {
  let pool = state.pools.get(key);

  if (pool === undefined) {
    pool = { bag: new ShuffleBagHelper(), roundRobin: new RoundRobinHelper() };
    state.pools.set(key, pool);
  }

  return pool;
}

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
  const eligible = avoidImmediateRepeat ? pool.filter(s => s !== lastPlayed) : pool;

  // When every sample is the last one played, repeating it is the only option.
  return eligible.length > 0 ? eligible[Math.floor(Math.random() * eligible.length)]! : lastPlayed!;
}

/**
 * @description
 * Runtime audio manager for the typing sound system.
 *
 * Handles sfx pack resolution, sample selection strategies (shuffle-bag,
 * round-robin, random), volume/playback-rate jitter, overlap control,
 * and graceful no-op in non-browser environments.
 *
 * Create one instance per typewriter and keep it alive for the session.
 * All settings can be mutated at runtime without restarting playback.
 */
export class AudioManagerHelper {
  private _options: TAudioOptions;
  private _channels: Record<TAudioChannel, TChannelState>;

  /**
   * @description
   * Create a new AudioManagerHelper
   *
   * @param options - Initial audio configuration. Defaults to enabled with master volume 1 and the built-in sfx pack.
   */
  constructor(options: TAudioOptions = {}) {
    this._options = options;
    this._channels = createChannelStates();
    void this.ready();
  }

  /**
   * @description
   * Wait until the samples needed by the current options are available.
   * The built-in pack is loaded lazily the first time audio is enabled without custom
   * sfxs; sounds requested before it has loaded are skipped.
   *
   * @returns A promise that resolves once playback can produce sound
   */
  async ready(): Promise<void> {
    if (this._options.enabled !== false && this._options.sfxs === undefined) {
      await loadDefaultSfxPack();
    }
  }

  /**
   * @description
   * Replace the full audio configuration.
   * Resets internal channel selection state so the new sfxs and strategy
   * take effect immediately on the next play call.
   *
   * @param options - The new audio options to apply
   */
  setOptions(options: TAudioOptions): void {
    this._options = options;
    this._channels = createChannelStates();
    void this.ready();
  }

  /**
   * @description
   * Enable or disable audio globally at runtime
   *
   * @param enabled - Whether audio should be enabled
   */
  setEnabled(enabled: boolean): void {
    this._options = { ...this._options, enabled };
    void this.ready();
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

  /**
   * @description
   * Play a typing (insert) sound.
   * Pass a per-command override to use a specific sfx or volume for this keystroke.
   * Pass `false` to silence this specific keystroke regardless of global settings.
   *
   * @param override - Optional per-command audio override
   */
  playTyping(override?: TAudioCommandOverride): void {
    this._play("typing", override);
  }

  /**
   * @description
   * Play a delete sound: the typing samples, pitched lower by default.
   * Pass `false` to silence this specific deletion regardless of global settings.
   *
   * @param override - Optional per-command audio override
   */
  playDelete(override?: TAudioCommandOverride): void {
    this._play("delete", override);
  }

  /**
   * @description
   * Play a cursor move sound: the typing samples, lighter and quieter by default.
   * Pass `false` to silence this specific move regardless of global settings.
   *
   * @param override - Optional per-command audio override
   */
  playMove(override?: TAudioCommandOverride): void {
    this._play("move", override);
  }

  /**
   * @description
   * Core play dispatch used by playTyping, playDelete and playMove
   *
   * @param channel - Which channel to play
   * @param override - Optional per-command override
   */
  private _play(channel: TAudioChannel, override?: TAudioCommandOverride): void {
    if (this._options.enabled === false) {
      return;
    }

    if (override === false) {
      return;
    }

    const pool = this._resolveSamples(channel, override);

    if (pool.samples.length === 0) {
      return;
    }

    const channelOpts = this._resolveChannelOpts(channel);
    const state = this._channels[channel];
    const sample = this._pickSample(pool, channelOpts, state);

    state.lastPlayed = sample;

    const masterVolume = this._options.volume ?? 1;
    const commandVolume = override !== undefined ? (override as Exclude<TAudioCommandOverride, false>).volume : undefined;
    let volume = masterVolume * (commandVolume ?? 1);

    if (channelOpts.volumeJitter !== undefined) {
      const { min, max } = channelOpts.volumeJitter;

      volume *= min + Math.random() * (max - min);
    }

    volume = Math.max(0, Math.min(1, volume));

    let playbackRate = 1;

    if (channelOpts.playbackRateJitter !== undefined) {
      const { min, max } = channelOpts.playbackRateJitter;

      playbackRate = min + Math.random() * (max - min);
      playbackRate = Math.max(Number.EPSILON, playbackRate);
    }

    this._emit(sample, volume, playbackRate, channelOpts.overlap ?? true, state);
  }

  /**
   * @description
   * Resolve the effective options of a channel.
   * Pitch and volume variance start from the channel's defaults. The delete and move
   * channels inherit typing's sample selection (sfx, strategy, overlap) unless they set
   * their own. The channel's own options always win.
   *
   * @param channel - The channel name
   * @returns The resolved channel options
   */
  private _resolveChannelOpts(channel: TAudioChannel): TAudioChannelOptions {
    // Typing's own options are spread last for the typing channel, so inheriting is harmless there.
    return { ...defaultChannelVariance(channel), ...pickSelection(this._options.typing), ...this._options[channel] };
  }

  /**
   * @description
   * Collect the flat list of sample URLs to draw from for a given channel,
   * applying any per-command sfx override.
   *
   * @param channel - The channel being played
   * @param override - Optional command override (never `false` at this point)
   * @returns The sample pool and the key identifying it
   */
  private _resolveSamples(channel: TAudioChannel, override?: Exclude<TAudioCommandOverride, false>): TSamplePool {
    const sfxs = this._options.sfxs ?? getLoadedDefaultSfxPack() ?? {};
    const channelOpts = this._resolveChannelOpts(channel);

    let sfxNames: readonly string[];

    if (override?.sfxs !== undefined && override.sfxs.length > 0) {
      sfxNames = override.sfxs;
    }
    else if (override?.sfx !== undefined) {
      sfxNames = [override.sfx];
    }
    else if (channelOpts.sfxs !== undefined && channelOpts.sfxs.length > 0) {
      sfxNames = channelOpts.sfxs;
    }
    else if (channelOpts.sfx !== undefined) {
      sfxNames = [channelOpts.sfx];
    }
    else {
      sfxNames = Object.keys(sfxs);
    }

    const samples: string[] = [];

    for (const name of sfxNames) {
      const sfx = sfxs[name];

      if (sfx !== undefined) {
        samples.push(...sfx.samples);
      }
    }

    return { key: sfxNames.join("\n"), samples };
  }

  /**
   * @description
   * Pick the next sample URL from the pool using the configured strategy
   *
   * @param pool - The sample pool to pick from
   * @param channelOpts - The channel configuration
   * @param state - The mutable channel state (pool selection state and last-played sample)
   * @returns The selected sample URL
   */
  private _pickSample(
    pool: TSamplePool,
    channelOpts: TAudioChannelOptions,
    state: TChannelState,
  ): string {
    const samples = pool.samples;
    const avoidRepeat = channelOpts.avoidImmediateRepeat ?? true;

    // Shuffle-bag is the default strategy.
    switch (channelOpts.strategy) {
      case EAudioStrategy.ROUND_ROBIN:
        return getPoolState(state, pool.key).roundRobin.next(samples);

      case EAudioStrategy.RANDOM:
        return pickRandom(samples, state.lastPlayed, avoidRepeat);

      default:
        return getPoolState(state, pool.key).bag.next(samples, avoidRepeat);
    }
  }

  /**
   * @description
   * Emit audio for the given sample. No-ops gracefully in non-browser environments,
   * where `Audio` does not exist, or when the browser blocks autoplay.
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
        state.currentAudio = audio;
      }

      audio.volume = volume;
      // Let the rate change the pitch too, which is what makes the channels sound distinct.
      audio.preservesPitch = false;
      audio.playbackRate = playbackRate;

      // Autoplay policy rejects play() until the user interacts with the page.
      audio.play().catch(() => {});
    }
    catch {
      // Swallow synchronous errors: `Audio` missing outside browsers, unsupported sources
    }
  }
}
