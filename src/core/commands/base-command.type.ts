import type { TAudioCommandOverride } from "../audio/audio-command-override.type";
import type { TCallbackHook } from "./callback-hook.type";
import type { TCommandKind } from "./command-kind.enum";



/**
 * @description
 * Shared fields present on every command in the timeline
 */
export type TBaseCommand = {
  readonly id: string;
  readonly kind: TCommandKind;

  /**
   * @description
   * Optional hook invoked before the command (or before each step when `unit` is provided)
   */
  readonly before?: TCallbackHook;

  /**
   * @description
   * Optional hook invoked after the command (or after each step when `unit` is provided)
   */
  readonly after?: TCallbackHook;

  /**
   * @description
   * Per-command audio override.
   * Set to `false` to silence sounds for this command.
   * Set to an object to use a specific voice, voices subset, or volume.
   * When omitted, the typewriter-level audio defaults apply.
   */
  readonly audio?: TAudioCommandOverride;

};
