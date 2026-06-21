import type { TCursorKind } from "../enums/cursor-kind.enum";
import type { TResolvedCursorRenderOptions } from "../types/cursor-render-options.type";



/**
 * @description
 * The built-in glyph rendered for each cursor kind when no custom content is provided
 */
export const CURSOR_KIND_CONTENT: Readonly<Record<TCursorKind, string>> = {
  "pipe": "|",
  "underscore": "_",
  "block": "▋",
  "block-underscore": "▄",
  "caret": "^",
  "custom": "",
} as const;

/**
 * @description
 * The library-level default cursor render options
 */
export const DEFAULT_CURSOR_RENDER_OPTIONS: TResolvedCursorRenderOptions = {
  visible: true,
  className: "",
  kind: "pipe",
  content: "|",
  attrs: {},
  animation: "blink",
} as const;
