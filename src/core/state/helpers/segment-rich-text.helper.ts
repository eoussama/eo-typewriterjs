import type { TRichTextDocument, TStyleObject, TStyleRef } from "../types/rich-text-document.type";
import type { TRichTextSegment } from "../types/rich-text-segment.type";



/**
 * @description
 * Resolve a TStyleRef to a TStyleObject, normalising string shorthand to className
 *
 * @param ref - The style reference to resolve
 * @returns A TStyleObject
 */
export function resolveStyleRef(ref: TStyleRef): TStyleObject {
  if (typeof ref === "string") {
    return { className: ref };
  }

  return ref;
}

/**
 * @description
 * Merge an ordered array of TStyleRef values into a single TStyleObject.
 * Later entries take precedence over earlier ones for conflicting keys.
 *
 * @param styles - An ordered array of style references to merge
 * @returns A single merged TStyleObject
 */
export function mergeStyles(styles: readonly TStyleRef[]): TStyleObject {
  const merged: { -readonly [K in keyof TStyleObject]: TStyleObject[K] } = {};

  for (const ref of styles) {
    const { className, attrs, css, ansi, meta } = resolveStyleRef(ref);

    if (className !== undefined) {
      merged.className = className;
    }

    if (attrs !== undefined) {
      merged.attrs = { ...merged.attrs, ...attrs };
    }

    if (css !== undefined) {
      merged.css = { ...merged.css, ...css };
    }

    if (ansi !== undefined) {
      merged.ansi = { ...merged.ansi, ...ansi };
    }

    if (meta !== undefined) {
      merged.meta = { ...merged.meta, ...meta };
    }
  }

  return merged;
}

/**
 * @description
 * Segment a rich-text document into non-overlapping runs based on its styles.
 * Each segment carries the stack of active TStyleRef values that cover it.
 * Segments with no active styles are included with an empty styles array.
 *
 * @param document - The rich-text document to segment
 * @returns An ordered array of TRichTextSegment values covering the full text
 */
export function segmentRichText(document: TRichTextDocument): TRichTextSegment[] {
  const { text, styles } = document;

  if (text.length === 0) {
    return [];
  }

  const clamp = (point: number): number => Math.max(0, Math.min(text.length, point));
  const boundarySet = new Set<number>([0, text.length]);

  for (const entry of styles) {
    boundarySet.add(clamp(entry.from));
    boundarySet.add(clamp(entry.to));
  }

  const boundaries = [...boundarySet].sort((a, b) => a - b);
  const segments: TRichTextSegment[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    // Boundaries are unique and sorted, so every segment is non-empty.
    const from = boundaries[i]!;
    const to = boundaries[i + 1]!;
    const activeStyles: TStyleRef[] = [];

    for (const entry of styles) {
      if (entry.from <= from && entry.to >= to) {
        activeStyles.push(entry.style);
      }
    }

    segments.push({
      text: text.slice(from, to),
      from,
      to,
      styles: activeStyles,
    });
  }

  return segments;
}
