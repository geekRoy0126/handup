import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { createSessionFromDashboard, registerHost } from "./helpers";

/** Fails on serious or critical WCAG 2.1 AA violations (AGENTS.md §6.2). */
async function expectNoSeriousViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${label}: ${v.id} (${v.nodes.length})`)).toEqual([]);
}

/** Visits every main page as host and guest, with a pinned question, and runs axe on each (#13, #58). */
async function checkMainPages(page: Page, browser: Browser, colorScheme: "light" | "dark") {
  const tag = (label: string) => `${label} (${colorScheme})`;
  await page.goto("/");
  await expectNoSeriousViolations(page, tag("home"));
  await page.goto("/login");
  await expectNoSeriousViolations(page, tag("login"));

  await registerHost(page);
  await expectNoSeriousViolations(page, tag("dashboard"));
  const code = await createSessionFromDashboard(page, "Accessibility check");

  const guestContext = await browser.newContext({ colorScheme });
  const guest = await guestContext.newPage();
  await guest.goto(`/join/${code}`);
  await guest.getByLabel("Your question", { exact: true }).fill("Is the board accessible?");
  await guest.getByRole("button", { name: "Ask" }).click();
  await expect(guest.getByRole("article", { name: "Is the board accessible?" })).toBeVisible();

  // Pin it so the "Now answering" status colour is on screen for both views.
  const hostCard = page.getByRole("article", { name: "Is the board accessible?" });
  await hostCard.getByRole("button", { name: "Pin" }).click();
  await expect(guest.getByText("Now answering")).toBeVisible();
  await expectNoSeriousViolations(guest, tag("guest board"));
  await expectNoSeriousViolations(page, tag("host console"));

  await page.getByRole("link", { name: "View report" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoSeriousViolations(page, tag("report"));
  await guestContext.close();
}

test("main pages have no serious accessibility violations", async ({ page, browser }) => {
  await checkMainPages(page, browser, "light");
});

test.describe("in dark mode (#58)", () => {
  test.use({ colorScheme: "dark" });

  test("main pages have no serious accessibility violations", async ({ page, browser }) => {
    await checkMainPages(page, browser, "dark");
  });
});

test("host can switch the console to large text for a projector", async ({ page }) => {
  await registerHost(page);
  await createSessionFromDashboard(page, "Projector mode");
  const toggle = page.getByRole("button", { name: "Large text" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("main")).toHaveAttribute("data-large-text", "true");
});
