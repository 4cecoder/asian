import { collectConsoleErrors } from "./fixtures/console";
import { expect, test } from "./fixtures/auth";

test.describe("onboarding", () => {
  test("language → goal → placement skip → complete lands on /home", async ({ authedPage }) => {
    const consoleErrors = collectConsoleErrors(authedPage);

    // ── Step 1: language ────────────────────────────────────────────────
    await authedPage.goto("/onboarding/language");
    await expect(authedPage.getByText("Which language are you learning?")).toBeVisible();

    // Radios are sr-only inputs inside clickable label cards.
    const japaneseLabel = authedPage.locator("label").filter({ hasText: "Japanese" });
    await japaneseLabel.click();
    await expect(authedPage.locator('input[name="language"][value="ja"]')).toBeChecked();

    await authedPage.getByRole("button", { name: "Continue" }).click();
    await expect(authedPage).toHaveURL(/\/onboarding\/goal$/);
    await expect(authedPage.getByText("What brings you here?")).toBeVisible();

    // ── Step 2: goal (visible radio inputs on this step) ───────────────
    await authedPage.locator('input[name="goal"][value="travel"]').check();
    await expect(authedPage.locator('input[name="goal"][value="travel"]')).toBeChecked();
    await authedPage.getByRole("button", { name: "Continue" }).click();
    await expect(authedPage).toHaveURL(/\/onboarding\/placement$/);

    // ── Step 3: skip the optional placement check ───────────────────────
    await expect(authedPage.getByText("Optional: a quick placement check")).toBeVisible();
    await authedPage.getByTestId("placement-skip").click();
    await expect(authedPage).toHaveURL(/\/onboarding\/complete$/);

    // ── Step 4: summary reflects both cookie-backed choices, then home ──
    await expect(authedPage.getByText(/Learning Japanese — travel\./)).toBeVisible();
    await authedPage.getByTestId("complete-onboarding").click();
    await expect(authedPage).toHaveURL(/\/home$/);
    await expect(authedPage.getByRole("heading", { name: "Home" })).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test("choices persist via cookies when revisiting an earlier step", async ({ authedPage }) => {
    await authedPage.goto("/onboarding/language");
    const japaneseLabel = authedPage.locator("label").filter({ hasText: "Japanese" });
    await japaneseLabel.click();
    await authedPage.getByRole("button", { name: "Continue" }).click();
    await expect(authedPage).toHaveURL(/\/onboarding\/goal$/);

    // Going back to step 1 must show the saved choice pre-selected — the
    // whole point of the Server-Action cookie persistence.
    await authedPage.goto("/onboarding/language");
    await expect(authedPage.locator('input[name="language"][value="ja"]')).toBeChecked();

    // And the goal page round-trips its choice too.
    await authedPage.goto("/onboarding/goal");
    await authedPage.locator('input[name="goal"][value="media"]').check();
    await authedPage.getByRole("button", { name: "Continue" }).click();
    await expect(authedPage).toHaveURL(/\/onboarding\/placement$/);
    await authedPage.goto("/onboarding/goal");
    await expect(authedPage.locator('input[name="goal"][value="media"]')).toBeChecked();
  });
});
