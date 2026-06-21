import type { TAudioStrategy } from "../enums/audio-strategy.enum";



/**
 * @description
 * Configuration for a single audio channel (typing or delete)
 */
export type TAudioChannelOptions = {
  /**
   * @description
   * Name of the default voice to use from the voice pack.
   * When not set, the first voice in the pack is used.
   */
  readonly voice?: string;

  /**
   * @description
   * Restrict sample selection to this subset of voice names.
   * When set, only the listed voices are eligible for this channel.
   * Overrides `voice` when both are present.
   */
  readonly voices?: readonly string[];

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
   * Optional playback-rate jitter applied to each sample for extra variance.
   * Both `min` and `max` must be positive. Example: `{ min: 0.9, max: 1.1 }`.
   * When omitted, no jitter is applied.
   */
  readonly playbackRateJitter?: {
    readonly min: number;
    readonly max: number;
  };

  /**
   * @description
   * Optional per-play volume jitter relative to the resolved channel volume.
   * Range [0, 1] for both `min` and `max`. Example: `{ min: 0.8, max: 1.0 }`.
   * When omitted, no jitter is applied.
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
