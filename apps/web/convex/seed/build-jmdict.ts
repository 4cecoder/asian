#!/usr/bin/env bun
/**
 * Converts JMdict (Japanese↔English dictionary, EDRDG, CC BY-SA 4.0) into
 * JSONL matching the `dictionaryEntries` table schema.
 *
 * Source: http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz — the "_e" variant
 * (English glosses only) rather than the multilingual JMdict.gz, since this
 * platform is English→Asian-language.
 *
 * Usage:
 *   curl -sL http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz | gunzip > /tmp/JMdict_e
 *   bun run convex/seed/build-jmdict.ts /tmp/JMdict_e > convex/seed/dictionary-ja.jsonl
 *
 * JMdict's XML declares ~180 POS/field/misc entities inline in its DOCTYPE
 * internal subset (e.g. `<!ENTITY v1 "Ichidan verb">`). A general XML
 * parser needs real DTD support to resolve those; simplest and most
 * reliable given this file's very regular structure is to extract the
 * entity table with a targeted regex and do the rest with straightforward
 * per-entry string extraction — not a full XML parser. This is the
 * pragmatic approach most JMdict tooling actually uses, not a shortcut
 * specific to this script.
 */

const path = process.argv[2];
if (!path) {
  console.error("Usage: bun run build-jmdict.ts <path-to-JMdict_e>");
  process.exit(1);
}

const xml = await Bun.file(path).text();

// 1. Build the entity → description map from the DOCTYPE internal subset.
const entities = new Map<string, string>();
for (const m of xml.matchAll(/<!ENTITY\s+([\w-]+)\s+"([^"]*)">/g)) {
  entities.set(m[1], m[2]);
}
function resolveEntity(raw: string): string {
  // raw looks like "&v1;" — strip the &...; wrapper.
  const code = raw.replace(/^&/, "").replace(/;$/, "");
  return entities.get(code) ?? code;
}

// 2. Walk entries.
const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
let count = 0;
const out: string[] = [];

for (const entryMatch of xml.matchAll(entryRe)) {
  const body = entryMatch[1];

  const kebMatch = body.match(/<keb>([^<]+)<\/keb>/);
  const rebMatch = body.match(/<reb>([^<]+)<\/reb>/);
  if (!rebMatch) continue; // every entry must have a reading; skip if malformed

  const headword = kebMatch ? kebMatch[1] : rebMatch[1];
  const reading = kebMatch ? rebMatch[1] : undefined;

  const glosses = [...body.matchAll(/<gloss[^>]*>([^<]+)<\/gloss>/g)].map((g) => g[1]);
  if (glosses.length === 0) continue;

  const posMatch = body.match(/<pos>(&[\w-]+;)<\/pos>/);
  const partOfSpeech = posMatch ? resolveEntity(posMatch[1]) : undefined;

  // Frequency proxy: JMdict's `nfXX` priority tags (news-frequency bucket,
  // 01 = most common ... 48 = least, in the top ~24000 words). Lower is
  // more frequent, matching this schema's `frequencyRank` convention.
  const nfMatch = body.match(/\b(?:ke_pri|re_pri)>nf(\d\d)</);
  const frequencyRank = nfMatch ? Number.parseInt(nfMatch[1], 10) : undefined;

  out.push(
    JSON.stringify({
      language: "ja",
      headword,
      reading,
      partOfSpeech,
      definitions: glosses,
      frequencyRank,
      sourceName: "JMdict (EDRDG, CC BY-SA 4.0)",
    }),
  );
  count++;
}

console.error(`Parsed ${count} JMdict entries.`);
process.stdout.write(out.join("\n") + "\n");
