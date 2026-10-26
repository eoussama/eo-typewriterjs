import type { Ref } from "vue";
import type { IRenderer, TPlaybackStatus, TTypewriter, TTypewriterState } from "../../../../src/index";
import type { TLogLevel, TSnippetError } from "./run-snippet";

import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { domRenderer, EPlaybackStatus } from "../../../../src/index";
import { formatValue, runSnippet } from "./run-snippet";



/**
 * @description
 * How previews show the typewriter: as styled DOM, or as plain text
 */
export type TPreviewMode = "dom" | "text";

/**
 * @description
 * A console line written by a snippet, stamped with the timeline time it was written at
 */
export type TLogEntry = {
  readonly level: TLogLevel;
  readonly text: string;
  readonly time: number;
};

/**
 * @description
 * Options of the playground composable
 */
export type TPlaygroundOptions = {
  /**
   * @description
   * The element the main preview renders into
   */
  readonly main: Ref<HTMLElement | null>;

  /**
   * @description
   * The element extra previews created with `preview(label)` are added to
   */
  readonly extras: Ref<HTMLElement | null>;

  /**
   * @description
   * How previews render
   */
  readonly mode: Ref<TPreviewMode>;
};

/**
 * @description
 * A renderer writing plain text, with each visible cursor drawn as its glyph
 *
 * @param el - The element to write into
 * @returns The renderer
 */
function textRenderer(el: HTMLElement): IRenderer {
  const paint = (state: TTypewriterState): void => {
    const cursors = Object.values(state.cursors)
      .filter(cursor => cursor.renderOptions.visible)
      .sort((a, b) => b.index - a.index);
    let text = state.document.text;

    for (const cursor of cursors) {
      text = text.slice(0, cursor.index) + cursor.renderOptions.content + text.slice(cursor.index);
    }

    el.textContent = text;
  };

  return { mount: paint, render: paint };
}

/**
 * @description
 * A renderer whose mode can change while it is in use
 */
type TSwitchableRenderer = IRenderer & {
  readonly setMode: (mode: TPreviewMode) => void;
};

/**
 * @description
 * Create the renderer of a mode
 *
 * @param el - The element to render into
 * @param mode - The render mode
 * @returns The renderer
 */
function rendererFor(el: HTMLElement, mode: TPreviewMode): IRenderer {
  return mode === "dom" ? domRenderer(el) : textRenderer(el);
}

/**
 * @description
 * A renderer that can switch between DOM and text output, repainting the last state it
 * received, so switching modes keeps what is on screen instead of starting over
 *
 * @param el - The element to render into
 * @param mode - The initial render mode
 * @returns The renderer
 */
function switchableRenderer(el: HTMLElement, mode: TPreviewMode): TSwitchableRenderer {
  let inner = rendererFor(el, mode);
  let last: TTypewriterState | null = null;

  return {
    mount: (state) => {
      last = state;

      return inner.mount?.(state);
    },
    render: (state) => {
      last = state;

      return inner.render(state);
    },
    unmount: () => {
      last = null;

      return inner.unmount?.();
    },
    setMode: (next) => {
      el.replaceChildren();
      inner = rendererFor(el, next);

      if (last !== null) {
        void inner.mount?.(last);
      }
    },
  };
}

/**
 * @description
 * Run snippets and control every typewriter they create from one transport.
 * Used by the sandbox page and by the playgrounds embedded in the docs.
 *
 * @param options - The preview elements and render mode
 * @returns Reactive playback state and the controls
 */
export function usePlayground(options: TPlaygroundOptions) {
  const status = ref<TPlaybackStatus>(EPlaybackStatus.IDLE);
  const currentTime = ref(0);
  const duration = ref(0);
  const rate = ref(1);
  const running = ref(false);
  const ready = ref(false);
  const muted = ref(false);
  const scrubbing = ref(false);
  const error = shallowRef<TSnippetError | null>(null);
  const logs = shallowRef<readonly TLogEntry[]>([]);

  let typewriters: TTypewriter[] = [];
  let renderers: TSwitchableRenderer[] = [];
  let audible = new Map<TTypewriter, boolean>();
  let controller: AbortController | null = null;
  let frame: number | null = null;

  const log = (level: TLogLevel, text: string): void => {
    logs.value = [...logs.value, { level, text, time: currentTime.value }];
  };

  /**
   * @description
   * Read the combined state of every typewriter into the reactive refs
   */
  const sync = (): void => {
    if (typewriters.length === 0) {
      return;
    }

    const states = typewriters.map(tw => tw.getState());

    status.value = states.some(state => state.status === EPlaybackStatus.PLAYING) ? EPlaybackStatus.PLAYING : states[0]!.status;
    duration.value = Math.max(...states.map(state => state.duration));
    rate.value = states[0]!.rate;

    if (!scrubbing.value) {
      currentTime.value = Math.max(...states.map(state => state.currentTime));
    }
  };

  const tick = (): void => {
    sync();
    frame = running.value || status.value === EPlaybackStatus.PLAYING ? requestAnimationFrame(tick) : null;
  };

  const startTicking = (): void => {
    if (frame === null && typeof requestAnimationFrame !== "undefined") {
      frame = requestAnimationFrame(tick);
    }
  };

  const each = (action: (tw: TTypewriter) => unknown): void => {
    for (const tw of typewriters) {
      const result = action(tw);

      if (result instanceof Promise) {
        result.catch((reason: unknown) => log("error", formatValue(reason)));
      }
    }

    sync();
    startTicking();
  };

  const track = (renderer: TSwitchableRenderer): TSwitchableRenderer => {
    renderers.push(renderer);

    return renderer;
  };

  watch(options.mode, (mode) => {
    for (const renderer of renderers) {
      renderer.setMode(mode);
    }
  });

  /**
   * @description
   * Create an extra preview below the main one
   *
   * @param label - The caption of the preview
   * @returns Its renderer
   */
  const preview = (label: string): IRenderer => {
    const figure = document.createElement("figure");
    const caption = document.createElement("figcaption");
    const output = document.createElement("div");

    figure.className = "pg-extra";
    caption.className = "pg-extra__label";
    caption.textContent = label;
    output.className = "pg-output";
    figure.append(caption, output);
    options.extras.value?.append(figure);

    return track(switchableRenderer(output, options.mode.value));
  };

  /**
   * @description
   * Stop the current run, destroying its typewriters, and clear every preview
   */
  const reset = (): void => {
    controller?.abort();
    controller = null;
    typewriters = [];
    renderers = [];
    audible = new Map();
    running.value = false;
    ready.value = false;
    error.value = null;
    logs.value = [];
    status.value = EPlaybackStatus.IDLE;
    currentTime.value = 0;
    duration.value = 0;
    options.main.value?.replaceChildren();
    options.extras.value?.replaceChildren();
  };

  /**
   * @description
   * Run a snippet, replacing whatever was running
   *
   * @param code - The snippet source
   * @returns A promise settling when the snippet finishes
   */
  const run = async (code: string): Promise<void> => {
    const main = options.main.value;

    reset();

    if (main === null) {
      return;
    }

    const current = new AbortController();

    controller = current;
    running.value = true;
    startTicking();

    const result = await runSnippet(code, {
      renderer: track(switchableRenderer(main, options.mode.value)),
      preview,
      signal: current.signal,
      onConsole: log,
      onTypewriter: (tw) => {
        typewriters.push(tw);
        audible.set(tw, tw.getAudioOptions().enabled !== false);
        ready.value = true;

        if (muted.value) {
          tw.setAudioEnabled(false);
        }
      },
    });

    if (current.signal.aborted) {
      return;
    }

    running.value = false;
    sync();

    if (!result.ok) {
      error.value = result.error;
    }
  };

  const setMuted = (value: boolean): void => {
    muted.value = value;

    for (const tw of typewriters) {
      tw.setAudioEnabled(!value && audible.get(tw) === true);
    }
  };

  const onUnhandled = (event: PromiseRejectionEvent): void => {
    if (running.value || status.value === EPlaybackStatus.PLAYING) {
      log("error", formatValue(event.reason));
      event.preventDefault();
    }
  };

  onMounted(() => {
    window.addEventListener("unhandledrejection", onUnhandled);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("unhandledrejection", onUnhandled);
    reset();

    if (frame !== null) {
      cancelAnimationFrame(frame);
    }
  });

  return {
    status,
    currentTime,
    duration,
    rate,
    running,
    ready,
    muted,
    scrubbing,
    error,
    logs,
    run,
    reset,
    play: () => each(tw => tw.play()),
    pause: () => each(tw => tw.pause()),
    stop: () => each(tw => tw.stop()),
    replay: () => each(tw => tw.replay()),
    stepForward: () => each(tw => tw.stepForward()),
    stepBackward: () => each(tw => tw.stepBackward()),
    seek: (time: number) => each(tw => tw.seek(time)),
    setRate: (value: number) => each(tw => tw.setRate(value)),
    setMuted,
  };
}

/**
 * @description
 * Format a timeline time for display, e.g. `850ms`, `4.2s` or `1:05.3`
 *
 * @param ms - The time in milliseconds
 * @returns The formatted time
 */
export function formatTime(ms: number): string {
  const clamped = Math.max(0, ms);

  if (clamped < 1000) {
    return `${Math.round(clamped)}ms`;
  }

  const minutes = Math.floor(clamped / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const tenths = Math.floor((clamped % 1000) / 100);

  return minutes === 0 ? `${seconds}.${tenths}s` : `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}
