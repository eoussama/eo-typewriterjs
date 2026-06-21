import type { TCommand } from "../../commands";
import type { TCallbackFn } from "../../commands/types/callback-hook.type";
import type { TDeleteValue } from "../../commands/types/delete-command.type";
import type { TMoveValue } from "../../commands/types/move-command.type";
import type { TSelectValue } from "../../commands/types/select-command.type";
import type { TStyleRange } from "../../commands/types/style-command.type";
import type { TStyleRef } from "../../state/types/rich-text-document.type";
import type { TCommandHookOptions, TDeleteOptions, TMoveOptions, TSelectOptions, TStyleOptions, TTypeOptions, TUnselectOptions, TUnstyleOptions, TWaitOptions } from "../types/timeline-options.type";

import { ECommandKind } from "../../commands/enums/command-kind.enum";



export type { TCommandHookOptions, TDeleteOptions, TMoveOptions, TSelectOptions, TStyleOptions, TTypeOptions, TUnselectOptions, TUnstyleOptions, TWaitOptions } from "../types/timeline-options.type";



let commandCounter = 0;

/**
 * @description
 * Fluent builder that accumulates user commands into an ordered command list.
 * Commands are not executed immediately - they are compiled and played by the player.
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
   * Schedule a select command that creates a text selection
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
   * Schedule a move command that moves the cursor
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
   * Schedule a delete command that removes text
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
   * Schedule a style command that applies a style to a document range or cursor selection
   *
   * @param styleRef - The style reference to apply
   * @param range - The target range
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
   * Schedule an unselect command that removes the active text selection
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
   * Schedule an unstyle command that removes styles overlapping a document range or cursor selection
   *
   * @param range - The target range
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
   * Schedule a call command that invokes a callback function as a named step in the timeline
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
