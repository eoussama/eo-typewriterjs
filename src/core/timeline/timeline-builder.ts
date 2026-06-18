import type { TAudioCommandOverride } from "../audio/audio-command-override.type";
import type { TCommand } from "../commands";
import type { TCallbackFn, TCallbackHook } from "../commands/callback-hook.type";
import type { TMarkRange } from "../commands/mark-command.type";
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
   * Hook invoked before the command (or before each step when `unit` is set)
   */
  readonly before?: TCallbackHook;

  /**
   * @description
   * Hook invoked after the command (or after each step when `unit` is set)
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
 * Options accepted by the `moveCursor` builder method
 */
export type TMoveCursorOptions = TCommandHookOptions & {
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
 * Options accepted by the `mark` builder method
 */
export type TMarkOptions = TCommandHookOptions & {
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
   * Schedule a select command that creates a text selection relative to the cursor's
   * current position. A positive `count` selects forward; a negative `count` selects backward.
   * The selection is cleared by any subsequent type, delete, or moveCursor command.
   *
   * @param count - Number of units to select; positive = forward, negative = backward
   * @param options - Optional configuration (advance mode, cursor id, lifecycle hooks)
   * @returns This builder instance for future chaining
   */
  select(count: number, options?: TSelectOptions): this {
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
   * Schedule a move-cursor command that teleports the cursor to an absolute document index.
   * This command is instant and does not advance the timeline clock.
   *
   * @param index - The absolute document index to move the cursor to
   * @param options - Optional configuration (cursor id, lifecycle hooks)
   * @returns This builder instance for future chaining
   */
  moveCursor(index: number, options?: TMoveCursorOptions): this {
    this._commands.push({
      id: `cmd_${++commandCounter}`,
      kind: ECommandKind.MOVE_CURSOR,
      cursor: options?.cursor ?? "main",
      index,
      audio: options?.audio,
      before: options?.before,
      after: options?.after,
    });

    this._version++;

    return this;
  }

  /**
   * @description
   * Schedule a delete command that removes text backward from the cursor
   *
   * @param count - The number of units to delete
   * @param options - Optional delete configuration (advance mode, interval, cursor, lifecycle hooks)
   * @returns This builder instance for future chaining
   */
  delete(count: number, options?: TDeleteOptions): this {
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
   * Schedule a mark command that applies a style to a document range or cursor selection.
   * When `range` is `"selection"`, the style is applied to each targeted cursor's current selection.
   * When `range` is a `{ from, to }` object, the style is applied to those absolute document indices.
   * This command is instant and does not advance the timeline clock.
   *
   * @param style - The style reference to apply (class name string or TStyleObject)
   * @param range - The target range — either absolute `{ from, to }` indices or `"selection"`
   * @param options - Optional configuration (cursor id, lifecycle hooks)
   * @returns This builder instance for future chaining
   */
  mark(style: TStyleRef, range: TMarkRange | "selection", options?: TMarkOptions): this {
    this._commands.push({
      id: `cmd_${++commandCounter}`,
      kind: ECommandKind.MARK,
      cursor: options?.cursor ?? "main",
      style,
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
