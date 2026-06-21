import { describe, expect, it } from "vitest";

import { createTypewriter, EPlaybackStatus, stringRenderer } from "../src/index";



function assertInvariants(tw: ReturnType<typeof createTypewriter>): void {
  const state = tw.getLiveState();
  const n = state.document.text.length;

  for (const c of Object.values(state.cursors)) {
    expect(c.index).toBeGreaterThanOrEqual(0);
    expect(c.index).toBeLessThanOrEqual(n);
  }

  for (const sel of Object.values(state.selections)) {
    if (sel) {
      expect(sel.from).toBeGreaterThanOrEqual(0);
      expect(sel.to).toBeLessThanOrEqual(n);
      expect(sel.from).toBeLessThanOrEqual(sel.to);
    }
  }

  for (const s of state.document.styles) {
    expect(s.from).toBeGreaterThanOrEqual(0);
    expect(s.to).toBeLessThanOrEqual(n);
    expect(s.from).toBeLessThanOrEqual(s.to);
  }
}


// ---------------------------------------------------------------------------
// style
// ---------------------------------------------------------------------------

describe("style - absolute range", () => {
  it("appends a style entry", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 5 });
    await tw.play();

    expect(tw.getLiveState().document.styles).toHaveLength(1);
    assertInvariants(tw);
  });

  it("multiple style commands accumulate entries", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 5 })
      .style("tw-b", { from: 6, to: 11 });
    await tw.play();

    expect(tw.getLiveState().document.styles).toHaveLength(2);
    assertInvariants(tw);
  });

  it("style object (css) is stored as-is", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .style({ css: { color: "red" } }, { from: 0, to: 2 });
    await tw.play();

    expect(tw.getLiveState().document.styles[0]?.style).toStrictEqual({ css: { color: "red" } });
    assertInvariants(tw);
  });

  it("zero-width range (from === to) is ignored", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .style("tw-a", { from: 1, to: 1 });
    await tw.play();

    expect(tw.getLiveState().document.styles).toHaveLength(0);
    assertInvariants(tw);
  });
});

describe("style - selection-based range", () => {
  it("style('selection') applies style over active selection", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .style("tw-sel", "selection");
    await tw.play();

    const styles = tw.getLiveState().document.styles;

    expect(styles).toHaveLength(1);
    expect(styles[0]).toStrictEqual({ from: 6, to: 11, style: "tw-sel" });
    assertInvariants(tw);
  });

  it("style('selection') with no active selection is a no-op", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .style("tw-sel", "selection");
    await tw.play();

    expect(tw.getLiveState().document.styles).toHaveLength(0);
    assertInvariants(tw);
  });

  it("style('selection') applies style over active selection without changing text", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .select(-3)
      .style("tw-a", "selection");
    await tw.play();

    expect(r.toString()).toBe("Hello");
    expect(tw.getLiveState().document.styles.length).toBeGreaterThan(0);
    assertInvariants(tw);
  });
});

describe("style - multi-cursor", () => {
  it("multi-cursor selection style applies per-cursor ranges", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("ABCDE", { by: "char", interval: 1 })
      .select(2, { cursor: ["a", "b"] })
      .style("tw-x", "selection");
    await tw.play();

    assertInvariants(tw);
  });
});

describe("style - before/after hooks", () => {
  it("before fires before style is applied", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    let stylesBefore = -1;

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 2 }, {
        before: () => { stylesBefore = tw.getLiveState().document.styles.length; },
      });
    await tw.play();

    expect(stylesBefore).toBe(0);
  });
});


// ---------------------------------------------------------------------------
// unstyle
// ---------------------------------------------------------------------------

describe("unstyle - absolute range", () => {
  it("removes a style entirely inside the unstyle range", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 11 })
      .unstyle({ from: 0, to: 11 });
    await tw.play();

    expect(tw.getLiveState().document.styles).toHaveLength(0);
    assertInvariants(tw);
  });

  it("clips a style overlapping from the left", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 7 })
      .unstyle({ from: 5, to: 11 });
    await tw.play();

    const styles = tw.getLiveState().document.styles;

    expect(styles).toHaveLength(1);
    expect(styles[0]?.to).toBeLessThanOrEqual(5);
    assertInvariants(tw);
  });

  it("clips a style overlapping from the right", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 4, to: 11 })
      .unstyle({ from: 0, to: 6 });
    await tw.play();

    const styles = tw.getLiveState().document.styles;

    expect(styles).toHaveLength(1);
    expect(styles[0]?.from).toBeGreaterThanOrEqual(6);
    assertInvariants(tw);
  });

  it("splits a style spanning the unstyle range into two fragments", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 11 })
      .unstyle({ from: 3, to: 8 });
    await tw.play();

    expect(tw.getLiveState().document.styles).toHaveLength(2);
    assertInvariants(tw);
  });

  it("unstyle on no-style document is a no-op", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .unstyle({ from: 0, to: 5 });
    await tw.play();

    expect(tw.getLiveState().document.styles).toHaveLength(0);
    assertInvariants(tw);
  });

  it("zero-width unstyle range is a no-op", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 2 })
      .unstyle({ from: 1, to: 1 });
    await tw.play();

    expect(tw.getLiveState().document.styles).toHaveLength(1);
    assertInvariants(tw);
  });
});

describe("unstyle - selection-based range", () => {
  it("unstyle('selection') removes styles in selection range", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 11 })
      .move(-5)
      .select(5)
      .unstyle("selection");
    await tw.play();

    const styles = tw.getLiveState().document.styles;

    expect(styles).toHaveLength(1);
    expect(styles[0]?.to).toBeLessThanOrEqual(6);
    assertInvariants(tw);
  });

  it("unstyle('selection') with no active selection is a no-op", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 2 })
      .unstyle("selection");
    await tw.play();

    expect(tw.getLiveState().document.styles).toHaveLength(1);
    assertInvariants(tw);
  });

  it("unstyle('selection') clears the selection", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 11 })
      .select(-5)
      .unstyle("selection");
    await tw.play();

    expect(tw.getLiveState().selections.main).toBeUndefined();
    assertInvariants(tw);
  });
});


// ---------------------------------------------------------------------------
// unselect
// ---------------------------------------------------------------------------

describe("unselect", () => {
  it("clears an active selection without changing cursor position", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .unselect();
    await tw.play();

    const state = tw.getLiveState();

    expect(state.selections.main).toBeUndefined();
    expect(state.cursors.main?.index).toBe(6);
    assertInvariants(tw);
  });

  it("unselect on a cursor with no selection is a no-op", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .unselect();
    await tw.play();

    expect(tw.getLiveState().selections.main).toBeUndefined();
    assertInvariants(tw);
  });

  it("multi-cursor unselect clears all targeted cursors", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("ABCDE", { by: "char", interval: 1 })
      .select(2, { cursor: "a" })
      .select(3, { cursor: "b" })
      .unselect({ cursor: ["a", "b"] });
    await tw.play();

    expect(tw.getLiveState().selections.a).toBeUndefined();
    expect(tw.getLiveState().selections.b).toBeUndefined();
    assertInvariants(tw);
  });

  it("before/after hooks fire around unselect", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    const log: string[] = [];

    tw.timeline
      .type("hi", { by: "char", interval: 1 })
      .select(-1)
      .unselect({
        before: () => { log.push("before"); },
        after: () => { log.push("after"); },
      });
    await tw.play();

    expect(log).toEqual(["before", "after"]);
  });
});


// ---------------------------------------------------------------------------
// wait
// ---------------------------------------------------------------------------

describe("wait", () => {
  it("wait does not change document text", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .wait(50)
      .type(" world", { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("Hello world");
    assertInvariants(tw);
  });

  it("zero-duration wait is a no-op", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("AB", { by: "char", interval: 1 })
      .wait(0)
      .type("CD", { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("ABCD");
    assertInvariants(tw);
  });

  it("before hook fires before the delay", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    let fired = false;

    tw.timeline
      .wait(10, { before: () => { fired = true; } });
    await tw.play();

    expect(fired).toBe(true);
  });

  it("after hook fires after the delay", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    let fired = false;

    tw.timeline
      .wait(10, { after: () => { fired = true; } });
    await tw.play();

    expect(fired).toBe(true);
  });
});


// ---------------------------------------------------------------------------
// call
// ---------------------------------------------------------------------------

describe("call", () => {
  it("callback fires during playback", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    let called = false;

    tw.timeline.call(() => {
      called = true;
    });
    await tw.play();

    expect(called).toBe(true);
  });

  it("async callback is awaited", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    let resolved = false;

    tw.timeline.call(async () => {
      await new Promise<void>(res => setTimeout(res, 5));
      resolved = true;
    });
    await tw.play();

    expect(resolved).toBe(true);
  });

  it("before/after hooks fire around the callback", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    const log: string[] = [];

    tw.timeline.call(
      () => { log.push("call"); },
      {
        before: () => { log.push("before"); },
        after: () => { log.push("after"); },
      },
    );
    await tw.play();

    expect(log).toEqual(["before", "call", "after"]);
  });

  it("call receives the current live state", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    let textAtCall = "";

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .call(() => { textAtCall = r.toString(); });
    await tw.play();

    expect(textAtCall).toBe("Hello");
  });

  it("multiple calls fire in order", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    const log: number[] = [];

    tw.timeline
      .call(() => { log.push(1); })
      .call(() => { log.push(2); })
      .call(() => { log.push(3); });
    await tw.play();

    expect(log).toEqual([1, 2, 3]);
  });
});


// ---------------------------------------------------------------------------
// mixed command chains (invariant checks)
// ---------------------------------------------------------------------------

describe("mixed chains - select → style → move", () => {
  it("select whole, style, then move clears selection", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .select("whole")
      .style("tw-h", "selection")
      .move("end");
    await tw.play();

    expect(tw.getLiveState().selections.main).toBeUndefined();
    expect(tw.getLiveState().document.styles).toHaveLength(1);
    assertInvariants(tw);
  });
});

describe("mixed chains - type → move → select → delete", () => {
  it("selects a word mid-sentence and deletes it", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("The quick brown fox", { by: "char", interval: 1 })
      .move(-4)
      .select(-6)
      .delete(-1, { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("The quick fox");
    assertInvariants(tw);
  });
});

describe("mixed chains - type → select → type (replacement) → type", () => {
  it("replaces selected text and continues typing", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .type("TypewriterJS", { by: "char", interval: 1 })
      .type("!", { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("Hello TypewriterJS!");
    assertInvariants(tw);
  });
});

describe("mixed chains - type → style → unstyle → restyle", () => {
  it("unstyle then restyle produces one style entry", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 5 })
      .unstyle({ from: 0, to: 5 })
      .style("tw-b", { from: 0, to: 5 });
    await tw.play();

    const styles = tw.getLiveState().document.styles;

    expect(styles).toHaveLength(1);
    expect(styles[0]?.style).toBe("tw-b");
    assertInvariants(tw);
  });
});

describe("mixed chains - move by word → delete by word → type", () => {
  it("corrects the second word in a sentence", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("The wrng word is here", { by: "char", interval: 1 })
      .move("start")
      .move(1, { by: "word" })
      .delete(1, { by: "word", interval: 1 })
      .type("wrong ", { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("The wrong word is here");
    assertInvariants(tw);
  });
});

describe("mixed chains - wait between operations", () => {
  it("wait between type and delete does not affect final output", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .wait(20)
      .delete(-6, { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("Hello");
    assertInvariants(tw);
  });
});

describe("mixed chains - call interleaved with type", () => {
  it("call fires between type steps with correct state", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    const snapshots: string[] = [];

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .call(() => { snapshots.push(r.toString()); })
      .type(" world", { by: "char", interval: 1 });
    await tw.play();

    expect(snapshots).toEqual(["Hello"]);
    expect(r.toString()).toBe("Hello world");
    assertInvariants(tw);
  });
});

describe("mixed chains - multi-cursor complex", () => {
  it("two cursors type then one deletes and types", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("AB", { cursor: ["a", "b"], by: "char", interval: 1 })
      .delete(-1, { cursor: "a", by: "char", interval: 1 })
      .type("X", { cursor: "a", by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("ABAX");
    assertInvariants(tw);
  });
});

describe("mixed chains - playback status after complex flow", () => {
  it("status is COMPLETED after a multi-command chain", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .wait(10)
      .select("whole")
      .style("tw-a", "selection")
      .move("end")
      .type("!", { by: "char", interval: 1 });
    await tw.play();

    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
    assertInvariants(tw);
  });
});
