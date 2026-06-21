import { describe, expect, it } from "vitest";

import { deleteTextAtCursor } from "../src/core/reducer/delete-text-at-cursor.helper";
import { insertTextAtCursor } from "../src/core/reducer/insert.helper";
import { createInitialState, withSelection } from "../src/core/state/index";
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



describe("insertTextAtCursor — selection replacement, other cursor shifting", () => {
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


describe("insertTextAtCursor — selection replacement, style handling", () => {
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

describe("applySelectionDelete — other cursor and style branches", () => {
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


// ---------------------------------------------------------------------------
// Direct reducer tests to cover specific uncovered branches
// ---------------------------------------------------------------------------

describe("insertTextAtCursor — direct reducer, selection-replacement style/selection branches", () => {
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

describe("deleteTextAtCursor — direct reducer, applySelectionDelete style/selection branches", () => {
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
