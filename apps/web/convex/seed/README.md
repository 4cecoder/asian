# convex/seed/

Conversion scripts that turn real, openly-licensed dictionary sources
into JSONL matching the `dictionaryEntries` table in `../schema.ts`.
Generated `.jsonl` files aren't committed (`apps/web/convex/seed/*.jsonl`
is gitignored) — regenerate them from the public sources below, they're
identical output either way.

## Sources

| Language | Source                                                                                                   | License                            | Entries (as imported) |
| -------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------- |
| Japanese | [JMdict](http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz) (EDRDG, English-gloss variant)                    | CC BY-SA 4.0                       | 218,513               |
| Chinese  | [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) (MDBG)                               | CC BY-SA 4.0                       | 124,880               |
| Korean   | [English Wiktionary, Korean section](https://kaikki.org/dictionary/Korean/) (via kaikki.org/Wiktextract) | CC BY-SA 3.0 (+ GFDL dual license) | 34,153                |

All three licenses require attribution (kept in each row's `sourceName`
field). JMdict and CC-CEDICT are share-alike; Wiktionary text is
dual-licensed CC BY-SA + GFDL, so redistributing this processed data
stays under at least one of those — don't relicense it.

## Regenerating and importing

```bash
curl -sL http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz | gunzip > /tmp/JMdict_e
bun run build-jmdict.ts /tmp/JMdict_e > dictionary-ja.jsonl

curl -sL https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz | gunzip > /tmp/cedict.txt
bun run build-cedict.ts /tmp/cedict.txt > dictionary-zh.jsonl

curl -sL -o /tmp/kaikki-ko-en.jsonl \
  https://kaikki.org/dictionary/Korean/kaikki.org-dictionary-Korean.jsonl
bun run build-wiktionary-ko.ts /tmp/kaikki-ko-en.jsonl > dictionary-ko.jsonl

bunx convex import --table dictionaryEntries dictionary-ja.jsonl        # first import: no --append
bunx convex import --table dictionaryEntries --append dictionary-zh.jsonl
bunx convex import --table dictionaryEntries --append dictionary-ko.jsonl
```

## Known data quality issues (TODO — not done, tracked here on purpose)

Imported as-is from the source dictionaries with minimal transformation.
Real gaps, in rough priority order:

1. **No dedup or cross-source reconciliation.** JMdict, CC-CEDICT, and
   the Wiktionary Korean data are imported independently; if the same
   concept exists in more than one (loanwords, shared kanji/hanja),
   there's no linkage between them. (The Korean build does merge multiple
   Wiktionary lines for the _same_ headword into one entry — but that's
   within-source only.)
2. **Frequency data is JMdict-only and sparse.** `frequencyRank` comes
   from JMdict's `nfXX` priority tags, which only cover roughly the top
   24,000 Japanese words — most entries have no `frequencyRank` at all.
   CC-CEDICT has **no frequency data whatsoever** — every Chinese entry
   is unranked. A real "most common words first" learning experience
   needs an external frequency corpus for Chinese (e.g. a subtitle- or
   corpus-based frequency list) before this table is useful for that.
3. **No quality/register filtering.** All three dictionaries mix core
   vocabulary with archaic, rare, dialectal, and vulgar entries at equal
   weight — JMdict's `<misc>` tags (`&obs;`, `&rare;`, `&vulg;`, etc.)
   exist in the source and aren't even parsed into this schema yet, let
   alone used to filter or flag anything. The Korean build drops hanja
   glyph entries and lines without English glosses, but keeps archaic/
   dialectal senses if the gloss carries no qualifier it can detect.
4. **CC-CEDICT: Traditional characters are silently dropped.**
   `headword` stores Simplified only; the schema has no field for
   Traditional at all. Fine for a PRC-oriented default, not fine for a
   platform that should probably serve Taiwan/HK learners too.
5. **CC-CEDICT: pinyin stays in numbered-tone form** (`ni3 hao3`, not
   `nǐ hǎo`) — noted as a deliberate scope cut in `build-cedict.ts`, not
   forgotten, but still a real UX gap for anything rendering pinyin
   directly to a learner.
6. **Korean: no frequency data and mixed-quality coverage.** The
   Wiktionary-derived set has no frequency ranking at all, and its
   coverage of everyday vocabulary is thinner than a professional
   dictionary like Krdict/NIKL would give (Wiktionary skews towards what
   volunteers have written up). A licensed professional source remains
   worth pursuing for both gaps.
7. **No moderation/review status field.** Once community-submitted
   dictionary corrections exist (see the `submissions` table), imported
   entries and user corrections need some way to distinguish "official
   source" from "community-edited" — not modeled yet.

None of this blocks the current scaffold from being useful for early
development, but before this data is the thing real learners see, it
needs a real curation pass — likely: pull in a proper Chinese frequency
list, parse and store JMdict's register/usage tags, add a Traditional
field, find a frequency-ranked/professional Korean source to upgrade the
current one, and add some kind of quality/review tier to the schema
rather than treating every row as equally trustworthy.
