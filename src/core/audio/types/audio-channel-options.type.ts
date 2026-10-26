import type { TAudioStrategy } from "../enums/audio-strategy.enum";



/**
 * @description
 * Configuration for a single audio channel (typing, delete or move)
 */
export type TAudioChannelOptions = {
  /**
   * @description
   * Name of the default sfx to use from the sfx pack.
   * When neither `sfx` nor `sfxs` is set, samples are drawn from every sfx in the pack.
   */
  readonly sfx?: string;

  /**
   * @description
   * Restrict sample selection to this subset of sfx names.
   * When set, only the listed sfxs are eligible for this channel.
   * Overrides `sfx` when both are present.
   */
  readonly sfxs?: readonly string[];

  /**
   * @description
   * Sample selection strategy.
   * Defaults to `"shuffleBag"` for natural variance without repetitive streaks.
   */
  readonly strategy?: TAudioStrategy;

  /**
   * @description
   * When true, the manager will never play the same sample twice in a row.
   * Only meaningful for the `"random"` strategy; shuffle-bag already handles this structurally.
   * Defaults to `true`.
   */
  readonly avoidImmediateRepeat?: boolean;

  /**
   * @description
   * Playback-rate jitter applied to each sample. The rate also shifts the pitch.
   * Both `min` and `max` must be positive. Example: `{ min: 0.9, max: 1.1 }`.
   * Defaults to a channel-specific range: around 1 for typing, lower for delete,
   * higher for move.
   */
  readonly playbackRateJitter?: {
    readonly min: number;
    readonly max: number;
  };

  /**
   * @description
   * Per-play volume factor relative to the resolved channel volume.
   * Range [0, 1] for both `min` and `max`. Example: `{ min: 0.8, max: 1.0 }`.
   * Defaults to a channel-specific range; moves are quieter than typing.
   */
  readonly volumeJitter?: {
    readonly min: number;
    readonly max: number;
  };

  /**
   * @description
   * When true, a new audio element is cloned for every play call so rapid
   * typing does not cut off the previous sound.
   * When false, the previous sound is interrupted.
   * Defaults to `true`.
   */
  readonly overlap?: boolean;
};
