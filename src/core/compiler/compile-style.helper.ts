import type { TStyleCommand } from "../commands/style-command.type";
import type { TStyleEvent } from "../events/style-event.type";

import { normalizeCursors } from "../commands/normalize-cursors.helper";
import { EEventKind } from "../events/event-kind.enum";



let styleEventCounter = 0;

/**
 * @description
 * Compile a single TStyleCommand into TStyleEvents scheduled at the given start time.
 * When the range is `"selection"`, one event per cursor is emitted using a placeholder
 * range of `{ from: -1, to: -1 }` - the reducer resolves the actual selection at play time.
 * When the range is a fixed `TStyleRange`, a single event is emitted regardless of cursors.
 *
 * @param command - The style command to compile
 * @param startTime - The absolute time offset at which this command is scheduled
 * @returns An object containing the produced events and the end time (always equal to startTime)
 */
export function compileStyle(
  command: TStyleCommand,
  startTime: number,
): { events: TStyleEvent[]; endTime: number } {
  const events: TStyleEvent[] = [];

  if (command.range === "selection") {
    const cursorIds = normalizeCursors(command.cursor);

    for (const cursorId of cursorIds) {
      events.push({
        id: `style_event_${++styleEventCounter}`,
        kind: EEventKind.STYLE,
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
      id: `style_event_${++styleEventCounter}`,
      kind: EEventKind.STYLE,
      time: startTime,
      from: command.range.from,
      to: command.range.to,
      style: command.style,
      sourceCommandId: command.id,
    });
  }

  return { events, endTime: startTime };
}
