import { internalMutation } from "../_generated/server";

/**
 * Seed data for the Track 10 phrasebook (`phrases` table) — the same
 * hand-written travel phrases as src/features/phrasebook/fixtures.ts.
 *
 * The content is duplicated rather than imported because Convex only
 * bundles files under `convex/` (src/features is outside its build root).
 * If you add a phrase or situation, update BOTH files: this one (what dev
 * deployments serve) and fixtures.ts (what tests/fallback render). All
 * content is invented for dev/tests — no scraped/licensed material.
 *
 * Slugs follow the `{situation}-{lang}-{nn}` convention that
 * /phrasebook/[situation]/[phraseId] routes and the e2e suite rely on —
 * see schema.ts's phrases table note. Insertion order matters within a
 * (situation, language) pair: nn follows the array order below.
 *
 * Idempotent: rows whose slug already exists are skipped, so re-running
 * against a seeded deployment is a no-op.
 *
 * Run against a dev deployment with:
 *   bunx convex run seed/phrases:seedPhrases
 */
export const seedPhrases = internalMutation({
  args: {},
  handler: async (ctx) => {
    type SeedPhrase = {
      slug: string;
      language: "ja" | "ko" | "zh";
      situation: string;
      english: string;
      translation: string;
      romanization?: string;
    };

    const phrases = (
      situation: string,
      language: "ja" | "ko" | "zh",
      entries: Array<[english: string, translation: string, romanization?: string]>,
    ): SeedPhrase[] =>
      entries.map(([english, translation, romanization], i) => ({
        slug: `${situation}-${language}-${String(i + 1).padStart(2, "0")}`,
        language,
        situation,
        english,
        translation,
        ...(romanization !== undefined ? { romanization } : {}),
      }));

    const seedPhrasesData: SeedPhrase[] = [
      // ── Restaurant ────────────────────────────────────────────────────
      ...phrases("restaurant", "ja", [
        ["A table for two, please.", "二人席をお願いします。", "Futari seki o onegaishimasu."],
        ["The check, please.", "お会計をお願いします。", "O-kaikei o onegaishimasu."],
      ]),
      ...phrases("restaurant", "ko", [
        ["A table for two, please.", "두 명 자리 부탁합니다.", "Du myeong jari butakhamnida."],
        ["This is delicious!", "너무 맛있어요!", "Neomu masisseoyo!"],
      ]),
      ...phrases("restaurant", "zh", [
        [
          "A table for two, please.",
          "请给我们一张两人桌。",
          "Qǐng gěi wǒmen yī zhāng liǎng rén zhuō.",
        ],
        ["The check, please.", "买单，谢谢。", "Mǎidān, xièxie."],
      ]),

      // ── Transit ───────────────────────────────────────────────────────
      ...phrases("transit", "ja", [
        ["Where is the train station?", "駅はどこですか？", "Eki wa doko desu ka?"],
        [
          "Does this train stop at Tokyo Station?",
          "この電車は東京駅に止まりますか？",
          "Kono densha wa Tōkyō-eki ni tomarimasu ka?",
        ],
      ]),
      ...phrases("transit", "ko", [
        ["Where is the subway station?", "지하철역이 어디예요?", "Jihacheollyeogi eodiyeyo?"],
        ["Please take me to this address.", "이 주소로 가 주세요.", "I jusoro ga juseyo."],
      ]),
      ...phrases("transit", "zh", [
        ["Which line goes to the airport?", "哪条线去机场？", "Nǎ tiáo xiàn qù jīchǎng?"],
        [
          "How much is a ticket to Beijing?",
          "去北京的票多少钱？",
          "Qù Běijīng de piào duōshao qián?",
        ],
      ]),

      // ── Shopping ──────────────────────────────────────────────────────
      ...phrases("shopping", "ja", [
        ["How much is this?", "これはいくらですか？", "Kore wa ikura desu ka?"],
        ["Can I try it on?", "試着できますか？", "Shichaku dekimasu ka?"],
      ]),
      ...phrases("shopping", "ko", [
        [
          "Do you have this in a larger size?",
          "이거 더 큰 사이즈 있어요?",
          "Igeo deo keun saijeu isseoyo?",
        ],
        ["It's too expensive.", "너무 비싸요.", "Neomu bissayo."],
      ]),
      ...phrases("shopping", "zh", [
        ["Can you give me a discount?", "能便宜一点吗？", "Néng piányi yīdiǎn ma?"],
        [
          "I'm just looking, thanks.",
          "我只是随便看看，谢谢。",
          "Wǒ zhǐshì suíbiàn kànkàn, xièxie.",
        ],
      ]),

      // ── Lodging ───────────────────────────────────────────────────────
      ...phrases("lodging", "ja", [
        [
          "I have a reservation under Smith.",
          "スミスという名前で予約しています。",
          "Sumisu to iu namae de yoyaku shite imasu.",
        ],
        ["What time is checkout?", "チェックアウトは何時ですか？", "Chekkuauto wa nanji desu ka?"],
      ]),
      ...phrases("lodging", "ko", [
        ["Is breakfast included?", "조식이 포함되어 있나요?", "Josigi pohamdoeo innayo?"],
        [
          "Could I get an extra blanket?",
          "담요 하나 더 주실 수 있나요?",
          "Damyo hana deo jusil su itnayo?",
        ],
      ]),
      ...phrases("lodging", "zh", [
        ["The air conditioning isn't working.", "空调坏了。", "Kōngtiáo huài le."],
        ["What's the Wi-Fi password?", "Wi-Fi 密码是什么？", "Wi-Fi mìmǎ shì shénme?"],
      ]),

      // ── Emergencies ───────────────────────────────────────────────────
      ...phrases("emergencies", "ja", [
        ["Call an ambulance, please!", "救急車を呼んでください！", "Kyūkyūsha o yonde kudasai!"],
        ["I lost my passport.", "パスポートをなくしました。", "Pasupōto o nakushimashita."],
      ]),
      ...phrases("emergencies", "ko", [
        [
          "Where is the nearest hospital?",
          "가장 가까운 병원이 어디예요?",
          "Gajang gakkaun byeongwoni eodiyeyo?",
        ],
        ["Help me, please!", "도와주세요!", "Dowajuseyo!"],
      ]),
      ...phrases("emergencies", "zh", [
        ["I need to see a doctor.", "我需要看医生。", "Wǒ xūyào kàn yīshēng."],
        ["I lost my wallet.", "我的钱包丢了。", "Wǒ de qiánbāo diū le."],
      ]),

      // ── Small talk ────────────────────────────────────────────────────
      ...phrases("smalltalk", "ja", [
        ["Nice to meet you.", "はじめまして。", "Hajimemashite."],
        ["Where are you from?", "どちらから来ましたか？", "Dochira kara kimashita ka?"],
      ]),
      ...phrases("smalltalk", "ko", [
        ["Nice to meet you.", "만나서 반갑습니다.", "Mannaseo bangapseumnida."],
        ["I've been here three days.", "한 지 삼 일 됐어요.", "Han ji sam il dwaesseoyo."],
      ]),
      ...phrases("smalltalk", "zh", [
        ["Your city is beautiful.", "你们的城市真漂亮。", "Nǐmen de chéngshì zhēn piàoliang."],
        [
          "I've been studying Chinese for six months.",
          "我学中文半年了。",
          "Wǒ xué Zhōngwén bàn nián le.",
        ],
      ]),
    ];

    let inserted = 0;
    let skipped = 0;
    for (const phrase of seedPhrasesData) {
      const existing = await ctx.db
        .query("phrases")
        .withIndex("by_slug", (q) => q.eq("slug", phrase.slug))
        .first();
      if (existing !== null) {
        skipped += 1;
        continue;
      }
      await ctx.db.insert("phrases", {
        slug: phrase.slug,
        language: phrase.language,
        situation: phrase.situation,
        english: phrase.english,
        translation: phrase.translation,
        ...(phrase.romanization !== undefined ? { romanization: phrase.romanization } : {}),
      });
      inserted += 1;
    }

    return { success: true, inserted, skipped, total: seedPhrasesData.length };
  },
});
