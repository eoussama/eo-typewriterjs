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

  test("cancel stops playback and sets cancelled status", async ({ page }) => {
    await gotoScenario(page, "cancel");

    expect(await getStatus(page)).toBe("cancelled");
  });

  test("cancel then replay restarts and completes", async ({ page }) => {
    await gotoScenario(page, "cancel-then-replay");

    expect(await getOutputText(page)).toBe("Hello");
    expect(await getStatus(page)).toBe("completed");
  });

  test("seek from paused stays paused", async ({ page }) => {
    await gotoScenario(page, "seek-from-paused");

    expect(await getStatus(page)).toBe("paused");
  });

  test("seek from cancelled transitions to paused", async ({ page }) => {
    await gotoScenario(page, "seek-from-cancelled");

    expect(await getStatus(page)).toBe("paused");
  });

  test("stepForward repeated to end sets completed status", async ({ page }) => {
    await gotoScenario(page, "step-forward-to-end");

    expect(await getOutputText(page)).toBe("AB");
    expect(await getStatus(page)).toBe("completed");
  });

  test("stepBackward at position 0 stays paused with no change", async ({ page }) => {
    await gotoScenario(page, "step-backward-at-start");

    expect(await getOutputText(page)).toBe("");
    expect(await getStatus(page)).toBe("paused");
  });

  test("play after completed triggers replay and completes again", async ({ page }) => {
    await gotoScenario(page, "play-after-completed");

    expect(await getOutputText(page)).toBe("Hello");
    expect(await getStatus(page)).toContain("second:completed");
  });

  test("stop then play restarts from beginning and completes", async ({ page }) => {
    await gotoScenario(page, "stop-then-play");

    expect(await getOutputText(page)).toBe("Hello");
    expect(await getStatus(page)).toBe("completed");
  });
});
