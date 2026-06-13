import type { TTypeCommand } from "../commands/type-command.type";
import type { TTimelineEvent } from "../events/timeline-event.type";

import { ECommandKind } from "../commands/command-kind.enum";
import { compileType } from "./compile-type.helper";



/**
 * @description
 * A union of all supported command types.
 * Additional command kinds will be added in future phases.
 */
export type TCommand = TTypeCommand;

/**
 * @description
 * Compile an ordered list of commands into a flat, time-sorted list of
 * scheduled playback events. Commands are placed sequentially — each command
 * starts after the last event of the previous command.
 *
 * @param commands - The ordered command list from the timeline builder
 * @returns A flat array of TTimelineEvents sorted by absolute time
 */
export function compile(commands: TCommand[]): TTimelineEvent[] {
  const events: TTimelineEvent[] = [];
  let cursor = 0;

  for (const command of commands) {
    switch (command.kind) {
      case ECommandKind.TYPE: {
        const result = compileType(command, cursor);

        events.push(...result.events);
        cursor = result.endTime;
        break;
      }

      default:
        break;
    }
  }

  return events.sort((a, b) => a.time - b.time);
}
