/**
 * @description
 * The runtime state of a single cursor
 */
export type TCursorState = {
  readonly id: string;
  readonly index: number;
  readonly visible: boolean;
};
