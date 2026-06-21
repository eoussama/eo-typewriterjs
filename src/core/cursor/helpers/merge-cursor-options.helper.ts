import type { TCursorRenderOptions, TResolvedCursorRenderOptions } from "../types/cursor-render-options.type";
import { CURSOR_KIND_CONTENT } from "../consts/cursor-defaults.const";



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
