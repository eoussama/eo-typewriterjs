import type { TNullable } from "@eoussama/core";
import type { IRenderer } from "../../core/renderer/renderer.interface";

import type { TTypewriterState } from "../../core/state/typewriter-state.type";

import { mergeStyles, segmentRichText } from "../../core/state/segment-rich-text.helper";



/**
 * @description
 * A headless renderer that stores the latest typewriter state in memory.
 * Useful for testing, server-side rendering, and string snapshot assertions.
 *
 * `toString()` returns the plain text content (marks ignored).
 * `toAnsiString()` applies ANSI escape sequences from style marks that provide an `ansi` map.
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

  /**
   * @description
   * Return the document text with ANSI escape sequences applied from style marks.
   * Only marks that include an `ansi` map contribute escape sequences.
   * Segments without any ANSI styles are emitted as plain text.
   * The string is always terminated with the ANSI reset sequence when any styling was applied.
   *
   * @returns A string with ANSI escape codes applied, or plain text if no ANSI styles are present
   */
  toAnsiString(): string {
    if (this._state === null) {
      return "";
    }

    const segments = segmentRichText(this._state.document);

    if (segments.length === 0) {
      return "";
    }

    let result = "";
    let anyAnsi = false;

    for (const segment of segments) {
      if (segment.styles.length === 0) {
        result += segment.text;
        continue;
      }

      const merged = mergeStyles(segment.styles);

      if (merged.ansi === undefined || Object.keys(merged.ansi).length === 0) {
        result += segment.text;
        continue;
      }

      anyAnsi = true;
      const codes = Object.values(merged.ansi).join(";");

      result += `\x1B[${codes}m${segment.text}\x1B[0m`;
    }

    return anyAnsi ? result : this._state.document.text;
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
