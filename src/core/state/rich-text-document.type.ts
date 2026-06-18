/**
 * @description
 * Style object for rich text marks
 */
export type TStyleObject = {
  readonly className?: string;
  readonly attrs?: Record<string, string>;
  readonly css?: Record<string, string>;
  readonly ansi?: Record<string, string>;
  readonly meta?: Record<string, unknown>;
};

/**
 * @description
 * Style reference — either a CSS class name string or a full style object
 */
export type TStyleRef = string | TStyleObject;

/**
 * @description
 * A styled range within the document text
 */
export type TTextMark = {
  readonly from: number;
  readonly to: number;
  readonly style: TStyleRef;
};

/**
 * @description
 * The raw text content and associated style marks
 */
export type TRichTextDocument = {
  readonly text: string;
  readonly marks: readonly TTextMark[];
};
