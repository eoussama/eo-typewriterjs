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
    expect(events.map(e => e.text)).toEqual(["H", "e", "l", "l", "o"]);
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
    expect(events[0]?.text).toBe("Hello ");
    expect(events[1]?.text).toBe("world");
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
    expect(events.map(e => e.text)).toEqual(["He", "ll", "o"]);
    expect(events[0]?.time).toBe(0);
    expect(events[1]?.time).toBe(50);
    expect(events[2]?.time).toBe(100);
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
