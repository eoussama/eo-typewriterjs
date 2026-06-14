import type { TMarkCommand } from "../commands/mark-command.type";
import type { TMarkEvent } from "../events/mark-event.type";

import { normalizeCursors } from "../commands/normalize-cursors.helper";
import { EEventKind } from "../events/event-kind.enum";



let eventCounter = 0;

/**
 * @description
 * Compile a single TMarkCommand into a TMarkEvent scheduled at the given start time.
 * When the range is `"selection"`, one event per cursor is emitted using a placeholder
 * range of `{ from: -1, to: -1 }` — the reducer resolves the actual selection at play time.
 * When the range is a fixed `TMarkRange`, a single event is emitted regardless of cursors.
 *
 * @param command - The mark command to compile
 * @param startTime - The absolute time offset at which this command is scheduled
 * @returns An object containing the produced events and the end time (always equal to startTime)
 */
export function compileMark(
  command: TMarkCommand,
  startTime: number,
): { events: TMarkEvent[]; endTime: number } {
  const events: TMarkEvent[] = [];

  if (command.range === "selection") {
    const cursorIds = normalizeCursors(command.cursor);

    for (const cursorId of cursorIds) {
      events.push({
        id: `event_${++eventCounter}`,
        kind: EEventKind.MARK,
        time: startTime,
        from: -1,
        to: -1,
        style: command.style,
        sourceCommandId: command.id,
        cursorId,
      });
    }
  }
  else {
    events.push({
      id: `event_${++eventCounter}`,
      kind: EEventKind.MARK,
      time: startTime,
      from: command.range.from,
      to: command.range.to,
      style: command.style,
      sourceCommandId: command.id,
    });
  }

  return { events, endTime: startTime };
}
