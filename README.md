# Quran Detailed Analytics

Structural analytics for the Quran as a **dataset + zero-dependency query library + REST API**.
Every number is computed from the [Tanzil](https://tanzil.net) Uthmani text and metadata by a
validated build pipeline — nothing is hand-entered.

## What's inside

| Dimension | Count | Notes |
|---|---|---|
| Surahs | 114 | Arabic/English names, transliteration, Meccan/Medinan, revelation order |
| Ayahs | 6,236 | Kufan/Hafs numbering; per-ayah **letter** and **word** counts |
| Words | 77,433 | computed; whitespace tokens containing ≥1 base letter |
| Letters | 325,386 | computed; base rasm letters only (see methodology) |
| Juz | 30 | with start/end, ayah/letter/word stats |
| Hizb | 60 | 2 per juz |
| Rubʿ | 240 | the ۞ quarter markers, 4 per hizb |
| Manzil | 7 | |
| Rukuʿ | 556 | |
| Pages | 604 | standard Madani mushaf layout |
| Sajdas | 15 | recommended / obligatory |

Traditional scholarship figures (77,439 words / 323,671 letters) are carried in
`meta.traditionalTotals` — see [docs/COUNTING_METHODOLOGY.md](docs/COUNTING_METHODOLOGY.md)
for why classical and computed totals legitimately differ.

## Quickstart

```bash
npm run build   # regenerate data/generated/quran-analytics.json from Tanzil sources
npm test        # 25 integrity + behavior tests
npm run serve   # REST API on http://localhost:8331 (PORT env to change)
npm run site    # website on http://localhost:8332 (PORT env to change)
```

### As a website

`web/` is a static, zero-dependency, zero-build-step dashboard over the same dataset:
Overview totals, a Browse view for every division type, a letter-weighted progress
calculator, and single-ayah lookup. `npm run site` serves it — no bundler, no framework.
It reads `data/generated/quran-analytics.json` directly, so it always reflects the
current build. See [web/js/domain.js](web/js/domain.js) for the browser port of the
domain layer (same algorithms as `src/domain`, adapted to `fetch` instead of `node:fs`).

### As an API

```bash
curl http://localhost:8331/v1/meta
curl http://localhost:8331/v1/surahs/2
curl http://localhost:8331/v1/ayahs/2/255          # stats + juz/hizb/rub/page/ruku location
curl http://localhost:8331/v1/juz/30
curl http://localhost:8331/v1/rub/240
curl "http://localhost:8331/v1/progress?scope=all&memorized=78-114&weight=letters"
```

Full endpoint list and the scope-selector grammar: [docs/API.md](docs/API.md).

### As a library

```js
import { computeProgress, ayahStats, locate, totals } from 'quran-analytics';

computeProgress({ scope: 'juz:30', memorized: '78-90' }).percent; // letter-weighted %
ayahStats(2, 282);   // { letters: 547, words: 128, percentOfQuran: {...} }
locate(2, 255);      // { juz: 3, hizb: 5, rub: 17, page: 42, ruku: 35, ... }
```

## Why letter-weighted progress?

طه (20:1) has 2 letters; آية الدين (2:282) has 547. Counting ayahs equally makes Juz ʿAmm look
like 9.04% of the Quran when it is actually **2.98%** by text volume. The progress engine here
weights by letters (words and ayahs also available). Implementation spec:
[docs/letter-weighted-progress.md](docs/letter-weighted-progress.md).

## Project layout

```
data/source/      Tanzil inputs (verbatim, never edited)
data/generated/   quran-analytics.json — the build artifact, never hand-edited
src/build/        parsing + counting + validation pipeline (npm run build)
src/domain/       pure queries: dataset, structure, stats, selectors, progress
src/http/         zero-dependency REST server over the domain layer
web/              static dashboard site (browse, progress, lookup) — npm run site
tests/            node --test suite
docs/             architecture, API, data dictionary, methodology, specs
```

Architecture rules and extension guide: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## License and attribution

- **Code:** MIT.
- **Data:** derived from Tanzil Quran Text (Uthmani, v1.1) and Tanzil Quran Metadata —
  © Tanzil Project, CC BY 3.0. Any use must visibly credit Tanzil and link to
  <https://tanzil.net>. The Tanzil source files in `data/source/` keep their original
  copyright headers and must not be modified.
