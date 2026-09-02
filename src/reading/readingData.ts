export type ReadingTokenType = "vocab" | "kanji" | "grammar" | "punctuation";

export interface ReadingToken {
  surface: string;
  reading?: string;
  meaning?: string;
  dictKey?: string;
  type: ReadingTokenType;
  addToSrs: boolean;
  tappable: boolean;
}

export interface ReadingPassage {
  id: string;
  title: string;
  titleJa: string;
  translation: string;
  tokens: ReadingToken[];
}

const word = (surface: string, reading: string, meaning: string, dictKey = surface): ReadingToken => ({ surface, reading, meaning, dictKey, type: "vocab", addToSrs: true, tappable: true });
const grammar = (surface: string, reading: string, meaning: string): ReadingToken => ({ surface, reading, meaning, type: "grammar", addToSrs: false, tappable: true });
const punctuation = (surface: string): ReadingToken => ({ surface, type: "punctuation", addToSrs: false, tappable: false });

export const SEED_READING_PASSAGES: ReadingPassage[] = [
  { id: "morning-walk", title: "A Morning Walk", titleJa: "朝の散歩", translation: "Every morning, I wake up at six. I drink water and walk to the station.", tokens: [word("私", "わたし", "I"), grammar("は", "は", "topic marker"), word("毎朝", "まいあさ", "every morning"), word("六時", "ろくじ", "six o'clock"), grammar("に", "に", "at / on"), word("起きます", "おきます", "wake up", "起きる"), punctuation("。"), word("水", "みず", "water"), grammar("を", "を", "object marker"), word("飲んで", "のんで", "drink and", "飲む"), punctuation("、"), word("駅", "えき", "station"), grammar("まで", "まで", "up to / as far as"), word("歩きます", "あるきます", "walk", "歩く"), punctuation("。")] },
  { id: "library-book", title: "At The Library", titleJa: "図書館の本", translation: "On Sunday, I go to the library. I read a Japanese book there.", tokens: [word("日曜日", "にちようび", "Sunday"), grammar("に", "に", "on / at"), word("図書館", "としょかん", "library"), grammar("へ", "へ", "toward"), word("行きます", "いきます", "go", "行く"), punctuation("。"), word("そこで", "そこで", "there"), word("日本語", "にほんご", "Japanese language"), grammar("の", "の", "of / belonging to"), word("本", "ほん", "book"), grammar("を", "を", "object marker"), word("読みます", "よみます", "read", "読む"), punctuation("。")] },
  { id: "weather-and-tea", title: "A Rainy Afternoon", titleJa: "雨の日の午後", translation: "It is raining today. I drink tea at home and study Japanese.", tokens: [word("今日", "きょう", "today"), grammar("は", "は", "topic marker"), word("雨", "あめ", "rain"), grammar("です", "です", "is / polite ending"), punctuation("。"), word("家", "いえ", "home"), grammar("で", "で", "at / in"), word("お茶", "おちゃ", "tea"), grammar("を", "を", "object marker"), word("飲みます", "のみます", "drink", "飲む"), punctuation("。"), word("日本語", "にほんご", "Japanese language"), grammar("を", "を", "object marker"), word("勉強します", "べんきょうします", "study", "勉強する"), punctuation("。")] },
  { id: "weekend-food", title: "A Weekend Meal", titleJa: "週末の食事", translation: "On Saturday, my friend and I eat delicious food at a restaurant.", tokens: [word("土曜日", "どようび", "Saturday"), grammar("に", "に", "on / at"), word("友達", "ともだち", "friend"), grammar("と", "と", "with / and"), word("レストラン", "れすとらん", "restaurant"), grammar("で", "で", "at / in"), word("美味しい", "おいしい", "delicious"), word("食べ物", "たべもの", "food"), grammar("を", "を", "object marker"), word("食べます", "たべます", "eat", "食べる"), punctuation("。")] },
  { id: "new-class", title: "A New Class", titleJa: "新しいクラス", translation: "This is my new class. The teacher is kind, and the students study together.", tokens: [word("これ", "これ", "this"), grammar("は", "は", "topic marker"), word("私", "わたし", "my / I"), grammar("の", "の", "of / belonging to"), word("新しい", "あたらしい", "new"), word("クラス", "くらす", "class"), grammar("です", "です", "is / polite ending"), punctuation("。"), word("先生", "せんせい", "teacher"), grammar("は", "は", "topic marker"), word("親切", "しんせつ", "kind"), grammar("です", "です", "is / polite ending"), punctuation("。"), word("学生", "がくせい", "student"), grammar("は", "は", "topic marker"), word("一緒に", "いっしょに", "together"), word("勉強します", "べんきょうします", "study", "勉強する"), punctuation("。")] },
];

export function getPassageText(passage: ReadingPassage): string { return passage.tokens.map((token) => token.surface).join(""); }
