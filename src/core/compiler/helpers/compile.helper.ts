import type { TTimelineEvent } from "../../events/types/timeline-event.type";

import type { TCommand } from "../types/command.type";
import type { TCompileResult } from "../types/compile-result.type";
import { ECommandKind } from "../../commands/enums/command-kind.enum";
import { compileDelete } from "./compile-delete.helper";
import { compileMove } from "./compile-move.helper";
import { compileSelect } from "./compile-select.helper";
import { compileStyle } from "./compile-style.helper";
import { compileType } from "./compile-type.helper";
import { compileUnselect } from "./compile-unselect.helper";
import { compileUnstyle } from "./compile-unstyle.helper";



export type { TCommand } from "../types/command.type";



/**
 * @description
 * Compile a single command into its timed events, starting at the given time.
 * `wait` and `call` produce no events; `wait` only advances the clock.
 *
 * @param command - The command to compile
 * @param startTime - The absolute time at which the command begins
 * @returns The produced events and the time at which the next command starts
 */
export function compileCommand(command: TCommand, startTime: number): TCompileResult<TTimelineEvent> {
  switch (command.kind) {
    case ECommandKind.TYPE:
      return compileType(command, startTime);

    case ECommandKind.DELETE:
      return compileDelete(command, startTime);

    case ECommandKind.MOVE:
      return compileMove(command, startTime);

    case ECommandKind.SELECT:
      return compileSelect(command, startTime);

    case ECommandKind.UNSELECT:
      return compileUnselect(command, startTime);

    case ECommandKind.STYLE:
      return compileStyle(command, startTime);

    case ECommandKind.UNSTYLE:
      return compileUnstyle(command, startTime);

    case ECommandKind.WAIT:
      return { events: [], endTime: startTime + command.duration };

    // Calls produce no events, and unknown kinds are ignored.
    default:
      return { events: [], endTime: startTime };
  }
}

/**
 * @description
 * Compile an ordered list of commands into a flat, time-sorted list of
 * scheduled playback events. Commands are placed sequentially, each command
 * starts after the last event of the previous command.
 *
 * @param commands - The ordered command list from the timeline builder
 * @returns A flat array of TTimelineEvents sorted by absolute time
 */
export function compile(commands: readonly TCommand[]): TTimelineEvent[] {
  const events: TTimelineEvent[] = [];
  let cursor = 0;

  for (const command of commands) {
    const result = compileCommand(command, cursor);

    events.push(...result.events);
    cursor = result.endTime;
  }

  // Multi-cursor commands emit each cursor's events in turn; the stable sort interleaves them by time.
  return events.sort((a, b) => a.time - b.time);
}
