import type { IRenderer, TTypewriter, TTypewriterOptions } from "../../../../src/index";

import { DEFAULT_SFX_PACK } from "../../../../src/audio-pack";
import {
  createTypewriter,
  domRenderer,
  EAudioStrategy,
  ECommandKind,
  ECursorKind,
  EPlaybackStatus,
  StringRenderer,
  stringRenderer,
  TimelineBuilder,
} from "../../../../src/index";



/**
 * @description
 * Console levels a snippet can log at
 */
export type TLogLevel = "log" | "info" | "warn" | "error";

/**
 * @description
 * What the page running a snippet provides to it
 */
export type TSnippetHost = {
  /**
   * @description
   * The main preview's renderer, exposed to the snippet as `renderer`
   */
  readonly renderer: IRenderer;

  /**
   * @description
   * Create an extra, labelled preview and return its renderer, exposed as `preview(label)`
   */
  readonly preview: (label: string) => IRenderer;

  /**
   * @description
   * Aborted when the run is replaced or stopped; every typewriter is then destroyed
   */
  readonly signal: AbortSignal;

  /**
   * @description
   * Called for every typewriter the snippet creates, as soon as it is created
   */
  readonly onTypewriter?: (tw: TTypewriter) => void;

  /**
   * @description
   * Called for every console call made by the snippet
   */
  readonly onConsole?: (level: TLogLevel, text: string) => void;
};

/**
 * @description
 * An error thrown by a snippet, with its line in the snippet when known
 */
export type TSnippetError = {
  readonly message: string;
  readonly line: number | null;
};

/**
 * @description
 * Result of running a snippet
 */
export type TRunResult
  = | { readonly ok: true }
    | { readonly ok: false; readonly error: TSnippetError };

/**
 * @description
 * Constructor of async functions, used to compile snippets so they can use top-level `await`
 */
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (...args: string[]) => (...values: unknown[]) => Promise<void>;

/**
 * @description
 * Lines the compiled function adds before the snippet body: `async function anonymous(...` and `) {`
 */
const WRAPPER_LINES = 2;

/**
 * @description
 * Turn a value into readable console text. Handles circular structures, functions,
 * errors and other values `JSON.stringify` cannot represent.
 *
 * @param value - The logged value
 * @returns The text shown in the console
 */
export function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  if (typeof value !== "object" || value === null) {
    return typeof value === "function" ? `[Function ${value.name || "anonymous"}]` : String(value);
  }

  const seen = new WeakSet<object>();

  return JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item === "function") {
      return `[Function ${item.name || "anonymous"}]`;
    }

    if (typeof item === "object" && item !== null) {
      if (seen.has(item)) {
        return "[Circular]";
      }

      seen.add(item);
    }

    return item;
  });
}

/**
 * @description
 * Remove `import` statements so snippets copied from the docs still run; the library is
 * already available as globals. Lines are blanked rather than removed to keep line numbers.
 *
 * @param code - The snippet source
 * @returns The source without import statements
 */
export function stripImports(code: string): string {
  return code.replace(/^\s*import\s[^;]*?from\s*["'][^"']+["'];?[ \t]*$/gm, match => match.replace(/[^\n]/g, ""));
}

/**
 * @description
 * Find the snippet line an error was thrown from, using its stack trace
 *
 * @param error - The thrown error
 * @returns The 1-based snippet line, or null when unknown
 */
export function errorLine(error: unknown): number | null {
  const stack = error instanceof Error ? error.stack ?? "" : "";
  const match = /(?:<anonymous>|anonymous|Function):(\d+):\d+/.exec(stack);

  if (match === null) {
    return null;
  }

  const line = Number(match[1]) - WRAPPER_LINES;

  return line > 0 ? line : null;
}

/**
 * @description
 * Run a snippet with the typewriter API injected as globals.
 *
 * Besides the library exports, the snippet gets `renderer` (the main preview),
 * `preview(label)` (an extra preview), `signal` (aborted when the run is replaced),
 * `sleep(ms)` (a wait that stops with the run) and a `console` that reports to the host.
 * Every typewriter it creates is destroyed when the run is aborted.
 *
 * @param code - The snippet source
 * @param host - The renderers and callbacks of the page running the snippet
 * @returns Whether the snippet finished without throwing
 */
export async function runSnippet(code: string, host: TSnippetHost): Promise<TRunResult> {
  const { signal } = host;
  const created: TTypewriter[] = [];

  const assertRunning = (): void => {
    if (signal.aborted) {
      throw new DOMException("The run was stopped.", "AbortError");
    }
  };

  const snippetCreateTypewriter = (options: TTypewriterOptions): TTypewriter => {
    assertRunning();

    const tw = createTypewriter(options);

    created.push(tw);
    host.onTypewriter?.(tw);

    // Once the run is stopped, a snippet still awaiting playback must not restart it.
    return {
      ...tw,
      play: () => signal.aborted ? Promise.resolve() : tw.play(),
      replay: () => signal.aborted ? Promise.resolve() : tw.replay(),
    };
  };

  const sleep = (ms: number): Promise<void> => new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new DOMException("The run was stopped.", "AbortError"));
    };

    timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal.addEventListener("abort", onAbort, { once: true });
  });

  const log = (level: TLogLevel) => (...values: unknown[]): void => {
    if (!signal.aborted) {
      host.onConsole?.(level, values.map(formatValue).join(" "));
    }
  };

  const destroyAll = (): void => {
    for (const tw of created) {
      tw.destroy();
    }
  };

  signal.addEventListener("abort", destroyAll, { once: true });

  const globals: Record<string, unknown> = {
    createTypewriter: snippetCreateTypewriter,
    renderer: host.renderer,
    preview: host.preview,
    signal,
    sleep,
    domRenderer,
    StringRenderer,
    stringRenderer,
    TimelineBuilder,
    ECommandKind,
    ECursorKind,
    EPlaybackStatus,
    EAudioStrategy,
    DEFAULT_SFX_PACK,
    console: { log: log("log"), info: log("info"), warn: log("warn"), error: log("error") },
  };

  try {
    const run = new AsyncFunction(...Object.keys(globals), stripImports(code));

    await run(...Object.values(globals));

    return { ok: true };
  }
  catch (error) {
    if (signal.aborted) {
      return { ok: true };
    }

    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

    return { ok: false, error: { message, line: errorLine(error) } };
  }
}
