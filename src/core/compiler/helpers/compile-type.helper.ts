import type { TTypeCommand } from "../../commands/types/type-command.type";
import type { TInsertEvent } from "../../events/types/insert-event.type";

import type { TCompileResult } from "../types/compile-result.type";
import { normalizeCursors } from "../../commands/helpers/normalize-cursors.helper";
import { EEventKind } from "../../events/enums/event-kind.enum";
import { chunkSteps } from "../../stepping/helpers/chunk-steps.helper";
import { segmentText } from "../../stepping/helpers/segment-text.helper";
import { DEFAULT_INTERVAL } from "../consts/compiler.const";
import { nextEventId } from "./event-id.helper";
import { resolveTypeAdvanceMode } from "./resolve-advance-mode.helper";



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
export function compileType(command: TTypeCommand, startTime: number): TCompileResult<TInsertEvent> {
  const mode = resolveTypeAdvanceMode(command.by);
  const interval = command.interval ?? DEFAULT_INTERVAL;
  const steps = segmentText(command.text, mode.unit);
  const chunks = chunkSteps(steps, mode.amount);
  const cursorIds = normalizeCursors(command.cursor);

  const events: TInsertEvent[] = [];

  for (const cursorId of cursorIds) {
    for (const [index, chunk] of chunks.entries()) {
      events.push({
        id: nextEventId("insert"),
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
