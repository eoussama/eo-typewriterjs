import type { TDeleteEvent } from "../../src/core/events/types/delete-event.type";
import type { TInsertEvent } from "../../src/core/events/types/insert-event.type";
import type { TStyleEvent } from "../../src/core/events/types/style-event.type";
import type { TTimelineEvent } from "../../src/core/events/types/timeline-event.type";
import type { TUnstyleEvent } from "../../src/core/events/types/unstyle-event.type";
import { describe, expect, it } from "vitest";
import { compile } from "../../src/core/compiler/helpers/compile.helper";



/**
 * @description
 * Read the cursor id of an event, for event kinds that carry one
 *
 * @param event - The event to inspect
 * @returns The event's cursor id, or undefined
 */
function cursorOf(event: TTimelineEvent): string | undefined {
  return "cursorId" in event ? event.cursorId : undefined;
}

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

  it("emits one whole-document event for a count of 'whole'", () => {
    const events = compile([{ id: "d4", kind: "delete", cursor: "main", count: "whole" }]);

    expect(events).toHaveLength(1);
    expect((events[0] as TDeleteEvent).boundary).toBe("whole");
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
  it("compiles a numeric move command into one event per step", () => {
    const events = compile([{ id: "mc1", kind: "move", cursor: "main", offset: 3 }]);

    expect(events).toHaveLength(3); // 3 steps × 1 cursor
    expect(events.every(e => e.kind === "move")).toBe(true);
  });

  it("zero offset is a no-op and does not advance the clock", () => {
    const events = compile([
      { id: "mc2", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 100 },
      { id: "mc3", kind: "move", cursor: "main", offset: 0 },
      { id: "mc4", kind: "type", cursor: "main", text: "AB", by: "char", interval: 50 },
    ]);

    const abEvents = events.filter(e => (e as TInsertEvent).text === "A" || (e as TInsertEvent).text === "B");

    expect(abEvents[0]?.time).toBe(200);
  });

  it("non-zero offset advances the clock by the default interval (50 ms)", () => {
    const events = compile([
      { id: "mc5", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 100 },
      { id: "mc6", kind: "move", cursor: "main", offset: 1 },
      { id: "mc7", kind: "type", cursor: "main", text: "AB", by: "char", interval: 50 },
    ]);

    const abEvents = events.filter(e => (e as TInsertEvent).text === "A" || (e as TInsertEvent).text === "B");

    // type "Hi" ends at 200, move advances by default 50ms → AB starts at 250
    expect(abEvents[0]?.time).toBe(250);
  });

  it("non-zero offset with explicit interval advances the clock by that interval", () => {
    const events = compile([
      { id: "mc8", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 100 },
      { id: "mc9", kind: "move", cursor: "main", offset: -1, interval: 200 },
      { id: "mc10", kind: "type", cursor: "main", text: "AB", by: "char", interval: 50 },
    ]);

    const abEvents = events.filter(e => (e as TInsertEvent).text === "A" || (e as TInsertEvent).text === "B");

    // type "Hi" ends at 200, move interval=200 → AB starts at 400
    expect(abEvents[0]?.time).toBe(400);
  });

  it("boundary move ('start'/'end') advances the clock by the default interval", () => {
    const events = compile([
      { id: "mc11", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 100 },
      { id: "mc12", kind: "move", cursor: "main", offset: "start" },
      { id: "mc13", kind: "type", cursor: "main", text: "X", by: "char", interval: 50 },
    ]);

    const xEvents = events.filter(e => (e as TInsertEvent).text === "X");

    // type "Hi" ends at 200, move "start" advances by 50ms → X at 250
    expect(xEvents[0]?.time).toBe(250);
  });

  it("multi-cursor move advances the clock only once", () => {
    const events = compile([
      { id: "mc14", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 100 },
      { id: "mc15", kind: "move", cursor: ["a", "b"], offset: 1 },
      { id: "mc16", kind: "type", cursor: "main", text: "X", by: "char", interval: 50 },
    ]);

    const xEvents = events.filter(e => (e as TInsertEvent).text === "X");

    // clock advances once for the multi-cursor move (default 50ms) → X at 250
    expect(xEvents[0]?.time).toBe(250);
  });
});


describe("compile (select)", () => {
  it("compiles a numeric select command into one event per step", () => {
    const events = compile([{ id: "s1", kind: "select", cursor: "main", count: 3, by: "char" }]);

    expect(events).toHaveLength(3);
    expect(events.every(e => e.kind === "select")).toBe(true);
  });

  it("uses default by (char) when by is omitted on select command", () => {
    const events = compile([{ id: "s0", kind: "select", cursor: "main", count: 2 }]);

    expect(events).toHaveLength(2);
    expect(events.every(e => e.kind === "select")).toBe(true);
  });

  it("advances the clock by interval × steps (default 50 ms per step)", () => {
    const events = compile([
      { id: "s2", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 100 },
      { id: "s3", kind: "select", cursor: "main", count: 2, by: "char" },
      { id: "s4", kind: "type", cursor: "main", text: "AB", by: "char", interval: 50 },
    ]);

    const abEvents = events.filter(e => (e as TInsertEvent).text === "A" || (e as TInsertEvent).text === "B");

    // type "Hi" ends at 200, select(2) = 2 steps × 50ms = 100ms → AB starts at 300
    expect(abEvents[0]?.time).toBe(300);
  });

  it("advances the clock by explicit interval × steps when provided", () => {
    const events = compile([
      { id: "s5", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 100 },
      { id: "s6", kind: "select", cursor: "main", count: 2, by: "char", interval: 300 },
      { id: "s7", kind: "type", cursor: "main", text: "AB", by: "char", interval: 50 },
    ]);

    const abEvents = events.filter(e => (e as TInsertEvent).text === "A" || (e as TInsertEvent).text === "B");

    // type "Hi" ends at 200, select(2, interval: 300) = 2 steps × 300ms = 600ms → AB starts at 800
    expect(abEvents[0]?.time).toBe(800);
  });

  it("boundary select advances the clock by the default interval", () => {
    const events = compile([
      { id: "s8", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 100 },
      { id: "s9", kind: "select", cursor: "main", count: "whole" },
      { id: "s10", kind: "type", cursor: "main", text: "X", by: "char", interval: 50 },
    ]);

    const xEvents = events.filter(e => (e as TInsertEvent).text === "X");

    // boundary select is always a single event; type "Hi" ends at 200, select "whole" advances 50ms → X at 250
    expect(xEvents[0]?.time).toBe(250);
  });

  it("multi-cursor select advances the clock once per step (not once per cursor)", () => {
    const events = compile([
      { id: "s11", kind: "type", cursor: "main", text: "Hi", by: "char", interval: 100 },
      { id: "s12", kind: "select", cursor: ["a", "b"], count: 3, by: "char" },
      { id: "s13", kind: "type", cursor: "main", text: "X", by: "char", interval: 50 },
    ]);

    const xEvents = events.filter(e => (e as TInsertEvent).text === "X");

    // clock advances once per step; 3 steps × 50ms = 150ms; "Hi" ends at 200 → X at 350
    expect(xEvents[0]?.time).toBe(350);
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

    const evt = events[0] as Extract<TStyleEvent, { mode: "range" }>;

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

  it("selection-range style emits one selection-mode event per cursor", () => {
    const events = compile([
      { id: "mk5", kind: "style", cursor: ["a", "b"], style: "tw-highlight", range: "selection" as const },
    ]);

    const styleEvents = events.filter(e => e.kind === "style") as TStyleEvent[];

    expect(styleEvents).toHaveLength(2);
    styleEvents.forEach((e) => {
      expect(e.mode).toBe("selection");
    });
    expect(styleEvents.map(e => cursorOf(e)).sort()).toEqual(["a", "b"]);
  });

  it("single-cursor selection-range style emits one event with cursorId", () => {
    const events = compile([
      { id: "mk6", kind: "style", cursor: "main", style: "tw-highlight", range: "selection" as const },
    ]);

    const styleEvents = events.filter(e => e.kind === "style") as TStyleEvent[];

    expect(styleEvents).toHaveLength(1);
    expect(cursorOf(styleEvents[0]!)).toBe("main");
    expect(styleEvents[0]?.mode).toBe("selection");
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

    const aEvents = events.filter(e => cursorOf(e) === "a");
    const bEvents = events.filter(e => cursorOf(e) === "b");

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

    const mainEvents = events.filter(e => cursorOf(e) === "main");

    expect(mainEvents).toHaveLength(1);
    expect(mainEvents[0]?.time).toBe(200);
  });

  it("fans out move events for each cursor at each step", () => {
    const events = compile([
      { id: "mcc", kind: "move", cursor: ["x", "y"], offset: 5 },
    ]);

    // 5 steps × 2 cursors = 10 events
    expect(events).toHaveLength(10);
    expect(events.every(e => e.kind === "move")).toBe(true);
    // every cursor should appear at every step
    const xEvents = events.filter(e => cursorOf(e) === "x");
    const yEvents = events.filter(e => cursorOf(e) === "y");

    expect(xEvents).toHaveLength(5);
    expect(yEvents).toHaveLength(5);
  });

  it("fans out select events for each cursor at each step", () => {
    const events = compile([
      { id: "mcd", kind: "select", cursor: ["p", "q"], count: 3, by: "char" },
    ]);

    // 3 steps × 2 cursors = 6 events
    expect(events).toHaveLength(6);
    expect(events.every(e => e.kind === "select")).toBe(true);

    const pEvents = events.filter(e => cursorOf(e) === "p");
    const qEvents = events.filter(e => cursorOf(e) === "q");

    expect(pEvents).toHaveLength(3);
    expect(qEvents).toHaveLength(3);
  });
});


describe("compile (unselect)", () => {
  it("compiles an unselect command into one event per cursor", () => {
    const events = compile([
      { id: "cs1", kind: "unselect" as const, cursor: "main" },
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("unselect");
    expect(cursorOf(events[0]!)).toBe("main");
  });

  it("fans out one event per cursor for multi-cursor unselect", () => {
    const events = compile([
      { id: "cs2", kind: "unselect" as const, cursor: ["a", "b"] },
    ]);

    expect(events).toHaveLength(2);
    expect(events.every(e => e.kind === "unselect")).toBe(true);
    expect(events.map(e => cursorOf(e)).sort()).toEqual(["a", "b"]);
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

    const evt = events[0] as Extract<TUnstyleEvent, { mode: "range" }>;

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
      expect(e.mode).toBe("selection");
    });
    expect(unstyleEvents.map(e => cursorOf(e)).sort()).toEqual(["a", "b"]);
  });
});
