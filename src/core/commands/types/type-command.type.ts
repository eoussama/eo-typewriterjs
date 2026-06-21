import type { TStyleRef } from "../../state/types/rich-text-document.type";

import type { ECommandKind } from "../enums/command-kind.enum";
import type { TBaseCommand } from "./base-command.type";



/**
 * @description
 * The unit of text advance when typing
 */
export type TAdvanceUnit = "char" | "grapheme" | "word" | "line" | "whole";

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
 * Public input for advance mode - either a shorthand string or an explicit object
 */
export type TAdvanceModeInput = TAdvanceUnit | TAdvanceMode;

/**
 * @description
 * Selects which cursor or cursors the command targets.
 * Pass a single string id or an array of ids to target multiple cursors simultaneously.
 * When an array is given the command is applied to each cursor in parallel -
 * the timeline clock advances only once.
 */
export type TCursorSelector = string | readonly string[];

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
