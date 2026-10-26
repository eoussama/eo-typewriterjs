import type { TMaybePromise } from "@eoussama/core";

import type { TTypewriterState } from "../../state/types/typewriter-state.type";



/**
 * @description
 * Interface for all typewriter renderers.
 * A renderer receives state and is responsible for displaying it.
 */
export interface IRenderer {
  render: (state: TTypewriterState) => TMaybePromise<void>;
  mount?: (state: TTypewriterState) => TMaybePromise<void>;
  unmount?: () => TMaybePromise<void>;
}
