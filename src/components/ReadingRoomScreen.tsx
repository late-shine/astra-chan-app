import React, { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, BookmarkPlus, Check, ChevronDown, Clock3, Headphones, LibraryBig, Pause, Play, RotateCcw, X } from "lucide-react";
import { SEED_READING_PASSAGES as stories, getPassageText, type ReadingPassage, type ReadingToken } from "../reading/readingData";
import { bookKey, checkpoint, clockText, finishPage, newPage, paragraphsOf, restorePage, storyFor, type PageState } from "../reading/bookmark";
import { ReadingCompanion } from "./ReadingCompanion";
import { ReadingAppearanceSettings } from "./ReadingAppearanceSettings";
import type { ReadingAppearance } from "../reading/appearancePreferences";
import { markedWords, sentencesIn } from "../reading/margins";
import type { ReadingMissRecord } from "../types";
import lamp from "../reading/lamplighter.svg";
import "../reading/open-book.css";

interface ReaderProps {
  appearance: ReadingAppearance;
  onAppearanceChange: (patch: Partial<ReadingAppearance>) => void;
  owner: string | null;
  language: "en" | "ja";
  onBack: () => void;
  onReviewDeck: () => void;
  readingNotes?: ReadingMissRecord[];
  onSaveWord: (word: ReadingToken, origin: NonNullable<ReadingMissRecord["origin"]>) => boolean;
  hasWord: (key: string) => boolean;
  speakJapanese: (text: string, onEnd?: () => void) => void;
  stopSpeech: () => void;
}

function readLocal(key: string | null) {
  try { return key ? localStorage.getItem(key) : null; } catch { return null; }
}

function writeLocal(key: string | null, value: string) {
  if (!key) return false;
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

const marginNotes: Record<string, [string, string]> = {
  "sleepy-cat": ["I was about to turn that page…", "あ、そのページ、めくろうと思ってたのに……。"],
  "two-apples": ["That one’s for me? I’ll sit beside you.", "それ、私の？ じゃあ、となりに座るね。"],
  "one-umbrella": ["Come a little closer. There’s room under here.", "もう少しこっちへ。ここならぬれないよ。"],
  "morning-walk": ["I can almost hear the birds on the walk to the station.", "駅へ向かう道の鳥の声が聞こえてきそう。"],
  "library-book": ["I wonder which book we’ll take home today.", "今日はどの本を持って帰ろうかな。"],
  "weather-and-tea": ["Rain against the window makes such a good reading companion.", "窓を打つ雨の音を聞きながら、一緒に読もう。"],
  "weekend-food": ["Let’s see what they order. I’m getting hungry already.", "何を注文するのかな。お腹がすいてきたね。"],
  "new-class": ["A first day in a new classroom always feels a little brave.", "初めての教室って、少しどきどきするね。"],
};

const questions: Record<string, [string, string[], string]> = {
  "sleepy-cat": ["ねこはどこでねますか。", ["いすのうえ", "ほんのうえ", "そと"], "ほんのうえ"],
  "two-apples": ["りんごはいくつありますか。", ["ひとつ", "みっつ", "ふたつ"], "ふたつ"],
  "one-umbrella": ["だれがきますか。", ["アストラ", "おとうさん", "せんせい"], "アストラ"],
  "morning-walk": ["主人公は毎朝何時に起きますか？", ["五時", "六時", "七時"], "六時"],
  "library-book": ["いつ図書館へ行きますか？", ["日曜日", "月曜日", "土曜日"], "日曜日"],
  "weather-and-tea": ["今日の天気は何ですか？", ["雪です", "雨です", "晴れです"], "雨です"],
  "weekend-food": ["主人公は何を注文しましたか？", ["天ぷらうどん", "ラーメン", "カレー"], "天ぷらうどん"],
  "new-class": ["クラスには何人の学生が集まりましたか？", ["十人", "十五人", "二十人"], "十五人"],
};

export default function ReadingRoomScreen(props: ReaderProps) {
  const shelf = props.owner ? bookKey(props.owner) : null;
  const [opened, setOpened] = useState(() => {
    // Earlier versions could bookmark the original opening story without writing a shelf selection.
    const legacy = readLocal(shelf && shelf + "/morning-walk") && !readLocal(shelf && shelf + "/" + stories[0].id);
    return { story: storyFor(readLocal(shelf) ?? (legacy ? "morning-walk" : null)), fromShelf: false };
  });
  const choose = (id: string) => {
    const next = storyFor(id);
    writeLocal(shelf, next.id);
    setOpened({ story: next, fromShelf: true });
  };
  const { story, fromShelf } = opened;
  return <Fragment key={story.id}>
    <OpenBook {...props} story={story} fromShelf={fromShelf} choose={choose} storageKey={shelf && shelf + "/" + story.id} />
  </Fragment>;
}

function OpenBook({ story, fromShelf, choose, storageKey, language, onBack, onReviewDeck, onSaveWord, hasWord, readingNotes = [], speakJapanese, stopSpeech, owner, appearance, onAppearanceChange }:
  ReaderProps & { story: ReadingPassage; fromShelf: boolean; choose: (id: string) => void; storageKey: string | null }) {
  const ja = language === "ja";
  const t = (en: string, jp: string) => ja ? jp : en;
  const paragraphs = React.useMemo(() => paragraphsOf(story), [story]);
  const sentences = React.useMemo(() => paragraphs.map(sentencesIn), [paragraphs]);
  const [freshMark, setFreshMark] = useState<ReadingToken | null>(null);
  const [shelfOpen, setShelfOpen] = useState(false);
  const marks = markedWords(story, readingNotes, hasWord);
  const [page, setPage] = useState(() => {
    const saved = restorePage(readLocal(storageKey), paragraphs.length);
    return fromShelf && saved.stage === "finished" ? { ...newPage(), lastTimes: saved.lastTimes } : saved;
  });
  const current = useRef(page);
  const startedAt = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [storageIssue, setStorageIssue] = useState(!storageKey);
  const [selection, select] = useState<{ paragraph: number; index: number } | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const article = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const lastWord = useRef<HTMLButtonElement>(null);
  const lookup = useRef<HTMLDivElement>(null);
  const voice = useRef(0);
  const [listening, setListening] = useState(false);
  const stopRef = useRef(stopSpeech);
  stopRef.current = stopSpeech;

  const commit = useCallback((next: PageState) => {
    current.current = next;
    setPage(next);
    setStorageIssue(!writeLocal(storageKey, JSON.stringify(next)));
  }, [storageKey]);

  const pause = useCallback(() => {
    if (startedAt.current === null) return;
    const saved = checkpoint(current.current, startedAt.current, performance.now());
    startedAt.current = null;
    setRunning(false);
    commit(saved);
  }, [commit]);

  useEffect(() => {
    const hidden = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pause);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pause);
      pause();
      if (voice.current) { voice.current = 0; stopRef.current(); }
    };
  }, [pause]);

  // Persist active time periodically in case the phone kills the tab without a pagehide event.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (startedAt.current === null) return;
      const now = performance.now();
      const next = checkpoint(current.current, startedAt.current, now);
      startedAt.current = now;
      commit(next);
    }, 5000);
    return () => window.clearInterval(id);
  }, [running, commit]);

  useLayoutEffect(() => {
    if (fromShelf) commit(current.current);
    const p = current.current.paragraph;
    if (p && current.current.stage !== "finished") {
      article.current?.querySelector('[data-paragraph="' + p + '"]')?.scrollIntoView({ block: "start" });
    } else if (article.current) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, []);

  useEffect(() => {
    if (page.stage === "finished") return;
    let frame = 0;
    const track = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (current.current.stage === "finished") return;
        const nodes = article.current?.querySelectorAll<HTMLElement>("[data-paragraph]");
        if (!nodes?.length) return;
        const line = window.innerHeight * 0.30;
        let index = 0;
        for (let i = 1; i < nodes.length; i++) {
          if (nodes[i].getBoundingClientRect().top > line) break;
          index = i;
        }
        if (index !== current.current.paragraph) commit({ ...current.current, paragraph: index });
      });
    };
    window.addEventListener("scroll", track, { passive: true });
    return () => { window.removeEventListener("scroll", track); cancelAnimationFrame(frame); };
  }, [page.stage, commit]);

  useEffect(() => {
    if (!selection) return;
    lookup.current?.focus({ preventScroll: true });
    lookup.current?.scrollIntoView({ block: "nearest" });
  }, [selection]);

  const closeLookup = () => { select(null); lastWord.current?.focus(); };
  const stop = () => {
    if (!voice.current) return;
    voice.current = 0;
    setListening(false);
    stopSpeech();
  };
  const listen = () => {
    if (voice.current) { stop(); return; }
    const ticket = performance.now() || 1;
    voice.current = ticket;
    setListening(true);
    speakJapanese(getPassageText(story), () => {
      if (voice.current === ticket) { voice.current = 0; setListening(false); }
    });
  };
  const resume = () => {
    if (document.hidden || startedAt.current !== null || current.current.stage !== "timed") return;
    startedAt.current = performance.now();
    setRunning(true);
  };
  const start = (timed: boolean) => {
    stop();
    setFreshMark(null);
    select(null);
    setAnswer(null);
    commit({ ...newPage(), stage: timed ? "timed" : "reading", lastTimes: current.current.lastTimes });
    if (timed) resume();
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const finish = () => {
    if (current.current.stage === "timed" && startedAt.current === null) return;
    pause();
    stop();
    select(null);
    commit(finishPage(current.current));
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const number = stories.indexOf(story) + 1;
  const finished = page.stage === "finished";
  const timed = page.stage === "timed";
  const [question, choices, correct] = questions[story.id];
  const note = finished ? t("Shall we turn the page, or spend a little longer with this one?", "次の話へ進む？ それとも、もう一度一緒に読む？")
    : timed ? t("I’ll keep the time. You can stay with the story.", "時間は私にまかせて。物語をゆっくり楽しんで。") : marginNotes[story.id][ja ? 1 : 0];
  const selectedWord = selection && paragraphs[selection.paragraph][selection.index];
  const saved = selectedWord?.dictKey && hasWord(selectedWord.dictKey);
  const savedWords = story.tokens.filter((token, index, tokens) => token.dictKey && hasWord(token.dictKey) && tokens.findIndex(other => other.dictKey === token.dictKey) === index);

  return <section className="reading-book" data-palette={appearance.readingPalette} aria-label={t("Astra’s Reading Room", "アストラの読書室")}>
    <header className="book-nav">
      <button onClick={onBack}><ArrowLeft />{t("Study Room", "学習室")}</button>
      <div className="book-masthead"><img src={lamp} alt="" />{t("Astra’s Reading Room", "アストラの読書室")}</div>
      <ReadingAppearanceSettings value={appearance} change={onAppearanceChange} ja={ja} />
    </header>
    <div className="book-spread">
      <div className="book-endpaper">
        <div className="book-frontispiece">
          <ReadingCompanion storyId={story.id} note={note} ja={ja} />
          <nav className="book-index" aria-label={t("Choose a story", "物語を選ぶ")}>
            <h2><LibraryBig />{t("Stories", "目次")}</h2>
            <button className="book-index-toggle" aria-expanded={shelfOpen} aria-controls="story-index" onClick={() => setShelfOpen(!shelfOpen)}>
              <LibraryBig />{t("Stories", "目次")}<ChevronDown />
            </button>
            <ol id="story-index" className={shelfOpen ? "index-open" : ""}>{stories.map((s, i) => <li key={s.id}>
              <button aria-current={s.id === story.id ? "page" : undefined} onClick={() => {
                if (s.id !== story.id) choose(s.id);
                setShelfOpen(false);
              }}>
                <span>{String(i + 1).padStart(2, "0")}</span>{ja ? s.titleJa : s.title}
                {s.easy && <small className="book-easy-label">{t("Easy", "やさしい")}</small>}
              </button>
            </li>)}</ol>
          </nav>
        </div>
      </div>
      <article className="book-page" ref={article}>
        <header className="book-title">
          <div className="book-folio"><span><BookOpen /> {t("Story", "物語")} {String(number).padStart(2, "0")}</span><span>{story.easy ? t("Easy", "やさしい") : "N5"}</span></div>
          <h1 lang="ja" tabIndex={-1} ref={heading}>{story.titleJa}</h1>
          <p lang="en">{story.title}</p>
        </header>
        {finished ? <div className="book-finish">
          <h2>{t("Story finished", "読了")}</h2>
          {page.elapsed > 0 && <p className="book-time"><Clock3 />{clockText(page.elapsed)} <small>{t("this reread", "今回の再読")}</small></p>}
          {page.elapsed > 0 && page.lastTimes.length > 1 && <p>{t("Previous reread of this story", "この物語の前回の記録")} · {clockText(page.lastTimes[0])}</p>}
          <div className="book-actions">
            <button className="book-primary" onClick={() => choose(stories[number % stories.length].id)}>{t("Next story", "次の物語")}<ArrowRight /></button>
            <button onClick={() => start(true)}><Clock3 />{t("Begin timed reread", "時間を測って再読")}</button>
            <button onClick={() => start(false)}><RotateCcw />{t("Read it again", "もう一度読む")}</button>
          </div>
          <details><summary>{t("Check your understanding", "内容を確かめる")}</summary>
            <p lang="ja">{question}</p><div className="book-actions">{choices.map(choice => <button lang="ja" key={choice} aria-pressed={answer === choice} onClick={() => setAnswer(choice)}>{choice}</button>)}</div>
            {answer && <p role="status">{answer === correct ? t("That’s right.", "正解。") : t("The story’s answer is ", "答えは ") + correct + "。"}</p>}
          </details>
        </div> : <>
          <div className="book-instructions">
            <span>{timed ? running ? t("Timed reread", "再読を計測中") : t("Reread paused", "計測を一時停止中") : t("Tap a word for its reading and meaning.", "言葉をタップすると読み方と意味が表示されます。")}</span>
            {timed ? <button onClick={running ? pause : resume}>{running ? <Pause /> : <Play />}{running ? t("Pause", "一時停止") : t("Resume", "再開")}</button>
              : <button onClick={listen}><Headphones />{listening ? t("Stop audio", "音声を停止") : t("Listen", "聞く")}</button>}
          </div>
          <button className="book-skip" onClick={() => document.getElementById("book-finish")?.focus()}>{t("Skip to reading actions", "読了ボタンへ")}</button>
          <div className="book-text">{sentences.map((paragraph, p) => <div key={p} data-paragraph={p}>
            {paragraph.map(sentence => <Fragment key={sentence.start}><p className="book-sentence" lang="ja">
              <span className="ink-margin" aria-hidden="true">{sentence.tokens.map((token, i) => marks.has(token) &&
                <svg key={i} className={freshMark === token ? "ink-fresh" : undefined} viewBox="0 0 24 24" fill="none">
                  <path pathLength="1" d="M3 14 Q8 10 12 3 Q12 9 17 12 L21 13 Q15 13 11 21" />
                  <path pathLength="1" d="M11 21 Q11 15 8 14 L3 14" />
                </svg>)}</span>
              {sentence.tokens.map((token, i) => token.tappable ? <button key={i} className={marks.has(token) ? "ink-word" : undefined}
              aria-label={marks.has(token) ? token.surface + t(", saved word", "、保存済み") : undefined}
              aria-expanded={selection?.paragraph === p && selection.index === sentence.start + i}
              onClick={e => {
                const index = sentence.start + i;
                if (selection?.paragraph === p && selection.index === index) { closeLookup(); return; }
                lastWord.current = e.currentTarget;
                select({ paragraph: p, index });
              }}>{token.surface}</button> : <Fragment key={i}>{token.surface}</Fragment>)}</p>
            {selection?.paragraph === p && selection.index >= sentence.start && selection.index < sentence.start + sentence.tokens.length && selectedWord &&
              <div className="book-gloss" ref={lookup} tabIndex={-1} role="group"
              aria-label={selectedWord.surface + " · " + selectedWord.reading + " · " + selectedWord.meaning}
              onKeyDown={e => { if (e.key === "Escape") closeLookup(); }}>
              <div><strong lang="ja">{selectedWord.surface}</strong> <span lang="ja">{selectedWord.reading}</span><p lang="en">{selectedWord.meaning}</p></div>
              {selectedWord.addToSrs && <button disabled={!!saved || !owner} onClick={() => {
                if (onSaveWord(selectedWord, { storyId: story.id, tokenIndex: story.tokens.indexOf(selectedWord) })) setFreshMark(selectedWord);
              }}>
                {saved ? <Check /> : <BookmarkPlus />}{saved ? t("Saved", "保存済み") : t("Save word", "単語を保存")}</button>}
              <button aria-label={t("Close word help", "閉じる")} onClick={closeLookup}><X /></button>
            </div>}</Fragment>)}
          </div>)}</div>
          <div className="book-end"><button id="book-finish" className="book-primary" onClick={timed && !running ? resume : finish}>
            {timed && !running ? t("Resume reread", "再読を再開") : t("Finish reading", "読み終えた")}<ArrowRight /></button>
            {timed && !running && <button onClick={() => start(false)}>{t("Return to untimed reading", "時間を測らずに読む")}</button>}
          </div>
        </>}
        <footer className="book-notes">
          <details><summary>{t("English translation", "英訳")}</summary><p lang="en">{story.translation}</p></details>
          <details><summary>{t("Saved words", "保存した単語")} · {savedWords.length}</summary>
            {savedWords.length ? <dl>{savedWords.map(word => <div key={word.dictKey}><dt lang="ja">{word.surface} · {word.reading}</dt><dd>{word.meaning}</dd></div>)}</dl> :
              <p>{t("Tap a word in the passage and choose Save word to keep it here.", "本文の言葉をタップして「単語を保存」を選んでください。")}</p>}
            <button onClick={onReviewDeck}>{t("Open Review Deck", "復習デッキへ")}<ArrowRight /></button>
          </details>
        </footer>
        {storageIssue && <p className="book-warning" role="status">{t("Your place can’t be saved on this device right now.", "現在、この端末にしおりを保存できません。")}</p>}
      </article>
    </div>
  </section>;
}
