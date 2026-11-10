import { expect, test } from "@playwright/test";

test("home page shows the product name @smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "HandUp" })).toBeVisible();
});

test("health endpoint responds @smoke", async ({ request }) => {
  const res = await request.get("/api/v1/health");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ data: { status: "ok" } });
});
