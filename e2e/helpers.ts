import { expect, type Page } from "@playwright/test";

export function uniqueEmail(prefix = "host"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Registers a new host through the UI and leaves the page on /dashboard. */
export async function registerHost(page: Page, name = "Dana Host"): Promise<string> {
  const email = uniqueEmail();
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}

/** From /dashboard, creates a session and waits for its host console. Returns the join code. */
export async function createSessionFromDashboard(page: Page, title: string): Promise<string> {
  await page.getByLabel("Session title").fill(title);
  await page.getByRole("button", { name: "Create session" }).click();
  await expect(page).toHaveURL(/\/host\/[A-Z0-9]{6}$/);
  return page.url().split("/").pop() ?? "";
}
