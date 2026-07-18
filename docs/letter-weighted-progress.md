# Spec: Letter-weighted Quran progress (نسبة التقدم بعدد الحروف)

**Audience:** any developer or AI model implementing memorization progress in any app.
**Rule of thumb:** if you follow the numbered steps and your output matches every value in the
[Acceptance table](#7-acceptance-table), your implementation is correct. No step is optional.

## 1. Problem

Ayahs vary in length by two orders of magnitude: طه (20:1) has **2** letters, آية الدين (2:282) has
**547**. If progress counts "1 ayah = 1 unit", a student who memorized Juz ʿAmm (564 short ayahs)
appears to have done **9.04%** of the Quran when the text they actually hold is **2.98%**.

**Fix:** weight every ayah by its **letter count**.

## 2. Definitions (do not reinterpret these)

| Term | Definition |
|---|---|
| Letter | Base rasm letter of the Uthmani text: Unicode `U+0621–U+063A`, `U+0641–U+064A`, `U+0671`. Diacritics, tanween, shadda, sukun, dagger alef, tatweel, and Quranic annotation marks are **not** letters. |
| Numbering | Kufan/Hafs — exactly **6236** ayahs. |
| Basmala | The unnumbered basmala opening 112 surahs is **excluded** from every count. It is only counted in الفاتحة, where it *is* ayah 1. التوبة has none. |
| `TOTAL_LETTERS` | **325386** — sum of letters over all 6236 ayahs under the rules above. |
| Scope | The set of ayahs a student is expected to memorize (may be the whole Quran, a juz, a list of surahs…). |

## 3. Data source — never count letters yourself

Use the pre-computed, audited dataset from the **QuranAnalytics** project
(`data/generated/quran-analytics.json`, or the API at `/v1/...`). It provides:

- `ayahLetters[surah][ayah - 1]` → letters of one ayah (e.g. `ayahLetters[2][281] === 547`)
- `surahs[i].letters` → per-surah totals (e.g. surah 112 → `47`)
- `meta.totals.letters` → `325386`

Do **not** re-derive counts from Quran text at runtime, do not hand-edit values, and do not
substitute letter counts from any other source (conventions differ; mixed sources = wrong totals).

## 4. Algorithm (exactly this, in order)

```
progress_percent(scope, memorized):
  1. done          = memorized ∩ scope          # ignore memorized ayahs outside scope
  2. scopeLetters  = Σ letters(a) for a in scope
  3. doneLetters   = Σ letters(a) for a in done
  4. if scopeLetters == 0: return 0             # never divide by zero
  5. return doneLetters / scopeLetters * 100
```

If tracking is per whole surah (not per ayah), the same algorithm applies with surah letter
totals — the result is identical because a surah's total is the sum of its ayahs' letters.

## 5. Rounding rules

1. **Never** round or truncate per-ayah/per-surah values before summing. Sum raw integers first,
   divide once, at the end.
2. Round only in the presentation layer (`Math.round` for a progress bar is fine).
3. Per-ayah shares of the whole Quran are tiny (mean ≈ 0.016%). Display with ≥ 4 decimal places
   or per-mille — never show "0%" for a nonzero value.

## 6. Reference implementation (JavaScript, copy-paste)

```js
// letters(surah)   -> integer, from the dataset's surahs[].letters
// scope, memorized -> arrays of surah numbers (deduplicated)
function progressPercent(scope, memorized, letters) {
    const scopeSet = new Set(scope);
    const scopeLetters = scope.reduce((sum, n) => sum + letters(n), 0);
    if (scopeLetters === 0) return 0;
    const doneLetters = memorized
        .filter(n => scopeSet.has(n))
        .reduce((sum, n) => sum + letters(n), 0);
    return (doneLetters / scopeLetters) * 100;
}
```

## 7. Acceptance table

Your implementation MUST reproduce every row. `≈` means within ±0.001 unless stated.

| Check | Expected |
|---|---|
| `TOTAL_LETTERS` | `325386` |
| الفاتحة per-ayah letters | `[19, 17, 12, 11, 19, 18, 43]` (sum `139`) |
| Surah 112 (الإخلاص) letters | `47` |
| Ayah 2:282 letters | `547` |
| Ayah 20:1 letters | `2` |
| Ayah 2:255 (آية الكرسي) letters | `184` |
| Juz 30 letters | `9699` |
| Scope = whole Quran, memorized = surahs 78–114 | `2.981%` by letters (vs `9.044%` by ayahs) |
| Scope = الفاتحة only, memorized = الفاتحة | `100%` |
| Scope = الفاتحة only, memorized = الإخلاص | `0%` (outside scope is ignored) |
| Empty scope | `0` (no NaN, no crash) |
| 2:282 share of whole Quran | `≈ 0.1681%` |
| 20:1 share of whole Quran | `≈ 0.0006%` (4+ decimals — not "0%") |
| Sum of all 114 surah shares | `≈ 100` (float tolerance `1e-9`) |

## 8. Common mistakes (each one has actually happened — check for all)

1. **Counting the basmala** in ayah 1 of surahs other than الفاتحة → totals come out 2128 letters high.
2. **Counting diacritics or annotation marks** as letters → totals inflate by tens of thousands.
3. **Rounding per-surah percentages then summing** → progress drifts by whole points.
4. **`1 ayah = 1 unit` anywhere** in the chain (including class averages built on ayah counts).
5. **Mixing letter sources** (classical 323,671-style figures vs computed) → sums no longer match.
6. **Counting memorized ayahs outside the scope** → >100% progress possible.
7. Changing displayed *ayah counts* ("N آية" labels). Letter weighting changes **progress math
   only** — ayah counts remain correct for display.

## 9. Attribution (license requirement — not optional)

Letter data derives from Tanzil Quran Text (Uthmani, v1.1), CC BY 3.0. Any UI or API using it
must visibly credit **Tanzil** with a link to <https://tanzil.net>:

> بيانات عدد الحروف مشتقة من نص المصحف العثماني لمشروع تنزيل — [tanzil.net](https://tanzil.net) — رخصة CC BY 3.0.
