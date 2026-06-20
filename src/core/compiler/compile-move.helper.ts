import type { TMoveCommand } from "../commands/move-command.type";
import type { TMoveEvent } from "../events/move-event.type";

import { normalizeCursors } from "../commands/normalize-cursors.helper";
import { EEventKind } from "../events/event-kind.enum";



let moveEventCounter = 0;

/**
 * @description
 * Compile a single TMoveCommand into TMoveEvents, one per targeted cursor.
 *
 * String operand semantics:
 * - `"start"`: jump to absolute document start — emits one event with boundary="start"
 * - `"end"`: jump to absolute document end — emits one event with boundary="end"
 *
 * Numeric operand semantics:
 * - zero offset produces no events (no-op)
 * - non-zero offset produces a relative-move event
 *
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
  const cursorIds = normalizeCursors(command.cursor);

  if (typeof command.offset === "string") {
    const boundary = command.offset;
    const events: TMoveEvent[] = cursorIds.map(cursorId => ({
      id: `move_event_${++moveEventCounter}`,
      kind: EEventKind.MOVE,
      time: startTime,
      cursorId,
      boundary,
      offset: 0,
      by: command.by ?? "char",
      sourceCommandId: command.id,
    }));

    return { events, endTime: startTime };
  }

  if (command.offset === 0) {
    return { events: [], endTime: startTime };
  }

  const events: TMoveEvent[] = cursorIds.map(cursorId => ({
    id: `move_event_${++moveEventCounter}`,
    kind: EEventKind.MOVE,
    time: startTime,
    cursorId,
    offset: command.offset as number,
    by: command.by ?? "char",
    sourceCommandId: command.id,
  }));

  return { events, endTime: startTime };
}
