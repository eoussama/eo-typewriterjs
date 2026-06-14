import type { TSelectCommand } from "../commands/select-command.type";
import type { TSelectEvent } from "../events/select-event.type";

import { normalizeCursors } from "../commands/normalize-cursors.helper";
import { EEventKind } from "../events/event-kind.enum";



let selectEventCounter = 0;

/**
 * @description
 * Compile a single TSelectCommand into TSelectEvents, one per targeted cursor.
 * All events are placed at the current start time and do not advance the clock.
 * The concrete selection range is resolved by the reducer at runtime.
 *
 * @param command - The select command to compile
 * @param startTime - The absolute time offset at which this command is placed
 * @returns An object containing the produced events and the unchanged end time
 */
export function compileSelect(
  command: TSelectCommand,
  startTime: number,
): { events: TSelectEvent[]; endTime: number } {
  const cursorIds = normalizeCursors(command.cursor);

  const events: TSelectEvent[] = cursorIds.map(cursorId => ({
    id: `select_event_${++selectEventCounter}`,
    kind: EEventKind.SELECT,
    time: startTime,
    cursorId,
    count: command.count,
    by: command.by ?? "char",
    sourceCommandId: command.id,
  }));

  return { events, endTime: startTime };
}
