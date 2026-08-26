import { describe, expect, test } from "vitest";

import { goalLabel, languageLabel } from "./labels";

describe("profile labels", () => {
  test("language values map to their picker English labels", () => {
    expect(languageLabel("ja")).toBe("Japanese");
    expect(languageLabel("ko")).toBe("Korean");
    expect(languageLabel("zh")).toBe("Chinese");
  });

  test("languages outside the onboarding pickers pass through raw", () => {
    // The schema-wide union allows th/vi even though onboarding never
    // offers them — an honest raw value beats a guessed label.
    expect(languageLabel("th")).toBe("th");
    expect(languageLabel("vi")).toBe("vi");
  });

  test("goal values map to their picker labels", () => {
    expect(goalLabel("travel")).toBe("Travel");
    expect(goalLabel("work")).toBe("Work");
    expect(goalLabel("family")).toBe("Family & friends");
    expect(goalLabel("media")).toBe("Media & hobbies");
  });

  test("unknown goal values pass through raw", () => {
    expect(goalLabel("something-else")).toBe("something-else");
  });
});
