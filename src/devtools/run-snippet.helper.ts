import type { IRenderer, TTypewriter } from "../index";

import {
  createTypewriter,
  domRenderer,
  EAudioStrategy,
  ECommandKind,
  ECursorKind,
  EPlaybackStatus,
  StringRenderer,
  TimelineBuilder,
} from "../index";



/**
 * @description
 * Result of running a code snippet
 */
export type TRunResult
  = | { readonly ok: true; readonly tw: TTypewriter }
    | { readonly ok: false; readonly error: string };

/**
 * @description
 * Execute a code snippet in an isolated scope.
 * The snippet receives the full typewriter API as injected globals and must
 * call createTypewriter({ renderer }) to register a typewriter instance.
 *
 * @param code - The snippet source to execute
 * @param renderer - The renderer to inject as `renderer`
 * @param onCreated - Called the moment createTypewriter() is invoked, before play() resolves
 * @returns A TRunResult with the captured TTypewriter or an error message
 */
export async function runSnippet(
  code: string,
  renderer: IRenderer,
  onCreated?: (tw: TTypewriter) => void,
): Promise<TRunResult> {
  let capturedTw: TTypewriter | null = null;

  function sandboxCreateTypewriter(opts: { renderer: IRenderer }): TTypewriter {
    const tw = createTypewriter(opts);

    capturedTw = tw;
    onCreated?.(tw);

    return tw;
  }

  const ctx = {
    createTypewriter: sandboxCreateTypewriter,
    renderer,
    domRenderer,
    StringRenderer,
    TimelineBuilder,
    ECommandKind,
    ECursorKind,
    EPlaybackStatus,
    EAudioStrategy,
  };

  const moduleCode = `
export default async function __snippet__(ctx) {
  const {
    createTypewriter,
    renderer,
    domRenderer,
    StringRenderer,
    TimelineBuilder,
    ECommandKind,
    ECursorKind,
    EPlaybackStatus,
    EAudioStrategy,
  } = ctx;

  ${code}
}
`;

  try {
    const blob = new Blob([moduleCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);

    try {
      // @ts-expect-error dynamic import from blob URL is intentional
      const mod: { default: (ctx: typeof ctx) => Promise<void> } = await import(/* @vite-ignore */ url);

      await mod.default(ctx);
    }
    finally {
      URL.revokeObjectURL(url);
    }

    if (capturedTw === null) {
      return {
        ok: false,
        error: "No createTypewriter() call found. Make sure you call createTypewriter({ renderer }) in your snippet.",
      };
    }

    return { ok: true, tw: capturedTw };
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    return { ok: false, error: message };
  }
}
