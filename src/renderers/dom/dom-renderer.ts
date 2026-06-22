import type { TNullable } from "@eoussama/core";
import type { TCursorAnimation, TCursorAnimationOptions } from "../../core/cursor/types/cursor-render-options.type";
import type { IRenderer } from "../../core/renderer/interfaces/renderer.interface";
import type { TStyleRef } from "../../core/state/types/rich-text-document.type";
import type { TSelectionState, TTypewriterState } from "../../core/state/types/typewriter-state.type";

import { resolveStyleRef, segmentRichText } from "../../core/state/helpers/segment-rich-text.helper";



// ---------------------------------------------------------------------------
// Built-in blink stylesheet injection
// ---------------------------------------------------------------------------

/**
 * @description
 * CSS class applied to cursor elements when animation is "blink"
 */
const BLINK_CLASS = "typewriter-cursor--blink";

/**
 * @description
 * id of the injected <style> element - ensures it is injected only once
 */
const BLINK_STYLE_ID = "typewriter-blink-style";

/**
 * @description
 * Inject the built-in blink @keyframes stylesheet into the document <head> once.
 * Subsequent calls are no-ops. Safe to call from every DomRenderer constructor.
 */
function ensureBlinkStylesheet(): void {
  /* v8 ignore next 3 */
  if (typeof document === "undefined") {
    return;
  }

  if (document.getElementById(BLINK_STYLE_ID) !== null) {
    return;
  }

  const style = document.createElement("style");

  style.id = BLINK_STYLE_ID;
  style.textContent = [
    "@keyframes tw-cursor-blink {",
    "  0%, 49.9% { opacity: 1; }",
    "  50%, 100% { opacity: 0; }",
    "}",
    `.${BLINK_CLASS} {`,
    "  animation: tw-cursor-blink 1s step-end infinite;",
    "}",
  ].join("\n");

  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Boundary type
// ---------------------------------------------------------------------------

/**
 * @description
 * A boundary point used to segment the document text for multi-cursor/multi-selection rendering
 */
type TBoundary = {
  readonly index: number;
  readonly kind: "cursor" | "selStart" | "selEnd";
  readonly cursorId: string;
};

// ---------------------------------------------------------------------------
// DomRenderer
// ---------------------------------------------------------------------------

/**
 * @description
 * A DOM renderer that writes the current typewriter state into a target HTML element.
 * All active cursors are rendered as inline elements at their correct document positions.
 * All active per-cursor selections are rendered as highlighted spans.
 * Text styles from the rich-text document are applied as span attributes, CSS classes,
 * and/or inline styles - renderer-agnostic style objects are fully honoured.
 * Adjacent text segments that share the same style stack and selection state are
 * coalesced into a single span to minimise DOM node count.
 *
 * The target may be specified as a CSS selector string or a direct element reference.
 */
export class DomRenderer implements IRenderer {
  private _target: TNullable<Element> = null;
  private readonly _selector: string | Element;

  /**
   * @description
   * Create a DomRenderer targeting a specific element or CSS selector.
   * Also ensures the built-in blink stylesheet is injected into the document.
   *
   * @param target - A CSS selector string or an Element to render into
   */
  constructor(target: string | Element) {
    this._selector = target;
    ensureBlinkStylesheet();
  }

  /**
   * @description
   * Resolve the target element and perform the initial render
   *
   * @param state - The initial typewriter state
   */
  mount(state: TTypewriterState): void {
    if (typeof this._selector === "string") {
      this._target = document.querySelector(this._selector);
    }
    else {
      this._target = this._selector;
    }

    this._paint(state);
  }

  /**
   * @description
   * Update the target element with the latest document text, all cursors, and all selections
   *
   * @param state - The current typewriter state
   */
  render(state: TTypewriterState): void {
    this._paint(state);
  }

  /**
   * @description
   * Release the reference to the target element
   */
  unmount(): void {
    this._target = null;
  }

  /**
   * @description
   * Apply animation settings to a cursor span element.
   * - "blink"  → adds the built-in blink class and sets data-cursor-animation="blink"
   * - "none"   → disables animation inline and sets data-cursor-animation="none"
   * - object   → applies inline animation sub-properties and sets data-cursor-animation="custom"
   *
   * @param el - The cursor span element to animate
   * @param animation - The animation setting to apply
   */
  private _applyCursorAnimation(el: HTMLElement, animation: TCursorAnimation): void {
    if (animation === "blink") {
      el.classList.add(BLINK_CLASS);
      el.dataset.cursorAnimation = "blink";
    }
    else if (animation === "none") {
      el.style.animation = "none";
      el.dataset.cursorAnimation = "none";
    }
    else {
      const opts = animation as TCursorAnimationOptions;

      el.style.animationName = opts.name;

      if (opts.duration !== undefined) {
        el.style.animationDuration = opts.duration;
      }

      if (opts.timingFunction !== undefined) {
        el.style.animationTimingFunction = opts.timingFunction;
      }

      if (opts.delay !== undefined) {
        el.style.animationDelay = opts.delay;
      }

      if (opts.iterationCount !== undefined) {
        el.style.animationIterationCount = opts.iterationCount;
      }

      if (opts.direction !== undefined) {
        el.style.animationDirection = opts.direction as CSSStyleDeclaration["animationDirection"];
      }

      if (opts.fillMode !== undefined) {
        el.style.animationFillMode = opts.fillMode as CSSStyleDeclaration["animationFillMode"];
      }

      if (opts.playState !== undefined) {
        el.style.animationPlayState = opts.playState as CSSStyleDeclaration["animationPlayState"];
      }

      el.dataset.cursorAnimation = "custom";
    }
  }

  /**
   * @description
   * Apply a single TStyleRef to a DOM span element.
   *
   * @param el - The span element to style
   * @param ref - The style reference to apply
   */
  private _applySingleStyleRef(el: HTMLElement, ref: TStyleRef): void {
    const resolved = resolveStyleRef(ref);

    if (resolved.className !== undefined) {
      el.classList.add(...resolved.className.split(/\s+/).filter(Boolean));
    }

    if (resolved.attrs !== undefined) {
      for (const [key, value] of Object.entries(resolved.attrs)) {
        el.setAttribute(key, value);
      }
    }

    if (resolved.css !== undefined) {
      for (const [prop, value] of Object.entries(resolved.css)) {
        (el.style as unknown as Record<string, string>)[prop] = value;
      }
    }
  }

  /**
   * @description
   * Paint the document text into the target element.
   * Segments the text at every style boundary, cursor position, and selection boundary,
   * rendering cursor markers and selection highlights at their correct positions.
   * Text styles are applied as className, inline CSS, and/or HTML attributes on spans.
   * Adjacent segments with identical style stacks and selection state are coalesced
   * into a single DOM node before appending to reduce overall node count.
   *
   * @param state - The typewriter state to render
   */
  private _paint(state: TTypewriterState): void {
    if (this._target === null) {
      return;
    }

    const richSegments = segmentRichText(state.document);

    // Collect all cursor/selection boundaries
    const boundaries: TBoundary[] = [];

    for (const cursor of Object.values(state.cursors)) {
      boundaries.push({ index: cursor.index, kind: "cursor", cursorId: cursor.id });
    }

    for (const [cursorId, sel] of Object.entries(state.selections) as [string, TSelectionState][]) {
      boundaries.push({ index: sel.from, kind: "selStart", cursorId });
      boundaries.push({ index: sel.to, kind: "selEnd", cursorId });
    }

    // Sort boundaries: within same index: selStart < cursor < selEnd
    const kindOrder: Record<TBoundary["kind"], number> = { selStart: 0, cursor: 1, selEnd: 2 };

    boundaries.sort((a, b) => a.index - b.index || kindOrder[a.kind] - kindOrder[b.kind]);

    const fragment = document.createDocumentFragment();
    const openSelections = new Set<string>();

    // Coalescing run buffer - accumulates consecutive text slices that share
    // the same style stack and selection state into a single DOM subtree.
    let runText = "";
    let runStylesKey = "";
    let runSelectionsKey = "";
    let runStyles: readonly TStyleRef[] = [];
    let runSelections = new Set<string>();
    let runActive = false;

    const getSelectionsKey = (): string => [...openSelections].sort().join(",");

    const flushRun = (): void => {
      /* v8 ignore next 3 */
      if (!runActive) {
        return;
      }

      this._appendStyledText(fragment, runText, runStyles, runSelections);
      runActive = false;
      runText = "";
    };

    const bufferText = (text: string, styles: readonly TStyleRef[]): void => {
      const sKey = JSON.stringify(styles);
      const selKey = getSelectionsKey();

      if (runActive && sKey === runStylesKey && selKey === runSelectionsKey) {
        runText += text;
      }
      else {
        flushRun();
        runText = text;
        runStyles = styles;
        runSelections = new Set(openSelections);
        runStylesKey = sKey;
        runSelectionsKey = selKey;
        runActive = true;
      }
    };

    for (const segment of richSegments) {
      const segBoundaries = boundaries.filter(b => b.index >= segment.from && b.index <= segment.to);

      let pos = segment.from;

      for (const boundary of segBoundaries) {
        if (boundary.index > pos) {
          const sliceText = segment.text.slice(pos - segment.from, boundary.index - segment.from);

          /* v8 ignore next 3 */
          if (sliceText.length > 0) {
            bufferText(sliceText, segment.styles);
          }
        }

        const isTrailingCursorBoundary = boundary.kind === "cursor"
          && boundary.index === segment.to
          && segment !== richSegments[richSegments.length - 1];

        pos = boundary.index;

        if (isTrailingCursorBoundary) {
          continue;
        }

        if (boundary.kind === "selStart") {
          flushRun();
          openSelections.add(boundary.cursorId);
        }
        /* v8 ignore start */
        else if (boundary.kind === "selEnd") {
          flushRun();
          openSelections.delete(boundary.cursorId);
        }
        else if (boundary.kind === "cursor") {
          const cursor = state.cursors[boundary.cursorId];

          if (cursor !== undefined && !cursor.renderOptions.visible) {
            continue;
          }

          flushRun();

          const cursorEl = document.createElement("span");
          const opts = cursor?.renderOptions;

          cursorEl.className = "typewriter-cursor";

          if (opts?.className !== undefined && opts.className.trim().length > 0) {
            const extraClasses = opts.className.trim().split(/\s+/).filter(Boolean);

            cursorEl.classList.add(...extraClasses);
          }

          if (opts?.kind !== undefined) {
            cursorEl.dataset.cursorKind = opts.kind;
          }

          if (opts?.content !== undefined) {
            cursorEl.textContent = opts.content;
          }

          if (opts?.attrs !== undefined) {
            for (const [attrKey, attrValue] of Object.entries(opts.attrs)) {
              cursorEl.setAttribute(attrKey, attrValue);
            }
          }

          this._applyCursorAnimation(cursorEl, opts?.animation ?? "blink");

          cursorEl.setAttribute("aria-hidden", "true");
          cursorEl.dataset.cursorId = boundary.cursorId;
          fragment.appendChild(cursorEl);
        }
        /* v8 ignore stop */
      }

      if (pos < segment.to) {
        const remainingText = segment.text.slice(pos - segment.from);

        /* v8 ignore next 3 */
        if (remainingText.length > 0) {
          bufferText(remainingText, segment.styles);
        }
      }
    }

    flushRun();

    this._target.innerHTML = "";
    this._target.appendChild(fragment);
  }

  /**
   * @description
   * Append a styled (or plain) text node to the fragment.
   * When styles are present, wraps in one span per style ref (innermost = last applied).
   * When a selection is active, adds the outermost selection highlight span.
   *
   * @param fragment - The document fragment to append to
   * @param text - The text content to append
   * @param styles - The style refs to apply, ordered from first-applied (outermost) to last
   * @param openSelections - The set of currently open selection cursor ids
   */
  private _appendStyledText(
    fragment: DocumentFragment,
    text: string,
    styles: readonly TStyleRef[],
    openSelections: ReadonlySet<string>,
  ): void {
    const hasStyle = styles.length > 0;
    const hasSelection = openSelections.size > 0;

    if (hasStyle || hasSelection) {
      let current: Node = document.createTextNode(text);

      // Wrap in one span per style ref, innermost = last style applied
      for (let i = styles.length - 1; i >= 0; i--) {
        const el = document.createElement("span");

        this._applySingleStyleRef(el, styles[i]!);
        el.appendChild(current);
        current = el;
      }

      // Selection highlight is the outermost wrapper
      if (hasSelection) {
        const selEl = document.createElement("span");

        selEl.classList.add("typewriter-selection");
        selEl.appendChild(current);
        current = selEl;
      }

      fragment.appendChild(current);
    }
    else {
      fragment.appendChild(document.createTextNode(text));
    }
  }
}

/**
 * @description
 * Create a new DomRenderer targeting a CSS selector or element
 *
 * @param target - A CSS selector string or an Element to render into
 * @returns A fresh DomRenderer
 */
export function domRenderer(target: string | Element): DomRenderer {
  return new DomRenderer(target);
}
