import { expect, test } from "@playwright/test";

import { createSessionFromDashboard, registerHost } from "./helpers";

test("questions and votes appear live for other guests and the host, ranked by votes", async ({ page, browser }) => {
  await registerHost(page);
  const code = await createSessionFromDashboard(page, "Live ranking");

  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alice = await aliceContext.newPage();
  const bob = await bobContext.newPage();
  await alice.goto(`/join/${code}`);
  await bob.goto(`/join/${code}`);

  for (const text of ["First question from Alice", "Second question from Alice"]) {
    await alice.getByLabel("Your question", { exact: true }).fill(text);
    await alice.getByRole("button", { name: "Ask" }).click();
    await expect(alice.getByRole("article", { name: text })).toBeVisible();
  }

  // Bob sees Alice's questions without reloading (SSE), and Alice cannot vote on her own.
  const second = bob.getByRole("article", { name: "Second question from Alice" });
  await expect(second).toBeVisible();
  await expect(alice.getByRole("article", { name: "First question from Alice" }).getByRole("button", { name: /Your question/ })).toBeDisabled();

  await second.getByRole("button", { name: /Upvote/ }).click();
  await expect(second.getByRole("button", { name: /Upvote/ })).toHaveAttribute("aria-pressed", "true");

  // The host's board re-ranks live: the upvoted question moves to the top with 1 vote.
  const hostCards = page.getByRole("region", { name: "Questions" }).getByRole("article");
  await expect(hostCards.first()).toHaveAccessibleName("Second question from Alice");
  await expect(hostCards.first().getByText("1 vote")).toBeVisible();

  await aliceContext.close();
  await bobContext.close();
});
