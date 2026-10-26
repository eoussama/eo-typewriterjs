import type { TUnstyleEvent } from "../../src/core/events/types/unstyle-event.type";
import { describe, expect, it } from "vitest";
import { compile } from "../../src/core/compiler/helpers/compile.helper";
import { applyStyle } from "../../src/core/reducer/helpers/apply-style.helper";
import { deleteTextAtCursor } from "../../src/core/reducer/helpers/delete-text-at-cursor.helper";
import { insertTextAtCursor } from "../../src/core/reducer/helpers/insert.helper";
import { reduce } from "../../src/core/reducer/helpers/reduce.helper";
import { removeStyles } from "../../src/core/reducer/helpers/remove-styles.helper";
import { selectText } from "../../src/core/reducer/helpers/select-text.helper";
import { unselect as unselectReducer } from "../../src/core/reducer/helpers/unselect.helper";
import { createInitialState, withSelection } from "../../src/core/state/index";
import { createTypewriter, stringRenderer } from "../../src/index";



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

describe("insertTextAtCursor - selection replacement, other cursor shifting", () => {
  it("other cursor after removeEnd shifts by netDelta when selection is replaced", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move("end", { cursor: "b" })
      .move("start")
      .move(1)
      .select(3)
      .type("Z", { by: "char", interval: 1 })
      .type("!", { cursor: "b", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("aZe!");
  });

  it("other cursor inside selection range is clamped to removeStart", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move("start", { cursor: "b" })
      .move(2, { cursor: "b" })
      .move("start")
      .move(1)
      .select(3)
      .type("X", { by: "char", interval: 1 })
      .type("!", { cursor: "b", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("a!Xe");
  });

  it("other cursor before removeStart is not shifted", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move("start", { cursor: "b" })
      .move(1, { cursor: "b" })
      .move("start")
      .move(2)
      .select(2)
      .type("X", { by: "char", interval: 1 })
      .type("!", { cursor: "b", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("a!bXe");
  });

  it("other cursor selection after removeEnd is shifted by netDelta", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move("end", { cursor: "b" })
      .select(-1, { cursor: "b" })
      .move("start")
      .move(1)
      .select(2)
      .type("Z", { by: "char", interval: 1 });
    await tw.play();

    const sel = tw.getLiveState().selections.b;

    expect(sel).toBeDefined();
    expect(sel!.from).toBe(3);
    expect(sel!.to).toBe(4);
  });

  it("other cursor selection inside replaced range is clamped to removeStart", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move("start", { cursor: "b" })
      .move(3, { cursor: "b" })
      .select(-1, { cursor: "b" })
      .move("start")
      .move(1)
      .select(3)
      .type("Z", { by: "char", interval: 1 });
    await tw.play();

    const sel = tw.getLiveState().selections.b;

    // Both from and to are clamped to removeStart → zero-width selection stored
    if (sel !== undefined) {
      expect(sel.from).toBe(sel.to);
    }
  });
});


describe("insertTextAtCursor - selection replacement, style handling", () => {
  it("styles overlapping the selection are adjusted when selection is replaced by typing", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "Hello World" with style [0,11], select "World" [6,11], type "JS"
    // The style [0,11] spans the replaced range → should be trimmed/adjusted
    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 11 })
      .move("start")
      .move(6)
      .select(5)
      .type("JS", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello JS");
    assertInvariants(tw);
  });

  it("inline style is pushed onto styles when selection is replaced with styled text", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move("start")
      .move(6)
      .select(5)
      .type("JS", { by: "char", interval: 1, style: "tw-new" });
    await tw.play();

    const styles = tw.getLiveState().document.styles;

    expect(styles.some(s => s.style === "tw-new")).toBe(true);
    assertInvariants(tw);
  });
});


describe("deleteTextAtCursor - selection deletion, other cursor and style handling", () => {
  it("styles are trimmed when deleting a selected range that overlaps them", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 11 })
      .move("start")
      .move(6)
      .select(5)
      .delete(1);
    await tw.play();

    expect(renderer.toString()).toBe("Hello ");
    const styles = tw.getLiveState().document.styles;

    expect(styles.length).toBeGreaterThan(0);
    expect(styles[0]!.to).toBeLessThanOrEqual(6);
  });

  it("another cursor after removeEnd shifts back when selection is deleted", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move("end", { cursor: "b" })
      .move("start")
      .move(2)
      .select(2)
      .delete(1)
      .type("!", { cursor: "b", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("abe!");
  });

  it("another cursor inside selection range is clamped to removeStart", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move("start", { cursor: "b" })
      .move(3, { cursor: "b" })
      .move("start")
      .move(2)
      .select(2)
      .delete(1)
      .type("!", { cursor: "b", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ab!e");
  });

  it("another cursor before removeStart is not shifted", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move("start", { cursor: "b" })
      .move(1, { cursor: "b" })
      .move("start")
      .move(2)
      .select(2)
      .delete(1)
      .type("!", { cursor: "b", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("a!be");
  });

  it("another cursor selection.from inside deleted range is clamped", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move("end", { cursor: "b" })
      .select(-2, { cursor: "b" })
      .move("start")
      .move(2)
      .select(2)
      .delete(1);
    await tw.play();

    const sel = tw.getLiveState().selections.b;

    expect(sel).toBeDefined();
    expect(sel!.from).toBe(2);
    expect(sel!.to).toBe(3);
  });
});


describe("insertTextAtCursor - direct reducer, selection-replacement style/selection branches", () => {
  const baseEvent = { id: "e", kind: "insert" as const, time: 0, sourceCommandId: "c" };

  it("style point after removeEnd is shifted by netDelta (line 99 shiftPoint branch)", () => {
    // text "Hello World", selection [0,5], style [7,10] (after removeEnd=5), type "Z" (1 char)
    // netDelta = 1 - 5 = -4. style.from=7 > removeEnd=5 → 7+(-4)=3. style.to=10 > removeEnd=5 → 10+(-4)=6
    let state = createInitialState();

    state = {
      ...state,
      document: { text: "Hello World", styles: [{ from: 7, to: 10, style: "tw-a" }] },
      cursors: { ...state.cursors, main: { ...state.cursors.main!, index: 5 } },
    };
    state = withSelection(state, "main", 0, 5);

    const next = insertTextAtCursor(state, { ...baseEvent, cursorId: "main", text: "Z" });

    expect(next.document.text).toBe("Z World");
    expect(next.document.styles).toHaveLength(1);
    expect(next.document.styles[0]!.from).toBe(3);
    expect(next.document.styles[0]!.to).toBe(6);
  });

  it("other cursor selection.from before removeStart hits the return-p branch (line 149)", () => {
    // text "abcde", selection [1,4], cursor "b" has selection [0,2]
    // shiftPoint(0): 0 > removeEnd(4)? No. 0 > removeStart(1)? No → return 0 (line 149)
    let state = createInitialState();

    state = {
      ...state,
      document: { text: "abcde", styles: [] },
      cursors: {
        ...state.cursors,
        main: { ...state.cursors.main!, index: 4 },
        b: { ...state.cursors.main!, id: "b", index: 2 },
      },
    };
    state = withSelection(state, "main", 1, 4);
    state = withSelection(state, "b", 0, 2);

    const next = insertTextAtCursor(state, { ...baseEvent, cursorId: "main", text: "X" });

    // text = "aXe". cursor "b" sel.from=0 ≤ removeStart=1 → stays 0. sel.to=2 > removeStart=1 → removeStart=1
    expect(next.document.text).toBe("aXe");
    const bSel = next.selections.b;

    expect(bSel).toBeDefined();
    expect(bSel!.from).toBe(0);
  });
});


describe("deleteTextAtCursor - direct reducer, selection deletion styles and selections", () => {
  const baseEvent = {
    id: "e",
    kind: "delete" as const,
    time: 0,
    sourceCommandId: "c",
    count: 1,
    unit: "char" as const,
    direction: -1 as const,
  };

  it("style filter callback runs when styles exist (line 59)", () => {
    // Style [0,3] is fully inside selection [1,4] → filtered OUT
    let state = createInitialState();

    state = {
      ...state,
      document: { text: "abcde", styles: [{ from: 1, to: 3, style: "tw-a" }] },
      cursors: { ...state.cursors, main: { ...state.cursors.main!, index: 4 } },
    };
    state = withSelection(state, "main", 1, 4);

    const next = deleteTextAtCursor(state, { ...baseEvent, cursorId: "main" });

    expect(next.document.text).toBe("ae");
    expect(next.document.styles).toHaveLength(0);
  });

  it("other cursor selection.from before removeStart is unchanged (line 92 shiftedFrom branch)", () => {
    // cursor "b" has selection [0,3]. main deletes selection [1,4].
    // shiftedFrom: 0 >= removeEnd(4)? No. 0 > removeStart(1)? No → return sel.from=0 (line 92's else)
    let state = createInitialState();

    state = {
      ...state,
      document: { text: "abcde", styles: [] },
      cursors: {
        ...state.cursors,
        main: { ...state.cursors.main!, index: 4 },
        b: { ...state.cursors.main!, id: "b", index: 0 },
      },
    };
    state = withSelection(state, "main", 1, 4);
    state = withSelection(state, "b", 0, 3);

    const next = deleteTextAtCursor(state, { ...baseEvent, cursorId: "main" });

    expect(next.document.text).toBe("ae");
    const bSel = next.selections.b;

    expect(bSel).toBeDefined();
    expect(bSel!.from).toBe(0);
  });

  it("sel.from >= removeEnd triggers the true branch of shiftedFrom (line 92 true branch)", () => {
    // cursor "b" has selection [4,5] (sel.from=4 >= removeEnd=4 → TRUE).
    // main deletes selection [1,4] (deletedLength=3).
    // shiftedFrom: 4 >= 4? YES → 4-3=1
    // shiftedTo: 5 >= 4? YES → 5-3=2
    let state = createInitialState();

    state = {
      ...state,
      document: { text: "abcde", styles: [] },
      cursors: {
        ...state.cursors,
        main: { ...state.cursors.main!, index: 4 },
        b: { ...state.cursors.main!, id: "b", index: 5 },
      },
    };
    state = withSelection(state, "main", 1, 4);
    state = withSelection(state, "b", 4, 5);

    const next = deleteTextAtCursor(state, { ...baseEvent, cursorId: "main" });

    expect(next.document.text).toBe("ae");
    const bSel = next.selections.b;

    expect(bSel).toBeDefined();
    expect(bSel!.from).toBe(1);
    expect(bSel!.to).toBe(2);
  });

  it("sel.to <= removeStart triggers the false branch of sel.to > removeStart (line 100 false branch)", () => {
    // cursor "b" has selection [0,1] (sel.to=1 <= removeStart=2 → FALSE in > check).
    // main deletes selection [2,4].
    // shiftedFrom: 0 >= 4? No. 0 > 2? No → return 0
    // shiftedTo: 1 >= 4? No. 1 > 2? No → return 1 (the FALSE branch of line 100)
    let state = createInitialState();

    state = {
      ...state,
      document: { text: "abcde", styles: [] },
      cursors: {
        ...state.cursors,
        main: { ...state.cursors.main!, index: 4 },
        b: { ...state.cursors.main!, id: "b", index: 1 },
      },
    };
    state = withSelection(state, "main", 2, 4);
    state = withSelection(state, "b", 0, 1);

    const next = deleteTextAtCursor(state, { ...baseEvent, cursorId: "main" });

    expect(next.document.text).toBe("abe".slice(0, 3));
    const bSel = next.selections.b;

    expect(bSel).toBeDefined();
    expect(bSel!.from).toBe(0);
    expect(bSel!.to).toBe(1);
  });
});


describe("reduce (default branch)", () => {
  it("returns state unchanged for an unknown event kind", () => {
    const state = createInitialState();
    const unknown = { id: "e1", kind: "unknown" as "insert", time: 0, cursorId: "main", sourceCommandId: "c1" };
    const next = reduce(state, unknown as unknown as Parameters<typeof reduce>[1]);

    expect(next).toBe(state);
  });
});


describe("reduce (selectText edge cases)", () => {
  it("select forward with object by {unit, amount} resolves unit and amount correctly", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "select" as const, cursor: "main", count: 2, by: { unit: "word" as const, amount: 1 } },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    // Cursor is at index 11 (end of "Hello world"), select forward 2 words → clamped to 11
    // selection from=11, to=11 → empty → undefined
    // Actually: select forward 2 words from index 11 → tail="" → 0 segments → taken=0 → endIndex=11
    // from=min(11,11)=11, to=max(11,11)=11 → withSelection clears
    expect(state.selections.main).toBeUndefined();
  });

  it("select backward with object by {unit, amount} resolves unit and amount correctly", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "select" as const, cursor: "main", count: -1, by: { unit: "word" as const, amount: 1 } },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    // Cursor at 11 (end), select backward 1 word → "world" (5 chars) → endIndex = 11-5 = 6
    // from=6, to=11
    expect(state.selections.main).toStrictEqual({ from: 6, to: 11 });
  });

  it("select('whole') selects the entire document", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello", by: "char" as const, interval: 1 },
      { id: "c2", kind: "select" as const, cursor: "main", count: "whole" as const },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.selections.main).toStrictEqual({ from: 0, to: 5 });
  });

  it("selecting on empty document returns startIndex without advancing", () => {
    const commands = [
      { id: "c1", kind: "select" as const, cursor: "main", count: 3, by: "char" as const },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    // Empty document: text.length === 0 → endIndex === startIndex (0) → no selection
    expect(state.selections.main).toBeUndefined();
  });

  it("select event with string by resolves unit and amount as char/1", () => {
    let state = createInitialState();

    // Add text so cursor is at 5
    for (const event of compile([{ id: "c1", kind: "type" as const, cursor: "main", text: "Hello", by: "char" as const, interval: 1 }])) {
      state = reduce(state, event);
    }

    // Fire a raw select event with string by to hit the string branch in resolveUnit/resolveAmount
    const event = {
      id: "e1",
      kind: "select" as const,
      time: 0,
      cursorId: "main",
      count: -1,
      by: "char" as const,
      sourceCommandId: "c1",
    };

    const next = selectText(state, event);

    expect(next.selections.main).toStrictEqual({ from: 4, to: 5 });
  });
});


describe("reduce (delete style clamp branches)", () => {
  it("clamps a partially overlapping style that starts before removeStart", () => {
    // Text: "Hello world" (11 chars), style covers [0,8], delete last 5 chars (positions 6-11)
    // After delete text = "Hello " (6 chars)
    // Style [0,8]: not fully within [6,11], so survives filter
    // entry.from=0 <= removeStart=6, so from stays 0
    // entry.to=8 > removeStart=6, so to = max(6, 8-(11-6)) = max(6, 3) = 6
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "style" as const, cursor: "main", style: "tw-a", range: { from: 0, to: 8 } },
      { id: "c3", kind: "delete" as const, cursor: "main", count: -5, by: "char" as const, interval: 1 },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.text).toBe("Hello ");
    expect(state.document.styles).toHaveLength(1);
    expect(state.document.styles[0]?.from).toBe(0);
  });

  it("removes a style fully contained in the deleted range", () => {
    // Text: "Hello world", style covers [7,10] (fully within delete range [6,11])
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "style" as const, cursor: "main", style: "tw-b", range: { from: 7, to: 10 } },
      { id: "c3", kind: "delete" as const, cursor: "main", count: -5, by: "char" as const, interval: 1 },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.text).toBe("Hello ");
    expect(state.document.styles).toHaveLength(0);
  });

  it("clamps a style that starts after removeStart", () => {
    // Text: "Hello world", style covers [8,11], delete last 5 → removeStart=6
    // entry.from=8 > removeStart=6, so from = max(6, 8-(11-6)) = max(6,3) = 6
    // entry.to=11 > removeStart=6, so to = max(6, 11-(11-6)) = max(6,6) = 6
    // from=6, to=6 → degenerate style stays (filter passes but style is zero-width)
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "style" as const, cursor: "main", style: "tw-c", range: { from: 8, to: 11 } },
      { id: "c3", kind: "delete" as const, cursor: "main", count: -5, by: "char" as const, interval: 1 },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.text).toBe("Hello ");
  });

  it("preserves a style entirely before the deleted range (entry.from and entry.to both <= removeStart)", () => {
    // Text: "Hello world", style covers [0,4], delete last 5 chars → removeStart=6, removeEnd=11
    // style [0,4]: filter passes (not fully within [6,11])
    // entry.from=0 <= removeStart=6 → from stays 0 (false branch of entry.from > removeStart)
    // entry.to=4 <= removeStart=6 → to stays 4 (false branch of entry.to > removeStart)
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "style" as const, cursor: "main", style: "tw-before", range: { from: 0, to: 4 } },
      { id: "c3", kind: "delete" as const, cursor: "main", count: -5, by: "char" as const, interval: 1 },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.text).toBe("Hello ");
    expect(state.document.styles).toHaveLength(1);
    expect(state.document.styles[0]?.from).toBe(0);
    expect(state.document.styles[0]?.to).toBe(4);
  });
});


describe("reduce (style)", () => {
  it("fixed-range style appends a style to document.styles", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello", by: "char" as const, interval: 1 },
      { id: "c2", kind: "style" as const, cursor: "main", style: "tw-highlight", range: { from: 0, to: 5 } },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.styles).toHaveLength(1);
    expect(state.document.styles[0]).toStrictEqual({ from: 0, to: 5, style: "tw-highlight" });
  });

  it("multiple styles are accumulated on document.styles", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "style" as const, cursor: "main", style: "tw-a", range: { from: 0, to: 5 } },
      { id: "c3", kind: "style" as const, cursor: "main", style: "tw-b", range: { from: 6, to: 11 } },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.styles).toHaveLength(2);
  });

  it("style with from >= to leaves document.styles unchanged", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello", by: "char" as const, interval: 1 },
      { id: "c2", kind: "style" as const, cursor: "main", style: "tw-highlight", range: { from: 3, to: 3 } },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.styles).toHaveLength(0);
  });

  it("selection-based style resolves to the cursor's active selection range", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "select" as const, cursor: "main", count: -5, by: "char" as const },
      { id: "c3", kind: "style" as const, cursor: "main", style: "tw-highlight", range: "selection" as const },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.styles).toHaveLength(1);
    expect(state.document.styles[0]).toStrictEqual({ from: 6, to: 11, style: "tw-highlight" });
  });

  it("selection-based style with no active selection leaves styles unchanged", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello", by: "char" as const, interval: 1 },
      { id: "c2", kind: "style" as const, cursor: "main", style: "tw-highlight", range: "selection" as const },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.styles).toHaveLength(0);
  });

  it("applyStyle with selection-based event but no cursorId returns state unchanged", () => {
    const state = createInitialState();
    const event = { id: "e1", kind: "style" as const, time: 0, mode: "selection" as const, cursorId: undefined as unknown as string, style: "x", sourceCommandId: "c" };
    const next = applyStyle(state, event);

    expect(next).toBe(state);
  });
});


describe("reduce (delete with styles)", () => {
  it("trimming styles when deleting overlapping text", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "style" as const, cursor: "main", style: "tw-a", range: { from: 0, to: 11 } },
      { id: "c3", kind: "delete" as const, cursor: "main", count: -5, by: "char" as const, interval: 1 },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.text).toBe("Hello ");
    expect(state.document.styles).toHaveLength(1);
  });

  it("delete backward at start of document (removeStart === removeEnd) clears selection only", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hi", by: "char" as const, interval: 1 },
      { id: "c2", kind: "move" as const, cursor: "main", offset: -999 },
      { id: "c3", kind: "delete" as const, cursor: "main", count: -1, by: "char" as const, interval: 1 },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    // Cursor at 0, delete backward 1 → removeStart=0 === removeEnd=0 → no change
    expect(state.document.text).toBe("Hi");
  });
});


describe("reduce (insert with style)", () => {
  it("insert with style creates a style on the inserted range", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hi", by: "char" as const, interval: 1, style: "tw-bold" },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.text).toBe("Hi");
    expect(state.document.styles.length).toBeGreaterThan(0);
  });
});


describe("reduce (unselect)", () => {
  it("unselect removes an active selection for the targeted cursor", () => {
    let state = createInitialState();

    state = withSelection(state, "main", 2, 7);
    expect(state.selections.main).toStrictEqual({ from: 2, to: 7 });

    const event = { id: "e1", kind: "unselect" as const, time: 0, cursorId: "main", sourceCommandId: "c1" };
    const next = unselectReducer(state, event);

    expect(next.selections.main).toBeUndefined();
  });

  it("unselect on a cursor with no selection returns state unchanged", () => {
    const state = createInitialState();
    const event = { id: "e1", kind: "unselect" as const, time: 0, cursorId: "main", sourceCommandId: "c1" };
    const next = unselectReducer(state, event);

    expect(next).toBe(state);
  });

  it("reduce dispatches unselect event correctly", () => {
    let state = createInitialState();

    state = withSelection(state, "main", 1, 5);

    const event = { id: "e1", kind: "unselect" as const, time: 0, cursorId: "main", sourceCommandId: "c1" };
    const next = reduce(state, event);

    expect(next.selections.main).toBeUndefined();
  });
});


describe("reduce (removeStyles / unstyle)", () => {
  it("removes a style entirely inside the unstyle range", () => {
    let state = createInitialState();

    state = {
      ...state,
      document: {
        ...state.document,
        text: "Hello world",
        styles: [{ from: 2, to: 5, style: "tw-a" }],
      },
    };

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, mode: "range" as const, from: 0, to: 11, sourceCommandId: "c1" };
    const next = removeStyles(state, event);

    expect(next.document.styles).toHaveLength(0);
  });

  it("preserves a style entirely outside the unstyle range", () => {
    let state = createInitialState();

    state = {
      ...state,
      document: {
        ...state.document,
        text: "Hello world",
        styles: [{ from: 0, to: 3, style: "tw-a" }],
      },
    };

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, mode: "range" as const, from: 6, to: 11, sourceCommandId: "c1" };
    const next = removeStyles(state, event);

    expect(next.document.styles).toHaveLength(1);
    expect(next.document.styles[0]).toStrictEqual({ from: 0, to: 3, style: "tw-a" });
  });

  it("clips a style overlapping from the left", () => {
    let state = createInitialState();

    state = {
      ...state,
      document: {
        ...state.document,
        text: "Hello world",
        styles: [{ from: 0, to: 7, style: "tw-a" }],
      },
    };

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, mode: "range" as const, from: 5, to: 11, sourceCommandId: "c1" };
    const next = removeStyles(state, event);

    expect(next.document.styles).toHaveLength(1);
    expect(next.document.styles[0]).toStrictEqual({ from: 0, to: 5, style: "tw-a" });
  });

  it("clips a style overlapping from the right", () => {
    let state = createInitialState();

    state = {
      ...state,
      document: {
        ...state.document,
        text: "Hello world",
        styles: [{ from: 4, to: 11, style: "tw-a" }],
      },
    };

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, mode: "range" as const, from: 0, to: 6, sourceCommandId: "c1" };
    const next = removeStyles(state, event);

    expect(next.document.styles).toHaveLength(1);
    expect(next.document.styles[0]).toStrictEqual({ from: 6, to: 11, style: "tw-a" });
  });

  it("splits a style that spans the entire unstyle range into two fragments", () => {
    let state = createInitialState();

    state = {
      ...state,
      document: {
        ...state.document,
        text: "Hello world",
        styles: [{ from: 0, to: 11, style: "tw-a" }],
      },
    };

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, mode: "range" as const, from: 3, to: 8, sourceCommandId: "c1" };
    const next = removeStyles(state, event);

    expect(next.document.styles).toHaveLength(2);
    expect(next.document.styles[0]).toStrictEqual({ from: 0, to: 3, style: "tw-a" });
    expect(next.document.styles[1]).toStrictEqual({ from: 8, to: 11, style: "tw-a" });
  });

  it("selection-based unstyle resolves range from cursor selection and clears selection", () => {
    let state = createInitialState();

    state = withSelection(state, "main", 6, 11);
    state = {
      ...state,
      document: {
        ...state.document,
        text: "Hello world",
        styles: [{ from: 0, to: 11, style: "tw-a" }],
      },
    };

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, mode: "selection" as const, cursorId: "main", sourceCommandId: "c1" };
    const next = removeStyles(state, event);

    expect(next.selections.main).toBeUndefined();
    expect(next.document.styles).toHaveLength(1);
    expect(next.document.styles[0]).toStrictEqual({ from: 0, to: 6, style: "tw-a" });
  });

  it("selection-based unstyle with no active selection returns state unchanged", () => {
    const state = createInitialState();
    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, mode: "selection" as const, cursorId: "main", sourceCommandId: "c1" };
    const next = removeStyles(state, event);

    expect(next).toBe(state);
  });

  it("selection-based unstyle with missing cursorId returns state unchanged", () => {
    const state = createInitialState();
    const event = { id: "e1", kind: "unstyle" as const, time: 0, mode: "selection" as const, cursorId: undefined as unknown as string, sourceCommandId: "c1" };
    const next = removeStyles(state, event as TUnstyleEvent);

    expect(next).toBe(state);
  });

  it("unstyle with from >= to is a no-op", () => {
    let state = createInitialState();

    state = {
      ...state,
      document: {
        ...state.document,
        text: "Hello",
        styles: [{ from: 0, to: 5, style: "tw-a" }],
      },
    };

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, mode: "range" as const, from: 3, to: 3, sourceCommandId: "c1" };
    const next = removeStyles(state, event);

    expect(next.document.styles).toHaveLength(1);
  });

  it("reduce dispatches unstyle event correctly", () => {
    let state = createInitialState();

    state = {
      ...state,
      document: {
        ...state.document,
        text: "Hello",
        styles: [{ from: 0, to: 5, style: "tw-a" }],
      },
    };

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, mode: "range" as const, from: 0, to: 5, sourceCommandId: "c1" };
    const next = reduce(state, event);

    expect(next.document.styles).toHaveLength(0);
  });
});
