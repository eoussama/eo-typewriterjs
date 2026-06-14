import type { TAdvanceUnit } from "../commands/type-command.type";



/**
 * @description
 * Segment text into grapheme clusters using Intl.Segmenter when available,
 * falling back to Array.from for basic Unicode code point splitting
 *
 * @param text - The text to segment
 * @returns An array of grapheme cluster strings
 */
function segmentGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

    return Array.from(segmenter.segment(text), s => s.segment);
  }

  /* v8 ignore next */
  return Array.from(text);
}

/**
 * @description
 * Segment text into words using Intl.Segmenter when available.
 * Trailing whitespace is attached to the preceding word token.
 * Falls back to a basic regex split when Intl.Segmenter is unavailable.
 *
 * @param text - The text to segment into words
 * @returns An array of word-with-trailing-space strings
 */
function segmentWords(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    const rawSegments = Array.from(segmenter.segment(text), s => s.segment);
    const result: string[] = [];

    for (const segment of rawSegments) {
      const isSpace = segment.trim() === "";

      if (isSpace && result.length > 0) {
        result[result.length - 1] += segment;
      }
      else {
        result.push(segment);
      }
    }

    return result;
  }

  /* v8 ignore start */
  // Fallback: split on word boundaries, re-attach trailing spaces
  const parts = text.split(/(\s+)/);
  const result: string[] = [];

  for (const part of parts) {
    if (part === "") {
      continue;
    }

    const isSpace = part.trim() === "";

    if (isSpace && result.length > 0) {
      result[result.length - 1] += part;
    }
    else {
      result.push(part);
    }
  }

  return result;
  /* v8 ignore stop */
}

/**
 * @description
 * Segment text into an array of step tokens based on the given advance unit.
 * "char" and "grapheme" both use grapheme cluster segmentation.
 * "word" attaches trailing whitespace to the preceding word.
 * "line" splits on newline characters.
 *
 * @param text - The source text to segment
 * @param unit - The advance unit controlling how text is split
 * @returns An ordered array of step token strings
 */
export function segmentText(text: string, unit: TAdvanceUnit): string[] {
  switch (unit) {
    case "char":
      return segmentGraphemes(text);

    case "grapheme":
      return segmentGraphemes(text);

    case "word":
      return segmentWords(text);

    case "line":
      return text.split("\n").map((line, i, arr) => (i < arr.length - 1 ? `${line}\n` : line)).filter(line => line !== "");

    case "custom":
      return [text];

    /* v8 ignore next */
    default:
      return segmentGraphemes(text);
  }
}
