import { motion } from "motion/react";
import { Plus, Volume2, X } from "lucide-react";
import { VOCABULARY_DATA } from "../data";
import type { KanjiItem, KanjiWordEntry, SRSCard } from "../types";

interface KanjiWordFamilyPanelProps {
  kanji: KanjiItem;
  onClose: () => void;
  speakJapanese: (phrase: string) => void;
  hasCard: (itemKey: string) => boolean;
  addCard: (itemKey: string, type: SRSCard["type"]) => void;
  showToast: (message: string) => void;
}

const READING_TYPE_LABELS: Record<KanjiWordEntry["readingType"], string> = {
  onyomi: "onyomi",
  kunyomi: "kunyomi",
  "onyomi-variant": "onyomi variant",
  irregular: "irregular",
};

const vocabularyWords = new Set(VOCABULARY_DATA.map((item) => item.word));

export default function KanjiWordFamilyPanel({
  kanji,
  onClose,
  speakJapanese,
  hasCard,
  addCard,
  showToast,
}: KanjiWordFamilyPanelProps) {
  const groupedWords = (kanji.kanjiWords ?? []).reduce<Record<string, KanjiWordEntry[]>>((groups, entry) => {
    if (!groups[entry.kanjiReading]) groups[entry.kanjiReading] = [];
    groups[entry.kanjiReading].push(entry);
    return groups;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-natural-charcoal/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-natural-border bg-natural-card shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-natural-border bg-natural-bg/60 p-5">
          <div className="flex items-center gap-4">
            <span className="font-serif text-6xl font-extrabold leading-none text-natural-forest">
              {kanji.kanji}
            </span>
            <div>
              <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-natural-clay">
                Word Family
              </p>
              <h3 className="font-serif text-2xl font-extrabold text-natural-charcoal">
                {kanji.meaning}
              </h3>
              <p className="mt-1 text-xs font-medium text-natural-forest-light">
                See how this kanji changes sound across real words.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-natural-border bg-natural-card p-2 text-natural-forest-light transition hover:border-natural-forest hover:text-natural-forest cursor-pointer"
            title="Close word family panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-5">
          <div className="flex flex-col gap-5">
            {Object.entries(groupedWords).map(([kanjiReading, entries]) => (
              <section key={kanjiReading} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl border border-natural-clay/30 bg-natural-clay/10 px-3 py-1 font-serif text-lg font-extrabold text-natural-clay">
                    {kanjiReading}
                  </span>
                  <span className="h-px flex-1 bg-natural-border" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-natural-forest-light">
                    {entries.length} word{entries.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {entries.map((entry) => {
                    const inVocabularyData = vocabularyWords.has(entry.word);
                    const isInDeck = hasCard(entry.word);
                    const isRare = entry.commonness === "rare";

                    return (
                      <article
                        key={`${entry.word}-${entry.reading}`}
                        className={`rounded-2xl border border-natural-border bg-natural-bg/70 p-3.5 shadow-sm ${
                          isRare ? "opacity-75" : ""
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-serif text-xl font-extrabold text-natural-charcoal">
                              {entry.word}
                            </h4>
                            <p className="text-xs font-bold text-natural-forest">
                              {entry.reading}
                            </p>
                          </div>
                          <span className="rounded-lg border border-natural-forest/20 bg-natural-forest/10 px-2 py-1 text-[9px] font-mono font-extrabold uppercase tracking-wider text-natural-forest">
                            {READING_TYPE_LABELS[entry.readingType]}
                          </span>
                        </div>

                        <p className="text-sm font-serif font-bold text-natural-charcoal">
                          {entry.meaning}
                        </p>

                        {entry.note && (
                          <p className="mt-2 rounded-xl border border-natural-border/70 bg-natural-card/70 p-2 text-[11px] font-medium leading-relaxed text-natural-charcoal/75">
                            {entry.note}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => speakJapanese(entry.word)}
                            className="rounded-lg border border-natural-border bg-natural-card px-3 py-1.5 text-xs font-mono font-bold text-natural-forest transition hover:border-natural-forest hover:bg-natural-forest/10 cursor-pointer flex items-center gap-1.5"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                            SPEAK
                          </button>

                          {inVocabularyData ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (isInDeck) {
                                  showToast("Already in your Review Deck!");
                                } else {
                                  addCard(entry.word, "vocab");
                                  showToast("Added word to Review Deck!");
                                }
                              }}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                isInDeck
                                  ? "border-natural-clay/40 bg-natural-clay/10 text-natural-clay/70"
                                  : "border-natural-border bg-natural-card text-natural-forest-light hover:border-natural-clay hover:bg-natural-clay/10 hover:text-natural-clay"
                              }`}
                              title={isInDeck ? "Already in Review Deck" : "Add to Review Deck"}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              {isInDeck ? "IN DECK" : "ADD SRS"}
                            </button>
                          ) : (
                            <span className="rounded-lg border border-natural-border bg-natural-card px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-natural-forest-light/70">
                              Not in vocab deck yet
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
