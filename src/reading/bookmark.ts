import { SEED_READING_PASSAGES, type ReadingPassage, type ReadingToken } from "./readingData";

export type PageState = {
  stage: "reading" | "timed" | "finished";
  paragraph: number;
  elapsed: number;
  lastTimes: number[];
};

export function newPage(): PageState {
  return { stage: "reading", paragraph: 0, elapsed: 0, lastTimes: [] };
}

export function paragraphsOf(passage: ReadingPassage): ReadingToken[][] {
  const paragraphs: ReadingToken[][] = [];
  let current: ReadingToken[] = [];
  let sentences = 0;
  for (const token of passage.tokens) {
    current.push(token);
    if (token.surface === "。" && ++sentences % 2 === 0) {
      paragraphs.push(current);
      current = [];
    }
  }
  if (current.length) paragraphs.push(current);
  return paragraphs;
}

export function storyFor(id: string | null) {
  return SEED_READING_PASSAGES.find(p => p.id === id) ?? SEED_READING_PASSAGES[0];
}

export function bookKey(owner: string) {
  return "astra.reading.v1/" + encodeURIComponent(owner);
}

const validTime = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

export function restorePage(raw: string | null, paragraphCount: number): PageState {
  try {
    const saved = JSON.parse(raw ?? "null");
    if (!saved || typeof saved !== "object") return newPage();
    return {
      stage: saved.stage === "timed" || saved.stage === "finished" ? saved.stage : "reading",
      paragraph: Number.isSafeInteger(saved.paragraph) ? Math.max(0, Math.min(saved.paragraph, paragraphCount - 1)) : 0,
      elapsed: validTime(saved.elapsed) ? saved.elapsed : 0,
      lastTimes: Array.isArray(saved.lastTimes) ? saved.lastTimes.filter(validTime).slice(-2) : [],
    };
  } catch { return newPage(); }
}

export function checkpoint(page: PageState, startedAt: number | null, now: number): PageState {
  if (page.stage !== "timed" || startedAt === null) return page;
  return { ...page, elapsed: page.elapsed + Math.max(0, now - startedAt) };
}

export function finishPage(page: PageState): PageState {
  if (page.stage === "finished") return page;
  return { ...page, stage: "finished", paragraph: 0,
    lastTimes: page.stage === "timed" ? [...page.lastTimes, page.elapsed].slice(-2) : page.lastTimes };
}

export function clockText(ms: number) {
  const seconds = Math.round(ms / 1000);
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}
