import { describe, expect, it } from "vitest";

import { createTypewriter, stringRenderer } from "../src/index";



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
// delete
// ---------------------------------------------------------------------------

describe("delete — forward, all valid units", () => {
  const UNITS = ["char", "grapheme", "word", "line"] as const;

  for (const unit of UNITS) {
    it(`forward by "${unit}" shortens document`, async () => {
      const r = stringRenderer();
      const tw = createTypewriter({ renderer: r });
      const TEXT = "one two three\nfour";

      tw.timeline
        .type(TEXT, { by: "char", interval: 1 })
        .move("start")
        .delete(1, { by: unit, interval: 1 });
      await tw.play();

      expect(r.toString().length).toBeLessThan(TEXT.length);
      assertInvariants(tw);
    });
  }
});

describe("delete — backward, all valid units", () => {
  const UNITS = ["char", "grapheme", "word", "line"] as const;

  for (const unit of UNITS) {
    it(`backward by "${unit}" shortens document`, async () => {
      const r = stringRenderer();
      const tw = createTypewriter({ renderer: r });
      const TEXT = "one two three\nfour";

      tw.timeline
        .type(TEXT, { by: "char", interval: 1 })
        .delete(-1, { by: unit, interval: 1 });
      await tw.play();

      expect(r.toString().length).toBeLessThan(TEXT.length);
      assertInvariants(tw);
    });
  }
});

describe("delete — boundary operands", () => {
  it("delete('start') removes text from cursor to start", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move(-5)
      .delete("start");
    await tw.play();

    expect(r.toString()).toBe("world");
    assertInvariants(tw);
  });

  it("delete('end') removes text from cursor to end", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move(-5)
      .delete("end");
    await tw.play();

    expect(r.toString()).toBe("hello ");
    assertInvariants(tw);
  });

  it("delete('whole') removes entire document", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .delete("whole");
    await tw.play();

    expect(r.toString()).toBe("");
    assertInvariants(tw);
  });

  it("delete('start') at document start is a no-op", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hi", { by: "char", interval: 1 })
      .move("start")
      .delete("start");
    await tw.play();

    expect(r.toString()).toBe("hi");
    assertInvariants(tw);
  });

  it("delete('end') at document end is a no-op", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hi", { by: "char", interval: 1 })
      .delete("end");
    await tw.play();

    expect(r.toString()).toBe("hi");
    assertInvariants(tw);
  });

  it("delete('whole') on empty document is a no-op", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline.delete("whole");
    await tw.play();

    expect(r.toString()).toBe("");
    assertInvariants(tw);
  });
});

describe("delete — amount > 1", () => {
  it("backward amount:2 removes 2 words per step", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("one two three four", { by: "char", interval: 1 })
      .delete(-2, { by: { unit: "word", amount: 2 }, interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("one two ");
    assertInvariants(tw);
  });

  it("forward amount:2 removes 2 chars per step", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("ABCDEF", { by: "char", interval: 1 })
      .move("start")
      .delete(4, { by: { unit: "char", amount: 2 }, interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("EF");
    assertInvariants(tw);
  });
});

describe("delete — with active selection", () => {
  it("delete(-1) with selection removes selected range", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .delete(-1, { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("Hello ");
    assertInvariants(tw);
  });

  it("delete(1) with selection removes selected range", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .delete(1, { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("Hello ");
    assertInvariants(tw);
  });

  it("delete('start') with selection removes selected range", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .delete("start");
    await tw.play();

    expect(r.toString()).toBe("Hello ");
    assertInvariants(tw);
  });

  it("delete('whole') with selection clears entire document", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .delete("whole");
    await tw.play();

    expect(r.toString()).toBe("");
    assertInvariants(tw);
  });

  it("delete clears selection and places cursor at start of deleted range", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .delete(-1, { by: "char", interval: 1 });
    await tw.play();

    const state = tw.getLiveState();

    expect(state.selections.main).toBeUndefined();
    expect(state.cursors.main?.index).toBe(6);
    assertInvariants(tw);
  });
});

describe("delete — before/after hooks", () => {
  it("before fires once per backward step", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    let n = 0;

    tw.timeline
      .type("ABCDE", { by: "char", interval: 1 })
      .delete(-3, { by: "char", interval: 1, before: () => { n++; } });
    await tw.play();

    expect(n).toBe(3);
  });

  it("after fires once per forward step", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    let n = 0;

    tw.timeline
      .type("ABCDE", { by: "char", interval: 1 })
      .move("start")
      .delete(3, { by: "char", interval: 1, after: () => { n++; } });
    await tw.play();

    expect(n).toBe(3);
  });

  it("before fires once for boundary delete", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    let n = 0;

    tw.timeline
      .type("hello", { by: "char", interval: 1 })
      .delete("whole", { before: () => { n++; } });
    await tw.play();

    expect(n).toBe(1);
  });
});

describe("delete — clamping", () => {
  it("backward delete clamped at document start", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .delete(-100, { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("");
    assertInvariants(tw);
  });

  it("forward delete clamped at document end", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .move("start")
      .delete(100, { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("");
    assertInvariants(tw);
  });
});

describe("delete — style range interactions", () => {
  it("delete inside styled range trims the style", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 11 })
      .delete(-5, { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("Hello ");
    assertInvariants(tw);
  });

  it("delete removing style entirely purges it", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-b", { from: 6, to: 11 })
      .delete(-5, { by: "char", interval: 1 });
    await tw.play();

    expect(tw.getLiveState().document.styles).toHaveLength(0);
    assertInvariants(tw);
  });
});


// ---------------------------------------------------------------------------
// move
// ---------------------------------------------------------------------------

describe("move — all valid units forward", () => {
  const UNITS = ["char", "grapheme", "word", "line"] as const;

  for (const unit of UNITS) {
    it(`forward by "${unit}" advances cursor`, async () => {
      const r = stringRenderer();
      const tw = createTypewriter({ renderer: r });

      tw.timeline
        .type("one two three\nfour", { by: "char", interval: 1 })
        .move("start")
        .move(1, { by: unit })
        .type("X", { by: "char", interval: 1 });
      await tw.play();

      expect(r.toString()).not.toBe("one two three\nfour");
      assertInvariants(tw);
    });
  }
});

describe("move — all valid units backward", () => {
  const UNITS = ["char", "grapheme", "word", "line"] as const;

  for (const unit of UNITS) {
    it(`backward by "${unit}" retreats cursor`, async () => {
      const r = stringRenderer();
      const tw = createTypewriter({ renderer: r });

      tw.timeline
        .type("one two three\nfour", { by: "char", interval: 1 })
        .move(-1, { by: unit })
        .type("X", { by: "char", interval: 1 });
      await tw.play();

      expect(r.toString().length).toBeGreaterThan("one two three\nfour".length);
      assertInvariants(tw);
    });
  }
});

describe("move — boundary operands", () => {
  it("move('start') jumps to index 0", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move("start")
      .type(">", { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe(">hello world");
    assertInvariants(tw);
  });

  it("move('end') jumps to document end", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move("start")
      .move("end")
      .type("!", { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("hello world!");
    assertInvariants(tw);
  });

  it("move zero does not change document text", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hello", { by: "char", interval: 1 })
      .move(0)
      .type("!", { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("hello!");
    assertInvariants(tw);
  });
});

describe("move — clamping", () => {
  it("large positive offset clamps to document end", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .move(9999)
      .type("!", { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("Hi!");
    assertInvariants(tw);
  });

  it("large negative offset clamps to document start", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .move(-9999)
      .type(">", { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe(">Hi");
    assertInvariants(tw);
  });
});

describe("move — clears selection", () => {
  it("any move clears the active selection", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .select("whole")
      .move(1);
    await tw.play();

    expect(tw.getLiveState().selections.main).toBeUndefined();
    assertInvariants(tw);
  });

  it("move('start') clears selection on a cursor already at 0", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hello", { by: "char", interval: 1 })
      .move("start")
      .select(3)
      .move("start");
    await tw.play();

    expect(tw.getLiveState().selections.main).toBeUndefined();
    assertInvariants(tw);
  });
});

describe("move — before/after hooks", () => {
  it("before fires before cursor moves, after fires after", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    const log: number[] = [];

    tw.timeline
      .type("hello", { by: "char", interval: 1 })
      .move(-2, {
        before: () => { log.push(tw.getLiveState().cursors.main?.index ?? -1); },
        after: () => { log.push(tw.getLiveState().cursors.main?.index ?? -1); },
      });
    await tw.play();

    expect(log[0]).toBe(5);
    expect(log[1]).toBe(3);
  });
});

describe("move — multi-cursor", () => {
  it("move targets only the specified cursor", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("abc", { by: "char", interval: 1 })
      .move("start", { cursor: "a" })
      .type("X", { cursor: "a", by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("Xabc");
    assertInvariants(tw);
  });
});


// ---------------------------------------------------------------------------
// select
// ---------------------------------------------------------------------------

describe("select — all valid units forward", () => {
  const UNITS = ["char", "grapheme", "word", "line"] as const;

  for (const unit of UNITS) {
    it(`forward by "${unit}" creates a selection`, async () => {
      const r = stringRenderer();
      const tw = createTypewriter({ renderer: r });

      tw.timeline
        .type("one two three\nfour", { by: "char", interval: 1 })
        .move("start")
        .select(1, { by: unit });
      await tw.play();

      const sel = tw.getLiveState().selections.main;

      expect(sel).toBeDefined();
      expect(sel!.from).toBeLessThan(sel!.to);
      assertInvariants(tw);
    });
  }
});

describe("select — all valid units backward", () => {
  const UNITS = ["char", "grapheme", "word", "line"] as const;

  for (const unit of UNITS) {
    it(`backward by "${unit}" creates a selection`, async () => {
      const r = stringRenderer();
      const tw = createTypewriter({ renderer: r });

      tw.timeline
        .type("one two three\nfour", { by: "char", interval: 1 })
        .select(-1, { by: unit });
      await tw.play();

      const sel = tw.getLiveState().selections.main;

      expect(sel).toBeDefined();
      expect(sel!.from).toBeLessThan(sel!.to);
      assertInvariants(tw);
    });
  }
});

describe("select — boundary operands", () => {
  it("select('start') selects from cursor to document start", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move(-5)
      .select("start");
    await tw.play();

    expect(tw.getLiveState().selections.main).toStrictEqual({ from: 0, to: 6 });
    assertInvariants(tw);
  });

  it("select('end') selects from cursor to document end", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move("start")
      .select("end");
    await tw.play();

    expect(tw.getLiveState().selections.main).toStrictEqual({ from: 0, to: 11 });
    assertInvariants(tw);
  });

  it("select('whole') selects entire document", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move(-3)
      .select("whole");
    await tw.play();

    expect(tw.getLiveState().selections.main).toStrictEqual({ from: 0, to: 11 });
    assertInvariants(tw);
  });

  it("select('start') at document start produces zero-width and clears", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hi", { by: "char", interval: 1 })
      .move("start")
      .select("start");
    await tw.play();

    expect(tw.getLiveState().selections.main).toBeUndefined();
    assertInvariants(tw);
  });

  it("select('end') at document end produces zero-width and clears", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hi", { by: "char", interval: 1 })
      .select("end");
    await tw.play();

    expect(tw.getLiveState().selections.main).toBeUndefined();
    assertInvariants(tw);
  });
});

describe("select — replaces previous selection", () => {
  it("second select replaces first", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .select(-5)
      .select(-2);
    await tw.play();

    expect(tw.getLiveState().selections.main).toStrictEqual({ from: 9, to: 11 });
    assertInvariants(tw);
  });
});

describe("select — amount > 1", () => {
  it("amount:2 word selects two words forward", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("one two three", { by: "char", interval: 1 })
      .move("start")
      .select(2, { by: { unit: "word", amount: 1 } });
    await tw.play();

    const sel = tw.getLiveState().selections.main;

    expect(sel).toBeDefined();
    assertInvariants(tw);
  });
});

describe("select — before/after hooks", () => {
  it("before fires before selection, after fires after", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    const log: Array<boolean> = [];

    tw.timeline
      .type("hello", { by: "char", interval: 1 })
      .select(-3, {
        before: () => { log.push(tw.getLiveState().selections.main === undefined); },
        after: () => { log.push(tw.getLiveState().selections.main !== undefined); },
      });
    await tw.play();

    expect(log).toEqual([true, true]);
  });
});

describe("select — multi-cursor", () => {
  it("select targets only the specified cursor", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hello", { by: "char", interval: 1 })
      .move(3, { cursor: "a" })
      .select(-2, { cursor: "a" });
    await tw.play();

    expect(tw.getLiveState().selections.a).toBeDefined();
    expect(tw.getLiveState().selections.main).toBeUndefined();
    assertInvariants(tw);
  });

  it("multi-cursor select creates independent selections", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .select(2, { cursor: ["a", "b"] });
    await tw.play();

    expect(tw.getLiveState().selections.a).toBeDefined();
    expect(tw.getLiveState().selections.b).toBeDefined();
    assertInvariants(tw);
  });
});
