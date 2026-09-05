export type PhraseRegister = "Casual" | "Polite" | "Neutral" | "Slang";

export interface NaturalPhrase {
  japanese: string;
  romaji: string;
  meaning: string;
  register: PhraseRegister;
  category: string;
  usage: string;
  caution?: string;
}

export const NATURAL_PHRASES: NaturalPhrase[] = [
  { japanese: "うん", romaji: "un", meaning: "Yeah / uh-huh", register: "Casual", category: "Acknowledgment", usage: "A relaxed yes or acknowledgment with friends and family." },
  { japanese: "そうそう", romaji: "sō sō", meaning: "Exactly / that's right", register: "Casual", category: "Acknowledgment", usage: "Agreeing enthusiastically when someone says what you were thinking." },
  { japanese: "なるほど", romaji: "naruhodo", meaning: "I see / that makes sense", register: "Neutral", category: "Acknowledgment", usage: "Shows that you understand new information." },
  { japanese: "そっか", romaji: "sokka", meaning: "Oh, I see", register: "Casual", category: "Acknowledgment", usage: "A casual response to something you have just learned." },
  { japanese: "そうですね", romaji: "sō desu ne", meaning: "Yes, that's right / let me see", register: "Polite", category: "Acknowledgment", usage: "A polite way to agree or take a moment to think." },
  { japanese: "はい", romaji: "hai", meaning: "Yes / understood", register: "Polite", category: "Acknowledgment", usage: "The standard polite yes; also used to show you are listening." },
  { japanese: "どうしよう？", romaji: "dō shiyō?", meaning: "What should I do? / Oh no", register: "Casual", category: "Reactions", usage: "Used when worried, stuck, or unsure what to do next." },
  { japanese: "え、ほんと？", romaji: "e, honto?", meaning: "Huh, really?", register: "Casual", category: "Reactions", usage: "A very common surprised reaction among friends." },
  { japanese: "本当ですか？", romaji: "hontō desu ka?", meaning: "Is that really true?", register: "Polite", category: "Reactions", usage: "The polite version of え、ほんと？." },
  { japanese: "まじで？", romaji: "maji de?", meaning: "Seriously? / for real?", register: "Slang", category: "Reactions", usage: "Strong casual surprise; common in conversation but too informal for formal situations.", caution: "Avoid with teachers, customers, or in professional settings." },
  { japanese: "すごい！", romaji: "sugoi!", meaning: "Amazing! / wow!", register: "Casual", category: "Reactions", usage: "A flexible reaction to something impressive, surprising, or intense." },
  { japanese: "やばい", romaji: "yabai", meaning: "Oh no / crazy / awesome", register: "Slang", category: "Reactions", usage: "Context changes the meaning: it can describe something bad, dangerous, or surprisingly good.", caution: "This is slang; listen for context before using it." },
  { japanese: "めっちゃ", romaji: "meccha", meaning: "Super / really / very", register: "Slang", category: "Reactions", usage: "An informal intensifier, especially common in casual speech." },
  { japanese: "びっくりした！", romaji: "bikkuri shita!", meaning: "That surprised me!", register: "Casual", category: "Reactions", usage: "Said after being startled or hearing unexpected news." },
  { japanese: "よかった！", romaji: "yokatta!", meaning: "That's good! / what a relief!", register: "Casual", category: "Reactions", usage: "Expresses happiness or relief about an outcome." },
  { japanese: "おつかれ！", romaji: "otsukare!", meaning: "Good work! / see you", register: "Casual", category: "Greetings", usage: "A warm greeting or farewell among classmates, coworkers, and friends." },
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
  { japanese: "すみません", romaji: "sumimasen", meaning: "Excuse me / I'm sorry / thank you", register: "Polite", category: "Thanks & Apologies", usage: "A versatile polite phrase for apologies, getting attention, or acknowledging a favor." },
  { japanese: "気にしないで", romaji: "ki ni shinaide", meaning: "Don't worry about it", register: "Casual", category: "Thanks & Apologies", usage: "Reassures a friend after they apologize." },
  { japanese: "大丈夫です", romaji: "daijōbu desu", meaning: "It's okay / I'm fine / no thank you", register: "Polite", category: "Thanks & Apologies", usage: "Meaning depends on context and intonation: reassurance, condition, or a gentle refusal." },
  { japanese: "ちょっと待って", romaji: "chotto matte", meaning: "Wait a moment", register: "Casual", category: "Everyday", usage: "Ask a friend to pause briefly; add ください for a polite request." },
  { japanese: "ちょっと待ってください", romaji: "chotto matte kudasai", meaning: "Please wait a moment", register: "Polite", category: "Everyday", usage: "A standard polite request to wait." },
  { japanese: "わからない", romaji: "wakaranai", meaning: "I don't know / I don't understand", register: "Casual", category: "Everyday", usage: "Casual way to say something is unclear to you." },
  { japanese: "わかりません", romaji: "wakarimasen", meaning: "I don't know / I don't understand", register: "Polite", category: "Everyday", usage: "Polite version, useful in class or when speaking with strangers." },
  { japanese: "ちょっと…", romaji: "chotto...", meaning: "A little... / that's difficult", register: "Neutral", category: "Everyday", usage: "A soft, indirect way to hesitate or decline without saying no directly.", caution: "The unfinished phrase often communicates a polite refusal." },
  { japanese: "いいよ", romaji: "ii yo", meaning: "Sure / it's okay", register: "Casual", category: "Everyday", usage: "Accepts a suggestion or reassures a friend." },
  { japanese: "いいですね", romaji: "ii desu ne", meaning: "That sounds good", register: "Polite", category: "Everyday", usage: "Polite agreement or positive response to an idea." },
  { japanese: "どういう意味？", romaji: "dō iu imi?", meaning: "What does that mean?", register: "Casual", category: "Questions", usage: "Ask a friend to explain a word or statement." },
  { japanese: "どういう意味ですか？", romaji: "dō iu imi desu ka?", meaning: "What does that mean?", register: "Polite", category: "Questions", usage: "Polite version for class or unfamiliar people." },
  { japanese: "頑張って！", romaji: "ganbatte!", meaning: "Do your best! / good luck!", register: "Casual", category: "Support", usage: "Encouragement before an exam, event, or difficult task." },
  { japanese: "無理しないで", romaji: "muri shinaide", meaning: "Don't push yourself", register: "Casual", category: "Support", usage: "Caring reminder to rest or avoid overdoing things." },
  { japanese: "気をつけて", romaji: "ki o tsukete", meaning: "Take care / be careful", register: "Casual", category: "Support", usage: "Said when someone is leaving or entering a potentially risky situation." },
  { japanese: "楽しみ！", romaji: "tanoshimi!", meaning: "I'm looking forward to it!", register: "Casual", category: "Feelings", usage: "Shows excited anticipation about a future event." },
  { japanese: "楽しみにしています", romaji: "tanoshimi ni shiteimasu", meaning: "I look forward to it", register: "Polite", category: "Feelings", usage: "Polite version for messages, plans, and professional contexts." },
];

export const PHRASE_CATEGORIES = ["All", ...Array.from(new Set(NATURAL_PHRASES.map((phrase) => phrase.category)))];
