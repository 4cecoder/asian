import { collectConsoleErrors } from "./fixtures/console";
import { expect, test } from "./fixtures/auth";

const SEARCH_INPUT = "#dictionary-search-input";
const STATUS_LINE = "p[aria-live='polite']";

test.describe("dictionary", () => {
  test("searching a common Japanese headword returns ranked entries", async ({ authedPage }) => {
    const consoleErrors = collectConsoleErrors(authedPage);

    await authedPage.goto("/dictionary");
    await expect(
      authedPage.getByText("Type to search Japanese entries by headword prefix."),
    ).toBeVisible();

    // 食べる is a JMdict headword; the prefix also matches 食べ物 etc.
    await authedPage.locator(SEARCH_INPUT).fill("食べる");

    const status = authedPage.locator(STATUS_LINE);
    await expect(status).toContainText("for “食べる”", { timeout: 15_000 });
    await expect(status).not.toContainText("Searching…");

    const statusText = (await status.textContent()) ?? "";
    const count = Number.parseInt(statusText, 10);
    expect(Number.isNaN(count)).toBe(false);
    expect(count).toBeGreaterThan(0);

    // The exact headword is among the rendered entry cards.
    await expect(
      authedPage.locator("span[lang='ja']", { hasText: "食べる" }).first(),
    ).toBeVisible();
    // Entries carry at least one gloss definition.
    await expect(authedPage.locator("ol li").first()).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test("a gibberish prefix renders the no-results state", async ({ authedPage }) => {
    const consoleErrors = collectConsoleErrors(authedPage);

    await authedPage.goto("/dictionary");
    await authedPage.locator(SEARCH_INPUT).fill("zzqqxxvv");

    await expect(authedPage.getByText("No Japanese entries match this search.")).toBeVisible({
      timeout: 15_000,
    });
    const status = authedPage.locator(STATUS_LINE);
    await expect(status).toContainText("0 results for “zzqqxxvv”");
    // No entry cards are rendered for a dead-end query.
    await expect(authedPage.locator("ol li")).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
  });

  test("switching to Korean searches real Korean entries", async ({ authedPage }) => {
    const consoleErrors = collectConsoleErrors(authedPage);

    await authedPage.goto("/dictionary");
    await authedPage
      .getByRole("group", { name: "Dictionary language" })
      .getByRole("button", { name: "Korean" })
      .click();

    // 안녕하세요 is a Wiktionary (kaikki) headword; the prefix also
    // matches 안녕 etc.
    await authedPage.locator(SEARCH_INPUT).fill("안녕");

    const status = authedPage.locator(STATUS_LINE);
    await expect(status).toContainText("for “안녕”", { timeout: 15_000 });
    const statusText = (await status.textContent()) ?? "";
    const count = Number.parseInt(statusText, 10);
    expect(Number.isNaN(count)).toBe(false);
    expect(count).toBeGreaterThan(0);

    await expect(authedPage.locator("span[lang='ko']", { hasText: "안녕" }).first()).toBeVisible();

    // The switcher reflects the active language via aria-pressed.
    await expect(
      authedPage
        .getByRole("group", { name: "Dictionary language" })
        .getByRole("button", { name: "Korean" }),
    ).toHaveAttribute("aria-pressed", "true");

    expect(consoleErrors).toEqual([]);
  });
});
