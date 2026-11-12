import { expect, test } from "@playwright/test";

import { createSessionFromDashboard, registerHost } from "./helpers";

test("host launches a poll, a guest answers live, the host sees results and closes it", async ({ page, browser }) => {
  await registerHost(page);
  const code = await createSessionFromDashboard(page, "Poll test");

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(`/join/${code}`);
  await expect(guest.getByRole("heading", { level: 1, name: "Poll test" })).toBeVisible();

  const panel = page.getByRole("region", { name: "Polls" });
  await panel.getByLabel("Poll question").fill("Which topic next?");
  await panel.getByLabel("Option 1").fill("RAG");
  await panel.getByLabel("Option 2").fill("Agents");
  await panel.getByRole("button", { name: "Launch poll" }).click();

  const card = guest.getByRole("region", { name: "Live poll" });
  await expect(card.getByText("Which topic next?")).toBeVisible();
  await card.getByRole("button", { name: "Agents" }).click();
  await expect(card.getByText("Agents: 1 (100%)")).toBeVisible();

  await expect(panel.getByText("Agents: 1 (100%)")).toBeVisible();
  await panel.getByRole("button", { name: "Close poll" }).click();
  await expect(card.getByText("Poll closed")).toBeVisible();

  await guestContext.close();
});
