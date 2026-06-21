import type { TUnstyleCommand } from "../commands/unstyle-command.type";
import type { TUnstyleEvent } from "../events/unstyle-event.type";

import { normalizeCursors } from "../commands/normalize-cursors.helper";
import { EEventKind } from "../events/event-kind.enum";



let unstyleEventCounter = 0;

/**
 * @description
 * Compile a single TUnstyleCommand into TUnstyleEvents scheduled at the given start time.
 * When the range is `"selection"`, one event per cursor is emitted using a placeholder
 * range of `{ from: -1, to: -1 }` - the reducer resolves the actual selection at play time.
 * When the range is a fixed `TStyleRange`, a single event is emitted regardless of cursors.
 *
 * @param command - The unstyle command to compile
 * @param startTime - The absolute time offset at which this command is scheduled
 * @returns An object containing the produced events and the end time (always equal to startTime)
 */
export function compileUnstyle(
  command: TUnstyleCommand,
  startTime: number,
): { events: TUnstyleEvent[]; endTime: number } {
  const events: TUnstyleEvent[] = [];

  if (command.range === "selection") {
    const cursorIds = normalizeCursors(command.cursor);

    for (const cursorId of cursorIds) {
      events.push({
        id: `unstyle_event_${++unstyleEventCounter}`,
        kind: EEventKind.UNSTYLE,
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
      id: `unstyle_event_${++unstyleEventCounter}`,
      kind: EEventKind.UNSTYLE,
      time: startTime,
      from: command.range.from,
      to: command.range.to,
      sourceCommandId: command.id,
    });
  }

  return { events, endTime: startTime };
}
