// Loads the generated dataset once and builds the derived indexes every other
// domain module works from. Nothing here does I/O after the first call.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DATA_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'generated', 'quran-analytics.json');

export const DIVISION_TYPES = ['juz', 'hizb', 'rub', 'manzil', 'ruku', 'page'];

let cached = null;

export function getDataset() {
    if (cached) return cached;

    const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
    const totalAyahs = data.meta.totals.ayahs;

    const surahByNumber = new Map(data.surahs.map(s => [s.number, s]));

    // flat[g-1] = per-ayah value at global index g (1..6236, mushaf order)
    const flatLetters = [];
    const flatWords = [];
    for (const s of data.surahs) {
        flatLetters.push(...data.ayahLetters[s.number]);
        flatWords.push(...data.ayahWords[s.number]);
    }

    // prefix[g] = sum over global indexes 1..g; range sum = prefix[b] - prefix[a-1]
    const prefix = arr => arr.reduce((acc, v) => (acc.push(acc.at(-1) + v), acc), [0]);
    const letterPrefix = prefix(flatLetters);
    const wordPrefix = prefix(flatWords);

    const surahStarts = data.surahs.map(s => s.globalStart);
    const divisionStarts = {};
    for (const type of DIVISION_TYPES) {
        divisionStarts[type] = data.divisions[type].map(d =>
            surahByNumber.get(d.start.surah).globalStart + d.start.ayah - 1);
    }

    const sajdaByRef = new Map(data.sajdas.map(s => [`${s.surah}:${s.ayah}`, s.type]));

    cached = Object.freeze({
        data,
        totalAyahs,
        surahByNumber,
        flatLetters,
        flatWords,
        letterPrefix,
        wordPrefix,
        surahStarts,
        divisionStarts,
        sajdaByRef,
    });
    return cached;
}

// Global index of an ayah (1..6236), or null for an invalid reference.
export function globalIndex(surah, ayah) {
    const s = getDataset().surahByNumber.get(surah);
    if (!s || !Number.isInteger(ayah) || ayah < 1 || ayah > s.ayahs) return null;
    return s.globalStart + ayah - 1;
}

// Index (0-based) of the last element in sorted `starts` that is <= g.
export function lastStartAtOrBefore(starts, g) {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (starts[mid] <= g) lo = mid; else hi = mid - 1;
    }
    return lo;
}

// Converts a global index back to a { surah, ayah } reference.
export function refOfGlobal(g) {
    const ds = getDataset();
    if (!Number.isInteger(g) || g < 1 || g > ds.totalAyahs) return null;
    const i = lastStartAtOrBefore(ds.surahStarts, g);
    const s = ds.data.surahs[i];
    return { surah: s.number, ayah: g - s.globalStart + 1 };
}
