import type { TNullable } from "@eoussama/core";
import type { IRenderer } from "../../core/renderer/renderer.interface";

import type { TTypewriterState } from "../../core/state/typewriter-state.type";



/**
 * @description
 * A DOM renderer that writes the current typewriter state into a target HTML element.
 * The cursor is rendered as an inline element at the correct document index position,
 * so it visually appears where the cursor actually is rather than always at the end.
 *
 * The target may be specified as a CSS selector string or a direct element reference.
 */
export class DomRenderer implements IRenderer {
  private _target: TNullable<Element> = null;
  private readonly _selector: string | Element;

  /**
   * @description
   * Create a DomRenderer targeting a specific element or CSS selector
   *
   * @param target - A CSS selector string or an Element to render into
   */
  constructor(target: string | Element) {
    this._selector = target;
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
   * Update the target element with the latest document text and inline cursor
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
   * Paint the document text into the target element with the cursor rendered
   * inline at the current cursor index position.
   *
   * @param state - The typewriter state to render
   */
  private _paint(state: TTypewriterState): void {
    if (this._target === null) {
      return;
    }

    const text = state.document.text;
    const cursorIndex = state.cursors.main?.index ?? text.length;

    const before = text.slice(0, cursorIndex);
    const after = text.slice(cursorIndex);

    this._target.innerHTML = "";

    if (before.length > 0) {
      this._target.appendChild(document.createTextNode(before));
    }

    const cursorEl = document.createElement("span");

    cursorEl.className = "typewriter-cursor";
    cursorEl.setAttribute("aria-hidden", "true");
    this._target.appendChild(cursorEl);

    if (after.length > 0) {
      this._target.appendChild(document.createTextNode(after));
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
