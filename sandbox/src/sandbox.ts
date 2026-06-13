import type { IRenderer, TAdvanceModeInput, TTypewriterState } from "@eo-typewriterjs";
import type { TSnippetSegment } from "./snippets.const";

import { createTypewriter, domRenderer } from "@eo-typewriterjs";



/**
 * @description
 * Monotonically incrementing generation counter.
 * Each new animation run captures a snapshot; any render call from an older
 * generation is silently discarded, preventing flickering after Stop.
 */
let _generation = 0;

/**
 * @description
 * Whether an animation is currently in flight for the active generation
 */
let _running = false;

/**
 * @description
 * The segments of the currently selected snippet, if any.
 * When set, the Run button replays the segment sequence instead of plain text.
 * Cleared when the user edits the textarea manually.
 */
let _activeSegments: readonly TSnippetSegment[] | null = null;

/**
 * @description
 * Build a renderer that delegates to the underlying domRenderer only while
 * the captured generation is still the active one
 *
 * @param el - The target DOM element
 * @param gen - The generation this renderer belongs to
 * @returns A guarded IRenderer instance
 */
function makeGuardedRenderer(el: Element, gen: number): IRenderer {
  const inner = domRenderer(el);

  return {
    mount(state: TTypewriterState): void {
      if (_generation === gen) {
        inner.mount(state);
      }
    },
    render(state: TTypewriterState): void {
      if (_generation === gen) {
        inner.render(state);
      }
    },
    unmount(): void {
      inner.unmount();
    },
  };
}

/**
 * @description
 * Read the current advance mode from the UI controls
 *
 * @returns The resolved advance mode input built from the current controls
 */
function readAdvanceMode(): TAdvanceModeInput {
  const unit = (document.getElementById("ctrl-unit") as HTMLSelectElement).value as
    | "char"
    | "grapheme"
    | "word"
    | "line"
    | "custom";
  const amount = Number.parseInt((document.getElementById("ctrl-amount") as HTMLInputElement).value, 10) || 1;

  if (amount === 1) {
    return unit;
  }

  return { unit, amount };
}

/**
 * @description
 * Read the interval value from the UI
 *
 * @returns The interval in milliseconds
 */
function readInterval(): number {
  return Number.parseInt((document.getElementById("ctrl-interval") as HTMLInputElement).value, 10) || 80;
}

/**
 * @description
 * Sync the Run / Stop button states with the running flag
 *
 * @param running - Whether an animation is currently running
 */
function setRunning(running: boolean): void {
  _running = running;
  (document.getElementById("btn-run") as HTMLButtonElement).disabled = running;
  (document.getElementById("btn-stop") as HTMLButtonElement).disabled = !running;
}

/**
 * @description
 * Clear the typewriter output element
 */
export function clearOutput(): void {
  const el = document.getElementById("typewriter-output");

  if (el !== null) {
    el.textContent = "";
  }
}

/**
 * @description
 * Stop the currently running animation by advancing the generation counter.
 * Any scheduled renderer calls from the previous generation become no-ops.
 */
export function stopAnimation(): void {
  _generation += 1;
  setRunning(false);
  clearOutput();
}

/**
 * @description
 * Set the active snippet segments so the Run button replays the full sequence.
 * Pass null to clear and fall back to plain text mode.
 *
 * @param segments - The ordered segment list, or null to clear
 */
export function setActiveSegments(segments: readonly TSnippetSegment[] | null): void {
  _activeSegments = segments;
}

/**
 * @description
 * Run the typewriter animation for the given text using the current control settings.
 * If active segments are set, the segment sequence is used instead of plain text.
 *
 * @param text - The fallback text to animate when no segments are active
 * @returns A promise that resolves when the animation completes or is superseded
 */
export async function runAnimation(text: string): Promise<void> {
  if (_activeSegments !== null) {
    return runSegmentsAnimation(_activeSegments);
  }

  if (_running) {
    return;
  }

  const outputEl = document.getElementById("typewriter-output");

  if (outputEl === null || text.trim() === "") {
    return;
  }

  // Advance generation — invalidates any lingering previous play() timers
  _generation += 1;
  const myGen = _generation;

  clearOutput();
  setRunning(true);

  const renderer = makeGuardedRenderer(outputEl, myGen);
  const tw = createTypewriter({ renderer });

  tw.timeline.type(text, {
    by: readAdvanceMode(),
    interval: readInterval(),
  });

  await tw.play();

  // Only update UI if this generation is still current
  if (_generation === myGen) {
    setRunning(false);
  }
}

/**
 * @description
 * Run the typewriter animation for a sequence of typed and wait segments.
 * The advance mode and interval controls are applied to each type segment.
 *
 * @param segments - The ordered list of type and wait segments to animate
 * @returns A promise that resolves when the animation completes or is superseded
 */
export async function runSegmentsAnimation(segments: readonly TSnippetSegment[]): Promise<void> {
  if (_running) {
    return;
  }

  const outputEl = document.getElementById("typewriter-output");

  if (outputEl === null) {
    return;
  }

  // Advance generation — invalidates any lingering previous play() timers
  _generation += 1;
  const myGen = _generation;

  clearOutput();
  setRunning(true);

  const renderer = makeGuardedRenderer(outputEl, myGen);
  const tw = createTypewriter({ renderer });

  for (const segment of segments) {
    if (segment.kind === "type") {
      tw.timeline.type(segment.text, {
        by: readAdvanceMode(),
        interval: readInterval(),
      });
    }
    else {
      tw.timeline.wait(segment.duration);
    }
  }

  await tw.play();

  // Only update UI if this generation is still current
  if (_generation === myGen) {
    setRunning(false);
  }
}
