# Quiz studio visual spec (QZ1)

Status: **prototype, awaiting Shine's screenshot approval.** Nothing here is wired to the real quiz yet. The studio is only reachable in development at `?quiz-preview=1` (see "Opening the preview"). Later phases (QZ5+) reuse these components and tokens.

Source of truth for every value below is `src/index.css` (block starting "QUIZ STUDIO (Quiz Remake QZ1)"). If this file and the CSS disagree, the CSS wins; `scripts/quiz-visual-check.ts` re-measures contrast straight from the CSS.

## Opening the preview

Development only: `npm run dev`, then open `/?quiz-preview=1`. It is gated by `import.meta.env.DEV` plus the query string in `src/main.tsx`; a production build drops the branch (verify with `scripts/quiz-bundle-check.ts` after a build). There is no launcher, no setting and no persistence. The only thing it writes is the page URL (`history.replaceState`), so a refresh restores the same fixture and controls.

Useful deep links (append to `/?quiz-preview=1`):

| What | Add |
|---|---|
| Practice, kana | `&fixture=practice&subject=kana` |
| Question, unanswered | `&fixture=question` |
| Correct feedback (auto-next shown, frozen) | `&fixture=correct` |
| Wrong, Why expanded | `&fixture=wrong` (add `&wrong=timeout` for "Time is up") |
| Typed answer, keyboard open | `&fixture=typed` |
| Results (also `&results=perfect`, `&results=repair`) | `&fixture=results` |
| Duel lobby | `&fixture=duel` |
| Customize sheet (also `&pool=small`, `&pool=empty`) | `&fixture=setup` |
| Dark equivalent | `&theme=dark-cosmic` (also `dark`, `dark-emerald`, `dark-maple`, `dark-cyber`) |
| Reduced motion / 200% text / written font | `&reduced=1` / `&text200=1` / `&written=1` |
| Dock stand-in and clearance line | `&dock=quiet\|full\|open\|off` / `&guide=1` |
| Hide the controls button for clean screenshots | `&controls=0` |

The "Preview controls" pill is bottom-left (it sits in the dock-clearance zone, so it never covers an action). Resize the window or use device mode for 320 / 390 / 768 / 1280: breakpoints are real viewport media queries.

## Tokens (approved values)

Scoped to `.quiz-studio`. Light is the base; every dark theme id uses the dark column. The three accent dark themes replace only `--quiz-primary`; on-primary stays dark ink.

| Token | Light | Dark | Note |
|---|---|---|---|
| `--quiz-bg` | `#F7F6F2` | `#101522` | |
| `--quiz-surface` | `#FFFFFF` | `#192133` | |
| `--quiz-surface-muted` | `#EEEFEA` | `#232E43` | |
| `--quiz-ink` | `#182238` | `#F4F6FC` | |
| `--quiz-ink-muted` | `#566176` | `#B8C3D9` | |
| `--quiz-border` | `#D9DFE9` | `#465570` | decorative separators only |
| `--quiz-control-border` | **`#778699`** | `#7C8BA3` | **changed in light, see below** |
| `--quiz-primary` | `#244ED8` | `#9DB6FF` | emerald `#86DEBD`, maple `#FFC099`, cyber `#8CDEEF` |
| `--quiz-on-primary` | `#FFFFFF` | `#101522` | stays dark ink on every dark accent |
| `--quiz-success` / `-soft` | `#176B50` / `#E6F4ED` | `#83D8B7` / `#173A32` | |
| `--quiz-error` / `-soft` | `#A62F45` / `#FBECEE` | `#FFB0BE` / `#442630` | |
| `--quiz-playful` | `#F2C14E` | `#F2C14E` | decorative accent only |
| `--quiz-shadow` | `0 8px 24px rgb(24 34 56 / .08)` | `0 8px 24px rgb(0 0 0 / .35)` | restrained; no glass, glow or gradients |

### Where QZ1 differs from the starting spec

1. **Light `--quiz-control-border` `#7C8BA3` to `#778699`.** The starting value measured **2.99:1** on `--quiz-surface-muted` (just under the 3:1 floor for control boundaries). `#778699` is 3.21:1 on muted, 3.43:1 on bg, 3.71:1 on surface. Dark is unchanged (its lowest is 3.60:1).
2. **Added `--quiz-on-playful` (`#182238` in both palettes).** Dark ink on the yellow is 9.45:1; the dark palette's light `--quiz-ink` on yellow would be 1.55:1, so a dedicated foreground token is required.
3. **Added `--quiz-on-success-soft` / `--quiz-on-error-soft`** (both alias `--quiz-ink`), the explicit feedback-tint foregrounds the packet asks for.
4. **Added `--quiz-selected-fill`** (`color-mix(in srgb, primary 10%, surface)`; `#E9EDFB` light, `#263047` dark) for selected segmented buttons; ink on it is 13.57:1 light, 12.18:1 dark.
5. **Added `--quiz-scrim`, `--quiz-focus`, radius tokens, `--quiz-pad`, `--quiz-dock-footprint`, `--quiz-footer-clearance`.**

## Contrast measured

WCAG 2.x. Normal text needs 4.5:1; large text and meaningful control boundaries or icons need 3:1. Computed from the final token values (hand-calculated in QZ1 with a throwaway script; `scripts/quiz-visual-check.ts` repeats it from the CSS and was **NOT RUN** by the builder).

| Pair | Light | Dark | Needs |
|---|---|---|---|
| ink on bg | 14.66 | 16.86 | 4.5 |
| ink on surface | 15.85 | 14.87 | 4.5 |
| ink on surface-muted | 13.72 | 12.59 | 4.5 |
| ink-muted on bg | 5.77 | 10.28 | 4.5 |
| ink-muted on surface | 6.24 | 9.07 | 4.5 |
| ink-muted on surface-muted | 5.40 | 7.68 | 4.5 |
| primary text on bg | 6.15 | 9.17 | 4.5 |
| primary text on surface | 6.65 | 8.09 | 4.5 |
| on-primary on primary | 6.65 | 9.17 | 4.5 |
| success on success-soft | 5.69 | 7.39 | 4.5 |
| error on error-soft | 5.89 | 7.80 | 4.5 |
| ink on success-soft | 13.99 | 11.52 | 4.5 |
| ink on error-soft | 13.84 | 12.41 | 4.5 |
| ink-muted on success-soft | 5.50 | 7.02 | 4.5 |
| ink-muted on error-soft | 5.45 | 7.57 | 4.5 |
| ink on selected-fill | 13.57 | 12.18 | 4.5 |
| ink-muted on selected-fill | 5.34 | 7.42 | 4.5 |
| on-playful on playful | 9.45 | 9.45 | 4.5 |
| control-border on bg | 3.43 | 5.28 | 3 |
| control-border on surface | 3.71 | 4.65 | 3 |
| control-border on surface-muted | 3.21 | 3.94 | 3 |
| control-border on success-soft | 3.28 | 3.60 | 3 |
| control-border on error-soft | 3.24 | 3.88 | 3 |
| primary border / focus ring on surface | 6.65 | 8.09 | 3 |
| primary focus ring on bg | 6.15 | 9.17 | 3 |
| success border and icon on success-soft | 5.69 | 7.39 | 3 |
| error border and icon on error-soft | 5.89 | 7.80 | 3 |
| icon glyph on success / error disc | 5.69 / 5.89 | 7.39 / 7.80 | 3 |

Result: no pair below its floor in any theme. Lowest: light 3.21:1 (control border on muted), dark and the three accent themes 3.60:1 (control border on success-soft). The accent themes only change primary; their primary-on-bg, primary-on-surface and on-primary pairs were measured too and all clear 4.5:1.

Intentionally **below 3:1 and not relied on**: `--quiz-border` (1.34:1 light, 2.14:1 dark) is decorative separators only; and the yellow accent (1.68:1 on white) is a small decorative chip that never carries meaning or text without `--quiz-on-playful`. Things that must identify a control (answers, inputs, segmented buttons, switches, the Customize button) use `--quiz-control-border`.

## Typography and geometry as implemented

All sizes are in `rem`, so 200% text scales them. Existing fonts only: Inter for UI (`--font-sans`), `--font-serif` for Japanese (Noto Sans JP by default, Klee One when the learner picks the written font), `--font-mono` for progress and the room code. No new dependency.

| Role | Size / line | Notes |
|---|---|---|
| Page title | 28/34, 36/42 from 768 px, 700 | |
| Instruction | 16/24 | |
| Answer text | 17/24 | |
| Feedback / body | 15/23 | |
| Helper / label | 13/18 | no uppercase microtype; nothing under 12 px (dev chrome included) |
| Prompt glyph | 88 px (64 px typed) | vocabulary 36 px, wraps |

Spacing uses 4, 8, 12, 16, 24, 32, 48. Page side padding 16, 32 from 768 px. Radius: card 20, option and primary button 14, chip 8. Borders are 1 px; selected, correct and wrong add a 1 px inset ring (so 2 px visually) without changing layout. Buttons 48 px minimum, answers 56 px, icon controls 44x44. `Why?`, `Listen` and `Pause` are the one deliberate exception: compact text buttons at 44 px, in line with the 44x44 rule for compact controls.

Layout: Practice column max 1040 px, two columns from 960 px (recommendation card left, subjects and challenges right). Player column 760 px, answer grid 680 px. Results column 880 px, summary and missed list in two columns from 960 px. Choices: kana 2 columns always; English meanings 1 column below 640 px and 2 above. Header 52 px minimum (it grows rather than truncates). Prompt stage min-height 176 px (104 px typed).

## Dock clearance (measured)

Measured from `SoundAtmosphereDock.tsx` source, not from a running browser (the builder does not run the app):

- The dock wrapper is `fixed z-30` with `right: max(0.75rem, env(safe-area-inset-right))` and `bottom: calc(0.75rem + env(safe-area-inset-bottom))`.
- A launcher is `w-11 h-11` = 2.75rem (44 px at a 16 px root). Closed and normal: music plus palette launchers side by side (about 96 px wide). Quiet: one launcher (the quiet look is a visual `scale(0.82)`; the box stays 44 px).
- So the dock's top edge is **0.75rem + 2.75rem = 3.5rem (56 px) above the bottom edge, plus the safe-area inset**. `--quiz-dock-footprint: 3.5rem`.
- Rule: clearance below the sticky action = `max(88px, footprint + 16px) + env(safe-area-inset-bottom)`. 56 + 16 = 72, which is under 88, so **88 px + safe area** at 16 px root. It is written in rem (`max(5.5rem, footprint + 1rem)`), because the dock is also rem-based: at 200% root text the dock grows to 112 px tall-from-bottom and the clearance becomes 176 px, still above it.
- Pages without a sticky footer (Practice, Results) get the same clearance as bottom padding, so their last item can scroll above the dock.
- **Open Music panel** (up to `70dvh` tall) is transient and learner-opened; it does cover content while open. The studio does not try to dodge it.
- **Keyboard open:** the sticky footer drops to a safe-area-only bottom padding (the dock is hidden behind the keyboard in most browsers), so the response action stays reachable on a short screen. This is an assumption to confirm on a device in QZ5; browsers differ on whether fixed elements move with the keyboard.
- **Stacking:** the studio frame deliberately creates no stacking context. Sheets are `position: fixed; z-index: 40` (same as the character picker), so they cover the dock (30) and its Start button is never underneath it. Profile menu and word-family modal (50) still sit above sheets.

The preview draws a dashed **stand-in** dock with these exact numbers and an optional dashed clearance line. It is not the real component; QZ5 must re-check against the live dock.

## Scoped light behavior (intentional, new)

In today's app the saved `light` theme id has dark global colors. Inside `.quiz-studio`, `light` (and the default with no theme attribute) now renders the **light studio palette**, and `dark`, `dark-cosmic`, `dark-emerald`, `dark-maple`, `dark-cyber` render the dark one. Nothing global changed: `natural-*` tokens, backgrounds, resets and every other screen are untouched. The studio reads the theme from an ancestor `data-theme` (the real app sets it on `<html>`); `StudioShell` also accepts a `themeId` prop that sets it on the frame itself, which the preview uses.

## Components and contracts

All presentational: typed view-model props plus callbacks, no stats, SRS, storage, network or engine imports (`scripts/quiz-visual-check.ts` enforces this). Contracts live in `viewTypes.ts`; refine them there rather than forking components.

| File | Exports | Role |
|---|---|---|
| `StudioShell.tsx` | `StudioShell`, `StudioHeader`, `StudioSheet`, `StudioSegmented`, `StudioSwitch`, `StudioMark` | Opaque frame, one scroll region with sticky in-region footer, compact header, dialog (focus trap, Escape, focus return), shared controls, four-point Astra star |
| `PracticeHome.tsx` | `PracticeHome` | Content only; the host wraps it in `StudioShell` |
| `QuizSetupSheet.tsx` | `QuizSetupSheet` | Customize sheet / dialog, shrink and empty states |
| `QuizPlayer.tsx` | `QuizPlayer`, `LeavePracticeSheet` | Full question screen, More menu, S1.4 exit sheet |
| `QuizFeedback.tsx` | `QuizFeedback` | Compact feedback, Why, Listen, auto-next line |
| `QuizResults.tsx` | `QuizResults` | Full results screen |
| `preview/fixtures.tsx` | sample data, `DuelLobbyFixture` | Static data; the duel lobby is preview-only (QZ10 promotes it) |
| `preview/QuizPreview.tsx` | default export | Dev page: controls, stand-ins, mini interactive session |

Behavior the preview demonstrates and QZ5 must port (these are **not** engine behavior, just the rules proven visually): answers lock with `aria-disabled` plus a guard; one polite live region; 1,600 ms auto-next cancelled for the question by Why, Listen, Pause, pointer or focus on the feedback, or any open sheet, and never restarted; Enter after feedback advances but a keydown that already submitted is never reused (the submitting handler calls `preventDefault` and marks the native event, and the window listener ignores both); native Enter/Space on a focused button, link or switch is left alone; focus goes to the prompt (or typed field) after Next, manual or automatic.

## Motion

Question entry 160 ms (opacity, y 6 to 0); press scale .985 for 80 ms; correct check icon settles once in 160 ms (no card pulse); wrong has no shake; Why fades in 160 ms with no height animation; sheet 160 ms; results 220 ms entrance plus one 600 ms star; the auto-next bar is decorative. Reduced motion (OS setting, or the preview's forced `data-motion="reduced"`) removes all animation, transitions, transforms and the bar; outcomes and the 1,600 ms timing are unchanged.

## Findings and open questions for Shine

These are visible choices to react to in screenshots, not defects I know of:

1. **Subject selector order.** Spec order is recommendation card, then `Kana | Words | Kanji`, then Customize. The selector changes the card above it. I kept the specified order; moving it above the card is a one-line change if it reads backwards.
2. **Answer tag wrap.** "Correct answer" / "Your answer" sits on the same line as short kana labels only when there is room; in narrow two-column choices it wraps under the label, so those buttons grow by one line after grading.
3. **Hover cancels auto-next** (pointer entering the feedback counts as interaction). If feedback appears under a stationary pointer, some browsers fire a synthetic enter; confirm in QZ5.
4. **Keyboard-open footer clearance** (above) is an assumption pending a device check.
5. **Production build still ships the studio CSS** (inert without a `.quiz-studio` element) and the tiny dev-chrome classes; the preview component itself must not ship (bundle check).
6. **The preview page still loads the App module graph.** `main.tsx` imports `App` statically (changing that would alter normal-launch chunking, which QZ1 must not do), so `firebase.ts` runs its import-time `initializeApp`, `getAuth` and `getDatabase` even though the preview never renders `App` or calls any of it. The preview components and fixtures make no requests and write nothing, but `getAuth` may restore an already-stored sign-in session in the background, and `index.css` already imports Google Fonts. If a fully offline preview is wanted, that is a QZ1.a change.
