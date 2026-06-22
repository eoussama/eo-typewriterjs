import type { TSelectCommand } from "../../commands/types/select-command.type";
import type { TSelectEvent } from "../../events/types/select-event.type";

import type { TCompileResult } from "../types/compile-result.type";
import { normalizeCursors } from "../../commands/helpers/normalize-cursors.helper";
import { EEventKind } from "../../events/enums/event-kind.enum";
import { DEFAULT_INTERVAL, RANGE_BOUNDARIES } from "../consts/compiler.const";
import { nextEventId } from "./event-id.helper";
import { resolveMotionAdvanceMode } from "./resolve-advance-mode.helper";



/**
 * @description
 * Compile a single TSelectCommand into TSelectEvents, one per unit step per targeted cursor.
 *
 * String operand semantics:
 * - `"start"`: select from cursor to document start - one event with boundary="start"
 * - `"end"`: select from cursor to document end - one event with boundary="end"
 * - `"whole"`: select entire document - one event with boundary="whole"
 *
 * Numeric count semantics:
 * - zero count produces no events and does not advance the clock
 * - non-zero count is split into `ceil(|count| / amount)` steps; one event per step per
 *   targeted cursor, each carrying a unit direction of ±1 with a per-step `by.amount`
 * - the clock advances by `interval` for every emitted step
 *
 * Multi-cursor commands fan out one event per cursor at the same timestamps;
 * the clock advances only once per step.
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

  if (command.count === 0) {
    return { events: [], endTime: startTime };
  }

  const mode = resolveMotionAdvanceMode(command.by, "select");
  const amount = Math.max(1, mode.amount);
  const direction: 1 | -1 = command.count > 0 ? 1 : -1;
  const totalUnits = Math.abs(command.count);
  const steps = Math.ceil(totalUnits / amount);

  const events: TSelectEvent[] = [];

  for (const cursorId of cursorIds) {
    for (let i = 0; i < steps; i++) {
      // Cumulative units: each step tells the reducer to select `cumulativeUnits`
      // from the cursor anchor so the selection visibly grows one step at a time.
      const cumulativeUnits = Math.min(totalUnits, (i + 1) * amount);

      events.push({
        id: nextEventId("select"),
        kind: EEventKind.SELECT,
        time: startTime + i * interval,
        cursorId,
        count: direction,
        by: { unit: mode.unit, amount: cumulativeUnits },
        sourceCommandId: command.id,
      });
    }
  }

  /* v8 ignore next */
  const endTime = steps > 0 ? startTime + (steps - 1) * interval + interval : startTime;

  return { events, endTime };
}
