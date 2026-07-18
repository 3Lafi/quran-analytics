// Parses ayah-set selectors into a membership mask over global indexes.
//
// Grammar (comma-separated items, whitespace-free):
//   all                     the whole Quran
//   5                       whole surah 5
//   78-114                  whole surahs 78..114
//   2:255                   single ayah
//   2:1-141                 ayah range inside one surah
//   juz:30  hizb:55-60  rub:1-8  manzil:7  ruku:10  page:600-604
//
// Returns Uint8Array(totalAyahs + 1); mask[g] = 1 means the ayah with global
// index g is selected. Throws SelectorError with a human-readable message on
// any invalid input - callers map that to HTTP 400.

import { getDataset, globalIndex, DIVISION_TYPES } from './dataset.js';

export class SelectorError extends Error {}

function fail(message) {
    throw new SelectorError(message);
}

function parseInt10(text, what) {
    if (!/^\d+$/.test(text)) fail(`${what} must be a positive integer, got "${text}"`);
    return Number(text);
}

function parseRange(text, what) {
    const parts = text.split('-');
    if (parts.length > 2) fail(`Bad range "${text}"`);
    const from = parseInt10(parts[0], what);
    const to = parts.length === 2 ? parseInt10(parts[1], what) : from;
    if (to < from) fail(`Range "${text}" is reversed`);
    return [from, to];
}

export function parseSelector(input) {
    const ds = getDataset();
    const mask = new Uint8Array(ds.totalAyahs + 1);
    const text = String(input ?? '').trim();
    if (text === '') return mask;

    const markGlobalRange = (gFrom, gTo) => {
        for (let g = gFrom; g <= gTo; g++) mask[g] = 1;
    };

    for (const item of text.split(',')) {
        if (item === 'all') {
            markGlobalRange(1, ds.totalAyahs);
        } else if (item.includes(':')) {
            const [head, tail, ...extra] = item.split(':');
            if (extra.length) fail(`Bad item "${item}"`);
            if (DIVISION_TYPES.includes(head)) {
                const list = ds.data.divisions[head];
                const [from, to] = parseRange(tail, `${head} number`);
                if (from < 1 || to > list.length) fail(`${head} number out of range 1-${list.length} in "${item}"`);
                for (let n = from; n <= to; n++) {
                    const d = list[n - 1];
                    markGlobalRange(globalIndex(d.start.surah, d.start.ayah), globalIndex(d.end.surah, d.end.ayah));
                }
            } else {
                const surah = parseInt10(head, 'surah number');
                const s = ds.surahByNumber.get(surah);
                if (!s) fail(`Unknown surah ${surah} in "${item}"`);
                const [from, to] = parseRange(tail, 'ayah number');
                if (from < 1 || to > s.ayahs) fail(`Ayah out of range 1-${s.ayahs} for surah ${surah} in "${item}"`);
                markGlobalRange(globalIndex(surah, from), globalIndex(surah, to));
            }
        } else {
            const [from, to] = parseRange(item, 'surah number');
            if (from < 1 || to > 114) fail(`Surah number out of range 1-114 in "${item}"`);
            for (let n = from; n <= to; n++) {
                const s = ds.surahByNumber.get(n);
                markGlobalRange(s.globalStart, s.globalStart + s.ayahs - 1);
            }
        }
    }
    return mask;
}
