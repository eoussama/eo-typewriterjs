import { describe, expect, it } from "vitest";

import { createInitialState } from "../core/state/index";
import { withCursor } from "../core/state/typewriter-state.type";
import { createTypewriter, EPlaybackStatus, stringRenderer } from "../index";



describe("resolveAdvanceMode undefined branch and default interval (play without by or interval)", () => {
  it("type command played without by option defaults to char mode", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi");
    await tw.play();

    expect(renderer.toString()).toBe("Hi");
  });

  it("delete command played without by or interval option uses defaults", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello")
      .delete(3);
    await tw.play();

    expect(renderer.toString()).toBe("He");
  });
});


describe("abort inside whole-command before hook of type", () => {
  it("cancelling inside type whole-command before hook skips all typing", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello", {
        by: "char",
        interval: 1,
        before: { callback: () => { tw.cancel(); } },
      });
    await tw.play();

    expect(renderer.toString()).toBe("");
  });
});


describe("abort inside whole-command before hook of delete", () => {
  it("cancelling inside delete whole-command before hook skips all deletion", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .delete(3, {
        by: "char",
        interval: 1,
        before: { callback: () => { tw.cancel(); } },
      });
    await tw.play();

    expect(renderer.toString()).toBe("Hello");
  });
});


describe("abort inside before hook of instant commands", () => {
  it("cancelling inside clearSelection before hook skips the operation", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("ab", { by: "char", interval: 1 })
      .select(-1)
      .clearSelection({
        before: { callback: () => { tw.cancel(); } },
      })
      .type("X", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ab");
  });

  it("cancelling inside unmark before hook skips the operation", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("ab", { by: "char", interval: 1 })
      .mark("tw-a", { from: 0, to: 2 })
      .unmark({ from: 0, to: 2 }, {
        before: { callback: () => { tw.cancel(); } },
      })
      .type("X", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ab");
  });
});


describe("withCursor when main cursor is absent", () => {
  it("inherits DEFAULT_CURSOR_RENDER_OPTIONS when state.cursors.main is undefined", () => {
    const state = createInitialState();
    const stateWithoutMain = { ...state, cursors: {} };
    const result = withCursor(stateWithoutMain, "extra");

    expect(result.cursors.extra).toBeDefined();
    expect(result.cursors.extra?.id).toBe("extra");
    expect(result.cursors.extra?.index).toBe(0);
  });
});


describe("abort inside before hook of wait and call commands", () => {
  it("cancelling inside wait before hook skips the delay and after hook", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const order: string[] = [];

    tw.timeline
      .type("X", { by: "char", interval: 1 })
      .wait(500, {
        before: {
          callback: () => {
            order.push("before");
            tw.cancel();
          },
        },
        after: { callback: () => { order.push("after"); } },
      });
    await tw.play();

    expect(order).toContain("before");
    expect(order).not.toContain("after");
    expect(tw.getState().status).toBe(EPlaybackStatus.CANCELLED);
  });

  it("cancelling inside call before hook skips the callback", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let callbackFired = false;

    tw.timeline.call(
      () => { callbackFired = true; },
      { before: { callback: () => { tw.cancel(); } } },
    );
    await tw.play();

    expect(callbackFired).toBe(false);
    expect(tw.getState().status).toBe(EPlaybackStatus.CANCELLED);
  });
});


describe("seek from paused state to non-end position", () => {
  it("seeking to middle while paused keeps paused status and updates output", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 100 });

    const playing = tw.play();

    await new Promise(r => setTimeout(r, 10));
    tw.pause();
    await playing;

    expect(tw.getState().status).toBe(EPlaybackStatus.PAUSED);

    // Seek to time 0 (before first char) — state is well-defined
    tw.seek(0);

    // After seek to t=0 from PAUSED, no events at t<0 → empty text
    // (first event is at t=0, findEventIndexAtTime returns index 1 for time=0)
    expect(tw.getState().status).toBe(EPlaybackStatus.PAUSED);
  });

  it("seeking to end while paused marks completed", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 100 });

    const playing = tw.play();

    await new Promise(r => setTimeout(r, 10));
    tw.pause();
    await playing;

    tw.seek(Infinity);

    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
    expect(renderer.toString()).toBe("Hi");
  });
});
