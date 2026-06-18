import type { TClearSelectionCommand } from "../commands/clear-selection-command.type";
import type { TClearSelectionEvent } from "../events/clear-selection-event.type";

import { normalizeCursors } from "../commands/normalize-cursors.helper";
import { EEventKind } from "../events/event-kind.enum";



let clearSelectionEventCounter = 0;

/**
 * @description
 * Compile a single TClearSelectionCommand into TClearSelectionEvents, one per targeted cursor.
 * All events are placed at the current start time and do not advance the clock.
 *
 * @param command - The clear-selection command to compile
 * @param startTime - The absolute time offset at which this command is placed
 * @returns An object containing the produced events and the unchanged end time
 */
export function compileClearSelection(
  command: TClearSelectionCommand,
  startTime: number,
): { events: TClearSelectionEvent[]; endTime: number } {
  const cursorIds = normalizeCursors(command.cursor);

  const events: TClearSelectionEvent[] = cursorIds.map(cursorId => ({
    id: `clear_selection_event_${++clearSelectionEventCounter}`,
    kind: EEventKind.CLEAR_SELECTION,
    time: startTime,
    cursorId,
    sourceCommandId: command.id,
  }));

  return { events, endTime: startTime };
}
