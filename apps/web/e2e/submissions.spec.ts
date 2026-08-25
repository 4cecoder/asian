import { collectConsoleErrors } from "./fixtures/console";
import { expect, test } from "./fixtures/auth";

test.describe("submissions", () => {
  test("compose + submit a phrase → pending in my submissions; filter chips work", async ({
    authedPage,
  }) => {
    const consoleErrors = collectConsoleErrors(authedPage);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const phraseText = `e2e 인사 ${id}`;
    const phraseEnglish = `E2E greeting ${id}`;

    await authedPage.goto("/submissions");
    await expect(
      authedPage.getByRole("heading", { name: "Contributions", exact: true }),
    ).toBeVisible();

    // ── Composer defaults ───────────────────────────────────────────────
    const typeGroup = authedPage.getByRole("radiogroup", { name: "Submission type" });
    await expect(typeGroup.getByRole("radio", { name: "Phrase" })).toBeChecked();
    const langGroup = authedPage.getByRole("radiogroup", { name: "Submission language" });
    await expect(langGroup.getByRole("radio", { name: "Korean" })).toBeChecked();

    // Required-field validation fires before any network call. Scope to
    // the composer form — Next's route announcer also has role="alert".
    const composer = authedPage.locator("form").filter({
      has: authedPage.getByRole("radiogroup", { name: "Submission type" }),
    });
    // toPass guards the hydration race: a click landing before React
    // attaches onSubmit falls through to a native form reload, and the
    // retried click then hits the hydrated handler.
    await expect(async () => {
      await authedPage.getByRole("button", { name: "Submit contribution" }).click();
      await expect(composer.getByRole("alert")).toContainText("Required: Phrase, English meaning");
    }).toPass({ timeout: 15_000 });

    // Switching language is reflected by the checked radio. The inputs are
    // sr-only, so click the visible label instead of the input.
    await langGroup.locator("label").filter({ hasText: "Japanese" }).click();
    await expect(langGroup.getByRole("radio", { name: "Japanese" })).toBeChecked();

    // Fill the dynamic payload fields for the phrase kind.
    await authedPage.locator("#payload-text").fill(phraseText);
    await authedPage.locator("#payload-english").fill(phraseEnglish);
    await authedPage.locator("#payload-romanization").fill(`annyeong ${id}`);

    // Preview mirrors what will be sent.
    await expect(authedPage.locator("#submission-source-url")).toBeVisible();

    await authedPage.getByRole("button", { name: "Submit contribution" }).click();

    // Success status replaces the alert.
    await expect(
      authedPage
        .getByRole("status")
        .and(authedPage.getByText(/Thanks! Your contribution was submitted/)),
    ).toBeVisible({ timeout: 15_000 });

    // ── My contributions tracks it as a pending Korean phrase ──────────
    const section = authedPage.locator("section[aria-labelledby='my-contributions-heading']");
    const item = section.locator("li").filter({ hasText: phraseText });
    await expect(item).toBeVisible({ timeout: 15_000 });
    await expect(item).toContainText("Phrase · Japanese"); // language we switched to
    await expect(item).toContainText(`${phraseText} — ${phraseEnglish}`);
    await expect(item.getByText("Pending", { exact: true })).toBeVisible();

    // ── Status filter chips ─────────────────────────────────────────────
    const filters = section.getByRole("group", { name: "Filter by status" });

    await filters.getByRole("button", { name: "Approved" }).click();
    await expect(filters.getByRole("button", { name: "Approved" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(section.getByText("No contributions with this status.")).toBeVisible();
    await expect(item).toHaveCount(0);

    await filters.getByRole("button", { name: "Pending" }).click();
    await expect(filters.getByRole("button", { name: "Pending" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(item).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
});
