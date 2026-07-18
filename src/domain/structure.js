// Structural queries: surahs, divisions (juz/hizb/rub/manzil/ruku/page),
// sajdas, and full location lookup for any ayah.

import { getDataset, globalIndex, lastStartAtOrBefore, DIVISION_TYPES } from './dataset.js';

export { DIVISION_TYPES };

export function listSurahs() {
    return getDataset().data.surahs;
}

export function getSurah(number) {
    return getDataset().surahByNumber.get(number) ?? null;
}

export function surahAyahLetters(number) {
    return getDataset().data.ayahLetters[number] ?? null;
}

export function surahAyahWords(number) {
    return getDataset().data.ayahWords[number] ?? null;
}

export function listDivision(type) {
    if (!DIVISION_TYPES.includes(type)) return null;
    return getDataset().data.divisions[type];
}

export function getDivision(type, n) {
    const list = listDivision(type);
    if (!list || !Number.isInteger(n) || n < 1 || n > list.length) return null;
    return list[n - 1];
}

export function listSajdas() {
    return getDataset().data.sajdas;
}

// Which entry of a division type contains the given ayah (1-based n).
export function divisionAt(type, surah, ayah) {
    const g = globalIndex(surah, ayah);
    if (g === null || !DIVISION_TYPES.includes(type)) return null;
    return lastStartAtOrBefore(getDataset().divisionStarts[type], g) + 1;
}

// Everything known about one ayah's position in the mushaf structure.
export function locate(surah, ayah) {
    const g = globalIndex(surah, ayah);
    if (g === null) return null;
    const ds = getDataset();
    const location = { surah, ayah, globalIndex: g, surahName: ds.surahByNumber.get(surah).name };
    for (const type of DIVISION_TYPES) {
        location[type] = lastStartAtOrBefore(ds.divisionStarts[type], g) + 1;
    }
    location.sajda = ds.sajdaByRef.get(`${surah}:${ayah}`) ?? null;
    return location;
}
