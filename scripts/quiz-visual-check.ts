/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Quiz Remake QZ1 check script: a standalone dev tool, NOT a UI feature. It reads source files only
 * (src/index.css, src/components/quiz/**, src/main.tsx). It never starts the app, renders anything,
 * touches Firebase or imports app code. Exits with code 1 if any check fails.
 *
 * It checks the RULES the packet sets for the new studio, so a later edit cannot quietly break them:
 *   1. Every selector in the QZ1 CSS block is `.quiz-*` scoped (or a data-theme ancestor of it): no bare
 *      element, :root, html, body or * rules, and nothing before the block was touched by this tool's rules.
 *   2. The only colour literals (hex / rgb) in the block are token declarations.
 *   3. WCAG contrast for the actual token values it parses out of the CSS, per theme id:
 *      normal text >= 4.5:1, meaningful control boundaries and icons >= 3:1.
 *   4. Size floors: no font-size under 12 px; buttons 48 px, answer buttons 56 px, icon controls 44 px.
 *   5. Reduced motion exists in both forms (OS setting and the preview's forced attribute).
 *   6. Quiz components contain no colour literals and no storage / network / stats access.
 *   7. main.tsx only reaches the preview behind import.meta.env.DEV and ?quiz-preview=1.
 *
 * It does NOT prove layout, focus order, screen-reader output or the production bundle. Those are Shine's
 * screenshots and `scripts/quiz-bundle-check.ts` after a build.
 *
 * Run with: npx tsx scripts/quiz-visual-check.ts   (from the project root)
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ─── tiny harness ────────────────────────────────────────────────────────────

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) passed++;
  else failures.push(`${name}${detail ? `  (${detail})` : ""}`);
}

// ─── load sources ────────────────────────────────────────────────────────────

const css = readFileSync("src/index.css", "utf8");
const START_MARKER = "QUIZ STUDIO  (Quiz Remake QZ1)";
const PREVIEW_MARKER = "DEV PREVIEW CHROME";
const startAt = css.indexOf(START_MARKER);
check("index.css has the QZ1 block marker", startAt >= 0);
const block = startAt >= 0 ? css.slice(css.lastIndexOf("/*", startAt)) : "";
const previewAt = block.indexOf(PREVIEW_MARKER);
check("index.css has the dev-preview chrome marker", previewAt >= 0);
const studioPart = previewAt >= 0 ? block.slice(0, block.lastIndexOf("/*", previewAt)) : block;
const previewPart = previewAt >= 0 ? block.slice(block.lastIndexOf("/*", previewAt)) : "";

// ─── a small CSS reader (rules, nested @media, @keyframes) ───────────────────

interface Rule {
  prelude: string;
  body: string;
  atRule: string | null; // the enclosing @media / @keyframes prelude, if any
}

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseRules(text: string): Rule[] {
  const source = stripComments(text);
  const rules: Rule[] = [];
  const stack: { prelude: string; start: number; isAt: boolean }[] = [];
  let preludeStart = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") {
      const prelude = source.slice(preludeStart, i).trim();
      stack.push({ prelude, start: i + 1, isAt: prelude.startsWith("@") });
      preludeStart = i + 1;
    } else if (ch === "}") {
      const open = stack.pop();
      if (open && !open.isAt) {
        const parentAt = [...stack].reverse().find((s) => s.isAt)?.prelude ?? null;
        rules.push({ prelude: open.prelude, body: source.slice(open.start, i), atRule: parentAt });
      }
      preludeStart = i + 1;
    }
  }
  return rules;
}

const studioRules = parseRules(studioPart);
const previewRules = parseRules(previewPart);

// ─── 1. scope ────────────────────────────────────────────────────────────────

/** Splits a selector list on commas that are NOT inside (...) or [...]. */
function splitSelectors(prelude: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of prelude) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

// A studio selector starts with .quiz-*, or is a theme ancestor of .quiz-studio (":is([data-theme=...]) .quiz-studio").
const SCOPED = /^(\.quiz-|:is\(\[data-theme="[\w-]+"(?:,\s*\[data-theme="[\w-]+"\])*\)\s+\.quiz-studio\b)/;
for (const rule of studioRules) {
  if (rule.atRule && rule.atRule.startsWith("@keyframes")) continue; // from / to / 0% steps
  for (const selector of splitSelectors(rule.prelude)) {
    check(`scope: "${selector.slice(0, 70)}" is .quiz-scoped`, SCOPED.test(selector));
  }
}
for (const rule of previewRules) {
  if (rule.atRule && rule.atRule.startsWith("@keyframes")) continue;
  for (const selector of splitSelectors(rule.prelude)) {
    check(`scope: preview "${selector.slice(0, 60)}" is .quiz-preview-*`, /^\.quiz-preview-/.test(selector));
  }
}
check("no .quiz-preview-* selector in the studio part", !/\.quiz-preview-/.test(studioPart));
check("studio rules were found (parser sanity)", studioRules.length > 100, String(studioRules.length));

// ─── 2. colour literals only in token declarations ───────────────────────────

const TOKEN_DECL = /--quiz-[\w-]+\s*:\s*[^;]+;/g;
const withoutTokens = stripComments(block).replace(TOKEN_DECL, "");
const literals = withoutTokens.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g) ?? [];
check("no hex / rgb / hsl outside --quiz-* token declarations", literals.length === 0, literals.slice(0, 4).join(" "));

// ─── 3. contrast, from the real token values ─────────────────────────────────

type Palette = Record<string, string>;

function tokensOf(rule: Rule | undefined): Palette {
  const out: Palette = {};
  if (!rule) return out;
  for (const match of rule.body.matchAll(/--quiz-([\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})\s*;/g)) out[match[1]] = match[2].toUpperCase();
  return out;
}

const lightRule = studioRules.find((r) => r.prelude === ".quiz-studio" && /--quiz-bg\s*:/.test(r.body));
const darkRule = studioRules.find((r) => r.prelude.includes('[data-theme="dark"]') && /--quiz-bg\s*:/.test(r.body));
const accentOf = (id: string) => tokensOf(studioRules.find((r) => r.prelude.includes(`[data-theme="${id}"]`) && /--quiz-primary\s*:/.test(r.body) && !/--quiz-bg/.test(r.body)));

const light = tokensOf(lightRule);
const dark = tokensOf(darkRule);
check("found the light token rule", Object.keys(light).length >= 14, String(Object.keys(light).length));
check("found the dark token rule", Object.keys(dark).length >= 14, String(Object.keys(dark).length));

const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
function luminance(hex: string): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(channel(hex, 0)) + 0.7152 * lin(channel(hex, 1)) + 0.0722 * lin(channel(hex, 2));
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/** `color-mix(in srgb, A pct, B)` as the studio uses it for --quiz-selected-fill. */
function mix(a: string, pct: number, b: string): string {
  const to = (i: number) => Math.round(channel(a, i) * pct + channel(b, i) * (1 - pct)).toString(16).padStart(2, "0");
  return `#${to(0)}${to(1)}${to(2)}`.toUpperCase();
}
check("selected-fill formula in CSS is 10% primary over surface", /--quiz-selected-fill:\s*color-mix\(in srgb,\s*var\(--quiz-primary\)\s*10%,\s*var\(--quiz-surface\)\)/.test(stripComments(studioPart)));

interface Pair { name: string; fg: string; bg: string; min: number }

function pairsFor(t: Palette): Pair[] {
  const fill = mix(t.primary, 0.1, t.surface);
  const text = 4.5;
  const ui = 3;
  return [
    { name: "ink on bg", fg: t.ink, bg: t.bg, min: text },
    { name: "ink on surface", fg: t.ink, bg: t.surface, min: text },
    { name: "ink on surface-muted", fg: t.ink, bg: t["surface-muted"], min: text },
    { name: "ink-muted on bg", fg: t["ink-muted"], bg: t.bg, min: text },
    { name: "ink-muted on surface", fg: t["ink-muted"], bg: t.surface, min: text },
    { name: "ink-muted on surface-muted", fg: t["ink-muted"], bg: t["surface-muted"], min: text },
    { name: "primary text on bg", fg: t.primary, bg: t.bg, min: text },
    { name: "primary text on surface", fg: t.primary, bg: t.surface, min: text },
    { name: "on-primary on primary", fg: t["on-primary"], bg: t.primary, min: text },
    { name: "success on success-soft", fg: t.success, bg: t["success-soft"], min: text },
    { name: "error on error-soft", fg: t.error, bg: t["error-soft"], min: text },
    { name: "ink on success-soft", fg: t.ink, bg: t["success-soft"], min: text },
    { name: "ink on error-soft", fg: t.ink, bg: t["error-soft"], min: text },
    { name: "ink-muted on success-soft", fg: t["ink-muted"], bg: t["success-soft"], min: text },
    { name: "ink-muted on error-soft", fg: t["ink-muted"], bg: t["error-soft"], min: text },
    { name: "ink on selected-fill", fg: t.ink, bg: fill, min: text },
    { name: "ink-muted on selected-fill", fg: t["ink-muted"], bg: fill, min: text },
    { name: "on-playful on playful", fg: t["on-playful"], bg: t.playful, min: text },
    { name: "control-border on bg", fg: t["control-border"], bg: t.bg, min: ui },
    { name: "control-border on surface", fg: t["control-border"], bg: t.surface, min: ui },
    { name: "control-border on surface-muted", fg: t["control-border"], bg: t["surface-muted"], min: ui },
    { name: "control-border on success-soft", fg: t["control-border"], bg: t["success-soft"], min: ui },
    { name: "control-border on error-soft", fg: t["control-border"], bg: t["error-soft"], min: ui },
    { name: "primary (selected border, focus ring) on surface", fg: t.primary, bg: t.surface, min: ui },
    { name: "primary (focus ring) on bg", fg: t.primary, bg: t.bg, min: ui },
    { name: "success (border / icon) on success-soft", fg: t.success, bg: t["success-soft"], min: ui },
    { name: "error (border / icon) on error-soft", fg: t.error, bg: t["error-soft"], min: ui },
    { name: "success-soft (icon glyph) on success", fg: t["success-soft"], bg: t.success, min: ui },
    { name: "error-soft (icon glyph) on error", fg: t["error-soft"], bg: t.error, min: ui },
  ];
}

const themes: { id: string; palette: Palette }[] = [
  { id: "light (base, light id)", palette: light },
  { id: "dark / dark-cosmic", palette: dark },
  ...["dark-emerald", "dark-maple", "dark-cyber"].map((id) => ({ id, palette: { ...dark, ...accentOf(id) } })),
];
for (const id of ["dark-emerald", "dark-maple", "dark-cyber"]) check(`found the ${id} accent override`, !!accentOf(id).primary);

console.log("Measured contrast (WCAG 2.x), from the token values in src/index.css:");
for (const theme of themes) {
  let worst = Infinity;
  let worstName = "";
  for (const pair of pairsFor(theme.palette)) {
    if (!pair.fg || !pair.bg) {
      check(`contrast ${theme.id}: ${pair.name} has both colours`, false);
      continue;
    }
    const value = ratio(pair.fg, pair.bg);
    if (value < worst) {
      worst = value;
      worstName = pair.name;
    }
    check(`contrast ${theme.id}: ${pair.name} >= ${pair.min}`, value >= pair.min, `${value.toFixed(2)}:1`);
  }
  console.log(`  ${theme.id.padEnd(24)} lowest ${worst.toFixed(2)}:1  (${worstName})`);
}

// ─── 4. size floors ──────────────────────────────────────────────────────────

const toPx = (value: string): number => (value.endsWith("rem") ? parseFloat(value) * 16 : parseFloat(value));
for (const rule of [...studioRules, ...previewRules]) {
  for (const match of rule.body.matchAll(/font-size\s*:\s*([\d.]+(?:rem|px))/g)) {
    check(`font-size ${match[1]} in "${rule.prelude.slice(0, 40)}" is >= 12px`, toPx(match[1]) >= 12);
  }
}
function declaration(selector: string, property: string): string | undefined {
  const rule = studioRules.find((r) => r.prelude === selector);
  return rule?.body.match(new RegExp(`(?:^|[;\\s])${property}\\s*:\\s*([^;]+)`))?.[1]?.trim();
}
const floors: [string, string, number][] = [
  [".quiz-btn", "min-height", 48],
  [".quiz-choice", "min-height", 56],
  [".quiz-input", "min-height", 56],
  [".quiz-select", "min-height", 48],
  [".quiz-icon-btn", "height", 44],
  [".quiz-icon-btn", "width", 44],
  [".quiz-btn--quiet", "min-height", 44],
];
for (const [selector, property, min] of floors) {
  const value = declaration(selector, property);
  check(`${selector} ${property} >= ${min}px`, !!value && toPx(value) >= min, value ?? "missing");
}
check(".quiz-input font-size >= 16px (no iOS zoom)", toPx(declaration(".quiz-input", "font-size") ?? "0") >= 16);

// ─── 5. reduced motion ───────────────────────────────────────────────────────

check("reduced motion: prefers-reduced-motion rule kills animation + transition", studioRules.some((r) => r.atRule?.includes("prefers-reduced-motion") && /animation:\s*none/.test(r.body) && /transition:\s*none/.test(r.body)));
check("reduced motion: forced data-motion rule kills animation + transition", studioRules.some((r) => r.prelude.includes('[data-motion="reduced"]') && /animation:\s*none/.test(r.body) && /transition:\s*none/.test(r.body)));

// ─── 6. quiz components: no colour literals, no storage / network / stats ────

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const quizFiles = walk("src/components/quiz").filter((f) => /\.(tsx?|ts)$/.test(f));
check("found quiz component files", quizFiles.length >= 9, String(quizFiles.length));

const FORBIDDEN: [string, RegExp][] = [
  ["colour literal", /["'`]#[0-9a-fA-F]{3,8}["'`]|\brgba?\(|\bhsla?\(/],
  ["localStorage / sessionStorage / indexedDB", /\b(localStorage|sessionStorage|indexedDB)\b/],
  ["fetch / XMLHttpRequest / WebSocket / sendBeacon", /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\b/],
  ["firebase / SRS / stats modules", /from\s+["'][^"']*(firebase|srs|stats|storage|xp)[^"']*["']/i],
];
for (const file of quizFiles) {
  const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  for (const [label, pattern] of FORBIDDEN) check(`${file}: no ${label}`, !pattern.test(code), (code.match(pattern) ?? [""])[0]);
  for (const match of code.matchAll(/from\s+["']([^"']+)["']/g)) {
    const spec = match[1];
    check(`${file}: import "${spec}" is react, lucide-react, a quiz sibling or the theme type`, spec === "react" || spec === "lucide-react" || spec.startsWith("./") || spec.startsWith("../") && !/firebase|srs|stats|storage/i.test(spec));
  }
}
check("viewTypes.ts imports only types from preferences", /import type \{ ThemeId \} from "..\/..\/preferences"/.test(readFileSync("src/components/quiz/viewTypes.ts", "utf8")));

// ─── 7. main.tsx gating ──────────────────────────────────────────────────────

const main = readFileSync("src/main.tsx", "utf8");
check("main.tsx: preview import is behind import.meta.env.DEV", /if\s*\(\s*import\.meta\.env\.DEV\s*&&/.test(main));
check("main.tsx: preview needs ?quiz-preview=1", /get\('quiz-preview'\)\s*===\s*'1'/.test(main));
check("main.tsx: exactly one dynamic import of the preview", (main.match(/import\(/g) ?? []).length === 1 && /import\('\.\/components\/quiz\/preview\/QuizPreview\.tsx'\)/.test(main));
check("main.tsx: no static import of the preview", !/^import .*preview/m.test(main));
check("main.tsx: does not write storage", !/localStorage|sessionStorage/.test(main));

// ─── report ──────────────────────────────────────────────────────────────────

console.log(`\n${passed} checks passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.log("\nFAILURES:");
  failures.forEach((failure) => console.log(`  ✗ ${failure}`));
  process.exit(1);
}
console.log("QZ1 visual-rule checks: all green.");
