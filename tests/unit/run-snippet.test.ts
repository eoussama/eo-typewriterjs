import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorLine, formatValue, runSnippet, stripImports } from "../../docs/.vitepress/theme/playground/run-snippet";
import { stringRenderer } from "../../src/index";



/**
 * @description
 * Run a snippet with string renderers, collecting its console output
 *
 * @param code - The snippet source
 * @param controller - Controls the run's abort signal
 * @returns The run result, the main renderer and the console lines
 */
function start(code: string, controller = new AbortController()) {
  const renderer = stringRenderer();
  const logs: string[] = [];
  const result = runSnippet(code, {
    renderer,
    preview: () => stringRenderer(),
    signal: controller.signal,
    onConsole: (level, text) => logs.push(`${level}:${text}`),
  });

  return { result, renderer, logs, controller };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("formatValue", () => {
  it("formats every kind of value readably", () => {
    const named = (): void => {};
    const circular: Record<string, unknown> = { name: "loop" };

    circular.self = circular;

    expect(formatValue("text")).toBe("text");
    expect(formatValue(42)).toBe("42");
    expect(formatValue(undefined)).toBe("undefined");
    expect(formatValue(null)).toBe("null");
    expect(formatValue(new TypeError("bad"))).toBe("TypeError: bad");
    expect(formatValue(named)).toBe("[Function named]");
    expect(formatValue(() => {})).toBe("[Function anonymous]");
    expect(formatValue({ a: [1, 2], f: () => {} })).toBe("{\"a\":[1,2],\"f\":\"[Function f]\"}");
    expect(formatValue(circular)).toBe("{\"name\":\"loop\",\"self\":\"[Circular]\"}");
  });
});

describe("stripImports", () => {
  it("blanks import statements and keeps line numbers", () => {
    const code = "import { createTypewriter } from \"eo-typewriterjs\";\nimport x from 'y'\nconst a = 1;";

    expect(stripImports(code)).toBe("\n\nconst a = 1;");
  });
});

describe("errorLine", () => {
  it("maps a stack frame of the compiled snippet to its line", () => {
    const error = new Error("boom");

    error.stack = "Error: boom\n    at eval (eval at runSnippet, <anonymous>:7:3)";

    expect(errorLine(error)).toBe(5);
  });

  it("returns null when the line is unknown or inside the wrapper", () => {
    const wrapper = new Error("x");

    wrapper.stack = "Error: x\n    at <anonymous>:1:1";

    expect(errorLine("not an error")).toBeNull();
    expect(errorLine(new Error("no frame"))).toBeNull();
    expect(errorLine(wrapper)).toBeNull();
  });
});

describe("runSnippet", () => {
  it("runs snippets with top-level await and the injected globals", async () => {
    const { result, renderer, logs } = start(`
      const tw = createTypewriter({ renderer });
      tw.timeline.type("Hi", { interval: 10 });
      await tw.play();
      console.log(ECursorKind.BLOCK, typeof DEFAULT_SFX_PACK);
    `);

    await vi.advanceTimersByTimeAsync(100);

    expect(await result).toEqual({ ok: true });
    expect(renderer.toString()).toBe("Hi");
    expect(logs).toEqual(["log:block object"]);
  });

  it("reports thrown errors with their snippet line", async () => {
    const { result } = start("const a = 1;\nconst b = 2;\nthrow new RangeError(\"nope\");");

    expect(await result).toEqual({ ok: false, error: { message: "RangeError: nope", line: expect.any(Number) } });
  });

  it("reports non-error throws", async () => {
    const { result } = start("throw 'plain';");

    expect(await result).toMatchObject({ ok: false, error: { message: "plain", line: null } });
  });

  it("stops a run: destroys its typewriters and ignores later output", async () => {
    const { result, renderer, logs, controller } = start(`
      const tw = createTypewriter({ renderer });
      tw.timeline.type("abcdef", { interval: 100 });
      await tw.play();
      console.log("after stop");
      await tw.replay();
      createTypewriter({ renderer });
    `);

    await vi.advanceTimersByTimeAsync(150);
    controller.abort();
    await vi.advanceTimersByTimeAsync(1000);

    expect(await result).toEqual({ ok: true });
    expect(logs).toEqual([]);
    // Playback stopped where it was and the snippet's replay() did not restart it.
    expect(renderer.toString()).toBe("ab");
  });

  it("aborts sleep() with the run", async () => {
    const { result, logs, controller } = start("await sleep(1000); console.log('woke');");

    await vi.advanceTimersByTimeAsync(10);
    controller.abort();

    expect(await result).toEqual({ ok: true });
    expect(logs).toEqual([]);
  });

  it("lets sleep() resolve normally", async () => {
    const { result, logs } = start("await sleep(50); console.info('woke');");

    await vi.advanceTimersByTimeAsync(50);

    expect(await result).toEqual({ ok: true });
    expect(logs).toEqual(["info:woke"]);
  });

  it("gives every preview its own renderer", async () => {
    const labels: string[] = [];
    const result = await runSnippet("preview('a'); preview('b');", {
      renderer: stringRenderer(),
      preview: (label) => {
        labels.push(label);

        return stringRenderer();
      },
      signal: new AbortController().signal,
    });

    expect(result).toEqual({ ok: true });
    expect(labels).toEqual(["a", "b"]);
  });
});
