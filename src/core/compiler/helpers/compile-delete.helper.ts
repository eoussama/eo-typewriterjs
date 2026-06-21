import type { TDeleteCommand } from "../../commands/types/delete-command.type";
import type { TDeleteEvent } from "../../events/types/delete-event.type";

import type { TCompileResult } from "../types/compile-result.type";
import { normalizeCursors } from "../../commands/helpers/normalize-cursors.helper";
import { EEventKind } from "../../events/enums/event-kind.enum";
import { DEFAULT_INTERVAL, RANGE_BOUNDARIES } from "../consts/compiler.const";
import { nextEventId } from "./event-id.helper";
import { resolveMotionAdvanceMode } from "./resolve-advance-mode.helper";



/**
 * @description
 * Compile a single TDeleteCommand into a sequence of TDeleteEvents with
 * absolute timestamps relative to the provided start time.
 *
 * String operand semantics:
 * - `"whole"`: delete the entire document - one event with boundary="whole"
 * - `"start"`: delete from cursor to document start - one event with boundary="start"
 * - `"end"`: delete from cursor to document end - one event with boundary="end"
 *
 * Numeric count semantics:
 * - positive: delete forward from the cursor
 * - negative: delete backward from the cursor
 *
 * Each event carries the logical unit and a per-step count in that unit;
 * the reducer resolves the actual character span at apply time.
 * When the command targets multiple cursors, one set of events is produced per cursor
 * at the same timestamps - the clock advances only once.
 *
 * @param command - The delete command to compile
 * @param startTime - The absolute time offset at which this command begins
 * @returns An object containing the produced events and the end time of the last event
 */
export function compileDelete(command: TDeleteCommand, startTime: number): TCompileResult<TDeleteEvent> {
  const cursorIds = normalizeCursors(command.cursor);

  if (typeof command.count === "string") {
    const boundary = command.count;

    if (!RANGE_BOUNDARIES.has(boundary)) {
      throw new Error(`Unknown delete boundary: "${boundary}". Valid boundaries are: whole, start, end.`);
    }

    const events: TDeleteEvent[] = cursorIds.map(cursorId => ({
      id: nextEventId("delete"),
      kind: EEventKind.DELETE,
      time: startTime,
      cursorId,
      boundary,
      count: 0,
      unit: "char",
      direction: 1,
      sourceCommandId: command.id,
    }));

    return { events, endTime: startTime + DEFAULT_INTERVAL };
  }

  const mode = resolveMotionAdvanceMode(command.by, "delete");
  const interval = command.interval ?? DEFAULT_INTERVAL;
  const amount = Math.max(1, mode.amount);

  const direction: 1 | -1 = command.count >= 0 ? 1 : -1;
  const totalUnits = Math.abs(command.count);
  const steps = Math.ceil(totalUnits / amount);

  const events: TDeleteEvent[] = [];

  for (const cursorId of cursorIds) {
    for (let i = 0; i < steps; i++) {
      const remaining = totalUnits - i * amount;
      const stepCount = Math.min(amount, remaining);

      events.push({
        id: nextEventId("delete"),
        kind: EEventKind.DELETE,
        time: startTime + i * interval,
        cursorId,
        count: stepCount,
        unit: mode.unit,
        direction,
        sourceCommandId: command.id,
      });
    }
  }

  /* v8 ignore next */
  const endTime = steps > 0 ? startTime + (steps - 1) * interval + interval : startTime;

  return { events, endTime };
}
