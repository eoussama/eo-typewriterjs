import type { TAdvanceUnit } from "../../commands/types/type-command.type";



/**
 * @description
 * Lazily created segmenters, shared by every call; creating an Intl.Segmenter is costly
 */
let graphemeSegmenter: Intl.Segmenter | undefined;
let wordSegmenter: Intl.Segmenter | undefined;

/**
 * @description
 * Number of UTF-16 code units inspected per grapheme when scanning a window of text.
 * Most clusters are far shorter; the window grows when it turns out to be too small.
 */
const GRAPHEME_WINDOW = 16;

/**
 * @description
 * Segment text into grapheme clusters
 *
 * @param text - The text to segment
 * @returns An array of grapheme cluster strings
 */
function segmentGraphemes(text: string): string[] {
  graphemeSegmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });

  return Array.from(graphemeSegmenter.segment(text), s => s.segment);
}

/**
 * @description
 * Segment text into words.
 * Whitespace and punctuation are attached to the preceding word, so `"Hello, world!"`
 * becomes `["Hello, ", "world!"]`. Leading punctuation is attached to the first word.
 *
 * @param text - The text to segment into words
 * @returns An array of word tokens with their trailing whitespace and punctuation
 */
function segmentWords(text: string): string[] {
  wordSegmenter ??= new Intl.Segmenter(undefined, { granularity: "word" });

  const result: string[] = [];
  let prefix = "";

  for (const { segment, isWordLike } of wordSegmenter.segment(text)) {
    if (isWordLike === true) {
      result.push(prefix + segment);
      prefix = "";
    }
    else if (result.length > 0) {
      result[result.length - 1] += segment;
    }
    else {
      prefix += segment;
    }
  }

  if (prefix !== "") {
    result.push(prefix);
  }

  return result;
}

/**
 * @description
 * Measure the UTF-16 length of the last `count` grapheme clusters ending at `end`.
 * Only a window of text before `end` is segmented, so the cost does not grow with the document.
 *
 * @param text - The document text
 * @param end - The exclusive end index to measure back from
 * @param count - The number of grapheme clusters to measure
 * @returns The length of the measured clusters, at most `end`
 */
export function graphemesLengthBefore(text: string, end: number, count: number): number {
  if (count <= 0) {
    return 0;
  }

  let window = count * GRAPHEME_WINDOW;

  for (;;) {
    const start = Math.max(0, end - window);
    const graphemes = segmentGraphemes(text.slice(start, end));

    // The first cluster may be cut by the window start, so it only counts once the window reaches 0.
    if (start === 0 || graphemes.length > count) {
      return graphemes.slice(Math.max(0, graphemes.length - count)).join("").length;
    }

    window *= 2;
  }
}

/**
 * @description
 * Measure the UTF-16 length of the first `count` grapheme clusters starting at `start`.
 * Only a window of text after `start` is segmented, so the cost does not grow with the document.
 *
 * @param text - The document text
 * @param start - The index to measure forward from
 * @param count - The number of grapheme clusters to measure
 * @returns The length of the measured clusters, at most `text.length - start`
 */
export function graphemesLengthAfter(text: string, start: number, count: number): number {
  if (count <= 0) {
    return 0;
  }

  let window = count * GRAPHEME_WINDOW;

  for (;;) {
    const end = Math.min(text.length, start + window);
    const graphemes = segmentGraphemes(text.slice(start, end));

    // The last cluster may be cut by the window end, so it only counts once the window reaches the end.
    if (end === text.length || graphemes.length > count) {
      return graphemes.slice(0, count).join("").length;
    }

    window *= 2;
  }
}

/**
 * @description
 * Segment text into an array of step tokens based on the given advance unit.
 * "char" and "grapheme" both use grapheme cluster segmentation.
 * "word" attaches trailing whitespace and punctuation to the preceding word.
 * "line" splits after newline characters.
 *
 * @param text - The source text to segment
 * @param unit - The advance unit controlling how text is split
 * @returns An ordered array of step token strings
 */
export function segmentText(text: string, unit: TAdvanceUnit): string[] {
  switch (unit) {
    case "char":

    case "grapheme":
      return segmentGraphemes(text);

    case "word":
      return segmentWords(text);

    case "line":
      return text.split("\n").map((line, i, arr) => (i < arr.length - 1 ? `${line}\n` : line)).filter(line => line !== "");

    case "whole":
      return [text];

    default:
      throw new Error(`Unknown advance unit: "${unit as string}". Valid units are: char, grapheme, word, line, whole.`);
  }
}
