import type { TMoveCursorCommand } from "../commands/move-cursor-command.type";
import type { TMoveCursorEvent } from "../events/move-cursor-event.type";

import { EEventKind } from "../events/event-kind.enum";



let moveCursorEventCounter = 0;

/**
 * @description
 * Compile a single TMoveCursorCommand into a single TMoveCursorEvent.
 * The event is placed at the current start time and does not advance the clock.
 *
 * @param command - The move-cursor command to compile
 * @param startTime - The absolute time offset at which this command is placed
 * @returns An object containing the single produced event and the unchanged end time
 */
export function compileMoveCursor(
  command: TMoveCursorCommand,
  startTime: number,
): { events: TMoveCursorEvent[]; endTime: number } {
  const event: TMoveCursorEvent = {
    id: `move_cursor_event_${++moveCursorEventCounter}`,
    kind: EEventKind.MOVE_CURSOR,
    time: startTime,
    cursorId: command.cursor,
    index: command.index,
    sourceCommandId: command.id,
  };

  return { events: [event], endTime: startTime };
}
