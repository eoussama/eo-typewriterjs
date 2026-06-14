import type { TDeleteEvent } from "../core/events/delete-event.type";
import type { TInsertEvent } from "../core/events/insert-event.type";
import { describe, expect, it } from "vitest";
import { compile } from "../core/compiler/compile.helper";

import { chunkSteps } from "../core/stepping/chunk-steps.helper";
import { segmentText } from "../core/stepping/segment-text.helper";
import { createTypewriter, stringRenderer } from "../index";



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
    const result = segmentText("Hello world", "word");

    expect(result).toEqual(["Hello ", "world"]);
  });

  it("handles multi-word text with trailing space attachment", () => {
    const result = segmentText("foo bar baz", "word");

    expect(result).toEqual(["foo ", "bar ", "baz"]);
  });

  it("splits text by line and preserves newline on each line except the last", () => {
    const result = segmentText("line1\nline2\nline3", "line");

    expect(result).toEqual(["line1\n", "line2\n", "line3"]);
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
// Compiler — compile
// ---------------------------------------------------------------------------

describe("compile", () => {
  it("compiles a type command into insert events with correct text chunks", () => {
    const events = compile([
      {
        id: "cmd_test_1",
        kind: "type",
        cursor: "main",
        text: "Hello",
        by: { unit: "char", amount: 1 },
        interval: 50,
      },
    ]);

    expect(events).toHaveLength(5);
    expect(events.map(e => (e as TInsertEvent).text)).toEqual(["H", "e", "l", "l", "o"]);
  });

  it("applies correct absolute timestamps for char typing", () => {
    const events = compile([
      {
        id: "cmd_test_2",
        kind: "type",
        cursor: "main",
        text: "Hi",
        by: "char",
        interval: 100,
      },
    ]);

    expect(events[0]?.time).toBe(0);
    expect(events[1]?.time).toBe(100);
  });

  it("compiles word typing and attaches whitespace to preceding word", () => {
    const events = compile([
      {
        id: "cmd_test_3",
        kind: "type",
        cursor: "main",
        text: "Hello world",
        by: "word",
        interval: 150,
      },
    ]);

    expect(events).toHaveLength(2);
    expect((events[0] as TInsertEvent | undefined)?.text).toBe("Hello ");
    expect((events[1] as TInsertEvent | undefined)?.text).toBe("world");
    expect(events[0]?.time).toBe(0);
    expect(events[1]?.time).toBe(150);
  });

  it("compiles amount:2 char typing into correct chunks", () => {
    const events = compile([
      {
        id: "cmd_test_4",
        kind: "type",
        cursor: "main",
        text: "Hello",
        by: { unit: "char", amount: 2 },
        interval: 50,
      },
    ]);

    expect(events).toHaveLength(3);
    expect(events.map(e => (e as TInsertEvent).text)).toEqual(["He", "ll", "o"]);
    expect(events[0]?.time).toBe(0);
    expect(events[1]?.time).toBe(50);
    expect(events[2]?.time).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Compiler — wait command
// ---------------------------------------------------------------------------

describe("compile (wait)", () => {
  it("advances the time cursor by the wait duration between two type commands", () => {
    const events = compile([
      {
        id: "cmd_w1",
        kind: "type",
        cursor: "main",
        text: "Hi",
        by: "char",
        interval: 100,
      },
      {
        id: "cmd_w2",
        kind: "wait",
        duration: 500,
      },
      {
        id: "cmd_w3",
        kind: "type",
        cursor: "main",
        text: "AB",
        by: "char",
        interval: 50,
      },
    ]);

    // "Hi" produces events at t=0 and t=100; end of "Hi" = t=200
    // wait 500 ms → next command starts at t=700
    // "AB" produces events at t=700 and t=750
    const hiEvents = events.filter(e => (e as TInsertEvent).text === "H" || (e as TInsertEvent).text === "i");
    const abEvents = events.filter(e => (e as TInsertEvent).text === "A" || (e as TInsertEvent).text === "B");

    expect(hiEvents).toHaveLength(2);
    expect(abEvents).toHaveLength(2);

    expect(hiEvents[0]?.time).toBe(0);
    expect(hiEvents[1]?.time).toBe(100);

    expect(abEvents[0]?.time).toBe(700);
    expect(abEvents[1]?.time).toBe(750);
  });

  it("emits no events for a standalone wait command", () => {
    const events = compile([
      {
        id: "cmd_w4",
        kind: "wait",
        duration: 1000,
      },
    ]);

    expect(events).toHaveLength(0);
  });

  it("treats a zero-duration wait as a no-op on event timing", () => {
    const events = compile([
      {
        id: "cmd_w5",
        kind: "type",
        cursor: "main",
        text: "AB",
        by: "char",
        interval: 100,
      },
      {
        id: "cmd_w6",
        kind: "wait",
        duration: 0,
      },
      {
        id: "cmd_w7",
        kind: "type",
        cursor: "main",
        text: "CD",
        by: "char",
        interval: 100,
      },
    ]);

    // "AB" ends at t=200; wait(0) → "CD" starts at t=200
    const cdEvents = events.filter(e => (e as TInsertEvent).text === "C" || (e as TInsertEvent).text === "D");

    expect(cdEvents[0]?.time).toBe(200);
    expect(cdEvents[1]?.time).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// Compiler — delete command
// ---------------------------------------------------------------------------

describe("compile (delete)", () => {
  it("compiles a delete command into delete events with correct counts", () => {
    const events = compile([
      {
        id: "cmd_d1",
        kind: "delete",
        cursor: "main",
        count: 3,
        by: "char",
        interval: 50,
      },
    ]);

    expect(events).toHaveLength(3);
    events.forEach(e => expect((e as TDeleteEvent).count).toBe(1));
  });

  it("applies correct absolute timestamps for char deletion", () => {
    const events = compile([
      {
        id: "cmd_d2",
        kind: "delete",
        cursor: "main",
        count: 2,
        by: "char",
        interval: 100,
      },
    ]);

    expect(events[0]?.time).toBe(0);
    expect(events[1]?.time).toBe(100);
  });

  it("compiles amount:2 char deletion into correct step count", () => {
    const events = compile([
      {
        id: "cmd_d3",
        kind: "delete",
        cursor: "main",
        count: 5,
        by: { unit: "char", amount: 2 },
        interval: 50,
      },
    ]);

    // ceil(5 / 2) = 3 events: counts [2, 2, 1]
    expect(events).toHaveLength(3);
    expect((events[0] as TDeleteEvent | undefined)?.count).toBe(2);
    expect((events[1] as TDeleteEvent | undefined)?.count).toBe(2);
    expect((events[2] as TDeleteEvent | undefined)?.count).toBe(1);
  });

  it("emits no events for a count of 0", () => {
    const events = compile([
      {
        id: "cmd_d4",
        kind: "delete",
        cursor: "main",
        count: 0,
      },
    ]);

    expect(events).toHaveLength(0);
  });

  it("advances the time cursor after delete so subsequent commands are scheduled after it", () => {
    const events = compile([
      {
        id: "cmd_d5",
        kind: "delete",
        cursor: "main",
        count: 2,
        by: "char",
        interval: 100,
      },
      {
        id: "cmd_d6",
        kind: "type",
        cursor: "main",
        text: "AB",
        by: "char",
        interval: 50,
      },
    ]);

    // delete: events at t=0, t=100; end = t=200
    // type: events at t=200, t=250
    const typeEvents = events.filter(e => e.kind === "insert");

    expect(typeEvents[0]?.time).toBe(200);
    expect(typeEvents[1]?.time).toBe(250);
  });
});

// ---------------------------------------------------------------------------
// Compiler — moveCursor command
// ---------------------------------------------------------------------------

describe("compile (moveCursor)", () => {
  it("compiles a moveCursor command into a single event", () => {
    const events = compile([
      {
        id: "cmd_mc1",
        kind: "moveCursor",
        cursor: "main",
        index: 3,
      },
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("moveCursor");
  });

  it("places the moveCursor event at the current time without advancing the clock", () => {
    const events = compile([
      {
        id: "cmd_mc2",
        kind: "type",
        cursor: "main",
        text: "Hi",
        by: "char",
        interval: 100,
      },
      {
        id: "cmd_mc3",
        kind: "moveCursor",
        cursor: "main",
        index: 0,
      },
      {
        id: "cmd_mc4",
        kind: "type",
        cursor: "main",
        text: "AB",
        by: "char",
        interval: 50,
      },
    ]);

    // "Hi" ends at t=200; moveCursor at t=200 (no clock advance); "AB" starts at t=200
    const moveEvents = events.filter(e => e.kind === "moveCursor");
    const abEvents = events.filter(e => (e as TInsertEvent).text === "A" || (e as TInsertEvent).text === "B");

    expect(moveEvents).toHaveLength(1);
    expect(moveEvents[0]?.time).toBe(200);
    expect(abEvents[0]?.time).toBe(200);
    expect(abEvents[1]?.time).toBe(250);
  });
});

// ---------------------------------------------------------------------------
// Compiler — select command
// ---------------------------------------------------------------------------

describe("compile (select)", () => {
  it("compiles a select command into a single event", () => {
    const events = compile([
      {
        id: "cmd_sel1",
        kind: "select",
        cursor: "main",
        count: 3,
        by: "char",
      },
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("select");
  });

  it("does not advance the clock", () => {
    const events = compile([
      {
        id: "cmd_sel2",
        kind: "type",
        cursor: "main",
        text: "Hi",
        by: "char",
        interval: 100,
      },
      {
        id: "cmd_sel3",
        kind: "select",
        cursor: "main",
        count: 2,
        by: "char",
      },
      {
        id: "cmd_sel4",
        kind: "type",
        cursor: "main",
        text: "AB",
        by: "char",
        interval: 50,
      },
    ]);

    const selectEvents = events.filter(e => e.kind === "select");
    const abEvents = events.filter(e => (e as TInsertEvent).text === "A" || (e as TInsertEvent).text === "B");

    expect(selectEvents).toHaveLength(1);
    expect(selectEvents[0]?.time).toBe(200);
    expect(abEvents[0]?.time).toBe(200);
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

  it("deletes all characters and resolves to an empty string", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 }).delete(2, { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("");
  });

  it("chains type, wait, and delete correctly", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello world", { by: "char", interval: 1 })
      .wait(10)
      .delete(6, { by: "char", interval: 1 });
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

    tw.timeline
      .type("world", { by: "char", interval: 1 })
      .moveCursor(0)
      .type("Hello ", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
  });

  it("moves cursor to middle and types there, inserting text", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Helloworld", { by: "char", interval: 1 })
      .moveCursor(5)
      .type(" ", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
  });

  it("clamps moveCursor index below 0 to 0", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .moveCursor(-99)
      .type("!", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("!Hi");
  });

  it("clamps moveCursor index beyond document length to end", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .moveCursor(999)
      .type("!", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hi!");
  });

  it("select forward sets selection from/to on state", async () => {
    const { createInitialState } = await import("../core/state/index");
    const { compile } = await import("../core/compiler/compile.helper");
    const { reduce } = await import("../core/reducer/reduce.helper");

    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "moveCursor" as const, cursor: "main", index: 6 },
      { id: "c3", kind: "select" as const, cursor: "main", count: 5, by: "char" as const },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.selection).not.toBeNull();
    expect(state.selection?.from).toBe(6);
    expect(state.selection?.to).toBe(11);
  });

  it("select backward sets selection from/to on state", async () => {
    const { createInitialState } = await import("../core/state/index");
    const { compile } = await import("../core/compiler/compile.helper");
    const { reduce } = await import("../core/reducer/reduce.helper");

    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "select" as const, cursor: "main", count: -5, by: "char" as const },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.selection).not.toBeNull();
    expect(state.selection?.from).toBe(6);
    expect(state.selection?.to).toBe(11);
  });

  it("selection is cleared after a type command", async () => {
    const { createInitialState } = await import("../core/state/index");
    const { compile } = await import("../core/compiler/compile.helper");
    const { reduce } = await import("../core/reducer/reduce.helper");

    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello", by: "char" as const, interval: 1 },
      { id: "c2", kind: "select" as const, cursor: "main", count: 3, by: "char" as const },
      { id: "c3", kind: "type" as const, cursor: "main", text: "X", by: "char" as const, interval: 1 },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.selection).toBeNull();
  });

  it("selection is cleared after a moveCursor command", async () => {
    const { createInitialState } = await import("../core/state/index");
    const { compile } = await import("../core/compiler/compile.helper");
    const { reduce } = await import("../core/reducer/reduce.helper");

    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "Hello", by: "char" as const, interval: 1 },
      { id: "c2", kind: "select" as const, cursor: "main", count: 3, by: "char" as const },
      { id: "c3", kind: "moveCursor" as const, cursor: "main", index: 0 },
    ];

    const events = compile(commands);
    let state = createInitialState();

    for (const event of events) {
      state = reduce(state, event);
    }

    expect(state.selection).toBeNull();
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
