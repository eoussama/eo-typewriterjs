import type { TMoveCommand } from "../commands/move-command.type";
import type { TMoveEvent } from "../events/move-event.type";

import { normalizeCursors } from "../commands/normalize-cursors.helper";
import { EEventKind } from "../events/event-kind.enum";



let moveEventCounter = 0;

/**
 * @description
 * Compile a single TMoveCommand into TMoveEvents, one per targeted cursor.
 * A zero offset produces no events (no-op).
 * All events are placed at the current start time and do not advance the clock.
 *
 * @param command - The move command to compile
 * @param startTime - The absolute time offset at which this command is placed
 * @returns An object containing the produced events and the unchanged end time
 */
export function compileMove(
  command: TMoveCommand,
  startTime: number,
): { events: TMoveEvent[]; endTime: number } {
  if (command.offset === 0) {
    return { events: [], endTime: startTime };
  }

  const cursorIds = normalizeCursors(command.cursor);

  const events: TMoveEvent[] = cursorIds.map(cursorId => ({
    id: `move_event_${++moveEventCounter}`,
    kind: EEventKind.MOVE,
    time: startTime,
    cursorId,
    offset: command.offset,
    by: command.by ?? "char",
    sourceCommandId: command.id,
  }));

  return { events, endTime: startTime };
}
