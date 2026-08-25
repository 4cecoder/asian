import { collectConsoleErrors } from "./fixtures/console";
import { expect, test } from "./fixtures/auth";

function uniqueDeckTitle(): string {
  return `E2E Deck ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe("decks", () => {
  test("list renders a loaded terminal state (empty or populated)", async ({ authedPage }) => {
    const consoleErrors = collectConsoleErrors(authedPage);

    await authedPage.goto("/decks");
    await expect(authedPage.getByRole("heading", { name: "Decks" })).toBeVisible();

    // The skeleton grid must resolve into one of the two terminal states.
    // `decks.list` shows everyone's public decks plus our own, so on the
    // shared live deployment other users' decks may legitimately be present —
    // both states are valid; being stuck loading is not.
    await expect(authedPage.getByTestId("decks-loading")).toBeHidden({ timeout: 15_000 });

    if (await authedPage.getByText("No decks yet").isVisible()) {
      // Empty state: must offer the create-deck path.
      await expect(authedPage.getByText("Create your first deck to start studying.")).toBeVisible();
      await expect(authedPage.getByRole("link", { name: "New deck" }).first()).toHaveAttribute(
        "href",
        "/decks/new",
      );
    } else {
      await expect(
        authedPage.locator('a[href^="/decks/"]:not([href="/decks/new"])').first(),
      ).toBeAttached();
    }
    expect(consoleErrors).toEqual([]);
  });

  test("create a deck via /decks/new and land on its detail page", async ({ authedPage }) => {
    const consoleErrors = collectConsoleErrors(authedPage);
    const title = uniqueDeckTitle();

    await authedPage.goto("/decks/new");
    await expect(authedPage.getByText("Create a deck manually", { exact: true })).toBeVisible();

    // Client-side validation first: the title input is natively required,
    // so submitting empty blocks at the browser level (no mutation fired).
    const titleInput = authedPage.locator("#deck-title");
    await authedPage.getByRole("button", { name: "Create deck" }).click();
    await expect(titleInput).toHaveJSProperty("validity.valueMissing", true);
    await expect(titleInput).toHaveJSProperty("validationMessage", "Please fill out this field.");
    await expect(authedPage).toHaveURL(/\/decks\/new$/);

    await titleInput.fill(title);
    await authedPage.locator("#deck-language").selectOption("ja");
    // Private keeps this run's data out of every other user's list.
    await authedPage.locator("#deck-visibility").selectOption("private");
    await authedPage.getByRole("button", { name: "Create deck" }).click();

    // Creation navigates to /decks/<32-char convex id>.
    await expect(authedPage).toHaveURL(/\/decks\/[a-z0-9]{32}$/, { timeout: 15_000 });

    // Detail page: header, metadata, and the empty-cards state.
    await expect(authedPage.getByRole("heading", { name: title })).toBeVisible();
    await expect(authedPage.getByText("0 cards in this deck")).toBeVisible();
    await expect(authedPage.getByText("Japanese", { exact: true })).toBeVisible();
    await expect(authedPage.getByText("Private", { exact: true })).toBeVisible();
    await expect(authedPage.getByText("No cards in this deck yet")).toBeVisible();
    // No "Start review" CTA for an empty deck.
    await expect(authedPage.getByRole("link", { name: "Start review" })).toHaveCount(0);

    // Our private deck shows up in our own list view.
    await authedPage.goto("/decks");
    await expect(authedPage.getByTestId("decks-loading")).toBeHidden({ timeout: 15_000 });
    await expect(authedPage.getByRole("link", { name: title })).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test("an unknown deck id degrades gracefully, not into a crash", async ({ authedPage }) => {
    // Passes DeckDetail's 32-char shape check but fails Convex's own id
    // checksum, so decks:get rejects with ArgumentValidationError.
    // DecksErrorBoundary must catch it and render its recovery card.
    //
    // Note: no zero-console-error assertion here — this IS the error path,
    // and the Convex react client + boundary log the rejected query by
    // design. What matters is that the user gets recoverable UI, which the
    // assertions below verify.
    await authedPage.goto(`/decks/${"a".repeat(32)}`);
    await expect(authedPage.getByText("Something went wrong loading deck data.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(authedPage.getByText(/Value does not match validator/)).toBeAttached();
    await expect(authedPage.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});
