import type { TDeleteCommand } from "../commands/delete-command.type";
import type { TTypeCommand } from "../commands/type-command.type";
import type { TWaitCommand } from "../commands/wait-command.type";
import type { TTimelineEvent } from "../events/timeline-event.type";

import { ECommandKind } from "../commands/command-kind.enum";
import { compileDelete } from "./compile-delete.helper";
import { compileType } from "./compile-type.helper";



/**
 * @description
 * A union of all supported command types.
 */
export type TCommand = TTypeCommand | TWaitCommand | TDeleteCommand;

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
        const result = compileType(command as TTypeCommand, cursor);

        events.push(...result.events);
        cursor = result.endTime;
        break;
      }

      case ECommandKind.WAIT: {
        cursor += (command as TWaitCommand).duration;
        break;
      }

      case ECommandKind.DELETE: {
        const result = compileDelete(command as TDeleteCommand, cursor);

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
