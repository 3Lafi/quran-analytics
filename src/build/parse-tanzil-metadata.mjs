// Parses Tanzil's quran-data.js metadata file (CC BY 3.0, tanzil.net).
// Tanzil arrays are 1-indexed: entry [0] is an empty placeholder, and some
// sections carry one trailing end-sentinel row. We slice exactly the expected
// number of real entries and assert nothing unexpected remains.

import { readFileSync } from 'node:fs';

const EXPECTED = { Sura: 114, Juz: 30, HizbQaurter: 240, Manzil: 7, Ruku: 556, Page: 604, Sajda: 15 };

export function parseTanzilMetadata(metadataPath) {
    const src = readFileSync(metadataPath, 'utf8');
    const QuranData = {};
    // The file only assigns to QuranData.*; evaluate it in a bare scope.
    new Function('QuranData', src.replace('var QuranData = {};', ''))(QuranData);

    const sections = {};
    for (const [name, expected] of Object.entries(EXPECTED)) {
        const raw = QuranData[name];
        if (!Array.isArray(raw)) throw new Error(`Missing section ${name} in metadata`);
        if (raw[0].length !== 0) throw new Error(`${name}[0] should be an empty placeholder`);
        const extra = raw.length - 1 - expected;
        if (extra !== 0 && extra !== 1) {
            throw new Error(`${name}: expected ${expected} entries (+optional sentinel), got ${raw.length - 1}`);
        }
        sections[name] = raw.slice(1, 1 + expected);
    }

    const suras = sections.Sura.map((row, i) => {
        const [start, ayas, order, rukus, name, tname, ename, type] = row;
        return { number: i + 1, globalStart: start + 1, ayahs: ayas, revelationOrder: order, rukus, name, tname, ename, type };
    });

    const boundary = rows => rows.map(([sura, aya], i) => ({ n: i + 1, surah: sura, ayah: aya }));

    const sajdas = sections.Sajda.map(([sura, aya, type]) => ({ surah: sura, ayah: aya, type }));
    for (const s of sajdas) {
        if (s.type !== 'recommended' && s.type !== 'obligatory') {
            throw new Error(`Unexpected sajda type "${s.type}" at ${s.surah}:${s.ayah}`);
        }
    }

    return {
        suras,
        juz: boundary(sections.Juz),
        rub: boundary(sections.HizbQaurter),
        manzil: boundary(sections.Manzil),
        ruku: boundary(sections.Ruku),
        page: boundary(sections.Page),
        sajdas,
    };
}
