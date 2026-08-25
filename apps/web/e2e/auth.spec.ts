import { collectConsoleErrors } from "./fixtures/console";
import { createUniqueTestUser, expect, signInViaApi, test } from "./fixtures/auth";

test.describe("auth gate", () => {
  test("unauthenticated users are redirected from protected routes to sign-in", async ({
    page,
  }) => {
    const response = await page.goto("/home");
    expect(response?.url()).toContain("/sign-in");
    // The sign-in page renders its form (CardTitle is a div, not a heading role).
    await expect(page.getByTestId("sign-in-form")).toBeVisible();
  });

  test("a signed-up user reaches the authed app home", async ({ page }) => {
    await signInViaApi(page.request, createUniqueTestUser());
    const response = await page.goto("/home");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  });

  test("the shared authedPage fixture provides an authenticated session", async ({
    authedPage,
  }) => {
    const response = await authedPage.goto("/profile");
    expect(response?.status()).toBe(200);
    await expect(authedPage.getByRole("heading", { name: "Profile" })).toBeVisible();
  });
});

test.describe("auth journeys (UI forms)", () => {
  test("sign-up through the form lands on onboarding step 1", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    const user = createUniqueTestUser();

    await page.goto("/sign-up");
    await expect(page.getByTestId("sign-up-form")).toBeVisible();

    // The confirm-password mismatch guard fires inline before any network call.
    await page.getByTestId("sign-up-email").fill(user.email);
    await page.getByTestId("sign-up-password").fill(user.password);
    await page.getByTestId("sign-up-confirm-password").fill(`${user.password}-typo`);
    await expect(page.getByTestId("sign-up-confirm-error")).toHaveText(
      "Passwords don't match yet.",
    );

    await page.getByTestId("sign-up-confirm-password").fill(user.password);
    await page.getByTestId("sign-up-submit").click();

    // New users land in onboarding (language step), not /home.
    await expect(page).toHaveURL(/\/onboarding\/language$/);
    await expect(page.getByText("Which language are you learning?")).toBeVisible();
    await expect(page.getByText("Step 1 of 4")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("sign-in through the form lands on /home", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    const user = createUniqueTestUser();

    // Seed the account server-side, then drop the cookies so this browser
    // context has to go through the sign-in form like a returning user.
    await signInViaApi(page.request, user, "signUp");
    await page.context().clearCookies();

    await page.goto("/sign-in");
    await expect(page.getByTestId("sign-in-form")).toBeVisible();
    await page.getByTestId("sign-in-email").fill(user.email);
    await page.getByTestId("sign-in-password").fill(user.password);
    await page.getByTestId("sign-in-submit").click();

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("sign-in with a wrong password shows the friendly error and stays put", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    const user = createUniqueTestUser();
    await signInViaApi(page.request, user, "signUp");
    await page.context().clearCookies();

    await page.goto("/sign-in");
    await expect(page.getByTestId("sign-in-form")).toBeVisible();
    await page.getByTestId("sign-in-email").fill(user.email);
    await page.getByTestId("sign-in-password").fill(`${user.password}-wrong`);
    await page.getByTestId("sign-in-submit").click();

    const alert = page.getByTestId("auth-error");
    await expect(alert).toBeVisible();
    // friendlyAuthError maps the provider's "Invalid credentials" to copy
    // that doesn't leak whether the account exists.
    await expect(alert).toContainText(
      "That email and password combination doesn't match an account.",
    );
    await expect(page).toHaveURL(/\/sign-in$/);
    expect(consoleErrors).toEqual([]);
  });
});
