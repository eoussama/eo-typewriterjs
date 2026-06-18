/**
 * @description
 * Enum-like map of all supported command kind identifiers
 */
export const ECommandKind = {
  TYPE: "type",
  WAIT: "wait",
  DELETE: "delete",
  MOVE_CURSOR: "moveCursor",
  SELECT: "select",
  CLEAR_SELECTION: "clearSelection",
  MARK: "mark",
  UNMARK: "unmark",
  CALL: "call",
} as const;

/**
 * @description
 * Union of all valid command kind string values
 */
export type TCommandKind = (typeof ECommandKind)[keyof typeof ECommandKind];
