import type { Page } from "@playwright/test";

/**
 * Shared console-error collection for journey specs.
 *
 * Policy: zero tolerance — every console error fails the test — except
 * entries listed here with the evidence that makes them benign. Keep the
 * list short and justified; do not add filters to make a failing test
 * pass without documenting why the error is expected.
 */
const BENIGN_CONSOLE_ERRORS: readonly { match: string; reason: string }[] = [
  {
    match: "the server responded with a status of 400",
    reason:
      "Tests that deliberately submit wrong credentials expect the auth endpoint to answer 400; Chromium logs every non-2xx response as a console resource error regardless of how the app handles it.",
  },
];

/** Subscribe to `page` console errors and return the live array of non-benign messages. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (BENIGN_CONSOLE_ERRORS.some((benign) => text.includes(benign.match))) return;
    errors.push(text);
  });
  return errors;
}
