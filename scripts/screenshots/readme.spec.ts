import { devices, expect, test } from "@playwright/test";

import { createSessionFromDashboard, registerHost } from "../../e2e/helpers";

const OUT = "docs/screenshots";

test("capture README screenshots", async ({ page, browser }) => {
  await page.goto("/");
  await page.screenshot({ path: `${OUT}/home.png` });

  await registerHost(page, "Dr. Rivera");
  const code = await createSessionFromDashboard(page, "CS6983 Lecture 9: AI agents");

  const phone = await browser.newContext({ ...devices["Pixel 7"] });
  const guests = await Promise.all([1, 2, 3].map(() => browser.newContext()));
  const guestPages = await Promise.all(guests.map((c) => c.newPage()));
  for (const g of guestPages) await g.goto(`/join/${code}`);

  const questions: [number, string, string | null][] = [
    [0, "How is an agent different from a chain of prompts?", null],
    [1, "Will the slides be posted after class?", "Maya"],
    [2, "Can agents call tools in parallel?", null],
    [0, "What should we read before the next lecture?", null],
  ];
  for (const [i, text, name] of questions) {
    const g = guestPages[i]!;
    if (name) {
      await g.getByLabel("Ask anonymously").uncheck();
      await g.getByLabel("Your name (optional)").fill(name);
    }
    await g.getByLabel("Your question", { exact: true }).fill(text);
    await g.getByRole("button", { name: "Ask" }).click();
    await expect(g.getByRole("article", { name: text })).toBeVisible();
  }
  for (const [voter, text] of [
    [1, "How is an agent different from a chain of prompts?"],
    [2, "How is an agent different from a chain of prompts?"],
    [0, "Can agents call tools in parallel?"],
  ] as const) {
    const card = guestPages[voter]!.getByRole("article", { name: text });
    await card.getByRole("button", { name: /Upvote/ }).click();
    await expect(page.getByRole("article", { name: text }).getByText(/vote/)).toBeVisible();
  }

  await page.getByRole("article", { name: "Can agents call tools in parallel?" }).getByRole("button", { name: "Pin" }).click();
  const panel = page.getByRole("region", { name: "Polls" });
  await panel.getByRole("radio", { name: "Confidence 1–5" }).check();
  await panel.getByLabel("Poll question").fill("How clear was the agent loop explanation?");
  await panel.getByRole("button", { name: "Launch poll" }).click();
  for (const [i, label] of [[0, "4"], [1, "5 – Got it"], [2, "3 – Getting there"]] as const) {
    await guestPages[i]!.getByRole("region", { name: "Live poll" }).getByRole("button", { name: label }).click();
  }
  await expect(panel.getByText("3 responses")).toBeVisible();
  await page.screenshot({ path: `${OUT}/host-console.png`, fullPage: true });

  const mobile = await phone.newPage();
  await mobile.goto(`/join/${code}`);
  await expect(mobile.getByRole("region", { name: "Live poll" })).toBeVisible();
  await mobile.screenshot({ path: `${OUT}/guest-phone.png`, fullPage: true });

  await page.getByRole("link", { name: "View report" }).click();
  await expect(page.getByRole("region", { name: "Top questions" })).toBeVisible();
  await page.screenshot({ path: `${OUT}/report.png`, fullPage: true });

  await page.goto("/api-docs");
  await expect(page.getByText("HandUp API")).toBeVisible();
  await page.screenshot({ path: `${OUT}/api-docs.png` });

  await phone.close();
  for (const c of guests) await c.close();
});
