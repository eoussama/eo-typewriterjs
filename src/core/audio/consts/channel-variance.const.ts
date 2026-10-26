import type { TAudioChannelOptions } from "../types/audio-channel-options.type";
import type { TAudioChannel } from "../types/audio-channel.type";



/**
 * @description
 * Default pitch and volume variance of each channel. All channels share the same
 * samples; varying the playback rate (and with it the pitch) makes them sound distinct:
 * typing is natural, deleting is lower and heavier, moving is a light, quiet tick.
 * A channel's own `playbackRateJitter` or `volumeJitter` replaces these defaults.
 */
export const DEFAULT_CHANNEL_VARIANCE: Readonly<Record<TAudioChannel, Pick<TAudioChannelOptions, "playbackRateJitter" | "volumeJitter">>> = {
  typing: {
    playbackRateJitter: { min: 0.92, max: 1.08 },
    volumeJitter: { min: 0.85, max: 1 },
  },
  delete: {
    playbackRateJitter: { min: 0.72, max: 0.82 },
    volumeJitter: { min: 0.8, max: 0.95 },
  },
  move: {
    playbackRateJitter: { min: 1.3, max: 1.45 },
    volumeJitter: { min: 0.4, max: 0.55 },
  },
};
