import type { TAdvanceMode, TAdvanceModeInput, TTypeCommand } from "../commands/type-command.type";
import type { TInsertEvent } from "../events/insert-event.type";

import { normalizeCursors } from "../commands/normalize-cursors.helper";
import { EEventKind } from "../events/event-kind.enum";
import { chunkSteps } from "../stepping/chunk-steps.helper";
import { segmentText } from "../stepping/segment-text.helper";



const DEFAULT_INTERVAL = 50;
let insertEventCounter = 0;

/**
 * @description
 * Normalise a public TAdvanceModeInput shorthand or explicit object into
 * a canonical TAdvanceMode with both unit and amount fields
 *
 * @param input - The raw input from the user
 * @returns A fully resolved TAdvanceMode
 */
const VALID_UNITS: ReadonlySet<string> = new Set(["char", "grapheme", "word", "line", "whole"]);

function resolveAdvanceMode(input: TAdvanceModeInput | undefined): TAdvanceMode {
  if (input === undefined) {
    return { unit: "char", amount: 1 };
  }

  const unit = typeof input === "string" ? input : input.unit;

  if (!VALID_UNITS.has(unit)) {
    throw new Error(`Unknown advance unit: "${unit}". Valid units are: char, grapheme, word, line, whole.`);
  }

  if (typeof input === "string") {
    return { unit: input, amount: 1 };
  }

  return { unit: input.unit, amount: input.amount };
}

/**
 * @description
 * Compile a single TTypeCommand into a sequence of TInsertEvents with
 * absolute timestamps relative to the provided start time.
 * When the command targets multiple cursors, one set of events is produced per cursor
 * at the same timestamps - the clock advances only once.
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
  const cursorIds = normalizeCursors(command.cursor);

  const events: TInsertEvent[] = [];

  for (const cursorId of cursorIds) {
    for (const [index, chunk] of chunks.entries()) {
      events.push({
        id: `insert_event_${++insertEventCounter}`,
        kind: EEventKind.INSERT,
        time: startTime + index * interval,
        cursorId,
        text: chunk,
        ...(command.style !== undefined ? { style: command.style } : {}),
        sourceCommandId: command.id,
      });
    }
  }

  const endTime = chunks.length > 0 ? startTime + (chunks.length - 1) * interval + interval : startTime;

  return { events, endTime };
}
