import type { IRenderer, TTypewriter } from "@eo-typewriterjs";

import {
  createTypewriter,
  domRenderer,
  ECommandKind,
  EPlaybackStatus,
  StringRenderer,
  TimelineBuilder,
} from "@eo-typewriterjs";



// ---------------------------------------------------------------------------
// Renderer kind
// ---------------------------------------------------------------------------

/**
 * @description
 * Supported renderer identifiers in the sandbox
 */
export const ERendererKind = {
  DOM: "dom",
  STRING: "string",
} as const;

export type TRendererKind = (typeof ERendererKind)[keyof typeof ERendererKind];

// ---------------------------------------------------------------------------
// Renderer factory
// ---------------------------------------------------------------------------

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
        stringTarget.textContent = sr.toString();
      },
      render(state) {
        sr.render(state);
        stringTarget.textContent = sr.toString();
      },
    };
  }

  return domRenderer(domTarget);
}

// ---------------------------------------------------------------------------
// Run result
// ---------------------------------------------------------------------------

/**
 * @description
 * Result of a sandbox code run
 */
export type TRunResult = {
  readonly ok: true;
  readonly tw: TTypewriter;
} | {
  readonly ok: false;
  readonly error: string;
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * @description
 * Execute user-written JavaScript code in a sandboxed context.
 * The user code receives the full engine API as globals.
 *
 * @param code - The user code string
 * @param renderer - The renderer to inject as `renderer`
 * @returns A TRunResult with the TTypewriter instance or an error message
 */
export async function runUserCode(
  code: string,
  renderer: IRenderer,
): Promise<TRunResult> {
  let capturedTw: TTypewriter | null = null;

  // Intercepted createTypewriter — captures the tw instance
  function sandboxCreateTypewriter(opts: { renderer: IRenderer }): TTypewriter {
    const tw = createTypewriter(opts);

    capturedTw = tw;

    return tw;
  }

  // Build the context object (available as named destructures in user code)
  const ctx = {
    createTypewriter: sandboxCreateTypewriter,
    renderer,
    domRenderer,
    StringRenderer,
    TimelineBuilder,
    ECommandKind,
    EPlaybackStatus,
  };

  // Wrap user code as an ES module default export
  const moduleCode = `
export default async function __sandbox__(ctx) {
  const {
    createTypewriter,
    renderer,
    domRenderer,
    StringRenderer,
    TimelineBuilder,
    ECommandKind,
    EPlaybackStatus,
  } = ctx;

  ${code}
}
`;

  try {
    const blob = new Blob([moduleCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);

    try {
      // @ts-expect-error — dynamic import from blob URL, intentional
      const mod: { default: (ctx: typeof ctx) => Promise<void> } = await import(/* @vite-ignore */ url);

      await mod.default(ctx);
    }
    finally {
      URL.revokeObjectURL(url);
    }

    if (capturedTw === null) {
      return {
        ok: false,
        error: "No createTypewriter() call found in your code. Make sure you call createTypewriter({ renderer }) and await tw.play().",
      };
    }

    return { ok: true, tw: capturedTw };
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    return { ok: false, error: message };
  }
}
