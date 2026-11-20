import type { ReadingMissRecord } from "../types";
import type { ReadingPassage, ReadingToken } from "./readingData";

export function sentencesIn(paragraph: ReadingToken[]) {
  const sentences: { start: number; tokens: ReadingToken[] }[] = [];
  let start = 0;
  paragraph.forEach((token, i) => {
    if (token.surface === "。" || i === paragraph.length - 1) {
      sentences.push({ start, tokens: paragraph.slice(start, i + 1) });
      start = i + 1;
    }
  });
  return sentences;
}

export function markedWords(story: ReadingPassage, notes: ReadingMissRecord[], hasWord: (key: string) => boolean) {
  const marks = new Set<ReadingToken>();
  for (const note of notes) {
    if (note?.origin?.storyId !== story.id) continue;
    const token = story.tokens[note.origin.tokenIndex];
    if (token?.addToSrs && token.dictKey === note.dictKey && hasWord(note.dictKey)) marks.add(token);
  }
  return marks;
}
