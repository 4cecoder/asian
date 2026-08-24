import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

describe("dictionary.search", () => {
  test("prefix-matches within a language and excludes other languages", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("dictionaryEntries", {
        language: "ja",
        headword: "食べる",
        reading: "たべる",
        definitions: ["to eat"],
        sourceName: "test-fixture",
      });
      await ctx.db.insert("dictionaryEntries", {
        language: "ja",
        headword: "食べ物",
        reading: "たべもの",
        definitions: ["food"],
        sourceName: "test-fixture",
      });
      await ctx.db.insert("dictionaryEntries", {
        language: "zh",
        headword: "食べる", // same string, different language — must not leak across the language boundary
        definitions: ["should not match a ja search"],
        sourceName: "test-fixture",
      });
    });

    const results = await t.query(api.dictionary.search, { language: "ja", prefix: "食べ" });
    expect(new Set(results.map((r) => r.headword))).toEqual(new Set(["食べ物", "食べる"]));
    expect(results.every((r) => r.language === "ja")).toBe(true);
  });

  test("empty or whitespace-only prefix returns nothing rather than the whole table", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("dictionaryEntries", {
        language: "zh",
        headword: "你好",
        definitions: ["hello"],
        sourceName: "test-fixture",
      });
    });

    expect(await t.query(api.dictionary.search, { language: "zh", prefix: "" })).toEqual([]);
    expect(await t.query(api.dictionary.search, { language: "zh", prefix: "   " })).toEqual([]);
  });
});
