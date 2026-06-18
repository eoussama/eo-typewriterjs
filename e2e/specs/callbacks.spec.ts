import { expect, test } from "@playwright/test";

import { getLogs, getOutputText, getStatus, gotoScenario } from "../helpers/harness.helper";



test.describe("callbacks", () => {
  test("call fires mid-animation with correct state", async ({ page }) => {
    await gotoScenario(page, "call-fires");

    const logs = await getLogs(page);

    expect(logs).toContain("text:Hello");
    expect(await getOutputText(page)).toBe("Hello!");
  });

  test("async call suspends playback until resolved", async ({ page }) => {
    await gotoScenario(page, "async-call");

    const logs = await getLogs(page);

    expect(logs).toContain("async-done");
    expect(await getOutputText(page)).toBe("Before After");
  });

  test("cancel from callback stops playback and preserves output", async ({ page }) => {
    await gotoScenario(page, "cancel-from-callback");

    const logs = await getLogs(page);
    const status = await getStatus(page);

    expect(status).toBe("cancelled");
    expect(logs.some(l => l.startsWith("text:"))).toBe(true);

    const textLog = logs.find(l => l.startsWith("text:")) ?? "";

    expect(textLog).not.toContain("never");
  });

  test("before and after hooks fire around the command", async ({ page }) => {
    await gotoScenario(page, "before-after-hooks");

    const logs = await getLogs(page);

    expect(logs).toContain("before");
    expect(logs).toContain("after");

    const beforeIndex = logs.indexOf("before");
    const afterIndex = logs.indexOf("after");

    expect(beforeIndex).toBeLessThan(afterIndex);
  });

  test("per-character hook fires once per typed character", async ({ page }) => {
    await gotoScenario(page, "per-char-hook");

    const logs = await getLogs(page);

    expect(logs).toContain("step:0");
    expect(logs).toContain("step:1");
    expect(logs).toHaveLength(2);
  });
});
