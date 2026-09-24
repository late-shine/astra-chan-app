# Kanji Panel — Visual Roles & Regression Baseline (Phase A1)

Scope: the kanji study screen (`KanjiScrollScreen`), the word-family modal
(`KanjiWordFamilyPanel`), and the drawing workspace (`DrawingCanvas`).
Purpose: keep every later phase (A2–A5, B-series UI work) inside one visual language,
and give reviewers something to compare against.

The roles below describe what the screen **already renders**. They are a vocabulary,
not a redesign. Tokens live in `src/index.css` under
"Kanji Panel Visual Roles (Phase A1)" and are derived only from the existing
`--color-natural-*` variables, so all six themes keep working.

---

## 1. Visual roles

### Surfaces (max two bordered levels)

| Role | Class / token | Used for | Look |
|---|---|---|---|
| Specimen | `.kz-specimen` | The big kanji card only | `card-light` fill, 2px soft border, `rounded-[2rem]` |
| Panel | `.kz-panel` | Memory keys, ink station, canvas frame, modal body | `card` fill, 1px soft border, `rounded-3xl` |
| Inset | `.kz-inset` | A list or well *inside* a panel/specimen (word list, radical equation) | translucent `bg` fill, 1px soft border, `rounded-2xl` |
| Control | (Tailwind) `bg-natural-bg/50 border-natural-border rounded-xl` | Buttons, chips, toggles | — |
| Accent soft | `--kz-surface-accent` + `--kz-border-accent` | Reveal buttons, "Word Family" chip, active states | clay 10% fill, clay 30% border |
| Scrim | `.kz-scrim` | Modal backdrop | black at 60% |

Rule: **panel → inset is the deepest allowed nesting.** Inside an inset, separate items
with hairline dividers (`--kz-border-hairline`), not more boxes.

### Borders

| Token | Value | Use |
|---|---|---|
| `--kz-border-hairline` | border 50% | dividers inside a card |
| `--kz-border-soft` | border 70% | card / inset outlines |
| `--kz-border-strong` | border 100% | controls, the double rule under the specimen |
| `--kz-border-accent` | clay 30% | accent chips only |

### Emphasis (one accent per row)

| Role | Token | Use |
|---|---|---|
| Ink | `--kz-ink` | Kanji, meanings, words |
| Muted | `--kz-ink-muted` | Labels, secondary text |
| Quiet | `--kz-ink-quiet` | Meta only. **This is the lightest text allowed** — do not stack extra `/50`, `/60` opacity on top of muted for anything a learner must read |
| Primary | `--kz-primary` (forest) | Main action, headings |
| Accent | `--kz-accent` (clay) | Study emphasis, onyomi label, recall, progress |
| Secondary | `natural-sage` | Kunyomi label |
| Danger | `--kz-danger` (terracotta) | Errors and destructive actions only |
| On-accent | `.kz-on-accent` | Text on a **solid** clay fill (replaces `text-white`, which failed on the light clays of the dark themes) |

### Spacing and radius (Tailwind steps)

| Role | Step |
|---|---|
| Tight (chips, button rows) | `gap-2` |
| Group (items in a section) | `gap-3` / `gap-4` |
| Section (cards in a column) | `gap-5` |
| Page (left/right columns) | `gap-6` |
| Padding: compact / card / specimen | `p-4` / `p-5` / `p-6 md:p-8` |
| Radius: control / inset / panel / specimen | `rounded-xl` / `rounded-2xl` / `rounded-3xl` / `rounded-[2rem]` |

### Type

| Role | Style |
|---|---|
| Specimen kanji | `font-serif font-black`, `6.5rem` → `8rem` at md |
| Core meaning | `font-serif font-extrabold text-2xl` |
| Reading | `font-serif font-bold text-[15px]` |
| Word | `font-serif font-extrabold` — `text-[15px]` in the card, `text-xl` in the modal |
| Label | `.kz-label` (mono, 10px, caps, tracked) |
| Body / helper | `font-sans text-xs leading-relaxed` |
| Action label | `font-mono text-xs font-extrabold tracking-wider uppercase` |

Japanese text always uses `font-serif` so the global Digital/Written toggle
(`html.font-written`) keeps working. UI text stays on `font-sans`/`font-mono`.

### Limits (apply to every later phase)

1. No nested-card clutter: at most panel → inset (see Surfaces).
2. No new page structure: keep the 3/2 column grid, the two-card left column, and the
   existing right-column workspace + ink station. New content goes *inside* existing panels.
3. No large marketing or instructional copy. One short line of helper text per panel.
4. No decorative animation competing with study content. Allowed: the existing fade/scale
   on card change, a spinner while the AI is working, and animation the learner triggers
   (e.g. stroke playback). Not allowed: looping pulses on idle controls.
5. No new hex/rgb values in the three components, except the canvas **ink palette**
   (pixel data — see `INK_PALETTE` in `DrawingCanvas.tsx`).
6. No text under 10px for anything a learner must read. 9px is tolerated only for badges.
7. Do not add glass-card layers to this screen; it uses the flat natural surfaces above.
8. Preserve: cosmic/study-room atmosphere, cream ink, clay/gold accents, background art,
   Astra-chan's presence.

---

## 2. Regression baseline (to capture)

Screenshots are **not committed yet** — the app could not be run in the environment where
A1 was implemented (no installed dependencies, no network). Capture them before A2 starts
and save under this folder, then update the handoff.

Viewports: `desktop` 1440×900, `tablet` 820×1180, `mobile` 360×800.
Default anchor: the app's default theme, **Digital** font, `生` unless noted.

File naming: `<viewport>/<NN>-<state>.png`

| # | State | How to reach it |
|---|---|---|
| 01 | catalog | Wherever the 146-card catalog renders. (`KanjiScrollScreen` itself only shows one card; locate the catalog screen in the app when capturing.) |
| 02 | study-card | Kanji screen, normal mode |
| 03 | recall-hidden | Press TEST RECALL, nothing revealed |
| 04 | recall-revealed | Recall mode, meaning + readings + one word revealed |
| 05 | canvas-empty | Fresh canvas |
| 06 | ai-loading | Console mock, `MODE = "loading"` |
| 07 | ai-success | Console mock, `MODE = "success"` |
| 08 | ai-invalid | Console mock, `MODE = "invalid"` |
| 09 | ai-error | Console mock, `MODE = "error"` |
| 10 | family-short | `水` → Word Family (2 groups, 4 words) |
| 11 | family-long | `生` → Word Family (6 groups, 6 words) |

Theme + font sweep (desktop only) in `theme-sweep/`: states **02**, **07**, **11** across
`light`, `dark-cosmic`, `dark-emerald`, `dark-maple`, `dark-cyber`, plus the default theme;
and state **02** in the Written font. Name: `<theme>-<font>-<state>.png`.

Also test with long English meanings and a long-reading kanji when spotted, and note them
in the handoff rather than adding screenshots for each.

### Mock the AI response (paste in DevTools console on the kanji screen)

```js
window.__origFetch ??= window.fetch;
const MODE = "success"; // "loading" | "success" | "invalid" | "error"
window.fetch = (url, opts) => {
  if (!String(url).includes("/api/analyze-kanji")) return window.__origFetch(url, opts);
  const reply = (status, body) =>
    new Promise((r) => setTimeout(() => r(new Response(JSON.stringify(body), {
      status, headers: { "Content-Type": "application/json" } })), 400));
  if (MODE === "loading") return new Promise(() => {}); // never resolves -> spinner stays
  if (MODE === "success") return reply(200, { score: 82, validDrawing: true,
    feedbackTitle: "Well balanced", advice: "Nice proportions. Extend the last stroke a little." });
  if (MODE === "invalid") return reply(200, { score: 0, validDrawing: false,
    feedbackTitle: "No ink detected", advice: "Draw inside the grid and try again." });
  return reply(500, { error: "Simulated server error." });
};
```

Draw a few strokes first for 06–09 so the canvas isn't empty.
