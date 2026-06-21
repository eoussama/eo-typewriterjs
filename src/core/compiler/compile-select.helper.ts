import type { TSelectCommand } from "../commands/select-command.type";
import type { TSelectEvent } from "../events/select-event.type";

import { normalizeCursors } from "../commands/normalize-cursors.helper";
import { EEventKind } from "../events/event-kind.enum";



const DEFAULT_INTERVAL = 50;
let selectEventCounter = 0;

const VALID_UNITS: ReadonlySet<string> = new Set(["char", "grapheme", "word", "line"]);
const VALID_BOUNDARIES: ReadonlySet<string> = new Set(["start", "end", "whole"]);

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
export function compileSelect(
  command: TSelectCommand,
  startTime: number,
): { events: TSelectEvent[]; endTime: number } {
  const cursorIds = normalizeCursors(command.cursor);
  const interval = command.interval ?? DEFAULT_INTERVAL;

  if (typeof command.count === "string") {
    const boundary = command.count;

    if (!VALID_BOUNDARIES.has(boundary)) {
      throw new Error(`Unknown select boundary: "${boundary}". Valid boundaries are: start, end, whole.`);
    }

    const events: TSelectEvent[] = cursorIds.map(cursorId => ({
      id: `select_event_${++selectEventCounter}`,
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

  if (!VALID_UNITS.has(byUnit)) {
    throw new Error(`Unknown advance unit: "${byUnit}". Valid units for select are: char, grapheme, word, line.`);
  }

  const events: TSelectEvent[] = cursorIds.map(cursorId => ({
    id: `select_event_${++selectEventCounter}`,
    kind: EEventKind.SELECT,
    time: startTime,
    cursorId,
    count: command.count as number,
    by: command.by ?? "char",
    sourceCommandId: command.id,
  }));

  return { events, endTime: startTime + interval };
}
