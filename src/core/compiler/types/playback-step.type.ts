import type { TAudioChannel } from "../../audio/types/audio-channel.type";
import type { TAdvanceUnit } from "../../commands/types/type-command.type";
import type { TTimelineEvent } from "../../events/types/timeline-event.type";
import type { TCommand } from "./command.type";



/**
 * @description
 * The audio cue played when a step changes the document or moves a cursor
 */
export type TPlaybackSound = TAudioChannel;

/**
 * @description
 * One scheduled unit of playback. A step runs at `time` and, in order:
 * fires the command's `before` hook, invokes the call callback, applies `events`
 * and renders, plays its sound, then fires the command's `after` hook.
 *
 * Segmented commands (type, delete, move, select) produce one step per unit step;
 * `wait` produces a start step (`before`) and an end step (`after`); every other
 * command produces a single step.
 */
export type TPlaybackStep = {
  readonly time: number;
  readonly command: TCommand;
  readonly stepIndex: number;
  readonly stepCount: number;
  readonly unit: TAdvanceUnit | null;
  readonly events: readonly TTimelineEvent[];
  readonly before: boolean;
  readonly after: boolean;
  readonly call: boolean;
  readonly sound: TPlaybackSound | null;
};

/**
 * @description
 * A compiled timeline ready for playback
 */
export type TPlaybackProgram = {
  readonly steps: readonly TPlaybackStep[];
  readonly duration: number;
};
