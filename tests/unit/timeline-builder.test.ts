import { describe, expect, it } from "vitest";
import { createTypewriter, EPlaybackStatus, stringRenderer } from "../../src/index";



describe("timelineBuilder.select", () => {
  it("select with default cursor adds a select command", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 1 }).select(-3);
    await tw.play();

    const state = tw.getState();

    expect(state.status).toBe(EPlaybackStatus.COMPLETED);
  });

  it("select with explicit cursor option", async () => {
    const renderer = stringRenderer();
    const tw = createTypewriter({ renderer });

    tw.timeline.type("Hello", { by: "char", interval: 1 }).select(-2, { cursor: "main" });
    await tw.play();

    expect(renderer.toString()).toBe("Hello");
  });
});
