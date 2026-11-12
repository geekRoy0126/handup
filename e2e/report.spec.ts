import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { createSessionFromDashboard, registerHost } from "./helpers";

test("host ends the session, opens the report and downloads it as Markdown", async ({ page, browser }) => {
  await registerHost(page);
  const code = await createSessionFromDashboard(page, "Report test");

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(`/join/${code}`);
  await guest.getByLabel("Your question", { exact: true }).fill("What should we read before next class?");
  await guest.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByRole("article", { name: "What should we read before next class?" })).toBeVisible();
  await guestContext.close();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "End session" }).click();
  await page.getByRole("link", { name: "View report" }).click();

  await expect(page.getByRole("heading", { level: 1, name: /Report test/ })).toBeVisible();
  const top = page.getByRole("region", { name: "Top questions" });
  await expect(top.getByText("What should we read before next class?")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download as Markdown" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`handup-${code}-report.md`);
  const markdown = await readFile(await download.path(), "utf8");
  expect(markdown).toContain("# Report test — session report");
  expect(markdown).toContain("What should we read before next class?");
});
