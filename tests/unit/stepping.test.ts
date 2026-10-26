import { describe, expect, it } from "vitest";
import { chunkSteps } from "../../src/core/stepping/helpers/chunk-steps.helper";
import { segmentText } from "../../src/core/stepping/helpers/segment-text.helper";



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

  it("returns the whole text as a single step for 'whole' unit", () => {
    expect(segmentText("anything", "whole")).toEqual(["anything"]);
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
