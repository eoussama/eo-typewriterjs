import type { TCallCommand } from "../commands/call-command.type";
import type { TDeleteCommand } from "../commands/delete-command.type";
import type { TMoveCommand } from "../commands/move-command.type";
import type { TSelectCommand } from "../commands/select-command.type";
import type { TStyleCommand } from "../commands/style-command.type";
import type { TTypeCommand } from "../commands/type-command.type";
import type { TUnselectCommand } from "../commands/unselect-command.type";
import type { TUnstyleCommand } from "../commands/unstyle-command.type";
import type { TWaitCommand } from "../commands/wait-command.type";
import type { TTimelineEvent } from "../events/timeline-event.type";

import { ECommandKind } from "../commands/command-kind.enum";
import { compileDelete } from "./compile-delete.helper";
import { compileMove } from "./compile-move.helper";
import { compileSelect } from "./compile-select.helper";
import { compileStyle } from "./compile-style.helper";
import { compileType } from "./compile-type.helper";
import { compileUnselect } from "./compile-unselect.helper";
import { compileUnstyle } from "./compile-unstyle.helper";



/**
 * @description
 * A union of all supported command types.
 */
export type TCommand = TTypeCommand | TWaitCommand | TDeleteCommand | TMoveCommand | TSelectCommand | TUnselectCommand | TStyleCommand | TUnstyleCommand | TCallCommand;

/**
 * @description
 * Compile an ordered list of commands into a flat, time-sorted list of
 * scheduled playback events. Commands are placed sequentially, each command
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

      case ECommandKind.MOVE: {
        const result = compileMove(command as TMoveCommand, cursor);

        events.push(...result.events);
        cursor = result.endTime;
        break;
      }

      case ECommandKind.SELECT: {
        const result = compileSelect(command as TSelectCommand, cursor);

        events.push(...result.events);
        cursor = result.endTime;
        break;
      }

      case ECommandKind.UNSELECT: {
        const result = compileUnselect(command as TUnselectCommand, cursor);

        events.push(...result.events);
        // endTime unchanged, unselect is instant
        break;
      }

      case ECommandKind.STYLE: {
        const result = compileStyle(command as TStyleCommand, cursor);

        events.push(...result.events);
        // endTime unchanged, style is instant
        break;
      }

      case ECommandKind.UNSTYLE: {
        const result = compileUnstyle(command as TUnstyleCommand, cursor);

        events.push(...result.events);
        // endTime unchanged, unstyle is instant
        break;
      }

      case ECommandKind.CALL:
        // call commands emit no timeline events, they are handled at runtime by the executor
        break;

      default:
        break;
    }
  }

  return events.sort((a, b) => a.time - b.time);
}
