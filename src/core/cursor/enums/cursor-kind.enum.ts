/**
 * @description
 * Built-in cursor visual kinds
 */
export const ECursorKind = {
  PIPE: "pipe",
  UNDERSCORE: "underscore",
  BLOCK: "block",
  BLOCK_UNDERSCORE: "block-underscore",
  CARET: "caret",
  CUSTOM: "custom",
} as const;

export type TCursorKind = (typeof ECursorKind)[keyof typeof ECursorKind];
