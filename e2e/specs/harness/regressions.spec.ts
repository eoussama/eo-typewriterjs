import { expect, test } from "@playwright/test";

import { getLogs, getOutputLocator, getOutputText, getStatus, gotoScenario } from "../../helpers/harness.helper";



test.describe("regressions", () => {
  test("typing, deleting and moving each play their own channel, pitch-shifted", async ({ page }) => {
    await gotoScenario(page, "audio-channels");

    expect(await getLogs(page)).toEqual(["typing:false,typing:false,move:false,delete:false"]);
  });

  test("deleting by grapheme never splits emoji", async ({ page }) => {
    await gotoScenario(page, "grapheme-delete");

    expect(await getOutputText(page)).toBe("a");
  });

  test("the string renderer produces plain and ANSI text", async ({ page }) => {
    await gotoScenario(page, "string-renderer");

    expect(await getOutputText(page)).toBe("Hello");
    expect(await getLogs(page)).toEqual([JSON.stringify("\u001B[1mHello\u001B[0m")]);
  });

  test("a throwing callback rejects play and cancels playback", async ({ page }) => {
    await gotoScenario(page, "hook-error");

    expect(await getLogs(page)).toEqual(["hook failed"]);
    expect(await getStatus(page)).toBe("cancelled");
    expect(await getOutputText(page)).toBe("ab");
  });

  test("hooks keep firing after a pause and resume", async ({ page }) => {
    await gotoScenario(page, "pause-resume-hooks");

    expect(await getLogs(page)).toEqual(["after:0", "after:1", "after:2", "after:3"]);
    expect(await getOutputText(page)).toBe("abcd");
  });

  test("a cursor hidden before playing stays hidden on replay", async ({ page }) => {
    await gotoScenario(page, "cursor-change-survives-replay");

    expect(await getLogs(page)).toEqual(["cursors:0", "status:true"]);
  });

  test("the cursor shows on an empty document", async ({ page }) => {
    await gotoScenario(page, "empty-document-cursor");

    expect(await getLogs(page)).toEqual(["cursors:1"]);
    await expect(getOutputLocator(page).locator(".typewriter-cursor")).toHaveCount(1);
  });
});
