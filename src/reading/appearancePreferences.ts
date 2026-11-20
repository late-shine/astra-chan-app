export const studyWindows = ["misty-sakura", "sakura-train", "night-sparkler", "rainy-window"] as const;
export const landscapeWindows = ["forgotten-railway", "morning-lilies", "quiet-afternoon"] as const;
export const readingWindows = ["follow", ...studyWindows, ...landscapeWindows] as const;
export const bookPalettes = ["lamplight", "moss", "moonlight", "amber", "pine", "wisteria", "rose", "graphite", "lagoon"] as const;
export const windowTransitions = ["dissolve", "instant"] as const;

export interface ReadingAppearance {
  readingWindow: typeof readingWindows[number];
  readingPalette: typeof bookPalettes[number];
  readingTransition: typeof windowTransitions[number];
}

export const defaultReadingAppearance: ReadingAppearance = {
  readingWindow: "follow", readingPalette: "lamplight", readingTransition: "dissolve",
};

export function windowScene(choice: ReadingAppearance["readingWindow"], activeScene: number) {
  return choice === "follow" ? studyWindows[activeScene] ?? studyWindows[0] : choice;
}
