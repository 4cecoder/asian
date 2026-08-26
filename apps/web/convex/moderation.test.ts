import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function seedUserRole(t: ReturnType<typeof convexTest>, role: "moderator" | "admin") {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {});
    await ctx.db.insert("userRoles", { userId, role });
    return userId;
  });
}

describe("moderation.isModerator", () => {
  test("anonymous callers resolve to false instead of throwing", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.moderation.isModerator, {})).resolves.toBe(false);
  });

  test("a signed-in user with no role row is not a moderator", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => await ctx.db.insert("users", {}));
    const asUser = t.withIdentity({ subject: userId });
    await expect(asUser.query(api.moderation.isModerator, {})).resolves.toBe(false);
  });

  test("a moderator resolves to true", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUserRole(t, "moderator");
    const asModerator = t.withIdentity({ subject: userId });
    await expect(asModerator.query(api.moderation.isModerator, {})).resolves.toBe(true);
  });

  test("an admin also resolves to true (both roles may moderate)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUserRole(t, "admin");
    const asAdmin = t.withIdentity({ subject: userId });
    await expect(asAdmin.query(api.moderation.isModerator, {})).resolves.toBe(true);
  });
});
