import type { TNullable } from "@eoussama/core";

import type { TCursorRenderOptions, TResolvedCursorRenderOptions } from "../cursor/cursor-render-options.type";
import type { TCursorState } from "./cursor-state.type";
import type { TRichTextDocument } from "./rich-text-document.type";

import { DEFAULT_CURSOR_RENDER_OPTIONS, mergeCursorOptions } from "../cursor/cursor-render-options.type";



/**
 * @description
 * An active text selection range within the document owned by a specific cursor.
 * `from` is the start index (inclusive) and `to` is the end index (exclusive),
 * always in document string index space.
 */
export type TSelectionState = {
  readonly from: number;
  readonly to: number;
};

/**
 * @description
 * The full runtime state of the typewriter at any point in time
 */
export type TTypewriterState = {
  readonly document: TRichTextDocument;
  readonly cursors: Readonly<Record<string, TCursorState>>;
  /**
   * Per-cursor selection map. Keys are cursor ids.
   * A cursor has no active selection when its id is absent from the map.
   */
  readonly selections: Readonly<Record<string, TSelectionState>>;
};

/**
 * @description
 * Create the default initial typewriter state with a single main cursor.
 * An optional cursor render options object is merged with the library defaults.
 *
 * @param cursorOptions - Optional partial render options to apply to all initial cursors
 * @returns A fresh initial TTypewriterState
 */
export function createInitialState(cursorOptions?: TCursorRenderOptions): TTypewriterState {
  const resolvedOptions: TResolvedCursorRenderOptions = cursorOptions !== undefined
    ? mergeCursorOptions(DEFAULT_CURSOR_RENDER_OPTIONS, cursorOptions)
    : DEFAULT_CURSOR_RENDER_OPTIONS;

  return {
    document: {
      text: "",
      styles: [],
    },
    cursors: {
      main: {
        id: "main",
        index: 0,
        visible: resolvedOptions.visible,
        renderOptions: resolvedOptions,
      },
    },
    selections: {},
  };
}

/**
 * @description
 * Return a new state with the selection for the given cursor set.
 * If `from === to` the selection is cleared instead.
 *
 * @param state - The current typewriter state
 * @param cursorId - The cursor id that owns this selection
 * @param from - The start index of the selection (inclusive)
 * @param to - The end index of the selection (exclusive)
 * @returns A new TTypewriterState with the selection updated
 */
export function withSelection(
  state: TTypewriterState,
  cursorId: string,
  from: number,
  to: number,
): TTypewriterState {
  if (from === to) {
    return withSelectionCleared(state, cursorId);
  }

  return {
    ...state,
    selections: {
      ...state.selections,
      [cursorId]: { from, to },
    },
  };
}

/**
 * @description
 * Return a new state with the selection for the given cursor cleared.
 * If the cursor had no selection the same state is returned.
 *
 * @param state - The current typewriter state
 * @param cursorId - The cursor id whose selection should be cleared
 * @returns A new TTypewriterState with the selection removed
 */
export function withSelectionCleared(state: TTypewriterState, cursorId: string): TTypewriterState {
  if (!(cursorId in state.selections)) {
    return state;
  }

  const { [cursorId]: _removed, ...rest } = state.selections;

  return { ...state, selections: rest };
}

/**
 * @description
 * Ensure a cursor exists in state, creating it at index 0 if absent.
 *
 * @param state - The current typewriter state
 * @param cursorId - The cursor id to ensure exists
 * @returns A new TTypewriterState (or the same one if cursor already exists)
 */
export function withCursor(state: TTypewriterState, cursorId: string): TTypewriterState {
  if (cursorId in state.cursors) {
    return state;
  }

  // Inherit render options from the main cursor so additional cursors look the same by default
  const mainCursor = state.cursors.main;
  const inheritedOptions: TResolvedCursorRenderOptions = mainCursor !== undefined
    ? mainCursor.renderOptions
    : DEFAULT_CURSOR_RENDER_OPTIONS;

  return {
    ...state,
    cursors: {
      ...state.cursors,
      [cursorId]: {
        id: cursorId,
        index: 0,
        visible: inheritedOptions.visible,
        renderOptions: inheritedOptions,
      },
    },
  };
}

/**
 * @description
 * Retrieve a nullable selection for a cursor from state
 *
 * @param state - The current typewriter state
 * @param cursorId - The cursor id to look up
 * @returns The TSelectionState for the cursor, or null if no selection exists
 */
export function getSelection(state: TTypewriterState, cursorId: string): TNullable<TSelectionState> {
  return state.selections[cursorId] ?? null;
}
