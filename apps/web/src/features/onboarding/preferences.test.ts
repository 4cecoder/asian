import { describe, expect, it } from "vitest";

import {
  GOAL_OPTIONS,
  LANGUAGE_OPTIONS,
  ONBOARDING_GOALS,
  ONBOARDING_LANGUAGES,
  parseOnboardingGoal,
  parseOnboardingLanguage,
} from "./preferences";

describe("parseOnboardingLanguage", () => {
  it("accepts every picker option value", () => {
    for (const option of LANGUAGE_OPTIONS) {
      expect(parseOnboardingLanguage(option.value)).toBe(option.value);
    }
    // Same values as the union (order may differ; picker shows ko first).
    expect([...LANGUAGE_OPTIONS.map((o) => o.value)].sort()).toEqual(
      [...ONBOARDING_LANGUAGES].sort(),
    );
  });

  it("rejects empty and malformed input", () => {
    expect(parseOnboardingLanguage(undefined)).toBeNull();
    expect(parseOnboardingLanguage(null)).toBeNull();
    expect(parseOnboardingLanguage("")).toBeNull();
    // Valid schema languages that onboarding doesn't offer yet.
    expect(parseOnboardingLanguage("th")).toBeNull();
    expect(parseOnboardingLanguage("vi")).toBeNull();
    expect(parseOnboardingLanguage("korean")).toBeNull();
    expect(parseOnboardingLanguage("KO")).toBeNull();
    expect(parseOnboardingLanguage({})).toBeNull();
  });
});

describe("parseOnboardingGoal", () => {
  it("accepts every goal option value", () => {
    for (const option of GOAL_OPTIONS) {
      expect(parseOnboardingGoal(option.value)).toBe(option.value);
    }
    expect(GOAL_OPTIONS.map((o) => o.value)).toEqual([...ONBOARDING_GOALS]);
  });

  it("rejects empty and malformed input", () => {
    expect(parseOnboardingGoal(undefined)).toBeNull();
    expect(parseOnboardingGoal(null)).toBeNull();
    expect(parseOnboardingGoal("")).toBeNull();
    expect(parseOnboardingGoal("Travel")).toBeNull();
    expect(parseOnboardingGoal("vacation")).toBeNull();
    expect(parseOnboardingGoal(42)).toBeNull();
  });
});
