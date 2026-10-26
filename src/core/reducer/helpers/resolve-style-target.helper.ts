import type { TStyleTarget } from "../../events/types/style-target.type";
import type { TSelectionState, TTypewriterState } from "../../state/types/typewriter-state.type";



/**
 * @description
 * Resolve the concrete document range of a style or unstyle event.
 * Fixed ranges are clamped to the current text; selection targets use the cursor's
 * active selection.
 *
 * @param state - The current typewriter state
 * @param target - The event's style target
 * @returns The non-empty range to act on, or null when there is nothing to act on
 */
export function resolveStyleTarget(state: TTypewriterState, target: TStyleTarget): TSelectionState | null {
  if (target.mode === "selection") {
    return state.selections[target.cursorId] ?? null;
  }

  const length = state.document.text.length;
  const from = Math.max(0, Math.min(length, target.from));
  const to = Math.max(0, Math.min(length, target.to));

  return from < to ? { from, to } : null;
}
