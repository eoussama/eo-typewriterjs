import type { TTextStyle, TTimelineEvent, TTypewriterState } from "../../src/index";
import { describe, expect, it } from "vitest";
import { compileSteps } from "../../src/core/compiler/helpers/compile-steps.helper";
import { compile } from "../../src/core/compiler/helpers/compile.helper";
import { DEFAULT_CURSOR_RENDER_OPTIONS } from "../../src/core/cursor/consts/cursor-defaults.const";
import { mergeCursorOptions } from "../../src/core/cursor/helpers/merge-cursor-options.helper";
import { advanceIndex } from "../../src/core/reducer/helpers/advance-index.helper";
import { reduce } from "../../src/core/reducer/helpers/reduce.helper";
import { createInitialState, withCursor } from "../../src/core/state/helpers/typewriter-state.helper";
import { graphemesLengthAfter, graphemesLengthBefore } from "../../src/core/stepping/helpers/segment-text.helper";
import { createTypewriter, mergeStyles, segmentRichText, stringRenderer, TimelineBuilder } from "../../src/index";



/**
 * @description
 * Build a state with the given text, main cursor index, styles and main selection
 *
 * @param text - The document text
 * @param index - The main cursor index
 * @param styles - The document styles
 * @param selection - The main cursor's selection
 * @returns The state
 */
function stateWith(text: string, index: number, styles: readonly TTextStyle[] = [], selection?: [number, number]): TTypewriterState {
  const initial = createInitialState();

  return {
    document: { text, styles },
    cursors: { main: { ...initial.cursors.main!, index } },
    selections: selection === undefined ? {} : { main: { from: selection[0], to: selection[1] } },
  };
}

/**
 * @description
 * Apply events to a state
 *
 * @param state - The starting state
 * @param events - The events to apply
 * @returns The resulting state
 */
function apply(state: TTypewriterState, events: readonly TTimelineEvent[]): TTypewriterState {
  return events.reduce(reduce, state);
}

/**
 * @description
 * Play a timeline to the end with a string renderer
 *
 * @param build - Adds commands to the timeline
 * @returns The final live state
 */
async function playOut(build: (timeline: TimelineBuilder) => unknown): Promise<TTypewriterState> {
  const tw = createTypewriter({ renderer: stringRenderer() });

  build(tw.timeline);
  tw.seek(Number.POSITIVE_INFINITY);

  return tw.getLiveState();
}

describe("ids", () => {
  it("gives every compiled event a unique, kind-prefixed id", () => {
    const events = compile([
      { id: "c1", kind: "type", cursor: "main", text: "ab" },
      { id: "c2", kind: "delete", cursor: "main", count: -1 },
      { id: "c3", kind: "delete", cursor: "main", count: "whole" },
      { id: "c4", kind: "move", cursor: "main", offset: 1 },
      { id: "c5", kind: "move", cursor: "main", offset: "end" },
      { id: "c6", kind: "select", cursor: "main", count: 1 },
      { id: "c7", kind: "select", cursor: "main", count: "whole" },
      { id: "c8", kind: "unselect", cursor: "main" },
      { id: "c9", kind: "style", cursor: "main", style: "x", range: "selection" },
      { id: "c10", kind: "style", cursor: "main", style: "x", range: { from: 0, to: 1 } },
      { id: "c11", kind: "unstyle", cursor: "main", range: "selection" },
      { id: "c12", kind: "unstyle", cursor: "main", range: { from: 0, to: 1 } },
    ]);

    for (const event of events) {
      expect(event.id).toMatch(new RegExp(`^${event.kind}_event_\\d+$`));
    }

    expect(new Set(events.map(event => event.id)).size).toBe(events.length);
  });

  it("gives every command a unique id and bumps the version once per command", () => {
    const timeline = new TimelineBuilder();

    timeline
      .type("a")
      .delete(-1)
      .move(1)
      .select(1)
      .unselect()
      .style("x", "selection")
      .unstyle("selection")
      .wait(1)
      .call(() => {});

    const ids = timeline.commands.map(command => command.id);

    expect(ids.every(id => /^cmd_\d+$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(9);
    expect(timeline.version).toBe(9);
  });
});

describe("timeline validation messages", () => {
  it.each(["move", "select", "delete"] as const)("names the interval of %s", (method) => {
    expect(() => new TimelineBuilder()[method](1, { interval: -1 })).toThrow(/^Invalid interval: -1/);
  });

  it.each(["move", "select", "delete"] as const)("names the command in unit errors for %s", (method) => {
    const timeline = new TimelineBuilder()[method](2, { by: "whole" as "char" });

    expect(() => compileSteps(timeline.commands)).toThrow(new RegExp(`Valid units for ${method} are`));
  });
});

describe("compileSteps", () => {
  it.each<[string, (t: TimelineBuilder) => unknown, string | null]>([
    ["type", t => t.type("a", { by: "word" }), "word"],
    ["a numeric delete", t => t.type("ab").delete(-1, { by: "word" }), "word"],
    ["a boundary delete", t => t.type("ab").delete("start"), null],
    ["a numeric move", t => t.type("ab").move(-1, { by: "line" }), "line"],
    ["a zero move", t => t.type("ab").move(0, { by: "line" }), null],
    ["a boundary move", t => t.type("ab").move("start"), null],
    ["a numeric select", t => t.type("ab").select(-1, { by: "grapheme" }), "grapheme"],
    ["a zero select", t => t.type("ab").select(0, { by: "word" }), null],
    ["a boundary select", t => t.type("ab").select("whole"), null],
  ])("reports the unit of %s", (_name, build, unit) => {
    const timeline = new TimelineBuilder();

    build(timeline);

    expect(compileSteps(timeline.commands).steps.at(-1)?.unit).toBe(unit);
  });

  it("keeps a multi-cursor move going while any cursor still moves", async () => {
    const state = await playOut(t => t.type("abc", { interval: 0 }).move("start", { cursor: "a" }).move(-3, { cursor: ["a", "main"] }));

    expect(state.cursors.main?.index).toBe(0);
  });

  it.each([
    ["delete", (t: TimelineBuilder) => t.delete(-99, { interval: 10 })],
    ["select", (t: TimelineBuilder) => t.select(-99, { interval: 10 })],
  ])("ends a stalled %s early", (_name, motion) => {
    const timeline = new TimelineBuilder();

    timeline.type("ab", { interval: 10 });
    motion(timeline);
    timeline.type("!", { interval: 10 });

    // two effective steps and one stalled step, from 20
    expect(compileSteps(timeline.commands).steps.at(-1)?.time).toBe(50);
  });

  it("keeps type steps even when they change nothing visible", () => {
    const timeline = new TimelineBuilder();

    timeline.type("ab", { interval: 10, style: "x" }).style("x", { from: 0, to: 0 });

    expect(compileSteps(timeline.commands).steps).toHaveLength(3);
  });
});

describe("compile", () => {
  it("interleaves the events of several cursors by time", () => {
    const events = compile([{ id: "c", kind: "type", cursor: ["x", "y"], text: "ab", interval: 10 }]);

    expect(events.map(event => [event.time, "cursorId" in event ? event.cursorId : ""])).toEqual([[0, "x"], [0, "y"], [10, "x"], [10, "y"]]);
  });

  it("spaces select steps by the interval", () => {
    const events = compile([{ id: "c", kind: "select", cursor: "main", count: -3, interval: 7 }]);

    expect(events.map(event => event.time)).toEqual([0, 7, 14]);
  });
});

describe("deleting by line at the document edges", () => {
  const deleteLine = (text: string, index: number, direction: 1 | -1): string =>
    apply(stateWith(text, index), [{ id: "d", kind: "delete", time: 0, cursorId: "main", count: 1, unit: "line", direction, sourceCommandId: "c" }]).document.text;

  it.each<[string, number, 1 | -1, string]>([
    ["ab\ncd", 0, -1, "cd"],
    ["ab\ncd", 2, -1, "\ncd"],
    ["ab\ncd", 5, 1, "ab\n"],
    ["ab\ncd", 3, 1, "ab\n"],
    ["abc", 3, 1, ""],
    ["", 0, -1, ""],
    ["", 0, 1, ""],
  ])("deletes a line from %j at %i in direction %i", (text, index, direction, expected) => {
    expect(deleteLine(text, index, direction)).toBe(expected);
  });
});

describe("advanceIndex", () => {
  it("moves back by word from the middle of the text", () => {
    expect(advanceIndex("one two three", 7, -1, "word")).toBe(4);
  });

  it("measures windows larger than the text", () => {
    expect(graphemesLengthBefore("ab", 2, 5)).toBe(2);
    expect(graphemesLengthAfter("ab", 0, 5)).toBe(2);
  });
});

describe("styles across edits", () => {
  it("keeps consecutive differently styled chunks apart", async () => {
    const state = await playOut(t => t.type("a", { style: "x" }).type("b", { style: "y" }));

    expect(state.document.styles).toEqual([{ from: 0, to: 1, style: "x" }, { from: 1, to: 2, style: "y" }]);
  });

  it("reflows styles when typing over a selection", () => {
    const styles: TTextStyle[] = [
      { from: 0, to: 2, style: "a" },
      { from: 1, to: 3, style: "b" },
      { from: 1, to: 4, style: "e" },
      { from: 2, to: 5, style: "c" },
    ];
    const next = apply(stateWith("abcde", 3, styles, [1, 3]), [{ id: "i", kind: "insert", time: 0, cursorId: "main", text: "X", style: "s", sourceCommandId: "c" }]);

    expect(next.document.styles).toEqual([
      { from: 0, to: 2, style: "a" },
      { from: 1, to: 3, style: "e" },
      { from: 2, to: 4, style: "c" },
      { from: 1, to: 2, style: "s" },
    ]);
  });

  it("drops styles inside a deleted selection", () => {
    const next = apply(stateWith("abcd", 3, [{ from: 1, to: 2, style: "x" }], [1, 3]), [{ id: "d", kind: "delete", time: 0, cursorId: "main", count: 1, unit: "char", direction: -1, sourceCommandId: "c" }]);

    expect(next.document.styles).toEqual([]);
  });

  it("clips styles at the exact edges of an unstyle range", () => {
    const styles: TTextStyle[] = [{ from: 0, to: 1, style: "a" }, { from: 1, to: 4, style: "b" }, { from: 3, to: 5, style: "c" }];
    const next = apply(stateWith("abcde", 0, styles), [{ id: "u", kind: "unstyle", time: 0, mode: "range", from: 1, to: 3, sourceCommandId: "c" }]);

    expect(next.document.styles).toEqual([{ from: 0, to: 1, style: "a" }, { from: 3, to: 4, style: "b" }, { from: 3, to: 5, style: "c" }]);
  });
});

describe("rich text", () => {
  it("cuts segments at both ends of a style", () => {
    expect(segmentRichText({ text: "abcd", styles: [{ from: 1, to: 3, style: "x" }] })).toEqual([
      { text: "a", from: 0, to: 1, styles: [] },
      { text: "bc", from: 1, to: 3, styles: ["x"] },
      { text: "d", from: 3, to: 4, styles: [] },
    ]);
  });

  it("merges styles keeping only the keys that are set", () => {
    expect(mergeStyles(["a", { css: { color: "red" } }, { css: { margin: "0" }, ansi: { bold: "1" }, meta: { k: 1 }, attrs: { title: "t" } }])).toStrictEqual({
      className: "a",
      css: { color: "red", margin: "0" },
      ansi: { bold: "1" },
      meta: { k: 1 },
      attrs: { title: "t" },
    });
    expect(mergeStyles([])).toStrictEqual({});
  });
});

describe("cursor options", () => {
  it("gives new cursors the defaults when there is no main cursor", () => {
    const state = withCursor({ ...createInitialState(), cursors: {} }, "x");

    expect(state.cursors.x?.renderOptions).toBe(DEFAULT_CURSOR_RENDER_OPTIONS);
  });

  it("keeps the content unless the kind or content changes", () => {
    expect(mergeCursorOptions(DEFAULT_CURSOR_RENDER_OPTIONS, { className: "x" }).content).toBe("|");
    expect(mergeCursorOptions(DEFAULT_CURSOR_RENDER_OPTIONS, { kind: "block" }).content).toBe("▋");
  });

  it("can make a hidden cursor visible again through setCursorOptions", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.setCursorVisible(false);
    tw.setCursorOptions({ visible: true });

    expect(tw.getLiveState().cursors.main?.visible).toBe(true);
  });
});

describe("typewriter", () => {
  it("replays a timeline extended after playing", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("a", { interval: 0 });
    await tw.play();
    tw.timeline.type("b", { interval: 0 });
    await tw.replay();

    expect(renderer.toString()).toBe("ab");
  });

  it("stringRenderer reports the mounted state", () => {
    const renderer = stringRenderer();

    renderer.mount(stateWith("hi", 2));

    expect(renderer.toString()).toBe("hi");
  });
});
