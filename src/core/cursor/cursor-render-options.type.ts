import type { TCursorKind } from "./cursor-kind.enum";



/**
 * @description
 * Custom CSS animation configuration for a cursor.
 * Each field maps directly to the corresponding CSS animation sub-property.
 * All fields are optional; omitted fields fall back to the browser default.
 */
export type TCursorAnimationOptions = {
  /**
   * @description
   * The name of the CSS @keyframes animation to apply (e.g. "my-fade").
   */
  readonly name: string;

  /**
   * @description
   * Duration of one animation cycle (e.g. "800ms", "1s").
   */
  readonly duration?: string;

  /**
   * @description
   * CSS timing function (e.g. "ease-in-out", "step-end", "linear").
   */
  readonly timingFunction?: string;

  /**
   * @description
   * Delay before the animation starts (e.g. "0s", "200ms").
   */
  readonly delay?: string;

  /**
   * @description
   * Number of times the animation repeats (e.g. "infinite", "3").
   */
  readonly iterationCount?: string;

  /**
   * @description
   * Direction of the animation (e.g. "normal", "alternate", "reverse").
   */
  readonly direction?: string;

  /**
   * @description
   * Fill mode (e.g. "none", "forwards", "backwards", "both").
   */
  readonly fillMode?: string;

  /**
   * @description
   * Play state (e.g. "running", "paused").
   */
  readonly playState?: string;
};

/**
 * @description
 * Cursor animation setting.
 * - "blink"  — built-in opacity-blink animation injected by the DOM renderer
 * - "none"   — no animation; cursor is fully static
 * - object   — fully custom CSS animation via TCursorAnimationOptions
 */
export type TCursorAnimation = "blink" | "none" | TCursorAnimationOptions;



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

  /**
   * @description
   * Animation to apply to the cursor element.
   * - "blink"  — built-in opacity blink (default)
   * - "none"   — static cursor, no animation
   * - object   — fully custom CSS animation (see TCursorAnimationOptions)
   * Default: "blink"
   */
  readonly animation?: TCursorAnimation;
};

/**
 * @description
 * Fully resolved cursor render options — all fields present.
 * Produced by merging per-cursor options with instance defaults and library defaults.
 */
export type TResolvedCursorRenderOptions = Required<Omit<TCursorRenderOptions, "attrs">> & {
  readonly attrs: Readonly<Record<string, string>>;
  readonly animation: TCursorAnimation;
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
  animation: "blink",
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
    animation: override.animation ?? base.animation,
  };
}
