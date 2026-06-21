/**
 * @description
 * Enum-like map of all supported command kind identifiers
 */
export const ECommandKind = {
  TYPE: "type",
  DELETE: "delete",
  MOVE: "move",
  WAIT: "wait",
  SELECT: "select",
  UNSELECT: "unselect",
  STYLE: "style",
  UNSTYLE: "unstyle",
  CALL: "call",
} as const;

/**
 * @description
 * Union of all valid command kind string values
 */
export type TCommandKind = (typeof ECommandKind)[keyof typeof ECommandKind];
