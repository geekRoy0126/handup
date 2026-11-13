import { expect, test } from "@playwright/test";

import { createSessionFromDashboard, registerHost } from "./helpers";

test("host creates an API key and a developer reads the session summary with it", async ({ page, request }) => {
  await registerHost(page);
  const code = await createSessionFromDashboard(page, "Public API test");

  await page.getByRole("link", { name: "API keys" }).click();
  await page.getByLabel("Key name").fill("Discord bot");
  await page.getByRole("button", { name: "Create key" }).click();
  const key = (await page.getByLabel("Your new API key").inputValue()).trim();
  expect(key).toMatch(/^hu_[0-9A-Za-z]{32}$/);
  await expect(page.getByRole("cell", { name: "Discord bot", exact: true })).toBeVisible();

  const res = await request.get(`/api/v1/public/sessions/${code}/summary`, { headers: { "X-API-Key": key } });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { data: { session: { title: string } } };
  expect(body.data.session.title).toBe("Public API test");
});

test("API docs page loads the OpenAPI spec @smoke", async ({ page, request }) => {
  const spec = await request.get("/openapi.json");
  expect(spec.ok()).toBe(true);
  await page.goto("/api-docs");
  await expect(page).toHaveTitle("HandUp API docs");
  // Swagger UI actually ran: with a wrong integrity hash the browser blocks the script and nothing renders (#63).
  await expect(page.getByText("HandUp API").first()).toBeVisible();
});
