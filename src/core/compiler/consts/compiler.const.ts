/**
 * @description
 * Default timing interval in milliseconds used when no explicit interval is given
 */
export const DEFAULT_INTERVAL = 50;

/**
 * @description
 * Valid advance units for the type command (includes "whole")
 */
export const TYPE_ADVANCE_UNITS: ReadonlySet<string> = new Set(["char", "grapheme", "word", "line", "whole"]);

/**
 * @description
 * Valid advance units for motion commands: delete, move, select (excludes "whole")
 */
export const MOTION_ADVANCE_UNITS: ReadonlySet<string> = new Set(["char", "grapheme", "word", "line"]);

/**
 * @description
 * Valid boundary operands for move commands
 */
export const MOVE_BOUNDARIES: ReadonlySet<string> = new Set(["start", "end"]);

/**
 * @description
 * Valid boundary operands for delete and select commands
 */
export const RANGE_BOUNDARIES: ReadonlySet<string> = new Set(["start", "end", "whole"]);
