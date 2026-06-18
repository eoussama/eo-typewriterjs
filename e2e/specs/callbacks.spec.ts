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

  test("per-character before hook fires once per typed character", async ({ page }) => {
    await gotoScenario(page, "per-char-before-hook");

    const logs = await getLogs(page);

    expect(logs).toContain("before:0");
    expect(logs).toContain("before:1");
    expect(logs).toHaveLength(2);
  });

  test("cancel from type before hook skips typing and sets cancelled", async ({ page }) => {
    await gotoScenario(page, "cancel-from-type-before");

    const logs = await getLogs(page);
    const status = await getStatus(page);

    expect(logs).toContain("before-fired");
    expect(status).toBe("cancelled");
    expect(await getOutputText(page)).toBe("");
  });

  test("cancel from wait before hook skips wait and after hook", async ({ page }) => {
    await gotoScenario(page, "cancel-from-wait-before");

    const logs = await getLogs(page);
    const status = await getStatus(page);

    expect(logs).toContain("wait-before-fired");
    expect(logs).not.toContain("wait-after-fired");
    expect(status).toBe("cancelled");
    expect(await getOutputText(page)).toBe("Before");
  });

  test("cancel from call before hook skips the callback", async ({ page }) => {
    await gotoScenario(page, "cancel-from-call-before");

    const logs = await getLogs(page);
    const status = await getStatus(page);

    expect(logs).toContain("call-before-fired");
    expect(logs).toContain("callback:false");
    expect(status).toBe("cancelled");
    expect(await getOutputText(page)).toBe("Hello");
  });

  test("delete per-unit before and after hooks fire for each deletion step", async ({ page }) => {
    await gotoScenario(page, "delete-per-unit-hooks");

    const logs = await getLogs(page);

    expect(logs).toContain("del-before:0");
    expect(logs).toContain("del-after:0");
    expect(logs).toContain("del-before:1");
    expect(logs).toContain("del-after:1");
    expect(logs).toContain("del-before:2");
    expect(logs).toContain("del-after:2");
    expect(await getOutputText(page)).toBe("He");
  });

  test("whole-command before and after hooks fire around the entire command", async ({ page }) => {
    await gotoScenario(page, "whole-command-before-after");

    const logs = await getLogs(page);

    expect(logs).toContain("whole-before");
    expect(logs).toContain("whole-after");

    const beforeIdx = logs.indexOf("whole-before");
    const afterIdx = logs.indexOf("whole-after");

    expect(beforeIdx).toBeLessThan(afterIdx);
  });
});
