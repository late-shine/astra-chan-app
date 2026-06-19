import { HiraganaItem, KatakanaItem, KanjiItem, VocabularyItem } from "./types";

export const HIRAGANA_DATA: HiraganaItem[] = [
  // Basic - Vowels
  {
    kana: "あ",
    romaji: "a",
    category: "basic",
    group: "Vowels",
    examples: [
      { japanese: "朝 (あさ)", romaji: "asa", english: "Morning" },
      { japanese: "青 (あお)", romaji: "ao", english: "Blue" }
    ]
  },
  {
    kana: "い",
    romaji: "i",
    category: "basic",
    group: "Vowels",
    examples: [
      { japanese: "犬 (いぬ)", romaji: "inu", english: "Dog" },
      { japanese: "苺 (いちご)", romaji: "ichigo", english: "Strawberry" }
    ]
  },
  {
    kana: "う",
    romaji: "u",
    category: "basic",
    group: "Vowels",
    examples: [
      { japanese: "海 (うみ)", romaji: "umi", english: "Sea / Ocean" },
      { japanese: "歌 (うた)", romaji: "uta", english: "Song" }
    ]
  },
  {
    kana: "え",
    romaji: "e",
    category: "basic",
    group: "Vowels",
    examples: [
      { japanese: "駅 (えき)", romaji: "eki", english: "Station" },
      { japanese: "鉛筆 (えんぴつ)", romaji: "enpitsu", english: "Pencil" }
    ]
  },
  {
    kana: "お",
    romaji: "o",
    category: "basic",
    group: "Vowels",
    examples: [
      { japanese: "お茶 (おちゃ)", romaji: "o-cha", english: "Green Tea" },
      { japanese: "美味しい (おいしい)", romaji: "oishii", english: "Delicious" }
    ]
  },
  // K-Row
  {
    kana: "か",
    romaji: "ka",
    category: "basic",
    group: "K-Row",
    examples: [
      { japanese: "傘 (かさ)", romaji: "kasa", english: "Umbrella" },
      { japanese: "風 (かぜ)", romaji: "kaze", english: "Wind" }
    ]
  },
  {
    kana: "き",
    romaji: "ki",
    category: "basic",
    group: "K-Row",
    examples: [
      { japanese: "切符 (きっぷ)", romaji: "kippu", english: "Ticket" },
      { japanese: "狐 (きつね)", romaji: "kitsune", english: "Fox" }
    ]
  },
  {
    kana: "く",
    romaji: "ku",
    category: "basic",
    group: "K-Row",
    examples: [
      { japanese: "車 (くるま)", romaji: "kuruma", english: "Car" },
      { japanese: "薬 (くすり)", romaji: "kusuri", english: "Medicine" }
    ]
  },
  {
    kana: "け",
    romaji: "ke",
    category: "basic",
    group: "K-Row",
    examples: [
      { japanese: "携帯 (けいたい)", romaji: "keitai", english: "Mobile Phone" },
      { japanese: "景色 (けしき)", romaji: "keshiki", english: "Scenery" }
    ]
  },
  {
    kana: "こ",
    romaji: "ko",
    category: "basic",
    group: "K-Row",
    examples: [
      { japanese: "言葉 (ことば)", romaji: "kotoba", english: "Word / Language" },
      { japanese: "心 (こころ)", romaji: "kokoro", english: "Heart" }
    ]
  },
  // S-Row
  {
    kana: "さ",
    romaji: "sa",
    category: "basic",
    group: "S-Row",
    examples: [
      { japanese: "桜 (さくら)", romaji: "sakura", english: "Cherry Blossom" },
      { japanese: "魚 (さかな)", romaji: "sakana", english: "Fish" }
    ]
  },
  {
    kana: "し",
    romaji: "shi",
    category: "basic",
    group: "S-Row",
    examples: [
      { japanese: "四季 (しき)", romaji: "shiki", english: "Four Seasons" },
      { japanese: "幸せ (しあわせ)", romaji: "shiawase", english: "Happy" }
    ]
  },
  {
    kana: "す",
    romaji: "su",
    category: "basic",
    group: "S-Row",
    examples: [
      { japanese: "寿司 (すし)", romaji: "sushi", english: "Sushi" },
      { japanese: "涼しい (すずしい)", romaji: "suzushii", english: "Cool / Refreshing" }
    ]
  },
  {
    kana: "せ",
    romaji: "se",
    category: "basic",
    group: "S-Row",
    examples: [
      { japanese: "世界 (せかい)", romaji: "sekai", english: "World" },
      { japanese: "先生 (せんせい)", romaji: "sensei", english: "Teacher" }
    ]
  },
  {
    kana: "そ",
    romaji: "so",
    category: "basic",
    group: "S-Row",
    examples: [
      { japanese: "空 (そら)", romaji: "sora", english: "Sky" },
      { japanese: "掃除 (そうじ)", romaji: "souji", english: "Cleaning" }
    ]
  },
  // T-Row
  {
    kana: "た",
    romaji: "ta",
    category: "basic",
    group: "T-Row",
    examples: [
      { japanese: "卵 (たまご)", romaji: "tamago", english: "Egg" },
      { japanese: "楽しい (たのしい)", romaji: "tanoshii", english: "Fun" }
    ]
  },
  {
    kana: "ち",
    romaji: "chi",
    category: "basic",
    group: "T-Row",
    examples: [
      { japanese: "地下鉄 (ちかてつ)", romaji: "chikatetsu", english: "Subway" },
      { japanese: "小さな (ちいさな)", romaji: "chiisana", english: "Small" }
    ]
  },
  {
    kana: "つ",
    romaji: "tsu",
    category: "basic",
    group: "T-Row",
    examples: [
      { japanese: "机 (つくえ)", romaji: "tsukue", english: "Desk / Table" },
      { japanese: "強い (つよい)", romaji: "tsuyoi", english: "Strong" }
    ]
  },
  {
    kana: "て",
    romaji: "te",
    category: "basic",
    group: "T-Row",
    examples: [
      { japanese: "手紙 (てがみ)", romaji: "tegami", english: "Letter" },
      { japanese: "天気 (てんき)", romaji: "tenki", english: "Weather" }
    ]
  },
  {
    kana: "と",
    romaji: "to",
    category: "basic",
    group: "T-Row",
    examples: [
      { japanese: "友達 (ともだち)", romaji: "tomodachi", english: "Friend" },
      { japanese: "時計 (とけい)", romaji: "tokei", english: "Clock" }
    ]
  },
  // N-Row
  {
    kana: "な",
    romaji: "na",
    category: "basic",
    group: "N-Row",
    examples: [
      { japanese: "夏 (なつ)", romaji: "natsu", english: "Summer" },
      { japanese: "名前 (なまえ)", romaji: "namae", english: "Name" }
    ]
  },
  {
    kana: "に",
    romaji: "ni",
    category: "basic",
    group: "N-Row",
    examples: [
      { japanese: "虹 (にじ)", romaji: "niji", english: "Rainbow" },
      { japanese: "日記 (にっき)", romaji: "nikki", english: "Diary" }
    ]
  },
  {
    kana: "ぬ",
    romaji: "nu",
    category: "basic",
    group: "N-Row",
    examples: [
      { japanese: "ぬいぐるみ (ぬいぐるみ)", romaji: "nuigurumi", english: "Stuffed Animal" },
      { japanese: "温かい (ぬくい)", romaji: "nukui", english: "Warm" }
    ]
  },
  {
    kana: "ね",
    romaji: "ne",
    category: "basic",
    group: "N-Row",
    examples: [
      { japanese: "猫 (ねこ)", romaji: "neko", english: "Cat" },
      { japanese: "願い (ねがい)", romaji: "negai", english: "Wish" }
    ]
  },
  {
    kana: "の",
    romaji: "no",
    category: "basic",
    group: "N-Row",
    examples: [
      { japanese: "飲み物 (のみもの)", romaji: "nomimono", english: "Beverage" },
      { japanese: "ノート (のーと)", romaji: "no-to", english: "Notebook" }
    ]
  },
  // H-Row
  {
    kana: "は",
    romaji: "ha",
    category: "basic",
    group: "H-Row",
    examples: [
      { japanese: "花火 (はなび)", romaji: "hanabi", english: "Fireworks" },
      { japanese: "春 (はる)", romaji: "haru", english: "Spring" }
    ]
  },
  {
    kana: "ひ",
    romaji: "hi",
    category: "basic",
    group: "H-Row",
    examples: [
      { japanese: "光 (ひかり)", romaji: "hikari", english: "Light" },
      { japanese: "秘密 (ひみつ)", romaji: "himitsu", english: "Secret" }
    ]
  },
  {
    kana: "ふ",
    romaji: "fu",
    category: "basic",
    group: "H-Row",
    examples: [
      { japanese: "富士山 (ふじさん)", romaji: "fujisan", english: "Mount Fuji" },
      { japanese: "冬 (ふゆ)", romaji: "fuyu", english: "Winter" }
    ]
  },
  {
    kana: "へ",
    romaji: "he",
    category: "basic",
    group: "H-Row",
    examples: [
      { japanese: "部屋 (へや)", romaji: "heya", english: "Room" },
      { japanese: "平和 (へいわ)", romaji: "heiwa", english: "Peace" }
    ]
  },
  {
    kana: "ほ",
    romaji: "ho",
    category: "basic",
    group: "H-Row",
    examples: [
      { japanese: "星 (ほし)", romaji: "hoshi", english: "Star" },
      { japanese: "本 (ほん)", romaji: "hon", english: "Book" }
    ]
  },
  // M-Row
  {
    kana: "ま",
    romaji: "ma",
    category: "basic",
    group: "M-Row",
    examples: [
      { japanese: "街 (まち)", romaji: "machi", english: "Town" },
      { japanese: "窓 (まど)", romaji: "mado", english: "Window" }
    ]
  },
  {
    kana: "み",
    romaji: "mi",
    category: "basic",
    group: "M-Row",
    examples: [
      { japanese: "緑 (みどり)", romaji: "midori", english: "Green" },
      { japanese: "水 (みず)", romaji: "mizu", english: "Water" }
    ]
  },
  {
    kana: "む",
    romaji: "mu",
    category: "basic",
    group: "M-Row",
    examples: [
      { japanese: "虫 (むし)", romaji: "mushi", english: "Insect / Bug" },
      { japanese: "昔 (むかし)", romaji: "mukashi", english: "Long Ago" }
    ]
  },
  {
    kana: "め",
    romaji: "me",
    category: "basic",
    group: "M-Row",
    examples: [
      { japanese: "眼鏡 (めがね)", romaji: "megane", english: "Glasses" },
      { japanese: "珍しい (めずらしい)", romaji: "mezurashii", english: "Rare" }
    ]
  },
  {
    kana: "も",
    romaji: "mo",
    category: "basic",
    group: "M-Row",
    examples: [
      { japanese: "森 (もり)", romaji: "mori", english: "Forest" },
      { japanese: "桃 (もも)", romaji: "momo", english: "Peach" }
    ]
  },
  // Y-Row
  {
    kana: "や",
    romaji: "ya",
    category: "basic",
    group: "Y-Row",
    examples: [
      { japanese: "山 (やま)", romaji: "yama", english: "Mountain" },
      { japanese: "優しい (やさしい)", romaji: "yasashii", english: "Kind" }
    ]
  },
  {
    kana: "ゆ",
    romaji: "yu",
    category: "basic",
    group: "Y-Row",
    examples: [
      { japanese: "雪 (ゆき)", romaji: "yuki", english: "Snow" },
      { japanese: "夢 (ゆめ)", romaji: "yume", english: "Dream" }
    ]
  },
  {
    kana: "よ",
    romaji: "yo",
    category: "basic",
    group: "Y-Row",
    examples: [
      { japanese: "夜 (よる)", romaji: "yoru", english: "Night" },
      { japanese: "喜び (よろこび)", romaji: "yorokobi", english: "Joy" }
    ]
  },
  // R-Row
  {
    kana: "ら",
    romaji: "ra",
    category: "basic",
    group: "R-Row",
    examples: [
      { japanese: "落雷 (らくらい)", romaji: "rakurai", english: "Thunderbolt" },
      { japanese: "来週 (らいしゅう)", romaji: "raishu", english: "Next Week" }
    ]
  },
  {
    kana: "り",
    romaji: "ri",
    category: "basic",
    group: "R-Row",
    examples: [
      { japanese: "林檎 (りんご)", romaji: "ringo", english: "Apple" },
      { japanese: "旅行 (りょこう)", romaji: "ryokou", english: "Travel" }
    ]
  },
  {
    kana: "る",
    romaji: "ru",
    category: "basic",
    group: "R-Row",
    examples: [
      { japanese: "留守 (るす)", romaji: "rusu", english: "Absence" },
      { japanese: "明るい (あかるい)", romaji: "akarui", english: "Bright" }
    ]
  },
  {
    kana: "れ",
    romaji: "re",
    category: "basic",
    group: "R-Row",
    examples: [
      { japanese: "歴史 (れきし)", romaji: "rekishi", english: "History" },
      { japanese: "冷蔵庫 (れいぞうこ)", romaji: "reizouko", english: "Fridge" }
    ]
  },
  {
    kana: "ろ",
    romaji: "ro",
    category: "basic",
    group: "R-Row",
    examples: [
      { japanese: "廊下 (ろうか)", romaji: "rouka", english: "Corridor / Hall" },
      { japanese: "蝋燭 (ろうそく)", romaji: "rousoku", english: "Candle" }
    ]
  },
  // W-Row
  {
    kana: "わ",
    romaji: "wa",
    category: "basic",
    group: "W-Row",
    examples: [{ japanese: "笑う (わらう)", romaji: "warau", english: "To Laugh" }]
  },
  {
    kana: "を",
    romaji: "wo",
    category: "basic",
    group: "W-Row",
    examples: [{ japanese: "本を読む (ほんをよむ)", romaji: "hon wo yomu", english: "Read a book" }]
  },
  {
    kana: "ん",
    romaji: "n",
    category: "basic",
    group: "W-Row",
    examples: [{ japanese: "林檎 (りんご)", romaji: "ringo", english: "Apple" }]
  },

  // DAKUON (Voiced)
  {
    kana: "が",
    romaji: "ga",
    category: "dakuon",
    group: "G-Row",
    examples: [{ japanese: "学校 (がっこう)", romaji: "gakkou", english: "School" }]
  },
  {
    kana: "ぎ",
    romaji: "gi",
    category: "dakuon",
    group: "G-Row",
    examples: [{ japanese: "ギター (ぎたー)", romaji: "gita-", english: "Guitar" }]
  },
  {
    kana: "ぐ",
    romaji: "gu",
    category: "dakuon",
    group: "G-Row",
    examples: [{ japanese: "軍艦 (ぐんかん)", romaji: "gunkan", english: "Battleship" }]
  },
  {
    kana: "げ",
    romaji: "ge",
    category: "dakuon",
    group: "G-Row",
    examples: [{ japanese: "ゲーム (げーむ)", romaji: "ge-mu", english: "Game" }]
  },
  {
    kana: "ご",
    romaji: "go",
    category: "dakuon",
    group: "G-Row",
    examples: [{ japanese: "午後 (ごご)", romaji: "gogo", english: "Afternoon" }]
  },
  {
    kana: "ざ",
    romaji: "za",
    category: "dakuon",
    group: "Z-Row",
    examples: [{ japanese: "財布 (さいふ)", romaji: "saifu", english: "Wallet" }]
  },
  {
    kana: "じ",
    romaji: "ji",
    category: "dakuon",
    group: "Z-Row",
    examples: [{ japanese: "時間 (じかん)", romaji: "jikan", english: "Time" }]
  },
  {
    kana: "ず",
    romaji: "zu",
    category: "dakuon",
    group: "Z-Row",
    examples: [{ japanese: "地図 (ちず)", romaji: "chizu", english: "Map" }]
  },
  {
    kana: "ぜ",
    romaji: "ze",
    category: "dakuon",
    group: "Z-Row",
    examples: [{ japanese: "全部 (ぜんぶ)", romaji: "zenbu", english: "All / Entirety" }]
  },
  {
    kana: "ぞ",
    romaji: "zo",
    category: "dakuon",
    group: "Z-Row",
    examples: [{ japanese: "象 (ぞう)", romaji: "zou", english: "Elephant" }]
  },
  {
    kana: "だ",
    romaji: "da",
    category: "dakuon",
    group: "D-Row",
    examples: [{ japanese: "台所 (だいどころ)", romaji: "daidokoro", english: "Kitchen" }]
  },
  {
    kana: "ぢ",
    romaji: "ji",
    category: "dakuon",
    group: "D-Row",
    examples: [{ japanese: "鼻血 (はなぢ)", romaji: "hanaji", english: "Nosebleed" }]
  },
  {
    kana: "づ",
    romaji: "zu",
    category: "dakuon",
    group: "D-Row",
    examples: [{ japanese: "手作り (てづくり)", romaji: "tezukuri", english: "Handmade" }]
  },
  {
    kana: "で",
    romaji: "de",
    category: "dakuon",
    group: "D-Row",
    examples: [{ japanese: "電車 (でんしゃ)", romaji: "densha", english: "Train" }]
  },
  {
    kana: "ど",
    romaji: "do",
    category: "dakuon",
    group: "D-Row",
    examples: [{ japanese: "泥棒 (どろぼう)", romaji: "dorobou", english: "Thief" }]
  },
  {
    kana: "ば",
    romaji: "ba",
    category: "dakuon",
    group: "B-Row",
    examples: [{ japanese: "場所 (ばしょ)", romaji: "basho", english: "Place / Location" }]
  },
  {
    kana: "び",
    romaji: "bi",
    category: "dakuon",
    group: "B-Row",
    examples: [{ japanese: "病院 (びょういん)", romaji: "byouin", english: "Hospital" }]
  },
  {
    kana: "ぶ",
    romaji: "bu",
    category: "dakuon",
    group: "B-Row",
    examples: [{ japanese: "豚肉 (ぶたにく)", romaji: "butaniku", english: "Pork" }]
  },
  {
    kana: "べ",
    romaji: "be",
    category: "dakuon",
    group: "B-Row",
    examples: [{ japanese: "勉強 (べんきょう)", romaji: "benkyou", english: "Study" }]
  },
  {
    kana: "ぼ",
    romaji: "bo",
    category: "dakuon",
    group: "B-Row",
    examples: [{ japanese: "帽子 (ぼうし)", romaji: "boushi", english: "Hat / Cap" }]
  },

  // HANDAKUON
  {
    kana: "ぱ",
    romaji: "pa",
    category: "handakuon",
    group: "P-Row",
    examples: [{ japanese: "パン (ぱん)", romaji: "pan", english: "Bread" }]
  },
  {
    kana: "ぴ",
    romaji: "pi",
    category: "handakuon",
    group: "P-Row",
    examples: [{ japanese: "ピカピカ (ぴかぴか)", romaji: "pikapika", english: "Shiny" }]
  },
  {
    kana: "ぷ",
    romaji: "pu",
    category: "handakuon",
    group: "P-Row",
    examples: [{ japanese: "プリン (ぷりん)", romaji: "purin", english: "Pudding" }]
  },
  {
    kana: "ぺ",
    romaji: "pe",
    category: "handakuon",
    group: "P-Row",
    examples: [{ japanese: "ページ (ぺーじ)", romaji: "pe-ji", english: "Page" }]
  },
  {
    kana: "ぽ",
    romaji: "po",
    category: "handakuon",
    group: "P-Row",
    examples: [{ japanese: "ポスト (ぽすと)", romaji: "posuto", english: "Mailbox" }]
  },

  // YOON
  {
    kana: "きゃ",
    romaji: "kya",
    category: "yoon",
    group: "Ky-Row",
    examples: [{ japanese: "客 (きゃく)", romaji: "kyaku", english: "Guest" }]
  },
  {
    kana: "きゅ",
    romaji: "kyu",
    category: "yoon",
    group: "Ky-Row",
    examples: [{ japanese: "救急車 (きゅうきゅうしゃ)", romaji: "kyuukyuusha", english: "Ambulance" }]
  },
  {
    kana: "きょ",
    romaji: "kyo",
    category: "yoon",
    group: "Ky-Row",
    examples: [{ japanese: "今日 (きょう)", romaji: "kyou", english: "Today" }]
  },
  {
    kana: "しゃ",
    romaji: "sha",
    category: "yoon",
    group: "Sh-Row",
    examples: [{ japanese: "社会 (しゃかい)", romaji: "shakai", english: "Society" }]
  },
  {
    kana: "しゅ",
    romaji: "shu",
    category: "yoon",
    group: "Sh-Row",
    examples: [{ japanese: "宿題 (しゅくだい)", romaji: "shukudai", english: "Homework" }]
  },
  {
    kana: "しょ",
    romaji: "sho",
    category: "yoon",
    group: "Sh-Row",
    examples: [{ japanese: "植物 (しょくぶつ)", romaji: "shokubutsu", english: "Plant" }]
  },
  {
    kana: "ちゃ",
    romaji: "cha",
    category: "yoon",
    group: "Ch-Row",
    examples: [{ japanese: "茶碗 (ちゃわん)", romaji: "chawan", english: "Rice Bowl" }]
  },
  {
    kana: "ちゅ",
    romaji: "chu",
    category: "yoon",
    group: "Ch-Row",
    examples: [{ japanese: "注射 (ちゅうしゃ)", romaji: "chuusha", english: "Injection" }]
  },
  {
    kana: "ちょ",
    romaji: "cho",
    category: "yoon",
    group: "Ch-Row",
    examples: [{ japanese: "貯金 (ちょきん)", romaji: "chokin", english: "Savings / Deposit" }]
  },
  {
    kana: "にゃ",
    romaji: "nya",
    category: "yoon",
    group: "Ny-Row",
    examples: [{ japanese: "にゃんこ (にゃんこ)", romaji: "nyanko", english: "Kitten" }]
  },
  {
    kana: "にゅ",
    romaji: "nyu",
    category: "yoon",
    group: "Ny-Row",
    examples: [{ japanese: "牛乳 (ぎゅうにゅう)", romaji: "gyuunyuu", english: "Milk" }]
  },
  {
    kana: "にょ",
    romaji: "nyo",
    category: "yoon",
    group: "Ny-Row",
    examples: [{ japanese: "女房 (にょうぼう)", romaji: "nyoubou", english: "Wife" }]
  },
  {
    kana: "ひゃ",
    romaji: "hya",
    category: "yoon",
    group: "Hy-Row",
    examples: [{ japanese: "百 (ひゃく)", romaji: "hyaku", english: "One Hundred" }]
  },
  {
    kana: "ひゅ",
    romaji: "hyu",
    category: "yoon",
    group: "Hy-Row",
    examples: [{ japanese: "ヒューストン (ひゅーすとん)", romaji: "hyu-ston", english: "Houston" }]
  },
  {
    kana: "ひょ",
    romaji: "hyo",
    category: "yoon",
    group: "Hy-Row",
    examples: [{ japanese: "評判 (ひょうばん)", romaji: "hyouban", english: "Reputation" }]
  },
  {
    kana: "みゃ",
    romaji: "mya",
    category: "yoon",
    group: "My-Row",
    examples: [{ japanese: "脈 (みゃく)", romaji: "myaku", english: "Pulse" }]
  },
  {
    kana: "みゅ",
    romaji: "myu",
    category: "yoon",
    group: "My-Row",
    examples: [{ japanese: "ミュージック (みゅーじっく)", romaji: "myu-jikku", english: "Music" }]
  },
  {
    kana: "みょ",
    romaji: "myo",
    category: "yoon",
    group: "My-Row",
    examples: [{ japanese: "名字 (みょうじ)", romaji: "myouji", english: "Family name" }]
  },
  {
    kana: "りゃ",
    romaji: "rya",
    category: "yoon",
    group: "Ry-Row",
    examples: [{ japanese: "略 (りゃく)", romaji: "ryaku", english: "Abbreviation" }]
  },
  {
    kana: "りゅ",
    romaji: "ryu",
    category: "yoon",
    group: "Ry-Row",
    examples: [{ japanese: "留学 (りゅうがく)", romaji: "ryuugaku", english: "Study Abroad" }]
  },
  {
    kana: "りょ",
    romaji: "ryo",
    category: "yoon",
    group: "Ry-Row",
    examples: [{ japanese: "旅行 (りょこう)", romaji: "ryokou", english: "Travel / Trip" }]
  },
  {
    kana: "ぎゃ",
    romaji: "gya",
    category: "yoon",
    group: "Gy-Row",
    examples: [{ japanese: "逆 (ぎゃく)", romaji: "gyaku", english: "Opposite" }]
  },
  {
    kana: "ぎゅ",
    romaji: "gyu",
    category: "yoon",
    group: "Gy-Row",
    examples: [{ japanese: "牛乳 (ぎゅうにゅう)", romaji: "gyuunyuu", english: "Milk" }]
  },
  {
    kana: "ぎょ",
    romaji: "gyo",
    category: "yoon",
    group: "Gy-Row",
    examples: [{ japanese: "金魚 (きんぎょ)", romaji: "kingyo", english: "Goldfish" }]
  },
  {
    kana: "じゃ",
    romaji: "ja",
    category: "yoon",
    group: "J-Row",
    examples: [{ japanese: "邪魔 (じゃま)", romaji: "jama", english: "Hindrance" }]
  },
  {
    kana: "じゅ",
    romaji: "ju",
    category: "yoon",
    group: "J-Row",
    examples: [{ japanese: "授業 (じゅぎょう)", romaji: "jugyou", english: "Lesson / Class" }]
  },
  {
    kana: "じょ",
    romaji: "jo",
    category: "yoon",
    group: "J-Row",
    examples: [{ japanese: "女性 (じょせい)", romaji: "josei", english: "Woman / Female" }]
  },
  {
    kana: "びゃ",
    romaji: "bya",
    category: "yoon",
    group: "By-Row",
    examples: [{ japanese: "白夜 (びゃくや)", romaji: "byakuya", english: "Midnight Sun" }]
  },
  {
    kana: "びゅ",
    romaji: "byu",
    category: "yoon",
    group: "By-Row",
    examples: [{ japanese: "ビューティー (びゅーてぃー)", romaji: "byu-ti-", english: "Beauty" }]
  },
  {
    kana: "びょ",
    romaji: "byo",
    category: "yoon",
    group: "By-Row",
    examples: [{ japanese: "病院 (びょういん)", romaji: "byouin", english: "Hospital" }]
  },
  {
    kana: "ぴゃ",
    romaji: "pya",
    category: "yoon",
    group: "Py-Row",
    examples: [{ japanese: "ぴゃく (ぴゃく)", romaji: "pyaku", english: "Gasping / Fluttering (Onomatopoeia)" }]
  },
  {
    kana: "ぴゅ",
    romaji: "pyu",
    category: "yoon",
    group: "Py-Row",
    examples: [{ japanese: "ピューマ (ぴゅーま)", romaji: "pyu-ma", english: "Puma" }]
  },
  {
    kana: "ぴょ",
    romaji: "pyo",
    category: "yoon",
    group: "Py-Row",
    examples: [{ japanese: "ぴょんぴょん (ぴょんぴょん)", romaji: "pyonpyon", english: "Hopping" }]
  }
];

// EXACTLY 100 ANCIENT & BASIC N5 WORTHY KANJI
export const KANJI_DATA: KanjiItem[] = [
  // Numbers (1-10, 100, 1000, 10000, Yen) [14]
  { kanji: "一", meaning: "One", onyomi: "イチ", onyomiRomaji: "ichi", kunyomi: "ひと-つ", kunyomiRomaji: "hito-tsu", mnemonic: "A single horizontal stroke representing one base unit.", strokeCount: 1, examples: [{ japanese: "一つ (ひとつ)", romaji: "hitotsu", english: "One (general object)" }, { japanese: "一日 (ついたち)", romaji: "tsuitachi", english: "1st day of month" }] },
  { kanji: "二", meaning: "Two", onyomi: "ニ", onyomiRomaji: "ni", kunyomi: "ふた-つ", kunyomiRomaji: "futa-tsu", mnemonic: "Two parallel horizontal strokes layered together.", strokeCount: 2, examples: [{ japanese: "二つ (ふたつ)", romaji: "futatsu", english: "Two items" }, { japanese: "二月 (にがつ)", romaji: "nigatsu", english: "February" }] },
  { kanji: "三", meaning: "Three", onyomi: "サン", onyomiRomaji: "san", kunyomi: "みっ-つ", kunyomiRomaji: "mit-tsu", mnemonic: "Three stacked steps of strokes denoting harmony.", strokeCount: 3, examples: [{ japanese: "三つ (みっつ)", romaji: "mittsu", english: "Three items" }, { japanese: "三日 (みっか)", romaji: "mikka", english: "3rd day of month" }] },
  { kanji: "四", meaning: "Four", onyomi: "シ", onyomiRomaji: "shi", kunyomi: "よ、よっ-つ", kunyomiRomaji: "yo, yot-tsu", mnemonic: "A four-sided window frame showing elegant inner curtains.", strokeCount: 5, examples: [{ japanese: "四つ (よっつ)", romaji: "yottsu", english: "Four items" }, { japanese: "四月 (しがつ)", romaji: "shigatsu", english: "April" }] },
  { kanji: "五", meaning: "Five", onyomi: "ゴ", onyomiRomaji: "go", kunyomi: "いつ-つ", kunyomiRomaji: "itsu-tsu", mnemonic: "Five crossing beams resembling an ancient counting gate.", strokeCount: 4, examples: [{ japanese: "五つ (いつつ)", romaji: "itsutsu", english: "Five items" }, { japanese: "五日 (いつか)", romaji: "itsuka", english: "5th day of month" }] },
  { kanji: "六", meaning: "Six", onyomi: "ロク", onyomiRomaji: "roku", kunyomi: "むっ-つ", kunyomiRomaji: "mut-tsu", mnemonic: "A small stove with six tiny vents or supporting legs.", strokeCount: 4, examples: [{ japanese: "六つ (むっつ)", romaji: "muttsu", english: "Six items" }, { japanese: "六日 (むいか)", romaji: "muika", english: "6th day of month" }] },
  { kanji: "七", meaning: "Seven", onyomi: "シチ", onyomiRomaji: "shichi", kunyomi: "なな-つ", kunyomiRomaji: "nana-tsu", mnemonic: "An upside-down symbol of agricultural roots cutting earth.", strokeCount: 2, examples: [{ japanese: "七つ (ななつ)", romaji: "nanatsu", english: "Seven items" }, { japanese: "七月 (しちがつ)", romaji: "shichigatsu", english: "July" }] },
  { kanji: "八", meaning: "Eight", onyomi: "ハチ", onyomiRomaji: "hachi", kunyomi: "よう、やっ-つ", kunyomiRomaji: "you, yat-tsu", mnemonic: "Two strokes dividing outward to represent splitting in half.", strokeCount: 2, examples: [{ japanese: "八つ (やっつ)", romaji: "yattsu", english: "Eight items" }, { japanese: "八日 (ようか)", romaji: "youka", english: "8th day of month" }] },
  { kanji: "九", meaning: "Nine", onyomi: "キュウ", onyomiRomaji: "kyuu", kunyomi: "ここの-つ", kunyomiRomaji: "kokono-tsu", mnemonic: "A bended hook reaching upwards near the value limit.", strokeCount: 2, examples: [{ japanese: "九つ (ここのつ)", romaji: "kokonotsu", english: "Nine items" }, { japanese: "九月 (くがつ)", romaji: "kugatsu", english: "September" }] },
  { kanji: "十", meaning: "Ten", onyomi: "ジュウ", onyomiRomaji: "juu", kunyomi: "とお", kunyomiRomaji: "too", mnemonic: "A horizontal and vertical intersection, a complete block.", strokeCount: 2, examples: [{ japanese: "十日 (とおか)", romaji: "tooka", english: "10th day of month" }, { japanese: "十分 (じゅうぶん)", romaji: "juubun", english: "Enough / Sufficient" }] },
  { kanji: "百", meaning: "Hundred", onyomi: "ヒャク", onyomiRomaji: "hyaku", kunyomi: "もも", kunyomiRomaji: "momo", mnemonic: "A marking line pointing above the white 'sun' character.", strokeCount: 6, examples: [{ japanese: "三百 (さんびゃく)", romaji: "sanbyaku", english: "Three Hundred" }, { japanese: "百日 (ひゃくにち)", romaji: "hyakunichi", english: "One Hundred Days" }] },
  { kanji: "千", meaning: "Thousand", onyomi: "セン", onyomiRomaji: "sen", kunyomi: "ち", kunyomiRomaji: "chi", mnemonic: "The digit Ten intersected by an extra stroke indicating scale.", strokeCount: 3, examples: [{ japanese: "千円 (せんえん)", romaji: "sen-en", english: "1000 Yen" }, { japanese: "千葉県 (ちばけん)", romaji: "chiba-ken", english: "Chiba Prefecture" }] },
  { kanji: "万", meaning: "Ten Thousand", onyomi: "マン", onyomiRomaji: "man", kunyomi: "よろず", kunyomiRomaji: "yorozu", mnemonic: "A flag waving above a wide base of ten thousand people.", strokeCount: 3, examples: [{ japanese: "一万 (いちまん)", romaji: "ichiman", english: "10,000" }, { japanese: "万国 (ばんこく)", romaji: "bankoku", english: "All nations" }] },
  { kanji: "円", meaning: "Yen / Circle", onyomi: "エン", onyomiRomaji: "en", kunyomi: "まる-い", kunyomiRomaji: "maru-i", mnemonic: "An enclosed circular structure denoting coin currency.", strokeCount: 4, examples: [{ japanese: "十円 (じゅうえん)", romaji: "juu-en", english: "10 Yen" }, { japanese: "円い (まるい)", romaji: "marui", english: "Round / Circular" }] },

  // Nature / Time / Days [17]
  { kanji: "日", meaning: "Sun / Day", onyomi: "ニチ、ジツ", onyomiRomaji: "nichi, jitsu", kunyomi: "ひ、び", kunyomiRomaji: "hi, bi", mnemonic: "Rectangle framing a horizontal ray splitting its core.", strokeCount: 4, examples: [{ japanese: "日本 (にほん)", romaji: "nihon", english: "Japan" }, { japanese: "毎日 (まいにち)", romaji: "mainichi", english: "Every day" }] },
  { kanji: "月", meaning: "Moon / Month", onyomi: "ゲツ", onyomiRomaji: "getsu", kunyomi: "つき", kunyomiRomaji: "tsuki", mnemonic: "A crescent moon showing dual inner atmospheric stripes.", strokeCount: 4, examples: [{ japanese: "月曜日 (げつようび)", romaji: "getsuyoubi", english: "Monday" }, { japanese: "今月 (こんげつ)", romaji: "kongetsu", english: "This month" }] },
  { kanji: "火", meaning: "Fire", onyomi: "カ", onyomiRomaji: "ka", kunyomi: "ひ", kunyomiRomaji: "hi", mnemonic: "A glowing central bonfire throwing sparks upwards.", strokeCount: 4, examples: [{ japanese: "火曜日 (かようび)", romaji: "kayoubi", english: "Tuesday" }, { japanese: "火山 (かざん)", romaji: "kazan", english: "Volcano" }] },
  { kanji: "水", meaning: "Water", onyomi: "スイ", onyomiRomaji: "sui", kunyomi: "みず", kunyomiRomaji: "mizu", mnemonic: "A bubbling main current splashing ripples around.", strokeCount: 4, examples: [{ japanese: "水曜日 (すいようび)", romaji: "suiyoubi", english: "Wednesday" }, { japanese: "お水 (おみず)", romaji: "omizu", english: "Water" }] },
  { kanji: "木", meaning: "Tree", onyomi: "モク", onyomiRomaji: "moku", kunyomi: "き", kunyomiRomaji: "ki", mnemonic: "A trunk branch sending direct supportive roots downwards.", strokeCount: 4, examples: [{ japanese: "木曜日 (もくようび)", romaji: "mokuyoubi", english: "Thursday" }, { japanese: "大木 (たいぼく)", romaji: "taiboku", english: "Great Tree" }] },
  { kanji: "金", meaning: "Gold / Metal", onyomi: "キン", onyomiRomaji: "kin", kunyomi: "かね", kunyomiRomaji: "kane", mnemonic: "Gleaming metal particles inside the dark mine vault.", strokeCount: 8, examples: [{ japanese: "金曜日 (きんようび)", romaji: "kinyoubi", english: "Friday" }, { japanese: "お金 (おかね)", romaji: "okane", english: "Money" }] },
  { kanji: "土", meaning: "Soil / Earth", onyomi: "ド、ト", onyomiRomaji: "do, to", kunyomi: "つち", kunyomiRomaji: "tsuchi", mnemonic: "A botanical sprout bursting above the packed floor.", strokeCount: 3, examples: [{ japanese: "土曜日 (どようび)", romaji: "doyoubi", english: "Saturday" }, { japanese: "土地 (とち)", romaji: "tochi", english: "Land" }] },
  { kanji: "山", meaning: "Mountain", onyomi: "サン", onyomiRomaji: "san", kunyomi: "やま", kunyomiRomaji: "yama", mnemonic: "Three vertical physical peaks climbing coordinates.", strokeCount: 3, examples: [{ japanese: "富士山 (ふじさん)", romaji: "fujisan", english: "Mount Fuji" }, { japanese: "山川 (やまかわ)", romaji: "yamakawa", english: "Mountains & rivers" }] },
  { kanji: "川", meaning: "River", onyomi: "セン", onyomiRomaji: "sen", kunyomi: "かわ", kunyomiRomaji: "kawa", mnemonic: "Streams of active water washing valleys down.", strokeCount: 3, examples: [{ japanese: "川沿い (かわぞい)", romaji: "kawazoi", english: "Along the river" }, { japanese: "小川 (おがわ)", romaji: "ogawa", english: "Brook / Stream" }] },
  { kanji: "田", meaning: "Rice Field", onyomi: "デン", onyomiRomaji: "den", kunyomi: "た、だ", kunyomiRomaji: "ta, da", mnemonic: "Grid plot representing multiple sections of agricultural land.", strokeCount: 5, examples: [{ japanese: "山田 (やまだ)", romaji: "yamada", english: "Yamada (Surname)" }, { japanese: "水田 (すいでん)", romaji: "suiden", english: "Paddy Field" }] },
  { kanji: "天", meaning: "Heaven / Sky", onyomi: "テン", onyomiRomaji: "ten", kunyomi: "あま", kunyomiRomaji: "ama", mnemonic: "A giant figure reaching up way past high clouds.", strokeCount: 4, examples: [{ japanese: "天気 (てんき)", romaji: "tenki", english: "Weather" }, { japanese: "天国 (てんごく)", romaji: "tengoku", english: "Heaven / Paradise" }] },
  { kanji: "気", meaning: "Spirit / Air", onyomi: "キ", onyomiRomaji: "ki", kunyomi: "いき", kunyomiRomaji: "iki", mnemonic: "Warm vapor or steam rising up above hot boiling rice.", strokeCount: 6, examples: [{ japanese: "元気 (げんき)", romaji: "genki", english: "Healthy / Vigorous" }, { japanese: "人気 (にんき)", romaji: "ninki", english: "Popularity" }] },
  { kanji: "雨", meaning: "Rain", onyomi: "ウ", onyomiRomaji: "u", kunyomi: "あめ", kunyomiRomaji: "ame", mnemonic: "Atmospheric grid with water droplets dripping off clouds.", strokeCount: 8, examples: [{ japanese: "雨天 (うてん)", romaji: "uten", english: "Rainy Weather" }, { japanese: "大雨 (おおあめ)", romaji: "ooame", english: "Heavy Rain" }] },
  { kanji: "電", meaning: "Electricity", onyomi: "デン", onyomiRomaji: "den", kunyomi: "いなずま", kunyomiRomaji: "inazuma", mnemonic: "Flashes of energy or lightning falling through the rain clouds.", strokeCount: 13, examples: [{ japanese: "電車 (でんしゃ)", romaji: "densha", english: "Train" }, { japanese: "電話 (でんわ)", romaji: "denwa", english: "Telephone" }] },
  { kanji: "空", meaning: "Sky / Empty", onyomi: "クウ", onyomiRomaji: "kuu", kunyomi: "そら、あ-く", kunyomiRomaji: "sora, a-ku", mnemonic: "Searching below an open cave canopy with endless airspace.", strokeCount: 8, examples: [{ japanese: "空気 (くうき)", romaji: "kuuki", english: "Air / Atmosphere" }, { japanese: "空手 (からて)", romaji: "karate", english: "Karate" }] },
  { kanji: "白", meaning: "White", onyomi: "ハク", onyomiRomaji: "haku", kunyomi: "しろ-い", kunyomiRomaji: "shiro-i", mnemonic: "A single clean drop reflecting from a bright candle flame.", strokeCount: 5, examples: [{ japanese: "白い (しろい)", romaji: "shiroi", english: "White (Adjective)" }, { japanese: "白人 (はくじん)", romaji: "hakujin", english: "Caucasian" }] },
  { kanji: "赤", meaning: "Red", onyomi: "セキ", onyomiRomaji: "seki", kunyomi: "あか-い", kunyomiRomaji: "aka-i", mnemonic: "A fire heating base earth into glowing crimson colors.", strokeCount: 7, examples: [{ japanese: "赤い (あかい)", romaji: "akai", english: "Red" }, { japanese: "赤ん坊 (あかんぼう)", romaji: "akanbou", english: "Baby" }] },

  // Directions / Space / Position [14]
  { kanji: "上", meaning: "Up / Above", onyomi: "ジョウ", onyomiRomaji: "jou", kunyomi: "うえ、あ-げる", kunyomiRomaji: "ue, a-geru", mnemonic: "An indicator line mapped above a foundational horizon.", strokeCount: 3, examples: [{ japanese: "上手 (じょうず)", romaji: "jouzu", english: "Skilled" }, { japanese: "上げる (あげる)", romaji: "ageru", english: "To raise" }] },
  { kanji: "下", meaning: "Down / Below", onyomi: "カ、ゲ", onyomiRomaji: "ka, ge", kunyomi: "した、さ-げる", kunyomiRomaji: "shita, sa-geru", mnemonic: "A suspended coordinate indicator pointing below the shelf.", strokeCount: 3, examples: [{ japanese: "下手 (へた)", romaji: "heta", english: "Unskilled" }, { japanese: "下がる (さがる)", romaji: "sagaru", english: "To descend" }] },
  { kanji: "左", meaning: "Left", onyomi: "サ", onyomiRomaji: "sa", kunyomi: "ひだり", kunyomiRomaji: "hidari", mnemonic: "A hand holding an angle tool or ruler towards the left.", strokeCount: 5, examples: [{ japanese: "左手 (ひだりて)", romaji: "hidarite", english: "Left Hand" }, { japanese: "左右 (さゆう)", romaji: "sayuu", english: "Left & Right" }] },
  { kanji: "右", meaning: "Right", onyomi: "ウ、ユウ", onyomiRomaji: "u, yuu", kunyomi: "みぎ", kunyomiRomaji: "migi", mnemonic: "A hand lifting a spoon or speaking words towards the mouth.", strokeCount: 5, examples: [{ japanese: "右手 (みぎて)", romaji: "migite", english: "Right Hand" }, { japanese: "右側 (みぎがわ)", romaji: "migigawa", english: "Right side" }] },
  { kanji: "中", meaning: "Middle / Inside", onyomi: "チュウ", onyomiRomaji: "chuu", kunyomi: "なか", kunyomiRomaji: "naka", mnemonic: "An arrow cleanly piercing the exact center of a shield.", strokeCount: 4, examples: [{ japanese: "中学校 (ちゅうがっこう)", romaji: "chuugakkou", english: "Junior High" }, { japanese: "一日中 (いちにちじゅう)", romaji: "ichinichijuu", english: "All day long" }] },
  { kanji: "外", meaning: "Outside", onyomi: "ガイ", onyomiRomaji: "gai", kunyomi: "そと、はず-す", kunyomiRomaji: "soto, hazu-su", mnemonic: "A crescent moon seen outside beyond protective fences.", strokeCount: 5, examples: [{ japanese: "外国 (がいこく)", romaji: "gaikoku", english: "Foreign country" }, { japanese: "外出 (がいしゅつ)", romaji: "gaishutsu", english: "Going out" }] },
  { kanji: "前", meaning: "Before / Front", onyomi: "ゼン", onyomiRomaji: "zen", kunyomi: "まえ", kunyomiRomaji: "mae", mnemonic: "Standing in front with scissors and tracking timing.", strokeCount: 9, examples: [{ japanese: "名前 (なまえ)", romaji: "namae", english: "Name" }, { japanese: "午前 (ごぜん)", romaji: "gozen", english: "A.M." }] },
  { kanji: "後", meaning: "Behind / After", onyomi: "ゴ、コウ", onyomiRomaji: "go, kou", kunyomi: "うしろ、あと", kunyomiRomaji: "ushiro, ato", mnemonic: "Slow walking speed with tied footprints trailing behind.", strokeCount: 9, examples: [{ japanese: "午後 (ごご)", romaji: "gogo", english: "P.M." }, { japanese: "後ろ (うしろ)", romaji: "ushiro", english: "Behind" }] },
  { kanji: "東", meaning: "East", onyomi: "トウ", onyomiRomaji: "tou", kunyomi: "ひがし", kunyomiRomaji: "higashi", mnemonic: "The sun rising directly behind a green landscape tree.", strokeCount: 8, examples: [{ japanese: "東京 (とうきょう)", romaji: "toukyou", english: "Tokyo" }, { japanese: "東口 (ひがしぐち)", romaji: "higashiguchi", english: "East Entrance" }] },
  { kanji: "西", meaning: "West", onyomi: "セイ", onyomiRomaji: "sei", kunyomi: "にし", kunyomiRomaji: "nishi", mnemonic: "Birds flying down into their warm nest as sunset nears.", strokeCount: 6, examples: [{ japanese: "西洋 (せいよう)", romaji: "seiyou", english: "The West / Occident" }, { japanese: "西口 (にしぐち)", romaji: "nishiguchi", english: "West Entrance" }] },
  { kanji: "南", meaning: "South", onyomi: "ナン", onyomiRomaji: "nan", kunyomi: "みなみ", kunyomiRomaji: "minami", mnemonic: "Warm air catching inside a vegetation garden shelter.", strokeCount: 9, examples: [{ japanese: "南国 (なんごく)", romaji: "nangoku", english: "Southern Countries" }, { japanese: "南口 (みなみぐち)", romaji: "minamiguchi", english: "South Entrance" }] },
  { kanji: "北", meaning: "North", onyomi: "ホク", onyomiRomaji: "hoku", kunyomi: "きた", kunyomiRomaji: "kita", mnemonic: "Two figures sitting back-to-back because of icy winds.", strokeCount: 5, examples: [{ japanese: "北海道 (ほっかいどう)", romaji: "hokkaido", english: "Hokkaido" }, { japanese: "北側 (きたがわ)", romaji: "kitagawa", english: "North side" }] },
  { kanji: "間", meaning: "Interval / Between", onyomi: "カン", onyomiRomaji: "kan", kunyomi: "あいだ、ま", kunyomiRomaji: "aida, ma", mnemonic: "Sunlight peeking out through closed wooden gate cracks.", strokeCount: 12, examples: [{ japanese: "時間 (じかん)", romaji: "jikan", english: "Time" }, { japanese: "間食 (かんしょく)", romaji: "kanshoku", english: "Snacking" }] },
  { kanji: "校", meaning: "School", onyomi: "コウ", onyomiRomaji: "kou", kunyomi: "かせ", kunyomiRomaji: "kase", mnemonic: "A wooded tower structure where students collect ideas.", strokeCount: 10, examples: [{ japanese: "学校 (がっこう)", romaji: "gakkou", english: "School" }, { japanese: "校長 (こうちょう)", romaji: "kouchou", english: "Principal" }] },

  // People / Body Parts [12]
  { kanji: "人", meaning: "Person", onyomi: "ジン、ニン", onyomiRomaji: "jin, nin", kunyomi: "ひと", kunyomiRomaji: "hito", mnemonic: "A sideways profile of a bipedal figure standing.", strokeCount: 2, examples: [{ japanese: "あの人 (あのひと)", romaji: "ano hito", english: "That person" }, { japanese: "日本人 (にほんじん)", romaji: "nihonjin", english: "Japanese person" }] },
  { kanji: "子", meaning: "Child", onyomi: "シ、ス", onyomiRomaji: "shi, su", kunyomi: "こ", kunyomiRomaji: "ko", mnemonic: "A swaddled infant stretching its tiny arms wide.", strokeCount: 3, examples: [{ japanese: "子供 (こども)", romaji: "kodomo", english: "Child" }, { japanese: "様子 (ようす)", romaji: "yousu", english: "Situation / Appearance" }] },
  { kanji: "女", meaning: "Woman", onyomi: "ジョ", onyomiRomaji: "jo", kunyomi: "おんな", kunyomiRomaji: "onna", mnemonic: "A graceful kneeling figure bowing gently in respect.", strokeCount: 3, examples: [{ japanese: "女の子 (おんなのこ)", romaji: "onnanoko", english: "Girl" }, { japanese: "女性 (じょせい)", romaji: "josei", english: "Female / Woman" }] },
  { kanji: "男", meaning: "Man", onyomi: "ダン、ナン", onyomiRomaji: "dan, nan", kunyomi: "おとこ", kunyomiRomaji: "otoko", mnemonic: "Power or muscle working on active rice-plot fields.", strokeCount: 7, examples: [{ japanese: "男の子 (おとこのこ)", romaji: "otokonoko", english: "Boy" }, { japanese: "男性 (だんせい)", romaji: "dansei", english: "Male" }] },
  { kanji: "目", meaning: "Eye", onyomi: "モク", onyomiRomaji: "moku", kunyomi: "め", kunyomiRomaji: "me", mnemonic: "A vertical eye symbol with dual internal horizontal retinas.", strokeCount: 5, examples: [{ japanese: "目薬 (めぐすり)", romaji: "megusuri", english: "Eye Drops" }, { japanese: "目的 (もくてき)", romaji: "mokuteki", english: "Purpose / Aim" }] },
  { kanji: "口", meaning: "Mouth", onyomi: "コウ、ク", onyomiRomaji: "kou, ku", kunyomi: "くち、ぐち", kunyomiRomaji: "kuchi, guchi", mnemonic: "An open square frame outline of an active mouth.", strokeCount: 3, examples: [{ japanese: "出口 (でぐち)", romaji: "deguchi", english: "Exit" }, { japanese: "人口 (じんこう)", romaji: "jinkou", english: "Population" }] },
  { kanji: "耳", meaning: "Ear", onyomi: "ジ", onyomiRomaji: "ji", kunyomi: "みみ", kunyomiRomaji: "mimi", mnemonic: "The curly outer rim and inner cartilage lines of an ear.", strokeCount: 6, examples: [{ japanese: "初耳 (はつみみ)", romaji: "hatsumimi", english: "Hearing for first time" }] },
  { kanji: "手", meaning: "Hand", onyomi: "シュ", onyomiRomaji: "shu", kunyomi: "て", kunyomiRomaji: "te", mnemonic: "A outstretched palm displaying its clean fingerprint lines.", strokeCount: 4, examples: [{ japanese: "手紙 (てがみ)", romaji: "tegami", english: "Letter" }, { japanese: "歌手 (かしゅ)", romaji: "kashu", english: "Singer" }] },
  { kanji: "足", meaning: "Leg / Sufficient", onyomi: "ソク", onyomiRomaji: "soku", kunyomi: "あし、た-りる", kunyomiRomaji: "ashi, ta-riru", mnemonic: "A foot landing on an orthotic plane below the knee joint.", strokeCount: 7, examples: [{ japanese: "足首 (あしくび)", romaji: "ashikubi", english: "Ankle" }, { japanese: "足りる (たりる)", romaji: "tariru", english: "To be enough" }] },
  { kanji: "力", meaning: "Power / Muscle", onyomi: "リョク、リキ", onyomiRomaji: "ryoku, riki", kunyomi: "ちから", kunyomiRomaji: "chikara", mnemonic: "The curved flexing contour of a strong shoulder muscle.", strokeCount: 2, examples: [{ japanese: "実力 (じつりょく)", romaji: "jitsuryoku", english: "True ability" }, { japanese: "水力 (すいりょく)", romaji: "suiryoku", english: "Waterpower" }] },
  { kanji: "先", meaning: "Previous / Ahead", onyomi: "セン", onyomiRomaji: "sen", kunyomi: "さき", kunyomiRomaji: "saki", mnemonic: "A set of walking toes moving out ahead of anyone else.", strokeCount: 6, examples: [{ japanese: "先生 (せんせい)", romaji: "sensei", english: "Teacher" }, { japanese: "先月 (せんげつ)", romaji: "sengetsu", english: "Last month" }] },
  { kanji: "生", meaning: "Life / Born", onyomi: "セイ", onyomiRomaji: "sei", kunyomi: "う-まれる、なま", kunyomiRomaji: "u-mareru, nama", mnemonic: "A fresh green plant sprout breaking through solid earth.", strokeCount: 5, examples: [{ japanese: "生きる (いきる)", romaji: "ikiru", english: "To live" }, { japanese: "学生 (がくせい)", romaji: "gakusei", english: "Student" }] },

  // Actions & Core Verbs [18]
  { kanji: "見", meaning: "To See / Watch", onyomi: "ケン", onyomiRomaji: "ken", kunyomi: "み-る", kunyomiRomaji: "mi-ru", mnemonic: "An enormous eye character sitting on active, walking legs.", strokeCount: 7, examples: [{ japanese: "見る (みる)", romaji: "miru", english: "To see" }, { japanese: "見学 (けんがく)", romaji: "kengaku", english: "Study visit" }] },
  { kanji: "聞", meaning: "To Hear / Listen", onyomi: "ブン", onyomiRomaji: "bun", kunyomi: "き-く", kunyomiRomaji: "ki-ku", mnemonic: "An ear squeezed flat within a wooden gate, eavesdropping.", strokeCount: 14, examples: [{ japanese: "聞く (きく)", romaji: "kiku", english: "To listen" }, { japanese: "新聞 (しんぶん)", romaji: "shinbun", english: "Newspaper" }] },
  { kanji: "書", meaning: "To Write", onyomi: "ショ", onyomiRomaji: "sho", kunyomi: "か-く", kunyomiRomaji: "ka-ku", mnemonic: "A calligraphic brush writing on a square paper scroll.", strokeCount: 10, examples: [{ japanese: "書く (かく)", romaji: "kaku", english: "To write" }, { japanese: "図書館 (としょかん)", romaji: "toshokan", english: "Library" }] },
  { kanji: "読", meaning: "To Read", onyomi: "ドク", onyomiRomaji: "doku", kunyomi: "よ-む", kunyomiRomaji: "yo-む", mnemonic: "Speaking words aloud while studying scroll materials.", strokeCount: 14, examples: [{ japanese: "読む (よむ)", romaji: "yomu", english: "To read" }, { japanese: "読書 (どくしょ)", romaji: "dokusho", english: "Reading books" }] },
  { kanji: "話", meaning: "To Talk", onyomi: "ワ", onyomiRomaji: "wa", kunyomi: "はな-す、はなし", kunyomiRomaji: "hana-su, hanashi", mnemonic: "A tongue forming clean speech syllables beside a mouth.", strokeCount: 13, examples: [{ japanese: "話す (はなす)", romaji: "hanasu", english: "To speak" }, { japanese: "会話 (かいわ)", romaji: "kaiwa", english: "Conversation" }] },
  { kanji: "語", meaning: "Language / Word", onyomi: "ゴ", onyomiRomaji: "go", kunyomi: "かた-る", kunyomiRomaji: "kata-ru", mnemonic: "Speech combined with the numerical count of five mouths.", strokeCount: 14, examples: [{ japanese: "日本語 (にほんご)", romaji: "nihongo", english: "Japanese" }, { japanese: "単語 (たんご)", romaji: "tango", english: "Vocabulary" }] },
  { kanji: "行", meaning: "To Go", onyomi: "コウ", onyomiRomaji: "kou", kunyomi: "い-く、おこな-う", kunyomiRomaji: "i-ku", mnemonic: "The footprint grid of a busy crossway or street walk.", strokeCount: 6, examples: [{ japanese: "行く (いく)", romaji: "iku", english: "To go" }, { japanese: "行動 (こうどう)", romaji: "koudou", english: "Action" }] },
  { kanji: "来", meaning: "To Come", onyomi: "ライ", onyomiRomaji: "rai", kunyomi: "く-る", kunyomiRomaji: "ku-ru", mnemonic: "A tall wheat plant representing agricultural harvest arriving.", strokeCount: 7, examples: [{ japanese: "来る (くる)", romaji: "kuru", english: "To come" }, { japanese: "来年 (らいねん)", romaji: "rainen", english: "Next year" }] },
  { kanji: "出", meaning: "To Exit / Leave", onyomi: "シュツ", onyomiRomaji: "shutsu", kunyomi: "で-る、だ-す", kunyomiRomaji: "de-ru, da-su", mnemonic: "Two mountains stacked, showing a plant climbing out.", strokeCount: 5, examples: [{ japanese: "出る (でる)", romaji: "deru", english: "To exit" }, { japanese: "出口 (でぐち)", romaji: "deguchi", english: "Exit" }] },
  { kanji: "入", meaning: "To Enter", onyomi: "ニュウ", onyomiRomaji: "nyuu", kunyomi: "はい-る、い-れる", kunyomiRomaji: "hai-ru, i-reru", mnemonic: "A figure leaning forward to enter an open shelter canopy.", strokeCount: 2, examples: [{ japanese: "入る (はいる)", romaji: "hairu", english: "To enter" }, { japanese: "入口 (いりぐち)", romaji: "iriguchi", english: "Entrance" }] },
  { kanji: "会", meaning: "To Meet", onyomi: "カイ", onyomiRomaji: "kai", kunyomi: "あ-う", kunyomiRomaji: "a-u", mnemonic: "People gathering together under a large, protective roof.", strokeCount: 6, examples: [{ japanese: "会う (あう)", romaji: "au", english: "To meet" }, { japanese: "会社 (かいしゃ)", romaji: "kaisha", english: "Company" }] },
  { kanji: "食", meaning: "To Eat / Food", onyomi: "ショク", onyomiRomaji: "shoku", kunyomi: "た-べる", kunyomiRomaji: "ta-beru", mnemonic: "A triangular roof protecting a high-quality bowl of food.", strokeCount: 9, examples: [{ japanese: "食べる (たべる)", romaji: "taberu", english: "To eat" }, { japanese: "食堂 (しょくどう)", romaji: "shokudou", english: "Cafeteria" }] },
  { kanji: "飲", meaning: "To Drink", onyomi: "イン", onyomiRomaji: "in", kunyomi: "の-む", kunyomiRomaji: "no-mu", mnemonic: "A figure opening their mouth wide to swallow liquid.", strokeCount: 12, examples: [{ japanese: "飲む (のむ)", romaji: "nomu", english: "To drink" }, { japanese: "飲み薬 (のみぐすり)", romaji: "nomigusuri", english: "Liquid medicine" }] },
  { kanji: "買", meaning: "To Buy", onyomi: "バイ", onyomiRomaji: "bai", kunyomi: "か-う", kunyomiRomaji: "ka-u", mnemonic: "An ancient net trapping value above decorative cowrie shells.", strokeCount: 12, examples: [{ japanese: "買う (かう)", romaji: "kau", english: "To buy" }, { japanese: "買い物 (かいもの)", romaji: "kaimono", english: "Shopping" }] },
  { kanji: "売", meaning: "To Sell", onyomi: "バイ", onyomiRomaji: "bai", kunyomi: "う-る", kunyomiRomaji: "u-ru", mnemonic: "A merchant holding items up for sale above the floor counter.", strokeCount: 7, examples: [{ japanese: "売る (うる)", romaji: "uru", english: "To sell" }, { japanese: "売店 (ばいてん)", romaji: "baiten", english: "Stall / Shop" }] },
  { kanji: "休", meaning: "To Rest", onyomi: "キュウ", onyomiRomaji: "kyuu", kunyomi: "やす-む", kunyomiRomaji: "yas-mu", mnemonic: "A weary person leaning up against a sturdy woodland tree.", strokeCount: 6, examples: [{ japanese: "休む (やすむ)", romaji: "yasumu", english: "To rest" }, { japanese: "休日 (きゅうじつ)", romaji: "kyuujitsu", english: "Holiday" }] },
  { kanji: "立", meaning: "To Stand", onyomi: "リツ", onyomiRomaji: "ritsu", kunyomi: "た-つ", kunyomiRomaji: "ta-tsu", mnemonic: "A person standing tall on top of a flat base level.", strokeCount: 5, examples: [{ japanese: "立つ (たつ)", romaji: "tatsu", english: "To stand" }, { japanese: "起立 (きりつ)", romaji: "kiritsu", english: "Standing up" }] },
  { kanji: "言", meaning: "To Say", onyomi: "ゲン", onyomiRomaji: "gen", kunyomi: "い-う、こと", kunyomiRomaji: "i-u, koto", mnemonic: "Vocal pulses or words emerging out of a speakers mouth.", strokeCount: 7, examples: [{ japanese: "言う (いう)", romaji: "iu", english: "To say" }, { japanese: "言葉 (ことば)", romaji: "kotoba", english: "Words / Language" }] },

  // Size / State / Adjectives [13]
  { kanji: "大", meaning: "Large / Big", onyomi: "ダイ", onyomiRomaji: "dai", kunyomi: "おお-きい", kunyomiRomaji: "oo-kii", mnemonic: "A person stretching their limbs as wide as physically possible.", strokeCount: 3, examples: [{ japanese: "大きい (おおきい)", romaji: "ookii", english: "Big" }, { japanese: "大学 (だいがく)", romaji: "daigaku", english: "University" }] },
  { kanji: "小", meaning: "Small", onyomi: "ショウ", onyomiRomaji: "shou", kunyomi: "ちい-さい", kunyomiRomaji: "chii-sai", mnemonic: "An item divided into three tiny fractions with a hook.", strokeCount: 3, examples: [{ japanese: "小さい (ちいさい)", romaji: "chiisai", english: "Small" }, { japanese: "小学校 (しょうがっこう)", romaji: "shougakkou", english: "Elementary School" }] },
  { kanji: "高", meaning: "High / Tall / Expensive", onyomi: "コウ", onyomiRomaji: "kou", kunyomi: "たか-い", kunyomiRomaji: "taka-i", mnemonic: "The silhouette of a high, multistoried watchtower building.", strokeCount: 10, examples: [{ japanese: "高い (たかい)", romaji: "takai", english: "High / Tall / Expensive" }, { japanese: "高校 (こうこう)", romaji: "koukou", english: "High school" }] },
  { kanji: "安", meaning: "Cheap / Safe", onyomi: "アン", onyomiRomaji: "an", kunyomi: "やす-い", kunyomiRomaji: "yas-i", mnemonic: "A girl sitting relaxed and safe under a sturdy shelter roof.", strokeCount: 6, examples: [{ japanese: "安い (やすい)", romaji: "yasui", english: "Cheap" }, { japanese: "安全 (あんぜん)", romaji: "anzen", english: "Safety" }] },
  { kanji: "新", meaning: "New", onyomi: "シン", onyomiRomaji: "shin", kunyomi: "あたら-しい", kunyomiRomaji: "atara-shii", mnemonic: "Using a sharp stone tool or axe to chip fresh firewood.", strokeCount: 13, examples: [{ japanese: "新しい (あたらしい)", romaji: "atarashii", english: "New" }, { japanese: "新年 (しんねん)", romaji: "shinnen", english: "New Year" }] },
  { kanji: "古", meaning: "Old", onyomi: "コ", onyomiRomaji: "ko", kunyomi: "ふる-い", kunyomiRomaji: "furu-i", mnemonic: "A tombstone or cross marking lessons told by ten mouths.", strokeCount: 5, examples: [{ japanese: "古い (ふるい)", romaji: "furui", english: "Old" }, { japanese: "中古 (ちゅうこ)", romaji: "chuuko", english: "Secondhand" }] },
  { kanji: "多", meaning: "Many / Much", onyomi: "タ", onyomiRomaji: "ta", kunyomi: "おお-い", kunyomiRomaji: "oo-i", mnemonic: "Multiple crescent moons stacked deep inside night skies.", strokeCount: 6, examples: [{ japanese: "多い (おおい)", romaji: "ooi", english: "Many / Numerous" }, { japanese: "多分 (たぶん)", romaji: "tabun", english: "Probably" }] },
  { kanji: "少", meaning: "Few / Little", onyomi: "ショウ", onyomiRomaji: "shou", kunyomi: "すく-ない、すこ-し", kunyomiRomaji: "suku-nai, suko-shi", mnemonic: "Splitting a small element with a marking slice to make less.", strokeCount: 4, examples: [{ japanese: "少ない (すくない)", romaji: "sukunai", english: "Few" }, { japanese: "少し (すこし)", romaji: "sukoshi", english: "A little bit" }] },
  { kanji: "長", meaning: "Long / Chief", onyomi: "チョウ", onyomiRomaji: "chou", kunyomi: "なが-い", kunyomiRomaji: "naga-i", mnemonic: "A majestic leader with long magnificent hair waving.", strokeCount: 8, examples: [{ japanese: "長い (ながい)", romaji: "nagai", english: "Long" }, { japanese: "学長 (がくちょう)", romaji: "gakuchou", english: "University President" }] },
  { kanji: "半分", meaning: "Half / Part", onyomi: "ハン", onyomiRomaji: "han", kunyomi: "なか-ば", kunyomiRomaji: "naka-ba", mnemonic: "Cutting a piece of raw material down the exact center line.", strokeCount: 5, examples: [{ japanese: "半分 (はんぶん)", romaji: "hanbun", english: "Half" }, { japanese: "第一半 (だいいちはん)", romaji: "daiichihan", english: "First half" }] },
  { kanji: "分", meaning: "Minute / Understand", onyomi: "ブン、フン", onyomiRomaji: "bun, fun", kunyomi: "わ-かる", kunyomiRomaji: "wa-karu", mnemonic: "Using a sharp blade or knife to divide particles in fractions.", strokeCount: 4, examples: [{ japanese: "分かる (わかる)", romaji: "wakaru", english: "To understand" }, { japanese: "五分 (ごふん)", romaji: "gofun", english: "Five minutes" }] },
  { kanji: "国", meaning: "Country", onyomi: "コク", onyomiRomaji: "koku", kunyomi: "くに", kunyomiRomaji: "kuni", mnemonic: "A sovereign jade treasure protected within wide borders.", strokeCount: 8, examples: [{ japanese: "外国 (がいこく)", romaji: "gaikoku", english: "Foreign country" }, { japanese: "中国 (ちゅうごく)", romaji: "chuugoku", english: "China" }] },
  { kanji: "英", meaning: "English / Elegant", onyomi: "エイ", onyomiRomaji: "ei", kunyomi: "はなぶさ", kunyomiRomaji: "hanabusa", mnemonic: "Lush grass protecting seedlings, yielding the premium crop.", strokeCount: 8, examples: [{ japanese: "英語 (えいご)", romaji: "eigo", english: "English Language" }, { japanese: "英国 (えいこく)", romaji: "eikoku", english: "United Kingdom" }] },

  // Objects / Social / Places [12]
  { kanji: "本", meaning: "Book / Origin", onyomi: "ホン", onyomiRomaji: "hon", kunyomi: "もと", kunyomiRomaji: "moto", mnemonic: "A tree character with an extra horizontal root marking its base.", strokeCount: 5, examples: [{ japanese: "日本 (にほん)", romaji: "nihon", english: "Japan" }, { japanese: "本棚 (ほんだな)", romaji: "hondana", english: "Bookshelf" }] },
  { kanji: "車", meaning: "Car / Wheel", onyomi: "シャ", onyomiRomaji: "sha", kunyomi: "くるま", kunyomiRomaji: "kuruma", mnemonic: "A heavy cart chassis with multiple central tracking wheels.", strokeCount: 7, examples: [{ japanese: "電車 (でんしゃ)", romaji: "densha", english: "Train" }, { japanese: "自動車 (じどうしゃ)", romaji: "jidousha", english: "Automobile" }] },
  { kanji: "友", meaning: "Friend", onyomi: "ユウ", onyomiRomaji: "yuu", kunyomi: "とも", kunyomiRomaji: "tomo", mnemonic: "Two supportive hands joining together in mutual support.", strokeCount: 4, examples: [{ japanese: "友達 (ともだち)", romaji: "tomodachi", english: "Friend" }, { japanese: "親友 (しんゆう)", romaji: "shinyuu", english: "Best Friend" }] },
  { kanji: "名", meaning: "Name", onyomi: "メイ", onyomiRomaji: "mei", kunyomi: "な", kunyomiRomaji: "na", mnemonic: "Giving vocal coordinates in the dusk of evening.", strokeCount: 6, examples: [{ japanese: "名前 (なまえ)", romaji: "namae", english: "Name" }, { japanese: "有名 (ゆうめい)", romaji: "yuumei", english: "Famous" }] },
  { kanji: "社", meaning: "Company / Shrine", onyomi: "シャ", onyomiRomaji: "sha", kunyomi: "やしろ", kunyomiRomaji: "yashiro", mnemonic: "Altars erected for local soil spirits of the earth.", strokeCount: 7, examples: [{ japanese: "社会 (しゃかい)", romaji: "shakai", english: "Society" }, { japanese: "神社 (じんじゃ)", romaji: "jinja", english: "Shinto Shrine" }] },
  { kanji: "店", meaning: "Store / Shop", onyomi: "テン", onyomiRomaji: "ten", kunyomi: "みせ", kunyomiRomaji: "mise", mnemonic: "A physical warehouse or shelter storing active trading goods.", strokeCount: 8, examples: [{ japanese: "お店 (おみせ)", romaji: "omise", english: "Shop" }, { japanese: "書店 (しょてん)", romaji: "shoten", english: "Bookstore" }] },
  { kanji: "駅", meaning: "Station", onyomi: "エキ", onyomiRomaji: "eki", kunyomi: "うまや", kunyomiRomaji: "umaya", mnemonic: "Spirited horses gathering beside transport stations.", strokeCount: 14, examples: [{ japanese: "東京駅 (とうきょうえき)", romaji: "toukyou-eki", english: "Tokyo Station" }, { japanese: "駅員 (えきいん)", romaji: "ekiin", english: "Station Staff" }] },
  { kanji: "道", meaning: "Road / Path", onyomi: "ドウ", onyomiRomaji: "dou", kunyomi: "みち", kunyomiRomaji: "michi", mnemonic: "Walking while keeping one's head or compass forward.", strokeCount: 12, examples: [{ japanese: "道路 (どうろ)", romaji: "douro", english: "Roadway" }, { japanese: "茶道 (さどう)", romaji: "sadou", english: "Tea Ceremony" }] },
  { kanji: "花", meaning: "Flower", onyomi: "カ", onyomiRomaji: "ka", kunyomi: "はな", kunyomiRomaji: "hana", mnemonic: "Grass transforming dynamically into colorful beautiful petals.", strokeCount: 7, examples: [{ japanese: "花瓶 (かびん)", romaji: "kabin", english: "Flower Vase" }, { japanese: "花見 (はなみ)", romaji: "hanami", english: "Flower Viewing" }] },
  { kanji: "夜", meaning: "Night", onyomi: "ヤ", onyomiRomaji: "ya", kunyomi: "よる", kunyomiRomaji: "yoru", mnemonic: "A human silhouette walking below roofs as shadows gather.", strokeCount: 8, examples: [{ japanese: "夜中 (よなか)", romaji: "yonaka", english: "Midnight" }, { japanese: "今夜 (こんや)", romaji: "konya", english: "Tonight" }] },
  { kanji: "学", meaning: "Study / Learn", onyomi: "ガク", onyomiRomaji: "gaku", kunyomi: "まな-ぶ", kunyomiRomaji: "manabu", mnemonic: "A nested kid under building rafters getting bright insights.", strokeCount: 8, examples: [{ japanese: "学校 (がっこう)", romaji: "gakkou", english: "School" }, { japanese: "学生 (がくせい)", romaji: "gakusei", english: "Student" }] },
  

  // Days, Months, and Core Elements [13]
  { kanji: "年", meaning: "Year", onyomi: "ネン", onyomiRomaji: "nen", kunyomi: "とし", kunyomiRomaji: "toshi", mnemonic: "A person carrying heavy bundles of wheat harvest annually.", strokeCount: 6, examples: [{ japanese: "来年 (らいねん)", romaji: "rainen", english: "Next Year" }, { japanese: "今年 (ことし)", romaji: "kotoshi", english: "This Year" }] },
  { kanji: "時", meaning: "Time / Hour", onyomi: "ジ", onyomiRomaji: "ji", kunyomi: "とき", kunyomiRomaji: "toki", mnemonic: "Sun tracker beside shinto temple clocks recording the hours.", strokeCount: 10, examples: [{ japanese: "一時 (いちじ)", romaji: "ichiji", english: "1 o'clock" }, { japanese: "時間 (じかん)", romaji: "jikan", english: "Time" }] },
  { kanji: "週", meaning: "Week", onyomi: "シュウ", onyomiRomaji: "shuu", kunyomi: "まわり", kunyomiRomaji: "mawari", mnemonic: "Road path walking cycles rotating around standard fields.", strokeCount: 11, examples: [{ japanese: "今週 (こんしゅう)", romaji: "konshuu", english: "This Week" }, { japanese: "毎週 (まいしゅう)", romaji: "maishuu", english: "Every Week" }] },
  { kanji: "毎", meaning: "Every", onyomi: "マイ", onyomiRomaji: "mai", kunyomi: "つね", kunyomiRomaji: "tsune", mnemonic: "An active mother nurturing seedlings with daily consistency.", strokeCount: 6, examples: [{ japanese: "毎日 (まいにち)", romaji: "mainichi", english: "Every Day" }, { japanese: "毎年 (まいとし)", romaji: "maitoshi", english: "Every Year" }] },
  { kanji: "同", meaning: "Same / Agree", onyomi: "ドウ", onyomiRomaji: "dou", kunyomi: "おな-じ", kunyomiRomaji: "onaji", mnemonic: "Multiple mouths speaking in harmony inside a single dome room.", strokeCount: 6, examples: [{ japanese: "同じ (おなじ)", romaji: "onaji", english: "Same" }, { japanese: "同意 (どうい)", romaji: "doui", english: "Agreement" }] },
  { kanji: "母", meaning: "Mother", onyomi: "ボ", onyomiRomaji: "bo", kunyomi: "はは、かあ", kunyomiRomaji: "haha, kaa", mnemonic: "A nurturing figure with protective breast curves nursing infants.", strokeCount: 5, examples: [{ japanese: "お母さん (おかあさん)", romaji: "okaasan", english: "Mother (polite)" }, { japanese: "祖母 (そぼ)", romaji: "sobo", english: "Grandmother" }] },
  { kanji: "父", meaning: "Father", onyomi: "フ", onyomiRomaji: "fu", kunyomi: "ちち、とう", kunyomiRomaji: "chichi, tou", mnemonic: "Two crossed defensive rods representing authority protectively.", strokeCount: 4, examples: [{ japanese: "お父さん (おとうさん)", romaji: "otousan", english: "Father (polite)" }, { japanese: "祖父 (そふ)", romaji: "sofu", english: "Grandfather" }] },
  { kanji: "女", meaning: "Female", onyomi: "ジョ", onyomiRomaji: "jo", kunyomi: "おんな", kunyomiRomaji: "onna", mnemonic: "A delicate kneeling figure bowing gently in respect.", strokeCount: 3, examples: [{ japanese: "女の子 (おんなのこ)", romaji: "onnanoko", english: "Girl" }, { japanese: "女性 (じょせい)", romaji: "josei", english: "Woman" }] },
  { kanji: "男", meaning: "Male", onyomi: "ダン", onyomiRomaji: "dan", kunyomi: "おとこ", kunyomiRomaji: "otoko", mnemonic: "Power or muscle working on agricultural plots.", strokeCount: 7, examples: [{ japanese: "男の子 (おとこのこ)", romaji: "otokonoko", english: "Boy" }, { japanese: "男性 (だんせい)", romaji: "dansei", english: "Man / Male" }] },
  { kanji: "書", meaning: "To Write", onyomi: "ショ", onyomiRomaji: "sho", kunyomi: "か-く", kunyomiRomaji: "ka-ku", mnemonic: "A calligraphic brush writing on a square paper scroll.", strokeCount: 10, examples: [{ japanese: "書く (かく)", romaji: "kaku", english: "To write" }] },
  { kanji: "万", meaning: "Myriad", onyomi: "マン", onyomiRomaji: "man", kunyomi: "よろず", kunyomiRomaji: "yorozu", mnemonic: "A flag waving above a broad base of people.", strokeCount: 3, examples: [{ japanese: "一万 (いちまん)", romaji: "ichiman", english: "10,000" }] },
  { kanji: "午", meaning: "Noon", onyomi: "ゴ", onyomiRomaji: "go", kunyomi: "うま", kunyomiRomaji: "uma", mnemonic: "A pestle or indicator cross mapping solar midday coordinates.", strokeCount: 4, examples: [{ japanese: "午前 (ごぜん)", romaji: "gozen", english: "Morning" }, { japanese: "午後 (ごご)", romaji: "gogo", english: "Afternoon" }] },
  { kanji: "百", meaning: "100", onyomi: "ヒャク", onyomiRomaji: "hyaku", kunyomi: "もも", kunyomiRomaji: "momo", mnemonic: "Marking ray pointing over a white sun shape.", strokeCount: 6, examples: [{ japanese: "三百 (さんびゃく)", romaji: "sanbyaku", english: "300" }] }
];

// COMPACT LIST OF 720+ ESSENTIAL N5 DAILY WORDS JUST LIKE KANJI - DECORATED WITH AUDIO SUPPORT
export const VOCABULARY_DATA: VocabularyItem[] = [
  // Greetings Category
  { word: "こんにちは", hiragana: "こんにちは", romaji: "konnichiwa", english: "Hello / Good afternoon", category: "greetings" },
  { word: "おはよう", hiragana: "おはよう", romaji: "ohayou", english: "Good morning", category: "greetings" },
  { word: "こんばんは", hiragana: "こんばんは", romaji: "konbanwa", english: "Good evening", category: "greetings" },
  { word: "さようなら", hiragana: "さようなら", romaji: "sayounara", english: "Goodbye", category: "greetings" },
  { word: "ありがとう", hiragana: "ありがとう", romaji: "arigatou", english: "Thank you", category: "greetings" },
  { word: "すみません", hiragana: "すみません", romaji: "sumimasen", english: "Excuse me / Sorry", category: "greetings" },
  { word: "はじめまして", hiragana: "はじめまして", romaji: "hajimemashite", english: "Nice to meet you", category: "greetings" },
  { word: "おねがいします", hiragana: "おねがいします", romaji: "onegaishimasu", english: "Please (request)", category: "greetings" },
  { word: "ごちそうさま", hiragana: "ごちそうさま", romaji: "gochisousama", english: "Thank you for the meal", category: "greetings" },
  { word: "ただいま", hiragana: "ただいま", romaji: "tadaima", english: "I am home", category: "greetings" },
  { word: "ようこそ", hiragana: "ようこそ", romaji: "youkoso", english: "Welcome", category: "greetings" },
  { word: "おやすみなさい", hiragana: "おやすみなさい", romaji: "oyasuminasai", english: "Good night", category: "greetings" },
  { word: "どうぞ", hiragana: "どうぞ", romaji: "douzo", english: "Here you go / Please", category: "greetings" },
  { word: "いってきます", hiragana: "いってきます", romaji: "ittekimasu", english: "I'm off!", category: "greetings" },
  { word: "いってらっしゃい", hiragana: "いってらっしゃい", romaji: "itterasshai", english: "Take care / See you", category: "greetings" },

  // Time Category
  { word: "昨日", hiragana: "きのう", romaji: "kinou", english: "Yesterday", category: "time" },
  { word: "今日", hiragana: "きょう", romaji: "kyou", english: "Today", category: "time" },
  { word: "明日", hiragana: "あした", romaji: "ashita", english: "Tomorrow", category: "time" },
  { word: "今朝", hiragana: "けさ", romaji: "kesa", english: "This morning", category: "time" },
  { word: "今晩", hiragana: "こんばん", romaji: "konban", english: "Tonight", category: "time" },
  { word: "今", hiragana: "いま", romaji: "ima", english: "Now", category: "time" },
  { word: "毎日", hiragana: "まいにち", romaji: "mainichi", english: "Every day", category: "time" },
  { word: "毎週", hiragana: "まいしゅう", romaji: "maishuu", english: "Every week", category: "time" },
  { word: "毎月", hiragana: "まいつき", romaji: "maitsuki", english: "Every month", category: "time" },
  { word: "毎年", hiragana: "まいとし", romaji: "maitoshi", english: "Every year", category: "time" },
  { word: "朝", hiragana: "あさ", romaji: "asa", english: "Morning", category: "time" },
  { word: "昼", hiragana: "ひる", romaji: "hiru", english: "Noon / Day", category: "time" },
  { word: "夜", hiragana: "よる", romaji: "yoru", english: "Night", category: "time" },
  { word: "夕方", hiragana: "ゆうがた", romaji: "yuugata", english: "Evening / Dusk", category: "time" },
  { word: "先週", hiragana: "せんしゅう", romaji: "senshuu", english: "Last week", category: "time" },
  { word: "来週", hiragana: "らいしゅう", romaji: "raishuu", english: "Next week", category: "time" },
  { word: "午前", hiragana: "ごぜん", romaji: "gozen", english: "A.M.", category: "time" },
  { word: "午後", hiragana: "ごご", romaji: "gogo", english: "P.M.", category: "time" },
  { word: "時間", hiragana: "じかん", romaji: "jikan", english: "Time / Hour", category: "time" },
  { word: "分", hiragana: "ふん", romaji: "fun", english: "Minute", category: "time" },
  { word: "去年", hiragana: "きょねん", romaji: "kyonen", english: "Last year", category: "time" },
  { word: "今年", hiragana: "ことし", romaji: "kotoshi", english: "This year", category: "time" },
  { word: "来年", hiragana: "らいねん", romaji: "rainen", english: "Next year", category: "time" },
  { word: "一昨年", hiragana: "おととし", romaji: "ototoshi", english: "Day before yesterday", category: "time" },
  { word: "明後日", hiragana: "あさって", romaji: "asatte", english: "Day after tomorrow", category: "time" },

  // Places Category
  { word: "学校", hiragana: "がっこう", romaji: "gakkou", english: "School", category: "places" },
  { word: "駅", hiragana: "えき", romaji: "eki", english: "Station", category: "places" },
  { word: "店", hiragana: "みせ", romaji: "mise", english: "Shop / Store", category: "places" },
  { word: "家", hiragana: "うち / いえ", romaji: "uchi / ie", english: "House / Home", category: "places" },
  { word: "部屋", hiragana: "へや", romaji: "heya", english: "Room", category: "places" },
  { word: "教室", hiragana: "きょうしつ", romaji: "kyoushitsu", english: "Classroom", category: "places" },
  { word: "食堂", hiragana: "しょくどう", romaji: "shokudou", english: "Dining room / Cafeteria", category: "places" },
  { word: "病院", hiragana: "びょういん", romaji: "byouin", english: "Hospital", category: "places" },
  { word: "図書館", hiragana: "としょかん", romaji: "toshokan", english: "Library", category: "places" },
  { word: "郵便局", hiragana: "ゆうびんきょく", romaji: "yuubinkyoku", english: "Post office", category: "places" },
  { word: "銀行", hiragana: "ぎんこう", romaji: "ginkou", english: "Bank", category: "places" },
  { word: "公園", hiragana: "こうえん", romaji: "kouen", english: "Park", category: "places" },
  { word: "国", hiragana: "くに", romaji: "kuni", english: "Country / Nation", category: "places" },
  { word: "海", hiragana: "うみ", romaji: "umi", english: "Sea / Ocean", category: "places" },
  { word: "山", hiragana: "やま", romaji: "yama", english: "Mountain", category: "places" },
  { word: "川", hiragana: "かわ", romaji: "kawa", english: "River", category: "places" },
  { word: "庭", hiragana: "にわ", romaji: "niwa", english: "Garden / Yard", category: "places" },
  { word: "デパート", hiragana: "でぱーと", romaji: "depa-to", english: "Department store", category: "places" },
  { word: "交番", hiragana: "こうばん", romaji: "kouban", english: "Police box", category: "places" },
  { word: "ホテル", hiragana: "ほてる", romaji: "hoteru", english: "Hotel", category: "places" },

  // Food Category
  { word: "ご飯", hiragana: "ごはん", romaji: "gohan", english: "Meal / Rice", category: "food" },
  { word: "水", hiragana: "みず", romaji: "mizu", english: "Water", category: "food" },
  { word: "お茶", hiragana: "おちゃ", romaji: "o-cha", english: "Green Tea", category: "food" },
  { word: "牛乳", hiragana: "ぎゅうにゅう", romaji: "gyuunyuu", english: "Milk", category: "food" },
  { word: "魚", hiragana: "さかな", romaji: "sakana", english: "Fish", category: "food" },
  { word: "肉", hiragana: "にく", romaji: "niku", english: "Meat", category: "food" },
  { word: "野菜", hiragana: "やさい", romaji: "yasai", english: "Vegetables", category: "food" },
  { word: "果物", hiragana: "くだもの", romaji: "kudamono", english: "Fruit", category: "food" },
  { word: "卵", hiragana: "たまご", romaji: "tamago", english: "Egg", category: "food" },
  { word: "パン", hiragana: "ぱん", romaji: "pan", english: "Bread", category: "food" },
  { word: "酒", hiragana: "さけ", romaji: "sake", english: "Sake / Alcohol", category: "food" },
  { word: "林檎", hiragana: "りんご", romaji: "ringo", english: "Apple", category: "food" },
  { word: "牛肉", hiragana: "ぎゅうにく", romaji: "gyuuniku", english: "Beef", category: "food" },
  { word: "鶏肉", hiragana: "とりにく", romaji: "toriniku", english: "Chicken Meat", category: "food" },
  { word: "豚肉", hiragana: "ぶたにく", romaji: "butaniku", english: "Pork", category: "food" },
  { word: "砂糖", hiragana: "さとう", romaji: "satou", english: "Sugar", category: "food" },
  { word: "塩", hiragana: "しお", romaji: "shio", english: "Salt", category: "food" },
  { word: "醤油", hiragana: "しょうゆ", romaji: "shouyu", english: "Soy Sauce", category: "food" },
  { word: "紅茶", hiragana: "こうちゃ", romaji: "koucha", english: "Black Tea", category: "food" },
  { word: "珈琲", hiragana: "こーひー", romaji: "ko-hi-", english: "Coffee", category: "food" },

  // People Category
  { word: "友達", hiragana: "ともだち", romaji: "tomodachi", english: "Friend", category: "people" },
  { word: "先生", hiragana: "せんせい", romaji: "sensei", english: "Teacher", category: "people" },
  { word: "学生", hiragana: "がくせい", romaji: "gakusei", english: "Student", category: "people" },
  { word: "人", hiragana: "ひと", romaji: "hito", english: "Person", category: "people" },
  { word: "子供", hiragana: "こども", romaji: "kodomo", english: "Child", category: "people" },
  { word: "女性", hiragana: "じょせい", romaji: "josei", english: "Woman", category: "people" },
  { word: "男性", hiragana: "だんせい", romaji: "dansei", english: "Man", category: "people" },
  { word: "私", hiragana: "わたし", romaji: "watashi", english: "I / Me", category: "people" },
  { word: "あなた", hiragana: "あなた", romaji: "anata", english: "You", category: "people" },
  { word: "医者", hiragana: "いしゃ", romaji: "isha", english: "Doctor (MD)", category: "people" },
  { word: "お母さん", hiragana: "おかあさん", romaji: "okaasan", english: "Mother", category: "people" },
  { word: "お父さん", hiragana: "おとうさん", romaji: "otousan", english: "Father", category: "people" },
  { word: "家族", hiragana: "かぞく", romaji: "kazoku", english: "Family", category: "people" },
  { word: "お姉さん", hiragana: "おねえさん", romaji: "oneesan", english: "Elder Sister", category: "people" },
  { word: "お兄さん", hiragana: "おにいさん", romaji: "oniisan", english: "Elder Brother", category: "people" },
  { word: "妹", hiragana: "いもうと", romaji: "imouto", english: "Younger Sister", category: "people" },
  { word: "弟", hiragana: "おとうと", romaji: "otouto", english: "Younger Brother", category: "people" },

  // Actions / Verbs Category
  { word: "いく", hiragana: "いく", romaji: "iku", english: "To go", category: "actions" },
  { word: "くる", hiragana: "くる", romaji: "kuru", english: "To come", category: "actions" },
  { word: "たべる", hiragana: "たべる", romaji: "taberu", english: "To eat", category: "actions" },
  { word: "のむ", hiragana: "のむ", romaji: "nomu", english: "To drink", category: "actions" },
  { word: "みる", hiragana: "みる", romaji: "miru", english: "To see / watch", category: "actions" },
  { word: "きく", hiragana: "きく", romaji: "kiku", english: "To hear / ask", category: "actions" },
  { word: "よむ", hiragana: "よむ", romaji: "yomu", english: "To read", category: "actions" },
  { word: "かく", hiragana: "かく", romaji: "kaku", english: "To write", category: "actions" },
  { word: "はなす", hiragana: "はなす", romaji: "hanasu", english: "To speak", category: "actions" },
  { word: "かう", hiragana: "かう", romaji: "kau", english: "To buy", category: "actions" },
  { word: "する", hiragana: "する", romaji: "suru", english: "To do", category: "actions" },
  { word: "べんきょうする", hiragana: "べんきょうする", romaji: "benkyousuru", english: "To study", category: "actions" },
  { word: "ねる", hiragana: "ねる", romaji: "neru", english: "To sleep", category: "actions" },
  { word: "おきる", hiragana: "おきる", romaji: "okiru", english: "To wake up / get up", category: "actions" },
  { word: "あう", hiragana: "あう", romaji: "au", english: "To meet", category: "actions" },
  { word: "あそぶ", hiragana: "あそぶ", romaji: "asobu", english: "To play / socialise", category: "actions" },
  { word: "まつ", hiragana: "まつ", romaji: "matsu", english: "To wait", category: "actions" },
  { word: "よぶ", hiragana: "よぶ", romaji: "yobu", english: "To call / invite", category: "actions" },
  { word: "はしる", hiragana: "はしる", romaji: "hashiru", english: "To run", category: "actions" },
  { word: "あるく", hiragana: "あるく", romaji: "aruku", english: "To walk", category: "actions" },

  // Adjectives Category
  { word: "大きい", hiragana: "おおきい", romaji: "ookii", english: "Big / Large", category: "adjectives" },
  { word: "小さい", hiragana: "ちいさい", romaji: "chiisai", english: "Small", category: "adjectives" },
  { word: "新しい", hiragana: "あたらしい", romaji: "atarashii", english: "New", category: "adjectives" },
  { word: "古い", hiragana: "ふるい", romaji: "furui", english: "Old", category: "adjectives" },
  { word: "良い", hiragana: "いい / よい", romaji: "ii / yoi", english: "Good", category: "adjectives" },
  { word: "悪い", hiragana: "わるい", romaji: "warui", english: "Bad", category: "adjectives" },
  { word: "暑い", hiragana: "あつい", romaji: "atsui", english: "Hot (weather)", category: "adjectives" },
  { word: "寒い", hiragana: "さむい", romaji: "samui", english: "Cold (weather)", category: "adjectives" },
  { word: "高い", hiragana: "たかい", romaji: "takai", english: "High / Expensive", category: "adjectives" },
  { word: "安い", hiragana: "やすい", romaji: "yasui", english: "Cheap", category: "adjectives" },
  { word: "美味しい", hiragana: "おいしい", romaji: "oishii", english: "Delicious", category: "adjectives" },
  { word: "甘い", hiragana: "あまい", romaji: "amai", english: "Sweet", category: "adjectives" },
  { word: "辛い", hiragana: "からい", romaji: "karai", english: "Spicy / Salty", category: "adjectives" },
  { word: "面白い", hiragana: "おもしろい", romaji: "omoshiroi", english: "Interesting", category: "adjectives" },
  { word: "忙しい", hiragana: "いそがしい", romaji: "isogashii", english: "Busy", category: "adjectives" },
  { word: "賑やか", hiragana: "にぎやか", romaji: "nigiyaka", english: "Lively", category: "adjectives" },
  { word: "静か", hiragana: "しずか", romaji: "shizuka", english: "Quiet", category: "adjectives" },
  { word: "親切", hiragana: "しんせつ", romaji: "shinsetsu", english: "Kind / Hospitable", category: "adjectives" },
  { word: "元気", hiragana: "げんき", romaji: "genki", english: "Healthy / Energetic", category: "adjectives" },
  { word: "便利", hiragana: "べんり", romaji: "benri", english: "Convenient", category: "adjectives" },

  // Objects Category
  { word: "本", hiragana: "ほん", romaji: "hon", english: "Book", category: "objects" },
  { word: "車", hiragana: "くるま", romaji: "kuruma", english: "Car / Vehicle", category: "objects" },
  { word: "自転車", hiragana: "じてんしゃ", romaji: "jitensha", english: "Bicycle", category: "objects" },
  { word: "携帯電話", hiragana: "けいたいでんわ", romaji: "keitai denwa", english: "Cell Phone", category: "objects" },
  { word: "時計", hiragana: "とけい", romaji: "tokei", english: "Clock / Watch", category: "objects" },
  { word: "鍵", hiragana: "かぎ", romaji: "kagi", english: "Key", category: "objects" },
  { word: "財布", hiragana: "さいふ", romaji: "saifu", english: "Wallet / Purse", category: "objects" },
  { word: "傘", hiragana: "かさ", romaji: "kasa", english: "Umbrella", category: "objects" },
  { word: "鞄", hiragana: "かばん", romaji: "kaban", english: "Bag / Briefcase", category: "objects" },
  { word: "靴", hiragana: "くつ", romaji: "kutsu", english: "Shoes", category: "objects" },
  { word: "服", hiragana: "ふく", romaji: "fuku", english: "Clothes / Clothing", category: "objects" },
  { word: "切符", hiragana: "きっぷ", romaji: "kippu", english: "Ticket", category: "objects" },
  { word: "辞書", hiragana: "じしょ", romaji: "jisho", english: "Dictionary", category: "objects" },
  { word: "鉛筆", hiragana: "えんぴつ", romaji: "enpitsu", english: "Pencil", category: "objects" },
  { word: "机", hiragana: "つくえ", romaji: "tsukue", english: "Desk", category: "objects" },
  { word: "椅子", hiragana: "いす", romaji: "isu", english: "Chair", category: "objects" },
  { word: "手紙", hiragana: "てがみ", romaji: "tegami", english: "Letter", category: "objects" },
  { word: "新聞", hiragana: "しんぶん", romaji: "shinbun", english: "Newspaper", category: "objects" },
  { word: "テレビ", hiragana: "てれび", romaji: "terebi", english: "Television", category: "objects" },
  { word: "カメラ", hiragana: "かめら", romaji: "kamera", english: "Camera", category: "objects" },

  // School Category
  { word: "ノート", hiragana: "のーと", romaji: "no-to", english: "Notebook", category: "school" },
  { word: "宿題", hiragana: "しゅくだい", romaji: "shukudai", english: "Homework", category: "school" },
  { word: "授業", hiragana: "じゅぎょう", romaji: "jugyou", english: "Class / Lesson", category: "school" },
  { word: "試験 / テスト", hiragana: "しけん / てすと", romaji: "shiken / tesuto", english: "Exam / Test", category: "school" },
  { word: "質問", hiragana: "しつもん", romaji: "shitsumon", english: "Question", category: "school" },
  { word: "答え", hiragana: "こたえ", romaji: "kotae", english: "Answer", category: "school" },
  { word: "黒板", hiragana: "こくばん", romaji: "kokuban", english: "Blackboard", category: "school" },
  { word: "作文", hiragana: "さくぶん", romaji: "sakubun", english: "Essay / Composition", category: "school" },
  { word: "辞書", hiragana: "じしょ", romaji: "jisho", english: "Dictionary", category: "school" },
  { word: "ペン", hiragana: "ぺん", romaji: "pen", english: "Pen", category: "school" },
  // Additional N5 words
  { word: "おそい", hiragana: "おそい", romaji: "osoi", english: "Slow / Late", category: "adjectives" },
  { word: "はやい", hiragana: "はやい", romaji: "hayai", english: "Fast / Early", category: "adjectives" },
  { word: "つめたい", hiragana: "つめたい", romaji: "tsumetai", english: "Cold (to touch)", category: "adjectives" },
  { word: "むずかしい", hiragana: "むずかしい", romaji: "muzukashii", english: "Difficult", category: "adjectives" },
  { word: "やさしい", hiragana: "やさしい", romaji: "yasashii", english: "Easy / Kind", category: "adjectives" },
  { word: "ひろい", hiragana: "ひろい", romaji: "hiroi", english: "Spacious / Wide", category: "adjectives" },
  { word: "せまい", hiragana: "せまい", romaji: "semai", english: "Narrow", category: "adjectives" },
  { word: "つまらない", hiragana: "つまらない", romaji: "tsumaranai", english: "Boring", category: "adjectives" },
  { word: "かえる", hiragana: "かえる", romaji: "kaeru", english: "To return / go home", category: "actions" },
  { word: "およぐ", hiragana: "およぐ", romaji: "oyogu", english: "To swim", category: "actions" },
  { word: "かりる", hiragana: "かりる", romaji: "kariru", english: "To borrow", category: "actions" },
  { word: "しめる", hiragana: "しめる", romaji: "shimeru", english: "To close", category: "actions" },
  { word: "しる", hiragana: "しる", romaji: "shiru", english: "To know", category: "actions" },
  { word: "だす", hiragana: "だす", romaji: "dasu", english: "To take out", category: "actions" },
  { word: "つくる", hiragana: "つくる", romaji: "tsukuru", english: "To make / build", category: "actions" },
  { word: "つかう", hiragana: "つかう", romaji: "tsukau", english: "To use", category: "actions" },
  { word: "でかける", hiragana: "でかける", romaji: "dekakeru", english: "To go out", category: "actions" },
  { word: "はたらく", hiragana: "はたらく", romaji: "hataraku", english: "To work", category: "actions" },
  { word: "やすむ", hiragana: "やすむ", romaji: "yasumu", english: "To rest / take day off", category: "actions" },
  { word: "おてあらい", hiragana: "おてあらい", romaji: "otearai", english: "Restroom / Toilet", category: "places" },
  { word: "たてもの", hiragana: "たてもの", romaji: "tatemono", english: "Building", category: "places" },
  { word: "えいがかん", hiragana: "えいがかん", romaji: "eigakan", english: "Movie theater", category: "places" },
  { word: "きっさてん", hiragana: "きっさてん", romaji: "kissaten", english: "Coffee shop", category: "places" },
  { word: "カレー", hiragana: "かれー", romaji: "kare-", english: "Curry", category: "food" },
  { word: "お弁当", hiragana: "おべんとう", romaji: "obentou", english: "Bento lunch box", category: "food" },
  { word: "はさみ", hiragana: "はさみ", romaji: "hasami", english: "Scissors", category: "objects" },
  { word: "切手", hiragana: "きって", romaji: "kitte", english: "Postage stamp", category: "objects" },
  // ── New Actions (50) ─────────────────────────────────────────────────────
  { word: "着る", hiragana: "きる", romaji: "kiru", english: "To wear (upper body)", category: "actions" },
  { word: "脱ぐ", hiragana: "ぬぐ", romaji: "nugu", english: "To take off (clothing)", category: "actions" },
  { word: "入る", hiragana: "はいる", romaji: "hairu", english: "To enter", category: "actions" },
  { word: "出る", hiragana: "でる", romaji: "deru", english: "To leave / exit", category: "actions" },
  { word: "乗る", hiragana: "のる", romaji: "noru", english: "To ride / board", category: "actions" },
  { word: "降りる", hiragana: "おりる", romaji: "oriru", english: "To get off / descend", category: "actions" },
  { word: "開ける", hiragana: "あける", romaji: "akeru", english: "To open", category: "actions" },
  { word: "押す", hiragana: "おす", romaji: "osu", english: "To push", category: "actions" },
  { word: "引く", hiragana: "ひく", romaji: "hiku", english: "To pull / play (instrument)", category: "actions" },
  { word: "持つ", hiragana: "もつ", romaji: "motsu", english: "To hold / have", category: "actions" },
  { word: "置く", hiragana: "おく", romaji: "oku", english: "To place / put", category: "actions" },
  { word: "見せる", hiragana: "みせる", romaji: "miseru", english: "To show", category: "actions" },
  { word: "教える", hiragana: "おしえる", romaji: "oshieru", english: "To teach", category: "actions" },
  { word: "習う", hiragana: "ならう", romaji: "narau", english: "To learn", category: "actions" },
  { word: "洗う", hiragana: "あらう", romaji: "arau", english: "To wash", category: "actions" },
  { word: "切る", hiragana: "きる", romaji: "kiru", english: "To cut", category: "actions" },
  { word: "送る", hiragana: "おくる", romaji: "okuru", english: "To send", category: "actions" },
  { word: "始める", hiragana: "はじめる", romaji: "hajimeru", english: "To start / begin", category: "actions" },
  { word: "終わる", hiragana: "おわる", romaji: "owaru", english: "To finish / end", category: "actions" },
  { word: "止まる", hiragana: "とまる", romaji: "tomaru", english: "To stop", category: "actions" },
  { word: "飛ぶ", hiragana: "とぶ", romaji: "tobu", english: "To fly / jump", category: "actions" },
  { word: "歌う", hiragana: "うたう", romaji: "utau", english: "To sing", category: "actions" },
  { word: "踊る", hiragana: "おどる", romaji: "odoru", english: "To dance", category: "actions" },
  { word: "泣く", hiragana: "なく", romaji: "naku", english: "To cry", category: "actions" },
  { word: "笑う", hiragana: "わらう", romaji: "warau", english: "To laugh", category: "actions" },
  { word: "立つ", hiragana: "たつ", romaji: "tatsu", english: "To stand", category: "actions" },
  { word: "座る", hiragana: "すわる", romaji: "suwaru", english: "To sit", category: "actions" },
  { word: "住む", hiragana: "すむ", romaji: "sumu", english: "To live / reside", category: "actions" },
  { word: "考える", hiragana: "かんがえる", romaji: "kangaeru", english: "To think", category: "actions" },
  { word: "分かる", hiragana: "わかる", romaji: "wakaru", english: "To understand", category: "actions" },
  { word: "忘れる", hiragana: "わすれる", romaji: "wasureru", english: "To forget", category: "actions" },
  { word: "覚える", hiragana: "おぼえる", romaji: "oboeru", english: "To memorize / remember", category: "actions" },
  { word: "探す", hiragana: "さがす", romaji: "sagasu", english: "To search for", category: "actions" },
  { word: "答える", hiragana: "こたえる", romaji: "kotaeru", english: "To answer", category: "actions" },
  { word: "頼む", hiragana: "たのむ", romaji: "tanomu", english: "To request / ask a favour", category: "actions" },
  { word: "貸す", hiragana: "かす", romaji: "kasu", english: "To lend", category: "actions" },
  { word: "返す", hiragana: "かえす", romaji: "kaesu", english: "To return (something)", category: "actions" },
  { word: "売る", hiragana: "うる", romaji: "uru", english: "To sell", category: "actions" },
  { word: "撮る", hiragana: "とる", romaji: "toru", english: "To take (a photo)", category: "actions" },
  { word: "あげる", hiragana: "あげる", romaji: "ageru", english: "To give (to someone)", category: "actions" },
  { word: "もらう", hiragana: "もらう", romaji: "morau", english: "To receive", category: "actions" },
  { word: "くれる", hiragana: "くれる", romaji: "kureru", english: "To give (to the speaker)", category: "actions" },
  { word: "急ぐ", hiragana: "いそぐ", romaji: "isogu", english: "To hurry", category: "actions" },
  { word: "電話する", hiragana: "でんわする", romaji: "denwa suru", english: "To make a phone call", category: "actions" },
  { word: "起こす", hiragana: "おこす", romaji: "okosu", english: "To wake (someone) up", category: "actions" },
  { word: "登る", hiragana: "のぼる", romaji: "noboru", english: "To climb", category: "actions" },
  { word: "降る", hiragana: "ふる", romaji: "furu", english: "To fall (rain / snow)", category: "actions" },
  { word: "集まる", hiragana: "あつまる", romaji: "atsumaru", english: "To gather / assemble", category: "actions" },
  { word: "手伝う", hiragana: "てつだう", romaji: "tetsudau", english: "To help / assist", category: "actions" },
  { word: "着く", hiragana: "つく", romaji: "tsuku", english: "To arrive", category: "actions" },

  // ── New Adjectives (40) ───────────────────────────────────────────────────
  { word: "長い", hiragana: "ながい", romaji: "nagai", english: "Long", category: "adjectives" },
  { word: "短い", hiragana: "みじかい", romaji: "mijikai", english: "Short", category: "adjectives" },
  { word: "重い", hiragana: "おもい", romaji: "omoi", english: "Heavy", category: "adjectives" },
  { word: "軽い", hiragana: "かるい", romaji: "karui", english: "Light (in weight)", category: "adjectives" },
  { word: "明るい", hiragana: "あかるい", romaji: "akarui", english: "Bright", category: "adjectives" },
  { word: "暗い", hiragana: "くらい", romaji: "kurai", english: "Dark", category: "adjectives" },
  { word: "熱い", hiragana: "あつい", romaji: "atsui", english: "Hot (to touch)", category: "adjectives" },
  { word: "近い", hiragana: "ちかい", romaji: "chikai", english: "Near / Close", category: "adjectives" },
  { word: "遠い", hiragana: "とおい", romaji: "tooi", english: "Far", category: "adjectives" },
  { word: "多い", hiragana: "おおい", romaji: "ooi", english: "Many / Much", category: "adjectives" },
  { word: "少ない", hiragana: "すくない", romaji: "sukunai", english: "Few / Little", category: "adjectives" },
  { word: "丸い", hiragana: "まるい", romaji: "marui", english: "Round", category: "adjectives" },
  { word: "白い", hiragana: "しろい", romaji: "shiroi", english: "White", category: "adjectives" },
  { word: "黒い", hiragana: "くろい", romaji: "kuroi", english: "Black", category: "adjectives" },
  { word: "赤い", hiragana: "あかい", romaji: "akai", english: "Red", category: "adjectives" },
  { word: "青い", hiragana: "あおい", romaji: "aoi", english: "Blue", category: "adjectives" },
  { word: "黄色い", hiragana: "きいろい", romaji: "kiiroi", english: "Yellow", category: "adjectives" },
  { word: "可愛い", hiragana: "かわいい", romaji: "kawaii", english: "Cute", category: "adjectives" },
  { word: "怖い", hiragana: "こわい", romaji: "kowai", english: "Scary", category: "adjectives" },
  { word: "痛い", hiragana: "いたい", romaji: "itai", english: "Painful", category: "adjectives" },
  { word: "眠い", hiragana: "ねむい", romaji: "nemui", english: "Sleepy", category: "adjectives" },
  { word: "嬉しい", hiragana: "うれしい", romaji: "ureshii", english: "Happy / Glad", category: "adjectives" },
  { word: "悲しい", hiragana: "かなしい", romaji: "kanashii", english: "Sad", category: "adjectives" },
  { word: "楽しい", hiragana: "たのしい", romaji: "tanoshii", english: "Fun / Enjoyable", category: "adjectives" },
  { word: "強い", hiragana: "つよい", romaji: "tsuyoi", english: "Strong", category: "adjectives" },
  { word: "弱い", hiragana: "よわい", romaji: "yowai", english: "Weak", category: "adjectives" },
  { word: "正しい", hiragana: "ただしい", romaji: "tadashii", english: "Correct / Right", category: "adjectives" },
  { word: "汚い", hiragana: "きたない", romaji: "kitanai", english: "Dirty", category: "adjectives" },
  { word: "きれい", hiragana: "きれい", romaji: "kirei", english: "Clean / Pretty", category: "adjectives" },
  { word: "大切", hiragana: "たいせつ", romaji: "taisetsu", english: "Important / Precious", category: "adjectives" },
  { word: "有名", hiragana: "ゆうめい", romaji: "yuumei", english: "Famous", category: "adjectives" },
  { word: "丈夫", hiragana: "じょうぶ", romaji: "joubu", english: "Sturdy / Robust", category: "adjectives" },
  { word: "大丈夫", hiragana: "だいじょうぶ", romaji: "daijoubu", english: "Alright / OK", category: "adjectives" },
  { word: "嫌い", hiragana: "きらい", romaji: "kirai", english: "Disliked / Hateful", category: "adjectives" },
  { word: "好き", hiragana: "すき", romaji: "suki", english: "Liked / Favourite", category: "adjectives" },
  { word: "上手", hiragana: "じょうず", romaji: "jouzu", english: "Skilled / Good at", category: "adjectives" },
  { word: "下手", hiragana: "へた", romaji: "heta", english: "Unskillful / Bad at", category: "adjectives" },
  { word: "同じ", hiragana: "おなじ", romaji: "onaji", english: "Same", category: "adjectives" },
  { word: "変", hiragana: "へん", romaji: "hen", english: "Strange / Weird", category: "adjectives" },
  { word: "大事", hiragana: "だいじ", romaji: "daiji", english: "Important / Precious", category: "adjectives" },

  // ── New Food (30) ─────────────────────────────────────────────────────────
  { word: "ラーメン", hiragana: "らーめん", romaji: "ra-men", english: "Ramen", category: "food" },
  { word: "寿司", hiragana: "すし", romaji: "sushi", english: "Sushi", category: "food" },
  { word: "天ぷら", hiragana: "てんぷら", romaji: "tenpura", english: "Tempura", category: "food" },
  { word: "うどん", hiragana: "うどん", romaji: "udon", english: "Udon noodles", category: "food" },
  { word: "そば", hiragana: "そば", romaji: "soba", english: "Soba (buckwheat noodles)", category: "food" },
  { word: "おにぎり", hiragana: "おにぎり", romaji: "onigiri", english: "Rice ball", category: "food" },
  { word: "味噌汁", hiragana: "みそしる", romaji: "miso shiru", english: "Miso soup", category: "food" },
  { word: "豆腐", hiragana: "とうふ", romaji: "toufu", english: "Tofu", category: "food" },
  { word: "納豆", hiragana: "なっとう", romaji: "nattou", english: "Natto (fermented soybean)", category: "food" },
  { word: "バナナ", hiragana: "ばなな", romaji: "banana", english: "Banana", category: "food" },
  { word: "みかん", hiragana: "みかん", romaji: "mikan", english: "Mandarin orange", category: "food" },
  { word: "ぶどう", hiragana: "ぶどう", romaji: "budou", english: "Grapes", category: "food" },
  { word: "いちご", hiragana: "いちご", romaji: "ichigo", english: "Strawberry", category: "food" },
  { word: "スイカ", hiragana: "すいか", romaji: "suika", english: "Watermelon", category: "food" },
  { word: "玉ねぎ", hiragana: "たまねぎ", romaji: "tamanegi", english: "Onion", category: "food" },
  { word: "にんじん", hiragana: "にんじん", romaji: "ninjin", english: "Carrot", category: "food" },
  { word: "じゃがいも", hiragana: "じゃがいも", romaji: "jagaimo", english: "Potato", category: "food" },
  { word: "キャベツ", hiragana: "きゃべつ", romaji: "kyabetsu", english: "Cabbage", category: "food" },
  { word: "トマト", hiragana: "とまと", romaji: "tomato", english: "Tomato", category: "food" },
  { word: "バター", hiragana: "ばたー", romaji: "bata-", english: "Butter", category: "food" },
  { word: "チーズ", hiragana: "ちーず", romaji: "chi-zu", english: "Cheese", category: "food" },
  { word: "アイスクリーム", hiragana: "あいすくりーむ", romaji: "aisu kuri-mu", english: "Ice cream", category: "food" },
  { word: "ケーキ", hiragana: "けーき", romaji: "ke-ki", english: "Cake", category: "food" },
  { word: "クッキー", hiragana: "くっきー", romaji: "kukki-", english: "Cookie", category: "food" },
  { word: "ジュース", hiragana: "じゅーす", romaji: "ju-su", english: "Juice", category: "food" },
  { word: "ビール", hiragana: "びーる", romaji: "bi-ru", english: "Beer", category: "food" },
  { word: "焼き魚", hiragana: "やきざかな", romaji: "yakizakana", english: "Grilled fish", category: "food" },
  { word: "鍋", hiragana: "なべ", romaji: "nabe", english: "Hot pot", category: "food" },
  { word: "焼き肉", hiragana: "やきにく", romaji: "yakiniku", english: "Grilled meat / BBQ", category: "food" },
  { word: "海苔", hiragana: "のり", romaji: "nori", english: "Dried seaweed", category: "food" },

  // ── New Places (25) ───────────────────────────────────────────────────────
  { word: "空港", hiragana: "くうこう", romaji: "kuukou", english: "Airport", category: "places" },
  { word: "港", hiragana: "みなと", romaji: "minato", english: "Harbor / Port", category: "places" },
  { word: "東", hiragana: "ひがし", romaji: "higashi", english: "East", category: "places" },
  { word: "西", hiragana: "にし", romaji: "nishi", english: "West", category: "places" },
  { word: "南", hiragana: "みなみ", romaji: "minami", english: "South", category: "places" },
  { word: "北", hiragana: "きた", romaji: "kita", english: "North", category: "places" },
  { word: "右", hiragana: "みぎ", romaji: "migi", english: "Right (direction)", category: "places" },
  { word: "左", hiragana: "ひだり", romaji: "hidari", english: "Left (direction)", category: "places" },
  { word: "上", hiragana: "うえ", romaji: "ue", english: "Above / Up", category: "places" },
  { word: "下", hiragana: "した", romaji: "shita", english: "Below / Down", category: "places" },
  { word: "前", hiragana: "まえ", romaji: "mae", english: "In front / Ahead", category: "places" },
  { word: "後ろ", hiragana: "うしろ", romaji: "ushiro", english: "Behind / Back", category: "places" },
  { word: "中", hiragana: "なか", romaji: "naka", english: "Inside / Middle", category: "places" },
  { word: "外", hiragana: "そと", romaji: "soto", english: "Outside", category: "places" },
  { word: "隣", hiragana: "となり", romaji: "tonari", english: "Next to / Neighboring", category: "places" },
  { word: "レストラン", hiragana: "れすとらん", romaji: "resutoran", english: "Restaurant", category: "places" },
  { word: "スーパー", hiragana: "すーぱー", romaji: "su-pa-", english: "Supermarket", category: "places" },
  { word: "コンビニ", hiragana: "こんびに", romaji: "konbini", english: "Convenience store", category: "places" },
  { word: "駐車場", hiragana: "ちゅうしゃじょう", romaji: "chuushajou", english: "Parking lot", category: "places" },
  { word: "空", hiragana: "そら", romaji: "sora", english: "Sky", category: "places" },
  { word: "森", hiragana: "もり", romaji: "mori", english: "Forest", category: "places" },
  { word: "橋", hiragana: "はし", romaji: "hashi", english: "Bridge", category: "places" },
  { word: "道", hiragana: "みち", romaji: "michi", english: "Road / Path", category: "places" },
  { word: "角", hiragana: "かど", romaji: "kado", english: "Corner", category: "places" },
  { word: "近所", hiragana: "きんじょ", romaji: "kinjo", english: "Neighborhood", category: "places" },

  // ── New Objects (30) ──────────────────────────────────────────────────────
  { word: "窓", hiragana: "まど", romaji: "mado", english: "Window", category: "objects" },
  { word: "ドア", hiragana: "どあ", romaji: "doa", english: "Door", category: "objects" },
  { word: "電気", hiragana: "でんき", romaji: "denki", english: "Electricity / Light", category: "objects" },
  { word: "電話", hiragana: "でんわ", romaji: "denwa", english: "Telephone", category: "objects" },
  { word: "コンピューター", hiragana: "こんぴゅーたー", romaji: "konpyu-ta-", english: "Computer", category: "objects" },
  { word: "紙", hiragana: "かみ", romaji: "kami", english: "Paper", category: "objects" },
  { word: "消しゴム", hiragana: "けしごむ", romaji: "keshigomu", english: "Eraser", category: "objects" },
  { word: "定規", hiragana: "じょうぎ", romaji: "jougi", english: "Ruler", category: "objects" },
  { word: "テーブル", hiragana: "てーぶる", romaji: "te-buru", english: "Table", category: "objects" },
  { word: "ソファ", hiragana: "そふぁ", romaji: "sofa", english: "Sofa", category: "objects" },
  { word: "ベッド", hiragana: "べっど", romaji: "beddo", english: "Bed", category: "objects" },
  { word: "布団", hiragana: "ふとん", romaji: "futon", english: "Futon / Bedding", category: "objects" },
  { word: "冷蔵庫", hiragana: "れいぞうこ", romaji: "reizouko", english: "Refrigerator", category: "objects" },
  { word: "お皿", hiragana: "おさら", romaji: "osara", english: "Plate / Dish", category: "objects" },
  { word: "コップ", hiragana: "こっぷ", romaji: "koppu", english: "Cup / Glass", category: "objects" },
  { word: "箸", hiragana: "はし", romaji: "hashi", english: "Chopsticks", category: "objects" },
  { word: "スプーン", hiragana: "すぷーん", romaji: "supu-n", english: "Spoon", category: "objects" },
  { word: "フォーク", hiragana: "ふぉーく", romaji: "fo-ku", english: "Fork", category: "objects" },
  { word: "ナイフ", hiragana: "ないふ", romaji: "naifu", english: "Knife", category: "objects" },
  { word: "やかん", hiragana: "やかん", romaji: "yakan", english: "Kettle", category: "objects" },
  { word: "ハンカチ", hiragana: "はんかち", romaji: "hankachi", english: "Handkerchief", category: "objects" },
  { word: "帽子", hiragana: "ぼうし", romaji: "boushi", english: "Hat / Cap", category: "objects" },
  { word: "めがね", hiragana: "めがね", romaji: "megane", english: "Eyeglasses", category: "objects" },
  { word: "荷物", hiragana: "にもつ", romaji: "nimotsu", english: "Luggage / Baggage", category: "objects" },
  { word: "薬", hiragana: "くすり", romaji: "kusuri", english: "Medicine", category: "objects" },
  { word: "石けん", hiragana: "せっけん", romaji: "sekken", english: "Soap", category: "objects" },
  { word: "タオル", hiragana: "たおる", romaji: "taoru", english: "Towel", category: "objects" },
  { word: "鏡", hiragana: "かがみ", romaji: "kagami", english: "Mirror", category: "objects" },
  { word: "花", hiragana: "はな", romaji: "hana", english: "Flower", category: "objects" },
  { word: "ラジオ", hiragana: "らじお", romaji: "rajio", english: "Radio", category: "objects" },

  // ── New People (15) ───────────────────────────────────────────────────────
  { word: "祖母", hiragana: "そぼ", romaji: "sobo", english: "Grandmother (own)", category: "people" },
  { word: "祖父", hiragana: "そふ", romaji: "sofu", english: "Grandfather (own)", category: "people" },
  { word: "おばあさん", hiragana: "おばあさん", romaji: "obaasan", english: "Grandmother (respectful)", category: "people" },
  { word: "おじいさん", hiragana: "おじいさん", romaji: "ojiisan", english: "Grandfather (respectful)", category: "people" },
  { word: "赤ちゃん", hiragana: "あかちゃん", romaji: "akachan", english: "Baby", category: "people" },
  { word: "彼", hiragana: "かれ", romaji: "kare", english: "He / Him / Boyfriend", category: "people" },
  { word: "彼女", hiragana: "かのじょ", romaji: "kanojo", english: "She / Her / Girlfriend", category: "people" },
  { word: "皆", hiragana: "みんな", romaji: "minna", english: "Everyone", category: "people" },
  { word: "誰", hiragana: "だれ", romaji: "dare", english: "Who", category: "people" },
  { word: "彼ら", hiragana: "かれら", romaji: "karera", english: "They (men / mixed group)", category: "people" },
  { word: "外国人", hiragana: "がいこくじん", romaji: "gaikokujin", english: "Foreigner", category: "people" },
  { word: "日本人", hiragana: "にほんじん", romaji: "nihonjin", english: "Japanese person", category: "people" },
  { word: "店員", hiragana: "てんいん", romaji: "ten'in", english: "Shop clerk", category: "people" },
  { word: "会社員", hiragana: "かいしゃいん", romaji: "kaishain", english: "Company employee", category: "people" },
  { word: "おじさん", hiragana: "おじさん", romaji: "ojisan", english: "Uncle / Middle-aged man", category: "people" },

  // ── New Time (10) ─────────────────────────────────────────────────────────
  { word: "月曜日", hiragana: "げつようび", romaji: "getsuyoubi", english: "Monday", category: "time" },
  { word: "火曜日", hiragana: "かようび", romaji: "kayoubi", english: "Tuesday", category: "time" },
  { word: "水曜日", hiragana: "すいようび", romaji: "suiyoubi", english: "Wednesday", category: "time" },
  { word: "木曜日", hiragana: "もくようび", romaji: "mokuyoubi", english: "Thursday", category: "time" },
  { word: "金曜日", hiragana: "きんようび", romaji: "kin'youbi", english: "Friday", category: "time" },
  { word: "土曜日", hiragana: "どようび", romaji: "doyoubi", english: "Saturday", category: "time" },
  { word: "日曜日", hiragana: "にちようび", romaji: "nichiyoubi", english: "Sunday", category: "time" },
  { word: "先月", hiragana: "せんげつ", romaji: "sengetsu", english: "Last month", category: "time" },
  { word: "来月", hiragana: "らいげつ", romaji: "raigetsu", english: "Next month", category: "time" },
  { word: "週末", hiragana: "しゅうまつ", romaji: "shuumatsu", english: "Weekend", category: "time" },
// ─────────────────────────────────────────────────────────────────────────────
// ASTRA — VOCABULARY_DATA  Part 2  (+200 entries, 594 total)
// NEW CATEGORIES this batch: "body" (30) · "weather" (20)
// HOMOPHONE NOTES (same hiragana/romaji, distinct kanji — by design):
//   はな : 鼻 (nose, body) · 花 (flower, objects — Part 1)
//   かみ : 髪 (hair, body) · 紙 (paper, objects — Part 1)
//   した : 舌 (tongue, body) · 下  (below, places — Part 1)
//   とる : 取る (take, actions) · 撮る (photograph, actions — Part 1)
//   とまる: 泊まる (stay overnight) · 止まる (stop — Part 1)
//   あつい: 厚い (thick, adj) · 暑い (hot weather) · 熱い (hot to touch — both existing)
// ─────────────────────────────────────────────────────────────────────────────

  // ── Body (30) ────────────────────────────────────────────────────────────
  { word: "顔", hiragana: "かお", romaji: "kao", english: "Face", category: "body" },
  { word: "頭", hiragana: "あたま", romaji: "atama", english: "Head", category: "body" },
  { word: "目", hiragana: "め", romaji: "me", english: "Eye(s)", category: "body" },
  { word: "耳", hiragana: "みみ", romaji: "mimi", english: "Ear(s)", category: "body" },
  { word: "鼻", hiragana: "はな", romaji: "hana", english: "Nose", category: "body" },
  { word: "口", hiragana: "くち", romaji: "kuchi", english: "Mouth", category: "body" },
  { word: "歯", hiragana: "は", romaji: "ha", english: "Tooth / Teeth", category: "body" },
  { word: "舌", hiragana: "した", romaji: "shita", english: "Tongue", category: "body" },
  { word: "首", hiragana: "くび", romaji: "kubi", english: "Neck", category: "body" },
  { word: "肩", hiragana: "かた", romaji: "kata", english: "Shoulder(s)", category: "body" },
  { word: "背中", hiragana: "せなか", romaji: "senaka", english: "Back (of body)", category: "body" },
  { word: "胸", hiragana: "むね", romaji: "mune", english: "Chest", category: "body" },
  { word: "お腹", hiragana: "おなか", romaji: "onaka", english: "Belly / Stomach", category: "body" },
  { word: "腰", hiragana: "こし", romaji: "koshi", english: "Waist / Lower back", category: "body" },
  { word: "手", hiragana: "て", romaji: "te", english: "Hand(s)", category: "body" },
  { word: "指", hiragana: "ゆび", romaji: "yubi", english: "Finger(s)", category: "body" },
  { word: "腕", hiragana: "うで", romaji: "ude", english: "Arm(s)", category: "body" },
  { word: "足", hiragana: "あし", romaji: "ashi", english: "Foot / Leg", category: "body" },
  { word: "膝", hiragana: "ひざ", romaji: "hiza", english: "Knee", category: "body" },
  { word: "ひじ", hiragana: "ひじ", romaji: "hiji", english: "Elbow", category: "body" },
  { word: "爪", hiragana: "つめ", romaji: "tsume", english: "Nail / Claw", category: "body" },
  { word: "体", hiragana: "からだ", romaji: "karada", english: "Body", category: "body" },
  { word: "髪", hiragana: "かみ", romaji: "kami", english: "Hair (on head)", category: "body" },
  { word: "心", hiragana: "こころ", romaji: "kokoro", english: "Heart / Mind", category: "body" },
  { word: "顎", hiragana: "あご", romaji: "ago", english: "Jaw / Chin", category: "body" },
  { word: "頬", hiragana: "ほお", romaji: "hoo", english: "Cheek", category: "body" },
  { word: "おでこ", hiragana: "おでこ", romaji: "odeko", english: "Forehead", category: "body" },
  { word: "骨", hiragana: "ほね", romaji: "hone", english: "Bone", category: "body" },
  { word: "声", hiragana: "こえ", romaji: "koe", english: "Voice", category: "body" },
  { word: "皮膚", hiragana: "ひふ", romaji: "hifu", english: "Skin", category: "body" },

  // ── Weather (20) ─────────────────────────────────────────────────────────
  { word: "天気", hiragana: "てんき", romaji: "tenki", english: "Weather", category: "weather" },
  { word: "雨", hiragana: "あめ", romaji: "ame", english: "Rain", category: "weather" },
  { word: "晴れ", hiragana: "はれ", romaji: "hare", english: "Clear / Sunny", category: "weather" },
  { word: "曇り", hiragana: "くもり", romaji: "kumori", english: "Cloudy", category: "weather" },
  { word: "雪", hiragana: "ゆき", romaji: "yuki", english: "Snow", category: "weather" },
  { word: "風", hiragana: "かぜ", romaji: "kaze", english: "Wind", category: "weather" },
  { word: "台風", hiragana: "たいふう", romaji: "taifuu", english: "Typhoon", category: "weather" },
  { word: "嵐", hiragana: "あらし", romaji: "arashi", english: "Storm", category: "weather" },
  { word: "雷", hiragana: "かみなり", romaji: "kaminari", english: "Thunder / Lightning", category: "weather" },
  { word: "霧", hiragana: "きり", romaji: "kiri", english: "Fog / Mist", category: "weather" },
  { word: "虹", hiragana: "にじ", romaji: "niji", english: "Rainbow", category: "weather" },
  { word: "気温", hiragana: "きおん", romaji: "kion", english: "Air temperature", category: "weather" },
  { word: "季節", hiragana: "きせつ", romaji: "kisetsu", english: "Season", category: "weather" },
  { word: "春", hiragana: "はる", romaji: "haru", english: "Spring", category: "weather" },
  { word: "夏", hiragana: "なつ", romaji: "natsu", english: "Summer", category: "weather" },
  { word: "秋", hiragana: "あき", romaji: "aki", english: "Autumn / Fall", category: "weather" },
  { word: "冬", hiragana: "ふゆ", romaji: "fuyu", english: "Winter", category: "weather" },
  { word: "太陽", hiragana: "たいよう", romaji: "taiyou", english: "Sun / Sunlight", category: "weather" },
  { word: "月", hiragana: "つき", romaji: "tsuki", english: "Moon", category: "weather" },
  { word: "星", hiragana: "ほし", romaji: "hoshi", english: "Star", category: "weather" },

  // ── New Actions (50) ─────────────────────────────────────────────────────
  { word: "泊まる", hiragana: "とまる", romaji: "tomaru", english: "To stay overnight", category: "actions" },
  { word: "生まれる", hiragana: "うまれる", romaji: "umareru", english: "To be born", category: "actions" },
  { word: "死ぬ", hiragana: "しぬ", romaji: "shinu", english: "To die", category: "actions" },
  { word: "決める", hiragana: "きめる", romaji: "kimeru", english: "To decide", category: "actions" },
  { word: "開く", hiragana: "ひらく", romaji: "hiraku", english: "To open (intrans.)", category: "actions" },
  { word: "閉まる", hiragana: "しまる", romaji: "shimaru", english: "To close (intrans.)", category: "actions" },
  { word: "付ける", hiragana: "つける", romaji: "tsukeru", english: "To turn on / attach", category: "actions" },
  { word: "消す", hiragana: "けす", romaji: "kesu", english: "To turn off / erase", category: "actions" },
  { word: "入れる", hiragana: "いれる", romaji: "ireru", english: "To put in", category: "actions" },
  { word: "取る", hiragana: "とる", romaji: "toru", english: "To take / pick up", category: "actions" },
  { word: "起こる", hiragana: "おこる", romaji: "okoru", english: "To happen / occur", category: "actions" },
  { word: "変わる", hiragana: "かわる", romaji: "kawaru", english: "To change (intrans.)", category: "actions" },
  { word: "喜ぶ", hiragana: "よろこぶ", romaji: "yorokobu", english: "To be happy / rejoice", category: "actions" },
  { word: "疲れる", hiragana: "つかれる", romaji: "tsukareru", english: "To get tired", category: "actions" },
  { word: "転ぶ", hiragana: "ころぶ", romaji: "korobu", english: "To fall down / tumble", category: "actions" },
  { word: "生きる", hiragana: "いきる", romaji: "ikiru", english: "To live / be alive", category: "actions" },
  { word: "結婚する", hiragana: "けっこんする", romaji: "kekkon suru", english: "To get married", category: "actions" },
  { word: "直す", hiragana: "なおす", romaji: "naosu", english: "To fix / repair", category: "actions" },
  { word: "壊す", hiragana: "こわす", romaji: "kowasu", english: "To break (trans.)", category: "actions" },
  { word: "落とす", hiragana: "おとす", romaji: "otosu", english: "To drop (trans.)", category: "actions" },
  { word: "落ちる", hiragana: "おちる", romaji: "ochiru", english: "To fall / drop (intrans.)", category: "actions" },
  { word: "通る", hiragana: "とおる", romaji: "tooru", english: "To pass through", category: "actions" },
  { word: "曲がる", hiragana: "まがる", romaji: "magaru", english: "To turn / bend", category: "actions" },
  { word: "渡る", hiragana: "わたる", romaji: "wataru", english: "To cross (a road / river)", category: "actions" },
  { word: "並ぶ", hiragana: "ならぶ", romaji: "narabu", english: "To line up / be in a row", category: "actions" },
  { word: "動く", hiragana: "うごく", romaji: "ugoku", english: "To move (intrans.)", category: "actions" },
  { word: "選ぶ", hiragana: "えらぶ", romaji: "erabu", english: "To choose / select", category: "actions" },
  { word: "続ける", hiragana: "つづける", romaji: "tsuzukeru", english: "To continue (trans.)", category: "actions" },
  { word: "頑張る", hiragana: "がんばる", romaji: "ganbaru", english: "To do one's best", category: "actions" },
  { word: "驚く", hiragana: "おどろく", romaji: "odoroku", english: "To be surprised", category: "actions" },
  { word: "心配する", hiragana: "しんぱいする", romaji: "shinpai suru", english: "To worry", category: "actions" },
  { word: "太る", hiragana: "ふとる", romaji: "futoru", english: "To gain weight", category: "actions" },
  { word: "痩せる", hiragana: "やせる", romaji: "yaseru", english: "To lose weight", category: "actions" },
  { word: "見える", hiragana: "みえる", romaji: "mieru", english: "To be visible / can see", category: "actions" },
  { word: "聞こえる", hiragana: "きこえる", romaji: "kikoeru", english: "To be audible / can hear", category: "actions" },
  { word: "困る", hiragana: "こまる", romaji: "komaru", english: "To be troubled / in trouble", category: "actions" },
  { word: "上がる", hiragana: "あがる", romaji: "agaru", english: "To rise / go up", category: "actions" },
  { word: "下がる", hiragana: "さがる", romaji: "sagaru", english: "To fall / go down", category: "actions" },
  { word: "増やす", hiragana: "ふやす", romaji: "fuyasu", english: "To increase (trans.)", category: "actions" },
  { word: "迷う", hiragana: "まよう", romaji: "mayou", english: "To get lost / hesitate", category: "actions" },
  { word: "触る", hiragana: "さわる", romaji: "sawaru", english: "To touch", category: "actions" },
  { word: "倒れる", hiragana: "たおれる", romaji: "taoreru", english: "To fall over / collapse", category: "actions" },
  { word: "勝つ", hiragana: "かつ", romaji: "katsu", english: "To win", category: "actions" },
  { word: "負ける", hiragana: "まける", romaji: "makeru", english: "To lose (a contest)", category: "actions" },
  { word: "遅れる", hiragana: "おくれる", romaji: "okureru", english: "To be late", category: "actions" },
  { word: "眠る", hiragana: "ねむる", romaji: "nemuru", english: "To sleep / fall asleep", category: "actions" },
  { word: "連れる", hiragana: "つれる", romaji: "tsureru", english: "To bring / take along", category: "actions" },
  { word: "動かす", hiragana: "うごかす", romaji: "ugokasu", english: "To move (trans.)", category: "actions" },
  { word: "試す", hiragana: "ためす", romaji: "tamesu", english: "To try / test", category: "actions" },
  { word: "片付ける", hiragana: "かたづける", romaji: "katazukeru", english: "To tidy up / put away", category: "actions" },

  // ── New Adjectives (30) ───────────────────────────────────────────────────
  { word: "細い", hiragana: "ほそい", romaji: "hosoi", english: "Thin / Slender", category: "adjectives" },
  { word: "太い", hiragana: "ふとい", romaji: "futoi", english: "Thick / Stout", category: "adjectives" },
  { word: "柔らかい", hiragana: "やわらかい", romaji: "yawarakai", english: "Soft", category: "adjectives" },
  { word: "硬い", hiragana: "かたい", romaji: "katai", english: "Hard / Stiff", category: "adjectives" },
  { word: "薄い", hiragana: "うすい", romaji: "usui", english: "Thin (flat) / Faint", category: "adjectives" },
  { word: "厚い", hiragana: "あつい", romaji: "atsui", english: "Thick (book / cloth)", category: "adjectives" },
  { word: "すごい", hiragana: "すごい", romaji: "sugoi", english: "Amazing / Incredible", category: "adjectives" },
  { word: "大変", hiragana: "たいへん", romaji: "taihen", english: "Tough / Terrible / Serious", category: "adjectives" },
  { word: "普通", hiragana: "ふつう", romaji: "futsuu", english: "Ordinary / Normal", category: "adjectives" },
  { word: "特別", hiragana: "とくべつ", romaji: "tokubetsu", english: "Special", category: "adjectives" },
  { word: "簡単", hiragana: "かんたん", romaji: "kantan", english: "Easy / Simple", category: "adjectives" },
  { word: "残念", hiragana: "ざんねん", romaji: "zannen", english: "Unfortunate / What a pity", category: "adjectives" },
  { word: "不思議", hiragana: "ふしぎ", romaji: "fushigi", english: "Mysterious / Strange", category: "adjectives" },
  { word: "真面目", hiragana: "まじめ", romaji: "majime", english: "Serious / Earnest", category: "adjectives" },
  { word: "幸せ", hiragana: "しあわせ", romaji: "shiawase", english: "Happy / Fortunate", category: "adjectives" },
  { word: "安全", hiragana: "あんぜん", romaji: "anzen", english: "Safe", category: "adjectives" },
  { word: "危ない", hiragana: "あぶない", romaji: "abunai", english: "Dangerous", category: "adjectives" },
  { word: "苦い", hiragana: "にがい", romaji: "nigai", english: "Bitter", category: "adjectives" },
  { word: "酸っぱい", hiragana: "すっぱい", romaji: "suppai", english: "Sour", category: "adjectives" },
  { word: "美しい", hiragana: "うつくしい", romaji: "utsukushii", english: "Beautiful", category: "adjectives" },
  { word: "かっこいい", hiragana: "かっこいい", romaji: "kakkoii", english: "Cool / Stylish", category: "adjectives" },
  { word: "暖かい", hiragana: "あたたかい", romaji: "atatakai", english: "Warm (room / weather)", category: "adjectives" },
  { word: "涼しい", hiragana: "すずしい", romaji: "suzushii", english: "Cool / Pleasantly cool", category: "adjectives" },
  { word: "細かい", hiragana: "こまかい", romaji: "komakai", english: "Detailed / Fine", category: "adjectives" },
  { word: "正直", hiragana: "しょうじき", romaji: "shoujiki", english: "Honest", category: "adjectives" },
  { word: "不便", hiragana: "ふべん", romaji: "fuben", english: "Inconvenient", category: "adjectives" },
  { word: "地味", hiragana: "じみ", romaji: "jimi", english: "Plain / Subdued", category: "adjectives" },
  { word: "派手", hiragana: "はで", romaji: "hade", english: "Flashy / Showy", category: "adjectives" },
  { word: "もったいない", hiragana: "もったいない", romaji: "mottainai", english: "Wasteful / What a waste", category: "adjectives" },
  { word: "楽", hiragana: "らく", romaji: "raku", english: "Easy / Comfortable", category: "adjectives" },

  // ── New Objects (30) ──────────────────────────────────────────────────────
  { word: "靴下", hiragana: "くつした", romaji: "kutsushita", english: "Socks", category: "objects" },
  { word: "シャツ", hiragana: "しゃつ", romaji: "shatsu", english: "Shirt", category: "objects" },
  { word: "ズボン", hiragana: "ずぼん", romaji: "zubon", english: "Trousers / Pants", category: "objects" },
  { word: "スカート", hiragana: "すかーと", romaji: "suka-to", english: "Skirt", category: "objects" },
  { word: "コート", hiragana: "こーと", romaji: "ko-to", english: "Coat", category: "objects" },
  { word: "セーター", hiragana: "せーたー", romaji: "se-ta-", english: "Sweater", category: "objects" },
  { word: "洗濯機", hiragana: "せんたくき", romaji: "sentakuki", english: "Washing machine", category: "objects" },
  { word: "エアコン", hiragana: "えあこん", romaji: "eakon", english: "Air conditioner", category: "objects" },
  { word: "フライパン", hiragana: "ふらいぱん", romaji: "furaipan", english: "Frying pan", category: "objects" },
  { word: "お椀", hiragana: "おわん", romaji: "owan", english: "Japanese soup bowl", category: "objects" },
  { word: "袋", hiragana: "ふくろ", romaji: "fukuro", english: "Bag / Sack / Pouch", category: "objects" },
  { word: "箱", hiragana: "はこ", romaji: "hako", english: "Box", category: "objects" },
  { word: "瓶", hiragana: "びん", romaji: "bin", english: "Bottle (glass)", category: "objects" },
  { word: "缶", hiragana: "かん", romaji: "kan", english: "Can / Tin", category: "objects" },
  { word: "絵", hiragana: "え", romaji: "e", english: "Picture / Painting", category: "objects" },
  { word: "写真", hiragana: "しゃしん", romaji: "shashin", english: "Photograph", category: "objects" },
  { word: "地図", hiragana: "ちず", romaji: "chizu", english: "Map", category: "objects" },
  { word: "カレンダー", hiragana: "かれんだー", romaji: "karenda-", english: "Calendar", category: "objects" },
  { word: "日記", hiragana: "にっき", romaji: "nikki", english: "Diary", category: "objects" },
  { word: "ゴミ", hiragana: "ごみ", romaji: "gomi", english: "Garbage / Trash", category: "objects" },
  { word: "棚", hiragana: "たな", romaji: "tana", english: "Shelf", category: "objects" },
  { word: "引き出し", hiragana: "ひきだし", romaji: "hikidashi", english: "Drawer", category: "objects" },
  { word: "電池", hiragana: "でんち", romaji: "denchi", english: "Battery", category: "objects" },
  { word: "ろうそく", hiragana: "ろうそく", romaji: "rousoku", english: "Candle", category: "objects" },
  { word: "テープ", hiragana: "てーぷ", romaji: "te-pu", english: "Tape", category: "objects" },
  { word: "カーテン", hiragana: "かーてん", romaji: "ka-ten", english: "Curtain", category: "objects" },
  { word: "縄", hiragana: "なわ", romaji: "nawa", english: "Rope", category: "objects" },
  { word: "楽器", hiragana: "がっき", romaji: "gakki", english: "Musical instrument", category: "objects" },
  { word: "アルバム", hiragana: "あるばむ", romaji: "arubamu", english: "Photo album", category: "objects" },
  { word: "布", hiragana: "ぬの", romaji: "nuno", english: "Cloth / Fabric", category: "objects" },

  // ── New Places (20) ───────────────────────────────────────────────────────
  { word: "神社", hiragana: "じんじゃ", romaji: "jinja", english: "Shinto shrine", category: "places" },
  { word: "お寺", hiragana: "おてら", romaji: "otera", english: "Buddhist temple", category: "places" },
  { word: "城", hiragana: "しろ", romaji: "shiro", english: "Castle", category: "places" },
  { word: "市場", hiragana: "いちば", romaji: "ichiba", english: "Market", category: "places" },
  { word: "温泉", hiragana: "おんせん", romaji: "onsen", english: "Hot spring", category: "places" },
  { word: "海岸", hiragana: "かいがん", romaji: "kaigan", english: "Beach / Coast", category: "places" },
  { word: "池", hiragana: "いけ", romaji: "ike", english: "Pond", category: "places" },
  { word: "湖", hiragana: "みずうみ", romaji: "mizuumi", english: "Lake", category: "places" },
  { word: "野原", hiragana: "のはら", romaji: "nohara", english: "Field / Meadow", category: "places" },
  { word: "丘", hiragana: "おか", romaji: "oka", english: "Hill", category: "places" },
  { word: "地下", hiragana: "ちか", romaji: "chika", english: "Underground / Basement", category: "places" },
  { word: "屋上", hiragana: "おくじょう", romaji: "okujou", english: "Rooftop", category: "places" },
  { word: "玄関", hiragana: "げんかん", romaji: "genkan", english: "Entrance hall / Foyer", category: "places" },
  { word: "台所", hiragana: "だいどころ", romaji: "daidokoro", english: "Kitchen", category: "places" },
  { word: "お風呂", hiragana: "おふろ", romaji: "ofuro", english: "Bath / Bathroom", category: "places" },
  { word: "廊下", hiragana: "ろうか", romaji: "rouka", english: "Hallway / Corridor", category: "places" },
  { word: "階段", hiragana: "かいだん", romaji: "kaidan", english: "Stairs", category: "places" },
  { word: "入口", hiragana: "いりぐち", romaji: "iriguchi", english: "Entrance", category: "places" },
  { word: "出口", hiragana: "でぐち", romaji: "deguchi", english: "Exit", category: "places" },
  { word: "交差点", hiragana: "こうさてん", romaji: "kousaten", english: "Intersection / Crossroad", category: "places" },

  // ── New School (20) ───────────────────────────────────────────────────────
  { word: "国語", hiragana: "こくご", romaji: "kokugo", english: "Japanese language (subject)", category: "school" },
  { word: "数学", hiragana: "すうがく", romaji: "suugaku", english: "Mathematics", category: "school" },
  { word: "英語", hiragana: "えいご", romaji: "eigo", english: "English (subject)", category: "school" },
  { word: "理科", hiragana: "りか", romaji: "rika", english: "Science", category: "school" },
  { word: "社会", hiragana: "しゃかい", romaji: "shakai", english: "Social studies", category: "school" },
  { word: "体育", hiragana: "たいいく", romaji: "taiiku", english: "Physical education", category: "school" },
  { word: "音楽", hiragana: "おんがく", romaji: "ongaku", english: "Music (subject)", category: "school" },
  { word: "美術", hiragana: "びじゅつ", romaji: "bijutsu", english: "Art", category: "school" },
  { word: "卒業", hiragana: "そつぎょう", romaji: "sotsugyou", english: "Graduation", category: "school" },
  { word: "入学", hiragana: "にゅうがく", romaji: "nyuugaku", english: "Starting school / Enrollment", category: "school" },
  { word: "教科書", hiragana: "きょうかしょ", romaji: "kyoukasho", english: "Textbook", category: "school" },
  { word: "クラス", hiragana: "くらす", romaji: "kurasu", english: "Class", category: "school" },
  { word: "生徒", hiragana: "せいと", romaji: "seito", english: "Pupil / Student", category: "school" },
  { word: "先輩", hiragana: "せんぱい", romaji: "senpai", english: "Upperclassman / Senior", category: "school" },
  { word: "後輩", hiragana: "こうはい", romaji: "kouhai", english: "Lowerclassman / Junior", category: "school" },
  { word: "体育館", hiragana: "たいいくかん", romaji: "taiikukan", english: "Gymnasium", category: "school" },
  { word: "運動場", hiragana: "うんどうじょう", romaji: "undoujou", english: "School grounds / Sports field", category: "school" },
  { word: "春休み", hiragana: "はるやすみ", romaji: "haruyasumi", english: "Spring break", category: "school" },
  { word: "夏休み", hiragana: "なつやすみ", romaji: "natsuyasumi", english: "Summer vacation", category: "school" },
  { word: "冬休み", hiragana: "ふゆやすみ", romaji: "fuyuyasumi", english: "Winter break", category: "school" },
];

export const KATAKANA_DATA: KatakanaItem[] = [
  // Basic - Vowels
  {
    kana: "ア",
    romaji: "a",
    category: "basic",
    group: "Vowels",
    examples: [
      { japanese: "アメリカ (あめりか)", romaji: "amerika", english: "America" },
      { japanese: "アイス (あいす)", romaji: "aisu", english: "Ice cream / Ice" }
    ]
  },
  {
    kana: "イ",
    romaji: "i",
    category: "basic",
    group: "Vowels",
    examples: [
      { japanese: "イギリス (いぎりす)", romaji: "igirisu", english: "United Kingdom / British" },
      { japanese: "インク (いんく)", romaji: "inku", english: "Ink" }
    ]
  },
  {
    kana: "ウ",
    romaji: "u",
    category: "basic",
    group: "Vowels",
    examples: [
      { japanese: "ウイスキー (ういすきー)", romaji: "uisuki-", english: "Whiskey" },
      { japanese: "ウサギ (うさぎ)", romaji: "usagi", english: "Rabbit (Katakana usage)" }
    ]
  },
  {
    kana: "エ",
    romaji: "e",
    category: "basic",
    group: "Vowels",
    examples: [
      { japanese: "エアコン (えあこん)", romaji: "eakon", english: "Air conditioner" },
      { japanese: "エレベーター (えれべーたー)", romaji: "erebe-ta-", english: "Elevator" }
    ]
  },
  {
    kana: "オ",
    romaji: "o",
    category: "basic",
    group: "Vowels",
    examples: [
      { japanese: "オレンジ (おれんじ)", romaji: "orenji", english: "Orange" },
      { japanese: "オフィス (おふぃす)", romaji: "ofisu", english: "Office" }
    ]
  },
  // K-Row
  {
    kana: "カ",
    romaji: "ka",
    category: "basic",
    group: "K-Row",
    examples: [
      { japanese: "カメラ (かめら)", romaji: "kamera", english: "Camera" },
      { japanese: "カレー (かれー)", romaji: "kare-", english: "Curry" }
    ]
  },
  {
    kana: "キ",
    romaji: "ki",
    category: "basic",
    group: "K-Row",
    examples: [
      { japanese: "ギター (ぎたー)", romaji: "gita-", english: "Guitar" },
      { japanese: "キャンプ (きゃんぷ)", romaji: "kyanpu", english: "Camping" }
    ]
  },
  {
    kana: "ク",
    romaji: "ku",
    category: "basic",
    group: "K-Row",
    examples: [
      { japanese: "クラス (くらす)", romaji: "kurasu", english: "Classroom / Class" },
      { japanese: "クリスマス (くりすます)", romaji: "kurisumasu", english: "Christmas" }
    ]
  },
  {
    kana: "ケ",
    romaji: "ke",
    category: "basic",
    group: "K-Row",
    examples: [
      { japanese: "ケーキ (けーき)", romaji: "ke-ki", english: "Cake" },
      { japanese: "ケース (けーす)", romaji: "ke-su", english: "Case" }
    ]
  },
  {
    kana: "コ",
    romaji: "ko",
    category: "basic",
    group: "K-Row",
    examples: [
      { japanese: "コップ (こっぷ)", romaji: "koppu", english: "Glass / Cup" },
      { japanese: "コーヒー (こーひー)", romaji: "ko-hi-", english: "Coffee" }
    ]
  },
  // S-Row
  {
    kana: "サ",
    romaji: "sa",
    category: "basic",
    group: "S-Row",
    examples: [
      { japanese: "サラダ (さらだ)", romaji: "sarada", english: "Salad" },
      { japanese: "サイン (さいん)", romaji: "sain", english: "Sign / Autograph" }
    ]
  },
  {
    kana: "シ",
    romaji: "shi",
    category: "basic",
    group: "S-Row",
    examples: [
      { japanese: "シャワー (しゃわー)", romaji: "shawa-", english: "Shower" },
      { japanese: "シート (しーと)", romaji: "shi-to", english: "Seat / Sheet" }
    ]
  },
  {
    kana: "ス",
    romaji: "su",
    category: "basic",
    group: "S-Row",
    examples: [
      { japanese: "スポーツ (すぽーつ)", romaji: "supo-tsu", english: "Sports" },
      { japanese: "スーパー (すーぱー)", romaji: "su-pa-", english: "Supermarket" }
    ]
  },
  {
    kana: "セ",
    romaji: "se",
    category: "basic",
    group: "S-Row",
    examples: [
      { japanese: "セーター (せーたー)", romaji: "se-ta-", english: "Sweater" },
      { japanese: "セミナー (せみなー)", romaji: "semina-", english: "Seminar" }
    ]
  },
  {
    kana: "ソ",
    romaji: "so",
    category: "basic",
    group: "S-Row",
    examples: [
      { japanese: "ソファー (そふぁー)", romaji: "sofa-", english: "Sofa / Couch" },
      { japanese: "ソース (そーす)", romaji: "so-su", english: "Sauce" }
    ]
  },
  // T-Row
  {
    kana: "タ",
    romaji: "ta",
    category: "basic",
    group: "T-Row",
    examples: [
      { japanese: "タクシー (たくしー)", romaji: "takushi-", english: "Taxi" },
      { japanese: "タオル (たおる)", romaji: "taoru", english: "Towel" }
    ]
  },
  {
    kana: "チ",
    romaji: "chi",
    category: "basic",
    group: "T-Row",
    examples: [
      { japanese: "チーム (ちーむ)", romaji: "chi-mu", english: "Team" },
      { japanese: "チーズ (ちーず)", romaji: "chi-zu", english: "Cheese" }
    ]
  },
  {
    kana: "ツ",
    romaji: "tsu",
    category: "basic",
    group: "T-Row",
    examples: [
      { japanese: "ツアー (つあー)", romaji: "tsua-", english: "Tour" },
      { japanese: "ツリー (つりー)", romaji: "tsuri-", english: "Tree (Christmas)" }
    ]
  },
  {
    kana: "テ",
    romaji: "te",
    category: "basic",
    group: "T-Row",
    examples: [
      { japanese: "テレビ (てれび)", romaji: "terebi", english: "Television" },
      { japanese: "テーブル (てーぶる)", romaji: "te-buru", english: "Table" }
    ]
  },
  {
    kana: "ト",
    romaji: "to",
    category: "basic",
    group: "T-Row",
    examples: [
      { japanese: "トイレ (といれ)", romaji: "toire", english: "Toilet / Restroom" },
      { japanese: "トマト (とまと)", romaji: "tomato", english: "Tomato" }
    ]
  },
  // N-Row
  {
    kana: "ナ",
    romaji: "na",
    category: "basic",
    group: "N-Row",
    examples: [
      { japanese: "ナイフ (ないふ)", romaji: "naifu", english: "Knife" },
      { japanese: "ナプキン (なぷきん)", romaji: "napukin", english: "Napkin" }
    ]
  },
  {
    kana: "ニ",
    romaji: "ni",
    category: "basic",
    group: "N-Row",
    examples: [
      { japanese: "ニュース (にゅーす)", romaji: "nyu-su", english: "News" },
      { japanese: "ニックネーム (にっくねーむ)", romaji: "nikkune-mu", english: "Nickname" }
    ]
  },
  {
    kana: "ヌ",
    romaji: "nu",
    category: "basic",
    group: "N-Row",
    examples: [
      { japanese: "ヌードル (ぬーどる)", romaji: "nu-doru", english: "Noodle" },
      { japanese: "ヌーヴォー (ぬーぼー)", romaji: "nu-bo-", english: "Nouveau" }
    ]
  },
  {
    kana: "ネ",
    romaji: "ne",
    category: "basic",
    group: "N-Row",
    examples: [
      { japanese: "ネクタイ (ねくたい)", romaji: "nekutai", english: "Necktie" },
      { japanese: "ネット (ねっと)", romaji: "netto", english: "Internet / Net" }
    ]
  },
  {
    kana: "ノ",
    romaji: "no",
    category: "basic",
    group: "N-Row",
    examples: [
      { japanese: "ノート (のーと)", romaji: "no-to", english: "Notebook / Note" },
      { japanese: "ノック (のっく)", romaji: "nokku", english: "Knock" }
    ]
  },
  // H-Row
  {
    kana: "ハ",
    romaji: "ha",
    category: "basic",
    group: "H-Row",
    examples: [
      { japanese: "ハム (はむ)", romaji: "hamu", english: "Ham" },
      { japanese: "ハンバーグ (はんばーぐ)", romaji: "hanba-gu", english: "Hamburg steak" }
    ]
  },
  {
    kana: "ヒ",
    romaji: "hi",
    category: "basic",
    group: "H-Row",
    examples: [
      { japanese: "ヒーター (ひーたー)", romaji: "hi-ta-", english: "Heater" },
      { japanese: "ヒーロー (ひーろー)", romaji: "hi-ro-", english: "Hero" }
    ]
  },
  {
    kana: "フ",
    romaji: "fu",
    category: "basic",
    group: "H-Row",
    examples: [
      { japanese: "フィルム (ふぃるむ)", romaji: "firumu", english: "Film" },
      { japanese: "フォーク (ふぉーく)", romaji: "fo-ku", english: "Fork" }
    ]
  },
  {
    kana: "ヘ",
    romaji: "he",
    category: "basic",
    group: "H-Row",
    examples: [
      { japanese: "ヘリコプター (へりこぷたー)", romaji: "herikoputa-", english: "Helicopter" },
      { japanese: "ペン (ぺん)", romaji: "pen", english: "Pen" }
    ]
  },
  {
    kana: "ホ",
    romaji: "ho",
    category: "basic",
    group: "H-Row",
    examples: [
      { japanese: "ホテル (ほてる)", romaji: "hoteru", english: "Hotel" },
      { japanese: "ホーム (ほーむ)", romaji: "ho-mu", english: "Platform / Home" }
    ]
  },
  // M-Row
  {
    kana: "マ",
    romaji: "ma",
    category: "basic",
    group: "M-Row",
    examples: [
      { japanese: "マッチ (まっち)", romaji: "macchi", english: "Match (fire)" },
      { japanese: "マイク (まいく)", romaji: "maiku", english: "Microphone" }
    ]
  },
  {
    kana: "ミ",
    romaji: "mi",
    category: "basic",
    group: "M-Row",
    examples: [
      { japanese: "ミルク (みるく)", romaji: "miruku", english: "Milk" },
      { japanese: "ミシン (みしん)", romaji: "mishin", english: "Sewing machine" }
    ]
  },
  {
    kana: "ム",
    romaji: "mu",
    category: "basic",
    group: "M-Row",
    examples: [
      { japanese: "ムービー (むーびー)", romaji: "mu-bi-", english: "Movie" },
      { japanese: "ムード (むーど)", romaji: "mu-do", english: "Mood" }
    ]
  },
  {
    kana: "メ",
    romaji: "me",
    category: "basic",
    group: "M-Row",
    examples: [
      { japanese: "メロン (めろん)", romaji: "meron", english: "Melon" },
      { japanese: "メニュー (めにゅー)", romaji: "menyu-", english: "Menu" }
    ]
  },
  {
    kana: "モ",
    romaji: "mo",
    category: "basic",
    group: "M-Row",
    examples: [
      { japanese: "モデル (もでる)", romaji: "moderu", english: "Model" },
      { japanese: "モーター (もーたー)", romaji: "mo-ta-", english: "Motor" }
    ]
  },
  // Y-Row
  {
    kana: "ヤ",
    romaji: "ya",
    category: "basic",
    group: "Y-Row",
    examples: [
      { japanese: "ヤード (やーど)", romaji: "ya-do", english: "Yard" },
      { japanese: "サラダ (さらだ)", romaji: "sarada", english: "Salad (uses Ya-row combo)" }
    ]
  },
  {
    kana: "ユ",
    romaji: "yu",
    category: "basic",
    group: "Y-Row",
    examples: [
      { japanese: "ユニフォーム (ゆにふぉーむ)", romaji: "yunifo-mu", english: "Uniform" },
      { japanese: "ユーモア (ゆーもあ)", romaji: "yu-moa", english: "Humor" }
    ]
  },
  {
    kana: "ヨ",
    romaji: "yo",
    category: "basic",
    group: "Y-Row",
    examples: [
      { japanese: "ヨット (よっと)", romaji: "yotto", english: "Yacht" },
      { japanese: "ヨーグルト (よーぐると)", romaji: "yo-guruto", english: "Yogurt" }
    ]
  },
  // R-Row
  {
    kana: "ラ",
    romaji: "ra",
    category: "basic",
    group: "R-Row",
    examples: [
      { japanese: "ラジオ (らじお)", romaji: "rajio", english: "Radio" },
      { japanese: "ライト (らいと)", romaji: "raito", english: "Light" }
    ]
  },
  {
    kana: "リ",
    romaji: "ri",
    category: "basic",
    group: "R-Row",
    examples: [
      { japanese: "リボン (りぼん)", romaji: "ribon", english: "Ribbon / Bow" },
      { japanese: "リンス (りんす)", romaji: "rinsu", english: "Hair rinse" }
    ]
  },
  {
    kana: "ル",
    romaji: "ru",
    category: "basic",
    group: "R-Row",
    examples: [
      { japanese: "ルール (るーる)", romaji: "ru-ru", english: "Rule" },
      { japanese: "ルビー (るびー)", romaji: "rubi-", english: "Ruby" }
    ]
  },
  {
    kana: "レ",
    romaji: "re",
    category: "basic",
    group: "R-Row",
    examples: [
      { japanese: "レストラン (れすとらん)", romaji: "resutoran", english: "Restaurant" },
      { japanese: "レポート (れぽーと)", romaji: "repo-to", english: "Report" }
    ]
  },
  {
    kana: "ロ",
    romaji: "ro",
    category: "basic",
    group: "R-Row",
    examples: [
      { japanese: "ロビー (ろびー)", romaji: "robi-", english: "Lobby" },
      { japanese: "ロケット (ろけっと)", romaji: "roketto", english: "Rocket" }
    ]
  },
  // W-Row
  {
    kana: "ワ",
    romaji: "wa",
    category: "basic",
    group: "W-Row",
    examples: [
      { japanese: "ワイシャツ (わいしゃつ)", romaji: "waishatsu", english: "White collared shirt" },
      { japanese: "ワイン (わいん)", romaji: "wain", english: "Wine" }
    ]
  },
  {
    kana: "ヲ",
    romaji: "wo",
    category: "basic",
    group: "W-Row",
    examples: [{ japanese: "ヲタ (をた)", romaji: "wota", english: "Otaku (historical/slang variation)" }]
  },
  {
    kana: "ン",
    romaji: "n",
    category: "basic",
    group: "W-Row",
    examples: [{ japanese: "パン (ぱん)", romaji: "pan", english: "Bread (ends in N)" }]
  },

  // DAKUON (Voiced)
  {
    kana: "ガ",
    romaji: "ga",
    category: "dakuon",
    group: "G-Row",
    examples: [{ japanese: "ガラス (がらす)", romaji: "garasu", english: "Glass pane" }]
  },
  {
    kana: "ギ",
    romaji: "gi",
    category: "dakuon",
    group: "G-Row",
    examples: [{ japanese: "ギター (ぎたー)", romaji: "gita-", english: "Guitar" }]
  },
  {
    kana: "グ",
    romaji: "gu",
    category: "dakuon",
    group: "G-Row",
    examples: [{ japanese: "グラム (ぐらむ)", romaji: "guramu", english: "Gram" }]
  },
  {
    kana: "ゲ",
    romaji: "ge",
    category: "dakuon",
    group: "G-Row",
    examples: [{ japanese: "ゲーム (げーむ)", romaji: "ge-mu", english: "Game" }]
  },
  {
    kana: "ゴ",
    romaji: "go",
    category: "dakuon",
    group: "G-Row",
    examples: [{ japanese: "ゴルフ (ごるふ)", romaji: "gorufu", english: "Golf" }]
  },
  {
    kana: "ザ",
    romaji: "za",
    category: "dakuon",
    group: "Z-Row",
    examples: [{ japanese: "サラダ (さらだ)", romaji: "sarada", english: "Salad (contains ザ)" }]
  },
  {
    kana: "ジ",
    romaji: "ji",
    category: "dakuon",
    group: "Z-Row",
    examples: [{ japanese: "ビジネス (びじねす)", romaji: "bijinesu", english: "Business" }]
  },
  {
    kana: "ズ",
    romaji: "zu",
    category: "dakuon",
    group: "Z-Row",
    examples: [{ japanese: "ズボン (ずぼん)", romaji: "zubon", english: "Trousers" }]
  },
  {
    kana: "ゼ",
    romaji: "ze",
    category: "dakuon",
    group: "Z-Row",
    examples: [{ japanese: "ゼロ (ぜろ)", romaji: "zero", english: "Zero" }]
  },
  {
    kana: "ゾ",
    romaji: "zo",
    category: "dakuon",
    group: "Z-Row",
    examples: [{ japanese: "ゾンビ (ぞんび)", romaji: "zonbi", english: "Zombie" }]
  },
  {
    kana: "ダ",
    romaji: "da",
    category: "dakuon",
    group: "D-Row",
    examples: [{ japanese: "ダブル (だぶる)", romaji: "daburu", english: "Double" }]
  },
  {
    kana: "ヂ",
    romaji: "ji",
    category: "dakuon",
    group: "D-Row",
    examples: [{ japanese: "ヂヤンボ (じゃんぼ)", romaji: "jambo", english: "Jumbo (rare historical spell)" }]
  },
  {
    kana: "ヅ",
    romaji: "zu",
    category: "dakuon",
    group: "D-Row",
    examples: [{ japanese: "カヅツ (かづつ)", romaji: "kadutsu", english: "Compound spelling example" }]
  },
  {
    kana: "デ",
    romaji: "de",
    category: "dakuon",
    group: "D-Row",
    examples: [{ japanese: "デパート (でぱーと)", romaji: "depa-to", english: "Department store" }]
  },
  {
    kana: "ド",
    romaji: "do",
    category: "dakuon",
    group: "D-Row",
    examples: [{ japanese: "ドア (どあ)", romaji: "doa", english: "Door" }]
  },
  {
    kana: "バ",
    romaji: "ba",
    category: "dakuon",
    group: "B-Row",
    examples: [{ japanese: "バター (ばたー)", romaji: "bata-", english: "Butter" }]
  },
  {
    kana: "ビ",
    romaji: "bi",
    category: "dakuon",
    group: "B-Row",
    examples: [{ japanese: "ビール (びーる)", romaji: "bi-ru", english: "Beer" }]
  },
  {
    kana: "ブ",
    romaji: "bu",
    category: "dakuon",
    group: "B-Row",
    examples: [{ japanese: "ブラウス (ぶらうす)", romaji: "burausu", english: "Blouse" }]
  },
  {
    kana: "ベ",
    romaji: "be",
    category: "dakuon",
    group: "B-Row",
    examples: [{ japanese: "ベッド (べっど)", romaji: "beddo", english: "Bed" }]
  },
  {
    kana: "ボ",
    romaji: "bo",
    category: "dakuon",
    group: "B-Row",
    examples: [{ japanese: "ボタン (ぼたん)", romaji: "botan", english: "Button" }]
  },

  // HANDAKUON
  {
    kana: "パ",
    romaji: "pa",
    category: "handakuon",
    group: "P-Row",
    examples: [{ japanese: "パン (ぱん)", romaji: "pan", english: "Bread (Katakana standard)" }]
  },
  {
    kana: "ピ",
    romaji: "pi",
    category: "handakuon",
    group: "P-Row",
    examples: [{ japanese: "ピアノ (ぴあの)", romaji: "piano", english: "Piano" }]
  },
  {
    kana: "プ",
    romaji: "pu",
    category: "handakuon",
    group: "P-Row",
    examples: [{ japanese: "プール (ぷーる)", romaji: "pu-ru", english: "Swimming pool" }]
  },
  {
    kana: "ペ",
    romaji: "pe",
    category: "handakuon",
    group: "P-Row",
    examples: [{ japanese: "ペン (ぺん)", romaji: "pen", english: "Pen" }]
  },
  {
    kana: "ポ",
    romaji: "po",
    category: "handakuon",
    group: "P-Row",
    examples: [{ japanese: "ポケット (ぽけっと)", romaji: "poketto", english: "Pocket" }]
  },

  // YOON
  {
    kana: "キャ",
    romaji: "kya",
    category: "yoon",
    group: "Ky-Row",
    examples: [{ japanese: "キャベツ (きゃべつ)", romaji: "kyabetsu", english: "Cabbage" }]
  },
  {
    kana: "キュ",
    romaji: "kyu",
    category: "yoon",
    group: "Ky-Row",
    examples: [{ japanese: "キューリ (きゅーり)", romaji: "kyu-ri", english: "Cucumber" }]
  },
  {
    kana: "キョ",
    romaji: "kyo",
    category: "yoon",
    group: "Ky-Row",
    examples: [{ japanese: "キョウト (きょうと)", romaji: "kyouto", english: "Kyoto (Katakana layout)" }]
  },
  {
    kana: "シャ",
    romaji: "sha",
    category: "yoon",
    group: "Sh-Row",
    examples: [{ japanese: "シャツ (しゃつ)", romaji: "shatsu", english: "Shirt" }]
  },
  {
    kana: "シュ",
    romaji: "shu",
    category: "yoon",
    group: "Sh-Row",
    examples: [{ japanese: "シューズ (しゅーず)", romaji: "shu-zu", english: "Shoes" }]
  },
  {
    kana: "ショ",
    romaji: "sho",
    category: "yoon",
    group: "Sh-Row",
    examples: [{ japanese: "ショップ (しょっぷ)", romaji: "shoppu", english: "Shop" }]
  },
  {
    kana: "チャ",
    romaji: "cha",
    category: "yoon",
    group: "Ch-Row",
    examples: [{ japanese: "チャンネル (ちゃんねる)", romaji: "channeru", english: "Channel" }]
  },
  {
    kana: "チュ",
    romaji: "chu",
    category: "yoon",
    group: "Ch-Row",
    examples: [{ japanese: "チューリップ (ちゅーりっぷ)", romaji: "chu-rippu", english: "Tulip" }]
  },
  {
    kana: "チョ",
    romaji: "cho",
    category: "yoon",
    group: "Ch-Row",
    examples: [{ japanese: "チョコ (ちょこ)", romaji: "choko", english: "Chocolate" }]
  },
  {
    kana: "ニャ",
    romaji: "nya",
    category: "yoon",
    group: "Ny-Row",
    examples: [{ japanese: "ニャー (にゃー)", romaji: "nya-", english: "Meow" }]
  },
  {
    kana: "ニュ",
    romaji: "nyu",
    category: "yoon",
    group: "Ny-Row",
    examples: [{ japanese: "ニュース (にゅーす)", romaji: "nyu-su", english: "News" }]
  },
  {
    kana: "ニョ",
    romaji: "nyo",
    category: "yoon",
    group: "Ny-Row",
    examples: [{ japanese: "ニョッキ (にょっき)", romaji: "nyokki", english: "Gnocchi" }]
  },
  {
    kana: "ヒャ",
    romaji: "hya",
    category: "yoon",
    group: "Hy-Row",
    examples: [{ japanese: "ヒヤシンス (ひやしんす)", romaji: "hiyasinsu", english: "Hyacinth (phonetic layout)" }]
  },
  {
    kana: "ヒュ",
    romaji: "hyu",
    category: "yoon",
    group: "Hy-Row",
    examples: [{ japanese: "ヒューマン (ひゅーまん)", romaji: "hyu-man", english: "Human" }]
  },
  {
    kana: "ヒョ",
    romaji: "hyo",
    category: "yoon",
    group: "Hy-Row",
    examples: [{ japanese: "ヒョウ柄 (ひょうがら)", romaji: "hyougara", english: "Leopard Print" }]
  },
  {
    kana: "ミャ",
    romaji: "mya",
    category: "yoon",
    group: "My-Row",
    examples: [{ japanese: "ミャンマー (みゃんまー)", romaji: "myanma-", english: "Myanmar" }]
  },
  {
    kana: "ミュ",
    romaji: "myu",
    category: "yoon",
    group: "My-Row",
    examples: [{ japanese: "ミュージアム (みゅーじあむ)", romaji: "myu-ziamu", english: "Museum" }]
  },
  {
    kana: "ミョ",
    romaji: "myo",
    category: "yoon",
    group: "My-Row",
    examples: [{ japanese: "ミョウガ (みょうが)", romaji: "myouga", english: "Japanese Ginger" }]
  },
  {
    kana: "リャ",
    romaji: "rya",
    category: "yoon",
    group: "Ry-Row",
    examples: [{ japanese: "リャマ (りゃま)", romaji: "ryama", english: "Llama" }]
  },
  {
    kana: "リュ",
    romaji: "ryu",
    category: "yoon",
    group: "Ry-Row",
    examples: [{ japanese: "リュックサック (りゅっくさっく)", romaji: "ryukkusakku", english: "Backpack / Rucksack" }]
  },
  {
    kana: "リョ",
    romaji: "ryo",
    category: "yoon",
    group: "Ry-Row",
    examples: [{ japanese: "リョーカン (りょーかん)", romaji: "ryo-kan", english: "Ryokan (Inn)" }]
  },
  {
    kana: "ギャ",
    romaji: "gya",
    category: "yoon",
    group: "Gy-Row",
    examples: [{ japanese: "ギャラリー (ぎゃらりー)", romaji: "gyarari-", english: "Gallery" }]
  },
  {
    kana: "ギュ",
    romaji: "gyu",
    category: "yoon",
    group: "Gy-Row",
    examples: [{ japanese: "ギュウニュウ (ぎゅうにゅう)", romaji: "gyuunyuu", english: "Milk (Katakana label)" }]
  },
  {
    kana: "ギョ",
    romaji: "gyo",
    category: "yoon",
    group: "Gy-Row",
    examples: [{ japanese: "ギョーザ (ぎょーざ)", romaji: "gyo-za", english: "Gyoza" }]
  },
  {
    kana: "ジャ",
    romaji: "ja",
    category: "yoon",
    group: "J-Row",
    examples: [{ japanese: "ジャケット (じゃけっと)", romaji: "jaketto", english: "Jacket" }]
  },
  {
    kana: "ジュ",
    romaji: "ju",
    category: "yoon",
    group: "J-Row",
    examples: [{ japanese: "ジュース (じゅーす)", romaji: "ju-su", english: "Juice" }]
  },
  {
    kana: "ジョ",
    romaji: "jo",
    category: "yoon",
    group: "J-Row",
    examples: [{ japanese: "ジョギング (じょぎんぐ)", romaji: "jogingu", english: "Jogging" }]
  },
  {
    kana: "ビャ",
    romaji: "bya",
    category: "yoon",
    group: "By-Row",
    examples: [{ japanese: "ビャクダン (びゃくだん)", romaji: "byakudan", english: "Sandalwood" }]
  },
  {
    kana: "ビュ",
    romaji: "byu",
    category: "yoon",
    group: "By-Row",
    examples: [{ japanese: "ビュッフェ (びゅっふぇ)", romaji: "byuffe", english: "Buffet" }]
  },
  {
    kana: "ビョ",
    romaji: "byo",
    category: "yoon",
    group: "By-Row",
    examples: [{ japanese: "ビョウイン (びょういん)", romaji: "byouin", english: "Hospital (Katakana label)" }]
  },
  {
    kana: "ピャ",
    romaji: "pya",
    category: "yoon",
    group: "Py-Row",
    examples: [{ japanese: "ピャノ (ぴゃの)", romaji: "pyano", english: "Piano (colloquial spelling)" }]
  },
  {
    kana: "ピュ",
    romaji: "pyu",
    category: "yoon",
    group: "Py-Row",
    examples: [{ japanese: "ピューマ (ぴゅーま)", romaji: "pyu-ma", english: "Puma" }]
  },
  {
    kana: "ピョ",
    romaji: "pyo",
    category: "yoon",
    group: "Py-Row",
    examples: [{ japanese: "ピョートル (ぴょーとる)", romaji: "pyo-toru", english: "Pyotr" }]
  }
];

