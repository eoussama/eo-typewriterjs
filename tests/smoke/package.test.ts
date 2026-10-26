import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";



const require = createRequire(import.meta.url);

describe("built package", () => {
  it("exposes the main entry as ESM", async () => {
    const mod = await import("eo-typewriterjs");

    expect(typeof mod.createTypewriter).toBe("function");
    expect(typeof mod.StringRenderer).toBe("function");
  });

  it("exposes the main entry as CommonJS", () => {
    const mod = require("eo-typewriterjs") as typeof import("eo-typewriterjs");

    expect(typeof mod.createTypewriter).toBe("function");
  });

  it("exposes the audio pack entry in both formats", async () => {
    const esm = await import("eo-typewriterjs/audio-pack");
    const cjs = require("eo-typewriterjs/audio-pack") as typeof import("eo-typewriterjs/audio-pack");

    expect(Object.keys(esm.DEFAULT_SFX_PACK).length).toBeGreaterThan(0);
    expect(cjs.DEFAULT_SFX_PACK).toEqual(esm.DEFAULT_SFX_PACK);
  });

  it("types a string end to end with the built code", async () => {
    const { createTypewriter, stringRenderer } = await import("eo-typewriterjs");
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer, audio: { enabled: false } });

    tw.timeline.type("Hello", { interval: 0 });
    await tw.play();

    expect(renderer.toString()).toBe("Hello");
  });
});
