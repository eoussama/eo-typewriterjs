import type { TStyleRef } from "../state/rich-text-document.type";

import type { TBaseCommand } from "./base-command.type";
import type { ECommandKind } from "./command-kind.enum";



/**
 * @description
 * The unit of text advance when typing
 */
export type TAdvanceUnit = "char" | "grapheme" | "word" | "line" | "custom";

/**
 * @description
 * Explicit advance mode specifying unit and amount per step
 */
export type TAdvanceMode = {
  readonly unit: TAdvanceUnit;
  readonly amount: number;
};

/**
 * @description
 * Public input for advance mode — either a shorthand string or an explicit object
 */
export type TAdvanceModeInput = TAdvanceUnit | TAdvanceMode;

/**
 * @description
 * Selects which cursor the command targets.
 * For phase one only a single "main" cursor is supported.
 */
export type TCursorSelector = string;

/**
 * @description
 * A command representing the user's intent to type text into the document
 */
export type TTypeCommand = TBaseCommand & {
  readonly kind: typeof ECommandKind.TYPE;
  readonly cursor: TCursorSelector;
  readonly text: string;
  readonly by?: TAdvanceModeInput;
  readonly interval?: number;
  readonly style?: TStyleRef;
};
