import type { TNullable } from "@eoussama/core";
import type { IRenderer } from "../../core/renderer/renderer.interface";

import type { TTypewriterState } from "../../core/state/typewriter-state.type";



/**
 * @description
 * A DOM renderer that writes the current typewriter state into a target HTML element.
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

    if (this._target !== null) {
      this._target.textContent = state.document.text;
    }
  }

  /**
   * @description
   * Update the target element with the latest document text
   *
   * @param state - The current typewriter state
   */
  render(state: TTypewriterState): void {
    if (this._target !== null) {
      this._target.textContent = state.document.text;
    }
  }

  /**
   * @description
   * Release the reference to the target element
   */
  unmount(): void {
    this._target = null;
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
