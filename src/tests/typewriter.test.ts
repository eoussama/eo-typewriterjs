import type { TDeleteEvent } from "../core/events/delete-event.type";
import type { TInsertEvent } from "../core/events/insert-event.type";
import type { TMarkEvent } from "../core/events/mark-event.type";
import { describe, expect, it } from "vitest";
import { compile } from "../core/compiler/compile.helper";
import { play } from "../core/player/player.helper";
import { applyMark } from "../core/reducer/apply-mark.helper";
import { reduce } from "../core/reducer/reduce.helper";
import { createInitialState, getSelection, withSelection, withSelectionCleared } from "../core/state/index";
import { mergeStyles, resolveStyleRef, segmentRichText } from "../core/state/segment-rich-text.helper";
import { chunkSteps } from "../core/stepping/chunk-steps.helper";
import { segmentText } from "../core/stepping/segment-text.helper";

import { createTypewriter, EPlaybackStatus, stringRenderer, StringRenderer } from "../index";



// ---------------------------------------------------------------------------
// Stepping — segmentText
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Stepping — chunkSteps
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Compiler — type command
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Compiler — wait
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Compiler — delete
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Compiler — moveCursor
// ---------------------------------------------------------------------------

describe("compile (moveCursor)", () => {
  it("compiles a moveCursor command into a single event", () => {
    const events = compile([{ id: "mc1", kind: "moveCursor", cursor: "main", index: 3 }]);

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("moveCursor");
  });

  it("does not advance the clock", () => {
    const events = compile([
      { id: "mc2", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 100 },
      { id: "mc3", kind: "moveCursor", cursor: "main", index: 0 },
      { id: "mc4", kind: "type", cursor: "main", text: "AB", by: "char", interval: 50 },
    ]);

    const abEvents = events.filter(e => (e as TInsertEvent).text === "A" || (e as TInsertEvent).text === "B");

    expect(abEvents[0]?.time).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Compiler — select
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Compiler — mark command
// ---------------------------------------------------------------------------

describe("compile (mark)", () => {
  it("compiles a fixed-range mark into exactly one event", () => {
    const events = compile([
      { id: "mk1", kind: "mark", cursor: "main", style: "tw-highlight", range: { from: 0, to: 5 } },
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("mark");
  });

  it("fixed-range mark event carries correct from, to, and style", () => {
    const events = compile([
      { id: "mk2", kind: "mark", cursor: "main", style: "tw-highlight", range: { from: 2, to: 9 } },
    ]);

    const evt = events[0] as TMarkEvent;

    expect(evt.from).toBe(2);
    expect(evt.to).toBe(9);
    expect(evt.style).toBe("tw-highlight");
  });

  it("fixed-range mark does not advance the clock", () => {
    const events = compile([
      { id: "mk3a", kind: "type", cursor: "main", text: "Hi", by: "char" as const, interval: 100 },
      { id: "mk3b", kind: "mark", cursor: "main", style: "tw-highlight", range: { from: 0, to: 2 } },
      { id: "mk3c", kind: "type", cursor: "main", text: "X", by: "char" as const, interval: 50 },
    ]);

    const xEvents = events.filter(e => (e as TInsertEvent).text === "X");

    expect(events.filter(e => e.kind === "mark")[0]?.time).toBe(200);
    expect(xEvents[0]?.time).toBe(200);
  });

  it("mark event is scheduled at the current time offset", () => {
    const events = compile([
      { id: "mk4a", kind: "type", cursor: "main", text: "AB", by: "char" as const, interval: 100 },
      { id: "mk4b", kind: "wait", duration: 300 },
      { id: "mk4c", kind: "mark", cursor: "main", style: "tw-mark", range: { from: 0, to: 2 } },
    ]);

    expect(events.filter(e => e.kind === "mark")[0]?.time).toBe(500);
  });

  it("selection-range mark emits one event per cursor with sentinel from/to of -1", () => {
    const events = compile([
      { id: "mk5", kind: "mark", cursor: ["a", "b"], style: "tw-highlight", range: "selection" as const },
    ]);

    const markEvents = events.filter(e => e.kind === "mark") as TMarkEvent[];

    expect(markEvents).toHaveLength(2);
    markEvents.forEach((e) => {
      expect(e.from).toBe(-1);
      expect(e.to).toBe(-1);
    });
    expect(markEvents.map(e => e.cursorId).sort()).toEqual(["a", "b"]);
  });

  it("single-cursor selection-range mark emits one event with cursorId", () => {
    const events = compile([
      { id: "mk6", kind: "mark", cursor: "main", style: "tw-highlight", range: "selection" as const },
    ]);

    const markEvents = events.filter(e => e.kind === "mark") as TMarkEvent[];

    expect(markEvents).toHaveLength(1);
    expect(markEvents[0]?.cursorId).toBe("main");
    expect(markEvents[0]?.from).toBe(-1);
    expect(markEvents[0]?.to).toBe(-1);
  });

  it("accepts a TStyleObject as style value", () => {
    const style = { className: "tw-custom", css: { color: "red" } };
    const events = compile([
      { id: "mk7", kind: "mark", cursor: "main", style, range: { from: 0, to: 3 } },
    ]);

    expect((events[0] as TMarkEvent).style).toStrictEqual(style);
  });
});

// ---------------------------------------------------------------------------
// Compiler — multi-cursor fan-out
// ---------------------------------------------------------------------------

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

  it("fans out moveCursor events for each cursor", () => {
    const events = compile([
      { id: "mcc", kind: "moveCursor", cursor: ["x", "y"], index: 5 },
    ]);

    expect(events).toHaveLength(2);
    expect(events.every(e => e.kind === "moveCursor")).toBe(true);
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

// ---------------------------------------------------------------------------
// Reducer — reduce default branch
// ---------------------------------------------------------------------------

describe("reduce (default branch)", () => {
  it("returns state unchanged for an unknown event kind", () => {
    const state = createInitialState();
    const unknown = { id: "e1", kind: "unknown" as "insert", time: 0, cursorId: "main", sourceCommandId: "c1" };
    const next = reduce(state, unknown as unknown as Parameters<typeof reduce>[1]);

    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// Reducer — mark
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Reducer — selectText edge cases (count=0, empty text)
// ---------------------------------------------------------------------------

describe("reduce (selectText edge cases)", () => {
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

// ---------------------------------------------------------------------------
// Reducer — delete with marks covering filter/map branches
// ---------------------------------------------------------------------------

describe("reduce (delete mark clamp branches)", () => {
  it("clamps a partially overlapping mark that starts before removeStart", () => {
    // Text: "Hello world" (11 chars), mark covers [0,8], delete last 5 chars (positions 6-11)
    // After delete text = "Hello " (6 chars)
    // Mark [0,8]: not fully within [6,11], so survives filter
    // mark.from=0 <= removeStart=6, so from stays 0
    // mark.to=8 > removeStart=6, so to = max(6, 8-(11-6)) = max(6, 3) = 6
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "mark" as const, cursor: "main", style: "tw-a", range: { from: 0, to: 8 } },
      { id: "c3", kind: "delete" as const, cursor: "main", count: 5, by: "char" as const, interval: 1 },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.text).toBe("Hello ");
    expect(state.document.marks).toHaveLength(1);
    expect(state.document.marks[0]?.from).toBe(0);
  });

  it("removes a mark fully contained in the deleted range", () => {
    // Text: "Hello world", mark covers [7,10] (fully within delete range [6,11])
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "mark" as const, cursor: "main", style: "tw-b", range: { from: 7, to: 10 } },
      { id: "c3", kind: "delete" as const, cursor: "main", count: 5, by: "char" as const, interval: 1 },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.text).toBe("Hello ");
    expect(state.document.marks).toHaveLength(0);
  });

  it("clamps a mark that starts after removeStart", () => {
    // Text: "Hello world", mark covers [8,11], delete last 5 → removeStart=6
    // mark.from=8 > removeStart=6, so from = max(6, 8-(11-6)) = max(6,3) = 6
    // mark.to=11 > removeStart=6, so to = max(6, 11-(11-6)) = max(6,6) = 6
    // from=6, to=6 → degenerate mark stays (filter passes but mark is zero-width)
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "mark" as const, cursor: "main", style: "tw-c", range: { from: 8, to: 11 } },
      { id: "c3", kind: "delete" as const, cursor: "main", count: 5, by: "char" as const, interval: 1 },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.text).toBe("Hello ");
  });
});

describe("reduce (mark)", () => {
  it("fixed-range mark appends a mark to document.marks", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello", by: "char" as const, interval: 1 },
      { id: "c2", kind: "mark" as const, cursor: "main", style: "tw-highlight", range: { from: 0, to: 5 } },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.marks).toHaveLength(1);
    expect(state.document.marks[0]).toStrictEqual({ from: 0, to: 5, style: "tw-highlight" });
  });

  it("multiple marks are accumulated on document.marks", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "mark" as const, cursor: "main", style: "tw-a", range: { from: 0, to: 5 } },
      { id: "c3", kind: "mark" as const, cursor: "main", style: "tw-b", range: { from: 6, to: 11 } },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.marks).toHaveLength(2);
  });

  it("mark with from >= to leaves document.marks unchanged", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello", by: "char" as const, interval: 1 },
      { id: "c2", kind: "mark" as const, cursor: "main", style: "tw-highlight", range: { from: 3, to: 3 } },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.marks).toHaveLength(0);
  });

  it("selection-based mark resolves to the cursor's active selection range", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "select" as const, cursor: "main", count: -5, by: "char" as const },
      { id: "c3", kind: "mark" as const, cursor: "main", style: "tw-highlight", range: "selection" as const },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.marks).toHaveLength(1);
    expect(state.document.marks[0]).toStrictEqual({ from: 6, to: 11, style: "tw-highlight" });
  });

  it("selection-based mark with no active selection leaves marks unchanged", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello", by: "char" as const, interval: 1 },
      { id: "c2", kind: "mark" as const, cursor: "main", style: "tw-highlight", range: "selection" as const },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.marks).toHaveLength(0);
  });

  it("applyMark with selection-based event but no cursorId returns state unchanged", () => {
    const state = createInitialState();
    const event = { id: "e1", kind: "mark" as const, time: 0, cursorId: undefined as unknown as string, from: -1, to: -1, style: "x", sourceCommandId: "c" };
    const next = applyMark(state, event);

    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// Reducer — delete with marks
// ---------------------------------------------------------------------------

describe("reduce (delete with marks)", () => {
  it("trimming marks when deleting overlapping text", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "mark" as const, cursor: "main", style: "tw-a", range: { from: 0, to: 11 } },
      { id: "c3", kind: "delete" as const, cursor: "main", count: 5, by: "char" as const, interval: 1 },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.text).toBe("Hello ");
    expect(state.document.marks).toHaveLength(1);
  });

  it("delete at start of document (removeStart === removeEnd) clears selection only", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hi", by: "char" as const, interval: 1 },
      { id: "c2", kind: "moveCursor" as const, cursor: "main", index: 0 },
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

// ---------------------------------------------------------------------------
// Reducer — insert with style
// ---------------------------------------------------------------------------

describe("reduce (insert with style)", () => {
  it("insert with style creates a mark on the inserted range", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hi", by: "char" as const, interval: 1, style: "tw-bold" },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.document.text).toBe("Hi");
    expect(state.document.marks.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// State helpers — withSelection / withSelectionCleared / getSelection
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// segmentRichText / resolveStyleRef / mergeStyles
// ---------------------------------------------------------------------------

describe("segmentRichText", () => {
  it("returns empty array for empty document", () => {
    expect(segmentRichText({ text: "", marks: [] })).toEqual([]);
  });

  it("returns single segment with no styles for unmarked text", () => {
    const segments = segmentRichText({ text: "Hello", marks: [] });

    expect(segments).toHaveLength(1);
    expect(segments[0]?.text).toBe("Hello");
    expect(segments[0]?.styles).toHaveLength(0);
  });

  it("splits text at mark boundaries", () => {
    const segments = segmentRichText({ text: "Hello world", marks: [{ from: 0, to: 5, style: "tw-a" }] });

    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(segments[0]?.text).toBe("Hello");
    expect(segments[0]?.styles).toContain("tw-a");
  });

  it("segment outside mark has empty styles", () => {
    const segments = segmentRichText({ text: "Hello world", marks: [{ from: 0, to: 5, style: "tw-a" }] });
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

// ---------------------------------------------------------------------------
// StringRenderer — toAnsiString
// ---------------------------------------------------------------------------

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

  it("returns plain text when marks have no ansi property", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .mark("tw-class", { from: 0, to: 5 });
    await tw.play();

    // mark has no ansi — plain text returned
    expect(renderer.toAnsiString()).toBe("Hello");
  });

  it("applies ANSI codes for marks with ansi property", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .mark({ ansi: { bold: "1" } }, { from: 0, to: 2 });
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
      .mark({ css: { color: "red" } }, { from: 0, to: 2 });
    await tw.play();

    // css mark but no ansi — treated as plain text
    expect(renderer.toAnsiString()).toBe("AB");
  });

  it("returns plain text when ansi object is empty", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("AB", { by: "char", interval: 1 })
      .mark({ ansi: {} }, { from: 0, to: 2 });
    await tw.play();

    // empty ansi map — no codes to emit, treated as plain text
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

// ---------------------------------------------------------------------------
// Timeline builder — select method
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// player.helper — standalone play function
// ---------------------------------------------------------------------------

describe("player.helper — play()", () => {
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

// ---------------------------------------------------------------------------
// Integration — createTypewriter + stringRenderer
// ---------------------------------------------------------------------------

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

    tw.timeline.type("world", { by: "char", interval: 1 }).moveCursor(0).type("Hello ", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
  });

  it("clamps moveCursor index below 0 to 0", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 }).moveCursor(-99).type("!", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("!Hi");
  });

  it("clamps moveCursor index beyond document length to end", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 }).moveCursor(999).type("!", { by: "char", interval: 1 });
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

// ---------------------------------------------------------------------------
// Playback controls — status
// ---------------------------------------------------------------------------

describe("playback controls — status", () => {
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
    // status is IDLE — pause should do nothing
    tw.pause();

    expect(tw.getState().status).toBe(EPlaybackStatus.IDLE);
  });

  it("calling play() while already playing returns immediately (no-op)", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 20 });
    const first = tw.play();
    const second = tw.play(); // already playing — no-op

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

// ---------------------------------------------------------------------------
// Playback controls — rate
// ---------------------------------------------------------------------------

describe("playback controls — rate", () => {
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

// ---------------------------------------------------------------------------
// Playback controls — seek
// ---------------------------------------------------------------------------

describe("playback controls — seek", () => {
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

// ---------------------------------------------------------------------------
// Playback controls — stepForward / stepBackward
// ---------------------------------------------------------------------------

describe("playback controls — stepping", () => {
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
