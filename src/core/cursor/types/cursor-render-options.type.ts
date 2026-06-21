import type { TCursorKind } from "../enums/cursor-kind.enum";



/**
 * @description
 * Custom CSS animation configuration for a cursor
 */
export type TCursorAnimationOptions = {
  readonly name: string;
  readonly duration?: string;
  readonly timingFunction?: string;
  readonly delay?: string;
  readonly iterationCount?: string;
  readonly direction?: string;
  readonly fillMode?: string;
  readonly playState?: string;
};

/**
 * @description
 * Cursor animation setting.
 * - "blink"  - built-in opacity-blink animation injected by the DOM renderer
 * - "none"   - no animation; cursor is fully static
 * - object   - fully custom CSS animation via TCursorAnimationOptions
 */
export type TCursorAnimation = "blink" | "none" | TCursorAnimationOptions;

/**
 * @description
 * Render configuration for a cursor. All properties are optional.
 */
export type TCursorRenderOptions = {
  readonly visible?: boolean;
  readonly className?: string;
  readonly kind?: TCursorKind;
  readonly content?: string;
  readonly attrs?: Readonly<Record<string, string>>;
  readonly animation?: TCursorAnimation;
};

/**
 * @description
 * Fully resolved cursor render options - all fields present
 */
export type TResolvedCursorRenderOptions = Required<Omit<TCursorRenderOptions, "attrs">> & {
  readonly attrs: Readonly<Record<string, string>>;
  readonly animation: TCursorAnimation;
};
