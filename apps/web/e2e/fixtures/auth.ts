import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Authed-user test setup for apps/web.
 *
 * Convex Auth (Password provider) exposes its HTTP routes at /api/auth
 * (see convex/http.ts). Posting the same `{ action: "auth:signIn", args }`
 * body the client library posts performs the signUp/signIn flow server-side
 * and sets the httpOnly auth cookies on the response — and because
 * `page.request` shares cookie storage with the browser context, a
 * subsequent `page.goto()` is authenticated with no UI form needed.
 *
 * Users are synthetic-only (`@e2e.asian.test`), created fresh per call so
 * tests never depend on shared state in the deployment.
 */

const E2E_EMAIL_DOMAIN = "e2e.asian.test";

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

/** A unique user per call — Convex Auth requires unique emails and >=8-char passwords. */
export function createUniqueTestUser(): TestUser {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `E2E User ${id}`,
    email: `user-${id}@${E2E_EMAIL_DOMAIN}`,
    password: `e2e-pass-${id}`,
  };
}

export async function signInViaApi(
  request: APIRequestContext,
  user: TestUser,
  flow: "signUp" | "signIn" = "signUp",
): Promise<void> {
  const response = await request.post("/api/auth", {
    data: {
      action: "auth:signIn",
      args: {
        provider: "password",
        params: { flow, ...user },
      },
    },
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Auth ${flow} failed (${response.status()}): ${body}`);
  }
}

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await signInViaApi(page.request, createUniqueTestUser());
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's fixture callback receives a function literally named `use`; the hook rule can't know that.
    await use(page);
  },
});

export { expect };
