import type { TNullable } from "@eoussama/core";
import type { IRenderer } from "../../core/renderer/interfaces/renderer.interface";

import type { TTypewriterState } from "../../core/state/types/typewriter-state.type";

import { mergeStyles, segmentRichText } from "../../core/state/helpers/segment-rich-text.helper";



/**
 * @description
 * Control characters other than tab, line feed and carriage return.
 * Stripped from text so typed content cannot inject terminal escape sequences.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u0008\v\f\u000E-\u001F\u007F-\u009F]/g;

/**
 * @description
 * A valid SGR parameter list, such as `1` or `38;5;208`
 */
const SGR_PARAMETERS = /^\d+(?:;\d+)*$/;

/**
 * @description
 * A headless renderer that stores the latest typewriter state in memory.
 * Useful for testing, server-side rendering, and string snapshot assertions.
 *
 * `toString()` returns the plain text content (styles ignored).
 * `toAnsiString()` applies ANSI escape sequences from text styles that provide an `ansi` map.
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
   * Return the document text with ANSI escape sequences applied from text styles.
   * Only styles that include an `ansi` map contribute escape sequences, and only values
   * that are valid SGR parameter lists (digits separated by `;`) are used.
   * Control characters in the text itself are removed so they cannot inject escapes.
   * Segments without any ANSI styles are emitted as plain text.
   * The string is always terminated with the ANSI reset sequence when any styling was applied.
   *
   * @returns A string with ANSI escape codes applied, or plain text if no ANSI styles are present
   */
  toAnsiString(): string {
    if (this._state === null) {
      return "";
    }

    let result = "";

    for (const segment of segmentRichText(this._state.document)) {
      const text = segment.text.replace(CONTROL_CHARACTERS, "");
      const ansi = mergeStyles(segment.styles).ansi ?? {};
      const codes = Object.values(ansi).filter(code => SGR_PARAMETERS.test(code));

      result += codes.length > 0 ? `\x1B[${codes.join(";")}m${text}\x1B[0m` : text;
    }

    return result;
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
