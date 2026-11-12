import { expect, test } from "@playwright/test";

import { createSessionFromDashboard, registerHost } from "./helpers";

test("host merges a duplicate; guests see one question with combined votes", async ({ page, browser }) => {
  await registerHost(page);
  const code = await createSessionFromDashboard(page, "Merge duplicates");

  const askerContext = await browser.newContext();
  const voterContext = await browser.newContext();
  const asker = await askerContext.newPage();
  const voter = await voterContext.newPage();
  await asker.goto(`/join/${code}`);
  await voter.goto(`/join/${code}`);

  for (const text of ["When is the midterm?", "What date is the midterm exam?"]) {
    await asker.getByLabel("Your question", { exact: true }).fill(text);
    await asker.getByRole("button", { name: "Ask" }).click();
    await expect(asker.getByRole("article", { name: text })).toBeVisible();
  }
  const duplicate = voter.getByRole("article", { name: "What date is the midterm exam?" });
  await duplicate.getByRole("button", { name: /Upvote/ }).click();
  await expect(duplicate.getByRole("button", { name: /Upvote/ })).toHaveAttribute("aria-pressed", "true");

  const hostCard = page.getByRole("article", { name: "What date is the midterm exam?" });
  // Wait until the server has the vote (the host sees it via SSE); the voter's button updates optimistically.
  await expect(hostCard.getByText("1 vote")).toBeVisible();
  await hostCard.getByLabel("Merge into").selectOption({ label: "When is the midterm?" });
  await hostCard.getByRole("button", { name: "Merge" }).click();

  await expect(voter.getByRole("article", { name: "What date is the midterm exam?" })).toHaveCount(0);
  const kept = voter.getByRole("article", { name: "When is the midterm?" });
  await expect(kept.getByText("+1 merged")).toBeVisible();
  await expect(kept.getByRole("button", { name: /1 vote/ })).toHaveAttribute("aria-pressed", "true");

  await askerContext.close();
  await voterContext.close();
});
