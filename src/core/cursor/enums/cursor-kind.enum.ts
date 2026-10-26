import type { TValueOf } from "@eoussama/core";



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

export type TCursorKind = TValueOf<typeof ECursorKind>;
