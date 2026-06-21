import type { TAudioCommandOverride } from "../../audio/types/audio-command-override.type";
import type { TCallbackHook } from "../../commands/types/callback-hook.type";
import type { TAdvanceModeInput, TCursorSelector } from "../../commands/types/type-command.type";
import type { TStyleRef } from "../../state/types/rich-text-document.type";



/**
 * @description
 * Shared lifecycle hook and runtime override options available on all builder methods
 */
export type TCommandHookOptions = {
  readonly before?: TCallbackHook;
  readonly after?: TCallbackHook;
  readonly audio?: TAudioCommandOverride;
};

/**
 * @description
 * Options accepted by the `select` builder method
 */
export type TSelectOptions = TCommandHookOptions & {
  readonly by?: TAdvanceModeInput;
  readonly interval?: number;
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `delete` builder method
 */
export type TDeleteOptions = TCommandHookOptions & {
  readonly by?: TAdvanceModeInput;
  readonly interval?: number;
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `move` builder method
 */
export type TMoveOptions = TCommandHookOptions & {
  readonly by?: TAdvanceModeInput;
  readonly interval?: number;
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `type` builder method
 */
export type TTypeOptions = TCommandHookOptions & {
  readonly by?: TAdvanceModeInput;
  readonly interval?: number;
  readonly style?: TStyleRef;
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `style` builder method
 */
export type TStyleOptions = TCommandHookOptions & {
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `unselect` builder method
 */
export type TUnselectOptions = TCommandHookOptions & {
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `unstyle` builder method
 */
export type TUnstyleOptions = TCommandHookOptions & {
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `wait` builder method
 */
export type TWaitOptions = TCommandHookOptions;
