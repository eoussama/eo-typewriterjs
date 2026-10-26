import { describe, expect, it } from "vitest";
import { DomRenderer } from "../../src/renderers/dom/dom-renderer";



describe("domRenderer without a document", () => {
  it("can be created during server-side rendering", () => {
    expect(typeof document).toBe("undefined");
    expect(() => new DomRenderer("#output")).not.toThrow();
  });
});
