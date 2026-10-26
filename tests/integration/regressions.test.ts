// @vitest-environment happy-dom
import type { TTypewriterState } from "../../src/core/state/types/typewriter-state.type";
import { afterEach, describe, expect, it, vi } from "vitest";
import { compile } from "../../src/core/compiler/helpers/compile.helper";
import { DEFAULT_CURSOR_RENDER_OPTIONS } from "../../src/core/cursor/consts/cursor-defaults.const";
import { advanceIndex } from "../../src/core/reducer/helpers/advance-index.helper";
import { applyStyle } from "../../src/core/reducer/helpers/apply-style.helper";
import { insertTextAtCursor } from "../../src/core/reducer/helpers/insert.helper";
import { move } from "../../src/core/reducer/helpers/move.helper";
import { removeStyles } from "../../src/core/reducer/helpers/remove-styles.helper";
import { createInitialState } from "../../src/core/state/helpers/typewriter-state.helper";
import { graphemesLengthAfter, graphemesLengthBefore, segmentText } from "../../src/core/stepping/helpers/segment-text.helper";
import { createTypewriter, segmentRichText, stringRenderer, TimelineBuilder } from "../../src/index";
import { DomRenderer } from "../../src/renderers/dom/dom-renderer";



const FAMILY = "\u{1F468}‍\u{1F469}‍\u{1F467}";

/**
 * @description
 * Build a state holding the given text with the main cursor at `index`
 *
 * @param text - The document text
 * @param index - The main cursor index, defaults to the end of the text
 * @returns The state
 */
function stateWith(text: string, index = text.length): TTypewriterState {
  const initial = createInitialState();

  return {
    ...initial,
    document: { text, styles: [] },
    cursors: { main: { ...initial.cursors.main!, index } },
  };
}

describe("word segmentation", () => {
  it("attaches punctuation and whitespace to the preceding word", () => {
    expect(segmentText("Hello, world!", "word")).toEqual(["Hello, ", "world!"]);
  });

  it("attaches leading punctuation to the first word", () => {
    expect(segmentText("\"quoted\" text", "word")).toEqual(["\"quoted\" ", "text"]);
  });

  it("keeps text made only of punctuation as one token", () => {
    expect(segmentText("...", "word")).toEqual(["..."]);
  });
});

describe("grapheme windows", () => {
  it("measures clusters before and after an index without splitting them", () => {
    const text = `a${FAMILY}b`;

    expect(graphemesLengthBefore(text, text.length - 1, 1)).toBe(FAMILY.length);
    expect(graphemesLengthAfter(text, 1, 1)).toBe(FAMILY.length);
  });

  it("grows the window when clusters are longer than expected", () => {
    const stacked = `e${"\u0301".repeat(20)}`;
    const text = `x${stacked.repeat(3)}y`;

    expect(graphemesLengthBefore(text, text.length - 1, 2)).toBe(stacked.length * 2);
    expect(graphemesLengthAfter(text, 1, 2)).toBe(stacked.length * 2);
  });

  it("returns 0 for a zero count", () => {
    expect(graphemesLengthBefore("abc", 3, 0)).toBe(0);
    expect(graphemesLengthAfter("abc", 0, 0)).toBe(0);
  });

  it("advanceIndex returns the clamped start for a zero count", () => {
    expect(advanceIndex("abc", 9, 0, "char")).toBe(3);
  });
});

describe("delete by char or grapheme", () => {
  it("never leaves half of an emoji behind", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type(`go\u{1F4A9}`, { interval: 0 })
      .delete(-1, { interval: 0 });
    await tw.play();

    expect(renderer.toString()).toBe("go");
  });

  it("deletes forward one cluster at a time", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type(`${FAMILY}!`, { interval: 0 })
      .move("start")
      .delete(1, { by: "grapheme", interval: 0 });
    await tw.play();

    expect(renderer.toString()).toBe("!");
  });
});

describe("move reducer", () => {
  it("accepts a string advance mode", () => {
    const next = move(stateWith("one two", 0), {
      id: "m",
      kind: "move",
      time: 0,
      cursorId: "main",
      offset: 1,
      by: "word",
      sourceCommandId: "c",
    });

    expect(next.cursors.main?.index).toBe(4);
  });
});

describe("insert keeps styles aligned", () => {
  it("shifts styles that start at or after the insertion point", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hi", { style: "bold", interval: 0 })
      .move("start")
      .type("X", { interval: 0 });
    await tw.play();

    expect(tw.getLiveState().document.styles).toEqual([{ from: 1, to: 3, style: "bold" }]);
  });

  it("grows a style when typing strictly inside it", () => {
    const state = { ...stateWith("abcd", 2), document: { text: "abcd", styles: [{ from: 1, to: 3, style: "s" }] } };
    const next = insertTextAtCursor(state, { id: "i", kind: "insert", time: 0, cursorId: "main", text: "XY", sourceCommandId: "c" });

    expect(next.document.styles).toEqual([{ from: 1, to: 5, style: "s" }]);
  });

  it("merges consecutive chunks typed with the same style into one entry", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { style: "bold", interval: 0 });
    await tw.play();

    expect(tw.getLiveState().document.styles).toEqual([{ from: 0, to: 5, style: "bold" }]);
  });
});

describe("style ranges", () => {
  it("clamps fixed ranges to the document", () => {
    const next = applyStyle(stateWith("abc"), { id: "s", kind: "style", time: 0, mode: "range", from: 1, to: 99, style: "x", sourceCommandId: "c" });

    expect(next.document.styles).toEqual([{ from: 1, to: 3, style: "x" }]);
  });

  it("ignores ranges that fall outside the document", () => {
    const state = stateWith("abc");

    expect(applyStyle(state, { id: "s", kind: "style", time: 0, mode: "range", from: 5, to: 9, style: "x", sourceCommandId: "c" })).toBe(state);
    expect(removeStyles(state, { id: "u", kind: "unstyle", time: 0, mode: "range", from: 5, to: 9, sourceCommandId: "c" })).toBe(state);
  });

  it("segmentRichText clamps out-of-range styles", () => {
    expect(segmentRichText({ text: "ab", styles: [{ from: -3, to: 1, style: "x" }, { from: 5, to: 9, style: "y" }] })).toEqual([
      { text: "a", from: 0, to: 1, styles: ["x"] },
      { text: "b", from: 1, to: 2, styles: [] },
    ]);
  });
});

describe("timeline validation", () => {
  it("rejects negative or non-finite durations and intervals", () => {
    const timeline = new TimelineBuilder();

    expect(() => timeline.wait(-1)).toThrow(/Invalid wait duration/);
    expect(() => timeline.wait(Number.NaN)).toThrow(/Invalid wait duration/);
    expect(() => timeline.type("x", { interval: -5 })).toThrow(/Invalid interval/);
    expect(() => timeline.delete(-1, { interval: Number.POSITIVE_INFINITY })).toThrow(/Invalid interval/);
  });

  it("rejects fractional counts", () => {
    const timeline = new TimelineBuilder();

    expect(() => timeline.delete(1.5)).toThrow(/Invalid delete count/);
    expect(() => timeline.move(-0.5)).toThrow(/Invalid move offset/);
    expect(() => timeline.select(Number.NaN)).toThrow(/Invalid select count/);
  });

  it("rejects invalid style ranges", () => {
    const timeline = new TimelineBuilder();

    expect(() => timeline.style("x", { from: 3, to: 1 })).toThrow(/Invalid style range/);
    expect(() => timeline.unstyle({ from: -1, to: 2 })).toThrow(/Invalid style range/);
    expect(() => timeline.style("x", { from: 0.5, to: 2 })).toThrow(/Invalid style range/);
  });

  it("accepts every valid operand", () => {
    const timeline = new TimelineBuilder();

    expect(() => timeline.wait(0).delete("whole").move("end").select(-2).style("x", "selection").unstyle({ from: 0, to: 0 })).not.toThrow();
  });

  it("rejects advance amounts that are not positive integers", () => {
    expect(() => compile([{ id: "t", kind: "type", cursor: "main", text: "abc", by: { unit: "char", amount: 0 } }])).toThrow(/Invalid advance amount/);
    expect(() => compile([{ id: "m", kind: "move", cursor: "main", offset: 2, by: { unit: "word", amount: 1.5 } }])).toThrow(/Invalid advance amount/);
  });
});

describe("boundary delete timing", () => {
  it("advances the clock by the command interval", () => {
    const events = compile([
      { id: "d", kind: "delete", cursor: "main", count: "whole", interval: 300 },
      { id: "t", kind: "type", cursor: "main", text: "x" },
    ]);

    expect(events[1]?.time).toBe(300);
  });
});

describe("domRenderer hardening", () => {
  const cursorState = (attrs: Record<string, string>): TTypewriterState => {
    const state = stateWith("");

    return {
      ...state,
      cursors: { main: { ...state.cursors.main!, renderOptions: { ...DEFAULT_CURSOR_RENDER_OPTIONS, attrs } } },
    };
  };

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the cursor on an empty document", () => {
    const el = document.createElement("div");

    new DomRenderer(el).mount(stateWith(""));

    expect(el.querySelector(".typewriter-cursor")).not.toBeNull();
  });

  it("clamps cursors past the end of the text", () => {
    const el = document.createElement("div");

    new DomRenderer(el).mount(stateWith("ab", 10));

    expect(el.lastElementChild?.classList.contains("typewriter-cursor")).toBe(true);
  });

  it("drops event handler attributes and script URLs", () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const state = {
      ...stateWith("link"),
      document: {
        text: "link",
        styles: [{ from: 0, to: 4, style: { attrs: { "onclick": "alert(1)", "href": " java\tscript:alert(1)", "data-ok": "yes", "title": "fine" } } }],
      },
    };

    renderer.mount(state);

    const span = el.querySelector("[data-ok]");

    expect(span?.getAttribute("onclick")).toBeNull();
    expect(span?.getAttribute("href")).toBeNull();
    expect(span?.getAttribute("title")).toBe("fine");
  });

  it("keeps safe URLs", () => {
    const el = document.createElement("div");
    const state = {
      ...stateWith("x"),
      document: { text: "x", styles: [{ from: 0, to: 1, style: { attrs: { href: "https://example.com" } } }] },
    };

    new DomRenderer(el).mount(state);

    expect(el.querySelector("[href]")?.getAttribute("href")).toBe("https://example.com");
  });

  it("does not let a class attribute wipe the cursor classes", () => {
    const el = document.createElement("div");

    new DomRenderer(el).mount(cursorState({ class: "custom" }));

    const cursor = el.querySelector("[data-cursor-id]");

    expect(cursor?.classList.contains("typewriter-cursor")).toBe(true);
    expect(cursor?.classList.contains("custom")).toBe(true);
  });

  it("supports custom properties and kebab-case CSS names", () => {
    const el = document.createElement("div");
    const state = {
      ...stateWith("x"),
      document: { text: "x", styles: [{ from: 0, to: 1, style: { css: { "--accent": "red", "font-weight": "700", "color": "blue" } } }] },
    };

    new DomRenderer(el).mount(state);

    const span = el.querySelector("span") as HTMLElement;

    expect(span.style.getPropertyValue("--accent")).toBe("red");
    expect(span.style.getPropertyValue("font-weight")).toBe("700");
    expect(span.style.color).toBe("blue");
  });
});

describe("stringRenderer ANSI output", () => {
  it("strips control characters from text and ignores invalid SGR codes", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("a\u001B[2Jb\n", { interval: 0, style: { ansi: { bold: "1", bad: "31m\u001B[2J" } } })
      .type("c", { interval: 0, style: { ansi: { bad: "x" } } });
    await tw.play();

    expect(renderer.toAnsiString()).toBe("\u001B[1ma[2Jb\n\u001B[0mc");
  });
});

describe("lazy default sfx pack", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("skips sounds until the built-in pack has loaded", async () => {
    vi.resetModules();

    const played: string[] = [];

    vi.stubGlobal("Audio", class {
      volume = 1;
      playbackRate = 1;

      constructor(src: string) {
        played.push(src);
      }

      play(): Promise<void> {
        return Promise.reject(new Error("NotAllowedError"));
      }
    });

    const { AudioManagerHelper } = await import("../../src/core/audio/helpers/audio-manager.helper");
    const manager = new AudioManagerHelper({ enabled: true });

    manager.playTyping();
    expect(played).toHaveLength(0);

    await manager.ready();
    manager.playTyping();
    expect(played).toHaveLength(1);
  });
});
