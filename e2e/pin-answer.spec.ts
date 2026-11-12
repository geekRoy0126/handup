import { expect, test } from "@playwright/test";

import { createSessionFromDashboard, registerHost } from "./helpers";

test("host pins a question and marks it answered; the guest sees both live", async ({ page, browser }) => {
  await registerHost(page);
  const code = await createSessionFromDashboard(page, "Pin and answer");

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(`/join/${code}`);
  await guest.getByLabel("Your question", { exact: true }).fill("Can you explain embeddings again?");
  await guest.getByRole("button", { name: "Ask" }).click();

  const hostCard = page.getByRole("article", { name: "Can you explain embeddings again?" });
  await hostCard.getByRole("button", { name: "Pin" }).click();

  const guestCard = guest.getByRole("article", { name: "Can you explain embeddings again?" });
  await expect(guestCard.getByText("Now answering")).toBeVisible();

  await hostCard.getByRole("button", { name: "Mark answered" }).click();
  const answered = guest.getByRole("region", { name: /Answered/ });
  await expect(answered.getByRole("article", { name: "Can you explain embeddings again?" })).toBeVisible();
  await expect(guestCard.getByText("Now answering")).toHaveCount(0);

  await guestContext.close();
});
