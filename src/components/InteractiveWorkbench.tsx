import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Volume2, 
  HelpCircle, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  Info, 
  Calendar, 
  BookOpen, 
  Settings, 
  Sliders, 
  Play, 
  X,
  ArrowRight,
  AlertCircle
} from "lucide-react";

// ─── Speak Helper ─────────────────────────────────────────────────────────────

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const jpVoice = voices.find((v) => v.lang.startsWith("ja"));
  if (jpVoice) u.voice = jpVoice;
  window.speechSynthesis.speak(u);
}

// ─── Number & Counter Helper Logic ─────────────────────────────────────────────

const COUNTERS_LIST = [
  { char: "本", kana: "ほん", name: "Cylindrical (本)", desc: "Pens, bottles, long umbrellas, trees", icon: "🥖" },
  { char: "匹", kana: "ひき", name: "Small Animals (匹)", desc: "Cats, dogs, fish, insects, frogs", icon: "🐈" },
  { char: "枚", kana: "まい", name: "Flat Objects (枚)", desc: "Paper, shirts, plates, tickets", icon: "📄" },
  { char: "冊", kana: "さつ", name: "Bound Volumes (冊)", desc: "Books, notebooks, dictionaries", icon: "📚" },
  { char: "人", kana: "にん", name: "People (人)", desc: "Friends, students, family", icon: "👤" },
  { char: "歳", kana: "さい", name: "Age (歳)", desc: "Years old (Age of humans/animals)", icon: "🎂" },
  { char: "階", kana: "かい", name: "Building Floors (階)", desc: "Levels, stories of a building", icon: "🏢" },
  { char: "つ", kana: "つ", name: "General Objects (つ)", desc: "Items of indefinite shape (up to 10)", icon: "📦" },
];

// Sub-arrays for digit conversion
const KANA_ONES = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];
const KANA_TENS = ["", "じゅう", "にじゅう", "さんじゅう", "よんじゅう", "ごじゅう", "ろくじゅう", "ななじゅう", "はちじゅう", "きゅうじゅう"];

function numToBasicKana(n: number): string {
  if (n === 0) return "れい";
  let parts: string[] = [];

  // Thousands
  const thousands = Math.floor(n / 1000);
  if (thousands === 1) parts.push("せん");
  else if (thousands === 3) parts.push("さんぜん");
  else if (thousands === 8) parts.push("はっせん");
  else if (thousands > 1) parts.push(KANA_ONES[thousands] + "せん");

  // Hundreds
  const remainder1000 = n % 1000;
  const hundreds = Math.floor(remainder1000 / 100);
  if (hundreds === 1) parts.push("ひゃく");
  else if (hundreds === 3) parts.push("さんびゃく");
  else if (hundreds === 6) parts.push("ろっぴゃく");
  else if (hundreds === 8) parts.push("はっぴゃく");
  else if (hundreds > 1) parts.push(KANA_ONES[hundreds] + "ひゃく");

  // Tens
  const remainder100 = remainder1000 % 100;
  const tens = Math.floor(remainder100 / 10);
  if (tens === 1) parts.push("じゅう");
  else if (tens > 1) parts.push(KANA_ONES[tens] + "じゅう");

  // Ones
  const ones = remainder100 % 10;
  if (ones > 0) {
    parts.push(KANA_ONES[ones]);
  }

  return parts.join("");
}

interface CounterResult {
  kanji: string;
  reading: string;
  romaji: string;
  type: "normal" | "euphonic" | "irregular";
  explanation: string;
}

function computeCounter(num: number, counter: string): CounterResult {
  if (num < 1 || num > 9999) {
    return {
      kanji: `${num}${counter}`,
      reading: "エラー",
      romaji: "eraa",
      type: "normal",
      explanation: "Please enter a value between 1 and 9999."
    };
  }

  // 1. General native "つ" counter
  if (counter === "つ") {
    if (num <= 10) {
      const readings = ["", "ひとつ", "ふたつ", "みっつ", "よっつ", "いつつ", "むっつ", "ななつ", "やっつ", "ここのつ", "とお"];
      const romajis = ["", "hitotsu", "futatsu", "mittsu", "yottsu", "itsutsu", "muttsu", "nanatsu", "yattsu", "kokonotsu", "too"];
      return {
        kanji: num === 10 ? "十" : `${num}つ`,
        reading: readings[num],
        romaji: romajis[num],
        type: "irregular",
        explanation: `General NATIVE Japanese count. This series is fully irregular and caps at 10. For quantities above 10, use the "個 (こ)" counter!`
      };
    } else {
      const basic = numToBasicKana(num);
      return {
        kanji: `${num}`,
        reading: basic,
        romaji: "juuichi...",
        type: "normal",
        explanation: `Above 10, general counts drop the "つ" suffix entirely. Use standard numbers (e.g., ${num} is read as "${basic}") or switch to the "個 (こ)" classifier.`
      };
    }
  }

  // 2. People "人" counter
  if (counter === "人") {
    if (num === 1) {
      return { kanji: "1人", reading: "ひとり", romaji: "hitori", type: "irregular", explanation: "Highly irregular ancient native Japanese reading. Essential for daily life." };
    }
    if (num === 2) {
      return { kanji: "2人", reading: "ふたり", romaji: "futari", type: "irregular", explanation: "Highly irregular native Japanese reading. Essential for daily life." };
    }
    
    const lastDigit = num % 10;
    const lastTwo = num % 100;
    
    if (lastDigit === 4 && lastTwo !== 14 && lastTwo !== 24 && lastTwo !== 34 && lastTwo !== 44 && lastTwo !== 54 && lastTwo !== 64 && lastTwo !== 74 && lastTwo !== 84 && lastTwo !== 94) {
      // Single digit 4, or simple ending
      const prefix = num > 10 ? numToBasicKana(Math.floor(num / 10) * 10) : "";
      return {
        kanji: `${num}人`,
        reading: `${prefix}よにん`,
        romaji: "yonin",
        type: "irregular",
        explanation: `The digit 4 takes "よにん" (yonin) instead of "よんにん" (yonnin) or "しにん" (shinin) to avoid phonetic awkwardness.`
      };
    }

    // Handles complex endings like 14, 24, etc.
    if (lastDigit === 4) {
      const prefix = numToBasicKana(Math.floor(num / 10) * 10);
      return {
        kanji: `${num}人`,
        reading: `${prefix}よにん`,
        romaji: "yonin",
        type: "irregular",
        explanation: `Takes "よにん" ending (e.g., ${num} is read as "${prefix}よにん").`
      };
    }

    const basic = numToBasicKana(num);
    return {
      kanji: `${num}人`,
      reading: `${basic}にん`,
      romaji: "nin",
      type: "normal",
      explanation: "Standard Chinese number format ending in -にん."
    };
  }

  // 3. Age "歳" counter
  if (counter === "歳") {
    if (num === 20) {
      return {
        kanji: "20歳",
        reading: "はたち",
        romaji: "hatachi",
        type: "irregular",
        explanation: "Beautiful ancient Japanese custom. Reaching 20 marks official adulthood, commemorated with this special word instead of 'にじゅうさい'."
      };
    }
    
    const lastDigit = num % 10;
    const prefix = num > 10 ? numToBasicKana(Math.floor(num / 10) * 10) : "";
    
    if (lastDigit === 1) {
      return {
        kanji: `${num}歳`,
        reading: `${prefix}いっさい`,
        romaji: "issai",
        type: "euphonic",
        explanation: "Sound shift: 'いちさい' compresses into double-consonant 'いっさい' (issai) for crisp pronunciation."
      };
    }
    if (lastDigit === 8) {
      return {
        kanji: `${num}歳`,
        reading: `${prefix}はっさい`,
        romaji: "hassai",
        type: "euphonic",
        explanation: "Sound shift: 'はちさい' compresses into 'はっさい' (hassai)."
      };
    }
    if (lastDigit === 0 && num % 100 !== 0) { // e.g. 10, 30, 40...
      return {
        kanji: `${num}歳`,
        reading: `${prefix}じゅっさい`,
        romaji: "jussai",
        type: "euphonic",
        explanation: "Sound shift: multiples of 10 compress into double consonant stop 'じゅっさい'."
      };
    }

    const basic = numToBasicKana(num);
    return {
      kanji: `${num}歳`,
      reading: `${basic}さい`,
      romaji: "sai",
      type: "normal",
      explanation: "Regular suffix combining standard number with -さい."
    };
  }

  // 4. Bound volumes "冊" counter
  if (counter === "冊") {
    const lastDigit = num % 10;
    const prefix = num > 10 ? numToBasicKana(Math.floor(num / 10) * 10) : "";
    
    if (lastDigit === 1) {
      return {
        kanji: `${num}冊`,
        reading: `${prefix}いっさつ`,
        romaji: "issatsu",
        type: "euphonic",
        explanation: "Sound shift: 'いちさつ' becomes double-consonant stop 'いっさつ'."
      };
    }
    if (lastDigit === 8) {
      return {
        kanji: `${num}冊`,
        reading: `${prefix}はっさつ`,
        romaji: "hassatsu",
        type: "euphonic",
        explanation: "Sound shift: 'はちさつ' becomes 'はっさつ'."
      };
    }
    if (lastDigit === 0 && num % 100 !== 0) {
      return {
        kanji: `${num}冊`,
        reading: `${prefix}じゅっさつ`,
        romaji: "jussatsu",
        type: "euphonic",
        explanation: "Sound shift: ends in double-consonant stop 'じゅっさつ'."
      };
    }

    const basic = numToBasicKana(num);
    return {
      kanji: `${num}冊`,
      reading: `${basic}さつ`,
      romaji: "satsu",
      type: "normal",
      explanation: "Regular suffix combining standard number with -さつ."
    };
  }

  // 5. Flat objects "枚" counter
  if (counter === "枚") {
    const basic = numToBasicKana(num);
    return {
      kanji: `${num}枚`,
      reading: `${basic}まい`,
      romaji: "mai",
      type: "normal",
      explanation: "Perfectly regular! The '枚 (まい)' counter is extremely easy because there are ZERO sound changes, regardless of the number."
    };
  }

  // 6. Cylindrical objects "本" counter
  if (counter === "本") {
    const lastDigit = num % 10;
    const prefix = num > 10 ? numToBasicKana(Math.floor(num / 10) * 10) : "";
    
    if (lastDigit === 1) {
      return {
        kanji: `${num}本`,
        reading: `${prefix}いっぽん`,
        romaji: "ippon",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: 'いちほん' becomes 'いっぽん' (double stop + p-sound) for fluid speed speech."
      };
    }
    if (lastDigit === 3) {
      return {
        kanji: `${num}本`,
        reading: `${prefix}さんぼん`,
        romaji: "sanbon",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: The consonant softens into a voiced b-sound 'さんぼん' (sanbon) following 'ん'."
      };
    }
    if (lastDigit === 6) {
      return {
        kanji: `${num}本`,
        reading: `${prefix}ろっぽん`,
        romaji: "roppon",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: 'ろくほん' shifts into double stop 'ろっぽん' (roppon)."
      };
    }
    if (lastDigit === 8) {
      return {
        kanji: `${num}本`,
        reading: `${prefix}はっぽん`,
        romaji: "happon",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: 'はちほん' shifts into double stop 'はっぽん' (happon)."
      };
    }
    if (lastDigit === 0 && num % 100 !== 0) {
      return {
        kanji: `${num}本`,
        reading: `${prefix}じゅっぽん`,
        romaji: "juppon",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: Multiples of 10 end with double stop 'じゅっぽん'."
      };
    }

    const basic = numToBasicKana(num);
    return {
      kanji: `${num}本`,
      reading: `${basic}ほん`,
      romaji: "hon",
      type: "normal",
      explanation: "Standard regular form ending in -ほん."
    };
  }

  // 7. Small Animals "匹" counter
  if (counter === "匹") {
    const lastDigit = num % 10;
    const prefix = num > 10 ? numToBasicKana(Math.floor(num / 10) * 10) : "";
    
    if (lastDigit === 1) {
      return {
        kanji: `${num}匹`,
        reading: `${prefix}いっぴき`,
        romaji: "ippiki",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: Shifts to 'いっぴき' (ippiki) with double consonant stop and hard p-sound."
      };
    }
    if (lastDigit === 3) {
      return {
        kanji: `${num}匹`,
        reading: `${prefix}さんびき`,
        romaji: "sanbiki",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: Softens to a voiced b-sound 'さんびき' (sanbiki) following 'ん'."
      };
    }
    if (lastDigit === 6) {
      return {
        kanji: `${num}匹`,
        reading: `${prefix}ろっぴき`,
        romaji: "roppiki",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: Shifts to double stop 'ろっぴき' (roppiki)."
      };
    }
    if (lastDigit === 8) {
      return {
        kanji: `${num}匹`,
        reading: `${prefix}はっぴき`,
        romaji: "happiki",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: Shifts to double stop 'はっぴき' (happiki)."
      };
    }
    if (lastDigit === 0 && num % 100 !== 0) {
      return {
        kanji: `${num}匹`,
        reading: `${prefix}じゅっぴき`,
        romaji: "juppiki",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: Multiples of 10 take double stop 'じゅっぴき'."
      };
    }

    const basic = numToBasicKana(num);
    return {
      kanji: `${num}匹`,
      reading: `${basic}ひき`,
      romaji: "hiki",
      type: "normal",
      explanation: "Standard regular form ending in -ひき."
    };
  }

  // 8. Floors "階" counter
  if (counter === "階") {
    const lastDigit = num % 10;
    const prefix = num > 10 ? numToBasicKana(Math.floor(num / 10) * 10) : "";
    
    if (lastDigit === 1) {
      return {
        kanji: `${num}階`,
        reading: `${prefix}いっかい`,
        romaji: "ikkai",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: 'いちかい' compresses into 'いっかい' (ikkai)."
      };
    }
    if (lastDigit === 3) {
      return {
        kanji: `${num}階`,
        reading: `${prefix}さんがい`,
        romaji: "sangai",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: The k-sound voices into 'が' (g) after the nasal 'ん' to become 'さんがい' (sangai)."
      };
    }
    if (lastDigit === 6) {
      return {
        kanji: `${num}階`,
        reading: `${prefix}ろっかい`,
        romaji: "rokkai",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: 'ろくかい' compresses into 'ろっかい' (rokkai)."
      };
    }
    if (lastDigit === 8) {
      return {
        kanji: `${num}階`,
        reading: `${prefix}はっかい`,
        romaji: "hakkai",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: 'はちかい' compresses into 'はっかい' (hakkai)."
      };
    }
    if (lastDigit === 0 && num % 100 !== 0) {
      return {
        kanji: `${num}階`,
        reading: `${prefix}じゅっかい`,
        romaji: "jukkai",
        type: "euphonic",
        explanation: "⚡ Euphonic Change: Multiples of 10 end with double stop 'じゅっかい'."
      };
    }

    const basic = numToBasicKana(num);
    return {
      kanji: `${num}階`,
      reading: `${basic}かい`,
      romaji: "kai",
      type: "normal",
      explanation: "Standard regular form ending in -かい."
    };
  }

  const basic = numToBasicKana(num);
  return {
    kanji: `${num}${counter}`,
    reading: `${basic}${counter}`,
    romaji: "...",
    type: "normal",
    explanation: "Combined reading."
  };
}

// ─── Verb Conjugation Simulator Logic ──────────────────────────────────────────

interface ConjugationVerb {
  dict: string;
  kana: string;
  meaning: string;
  group: 1 | 2 | 3;
  notes?: string;
}

const CONJUGATION_VERBS: ConjugationVerb[] = [
  { dict: "書く", kana: "かく", meaning: "to write", group: 1, notes: "Godan verb with a standard 'ku' tail." },
  { dict: "飲む", kana: "のむ", meaning: "to drink", group: 1, notes: "Godan verb with a standard 'mu' tail." },
  { dict: "話す", kana: "はなす", meaning: "to speak", group: 1, notes: "Godan verb with a standard 'su' tail." },
  { dict: "待つ", kana: "まつ", meaning: "to wait", group: 1, notes: "Godan verb with an irregular 'tsu' tail." },
  { dict: "行く", kana: "いく", meaning: "to go", group: 1, notes: "Highly irregular て-form/た-form! Uses 'いって' instead of 'いいて'." },
  { dict: "食べる", kana: "たべる", meaning: "to eat", group: 2, notes: "Ichidan verb. Stem ends in 'e' sound before る." },
  { dict: "見る", kana: "みる", meaning: "to see / watch", group: 2, notes: "Ichidan verb. Stem ends in 'i' sound before る." },
  { dict: "帰る", kana: "かえる", meaning: "to return", group: 1, notes: "⚠️ Impostor! Looks like a Group 2, but conjugates as Group 1 (Godan)." },
  { dict: "する", kana: "する", meaning: "to do", group: 3, notes: "Irregular helper verb. Master this!" },
  { dict: "来る", kana: "くる", meaning: "to come", group: 3, notes: "Irregular motion verb. The base kanji reading shifts from 'ku' to 'ki' or 'ko'." },
];

interface FormDefinition {
  id: string;
  name: string;
  meaning: string;
  suffix: string;
}

const CONJUGATION_FORMS: FormDefinition[] = [
  { id: "masu", name: "Polite Present (～ます)", meaning: "Polite, standard present tense statement", suffix: "ます" },
  { id: "nai", name: "Casual Negative (～ない)", meaning: "Casual plain form negative 'will not do'", suffix: "ない" },
  { id: "ta", name: "Casual Past (～た)", meaning: "Casual plain form past tense 'did something'", suffix: "た" },
  { id: "te_kudasai", name: "Polite Request (～てください)", meaning: "Polite request to 'please do this action'", suffix: "てください" },
  { id: "tai", name: "Desire (～たい)", meaning: "Expresses 'want to do' something", suffix: "たい" },
  { id: "potential", name: "Potential (～える / られる)", meaning: "Expresses ability or permission 'can do'", suffix: "" },
];

interface ConjugationStep {
  title: string;
  desc: string;
  code: string;
}

interface ConjugationResult {
  word: string;
  kana: string;
  romaji: string;
  steps: ConjugationStep[];
}

function conjugate(verb: ConjugationVerb, formId: string): ConjugationResult {
  const steps: ConjugationStep[] = [];
  let word = "";
  let kana = "";

  steps.push({
    title: "1. Verb Categorization",
    desc: `Identify the class of verb: "${verb.dict}" is a ${
      verb.group === 1 ? "Group 1 (Godan / 五段)" : verb.group === 2 ? "Group 2 (Ichidan / 一段)" : "Group 3 (Irregular / 不規則)"
    } verb. This determines the rule mathematical logic we must use.`,
    code: `Verb: ${verb.dict} (${verb.kana}) | Class: Group ${verb.group}`
  });

  if (verb.group === 2) {
    // Group 2 (Ichidan) is easy: drop "る"
    const stemKanji = verb.dict.slice(0, -1);
    const stemKana = verb.kana.slice(0, -1);

    steps.push({
      title: "2. Stem Extraction",
      desc: "For Group 2 (Ichidan) verbs, simply drop the final 'る' to isolate the static root stem.",
      code: `Stem: ${verb.dict} - る ➔ "${stemKanji}" (${stemKana})`
    });

    switch (formId) {
      case "masu":
        word = stemKanji + "ます";
        kana = stemKana + "ます";
        steps.push({ title: "3. Gluing Suffix", desc: "Attach polite present helper 'ます' directly to the isolated stem.", code: `"${stemKanji}" + "ます" ➔ "${word}"` });
        break;
      case "nai":
        word = stemKanji + "ない";
        kana = stemKana + "ない";
        steps.push({ title: "3. Gluing Suffix", desc: "Attach plain negative helper 'ない' directly to the isolated stem.", code: `"${stemKanji}" + "ない" ➔ "${word}"` });
        break;
      case "ta":
        word = stemKanji + "た";
        kana = stemKana + "た";
        steps.push({ title: "3. Gluing Suffix", desc: "Attach plain past helper 'た' directly to the isolated stem.", code: `"${stemKanji}" + "た" ➔ "${word}"` });
        break;
      case "te_kudasai":
        word = stemKanji + "てください";
        kana = stemKana + "てください";
        steps.push({ title: "3. Gluing Suffix", desc: "Attach request helper 'てください' directly to the isolated stem.", code: `"${stemKanji}" + "てください" ➔ "${word}"` });
        break;
      case "tai":
        word = stemKanji + "たい";
        kana = stemKana + "たい";
        steps.push({ title: "3. Gluing Suffix", desc: "Attach desire helper 'たい' directly to the isolated stem.", code: `"${stemKanji}" + "たい" ➔ "${word}"` });
        break;
      case "potential":
        word = stemKanji + "られる";
        kana = stemKana + "られる";
        steps.push({ title: "3. Potential Construction", desc: "Attach 'られる' (can do) to the Ichidan stem.", code: `"${stemKanji}" + "られる" ➔ "${word}"` });
        break;
    }
  } else if (verb.group === 1) {
    // Group 1 (Godan) is grid shift!
    const lastCharKanji = verb.dict.slice(-1);
    const stemKanji = verb.dict.slice(0, -1);
    const lastCharKana = verb.kana.slice(-1);
    const stemKana = verb.kana.slice(0, -1);

    // Let's get the standard godan table mappings for the final syllable
    // order: [dictionary_u, i_form, a_form, e_form, o_form]
    const syllG1: { [key: string]: string[] } = {
      "く": ["く", "き", "か", "け", "こ"],
      "む": ["む", "み", "ま", "め", "も"],
      "す": ["す", "し", "さ", "せ", "そ"],
      "つ": ["つ", "ち", "た", "て", "と"],
      "う": ["う", "い", "わ", "え", "お"],
      "る": ["る", "り", "ら", "れ", "ろ"],
    };

    const row = syllG1[lastCharKana] ?? ["う", "い", "わ", "え", "お"];

    switch (formId) {
      case "masu":
        word = stemKanji + (lastCharKanji === "行" ? "き" : KANA_ONES[row[1] === "き" ? 1 : 1]) + "ます"; // logic shortcut
        const mChar = row[1]; // e.g. く -> き, む -> み
        word = stemKanji + (lastCharKanji === "帰" ? "り" : lastCharKanji === "待" ? "ち" : lastCharKanji === "行" ? "き" : mChar);
        kana = stemKana + mChar;
        steps.push({
          title: "2. Row Grid-Shift (u ➔ i)",
          desc: `For Polite 'ます', shift the trailing dictionary 'u' vowel sound to its 'i' column equivalent (e.g., '${lastCharKana}' becomes '${mChar}').`,
          code: `"${lastCharKana}" ➔ "${mChar}" | Stem becomes: "${word}"`
        });
        word = word + "ます";
        kana = kana + "ます";
        steps.push({ title: "3. Gluing Suffix", desc: "Add the polite 'ます' suffix to complete the construction.", code: `"${verb.dict.slice(0, -1)}${mChar}" + "ます" ➔ "${word}"` });
        break;

      case "nai":
        const nChar = row[2]; // e.g. く -> か, む -> ま, う -> わ
        const negativeStemKanji = stemKanji + (lastCharKanji === "帰" ? "ら" : lastCharKanji === "待" ? "た" : nChar);
        word = negativeStemKanji + "ない";
        kana = stemKana + nChar + "ない";
        steps.push({
          title: "2. Row Grid-Shift (u ➔ a)",
          desc: `For Negative 'ない', shift the trailing dictionary 'u' vowel sound to its 'a' column equivalent (e.g., '${lastCharKana}' becomes '${nChar}'). Note that 'う' becomes 'わ'.`,
          code: `"${lastCharKana}" ➔ "${nChar}" | Stem becomes: "${negativeStemKanji}"`
        });
        steps.push({ title: "3. Gluing Suffix", desc: "Attach plain negative 'ない' directly to the shifted stem.", code: `"${negativeStemKanji}" + "ない" ➔ "${word}"` });
        break;

      case "ta":
      case "te_kudasai":
        // Te-form depends on the final consonant family!
        let suffixTe = "";
        let suffixTa = "";
        let familyDesc = "";

        if (verb.dict === "行く") {
          suffixTe = "って";
          suffixTa = "った";
          familyDesc = "⚠️ Irregular exception! 'いく' has a unique hard-consonant stop shift, rather than normal 'いて'.";
        } else if (["う", "つ", "る"].includes(lastCharKana)) {
          suffixTe = "って";
          suffixTa = "った";
          familyDesc = "Verb ends in う, つ, or る. These compress into a double-consonant small-つ stop + て/た (促音便).";
        } else if (["む", "ぶ", "ぬ"].includes(lastCharKana)) {
          suffixTe = "んで";
          suffixTa = "んだ";
          familyDesc = "Verb ends in む, ぶ, or ぬ. These soften into a nasal voice 'んで/んだ' (撥音便).";
        } else if (lastCharKana === "く") {
          suffixTe = "いて";
          suffixTa = "いた";
          familyDesc = "Verb ends in く. This drops the k-consonant into an 'i' flow 'いて/いた' (イ音便).";
        } else if (lastCharKana === "す") {
          suffixTe = "して";
          suffixTa = "した";
          familyDesc = "Verb ends in す. This shifts smoothly into 'して/した' (サ行音便).";
        }

        word = stemKanji + (formId === "ta" ? suffixTa : suffixTe);
        kana = stemKana + (formId === "ta" ? suffixTa : suffixTe);

        if (formId === "te_kudasai") {
          word = word + "ください";
          kana = kana + "ください";
        }

        steps.push({
          title: `2. Suffix Fusion (${formId === "ta" ? "Past た" : "Request て"})`,
          desc: `Group 1 verbs undergo euphonic '音便' (sound transitions) based on their final syllable family. ${familyDesc}`,
          code: `"${lastCharKana}" ➔ "${formId === "ta" ? suffixTa : suffixTe}" | Base: "${stemKanji}${formId === "ta" ? suffixTa : suffixTe}"`
        });

        if (formId === "te_kudasai") {
          steps.push({
            title: "3. Gluing Request Suffix",
            desc: "Attach the polite 'ください' request word to the completed て-form.",
            code: `"${stemKanji}${suffixTe}" + "ください" ➔ "${word}"`
          });
        }
        break;

      case "tai":
        const tChar = row[1]; // same as masu
        word = stemKanji + (lastCharKanji === "帰" ? "り" : lastCharKanji === "待" ? "ち" : lastCharKanji === "行" ? "き" : tChar);
        kana = stemKana + tChar;
        steps.push({
          title: "2. Row Grid-Shift (u ➔ i)",
          desc: `Desire 'たい' attaches to the verb's 'ます-stem'. Shift dictionary 'u' vowel to 'i' column equivalent (e.g., '${lastCharKana}' becomes '${tChar}').`,
          code: `"${lastCharKana}" ➔ "${tChar}"`
        });
        word = word + "たい";
        kana = kana + "たい";
        steps.push({ title: "3. Gluing Suffix", desc: "Attach desire marker 'たい' directly to the stem.", code: `"${word}"` });
        break;

      case "potential":
        const pChar = row[3]; // shift to e column (e.g. く -> け, む -> め)
        const potStem = stemKanji + (lastCharKanji === "帰" ? "れ" : lastCharKanji === "待" ? "て" : lastCharKanji === "行" ? "け" : pChar);
        word = potStem + "る";
        kana = stemKana + pChar + "る";
        steps.push({
          title: "2. Row Grid-Shift (u ➔ e)",
          desc: `For Potential 'can do', shift trailing dictionary 'u' vowel to its 'e' column equivalent (e.g., '${lastCharKana}' becomes '${pChar}').`,
          code: `"${lastCharKana}" ➔ "${pChar}" | Stem becomes: "${potStem}"`
        });
        steps.push({ title: "3. Potential Suffix", desc: "Attach standard 'る' ending.", code: `"${potStem}" + "る" ➔ "${word}"` });
        break;
    }
  } else {
    // Group 3 Irregular (する, くる)
    if (verb.dict === "する") {
      switch (formId) {
        case "masu": word = "します"; kana = "します"; steps.push({ title: "Irregular Mapping", desc: "する completely alters its root to 'し' inside polite environments.", code: "する ➔ します" }); break;
        case "nai": word = "しない"; kana = "しない"; steps.push({ title: "Irregular Mapping", desc: "する shifts to its plain negative form.", code: "する ➔ しない" }); break;
        case "ta": word = "した"; kana = "した"; steps.push({ title: "Irregular Mapping", desc: "する shifts to its plain past form.", code: "する ➔ した" }); break;
        case "te_kudasai": word = "してください"; kana = "してください"; steps.push({ title: "Irregular Mapping", desc: "する shifts to 'して' before attaching request marker.", code: "する ➔ してください" }); break;
        case "tai": word = "したい"; kana = "したい"; steps.push({ title: "Irregular Mapping", desc: "する shifts to 'し' stem before adding desire suffix.", code: "する ➔ したい" }); break;
        case "potential": word = "できる"; kana = "できる"; steps.push({ title: "Complete Transformation ★", desc: "The potential form of 'する' (to do) is a totally different word: 'できる' (dekiru - can do).", code: "する ➔ できる" }); break;
      }
    } else if (verb.dict.startsWith("くる") || verb.dict.startsWith("来る")) {
      switch (formId) {
        case "masu": word = "来ます"; kana = "きます"; steps.push({ title: "Irregular Shift (u ➔ i)", desc: "The kanji '来' changes pronunciation from 'ku' to 'ki' when combining with masu.", code: "来る (くる) ➔ 来ます (きます)" }); break;
        case "nai": word = "来ない"; kana = "こない"; steps.push({ title: "Irregular Shift (u ➔ o)", desc: "The kanji '来' shifts to 'ko' sound inside negative environments.", code: "来る (くる) ➔ 来ない (こない)" }); break;
        case "ta": word = "来た"; kana = "きた"; steps.push({ title: "Irregular Shift (u ➔ i)", desc: "The kanji shifts to 'ki' sound in past environment.", code: "来る (くる) ➔ 来た (きた)" }); break;
        case "te_kudasai": word = "来てください"; kana = "きてください"; steps.push({ title: "Irregular Request Shift", desc: "The kanji shifts to 'ki' sound for requests.", code: "来る (くる) ➔ 来てください (きてください)" }); break;
        case "tai": word = "来たい"; kana = "きたい"; steps.push({ title: "Irregular Desire Shift", desc: "The kanji shifts to 'ki' sound for desire.", code: "来る (くる) ➔ 来たい (きたい)" }); break;
        case "potential": word = "来られる"; kana = "こられる"; steps.push({ title: "Potential Shift", desc: "Shifts to 'ko' sound for potential ability.", code: "来る (くる) ➔ 来られる (こられる)" }); break;
      }
    }
  }

  return {
    word,
    kana,
    romaji: "Conjugation Completed",
    steps
  };
}

// ─── 31-Day Calendar Ledger Data ────────────────────────────────────────────────

const CALENDAR_DAYS = [
  { d: 1, kanji: "1日", reading: "ついたち", meaning: "1st of the month", type: "highly-irregular", desc: "Derived from 'tsukitachi' (rising of the new moon), marking the new lunar month." },
  { d: 2, kanji: "2日", reading: "ふつか", meaning: "2nd of the month", type: "highly-irregular", desc: "Ancient native Japanese count." },
  { d: 3, kanji: "3日", reading: "みっか", meaning: "3rd of the month", type: "highly-irregular", desc: "Double stop native count." },
  { d: 4, kanji: "4日", reading: "よっか", meaning: "4th of the month", type: "highly-irregular", desc: "Must be careful: 'yokka' (4th) sounds very similar to 'yooka' (8th)!" },
  { d: 5, kanji: "5日", reading: "いつか", meaning: "5th of the month", type: "highly-irregular", desc: "Native Japanese count." },
  { d: 6, kanji: "6日", reading: "むいか", meaning: "6th of the month", type: "highly-irregular", desc: "Native Japanese count." },
  { d: 7, kanji: "7日", reading: "なのか", meaning: "7th of the month", type: "highly-irregular", desc: "Native Japanese count." },
  { d: 8, kanji: "8日", reading: "ようか", meaning: "8th of the month", type: "highly-irregular", desc: "Has an elongated 'o' sound (yooka). Contrast carefully with yokka (4th)." },
  { d: 9, kanji: "9日", reading: "ここのか", meaning: "9th of the month", type: "highly-irregular", desc: "Native Japanese count." },
  { d: 10, kanji: "10日", reading: "とおか", meaning: "10th of the month", type: "highly-irregular", desc: "Native Japanese count ending the first decade of the month." },
  { d: 11, kanji: "11日", reading: "じゅういちにち", meaning: "11th of the month", type: "normal", desc: "Standard Chinese numbering rules apply onwards: [10] + [number] + にち." },
  { d: 12, kanji: "12日", reading: "じゅうににち", meaning: "12th of the month", type: "normal", desc: "Regular Chinese-based reading." },
  { d: 13, kanji: "13日", reading: "じゅうさんにち", meaning: "13th of the month", type: "normal", desc: "Regular Chinese-based reading." },
  { d: 14, kanji: "14日", reading: "じゅうよっか", meaning: "14th of the month", type: "irregular", desc: "Irregular combination of Chinese '10' (juu) and native 'yokka' (4th)." },
  { d: 15, kanji: "15日", reading: "じゅうごにち", meaning: "15th of the month", type: "normal", desc: "Regular Chinese-based reading." },
  { d: 16, kanji: "16日", reading: "じゅうろくにち", meaning: "16th of the month", type: "normal", desc: "Regular Chinese-based reading." },
  { d: 17, kanji: "17日", reading: "じゅうしちにち", meaning: "17th of the month", type: "normal", desc: "Prefers the 'shichi' pronunciation of 7." },
  { d: 18, kanji: "18日", reading: "じゅうはちにち", meaning: "18th of the month", type: "normal", desc: "Regular Chinese-based reading." },
  { d: 19, kanji: "19日", reading: "じゅうくにち", meaning: "19th of the month", type: "normal", desc: "Prefers the 'ku' pronunciation of 9." },
  { d: 20, kanji: "20日", reading: "はつか", meaning: "20th of the month", type: "highly-irregular", desc: "A famous ancient native Japanese reading. Standard 'ni-juu-nichi' is rarely used." },
  { d: 21, kanji: "21日", reading: "にじゅういちにち", meaning: "21st of the month", type: "normal", desc: "Regular Chinese-based reading." },
  { d: 22, kanji: "22日", reading: "にじゅうににち", meaning: "22nd of the month", type: "normal", desc: "Regular Chinese-based reading." },
  { d: 23, kanji: "23日", reading: "にじゅうさんにち", meaning: "23rd of the month", type: "normal", desc: "Regular Chinese-based reading." },
  { d: 24, kanji: "24日", reading: "にじゅうよっか", meaning: "24th of the month", type: "irregular", desc: "Combined Chinese '20' (ni-juu) + native 'yokka' (4th)." },
  { d: 25, kanji: "25日", reading: "にじゅうごにち", meaning: "25th of the month", type: "normal", desc: "Regular Chinese-based reading." },
  { d: 26, kanji: "26日", reading: "にじゅうろくにち", meaning: "26th of the month", type: "normal", desc: "Regular Chinese-based reading." },
  { d: 27, kanji: "27日", reading: "にじゅうしちにち", meaning: "27th of the month", type: "normal", desc: "Prefers 'shichi' pronunciation of 7." },
  { d: 28, kanji: "28日", reading: "にじゅうはちにち", meaning: "28th of the month", type: "normal", desc: "Regular Chinese-based reading." },
  { d: 29, kanji: "29日", reading: "にじゅうくにち", meaning: "29th of the month", type: "normal", desc: "Prefers 'ku' pronunciation of 9." },
  { d: 30, kanji: "30日", reading: "さんじゅうにち", meaning: "30th of the month", type: "normal", desc: "Regular Chinese-based reading." },
  { d: 31, kanji: "31日", reading: "さんじゅういちにち", meaning: "31st of the month", type: "normal", desc: "Regular Chinese-based reading." },
];

// ─── Component Code ────────────────────────────────────────────────────────────

export default function InteractiveWorkbench({ onClose }: { onClose: () => void }) {
  const [activeMode, setActiveMode] = useState<"counters" | "verbs" | "calendar">("counters");

  // 1. Counter states
  const [selectedNum, setSelectedNum] = useState<number>(3);
  const [selectedCounter, setSelectedCounter] = useState<string>("本");

  const computedCounterResult = useMemo(() => {
    return computeCounter(selectedNum, selectedCounter);
  }, [selectedNum, selectedCounter]);

  // 2. Verb states
  const [selectedVerbIdx, setSelectedVerbIdx] = useState<number>(0);
  const [selectedFormId, setSelectedFormId] = useState<string>("masu");

  const computedVerbResult = useMemo(() => {
    const verb = CONJUGATION_VERBS[selectedVerbIdx];
    return conjugate(verb, selectedFormId);
  }, [selectedVerbIdx, selectedFormId]);

  // 3. Calendar states
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const currentDayData = CALENDAR_DAYS[selectedDayIdx];

  const currentVerb = CONJUGATION_VERBS[selectedVerbIdx];
  const currentForm = CONJUGATION_FORMS.find((f) => f.id === selectedFormId);

  return (
    <div 
      className="bg-natural-card/15 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col w-full relative"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 25px 50px rgba(0,0,0,0.35)" }}
    >
      
      {/* WOODEN-STYLE WORKBENCH HEADER */}
      <div className="bg-white/5 border-b border-white/10 px-5 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-natural-clay animate-spin-slow" />
          <div>
            <h3 className="font-serif font-black text-base text-natural-forest leading-none">
              道場砂盤 <span className="font-sans font-extrabold text-xs text-natural-clay block sm:inline sm:ml-1 uppercase tracking-widest">Mastery Sandbox</span>
            </h3>
            <p className="text-[10px] font-mono text-natural-forest-light uppercase mt-0.5 tracking-wider">
              Interactive phonetic & grammar constructor
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-natural-forest/10 border border-transparent hover:border-natural-border text-natural-charcoal/50 hover:text-natural-charcoal cursor-pointer transition shadow-xs"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* BENCH MODE SELECTOR */}
      <div className="grid grid-cols-3 bg-white/5 border-b border-white/10 text-xs font-mono font-bold">
        <button
          type="button"
          onClick={() => setActiveMode("counters")}
          className={`py-3 text-center border-r border-white/10 transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeMode === "counters"
              ? "bg-white/15 text-natural-forest border-b-2 border-b-natural-forest"
              : "text-natural-charcoal/60 hover:bg-white/10"
          }`}
        >
          <span>🔢</span>
          <span className="font-serif font-bold">Counters</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMode("verbs")}
          className={`py-3 text-center border-r border-white/10 transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeMode === "verbs"
              ? "bg-white/15 text-natural-clay border-b-2 border-b-natural-clay"
              : "text-natural-charcoal/60 hover:bg-white/10"
          }`}
        >
          <span>⚡</span>
          <span className="font-serif font-bold">Conjugator</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMode("calendar")}
          className={`py-3 text-center transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeMode === "calendar"
              ? "bg-white/15 text-natural-terracotta border-b-2 border-b-natural-terracotta"
              : "text-natural-charcoal/60 hover:bg-white/10"
          }`}
        >
          <span>📅</span>
          <span className="font-serif font-bold">31-Day Ledger</span>
        </button>
      </div>

      {/* CORE CONTENT */}
      <div className="flex-grow p-5 bg-transparent flex flex-col gap-5 min-h-0">
        
        {/* ─── WORKSPACE: COUNTER SANDBOX ──────────────────────────────────────── */}
        {activeMode === "counters" && (
          <div className="flex flex-col gap-4">
            
            {/* Pick counter class */}
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-natural-forest-light font-extrabold block mb-2">
                Step 1: Select Classifier Category
              </span>
              <div className="grid grid-cols-4 gap-2">
                {COUNTERS_LIST.map((c) => (
                  <button
                    key={c.char}
                    type="button"
                    onClick={() => setSelectedCounter(c.char)}
                    className={`p-2 rounded-xl text-center border-2 transition cursor-pointer flex flex-col items-center justify-center gap-1 shadow-xs ${
                      selectedCounter === c.char
                        ? "bg-natural-forest border-natural-forest text-natural-bg font-black scale-102"
                        : "bg-natural-card border-natural-border text-natural-charcoal hover:border-natural-forest/40"
                    }`}
                    title={c.desc}
                  >
                    <span className="text-sm">{c.icon}</span>
                    <span className="font-serif font-black text-sm">{c.char}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-natural-charcoal/50 italic mt-1.5 font-sans leading-none pl-1">
                Selected Counter: <strong>{COUNTERS_LIST.find((c) => c.char === selectedCounter)?.name}</strong> · {COUNTERS_LIST.find((c) => c.char === selectedCounter)?.desc}
              </p>
            </div>

            {/* Set Quantity */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-mono text-[9px] uppercase tracking-widest text-natural-forest-light font-extrabold block">
                  Step 2: Adjust Quantity
                </span>
                <span className="font-mono text-xs font-black text-natural-clay">
                  Quantity: {selectedNum}
                </span>
              </div>

              {/* Number controls bento */}
              <div className="flex gap-2 items-center bg-natural-card border border-natural-border rounded-2xl p-2 shadow-inner">
                <button
                  type="button"
                  onClick={() => setSelectedNum((n) => Math.max(1, n - 10))}
                  className="px-2.5 py-1.5 bg-natural-bg/80 border border-natural-border hover:bg-natural-clay/10 hover:text-natural-clay text-xs font-mono font-bold rounded-lg cursor-pointer transition"
                  title="Subtract 10"
                >
                  -10
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNum((n) => Math.max(1, n - 1))}
                  className="px-2.5 py-1.5 bg-natural-bg/80 border border-natural-border hover:bg-natural-clay/10 hover:text-natural-clay text-xs font-mono font-bold rounded-lg cursor-pointer transition"
                  title="Subtract 1"
                >
                  -1
                </button>
                
                {/* Slider bar */}
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={selectedNum <= 100 ? selectedNum : 100}
                  onChange={(e) => setSelectedNum(Number(e.target.value))}
                  className="flex-grow h-2 bg-natural-border rounded-lg appearance-none cursor-pointer accent-natural-forest mx-2"
                />

                <button
                  type="button"
                  onClick={() => setSelectedNum((n) => Math.min(9999, n + 1))}
                  className="px-2.5 py-1.5 bg-natural-bg/80 border border-natural-border hover:bg-natural-forest/10 hover:text-natural-forest text-xs font-mono font-bold rounded-lg cursor-pointer transition"
                  title="Add 1"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNum((n) => Math.min(9999, n + 10))}
                  className="px-2.5 py-1.5 bg-natural-bg/80 border border-natural-border hover:bg-natural-forest/10 hover:text-natural-forest text-xs font-mono font-bold rounded-lg cursor-pointer transition"
                  title="Add 10"
                >
                  +10
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {[1, 2, 3, 4, 6, 8, 10, 14, 20, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSelectedNum(preset)}
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold border cursor-pointer transition ${
                      selectedNum === preset
                        ? "bg-natural-clay text-natural-bg border-natural-clay"
                        : "bg-natural-card border-natural-border text-natural-charcoal/60 hover:border-natural-clay/40"
                    }`}
                  >
                    Qty: {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* BRUSH LEDGER RESULT CARD */}
            <div className="bg-natural-card border-2 border-natural-border rounded-[2.2rem] p-5 relative overflow-hidden shadow-sm flex flex-col gap-3 min-h-[140px] justify-center mt-1">
              
              {/* Seal Stamp representing type */}
              <div className="absolute top-4 right-4 pointer-events-none opacity-[0.25] rotate-12 z-0">
                {computedCounterResult.type === "irregular" ? (
                  <span className="font-serif font-black text-2xl text-natural-terracotta border-2 border-double border-natural-terracotta px-2 py-0.5 rounded">
                    変則 irregular
                  </span>
                ) : computedCounterResult.type === "euphonic" ? (
                  <span className="font-serif font-black text-2xl text-natural-clay border-2 border-dashed border-natural-clay px-2 py-0.5 rounded">
                    音便 euphonic
                  </span>
                ) : (
                  <span className="font-serif font-black text-2xl text-natural-forest border-2 border-double border-natural-forest px-2 py-0.5 rounded">
                    規則 normal
                  </span>
                )}
              </div>

              <div className="flex justify-between items-start z-10 relative">
                <div>
                  <span className="font-serif text-[11px] font-extrabold uppercase tracking-widest text-natural-forest-light">Generated Reading</span>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="font-serif font-black text-4xl text-natural-charcoal tracking-wide leading-none select-all">
                      {computedCounterResult.reading}
                    </span>
                    <span className="font-serif text-2xl text-natural-forest-light font-black">
                      ({computedCounterResult.kanji})
                    </span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => speak(computedCounterResult.reading)}
                  className="p-3 rounded-2xl bg-natural-bg hover:bg-natural-forest/10 border border-natural-border hover:border-natural-forest text-natural-forest/60 hover:text-natural-forest shadow-xs cursor-pointer transition shrink-0"
                  title="Hear pronunciation"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              <div className="border-t border-natural-border/50 pt-2.5 mt-1 text-xs font-sans text-natural-charcoal/80 leading-relaxed z-10 relative">
                <strong className="font-mono text-[9px] uppercase tracking-widest text-natural-clay block font-bold mb-1">Grammar Mechanics Explainer</strong>
                {computedCounterResult.explanation}
              </div>
            </div>

          </div>
        )}

        {/* ─── WORKSPACE: VERB CONJUGATOR ──────────────────────────────────────── */}
        {activeMode === "verbs" && (
          <div className="flex flex-col gap-4">
            
            {/* Selected Verb selector */}
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-natural-forest-light font-extrabold block mb-2">
                Step 1: Select Verb Dictionary Form
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
                {CONJUGATION_VERBS.map((v, idx) => (
                  <button
                    key={v.dict}
                    type="button"
                    onClick={() => setSelectedVerbIdx(idx)}
                    className={`px-4 py-2 rounded-2xl text-center border-2 whitespace-nowrap cursor-pointer transition shrink-0 flex flex-col gap-0.5 ${
                      selectedVerbIdx === idx
                        ? "bg-natural-clay border-natural-clay text-natural-bg font-black scale-102 shadow-xs"
                        : "bg-natural-card border-natural-border text-natural-charcoal hover:border-natural-clay/40"
                    }`}
                  >
                    <span className="font-serif font-black text-[15px]">{v.dict}</span>
                    <span className="text-[9px] font-mono opacity-80 leading-none">Group {v.group}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-natural-charcoal/50 italic mt-1.5 font-sans leading-none pl-1">
                <strong>{currentVerb.meaning}</strong> · {currentVerb.notes}
              </p>
            </div>

            {/* Target Form Select Grid */}
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-natural-forest-light font-extrabold block mb-2">
                Step 2: Choose target conjugation form
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONJUGATION_FORMS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFormId(f.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between h-[65px] shadow-xs ${
                      selectedFormId === f.id
                        ? "bg-natural-forest border-natural-forest text-natural-bg"
                        : "bg-natural-card border-natural-border text-natural-charcoal hover:border-natural-forest/40"
                    }`}
                  >
                    <span className="font-serif font-black text-xs block leading-tight">{f.name}</span>
                    <span className={`text-[9px] font-sans italic block mt-1 leading-none ${selectedFormId === f.id ? "text-natural-bg/75" : "text-natural-charcoal/50"}`}>
                      {f.meaning}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* VISUAL TRANSFORM BOX */}
            <div className="bg-natural-card border-2 border-natural-border rounded-[2.2rem] p-5 shadow-xs flex flex-col gap-4 mt-1 relative overflow-hidden">
              <div className="absolute top-4 right-4 pointer-events-none opacity-[0.25] rotate-12 z-0">
                <span className="font-serif font-black text-2xl text-natural-clay border border-natural-clay px-2 py-0.5 rounded inline-block">
                  活用 conjugation
                </span>
              </div>

              {/* Head display */}
              <div className="flex justify-between items-start z-10 relative border-b border-natural-border/40 pb-3">
                <div>
                  <span className="font-serif text-[11px] font-extrabold uppercase tracking-widest text-natural-forest-light">Resulting Form</span>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="font-serif font-black text-3xl text-natural-charcoal tracking-wide leading-none select-all">
                      {computedVerbResult.word}
                    </span>
                    <span className="font-serif text-base text-natural-forest-light font-bold">
                      ({computedVerbResult.kana})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => speak(computedVerbResult.word)}
                  className="p-3 rounded-2xl bg-natural-bg hover:bg-natural-forest/10 border border-natural-border hover:border-natural-forest text-natural-forest/60 hover:text-natural-forest shadow-xs cursor-pointer transition shrink-0"
                  title="Hear pronunciation"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* Step by Step Breakdown tree */}
              <div className="flex flex-col gap-3.5 z-10 relative">
                <span className="font-mono text-[9px] uppercase tracking-widest text-natural-clay font-bold block">
                  Step-by-Step Transition Blueprint
                </span>

                <div className="flex flex-col gap-3">
                  {computedVerbResult.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-natural-clay/10 border border-natural-clay/20 flex items-center justify-center text-[10px] font-mono font-bold text-natural-clay mt-0.5 shrink-0 shadow-inner">
                        {idx + 1}
                      </div>
                      <div className="flex-grow min-w-0">
                        <strong className="text-xs font-serif font-black text-natural-charcoal block leading-none mb-1">
                          {step.title}
                        </strong>
                        <p className="text-[11px] text-natural-charcoal/70 leading-relaxed font-sans mb-1.5">
                          {step.desc}
                        </p>
                        <div className="font-mono text-[11px] text-natural-forest bg-natural-bg/50 border border-natural-border/50 rounded-xl px-3 py-1.5 select-text shadow-inner inline-block font-bold">
                          {step.code}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ─── WORKSPACE: FULL 31-DAY CALENDAR LEDGER ──────────────────────────── */}
        {activeMode === "calendar" && (
          <div className="flex flex-col gap-4">
            
            <CalloutBox type="zap">
              <strong>Calendar Days Rules:</strong> Days <strong>1 to 10</strong>, plus <strong>14, 20, and 24</strong> are fully irregular native counts. Standard days take Chinese numbering ending with <span className="font-serif">にち</span>.
            </CalloutBox>

            {/* The 31 Grid */}
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-natural-forest-light font-extrabold block mb-2">
                Select a Day on the Ledger Scroll
              </span>
              <div className="grid grid-cols-7 gap-1.5 bg-natural-card border border-natural-border rounded-3xl p-3 shadow-inner">
                {CALENDAR_DAYS.map((d, idx) => {
                  const isSelected = selectedDayIdx === idx;
                  const isIrreg = d.type !== "normal";
                  return (
                    <button
                      key={d.d}
                      type="button"
                      onClick={() => setSelectedDayIdx(idx)}
                      className={`aspect-square p-1 rounded-xl text-center border transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-xs ${
                        isSelected
                          ? "bg-natural-terracotta border-natural-terracotta text-natural-bg scale-105 font-bold shadow-md z-10"
                          : isIrreg
                          ? "bg-natural-clay/10 border-natural-clay/35 text-natural-clay font-bold hover:bg-natural-clay/20"
                          : "bg-natural-bg/40 border-natural-border/50 text-natural-charcoal/60 hover:bg-natural-card hover:text-natural-charcoal"
                      }`}
                    >
                      <span className="font-mono text-[10px] font-bold block">{d.d}</span>
                      <span className="font-serif text-[11px] font-black block leading-none">{d.kanji[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SELECTED DAY EXPLORER */}
            <div className="bg-natural-card border-2 border-natural-border rounded-[2.2rem] p-5 relative overflow-hidden shadow-sm flex flex-col gap-3 min-h-[140px] justify-center mt-1">
              
              {/* Day Hanko Stamp */}
              <div className="absolute top-4 right-4 pointer-events-none opacity-[0.25] rotate-12 z-0">
                {currentDayData.type === "highly-irregular" ? (
                  <span className="font-serif font-black text-2xl text-natural-terracotta border-2 border-double border-natural-terracotta px-2 py-0.5 rounded">
                    極変 irregularly
                  </span>
                ) : currentDayData.type === "irregular" ? (
                  <span className="font-serif font-black text-2xl text-natural-clay border-2 border-dashed border-natural-clay px-2 py-0.5 rounded">
                    変則 blended
                  </span>
                ) : (
                  <span className="font-serif font-black text-2xl text-natural-forest border border-natural-forest px-2 py-0.5 rounded">
                    規則 standard
                  </span>
                )}
              </div>

              <div className="flex justify-between items-start z-10 relative">
                <div>
                  <span className="font-serif text-[11px] font-extrabold uppercase tracking-widest text-natural-forest-light">Day Ledger Reading</span>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="font-serif font-black text-3.5xl text-natural-charcoal tracking-wide leading-none select-all">
                      {currentDayData.reading}
                    </span>
                    <span className="font-serif text-2xl text-natural-forest-light font-black">
                      ({currentDayData.kanji})
                    </span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => speak(currentDayData.reading)}
                  className="p-3 rounded-2xl bg-natural-bg hover:bg-natural-forest/10 border border-natural-border hover:border-natural-forest text-natural-forest/60 hover:text-natural-forest shadow-xs cursor-pointer transition shrink-0"
                  title="Hear pronunciation"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              <div className="border-t border-natural-border/50 pt-2.5 mt-1 text-xs font-sans text-natural-charcoal/80 leading-relaxed z-10 relative">
                <strong className="font-mono text-[9px] uppercase tracking-widest text-natural-clay block font-bold mb-1">
                  Meaning: {currentDayData.meaning}
                </strong>
                {currentDayData.desc}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* BENCH BOTTOM TIPS */}
      <div className="bg-white/5 border-t border-white/10 px-5 py-3.5 text-center text-[10px] font-mono text-natural-forest/60 uppercase tracking-widest font-bold">
        🧰 Click speaker icons for text-to-speech pronunciation checks
      </div>

    </div>
  );
}

// ─── Auxiliary Callout Component ─────────────────────────────────────────────

function CalloutBox({ type, children }: { type: "tip" | "warning" | "zap"; children: React.ReactNode }) {
  const styles = {
    tip: { bg: "bg-natural-forest/8 border-natural-forest/20", icon: "💡" },
    warning: { bg: "bg-natural-clay/10 border-natural-clay/35", icon: "⚠️" },
    zap: { bg: "bg-natural-terracotta/8 border-natural-terracotta/25", icon: "⚡" },
  };
  const s = styles[type];
  return (
    <div className={`flex gap-3 ${s.bg} border rounded-2xl p-4 text-xs font-sans text-natural-charcoal leading-relaxed shadow-xs`}>
      <span className="text-sm shrink-0 mt-0.5">{s.icon}</span>
      <div>{children}</div>
    </div>
  );
}
