import type { TSelectCommand } from "../../commands/types/select-command.type";
import type { TSelectEvent } from "../../events/types/select-event.type";

import type { TCompileResult } from "../types/compile-result.type";
import { normalizeCursors } from "../../commands/helpers/normalize-cursors.helper";
import { EEventKind } from "../../events/enums/event-kind.enum";
import { DEFAULT_INTERVAL, MOTION_ADVANCE_UNITS, RANGE_BOUNDARIES } from "../consts/compiler.const";
import { nextEventId } from "./event-id.helper";



/**
 * @description
 * Compile a single TSelectCommand into TSelectEvents, one per targeted cursor.
 *
 * String operand semantics:
 * - `"start"`: select from cursor to document start - one event with boundary="start"
 * - `"end"`: select from cursor to document end - one event with boundary="end"
 * - `"whole"`: select entire document - one event with boundary="whole"
 *
 * Numeric count semantics:
 * - positive: select forward from cursor
 * - negative: select backward from cursor
 *
 * The clock advances by `command.interval` (or 50 ms when omitted) after the event is emitted.
 * Multi-cursor commands fan out one event per cursor at the same timestamp;
 * the clock advances only once.
 * The concrete selection range is resolved by the reducer at runtime.
 *
 * @param command - The select command to compile
 * @param startTime - The absolute time offset at which this command is placed
 * @returns An object containing the produced events and the end time
 */
export function compileSelect(command: TSelectCommand, startTime: number): TCompileResult<TSelectEvent> {
  const cursorIds = normalizeCursors(command.cursor);
  const interval = command.interval ?? DEFAULT_INTERVAL;

  if (typeof command.count === "string") {
    const boundary = command.count;

    if (!RANGE_BOUNDARIES.has(boundary)) {
      throw new Error(`Unknown select boundary: "${boundary}". Valid boundaries are: start, end, whole.`);
    }

    const events: TSelectEvent[] = cursorIds.map(cursorId => ({
      id: nextEventId("select"),
      kind: EEventKind.SELECT,
      time: startTime,
      cursorId,
      boundary,
      count: 0,
      by: command.by ?? "char",
      sourceCommandId: command.id,
    }));

    return { events, endTime: startTime + interval };
  }

  const byUnit = typeof command.by === "string" ? command.by : command.by?.unit ?? "char";

  if (!MOTION_ADVANCE_UNITS.has(byUnit)) {
    throw new Error(`Unknown advance unit: "${byUnit}". Valid units for select are: char, grapheme, word, line.`);
  }

  const events: TSelectEvent[] = cursorIds.map(cursorId => ({
    id: nextEventId("select"),
    kind: EEventKind.SELECT,
    time: startTime,
    cursorId,
    count: command.count as number,
    by: command.by ?? "char",
    sourceCommandId: command.id,
  }));

  return { events, endTime: startTime + interval };
}
