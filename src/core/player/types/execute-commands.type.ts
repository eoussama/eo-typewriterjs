import type { AudioManagerHelper } from "../../audio/helpers/audio-manager.helper";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";



/**
 * @description
 * Options passed to the command executor
 */
export type TExecuteCommandsOptions = {
  readonly signal: AbortSignal;
  readonly getRate: () => number;
  readonly getLiveState?: () => TTypewriterState;
  readonly getAudioManager?: () => AudioManagerHelper | null;
};

/**
 * @description
 * Result returned by executeCommands
 */
export type TExecuteCommandsResult = {
  readonly state: TTypewriterState;
  readonly nextCommandIndex: number;
};
