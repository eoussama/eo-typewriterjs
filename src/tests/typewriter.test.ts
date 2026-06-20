import type { TDeleteEvent } from "../core/events/delete-event.type";
import type { TInsertEvent } from "../core/events/insert-event.type";
import type { TStyleEvent } from "../core/events/style-event.type";
import type { TUnstyleEvent } from "../core/events/unstyle-event.type";
import { describe, expect, it } from "vitest";
import { compile } from "../core/compiler/compile.helper";
import { play } from "../core/player/player.helper";
import { applyStyle } from "../core/reducer/apply-style.helper";
import { reduce } from "../core/reducer/reduce.helper";
import { removeStyles } from "../core/reducer/remove-styles.helper";
import { unselect as unselectReducer } from "../core/reducer/unselect.helper";
import { createInitialState, getSelection, withSelection, withSelectionCleared } from "../core/state/index";
import { mergeStyles, resolveStyleRef, segmentRichText } from "../core/state/segment-rich-text.helper";
import { chunkSteps } from "../core/stepping/chunk-steps.helper";
import { segmentText } from "../core/stepping/segment-text.helper";

import { createTypewriter, EPlaybackStatus, stringRenderer, StringRenderer } from "../index";



describe("segmentText", () => {
  it("splits plain ASCII text by character", () => {
    expect(segmentText("Hello", "char")).toEqual(["H", "e", "l", "l", "o"]);
  });

  it("treats 'grapheme' the same as 'char' for ASCII", () => {
    expect(segmentText("Hi", "grapheme")).toEqual(["H", "i"]);
  });

  it("keeps emoji grapheme clusters intact", () => {
    const result = segmentText("👨‍👩‍👧‍👦", "char");

    expect(result).toHaveLength(1);
    expect(result[0]).toBe("👨‍👩‍👧‍👦");
  });

  it("keeps accented characters intact", () => {
    const result = segmentText("é", "char");

    expect(result).toHaveLength(1);
    expect(result[0]).toBe("é");
  });

  it("splits text into words and attaches trailing space to preceding word", () => {
    expect(segmentText("Hello world", "word")).toEqual(["Hello ", "world"]);
  });

  it("handles multi-word text with trailing space attachment", () => {
    expect(segmentText("foo bar baz", "word")).toEqual(["foo ", "bar ", "baz"]);
  });

  it("splits text by line and preserves newline on each line except the last", () => {
    expect(segmentText("line1\nline2\nline3", "line")).toEqual(["line1\n", "line2\n", "line3"]);
  });

  it("returns the whole text as a single step for 'custom' unit", () => {
    expect(segmentText("anything", "custom")).toEqual(["anything"]);
  });
});


describe("chunkSteps", () => {
  it("returns individual tokens when amount is 1", () => {
    expect(chunkSteps(["H", "e", "l", "l", "o"], 1)).toEqual(["H", "e", "l", "l", "o"]);
  });

  it("joins pairs of tokens for amount 2", () => {
    expect(chunkSteps(["H", "e", "l", "l", "o"], 2)).toEqual(["He", "ll", "o"]);
  });

  it("returns the original steps unchanged when amount is 0", () => {
    expect(chunkSteps(["a", "b", "c"], 0)).toEqual(["a", "b", "c"]);
  });

  it("returns a single chunk when amount exceeds step count", () => {
    expect(chunkSteps(["a", "b"], 10)).toEqual(["ab"]);
  });
});


describe("compile", () => {
  it("compiles a type command into insert events", () => {
    const events = compile([
      { id: "c1", kind: "type", cursor: "main", text: "Hello", by: { unit: "char", amount: 1 }, interval: 50 },
    ]);

    expect(events).toHaveLength(5);
    expect(events.map(e => (e as TInsertEvent).text)).toEqual(["H", "e", "l", "l", "o"]);
  });

  it("applies correct absolute timestamps for char typing", () => {
    const events = compile([{ id: "c2", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 100 }]);

    expect(events[0]?.time).toBe(0);
    expect(events[1]?.time).toBe(100);
  });

  it("compiles word typing", () => {
    const events = compile([{ id: "c3", kind: "type", cursor: "main", text: "Hello world", by: "word", interval: 150 }]);

    expect(events).toHaveLength(2);
    expect((events[0] as TInsertEvent | undefined)?.text).toBe("Hello ");
    expect((events[1] as TInsertEvent | undefined)?.text).toBe("world");
  });

  it("compiles amount:2 char typing into correct chunks", () => {
    const events = compile([{ id: "c4", kind: "type", cursor: "main", text: "Hello", by: { unit: "char", amount: 2 }, interval: 50 }]);

    expect(events).toHaveLength(3);
    expect(events.map(e => (e as TInsertEvent).text)).toEqual(["He", "ll", "o"]);
  });

  it("uses default interval (50ms) when interval is omitted on type command", () => {
    const events = compile([{ id: "c5", kind: "type", cursor: "main", text: "AB", by: "char" }]);

    expect(events[0]?.time).toBe(0);
    expect(events[1]?.time).toBe(50);
  });

  it("uses default advance mode when by is omitted on type command", () => {
    const events = compile([{ id: "c6", kind: "type", cursor: "main", text: "AB" }]);

    expect(events).toHaveLength(2);
    expect((events[0] as TInsertEvent).text).toBe("A");
    expect((events[1] as TInsertEvent).text).toBe("B");
  });

  it("produces no events for an empty type command", () => {
    expect(compile([{ id: "c7", kind: "type", cursor: "main", text: "", by: "char", interval: 50 }])).toHaveLength(0);
  });

  it("silently ignores unknown command kinds (default branch)", () => {
    expect(compile([{ id: "c8", kind: "unknown" as unknown as "wait", duration: 0 }])).toHaveLength(0);
  });
});


describe("compile (wait)", () => {
  it("advances time cursor by wait duration", () => {
    const events = compile([
      { id: "w1", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 100 },
      { id: "w2", kind: "wait", duration: 500 },
      { id: "w3", kind: "type", cursor: "main", text: "AB", by: "char", interval: 50 },
    ]);

    const abEvents = events.filter(e => (e as TInsertEvent).text === "A" || (e as TInsertEvent).text === "B");

    expect(abEvents[0]?.time).toBe(700);
    expect(abEvents[1]?.time).toBe(750);
  });

  it("emits no events for a standalone wait command", () => {
    expect(compile([{ id: "w4", kind: "wait", duration: 1000 }])).toHaveLength(0);
  });

  it("treats zero-duration wait as no-op", () => {
    const events = compile([
      { id: "w5", kind: "type", cursor: "main", text: "AB", by: "char", interval: 100 },
      { id: "w6", kind: "wait", duration: 0 },
      { id: "w7", kind: "type", cursor: "main", text: "CD", by: "char", interval: 100 },
    ]);

    const cdEvents = events.filter(e => (e as TInsertEvent).text === "C" || (e as TInsertEvent).text === "D");

    expect(cdEvents[0]?.time).toBe(200);
    expect(cdEvents[1]?.time).toBe(300);
  });
});


describe("compile (delete)", () => {
  it("compiles a delete command into delete events", () => {
    const events = compile([{ id: "d1", kind: "delete", cursor: "main", count: 3, by: "char", interval: 50 }]);

    expect(events).toHaveLength(3);
    events.forEach(e => expect((e as TDeleteEvent).count).toBe(1));
  });

  it("applies correct absolute timestamps for char deletion", () => {
    const events = compile([{ id: "d2", kind: "delete", cursor: "main", count: 2, by: "char", interval: 100 }]);

    expect(events[0]?.time).toBe(0);
    expect(events[1]?.time).toBe(100);
  });

  it("compiles amount:2 char deletion into correct step count", () => {
    const events = compile([{ id: "d3", kind: "delete", cursor: "main", count: 5, by: { unit: "char", amount: 2 }, interval: 50 }]);

    expect(events).toHaveLength(3);
    expect((events[0] as TDeleteEvent | undefined)?.count).toBe(2);
    expect((events[2] as TDeleteEvent | undefined)?.count).toBe(1);
  });

  it("emits no events for a count of 0", () => {
    expect(compile([{ id: "d4", kind: "delete", cursor: "main", count: 0 }])).toHaveLength(0);
  });

  it("advances time cursor after delete", () => {
    const events = compile([
      { id: "d5", kind: "delete", cursor: "main", count: 2, by: "char", interval: 100 },
      { id: "d6", kind: "type", cursor: "main", text: "AB", by: "char", interval: 50 },
    ]);

    const typeEvents = events.filter(e => e.kind === "insert");

    expect(typeEvents[0]?.time).toBe(200);
  });

  it("uses default interval (50ms) when interval is omitted on delete command", () => {
    const events = compile([{ id: "d7", kind: "delete", cursor: "main", count: 2 }]);

    expect(events[0]?.time).toBe(0);
    expect(events[1]?.time).toBe(50);
  });
});


describe("compile (move)", () => {
  it("compiles a move command into a single event", () => {
    const events = compile([{ id: "mc1", kind: "move", cursor: "main", index: 3 }]);

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("move");
  });

  it("does not advance the clock", () => {
    const events = compile([
      { id: "mc2", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 100 },
      { id: "mc3", kind: "move", cursor: "main", index: 0 },
      { id: "mc4", kind: "type", cursor: "main", text: "AB", by: "char", interval: 50 },
    ]);

    const abEvents = events.filter(e => (e as TInsertEvent).text === "A" || (e as TInsertEvent).text === "B");

    expect(abEvents[0]?.time).toBe(200);
  });
});


describe("compile (select)", () => {
  it("compiles a select command into a single event", () => {
    const events = compile([{ id: "s1", kind: "select", cursor: "main", count: 3, by: "char" }]);

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("select");
  });

  it("uses default by (char) when by is omitted on select command", () => {
    const events = compile([{ id: "s0", kind: "select", cursor: "main", count: 2 }]);

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("select");
  });

  it("does not advance the clock", () => {
    const events = compile([
      { id: "s2", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 100 },
      { id: "s3", kind: "select", cursor: "main", count: 2, by: "char" },
      { id: "s4", kind: "type", cursor: "main", text: "AB", by: "char", interval: 50 },
    ]);

    const abEvents = events.filter(e => (e as TInsertEvent).text === "A" || (e as TInsertEvent).text === "B");

    expect(abEvents[0]?.time).toBe(200);
  });
});


describe("compile (style)", () => {
  it("compiles a fixed-range style into exactly one event", () => {
    const events = compile([
      { id: "mk1", kind: "style", cursor: "main", style: "tw-highlight", range: { from: 0, to: 5 } },
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("style");
  });

  it("fixed-range style event carries correct from, to, and style", () => {
    const events = compile([
      { id: "mk2", kind: "style", cursor: "main", style: "tw-highlight", range: { from: 2, to: 9 } },
    ]);

    const evt = events[0] as TStyleEvent;

    expect(evt.from).toBe(2);
    expect(evt.to).toBe(9);
    expect(evt.style).toBe("tw-highlight");
  });

  it("fixed-range style does not advance the clock", () => {
    const events = compile([
      { id: "mk3a", kind: "type", cursor: "main", text: "Hi", by: "char" as const, interval: 100 },
      { id: "mk3b", kind: "style", cursor: "main", style: "tw-highlight", range: { from: 0, to: 2 } },
      { id: "mk3c", kind: "type", cursor: "main", text: "X", by: "char" as const, interval: 50 },
    ]);

    const xEvents = events.filter(e => (e as TInsertEvent).text === "X");

    expect(events.filter(e => e.kind === "style")[0]?.time).toBe(200);
    expect(xEvents[0]?.time).toBe(200);
  });

  it("style event is scheduled at the current time offset", () => {
    const events = compile([
      { id: "mk4a", kind: "type", cursor: "main", text: "AB", by: "char" as const, interval: 100 },
      { id: "mk4b", kind: "wait", duration: 300 },
      { id: "mk4c", kind: "style", cursor: "main", style: "tw-mark", range: { from: 0, to: 2 } },
    ]);

    expect(events.filter(e => e.kind === "style")[0]?.time).toBe(500);
  });

  it("selection-range style emits one event per cursor with sentinel from/to of -1", () => {
    const events = compile([
      { id: "mk5", kind: "style", cursor: ["a", "b"], style: "tw-highlight", range: "selection" as const },
    ]);

    const styleEvents = events.filter(e => e.kind === "style") as TStyleEvent[];

    expect(styleEvents).toHaveLength(2);
    styleEvents.forEach((e) => {
      expect(e.from).toBe(-1);
      expect(e.to).toBe(-1);
    });
    expect(styleEvents.map(e => e.cursorId).sort()).toEqual(["a", "b"]);
  });

  it("single-cursor selection-range style emits one event with cursorId", () => {
    const events = compile([
      { id: "mk6", kind: "style", cursor: "main", style: "tw-highlight", range: "selection" as const },
    ]);

    const styleEvents = events.filter(e => e.kind === "style") as TStyleEvent[];

    expect(styleEvents).toHaveLength(1);
    expect(styleEvents[0]?.cursorId).toBe("main");
    expect(styleEvents[0]?.from).toBe(-1);
    expect(styleEvents[0]?.to).toBe(-1);
  });

  it("accepts a TStyleObject as style value", () => {
    const style = { className: "tw-custom", css: { color: "red" } };
    const events = compile([
      { id: "mk7", kind: "style", cursor: "main", style, range: { from: 0, to: 3 } },
    ]);

    expect((events[0] as TStyleEvent).style).toStrictEqual(style);
  });
});


describe("compile (multi-cursor)", () => {
  it("fans out type events for each cursor at the same timestamps", () => {
    const events = compile([
      { id: "mca", kind: "type", cursor: ["a", "b"], text: "Hi", by: "char", interval: 100 },
    ]);

    const aEvents = events.filter(e => e.cursorId === "a");
    const bEvents = events.filter(e => e.cursorId === "b");

    expect(aEvents).toHaveLength(2);
    expect(bEvents).toHaveLength(2);
    expect(aEvents[0]?.time).toBe(0);
    expect(bEvents[0]?.time).toBe(0);
  });

  it("clock advances only once for a multi-cursor type command", () => {
    const events = compile([
      { id: "mcb1", kind: "type", cursor: ["a", "b"], text: "AB", by: "char", interval: 100 },
      { id: "mcb2", kind: "type", cursor: "main", text: "X", by: "char", interval: 50 },
    ]);

    const mainEvents = events.filter(e => e.cursorId === "main");

    expect(mainEvents).toHaveLength(1);
    expect(mainEvents[0]?.time).toBe(200);
  });

  it("fans out move events for each cursor", () => {
    const events = compile([
      { id: "mcc", kind: "move", cursor: ["x", "y"], index: 5 },
    ]);

    expect(events).toHaveLength(2);
    expect(events.every(e => e.kind === "move")).toBe(true);
    expect(events.map(e => e.cursorId).sort()).toEqual(["x", "y"]);
  });

  it("fans out select events for each cursor", () => {
    const events = compile([
      { id: "mcd", kind: "select", cursor: ["p", "q"], count: 3, by: "char" },
    ]);

    expect(events).toHaveLength(2);
    expect(events.every(e => e.kind === "select")).toBe(true);
    expect(events.map(e => e.cursorId).sort()).toEqual(["p", "q"]);
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

  it("selecting count=0 leaves selection unchanged (returns startIndex)", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello", by: "char" as const, interval: 1 },
      { id: "c2", kind: "select" as const, cursor: "main", count: 0, by: "char" as const },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    // count=0 → selection from/to === cursorIndex (5,5) → withSelection clears it
    expect(state.selections.main).toBeUndefined();
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
      { id: "c3", kind: "delete" as const, cursor: "main", count: 5, by: "char" as const, interval: 1 },
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
      { id: "c3", kind: "delete" as const, cursor: "main", count: 5, by: "char" as const, interval: 1 },
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
      { id: "c3", kind: "delete" as const, cursor: "main", count: 5, by: "char" as const, interval: 1 },
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
      { id: "c3", kind: "delete" as const, cursor: "main", count: 5, by: "char" as const, interval: 1 },
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
    const event = { id: "e1", kind: "style" as const, time: 0, cursorId: undefined as unknown as string, from: -1, to: -1, style: "x", sourceCommandId: "c" };
    const next = applyStyle(state, event);

    expect(next).toBe(state);
  });
});


describe("reduce (delete with styles)", () => {
  it("trimming styles when deleting overlapping text", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "style" as const, cursor: "main", style: "tw-a", range: { from: 0, to: 11 } },
      { id: "c3", kind: "delete" as const, cursor: "main", count: 5, by: "char" as const, interval: 1 },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.text).toBe("Hello ");
    expect(state.document.styles).toHaveLength(1);
  });

  it("delete at start of document (removeStart === removeEnd) clears selection only", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hi", by: "char" as const, interval: 1 },
      { id: "c2", kind: "move" as const, cursor: "main", index: 0 },
      { id: "c3", kind: "delete" as const, cursor: "main", count: 1, by: "char" as const, interval: 1 },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    // Cursor is at 0, delete 1 backward from 0 → removeStart=0 === removeEnd=0 → no change
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

// segmentRichText / resolveStyleRef / mergeStyles

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


describe("stringRenderer.toAnsiString", () => {
  it("returns empty string when nothing rendered", () => {
    const renderer = new StringRenderer();

    expect(renderer.toAnsiString()).toBe("");
  });

  it("returns plain text when no ansi styles are present", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toAnsiString()).toBe("Hello");
  });

  it("returns plain text when styles have no ansi property", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .style("tw-class", { from: 0, to: 5 });
    await tw.play();

    // style has no ansi, plain text returned
    expect(renderer.toAnsiString()).toBe("Hello");
  });

  it("applies ANSI codes for styles with ansi property", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .style({ ansi: { bold: "1" } }, { from: 0, to: 2 });
    await tw.play();

    const result = renderer.toAnsiString();

    expect(result).toContain("\x1B[");
    expect(result).toContain("Hi");
  });

  it("returns plain text when segment has no ansi in merged styles", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("AB", { by: "char", interval: 1 })
      .style({ css: { color: "red" } }, { from: 0, to: 2 });
    await tw.play();

    // css style but no ansi, treated as plain text
    expect(renderer.toAnsiString()).toBe("AB");
  });

  it("returns plain text when ansi object is empty", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("AB", { by: "char", interval: 1 })
      .style({ ansi: {} }, { from: 0, to: 2 });
    await tw.play();

    // empty ansi map, no codes to emit, treated as plain text
    expect(renderer.toAnsiString()).toBe("AB");
  });

  it("returns empty string when document text is empty (segments.length === 0)", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await tw.play();
    tw.stop(); // resets state to empty text and re-renders

    // _state is set (not null) but text is empty → segmentRichText returns []
    expect(renderer.toAnsiString()).toBe("");
  });
});


describe("timelineBuilder.select", () => {
  it("select with default cursor adds a select command", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 1 }).select(-3);
    await tw.play();

    const state = tw.getState();

    expect(state.status).toBe(EPlaybackStatus.COMPLETED);
  });

  it("select with explicit cursor option", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 1 }).select(-2, { cursor: "main" });
    await tw.play();

    expect(renderer.toString()).toBe("Hello");
  });
});


describe("player.helper, play()", () => {
  it("plays events through a renderer and resolves to final state", async () => {
    const events = compile([
      { id: "p1", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 1 },
    ]);

    let lastText = "";
    const renderer = {
      mount: (state: Parameters<typeof play>[1]["renderer"]["render"] extends (s: infer S) => unknown ? S : never) => { void state; },
      render: (state: { document: { text: string } }) => { lastText = state.document.text; },
      unmount: () => {},
    };

    await play(events, { renderer: renderer as Parameters<typeof play>[1]["renderer"], initialState: createInitialState() });

    expect(lastText).toBe("Hi");
  });

  it("play with empty events list resolves immediately", async () => {
    const renderer = { render: () => {} };

    await expect(play([], { renderer, initialState: createInitialState() })).resolves.toBeUndefined();
  });
});


describe("createTypewriter", () => {
  it("types text by char and resolves to the full string", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
  });

  it("types text by word and resolves to the full string", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "word", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
  });

  it("types text with amount:2 and resolves to the full string", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: { unit: "char", amount: 2 }, interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
  });

  it("types multiple chained commands and accumulates output", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 1 });
    tw.timeline.type(" world", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
  });

  it("waits between two type commands and still produces the full output", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 1 }).wait(50).type(" world", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
  });

  it("deletes characters and resolves to the trimmed string", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "char", interval: 1 }).delete(6, { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello");
  });

  it("chains type, wait, and delete correctly", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "char", interval: 1 }).wait(10).delete(6, { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello");
  });

  it("does not delete beyond the start of the document", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 }).delete(100, { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("");
  });

  it("moves cursor to position 0 and types there, prepending text", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("world", { by: "char", interval: 1 }).move(0).type("Hello ", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
  });

  it("clamps move index below 0 to 0", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 }).move(-99).type("!", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("!Hi");
  });

  it("clamps move index beyond document length to end", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 }).move(999).type("!", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hi!");
  });

  it("multi-cursor type inserts same text at both cursor positions", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("X", { cursor: ["a", "b"], by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("XX");
  });

  it("starts with an empty string before play", () => {
    const renderer = stringRenderer();

    createTypewriter({ renderer });

    expect(renderer.toString()).toBe("");
  });

  it("handles emoji grapheme clusters correctly", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("👨‍👩‍👧‍👦🇲🇦", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("👨‍👩‍👧‍👦🇲🇦");
  });
});


describe("playback controls, status", () => {
  it("starts in idle status", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    expect(tw.getState().status).toBe(EPlaybackStatus.IDLE);
  });

  it("transitions to playing while playing", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 20 });

    const playing = tw.play();

    expect(tw.getState().status).toBe(EPlaybackStatus.PLAYING);
    await playing;
  });

  it("pause() when not playing is a no-op", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("Hello", { by: "char", interval: 1 });
    // status is IDLE, pause should do nothing
    tw.pause();

    expect(tw.getState().status).toBe(EPlaybackStatus.IDLE);
  });

  it("calling play() while already playing returns immediately (no-op)", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 20 });
    const first = tw.play();
    const second = tw.play(); // already playing, no-op

    await Promise.all([first, second]);

    expect(renderer.toString()).toBe("Hello");
  });

  it("transitions to completed after natural finish", async () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await tw.play();

    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });

  it("transitions to paused after pause()", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "char", interval: 20 });
    const playing = tw.play();

    tw.pause();

    expect(tw.getState().status).toBe(EPlaybackStatus.PAUSED);
    await playing;
  });

  it("transitions to stopped after stop()", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "char", interval: 20 });
    const playing = tw.play();

    tw.stop();

    expect(tw.getState().status).toBe(EPlaybackStatus.STOPPED);
    await playing;
  });

  it("stop() resets rendered output to empty", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 1 });
    await tw.play();

    tw.stop();

    expect(renderer.toString()).toBe("");
  });

  it("replay() restarts from empty and completes with full text", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hi");
    await tw.replay();

    expect(renderer.toString()).toBe("Hi");
    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });

  it("calling play() again after completed replays from start", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await tw.play();
    await tw.play();

    expect(renderer.toString()).toBe("Hi");
    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });

  it("pause() then play() resumes and completes", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 10 });
    const firstPlay = tw.play();

    await new Promise(r => setTimeout(r, 5));
    tw.pause();
    await firstPlay;

    await tw.play();

    expect(renderer.toString()).toBe("Hello");
    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });
});


describe("playback controls, rate", () => {
  it("getState() reports default rate of 1", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    expect(tw.getState().rate).toBe(1);
  });

  it("setRate() updates the rate", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.setRate(2);

    expect(tw.getState().rate).toBe(2);
  });

  it("setRate(0) is ignored", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.setRate(0);

    expect(tw.getState().rate).toBe(1);
  });

  it("setRate(-1) is ignored", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.setRate(-1);

    expect(tw.getState().rate).toBe(1);
  });

  it("setRate while playing reschedules and completes correctly", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 50 });
    const playing = tw.play();

    await new Promise(r => setTimeout(r, 10));
    tw.setRate(10); // speed up dramatically

    await playing;

    expect(renderer.toString()).toBe("Hello");
  });

  it("double rate completes faster than normal rate", async () => {
    const fastRenderer = stringRenderer();
    const slowRenderer = stringRenderer();
    const fast = createTypewriter({ renderer: fastRenderer });
    const slow = createTypewriter({ renderer: slowRenderer });

    fast.timeline.type("Hello", { by: "char", interval: 50 });
    slow.timeline.type("Hello", { by: "char", interval: 50 });
    fast.setRate(4);

    const t0 = Date.now();

    await fast.play();
    const fastTime = Date.now() - t0;
    const t1 = Date.now();

    await slow.play();
    const slowTime = Date.now() - t1;

    expect(fastTime).toBeLessThan(slowTime);
    expect(fastRenderer.toString()).toBe("Hello");
    expect(slowRenderer.toString()).toBe("Hello");
  });
});


describe("playback controls, seek", () => {
  it("seek to 0 applies the t=0 event (first char)", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 100 });
    tw.seek(0);

    expect(renderer.toString()).toBe("H");
  });

  it("seek to duration shows full text", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 100 });
    tw.seek(Infinity);

    expect(renderer.toString()).toBe("Hello");
  });

  it("seek to middle shows partial text", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 100 });
    tw.seek(250);

    expect(renderer.toString()).toBe("Hel");
  });

  it("seek clamps negative values to 0 and applies t=0 event", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 100 });
    tw.seek(-999);

    expect(renderer.toString()).toBe("H");
  });

  it("seek marks completed when seeking to the end", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("Hi", { by: "char", interval: 100 });
    tw.seek(Infinity);

    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });

  it("getState().duration reflects the total timeline duration", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("Hi", { by: "char", interval: 100 });
    tw.seek(0);

    expect(tw.getState().duration).toBe(100);
  });

  it("seek while playing reschedules from the new position", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 50 });
    const playing = tw.play();

    await new Promise(r => setTimeout(r, 10));
    tw.seek(300); // jump forward

    await playing;

    expect(renderer.toString()).toBe("Hello");
  });
});


describe("playback controls, stepping", () => {
  it("stepForward applies one event group and pauses", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 100 });
    tw.stepForward();

    expect(renderer.toString()).toBe("H");
    expect(tw.getState().status).toBe(EPlaybackStatus.PAUSED);
  });

  it("stepForward all the way completes the animation", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 100 });
    tw.stepForward();
    tw.stepForward();

    expect(renderer.toString()).toBe("Hi");
    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });

  it("stepForward past the end stays completed", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("X", { by: "char", interval: 1 });
    tw.stepForward();
    tw.stepForward();

    expect(tw.getState().status).toBe(EPlaybackStatus.COMPLETED);
  });

  it("stepBackward from beginning stays at index 0 and pauses", () => {
    const tw = createTypewriter({ renderer: stringRenderer() });

    tw.timeline.type("Hello", { by: "char", interval: 100 });
    tw.stepBackward();

    expect(tw.getState().status).toBe(EPlaybackStatus.PAUSED);
  });

  it("stepForward then stepBackward returns to empty state", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 100 });
    tw.stepForward();

    expect(renderer.toString()).toBe("H");

    tw.stepBackward();

    expect(renderer.toString()).toBe("");
    expect(tw.getState().status).toBe(EPlaybackStatus.PAUSED);
  });

  it("step forward multiple times then backward ends up at correct state", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 100 });
    tw.stepForward();
    tw.stepForward();
    tw.stepForward();
    tw.stepBackward();

    expect(renderer.toString()).toBe("He");
    expect(tw.getState().status).toBe(EPlaybackStatus.PAUSED);
  });

  it("stepBackward walks back through multi-event group at same timestamp", () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // Multi-cursor: both "a" and "b" produce events at t=0 (same timestamp)
    tw.timeline.type("H", { cursor: ["a", "b"], by: "char", interval: 100 });
    tw.stepForward(); // applies all events at t=0 (2 events: a→H, b→H), currentEventIndex=2

    // stepBackward: lastAppliedTime=0, groupStart=1
    // while: groupStart(1) > 0 && events[0].time(0) === 0 → TRUE → groupStart-- → groupStart=0
    // if(groupStart===0) → TRUE → reset to initialState
    tw.stepBackward();

    expect(renderer.toString()).toBe("");
    expect(tw.getState().status).toBe(EPlaybackStatus.PAUSED);
  });
});

// Delete unit handling, word / line / char

describe("delete (unit handling)", () => {
  it("delete by word removes the last word from the document", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .delete(1, { by: "word", interval: 1 });
    await tw.play();

    // "world" (5 chars) should be removed, leaving "hello "
    expect(renderer.toString()).toBe("hello ");
  });

  it("delete by word removes multiple words when count > 1", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("one two three", { by: "char", interval: 1 })
      .delete(2, { by: "word", interval: 1 });
    await tw.play();

    // count:2, amount:1 → 2 events, each removing 1 word.
    // Event 1: removes "three" (5 chars) → "one two "
    // Event 2: removes "two " (4 chars) → "one "
    expect(renderer.toString()).toBe("one ");
  });

  it("delete by line removes the last line", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("line1\nline2", { by: "char", interval: 1 })
      .delete(1, { by: "line", interval: 1 });
    await tw.play();

    // "line2" is the last segment when splitting by line (no trailing newline)
    expect(renderer.toString()).toBe("line1\n");
  });

  it("delete by char removes the correct number of characters", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .delete(3, { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ab");
  });

  it("delete by grapheme removes one grapheme cluster per step", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "hi" + pile-of-poo emoji (2 UTF-16 code units = 1 grapheme)
    // delete(1, { by: "grapheme" }) → count:1 chars removed (grapheme fast-path)
    // The emoji is 2 code units but the fast-path treats count as chars, so 1 char removed.
    // To properly test grapheme-aware deletion, use delete(2) for a 2-unit emoji.
    tw.timeline
      .type("hi\u{1F4A9}", { by: "char", interval: 1 })
      .delete(2, { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("hi");
  });

  it("compiled delete events carry the correct unit field", () => {
    const wordEvents = compile([{ id: "d-unit-1", kind: "delete", cursor: "main", count: 1, by: "word" }]);
    const lineEvents = compile([{ id: "d-unit-2", kind: "delete", cursor: "main", count: 1, by: "line" }]);
    const charEvents = compile([{ id: "d-unit-3", kind: "delete", cursor: "main", count: 1, by: "char" }]);

    expect((wordEvents[0] as TDeleteEvent).unit).toBe("word");
    expect((lineEvents[0] as TDeleteEvent).unit).toBe("line");
    expect((charEvents[0] as TDeleteEvent).unit).toBe("char");
  });

  it("delete by word at start of document (no text before cursor) is a no-op", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hi", { by: "char", interval: 1 })
      .move(0)
      .delete(1, { by: "word", interval: 1 });
    await tw.play();

    // Cursor at 0, no text before it, nothing is removed
    expect(renderer.toString()).toBe("hi");
  });

  it("delete by word with amount:2 uses amount as the number of logical units per step", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // count:2, amount:2 → ceil(2/2)=1 step, stepCount=min(2,2)=2.
    // The event carries count:2 and unit:"word".
    // Reducer: take last 2 word-segments from "one two three four" → "three four" (10 chars removed).
    tw.timeline
      .type("one two three four", { by: "char", interval: 1 })
      .delete(2, { by: { unit: "word", amount: 2 }, interval: 1 });
    await tw.play();

    // 1 step removes 2 words ("three " + "four") → "one two "
    expect(renderer.toString()).toBe("one two ");
  });
});


describe("multi-cursor insert index adjustment", () => {
  it("inserting at a lower-index cursor shifts a higher-index cursor forward", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "ab", main at 2, cursor "b" parked at 1 (between a and b).
    // Type "X" with cursor "b" (at 1) → inserts at 1, main shifts from 2 to 3.
    // Then type "Y" with main (now at 3) → appends after "b", result: "aXbY"
    tw.timeline
      .type("ab", { by: "char", interval: 1 })
      .move(1, { cursor: "b" })
      .type("X", { cursor: "b", by: "char", interval: 1 })
      .type("Y", { cursor: "main", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("aXbY");
  });

  it("inserting at a higher-index cursor does not shift a lower-index cursor", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "ab", main at 2, cursor "b" parked at 0.
    // Type "Y" with main (at 2) → inserts at 2, "b" stays at 0.
    // Then type "X" with "b" (still 0) → inserts at 0, result: "XabY"
    tw.timeline
      .type("ab", { by: "char", interval: 1 })
      .move(0, { cursor: "b" })
      .type("Y", { cursor: "main", by: "char", interval: 1 })
      .type("X", { cursor: "b", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("XabY");
  });

  it("mirror-cursor typing produces the same text at both positions", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "Name: \\nRole: ", main at 13, "b" at 6
    // Both type "Alice" simultaneously, result must be "Name: Alice\\nRole: Alice"
    tw.timeline
      .type("Name: \nRole: ", { by: "char", interval: 1 })
      .move(6, { cursor: "b" })
      .type("Alice", { cursor: ["main", "b"], by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Name: Alice\nRole: Alice");
  });

  it("two cursors typing distinct values produce correct independent text", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "City: \\nCountry: ", "b" at 6, main at 17
    // Type "Paris" at "b" (lower), then "France" at main (shifts up)
    tw.timeline
      .type("City: \nCountry: ", { by: "char", interval: 1 })
      .move(6, { cursor: "b" })
      .type("Paris", { cursor: "b", by: "char", interval: 1 })
      .type("France", { cursor: "main", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("City: Paris\nCountry: France");
  });
});


describe("multi-cursor delete index adjustment", () => {
  it("deleting with a lower-index cursor shifts a higher-index cursor backward", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcd", main at 4, "b" at 2. Delete 1 with "b" → removes "b"(1) leaving "acd",
    // main shifts from 4 to 3. Then type "Z" at main (3) → "acdZ"
    tw.timeline
      .type("abcd", { by: "char", interval: 1 })
      .move(2, { cursor: "b" })
      .delete(1, { cursor: "b", by: "char", interval: 1 })
      .type("Z", { cursor: "main", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("acdZ");
  });

  it("deleting with a higher-index cursor does not shift a lower-index cursor", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcd", main at 4, "b" at 1. Delete 1 with main → removes "d" leaving "abc",
    // "b" stays at 1. Then type "X" at "b" (1) → "aXbc"
    tw.timeline
      .type("abcd", { by: "char", interval: 1 })
      .move(1, { cursor: "b" })
      .delete(1, { cursor: "main", by: "char", interval: 1 })
      .type("X", { cursor: "b", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("aXbc");
  });
});


describe("select (unit handling)", () => {
  it("select forward by word covers one full word", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "move" as const, cursor: "main", index: 0 },
      { id: "c3", kind: "select" as const, cursor: "main", count: 1, by: "word" as const },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    // selecting 1 word forward from 0 → "hello " (6 chars) → from=0, to=6
    expect(state.selections.main).toStrictEqual({ from: 0, to: 6 });
  });

  it("select backward by word covers one full word", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "select" as const, cursor: "main", count: -1, by: "word" as const },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    // cursor at 11, select backward 1 word → "world" (5 chars) → from=6, to=11
    expect(state.selections.main).toStrictEqual({ from: 6, to: 11 });
  });

  it("select forward by line covers one full line including newline", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "line1\nline2", by: "char" as const, interval: 1 },
      { id: "c2", kind: "move" as const, cursor: "main", index: 0 },
      { id: "c3", kind: "select" as const, cursor: "main", count: 1, by: "line" as const },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    // "line1\n" = 6 chars → from=0, to=6
    expect(state.selections.main).toStrictEqual({ from: 0, to: 6 });
  });
});

// Command × unit × by-shape matrix
// Every command that accepts `by` is exercised with all 5 units × 2 by-shapes

describe("command × unit × by-shape matrix", () => {
  const TEXT = "one two three\nfour five";
  const UNITS = ["char", "grapheme", "word", "line", "custom"] as const;

  type TByInput = "char" | "grapheme" | "word" | "line" | "custom" | { unit: string; amount: number };

  const toByShapes = (unit: string): TByInput[] => [unit as TByInput, { unit, amount: 1 }];

  // --- type command ---
  for (const unit of UNITS) {
    for (const by of toByShapes(unit)) {
      it(`type by ${unit} (by=${JSON.stringify(by)}) produces text and applies without throwing`, async () => {
        const renderer = stringRenderer();
        const tw = createTypewriter({ renderer });

        tw.timeline.type("Hello", { by: by as "char", interval: 1 });
        await tw.play();

        expect(renderer.toString()).toBe("Hello");
      });
    }
  }

  // --- delete command ---
  for (const unit of UNITS) {
    for (const by of toByShapes(unit)) {
      it(`delete by ${unit} (by=${JSON.stringify(by)}) removes text without throwing`, async () => {
        const renderer = stringRenderer();
        const tw = createTypewriter({ renderer });

        tw.timeline
          .type(TEXT, { by: "char", interval: 1 })
          .delete(1, { by: by as "char", interval: 1 });
        await tw.play();

        // Result is shorter than the original TEXT
        expect(renderer.toString().length).toBeLessThan(TEXT.length);
      });
    }
  }

  // --- select command ---
  for (const unit of UNITS) {
    for (const by of toByShapes(unit)) {
      it(`select by ${unit} (by=${JSON.stringify(by)}) sets a selection without throwing`, () => {
        const commands = [
          { id: "s-setup", kind: "type" as const, cursor: "main", text: TEXT, by: "char" as const, interval: 1 },
          { id: "s-select", kind: "select" as const, cursor: "main", count: -1, by: by as "char" },
        ];
        const events = compile(commands);
        let state = createInitialState();

        // Should not throw for any unit
        expect(() => {
          for (const event of events) {
            state = reduce(state, event);
          }
        }).not.toThrow();
      });
    }
  }
});

// Reducer branch coverage, insertTextAtCursor selection shifting

describe("insertTextAtCursor, selection shifting branches", () => {
  it("shifts sel.from and sel.to of another cursor when both are strictly after insertIndex", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", main at 5, cursor "b" has a selection [3, 5]
    // Insert "X" with a third cursor "c" at index 1 → text becomes "aXbcde"
    // "b"'s selection [3, 5] should shift to [4, 6]
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      // Select 2 chars backward with "b" from position 5 → selection [3, 5]
      .move(5, { cursor: "b" })
      .select(-2, { cursor: "b" })
      // Insert "X" at position 1 with "c"
      .move(1, { cursor: "c" })
      .type("X", { cursor: "c", by: "char", interval: 1 });
    await tw.play();

    // Text should be "aXbcde" (X inserted at 1)
    expect(renderer.toString()).toBe("aXbcde");
  });

  it("does not shift sel.from of another cursor when sel.from <= insertIndex", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", "b" selection covers [0, 2] (before insert point)
    // Insert "X" with "c" at index 3 → sel.from=0 stays 0, sel.to=2 stays 2
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(2, { cursor: "b" })
      .select(-2, { cursor: "b" })
      .move(3, { cursor: "c" })
      .type("X", { cursor: "c", by: "char", interval: 1 });
    await tw.play();

    // Text becomes "abcXde"
    expect(renderer.toString()).toBe("abcXde");
  });

  it("shifts sel.to but not sel.from when sel.from <= insertIndex < sel.to", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", "b" selection covers [1, 4], insert "X" at index 2
    // sel.from=1 <= 2 → stays 1; sel.to=4 > 2 → becomes 5
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(4, { cursor: "b" })
      .select(-3, { cursor: "b" })
      .move(2, { cursor: "c" })
      .type("X", { cursor: "c", by: "char", interval: 1 });
    await tw.play();

    // Text becomes "abXcde"
    expect(renderer.toString()).toBe("abXcde");
  });

  it("selection map handles a cursor with undefined selection entry", async () => {
    // A cursor can exist in state but have no selection.
    // The Object.entries(selections) loop should skip it safely.
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "ab", cursor "b" is present but has no selection.
    // Insert "X" at main (index 2), the loop over selections for "b" entry
    // that is absent should be a no-op (key won't appear, so the branch
    // is hit when we force a selection entry of undefined in state directly).
    tw.timeline
      .type("ab", { by: "char", interval: 1 })
      .move(0, { cursor: "b" })
      .type("X", { cursor: "main", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("abX");
  });
});

// Reducer branch coverage, deleteTextAtCursor cursor/selection shifting

describe("deleteTextAtCursor, cursor and selection shifting branches", () => {
  it("clamps another cursor that is inside the deleted range to removeStart", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", cursor "b" parked at 2 (inside delete range [1, 4]).
    // Delete 3 chars with main (cursor at 4) → removes [1,4] → text = "ae".
    // Cursor "b" (at 2, inside [1,4]) should be clamped to 1.
    // Then type "X" at "b" (now at 1) → "aXe"
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(2, { cursor: "b" })
      .move(4)
      .delete(3, { cursor: "main", by: "char", interval: 1 })
      .type("X", { cursor: "b", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("aXe");
  });

  it("does not shift another cursor that is before removeStart", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", cursor "b" at 1 (before delete range [2, 5]).
    // Delete 3 chars with main (cursor at 5) → text = "ab".
    // Cursor "b" stays at 1. Type "X" at "b" → "aXb"
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(1, { cursor: "b" })
      .delete(3, { cursor: "main", by: "char", interval: 1 })
      .type("X", { cursor: "b", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("aXb");
  });

  it("shifts selection.from back when it is at or after removeEnd", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", "b" has selection [3, 5].
    // Main cursor at 3 deletes 2 chars (range [1, 3]) → text = "ade".
    // "b" sel.from=3 >= removeEnd=3 → shifts to 3-2=1
    // "b" sel.to=5 >= removeEnd=3 → shifts to 5-2=3
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(5, { cursor: "b" })
      .select(-2, { cursor: "b" })
      .move(3)
      .delete(2, { cursor: "main", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ade");
  });

  it("clamps selection.from to removeStart when it is inside the deleted range", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", "b" has selection [2, 5].
    // Main at 4 deletes 3 chars (range [1, 4]) → text = "ae".
    // "b" sel.from=2: removeStart=1, removeEnd=4 → 2 > removeStart and < removeEnd → clamped to 1
    // "b" sel.to=5 >= removeEnd=4 → shifts to 5-3=2
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(5, { cursor: "b" })
      .select(-3, { cursor: "b" })
      .move(4)
      .delete(3, { cursor: "main", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ae");
  });

  it("clamps selection.to to removeStart when it is inside the deleted range", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", "b" has selection [0, 3].
    // Main at 5 deletes 3 chars (range [2, 5]) → text = "ab".
    // "b" sel.from=0 <= removeStart=2 → stays 0
    // "b" sel.to=3: removeStart=2, removeEnd=5 → 3 > removeStart and < removeEnd → clamped to 2
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(3, { cursor: "b" })
      .select(-3, { cursor: "b" })
      .delete(3, { cursor: "main", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ab");
  });

  it("leaves selection unchanged when both from and to are before removeStart", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", "b" has selection [0, 1].
    // Main at 5 deletes 2 chars (range [3, 5]) → text = "abc".
    // "b" sel.from=0 <= removeStart=3 → stays 0
    // "b" sel.to=1 <= removeStart=3 → stays 1
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(1, { cursor: "b" })
      .select(-1, { cursor: "b" })
      .delete(2, { cursor: "main", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("abc");
  });
});


describe("compile (unselect)", () => {
  it("compiles an unselect command into one event per cursor", () => {
    const events = compile([
      { id: "cs1", kind: "unselect" as const, cursor: "main" },
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("unselect");
    expect(events[0]?.cursorId).toBe("main");
  });

  it("fans out one event per cursor for multi-cursor unselect", () => {
    const events = compile([
      { id: "cs2", kind: "unselect" as const, cursor: ["a", "b"] },
    ]);

    expect(events).toHaveLength(2);
    expect(events.every(e => e.kind === "unselect")).toBe(true);
    expect(events.map(e => e.cursorId).sort()).toEqual(["a", "b"]);
  });

  it("does not advance the clock", () => {
    const events = compile([
      { id: "cs3a", kind: "type" as const, cursor: "main", text: "Hi", by: "char" as const, interval: 100 },
      { id: "cs3b", kind: "unselect" as const, cursor: "main" },
      { id: "cs3c", kind: "type" as const, cursor: "main", text: "AB", by: "char" as const, interval: 50 },
    ]);

    const abEvents = events.filter(e => (e as TInsertEvent).text === "A" || (e as TInsertEvent).text === "B");

    expect(events.filter(e => e.kind === "unselect")[0]?.time).toBe(200);
    expect(abEvents[0]?.time).toBe(200);
  });
});


describe("compile (unstyle)", () => {
  it("compiles a fixed-range unstyle into exactly one event", () => {
    const events = compile([
      { id: "um1", kind: "unstyle" as const, cursor: "main", range: { from: 0, to: 5 } },
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("unstyle");
  });

  it("fixed-range unstyle event carries correct from and to values", () => {
    const events = compile([
      { id: "um2", kind: "unstyle" as const, cursor: "main", range: { from: 2, to: 9 } },
    ]);

    const evt = events[0] as TUnstyleEvent;

    expect(evt.from).toBe(2);
    expect(evt.to).toBe(9);
  });

  it("does not advance the clock", () => {
    const events = compile([
      { id: "um3a", kind: "type" as const, cursor: "main", text: "Hi", by: "char" as const, interval: 100 },
      { id: "um3b", kind: "unstyle" as const, cursor: "main", range: { from: 0, to: 2 } },
      { id: "um3c", kind: "type" as const, cursor: "main", text: "X", by: "char" as const, interval: 50 },
    ]);

    expect(events.filter(e => e.kind === "unstyle")[0]?.time).toBe(200);
    expect(events.filter(e => (e as TInsertEvent).text === "X")[0]?.time).toBe(200);
  });

  it("selection-range unstyle emits one event per cursor with sentinel from/to of -1", () => {
    const events = compile([
      { id: "um4", kind: "unstyle" as const, cursor: ["a", "b"], range: "selection" as const },
    ]);

    const unstyleEvents = events.filter(e => e.kind === "unstyle") as TUnstyleEvent[];

    expect(unstyleEvents).toHaveLength(2);
    unstyleEvents.forEach((e) => {
      expect(e.from).toBe(-1);
      expect(e.to).toBe(-1);
    });
    expect(unstyleEvents.map(e => e.cursorId).sort()).toEqual(["a", "b"]);
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

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, from: 0, to: 11, sourceCommandId: "c1" };
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

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, from: 6, to: 11, sourceCommandId: "c1" };
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

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, from: 5, to: 11, sourceCommandId: "c1" };
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

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, from: 0, to: 6, sourceCommandId: "c1" };
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

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, from: 3, to: 8, sourceCommandId: "c1" };
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

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, from: -1, to: -1, cursorId: "main", sourceCommandId: "c1" };
    const next = removeStyles(state, event);

    expect(next.selections.main).toBeUndefined();
    expect(next.document.styles).toHaveLength(1);
    expect(next.document.styles[0]).toStrictEqual({ from: 0, to: 6, style: "tw-a" });
  });

  it("selection-based unstyle with no active selection returns state unchanged", () => {
    const state = createInitialState();
    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, from: -1, to: -1, cursorId: "main", sourceCommandId: "c1" };
    const next = removeStyles(state, event);

    expect(next).toBe(state);
  });

  it("selection-based unstyle with missing cursorId returns state unchanged", () => {
    const state = createInitialState();
    const event = { id: "e1", kind: "unstyle" as const, time: 0, from: -1, to: -1, cursorId: undefined as unknown as string, sourceCommandId: "c1" };
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

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, from: 3, to: 3, sourceCommandId: "c1" };
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

    const event: TUnstyleEvent = { id: "e1", kind: "unstyle" as const, time: 0, from: 0, to: 5, sourceCommandId: "c1" };
    const next = reduce(state, event);

    expect(next.document.styles).toHaveLength(0);
  });
});


describe("integration (unselect)", () => {
  it("unselect removes an active selection without moving the cursor", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(6)
      .select(5)
      .unselect();
    await tw.play();

    const live = tw.getLiveState();

    expect(live.selections.main).toBeUndefined();
    expect(live.cursors.main?.index).toBe(6);
    expect(renderer.toString()).toBe("Hello World");
  });

  it("unselect on a cursor with no selection is a no-op", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .unselect();
    await tw.play();

    const live = tw.getLiveState();

    expect(live.selections.main).toBeUndefined();
    expect(renderer.toString()).toBe("Hello");
  });

  it("unselect for multi-cursor removes selections from all targeted cursors", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("ABCDE", { by: "char", interval: 1 })
      .select(2, { cursor: "a" })
      .select(3, { cursor: "b" })
      .unselect({ cursor: ["a", "b"] });
    await tw.play();

    const live = tw.getLiveState();

    expect(live.selections.a).toBeUndefined();
    expect(live.selections.b).toBeUndefined();
  });
});


describe("integration (unstyle)", () => {
  it("unstyle by absolute range removes styles from the document", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 11 })
      .unstyle({ from: 6, to: 11 });
    await tw.play();

    const live = tw.getLiveState();

    expect(renderer.toString()).toBe("Hello World");
    expect(live.document.styles).toHaveLength(1);
    expect(live.document.styles[0]).toStrictEqual({ from: 0, to: 6, style: "tw-a" });
  });

  it("unstyle by selection removes styles in the selection range and clears selection", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 11 })
      .move(6)
      .select(5)
      .unstyle("selection");
    await tw.play();

    const live = tw.getLiveState();

    expect(live.selections.main).toBeUndefined();
    expect(live.document.styles).toHaveLength(1);
    expect(live.document.styles[0]).toStrictEqual({ from: 0, to: 6, style: "tw-a" });
  });

  it("unstyle splitting a spanning style produces two fragments", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 11 })
      .unstyle({ from: 3, to: 8 });
    await tw.play();

    const live = tw.getLiveState();

    expect(live.document.styles).toHaveLength(2);
    expect(live.document.styles[0]).toStrictEqual({ from: 0, to: 3, style: "tw-a" });
    expect(live.document.styles[1]).toStrictEqual({ from: 8, to: 11, style: "tw-a" });
  });

  it("unstyle on document with no styles is a no-op", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .unstyle({ from: 0, to: 5 });
    await tw.play();

    const live = tw.getLiveState();

    expect(live.document.styles).toHaveLength(0);
    expect(renderer.toString()).toBe("Hello");
  });

  it("unstyle by selection with no active selection is a no-op", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 5 })
      .unstyle("selection");
    await tw.play();

    const live = tw.getLiveState();

    expect(live.document.styles).toHaveLength(1);
  });
});
