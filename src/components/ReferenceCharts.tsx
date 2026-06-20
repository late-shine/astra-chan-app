import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Volume2, Search, AlertTriangle, Lightbulb, Zap } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReferenceChartsProps {
  onBack: () => void;
}

type TabId = "counters" | "numbers" | "time" | "verbs" | "adjectives" | "particles";

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpeakButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      className="p-1.5 rounded-lg hover:bg-natural-forest/10 text-natural-forest/60 hover:text-natural-forest transition shrink-0"
      title={`Pronounce: ${text}`}
    >
      <Volume2 className="w-3 h-3" />
    </button>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-natural-forest/40" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search Japanese, reading, or English..."
        className="w-full bg-natural-bg border border-natural-border rounded-xl pl-9 pr-4 py-2 text-sm font-sans text-natural-charcoal placeholder:text-natural-charcoal/30 focus:outline-none focus:border-natural-forest/40"
      />
    </div>
  );
}

function CalloutBox({ type, children }: { type: "tip" | "warning" | "zap"; children: React.ReactNode }) {
  const styles = {
    tip: { bg: "bg-natural-forest/8 border-natural-forest/20", icon: <Lightbulb className="w-3.5 h-3.5 text-natural-forest shrink-0 mt-0.5" /> },
    warning: { bg: "bg-natural-clay/10 border-natural-clay/30", icon: <AlertTriangle className="w-3.5 h-3.5 text-natural-clay shrink-0 mt-0.5" /> },
    zap: { bg: "bg-natural-terracotta/8 border-natural-terracotta/20", icon: <Zap className="w-3.5 h-3.5 text-natural-terracotta shrink-0 mt-0.5" /> },
  };
  const s = styles[type];
  return (
    <div className={`flex gap-2 ${s.bg} border rounded-xl p-3 text-xs font-sans text-natural-charcoal leading-relaxed`}>
      {s.icon}
      <div>{children}</div>
    </div>
  );
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="bg-natural-forest/10">
        {cols.map((c) => (
          <th key={c} className="px-3 py-2 text-left text-[10px] font-mono text-natural-forest uppercase tracking-wider whitespace-nowrap">
            {c}
          </th>
        ))}
        <th className="w-8" />
      </tr>
    </thead>
  );
}

function TableRow({ cells, speakText, idx }: { cells: React.ReactNode[]; speakText: string; idx: number }) {
  return (
    <tr className={idx % 2 === 0 ? "bg-natural-card" : "bg-natural-bg/50 hover:bg-natural-forest/5 transition"}>
      {cells.map((cell, i) => (
        <td key={i} className="px-3 py-2.5 text-xs font-sans text-natural-charcoal align-top">
          {cell}
        </td>
      ))}
      <td className="px-1 py-2 align-middle">
        <SpeakButton text={speakText} />
      </td>
    </tr>
  );
}

// ─── TAB: COUNTERS ────────────────────────────────────────────────────────────

const COUNTERS = [
  { counter: "枚 (まい)", what: "Flat/thin objects", examples: "Paper, shirts, tickets", nums: "1枚=いちまい、2枚=にまい、3枚=さんまい", notes: "Regular — no sound changes" },
  { counter: "本 (ほん)", what: "Long thin objects", examples: "Pens, bottles, rivers, roads", nums: "1本=いっぽん、2本=にほん、3本=さんぼん", notes: "⚡ Sound changes: いっぽん、さんぼん、ろっぽん、はっぽん" },
  { counter: "匹 (ひき)", what: "Small animals", examples: "Cats, fish, insects", nums: "1匹=いっぴき、2匹=にひき、3匹=さんびき", notes: "⚡ Sound changes: いっぴき、さんびき、ろっぴき" },
  { counter: "頭 (とう)", what: "Large animals", examples: "Cows, elephants, horses", nums: "1頭=いっとう、2頭=にとう、3頭=さんとう", notes: "For farm/zoo animals" },
  { counter: "羽 (わ/ば/ぱ)", what: "Birds & rabbits", examples: "Birds, rabbits (classified as birds!)", nums: "1羽=いちわ、2羽=にわ、3羽=さんわ", notes: "Rabbits counted here, not with 匹" },
  { counter: "冊 (さつ)", what: "Bound objects", examples: "Books, notebooks, magazines", nums: "1冊=いっさつ、2冊=にさつ、3冊=さんさつ", notes: "⚡ いっさつ (double t sound)" },
  { counter: "個 (こ)", what: "Small round objects", examples: "Apples, eggs, boxes, buttons", nums: "1個=いっこ、2個=にこ、3個=さんこ", notes: "Most versatile counter for objects" },
  { counter: "台 (だい)", what: "Machines & vehicles", examples: "Cars, computers, bikes, TVs", nums: "1台=いちだい、2台=にだい、3台=さんだい", notes: "Regular — no sound changes" },
  { counter: "人 (にん/り)", what: "People", examples: "Friends, students, family members", nums: "1人=ひとり、2人=ふたり、3人=さんにん", notes: "⚡ Only 1 and 2 are irregular!" },
  { counter: "階 (かい/がい)", what: "Building floors", examples: "Floors of a building", nums: "1階=いっかい、2階=にかい、3階=さんかい", notes: "⚡ 1階=いっかい、6階=ろっかい、8階=はっかい" },
  { counter: "歳 (さい)", what: "Age", examples: "How old someone is", nums: "1歳=いっさい、2歳=にさい、20歳=はたち", notes: "20 years old = はたち (special word!)" },
  { counter: "つ (general)", what: "General (native)", examples: "Anything — most universal counter", nums: "1=ひとつ、2=ふたつ、3=みっつ、4=よっつ", notes: "Only goes up to 10 (とお)" },
];

const NATIVE_COUNTER = [
  ["1", "ひとつ"], ["2", "ふたつ"], ["3", "みっつ"], ["4", "よっつ"],
  ["5", "いつつ"], ["6", "むっつ"], ["7", "ななつ"], ["8", "やっつ"],
  ["9", "ここのつ"], ["10", "とお"],
];

function CountersTab() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return COUNTERS;
    const lq = q.toLowerCase();
    return COUNTERS.filter((r) =>
      [r.counter, r.what, r.examples, r.nums, r.notes].some((s) => s.toLowerCase().includes(lq))
    );
  }, [q]);

  return (
    <div className="flex flex-col gap-4">
      <SearchBar value={q} onChange={setQ} />

      <div className="flex flex-col gap-2">
        <CalloutBox type="zap">
          <strong>Sound change pattern:</strong> Counters starting with h/f/p sounds often change when combined with 1, 3, 6, 8.
          <br />本: <span className="font-serif">いっ<strong>ぽ</strong>ん、さん<strong>ぼ</strong>ん、ろっ<strong>ぽ</strong>ん、はっ<strong>ぽ</strong>ん</span>
          <br />匹: <span className="font-serif">いっ<strong>ぴ</strong>き、さん<strong>び</strong>き、ろっ<strong>ぴ</strong>き</span>
        </CalloutBox>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-natural-border">
        <table className="w-full border-collapse">
          <TableHeader cols={["Counter", "Used for", "Examples", "1–3 Examples", "Notes"]} />
          <tbody>
            {filtered.map((row, i) => (
              <TableRow
                key={row.counter}
                idx={i}
                speakText={row.nums.split("、")[0].split("=")[0]}
                cells={[
                  <span className="font-serif text-base text-natural-forest font-bold">{row.counter}</span>,
                  <span className="font-sans">{row.what}</span>,
                  <span className="text-natural-charcoal/70">{row.examples}</span>,
                  <span className="font-serif text-natural-forest/80 text-[11px]">{row.nums}</span>,
                  <span className={row.notes.startsWith("⚡") ? "text-natural-clay font-medium" : "text-natural-charcoal/60"}>{row.notes}</span>,
                ]}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-wider mb-2">Native Japanese Counter つ (1–10 only)</p>
        <div className="grid grid-cols-5 gap-1.5">
          {NATIVE_COUNTER.map(([num, reading]) => (
            <div key={num} className="bg-natural-card border border-natural-border rounded-xl p-2 text-center flex flex-col gap-0.5">
              <span className="font-mono text-[10px] text-natural-forest/60">{num}</span>
              <span className="font-serif text-sm text-natural-charcoal font-bold">{reading}</span>
              <SpeakButton text={reading} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TAB: NUMBERS ─────────────────────────────────────────────────────────────

const DUAL_NUMBERS = [
  { num: "1", chinese: "いち", native: "ひとつ", nativeKanji: "一つ" },
  { num: "2", chinese: "に", native: "ふたつ", nativeKanji: "二つ" },
  { num: "3", chinese: "さん", native: "みっつ", nativeKanji: "三つ" },
  { num: "4", chinese: "し / よん", native: "よっつ", nativeKanji: "四つ" },
  { num: "5", chinese: "ご", native: "いつつ", nativeKanji: "五つ" },
  { num: "6", chinese: "ろく", native: "むっつ", nativeKanji: "六つ" },
  { num: "7", chinese: "しち / なな", native: "ななつ", nativeKanji: "七つ" },
  { num: "8", chinese: "はち", native: "やっつ", nativeKanji: "八つ" },
  { num: "9", chinese: "く / きゅう", native: "ここのつ", nativeKanji: "九つ" },
  { num: "10", chinese: "じゅう", native: "とお", nativeKanji: "十" },
];

const TRICKY = [
  { num: "4", opts: ["し", "よん"], use: "よん", reason: "し sounds like 死 (death) — avoid in phone numbers, floors, and most counters." },
  { num: "7", opts: ["しち", "なな"], use: "なな", reason: "しち can sound like いち (1) over the phone. なな is always safer." },
  { num: "9", opts: ["く", "きゅう"], use: "きゅう", reason: "く sounds like 苦 (suffering/pain) — きゅう is preferred in most situations." },
];

function NumbersTab() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return DUAL_NUMBERS;
    const lq = q.toLowerCase();
    return DUAL_NUMBERS.filter((r) =>
      [r.num, r.chinese, r.native].some((s) => s.toLowerCase().includes(lq))
    );
  }, [q]);

  return (
    <div className="flex flex-col gap-4">
      <SearchBar value={q} onChange={setQ} />

      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-wider mb-2">Two Counting Systems</p>
        <div className="overflow-x-auto rounded-2xl border border-natural-border">
          <table className="w-full border-collapse">
            <TableHeader cols={["Number", "Chinese-origin (音読み)", "Native Japanese (和語)", "Kanji"]} />
            <tbody>
              {filtered.map((row, i) => (
                <TableRow
                  key={row.num}
                  idx={i}
                  speakText={row.native}
                  cells={[
                    <span className="font-mono text-natural-forest font-bold">{row.num}</span>,
                    <span className="font-serif text-base text-natural-charcoal">{row.chinese}</span>,
                    <span className="font-serif text-base text-natural-charcoal">{row.native}</span>,
                    <span className="font-serif text-base text-natural-charcoal">{row.nativeKanji}</span>,
                  ]}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-wider mb-2">The Tricky Numbers — Two Readings Each</p>
        <div className="flex flex-col gap-2">
          {TRICKY.map((t) => (
            <div key={t.num} className="bg-natural-card border border-natural-border rounded-2xl p-3 flex gap-3 items-start">
              <span className="font-serif text-3xl text-natural-forest font-bold shrink-0 w-8 text-center">{t.num}</span>
              <div className="flex flex-col gap-1 flex-grow">
                <div className="flex gap-2 items-center">
                  {t.opts.map((o, i) => (
                    <React.Fragment key={o}>
                      <span className={`font-serif text-lg font-bold ${o === t.use ? "text-natural-forest" : "text-natural-charcoal/40 line-through"}`}>
                        {o}
                      </span>
                      {i === 0 && <span className="text-natural-charcoal/30 text-xs">vs</span>}
                    </React.Fragment>
                  ))}
                  <span className="ml-auto text-[10px] bg-natural-forest/10 text-natural-forest rounded-full px-2 py-0.5 font-mono">prefer {t.use}</span>
                  <SpeakButton text={t.use} />
                </div>
                <p className="text-xs text-natural-charcoal/70 font-sans">{t.reason}</p>
              </div>
            </div>
          ))}
        </div>
        <CalloutBox type="tip">
          <strong>Phone number rule:</strong> Japanese phone numbers always use <span className="font-serif">よん (4)</span> and <span className="font-serif">なな (7)</span> to avoid confusion.
        </CalloutBox>
      </div>

      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-wider mb-2">Large Numbers</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[["百", "ひゃく", "100"], ["千", "せん", "1,000"], ["万", "まん", "10,000"], ["億", "おく", "100,000,000"]].map(([k, r, n]) => (
            <div key={k} className="bg-natural-card border border-natural-border rounded-xl p-3 text-center">
              <span className="font-serif text-2xl text-natural-forest font-bold block">{k}</span>
              <span className="font-serif text-sm text-natural-charcoal block">{r}</span>
              <span className="font-mono text-[10px] text-natural-charcoal/50 block">{n}</span>
              <SpeakButton text={r} />
            </div>
          ))}
        </div>
        <CalloutBox type="warning">
          <strong>Important:</strong> Japanese groups large numbers by <strong>10,000 (万)</strong>, not 1,000 like English. So 100,000 = 十万 (じゅうまん), not 百千.
        </CalloutBox>
      </div>
    </div>
  );
}

// ─── TAB: TIME ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { kanji: "月曜日", reading: "げつようび", english: "Monday", memory: "月=moon" },
  { kanji: "火曜日", reading: "かようび", english: "Tuesday", memory: "火=fire" },
  { kanji: "水曜日", reading: "すいようび", english: "Wednesday", memory: "水=water" },
  { kanji: "木曜日", reading: "もくようび", english: "Thursday", memory: "木=wood/tree" },
  { kanji: "金曜日", reading: "きんようび", english: "Friday", memory: "金=gold/metal" },
  { kanji: "土曜日", reading: "どようび", english: "Saturday", memory: "土=earth/soil" },
  { kanji: "日曜日", reading: "にちようび", english: "Sunday", memory: "日=sun" },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  num: i + 1,
  kanji: `${i + 1}月`,
  reading: ["いちがつ","にがつ","さんがつ","しがつ","ごがつ","ろくがつ","しちがつ","はちがつ","くがつ","じゅうがつ","じゅういちがつ","じゅうにがつ"][i],
  english: ["January","February","March","April","May","June","July","August","September","October","November","December"][i],
}));

const DAYS_OF_MONTH = [
  { day: "1日", reading: "ついたち", note: "★ irregular" },
  { day: "2日", reading: "ふつか", note: "★ irregular" },
  { day: "3日", reading: "みっか", note: "★ irregular" },
  { day: "4日", reading: "よっか", note: "★ irregular" },
  { day: "5日", reading: "いつか", note: "★ irregular" },
  { day: "6日", reading: "むいか", note: "★ irregular" },
  { day: "7日", reading: "なのか", note: "★ irregular" },
  { day: "8日", reading: "ようか", note: "★ irregular" },
  { day: "9日", reading: "ここのか", note: "★ irregular" },
  { day: "10日", reading: "とおか", note: "★ irregular" },
  { day: "11日", reading: "じゅういちにち", note: "" },
  { day: "14日", reading: "じゅうよっか", note: "★ irregular" },
  { day: "15日", reading: "じゅうごにち", note: "" },
  { day: "20日", reading: "はつか", note: "★ irregular" },
  { day: "21日", reading: "にじゅういちにち", note: "" },
  { day: "24日", reading: "にじゅうよっか", note: "★ irregular" },
  { day: "31日", reading: "さんじゅういちにち", note: "" },
];

const MINUTES = [
  { min: "1分", reading: "いっぷん", change: true },
  { min: "2分", reading: "にふん", change: false },
  { min: "3分", reading: "さんぷん", change: true },
  { min: "4分", reading: "よんぷん", change: true },
  { min: "5分", reading: "ごふん", change: false },
  { min: "6分", reading: "ろっぷん", change: true },
  { min: "7分", reading: "ななふん", change: false },
  { min: "8分", reading: "はっぷん", change: true },
  { min: "9分", reading: "きゅうふん", change: false },
  { min: "10分", reading: "じゅっぷん", change: true },
];

function TimeTab() {
  const [q, setQ] = useState("");
  return (
    <div className="flex flex-col gap-5">
      <SearchBar value={q} onChange={setQ} />

      {/* Days of Week */}
      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-wider mb-2">Days of the Week (曜日)</p>
        <div className="overflow-x-auto rounded-2xl border border-natural-border">
          <table className="w-full border-collapse">
            <TableHeader cols={["Kanji", "Reading", "English", "Memory tip"]} />
            <tbody>
              {DAYS_OF_WEEK.filter(r => !q || [r.kanji, r.reading, r.english].some(s => s.toLowerCase().includes(q.toLowerCase()))).map((row, i) => (
                <TableRow key={row.kanji} idx={i} speakText={row.reading}
                  cells={[
                    <span className="font-serif text-base text-natural-forest font-bold">{row.kanji}</span>,
                    <span className="font-serif text-natural-charcoal">{row.reading}</span>,
                    <span>{row.english}</span>,
                    <span className="text-natural-charcoal/50 italic text-[11px]">{row.memory}</span>,
                  ]}
                />
              ))}
            </tbody>
          </table>
        </div>
        <CalloutBox type="tip">月=moon=Monday, 日=sun=Sunday — the two anchors that make the rest easier to remember.</CalloutBox>
      </div>

      {/* Months */}
      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-wider mb-2">Months (月)</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {MONTHS.filter(r => !q || [r.kanji, r.reading, r.english].some(s => s.toLowerCase().includes(q.toLowerCase()))).map((m) => (
            <div key={m.num} className="bg-natural-card border border-natural-border rounded-xl p-2 text-center">
              <span className="font-serif text-lg text-natural-forest font-bold block">{m.kanji}</span>
              <span className="font-serif text-xs text-natural-charcoal block">{m.reading}</span>
              <span className="font-sans text-[10px] text-natural-charcoal/50 block">{m.english}</span>
              <SpeakButton text={m.reading} />
            </div>
          ))}
        </div>
        <CalloutBox type="tip">No special names — just number + 月 (がつ). Easy!</CalloutBox>
      </div>

      {/* Days of month */}
      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-wider mb-2">Days of the Month (日) — The Tricky Ones ★</p>
        <div className="overflow-x-auto rounded-2xl border border-natural-border">
          <table className="w-full border-collapse">
            <TableHeader cols={["Day", "Reading", "Type"]} />
            <tbody>
              {DAYS_OF_MONTH.filter(r => !q || [r.day, r.reading].some(s => s.toLowerCase().includes(q.toLowerCase()))).map((row, i) => (
                <TableRow key={row.day} idx={i} speakText={row.reading}
                  cells={[
                    <span className="font-serif text-base text-natural-forest font-bold">{row.day}</span>,
                    <span className="font-serif text-natural-charcoal">{row.reading}</span>,
                    <span className={row.note ? "text-natural-clay text-[11px] font-medium" : "text-natural-charcoal/30 text-[11px]"}>{row.note || "regular (number + にち)"}</span>,
                  ]}
                />
              ))}
            </tbody>
          </table>
        </div>
        <CalloutBox type="warning">Days 1–10, 14, 20, and 24 are all irregular. Memorise these — the rest follow number + にち.</CalloutBox>
      </div>

      {/* Minutes */}
      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-wider mb-2">Minutes (分) — ふん vs ぷん sound changes</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {MINUTES.map((m) => (
            <div key={m.min} className={`border rounded-xl p-2 text-center ${m.change ? "bg-natural-clay/8 border-natural-clay/20" : "bg-natural-card border-natural-border"}`}>
              <span className="font-serif text-base text-natural-forest font-bold block">{m.min}</span>
              <span className="font-serif text-xs text-natural-charcoal block">{m.reading}</span>
              {m.change && <span className="text-[9px] text-natural-clay font-mono block">sound change</span>}
              <SpeakButton text={m.reading} />
            </div>
          ))}
        </div>

        <div className="mt-3">
          <p className="text-[10px] font-mono text-natural-forest uppercase tracking-wider mb-2">Irregular Hours (時)</p>
          <div className="flex gap-2 flex-wrap">
            {[["4時", "よじ"], ["7時", "しちじ"], ["9時", "くじ"]].map(([k, r]) => (
              <div key={k} className="bg-natural-clay/8 border border-natural-clay/20 rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="font-serif text-base text-natural-forest font-bold">{k}</span>
                <span className="font-serif text-sm text-natural-charcoal">{r}</span>
                <SpeakButton text={r} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: VERB GROUPS ─────────────────────────────────────────────────────────

const G1_VERBS = [
  { dict: "書く", reading: "かく", te: "かいて", masu: "かきます", meaning: "to write" },
  { dict: "飲む", reading: "のむ", te: "のんで", masu: "のみます", meaning: "to drink" },
  { dict: "話す", reading: "はなす", te: "はなして", masu: "はなします", meaning: "to speak" },
  { dict: "聞く", reading: "きく", te: "きいて", masu: "ききます", meaning: "to listen" },
  { dict: "読む", reading: "よむ", te: "よんで", masu: "よみます", meaning: "to read" },
  { dict: "行く", reading: "いく", te: "いって ⚡", masu: "いきます", meaning: "to go (★ irregular て-form!)" },
  { dict: "買う", reading: "かう", te: "かって", masu: "かいます", meaning: "to buy" },
  { dict: "待つ", reading: "まつ", te: "まって", masu: "まちます", meaning: "to wait" },
  { dict: "帰る", reading: "かえる", te: "かえって", masu: "かえります", meaning: "to return home ⚠️ Group 1!" },
];

const G2_VERBS = [
  { dict: "食べる", reading: "たべる", te: "たべて", masu: "たべます", meaning: "to eat" },
  { dict: "見る", reading: "みる", te: "みて", masu: "みます", meaning: "to see/watch" },
  { dict: "起きる", reading: "おきる", te: "おきて", masu: "おきます", meaning: "to wake up" },
  { dict: "寝る", reading: "ねる", te: "ねて", masu: "ねます", meaning: "to sleep" },
  { dict: "着る", reading: "きる", te: "きて", masu: "きます", meaning: "to wear (upper body) ⚠️" },
  { dict: "開ける", reading: "あける", te: "あけて", masu: "あけます", meaning: "to open" },
  { dict: "教える", reading: "おしえる", te: "おしえて", masu: "おしえます", meaning: "to teach" },
];

function VerbsTab() {
  const [q, setQ] = useState("");
  const filterVerb = (verbs: typeof G1_VERBS) =>
    !q ? verbs : verbs.filter(r => [r.dict, r.reading, r.te, r.masu, r.meaning].some(s => s.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="flex flex-col gap-5">
      <SearchBar value={q} onChange={setQ} />
      <CalloutBox type="tip">
        <strong>Quick rule:</strong> If the verb ends in -る AND the vowel before る is e/i sound → likely Group 2. Otherwise → Group 1. When in doubt, check a dictionary!
      </CalloutBox>

      {/* Group 1 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-natural-forest/10 text-natural-forest text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">Group 1 — う-verbs (Godan)</span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-natural-border">
          <table className="w-full border-collapse">
            <TableHeader cols={["Dictionary", "Reading", "て-form", "ます-form", "Meaning"]} />
            <tbody>
              {filterVerb(G1_VERBS).map((row, i) => (
                <TableRow key={row.dict} idx={i} speakText={row.reading}
                  cells={[
                    <span className="font-serif text-base text-natural-forest font-bold">{row.dict}</span>,
                    <span className="font-serif text-natural-charcoal">{row.reading}</span>,
                    <span className="font-serif text-natural-charcoal">{row.te}</span>,
                    <span className="font-serif text-natural-charcoal">{row.masu}</span>,
                    <span className={row.meaning.includes("⚠️") || row.meaning.includes("★") ? "text-natural-clay text-[11px]" : "text-[11px]"}>{row.meaning}</span>,
                  ]}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Group 2 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-natural-clay/10 text-natural-clay text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">Group 2 — る-verbs (Ichidan)</span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-natural-border">
          <table className="w-full border-collapse">
            <TableHeader cols={["Dictionary", "Reading", "て-form", "ます-form", "Meaning"]} />
            <tbody>
              {filterVerb(G2_VERBS).map((row, i) => (
                <TableRow key={row.dict} idx={i} speakText={row.reading}
                  cells={[
                    <span className="font-serif text-base text-natural-forest font-bold">{row.dict}</span>,
                    <span className="font-serif text-natural-charcoal">{row.reading}</span>,
                    <span className="font-serif text-natural-charcoal">{row.te}</span>,
                    <span className="font-serif text-natural-charcoal">{row.masu}</span>,
                    <span className="text-[11px]">{row.meaning}</span>,
                  ]}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Group 3 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-natural-terracotta/10 text-natural-terracotta text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">Group 3 — Irregular (Only 2!)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { dict: "する", te: "して", masu: "します", meaning: "to do" },
            { dict: "くる (来る)", te: "きて", masu: "きます", meaning: "to come" },
          ].map((v) => (
            <div key={v.dict} className="bg-natural-card border border-natural-border rounded-2xl p-3 flex items-center gap-3">
              <span className="font-serif text-2xl text-natural-forest font-bold">{v.dict}</span>
              <div className="flex flex-col gap-0.5 text-xs font-sans">
                <span className="font-serif text-natural-charcoal">て: <strong>{v.te}</strong></span>
                <span className="font-serif text-natural-charcoal">ます: <strong>{v.masu}</strong></span>
                <span className="text-natural-charcoal/60">{v.meaning}</span>
              </div>
              <SpeakButton text={v.dict.split(" ")[0]} />
            </div>
          ))}
        </div>
      </div>

      <CalloutBox type="warning">
        These <em>look</em> like る-verbs but are Group 1 — memorise them!
        <br />
        <span className="font-serif">帰る (かえる)</span> to return home ·{" "}
        <span className="font-serif">切る (きる)</span> to cut ·{" "}
        <span className="font-serif">知る (しる)</span> to know ·{" "}
        <span className="font-serif">入る (はいる)</span> to enter
      </CalloutBox>
    </div>
  );
}

// ─── TAB: ADJECTIVES ──────────────────────────────────────────────────────────

const I_ADJ = [
  { dict: "大きい", reading: "おおきい", neg: "大きくない", past: "大きかった", pastNeg: "大きくなかった", noun: "大きい+N", meaning: "big" },
  { dict: "小さい", reading: "ちいさい", neg: "小さくない", past: "小さかった", pastNeg: "小さくなかった", noun: "小さい+N", meaning: "small" },
  { dict: "高い", reading: "たかい", neg: "高くない", past: "高かった", pastNeg: "高くなかった", noun: "高い+N", meaning: "tall/expensive" },
  { dict: "安い", reading: "やすい", neg: "安くない", past: "安かった", pastNeg: "安くなかった", noun: "安い+N", meaning: "cheap" },
  { dict: "新しい", reading: "あたらしい", neg: "新しくない", past: "新しかった", pastNeg: "新しくなかった", noun: "新しい+N", meaning: "new" },
  { dict: "古い", reading: "ふるい", neg: "古くない", past: "古かった", pastNeg: "古くなかった", noun: "古い+N", meaning: "old (thing)" },
  { dict: "いい / 良い", reading: "いい / よい", neg: "よくない ⚡", past: "よかった ⚡", pastNeg: "よくなかった ⚡", noun: "いい+N", meaning: "good (★ special!)" },
  { dict: "難しい", reading: "むずかしい", neg: "難しくない", past: "難しかった", pastNeg: "難しくなかった", noun: "難しい+N", meaning: "difficult" },
];

const NA_ADJ = [
  { dict: "静か", reading: "しずか", neg: "静かじゃない", past: "静かだった", pastNeg: "静かじゃなかった", noun: "静かな+N", meaning: "quiet" },
  { dict: "元気", reading: "げんき", neg: "元気じゃない", past: "元気だった", pastNeg: "元気じゃなかった", noun: "元気な+N", meaning: "healthy/energetic" },
  { dict: "便利", reading: "べんり", neg: "便利じゃない", past: "便利だった", pastNeg: "便利じゃなかった", noun: "便利な+N", meaning: "convenient" },
  { dict: "有名", reading: "ゆうめい", neg: "有名じゃない", past: "有名だった", pastNeg: "有名じゃなかった", noun: "有名な+N", meaning: "famous" },
  { dict: "好き", reading: "すき", neg: "好きじゃない", past: "好きだった", pastNeg: "好きじゃなかった", noun: "好きな+N", meaning: "liked/favourite" },
  { dict: "嫌い", reading: "きらい", neg: "嫌いじゃない", past: "嫌いだった", pastNeg: "嫌いじゃなかった", noun: "嫌いな+N", meaning: "disliked" },
];

function AdjectivesTab() {
  const [q, setQ] = useState("");
  const filterAdj = (adjs: typeof I_ADJ) =>
    !q ? adjs : adjs.filter(r => [r.dict, r.reading, r.meaning].some(s => s.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="flex flex-col gap-5">
      <SearchBar value={q} onChange={setQ} />

      {/* い-adj */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-natural-forest/10 text-natural-forest text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">い-Adjectives — conjugation by replacing い</span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-natural-border">
          <table className="w-full border-collapse">
            <TableHeader cols={["Adjective", "Reading", "Negative", "Past", "Past Neg.", "Before noun", "Meaning"]} />
            <tbody>
              {filterAdj(I_ADJ).map((row, i) => (
                <TableRow key={row.dict} idx={i} speakText={row.reading}
                  cells={[
                    <span className="font-serif text-base text-natural-forest font-bold">{row.dict}</span>,
                    <span className="font-serif text-xs">{row.reading}</span>,
                    <span className="font-serif text-xs">{row.neg}</span>,
                    <span className="font-serif text-xs">{row.past}</span>,
                    <span className="font-serif text-xs">{row.pastNeg}</span>,
                    <span className="font-serif text-xs">{row.noun}</span>,
                    <span className="text-[11px] text-natural-charcoal/70">{row.meaning}</span>,
                  ]}
                />
              ))}
            </tbody>
          </table>
        </div>
        <CalloutBox type="zap">
          <strong>いい is special!</strong> In ALL conjugated forms, use よ instead of い: よくない、よかった、よくなかった. Only the dictionary form uses いい.
        </CalloutBox>
      </div>

      {/* な-adj */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-natural-clay/10 text-natural-clay text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">な-Adjectives — add な before nouns</span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-natural-border">
          <table className="w-full border-collapse">
            <TableHeader cols={["Adjective", "Reading", "Negative", "Past", "Past Neg.", "Before noun", "Meaning"]} />
            <tbody>
              {filterAdj(NA_ADJ).map((row, i) => (
                <TableRow key={row.dict} idx={i} speakText={row.reading}
                  cells={[
                    <span className="font-serif text-base text-natural-forest font-bold">{row.dict}</span>,
                    <span className="font-serif text-xs">{row.reading}</span>,
                    <span className="font-serif text-xs">{row.neg}</span>,
                    <span className="font-serif text-xs">{row.past}</span>,
                    <span className="font-serif text-xs">{row.pastNeg}</span>,
                    <span className="font-serif text-xs text-natural-clay">{row.noun}</span>,
                    <span className="text-[11px] text-natural-charcoal/70">{row.meaning}</span>,
                  ]}
                />
              ))}
            </tbody>
          </table>
        </div>
        <CalloutBox type="warning">
          These <em>end in い</em> but are actually な-adjectives — a very common mistake!
          <br />
          <span className="font-serif">きれい(な)</span> pretty · <span className="font-serif">嫌い(な)</span> disliked · <span className="font-serif">有名(な)</span> famous · <span className="font-serif">親切(な)</span> kind
        </CalloutBox>
      </div>
    </div>
  );
}

// ─── TAB: PARTICLES ───────────────────────────────────────────────────────────

const PARTICLES = [
  {
    particle: "は",
    reading: "wa",
    core: "Topic marker",
    example: "私は学生です。",
    exReading: "わたしは がくせいです",
    exMeaning: "I am a student. (As for me, I'm a student.)",
    mistake: "は marks the topic being discussed, not always the subject doing the action.",
  },
  {
    particle: "が",
    reading: "ga",
    core: "Subject marker",
    example: "猫が好きです。",
    exReading: "ねこが すきです",
    exMeaning: "I like cats. (Cats are liked.)",
    mistake: "Use が when identifying WHO does something, or with 好き/嫌い/できる/わかる/ある/いる.",
  },
  {
    particle: "を",
    reading: "wo",
    core: "Direct object marker",
    example: "ご飯を食べます。",
    exReading: "ごはんを たべます",
    exMeaning: "I eat rice.",
    mistake: "Always follows the thing being acted upon.",
  },
  {
    particle: "に",
    reading: "ni",
    core: "Direction / time / location of existence",
    example: "学校に行きます。3時に来ます。",
    exReading: "がっこうに いきます。さんじに きます。",
    exMeaning: "I go to school. / I come at 3 o'clock.",
    mistake: "に = destination of movement OR specific time. Not for action locations.",
  },
  {
    particle: "で",
    reading: "de",
    core: "Location of action / means/tool",
    example: "学校で勉強します。バスで行きます。",
    exReading: "がっこうで べんきょうします。バスで いきます。",
    exMeaning: "I study AT school. / I go BY bus.",
    mistake: "で = where something happens (not where something exists). Also marks the tool/means used.",
  },
  {
    particle: "へ",
    reading: "e",
    core: "Direction (softer than に)",
    example: "東京へ行きます。",
    exReading: "とうきょうへ いきます",
    exMeaning: "I go toward Tokyo.",
    mistake: "へ emphasises direction/journey. に emphasises arrival. Often interchangeable for movement.",
  },
  {
    particle: "の",
    reading: "no",
    core: "Possession / linking nouns",
    example: "私の本です。",
    exReading: "わたしの ほんです",
    exMeaning: "It's my book.",
    mistake: "の connects two nouns. The first describes/owns the second.",
  },
  {
    particle: "と",
    reading: "to",
    core: "And (exhaustive) / together with",
    example: "友達と行きます。",
    exReading: "ともだちと いきます",
    exMeaning: "I go with a friend.",
    mistake: "と = and (listing all items) or doing something WITH someone.",
  },
  {
    particle: "も",
    reading: "mo",
    core: "Also / too / either",
    example: "私も学生です。",
    exReading: "わたしも がくせいです",
    exMeaning: "I am also a student.",
    mistake: "も replaces は, が, or を. Never use は/が/を + も together.",
  },
  {
    particle: "から",
    reading: "kara",
    core: "From / because",
    example: "東京から来ました。",
    exReading: "とうきょうから きました",
    exMeaning: "I came from Tokyo.",
    mistake: "から = starting point (place/time) or reason/cause.",
  },
  {
    particle: "まで",
    reading: "made",
    core: "Until / up to",
    example: "5時まで働きます。",
    exReading: "ごじまで はたらきます",
    exMeaning: "I work until 5 o'clock.",
    mistake: "Often paired with から: 〜から〜まで = from 〜 to 〜.",
  },
];

function ParticlesTab() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return PARTICLES;
    const lq = q.toLowerCase();
    return PARTICLES.filter(r =>
      [r.particle, r.reading, r.core, r.example, r.exMeaning, r.mistake].some(s => s.toLowerCase().includes(lq))
    );
  }, [q]);

  return (
    <div className="flex flex-col gap-3">
      <SearchBar value={q} onChange={setQ} />
      <CalloutBox type="tip">
        <strong>は vs が</strong> — the most asked question in Japanese.
        は = "speaking of X..." (topic). が = "X is the one who..." (subject/identifier).
        Example: <span className="font-serif">私は猫が好きです</span> — "As for me, cats are what I like."
      </CalloutBox>
      <div className="flex flex-col gap-2">
        {filtered.map((p) => (
          <div key={p.particle} className="bg-natural-card border border-natural-border rounded-2xl p-3.5 flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center shrink-0">
                <span className="font-serif text-2xl text-natural-forest font-bold leading-none">{p.particle}</span>
                <span className="font-mono text-[9px] text-natural-forest/50 mt-0.5">({p.reading})</span>
                <SpeakButton text={p.particle} />
              </div>
              <div className="flex flex-col gap-1 flex-grow min-w-0">
                <span className="text-[10px] font-mono text-natural-forest/70 uppercase tracking-wider">{p.core}</span>
                <div className="bg-natural-bg/60 rounded-xl px-3 py-2 border border-natural-border/50">
                  <span className="font-serif text-sm text-natural-charcoal font-medium block">{p.example}</span>
                  <span className="font-sans text-[10px] text-natural-charcoal/50 block">{p.exReading}</span>
                  <span className="font-sans text-[11px] text-natural-charcoal/70 block italic">{p.exMeaning}</span>
                </div>
                <p className="text-[11px] text-natural-charcoal/60 font-sans leading-relaxed">{p.mistake}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: "counters", label: "Counters", emoji: "🔢" },
  { id: "numbers", label: "Numbers", emoji: "💯" },
  { id: "time", label: "Time", emoji: "🕐" },
  { id: "verbs", label: "Verb Groups", emoji: "⚡" },
  { id: "adjectives", label: "Adjectives", emoji: "🎨" },
  { id: "particles", label: "Particles", emoji: "🔗" },
];

export default function ReferenceCharts({ onBack }: ReferenceChartsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("counters");

  const renderTab = () => {
    switch (activeTab) {
      case "counters": return <CountersTab />;
      case "numbers": return <NumbersTab />;
      case "time": return <TimeTab />;
      case "verbs": return <VerbsTab />;
      case "adjectives": return <AdjectivesTab />;
      case "particles": return <ParticlesTab />;
    }
  };

  return (
    <div className="min-h-screen bg-natural-bg flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-natural-bg/95 backdrop-blur-sm border-b border-natural-border px-4 pt-4 pb-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-mono text-natural-forest/70 hover:text-natural-forest transition px-2 py-1.5 rounded-lg hover:bg-natural-forest/8 border border-transparent hover:border-natural-border"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to Room
            </button>
            <div className="flex flex-col">
              <h1 className="font-serif font-extrabold text-base text-natural-charcoal leading-tight">Reference Charts</h1>
              <p className="text-[10px] font-mono text-natural-forest/60 uppercase tracking-wider">Grammar tables & quick reference</p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition shrink-0 border ${
                  activeTab === tab.id
                    ? "bg-natural-forest text-natural-bg border-natural-forest"
                    : "bg-natural-card text-natural-charcoal border-natural-border hover:border-natural-forest/30"
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow px-4 py-4 max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="py-3 text-center">
        <span className="text-[9px] font-mono text-natural-forest/30 uppercase tracking-widest">
          Click 🔊 to hear pronunciation · Tap any tab to explore
        </span>
      </div>
    </div>
  );
}
