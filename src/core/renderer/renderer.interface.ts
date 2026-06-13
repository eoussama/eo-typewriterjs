import type { TTypewriterState } from "../state/typewriter-state.type";



/**
 * @description
 * Interface for all typewriter renderers.
 * A renderer receives state and is responsible for displaying it.
 */
export interface IRenderer {
  mount?: (state: TTypewriterState) => void | Promise<void>;
  render: (state: TTypewriterState) => void | Promise<void>;
  unmount?: () => void | Promise<void>;
}
