import type { TAdvanceUnit } from "../../commands/types/type-command.type";

import { graphemesLengthAfter, graphemesLengthBefore, segmentText } from "../../stepping/helpers/segment-text.helper";



/**
 * @description
 * Compute the index reached by advancing a signed number of units from `startIndex`.
 * Positive counts move right, negative counts move left; the result is clamped to the text.
 * Character and grapheme steps always land on grapheme cluster boundaries.
 *
 * @param text - The document text
 * @param startIndex - The index to advance from
 * @param count - Signed number of units to advance
 * @param unit - The unit to advance by
 * @returns The resolved index in [0, text.length]
 */
export function advanceIndex(text: string, startIndex: number, count: number, unit: TAdvanceUnit): number {
  const start = Math.max(0, Math.min(text.length, startIndex));

  // Stryker disable next-line ConditionalExpression,LogicalOperator,StringLiteral,BlockStatement: the general path below gives the same result, only slower.
  if (unit === "char" || unit === "grapheme") {
    return count > 0
      ? start + graphemesLengthAfter(text, start, count)
      : start - graphemesLengthBefore(text, start, -count);
  }

  if (count > 0) {
    const segments = segmentText(text.slice(start), unit);

    return start + segments.slice(0, count).join("").length;
  }

  const segments = segmentText(text.slice(0, start), unit);

  return start - segments.slice(Math.max(0, segments.length + count)).join("").length;
}
