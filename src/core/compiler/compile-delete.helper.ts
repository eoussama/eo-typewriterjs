import type { TDeleteCommand } from "../commands/delete-command.type";
import type { TAdvanceMode, TAdvanceModeInput } from "../commands/type-command.type";
import type { TDeleteEvent } from "../events/delete-event.type";

import { normalizeCursors } from "../commands/normalize-cursors.helper";
import { EEventKind } from "../events/event-kind.enum";



const DEFAULT_INTERVAL = 50;
let deleteEventCounter = 0;

/**
 * @description
 * Normalise a TAdvanceModeInput into a canonical TAdvanceMode
 *
 * @param input - The raw advance mode input
 * @returns A fully resolved TAdvanceMode
 */
function resolveAdvanceMode(input: TAdvanceModeInput | undefined): TAdvanceMode {
  if (input === undefined) {
    return { unit: "char", amount: 1 };
  }

  if (typeof input === "string") {
    return { unit: input, amount: 1 };
  }

  return { unit: input.unit, amount: input.amount };
}

/**
 * @description
 * Compile a single TDeleteCommand into a sequence of TDeleteEvents with
 * absolute timestamps relative to the provided start time.
 * Each event carries the logical unit and a per-step count in that unit;
 * the reducer resolves the actual character span at apply time.
 * When the command targets multiple cursors, one set of events is produced per cursor
 * at the same timestamps — the clock advances only once.
 *
 * @param command - The delete command to compile
 * @param startTime - The absolute time offset at which this command begins
 * @returns An object containing the produced events and the end time of the last event
 */
export function compileDelete(
  command: TDeleteCommand,
  startTime: number,
): { events: TDeleteEvent[]; endTime: number } {
  const mode = resolveAdvanceMode(command.by);
  const interval = command.interval ?? DEFAULT_INTERVAL;
  const amount = Math.max(1, mode.amount);
  const totalUnits = Math.max(0, command.count);
  const steps = Math.ceil(totalUnits / amount);
  const cursorIds = normalizeCursors(command.cursor);

  const events: TDeleteEvent[] = [];

  for (const cursorId of cursorIds) {
    for (let i = 0; i < steps; i++) {
      const remaining = totalUnits - i * amount;
      const stepCount = Math.min(amount, remaining);

      events.push({
        id: `del_event_${++deleteEventCounter}`,
        kind: EEventKind.DELETE,
        time: startTime + i * interval,
        cursorId,
        count: stepCount,
        unit: mode.unit,
        sourceCommandId: command.id,
      });
    }
  }

  const endTime = steps > 0 ? startTime + (steps - 1) * interval + interval : startTime;

  return { events, endTime };
}
