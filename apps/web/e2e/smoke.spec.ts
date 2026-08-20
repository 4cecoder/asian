import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("homepage loads with the right title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Asian — Language Learning Platform");
  });

  test("homepage responds 200 and renders without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("404 route renders the not-found page", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response?.status()).toBe(404);
  });
});
