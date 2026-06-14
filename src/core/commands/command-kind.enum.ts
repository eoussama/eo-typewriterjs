/**
 * @description
 * Enum-like map of all supported command kind identifiers
 */
export const ECommandKind = {
  TYPE: "type",
  WAIT: "wait",
  DELETE: "delete",
  MOVE_CURSOR: "moveCursor",
} as const;

/**
 * @description
 * Union of all valid command kind string values
 */
export type TCommandKind = (typeof ECommandKind)[keyof typeof ECommandKind];
