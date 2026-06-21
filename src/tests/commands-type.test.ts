import { describe, expect, it } from "vitest";

import { compile } from "../core/compiler/compile.helper";
import { createTypewriter, stringRenderer } from "../index";



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


describe("type — all valid units produce full text", () => {
  const CASES: Array<{ by: "char" | "grapheme" | "word" | "line" | "whole"; text: string }> = [
    { by: "char", text: "Hello world" },
    { by: "grapheme", text: "café 👨‍👩‍👧‍👦" },
    { by: "word", text: "one two three" },
    { by: "line", text: "line1\nline2\nline3" },
    { by: "whole", text: "all at once" },
  ];

  for (const { by, text } of CASES) {
    it(`by="${by}"`, async () => {
      const r = stringRenderer();
      const tw = createTypewriter({ renderer: r });

      tw.timeline.type(text, { by, interval: 1 });
      await tw.play();

      expect(r.toString()).toBe(text);
      assertInvariants(tw);
    });
  }
});


describe("type — amount > 1", () => {
  it("amount:2 char produces ceil(n/2) events", () => {
    const events = compile([{ id: "t", kind: "type", cursor: "main", text: "ABCDE", by: { unit: "char", amount: 2 }, interval: 1 }]);

    expect(events).toHaveLength(3);
  });

  it("amount:2 char inserts all text", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline.type("ABCDEF", { by: { unit: "char", amount: 2 }, interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("ABCDEF");
    assertInvariants(tw);
  });

  it("amount:3 word inserts all text", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline.type("one two three four five six", { by: { unit: "word", amount: 3 }, interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("one two three four five six");
    assertInvariants(tw);
  });

  it("amount:2 line inserts all text", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline.type("a\nb\nc\nd", { by: { unit: "line", amount: 2 }, interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("a\nb\nc\nd");
    assertInvariants(tw);
  });

  it("amount exceeding step count inserts everything in one event", () => {
    const events = compile([{ id: "t", kind: "type", cursor: "main", text: "Hi", by: { unit: "char", amount: 999 }, interval: 1 }]);

    expect(events).toHaveLength(1);
  });
});


describe("type — edge text", () => {
  it("empty string produces no events", () => {
    expect(compile([{ id: "t", kind: "type", cursor: "main", text: "" }])).toHaveLength(0);
  });

  it("single character produces one event", () => {
    expect(compile([{ id: "t", kind: "type", cursor: "main", text: "X" }])).toHaveLength(1);
  });

  it("multiline text by char — event count equals text.length", () => {
    const text = "line1\nline2";

    expect(compile([{ id: "t", kind: "type", cursor: "main", text, by: "char" }])).toHaveLength(text.length);
  });

  it("emoji grapheme clusters are preserved by char", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline.type("👨‍👩‍👧‍👦🇲🇦🎉", { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("👨‍👩‍👧‍👦🇲🇦🎉");
    assertInvariants(tw);
  });

  it("combining accent characters are preserved", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline.type("café naïve", { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("café naïve");
    assertInvariants(tw);
  });

  it("chaining two type commands accumulates text", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .type(" world", { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("Hello world");
    assertInvariants(tw);
  });
});


describe("type — before/after hooks", () => {
  it("before fires once per char", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    let n = 0;

    tw.timeline.type("ABC", { by: "char", interval: 1, before: () => {
      n++;
    } });
    await tw.play();

    expect(n).toBe(3);
  });

  it("after fires once per char", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    let n = 0;

    tw.timeline.type("ABC", { by: "char", interval: 1, after: () => {
      n++;
    } });
    await tw.play();

    expect(n).toBe(3);
  });

  it("before fires before insertion, after fires after", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    const log: string[] = [];

    tw.timeline.type("X", {
      by: "char",
      interval: 1,
      before: () => { log.push(`b:${r.toString()}`); },
      after: () => { log.push(`a:${r.toString()}`); },
    });
    await tw.play();

    expect(log).toEqual(["b:", "a:X"]);
  });

  it("before fires once per word when by=word", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    let n = 0;

    tw.timeline.type("one two three", { by: "word", interval: 1, before: () => {
      n++;
    } });
    await tw.play();

    expect(n).toBe(3);
  });

  it("before fires once when by=whole", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    let n = 0;

    tw.timeline.type("hello world", { by: "whole", interval: 1, before: () => {
      n++;
    } });
    await tw.play();

    expect(n).toBe(1);
  });

  it("before fires once per line when by=line", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });
    let n = 0;

    tw.timeline.type("a\nb\nc", { by: "line", interval: 1, before: () => {
      n++;
    } });
    await tw.play();

    expect(n).toBe(3);
  });
});


describe("type — selection replacement", () => {
  it("type over forward selection replaces selected text", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .type("JS", { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("Hello JS");
    assertInvariants(tw);
  });

  it("type over backward selection replaces selected text", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .select(-5)
      .type("JS", { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("Hello JS");
    assertInvariants(tw);
  });

  it("type over whole-doc selection replaces everything", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("old text", { by: "char", interval: 1 })
      .select("whole")
      .type("new text", { by: "whole", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("new text");
    assertInvariants(tw);
  });

  it("type empty over selection deletes selected text", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .type("", { by: "whole", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("Hello ");
    assertInvariants(tw);
  });

  it("cursor sits after replacement text", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .type("TypewriterJS", { by: "whole", interval: 1 });
    await tw.play();

    expect(tw.getLiveState().cursors.main?.index).toBe("Hello TypewriterJS".length);
    assertInvariants(tw);
  });

  it("selection is cleared after replacement", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .type("JS", { by: "char", interval: 1 });
    await tw.play();

    expect(tw.getLiveState().selections.main).toBeUndefined();
  });

  it("typed text by word inserts all new words after replacing selection", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("The quick brown fox", { by: "char", interval: 1 })
      .move(-3)
      .select(3)
      .type("dog jumps", { by: "word", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("The quick brown dog jumps");
    assertInvariants(tw);
  });
});


describe("type — styled typing", () => {
  it("inline string style appends style entries", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline.type("Hi", { by: "char", interval: 1, style: "tw-bold" });
    await tw.play();

    expect(tw.getLiveState().document.styles.length).toBeGreaterThan(0);
    assertInvariants(tw);
  });

  it("inline object style appends style entries", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline.type("Hi", { by: "char", interval: 1, style: { className: "tw-em" } });
    await tw.play();

    expect(tw.getLiveState().document.styles.length).toBeGreaterThan(0);
    assertInvariants(tw);
  });

  it("unstyle after inline typed style clears the style", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hi", { by: "char", interval: 1, style: "tw-bold" })
      .unstyle({ from: 0, to: 2 });
    await tw.play();

    expect(tw.getLiveState().document.styles).toHaveLength(0);
    assertInvariants(tw);
  });

  it("style then delete removes style entries for deleted range", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1, style: "tw-a" })
      .delete(-5, { by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("Hello ");
    assertInvariants(tw);
  });
});


describe("type — multi-cursor", () => {
  it("multi-cursor type appends text at both cursor positions", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline.type("X", { cursor: ["a", "b"], by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("XX");
    assertInvariants(tw);
  });

  it("single-cursor followup after multi-cursor type appends at cursor a's final position", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline
      .type("AB", { cursor: ["a", "b"], by: "char", interval: 1 })
      .type("!", { cursor: "a", by: "char", interval: 1 });
    await tw.play();

    expect(r.toString()).toBe("ABAB!");
    assertInvariants(tw);
  });

  it("multi-cursor type places each cursor at end of its typed text", async () => {
    const r = stringRenderer();
    const tw = createTypewriter({ renderer: r });

    tw.timeline.type("XYZ", { cursor: ["a", "b"], by: "char", interval: 1 });
    await tw.play();

    assertInvariants(tw);
    expect(r.toString()).toBe("XYZXYZ");
  });
});
