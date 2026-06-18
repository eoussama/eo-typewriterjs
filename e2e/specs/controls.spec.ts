import { expect, test } from "@playwright/test";

import { getOutputLocator, getOutputText, getStatus, gotoScenario } from "../helpers/harness.helper";



test.describe("controls", () => {
  test("stop resets rendered output to empty", async ({ page }) => {
    await gotoScenario(page, "stop-reset");

    expect(await getOutputText(page)).toBe("");
    expect(await getStatus(page)).toBe("stopped");
  });

  test("replay restarts and completes with full text", async ({ page }) => {
    await gotoScenario(page, "replay");

    expect(await getOutputText(page)).toBe("Hello");
    expect(await getStatus(page)).toBe("completed");
  });

  test("seek to end shows full text and completes", async ({ page }) => {
    await gotoScenario(page, "seek-end");

    expect(await getOutputText(page)).toBe("Hello");
    expect(await getStatus(page)).toBe("completed");
  });

  test("seek to middle shows partial text", async ({ page }) => {
    await gotoScenario(page, "seek-middle");

    expect(await getOutputText(page)).toBe("Hel");
  });

  test("stepForward applies first event group and pauses", async ({ page }) => {
    await gotoScenario(page, "step-forward");

    expect(await getOutputText(page)).toBe("H");
    expect(await getStatus(page)).toBe("paused");
  });

  test("stepBackward after two steps returns to previous state", async ({ page }) => {
    await gotoScenario(page, "step-backward");

    expect(await getOutputText(page)).toBe("H");
    expect(await getStatus(page)).toBe("paused");
  });

  test("setRate speeds up playback and completes correctly", async ({ page }) => {
    await gotoScenario(page, "rate-control");

    expect(await getOutputText(page)).toBe("Hello");
    expect(await getStatus(page)).toBe("completed");
  });

  test("pause then resume completes with full text", async ({ page }) => {
    await gotoScenario(page, "pause-resume");

    expect(await getOutputText(page)).toBe("Hello world");
    expect(await getStatus(page)).toBe("completed");

    await expect(getOutputLocator(page)).toBeVisible();
  });
});
