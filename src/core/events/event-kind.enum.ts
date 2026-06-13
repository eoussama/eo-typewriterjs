/**
 * @description
 * Enum-like map of all supported event kind identifiers
 */
export const EEventKind = {
  INSERT: "insert",
  DELETE: "delete",
} as const;

export type TEventKind = (typeof EEventKind)[keyof typeof EEventKind];
