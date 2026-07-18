# Data Dictionary — `data/generated/quran-analytics.json`

The dataset is a single JSON object with five sections. It is **generated** by
`npm run build` and must never be edited by hand.

## `meta`

| Field | Description |
|---|---|
| `dataset`, `version`, `generatedAt` | artifact identity; bump `version` in `generate-dataset.mjs` on breaking shape changes |
| `numbering` | prose statement: Kufan/Hafs, 6236 ayahs, unnumbered basmala excluded |
| `counting` | prose statement of the letter/word rules |
| `sources[]` | Tanzil text + metadata provenance, urls, licenses (CC BY 3.0 — attribution required) |
| `totals` | `{ surahs: 114, ayahs: 6236, words, letters, juz: 30, hizb: 60, rub: 240, manzil: 7, ruku: 556, page: 604, sajda: 15 }` — `words`/`letters` are computed sums |
| `basmala` | letters (19) and words (4) of the basmala, the 112 unnumbered occurrences, and what totals would be if they were included |
| `traditionalTotals` | classical figures (77,439 words / 323,671 letters) with a note on why they differ from computed totals |

## `surahs[]` — 114 entries, mushaf order

| Field | Example (surah 2) | Description |
|---|---|---|
| `number` | `2` | 1..114 |
| `name` | `"البقرة"` | Arabic name |
| `tname` | `"Al-Baqara"` | transliteration |
| `ename` | `"The Cow"` | English name |
| `type` | `"Medinan"` | `Meccan` \| `Medinan` |
| `revelationOrder` | `87` | chronological order of revelation (Tanzil) |
| `rukus` | `40` | number of rukuʿ sections in the surah |
| `ayahs` | `286` | ayah count (Kufan) |
| `letters` | `61499` | sum of the surah's per-ayah letter counts |
| `words` | `14775` | sum of the surah's per-ayah word counts |
| `globalStart` | `8` | global index (1..6236) of the surah's first ayah |

*(`letters`/`words` examples here are illustrative — read real values from the file.)*

## `ayahLetters` / `ayahWords`

Objects keyed by surah number (as a string, `"1"`..`"114"`); each value is an array where
index `i` holds the count for **ayah `i + 1`**:

```js
ayahLetters["1"]      // [19, 17, 12, 11, 19, 18, 43]  — الفاتحة
ayahLetters["2"][281] // 547                            — 2:282
```

Counts exclude the unnumbered basmala (see `meta.numbering`).

## `divisions`

Six parallel structures: `juz` (30), `hizb` (60), `rub` (240), `manzil` (7), `ruku` (556),
`page` (604). Every entry:

```json
{
  "n": 30,
  "start": { "surah": 78, "ayah": 1 },
  "end":   { "surah": 114, "ayah": 6 },
  "stats": { "ayahs": 564, "letters": 9699, "words": 2308 }
}
```

- Entries are contiguous and cover all 6236 ayahs exactly once per division type
  (the build refuses to emit otherwise).
- Structural identities: `rub[(j-1)*8]` starts juz `j`; `rub[(h-1)*4]` starts hizb `h`.

## `sajdas[]` — 15 entries

```json
{ "surah": 32, "ayah": 15, "type": "obligatory" }
```

`type` is `recommended` or `obligatory` (Tanzil classification).

## Invariants a consumer may rely on

1. `surahs.length === 114`; `Σ surahs[].ayahs === 6236`.
2. `ayahLetters[s].length === surahs[s-1].ayahs` for every surah; all counts ≥ 1.
3. `Σ all ayahLetters === meta.totals.letters` (and likewise for words).
4. For every division type, stats sum exactly to `meta.totals`.
5. `globalStart` is the prefix-sum of preceding surahs' ayah counts, starting at 1.
