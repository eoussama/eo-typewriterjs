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
} as const;

export type TPlaybackStatus = (typeof EPlaybackStatus)[keyof typeof EPlaybackStatus];
