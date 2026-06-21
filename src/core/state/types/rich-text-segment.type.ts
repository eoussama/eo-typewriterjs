import type { TStyleRef } from "./rich-text-document.type";



/**
 * @description
 * A contiguous segment of document text with its merged style stack applied
 */
export type TRichTextSegment = {
  readonly text: string;
  readonly from: number;
  readonly to: number;
  readonly styles: readonly TStyleRef[];
};
