let _eventCounter = 0;

/**
 * @description
 * Generate a unique event id with the given prefix.
 * Uses a module-level monotonic counter so ids are stable within a session.
 *
 * @param prefix - The event kind prefix (e.g. "insert", "delete")
 * @returns A unique event id string
 */
export function nextEventId(prefix: string): string {
  return `${prefix}_event_${++_eventCounter}`;
}
