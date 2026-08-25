import { collectConsoleErrors } from "./fixtures/console";
import { expect, test } from "./fixtures/auth";

test.describe("review", () => {
  test("a fresh user with nothing due sees the caught-up empty state, console-clean", async ({
    authedPage,
  }) => {
    const consoleErrors = collectConsoleErrors(authedPage);

    await authedPage.goto("/review");
    await expect(authedPage.getByRole("heading", { name: "Review" })).toBeVisible();

    // The session loader resolves into the empty state — a fresh user has
    // no cards, so nothing can be due.
    const caughtUp = authedPage.getByText("Nothing due right now");
    await expect(caughtUp).toBeVisible({ timeout: 15_000 });

    // Meaningful empty-state content, not just the headline.
    await expect(
      authedPage.getByText(/all caught up — new reviews appear as cards come due\./),
    ).toBeVisible();
    await expect(authedPage.getByRole("link", { name: "Browse decks" })).toBeVisible();
    // No card stage and no summary should be showing.
    await expect(authedPage.getByRole("button", { name: "Show answer" })).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
  });
});
