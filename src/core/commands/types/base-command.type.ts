import type { TAudioCommandOverride } from "../../audio/types/audio-command-override.type";

import type { TCommandKind } from "../enums/command-kind.enum";
import type { TCallbackHook } from "./callback-hook.type";



/**
 * @description
 * Shared fields present on every command in the timeline
 */
export type TBaseCommand = {
  readonly id: string;
  readonly kind: TCommandKind;

  /**
   * @description
   * Optional hook invoked before each step of the command,
   * or once for instant commands (move, select, style, wait, call)
   */
  readonly before?: TCallbackHook;

  /**
   * @description
   * Optional hook invoked after each step of the command,
   * or once for instant commands (move, select, style, wait, call)
   */
  readonly after?: TCallbackHook;

  /**
   * @description
   * Per-command audio override.
   * Set to `false` to silence sounds for this command.
   * Set to an object to use a specific sfx, sfxs subset, or volume.
   * When omitted, the typewriter-level audio defaults apply.
   */
  readonly audio?: TAudioCommandOverride;

};
