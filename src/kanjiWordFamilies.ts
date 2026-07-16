import type { KanjiWordEntry } from "./types";

export const KANJI_WORD_FAMILIES: Record<string, KanjiWordEntry[]> = {
  "生": [
    { word: "先生", reading: "せんせい", meaning: "Teacher", kanjiReading: "せい", readingType: "onyomi", commonness: "common" },
    { word: "生きる", reading: "いきる", meaning: "To live", kanjiReading: "い", readingType: "kunyomi", commonness: "common" },
    { word: "生", reading: "なま", meaning: "Raw", kanjiReading: "なま", readingType: "kunyomi", commonness: "common" },
    { word: "生まれる", reading: "うまれる", meaning: "To be born", kanjiReading: "う", readingType: "kunyomi", commonness: "common" },
    { word: "誕生", reading: "たんじょう", meaning: "Birth", kanjiReading: "じょう", readingType: "onyomi-variant", note: "生 has a second onyomi ショウ, which voices to じょう here — different from the セイ you see in 先生.", commonness: "common" },
    { word: "一生", reading: "いっしょう", meaning: "One's whole life", kanjiReading: "しょう", readingType: "onyomi-variant", note: "Same secondary onyomi ショウ as in 誕生, here unvoiced and doubled before the small っ.", commonness: "common" },
  ],
  "上": [
    { word: "上手", reading: "じょうず", meaning: "Skilled", kanjiReading: "じょう", readingType: "onyomi", commonness: "common" },
    { word: "上", reading: "うえ", meaning: "Above / on top", kanjiReading: "うえ", readingType: "kunyomi", commonness: "common" },
    { word: "上げる", reading: "あげる", meaning: "To raise", kanjiReading: "あ", readingType: "kunyomi", commonness: "common" },
    { word: "上る", reading: "のぼる", meaning: "To climb / go up", kanjiReading: "のぼ", readingType: "kunyomi", note: "A separate kunyomi from あげる — this one is about ascending (stairs, a mountain), not lifting something.", commonness: "common" },
    { word: "上着", reading: "うわぎ", meaning: "Jacket / outerwear", kanjiReading: "うわ", readingType: "kunyomi", note: "うわ is a reading of 上 that only shows up in a handful of compounds like this one.", commonness: "moderate" },
    { word: "屋上", reading: "おくじょう", meaning: "Rooftop", kanjiReading: "じょう", readingType: "onyomi", commonness: "common" },
  ],
  "下": [
    { word: "下手", reading: "へた", meaning: "Unskilled", kanjiReading: "へ", readingType: "irregular", note: "A special whole-word reading (jukujikun) — 下 doesn't normally read as へ on its own.", commonness: "common" },
    { word: "下", reading: "した", meaning: "Below / under", kanjiReading: "した", readingType: "kunyomi", commonness: "common" },
    { word: "下がる", reading: "さがる", meaning: "To go down / descend", kanjiReading: "さ", readingType: "kunyomi", commonness: "common" },
    { word: "地下", reading: "ちか", meaning: "Underground", kanjiReading: "か", readingType: "onyomi", commonness: "common" },
    { word: "下車", reading: "げしゃ", meaning: "Getting off (a train/bus)", kanjiReading: "げ", readingType: "onyomi", note: "Uses the less common of 下's two onyomi (ゲ) instead of カ.", commonness: "common" },
    { word: "下さい", reading: "ください", meaning: "Please give me", kanjiReading: "くだ", readingType: "kunyomi", note: "くだ-さい is yet another kunyomi, distinct from した and さげる.", commonness: "common" },
  ],
  "中": [
    { word: "中学校", reading: "ちゅうがっこう", meaning: "Junior high school", kanjiReading: "ちゅう", readingType: "onyomi", commonness: "common" },
    { word: "中", reading: "なか", meaning: "Middle / inside", kanjiReading: "なか", readingType: "kunyomi", commonness: "common" },
    { word: "一日中", reading: "いちにちじゅう", meaning: "All day long", kanjiReading: "じゅう", readingType: "onyomi-variant", note: "In time-span words like this, 中 voices from ちゅう to じゅう.", commonness: "common" },
    { word: "世界中", reading: "せかいじゅう", meaning: "All over the world", kanjiReading: "じゅう", readingType: "onyomi-variant", note: "Same じゅう pattern as 一日中, used for 'throughout' rather than a strict time duration.", commonness: "moderate" },
  ],
  "分": [
    { word: "分かる", reading: "わかる", meaning: "To understand", kanjiReading: "わ", readingType: "kunyomi", commonness: "common" },
    { word: "五分", reading: "ごふん", meaning: "Five minutes", kanjiReading: "ふん", readingType: "onyomi", commonness: "common" },
    { word: "自分", reading: "じぶん", meaning: "Oneself", kanjiReading: "ぶん", readingType: "onyomi", commonness: "common" },
    { word: "分ける", reading: "わける", meaning: "To divide", kanjiReading: "わ", readingType: "kunyomi", commonness: "common" },
    { word: "五分五分", reading: "ごぶごぶ", meaning: "Fifty-fifty / even odds", kanjiReading: "ぶ", readingType: "onyomi-variant", note: "ぶ is a third onyomi for 分, separate from ぶん and ふん, used in ratio/proportion words.", commonness: "moderate" },
  ],
  "気": [
    { word: "元気", reading: "げんき", meaning: "Healthy / energetic", kanjiReading: "き", readingType: "onyomi", commonness: "common" },
    { word: "天気", reading: "てんき", meaning: "Weather", kanjiReading: "き", readingType: "onyomi", commonness: "common" },
    { word: "気配", reading: "けはい", meaning: "Sign / indication", kanjiReading: "け", readingType: "onyomi-variant", note: "気 has a rarer second onyomi ケ, heard here instead of the usual キ.", commonness: "common" },
    { word: "気持ち", reading: "きもち", meaning: "Feeling", kanjiReading: "き", readingType: "onyomi", commonness: "common" },
  ],
  "会": [
    { word: "会う", reading: "あう", meaning: "To meet", kanjiReading: "あ", readingType: "kunyomi", commonness: "common" },
    { word: "会社", reading: "かいしゃ", meaning: "Company", kanjiReading: "かい", readingType: "onyomi", commonness: "common" },
    { word: "出会う", reading: "であう", meaning: "To encounter / run into", kanjiReading: "あ", readingType: "kunyomi", commonness: "common" },
    { word: "会釈", reading: "えしゃく", meaning: "A slight bow / nod of greeting", kanjiReading: "え", readingType: "onyomi-variant", note: "A rare onyomi エ that shows up in almost no other word besides this one and 会得 (えとく).", commonness: "rare" },
  ],
  "行": [
    { word: "行く", reading: "いく", meaning: "To go", kanjiReading: "い", readingType: "kunyomi", commonness: "common" },
    { word: "行う", reading: "おこなう", meaning: "To carry out / conduct", kanjiReading: "おこな", readingType: "kunyomi", commonness: "common" },
    { word: "行動", reading: "こうどう", meaning: "Action / behavior", kanjiReading: "こう", readingType: "onyomi", commonness: "common" },
    { word: "行事", reading: "ぎょうじ", meaning: "Event / function", kanjiReading: "ぎょう", readingType: "onyomi-variant", note: "行's second onyomi ギョウ, common in words about ceremonies and scheduled events.", commonness: "common" },
  ],
};
