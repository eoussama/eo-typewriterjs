import type { TUnselectCommand } from "../commands/unselect-command.type";
import type { TUnselectEvent } from "../events/unselect-event.type";

import { normalizeCursors } from "../commands/normalize-cursors.helper";
import { EEventKind } from "../events/event-kind.enum";



let unselectEventCounter = 0;

/**
 * @description
 * Compile a single TUnselectCommand into TUnselectEvents, one per targeted cursor.
 * All events are placed at the current start time and do not advance the clock.
 *
 * @param command - The unselect command to compile
 * @param startTime - The absolute time offset at which this command is placed
 * @returns An object containing the produced events and the unchanged end time
 */
export function compileUnselect(
  command: TUnselectCommand,
  startTime: number,
): { events: TUnselectEvent[]; endTime: number } {
  const cursorIds = normalizeCursors(command.cursor);

  const events: TUnselectEvent[] = cursorIds.map(cursorId => ({
    id: `unselect_event_${++unselectEventCounter}`,
    kind: EEventKind.UNSELECT,
    time: startTime,
    cursorId,
    sourceCommandId: command.id,
  }));

  return { events, endTime: startTime };
}
