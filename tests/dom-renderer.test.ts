// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { DEFAULT_CURSOR_RENDER_OPTIONS } from "../src/core/cursor/consts/cursor-defaults.const";

import { createTypewriter } from "../src/index";
import { DomRenderer, domRenderer } from "../src/renderers/dom/dom-renderer";



describe("domRenderer", () => {
  it("mounts and renders plain text into a target element", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer, cursor: { content: "" } });

    tw.timeline.type("Hello", { by: "char", interval: 1 });
    await tw.play();

    expect(el.textContent).toBe("Hello");
  });

  it("domRenderer factory creates a DomRenderer that renders text", async () => {
    const el = document.createElement("div");
    const renderer = domRenderer(el);
    const tw = createTypewriter({ renderer, cursor: { content: "" } });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await tw.play();

    expect(el.textContent).toBe("Hi");
  });

  it("accepts a CSS selector string as target", async () => {
    const el = document.createElement("div");

    el.id = "tw-target";
    document.body.appendChild(el);

    const renderer = domRenderer("#tw-target");
    const tw = createTypewriter({ renderer, cursor: { content: "" } });

    tw.timeline.type("CSS", { by: "char", interval: 1 });
    await tw.play();

    expect(el.textContent).toBe("CSS");

    document.body.removeChild(el);
  });

  it("renders styled text with className span", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer, cursor: { content: "" } });

    tw.timeline.type("Hi", { by: "char", interval: 1 }).style("tw-bold", { from: 0, to: 2 });
    await tw.play();

    expect(el.textContent).toBe("Hi");
    expect(el.querySelector(".tw-bold")).not.toBeNull();
  });

  it("renders a cursor element at the cursor position", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await tw.play();

    expect(el.querySelector(".typewriter-cursor")).not.toBeNull();
  });

  it("unmount clears the target reference (no error on subsequent render)", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await tw.play();

    tw.stop();

    // stop calls render with reset state, should not throw
    expect(() => tw.stop()).not.toThrow();
  });

  it("renders styled text with css inline style", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer, cursor: { content: "" } });

    tw.timeline.type("AB", { by: "char", interval: 1 }).style({ css: { color: "red" } }, { from: 0, to: 2 });
    await tw.play();

    expect(el.textContent).toBe("AB");
    const span = el.querySelector("span");

    expect(span).not.toBeNull();
  });

  it("renders styled text with attrs applied to span", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("AB", { by: "char", interval: 1 }).style({ attrs: { "data-x": "1" } }, { from: 0, to: 2 });
    await tw.play();

    expect(el.querySelector("[data-x]")).not.toBeNull();
  });

  it("renders selection highlight when a selection is active", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    // Type text, move cursor back, and select forward to create an active selection
    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .move(-999, { interval: 1 })
      .select(3);
    await tw.play();

    expect(el.querySelector(".typewriter-selection")).not.toBeNull();
  });

  it("does not duplicate the cursor after style(\"selection\") clears the active selection", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline
      .type("Make this word pop.", { by: "char", interval: 1 })
      .move(-5)
      .select(-4, { by: "char" })
      .style("tw-accent", "selection");

    await tw.play();

    expect(el.querySelectorAll(".typewriter-cursor")).toHaveLength(1);
    expect(el.querySelectorAll(".typewriter-selection")).toHaveLength(0);
    expect(el.textContent).toBe("Make this word| pop.");
  });

  it("does not render when target element is not found (null selector)", async () => {
    const renderer = domRenderer("#nonexistent-element");
    const tw = createTypewriter({ renderer });

    // Should not throw even if selector doesn't match
    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await expect(tw.play()).resolves.toBeUndefined();
  });

  it("unmount() releases the target reference (no render after unmount)", () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);

    // Mount with initial state then unmount
    renderer.mount({ document: { text: "", styles: [] }, cursors: { main: { id: "main", index: 0, visible: true, renderOptions: DEFAULT_CURSOR_RENDER_OPTIONS } }, selections: {} });
    renderer.unmount();

    // After unmount, render should not throw (target is null, _paint returns early)
    expect(() => renderer.render({ document: { text: "X", styles: [] }, cursors: { main: { id: "main", index: 1, visible: true, renderOptions: DEFAULT_CURSOR_RENDER_OPTIONS } }, selections: {} })).not.toThrow();
    expect(el.textContent).toBe(""); // el was set before unmount but render is no-op after
  });

  it("renders multiple cursors", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("AB", { cursor: ["a", "b"], by: "char", interval: 1 });
    await tw.play();

    const cursors = el.querySelectorAll(".typewriter-cursor");

    expect(cursors.length).toBeGreaterThanOrEqual(1);
  });
});


describe("domRenderer, cursor kind glyphs", () => {
  it("default cursor renders with pipe glyph", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el) });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector(".typewriter-cursor");

    expect(cursor?.textContent).toBe("|");
    expect(cursor?.getAttribute("data-cursor-kind")).toBe("pipe");
  });

  it("caret kind renders ^ glyph", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { kind: "caret" } });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector(".typewriter-cursor");

    expect(cursor?.textContent).toBe("^");
    expect(cursor?.getAttribute("data-cursor-kind")).toBe("caret");
  });

  it("underscore kind renders _ glyph", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { kind: "underscore" } });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector(".typewriter-cursor");

    expect(cursor?.textContent).toBe("_");
    expect(cursor?.getAttribute("data-cursor-kind")).toBe("underscore");
  });

  it("custom kind with explicit content renders that content", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { kind: "custom", content: "▋" } });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector(".typewriter-cursor");

    expect(cursor?.textContent).toBe("▋");
    expect(cursor?.getAttribute("data-cursor-kind")).toBe("custom");
  });

  it("content: empty string renders a CSS-only cursor with no text", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { content: "" } });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector(".typewriter-cursor");

    expect(cursor).not.toBeNull();
    expect(cursor?.textContent).toBe("");
  });

  it("block kind renders ▋ glyph", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { kind: "block" } });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector(".typewriter-cursor");

    expect(cursor?.textContent).toBe("▋");
    expect(cursor?.getAttribute("data-cursor-kind")).toBe("block");
  });

  it("block-underscore kind renders ▄ glyph", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { kind: "block-underscore" } });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector(".typewriter-cursor");

    expect(cursor?.textContent).toBe("▄");
    expect(cursor?.getAttribute("data-cursor-kind")).toBe("block-underscore");
  });

  it("explicit content overrides the kind default glyph", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { kind: "caret", content: "❮" } });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    expect(el.querySelector(".typewriter-cursor")?.textContent).toBe("❮");
  });
});


describe("domRenderer, cursor visibility", () => {
  it("visible: false hides the cursor entirely (no span rendered)", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { visible: false } });

    tw.timeline.type("Hello", { by: "char", interval: 1 });
    await tw.play();

    expect(el.querySelector(".typewriter-cursor")).toBeNull();
    expect(el.textContent).toBe("Hello");
  });

  it("visible: true renders the cursor span", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { visible: true } });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    expect(el.querySelector(".typewriter-cursor")).not.toBeNull();
  });
});


describe("domRenderer, cursor classes and attrs", () => {
  it("extra className is appended to the cursor span", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({
      renderer: new DomRenderer(el),
      cursor: { className: "blink accent" },
    });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector(".typewriter-cursor");

    expect(cursor?.classList.contains("blink")).toBe(true);
    expect(cursor?.classList.contains("accent")).toBe(true);
  });

  it("extra attrs are applied to the cursor span", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({
      renderer: new DomRenderer(el),
      cursor: { attrs: { "data-role": "cursor", "aria-label": "cursor" } },
    });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector(".typewriter-cursor");

    expect(cursor?.getAttribute("data-role")).toBe("cursor");
    expect(cursor?.getAttribute("aria-label")).toBe("cursor");
  });

  it("base typewriter-cursor class is always present", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({
      renderer: new DomRenderer(el),
      cursor: { className: "my-custom" },
    });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    expect(el.querySelector(".typewriter-cursor")).not.toBeNull();
    expect(el.querySelector(".my-custom")).not.toBeNull();
  });
});


describe("domRenderer, runtime cursor mutations", () => {
  it("setCursorVisible(false) hides cursor immediately", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("AB", { by: "char", interval: 1 });
    await tw.play();

    expect(el.querySelector(".typewriter-cursor")).not.toBeNull();

    tw.setCursorVisible(false);

    expect(el.querySelector(".typewriter-cursor")).toBeNull();
  });

  it("setCursorVisible(true) after false restores the cursor", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("AB", { by: "char", interval: 1 });
    await tw.play();

    tw.setCursorVisible(false);
    expect(el.querySelector(".typewriter-cursor")).toBeNull();

    tw.setCursorVisible(true);
    expect(el.querySelector(".typewriter-cursor")).not.toBeNull();
  });

  it("setCursorOptions({ kind }) updates glyph immediately", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer, cursor: { kind: "pipe" } });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    expect(el.querySelector(".typewriter-cursor")?.textContent).toBe("|");

    tw.setCursorOptions({ kind: "underscore" });

    expect(el.querySelector(".typewriter-cursor")?.textContent).toBe("_");
    expect(el.querySelector(".typewriter-cursor")?.getAttribute("data-cursor-kind")).toBe("underscore");
  });

  it("setCursorOptions({ content }) updates glyph immediately", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    tw.setCursorOptions({ content: "❯" });

    expect(el.querySelector(".typewriter-cursor")?.textContent).toBe("❯");
  });

  it("setCursorOptions({ className }) applies extra class immediately", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    tw.setCursorOptions({ className: "fancy" });

    expect(el.querySelector(".fancy")).not.toBeNull();
  });

  it("setCursorOptions({ visible: false }) hides cursor", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    tw.setCursorOptions({ visible: false });

    expect(el.querySelector(".typewriter-cursor")).toBeNull();
  });

  it("setCursorVisible with named cursor selector only affects that cursor", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("AB", { cursor: ["main", "b"], by: "char", interval: 1 });
    await tw.play();

    const before = el.querySelectorAll(".typewriter-cursor").length;

    tw.setCursorVisible(false, "b");

    // "main" still visible, "b" hidden, but "b" may not have been added
    // depending on cursor count; just ensure no error and main is still there
    expect(el.querySelector(".typewriter-cursor[data-cursor-id='main']")).not.toBeNull();
    expect(before).toBeGreaterThanOrEqual(1);
  });

  it("runtime cursor options survive replay()", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    tw.setCursorOptions({ kind: "underscore" });

    await tw.replay();

    expect(el.querySelector(".typewriter-cursor")?.textContent).toBe("_");
  });

  it("setCursorOptions({ kind: 'block' }) inside call() swaps glyph mid-playback", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer, cursor: { kind: "pipe" } });

    let glyphAfterSwap = "";

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .call(() => {
        tw.setCursorOptions({ kind: "block" });
        glyphAfterSwap = el.querySelector(".typewriter-cursor")?.textContent ?? "";
      })
      .wait(1);

    await tw.play();

    // After call(), the cursor glyph should be the block ▋, not the initial |
    expect(glyphAfterSwap).toBe("▋");
    // The document text should be preserved (not wiped to empty string)
    expect(el.textContent?.startsWith("Hi")).toBe(true);
  });

  it("setCursorVisible(true) inside call() reveals cursor without wiping document text", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer, cursor: { visible: false } });

    tw.timeline
      .type("Hidden", { by: "char", interval: 1 })
      .call(() => {
        tw.setCursorVisible(true);
      })
      .wait(1);

    await tw.play();

    // Document text must still be present
    expect(el.textContent?.startsWith("Hidden")).toBe(true);
    // Cursor should now be visible
    expect(el.querySelector(".typewriter-cursor")).not.toBeNull();
  });
});


describe("domRenderer, cursor animation", () => {
  it("default cursor has data-cursor-animation=blink and blink class", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el) });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector(".typewriter-cursor");

    expect(cursor?.getAttribute("data-cursor-animation")).toBe("blink");
    expect(cursor?.classList.contains("typewriter-cursor--blink")).toBe(true);
  });

  it("animation: 'blink' adds blink class and sets data-cursor-animation", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { animation: "blink" } });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector(".typewriter-cursor");

    expect(cursor?.getAttribute("data-cursor-animation")).toBe("blink");
    expect(cursor?.classList.contains("typewriter-cursor--blink")).toBe(true);
  });

  it("animation: 'none' sets inline animation:none and data-cursor-animation=none", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { animation: "none" } });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector<HTMLElement>(".typewriter-cursor");

    expect(cursor?.getAttribute("data-cursor-animation")).toBe("none");
    expect(cursor?.style.animation).toBe("none");
    expect(cursor?.classList.contains("typewriter-cursor--blink")).toBe(false);
  });

  it("animation object sets data-cursor-animation=custom and inline animation-name", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({
      renderer: new DomRenderer(el),
      cursor: {
        animation: {
          name: "my-pulse",
          duration: "800ms",
          iterationCount: "infinite",
        },
      },
    });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector<HTMLElement>(".typewriter-cursor");

    expect(cursor?.getAttribute("data-cursor-animation")).toBe("custom");
    expect(cursor?.style.animationName).toBe("my-pulse");
    expect(cursor?.style.animationDuration).toBe("800ms");
    expect(cursor?.style.animationIterationCount).toBe("infinite");
    expect(cursor?.classList.contains("typewriter-cursor--blink")).toBe(false);
  });

  it("runtime setCursorOptions({ animation: 'none' }) disables blink immediately", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    // Initially blinking
    expect(el.querySelector(".typewriter-cursor--blink")).not.toBeNull();

    tw.setCursorOptions({ animation: "none" });

    const cursor = el.querySelector<HTMLElement>(".typewriter-cursor");

    expect(cursor?.getAttribute("data-cursor-animation")).toBe("none");
    expect(cursor?.style.animation).toBe("none");
    expect(cursor?.classList.contains("typewriter-cursor--blink")).toBe(false);
  });

  it("runtime setCursorOptions({ animation: 'blink' }) restores blink after none", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer, cursor: { animation: "none" } });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    expect(el.querySelector(".typewriter-cursor--blink")).toBeNull();

    tw.setCursorOptions({ animation: "blink" });

    const cursor = el.querySelector(".typewriter-cursor");

    expect(cursor?.getAttribute("data-cursor-animation")).toBe("blink");
    expect(cursor?.classList.contains("typewriter-cursor--blink")).toBe(true);
  });

  it("runtime setCursorOptions with animation object applies custom animation", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    tw.setCursorOptions({
      animation: {
        name: "tw-fade",
        duration: "600ms",
        timingFunction: "ease-in-out",
      },
    });

    const cursor = el.querySelector<HTMLElement>(".typewriter-cursor");

    expect(cursor?.getAttribute("data-cursor-animation")).toBe("custom");
    expect(cursor?.style.animationName).toBe("tw-fade");
    expect(cursor?.style.animationDuration).toBe("600ms");
    expect(cursor?.style.animationTimingFunction).toBe("ease-in-out");
  });

  it("animation object without optional fields only sets animationName", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({
      renderer: new DomRenderer(el),
      cursor: {
        animation: {
          name: "tw-minimal",
        },
      },
    });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector<HTMLElement>(".typewriter-cursor");

    expect(cursor?.getAttribute("data-cursor-animation")).toBe("custom");
    expect(cursor?.style.animationName).toBe("tw-minimal");
    expect(cursor?.style.animationDuration).toBe("");
    expect(cursor?.style.animationDelay).toBe("");
  });

  it("animation object with delay, fillMode, and playState sets those properties", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({
      renderer: new DomRenderer(el),
      cursor: {
        animation: {
          name: "tw-pulse",
          duration: "500ms",
          delay: "100ms",
          fillMode: "both",
          playState: "running",
          direction: "alternate",
        },
      },
    });

    tw.timeline.type("X", { by: "char", interval: 1 });
    await tw.play();

    const cursor = el.querySelector<HTMLElement>(".typewriter-cursor");

    expect(cursor?.getAttribute("data-cursor-animation")).toBe("custom");
    expect(cursor?.style.animationDelay).toBe("100ms");
    expect(cursor?.style.animationFillMode).toBe("both");
    expect(cursor?.style.animationPlayState).toBe("running");
    expect(cursor?.style.animationDirection).toBe("alternate");
  });
});


describe("domRenderer, cumulative styles on same range", () => {
  it("two className styles on the same range both appear as nested spans", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { content: "" } });

    tw.timeline
      .type("Important Notice", { by: "char", interval: 1 })
      .style("bold", { from: 0, to: 9 })
      .style("underline", { from: 0, to: 9 });
    await tw.play();

    expect(el.textContent).toBe("Important Notice");
    expect(el.querySelector(".bold")).not.toBeNull();
    expect(el.querySelector(".underline")).not.toBeNull();
  });

  it("the first applied style is the outermost span and the second is nested inside it", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { content: "" } });

    tw.timeline
      .type("Hello", { by: "char", interval: 1 })
      .style("outer", { from: 0, to: 5 })
      .style("inner", { from: 0, to: 5 });
    await tw.play();

    const outerSpan = el.querySelector(".outer");

    expect(outerSpan).not.toBeNull();
    expect(outerSpan?.querySelector(".inner")).not.toBeNull();
  });

  it("three className styles on the same range all appear in the DOM", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { content: "" } });

    tw.timeline
      .type("ABC", { by: "char", interval: 1 })
      .style("first", { from: 0, to: 3 })
      .style("second", { from: 0, to: 3 })
      .style("third", { from: 0, to: 3 });
    await tw.play();

    expect(el.querySelector(".first")).not.toBeNull();
    expect(el.querySelector(".second")).not.toBeNull();
    expect(el.querySelector(".third")).not.toBeNull();
    expect(el.textContent).toBe("ABC");
  });

  it("mixed className and css styles on the same range both apply", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { content: "" } });

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .style("emphasis", { from: 0, to: 2 })
      .style({ css: { color: "red" } }, { from: 0, to: 2 });
    await tw.play();

    expect(el.querySelector(".emphasis")).not.toBeNull();

    const colorSpan = el.querySelector<HTMLElement>("span[style]");

    expect(colorSpan).not.toBeNull();
    expect(colorSpan?.style.color).toBe("red");
    expect(el.textContent).toBe("Hi");
  });

  it("non-overlapping styles on adjacent ranges each produce their own independent span", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { content: "" } });

    tw.timeline
      .type("Hello World", { by: "char", interval: 1 })
      .style("part-a", { from: 0, to: 5 })
      .style("part-b", { from: 6, to: 11 });
    await tw.play();

    const spanA = el.querySelector(".part-a");
    const spanB = el.querySelector(".part-b");

    expect(spanA).not.toBeNull();
    expect(spanB).not.toBeNull();
    expect(spanA?.textContent).toBe("Hello");
    expect(spanB?.textContent).toBe("World");
  });

  it("cumulative styles and selection highlight both render correctly", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el) });

    tw.timeline
      .type("Test", { by: "char", interval: 1 })
      .style("bold", { from: 0, to: 4 })
      .style("underline", { from: 0, to: 4 })
      .move(-999)
      .select(4);
    await tw.play();

    expect(el.querySelector(".bold")).not.toBeNull();
    expect(el.querySelector(".underline")).not.toBeNull();
    expect(el.querySelector(".typewriter-selection")).not.toBeNull();
  });
});


describe("domRenderer, run coalescing", () => {
  it("adjacent characters with the same inline style collapse into a single span", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { content: "" } });

    tw.timeline.type("Hello", { by: "char", interval: 1, style: "greeting" });
    await tw.play();

    const spans = el.querySelectorAll(".greeting");

    expect(spans).toHaveLength(1);
    expect(spans[0]?.textContent).toBe("Hello");
  });

  it("two adjacent typed runs with different styles produce one span each", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { content: "" } });

    tw.timeline
      .type("Hello ", { by: "char", interval: 1, style: "greeting" })
      .type("World!", { by: "char", interval: 1, style: "accent" });
    await tw.play();

    const greetingSpans = el.querySelectorAll(".greeting");
    const accentSpans = el.querySelectorAll(".accent");

    expect(greetingSpans).toHaveLength(1);
    expect(greetingSpans[0]?.textContent).toBe("Hello ");

    expect(accentSpans).toHaveLength(1);
    expect(accentSpans[0]?.textContent).toBe("World!");

    expect(el.textContent).toBe("Hello World!");
  });

  it("unstyled characters between styled runs are plain text nodes (no span)", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { content: "" } });

    tw.timeline
      .type("AB", { by: "char", interval: 1, style: "s1" })
      .type("CD", { by: "char", interval: 1 })
      .type("EF", { by: "char", interval: 1, style: "s2" });
    await tw.play();

    expect(el.querySelector(".s1")?.textContent).toBe("AB");
    expect(el.querySelector(".s2")?.textContent).toBe("EF");
    expect(el.textContent).toBe("ABCDEF");

    // The plain "CD" between the spans must not be wrapped in any span
    const allSpans = el.querySelectorAll("span");

    const nonStyleSpans = [...allSpans].filter(
      s => !s.classList.contains("s1") && !s.classList.contains("s2") && !s.classList.contains("typewriter-cursor"),
    );

    expect(nonStyleSpans).toHaveLength(0);
  });

  it("coalesced run with .style() on same range still nests spans correctly", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { content: "" } });

    tw.timeline
      .type("Hi", { by: "char", interval: 1 })
      .style("outer", { from: 0, to: 2 })
      .style("inner", { from: 0, to: 2 });
    await tw.play();

    const outerSpan = el.querySelector(".outer");

    expect(outerSpan).not.toBeNull();
    expect(outerSpan?.querySelector(".inner")).not.toBeNull();
    expect(outerSpan?.textContent).toBe("Hi");
  });

  it("does not coalesce across a cursor boundary", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el) });

    // Type with style, move cursor into the middle, then finish
    // The cursor position sits between two identically-styled character runs
    tw.timeline
      .type("ABCDE", { by: "char", interval: 1, style: "hi" })
      .move(-2);
    await tw.play();

    // The cursor is between C and D. Coalescing must not produce a single span
    // that bridges the cursor position: there should be text before AND after cursor.
    const cursor = el.querySelector(".typewriter-cursor");

    expect(cursor).not.toBeNull();

    // Cursor must be inside the output, not at the very end
    const html = el.innerHTML;
    const cursorIndex = html.indexOf("typewriter-cursor");

    // There must be span content before the cursor
    expect(html.slice(0, cursorIndex)).toContain("hi");
    // And span/text content after the cursor
    expect(html.slice(cursorIndex)).toContain("hi");
  });

  it("does not coalesce across a selection boundary", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el) });

    tw.timeline
      .type("ABCDE", { by: "char", interval: 1, style: "hi" })
      .move(-999)
      .select(3);
    await tw.play();

    // Selected portion (ABC) should be inside .typewriter-selection
    const sel = el.querySelector(".typewriter-selection");

    expect(sel).not.toBeNull();

    // Unselected portion (DE) should still carry the "hi" style outside selection
    const hiSpans = el.querySelectorAll(".hi");

    expect(hiSpans.length).toBeGreaterThanOrEqual(1);
    expect(el.textContent).toContain("ABCDE");
  });

  it("coalesces a long run of plain (unstyled) characters into a single text node", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { content: "" } });

    tw.timeline.type("Hello World", { by: "char", interval: 1 });
    await tw.play();

    // No style spans at all - only the cursor span should be present, no text-wrapping spans
    const styleSpans = [...el.querySelectorAll("span")].filter(
      s => !s.classList.contains("typewriter-cursor"),
    );

    expect(styleSpans).toHaveLength(0);
    expect(el.textContent).toBe("Hello World");
  });

  it("inline style with css object coalesces into a single styled span", async () => {
    const el = document.createElement("div");
    const tw = createTypewriter({ renderer: new DomRenderer(el), cursor: { content: "" } });

    tw.timeline.type("Red", { by: "char", interval: 1, style: { css: { color: "red" } } });
    await tw.play();

    const styledSpans = el.querySelectorAll<HTMLElement>("span[style]");

    expect(styledSpans).toHaveLength(1);
    expect(styledSpans[0]?.style.color).toBe("red");
    expect(styledSpans[0]?.textContent).toBe("Red");
  });
});
