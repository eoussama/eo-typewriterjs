import type { TAdvanceMode, TAdvanceModeInput } from "../../commands/types/type-command.type";

import { MOTION_ADVANCE_UNITS, TYPE_ADVANCE_UNITS } from "../consts/compiler.const";



/**
 * @description
 * Normalize a TAdvanceModeInput into a canonical TAdvanceMode for type commands.
 * Validates the unit against the full set of advance units including "whole".
 *
 * @param input - The raw input from the user
 * @returns A fully resolved TAdvanceMode
 */
export function resolveTypeAdvanceMode(input: TAdvanceModeInput | undefined): TAdvanceMode {
  if (input === undefined) {
    return { unit: "char", amount: 1 };
  }

  const unit = typeof input === "string" ? input : input.unit;

  if (!TYPE_ADVANCE_UNITS.has(unit)) {
    throw new Error(`Unknown advance unit: "${unit}". Valid units are: char, grapheme, word, line, whole.`);
  }

  if (typeof input === "string") {
    return { unit: input, amount: 1 };
  }

  return { unit: input.unit, amount: input.amount };
}

/**
 * @description
 * Normalize a TAdvanceModeInput into a canonical TAdvanceMode for motion commands
 * (delete, move, select). Validates against the motion unit set which excludes "whole".
 *
 * @param input - The raw input from the user
 * @param commandName - The command name used in the error message
 * @returns A fully resolved TAdvanceMode
 */
export function resolveMotionAdvanceMode(input: TAdvanceModeInput | undefined, commandName: string): TAdvanceMode {
  if (input === undefined) {
    return { unit: "char", amount: 1 };
  }

  const unit = typeof input === "string" ? input : input.unit;

  if (!MOTION_ADVANCE_UNITS.has(unit)) {
    throw new Error(`Unknown advance unit: "${unit}". Valid units for ${commandName} are: char, grapheme, word, line.`);
  }

  if (typeof input === "string") {
    return { unit: input, amount: 1 };
  }

  return { unit: input.unit, amount: input.amount };
}
