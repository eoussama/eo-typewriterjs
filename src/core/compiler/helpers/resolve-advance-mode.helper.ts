import type { TAdvanceMode, TAdvanceModeInput } from "../../commands/types/type-command.type";

import { invariant } from "@eoussama/core";
import { MOTION_ADVANCE_UNITS, TYPE_ADVANCE_UNITS } from "../consts/compiler.const";



/**
 * @description
 * Normalize a TAdvanceModeInput into a canonical TAdvanceMode, validating the unit
 * against the allowed set and the amount as a positive integer.
 *
 * @param input - The raw input from the user
 * @param units - The set of units valid for the command
 * @param unitError - Builds the error message for an unknown unit
 * @returns A fully resolved TAdvanceMode
 */
function resolveAdvanceMode(
  input: TAdvanceModeInput | undefined,
  units: ReadonlySet<string>,
  unitError: (unit: string) => string,
): TAdvanceMode {
  if (input === undefined) {
    return { unit: "char", amount: 1 };
  }

  const unit = typeof input === "string" ? input : input.unit;

  invariant(units.has(unit), () => unitError(unit));

  if (typeof input === "string") {
    return { unit: input, amount: 1 };
  }

  invariant(
    Number.isInteger(input.amount) && input.amount > 0,
    () => `Invalid advance amount: ${input.amount}. The amount must be a positive integer.`,
  );

  return { unit: input.unit, amount: input.amount };
}

/**
 * @description
 * Normalize a TAdvanceModeInput into a canonical TAdvanceMode for type commands.
 * Validates the unit against the full set of advance units including "whole".
 *
 * @param input - The raw input from the user
 * @returns A fully resolved TAdvanceMode
 */
export function resolveTypeAdvanceMode(input: TAdvanceModeInput | undefined): TAdvanceMode {
  return resolveAdvanceMode(
    input,
    TYPE_ADVANCE_UNITS,
    unit => `Unknown advance unit: "${unit}". Valid units are: char, grapheme, word, line, whole.`,
  );
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
  return resolveAdvanceMode(
    input,
    MOTION_ADVANCE_UNITS,
    unit => `Unknown advance unit: "${unit}". Valid units for ${commandName} are: char, grapheme, word, line.`,
  );
}
