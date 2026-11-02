import type { VocabCategory, VocabularyItem } from "../types";

export interface VocabCategoryMeta {
  id: VocabCategory;
  emoji: string;
  label: string;
}

export const VOCAB_CATEGORY_META: readonly VocabCategoryMeta[] = [
  { id: "greetings", emoji: "🌸", label: "Greetings & Rituals" },
  { id: "expressions", emoji: "💬", label: "Adverbs, Questions & Pointers" },
  { id: "time", emoji: "⏱️", label: "Time, Calendar & Seasons" },
  { id: "places", emoji: "🏠", label: "Places, Work & Positions" },
  { id: "food", emoji: "🍵", label: "Food & Tea Garden" },
  { id: "people", emoji: "🎎", label: "People, Family & Jobs" },
  { id: "actions", emoji: "🚶", label: "Actions & Core Verbs" },
  { id: "adjectives", emoji: "🎨", label: "Colors & Adjectives" },
  { id: "objects", emoji: "🎒", label: "Objects, Transport & Clothing" },
  { id: "school", emoji: "📚", label: "Language & School Library" },
  { id: "body", emoji: "🩺", label: "Body & Health" },
  { id: "weather", emoji: "⛅", label: "Weather, Nature & Animals" },
];

export function countVocabularyByCategory(
  items: readonly VocabularyItem[]
): Record<VocabCategory, number> {
  const counts: Record<VocabCategory, number> = {
    greetings: 0,
    expressions: 0,
    time: 0,
    places: 0,
    food: 0,
    people: 0,
    actions: 0,
    adjectives: 0,
    objects: 0,
    school: 0,
    body: 0,
    weather: 0,
  };
  for (const item of items) {
    counts[item.category] += 1;
  }
  return counts;
}
