// Browser port of src/domain/*. Same algorithms, same invariants — the only
// difference is loading: the Node version reads the dataset file with
// node:fs at import time, this version fetches it once and callers await
// loadDataset() before using anything else. Keep this in sync with
// src/domain by hand; see docs/ARCHITECTURE.md "Porting to another platform".

export const DIVISION_TYPES = ['juz', 'hizb', 'rub', 'manzil', 'ruku', 'page'];

let ds = null;

function buildIndexes(data) {
    const totalAyahs = data.meta.totals.ayahs;
    const surahByNumber = new Map(data.surahs.map(s => [s.number, s]));

    const flatLetters = [];
    const flatWords = [];
    for (const s of data.surahs) {
        flatLetters.push(...data.ayahLetters[s.number]);
        flatWords.push(...data.ayahWords[s.number]);
    }

    const surahStarts = data.surahs.map(s => s.globalStart);
    const divisionStarts = {};
    for (const type of DIVISION_TYPES) {
        divisionStarts[type] = data.divisions[type].map(d =>
            surahByNumber.get(d.start.surah).globalStart + d.start.ayah - 1);
    }

    const sajdaByRef = new Map(data.sajdas.map(s => [`${s.surah}:${s.ayah}`, s.type]));

    return { data, totalAyahs, surahByNumber, flatLetters, flatWords, surahStarts, divisionStarts, sajdaByRef };
}

export async function loadDataset(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load dataset: HTTP ${res.status}`);
    ds = buildIndexes(await res.json());
    return ds;
}

function d() {
    if (!ds) throw new Error('Dataset not loaded yet — call loadDataset() first');
    return ds;
}

export function globalIndex(surah, ayah) {
    const s = d().surahByNumber.get(surah);
    if (!s || !Number.isInteger(ayah) || ayah < 1 || ayah > s.ayahs) return null;
    return s.globalStart + ayah - 1;
}

function lastStartAtOrBefore(starts, g) {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (starts[mid] <= g) lo = mid; else hi = mid - 1;
    }
    return lo;
}

export function refOfGlobal(g) {
    const ds_ = d();
    if (!Number.isInteger(g) || g < 1 || g > ds_.totalAyahs) return null;
    const i = lastStartAtOrBefore(ds_.surahStarts, g);
    const s = ds_.data.surahs[i];
    return { surah: s.number, ayah: g - s.globalStart + 1 };
}

export function listSurahs() {
    return d().data.surahs;
}

export function getSurah(number) {
    return d().surahByNumber.get(number) ?? null;
}

export function surahAyahLetters(number) {
    return d().data.ayahLetters[number] ?? null;
}

export function surahAyahWords(number) {
    return d().data.ayahWords[number] ?? null;
}

export function listDivision(type) {
    if (!DIVISION_TYPES.includes(type)) return null;
    return d().data.divisions[type];
}

export function getDivision(type, n) {
    const list = listDivision(type);
    if (!list || !Number.isInteger(n) || n < 1 || n > list.length) return null;
    return list[n - 1];
}

export function listSajdas() {
    return d().data.sajdas;
}

export function divisionAt(type, surah, ayah) {
    const g = globalIndex(surah, ayah);
    if (g === null || !DIVISION_TYPES.includes(type)) return null;
    return lastStartAtOrBefore(d().divisionStarts[type], g) + 1;
}

export function locate(surah, ayah) {
    const g = globalIndex(surah, ayah);
    if (g === null) return null;
    const ds_ = d();
    const location = { surah, ayah, globalIndex: g, surahName: ds_.surahByNumber.get(surah).name };
    for (const type of DIVISION_TYPES) {
        location[type] = lastStartAtOrBefore(ds_.divisionStarts[type], g) + 1;
    }
    location.sajda = ds_.sajdaByRef.get(`${surah}:${ayah}`) ?? null;
    return location;
}

export function totals() {
    const { meta } = d().data;
    return { ...meta.totals, basmala: meta.basmala, traditionalTotals: meta.traditionalTotals };
}

export function ayahLetters(surah, ayah) {
    const g = globalIndex(surah, ayah);
    return g === null ? 0 : d().flatLetters[g - 1];
}

export function ayahWords(surah, ayah) {
    const g = globalIndex(surah, ayah);
    return g === null ? 0 : d().flatWords[g - 1];
}

function percentOf(part, whole) {
    return whole === 0 ? 0 : (part / whole) * 100;
}

export function percentOfQuran({ letters = 0, words = 0, ayahs = 0 }) {
    const t = d().data.meta.totals;
    return {
        byLetters: percentOf(letters, t.letters),
        byWords: percentOf(words, t.words),
        byAyahs: percentOf(ayahs, t.ayahs),
    };
}

export function ayahStats(surah, ayah) {
    const g = globalIndex(surah, ayah);
    if (g === null) return null;
    const letters = d().flatLetters[g - 1];
    const words = d().flatWords[g - 1];
    return { surah, ayah, letters, words, percentOfQuran: percentOfQuran({ letters, words, ayahs: 1 }) };
}

export function surahStats(number) {
    const s = getSurah(number);
    if (!s) return null;
    return { ...s, percentOfQuran: percentOfQuran(s) };
}

export function divisionStats(type, n) {
    const dd = getDivision(type, n);
    if (!dd) return null;
    return { ...dd, percentOfQuran: percentOfQuran(dd.stats) };
}

// --- selectors (docs/API.md "Selector grammar") ---

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
    const ds_ = d();
    const mask = new Uint8Array(ds_.totalAyahs + 1);
    const text = String(input ?? '').trim();
    if (text === '') return mask;

    const markGlobalRange = (gFrom, gTo) => {
        for (let g = gFrom; g <= gTo; g++) mask[g] = 1;
    };

    for (const item of text.split(',')) {
        if (item === 'all') {
            markGlobalRange(1, ds_.totalAyahs);
        } else if (item.includes(':')) {
            const [head, tail, ...extra] = item.split(':');
            if (extra.length) fail(`Bad item "${item}"`);
            if (DIVISION_TYPES.includes(head)) {
                const list = ds_.data.divisions[head];
                const [from, to] = parseRange(tail, `${head} number`);
                if (from < 1 || to > list.length) fail(`${head} number out of range 1-${list.length} in "${item}"`);
                for (let n = from; n <= to; n++) {
                    const dd = list[n - 1];
                    markGlobalRange(globalIndex(dd.start.surah, dd.start.ayah), globalIndex(dd.end.surah, dd.end.ayah));
                }
            } else {
                const surah = parseInt10(head, 'surah number');
                const s = ds_.surahByNumber.get(surah);
                if (!s) fail(`Unknown surah ${surah} in "${item}"`);
                const [from, to] = parseRange(tail, 'ayah number');
                if (from < 1 || to > s.ayahs) fail(`Ayah out of range 1-${s.ayahs} for surah ${surah} in "${item}"`);
                markGlobalRange(globalIndex(surah, from), globalIndex(surah, to));
            }
        } else {
            const [from, to] = parseRange(item, 'surah number');
            if (from < 1 || to > 114) fail(`Surah number out of range 1-114 in "${item}"`);
            for (let n = from; n <= to; n++) {
                const s = ds_.surahByNumber.get(n);
                markGlobalRange(s.globalStart, s.globalStart + s.ayahs - 1);
            }
        }
    }
    return mask;
}

// --- progress (docs/letter-weighted-progress.md) ---

export const WEIGHTS = ['letters', 'words', 'ayahs'];

function sumOverMask(mask, values) {
    let sum = 0;
    for (let g = 1; g < mask.length; g++) {
        if (mask[g]) sum += values ? values[g - 1] : 1;
    }
    return sum;
}

export function computeProgress({ scope = 'all', memorized = '', weight = 'letters' } = {}) {
    if (!WEIGHTS.includes(weight)) {
        throw new RangeError(`weight must be one of ${WEIGHTS.join(', ')}`);
    }
    const ds_ = d();
    const scopeMask = typeof scope === 'string' ? parseSelector(scope) : scope;
    const memMask = typeof memorized === 'string' ? parseSelector(memorized) : memorized;

    const doneMask = new Uint8Array(scopeMask.length);
    let memorizedOutsideScope = 0;
    for (let g = 1; g < scopeMask.length; g++) {
        if (memMask[g] && scopeMask[g]) doneMask[g] = 1;
        else if (memMask[g]) memorizedOutsideScope++;
    }

    const sums = mask => ({
        ayahs: sumOverMask(mask, null),
        letters: sumOverMask(mask, ds_.flatLetters),
        words: sumOverMask(mask, ds_.flatWords),
    });
    const scopeSums = sums(scopeMask);
    const doneSums = sums(doneMask);

    const percentBy = {};
    for (const w of WEIGHTS) {
        percentBy[w] = scopeSums[w] === 0 ? 0 : (doneSums[w] / scopeSums[w]) * 100;
    }

    return {
        weight,
        percent: percentBy[weight],
        percentBy,
        scope: scopeSums,
        memorized: doneSums,
        memorizedOutsideScopeAyahs: memorizedOutsideScope,
    };
}
