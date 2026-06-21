import type { TTypewriterState } from "../state/typewriter-state.type";
import type { TAdvanceUnit } from "./type-command.type";



/**
 * @description
 * Context object passed to every before/after callback invocation
 */
export type TCallbackContext = {
  /**
   * @description
   * The current typewriter document state at the time of invocation
   */
  readonly state: TTypewriterState;

  /**
   * @description
   * The logical step index within the command (0-based)
   */
  readonly stepIndex: number;

  /**
   * @description
   * Total number of steps for this command
   */
  readonly stepCount: number;

  /**
   * @description
   * The advance unit for the current step, or null for instant commands
   */
  readonly unit: TAdvanceUnit | null;

  /**
   * @description
   * AbortSignal that is aborted when playback is cancelled
   */
  readonly signal: AbortSignal;
};

/**
 * @description
 * Callback function signature - may return a promise for async support
 */
export type TCallbackFn = (context: TCallbackContext) => void | Promise<void>;

/**
 * @description
 * A before/after lifecycle hook attached to a command.
 * The function fires once per command step for segmented commands (type, delete),
 * or once for instant commands (move, select, style, wait, call).
 */
export type TCallbackHook = TCallbackFn;
