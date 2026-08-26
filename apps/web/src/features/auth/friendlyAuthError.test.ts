import { describe, expect, it } from "vitest";

import { friendlyAuthError } from "./friendlyAuthError";

describe("friendlyAuthError", () => {
  it("maps known provider sentinels to human copy", () => {
    expect(friendlyAuthError(new Error("InvalidSecret"))).toBe(
      "That email and password combination doesn't match an account.",
    );
    expect(friendlyAuthError(new Error("InvalidAccountId"))).toBe(
      "That email and password combination doesn't match an account.",
    );
    expect(friendlyAuthError(new Error("Invalid credentials"))).toBe(
      "That email and password combination doesn't match an account.",
    );
    expect(friendlyAuthError(new Error("Account a@b.c already exists"))).toBe(
      "An account with this email already exists. Try signing in instead.",
    );
    expect(friendlyAuthError(new Error("Invalid password"))).toBe(
      "Passwords must be at least 8 characters.",
    );
  });

  it("matches sentinels inside wrapped stack context", () => {
    // A thrown message can arrive wrapped with stack text containing
    // "Password" — the sentinel match must still hit (see module doc).
    expect(friendlyAuthError(new Error("Uncaught InvalidSecret providers/Password.js:42"))).toBe(
      "That email and password combination doesn't match an account.",
    );
  });

  it("never surfaces raw provider strings for unknown errors", () => {
    const generic = friendlyAuthError(new Error("Internal leak: user does not exist"));
    expect(generic).toBe("Something went wrong. Please try again.");
  });

  it("handles non-Error throws and non-strings", () => {
    expect(friendlyAuthError(undefined)).toBe("Something went wrong. Please try again.");
    expect(friendlyAuthError(42)).toBe("Something went wrong. Please try again.");
  });
});
