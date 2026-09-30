# KanjiVG notice — stroke data used by Astra

The files in `src/kanjiStrokes/data/` and the generated `src/kanjiStrokes/manifest.ts` are
**adaptations of KanjiVG** and are distributed under the same license as KanjiVG:
**Creative Commons Attribution-Share Alike 3.0 (CC BY-SA 3.0)**.

- KanjiVG: https://kanjivg.tagaini.net/ — source: https://github.com/KanjiVG/kanjivg
- Copyright (C) 2009/2010/2011 Ulrich Apel and the KanjiVG contributors.
- License: https://creativecommons.org/licenses/by-sa/3.0/
- Release used: **20260714** (`kanjivg-20260714-all.zip`, `kanji/<5-digit-hex>.svg`).

## What was adapted

For each catalog kanji that KanjiVG covers, the ordered stroke `d` path strings are copied
**verbatim** from `kanji/<code>.svg`. Astra added, computed from those paths: each stroke's start
and end point, chord direction, end-tangent direction, approximate length, the position of
KanjiVG's stroke-number label, and a flattened list of the component groups (`kvg:element`,
`kvg:position`, `kvg:radical`, `kvg:part`). The SVG wrapper was replaced by a TypeScript object so
the data can be lazy-loaded per character. No path was drawn, traced, or edited by hand.

## Obligations this notice supports

- **Attribution** — each generated data file carries a header naming Ulrich Apel / KanjiVG, linking
  the KanjiVG site and the license, and stating that the data was adapted. The app shows the same
  credit under the stroke player (Watch mode).
- **Share-Alike** — if you redistribute these data files (or a modified version), keep them under
  CC BY-SA 3.0 (or a license CC lists as compatible) and keep this notice and the file headers.
- The rest of Astra's source is licensed separately (see `LICENSE` at the project root). Keep the
  KanjiVG-derived files identifiable (this folder) so that separation stays clear.

This file describes how the project meets the license as the maintainers understand it; it is not
legal advice.

## Regenerating

```
npx tsx scripts/build-kanji-strokes.ts --kanjivg <dir containing kanji/> --release <YYYYMMDD>
```

The script rewrites `data/`, `manifest.ts` and `reports/b2-stroke-coverage.md`.
