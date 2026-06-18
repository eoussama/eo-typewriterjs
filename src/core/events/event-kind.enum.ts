/**
 * @description
 * Enum-like map of all supported event kind identifiers
 */
export const EEventKind = {
  INSERT: "insert",
  DELETE: "delete",
  MOVE_CURSOR: "moveCursor",
  SELECT: "select",
  CLEAR_SELECTION: "clearSelection",
  MARK: "mark",
  UNMARK: "unmark",
} as const;

/**
 * @description
 * Union of all valid event kind string values
 */
export type TEventKind = (typeof EEventKind)[keyof typeof EEventKind];
