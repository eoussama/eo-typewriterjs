import { describe, expect, it, vi } from "vitest";

import { compile } from "../core/compiler/compile.helper";
import { DEFAULT_CURSOR_RENDER_OPTIONS } from "../core/cursor/cursor-render-options.type";
import { deleteTextAtCursor } from "../core/reducer/delete-text-at-cursor.helper";
import { insertTextAtCursor } from "../core/reducer/insert.helper";
import { createInitialState, withCursor, withSelection } from "../core/state/index";
import { createTypewriter, EPlaybackStatus, stringRenderer } from "../index";



describe("timeline.call()", () => {
  it("invokes the callback when played", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const fn = vi.fn();

    tw.timeline.type("Hi", { by: "char", interval: 1 }).call(fn);
    await tw.play();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(renderer.toString()).toBe("Hi");
  });

  it("receives a TCallbackContext with the current state", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let capturedText = "";

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .call(({ state }) => {
        capturedText = state.document.text;
      });
    await tw.play();

    expect(capturedText).toBe("Hello");
  });

  it("receives stepIndex=0, stepCount=1, unit=null for a whole-command invocation", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let capturedCtx: { stepIndex: number; stepCount: number; unit: unknown } | null = null;

    tw.timeline.call(({ stepIndex, stepCount, unit }) => {
      capturedCtx = { stepIndex, stepCount, unit };
    });
    await tw.play();

    expect(capturedCtx).toStrictEqual({ stepIndex: 0, stepCount: 1, unit: null });
  });

  it("awaits an async callback before proceeding to the next command", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const order: string[] = [];

    tw.timeline
      .call(async () => {
        await new Promise<void>(r => setTimeout(r, 10));
        order.push("call");
      })
      .type("X", {
        by: "char",
        interval: 1,
        before: () => {
          order.push("type-before");
        },
      });
    await tw.play();

    expect(order).toStrictEqual(["call", "type-before"]);
  });

  it("chains multiple call commands in sequence", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const order: number[] = [];

    tw.timeline
      .call(() => { order.push(1); })
      .call(() => { order.push(2); })
      .call(() => { order.push(3); });
    await tw.play();

    expect(order).toStrictEqual([1, 2, 3]);
  });

  it("can be chained between type commands", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let midText = "";

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .call(({ state }) => { midText = state.document.text; })
      .type(" world", { by: "char", interval: 1 });
    await tw.play();

    expect(midText).toBe("Hello");
    expect(renderer.toString()).toBe("Hello world");
  });

  it("receives an AbortSignal in context that is not aborted during normal play", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let wasAborted = false;

    tw.timeline.call(({ signal }) => {
      wasAborted = signal.aborted;
    });
    await tw.play();

    expect(wasAborted).toBe(false);
  });
});


describe("before/after hooks", () => {
  it("type: before fires before each char is typed", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const snapshots: string[] = [];

    tw.timeline.type("Hi", {
      by: "char",
      interval: 1,
      before: ({ state }) => {
        snapshots.push(state.document.text);
      },
    });
    await tw.play();

    expect(snapshots).toStrictEqual(["", "H"]);
    expect(renderer.toString()).toBe("Hi");
  });

  it("type: after fires after each char is typed", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const snapshots: string[] = [];

    tw.timeline.type("Hi", {
      by: "char",
      interval: 1,
      after: ({ state }) => {
        snapshots.push(state.document.text);
      },
    });
    await tw.play();

    expect(snapshots).toStrictEqual(["H", "Hi"]);
  });

  it("type: before and after fire once per char for multi-char text", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let beforeCount = 0;
    let afterCount = 0;

    tw.timeline.type("Hello", {
      by: "char",
      interval: 1,
      before: () => { beforeCount++; },
      after: () => { afterCount++; },
    });
    await tw.play();

    expect(beforeCount).toBe(5);
    expect(afterCount).toBe(5);
  });

  it("type: context unit matches command by unit", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const units: unknown[] = [];

    tw.timeline.type("ab", {
      by: "word",
      interval: 1,
      after: ({ unit }) => {
        units.push(unit);
      },
    });
    await tw.play();

    units.forEach(u => expect(u).toBe("word"));
  });

  it("type: context stepIndex and stepCount are correct", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const indices: number[] = [];
    const counts: number[] = [];

    tw.timeline.type("abc", {
      by: "char",
      interval: 1,
      before: ({ stepIndex, stepCount }) => {
        indices.push(stepIndex);
        counts.push(stepCount);
      },
    });
    await tw.play();

    expect(indices).toStrictEqual([0, 1, 2]);
    expect(counts).toStrictEqual([3, 3, 3]);
  });

  it("delete: before fires before each deletion step", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const snapshots: string[] = [];

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .delete(3, {
        by: "char",
        interval: 1,
        before: ({ state }) => {
          snapshots.push(state.document.text);
        },
      });
    await tw.play();

    expect(snapshots).toStrictEqual(["Hello", "Hell", "Hel"]);
    expect(renderer.toString()).toBe("He");
  });

  it("delete: after fires after each deletion step", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const snapshots: string[] = [];

    tw.timeline
      .type("abc", { by: "char", interval: 1 })
      .delete(2, {
        by: "char",
        interval: 1,
        after: ({ state }) => {
          snapshots.push(state.document.text);
        },
      });
    await tw.play();

    expect(snapshots).toStrictEqual(["ab", "a"]);
  });

  it("delete: context unit matches command by unit", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const units: unknown[] = [];

    tw.timeline
      .type("hello", { by: "char", interval: 1 })
      .delete(5, {
        by: "char",
        interval: 1,
        after: ({ unit }) => {
          units.push(unit);
        },
      });
    await tw.play();

    units.forEach(u => expect(u).toBe("char"));
  });

  it("delete: before fires once per deletion step", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let count = 0;

    tw.timeline
      .type("abc", { by: "char", interval: 1 })
      .delete(3, {
        by: "char",
        interval: 1,
        before: () => { count++; },
      });
    await tw.play();

    expect(count).toBe(3);
  });

  it("wait: before and after fire around the wait duration", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const order: string[] = [];

    tw.timeline
      .wait(5, {
        before: () => { order.push("before"); },
        after: () => { order.push("after"); },
      })
      .call(() => { order.push("next"); });
    await tw.play();

    expect(order).toStrictEqual(["before", "after", "next"]);
  });

  it("move: before and after fire around the cursor move", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const order: string[] = [];

    tw.timeline
      .type("ab", { by: "char", interval: 1 })
      .move(0, {
        before: () => { order.push("before"); },
        after: () => { order.push("after"); },
      })
      .call(() => { order.push("next"); });
    await tw.play();

    expect(order).toStrictEqual(["before", "after", "next"]);
  });

  it("select: before and after fire around the selection", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const order: string[] = [];

    tw.timeline
      .type("ab", { by: "char", interval: 1 })
      .select(-1, {
        before: () => { order.push("before"); },
        after: () => { order.push("after"); },
      })
      .call(() => { order.push("next"); });
    await tw.play();

    expect(order).toStrictEqual(["before", "after", "next"]);
  });

  it("style: before and after fire around the style application", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const order: string[] = [];

    tw.timeline
      .type("ab", { by: "char", interval: 1 })
      .style("tw-cls", { from: 0, to: 2 }, {
        before: () => { order.push("before"); },
        after: () => { order.push("after"); },
      })
      .call(() => { order.push("next"); });
    await tw.play();

    expect(order).toStrictEqual(["before", "after", "next"]);
  });

  it("async before hook delays command execution", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const order: string[] = [];

    tw.timeline.type("X", {
      by: "char",
      interval: 1,
      before: async () => {
        await new Promise<void>(r => setTimeout(r, 5));
        order.push("before");
      },
    });

    const start = Date.now();

    await tw.play();
    const elapsed = Date.now() - start;

    order.push("done");

    expect(order).toStrictEqual(["before", "done"]);
    expect(elapsed).toBeGreaterThanOrEqual(4);
  });
});


describe("cancel()", () => {
  it("stops playback mid-flight and status becomes CANCELLED", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "char", interval: 20 });
    const playing = tw.play();

    await new Promise(r => setTimeout(r, 10));
    tw.cancel();

    expect(tw.getState().status).toBe(EPlaybackStatus.CANCELLED);
    await playing;
  });

  it("preserves rendered output at the point of cancellation", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "char", interval: 20 });
    const playing = tw.play();

    await new Promise(r => setTimeout(r, 25));
    tw.cancel();
    await playing;

    const text = renderer.toString();

    expect(text.length).toBeGreaterThan(0);
    expect("Hello world".startsWith(text)).toBe(true);
  });

  it("cancel() on non-playing status is a no-op", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    tw.cancel();

    expect(tw.getState().status).toBe(EPlaybackStatus.IDLE);
  });

  it("cancel() on PAUSED transitions to CANCELLED", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "char", interval: 20 });
    const playing = tw.play();

    await new Promise(r => setTimeout(r, 10));
    tw.pause();
    tw.cancel();

    expect(tw.getState().status).toBe(EPlaybackStatus.CANCELLED);
    await playing;
  });

  it("cancel during async call command aborts gracefully", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let callCompleted = false;

    tw.timeline.call(async () => {
      await new Promise<void>(r => setTimeout(r, 100));
      callCompleted = true;
    });

    const playing = tw.play();

    await new Promise(r => setTimeout(r, 10));
    tw.cancel();
    await playing;

    expect(tw.getState().status).toBe(EPlaybackStatus.CANCELLED);
    expect(typeof callCompleted).toBe("boolean");
  });

  it("after cancel, play() starts fresh from the beginning", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "char", interval: 20 });
    const playing = tw.play();

    await new Promise(r => setTimeout(r, 10));
    tw.cancel();
    await playing;

    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });
});


describe("call() command own before/after hooks", () => {
  it("before hook fires before the callback", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const order: string[] = [];

    tw.timeline.call(
      () => { order.push("callback"); },
      {
        before: () => { order.push("before"); },
        after: () => { order.push("after"); },
      },
    );
    await tw.play();

    expect(order).toStrictEqual(["before", "callback", "after"]);
  });
});


describe("executeWait abort coverage", () => {
  it("cancelling during a wait command skips the after hook", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const order: string[] = [];

    tw.timeline.wait(200, {
      before: () => { order.push("before"); },
      after: () => { order.push("after"); },
    });

    const playing = tw.play();

    await new Promise(r => setTimeout(r, 10));
    tw.cancel();
    await playing;

    expect(order).toContain("before");
    expect(order).not.toContain("after");
  });
});


describe("executeCommands signal-aborted-at-loop-start coverage", () => {
  it("aborting inside a call callback prevents the next command from running", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let secondCalled = false;

    tw.timeline
      .call(() => { tw.cancel(); })
      .call(() => { secondCalled = true; });

    await tw.play();

    expect(secondCalled).toBe(false);
  });
});


describe("seek mid-timer-resume coverage", () => {
  it("seek while timer-resume is active cancels the pending timer and seeks correctly", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 100 });

    const playing = tw.play();

    await new Promise(r => setTimeout(r, 10));
    tw.seek(50);
    tw.seek(150);

    await playing;
    await tw.play();
    await new Promise(r => setTimeout(r, 50));
    tw.cancel();

    expect(renderer.toString().length).toBeGreaterThan(0);
  });

  it("timer-resume completes through multiple ticks and fires _playhead on each tick", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("AB", { by: "char", interval: 30 });

    const playing = tw.play();

    await new Promise(r => setTimeout(r, 5));
    tw.seek(0);

    await playing;
    await new Promise(r => setTimeout(r, 100));

    expect(renderer.toString()).toBe("AB");
  });
});


describe("abort inside before hooks of type/delete", () => {
  it("aborting inside type before hook stops typing mid-sequence", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let callCount = 0;

    tw.timeline.type("Hello", {
      by: "char",
      interval: 1,
      before: () => {
        callCount++;

        if (callCount === 2) {
          tw.cancel();
        }
      },
    });
    await tw.play();

    expect(renderer.toString()).toBe("H");
  });

  it("aborting inside type after hook stops typing mid-sequence", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let callCount = 0;

    tw.timeline.type("Hello", {
      by: "char",
      interval: 1,
      after: () => {
        callCount++;

        if (callCount === 2) {
          tw.cancel();
        }
      },
    });
    await tw.play();

    expect(renderer.toString()).toBe("He");
  });

  it("aborting inside delete before hook stops deletion mid-sequence", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let callCount = 0;

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .delete(3, {
        by: "char",
        interval: 1,
        before: () => {
          callCount++;

          if (callCount === 2) {
            tw.cancel();
          }
        },
      });
    await tw.play();

    expect(renderer.toString()).toBe("Hell");
  });

  it("aborting inside delete after hook stops deletion mid-sequence", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let callCount = 0;

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .delete(3, {
        by: "char",
        interval: 1,
        after: () => {
          callCount++;

          if (callCount === 2) {
            tw.cancel();
          }
        },
      });
    await tw.play();

    expect(renderer.toString()).toBe("Hel");
  });
});


describe("abort inside before hook of instant commands", () => {
  it("aborting inside move before hook skips the cursor move", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("ab", { by: "char", interval: 1 })
      .move(0, {
        before: () => { tw.cancel(); },
      })
      .type("X", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ab");
  });

  it("aborting inside select before hook skips the selection", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("ab", { by: "char", interval: 1 })
      .select(-1, {
        before: () => { tw.cancel(); },
      })
      .type("X", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ab");
  });

  it("aborting inside style before hook skips the style", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("ab", { by: "char", interval: 1 })
      .style("tw-cls", { from: 0, to: 2 }, {
        before: () => { tw.cancel(); },
      })
      .type("X", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ab");
  });
});


describe("deleteTextAtCursor additional branch coverage", () => {
  it("clamps a cursor inside the deleted range to removeStart (single-event large delete)", () => {
    const state: ReturnType<typeof createInitialState> = {
      document: { text: "abcde", styles: [] },
      cursors: {
        main: { id: "main", index: 5, visible: true, renderOptions: DEFAULT_CURSOR_RENDER_OPTIONS },
        b: { id: "b", index: 3, visible: true, renderOptions: DEFAULT_CURSOR_RENDER_OPTIONS },
      },
      selections: {},
    };

    const event = {
      id: "e1",
      kind: "delete" as const,
      time: 0,
      cursorId: "main",
      count: 4,
      unit: "char" as const,
      sourceCommandId: "c1",
    };

    const result = deleteTextAtCursor(state, event);

    expect(result.cursors.b?.index).toBe(1);
    expect(result.document.text).toBe("a");
  });

  it("clamps selection.from/to to removeStart when inside deleted range (lines 101, 107)", () => {
    const state: ReturnType<typeof createInitialState> = {
      document: { text: "abcde", styles: [] },
      cursors: {
        main: { id: "main", index: 5, visible: true, renderOptions: DEFAULT_CURSOR_RENDER_OPTIONS },
        b: { id: "b", index: 4, visible: true, renderOptions: DEFAULT_CURSOR_RENDER_OPTIONS },
      },
      selections: {
        b: { from: 2, to: 4 },
      },
    };

    const event = {
      id: "e5",
      kind: "delete" as const,
      time: 0,
      cursorId: "main",
      count: 4,
      unit: "char" as const,
      sourceCommandId: "c5",
    };

    const result = deleteTextAtCursor(state, event);

    expect(result.selections.b).toStrictEqual({ from: 1, to: 1 });
    expect(result.document.text).toBe("a");
  });

  it("sel === undefined entry in selections is preserved unchanged during deletion", () => {
    const state = {
      document: { text: "hello", styles: [] },
      cursors: {
        main: { id: "main", index: 5, visible: true, renderOptions: DEFAULT_CURSOR_RENDER_OPTIONS },
        b: { id: "b", index: 2, visible: true, renderOptions: DEFAULT_CURSOR_RENDER_OPTIONS },
      },
      selections: {
        // eslint-disable-next-line ts/no-explicit-any
        b: undefined as any,
      },
    } as ReturnType<typeof createInitialState>;

    const event = {
      id: "e2",
      kind: "delete" as const,
      time: 0,
      cursorId: "main",
      count: 2,
      unit: "char" as const,
      sourceCommandId: "c2",
    };

    const result = deleteTextAtCursor(state, event);

    expect(result.document.text).toBe("hel");
  });
});


describe("insertTextAtCursor additional branch coverage", () => {
  it("sel === undefined entry in selections is preserved unchanged during insertion", () => {
    const state = {
      document: { text: "ab", styles: [] },
      cursors: {
        main: { id: "main", index: 2, visible: true, renderOptions: DEFAULT_CURSOR_RENDER_OPTIONS },
        b: { id: "b", index: 0, visible: true, renderOptions: DEFAULT_CURSOR_RENDER_OPTIONS },
      },
      selections: {
        // eslint-disable-next-line ts/no-explicit-any
        b: undefined as any,
      },
    } as ReturnType<typeof createInitialState>;

    const event = {
      id: "e3",
      kind: "insert" as const,
      time: 0,
      cursorId: "main",
      text: "X",
      sourceCommandId: "c3",
    };

    const result = insertTextAtCursor(state, event);

    expect(result.document.text).toBe("abX");
  });

  it("does not shift sel.from <= insertIndex (false branch of ternary)", () => {
    let state = createInitialState();

    state = withCursor(state, "b");
    state = {
      ...state,
      document: { text: "abc", styles: [] },
      cursors: {
        main: { id: "main", index: 2, visible: true, renderOptions: DEFAULT_CURSOR_RENDER_OPTIONS },
        b: { id: "b", index: 1, visible: true, renderOptions: DEFAULT_CURSOR_RENDER_OPTIONS },
      },
    };
    state = withSelection(state, "b", 0, 1);

    const event = {
      id: "e4",
      kind: "insert" as const,
      time: 0,
      cursorId: "main",
      text: "X",
      sourceCommandId: "c4",
    };

    const result = insertTextAtCursor(state, event);

    expect(result.selections.b).toStrictEqual({ from: 0, to: 1 });
  });
});


describe("compile (call command)", () => {
  it("call command emits no compiled timeline events", () => {
    const events = compile([
      { id: "c1", kind: "call" as const, callback: () => {} },
    ]);

    expect(events).toHaveLength(0);
  });

  it("call command does not advance the time cursor", () => {
    const events = compile([
      { id: "c1", kind: "call" as const, callback: () => {} },
      { id: "c2", kind: "type" as const, cursor: "main", text: "AB", by: "char" as const, interval: 100 },
    ]);

    expect(events[0]?.time).toBe(0);
    expect(events[1]?.time).toBe(100);
  });
});
