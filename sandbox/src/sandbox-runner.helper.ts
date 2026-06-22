import type { IRenderer, TTypewriterState } from "@eo-typewriterjs";

import { domRenderer, StringRenderer } from "@eo-typewriterjs";

import { runSnippet } from "../../src/devtools/run-snippet.helper";



export type { TRunResult } from "../../src/devtools/run-snippet.helper";

export { runSnippet };

// Backward-compatible alias so existing sandbox.ts import continues to work
export { runSnippet as runUserCode };



/**
 * @description
 * Supported renderer identifiers in the sandbox
 */
export const ERendererKind = {
  DOM: "dom",
  STRING: "string",
} as const;

export type TRendererKind = (typeof ERendererKind)[keyof typeof ERendererKind];

/**
 * @description
 * Build a string preview that includes a visible cursor glyph inserted at the
 * correct position within the plain document text.
 * Only cursors whose renderOptions.visible is true are rendered.
 * When multiple cursors are present each is inserted in reverse order (highest
 * index first) so earlier insertions do not shift subsequent positions.
 *
 * @param state - The current typewriter state
 * @returns The document text with cursor glyphs spliced in
 */
function buildStringPreview(state: TTypewriterState): string {
  const text = state.document.text;
  const entries = Object.values(state.cursors)
    .filter(c => c.visible && c.renderOptions.visible)
    .sort((a, b) => b.index - a.index);

  let result = text;

  for (const cursor of entries) {
    const glyph = cursor.renderOptions.content;
    const idx = Math.max(0, Math.min(cursor.index, result.length));

    result = result.slice(0, idx) + glyph + result.slice(idx);
  }

  return result;
}

/**
 * @description
 * Create an IRenderer for the given kind, wiring string output to a target element
 *
 * @param kind - The renderer kind
 * @param domTarget - Element to render DOM output into
 * @param stringTarget - Element to show string output in
 * @returns An IRenderer instance
 */
export function createSandboxRenderer(
  kind: TRendererKind,
  domTarget: HTMLElement,
  stringTarget: HTMLElement,
): IRenderer {
  if (kind === ERendererKind.STRING) {
    const sr = new StringRenderer();

    return {
      mount(state) {
        sr.mount(state);
        stringTarget.textContent = buildStringPreview(state);
      },
      render(state) {
        sr.render(state);
        stringTarget.textContent = buildStringPreview(state);
      },
    };
  }

  return domRenderer(domTarget);
}
