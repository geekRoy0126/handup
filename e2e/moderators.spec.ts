import { expect, test } from "@playwright/test";

import { createSessionFromDashboard, registerHost } from "./helpers";

test("host invites a moderator who hides a question; it disappears for the guest live", async ({ page, browser }) => {
  const modContext = await browser.newContext();
  const mod = await modContext.newPage();
  const modEmail = await registerHost(mod, "Terry TA");

  await registerHost(page);
  const code = await createSessionFromDashboard(page, "Moderated talk");
  await page.getByLabel("Moderator email").fill(modEmail);
  await page.getByRole("button", { name: "Add moderator" }).click();
  await expect(page.getByRole("list", { name: "Moderators" }).getByText("Terry TA")).toBeVisible();

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(`/join/${code}`);
  await guest.getByLabel("Your question", { exact: true }).fill("This question should be hidden");
  await guest.getByRole("button", { name: "Ask" }).click();
  await expect(guest.getByRole("article", { name: "This question should be hidden" })).toBeVisible();

  await mod.goto("/dashboard");
  await mod.getByRole("link", { name: /Moderated talk/ }).click();
  await expect(mod.getByRole("button", { name: "End session" })).toHaveCount(0);
  const modCard = mod.getByRole("article", { name: "This question should be hidden" });
  await modCard.getByRole("button", { name: "Hide" }).click();
  await expect(modCard.getByText("Hidden", { exact: true })).toBeVisible();

  await expect(guest.getByRole("article", { name: "This question should be hidden" })).toHaveCount(0);

  await modContext.close();
  await guestContext.close();
});
