import { collectConsoleErrors } from "./fixtures/console";
import { expect, test } from "./fixtures/auth";

// /phrasebook/:path* is proxy-gated (see src/proxy.ts), so these run authed.

test.describe("phrasebook", () => {
  test("browse grid lists every fixture situation as a link card", async ({ authedPage }) => {
    const consoleErrors = collectConsoleErrors(authedPage);

    await authedPage.goto("/phrasebook");
    const grid = authedPage.getByTestId("situation-grid");
    await expect(grid).toBeVisible();

    // Six fixture situations, each a link into its situation page with a
    // phrase-count summary.
    const cards = grid.getByRole("link");
    await expect(cards).toHaveCount(6);
    for (const title of [
      "Restaurant & Café",
      "Transit & Directions",
      "Shopping",
      "Lodging",
      "Emergencies",
      "Small Talk",
    ]) {
      await expect(grid.getByRole("link", { name: new RegExp(title) })).toBeVisible();
    }
    await expect(grid.getByRole("link", { name: /Restaurant & Café/ })).toHaveAttribute(
      "href",
      "/phrasebook/restaurant",
    );

    expect(consoleErrors).toEqual([]);
  });

  test("situation page shows phrases and language chips filter them", async ({ authedPage }) => {
    const consoleErrors = collectConsoleErrors(authedPage);

    await authedPage.goto("/phrasebook/restaurant");
    await expect(authedPage.getByRole("heading", { name: "Restaurant & Café" })).toBeVisible();

    // All languages: 3 languages × 2 phrases.
    const list = authedPage.getByTestId("phrase-list");
    await expect(list.getByTestId("phrase-card")).toHaveCount(6);

    // Filter to Korean via the chip links (?lang=ko).
    const filter = authedPage.getByTestId("language-filter");
    await filter.getByRole("link", { name: "한국어" }).click();
    await expect(authedPage).toHaveURL(/\/phrasebook\/restaurant\?lang=ko$/);
    await expect(list.getByTestId("phrase-card")).toHaveCount(2);
    // The Korean chips' aria-current marks it active; the Japanese entries are gone.
    await expect(filter.getByRole("link", { name: "한국어" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(list.getByTestId("phrase-translation").first()).toHaveText(
      "두 명 자리 부탁합니다.",
    );
    await expect(list.getByText("二人席をお願いします。")).toHaveCount(0);

    // "All" resets the filter.
    await filter.getByRole("link", { name: "All" }).click();
    await expect(authedPage).not.toHaveURL(/\?lang=/);
    await expect(list.getByTestId("phrase-card")).toHaveCount(6);

    expect(consoleErrors).toEqual([]);
  });

  test("phrase detail renders translation and romanization scheme", async ({ authedPage }) => {
    const consoleErrors = collectConsoleErrors(authedPage);

    await authedPage.goto("/phrasebook/restaurant");
    const list = authedPage.getByTestId("phrase-list");
    await expect(list.getByTestId("phrase-card").first()).toBeVisible();

    // First Japanese phrase card's Details link goes to its stable fixture id.
    await list.locator('a[href="/phrasebook/restaurant/restaurant-ja-01"]').click();
    await expect(authedPage).toHaveURL(/\/phrasebook\/restaurant\/restaurant-ja-01$/);

    // PageHeader description and the card's own description both carry the
    // English phrase — assert inside the detail card.
    const detailCard = authedPage.getByTestId("phrase-card");
    await expect(detailCard.getByText("A table for two, please.")).toBeVisible();
    await expect(authedPage.getByTestId("phrase-translation")).toHaveText("二人席をお願いします。");
    await expect(authedPage.getByText("Futari seki o onegaishimasu.")).toBeVisible();
    await expect(authedPage.getByText("Romanization scheme: Rōmaji")).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test("an unknown situation slug 404s instead of rendering an empty page", async ({
    authedPage,
  }) => {
    const response = await authedPage.goto("/phrasebook/not-a-real-situation");
    expect(response?.status()).toBe(404);
  });
});
