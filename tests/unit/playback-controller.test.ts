import type { AudioManagerHelper } from "../../src/core/audio/helpers/audio-manager.helper";
import type { IRenderer, TTypewriterState } from "../../src/index";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compileSteps } from "../../src/core/compiler/helpers/compile-steps.helper";
import { PlaybackController } from "../../src/core/player/helpers/playback-controller";
import { createInitialState } from "../../src/core/state/helpers/typewriter-state.helper";
import { EPlaybackStatus, TimelineBuilder } from "../../src/index";



type TRecorder = IRenderer & {
  readonly texts: string[];
  mounts: number;
  unmounts: number;
};

/**
 * @description
 * A renderer recording every rendered text, mount and unmount
 *
 * @returns The recording renderer
 */
function recorder(): TRecorder {
  const renderer: TRecorder = {
    texts: [],
    mounts: 0,
    unmounts: 0,
    mount: () => {
      renderer.mounts++;
    },
    render: (state: TTypewriterState) => {
      renderer.texts.push(state.document.text);
    },
    unmount: () => {
      renderer.unmounts++;
    },
  };

  return renderer;
}

/**
 * @description
 * An audio manager double recording which channel each sound was played on
 *
 * @returns The double and its recorded sounds
 */
function audioSpy(): { readonly manager: AudioManagerHelper; readonly sounds: string[] } {
  const sounds: string[] = [];
  const manager = {
    playTyping: () => sounds.push("typing"),
    playDelete: () => sounds.push("delete"),
    playMove: () => sounds.push("move"),
  } as unknown as AudioManagerHelper;

  return { manager, sounds };
}

/**
 * @description
 * Create a controller loaded with a timeline
 *
 * @param build - Adds commands to the timeline
 * @param renderer - The renderer to drive
 * @param audio - The audio manager to use
 * @returns The loaded controller
 */
function controllerFor(build: (timeline: TimelineBuilder) => unknown, renderer: IRenderer = recorder(), audio: AudioManagerHelper | null = null): PlaybackController {
  const timeline = new TimelineBuilder();

  build(timeline);

  const controller = new PlaybackController(renderer, createInitialState(), audio);

  controller.load(compileSteps(timeline.commands));

  return controller;
}

/**
 * @description
 * Advance fake time and let promise callbacks run
 *
 * @param ms - The time to advance
 * @returns A promise resolving once time has advanced
 */
async function advance(ms = 0): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

/**
 * @description
 * A promise with its resolver exposed
 *
 * @returns The promise and resolver
 */
function gate(): { readonly promise: Promise<void>; readonly open: () => void } {
  let open = (): void => {};
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });

  return { promise, open };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("playbackController without a program", () => {
  it("seeks to the initial state before anything is loaded", () => {
    const renderer = recorder();
    const controller = new PlaybackController(renderer);

    controller.seek(0);

    expect(renderer.texts).toEqual([""]);
  });

  it("completes immediately", async () => {
    const controller = new PlaybackController(recorder());

    await controller.play();

    expect(controller.getState()).toEqual({ status: EPlaybackStatus.COMPLETED, currentTime: 0, duration: 0, rate: 1 });
  });

  it("pauses when seeking an empty timeline", () => {
    const controller = controllerFor(() => {});

    controller.seek(0);

    expect(controller.getState().status).toBe(EPlaybackStatus.PAUSED);
  });

  it("completes when stepping forward through an empty timeline and mounts the renderer", () => {
    const renderer = recorder();
    const controller = controllerFor(() => {}, renderer);

    controller.stepForward();

    expect(controller.getState().status).toBe(EPlaybackStatus.COMPLETED);
    expect(renderer.mounts).toBe(1);
  });
});

describe("rendering", () => {
  it("renders once per step that changes state, and never for waits or calls", async () => {
    const renderer = recorder();
    const controller = controllerFor(t => t.type("ab", { interval: 10 }).wait(10).call(() => {}).delete(-1, { interval: 10 }), renderer);

    await Promise.all([controller.play(), advance(1000)]);

    expect(renderer.texts).toEqual(["a", "ab", "a"]);
  });

  it("mounts once across seeks, steps and replays", async () => {
    const renderer = recorder();
    const controller = controllerFor(t => t.type("ab", { interval: 10 }), renderer);

    controller.seek(0);
    expect(renderer.mounts).toBe(1);

    controller.seek(10);
    controller.stepBackward();
    await Promise.all([controller.replay(), advance(100)]);

    expect(renderer.mounts).toBe(1);
  });

  it("works with renderers that implement neither mount nor unmount", async () => {
    const texts: string[] = [];
    const controller = controllerFor(t => t.type("ab", { interval: 10 }), { render: state => void texts.push(state.document.text) });

    controller.seek(10);
    await Promise.all([controller.play(), advance(100)]);
    controller.destroy();

    expect(texts.at(-1)).toBe("ab");
  });

  it("does not render the same step twice when paused during an asynchronous render", async () => {
    const texts: string[] = [];
    const render = gate();
    let first = true;
    const controller = controllerFor(t => t.type("ab", { interval: 10 }), {
      render: async (state) => {
        texts.push(state.document.text);

        if (first) {
          first = false;
          await render.promise;
        }
      },
    });

    void controller.play();
    await advance();
    controller.pause();
    render.open();
    await advance();

    void controller.play();
    await advance(100);

    expect(texts).toEqual(["a", "ab"]);
    expect(controller.getLiveState().document.text).toBe("ab");
  });

  it("does not fire the after hook while paused during an asynchronous render", async () => {
    const render = gate();
    let afters = 0;
    let first = true;
    const controller = controllerFor(t => t.type("ab", {
      interval: 10,
      after: () => {
        afters++;
      },
    }), {
      render: async () => {
        if (first) {
          first = false;
          await render.promise;
        }
      },
    });

    void controller.play();
    await advance();
    controller.pause();
    render.open();
    await advance(100);

    expect(afters).toBe(0);

    void controller.play();
    await advance(100);

    expect(afters).toBe(2);
  });

  it("steps back over a step whose render was interrupted", async () => {
    const render = gate();
    let first = true;
    const controller = controllerFor(t => t.type("abc", { interval: 10 }), {
      render: async (state) => {
        if (state.document.text === "ab" && first) {
          first = false;
          await render.promise;
        }
      },
    });

    void controller.play();
    await advance(10);
    controller.pause();
    controller.stepBackward();

    expect(controller.getLiveState().document.text).toBe("a");
  });

  it("steps over a step whose render was interrupted", async () => {
    const render = gate();
    const controller = controllerFor(t => t.type("ab", { interval: 10 }), { render: () => render.promise });

    void controller.play();
    await advance();
    controller.pause();
    controller.stepForward();

    expect(controller.getLiveState().document.text).toBe("ab");
  });
});

describe("sounds", () => {
  it("plays each command's channel only when the step changes something", async () => {
    const { manager, sounds } = audioSpy();
    const controller = controllerFor(t => t
      .type("ab", { interval: 0 })
      .move("start")
      .delete(1, { interval: 0 })
      .delete(-1, { interval: 0 })
      .select(1)
      .move(-1)
      .wait(1), recorder(), manager);

    await Promise.all([controller.play(), advance(1000)]);

    expect(sounds).toEqual(["typing", "typing", "move", "delete"]);
  });

  it("counts a step as a change when any of its cursors moves", async () => {
    const { manager, sounds } = audioSpy();
    const controller = controllerFor(t => t
      .type("ab", { interval: 0 })
      .move("start", { cursor: "start" })
      .move(-1, { cursor: ["start", "main"] }), recorder(), manager);

    await Promise.all([controller.play(), advance(1000)]);

    expect(sounds).toEqual(["typing", "typing", "move", "move"]);
  });

  it("plays opted-in sounds of commands that are silent by default, once", async () => {
    const { manager, sounds } = audioSpy();
    const controller = controllerFor(t => t
      .type("ab", { interval: 0, audio: false })
      .select(-1, { audio: { volume: 1 } })
      .style("x", "selection", { audio: { volume: 1 } })
      .wait(10, { audio: { volume: 1 } })
      .call(() => {}, { audio: { volume: 1 } }), recorder(), manager);

    await Promise.all([controller.play(), advance(1000)]);

    expect(sounds).toEqual(["typing", "typing", "typing", "typing", "typing", "typing"]);
  });

  it("plays without an audio manager", async () => {
    const controller = controllerFor(t => t.type("ab").delete(-1).move("start"));

    await expect(Promise.all([controller.play(), advance(1000)])).resolves.toBeDefined();
  });
});

describe("controls interrupt the running playback", () => {
  it.each([
    ["stop", (c: PlaybackController) => c.stop(), ""],
    ["load", (c: PlaybackController) => c.load(compileSteps([])), ""],
    ["destroy", (c: PlaybackController) => c.destroy(), ""],
    ["stepForward", (c: PlaybackController) => c.stepForward(), "ab"],
    ["stepBackward", (c: PlaybackController) => c.stepBackward(), ""],
  ] as const)("%s settles play and stops the timer", async (_name, control, text) => {
    const renderer = recorder();
    const controller = controllerFor(t => t.type("abcd", { interval: 100 }), renderer);
    const done = controller.play();

    await advance(50);
    control(controller);
    await expect(done).resolves.toBeUndefined();

    const rendered = renderer.texts.length;

    await advance(1000);

    expect(renderer.texts).toHaveLength(rendered);
    expect(controller.getLiveState().document.text).toBe(text);
  });

  it("replay restarts from the beginning and settles the earlier play", async () => {
    const renderer = recorder();
    const controller = controllerFor(t => t.type("abc", { interval: 100 }), renderer);
    const first = controller.play();

    await advance(150);

    const second = controller.replay();

    await expect(first).resolves.toBeUndefined();
    await advance(1000);
    await second;

    expect(renderer.texts).toEqual(["a", "ab", "", "a", "ab", "abc"]);
  });

  it("seeking while playing continues with a single timer", async () => {
    const renderer = recorder();
    const controller = controllerFor(t => t.type("abcd", { interval: 100 }), renderer);

    void controller.play();
    await advance(50);
    controller.seek(100);
    await advance(1000);

    expect(renderer.texts).toEqual(["a", "ab", "abc", "abcd"]);
  });
});

describe("pausing inside a step", () => {
  it("does not fire a pending before hook twice and does not run the step while paused", async () => {
    const renderer = recorder();
    const before = gate();
    let befores = 0;
    const controller = controllerFor(t => t.type("a", {
      interval: 10,
      before: async () => {
        befores++;
        await before.promise;
      },
    }), renderer);

    void controller.play();
    await advance();
    controller.pause();
    before.open();
    await advance(100);

    expect(renderer.texts).toEqual([]);

    void controller.play();
    await advance(100);

    expect(befores).toBe(1);
    expect(renderer.texts).toEqual(["a"]);
  });

  it("does not run a pending call twice nor apply its step early", async () => {
    const renderer = recorder();
    const call = gate();
    let calls = 0;
    const controller = controllerFor(t => t.call(async () => {
      calls++;
      await call.promise;
    }).type("a", { interval: 10 }), renderer);

    void controller.play();
    await advance();
    controller.pause();
    call.open();
    await advance(100);

    expect(renderer.texts).toEqual([]);

    void controller.play();
    await advance(100);

    expect(calls).toBe(1);
    expect(renderer.texts).toEqual(["a"]);
  });

  it("does not advance when a paused after hook settles", async () => {
    const after = gate();
    const controller = controllerFor(t => t.type("abc", {
      interval: 10,
      after: ({ stepIndex }) => stepIndex === 0 ? after.promise : undefined,
    }));

    void controller.play();
    await advance();
    controller.pause();
    after.open();
    await advance(100);

    expect(controller.getState().status).toBe(EPlaybackStatus.PAUSED);

    void controller.play();
    await advance(100);

    expect(controller.getLiveState().document.text).toBe("abc");
  });

  it("stays paused when the last step's after hook settles while paused", async () => {
    const after = gate();
    const controller = controllerFor(t => t.type("a", { interval: 10, after: () => after.promise }));

    void controller.play();
    await advance();
    controller.pause();
    after.open();
    await advance(100);

    expect(controller.getState().status).toBe(EPlaybackStatus.PAUSED);
  });

  it("knows when a callback is running, even after one throws", async () => {
    let inside = false;
    const timeline = new TimelineBuilder();
    const controller = new PlaybackController(recorder());

    timeline.call(() => {
      inside = controller.isRunningCallback();
      throw new Error("boom");
    });
    controller.load(compileSteps(timeline.commands));

    await expect(Promise.all([controller.play(), advance()])).rejects.toThrow("boom");

    expect(inside).toBe(true);
    expect(controller.isRunningCallback()).toBe(false);
  });
});

describe("time", () => {
  it("reports the pause time after a cancel from pause", async () => {
    const controller = controllerFor(t => t.type("abc", { interval: 100 }));

    void controller.play();
    await advance(150);
    controller.pause();
    controller.cancel();

    expect(controller.getState()).toMatchObject({ status: EPlaybackStatus.CANCELLED, currentTime: 150 });
  });

  it("advances the playhead at the playback rate", async () => {
    const controller = controllerFor(t => t.type("ab", { interval: 1000 }));

    controller.setRate(2);
    void controller.play();
    await advance(100);

    expect(controller.getState().currentTime).toBe(200);
  });

  it("reschedules the pending step when the rate drops", async () => {
    const renderer = recorder();
    const controller = controllerFor(t => t.type("ab", { interval: 100 }), renderer);

    void controller.play();
    await advance(50);
    controller.setRate(0.5);
    await advance(70);

    expect(renderer.texts).toEqual(["a"]);

    await advance(30);

    expect(renderer.texts).toEqual(["a", "ab"]);
  });

  it("reports the time of the previous step after stepping backward", () => {
    const controller = controllerFor(t => t.type("abc", { interval: 100 }));

    controller.seek(1000);
    controller.stepBackward();

    expect(controller.getState().currentTime).toBe(100);
  });
});
