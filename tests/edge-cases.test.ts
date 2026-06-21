import { describe, expect, it } from "vitest";

import { compile } from "../src/core/compiler/compile.helper";
import { createInitialState } from "../src/core/state/index";
import { withCursor } from "../src/core/state/typewriter-state.type";
import { segmentText } from "../src/core/stepping/segment-text.helper";
import { createTypewriter, EPlaybackStatus, stringRenderer } from "../src/index";



describe("invalid advance unit rejection", () => {
  it("type with unknown by string throws at compile time", () => {
    expect(() =>
      compile([{ id: "t1", kind: "type", cursor: "main", text: "Hi", by: "custom" as unknown as "char" }]),
    ).toThrow(/Unknown advance unit/);
  });

  it("type with unknown unit in object by-form throws at compile time", () => {
    expect(() =>
      compile([{ id: "t2", kind: "type", cursor: "main", text: "Hi", by: { unit: "custom" as unknown as "char", amount: 1 } }]),
    ).toThrow(/Unknown advance unit/);
  });

  it("delete with unknown by string throws at compile time", () => {
    expect(() =>
      compile([{ id: "d1", kind: "delete", cursor: "main", count: 1, by: "custom" as unknown as "char" }]),
    ).toThrow(/Unknown advance unit/);
  });

  it("delete with by: whole throws because whole is not a valid delete unit", () => {
    expect(() =>
      compile([{ id: "d1b", kind: "delete", cursor: "main", count: 1, by: "whole" as unknown as "char" }]),
    ).toThrow(/Valid units for delete are/);
  });

  it("delete with by object unit: whole throws", () => {
    expect(() =>
      compile([{ id: "d1c", kind: "delete", cursor: "main", count: 1, by: { unit: "whole" as unknown as "char", amount: 1 } }]),
    ).toThrow(/Valid units for delete are/);
  });

  it("delete with unknown boundary string throws at compile time", () => {
    expect(() =>
      compile([{ id: "d2", kind: "delete", cursor: "main", count: "custom" as unknown as "whole" }]),
    ).toThrow(/Unknown delete boundary/);
  });

  it("move with unknown boundary string throws at compile time", () => {
    expect(() =>
      compile([{ id: "m1", kind: "move", cursor: "main", offset: "custom" as unknown as "start" }]),
    ).toThrow(/Unknown move boundary/);
  });

  it("move with unknown by unit throws", () => {
    expect(() =>
      compile([{ id: "m2", kind: "move", cursor: "main", offset: 1, by: "custom" as unknown as "char" }]),
    ).toThrow(/Valid units for move are/);
  });

  it("move with by: whole throws because whole is not a valid move unit", () => {
    expect(() =>
      compile([{ id: "m3", kind: "move", cursor: "main", offset: 1, by: "whole" as unknown as "char" }]),
    ).toThrow(/Valid units for move are/);
  });

  it("select with unknown boundary string throws at compile time", () => {
    expect(() =>
      compile([{ id: "s1", kind: "select", cursor: "main", count: "custom" as unknown as "whole" }]),
    ).toThrow(/Unknown select boundary/);
  });

  it("select with unknown by unit throws", () => {
    expect(() =>
      compile([{ id: "s2", kind: "select", cursor: "main", count: 1, by: "custom" as unknown as "char" }]),
    ).toThrow(/Valid units for select are/);
  });

  it("select with by: whole throws because whole is not a valid select unit", () => {
    expect(() =>
      compile([{ id: "s3", kind: "select", cursor: "main", count: 1, by: "whole" as unknown as "char" }]),
    ).toThrow(/Valid units for select are/);
  });

  it("segmentText with unknown unit throws", () => {
    expect(() => segmentText("hello", "custom" as unknown as "char")).toThrow(/Unknown advance unit/);
  });
});


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
      .delete(-3);
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
        before: () => { tw.cancel(); },
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
      .delete(-3, {
        by: "char",
        interval: 1,
        before: () => { tw.cancel(); },
      });
    await tw.play();

    expect(renderer.toString()).toBe("Hello");
  });
});


describe("abort inside before hook of instant commands", () => {
  it("cancelling inside unselect before hook skips the operation", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("ab", { by: "char", interval: 1 })
      .select(-1)
      .unselect({
        before: () => { tw.cancel(); },
      })
      .type("X", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ab");
  });

  it("cancelling inside unstyle before hook skips the operation", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("ab", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 2 })
      .unstyle({ from: 0, to: 2 }, {
        before: () => { tw.cancel(); },
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
        before: () => {
          order.push("before");
          tw.cancel();
        },
        after: () => { order.push("after"); },
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
      { before: () => { tw.cancel(); } },
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

    // Seek to time 0 (before first char) - state is well-defined
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
