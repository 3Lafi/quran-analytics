// Size and percentage statistics. All percentages are raw floats out of 100;
// rounding is the presentation layer's concern. Never round intermediate
// values before summing - always sum raw counts first, divide once.

import { getDataset, globalIndex } from './dataset.js';
import { getSurah, getDivision } from './structure.js';

export function totals() {
    const { meta } = getDataset().data;
    return { ...meta.totals, basmala: meta.basmala, traditionalTotals: meta.traditionalTotals };
}

export function ayahLetters(surah, ayah) {
    const g = globalIndex(surah, ayah);
    return g === null ? 0 : getDataset().flatLetters[g - 1];
}

export function ayahWords(surah, ayah) {
    const g = globalIndex(surah, ayah);
    return g === null ? 0 : getDataset().flatWords[g - 1];
}

export function surahLetters(number) {
    return getSurah(number)?.letters ?? 0;
}

export function surahWords(number) {
    return getSurah(number)?.words ?? 0;
}

export function surahAyahs(number) {
    return getSurah(number)?.ayahs ?? 0;
}

export function lettersInScope(surahNumbers) {
    return surahNumbers.reduce((sum, n) => sum + surahLetters(n), 0);
}

export function wordsInScope(surahNumbers) {
    return surahNumbers.reduce((sum, n) => sum + surahWords(n), 0);
}

export function ayahsInScope(surahNumbers) {
    return surahNumbers.reduce((sum, n) => sum + surahAyahs(n), 0);
}

function percentOf(part, whole) {
    return whole === 0 ? 0 : (part / whole) * 100;
}

// Share of the whole Quran by each weighting, as raw percentages.
export function percentOfQuran({ letters = 0, words = 0, ayahs = 0 }) {
    const t = getDataset().data.meta.totals;
    return {
        byLetters: percentOf(letters, t.letters),
        byWords: percentOf(words, t.words),
        byAyahs: percentOf(ayahs, t.ayahs),
    };
}

export function ayahStats(surah, ayah) {
    const g = globalIndex(surah, ayah);
    if (g === null) return null;
    const letters = getDataset().flatLetters[g - 1];
    const words = getDataset().flatWords[g - 1];
    return { surah, ayah, letters, words, percentOfQuran: percentOfQuran({ letters, words, ayahs: 1 }) };
}

export function surahStats(number) {
    const s = getSurah(number);
    if (!s) return null;
    return { ...s, percentOfQuran: percentOfQuran(s) };
}

export function divisionStats(type, n) {
    const d = getDivision(type, n);
    if (!d) return null;
    return { ...d, percentOfQuran: percentOfQuran(d.stats) };
}
