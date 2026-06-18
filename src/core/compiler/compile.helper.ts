import type { TCallCommand } from "../commands/call-command.type";
import type { TClearSelectionCommand } from "../commands/clear-selection-command.type";
import type { TDeleteCommand } from "../commands/delete-command.type";
import type { TMarkCommand } from "../commands/mark-command.type";
import type { TMoveCursorCommand } from "../commands/move-cursor-command.type";
import type { TSelectCommand } from "../commands/select-command.type";
import type { TTypeCommand } from "../commands/type-command.type";
import type { TUnmarkCommand } from "../commands/unmark-command.type";
import type { TWaitCommand } from "../commands/wait-command.type";
import type { TTimelineEvent } from "../events/timeline-event.type";

import { ECommandKind } from "../commands/command-kind.enum";
import { compileClearSelection } from "./compile-clear-selection.helper";
import { compileDelete } from "./compile-delete.helper";
import { compileMark } from "./compile-mark.helper";
import { compileMoveCursor } from "./compile-move-cursor.helper";
import { compileSelect } from "./compile-select.helper";
import { compileType } from "./compile-type.helper";
import { compileUnmark } from "./compile-unmark.helper";



/**
 * @description
 * A union of all supported command types.
 */
export type TCommand = TTypeCommand | TWaitCommand | TDeleteCommand | TMoveCursorCommand | TSelectCommand | TClearSelectionCommand | TMarkCommand | TUnmarkCommand | TCallCommand;

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

      case ECommandKind.MOVE_CURSOR: {
        const result = compileMoveCursor(command as TMoveCursorCommand, cursor);

        events.push(...result.events);
        // endTime unchanged, moveCursor is instant
        break;
      }

      case ECommandKind.SELECT: {
        const result = compileSelect(command as TSelectCommand, cursor);

        events.push(...result.events);
        // endTime unchanged, select is instant
        break;
      }

      case ECommandKind.CLEAR_SELECTION: {
        const result = compileClearSelection(command as TClearSelectionCommand, cursor);

        events.push(...result.events);
        // endTime unchanged, clearSelection is instant
        break;
      }

      case ECommandKind.MARK: {
        const result = compileMark(command as TMarkCommand, cursor);

        events.push(...result.events);
        // endTime unchanged, mark is instant
        break;
      }

      case ECommandKind.UNMARK: {
        const result = compileUnmark(command as TUnmarkCommand, cursor);

        events.push(...result.events);
        // endTime unchanged, unmark is instant
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
