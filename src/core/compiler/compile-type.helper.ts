import type { TAdvanceMode, TAdvanceModeInput, TTypeCommand } from "../commands/type-command.type";
import type { TInsertEvent } from "../events/insert-event.type";

import { EEventKind } from "../events/event-kind.enum";
import { chunkSteps } from "../stepping/chunk-steps.helper";
import { segmentText } from "../stepping/segment-text.helper";



const DEFAULT_INTERVAL = 50;
let eventCounter = 0;

/**
 * @description
 * Normalise a public TAdvanceModeInput shorthand or explicit object into
 * a canonical TAdvanceMode with both unit and amount fields
 *
 * @param input - The raw input from the user
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
 * Compile a single TTypeCommand into a sequence of TInsertEvents with
 * absolute timestamps relative to the provided start time
 *
 * @param command - The type command to compile
 * @param startTime - The absolute time offset at which this command begins
 * @returns An object containing the produced events and the end time of the last event
 */
export function compileType(
  command: TTypeCommand,
  startTime: number,
): { events: TInsertEvent[]; endTime: number } {
  const mode = resolveAdvanceMode(command.by);
  const interval = command.interval ?? DEFAULT_INTERVAL;
  const steps = segmentText(command.text, mode.unit);
  const chunks = chunkSteps(steps, mode.amount);

  const events: TInsertEvent[] = chunks.map((chunk, index) => ({
    id: `event_${++eventCounter}`,
    kind: EEventKind.INSERT,
    time: startTime + index * interval,
    cursorId: command.cursor,
    text: chunk,
    ...(command.style !== undefined ? { style: command.style } : {}),
    sourceCommandId: command.id,
  }));

  const endTime = events.length > 0 ? (events[events.length - 1]?.time ?? startTime) + interval : startTime;

  return { events, endTime };
}
