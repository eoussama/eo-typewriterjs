import { describe, expect, it } from "vitest";
import { mergeStyles, resolveStyleRef, segmentRichText } from "../../src/core/state/helpers/segment-rich-text.helper";
import { createInitialState, getSelection, withSelection, withSelectionCleared } from "../../src/core/state/index";



describe("state helpers", () => {
  it("withSelection sets a selection for a cursor", () => {
    const state = createInitialState();
    const next = withSelection(state, "main", 2, 5);

    expect(next.selections.main).toStrictEqual({ from: 2, to: 5 });
  });

  it("withSelection with from === to clears the selection instead", () => {
    const state = withSelection(createInitialState(), "main", 2, 5);
    const next = withSelection(state, "main", 3, 3);

    expect(next.selections.main).toBeUndefined();
  });

  it("withSelectionCleared when cursor has no selection returns same state", () => {
    const state = createInitialState();
    const next = withSelectionCleared(state, "main");

    expect(next).toBe(state);
  });

  it("withSelectionCleared when cursor has a selection removes it", () => {
    const state = withSelection(createInitialState(), "main", 1, 4);
    const next = withSelectionCleared(state, "main");

    expect(next.selections.main).toBeUndefined();
  });

  it("getSelection returns null when cursor has no selection", () => {
    expect(getSelection(createInitialState(), "main")).toBeNull();
  });

  it("getSelection returns the selection when it exists", () => {
    const state = withSelection(createInitialState(), "main", 2, 7);

    expect(getSelection(state, "main")).toStrictEqual({ from: 2, to: 7 });
  });
});


describe("segmentRichText", () => {
  it("returns empty array for empty document", () => {
    expect(segmentRichText({ text: "", styles: [] })).toEqual([]);
  });

  it("returns single segment with no styles for unstyled text", () => {
    const segments = segmentRichText({ text: "Hello", styles: [] });

    expect(segments).toHaveLength(1);
    expect(segments[0]?.text).toBe("Hello");
    expect(segments[0]?.styles).toHaveLength(0);
  });

  it("splits text at style boundaries", () => {
    const segments = segmentRichText({ text: "Hello world", styles: [{ from: 0, to: 5, style: "tw-a" }] });

    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(segments[0]?.text).toBe("Hello");
    expect(segments[0]?.styles).toContain("tw-a");
  });

  it("segment outside style has empty styles", () => {
    const segments = segmentRichText({ text: "Hello world", styles: [{ from: 0, to: 5, style: "tw-a" }] });
    const last = segments[segments.length - 1];

    expect(last?.text).toBe(" world");
    expect(last?.styles).toHaveLength(0);
  });
});


describe("resolveStyleRef", () => {
  it("resolves a string ref to className object", () => {
    expect(resolveStyleRef("my-class")).toStrictEqual({ className: "my-class" });
  });

  it("returns a TStyleObject ref unchanged", () => {
    const obj = { className: "x", css: { color: "red" } };

    expect(resolveStyleRef(obj)).toBe(obj);
  });
});


describe("mergeStyles", () => {
  it("returns empty object for empty styles array", () => {
    expect(mergeStyles([])).toStrictEqual({});
  });

  it("merges a single string style into className", () => {
    expect(mergeStyles(["my-class"])).toStrictEqual({ className: "my-class" });
  });

  it("later style overrides earlier className", () => {
    const result = mergeStyles(["first", "second"]);

    expect(result.className).toBe("second");
  });

  it("merges css from multiple styles", () => {
    const result = mergeStyles([
      { css: { color: "red" } },
      { css: { background: "blue" } },
    ]);

    expect(result.css).toStrictEqual({ color: "red", background: "blue" });
  });

  it("merges attrs from multiple styles", () => {
    const result = mergeStyles([
      { attrs: { role: "label" } },
      { attrs: { "aria-label": "x" } },
    ]);

    expect(result.attrs).toStrictEqual({ "role": "label", "aria-label": "x" });
  });

  it("merges ansi from multiple styles", () => {
    const result = mergeStyles([
      { ansi: { bold: "1" } },
      { ansi: { color: "32" } },
    ]);

    expect(result.ansi).toStrictEqual({ bold: "1", color: "32" });
  });

  it("merges meta from multiple styles", () => {
    const result = mergeStyles([{ meta: { foo: 1 } }, { meta: { bar: 2 } }]);

    expect(result.meta).toStrictEqual({ foo: 1, bar: 2 });
  });
});
