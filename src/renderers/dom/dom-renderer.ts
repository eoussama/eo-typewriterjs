import type { TNullable } from "@eoussama/core";
import type { IRenderer } from "../../core/renderer/renderer.interface";

import type { TSelectionState, TTypewriterState } from "../../core/state/typewriter-state.type";



/**
 * @description
 * A boundary point used to segment the document text for multi-cursor/multi-selection rendering
 */
type TBoundary = {
  readonly index: number;
  readonly kind: "cursor" | "selStart" | "selEnd";
  readonly cursorId: string;
};

/**
 * @description
 * A DOM renderer that writes the current typewriter state into a target HTML element.
 * All active cursors are rendered as inline elements at their correct document positions.
 * All active per-cursor selections are rendered as highlighted spans.
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
   * Paint the document text into the target element.
   * Segments the text at every cursor position and selection boundary,
   * rendering cursor markers and selection highlights at their correct positions.
   *
   * @param state - The typewriter state to render
   */
  private _paint(state: TTypewriterState): void {
    if (this._target === null) {
      return;
    }

    const text = state.document.text;

    // Collect all boundaries (cursor positions + selection start/end)
    const boundaries: TBoundary[] = [];

    for (const cursor of Object.values(state.cursors)) {
      boundaries.push({ index: cursor.index, kind: "cursor", cursorId: cursor.id });
    }

    for (const [cursorId, sel] of Object.entries(state.selections) as [string, TSelectionState][]) {
      boundaries.push({ index: sel.from, kind: "selStart", cursorId });
      boundaries.push({ index: sel.to, kind: "selEnd", cursorId });
    }

    // Sort boundaries by index; within same index: selStart < cursor < selEnd
    const kindOrder: Record<TBoundary["kind"], number> = { selStart: 0, cursor: 1, selEnd: 2 };

    boundaries.sort((a, b) => a.index - b.index || kindOrder[a.kind] - kindOrder[b.kind]);

    // Build fragment
    const fragment = document.createDocumentFragment();
    let pos = 0;
    const openSelections = new Set<string>();

    for (const boundary of boundaries) {
      // Flush text from pos to boundary.index
      const segment = text.slice(pos, boundary.index);

      if (segment.length > 0) {
        if (openSelections.size > 0) {
          const selEl = document.createElement("span");

          selEl.className = "typewriter-selection";
          selEl.textContent = segment;
          fragment.appendChild(selEl);
        }
        else {
          fragment.appendChild(document.createTextNode(segment));
        }
      }

      pos = boundary.index;

      if (boundary.kind === "selStart") {
        openSelections.add(boundary.cursorId);
      }
      else if (boundary.kind === "selEnd") {
        openSelections.delete(boundary.cursorId);
      }
      else if (boundary.kind === "cursor") {
        const cursorEl = document.createElement("span");

        cursorEl.className = "typewriter-cursor";
        cursorEl.setAttribute("aria-hidden", "true");
        cursorEl.dataset.cursorId = boundary.cursorId;
        fragment.appendChild(cursorEl);
      }
    }

    // Flush remaining text
    const tail = text.slice(pos);

    if (tail.length > 0) {
      if (openSelections.size > 0) {
        const selEl = document.createElement("span");

        selEl.className = "typewriter-selection";
        selEl.textContent = tail;
        fragment.appendChild(selEl);
      }
      else {
        fragment.appendChild(document.createTextNode(tail));
      }
    }

    this._target.innerHTML = "";
    this._target.appendChild(fragment);
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
