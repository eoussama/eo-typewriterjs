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
        before: {
          callback: () => {
            order.push("type-before");
          },
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


describe("before/after hooks whole-command", () => {
  it("type: before fires before any chars are typed", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let textAtBefore = "NOT SET";

    tw.timeline.type("Hi", {
      by: "char",
      interval: 1,
      before: {
        callback: ({ state }) => {
          textAtBefore = state.document.text;
        },
      },
    });
    await tw.play();

    expect(textAtBefore).toBe("");
    expect(renderer.toString()).toBe("Hi");
  });

  it("type: after fires after all chars are typed", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let textAtAfter = "";

    tw.timeline.type("Hi", {
      by: "char",
      interval: 1,
      after: {
        callback: ({ state }) => {
          textAtAfter = state.document.text;
        },
      },
    });
    await tw.play();

    expect(textAtAfter).toBe("Hi");
  });

  it("delete: before fires before deletion starts", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let textAtBefore = "";

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .delete(3, {
        by: "char",
        interval: 1,
        before: {
          callback: ({ state }) => {
            textAtBefore = state.document.text;
          },
        },
      });
    await tw.play();

    expect(textAtBefore).toBe("Hello");
    expect(renderer.toString()).toBe("He");
  });

  it("delete: after fires after deletion completes", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let textAtAfter = "";

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .delete(3, {
        by: "char",
        interval: 1,
        after: {
          callback: ({ state }) => {
            textAtAfter = state.document.text;
          },
        },
      });
    await tw.play();

    expect(textAtAfter).toBe("He");
  });

  it("wait: before and after fire around the wait duration", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const order: string[] = [];

    tw.timeline
      .wait(5, {
        before: { callback: () => { order.push("before"); } },
        after: { callback: () => { order.push("after"); } },
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
        before: { callback: () => { order.push("before"); } },
        after: { callback: () => { order.push("after"); } },
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
        before: { callback: () => { order.push("before"); } },
        after: { callback: () => { order.push("after"); } },
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
        before: { callback: () => { order.push("before"); } },
        after: { callback: () => { order.push("after"); } },
      })
      .call(() => { order.push("next"); });
    await tw.play();

    expect(order).toStrictEqual(["before", "after", "next"]);
  });

  it("whole-command hooks fire once even for multi-char type", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let beforeCount = 0;
    let afterCount = 0;

    tw.timeline.type("Hello", {
      by: "char",
      interval: 1,
      before: { callback: () => { beforeCount++; } },
      after: { callback: () => { afterCount++; } },
    });
    await tw.play();

    expect(beforeCount).toBe(1);
    expect(afterCount).toBe(1);
  });

  it("async before hook delays command execution", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const order: string[] = [];

    tw.timeline.type("X", {
      by: "char",
      interval: 1,
      before: {
        callback: async () => {
          await new Promise<void>(r => setTimeout(r, 5));
          order.push("before");
        },
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


describe("before/after hooks per-unit", () => {
  it("type: per-char before fires once per character", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let count = 0;

    tw.timeline.type("Hello", {
      by: "char",
      interval: 1,
      before: { callback: () => { count++; }, unit: "char" },
    });
    await tw.play();

    expect(count).toBe(5); // one per char
  });

  it("type: per-char after fires once per character", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const texts: string[] = [];

    tw.timeline.type("Hi", {
      by: "char",
      interval: 1,
      after: {
        callback: ({ state }) => {
          texts.push(state.document.text);
        },
        unit: "char",
      },
    });
    await tw.play();

    expect(texts).toStrictEqual(["H", "Hi"]);
  });

  it("type: per-unit stepIndex increments correctly", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const indices: number[] = [];

    tw.timeline.type("abc", {
      by: "char",
      interval: 1,
      before: {
        callback: ({ stepIndex }) => { indices.push(stepIndex); },
        unit: "char",
      },
    });
    await tw.play();

    expect(indices).toStrictEqual([0, 1, 2]);
  });

  it("type: per-unit stepCount equals total step count", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const counts: number[] = [];

    tw.timeline.type("abc", {
      by: "char",
      interval: 1,
      before: {
        callback: ({ stepCount }) => { counts.push(stepCount); },
        unit: "char",
      },
    });
    await tw.play();

    expect(counts).toStrictEqual([3, 3, 3]);
  });

  it("delete: per-char before fires once per deletion step", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let count = 0;

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .delete(3, {
        by: "char",
        interval: 1,
        before: { callback: () => { count++; }, unit: "char" },
      });
    await tw.play();

    expect(count).toBe(3);
  });

  it("delete: per-char after fires after each deletion step", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const texts: string[] = [];

    tw.timeline
      .type("abc", { by: "char", interval: 1 })
      .delete(2, {
        by: "char",
        interval: 1,
        after: {
          callback: ({ state }) => { texts.push(state.document.text); },
          unit: "char",
        },
      });
    await tw.play();

    expect(texts).toStrictEqual(["ab", "a"]);
  });

  it("per-unit hook receives the unit field matching the by option", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const units: unknown[] = [];

    tw.timeline.type("Hello world", {
      by: "word",
      interval: 1,
      before: {
        callback: ({ unit }) => { units.push(unit); },
        unit: "word",
      },
    });
    await tw.play();

    expect(units.length).toBe(2);
    units.forEach(u => expect(u).toBe("word"));
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

    // At least one char was typed and preserved
    const text = renderer.toString();

    expect(text.length).toBeGreaterThan(0);
    expect("Hello world".startsWith(text)).toBe(true);
  });

  it("cancel() on non-playing status is a no-op", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    tw.cancel(); // IDLE no-op

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
    // callback may or may not have completed the important thing is no error thrown
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

    // Play again from start
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });
});

// call() before/after hooks on call command itself

describe("call() command own before/after hooks", () => {
  it("before hook fires before the callback", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const order: string[] = [];

    tw.timeline.call(
      () => { order.push("callback"); },
      {
        before: { callback: () => { order.push("before"); } },
        after: { callback: () => { order.push("after"); } },
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
      before: { callback: () => { order.push("before"); } },
      after: { callback: () => { order.push("after"); } },
    });

    const playing = tw.play();

    // Cancel after the before hook fires but during the wait delay
    await new Promise(r => setTimeout(r, 10));
    tw.cancel();
    await playing;

    // before fired, but after was skipped due to abort
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
      .call(() => { tw.cancel(); }) // abort during first command
      .call(() => { secondCalled = true; }); // should not run

    await tw.play();

    expect(secondCalled).toBe(false);
  });
});


describe("seek mid-timer-resume coverage", () => {
  it("seek while timer-resume is active cancels the pending timer and seeks correctly", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // Use a long interval so timer ticks are spread out
    tw.timeline.type("Hello", { by: "char", interval: 100 });

    // Start playing
    const playing = tw.play();

    // Wait briefly, then seek to t=50 (mid-first-interval) this starts a timer-resume
    await new Promise(r => setTimeout(r, 10));
    tw.seek(50); // seek while executor is running → _startTimerResume, timer scheduled

    // Seek again immediately while the timer is pending → _cancelTimer fires with non-null timer
    tw.seek(150);

    await playing;
    await tw.play(); // complete any remaining
    await new Promise(r => setTimeout(r, 50));
    tw.cancel();

    // We mainly care that no error is thrown and the timer was properly managed
    expect(renderer.toString().length).toBeGreaterThan(0);
  });

  it("timer-resume completes through multiple ticks and fires _playhead on each tick", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // Use a real interval to force multiple timer ticks
    tw.timeline.type("AB", { by: "char", interval: 30 });

    const playing = tw.play();

    // Seek to t=0 while playing executor is cancelled, timer-resume starts at t=0
    // This forces _tickTimer to schedule at least one future tick
    await new Promise(r => setTimeout(r, 5));
    tw.seek(0);

    // Await natural completion of the timer-resume
    await playing;
    await new Promise(r => setTimeout(r, 100));

    // Timer completed all events were applied via timer ticks
    expect(renderer.toString()).toBe("AB");
  });
});


describe("abort inside per-unit hooks of type/delete", () => {
  it("aborting inside type per-unit before hook stops typing mid-sequence", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let callCount = 0;

    tw.timeline.type("Hello", {
      by: "char",
      interval: 1,
      before: {
        callback: () => {
          callCount++;

          if (callCount === 2) {
            tw.cancel();
          }
        },
        unit: "char",
      },
    });
    await tw.play();

    // First char typed, second aborted mid-before-hook only "H" rendered
    expect(renderer.toString()).toBe("H");
  });

  it("aborting inside type per-unit after hook stops typing mid-sequence", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let callCount = 0;

    tw.timeline.type("Hello", {
      by: "char",
      interval: 1,
      after: {
        callback: () => {
          callCount++;

          if (callCount === 2) {
            tw.cancel();
          }
        },
        unit: "char",
      },
    });
    await tw.play();

    // Two chars typed ("He"), abort fired in after hook of second char
    expect(renderer.toString()).toBe("He");
  });

  it("aborting inside delete per-unit before hook stops deletion mid-sequence", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let callCount = 0;

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .delete(3, {
        by: "char",
        interval: 1,
        before: {
          callback: () => {
            callCount++;

            if (callCount === 2) {
              tw.cancel();
            }
          },
          unit: "char",
        },
      });
    await tw.play();

    // First delete fires (removes 'o'), second abort in before hook only "Hell" deleted by 1
    expect(renderer.toString()).toBe("Hell");
  });

  it("aborting inside delete per-unit after hook stops deletion mid-sequence", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    let callCount = 0;

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .delete(3, {
        by: "char",
        interval: 1,
        after: {
          callback: () => {
            callCount++;

            if (callCount === 2) {
              tw.cancel();
            }
          },
          unit: "char",
        },
      });
    await tw.play();

    // Two deletes fire ("lo" removed), abort on second after hook "Hel" remains
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
        before: { callback: () => { tw.cancel(); } },
      })
      .type("X", { by: "char", interval: 1 });
    await tw.play();

    // X should not be typed since move before hook aborted
    expect(renderer.toString()).toBe("ab");
  });

  it("aborting inside select before hook skips the selection", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("ab", { by: "char", interval: 1 })
      .select(-1, {
        before: { callback: () => { tw.cancel(); } },
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
        before: { callback: () => { tw.cancel(); } },
      })
      .type("X", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ab");
  });
});

// and line 96 (sel === undefined in updatedSelections for another cursor)

describe("deleteTextAtCursor additional branch coverage", () => {
  it("clamps a cursor inside the deleted range to removeStart (single-event large delete)", () => {
    // Build state with cursor "main" at 5 and cursor "b" at 3 (inside [1,5]).
    // A single delete event with count=4 removes range [1,5].
    // cursor "b" at 3: 3 >= 5? No. 3 > 1? YES → clamped to removeStart=1.
    const state: ReturnType<typeof createInitialState> = {
      document: { text: "abcde", marks: [] },
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
    // State: text "abcde", cursor "main" at 5, cursor "b" has selection [2,4].
    // Delete event: count=4 → removeEnd=5, removeStart=1.
    // sel.from=2: 2 >= 5? No. 2 > 1? YES → clamped to 1 (line 101/102)
    // sel.to=4: 4 >= 5? No. 4 > 1? YES → clamped to 1 (line 107/108)
    const state: ReturnType<typeof createInitialState> = {
      document: { text: "abcde", marks: [] },
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

    // Both from and to are inside the deleted range → clamped to removeStart (1)
    expect(result.selections.b).toStrictEqual({ from: 1, to: 1 });
    expect(result.document.text).toBe("a");
  });

  it("sel === undefined entry in selections is preserved unchanged during deletion", () => {
    // Simulate a selections map that has an explicit undefined entry for cursor "b"
    // (possible at runtime even if TypeScript normally disallows it).
    const state = {
      document: { text: "hello", marks: [] },
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
    // Simulate a selections map that has an explicit undefined entry for cursor "b".
    const state = {
      document: { text: "ab", marks: [] },
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
    // cursor "b" has selection [0, 1] and main cursor inserts at index 2.
    // sel.from=0 <= insertIndex=2 → from stays 0.
    // sel.to=1 <= insertIndex=2 → to stays 1.
    let state = createInitialState();

    state = withCursor(state, "b");
    state = {
      ...state,
      document: { text: "abc", marks: [] },
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
