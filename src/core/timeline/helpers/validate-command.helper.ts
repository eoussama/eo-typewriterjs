import type { TStyleRange } from "../../commands/types/style-command.type";

import { invariant } from "@eoussama/core";



/**
 * @description
 * Assert that a duration or interval is a finite, non-negative number of milliseconds
 *
 * @param value - The value to check
 * @param name - The option name used in the error message
 */
export function assertDuration(value: number | undefined, name: string): void {
  invariant(
    value === undefined || (Number.isFinite(value) && value >= 0),
    () => `Invalid ${name}: ${value}. It must be a finite number of milliseconds, 0 or greater.`,
  );
}

/**
 * @description
 * Assert that a numeric count operand is an integer.
 * String boundary operands are validated by the compiler.
 *
 * @param value - The operand to check
 * @param name - The operand name used in the error message
 */
export function assertCount(value: number | string, name: string): void {
  invariant(
    typeof value === "string" || Number.isInteger(value),
    () => `Invalid ${name}: ${value}. It must be an integer.`,
  );
}

/**
 * @description
 * Assert that a fixed style range has integer bounds with `0 <= from <= to`
 *
 * @param range - The range to check, or "selection"
 */
export function assertStyleRange(range: TStyleRange | "selection"): void {
  invariant(
    range === "selection" || (Number.isInteger(range.from) && Number.isInteger(range.to) && range.from >= 0 && range.from <= range.to),
    () => `Invalid style range. Expected "selection" or integer bounds with 0 <= from <= to.`,
  );
}
