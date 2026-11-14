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
 *   5. Reduced motion exists for OS settings and the reusable shell attribute.
 *   6. Quiz components contain no colour literals and no storage / network / stats access.
 *   7. main.tsx mounts the real App; retired preview/legacy screens and CSS stay absent.
 *
 * It does NOT prove layout, focus order, screen-reader output or the production bundle. Those are Shine's
 * screenshots and `scripts/quiz-bundle-check.ts` after a build.
 *
 * Run with: npx tsx scripts/quiz-visual-check.ts   (from the project root)
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { ATELIER_PORTRAITS, ATELIER_SCENES } from "../src/quiz/atelierAssets";

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
const startAt = css.indexOf(START_MARKER);
check("index.css has the QZ1 block marker", startAt >= 0);
const block = startAt >= 0 ? css.slice(css.lastIndexOf("/*", startAt)) : "";
const studioPart = block;
check("development preview CSS stays removed", !/quiz-preview-|DEV PREVIEW CHROME/.test(css));

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
const SCOPED = /^(\.quiz-|:is\(\[data-theme="[\w-]+"\](?:,\s*\[data-theme="[\w-]+"\])*\)\s+\.quiz-studio\b)/;
for (const rule of studioRules) {
  if (rule.atRule && rule.atRule.startsWith("@keyframes")) continue; // from / to / 0% steps
  for (const selector of splitSelectors(rule.prelude)) {
    check(`scope: "${selector.slice(0, 70)}" is .quiz-scoped`, SCOPED.test(selector));
  }
}
check("no .quiz-preview-* selector in the studio part", !/\.quiz-preview-/.test(stripComments(studioPart)));
check("studio rules were found (parser sanity)", studioRules.length > 100, String(studioRules.length));

// ─── 2. colour literals only in token declarations ───────────────────────────

const TOKEN_DECL = /--quiz-[\w-]+\s*:\s*[^;]+;/g;
const withoutTokens = stripComments(block).replace(TOKEN_DECL, "");
const literals = withoutTokens.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g) ?? [];
check("no hex / rgb / hsl outside --quiz-* token declarations", literals.length === 0, literals.slice(0, 4).join(" "));

// ─── 3. contrast, from the real token values ─────────────────────────────────

type Palette = Record<string, string>;
const tokenRule = studioRules.find(rule => rule.prelude === ".quiz-studio" && /--quiz-bg\s*:/.test(rule.body));
const palette: Palette = {};
for (const match of tokenRule?.body.matchAll(/--quiz-([\w-]+)\s*:\s*([^;]+);/g) ?? []) palette[match[1]] = match[2].trim();
check("one Rainlit Atelier palette is defined", Object.keys(palette).length >= 25);
check("all app theme IDs use the same night palette", !studioRules.some(rule => /data-theme/.test(rule.prelude) && /--quiz-(bg|primary|surface)\s*:/.test(rule.body)));
check("atelier uses the night image-loading fallback", palette.bg?.toUpperCase() === "#121116");

type Color = [number, number, number, number];
function color(input: string, backdrop: Color): Color {
  const value = input?.replace(/var\(--quiz-([\w-]+)\)/g, (_, key: string) => palette[key] ?? "");
  if (/^#[\da-f]{6}$/i.test(value)) return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)).concat(1) as Color;
  const match = value?.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)$/);
  if (!match) throw new Error("Unsupported contrast color " + input);
  const alpha = Number(match[4]);
  return [0, 1, 2].map(i => Number(match[i + 1]) * alpha + backdrop[i] * (1 - alpha)).concat(1) as Color;
}
function luminance(rgb: Color) {
  const linear = rgb.slice(0, 3).map(value => value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function ratio(fg: Color, bg: Color) {
  const values = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
let minimumText = Infinity;
let minimumEdge = Infinity;
for (const backdrop of [[0, 0, 0, 1], [255, 255, 255, 1]] as Color[]) {
  const name = backdrop[0] === 0 ? "black scene bound" : "white scene bound";
  for (const surface of ["bg", "surface", "surface-solid", "surface-muted", "selected-fill", "companion-surface", "header-surface", "success-soft", "error-soft"]) {
    for (const foreground of ["ink", "ink-muted", "playful"]) {
      const value = ratio(color(palette[foreground], backdrop), color(palette[surface], backdrop));
      minimumText = Math.min(minimumText, value);
      check(`contrast: ${foreground} on ${surface}, ${name} >= 4.5`, value >= 4.5, value.toFixed(2));
    }
  }
  for (const [fg, bg, minimum] of [
    ["on-primary", "primary", 4.5], ["on-primary", "primary-hover", 4.5], ["on-playful", "playful", 4.5],
    ["success", "success-soft", 4.5], ["error", "error-soft", 4.5],
    ["control-border", "surface-muted", 3], ["control-border", "selected-fill", 3],
    ["success", "success-soft", 3], ["error", "error-soft", 3],
    ["focus", "surface-muted", 3], ["focus", "surface-solid", 3], ["playful", "surface-muted", 3], ["playful", "selected-fill", 3],
  ] as [string, string, number][]) {
    const value = ratio(color(palette[fg], backdrop), color(palette[bg], backdrop));
    if (minimum === 3) minimumEdge = Math.min(minimumEdge, value);
    check(`contrast: ${fg} on ${bg}, ${name} >= ${minimum}`, value >= minimum, value.toFixed(2));
  }
}
console.log(`Atelier composite bounds: text ${minimumText.toFixed(2)}:1, meaningful edges ${minimumEdge.toFixed(2)}:1 minimum.`);

// ─── 4. size floors ──────────────────────────────────────────────────────────

const toPx = (value: string): number => (value.endsWith("rem") ? parseFloat(value) * 16 : parseFloat(value));
for (const rule of studioRules) {
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

// QZ5A art and bounded composition, using the current masters and real derivatives.
function pngDimensions(path: string) {
  const bytes = readFileSync(path);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), alpha: bytes[25] === 6 || bytes.includes(Buffer.from("tRNS")) };
}
const sourceFiles = [
  ...Object.entries(ATELIER_PORTRAITS).map(([id, asset]) => ({ path: `Quiz assets/astra-${id}.png`, asset })),
  ...Object.entries(ATELIER_SCENES).map(([id, asset]) => ({ path: `Quiz assets/atelier-night-${id}.png`, asset })),
];
for (const { path, asset } of sourceFiles) {
  const bytes = readFileSync(path);
  check(`${path} matches the inspected source master`, createHash("sha256").update(bytes).digest("hex") === asset.sourceSha256);
}
for (const [id, asset] of Object.entries(ATELIER_PORTRAITS)) {
  const source = pngDimensions(`Quiz assets/astra-${id}.png`);
  check(`${id}: current source dimensions recorded`, source.width === asset.sourceWidth && source.height === asset.sourceHeight);
  check(`${id}: source alpha retained`, source.alpha && asset.alpha);
  check(`${id}: conservative scale and anchors`, asset.anchor.scale <= 1 && asset.anchor.scale >= 0.9 && Math.abs(asset.anchor.offsetY) <= 2);
  check(`${id}: phone URLs cap the 120px slot at 2x`, asset.mobileWebp.endsWith("-240.webp") && asset.mobileSrc.endsWith("-240.png"));
  for (const [key, expected] of Object.entries(asset.bytes)) {
    const [, width, extension] = key.match(/^(\d+)(webp|png)$/)!;
    const path = `public/assets/quiz/atelier/astra-${id}-${width}.${extension}`;
    check(`${id} ${key}: derivative size matches manifest`, statSync(path).size === expected);
    check(`${id} ${key}: portrait budget`, expected <= (Number(width) <= 240 ? 100_000 : 250_000), String(expected));
    if (extension === "png") {
      const decoded = pngDimensions(path);
      check(`${id} ${key}: proportional alpha PNG fallback`, decoded.alpha && decoded.width === Number(width) && decoded.height * 3 === decoded.width * 4);
    }
  }
}
for (const [id, asset] of Object.entries(ATELIER_SCENES)) {
  for (const [key, expected] of Object.entries(asset.bytes)) {
    const [, width, extension] = key.match(/^(\d+)(webp|jpg)$/)!;
    const path = `public/assets/quiz/atelier/atelier-night-${id}-${width}.${extension}`;
    check(`${id} ${key}: room budget and recorded bytes`, statSync(path).size === expected && expected <= (id === "desktop" ? 650_000 : 350_000));
  }
}
const companion = readFileSync("src/components/quiz/QuizCompanion.tsx", "utf8");
const shell = readFileSync("src/components/quiz/StudioShell.tsx", "utf8");
check("scene sources are selected by responsive picture", shell.includes('(max-width: 767px)') && shell.includes('type="image/webp"'));
check("portrait swap waits for decode", companion.includes("image.decode()") && companion.includes("desired.current !== expression"));
check("phone picture selects only its capped source", companion.includes('media="(max-width: 1099px)" type="image/webp" srcSet={asset.mobileWebp}') && companion.includes('type="image/png" srcSet={asset.mobileSrc}'));
check("phone preload uses its capped source", companion.includes("else image.src = asset.mobileWebp"));
check("image loads have no quiz callback", !/dispatch\(|speak\(|chime\(|playChime\(/.test(companion));
check("portraits do not crop face or hat", /object-fit:\s*contain/.test(studioPart));
check("phone panel reserves 120 by 160 portrait", /width:\s*120px;\s*height:\s*160px/.test(studioPart));
check("narrow phone reserves 96 by 128 portrait", /width:\s*96px;\s*height:\s*128px/.test(studioPart));
check("large text can wrap companion columns", /\.quiz-companion\s*\{[^}]*flex-wrap:\s*wrap/s.test(studioPart));
check("keyboard uses a compact companion strip", /\[data-keyboard="open"\] \.quiz-companion\s*\{[^}]*min-height:\s*44px/s.test(studioPart));
check("one quiz scroll region remains", (shell.match(/className="quiz-scroll"/g) ?? []).length === 1);
check("desktop companion uses the 1100px breakpoint", studioPart.includes("@media (min-width: 1100px)"));
check("solid forced-colors fallback is present", studioPart.includes("@media (forced-colors: active)"));
check("quiet feedback actions use the measured light foreground", declaration(".quiz-btn--quiet", "color") === "var(--quiz-playful)");
check("sticky study actions reserve dock clearance", declaration(".quiz-footer", "padding")?.includes("var(--quiz-footer-clearance)") === true);
check("scrollbar appearance cannot shift the companion panel", declaration(".quiz-scroll", "scrollbar-gutter") === "stable");
for (const value of studioPart.matchAll(/backdrop-filter:\s*blur\((\d+)px\)/g)) check("local panel blur <= 5px", Number(value[1]) <= 5);
check("room image has no blur or lighting filter", !/\.quiz-room(?: img)?\s*\{[^}]*\bfilter\s*:/.test(studioPart));
for (const file of quizFiles.filter(file => !file.includes("preview"))) {
  check(`${file}: no production art editor`, !/type=["']range["']|Adjust scene|Portrait fixture/.test(readFileSync(file, "utf8")));
}

// ─── 7. main.tsx gating ──────────────────────────────────────────────────────

const main = readFileSync("src/main.tsx", "utf8");
check("main.tsx: always mounts the real App in StrictMode", /import App from '\.\/App\.tsx'/.test(main) && /<StrictMode>\s*<App \/>\s*<\/StrictMode>/.test(main));
check("main.tsx: no retired query hook or preview import", !/quiz-preview|QuizPreview|components\/quiz\/preview|import\(/.test(main));
for(const file of ['src/components/quiz/preview/QuizPreview.tsx','src/components/quiz/preview/fixtures.tsx','src/components/quiz/preview/CompanionFixture.tsx','src/components/QuizScreen.tsx','src/components/ResultsScreen.tsx'])check(`retired source stays removed: ${file}`, !existsSync(file));
check("main.tsx: does not write storage", !/localStorage|sessionStorage/.test(main));

// ─── report ──────────────────────────────────────────────────────────────────

console.log(`\n${passed} checks passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.log("\nFAILURES:");
  failures.forEach((failure) => console.log(`  ✗ ${failure}`));
  process.exit(1);
}
console.log("Rainlit Atelier visual-rule checks: all green.");
