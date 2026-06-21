import type { TTimelineEvent } from "../events/timeline-event.type";
import type { IRenderer } from "../renderer/renderer.interface";
import type { TTypewriterState } from "../state/typewriter-state.type";
import { wait } from "@eoussama/core";

import { reduce } from "../reducer/reduce.helper";



/**
 * @description
 * Options for the player
 */
export type TPlayerOptions = {
  readonly renderer: IRenderer;
  readonly initialState: TTypewriterState;
};

/**
 * @description
 * Play a compiled list of timeline events by driving a reducer and renderer.
 * Events are scheduled using absolute timestamps - the player applies all events
 * whose time is at or before the current playhead position.
 * This structure naturally supports pause, seek, and speed control in future phases.
 *
 * @param events - The compiled, time-sorted list of timeline events to play
 * @param options - Player options including the renderer and initial state
 * @returns A promise that resolves when all events have been applied and rendered
 */
export async function play(events: TTimelineEvent[], options: TPlayerOptions): Promise<void> {
  const { renderer, initialState } = options;

  const sorted = [...events].sort((a, b) => a.time - b.time);

  let state: TTypewriterState = initialState;

  if (renderer.mount) {
    await renderer.mount(state);
  }

  const startTime = Date.now();
  let nextIndex = 0;

  while (nextIndex < sorted.length) {
    const playhead = Date.now() - startTime;
    let advanced = false;

    while (nextIndex < sorted.length) {
      const event = sorted[nextIndex];

      /* v8 ignore next */
      if (event === undefined || event.time > playhead) {
        break;
      }

      state = reduce(state, event);
      nextIndex++;
      advanced = true;
    }

    /* v8 ignore next */
    if (advanced) {
      await renderer.render(state);
    }

    if (nextIndex < sorted.length) {
      const nextEvent = sorted[nextIndex];
      /* v8 ignore start */
      const delay = nextEvent !== undefined ? Math.max(0, nextEvent.time - (Date.now() - startTime)) : 0;

      if (delay > 0) {
        await wait(delay);
      }
      /* v8 ignore stop */
    }
  }

  await renderer.render(state);

  if (renderer.unmount) {
    await renderer.unmount();
  }
}
