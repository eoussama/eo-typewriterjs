import type { TTypewriterState } from "../../state/types/typewriter-state.type";



/**
 * @description
 * A snapshot of the typewriter state at a specific point in the compiled step list.
 * Used for fast random-access seeking without replaying from the beginning every time.
 *
 * `eventIndex` is the index of the first playback step that has NOT yet been applied -
 * i.e. applying steps from `eventIndex` onwards reproduces any later time.
 *
 * @deprecated Checkpoints are internal to the playback controller and no API returns them.
 * This type will be removed in the next major version.
 */
export type TCheckpoint = {
  readonly time: number;
  readonly eventIndex: number;
  readonly state: TTypewriterState;
};
