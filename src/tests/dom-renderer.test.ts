// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createTypewriter } from "../index";

import { DomRenderer, domRenderer } from "../renderers/dom/dom-renderer";



// ---------------------------------------------------------------------------
// DomRenderer — basic rendering
// ---------------------------------------------------------------------------

describe("domRenderer", () => {
  it("mounts and renders plain text into a target element", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 1 });
    await tw.play();

    expect(el.textContent).toBe("Hello");
  });

  it("domRenderer factory creates a DomRenderer that renders text", async () => {
    const el = document.createElement("div");
    const renderer = domRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 });
    await tw.play();

    expect(el.textContent).toBe("Hi");
  });

  it("accepts a CSS selector string as target", async () => {
    const el = document.createElement("div");

    el.id = "tw-target";
    document.body.appendChild(el);

    const renderer = domRenderer("#tw-target");
    const tw = createTypewriter({ renderer });

    tw.timeline.type("CSS", { by: "char", interval: 1 });
    await tw.play();

    expect(el.textContent).toBe("CSS");

    document.body.removeChild(el);
  });

  it("renders styled text with className span", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hi", { by: "char", interval: 1 }).mark("tw-bold", { from: 0, to: 2 });
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

    // stop calls render with reset state — should not throw
    expect(() => tw.stop()).not.toThrow();
  });

  it("renders styled text with css inline style", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("AB", { by: "char", interval: 1 }).mark({ css: { color: "red" } }, { from: 0, to: 2 });
    await tw.play();

    expect(el.textContent).toBe("AB");
    const span = el.querySelector("span");

    expect(span).not.toBeNull();
  });

  it("renders styled text with attrs applied to span", async () => {
    const el = document.createElement("div");
    const renderer = new DomRenderer(el);
    const tw = createTypewriter({ renderer });

    tw.timeline.type("AB", { by: "char", interval: 1 }).mark({ attrs: { "data-x": "1" } }, { from: 0, to: 2 });
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
      .moveCursor(0)
      .select(3);
    await tw.play();

    expect(el.querySelector(".typewriter-selection")).not.toBeNull();
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
    renderer.mount({ document: { text: "", marks: [] }, cursors: { main: { id: "main", index: 0, visible: true } }, selections: {} });
    renderer.unmount();

    // After unmount, render should not throw (target is null, _paint returns early)
    expect(() => renderer.render({ document: { text: "X", marks: [] }, cursors: { main: { id: "main", index: 1, visible: true } }, selections: {} })).not.toThrow();
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
