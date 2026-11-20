import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { defaultReadingAppearance, landscapeWindows, windowScene } from "../src/reading/appearancePreferences";
import { completePreferences, sanitizePreferenceValues } from "../src/preferences";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { bookKey, checkpoint, clockText, finishPage, newPage, paragraphsOf, restorePage, storyFor } from "../src/reading/bookmark";
import { getPassageText, readingVocabulary, SEED_READING_PASSAGES as stories } from "../src/reading/readingData";
import { markedWords, sentencesIn } from "../src/reading/margins";
import type { ReadingMissRecord } from "../src/types";

assert.equal(storyFor("retired-story"), stories[0]);
assert.notEqual(bookKey("reader/a"), bookKey("reader%2Fa"));
assert.deepEqual(restorePage("{", 3), newPage());
assert.deepEqual(restorePage('{"paragraph":88,"elapsed":-70,"lastTimes":[null,-1,1234,2345,3456]}', 3),
  { stage: "reading", paragraph: 2, elapsed: 0, lastTimes: [2345, 3456] });
for (const story of stories) {
  const paragraphs = paragraphsOf(story);
  assert.equal(paragraphs.flat().map(token => token.surface).join(""), getPassageText(story));
  for (const paragraph of paragraphs) {
    const sentences = sentencesIn(paragraph);
    assert.deepEqual(sentences.flatMap(s => s.tokens), paragraph);
    for (const sentence of sentences) assert.equal(paragraph[sentence.start], sentence.tokens[0]);
  }
  assert.ok(paragraphs.every(p => p.at(-1)?.surface === "。"));
  for (const token of story.tokens.filter(t => t.addToSrs)) {
    const word = readingVocabulary.get(token.dictKey!);
    assert.ok(word?.word && word.hiragana && word.english);
  }
}

const firstPass = finishPage(newPage());
assert.deepEqual(firstPass.lastTimes, []);
const ticking = { ...newPage(), stage: "timed" as const, lastTimes: [78000] };
const beforeHide = checkpoint(ticking, 4000, 14000);
const afterReload = restorePage(JSON.stringify(beforeHide), 4);
assert.equal(checkpoint(afterReload, null, 2000000).elapsed, 10000);
const result = finishPage(checkpoint(afterReload, 2000000, 2056000));
assert.deepEqual(result.lastTimes, [78000, 66000]);
assert.equal(clockText(result.elapsed), "1:06");
assert.equal(finishPage(result), result);

// The word for station appears twice. Save the second occurrence and revisit the story.
const morning = storyFor("morning-walk");
const tokenIndex = morning.tokens.map(t => t.surface).lastIndexOf("駅");
assert.ok(tokenIndex > morning.tokens.findIndex(t => t.surface === "駅"));
const origin = { storyId: morning.id, tokenIndex };
const record: ReadingMissRecord = { dictKey: "駅", surface: "駅", reading: "えき", meaning: "station", firstSeen: 1, lastSeen: 1, count: 1, origin };
const inDeck = (word: string) => word === "駅";
assert.deepEqual([...markedWords(morning, [record], inDeck)], [morning.tokens[tokenIndex]]);
assert.equal(markedWords(morning, [record], () => false).size, 0);
assert.equal(markedWords(stories[1], [record], inDeck).size, 0);
assert.equal(markedWords(morning, [{ ...record, origin: undefined }], inDeck).size, 0);
assert.equal(markedWords(morning, [{ ...record, origin: { ...origin, tokenIndex: -1 } }], inDeck).size, 0);

const data = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => data.get(key) ?? null } });
const vite = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom" });
try {
  const Reader = (await vite.ssrLoadModule("/src/components/ReadingRoomScreen.tsx")).default;
  const { ReadingWindow } = await vite.ssrLoadModule("/src/components/ReadingWindow.tsx");
  const { studyScene } = await vite.ssrLoadModule("/src/appearance.ts");
  assert.equal(windowScene("follow", 2), "night-sparkler");
  assert.equal(windowScene("rainy-window", 1), "rainy-window");
  assert.equal(completePreferences({}).readingPalette, "lamplight");
  assert.deepEqual(sanitizePreferenceValues({ readingWindow: "rainy-atelier", readingPalette: "bad", readingTransition: "bad" }), {});
  for (const id of landscapeWindows) {
    assert.equal(windowScene(id, 0), windowScene(id, 3));
    const prefs = { readingWindow: id, readingPalette: "moonlight", readingTransition: "instant" };
    assert.deepEqual(sanitizePreferenceValues(JSON.parse(JSON.stringify(prefs))), prefs);
    const scene = studyScene(id);
    for (const size of [scene.desktop, scene.mobile]) {
      for (const candidate of size.srcSet.split(", ")) assert.ok(existsSync("public" + candidate.split(" ")[0]));
    }
    const html = renderToStaticMarkup(createElement(ReadingWindow, { choice: id, transition: "dissolve", activeScene: 0, blur: 0, opacity: "medium" }));
    assert.ok(html.includes(scene.mobile.srcSet) && html.includes(scene.desktop.srcSet));
    assert.equal(html.match(/<picture/g)?.length, 1);
  }
  const owner = "reading-test";
  const key = bookKey(owner);
  const render = () => renderToStaticMarkup(createElement(Reader, { owner, language: "en", hasWord: () => false, appearance: defaultReadingAppearance }));
  assert.match(render(), /<h1[^>]*>ねむいねこ/);
  data.set(key + "/" + morning.id, JSON.stringify(newPage()));
  assert.ok(render().includes('<h1 lang="ja" tabindex="-1">' + morning.titleJa));
  data.delete(key + "/" + morning.id);
  for (const story of stories) {
    data.set(key, story.id);
    assert.match(render(), /Finish reading/);
    assert.ok(render().includes(story.titleJa));
    assert.ok(render().includes(story.tokens.find(token => token.tappable)!.surface));
    if (story.easy) {
      assert.doesNotMatch(getPassageText(story), /\p{Script=Han}/u);
      assert.ok(story.tokens.filter(token => token.surface === "。").length <= 4);
      const progressKey = key + "/" + story.id;
      data.set(progressKey, JSON.stringify(firstPass));
      assert.match(render(), /Check your understanding/);
      data.delete(progressKey);
    }
  }
  const pageKey = key + "/" + stories.at(-1)!.id;
  data.set(pageKey, JSON.stringify(afterReload));
  assert.match(render(), /Reread paused/);
  assert.doesNotMatch(render(), /Previous reread/);
  data.set(pageKey, JSON.stringify(result));
  const finished = render();
  assert.match(finished, /Begin timed reread/);
  assert.match(finished, /1:18/);
  assert.match(finished, /1:06/);
  data.set(key, morning.id);
  assert.doesNotMatch(render(), /1:06/);
  const marked = renderToStaticMarkup(createElement(Reader, { owner, language: "en", hasWord: inDeck, readingNotes: [record], appearance: { ...defaultReadingAppearance, readingPalette: "moonlight" } }));
  assert.match(marked, /data-palette="moonlight"/);
  assert.match(marked, /Reading Room appearance/);
  assert.equal(marked.match(/class="ink-word"/g)?.length, 1);
  assert.match(marked, /aria-label="Talk to Astra"/);
  assert.match(marked, /aria-label="Choose a story"/);
  assert.doesNotMatch(marked, /class="ink-fresh"/);
  console.log(`Reading checks passed: ${stories.length} stories, starter passages and questions, sentence boundaries, exact margin marks, legacy bookmarks and notes, companion control, saved words, recovery and timed rereads.`);
} finally {
  await vite.close();
}
