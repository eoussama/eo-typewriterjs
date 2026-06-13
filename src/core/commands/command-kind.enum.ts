/**
 * @description
 * Enum-like map of all supported command kind identifiers
 */
export const ECommandKind = {
  TYPE: "type",
  WAIT: "wait",
  DELETE: "delete",
} as const;

export type TCommandKind = (typeof ECommandKind)[keyof typeof ECommandKind];
