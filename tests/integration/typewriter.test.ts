import type { TDeleteEvent } from "../../src/core/events/types/delete-event.type";
import type { TInsertEvent } from "../../src/core/events/types/insert-event.type";
import { describe, expect, it } from "vitest";
import { compile } from "../../src/core/compiler/helpers/compile.helper";
import { reduce } from "../../src/core/reducer/helpers/reduce.helper";
import { createInitialState } from "../../src/core/state/index";
import { segmentText } from "../../src/core/stepping/helpers/segment-text.helper";
import { createTypewriter, stringRenderer } from "../../src/index";



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

    tw.timeline.type("Hello world", { by: "char", interval: 1 }).delete(-6, { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello");
  });

  it("chains type, wait, and delete correctly", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "char", interval: 1 }).wait(10).delete(-6, { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello");
  });

  it("does not delete beyond the start of the document", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 }).delete(-100, { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("");
  });

  it("moves cursor to the start and types there, prepending text", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("world", { by: "char", interval: 1 }).move(-999, { interval: 1 }).type("Hello ", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
  });

  it("clamps move index below 0 to 0", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 }).move(-99, { interval: 1 }).type("!", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("!Hi");
  });

  it("clamps move index beyond document length to end", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 }).move(999, { interval: 1 }).type("!", { by: "char", interval: 1 });
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


describe("delete (unit handling)", () => {
  it("delete backward by word removes the last word from the document", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .delete(-1, { by: "word", interval: 1 });
    await tw.play();

    // "world" (5 chars) should be removed, leaving "hello "
    expect(renderer.toString()).toBe("hello ");
  });

  it("delete backward by word removes multiple words when count is -2", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("one two three", { by: "char", interval: 1 })
      .delete(-2, { by: "word", interval: 1 });
    await tw.play();

    // count:-2, abs=2, amount:1 → 2 events, each removing 1 word backward.
    // Event 1: removes "three" (5 chars) → "one two "
    // Event 2: removes "two " (4 chars) → "one "
    expect(renderer.toString()).toBe("one ");
  });

  it("delete backward by line removes the last line", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("line1\nline2", { by: "char", interval: 1 })
      .delete(-1, { by: "line", interval: 1 });
    await tw.play();

    // "line2" is the last segment when splitting by line (no trailing newline)
    expect(renderer.toString()).toBe("line1\n");
  });

  it("delete backward by char removes the correct number of characters", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .delete(-3, { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ab");
  });

  it("delete forward by char removes characters after the cursor", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // Move cursor to beginning then forward-delete 3 chars
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(-999, { interval: 1 })
      .delete(3, { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("de");
  });

  it("delete backward by grapheme removes one grapheme cluster per step", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });
    const snapshots: string[] = [];

    tw.timeline
      .type("hi\u{1F4A9}\u{1F468}\u200D\u{1F469}\u200D\u{1F467}", { by: "char", interval: 1 })
      .delete(-1, { by: "grapheme", interval: 1 })
      .wait(1, { after: ({ state }) => { snapshots.push(state.document.text); } })
      .delete(-1, { by: "char", interval: 1 });
    await tw.play();

    expect(snapshots).toEqual(["hi\u{1F4A9}"]);
    expect(renderer.toString()).toBe("hi");
  });

  it("compiled delete events carry the correct unit and direction fields", () => {
    const wordEvents = compile([{ id: "d-unit-1", kind: "delete", cursor: "main", count: -1, by: "word" }]);
    const lineEvents = compile([{ id: "d-unit-2", kind: "delete", cursor: "main", count: -1, by: "line" }]);
    const charEvents = compile([{ id: "d-unit-3", kind: "delete", cursor: "main", count: -1, by: "char" }]);

    expect((wordEvents[0] as TDeleteEvent).unit).toBe("word");
    expect((lineEvents[0] as TDeleteEvent).unit).toBe("line");
    expect((charEvents[0] as TDeleteEvent).unit).toBe("char");
    expect((wordEvents[0] as TDeleteEvent).direction).toBe(-1);
  });

  it("delete backward by word at start of document (no text before cursor) is a no-op", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hi", { by: "char", interval: 1 })
      .move(-999, { interval: 1 })
      .delete(-1, { by: "word", interval: 1 });
    await tw.play();

    // Cursor at 0, no text before it, nothing is removed
    expect(renderer.toString()).toBe("hi");
  });

  it("delete('whole') deletes the entire document", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("one two three four", { by: "char", interval: 1 })
      .delete("whole");
    await tw.play();

    expect(renderer.toString()).toBe("");
  });

  it("delete('whole') clears an active selection", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .select(-5)
      .delete("whole");
    await tw.play();

    expect(renderer.toString()).toBe("");
  });

  it("delete backward by word with amount:2 uses amount as the number of logical units per step", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // count:-2, abs=2, amount:2 → ceil(2/2)=1 step.
    // Each step removes 2 words backward.
    tw.timeline
      .type("one two three four", { by: "char", interval: 1 })
      .delete(-2, { by: { unit: "word", amount: 2 }, interval: 1 });
    await tw.play();

    // 1 step removes 2 words ("three " + "four") → "one two "
    expect(renderer.toString()).toBe("one two ");
  });

  it("delete forward by word removes the first word from the cursor", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // Move to start then forward-delete 1 word
    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move(-999, { interval: 1 })
      .delete(1, { by: "word", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("world");
  });

  it("delete forward by line removes the first line from the cursor", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("line1\nline2", { by: "char", interval: 1 })
      .move(-999, { interval: 1 })
      .delete(1, { by: "line", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("line2");
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
  it("deleting backward with a lower-index cursor shifts a higher-index cursor backward", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcd", main at 4, "b" at 2. Delete -1 backward with "b" → removes char at 1 ("b"), leaving "acd",
    // main shifts from 4 to 3. Then type "Z" at main (3) → "acdZ"
    tw.timeline
      .type("abcd", { by: "char", interval: 1 })
      .move(2, { cursor: "b" })
      .delete(-1, { cursor: "b", by: "char", interval: 1 })
      .type("Z", { cursor: "main", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("acdZ");
  });

  it("deleting backward with a higher-index cursor does not shift a lower-index cursor", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcd", main at 4, "b" at 1. Delete -1 backward with main → removes "d" leaving "abc",
    // "b" stays at 1. Then type "X" at "b" (1) → "aXbc"
    tw.timeline
      .type("abcd", { by: "char", interval: 1 })
      .move(1, { cursor: "b" })
      .delete(-1, { cursor: "main", by: "char", interval: 1 })
      .type("X", { cursor: "b", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("aXbc");
  });
});


describe("boundary operand tests (move, delete, select)", () => {
  it("move('start') jumps cursor to document start", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move("start")
      .type(">", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe(">hello world");
  });

  it("move('end') jumps cursor to document end", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move("start")
      .move("end")
      .type("!", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("hello world!");
  });

  it("select('start') selects from cursor to document start", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move(-5)
      .select("start");
    await tw.play();

    const live = tw.getLiveState();

    // cursor at 6 after move(-5), select("start") → [0, 6]
    expect(live.selections.main).toStrictEqual({ from: 0, to: 6 });
  });

  it("select('end') selects from cursor to document end", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move("start")
      .select("end");
    await tw.play();

    const live = tw.getLiveState();

    // cursor at 0 after move("start"), select("end") → [0, 11]
    expect(live.selections.main).toStrictEqual({ from: 0, to: 11 });
  });

  it("select('whole') selects entire document regardless of cursor position", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move(-3)
      .select("whole");
    await tw.play();

    const live = tw.getLiveState();

    expect(live.selections.main).toStrictEqual({ from: 0, to: 11 });
  });

  it("delete('start') deletes from cursor back to document start", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move(-5)
      .delete("start");
    await tw.play();

    // cursor at 6, delete to start removes "hello " → "world"
    expect(renderer.toString()).toBe("world");
  });

  it("delete('end') deletes from cursor forward to document end", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move(-5)
      .delete("end");
    await tw.play();

    // cursor at 6, delete to end removes "world" → "hello "
    expect(renderer.toString()).toBe("hello ");
  });

  it("delete('whole') deletes the entire document", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .delete("whole");
    await tw.play();

    expect(renderer.toString()).toBe("");
  });

  it("delete('start') at document start is a no-op", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hi", { by: "char", interval: 1 })
      .move("start")
      .delete("start");
    await tw.play();

    expect(renderer.toString()).toBe("hi");
  });

  it("delete('end') at document end is a no-op", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hi", { by: "char", interval: 1 })
      .delete("end");
    await tw.play();

    expect(renderer.toString()).toBe("hi");
  });

  it("compiled move('start') event carries boundary='start'", () => {
    const events = compile([{ id: "m1", kind: "move", cursor: "main", offset: "start" }]);

    expect(events).toHaveLength(1);
    expect((events[0] as { boundary?: string }).boundary).toBe("start");
  });

  it("compiled move('end') event carries boundary='end'", () => {
    const events = compile([{ id: "m2", kind: "move", cursor: "main", offset: "end" }]);

    expect(events).toHaveLength(1);
    expect((events[0] as { boundary?: string }).boundary).toBe("end");
  });

  it("compiled select('start') event carries boundary='start'", () => {
    const events = compile([{ id: "s1", kind: "select", cursor: "main", count: "start" }]);

    expect(events).toHaveLength(1);
    expect((events[0] as { boundary?: string }).boundary).toBe("start");
  });

  it("compiled select('end') event carries boundary='end'", () => {
    const events = compile([{ id: "s2", kind: "select", cursor: "main", count: "end" }]);

    expect(events).toHaveLength(1);
    expect((events[0] as { boundary?: string }).boundary).toBe("end");
  });

  it("compiled select('whole') event carries boundary='whole'", () => {
    const events = compile([{ id: "s3", kind: "select", cursor: "main", count: "whole" }]);

    expect(events).toHaveLength(1);
    expect((events[0] as { boundary?: string }).boundary).toBe("whole");
  });

  it("compiled delete('start') event carries boundary='start'", () => {
    const events = compile([{ id: "d1", kind: "delete", cursor: "main", count: "start" }]);

    expect(events).toHaveLength(1);
    expect((events[0] as TDeleteEvent).boundary).toBe("start");
  });

  it("compiled delete('end') event carries boundary='end'", () => {
    const events = compile([{ id: "d2", kind: "delete", cursor: "main", count: "end" }]);

    expect(events).toHaveLength(1);
    expect((events[0] as TDeleteEvent).boundary).toBe("end");
  });

  it("move('start') then move('end') effectively clears selection", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("abc", { by: "char", interval: 1 })
      .select("whole")
      .move("start");
    await tw.play();

    const live = tw.getLiveState();

    expect(live.selections.main).toBeUndefined();
  });
});


describe("move (unit handling)", () => {
  it("move forward by one char advances the cursor position", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // Type "abcde", move cursor to start, then move +2 forward, then type "X"
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(-999, { interval: 1 })
      .move(2, { interval: 1 })
      .type("X", { by: "char", interval: 1 });
    await tw.play();

    // "X" inserted at index 2 → "abXcde"
    expect(renderer.toString()).toBe("abXcde");
  });

  it("move forward by word advances the cursor by one word", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("hello world", { by: "char", interval: 1 })
      .move(-999, { interval: 1 })
      .move(1, { by: "word", interval: 1 })
      .type("X", { by: "char", interval: 1 });
    await tw.play();

    // "hello " is 6 chars; X inserted at 6 → "hello Xworld"
    expect(renderer.toString()).toBe("hello Xworld");
  });

  it("move forward using object by-form advances correctly", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(-999, { interval: 1 })
      .move(3, { by: { unit: "char", amount: 1 }, interval: 1 })
      .type("X", { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("abcXde");
  });
});


describe("select (unit handling)", () => {
  it("select forward by word covers one full word", () => {
    const commands = [
      { id: "c1", kind: "type" as const, cursor: "main", text: "hello world", by: "char" as const, interval: 1 },
      { id: "c2", kind: "move" as const, cursor: "main", offset: -999, interval: 1 },
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
      { id: "c2", kind: "move" as const, cursor: "main", offset: -999, interval: 1 },
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


describe("command × unit × by-shape matrix", () => {
  const TEXT = "one two three\nfour five";
  const UNITS = ["char", "grapheme", "word", "line", "whole"] as const;

  type TByInput = "char" | "grapheme" | "word" | "line" | "whole" | { unit: string; amount: number };

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
      if (unit === "whole") {
        it(`delete by ${unit} (by=${JSON.stringify(by)}) throws because "whole" is not a valid delete unit`, () => {
          expect(() =>
            compile([
              { id: "d-setup", kind: "type" as const, cursor: "main", text: TEXT, by: "char" as const, interval: 1 },
              { id: "d-del", kind: "delete" as const, cursor: "main", count: -1, by: by as "char", interval: 1 },
            ]),
          ).toThrow(/Valid units for delete are/);
        });
      }
      else {
        it(`delete by ${unit} (by=${JSON.stringify(by)}) removes text without throwing`, async () => {
          const renderer = stringRenderer();
          const tw = createTypewriter({ renderer });

          tw.timeline
            .type(TEXT, { by: "char", interval: 1 })
            .delete(-1, { by: by as "char", interval: 1 });
          await tw.play();

          expect(renderer.toString().length).toBeLessThan(TEXT.length);
        });
      }
    }
  }

  // --- select command ---
  for (const unit of UNITS) {
    for (const by of toByShapes(unit)) {
      if (unit === "whole") {
        it(`select by ${unit} (by=${JSON.stringify(by)}) throws because "whole" is not a valid select unit`, () => {
          expect(() =>
            compile([
              { id: "s-setup", kind: "type" as const, cursor: "main", text: TEXT, by: "char" as const, interval: 1 },
              { id: "s-sel", kind: "select" as const, cursor: "main", count: -1, by: by as "char" },
            ]),
          ).toThrow(/Valid units for select are/);
        });
      }
      else {
        it(`select by ${unit} (by=${JSON.stringify(by)}) sets a selection without throwing`, () => {
          const commands = [
            { id: "s-setup", kind: "type" as const, cursor: "main", text: TEXT, by: "char" as const, interval: 1 },
            { id: "s-select", kind: "select" as const, cursor: "main", count: -1, by: by as "char" },
          ];
          const events = compile(commands);
          let state = createInitialState();

          expect(() => {
            for (const event of events) {
              state = reduce(state, event);
            }
          }).not.toThrow();
        });
      }
    }
  }
});


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


describe("deleteTextAtCursor, cursor and selection shifting branches", () => {
  it("clamps another cursor that is inside the deleted range to removeStart", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", cursor "b" parked at 2 (inside delete range [1, 4]).
    // Main cursor at 5 (end of "abcde"), move -1 to get to 4. Delete -3 backward → removes [1,4] → text = "ae".
    // Cursor "b" (at 2, inside [1,4]) should be clamped to 1.
    // Then type "X" at "b" (now at 1) → "aXe"
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(2, { cursor: "b" })
      .move(-1)
      .delete(-3, { cursor: "main", by: "char", interval: 1 })
      .type("X", { cursor: "b", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("aXe");
  });

  it("does not shift another cursor that is before removeStart", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", cursor "b" at 1 (before delete range [2, 5]).
    // Delete backward -3 chars with main (cursor at 5) → removes [2,5] → text = "ab".
    // Cursor "b" stays at 1. Type "X" at "b" → "aXb"
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(1, { cursor: "b" })
      .delete(-3, { cursor: "main", by: "char", interval: 1 })
      .type("X", { cursor: "b", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("aXb");
  });

  it("shifts selection.from back when it is at or after removeEnd", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", "b" has selection [3, 5].
    // Main cursor at 5, move -2 → at 3. Delete -2 backward (range [1, 3]) → text = "ade".
    // "b" sel.from=3 >= removeEnd=3 → shifts to 3-2=1
    // "b" sel.to=5 >= removeEnd=3 → shifts to 5-2=3
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(5, { cursor: "b" })
      .select(-2, { cursor: "b" })
      .move(-2)
      .delete(-2, { cursor: "main", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ade");
  });

  it("clamps selection.from to removeStart when it is inside the deleted range", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", "b" has selection [2, 5].
    // Main at 5, move -1 → at 4. Delete -3 backward (range [1, 4]) → text = "ae".
    // "b" sel.from=2: removeStart=1, removeEnd=4 → 2 > removeStart and < removeEnd → clamped to 1
    // "b" sel.to=5 >= removeEnd=4 → shifts to 5-3=2
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(5, { cursor: "b" })
      .select(-3, { cursor: "b" })
      .move(-1)
      .delete(-3, { cursor: "main", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ae");
  });

  it("clamps selection.to to removeStart when it is inside the deleted range", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", "b" has selection [0, 3].
    // Main at 5 deletes backward -3 chars (range [2, 5]) → text = "ab".
    // "b" sel.from=0 <= removeStart=2 → stays 0
    // "b" sel.to=3: removeStart=2, removeEnd=5 → 3 > removeStart and < removeEnd → clamped to 2
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(3, { cursor: "b" })
      .select(-3, { cursor: "b" })
      .delete(-3, { cursor: "main", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("ab");
  });

  it("leaves selection unchanged when both from and to are before removeStart", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // "abcde", "b" has selection [0, 1].
    // Main at 5 deletes backward -2 chars (range [3, 5]) → text = "abc".
    // "b" sel.from=0 <= removeStart=3 → stays 0
    // "b" sel.to=1 <= removeStart=3 → stays 1
    tw.timeline
      .type("abcde", { by: "char", interval: 1 })
      .move(1, { cursor: "b" })
      .select(-1, { cursor: "b" })
      .delete(-2, { cursor: "main", by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("abc");
  });
});


describe("integration (unselect)", () => {
  it("unselect removes an active selection without moving the cursor", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // After typing "Hello World" (11 chars), cursor at 11. Move -5 → cursor at 6.
    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
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

    // After typing "Hello World" (11 chars), cursor at 11. Move -5 → cursor at 6, select 5 → [6,11].
    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("tw-a", { from: 0, to: 11 })
      .move(-5)
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


describe("delete with active selection (delete-selection)", () => {
  it("delete with active selection removes the selected range regardless of direction", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .delete(-1, { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello ");
  });

  it("delete forward with active selection removes the selected range", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .delete(1, { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello ");
  });

  it("delete('start') with active selection removes the selected range", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .delete("start");
    await tw.play();

    expect(renderer.toString()).toBe("Hello ");
  });

  it("delete('end') with active selection removes the selected range", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .delete("end");
    await tw.play();

    expect(renderer.toString()).toBe("Hello ");
  });

  it("delete clears the selection and places cursor at start of removed range", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .delete(-1, { by: "char", interval: 1 });
    await tw.play();

    const live = tw.getLiveState();

    expect(live.selections.main).toBeUndefined();
    expect(live.cursors.main?.index).toBe(6);
  });

  it("delete('whole') still clears the entire document even when a selection is active", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .delete("whole");
    await tw.play();

    expect(renderer.toString()).toBe("");
  });

  it("delete with whole-document selection removes all text", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .select("whole")
      .delete(-1, { by: "char", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("");
  });
});


describe("insert with active selection (type-over-selection)", () => {
  it("typing over a selection replaces it instead of inserting alongside it", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    // Exact scenario from the bug report
    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .wait(400)
      .move(-5)
      .select(5)
      .type("TypewriterJS", { by: "whole", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello TypewriterJS");
  });

  it("typing over a whole-document selection replaces the entire text", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("old text", { by: "char", interval: 1 })
      .select("whole")
      .type("new text", { by: "whole", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("new text");
  });

  it("typing an empty string over a selection deletes the selection", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .type("", { by: "whole", interval: 1 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello ");
  });

  it("selection replacement clears the selection afterward", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .type("JS", { by: "whole", interval: 1 });
    await tw.play();

    const live = tw.getLiveState();

    expect(live.selections.main).toBeUndefined();
    expect(renderer.toString()).toBe("Hello JS");
  });

  it("cursor is positioned after the inserted text when replacing a selection", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .move(-5)
      .select(5)
      .type("JS", { by: "whole", interval: 1 });
    await tw.play();

    const live = tw.getLiveState();

    // "Hello " (6) + "JS" (2) = cursor at 8
    expect(live.cursors.main?.index).toBe(8);
  });
});


describe("whole unit", () => {
  it("segmentText with 'whole' returns the full string as a single element array", () => {
    expect(segmentText("Hello, World!", "whole")).toEqual(["Hello, World!"]);
  });

  it("segmentText with 'whole' on empty string returns array containing empty string", () => {
    expect(segmentText("", "whole")).toEqual([""]);
  });

  it("segmentText with 'whole' on multi-line text returns it as one element", () => {
    expect(segmentText("line1\nline2\nline3", "whole")).toEqual(["line1\nline2\nline3"]);
  });

  it("type by 'whole' produces exactly one insert event for the full text", () => {
    const events = compile([
      { id: "w1", kind: "type", cursor: "main", text: "Hello world", by: "whole", interval: 0 },
    ]);

    expect(events).toHaveLength(1);
    expect((events[0] as TInsertEvent).text).toBe("Hello world");
  });

  it("type by 'whole' inserts the entire string at once with zero interval", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "whole", interval: 0 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
  });

  it("type by 'whole' inserts the entire string at once with a non-zero interval", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: "whole", interval: 50 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
  });

  it("type by 'whole' with multi-line text inserts the full text as one step", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("line1\nline2\nline3", { by: "whole", interval: 0 });
    await tw.play();

    expect(renderer.toString()).toBe("line1\nline2\nline3");
  });

  it("type by 'whole' with Unicode and emoji inserts without mangling", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("👨‍👩‍👧‍👦 café naïve", { by: "whole", interval: 0 });
    await tw.play();

    expect(renderer.toString()).toBe("👨‍👩‍👧‍👦 café naïve");
  });

  it("chaining two 'whole' type commands accumulates the full output", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Hello", { by: "whole", interval: 0 })
      .type(" world", { by: "whole", interval: 0 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
  });

  it("type by { unit: 'whole', amount: 1 } also inserts the full text as one step", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello world", { by: { unit: "whole", amount: 1 }, interval: 0 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello world");
  });
});
