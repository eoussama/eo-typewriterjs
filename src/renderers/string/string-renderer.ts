import type { TNullable } from "@eoussama/core";
import type { IRenderer } from "../../core/renderer/renderer.interface";

import type { TTypewriterState } from "../../core/state/typewriter-state.type";



/**
 * @description
 * A headless renderer that stores the latest typewriter state in memory.
 * Useful for testing, server-side rendering, and string snapshot assertions.
 * Style marks are preserved in state but not reflected in `toString()` output.
 */
export class StringRenderer implements IRenderer {
  private _state: TNullable<TTypewriterState> = null;

  /**
   * @description
   * Capture the initial state on mount
   *
   * @param state - The initial typewriter state
   */
  mount(state: TTypewriterState): void {
    this._state = state;
  }

  /**
   * @description
   * Store the latest typewriter state
   *
   * @param state - The current typewriter state
   */
  render(state: TTypewriterState): void {
    this._state = state;
  }

  /**
   * @description
   * Return the plain text content of the current document state
   *
   * @returns The current document text, or an empty string if nothing has been rendered
   */
  toString(): string {
    return this._state?.document.text ?? "";
  }
}

/**
 * @description
 * Create a new StringRenderer instance
 *
 * @returns A fresh StringRenderer
 */
export function stringRenderer(): StringRenderer {
  return new StringRenderer();
}
