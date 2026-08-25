import type { Phrase, PhrasebookLanguage, Situation } from "./types";

/**
 * Seed data for the phrasebook browser while the Track 10 Convex side is
 * built by another agent (no `phrases` queries or seed data exist in
 * `convex/` yet — only the table definition in `schema.ts`).
 *
 * Shape mirrors `schema.ts`'s `phrases` table exactly. When the real
 * tables land, this file becomes seed/fixture data for Convex-side tests
 * (`bunx convex seed`-style ingestion or test fixtures) and nothing in
 * `features/phrasebook/` besides `data.ts` needs to change.
 *
 * Content note: these are hand-written common travel phrases, not
 * scraped/licensed content — safe to ship as-is.
 */

export const FIXTURE_SITUATIONS: Situation[] = [
  {
    slug: "restaurant",
    title: "Restaurant & Café",
    description: "Ordering food, asking for the check, dietary needs.",
  },
  {
    slug: "transit",
    title: "Transit & Directions",
    description: "Trains and subways, tickets, finding your way.",
  },
  {
    slug: "shopping",
    title: "Shopping",
    description: "Prices, sizes, paying, haggling politely.",
  },
  {
    slug: "lodging",
    title: "Lodging",
    description: "Check-in, reservations, room problems.",
  },
  {
    slug: "emergencies",
    title: "Emergencies",
    description: "Getting help, lost items, medical needs.",
  },
  {
    slug: "smalltalk",
    title: "Small Talk",
    description: "Introductions, polite openers, breaking the ice.",
  },
];

const phrases = (
  situation: string,
  language: PhrasebookLanguage,
  entries: Array<[english: string, translation: string, romanization?: string]>,
): Phrase[] =>
  entries.map(([english, translation, romanization], i) => ({
    id: `${situation}-${language}-${String(i + 1).padStart(2, "0")}`,
    language,
    situation,
    english,
    translation,
    ...(romanization !== undefined ? { romanization } : {}),
  }));

export const FIXTURE_PHRASES: Phrase[] = [
  // ── Restaurant ──────────────────────────────────────────────────────
  ...phrases("restaurant", "ja", [
    ["A table for two, please.", "二人席をお願いします。", "Futari seki o onegaishimasu."],
    ["The check, please.", "お会計をお願いします。", "O-kaikei o onegaishimasu."],
  ]),
  ...phrases("restaurant", "ko", [
    ["A table for two, please.", "두 명 자리 부탁합니다.", "Du myeong jari butakhamnida."],
    ["This is delicious!", "너무 맛있어요!", "Neomu masisseoyo!"],
  ]),
  ...phrases("restaurant", "zh", [
    ["A table for two, please.", "请给我们一张两人桌。", "Qǐng gěi wǒmen yī zhāng liǎng rén zhuō."],
    ["The check, please.", "买单，谢谢。", "Mǎidān, xièxie."],
  ]),

  // ── Transit ─────────────────────────────────────────────────────────
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
    ["How much is a ticket to Beijing?", "去北京的票多少钱？", "Qù Běijīng de piào duōshao qián?"],
  ]),

  // ── Shopping ────────────────────────────────────────────────────────
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
    ["I'm just looking, thanks.", "我只是随便看看，谢谢。", "Wǒ zhǐshì suíbiàn kànkàn, xièxie."],
  ]),

  // ── Lodging ─────────────────────────────────────────────────────────
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

  // ── Emergencies ─────────────────────────────────────────────────────
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

  // ── Small talk ──────────────────────────────────────────────────────
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
