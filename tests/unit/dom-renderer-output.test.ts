// @vitest-environment happy-dom
import type { TStyleRef, TTextStyle, TTypewriterState } from "../../src/index";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_CURSOR_RENDER_OPTIONS } from "../../src/core/cursor/consts/cursor-defaults.const";
import { DomRenderer } from "../../src/renderers/dom/dom-renderer";



type TStateInput = {
  readonly text: string;
  readonly styles?: readonly TTextStyle[];
  readonly cursors?: Readonly<Record<string, number>>;
  readonly hidden?: readonly string[];
  readonly selections?: Readonly<Record<string, readonly [number, number]>>;
};

/**
 * @description
 * Build a typewriter state from a compact description
 *
 * @param input - The text, styles, cursor indices, hidden cursors and selections
 * @returns The state
 */
function state(input: TStateInput): TTypewriterState {
  const cursors = input.cursors ?? { main: input.text.length };

  return {
    document: { text: input.text, styles: input.styles ?? [] },
    cursors: Object.fromEntries(Object.entries(cursors).map(([id, index]) => [id, {
      id,
      index,
      visible: true,
      renderOptions: { ...DEFAULT_CURSOR_RENDER_OPTIONS, visible: !(input.hidden ?? []).includes(id) },
    }])),
    selections: Object.fromEntries(Object.entries(input.selections ?? {}).map(([id, [from, to]]) => [id, { from, to }])),
  };
}

/**
 * @description
 * Serialize rendered output compactly: `[id]` for a cursor, `{...}` for a selection
 * and `(classes:...)` for a styled span
 *
 * @param node - The node to serialize
 * @returns The compact form
 */
function serialize(node: Node): string {
  const children = (): string => [...node.childNodes].map(serialize).join("");

  if (!(node instanceof HTMLElement)) {
    return node.textContent ?? "";
  }

  if (node.classList.contains("typewriter-cursor")) {
    return `[${node.dataset.cursorId}]`;
  }

  if (node.classList.contains("typewriter-selection")) {
    return `{${children()}}`;
  }

  return node.tagName === "DIV" ? children() : `(${node.className}:${children()})`;
}

/**
 * @description
 * Render a state into a fresh element and serialize it
 *
 * @param input - The state description
 * @returns The serialized output
 */
function render(input: TStateInput): string {
  const el = document.createElement("div");

  new DomRenderer(el).mount(state(input));

  return serialize(el);
}

const style = (from: number, to: number, ref: TStyleRef): TTextStyle => ({ from, to, style: ref });

afterEach(() => {
  document.head.innerHTML = "";
});

describe("domRenderer output", () => {
  it.each<[string, TStateInput, string]>([
    ["a cursor at the end", { text: "abc" }, "abc[main]"],
    ["a cursor in the middle", { text: "abc", cursors: { main: 1 } }, "a[main]bc"],
    ["a cursor at the start", { text: "abc", cursors: { main: 0 } }, "[main]abc"],
    ["two cursors at once", { text: "ab", cursors: { main: 2, b: 1 } }, "a[b]b[main]"],
    ["two cursors at the same index", { text: "ab", cursors: { main: 1, b: 1 } }, "a[main][b]b"],
    ["a hidden cursor", { text: "ab", hidden: ["main"] }, "ab"],
    ["a selection around the cursor", { text: "abcd", cursors: { main: 3 }, selections: { main: [1, 3] } }, "a{bc}[main]d"],
    ["a selection ending at the text end", { text: "abc", selections: { main: [1, 3] } }, "a{bc}[main]"],
    ["two separate selections", { text: "abcdef", cursors: { main: 0, b: 6 }, selections: { main: [0, 2], b: [4, 6] } }, "[main]{ab}cd{ef}[b]"],
    ["overlapping selections", { text: "abcdef", cursors: { main: 0, b: 0 }, selections: { main: [1, 4], b: [2, 5] } }, "[main][b]a{b}{cd}{e}f"],
    ["a styled run", { text: "abcd", styles: [style(1, 3, "x")] }, "a(x:bc)d[main]"],
    ["a cursor at a style boundary", { text: "abcd", cursors: { main: 3 }, styles: [style(1, 3, "x")] }, "a(x:bc)[main]d"],
    ["a cursor inside a styled run", { text: "abcd", cursors: { main: 2 }, styles: [style(0, 4, "x")] }, "(x:ab)[main](x:cd)"],
    ["nested styles", { text: "abc", styles: [style(0, 3, "x"), style(1, 2, "y")] }, "(x:a)(x:(y:b))(x:c)[main]"],
    ["a selection over styled text", { text: "abcd", cursors: { main: 0 }, styles: [style(0, 4, "x")], selections: { main: [1, 3] } }, "[main](x:a){(x:bc)}(x:d)"],
    ["adjacent selections of different cursors", { text: "abcdef", cursors: { main: 0, b: 0 }, selections: { main: [1, 3], b: [3, 5] } }, "[main][b]a{bc}{de}f"],
    ["equal adjacent styles coalesced", { text: "abcd", cursors: { main: 0 }, styles: [style(0, 2, "x"), style(2, 4, "x")] }, "[main](x:abcd)"],
    ["different adjacent styles kept apart", { text: "abcd", cursors: { main: 0 }, styles: [style(0, 2, "x"), style(2, 4, "y")] }, "[main](x:ab)(y:cd)"],
    ["an empty document", { text: "" }, "[main]"],
  ])("renders %s", (_name, input, expected) => {
    expect(render(input)).toBe(expected);
  });

  it("does not leave empty text nodes behind", () => {
    const el = document.createElement("div");

    new DomRenderer(el).mount(state({ text: "abc", cursors: { main: 1 }, styles: [style(0, 3, "x")] }));

    expect([...el.childNodes].map(node => node.textContent)).toEqual(["a", "|", "bc"]);
  });

  it("marks cursors as hidden from assistive technology", () => {
    const el = document.createElement("div");

    new DomRenderer(el).mount(state({ text: "a" }));

    const cursor = el.querySelector(".typewriter-cursor");

    expect(cursor?.getAttribute("aria-hidden")).toBe("true");
    expect([...cursor!.classList]).toEqual(["typewriter-cursor", "typewriter-cursor--blink"]);
  });

  it("splits class names on any whitespace", () => {
    const el = document.createElement("div");

    new DomRenderer(el).mount(state({ text: "a", styles: [style(0, 1, "  one \t two  ")] }));

    expect([...el.querySelector("span")!.classList]).toEqual(["one", "two"]);
  });
});

describe("domRenderer attributes", () => {
  /**
   * @description
   * Render text styled with the given attributes and return the styled span
   *
   * @param attrs - The attributes to apply
   * @returns The styled span
   */
  const styledSpan = (attrs: Record<string, string>): Element => {
    const el = document.createElement("div");

    new DomRenderer(el).mount(state({ text: "a", styles: [style(0, 1, { attrs })] }));

    return el.querySelector("span")!;
  };

  it("rejects handlers regardless of case and surrounding spaces", () => {
    expect(styledSpan({ OnClick: "x", onfocus: "x" }).getAttributeNames()).toEqual([]);
  });

  it("rejects script URLs in URL attributes regardless of case", () => {
    expect(styledSpan({ HREF: "JavaScript:x", src: "vbscript:x" }).getAttributeNames()).toEqual([]);
  });

  it("only checks URL attributes for script URLs", () => {
    expect(styledSpan({ title: "javascript:x" }).getAttribute("title")).toBe("javascript:x");
  });

  it("keeps URLs that merely mention a script scheme", () => {
    expect(styledSpan({ href: "https://example.com/vbscript:" }).getAttribute("href")).toBe("https://example.com/vbscript:");
  });
});

describe("domRenderer styles", () => {
  it("assigns camelCase properties directly", () => {
    const el = document.createElement("div");

    new DomRenderer(el).mount(state({ text: "a", styles: [style(0, 1, { css: { fontWeight: "700" } })] }));

    expect((el.querySelector("span") as HTMLElement).style.fontWeight).toBe("700");
  });
});

describe("domRenderer cursor animation", () => {
  it("only sets the animation properties that are given", () => {
    const el = document.createElement("div");
    const input = state({ text: "" });
    const main = input.cursors.main!;

    new DomRenderer(el).mount({
      ...input,
      cursors: { main: { ...main, renderOptions: { ...main.renderOptions, animation: { name: "pulse", duration: "2s", delay: "1s" } } } },
    });

    const cursor = el.querySelector(".typewriter-cursor") as HTMLElement;

    expect(cursor.getAttribute("style")).toBe("animation-name: pulse; animation-duration: 2s; animation-delay: 1s;");
  });
});

describe("domRenderer blink stylesheet", () => {
  it("injects the blink keyframes once", () => {
    const el = document.createElement("div");

    const renderers = [new DomRenderer(el), new DomRenderer(el)];
    const styles = document.head.querySelectorAll("style");

    expect(renderers).toHaveLength(2);
    expect(styles).toHaveLength(1);
    expect(styles[0]?.id).toBe("typewriter-blink-style");
    expect(styles[0]?.textContent).toBe([
      "@keyframes tw-cursor-blink {",
      "  0%, 49.9% { opacity: 1; }",
      "  50%, 100% { opacity: 0; }",
      "}",
      ".typewriter-cursor--blink {",
      "  animation: tw-cursor-blink 1s step-end infinite;",
      "}",
    ].join("\n"));
  });
});
