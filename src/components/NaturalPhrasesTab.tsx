import { useMemo, useState } from "react";
import { Filter, Volume2 } from "lucide-react";
import { NATURAL_PHRASES, PHRASE_CATEGORIES, type PhraseRegister } from "../naturalPhrases";

type NaturalPhrasesTabProps = { speakJapanese: (phrase: string) => void };

const REGISTER_STYLES: Record<PhraseRegister, string> = {
  Casual: "bg-natural-forest/10 border-natural-forest/25 text-natural-forest",
  Polite: "bg-natural-clay/10 border-natural-clay/25 text-natural-clay",
  Neutral: "bg-natural-border/30 border-natural-border/50 text-natural-charcoal/70",
  Slang: "bg-purple-400/10 border-purple-400/25 text-purple-700",
};

function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search Japanese, romaji, or meaning..." className="w-full bg-natural-card border-2 border-natural-border rounded-2xl px-4 py-3 text-sm font-sans text-natural-charcoal placeholder:text-natural-charcoal/40 focus:outline-none focus:border-natural-forest transition shadow-sm" />;
}

export default function NaturalPhrasesTab({ speakJapanese }: NaturalPhrasesTabProps) {
  const [query, setQuery] = useState("");
  const [register, setRegister] = useState<PhraseRegister | "All">("All");
  const [category, setCategory] = useState("All");
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return NATURAL_PHRASES.filter((phrase) => {
      const matchesQuery = !normalizedQuery || [phrase.japanese, phrase.romaji, phrase.meaning, phrase.usage, phrase.category].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesQuery && (register === "All" || phrase.register === register) && (category === "All" || phrase.category === category);
    });
  }, [category, query, register]);

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-natural-card border-2 border-natural-border/70 rounded-[2rem] p-5 shadow-xs">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl bg-natural-forest/10 rounded-2xl p-2">💬</span>
          <div><h3 className="font-serif font-black text-lg text-natural-forest">Natural Conversation Phrases</h3><p className="text-xs text-natural-charcoal/70 font-sans leading-relaxed mt-1">Everyday expressions you will hear in real conversations. Start with the register label, then listen for the tone and situation.</p></div>
        </div>
        <SearchBar value={query} onChange={setQuery} />
        <div className="flex flex-wrap items-center gap-2 mt-3"><Filter className="w-3.5 h-3.5 text-natural-forest/60" />{(["All", "Casual", "Polite", "Neutral", "Slang"] as const).map((option) => <button key={option} type="button" onClick={() => setRegister(option)} className={`rounded-full border px-3 py-1.5 text-[10px] font-mono font-bold transition cursor-pointer ${register === option ? "bg-natural-forest text-natural-bg border-natural-forest" : "bg-natural-bg/50 text-natural-charcoal/70 border-natural-border hover:border-natural-forest/50"}`}>{option}</button>)}</div>
        <div className="flex gap-2 overflow-x-auto mt-3 pb-1 scrollbar-hide">{PHRASE_CATEGORIES.map((option) => <button key={option} type="button" onClick={() => setCategory(option)} className={`whitespace-nowrap rounded-xl border px-3 py-1.5 text-[10px] font-mono font-bold transition cursor-pointer ${category === option ? "bg-natural-clay text-natural-bg border-natural-clay" : "bg-natural-bg/50 text-natural-charcoal/70 border-natural-border hover:border-natural-clay/50"}`}>{option}</button>)}</div>
      </div>
      <div className="flex items-center justify-between px-1"><p className="text-[10px] font-mono text-natural-forest uppercase tracking-widest font-bold">{filtered.length} phrases · listen and repeat</p>{query && <button type="button" onClick={() => setQuery("")} className="text-[10px] font-mono text-natural-clay hover:underline cursor-pointer">Clear search</button>}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((phrase) => <article key={phrase.japanese + phrase.romaji} className="bg-natural-card border-2 border-natural-border/70 rounded-[2rem] p-5 shadow-xs hover:border-natural-clay/40 transition flex flex-col gap-3"><div className="flex items-start justify-between gap-3"><div><p className="font-serif text-2xl font-black text-natural-charcoal leading-tight">{phrase.japanese}</p><p className="font-mono text-xs text-natural-forest-light mt-1">{phrase.romaji}</p></div><button type="button" onClick={() => speakJapanese(phrase.japanese)} className="p-2 rounded-xl bg-natural-bg/80 border border-natural-border hover:bg-natural-forest/10 hover:border-natural-forest text-natural-forest transition shrink-0 cursor-pointer" title={`Hear pronunciation: ${phrase.japanese}`} aria-label={`Hear pronunciation: ${phrase.japanese}`}><Volume2 className="w-4 h-4" /></button></div><div className="flex flex-wrap gap-1.5"><span className={`rounded-full border px-2 py-0.5 text-[9px] font-mono font-extrabold uppercase tracking-wide ${REGISTER_STYLES[phrase.register]}`}>{phrase.register}</span><span className="rounded-full border border-natural-border/60 px-2 py-0.5 text-[9px] font-mono font-bold text-natural-charcoal/55">{phrase.category}</span></div><p className="font-sans text-sm font-semibold text-natural-forest">{phrase.meaning}</p><p className="font-sans text-xs text-natural-charcoal/70 leading-relaxed">{phrase.usage}</p>{phrase.dialogue && <div className="bg-natural-bg/50 border border-natural-border/50 rounded-2xl p-3"><span className="text-[9px] font-mono uppercase tracking-widest text-natural-clay font-extrabold block mb-1">In conversation</span><p className="font-serif text-xs font-bold text-natural-charcoal leading-relaxed whitespace-pre-line">{phrase.dialogue}</p>{phrase.dialogueMeaning && <p className="font-sans text-[11px] text-natural-forest/75 italic mt-1 leading-relaxed">{phrase.dialogueMeaning}</p>}</div>}{phrase.caution && <p className="border-t border-natural-border/50 pt-2 font-sans text-[11px] text-natural-clay leading-relaxed"><strong>Note:</strong> {phrase.caution}</p>}</article>)}
      </div>
      {filtered.length === 0 && <div className="bg-natural-card border-2 border-dashed border-natural-border rounded-[2rem] p-8 text-center text-sm text-natural-charcoal/60">No phrases match those filters yet. Try a different search or category.</div>}
    </div>
  );
}
