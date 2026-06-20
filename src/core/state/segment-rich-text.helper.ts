import type { TRichTextDocument, TStyleObject, TStyleRef, TTextStyle } from "./rich-text-document.type";



/**
 * @description
 * A contiguous segment of document text with its merged style stack applied.
 * Styles are merged in style order so later styles override earlier ones for
 * conflicting keys. Segments with no active styles have an empty styles array.
 */
export type TRichTextSegment = {
  readonly text: string;
  readonly from: number;
  readonly to: number;
  readonly styles: readonly TStyleRef[];
};

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
  let merged: TStyleObject = {};

  for (const ref of styles) {
    const resolved = resolveStyleRef(ref);

    merged = {
      className: resolved.className ?? merged.className,
      attrs: resolved.attrs !== undefined ? { ...merged.attrs, ...resolved.attrs } : merged.attrs,
      css: resolved.css !== undefined ? { ...merged.css, ...resolved.css } : merged.css,
      ansi: resolved.ansi !== undefined ? { ...merged.ansi, ...resolved.ansi } : merged.ansi,
      meta: resolved.meta !== undefined ? { ...merged.meta, ...resolved.meta } : merged.meta,
    };

    // Clean up undefined keys
    if (merged.className === undefined) {
      const { className: _c, ...rest } = merged;

      merged = rest;
    }

    if (merged.attrs === undefined) {
      const { attrs: _a, ...rest } = merged;

      merged = rest;
    }

    if (merged.css === undefined) {
      const { css: _s, ...rest } = merged;

      merged = rest;
    }

    if (merged.ansi === undefined) {
      const { ansi: _n, ...rest } = merged;

      merged = rest;
    }

    if (merged.meta === undefined) {
      const { meta: _m, ...rest } = merged;

      merged = rest;
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

  if (styles.length === 0) {
    return [{ text, from: 0, to: text.length, styles: [] }];
  }

  // Collect all unique boundary positions
  const boundarySet = new Set<number>([0, text.length]);

  for (const entry of styles) {
    boundarySet.add(Math.max(0, entry.from));
    boundarySet.add(Math.min(text.length, entry.to));
  }

  const boundaries = [...boundarySet].sort((a, b) => a - b);

  const segments: TRichTextSegment[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const from = boundaries[i];
    const to = boundaries[i + 1];

    /* v8 ignore next 3 */
    if (from >= to) {
      continue;
    }

    // Collect all styles that fully cover this segment (in document order)
    const activeStyles: TStyleRef[] = [];

    for (const entry of styles as readonly TTextStyle[]) {
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
