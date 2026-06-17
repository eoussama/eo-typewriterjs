import type { TCursorKind } from "./cursor-kind.enum";



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
 * Render configuration for a cursor.
 * All properties are optional — any omitted value falls back to the instance default
 * set at createTypewriter() time, or the library default if none was provided.
 */
export type TCursorRenderOptions = {
  /**
   * @description
   * Whether the cursor is visible in the rendered output.
   * Set to false to hide the cursor element entirely.
   * Default: true
   */
  readonly visible?: boolean;

  /**
   * @description
   * One or more CSS class names (space-separated) to add to the cursor element
   * in addition to the base `typewriter-cursor` class.
   */
  readonly className?: string;

  /**
   * @description
   * The visual kind of cursor. Determines the default rendered text content unless
   * `content` is explicitly provided.
   * Default: "pipe"
   */
  readonly kind?: TCursorKind;

  /**
   * @description
   * Custom text/character content to render inside the cursor element.
   * When provided, overrides the default glyph for the selected `kind`.
   * Set to an empty string for a CSS-only cursor (e.g. styled with ::before or background-image).
   */
  readonly content?: string;

  /**
   * @description
   * Additional HTML attributes to set on the cursor element (e.g. data-*, role, aria-*).
   */
  readonly attrs?: Readonly<Record<string, string>>;
};

/**
 * @description
 * Fully resolved cursor render options — all fields present.
 * Produced by merging per-cursor options with instance defaults and library defaults.
 */
export type TResolvedCursorRenderOptions = Required<Omit<TCursorRenderOptions, "attrs">> & {
  readonly attrs: Readonly<Record<string, string>>;
};

/**
 * @description
 * The library-level default cursor render options.
 * Applied when no per-instance or per-cursor overrides are provided.
 */
export const DEFAULT_CURSOR_RENDER_OPTIONS: TResolvedCursorRenderOptions = {
  visible: true,
  className: "",
  kind: "pipe",
  content: "|",
  attrs: {},
} as const;

/**
 * @description
 * Merge a partial TCursorRenderOptions with a resolved baseline,
 * producing a fully TResolvedCursorRenderOptions.
 * When `kind` changes and no explicit `content` is given, the default glyph for
 * the new kind is used.
 *
 * @param base - The baseline resolved options to merge into
 * @param override - The partial override options to apply
 * @returns A new TResolvedCursorRenderOptions with override applied
 */
export function mergeCursorOptions(
  base: TResolvedCursorRenderOptions,
  override: TCursorRenderOptions,
): TResolvedCursorRenderOptions {
  const kind = override.kind ?? base.kind;

  // If the caller set a new kind but did not explicitly supply content,
  // use the default glyph for that kind.
  const content = override.content !== undefined
    ? override.content
    : override.kind !== undefined
      ? CURSOR_KIND_CONTENT[override.kind]
      : base.content;

  return {
    visible: override.visible ?? base.visible,
    className: override.className ?? base.className,
    kind,
    content,
    attrs: override.attrs ?? base.attrs,
  };
}
