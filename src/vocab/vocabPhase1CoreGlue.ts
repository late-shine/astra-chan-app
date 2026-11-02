import type { VocabularyItem } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// N5 Vocabulary Expansion — Phase 1: Core Conversational Glue (+62 entries)
//   - Greetings & Everyday Responses (+10)
//   - Demonstratives / Kosoado Pointers (+16)
//   - Question Words (+8)
//   - Frequency, Degree & Manner Adverbs (+23)
//   - Sentence Connectors (+5)
// ─────────────────────────────────────────────────────────────────────────────

export const VOCAB_PHASE_1_CORE_GLUE: VocabularyItem[] = [
  // ── Greetings & Everyday Responses (10) ───────────────────────────────────
  { word: "いただきます", hiragana: "いただきます", romaji: "itadakimasu", english: "Thank you for the meal (before eating)", category: "greetings" },
  { word: "おかえりなさい", hiragana: "おかえりなさい", romaji: "okaerinasai", english: "Welcome home", category: "greetings" },
  { word: "ごめんなさい", hiragana: "ごめんなさい", romaji: "gomennasai", english: "I am sorry", category: "greetings" },
  { word: "失礼します", hiragana: "しつれいします", romaji: "shitsureishimasu", english: "Excuse me (entering / leaving)", category: "greetings" },
  { word: "お元気ですか", hiragana: "おげんきですか", romaji: "ogenkidesuka", english: "How are you?", category: "greetings" },
  { word: "どういたしまして", hiragana: "どういたしまして", romaji: "douitashimashite", english: "You're welcome", category: "greetings" },
  { word: "おめでとうございます", hiragana: "おめでとうございます", romaji: "omedetougozaimasu", english: "Congratulations", category: "greetings" },
  { word: "はい", hiragana: "はい", romaji: "hai", english: "Yes", category: "greetings" },
  { word: "いいえ", hiragana: "いいえ", romaji: "iie", english: "No / Not at all", category: "greetings" },
  { word: "お大事に", hiragana: "おだいじに", romaji: "odaijini", english: "Get well soon / Take care", category: "greetings" },

  // ── Demonstratives / Kosoado Pointers (16) ────────────────────────────────
  { word: "これ", hiragana: "これ", romaji: "kore", english: "This one (near me)", category: "expressions" },
  { word: "それ", hiragana: "それ", romaji: "sore", english: "That one (near you)", category: "expressions" },
  { word: "あれ", hiragana: "あれ", romaji: "are", english: "That one over there", category: "expressions" },
  { word: "どれ", hiragana: "どれ", romaji: "dore", english: "Which one (of three or more)", category: "expressions" },
  { word: "この", hiragana: "この", romaji: "kono", english: "This ~ (before a noun)", category: "expressions" },
  { word: "その", hiragana: "その", romaji: "sono", english: "That ~ (near you, before a noun)", category: "expressions" },
  { word: "あの", hiragana: "あの", romaji: "ano", english: "That ~ over there (before a noun)", category: "expressions" },
  { word: "どの", hiragana: "どの", romaji: "dono", english: "Which ~ (before a noun)", category: "expressions" },
  { word: "ここ", hiragana: "ここ", romaji: "koko", english: "Here", category: "expressions" },
  { word: "そこ", hiragana: "そこ", romaji: "soko", english: "There (near you)", category: "expressions" },
  { word: "あそこ", hiragana: "あそこ", romaji: "asoko", english: "Over there", category: "expressions" },
  { word: "どこ", hiragana: "どこ", romaji: "doko", english: "Where", category: "expressions" },
  { word: "こちら", hiragana: "こちら", romaji: "kochira", english: "This way / This person (polite)", category: "expressions" },
  { word: "そちら", hiragana: "そちら", romaji: "sochira", english: "That way / Your side (polite)", category: "expressions" },
  { word: "あちら", hiragana: "あちら", romaji: "achira", english: "That way over there (polite)", category: "expressions" },
  { word: "どちら", hiragana: "どちら", romaji: "dochira", english: "Which way / Which one (of two)", category: "expressions" },

  // ── Question Words (8) ────────────────────────────────────────────────────
  { word: "何", hiragana: "なに / なん", romaji: "nani / nan", english: "What", category: "expressions" },
  { word: "いつ", hiragana: "いつ", romaji: "itsu", english: "When", category: "expressions" },
  { word: "どう", hiragana: "どう", romaji: "dou", english: "How / What about", category: "expressions" },
  { word: "なぜ", hiragana: "なぜ", romaji: "naze", english: "Why", category: "expressions" },
  { word: "どうして", hiragana: "どうして", romaji: "doushite", english: "Why / How come", category: "expressions" },
  { word: "いくら", hiragana: "いくら", romaji: "ikura", english: "How much (price)", category: "expressions" },
  { word: "いくつ", hiragana: "いくつ", romaji: "ikutsu", english: "How many / How old", category: "expressions" },
  { word: "どんな", hiragana: "どんな", romaji: "donna", english: "What kind of", category: "expressions" },

  // ── Frequency, Degree & Manner Adverbs (23) ───────────────────────────────
  { word: "とても", hiragana: "とても", romaji: "totemo", english: "Very", category: "expressions" },
  { word: "少し", hiragana: "すこし", romaji: "sukoshi", english: "A little / A few", category: "expressions" },
  { word: "ちょっと", hiragana: "ちょっと", romaji: "chotto", english: "A little bit / Excuse me", category: "expressions" },
  { word: "たくさん", hiragana: "たくさん", romaji: "takusan", english: "A lot / Many", category: "expressions" },
  { word: "いつも", hiragana: "いつも", romaji: "itsumo", english: "Always", category: "expressions" },
  { word: "よく", hiragana: "よく", romaji: "yoku", english: "Often / Well", category: "expressions" },
  { word: "時々", hiragana: "ときどき", romaji: "tokidoki", english: "Sometimes", category: "expressions" },
  { word: "あまり", hiragana: "あまり", romaji: "amari", english: "Not very / Not much (with negative)", category: "expressions" },
  { word: "全然", hiragana: "ぜんぜん", romaji: "zenzen", english: "Not at all (with negative)", category: "expressions" },
  { word: "もう", hiragana: "もう", romaji: "mou", english: "Already / Soon", category: "expressions" },
  { word: "まだ", hiragana: "まだ", romaji: "mada", english: "Still / Not yet", category: "expressions" },
  { word: "すぐ", hiragana: "すぐ", romaji: "sugu", english: "Right away / Immediately", category: "expressions" },
  { word: "ゆっくり", hiragana: "ゆっくり", romaji: "yukkuri", english: "Slowly / Leisurely", category: "expressions" },
  { word: "一緒に", hiragana: "いっしょに", romaji: "isshoni", english: "Together", category: "expressions" },
  { word: "一人で", hiragana: "ひとりで", romaji: "hitoride", english: "Alone / By oneself", category: "expressions" },
  { word: "初めて", hiragana: "はじめて", romaji: "hajimete", english: "For the first time", category: "expressions" },
  { word: "また", hiragana: "また", romaji: "mata", english: "Again / See you", category: "expressions" },
  { word: "もっと", hiragana: "もっと", romaji: "motto", english: "More", category: "expressions" },
  { word: "一番", hiragana: "いちばん", romaji: "ichiban", english: "Most / Number one", category: "expressions" },
  { word: "多分", hiragana: "たぶん", romaji: "tabun", english: "Probably / Maybe", category: "expressions" },
  { word: "本当に", hiragana: "ほんとうに", romaji: "hontouni", english: "Really / Truly", category: "expressions" },
  { word: "ちょうど", hiragana: "ちょうど", romaji: "choudo", english: "Exactly / Just", category: "expressions" },
  { word: "だいたい", hiragana: "だいたい", romaji: "daitai", english: "Mostly / Roughly", category: "expressions" },

  // ── Sentence Connectors (5) ───────────────────────────────────────────────
  { word: "でも", hiragana: "でも", romaji: "demo", english: "But / However", category: "expressions" },
  { word: "しかし", hiragana: "しかし", romaji: "shikashi", english: "However", category: "expressions" },
  { word: "そして", hiragana: "そして", romaji: "soshite", english: "And / And then", category: "expressions" },
  { word: "それから", hiragana: "それから", romaji: "sorekara", english: "After that / And then", category: "expressions" },
  { word: "だから", hiragana: "だから", romaji: "dakara", english: "So / Therefore", category: "expressions" },
];
