/**
 * @description
 * Built-in cursor visual kinds.
 * Ordered from most common to most specialised.
 * Use CUSTOM to provide a fully arbitrary content string.
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
