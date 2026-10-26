import type { TAudioChannelOptions } from "./audio-channel-options.type";
import type { TAudioSfxPack } from "./audio-sfx.type";



/**
 * @description
 * Root typewriter-level audio configuration
 */
export type TAudioOptions = {
  /**
   * @description
   * Whether audio is globally enabled.
   * Defaults to `true`.
   */
  readonly enabled?: boolean;

  /**
   * @description
   * Master volume in the range [0, 1].
   * Applied to every channel before per-play jitter.
   * Defaults to `1`.
   */
  readonly volume?: number;

  /**
   * @description
   * Sfx pack used by all channels.
   * Each key is an sfx name; each value holds one or more audio sample URLs.
   * Defaults to the built-in typing sounds when not provided.
   */
  readonly sfxs?: TAudioSfxPack;

  /**
   * @description
   * Options for the typing (insert) audio channel
   */
  readonly typing?: TAudioChannelOptions;

  /**
   * @description
   * Options for the delete audio channel.
   * Deletions reuse the typing channel's sample selection, pitched lower by default.
   */
  readonly delete?: TAudioChannelOptions;

  /**
   * @description
   * Options for the cursor move audio channel.
   * Moves reuse the typing channel's sample selection as a lighter, quieter tick by default.
   */
  readonly move?: TAudioChannelOptions;
};
