import type { TUnmarkCommand } from "../commands/unmark-command.type";
import type { TUnmarkEvent } from "../events/unmark-event.type";

import { normalizeCursors } from "../commands/normalize-cursors.helper";
import { EEventKind } from "../events/event-kind.enum";



let unmarkEventCounter = 0;

/**
 * @description
 * Compile a single TUnmarkCommand into TUnmarkEvents scheduled at the given start time.
 * When the range is `"selection"`, one event per cursor is emitted using a placeholder
 * range of `{ from: -1, to: -1 }` — the reducer resolves the actual selection at play time.
 * When the range is a fixed `TMarkRange`, a single event is emitted regardless of cursors.
 *
 * @param command - The unmark command to compile
 * @param startTime - The absolute time offset at which this command is scheduled
 * @returns An object containing the produced events and the end time (always equal to startTime)
 */
export function compileUnmark(
  command: TUnmarkCommand,
  startTime: number,
): { events: TUnmarkEvent[]; endTime: number } {
  const events: TUnmarkEvent[] = [];

  if (command.range === "selection") {
    const cursorIds = normalizeCursors(command.cursor);

    for (const cursorId of cursorIds) {
      events.push({
        id: `unmark_event_${++unmarkEventCounter}`,
        kind: EEventKind.UNMARK,
        time: startTime,
        from: -1,
        to: -1,
        sourceCommandId: command.id,
        cursorId,
      });
    }
  }
  else {
    events.push({
      id: `unmark_event_${++unmarkEventCounter}`,
      kind: EEventKind.UNMARK,
      time: startTime,
      from: command.range.from,
      to: command.range.to,
      sourceCommandId: command.id,
    });
  }

  return { events, endTime: startTime };
}
