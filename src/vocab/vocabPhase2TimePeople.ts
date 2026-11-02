import type { VocabularyItem } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// N5 Vocabulary Expansion — Phase 2: Time, Calendar & People (+58 entries)
//   - Relative Time, Holidays & Durations (+22)
//   - Irregular N5 Calendar Days of the Month (+11)
//   - Family (Humble vs. Polite Pairs), People & Occupations (+25)
// ─────────────────────────────────────────────────────────────────────────────

export const VOCAB_PHASE_2_TIME_PEOPLE: VocabularyItem[] = [
  // ── Relative Time, Holidays & Durations (22) ──────────────────────────────
  { word: "今週", hiragana: "こんしゅう", romaji: "konshuu", english: "This week", category: "time" },
  { word: "今月", hiragana: "こんげつ", romaji: "kongetsu", english: "This month", category: "time" },
  { word: "再来週", hiragana: "さらいしゅう", romaji: "saraishuu", english: "Week after next", category: "time" },
  { word: "再来月", hiragana: "さらいげつ", romaji: "saraigetsu", english: "Month after next", category: "time" },
  { word: "再来年", hiragana: "さらいねん", romaji: "sarainen", english: "Year after next", category: "time" },
  { word: "今夜", hiragana: "こんや", romaji: "konya", english: "Tonight / This evening", category: "time" },
  { word: "夜中", hiragana: "よなか", romaji: "yonaka", english: "Midnight / Middle of the night", category: "time" },
  { word: "一日中", hiragana: "いちにちじゅう", romaji: "ichinichijuu", english: "All day long", category: "time" },
  { word: "休み", hiragana: "やすみ", romaji: "yasumi", english: "Holiday / Day off / Break", category: "time" },
  { word: "休日", hiragana: "きゅうじつ", romaji: "kyuujitsu", english: "Holiday / Day off", category: "time" },
  { word: "平日", hiragana: "へいじつ", romaji: "heijitsu", english: "Weekday", category: "time" },
  { word: "誕生日", hiragana: "たんじょうび", romaji: "tanjoubi", english: "Birthday", category: "time" },
  { word: "お正月", hiragana: "おしょうがつ", romaji: "oshougatsu", english: "New Year", category: "time" },
  { word: "新年", hiragana: "しんねん", romaji: "shinnen", english: "New Year", category: "time" },
  { word: "秒", hiragana: "びょう", romaji: "byou", english: "Second (time)", category: "time" },
  { word: "半", hiragana: "はん", romaji: "han", english: "Half (e.g., half past)", category: "time" },
  { word: "半分", hiragana: "はんぶん", romaji: "hanbun", english: "Half (portion)", category: "time" },
  { word: "何時", hiragana: "なんじ", romaji: "nanji", english: "What time", category: "time" },
  { word: "何曜日", hiragana: "なんようび", romaji: "nanyoubi", english: "What day of the week", category: "time" },
  { word: "後で", hiragana: "あとで", romaji: "atode", english: "Later / Afterwards", category: "time" },
  { word: "さっき", hiragana: "さっき", romaji: "sakki", english: "Just now / A moment ago", category: "time" },
  { word: "昔", hiragana: "むかし", romaji: "mukashi", english: "Long ago / Old days", category: "time" },

  // ── Irregular N5 Calendar Days of the Month (11) ──────────────────────────
  { word: "一日", hiragana: "ついたち", romaji: "tsuitachi", english: "1st day of the month", category: "time" },
  { word: "二日", hiragana: "ふつか", romaji: "futsuka", english: "2nd day / Two days", category: "time" },
  { word: "三日", hiragana: "みっか", romaji: "mikka", english: "3rd day / Three days", category: "time" },
  { word: "四日", hiragana: "よっか", romaji: "yokka", english: "4th day / Four days", category: "time" },
  { word: "五日", hiragana: "いつか", romaji: "itsuka", english: "5th day / Five days", category: "time" },
  { word: "六日", hiragana: "むいか", romaji: "muika", english: "6th day / Six days", category: "time" },
  { word: "七日", hiragana: "なのか", romaji: "nanoka", english: "7th day / Seven days", category: "time" },
  { word: "八日", hiragana: "ようか", romaji: "youka", english: "8th day / Eight days", category: "time" },
  { word: "九日", hiragana: "ここのか", romaji: "kokonoka", english: "9th day / Nine days", category: "time" },
  { word: "十日", hiragana: "とおか", romaji: "tooka", english: "10th day / Ten days", category: "time" },
  { word: "二十日", hiragana: "はつか", romaji: "hatsuka", english: "20th day / Twenty days", category: "time" },

  // ── Family, People & Occupations (25) ─────────────────────────────────────
  { word: "父", hiragana: "ちち", romaji: "chichi", english: "Father (one's own)", category: "people" },
  { word: "母", hiragana: "はは", romaji: "haha", english: "Mother (one's own)", category: "people" },
  { word: "兄", hiragana: "あに", romaji: "ani", english: "Older brother (one's own)", category: "people" },
  { word: "姉", hiragana: "あね", romaji: "ane", english: "Older sister (one's own)", category: "people" },
  { word: "両親", hiragana: "りょうしん", romaji: "ryoushin", english: "Parents", category: "people" },
  { word: "兄弟", hiragana: "きょうだい", romaji: "kyoudai", english: "Siblings / Brothers and sisters", category: "people" },
  { word: "姉妹", hiragana: "しまい", romaji: "shimai", english: "Sisters", category: "people" },
  { word: "夫", hiragana: "おっと", romaji: "otto", english: "Husband (one's own)", category: "people" },
  { word: "妻", hiragana: "つま", romaji: "tsuma", english: "Wife (one's own)", category: "people" },
  { word: "ご主人", hiragana: "ごしゅじん", romaji: "goshujin", english: "Husband (someone else's)", category: "people" },
  { word: "奥さん", hiragana: "おくさん", romaji: "okusan", english: "Wife (someone else's)", category: "people" },
  { word: "おばさん", hiragana: "おばさん", romaji: "obasan", english: "Aunt / Middle-aged woman", category: "people" },
  { word: "自分", hiragana: "じぶん", romaji: "jibun", english: "Oneself", category: "people" },
  { word: "大人", hiragana: "おとな", romaji: "otona", english: "Adult", category: "people" },
  { word: "男の子", hiragana: "おとこのこ", romaji: "otokonoko", english: "Boy", category: "people" },
  { word: "女の子", hiragana: "おんなのこ", romaji: "onnanoko", english: "Girl", category: "people" },
  { word: "男の人", hiragana: "おとこのひと", romaji: "otokonohito", english: "Man", category: "people" },
  { word: "女の人", hiragana: "おんなのひと", romaji: "onnanohito", english: "Woman", category: "people" },
  { word: "あの人", hiragana: "あのひと", romaji: "anohito", english: "That person", category: "people" },
  { word: "あの方", hiragana: "あのかた", romaji: "anokata", english: "That person (polite)", category: "people" },
  { word: "どなた", hiragana: "どなた", romaji: "donata", english: "Who (polite)", category: "people" },
  { word: "留学生", hiragana: "りゅうがくせい", romaji: "ryuugakusei", english: "International student", category: "people" },
  { word: "お巡りさん", hiragana: "おまわりさん", romaji: "omawarisan", english: "Police officer (friendly)", category: "people" },
  { word: "歌手", hiragana: "かしゅ", romaji: "kashu", english: "Singer", category: "people" },
  { word: "看護師", hiragana: "かんごし", romaji: "kangoshi", english: "Nurse", category: "people" },
];
