import type { TValueOf } from "@eoussama/core";



/**
 * @description
 * The possible playback statuses for a typewriter controller
 */
export const EPlaybackStatus = {
  IDLE: "idle",
  PLAYING: "playing",
  PAUSED: "paused",
  STOPPED: "stopped",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type TPlaybackStatus = TValueOf<typeof EPlaybackStatus>;
