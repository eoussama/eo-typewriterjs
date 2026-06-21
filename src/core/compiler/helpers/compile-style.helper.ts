import type { TStyleCommand } from "../../commands/types/style-command.type";
import type { TStyleEvent } from "../../events/types/style-event.type";

import type { TCompileResult } from "../types/compile-result.type";
import { normalizeCursors } from "../../commands/helpers/normalize-cursors.helper";
import { EEventKind } from "../../events/enums/event-kind.enum";
import { nextEventId } from "./event-id.helper";



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
export function compileStyle(command: TStyleCommand, startTime: number): TCompileResult<TStyleEvent> {
  const events: TStyleEvent[] = [];

  if (command.range === "selection") {
    const cursorIds = normalizeCursors(command.cursor);

    for (const cursorId of cursorIds) {
      events.push({
        id: nextEventId("style"),
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
      id: nextEventId("style"),
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
