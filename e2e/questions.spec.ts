import { expect, test } from "@playwright/test";

import { createSessionFromDashboard, joinFromHome, registerHost } from "./helpers";

test("guest joins with a messy code, asks anonymously, and the host sees it", async ({ page, browser }) => {
  await registerHost(page);
  const code = await createSessionFromDashboard(page, "Live Q&A test");

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await joinFromHome(guest, `${code.slice(0, 3).toLowerCase()} ${code.slice(3).toLowerCase()}`);
  await expect(guest.getByRole("heading", { level: 1, name: "Live Q&A test" })).toBeVisible();

  await guest.getByLabel("Your question", { exact: true }).fill("Will the slides be posted?");
  await expect(guest.getByLabel("Ask anonymously")).toBeChecked();
  await guest.getByRole("button", { name: "Ask" }).click();

  const card = guest.getByRole("article").filter({ hasText: "Will the slides be posted?" });
  await expect(card).toBeVisible();
  await expect(card.getByText("Anonymous")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("article").filter({ hasText: "Will the slides be posted?" })).toBeVisible();
  await guestContext.close();
});

test("home page explains an unknown code", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Join code").fill("ZZZ-ZZZ");
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByText("No session with that code.")).toBeVisible();
});
