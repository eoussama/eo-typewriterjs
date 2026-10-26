import type { IRenderer, TTypewriterState } from "../src/index";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compileSteps } from "../src/core/compiler/helpers/compile-steps.helper";
import { createTypewriter, EPlaybackStatus, stringRenderer } from "../src/index";



/**
 * @description
 * A renderer that records every rendered text and mount/unmount calls
 *
 * @returns The renderer and its recorded calls
 */
function recordingRenderer(): IRenderer & { texts: string[]; mounts: number; unmounts: number; last: () => string } {
  const renderer = {
    texts: [] as string[],
    mounts: 0,
    unmounts: 0,
    last: () => renderer.texts.at(-1) ?? "",
    mount(state: TTypewriterState) {
      renderer.mounts++;
      renderer.texts.push(state.document.text);
    },
    render(state: TTypewriterState) {
      renderer.texts.push(state.document.text);
    },
    unmount() {
      renderer.unmounts++;
    },
  };

  return renderer;
}

/**
 * @description
 * Let pending promise callbacks run without advancing time
 *
 * @returns A promise that resolves once pending callbacks have run
 */
async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("compileSteps", () => {
  it("fires wait hooks at the start and end of the wait and counts trailing waits in the duration", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("ab", { interval: 100 }).wait(500);

    const { steps, duration } = compileSteps(tw.timeline.commands);

    expect(steps.map(s => [s.time, s.before, s.after])).toEqual([[0, true, true], [100, true, true], [200, true, false], [700, false, true]]);
    expect(duration).toBe(700);
  });

  it("drops the steps of a move once the cursor stops moving", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("abc", { interval: 10 }).move(-999, { interval: 10 }).type("X", { interval: 10 });

    const { steps } = compileSteps(tw.timeline.commands);
    const moves = steps.filter(s => s.command.kind === "move");

    // three moves reach the start, the fourth has no effect and ends the command
    expect(moves).toHaveLength(4);
    expect(moves.every(s => s.stepCount === 4)).toBe(true);
    expect(steps.at(-1)?.time).toBe(30 + 40);
  });

  it("gives empty commands one hook-only step and reports the advance unit", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.move(0).select(2, { by: "word" }).delete("whole");

    const { steps } = compileSteps(tw.timeline.commands);

    expect(steps.map(s => [s.command.kind, s.unit, s.events.length])).toEqual([
      ["move", null, 0],
      ["select", "word", 1],
      ["delete", null, 1],
    ]);
  });

  it("assigns sounds to typing, deleting and moving only, unless a command opts in", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline
      .type("a")
      .delete(-1)
      .move("start")
      .select("whole")
      .wait(1)
      .wait(1, { audio: { volume: 1 } })
      .call(() => {});

    const sounds = compileSteps(tw.timeline.commands).steps.map(s => s.sound);

    expect(sounds).toEqual(["typing", "delete", "move", null, null, null, "typing", "typing", null]);
  });
});

describe("playback engine", () => {
  it("keeps firing hooks, calls and sounds after a pause and resume", async () => {
    const played: string[] = [];

    vi.stubGlobal("Audio", class {
      volume = 1;
      playbackRate = 1;
      play = async (): Promise<void> => {};
      constructor(src: string) {
        played.push(src);
      }
    });

    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer, audio: { sfxs: { key: { samples: ["key.mp3"] } } } });
    const hooks: number[] = [];
    const calls: string[] = [];

    tw.timeline
      .type("abcd", {
        interval: 100,
        after: ({ stepIndex }) => {
          hooks.push(stepIndex);
        },
      })
      .call(() => {
        calls.push(renderer.toString());
      });

    const done = tw.play();

    await vi.advanceTimersByTimeAsync(150);
    tw.pause();
    expect(hooks).toEqual([0, 1]);
    expect(played).toHaveLength(2);

    const resumed = tw.play();

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.all([done, resumed]);

    expect(hooks).toEqual([0, 1, 2, 3]);
    expect(calls).toEqual(["abcd"]);
    expect(played).toHaveLength(4);
  });

  it("pauses on exactly what is on screen and resumes from there", async () => {
    const renderer = recordingRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { interval: 100 });
    void tw.play();

    await vi.advanceTimersByTimeAsync(250);
    tw.pause();

    expect(renderer.last()).toBe("Hel");
    expect(tw.getLiveState().document.text).toBe("Hel");
    expect(tw.getState().currentTime).toBe(250);

    await vi.advanceTimersByTimeAsync(1000);
    expect(renderer.last()).toBe("Hel");

    void tw.play();
    await vi.advanceTimersByTimeAsync(49);
    expect(renderer.last()).toBe("Hel");
    await vi.advanceTimersByTimeAsync(1);
    expect(renderer.last()).toBe("Hell");
  });

  it("reports a live currentTime while playing", async () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("ab", { interval: 100 }).wait(1000);
    void tw.play();

    await vi.advanceTimersByTimeAsync(40);
    expect(tw.getState().currentTime).toBe(40);

    await vi.advanceTimersByTimeAsync(500);
    expect(tw.getState().currentTime).toBe(540);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(tw.getState()).toMatchObject({ status: EPlaybackStatus.COMPLETED, currentTime: 1200 });
  });

  it("returns the in-flight promise when play is called while playing", async () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("ab", { interval: 10 });

    const first = tw.play();

    expect(tw.play()).toBe(first);
    await vi.advanceTimersByTimeAsync(100);
    await expect(first).resolves.toBeUndefined();
  });

  it("keeps the play promise pending across a seek while playing", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let settled = false;

    tw.timeline.type("abcdef", { interval: 100 });

    const done = tw.play().then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(50);
    tw.seek(300);
    await flush();

    expect(renderer.toString()).toBe("abcd");
    expect(settled).toBe(false);
    expect(tw.getState().status).toBe(EPlaybackStatus.PLAYING);

    await vi.advanceTimersByTimeAsync(1000);
    await done;

    expect(settled).toBe(true);
    expect(renderer.toString()).toBe("abcdef");
  });

  it("seeking from completed back into the middle pauses there", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("abcd", { interval: 100 });

    const done = tw.play();

    await vi.advanceTimersByTimeAsync(1000);
    await done;

    tw.seek(150);
    expect(tw.getState()).toMatchObject({ status: EPlaybackStatus.PAUSED, currentTime: 150 });
    expect(renderer.toString()).toBe("ab");

    void tw.play();
    await vi.advanceTimersByTimeAsync(1000);
    expect(renderer.toString()).toBe("abcd");
  });

  it("ignores NaN seeks and clamps infinite ones", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("ab", { interval: 100 });

    tw.seek(Number.NaN);
    expect(tw.getState().status).toBe(EPlaybackStatus.IDLE);

    tw.seek(Number.NEGATIVE_INFINITY);
    expect(renderer.toString()).toBe("a");
  });

  it("restarts and repaints from the beginning when played after a cancel", async () => {
    const renderer = recordingRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("abc", { interval: 100 });
    void tw.play();

    await vi.advanceTimersByTimeAsync(150);
    tw.cancel();
    expect(tw.getState()).toMatchObject({ status: EPlaybackStatus.CANCELLED, currentTime: 150 });

    void tw.play();
    expect(renderer.last()).toBe("");

    await vi.advanceTimersByTimeAsync(1000);
    expect(renderer.last()).toBe("abc");
    expect(renderer.mounts).toBe(1);
  });

  it("rejects play and cancels when a hook throws, and can play again", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let fail = true;

    tw.timeline
      .type("ab", { interval: 10 })
      .call(() => {
        if (fail) {
          throw new Error("boom");
        }
      })
      .type("c", { interval: 10 });

    const failed = expect(tw.play()).rejects.toThrow("boom");

    await vi.advanceTimersByTimeAsync(100);
    await failed;
    expect(tw.getState().status).toBe(EPlaybackStatus.CANCELLED);
    expect(renderer.toString()).toBe("ab");

    fail = false;

    const retried = tw.play();

    await vi.advanceTimersByTimeAsync(100);
    await expect(retried).resolves.toBeUndefined();
    expect(renderer.toString()).toBe("abc");
  });

  it("wraps non-Error throws", async () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.call(() => {
      // eslint-disable-next-line no-throw-literal
      throw "plain";
    });

    const failed = expect(tw.play()).rejects.toBeInstanceOf(Error);

    await flush();
    await failed;
  });

  it("does not call a callback twice when paused while it is pending", async () => {
    const tw = createTypewriter({ renderer: stringRenderer() });
    const calls: string[] = [];
    let release = (): void => {};

    tw.timeline
      .call(async () => {
        calls.push("call");
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }, {
        after: () => {
          calls.push("after");
        },
      })
      .type("x", { interval: 10 });

    void tw.play();
    await flush();
    tw.pause();

    void tw.play();
    await flush();
    release();
    await vi.advanceTimersByTimeAsync(100);

    expect(calls).toEqual(["call", "after"]);
  });

  it("freezes the clock while an async callback runs", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("a", { interval: 100 })
      .call(() => new Promise<void>((resolve) => { setTimeout(resolve, 1000); }))
      .type("b", { interval: 100 });
    void tw.play();

    await vi.advanceTimersByTimeAsync(600);
    expect(tw.getState().currentTime).toBe(100);
    expect(renderer.toString()).toBe("a");

    await vi.advanceTimersByTimeAsync(500);
    expect(renderer.toString()).toBe("ab");
  });

  it("keeps the playhead in place when the rate changes mid-play", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("abc", { interval: 100 });
    void tw.play();

    await vi.advanceTimersByTimeAsync(50);
    tw.setRate(2);
    expect(tw.getState().currentTime).toBe(50);

    await vi.advanceTimersByTimeAsync(25);
    expect(tw.getState().currentTime).toBe(100);
    expect(renderer.toString()).toBe("ab");

    tw.setRate(0);
    tw.setRate(Number.NaN);
    expect(tw.getState().rate).toBe(2);
  });

  it("waits for asynchronous renderers", async () => {
    const order: string[] = [];
    const tw = createTypewriter({
      renderer: {
        mount: async () => { order.push("mount"); },
        render: async (state) => {
          await new Promise(resolve => setTimeout(resolve, 50));
          order.push(state.document.text);
        },
      },
    });

    tw.timeline.type("ab", {
      interval: 0,
      after: ({ state }) => {
        order.push(`after:${state.document.text}`);
      },
    });

    const done = tw.play();

    await vi.advanceTimersByTimeAsync(1000);
    await done;

    expect(order).toEqual(["mount", "a", "after:a", "ab", "after:ab"]);
  });

  it("does not run an after hook twice when paused while it is pending", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let afters = 0;

    tw.timeline
      .type("a", {
        interval: 10,
        after: async () => {
          afters++;
          await new Promise(resolve => setTimeout(resolve, 100));
        },
      })
      .type("b", { interval: 10 });

    void tw.play();
    await flush();
    tw.pause();

    void tw.play();
    await vi.advanceTimersByTimeAsync(500);

    expect(afters).toBe(1);
    expect(renderer.toString()).toBe("ab");
  });

  it("swallows asynchronous renderer failures from synchronous controls", async () => {
    const fail = async (): Promise<void> => {
      throw new Error("renderer failed");
    };
    const tw = createTypewriter({ renderer: { mount: fail, render: fail, unmount: fail } });

    tw.timeline.type("ab", { interval: 10 });

    tw.stepForward();
    tw.setCursorVisible(false);
    tw.destroy();
    await flush();

    expect(tw.getState().status).toBe(EPlaybackStatus.IDLE);
  });

  it("can be destroyed before it ever mounted", () => {
    const renderer = recordingRenderer();
    const tw = createTypewriter({ renderer });

    tw.destroy();

    expect(renderer.unmounts).toBe(0);
  });

  it("mounts when stepping from idle and unmounts on destroy", async () => {
    const renderer = recordingRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("ab", { interval: 10 });

    tw.stepForward();
    expect(renderer.mounts).toBe(1);
    expect(renderer.last()).toBe("a");

    tw.destroy();
    expect(renderer.unmounts).toBe(1);
    expect(tw.getState().status).toBe(EPlaybackStatus.IDLE);

    void tw.play();
    await vi.advanceTimersByTimeAsync(100);
    expect(renderer.mounts).toBe(2);
    expect(renderer.last()).toBe("ab");
  });

  it("steps over a step whose events were already applied when paused in its after hook", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("a", { interval: 10, after: () => new Promise(() => {}) })
      .type("b", { interval: 10 });

    void tw.play();
    await flush();
    tw.pause();

    tw.stepForward();
    expect(renderer.toString()).toBe("ab");

    tw.stepBackward();
    expect(renderer.toString()).toBe("a");
  });
});

describe("long timelines", () => {
  it("seeks and steps backward through checkpoints", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const text = "x".repeat(120);

    tw.timeline.type(text, { interval: 10 });

    tw.seek(1000);
    expect(renderer.toString()).toBe("x".repeat(101));

    tw.seek(200);
    expect(renderer.toString()).toBe("x".repeat(21));

    tw.seek(Number.POSITIVE_INFINITY);
    tw.stepBackward();
    expect(renderer.toString()).toBe("x".repeat(119));
  });

  it("compiles an empty timeline to a zero duration", () => {
    expect(compileSteps([])).toEqual({ steps: [], duration: 0 });
  });
});

describe("interrupting a step", () => {
  it("stops after an asynchronous render when paused during it", async () => {
    const after: string[] = [];
    const tw = createTypewriter({
      renderer: {
        render: () => new Promise(resolve => setTimeout(resolve, 50)),
      },
    });

    tw.timeline.type("ab", {
      interval: 0,
      after: ({ state }) => {
        after.push(state.document.text);
      },
    });

    void tw.play();
    await vi.advanceTimersByTimeAsync(10);
    tw.pause();
    await vi.advanceTimersByTimeAsync(100);

    expect(after).toEqual([]);
    expect(tw.getLiveState().document.text).toBe("a");
  });
});

describe("runtime cursor changes", () => {
  it("keep changes made outside callbacks across replays and seeks", async () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("ab", { interval: 10 });
    tw.setCursorVisible(false);

    const done = tw.play();

    await vi.advanceTimersByTimeAsync(100);
    await done;
    tw.seek(0);

    expect(tw.getLiveState().cursors.main?.visible).toBe(false);
  });

  it("limit changes made inside a call to the current run", async () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline
      .call(() => tw.setCursorOptions({ content: "_" }))
      .type("ab", { interval: 10 });

    const done = tw.play();

    await vi.advanceTimersByTimeAsync(100);
    await done;
    expect(tw.getLiveState().cursors.main?.renderOptions.content).toBe("_");

    tw.seek(0);
    expect(tw.getLiveState().cursors.main?.renderOptions.content).not.toBe("_");
  });

  it("apply to the live state while playing", async () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("abcd", { interval: 100 });
    void tw.play();

    await vi.advanceTimersByTimeAsync(150);
    tw.setCursorVisible(false, "main");
    await vi.advanceTimersByTimeAsync(1000);

    expect(tw.getLiveState().cursors.main?.visible).toBe(false);
    expect(tw.getLiveState().document.text).toBe("abcd");
  });

  it("ignore unknown cursor ids", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.setCursorVisible(false, ["main", "ghost"]);

    expect(Object.keys(tw.getLiveState().cursors)).toEqual(["main"]);
  });
});
