import type { TUnselectCommand } from "../../commands/types/unselect-command.type";
import type { TUnselectEvent } from "../../events/types/unselect-event.type";

import type { TCompileResult } from "../types/compile-result.type";
import { normalizeCursors } from "../../commands/helpers/normalize-cursors.helper";
import { EEventKind } from "../../events/enums/event-kind.enum";
import { nextEventId } from "./event-id.helper";



/**
 * @description
 * Compile a single TUnselectCommand into TUnselectEvents, one per targeted cursor.
 * All events are placed at the current start time and do not advance the clock.
 *
 * @param command - The unselect command to compile
 * @param startTime - The absolute time offset at which this command is placed
 * @returns An object containing the produced events and the unchanged end time
 */
export function compileUnselect(command: TUnselectCommand, startTime: number): TCompileResult<TUnselectEvent> {
  const cursorIds = normalizeCursors(command.cursor);

  const events: TUnselectEvent[] = cursorIds.map(cursorId => ({
    id: nextEventId("unselect"),
    kind: EEventKind.UNSELECT,
    time: startTime,
    cursorId,
    sourceCommandId: command.id,
  }));

  return { events, endTime: startTime };
}
