/**
 * @description
 * Enum-like map of all supported command kind identifiers
 */
export const ECommandKind = {
  TYPE: "type",
} as const;

export type TCommandKind = (typeof ECommandKind)[keyof typeof ECommandKind];
