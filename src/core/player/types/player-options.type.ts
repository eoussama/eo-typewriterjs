import type { IRenderer } from "../../renderer/interfaces/renderer.interface";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";



/**
 * @description
 * Options for the player
 */
export type TPlayerOptions = {
  readonly renderer: IRenderer;
  readonly initialState: TTypewriterState;
};
