/**
 * Maps errors thrown by the Convex Auth Password provider to copy a human
 * would want to read. Unknown errors fall through to a generic message —
 * never surface raw provider strings (they can leak whether an account
 * exists in edge cases we haven't audited).
 *
 * Known provider messages (verified against @convex-dev/auth 0.0.95
 * source: providers/Password.js + implementation/mutations/
 * retrieveAccountWithCredentials.js):
 * - "InvalidSecret" / "InvalidAccountId" — thrown verbatim by
 *   retrieveAccount for a wrong password / no such account on sign-in
 * - "Invalid password" (fails default ≥8-char requirement)
 * - "Account <email> already exists" (sign-up with a taken email)
 *
 * Note: a thrown message can arrive client-side wrapped with stack
 * context that itself contains "Password" (e.g. "…providers/Password.ts…"),
 * so match the exact sentinel strings above rather than substrings like
 * "password".
 */
export function friendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("Invalid credentials") ||
    message.includes("InvalidSecret") ||
    message.includes("InvalidAccountId")
  ) {
    return "That email and password combination doesn't match an account.";
  }
  if (message.includes("already exists")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (message.includes("Invalid password")) {
    return "Passwords must be at least 8 characters.";
  }

  return "Something went wrong. Please try again.";
}
