/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * B2 stroke-data generator — a dev tool, NOT part of the app bundle.
 *
 * Reads the official KanjiVG release (https://github.com/KanjiVG/kanjivg) and writes one
 * TypeScript data module per catalog kanji into src/kanjiStrokes/data/, plus a lazy-loader
 * manifest (src/kanjiStrokes/manifest.ts) and a coverage report (reports/b2-stroke-coverage.md).
 *
 * Usage (from the project root):
 *   1. Unzip a KanjiVG release so that <dir>/kanji/*.svg exists.
 *   2. npx tsx scripts/build-kanji-strokes.ts --kanjivg <dir> --release 20260714
 *
 * It never invents geometry: every `d` string is copied verbatim from KanjiVG. If a catalog
 * kanji has no KanjiVG file (or the file is malformed) it is left OUT of the manifest, and the
 * app shows its "stroke guide unavailable" state. Output is deterministic; re-running with the
 * same release rewrites identical files.
 *
 * The generated files under src/kanjiStrokes/data/ are adaptations of KanjiVG and stay under
 * CC BY-SA 3.0 (see src/kanjiStrokes/NOTICE.md). This script itself is Apache-2.0 like the app.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KANJI_DATA } from "../src/data";

type Pt = [number, number];

interface Geometry {
  start: Pt;
  end: Pt;
  length: number;
  startTangent: Pt;
  endTangent: Pt;
}

interface ParsedStroke {
  n: number;
  d: string;
  type?: string;
  geometry: Geometry;
  num?: Pt;
  part?: number;
}

interface ParsedPart {
  element?: string;
  position?: string;
  radical?: string;
  part?: string;
  parent?: number;
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src", "kanjiStrokes", "data");
const MANIFEST = join(ROOT, "src", "kanjiStrokes", "manifest.ts");
const REPORT = join(ROOT, "reports", "b2-stroke-coverage.md");

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// ───────────────────────── path geometry ─────────────────────────

type Cubic = [Pt, Pt, Pt, Pt];

function pathToCubics(d: string): Cubic[] {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g);
  if (!tokens) throw new Error(`empty path: ${d}`);
  const cubics: Cubic[] = [];
  let i = 0;
  let cmd = "";
  let cur: Pt = [0, 0];
  let subStart: Pt = [0, 0];
  let lastCtrl: Pt | null = null; // second control point of the previous C/S, for S reflection
  const num = (): number => {
    const t = tokens[i++];
    const v = Number(t);
    if (t === undefined || Number.isNaN(v)) throw new Error(`bad number in path: ${d}`);
    return v;
  };
  const line = (to: Pt) => {
    const c1: Pt = [cur[0] + (to[0] - cur[0]) / 3, cur[1] + (to[1] - cur[1]) / 3];
    const c2: Pt = [cur[0] + ((to[0] - cur[0]) * 2) / 3, cur[1] + ((to[1] - cur[1]) * 2) / 3];
    cubics.push([cur, c1, c2, to]);
    cur = to;
    lastCtrl = null;
  };
  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) cmd = tokens[i++];
    else if (cmd === "M") cmd = "L"; // implicit repeats after a moveto are linetos
    else if (cmd === "m") cmd = "l";
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? cur[0] : 0;
    const oy = rel ? cur[1] : 0;
    switch (cmd.toUpperCase()) {
      case "M": {
        const p: Pt = [ox + num(), oy + num()];
        cur = p;
        subStart = p;
        lastCtrl = null;
        break;
      }
      case "L":
        line([ox + num(), oy + num()]);
        break;
      case "H":
        line([ox + num(), cur[1]]);
        break;
      case "V":
        line([cur[0], oy + num()]);
        break;
      case "C": {
        const c1: Pt = [ox + num(), oy + num()];
        const c2: Pt = [ox + num(), oy + num()];
        const to: Pt = [ox + num(), oy + num()];
        cubics.push([cur, c1, c2, to]);
        cur = to;
        lastCtrl = c2;
        break;
      }
      case "S": {
        const c1: Pt = lastCtrl ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur;
        const c2: Pt = [ox + num(), oy + num()];
        const to: Pt = [ox + num(), oy + num()];
        cubics.push([cur, c1, c2, to]);
        cur = to;
        lastCtrl = c2;
        break;
      }
      case "Z":
        if (cur[0] !== subStart[0] || cur[1] !== subStart[1]) line(subStart);
        break;
      default:
        // Q/T/A never occur in KanjiVG stroke paths. Fail loudly rather than guess.
        throw new Error(`unsupported path command "${cmd}" in: ${d}`);
    }
  }
  if (cubics.length === 0) throw new Error(`path has no segments: ${d}`);
  return cubics;
}

function firstNonZero(...vs: Pt[]): Pt {
  for (const v of vs) if (Math.hypot(v[0], v[1]) > 1e-6) return v;
  return [1, 0];
}

function analysePath(d: string): Geometry {
  const cubics = pathToCubics(d);
  let length = 0;
  for (const [p0, p1, p2, p3] of cubics) {
    let prev = p0;
    for (let s = 1; s <= 32; s++) {
      const t = s / 32;
      const u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      length += Math.hypot(x - prev[0], y - prev[1]);
      prev = [x, y];
    }
  }
  const first = cubics[0];
  const last = cubics[cubics.length - 1];
  const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
  return {
    start: first[0],
    end: last[3],
    length,
    startTangent: firstNonZero(sub(first[1], first[0]), sub(first[2], first[0]), sub(first[3], first[0])),
    endTangent: firstNonZero(sub(last[3], last[2]), sub(last[3], last[1]), sub(last[3], last[0])),
  };
}

const deg = (v: Pt) => Math.round((Math.atan2(v[1], v[0]) * 180) / Math.PI);

// ───────────────────────── KanjiVG SVG parsing ─────────────────────────

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`(?:^|\\s)${name.replace(":", "\\:")}="([^"]*)"`));
  return m ? m[1] : undefined;
}

function decodeXml(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function parseKanjiVg(svg: string, code: string): { strokes: ParsedStroke[]; parts: ParsedPart[] } {
  if (!/viewBox="0 0 109 109"/.test(svg)) throw new Error("viewBox is not 0 0 109 109");
  const pathsStart = svg.indexOf(`id="kvg:StrokePaths_${code}"`);
  const numbersStart = svg.indexOf(`id="kvg:StrokeNumbers_${code}"`);
  if (pathsStart < 0 || numbersStart < 0) throw new Error("missing StrokePaths/StrokeNumbers groups");
  const pathsBlock = svg.slice(pathsStart, numbersStart);
  const numbersBlock = svg.slice(numbersStart);

  const strokes: ParsedStroke[] = [];
  const parts: ParsedPart[] = [];
  // Stack of open <g>; each entry is the index into `parts` it created (or null for the root/paths wrapper).
  const stack: Array<number | null> = [];
  const tagRe = /<(\/?)g\b([^>]*)>|<path\b([^>]*?)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(pathsBlock))) {
    if (m[3] !== undefined) {
      const tag = m[3];
      const id = attr(tag, "id");
      const d = attr(tag, "d");
      if (!id || !d) throw new Error("path without id/d");
      const sm = id.match(/-s(\d+)$/);
      if (!sm) throw new Error(`unexpected path id ${id}`);
      const innermost = [...stack].reverse().find((v) => v !== null);
      strokes.push({
        n: Number(sm[1]),
        d,
        type: attr(tag, "kvg:type") ? decodeXml(attr(tag, "kvg:type") as string) : undefined,
        geometry: analysePath(d),
        part: innermost === undefined || innermost === null ? undefined : innermost,
      });
    } else if (m[1] === "/") {
      stack.pop();
    } else {
      const tag = m[2];
      const id = attr(tag, "id") ?? "";
      // Only nested component groups (id "...-g1") become parts; the wrapper and root group do not.
      if (/-g\d+$/.test(id)) {
        const parent = [...stack].reverse().find((v) => v !== null);
        const part: ParsedPart = {
          element: attr(tag, "kvg:element") ? decodeXml(attr(tag, "kvg:element") as string) : undefined,
          position: attr(tag, "kvg:position"),
          radical: attr(tag, "kvg:radical"),
          part: attr(tag, "kvg:part"),
          parent: parent === undefined || parent === null ? undefined : parent,
        };
        parts.push(part);
        stack.push(parts.length - 1);
      } else {
        stack.push(null);
      }
    }
  }

  // Stroke-number labels, in document order (1..N).
  const labels: Pt[] = [];
  const textRe = /<text transform="matrix\(1 0 0 1 ([-\d.]+) ([-\d.]+)\)">(\d+)<\/text>/g;
  while ((m = textRe.exec(numbersBlock))) {
    if (Number(m[3]) !== labels.length + 1) throw new Error("stroke-number labels out of order");
    labels.push([Number(m[1]), Number(m[2])]);
  }

  // Integrity checks: numbers are exactly 1..N in order, and labels line up with paths.
  strokes.forEach((s, idx) => {
    if (s.n !== idx + 1) throw new Error(`stroke ids not sequential at index ${idx} (got s${s.n})`);
  });
  if (labels.length !== strokes.length) throw new Error(`${labels.length} number labels vs ${strokes.length} paths`);
  strokes.forEach((s, idx) => {
    s.num = labels[idx];
  });
  return { strokes, parts };
}

// ───────────────────────── output ─────────────────────────

const q = (s: string) => JSON.stringify(s);
const pt = (p: Pt) => `[${r2(p[0])}, ${r2(p[1])}]`;

function renderModule(kanji: string, code: string, release: string, strokes: ParsedStroke[], parts: ParsedPart[]): string {
  const strokeLines = strokes.map((s) => {
    const fields = [
      `n: ${s.n}`,
      `d: ${q(s.d)}`,
      s.type ? `type: ${q(s.type)}` : "",
      `start: ${pt(s.geometry.start)}`,
      `end: ${pt(s.geometry.end)}`,
      `dir: ${deg(sub(s.geometry.end, s.geometry.start))}`,
      `endDir: ${deg(s.geometry.endTangent)}`,
      `len: ${r1(s.geometry.length)}`,
      s.num ? `num: ${pt(s.num)}` : "",
      s.part !== undefined ? `part: ${s.part}` : "",
    ].filter(Boolean);
    return `    { ${fields.join(", ")} },`;
  });
  const partLines = parts.map((p) => {
    const fields = [
      p.element ? `element: ${q(p.element)}` : "",
      p.position ? `position: ${q(p.position)}` : "",
      p.radical ? `radical: ${q(p.radical)}` : "",
      p.part ? `part: ${q(p.part)}` : "",
      p.parent !== undefined ? `parent: ${p.parent}` : "",
    ].filter(Boolean);
    return `    { ${fields.join(", ")} },`;
  });
  return `/*
 * KanjiVG stroke data for ${kanji} (U+${code.replace(/^0+/, "").toUpperCase()}) — release ${release}, source file kanji/${code}.svg
 * Copyright (C) 2009-2011 Ulrich Apel and the KanjiVG contributors — https://kanjivg.tagaini.net
 * Licensed CC BY-SA 3.0: https://creativecommons.org/licenses/by-sa/3.0/
 * Adapted for Astra: path data copied verbatim; start/end points, directions, lengths and
 * label positions were computed from it. This file remains under CC BY-SA 3.0 (see ../NOTICE.md).
 * GENERATED by scripts/build-kanji-strokes.ts — do not edit by hand.
 */
import type { KanjiStrokeData } from "../types";

const data: KanjiStrokeData = {
  kanji: ${q(kanji)},
  code: ${q(code)},
  release: ${q(release)},
  viewBox: 109,
  strokes: [
${strokeLines.join("\n")}
  ],
  parts: [
${partLines.join("\n")}
  ],
};

export default data;
`;
}

function sub(a: Pt, b: Pt): Pt {
  return [a[0] - b[0], a[1] - b[1]];
}

// ───────────────────────── main ─────────────────────────

function main() {
  const dir = argValue("--kanjivg");
  const release = argValue("--release");
  if (!dir || !release) {
    console.error("Usage: npx tsx scripts/build-kanji-strokes.ts --kanjivg <dir containing kanji/> --release <YYYYMMDD>");
    process.exitCode = 2;
    return;
  }
  const svgDir = join(resolve(dir), "kanji");
  if (!existsSync(svgDir)) {
    console.error(`Not found: ${svgDir}`);
    process.exitCode = 2;
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  for (const f of readdirSync(OUT_DIR)) if (f.endsWith(".ts")) rmSync(join(OUT_DIR, f)); // stale files must not linger

  const covered: Array<{ kanji: string; code: string; strokes: number; declared: number }> = [];
  const unavailable: Array<{ kanji: string; reason: string }> = [];
  const countMismatch: Array<{ kanji: string; kanjivg: number; declared: number }> = [];

  for (const item of KANJI_DATA) {
    const kanji = item.kanji;
    const chars = Array.from(kanji);
    if (chars.length !== 1) {
      unavailable.push({ kanji, reason: `multi-character card key (${chars.length} characters); KanjiVG has one file per character` });
      continue;
    }
    const code = (chars[0].codePointAt(0) as number).toString(16).padStart(5, "0");
    const file = join(svgDir, `${code}.svg`);
    if (!existsSync(file)) {
      unavailable.push({ kanji, reason: `no KanjiVG file ${code}.svg` });
      continue;
    }
    try {
      const { strokes, parts } = parseKanjiVg(readFileSync(file, "utf8"), code);
      writeFileSync(join(OUT_DIR, `${code}.ts`), renderModule(kanji, code, release, strokes, parts));
      covered.push({ kanji, code, strokes: strokes.length, declared: item.strokeCount });
      if (strokes.length !== item.strokeCount) countMismatch.push({ kanji, kanjivg: strokes.length, declared: item.strokeCount });
    } catch (err) {
      unavailable.push({ kanji, reason: `parse failed: ${(err as Error).message}` });
    }
  }

  const manifest = `/**
 * GENERATED by scripts/build-kanji-strokes.ts — do not edit by hand.
 * One lazy loader per covered kanji, so only the characters a learner actually visits
 * (plus their two neighbours) are ever downloaded. Kanji missing here have no stroke guide.
 * Stroke data © KanjiVG contributors, CC BY-SA 3.0 — see ./NOTICE.md.
 */
import type { KanjiStrokeData } from "./types";

export const KANJIVG_RELEASE = ${q(release)};

export const STROKE_LOADERS: Record<string, () => Promise<{ default: KanjiStrokeData }>> = {
${covered.map((c) => `  ${q(c.kanji)}: () => import("./data/${c.code}"),`).join("\n")}
};
`;
  writeFileSync(MANIFEST, manifest);

  const report = [
    "# B2 stroke-data coverage report",
    "",
    `KanjiVG release: **${release}**. Catalog size: **${KANJI_DATA.length}** cards.`,
    "",
    `- Covered with real KanjiVG stroke data: **${covered.length}**`,
    `- Unavailable (shown as "stroke guide unavailable" in the app): **${unavailable.length}**`,
    `- Stroke-count disagreements between KanjiVG and \`KANJI_DATA.strokeCount\`: **${countMismatch.length}**`,
    "",
    "## Unavailable",
    ...(unavailable.length ? unavailable.map((u) => `- \`${u.kanji}\` — ${u.reason}`) : ["None."]),
    "",
    "## Stroke-count disagreements (KanjiVG vs data.ts)",
    ...(countMismatch.length ? countMismatch.map((c) => `- \`${c.kanji}\` — KanjiVG ${c.kanjivg}, data.ts ${c.declared}`) : ["None."]),
    "",
    "## Covered",
    covered.map((c) => `${c.kanji}(${c.strokes})`).join(" "),
    "",
  ].join("\n");
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, report);

  console.log(report);
}

main();
