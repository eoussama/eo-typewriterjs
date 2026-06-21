import type { TMoveCommand } from "../../commands/types/move-command.type";
import type { TMoveEvent } from "../../events/types/move-event.type";

import type { TCompileResult } from "../types/compile-result.type";
import { normalizeCursors } from "../../commands/helpers/normalize-cursors.helper";
import { EEventKind } from "../../events/enums/event-kind.enum";
import { DEFAULT_INTERVAL, MOVE_BOUNDARIES } from "../consts/compiler.const";
import { nextEventId } from "./event-id.helper";
import { resolveMotionAdvanceMode } from "./resolve-advance-mode.helper";



/**
 * @description
 * Compile a single TMoveCommand into TMoveEvents, one per unit step per targeted cursor.
 *
 * String operand semantics:
 * - `"start"`: jump to absolute document start - emits one event with boundary="start"
 * - `"end"`: jump to absolute document end - emits one event with boundary="end"
 *
 * Numeric operand semantics:
 * - zero offset produces no events (no-op) and does not advance the clock
 * - non-zero offset is split into `ceil(|offset| / amount)` steps; one event per step,
 *   each carrying an offset of ±1 with a per-step `by.amount`
 * - the clock advances by `interval` for every emitted event
 *
 * Multi-cursor commands fan out one set of events per cursor at the same timestamps;
 * the clock advances only once per step.
 *
 * @param command - The move command to compile
 * @param startTime - The absolute time offset at which this command is placed
 * @returns An object containing the produced events and the end time
 */
export function compileMove(command: TMoveCommand, startTime: number): TCompileResult<TMoveEvent> {
  const cursorIds = normalizeCursors(command.cursor);
  const interval = command.interval ?? DEFAULT_INTERVAL;

  if (typeof command.offset === "string") {
    const boundary = command.offset;

    if (!MOVE_BOUNDARIES.has(boundary)) {
      throw new Error(`Unknown move boundary: "${boundary}". Valid boundaries are: start, end.`);
    }

    const events: TMoveEvent[] = cursorIds.map(cursorId => ({
      id: nextEventId("move"),
      kind: EEventKind.MOVE,
      time: startTime,
      cursorId,
      boundary,
      offset: 0,
      by: command.by ?? "char",
      sourceCommandId: command.id,
    }));

    return { events, endTime: startTime + interval };
  }

  if (command.offset === 0) {
    return { events: [], endTime: startTime };
  }

  const mode = resolveMotionAdvanceMode(command.by, "move");
  const amount = Math.max(1, mode.amount);
  const direction: 1 | -1 = command.offset > 0 ? 1 : -1;
  const totalUnits = Math.abs(command.offset);
  const steps = Math.ceil(totalUnits / amount);

  const events: TMoveEvent[] = [];

  for (const cursorId of cursorIds) {
    for (let i = 0; i < steps; i++) {
      const remaining = totalUnits - i * amount;
      const stepCount = Math.min(amount, remaining);

      events.push({
        id: nextEventId("move"),
        kind: EEventKind.MOVE,
        time: startTime + i * interval,
        cursorId,
        offset: direction,
        by: { unit: mode.unit, amount: stepCount },
        sourceCommandId: command.id,
      });
    }
  }

  /* v8 ignore next */
  const endTime = steps > 0 ? startTime + (steps - 1) * interval + interval : startTime;

  return { events, endTime };
}
