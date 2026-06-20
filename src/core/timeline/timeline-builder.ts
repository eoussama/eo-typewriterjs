import type { TAudioCommandOverride } from "../audio/audio-command-override.type";
import type { TCommand } from "../commands";
import type { TCallbackFn, TCallbackHook } from "../commands/callback-hook.type";
import type { TDeleteValue } from "../commands/delete-command.type";
import type { TMoveValue } from "../commands/move-command.type";
import type { TSelectValue } from "../commands/select-command.type";
import type { TStyleRange } from "../commands/style-command.type";
import type { TAdvanceModeInput, TCursorSelector } from "../commands/type-command.type";
import type { TStyleRef } from "../state/rich-text-document.type";

import { ECommandKind } from "../commands/command-kind.enum";



/**
 * @description
 * Shared lifecycle hook and runtime override options available on all builder methods
 */
export type TCommandHookOptions = {
  /**
   * @description
   * Hook invoked before each step of the command,
   * or once for instant commands (move, select, style, wait, call)
   */
  readonly before?: TCallbackHook;

  /**
   * @description
   * Hook invoked after each step of the command,
   * or once for instant commands (move, select, style, wait, call)
   */
  readonly after?: TCallbackHook;

  /**
   * @description
   * Per-command audio override.
   * Set to `false` to silence sounds for this command.
   * Set to an object to use a specific voice, voices subset, or volume.
   * When omitted, the typewriter-level audio defaults apply.
   */
  readonly audio?: TAudioCommandOverride;
};

/**
 * @description
 * Options accepted by the `select` builder method
 */
export type TSelectOptions = TCommandHookOptions & {
  readonly by?: TAdvanceModeInput;
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `delete` builder method
 */
export type TDeleteOptions = TCommandHookOptions & {
  readonly by?: TAdvanceModeInput;
  readonly interval?: number;
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `move` builder method
 */
export type TMoveOptions = TCommandHookOptions & {
  readonly by?: TAdvanceModeInput;
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `type` builder method
 */
export type TTypeOptions = TCommandHookOptions & {
  readonly by?: TAdvanceModeInput;
  readonly interval?: number;
  readonly style?: TStyleRef;
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `style` builder method
 */
export type TStyleOptions = TCommandHookOptions & {
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `unselect` builder method
 */
export type TUnselectOptions = TCommandHookOptions & {
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `unstyle` builder method
 */
export type TUnstyleOptions = TCommandHookOptions & {
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `wait` builder method
 */
export type TWaitOptions = TCommandHookOptions;



let commandCounter = 0;

/**
 * @description
 * Fluent builder that accumulates user commands into an ordered command list.
 * Commands are not executed immediately — they are compiled and played by the player.
 *
 * A monotonic `version` counter is incremented whenever commands are appended,
 * allowing playback controllers to detect when their compiled cache is stale.
 */
export class TimelineBuilder {
  private readonly _commands: TCommand[] = [];
  private _version = 0;

  /**
   * @description
   * Return a read-only view of the accumulated commands
   *
   * @returns The current list of commands
   */
  get commands(): ReadonlyArray<TCommand> {
    return this._commands;
  }

  /**
   * @description
   * Monotonically increasing version counter.
   * Incremented on every command append.
   *
   * @returns The current version number
   */
  get version(): number {
    return this._version;
  }

  /**
   * @description
   * Schedule a wait command that pauses the timeline for a given duration
   *
   * @param duration - The duration to wait in milliseconds
   * @param options - Optional lifecycle hooks (before, after)
   * @returns This builder instance for future chaining
   */
  wait(duration: number, options?: TWaitOptions): this {
    this._commands.push({
      id: `cmd_${++commandCounter}`,
      kind: ECommandKind.WAIT,
      duration,
      audio: options?.audio,
      before: options?.before,
      after: options?.after,
    });

    this._version++;

    return this;
  }

  /**
   * @description
   * Schedule a select command that creates a text selection.
   *
   * Operand semantics:
   * - `number`: relative selection; positive = forward, negative = backward
   * - `"start"`: select from cursor to document start
   * - `"end"`: select from cursor to document end
   * - `"whole"`: select the entire document
   *
   * The selection is cleared by any subsequent type, delete, or move command.
   *
   * @param count - Number of units or boundary string
   * @param options - Optional configuration (advance mode, cursor id, lifecycle hooks)
   * @returns This builder instance for future chaining
   */
  select(count: TSelectValue, options?: TSelectOptions): this {
    this._commands.push({
      id: `cmd_${++commandCounter}`,
      kind: ECommandKind.SELECT,
      cursor: options?.cursor ?? "main",
      count,
      by: options?.by,
      audio: options?.audio,
      before: options?.before,
      after: options?.after,
    });

    this._version++;

    return this;
  }

  /**
   * @description
   * Schedule a move command that moves the cursor.
   *
   * Operand semantics:
   * - `number`: relative move; positive = right, negative = left, zero = no-op
   * - `"start"`: jump to absolute document start
   * - `"end"`: jump to absolute document end
   *
   * This command is instant and does not advance the timeline clock.
   *
   * @param offset - Number of units to move or boundary string
   * @param options - Optional configuration (advance mode, cursor id, lifecycle hooks)
   * @returns This builder instance for future chaining
   */
  move(offset: TMoveValue, options?: TMoveOptions): this {
    this._commands.push({
      id: `cmd_${++commandCounter}`,
      kind: ECommandKind.MOVE,
      cursor: options?.cursor ?? "main",
      offset,
      by: options?.by,
      audio: options?.audio,
      before: options?.before,
      after: options?.after,
    });

    this._version++;

    return this;
  }

  /**
   * @description
   * Schedule a delete command that removes text.
   *
   * Operand semantics:
   * - `number`: signed count; positive = forward, negative = backward
   * - `"start"`: delete from cursor back to document start
   * - `"end"`: delete from cursor forward to document end
   * - `"whole"`: delete the entire document
   *
   * @param count - Number of units or boundary string
   * @param options - Optional delete configuration (advance mode, interval, cursor, lifecycle hooks)
   * @returns This builder instance for future chaining
   */
  delete(count: TDeleteValue, options?: TDeleteOptions): this {
    this._commands.push({
      id: `cmd_${++commandCounter}`,
      kind: ECommandKind.DELETE,
      cursor: options?.cursor ?? "main",
      count,
      by: options?.by,
      interval: options?.interval,
      audio: options?.audio,
      before: options?.before,
      after: options?.after,
    });

    this._version++;

    return this;
  }

  /**
   * @description
   * Schedule a type command that inserts text into the document
   *
   * @param text - The text to type
   * @param options - Optional typing configuration (advance mode, interval, style, cursor, lifecycle hooks)
   * @returns This builder instance for future chaining
   */
  type(text: string, options?: TTypeOptions): this {
    this._commands.push({
      id: `cmd_${++commandCounter}`,
      kind: ECommandKind.TYPE,
      cursor: options?.cursor ?? "main",
      text,
      by: options?.by,
      interval: options?.interval,
      style: options?.style,
      audio: options?.audio,
      before: options?.before,
      after: options?.after,
    });

    this._version++;

    return this;
  }

  /**
   * @description
   * Schedule a style command that applies a style to a document range or cursor selection.
   * When `range` is `"selection"`, the style is applied to each targeted cursor's current selection.
   * When `range` is a `{ from, to }` object, the style is applied to those absolute document indices.
   * This command is instant and does not advance the timeline clock.
   *
   * @param styleRef - The style reference to apply (class name string or TStyleObject)
   * @param range - The target range — either absolute `{ from, to }` indices or `"selection"`
   * @param options - Optional configuration (cursor id, lifecycle hooks)
   * @returns This builder instance for future chaining
   */
  style(styleRef: TStyleRef, range: TStyleRange | "selection", options?: TStyleOptions): this {
    this._commands.push({
      id: `cmd_${++commandCounter}`,
      kind: ECommandKind.STYLE,
      cursor: options?.cursor ?? "main",
      style: styleRef,
      range,
      audio: options?.audio,
      before: options?.before,
      after: options?.after,
    });

    this._version++;

    return this;
  }

  /**
   * @description
   * Schedule an unselect command that removes the active text selection for one or more cursors.
   * If the targeted cursor has no active selection the state is left unchanged.
   * This command is instant and does not advance the timeline clock.
   *
   * @param options - Optional configuration (cursor id, lifecycle hooks)
   * @returns This builder instance for future chaining
   */
  unselect(options?: TUnselectOptions): this {
    this._commands.push({
      id: `cmd_${++commandCounter}`,
      kind: ECommandKind.UNSELECT,
      cursor: options?.cursor ?? "main",
      audio: options?.audio,
      before: options?.before,
      after: options?.after,
    });

    this._version++;

    return this;
  }

  /**
   * @description
   * Schedule an unstyle command that removes styles overlapping a document range or cursor selection.
   * Styles that partially overlap the range are clipped rather than fully removed.
   * When `range` is `"selection"`, the styles are removed from each targeted cursor's current selection.
   * When `range` is a `{ from, to }` object, styles overlapping those absolute document indices are affected.
   * This command is instant and does not advance the timeline clock.
   *
   * @param range - The target range, either absolute `{ from, to }` indices or `"selection"`
   * @param options - Optional configuration (cursor id, lifecycle hooks)
   * @returns This builder instance for future chaining
   */
  unstyle(range: TStyleRange | "selection", options?: TUnstyleOptions): this {
    this._commands.push({
      id: `cmd_${++commandCounter}`,
      kind: ECommandKind.UNSTYLE,
      cursor: options?.cursor ?? "main",
      range,
      audio: options?.audio,
      before: options?.before,
      after: options?.after,
    });

    this._version++;

    return this;
  }

  /**
   * @description
   * Schedule a call command that invokes a callback function as a named step in the timeline.
   * The callback may be async — playback waits for the returned promise to settle before
   * advancing to the next command.
   *
   * @param callback - The function to invoke
   * @param options - Optional lifecycle hooks (before, after)
   * @returns This builder instance for future chaining
   */
  call(callback: TCallbackFn, options?: TCommandHookOptions): this {
    this._commands.push({
      id: `cmd_${++commandCounter}`,
      kind: ECommandKind.CALL,
      callback,
      audio: options?.audio,
      before: options?.before,
      after: options?.after,
    });

    this._version++;

    return this;
  }
}
