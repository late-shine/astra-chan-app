/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Quiz Remake QZ1 check script: a standalone dev tool, NOT a UI feature. Run it AFTER `npm run build`.
 * It reads the built files in dist/ and fails if the development-only quiz preview leaked into the
 * production bundle (the packet requires: "Production normal launch does not show preview").
 *
 * What it proves: the built JS/HTML contain no preview chunk, no preview-only strings and no
 * `quiz-preview` query hook. What it does NOT prove: that the normal app still launches (open it in a
 * browser) or that `?quiz-preview=1` does nothing there (try it once on the built app).
 *
 * Run with: npm run build && npx tsx scripts/quiz-bundle-check.ts   (from the project root)
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) passed++;
  else failures.push(`${name}${detail ? `  (${detail})` : ""}`);
}

if (!existsSync("dist")) {
  console.log("dist/ not found. Run `npm run build` first, then re-run this check.");
  process.exit(1);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk("dist").filter((f) => !f.endsWith(".map") && !/server\.cjs$/.test(f));
const scripts = files.filter((f) => /\.(js|mjs|html)$/.test(f));
check("dist has built web files", scripts.length > 0, String(scripts.length));

// Strings that exist ONLY in the preview (src/components/quiz/preview/) or its main.tsx hook.
const PREVIEW_ONLY = [
  "quiz-preview",
  "Quiz studio preview",
  "Simulated on-screen keyboard",
  "Music panel stand-in",
  "Preview: toggle Mika ready",
  "QuizPreview",
];

for (const file of scripts) {
  const text = readFileSync(file, "utf8");
  for (const needle of PREVIEW_ONLY) check(`${file}: no "${needle}"`, !text.includes(needle));
}
check("no chunk file named like the preview", !files.some((f) => /preview/i.test(f)), files.filter((f) => /preview/i.test(f)).join(", "));

// The studio CSS itself is allowed (it ships inside the one CSS file; it is inert without a .quiz-studio element).
// The dev-only preview CHROME classes are tiny and live in the same stylesheet; they are allowed too, but are listed.
const cssFiles = files.filter((f) => f.endsWith(".css"));
const hasStudioCss = cssFiles.some((f) => readFileSync(f, "utf8").includes("quiz-studio"));
console.log(`Studio CSS present in the bundle: ${hasStudioCss ? "yes (expected, it is scoped and inert)" : "no"}`);

console.log(`\n${passed} checks passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.log("\nFAILURES:");
  failures.forEach((failure) => console.log(`  ✗ ${failure}`));
  process.exit(1);
}
console.log("QZ1 bundle check: no preview in the production build.");
