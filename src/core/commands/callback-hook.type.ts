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
   * The logical step index within the command (0-based).
   * For whole-command hooks this is always 0.
   */
  readonly stepIndex: number;

  /**
   * @description
   * Total number of steps for this command.
   * For whole-command hooks this is always 1.
   */
  readonly stepCount: number;

  /**
   * @description
   * The advance unit used for per-unit hooks, or null for whole-command hooks
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
 * Callback function signature — may return a promise for async support
 */
export type TCallbackFn = (context: TCallbackContext) => void | Promise<void>;

/**
 * @description
 * A before/after lifecycle hook attached to a command.
 * - `callback` — the function to invoke
 * - `unit` — when provided, the hook fires once per generated step of this unit type.
 *   When omitted the hook fires once for the entire command.
 *
 * For commands that do not naturally segment (move, select, style, wait, call),
 * a provided `unit` is ignored and the hook fires once for the whole command.
 */
export type TCallbackHook = {
  readonly callback: TCallbackFn;
  readonly unit?: TAdvanceUnit;
};
