# REST API Reference (v1)

Base URL: `http://localhost:8331` (set `PORT` to change). All responses are JSON:

```json
{ "ok": true,  "data": ... }          // 2xx
{ "ok": false, "error": "message" }   // 4xx / 5xx
```

CORS is open (`Access-Control-Allow-Origin: *`); responses are cacheable for 1 hour.
Only `GET` (and `OPTIONS`) are supported — the API is read-only by design.

## Endpoints

| Endpoint | Returns |
|---|---|
| `GET /` | API self-description |
| `GET /health` | `{ "status": "ok" }` |
| `GET /v1/meta` | totals (surahs/ayahs/words/letters/divisions), basmala policy, traditional figures |
| `GET /v1/surahs` | all 114 surahs with stats and `percentOfQuran` |
| `GET /v1/surahs/{n}` | one surah (`n` = 1..114) |
| `GET /v1/surahs/{n}/ayahs` | per-ayah `letters[]` and `words[]` arrays for that surah |
| `GET /v1/ayahs/{surah}/{ayah}` | one ayah: letters, words, `percentOfQuran`, and full `location` |
| `GET /v1/juz` · `/v1/juz/{1-30}` | juz list / one juz with start, end, stats, percent |
| `GET /v1/hizb` · `/v1/hizb/{1-60}` | hizb (2 per juz) |
| `GET /v1/rub` · `/v1/rub/{1-240}` | rubʿ quarters (the ۞ markers, 4 per hizb) |
| `GET /v1/manzil` · `/v1/manzil/{1-7}` | seven-day reading divisions |
| `GET /v1/ruku` · `/v1/ruku/{1-556}` | rukuʿ sections |
| `GET /v1/page` · `/v1/page/{1-604}` | Madani mushaf pages |
| `GET /v1/sajdas` | the 15 prostration ayahs with `recommended`/`obligatory` type |
| `GET /v1/progress` | letter-weighted progress — see below |

## `GET /v1/progress`

Query parameters:

| Param | Default | Meaning |
|---|---|---|
| `scope` | `all` | selector for the ayahs the student is expected to memorize |
| `memorized` | *(empty)* | selector for the ayahs actually memorized |
| `weight` | `letters` | `letters` \| `words` \| `ayahs` — which weight `percent` uses |

Example — a student assigned Juz ʿAmm who has memorized An-Naba through Al-Buruj:

```
GET /v1/progress?scope=juz:30&memorized=78-85
```

```json
{
  "ok": true,
  "data": {
    "weight": "letters",
    "percent": 43.47...,
    "percentBy": { "letters": 43.47, "words": 43.9, "ayahs": 50.1 },
    "scope":     { "ayahs": 564, "letters": 9699, "words": 2308 },
    "memorized": { "ayahs": 283, "letters": 4217, "words": 1014 },
    "memorizedOutsideScopeAyahs": 0
  }
}
```

(Numbers above are illustrative except scope; always read live values.)

## Selector grammar

Comma-separated items, no whitespace. Used by both `scope` and `memorized`:

| Item | Meaning |
|---|---|
| `all` | the whole Quran |
| `5` | whole surah 5 |
| `78-114` | whole surahs 78..114 |
| `2:255` | a single ayah |
| `2:1-141` | an ayah range within one surah |
| `juz:30`, `juz:1-3` | whole juz / juz range |
| `hizb:55-60`, `rub:1-8`, `manzil:7`, `ruku:10`, `page:600-604` | any other division, same syntax |

Items may overlap freely — selection is a set (duplicates are harmless). Invalid input
(unknown surah, ayah out of range, reversed range, unknown division) → `400` with a
human-readable message.

## Errors

| Status | When |
|---|---|
| `400` | malformed selector or parameter |
| `404` | unknown path, surah/ayah/division out of range |
| `405` | any method other than GET/OPTIONS |
| `500` | unexpected internal failure (logged server-side) |

## Attribution requirement

Responses derive from Tanzil data (CC BY 3.0). Public deployments must visibly credit
**Tanzil Project** with a link to <https://tanzil.net>.
