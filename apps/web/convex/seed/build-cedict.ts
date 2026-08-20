#!/usr/bin/env bun
/**
 * Converts CC-CEDICT (Chinese↔English dictionary, MDBG, CC BY-SA 4.0) into
 * JSONL matching the `dictionaryEntries` table schema.
 *
 * Source: https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz
 *
 * Usage:
 *   curl -sL https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz | gunzip > /tmp/cedict.txt
 *   bun run convex/seed/build-cedict.ts /tmp/cedict.txt > convex/seed/dictionary-zh.jsonl
 *
 * Line format: `Traditional Simplified [pin1 yin1] /definition 1/definition 2/`
 * Uses Simplified as the headword (dominant in modern PRC-oriented
 * learning materials; Traditional isn't modeled in this schema yet — see
 * this script's header note if that becomes a real requirement). Pinyin
 * kept in CC-CEDICT's numbered-tone form (e.g. "ni3 hao3"), not converted
 * to diacritics — a reasonable follow-up, not done here to keep this pass
 * bounded and low-risk.
 */

const path = process.argv[2];
if (!path) {
  console.error("Usage: bun run build-cedict.ts <path-to-cedict.txt>");
  process.exit(1);
}

const text = await Bun.file(path).text();
const lineRe = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/;

let count = 0;
const out: string[] = [];

for (const rawLine of text.split(/\r?\n/)) {
  const line = rawLine.trimEnd(); // source file uses CRLF line endings
  if (line.startsWith("#") || line.trim() === "") continue;

  const m = line.match(lineRe);
  if (!m) continue;

  const [, , simplified, pinyin, defsRaw] = m;
  const definitions = defsRaw.split("/").filter((d) => d.length > 0);
  if (definitions.length === 0) continue;

  out.push(
    JSON.stringify({
      language: "zh",
      headword: simplified,
      reading: pinyin,
      definitions,
      sourceName: "CC-CEDICT (MDBG, CC BY-SA 4.0)",
    }),
  );
  count++;
}

console.error(`Parsed ${count} CC-CEDICT entries.`);
process.stdout.write(out.join("\n") + "\n");
