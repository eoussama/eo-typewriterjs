import type { TNullable } from "@eoussama/core";
import type { TCursorAnimation, TCursorAnimationOptions, TResolvedCursorRenderOptions } from "../../core/cursor/types/cursor-render-options.type";
import type { IRenderer } from "../../core/renderer/interfaces/renderer.interface";
import type { TStyleRef } from "../../core/state/types/rich-text-document.type";
import type { TTypewriterState } from "../../core/state/types/typewriter-state.type";

import { resolveStyleRef } from "../../core/state/helpers/segment-rich-text.helper";



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
// Attribute and style helpers
// ---------------------------------------------------------------------------

/**
 * @description
 * Attributes whose value is navigated to or loaded as a URL
 */
const URL_ATTRIBUTES: ReadonlySet<string> = new Set(["href", "src", "action", "formaction", "xlink:href"]);

/**
 * @description
 * Decide whether an attribute from a style or cursor `attrs` map may be set.
 * Event handler attributes (`on*`) and script URLs are rejected, so style data
 * cannot be used to run code.
 *
 * @param name - The attribute name
 * @param value - The attribute value
 * @returns Whether the attribute is safe to set
 */
function isSafeAttribute(name: string, value: string): boolean {
  const lowerName = name.toLowerCase();

  if (lowerName.startsWith("on")) {
    return false;
  }

  if (!URL_ATTRIBUTES.has(lowerName)) {
    return true;
  }

  // Browsers ignore whitespace and control characters inside the URL scheme.
  // eslint-disable-next-line no-control-regex
  const compact = value.replace(/[\s\u0000-\u001F]/g, "").toLowerCase();

  return !compact.startsWith("javascript:") && !compact.startsWith("vbscript:");
}

/**
 * @description
 * Set the safe entries of an `attrs` map on an element
 *
 * @param el - The element to update
 * @param attrs - The attributes to set
 */
function applyAttributes(el: Element, attrs: Readonly<Record<string, string>>): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (isSafeAttribute(name, value)) {
      el.setAttribute(name, value);
    }
  }
}

/**
 * @description
 * Set an inline style property. Custom properties (`--name`) and kebab-case names go
 * through `setProperty`; camelCase names are assigned directly.
 *
 * @param el - The element to style
 * @param prop - The CSS property name
 * @param value - The CSS value
 */
function setStyleProperty(el: HTMLElement, prop: string, value: string): void {
  if (prop.includes("-")) {
    el.style.setProperty(prop, value);
  }
  else {
    (el.style as unknown as Record<string, string>)[prop] = value;
  }
}

/**
 * @description
 * Split a space-separated class string into its non-empty class names
 *
 * @param className - The class string
 * @returns The individual class names
 */
function splitClasses(className: string): string[] {
  return className.match(/\S+/g) ?? [];
}

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
      const target = document.querySelector(this._selector);

      if (target === null) {
        throw new Error(`DomRenderer: no element matches the selector "${this._selector}".`);
      }

      this._target = target;
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

    // Attributes go first so a `class` attribute cannot wipe the style's classes.
    if (resolved.attrs !== undefined) {
      applyAttributes(el, resolved.attrs);
    }

    if (resolved.className !== undefined) {
      el.classList.add(...splitClasses(resolved.className));
    }

    if (resolved.css !== undefined) {
      for (const [prop, value] of Object.entries(resolved.css)) {
        setStyleProperty(el, prop, value);
      }
    }
  }

  /**
   * @description
   * Create the element of a visible cursor
   *
   * @param cursorId - The cursor id
   * @param opts - The cursor's render options
   * @returns The cursor element
   */
  private _createCursor(cursorId: string, opts: TResolvedCursorRenderOptions): HTMLElement {
    const cursorEl = document.createElement("span");

    // Attributes go first so a `class` attribute cannot wipe the cursor classes.
    applyAttributes(cursorEl, opts.attrs);
    cursorEl.classList.add("typewriter-cursor", ...splitClasses(opts.className));
    cursorEl.dataset.cursorKind = opts.kind;
    cursorEl.textContent = opts.content;
    this._applyCursorAnimation(cursorEl, opts.animation);
    cursorEl.setAttribute("aria-hidden", "true");
    cursorEl.dataset.cursorId = cursorId;

    return cursorEl;
  }

  /**
   * @description
   * Paint the document into the target element.
   * The text is cut at every style edge, cursor and selection edge. Visible cursors are
   * drawn at their cut point, and the text between cut points is wrapped in its style
   * and selection spans. Adjacent pieces with the same styles and selections are merged
   * into one run to keep the DOM small.
   *
   * @param state - The typewriter state to render
   */
  private _paint(state: TTypewriterState): void {
    if (this._target === null) {
      return;
    }

    const { text, styles } = state.document;
    const clamp = (index: number): number => Math.max(0, Math.min(text.length, index));
    const cursors = Object.values(state.cursors).filter(cursor => cursor.renderOptions.visible);
    const selections = Object.entries(state.selections);

    const points = [...new Set([
      0,
      text.length,
      ...styles.flatMap(entry => [clamp(entry.from), clamp(entry.to)]),
      ...cursors.map(cursor => clamp(cursor.index)),
      ...selections.flatMap(([, sel]) => [clamp(sel.from), clamp(sel.to)]),
    ])].sort((a, b) => a - b);

    const fragment = document.createDocumentFragment();
    // Declared through a cast: assignments made inside `flush` are invisible to narrowing.
    let run = null as { text: string; styles: readonly TStyleRef[]; selected: boolean; key: string } | null;

    const flush = (): void => {
      if (run !== null) {
        this._appendStyledText(fragment, run.text, run.styles, run.selected);
        run = null;
      }
    };

    for (const [i, from] of points.entries()) {
      for (const cursor of cursors) {
        if (clamp(cursor.index) === from) {
          flush();
          fragment.appendChild(this._createCursor(cursor.id, cursor.renderOptions));
        }
      }

      const to = points[i + 1];

      if (to === undefined) {
        break;
      }

      const active = styles.filter(entry => entry.from <= from && entry.to >= to).map(entry => entry.style);
      const selectedBy = selections.filter(([, sel]) => sel.from <= from && sel.to >= to).map(([id]) => id);
      const key = JSON.stringify([active, selectedBy]);

      if (run?.key === key) {
        run.text += text.slice(from, to);
      }
      else {
        flush();
        run = { text: text.slice(from, to), styles: active, selected: selectedBy.length > 0, key };
      }
    }

    flush();
    this._target.replaceChildren(fragment);
  }

  /**
   * @description
   * Append a styled (or plain) text node to the fragment.
   * When styles are present, wraps in one span per style ref (innermost = last applied).
   * When selected, adds the outermost selection highlight span.
   *
   * @param fragment - The document fragment to append to
   * @param text - The text content to append
   * @param styles - The style refs to apply, ordered from first-applied (outermost) to last
   * @param selected - Whether the text is inside a selection
   */
  private _appendStyledText(
    fragment: DocumentFragment,
    text: string,
    styles: readonly TStyleRef[],
    selected: boolean,
  ): void {
    let current: Node = document.createTextNode(text);

    // Wrap in one span per style ref, innermost = last style applied
    for (let i = styles.length - 1; i >= 0; i--) {
      const el = document.createElement("span");

      this._applySingleStyleRef(el, styles[i]!);
      el.appendChild(current);
      current = el;
    }

    // Selection highlight is the outermost wrapper
    if (selected) {
      const selEl = document.createElement("span");

      selEl.classList.add("typewriter-selection");
      selEl.appendChild(current);
      current = selEl;
    }

    fragment.appendChild(current);
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
