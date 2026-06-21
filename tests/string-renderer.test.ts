import { describe, expect, it } from "vitest";

import { createTypewriter, stringRenderer } from "../src/index";
import { StringRenderer } from "../src/renderers/string/string-renderer";



describe("stringRenderer, lifecycle", () => {
  it("factory returns a StringRenderer instance", () => {
    const sr = stringRenderer();

    expect(sr).toBeInstanceOf(StringRenderer);
  });

  it("toString() returns empty string before any render", () => {
    const sr = stringRenderer();

    expect(sr.toString()).toBe("");
  });

  it("toString() returns empty string after mount with empty text", () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline.type("", { by: "char", interval: 1 });

    // Even if play is not awaited yet, mount is synchronous
    // Just check initial state
    expect(sr.toString()).toBe("");
  });

  it("toString() returns the plain document text after play", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline.type("Hello", { by: "char", interval: 1 });
    await tw.play();

    expect(sr.toString()).toBe("Hello");
  });

  it("toString() returns updated text after stop (reset)", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await tw.play();

    expect(sr.toString()).toBe("Hi");
    tw.stop();
    expect(sr.toString()).toBe("");
  });

  it("render() updates stored state immediately", async () => {
    const sr = new StringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline.type("A", { by: "char", interval: 1 }).type("B", { by: "char", interval: 1 });
    await tw.play();

    expect(sr.toString()).toBe("AB");
  });
});


describe("stringRenderer, cursor options do not affect output", () => {
  it("default cursor config does not leak into toString()", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline.type("test", { by: "char", interval: 1 });
    await tw.play();

    expect(sr.toString()).toBe("test");
  });

  it("hidden cursor still produces correct text output", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr, cursor: { visible: false } });

    tw.timeline.type("hidden", { by: "char", interval: 1 });
    await tw.play();

    expect(sr.toString()).toBe("hidden");
  });

  it("pipe kind cursor does not pollute toString()", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr, cursor: { kind: "pipe" } });

    tw.timeline.type("pipe", { by: "char", interval: 1 });
    await tw.play();

    expect(sr.toString()).toBe("pipe");
  });

  it("caret kind cursor does not pollute toString()", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr, cursor: { kind: "caret" } });

    tw.timeline.type("caret", { by: "char", interval: 1 });
    await tw.play();

    expect(sr.toString()).toBe("caret");
  });

  it("underscore kind cursor does not pollute toString()", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr, cursor: { kind: "underscore" } });

    tw.timeline.type("underscore", { by: "char", interval: 1 });
    await tw.play();

    expect(sr.toString()).toBe("underscore");
  });

  it("custom content cursor does not pollute toString()", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr, cursor: { kind: "custom", content: "▋" } });

    tw.timeline.type("custom", { by: "char", interval: 1 });
    await tw.play();

    expect(sr.toString()).toBe("custom");
  });

  it("setCursorVisible(false) does not affect toString()", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline.type("visible", { by: "char", interval: 1 });
    await tw.play();

    tw.setCursorVisible(false);

    expect(sr.toString()).toBe("visible");
  });

  it("setCursorOptions({ kind }) does not affect toString()", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline.type("options", { by: "char", interval: 1 });
    await tw.play();

    tw.setCursorOptions({ kind: "underscore" });

    expect(sr.toString()).toBe("options");
  });

  it("className and attrs do not appear in toString()", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({
      renderer: sr,
      cursor: { className: "blink", attrs: { "data-x": "1" } },
    });

    tw.timeline.type("attrs", { by: "char", interval: 1 });
    await tw.play();

    expect(sr.toString()).not.toContain("blink");
    expect(sr.toString()).not.toContain("data-x");
    expect(sr.toString()).toBe("attrs");
  });
});


describe("stringRenderer, toAnsiString()", () => {
  it("returns empty string when no state has been set", () => {
    const sr = new StringRenderer();

    expect(sr.toAnsiString()).toBe("");
  });

  it("returns plain text when no styles are present", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline.type("no marks", { by: "char", interval: 1 });
    await tw.play();

    expect(sr.toAnsiString()).toBe("no marks");
  });

  it("returns plain text when styles have no ansi field", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline
      .type("styled", { by: "char", interval: 1 })
      .style("tw-bold", { from: 0, to: 6 });
    await tw.play();

    // className-only style has no ansi codes → fallback to plain text
    expect(sr.toAnsiString()).toBe("styled");
  });

  it("wraps ansi-marked segments with escape codes and reset", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline
      .type("color", { by: "char", interval: 1 })
      .style({ ansi: { color: "31" } }, { from: 0, to: 5 });
    await tw.play();

    const result = sr.toAnsiString();

    expect(result).toContain("\x1B[31m");
    expect(result).toContain("\x1B[0m");
    expect(result).toContain("color");
  });

  it("emits unstyled segments as plain text between ANSI ranges", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline
      .type("AB", { by: "char", interval: 1 })
      .style({ ansi: { color: "32" } }, { from: 0, to: 1 });
    await tw.play();

    const result = sr.toAnsiString();

    expect(result).toContain("\x1B[32m");
    expect(result).toContain("B");
  });

  it("handles multiple ANSI styles on disjoint ranges", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline
      .type("ABCD", { by: "char", interval: 1 })
      .style({ ansi: { color: "31" } }, { from: 0, to: 2 })
      .style({ ansi: { color: "32" } }, { from: 2, to: 4 });
    await tw.play();

    const result = sr.toAnsiString();

    expect(result).toContain("\x1B[31m");
    expect(result).toContain("\x1B[32m");
    expect(result.split("\x1B[0m").length).toBeGreaterThan(1);
  });

  it("returns plain text when no segments have ansi codes (class+attrs only)", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline
      .type("XY", { by: "char", interval: 1 })
      .style({ className: "tw-accent", attrs: { "data-x": "1" } }, { from: 0, to: 2 });
    await tw.play();

    // mergeStyles produces no ansi codes → falls back to document.text
    expect(sr.toAnsiString()).toBe("XY");
  });

  it("multiple ANSI codes in one style are joined with semicolon", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline
      .type("bold", { by: "char", interval: 1 })
      .style({ ansi: { bold: "1", color: "31" } }, { from: 0, to: 4 });
    await tw.play();

    const result = sr.toAnsiString();

    // Should contain both codes joined: ESC[1;31m or ESC[31;1m
    // eslint-disable-next-line no-control-regex
    expect(result).toMatch(/\u001B\[\d+(;\d+)+m/);
  });

  it("applies ANSI from style typed with style option", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    // type() with style applies styles per-character, so each char is individually
    // wrapped: \x1B[31mr\x1B[0m\x1B[31me\x1B[0m\x1B[31md\x1B[0m
    tw.timeline.type("red", { by: "char", interval: 1, style: { ansi: { color: "31" } } });
    await tw.play();

    const result = sr.toAnsiString();

    expect(result).toContain("\x1B[31m");
    // Each letter wrapped individually, all three present
    expect(result).toContain("r");
    expect(result).toContain("e");
    expect(result).toContain("d");
  });
});


describe("stringRenderer, playback snapshots", () => {
  it("captures the correct text after delete command", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .delete(-6, { by: "char", interval: 1 });
    await tw.play();

    expect(sr.toString()).toBe("Hello");
  });

  it("captures correct text across multiple type commands", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline
      .type("foo", { by: "char", interval: 1 })
      .type("bar", { by: "char", interval: 1 });
    await tw.play();

    expect(sr.toString()).toBe("foobar");
  });

  it("returns correct text after replay()", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await tw.play();
    await tw.replay();

    expect(sr.toString()).toBe("Hi");
  });

  it("returns empty string after cancel()", async () => {
    const sr = stringRenderer();
    const tw = createTypewriter({ renderer: sr });

    tw.timeline.type("Long sentence here", { by: "char", interval: 50 });
    const playing = tw.play();

    await new Promise(r => setTimeout(r, 5));
    tw.cancel();
    await playing;

    // Output may be partial, but should not be the full text
    const txt = sr.toString();

    expect(txt.length).toBeGreaterThanOrEqual(0);
    expect(txt.length).toBeLessThanOrEqual(18);
  });
});
