import type { TMoveCursorCommand } from "../commands/move-cursor-command.type";
import type { TMoveCursorEvent } from "../events/move-cursor-event.type";

import { normalizeCursors } from "../commands/normalize-cursors.helper";
import { EEventKind } from "../events/event-kind.enum";



let moveCursorEventCounter = 0;

/**
 * @description
 * Compile a single TMoveCursorCommand into TMoveCursorEvents, one per targeted cursor.
 * All events are placed at the current start time and do not advance the clock.
 *
 * @param command - The move-cursor command to compile
 * @param startTime - The absolute time offset at which this command is placed
 * @returns An object containing the produced events and the unchanged end time
 */
export function compileMoveCursor(
  command: TMoveCursorCommand,
  startTime: number,
): { events: TMoveCursorEvent[]; endTime: number } {
  const cursorIds = normalizeCursors(command.cursor);

  const events: TMoveCursorEvent[] = cursorIds.map(cursorId => ({
    id: `move_cursor_event_${++moveCursorEventCounter}`,
    kind: EEventKind.MOVE_CURSOR,
    time: startTime,
    cursorId,
    index: command.index,
    sourceCommandId: command.id,
  }));

  return { events, endTime: startTime };
}
