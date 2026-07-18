# Counting Methodology

Everything in the dataset is reproducible: same inputs + same rules ⇒ same numbers,
byte for byte. This document is the normative statement of those rules.

## Sources

| Input | Version | License |
|---|---|---|
| `data/source/quran-uthmani.sql` | Tanzil Quran Text (Uthmani) v1.1 | CC BY 3.0 — attribution + link to tanzil.net required; text must not be modified |
| `data/source/quran-metadata.js` | Tanzil Quran Metadata v1.0 | CC BY 3.0 |

## Letter rule

A **letter** is a base rasm letter:

| Range | Contents |
|---|---|
| `U+0621–U+063A` | ء through غ |
| `U+0641–U+064A` | ف through ي |
| `U+0671` | ٱ alef-wasla |

Ignored (present in the text, never counted): space, tatweel `U+0640`, harakat/tanween/shadda/
sukun `U+064B–U+065F`, dagger alef `U+0670`, Quranic annotation signs and small letters
`U+06D6–U+06ED`. **Any other codepoint aborts the build** — the corpus must be 100% classified;
nothing is dropped silently.

## Word rule

A **word** is a whitespace-separated token containing at least one counted letter.
(Tokens made purely of annotation marks are not words.)

## Basmala policy

The numbering is Kufan/Hafs: **6236** ayahs. In that numbering the basmala opening a surah is
unnumbered except in الفاتحة (where it is ayah 1); التوبة has none. Therefore the generator strips
the basmala (19 letters, 4 words) from ayah 1 of the other **112** surahs before counting, and
verifies it stripped exactly 112. `meta.basmala.totalsIncludingUnnumbered` records what the
totals would be if they were counted instead.

## Verification performed by every build

1. SQL parse: exactly 6236 rows, `index` contiguous 1..6236, no escape sequences.
2. Metadata parse: exact section sizes (114/30/240/7/556/604/15), 1-indexed placeholders and
   end sentinels validated and removed.
3. Cross-source: per-surah ayah counts from the SQL match the metadata; `globalStart` matches
   the prefix sum of ayah counts.
4. Structural: juz ↔ every-8th-rub alignment; hizb = every 4th rub; all division types start at
   1:1, are non-empty, and their stats sum exactly to whole-Quran totals.
5. Spot checks, hand-counted letter by letter and audited against an independent copy of the
   text (2026-07-12): 1:1=19, 2:1=3, 2:255=184, 2:282=547, 20:1=2, 103:3=51, 108:1=15,
   114:6=13; words 1:1=4, 20:1=1, 108:1=3, 112:1=4.

The independent audit additionally verified: full codepoint inventory (72 distinct codepoints,
all classified), a second counting algorithm via Unicode properties matching all 6236 counts,
and byte-identical rasm versus the alquran.cloud copy of the Tanzil text for sampled ayahs.

## Computed vs. traditional totals

| | Computed (this dataset) | Traditional |
|---|---|---|
| Words | **77,433** | 77,439 (also cited: 77,430; 77,797) |
| Letters | **325,386** | 323,671 (also cited: 320,015; 340,740) |

Classical word/letter totals were produced under counting conventions that differ from any
single mechanical rule — e.g. whether hamza is a letter, how alef maqsura / ta marbuta are
treated, whether shadda doubles a letter, whether the basmala counts, and orthographic variance
between historical mushafs. None of these figures is "wrong"; they answer slightly different
questions. This dataset publishes the **computed** figures as canonical (because they are
verifiable) and carries the most-cited traditional pair in `meta.traditionalTotals` for
reference. For *proportional* uses (percentages, progress weighting) the choice is immaterial —
the distributions agree to within a fraction of a percent.
