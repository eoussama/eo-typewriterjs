import type { TAudioCommandOverride } from "../audio/audio-command-override.type";

import type { TBaseCommand } from "./base-command.type";
import type { TAdvanceModeInput, TCursorSelector } from "./type-command.type";



/**
 * @description
 * A command representing the user's intent to delete text from the document.
 * Deletion is backward from the cursor position.
 */
export type TDeleteCommand = TBaseCommand & {
  readonly cursor: TCursorSelector;
  readonly count: number;
  readonly by?: TAdvanceModeInput;
  readonly interval?: number;

  /**
   * @description
   * Per-command audio override.
   * Set to `false` to silence this command's delete sounds.
   * Set to an object to use a specific voice, voices subset, or volume.
   * When omitted, the typewriter-level audio defaults apply.
   */
  readonly audio?: TAudioCommandOverride;
};
