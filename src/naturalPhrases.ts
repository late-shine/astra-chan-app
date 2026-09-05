export type PhraseRegister = "Casual" | "Polite" | "Neutral" | "Slang";

export interface NaturalPhrase {
  japanese: string;
  romaji: string;
  meaning: string;
  register: PhraseRegister;
  category: string;
  usage: string;
  caution?: string;
  dialogue?: string;
  dialogueMeaning?: string;
}

export const NATURAL_PHRASES: NaturalPhrase[] = [
  { japanese: "うん", romaji: "un", meaning: "Yeah / uh-huh", register: "Casual", category: "Acknowledgment", usage: "A relaxed yes or acknowledgment with friends and family.", dialogue: "A: 明日、来る？  B: うん、行くよ。", dialogueMeaning: "A: Are you coming tomorrow?  B: Yeah, I am." },
  { japanese: "そうそう", romaji: "sō sō", meaning: "Exactly / that's right", register: "Casual", category: "Acknowledgment", usage: "Agreeing enthusiastically when someone says what you were thinking." },
  { japanese: "なるほど", romaji: "naruhodo", meaning: "I see / that makes sense", register: "Neutral", category: "Acknowledgment", usage: "Shows that you understand new information.", dialogue: "A: この店は月曜日が休みです。  B: なるほど。", dialogueMeaning: "A: This shop is closed on Mondays.  B: I see." },
  { japanese: "そっか", romaji: "sokka", meaning: "Oh, I see", register: "Casual", category: "Acknowledgment", usage: "A casual response to something you have just learned." },
  { japanese: "そうですね", romaji: "sō desu ne", meaning: "Yes, that's right / let me see", register: "Polite", category: "Acknowledgment", usage: "A polite way to agree or take a moment to think." },
  { japanese: "はい", romaji: "hai", meaning: "Yes / understood", register: "Polite", category: "Acknowledgment", usage: "The standard polite yes; also used to show you are listening." },
  { japanese: "どうしよう？", romaji: "dō shiyō?", meaning: "What should I do? / Oh no", register: "Casual", category: "Reactions", usage: "Used when worried, stuck, or unsure what to do next.", dialogue: "A: 財布がない！どうしよう？  B: いっしょに探そう。", dialogueMeaning: "A: My wallet is gone! What should I do?  B: Let's look for it together." },
  { japanese: "え、ほんと？", romaji: "e, honto?", meaning: "Huh, really?", register: "Casual", category: "Reactions", usage: "A very common surprised reaction among friends.", dialogue: "A: 来週、東京に行くよ。  B: え、ほんと？", dialogueMeaning: "A: I'm going to Tokyo next week.  B: Huh, really?" },
  { japanese: "本当ですか？", romaji: "hontō desu ka?", meaning: "Is that really true?", register: "Polite", category: "Reactions", usage: "The polite version of え、ほんと？." },
  { japanese: "まじで？", romaji: "maji de?", meaning: "Seriously? / for real?", register: "Slang", category: "Reactions", usage: "Strong casual surprise; common in conversation but too informal for formal situations.", caution: "Avoid with teachers, customers, or in professional settings." },
  { japanese: "すごい！", romaji: "sugoi!", meaning: "Amazing! / wow!", register: "Casual", category: "Reactions", usage: "A flexible reaction to something impressive, surprising, or intense." },
  { japanese: "やばい", romaji: "yabai", meaning: "Oh no / crazy / awesome", register: "Slang", category: "Reactions", usage: "Context changes the meaning: it can describe something bad, dangerous, or surprisingly good.", caution: "This is slang; listen for context before using it.", dialogue: "A: テスト、明日だよ。  B: やばい、全然勉強してない！", dialogueMeaning: "A: The test is tomorrow.  B: Oh no, I haven't studied at all!" },
  { japanese: "めっちゃ", romaji: "meccha", meaning: "Super / really / very", register: "Slang", category: "Reactions", usage: "An informal intensifier, especially common in casual speech." },
  { japanese: "びっくりした！", romaji: "bikkuri shita!", meaning: "That surprised me!", register: "Casual", category: "Reactions", usage: "Said after being startled or hearing unexpected news." },
  { japanese: "よかった！", romaji: "yokatta!", meaning: "That's good! / what a relief!", register: "Casual", category: "Reactions", usage: "Expresses happiness or relief about an outcome." },
  { japanese: "おつかれ！", romaji: "otsukare!", meaning: "Good work! / see you", register: "Casual", category: "Greetings", usage: "A warm greeting or farewell among classmates, coworkers, and friends.", dialogue: "A: 今日の仕事、終わった！  B: おつかれ！", dialogueMeaning: "A: I finished today's work!  B: Good work!" },
  { japanese: "お疲れさまです", romaji: "otsukaresama desu", meaning: "Good work / thank you for your effort", register: "Polite", category: "Greetings", usage: "The polite workplace and school version of おつかれ！." },
  { japanese: "おはよう", romaji: "ohayō", meaning: "Morning / good morning", register: "Casual", category: "Greetings", usage: "Casual morning greeting; おはようございます is the polite form." },
  { japanese: "おはようございます", romaji: "ohayō gozaimasu", meaning: "Good morning", register: "Polite", category: "Greetings", usage: "Polite morning greeting, including at work or school." },
  { japanese: "またね", romaji: "mata ne", meaning: "See you", register: "Casual", category: "Greetings", usage: "Friendly farewell when you expect to meet again." },
  { japanese: "じゃあね", romaji: "jā ne", meaning: "See you / bye", register: "Casual", category: "Greetings", usage: "An everyday casual goodbye." },
  { japanese: "よろしくお願いします", romaji: "yoroshiku onegaishimasu", meaning: "Nice to work with you / please treat me well", register: "Polite", category: "Greetings", usage: "Used after introductions, requests, or starting a relationship." },
  { japanese: "ありがとう", romaji: "arigatō", meaning: "Thanks", register: "Casual", category: "Thanks & Apologies", usage: "Friendly thanks; ありがとうね adds a warm, personal tone." },
  { japanese: "ありがとうございます", romaji: "arigatō gozaimasu", meaning: "Thank you", register: "Polite", category: "Thanks & Apologies", usage: "Standard polite thanks for present help or kindness." },
  { japanese: "ごめん", romaji: "gomen", meaning: "Sorry", register: "Casual", category: "Thanks & Apologies", usage: "A quick apology to someone you are close to." },
  { japanese: "ごめんなさい", romaji: "gomennasai", meaning: "I'm sorry", register: "Neutral", category: "Thanks & Apologies", usage: "A more serious or sincere apology than ごめん." },
  { japanese: "すみません", romaji: "sumimasen", meaning: "Excuse me / I'm sorry / thank you", register: "Polite", category: "Thanks & Apologies", usage: "A versatile polite phrase for apologies, getting attention, or acknowledging a favor.", dialogue: "すみません、駅はどこですか？", dialogueMeaning: "Excuse me, where is the station?" },
  { japanese: "気にしないで", romaji: "ki ni shinaide", meaning: "Don't worry about it", register: "Casual", category: "Thanks & Apologies", usage: "Reassures a friend after they apologize." },
  { japanese: "大丈夫です", romaji: "daijōbu desu", meaning: "It's okay / I'm fine / no thank you", register: "Polite", category: "Thanks & Apologies", usage: "Meaning depends on context and intonation: reassurance, condition, or a gentle refusal.", dialogue: "A: 手伝いましょうか？  B: ありがとうございます。でも、大丈夫です。", dialogueMeaning: "A: Shall I help you?  B: Thank you, but I'm okay." },
  { japanese: "ちょっと待って", romaji: "chotto matte", meaning: "Wait a moment", register: "Casual", category: "Everyday", usage: "Ask a friend to pause briefly; add ください for a polite request." },
  { japanese: "ちょっと待ってください", romaji: "chotto matte kudasai", meaning: "Please wait a moment", register: "Polite", category: "Everyday", usage: "A standard polite request to wait." },
  { japanese: "わからない", romaji: "wakaranai", meaning: "I don't know / I don't understand", register: "Casual", category: "Everyday", usage: "Casual way to say something is unclear to you." },
  { japanese: "わかりません", romaji: "wakarimasen", meaning: "I don't know / I don't understand", register: "Polite", category: "Everyday", usage: "Polite version, useful in class or when speaking with strangers." },
  { japanese: "ちょっと…", romaji: "chotto...", meaning: "A little... / that's difficult", register: "Neutral", category: "Everyday", usage: "A soft, indirect way to hesitate or decline without saying no directly.", caution: "The unfinished phrase often communicates a polite refusal.", dialogue: "A: 今夜、飲みに行かない？  B: 今日はちょっと…", dialogueMeaning: "A: Want to go out for drinks tonight?  B: Tonight is a little difficult..." },
  { japanese: "いいよ", romaji: "ii yo", meaning: "Sure / it's okay", register: "Casual", category: "Everyday", usage: "Accepts a suggestion or reassures a friend." },
  { japanese: "いいですね", romaji: "ii desu ne", meaning: "That sounds good", register: "Polite", category: "Everyday", usage: "Polite agreement or positive response to an idea." },
  { japanese: "どういう意味？", romaji: "dō iu imi?", meaning: "What does that mean?", register: "Casual", category: "Questions", usage: "Ask a friend to explain a word or statement." },
  { japanese: "どういう意味ですか？", romaji: "dō iu imi desu ka?", meaning: "What does that mean?", register: "Polite", category: "Questions", usage: "Polite version for class or unfamiliar people." },
  { japanese: "頑張って！", romaji: "ganbatte!", meaning: "Do your best! / good luck!", register: "Casual", category: "Support", usage: "Encouragement before an exam, event, or difficult task.", dialogue: "A: 明日、試験です。  B: 頑張って！", dialogueMeaning: "A: I have an exam tomorrow.  B: Good luck!" },
  { japanese: "無理しないで", romaji: "muri shinaide", meaning: "Don't push yourself", register: "Casual", category: "Support", usage: "Caring reminder to rest or avoid overdoing things." },
  { japanese: "気をつけて", romaji: "ki o tsukete", meaning: "Take care / be careful", register: "Casual", category: "Support", usage: "Said when someone is leaving or entering a potentially risky situation." },
  { japanese: "楽しみ！", romaji: "tanoshimi!", meaning: "I'm looking forward to it!", register: "Casual", category: "Feelings", usage: "Shows excited anticipation about a future event." },
  { japanese: "楽しみにしています", romaji: "tanoshimi ni shiteimasu", meaning: "I look forward to it", register: "Polite", category: "Feelings", usage: "Polite version for messages, plans, and professional contexts." },
  { japanese: "そうなんだ", romaji: "sō nan da", meaning: "Oh, really? / I see", register: "Casual", category: "Acknowledgment", usage: "A casual response that shows interest in new information." },
  { japanese: "それな", romaji: "sore na", meaning: "Exactly / right?", register: "Slang", category: "Acknowledgment", usage: "Very casual internet and youth slang for strong agreement.", caution: "Use only with close friends and people who use casual slang." },
  { japanese: "わくわくする", romaji: "waku-waku suru", meaning: "I'm excited", register: "Casual", category: "Feelings", usage: "Describes happy anticipation about something coming up." },
  { japanese: "楽しそう！", romaji: "tanoshisō!", meaning: "That looks fun!", register: "Casual", category: "Feelings", usage: "React to someone's plan or an activity that appears enjoyable." },
  { japanese: "たしかに", romaji: "tashika ni", meaning: "Indeed / that's true", register: "Neutral", category: "Acknowledgment", usage: "Agree with an observation after considering it." },
  { japanese: "お先に失礼します", romaji: "osaki ni shitsurei shimasu", meaning: "Excuse me for leaving before you", register: "Polite", category: "Greetings", usage: "Said when leaving work or a group before others." },
  { japanese: "いただきます", romaji: "itadakimasu", meaning: "Let's eat / thank you for the food", register: "Neutral", category: "Daily Life", usage: "Said before eating to express gratitude for the food." },
  { japanese: "ごちそうさまでした", romaji: "gochisōsama deshita", meaning: "Thank you for the meal", register: "Polite", category: "Daily Life", usage: "Said after eating, especially when someone prepared or paid for the meal." },
  { japanese: "お腹すいた", romaji: "onaka suita", meaning: "I'm hungry", register: "Casual", category: "Daily Life", usage: "Everyday casual expression used when you want to eat." },
  { japanese: "眠い", romaji: "nemui", meaning: "I'm sleepy", register: "Casual", category: "Daily Life", usage: "Simple everyday comment about feeling tired or ready to sleep." },
];

export const PHRASE_CATEGORIES = ["All", ...Array.from(new Set(NATURAL_PHRASES.map((phrase) => phrase.category)))];
