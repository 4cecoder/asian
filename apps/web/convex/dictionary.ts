import { v } from "convex/values";
import { query } from "./_generated/server";

const MAX_RESULTS = 25;

export const search = query({
  args: {
    language: v.union(
      v.literal("ja"),
      v.literal("ko"),
      v.literal("zh"),
      v.literal("th"),
      v.literal("vi"),
    ),
    prefix: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.prefix.trim();
    if (trimmed.length === 0) return [];

    // Range query on the by_language_headword index: everything with
    // headword >= prefix and < prefix+"￿" is a prefix match, without
    // scanning the whole (377k-row) table.
    return await ctx.db
      .query("dictionaryEntries")
      .withIndex("by_language_headword", (q) =>
        q
          .eq("language", args.language)
          .gte("headword", trimmed)
          .lt("headword", trimmed + "￿"),
      )
      .take(MAX_RESULTS);
  },
});
