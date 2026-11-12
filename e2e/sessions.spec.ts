import { expect, test } from "@playwright/test";

import { createSessionFromDashboard, registerHost } from "./helpers";

test("host creates a session, sees the join code, finds it on the dashboard and ends it", async ({ page }) => {
  await registerHost(page);
  const code = await createSessionFromDashboard(page, "CS6983 Lecture 9");

  await expect(page.getByRole("heading", { level: 1, name: "CS6983 Lecture 9" })).toBeVisible();
  await expect(page.getByText(`${code.slice(0, 3)}-${code.slice(3)}`)).toBeVisible();

  await page.getByRole("link", { name: "Sessions" }).click();
  await expect(page.getByRole("link", { name: /CS6983 Lecture 9/ })).toBeVisible();

  await page.getByRole("link", { name: /CS6983 Lecture 9/ }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "End session" }).click();
  await expect(page.getByText("Ended", { exact: true })).toBeVisible();
});
