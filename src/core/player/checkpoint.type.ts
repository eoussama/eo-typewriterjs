import type { TTypewriterState } from "../state/typewriter-state.type";



/**
 * @description
 * A snapshot of the typewriter state at a specific point in the compiled event list.
 * Used for fast random-access seeking without replaying from the beginning every time.
 *
 * `eventIndex` is the index of the first event that has NOT yet been applied -
 * i.e. reducing from this state starting at `eventIndex` will reproduce any later time.
 */
export type TCheckpoint = {
  readonly time: number;
  readonly eventIndex: number;
  readonly state: TTypewriterState;
};
