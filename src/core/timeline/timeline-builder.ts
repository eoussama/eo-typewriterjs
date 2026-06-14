import type { TAdvanceModeInput, TCursorSelector } from "../commands/type-command.type";
import type { TCommand } from "../compiler/compile.helper";
import type { TStyleRef } from "../state/rich-text-document.type";

import { ECommandKind } from "../commands/command-kind.enum";



/**
 * @description
 * Options accepted by the `delete` builder method
 */
export type TDeleteOptions = {
  readonly by?: TAdvanceModeInput;
  readonly interval?: number;
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Options accepted by the `moveCursor` builder method
 */
export type TMoveCursorOptions = {
  readonly cursor?: TCursorSelector;
};



let commandCounter = 0;

/**
 * @description
 * Options accepted by the `type` builder method
 */
export type TTypeOptions = {
  readonly by?: TAdvanceModeInput;
  readonly interval?: number;
  readonly style?: TStyleRef;
  readonly cursor?: TCursorSelector;
};

/**
 * @description
 * Fluent builder that accumulates user commands into an ordered command list.
 * Commands are not executed immediately — they are compiled and played by the player.
 */
export class TimelineBuilder {
  private readonly _commands: TCommand[] = [];

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
   * Schedule a wait command that pauses the timeline for a given duration
   *
   * @param duration - The duration to wait in milliseconds
   * @returns This builder instance for future chaining
   */
  wait(duration: number): this {
    this._commands.push({
      id: `cmd_${++commandCounter}`,
      kind: ECommandKind.WAIT,
      duration,
    });

    return this;
  }

  /**
   * @description
   * Schedule a move-cursor command that teleports the cursor to an absolute document index.
   * This command is instant and does not advance the timeline clock.
   *
   * @param index - The absolute document index to move the cursor to
   * @param options - Optional configuration (cursor id)
   * @returns This builder instance for future chaining
   */
  moveCursor(index: number, options?: TMoveCursorOptions): this {
    this._commands.push({
      id: `cmd_${++commandCounter}`,
      kind: ECommandKind.MOVE_CURSOR,
      cursor: options?.cursor ?? "main",
      index,
    });

    return this;
  }

  /**
   * @description
   * Schedule a delete command that removes text backward from the cursor
   *
   * @param count - The number of units to delete
   * @param options - Optional delete configuration (advance mode, interval, cursor)
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
    });

    return this;
  }

  /**
   * @description
   * Schedule a type command that inserts text into the document
   *
   * @param text - The text to type
   * @param options - Optional typing configuration (advance mode, interval, style, cursor)
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
    });

    return this;
  }
}
