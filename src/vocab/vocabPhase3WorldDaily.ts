import type { VocabularyItem } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// N5 Vocabulary Expansion — Phase 3: Everyday World & Study (+89 entries)
//   - Transport, Money & Daily Objects (+17)
//   - Places, Workspaces & Spatial Positions (+16)
//   - Animals & Natural World (+15)
//   - Language, Study & School Essentials (+14)
//   - Health & Feelings (+9)
//   - Core Existence/Mental Verbs & Colors/Descriptors (+18)
// ─────────────────────────────────────────────────────────────────────────────

export const VOCAB_PHASE_3_WORLD_DAILY: VocabularyItem[] = [
  // ── Transport, Money & Daily Objects (17) ─────────────────────────────────
  { word: "電車", hiragana: "でんしゃ", romaji: "densha", english: "Train", category: "objects" },
  { word: "バス", hiragana: "ばす", romaji: "basu", english: "Bus", category: "objects" },
  { word: "タクシー", hiragana: "たくしー", romaji: "takushii", english: "Taxi", category: "objects" },
  { word: "飛行機", hiragana: "ひこうき", romaji: "hikouki", english: "Airplane", category: "objects" },
  { word: "船", hiragana: "ふね", romaji: "fune", english: "Ship / Boat", category: "objects" },
  { word: "自動車", hiragana: "じどうしゃ", romaji: "jidousha", english: "Automobile / Car", category: "objects" },
  { word: "乗り物", hiragana: "のりもの", romaji: "norimono", english: "Vehicle / Ride", category: "objects" },
  { word: "お金", hiragana: "おかね", romaji: "okane", english: "Money", category: "objects" },
  { word: "お釣り", hiragana: "おつり", romaji: "otsuri", english: "Change (from payment)", category: "objects" },
  { word: "ボールペン", hiragana: "ぼーるぺん", romaji: "boorupen", english: "Ballpoint pen", category: "objects" },
  { word: "万年筆", hiragana: "まんねんひつ", romaji: "mannenhitsu", english: "Fountain pen", category: "objects" },
  { word: "水着", hiragana: "みずぎ", romaji: "mizugi", english: "Swimsuit", category: "objects" },
  { word: "ネクタイ", hiragana: "ねくたい", romaji: "nekutai", english: "Necktie", category: "objects" },
  { word: "背広", hiragana: "せびろ", romaji: "sebiro", english: "Business suit", category: "objects" },
  { word: "ポケット", hiragana: "ぽけっと", romaji: "poketto", english: "Pocket", category: "objects" },
  { word: "エレベーター", hiragana: "えれべーたー", romaji: "erebeetaa", english: "Elevator", category: "objects" },
  { word: "エスカレーター", hiragana: "えすかれーたー", romaji: "esukareetaa", english: "Escalator", category: "objects" },

  // ── Places, Workspaces & Spatial Positions (16) ───────────────────────────
  { word: "日本", hiragana: "にほん", romaji: "nihon", english: "Japan", category: "places" },
  { word: "外国", hiragana: "がいこく", romaji: "gaikoku", english: "Foreign country", category: "places" },
  { word: "会社", hiragana: "かいしゃ", romaji: "kaisha", english: "Company / Workplace", category: "places" },
  { word: "事務所", hiragana: "じむしょ", romaji: "jimusho", english: "Office", category: "places" },
  { word: "工場", hiragana: "こうじょう", romaji: "koujou", english: "Factory", category: "places" },
  { word: "受付", hiragana: "うけつけ", romaji: "uketsuke", english: "Reception desk", category: "places" },
  { word: "会議室", hiragana: "かいぎしつ", romaji: "kaigishitsu", english: "Meeting room", category: "places" },
  { word: "窓口", hiragana: "まどぐち", romaji: "madoguchi", english: "Ticket window / Counter", category: "places" },
  { word: "アパート", hiragana: "あぱーと", romaji: "apaato", english: "Apartment building", category: "places" },
  { word: "大使館", hiragana: "たいしかん", romaji: "taishikan", english: "Embassy", category: "places" },
  { word: "町", hiragana: "まち", romaji: "machi", english: "Town / City neighborhood", category: "places" },
  { word: "村", hiragana: "むら", romaji: "mura", english: "Village", category: "places" },
  { word: "近く", hiragana: "ちかく", romaji: "chikaku", english: "Nearby / Vicinity", category: "places" },
  { word: "間", hiragana: "あいだ", romaji: "aida", english: "Between / Space", category: "places" },
  { word: "横", hiragana: "よこ", romaji: "yoko", english: "Beside / Side", category: "places" },
  { word: "向こう", hiragana: "むこう", romaji: "mukou", english: "Over there / Opposite side", category: "places" },

  // ── Animals & Natural World (15) ──────────────────────────────────────────
  { word: "犬", hiragana: "いぬ", romaji: "inu", english: "Dog", category: "weather" },
  { word: "猫", hiragana: "ねこ", romaji: "neko", english: "Cat", category: "weather" },
  { word: "鳥", hiragana: "とり", romaji: "tori", english: "Bird", category: "weather" },
  { word: "動物", hiragana: "どうぶつ", romaji: "doubutsu", english: "Animal", category: "weather" },
  { word: "虫", hiragana: "むし", romaji: "mushi", english: "Insect / Bug", category: "weather" },
  { word: "馬", hiragana: "うま", romaji: "uma", english: "Horse", category: "weather" },
  { word: "牛", hiragana: "うし", romaji: "ushi", english: "Cow / Cattle", category: "weather" },
  { word: "豚", hiragana: "ぶた", romaji: "buta", english: "Pig", category: "weather" },
  { word: "金魚", hiragana: "きんぎょ", romaji: "kingyo", english: "Goldfish", category: "weather" },
  { word: "木", hiragana: "き", romaji: "ki", english: "Tree / Wood", category: "weather" },
  { word: "草", hiragana: "くさ", romaji: "kusa", english: "Grass / Weeds", category: "weather" },
  { word: "葉", hiragana: "は", romaji: "ha", english: "Leaf", category: "weather" },
  { word: "島", hiragana: "しま", romaji: "shima", english: "Island", category: "weather" },
  { word: "空気", hiragana: "くうき", romaji: "kuuki", english: "Air / Atmosphere", category: "weather" },
  { word: "景色", hiragana: "けしき", romaji: "keshiki", english: "Scenery / View", category: "weather" },

  // ── Language, Study & School Essentials (14) ──────────────────────────────
  { word: "日本語", hiragana: "にほんご", romaji: "nihongo", english: "Japanese language", category: "school" },
  { word: "言葉", hiragana: "ことば", romaji: "kotoba", english: "Word / Language", category: "school" },
  { word: "意味", hiragana: "いみ", romaji: "imi", english: "Meaning", category: "school" },
  { word: "漢字", hiragana: "かんじ", romaji: "kanji", english: "Kanji (Chinese characters)", category: "school" },
  { word: "ひらがな", hiragana: "ひらがな", romaji: "hiragana", english: "Hiragana", category: "school" },
  { word: "カタカナ", hiragana: "かたかな", romaji: "katakana", english: "Katakana", category: "school" },
  { word: "単語", hiragana: "たんご", romaji: "tango", english: "Vocabulary word", category: "school" },
  { word: "文", hiragana: "ぶん", romaji: "bun", english: "Sentence", category: "school" },
  { word: "会話", hiragana: "かいわ", romaji: "kaiwa", english: "Conversation", category: "school" },
  { word: "問題", hiragana: "もんだい", romaji: "mondai", english: "Problem / Question", category: "school" },
  { word: "ページ", hiragana: "ぺーじ", romaji: "peeji", english: "Page", category: "school" },
  { word: "番号", hiragana: "ばんごう", romaji: "bangou", english: "Number (phone / room)", category: "school" },
  { word: "名前", hiragana: "なまえ", romaji: "namae", english: "Name", category: "school" },
  { word: "読書", hiragana: "どくしょ", romaji: "dokusho", english: "Reading books", category: "school" },

  // ── Health & Feelings (9) ─────────────────────────────────────────────────
  { word: "病気", hiragana: "びょうき", romaji: "byouki", english: "Illness / Sickness", category: "body" },
  { word: "風邪", hiragana: "かぜ", romaji: "kaze", english: "Cold (illness)", category: "body" },
  { word: "熱", hiragana: "ねつ", romaji: "netsu", english: "Fever", category: "body" },
  { word: "怪我", hiragana: "けが", romaji: "kega", english: "Injury", category: "body" },
  { word: "血", hiragana: "ち", romaji: "chi", english: "Blood", category: "body" },
  { word: "涙", hiragana: "なみだ", romaji: "namida", english: "Tears", category: "body" },
  { word: "汗", hiragana: "あせ", romaji: "ase", english: "Sweat", category: "body" },
  { word: "喉", hiragana: "のど", romaji: "nodo", english: "Throat", category: "body" },
  { word: "気持ち", hiragana: "きもち", romaji: "kimochi", english: "Feeling / Sensation", category: "body" },

  // ── Core Existence/Mental Verbs & Colors/Descriptors (18) ─────────────────
  { word: "ある", hiragana: "ある", romaji: "aru", english: "To exist / have (inanimate)", category: "actions" },
  { word: "いる", hiragana: "いる", romaji: "iru", english: "To exist / stay (animate)", category: "actions" },
  { word: "なる", hiragana: "なる", romaji: "naru", english: "To become", category: "actions" },
  { word: "言う", hiragana: "いう", romaji: "iu", english: "To say", category: "actions" },
  { word: "思う", hiragana: "おもう", romaji: "omou", english: "To think / feel", category: "actions" },
  { word: "上げる", hiragana: "あげる", romaji: "ageru", english: "To raise / lift", category: "actions" },
  { word: "分ける", hiragana: "わける", romaji: "wakeru", english: "To divide / share", category: "actions" },
  { word: "買い物する", hiragana: "かいものする", romaji: "kaimonosuru", english: "To go shopping", category: "actions" },
  { word: "引っ越す", hiragana: "ひっこす", romaji: "hikkosu", english: "To move house", category: "actions" },
  { word: "乗り換える", hiragana: "のりかえる", romaji: "norikaeru", english: "To transfer (trains / buses)", category: "actions" },
  { word: "治る", hiragana: "なおる", romaji: "naoru", english: "To heal / get well", category: "actions" },
  { word: "壊れる", hiragana: "こわれる", romaji: "kowareru", english: "To break (intransitive)", category: "actions" },
  { word: "大好き", hiragana: "だいすき", romaji: "daisuki", english: "Love / Like very much", category: "adjectives" },
  { word: "緑", hiragana: "みどり", romaji: "midori", english: "Green", category: "adjectives" },
  { word: "茶色", hiragana: "ちゃいろ", romaji: "chairo", english: "Brown", category: "adjectives" },
  { word: "色", hiragana: "いろ", romaji: "iro", english: "Color", category: "adjectives" },
  { word: "十分", hiragana: "じゅうぶん", romaji: "juubun", english: "Enough / Sufficient", category: "adjectives" },
  { word: "いろいろ", hiragana: "いろいろ", romaji: "iroiro", english: "Various / All kinds of", category: "adjectives" },
];
