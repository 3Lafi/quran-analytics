// Builds data/generated/quran-analytics.json from the two Tanzil sources in
// data/source/. Every number in the dataset is computed here, validated
// against independent invariants and hand-verified spot checks, and never
// edited by hand.
//
// Usage:
//   node src/build/generate-dataset.mjs                   # rebuild dataset JSON
//   node src/build/generate-dataset.mjs --wisam <path>    # also emit the Wisam app module

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { countLetters, countWords, stripBasmala, BASMALA_LETTERS, BASMALA_WORD_COUNT } from './count-text.mjs';
import { parseTanzilSql, TOTAL_AYAHS } from './parse-tanzil-sql.mjs';
import { parseTanzilMetadata } from './parse-tanzil-metadata.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SQL_PATH = join(ROOT, 'data', 'source', 'quran-uthmani.sql');
const META_PATH = join(ROOT, 'data', 'source', 'quran-metadata.js');
const OUT_PATH = join(ROOT, 'data', 'generated', 'quran-analytics.json');

// ---------------------------------------------------------------- counting

const rows = parseTanzilSql(SQL_PATH);
const meta = parseTanzilMetadata(META_PATH);

const ayahLetters = {}; // surah -> [letters per ayah]
const ayahWords = {};   // surah -> [words per ayah]
let basmalaStripped = 0;

for (const { sura, aya, text } of rows) {
    // The unnumbered basmala opens every surah except Al-Fatiha (where it IS
    // ayah 1) and At-Tawba (which has none). Kufan numbering (6236) does not
    // count it, so it is excluded from ayah 1 of the other 112 surahs.
    let body = text;
    if (aya === 1 && sura !== 1 && sura !== 9) {
        body = stripBasmala(text, `${sura}:${aya}`);
        basmalaStripped++;
    }
    (ayahLetters[sura] ??= []).push(countLetters(body, `${sura}:${aya}`));
    (ayahWords[sura] ??= []).push(countWords(body));
}

// ---------------------------------------------------------------- validation

function check(cond, message) {
    if (!cond) throw new Error(`Validation failed: ${message}`);
}

check(basmalaStripped === 112, `stripped ${basmalaStripped} basmalas, expected 112`);

for (const s of meta.suras) {
    const arr = ayahLetters[s.number];
    check(arr && arr.length === s.ayahs, `surah ${s.number}: ${arr?.length ?? 0} ayahs vs metadata ${s.ayahs}`);
    check(arr.every(c => Number.isInteger(c) && c > 0), `surah ${s.number}: non-positive letter count`);
    const expectedStart = 1 + meta.suras.slice(0, s.number - 1).reduce((sum, p) => sum + p.ayahs, 0);
    check(s.globalStart === expectedStart, `surah ${s.number}: globalStart ${s.globalStart} vs computed ${expectedStart}`);
}

// Letter spot checks hand-counted and externally audited (see docs/COUNTING_METHODOLOGY.md).
const LETTER_SPOT = [
    [1, 1, 19],    // basmala (Al-Fatiha 1)
    [2, 1, 3],     // alif-lam-mim
    [2, 255, 184], // Ayat al-Kursi
    [2, 282, 547], // the debt ayah - longest in the Quran
    [20, 1, 2],    // Ta-Ha - shortest
    [103, 3, 51],
    [108, 1, 15],
    [114, 6, 13],
];
for (const [s, a, expected] of LETTER_SPOT) {
    check(ayahLetters[s][a - 1] === expected, `letters ${s}:${a} = ${ayahLetters[s][a - 1]}, expected ${expected}`);
}
const WORD_SPOT = [
    [1, 1, 4],   // bismi llahi r-rahmani r-rahim
    [20, 1, 1],  // Ta-Ha
    [108, 1, 3], // inna a'taynaka l-kawthar
    [112, 1, 4], // qul huwa llahu ahad
];
for (const [s, a, expected] of WORD_SPOT) {
    check(ayahWords[s][a - 1] === expected, `words ${s}:${a} = ${ayahWords[s][a - 1]}, expected ${expected}`);
}

// ------------------------------------------------------- global flat arrays

// flat[g-1] = value of the ayah with global index g (1..6236, mushaf order)
const flatLetters = [];
const flatWords = [];
for (const s of meta.suras) {
    flatLetters.push(...ayahLetters[s.number]);
    flatWords.push(...ayahWords[s.number]);
}
check(flatLetters.length === TOTAL_AYAHS, 'flat letters length');

const totalLetters = flatLetters.reduce((a, b) => a + b, 0);
const totalWords = flatWords.reduce((a, b) => a + b, 0);

// prefix[g] = sum of the first g ayahs; range sum = prefix[end] - prefix[start-1]
const prefix = arr => arr.reduce((acc, v) => (acc.push(acc.at(-1) + v), acc), [0]);
const letterPrefix = prefix(flatLetters);
const wordPrefix = prefix(flatWords);

const globalStartOf = new Map(meta.suras.map(s => [s.number, s.globalStart]));
const globalIndex = (surah, ayah) => globalStartOf.get(surah) + ayah - 1;

function refOfGlobal(g) {
    // suras are sorted by globalStart; find the last sura starting at or before g
    let lo = 0, hi = meta.suras.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (meta.suras[mid].globalStart <= g) lo = mid; else hi = mid - 1;
    }
    const s = meta.suras[lo];
    return { surah: s.number, ayah: g - s.globalStart + 1 };
}

// ---------------------------------------------------------------- divisions

// Each division type is a list of start boundaries; entry n spans from its
// start up to the ayah before entry n+1 (the last entry runs to 6236).
function buildDivision(boundaries) {
    return boundaries.map((b, i) => {
        const gStart = globalIndex(b.surah, b.ayah);
        const next = boundaries[i + 1];
        const gEnd = next ? globalIndex(next.surah, next.ayah) - 1 : TOTAL_AYAHS;
        check(gEnd >= gStart, `empty division span at entry ${b.n} (${b.surah}:${b.ayah})`);
        return {
            n: b.n,
            start: { surah: b.surah, ayah: b.ayah },
            end: refOfGlobal(gEnd),
            stats: {
                ayahs: gEnd - gStart + 1,
                letters: letterPrefix[gEnd] - letterPrefix[gStart - 1],
                words: wordPrefix[gEnd] - wordPrefix[gStart - 1],
            },
        };
    });
}

// 60 hizb boundaries are every 4th rub boundary; 30 juz are every 8th.
const hizbBoundaries = meta.rub.filter((_, i) => i % 4 === 0).map((b, i) => ({ ...b, n: i + 1 }));
check(hizbBoundaries.length === 60, 'hizb count');
meta.juz.forEach((j, i) => {
    const q = meta.rub[i * 8];
    check(q.surah === j.surah && q.ayah === j.ayah, `juz ${j.n} does not align with rub ${i * 8 + 1}`);
});
for (const list of [meta.juz, meta.rub, meta.manzil, meta.ruku, meta.page]) {
    check(list[0].surah === 1 && list[0].ayah === 1, 'division must start at 1:1');
}
for (const s of meta.sajdas) {
    check(s.ayah >= 1 && s.ayah <= ayahLetters[s.surah].length, `sajda out of range at ${s.surah}:${s.ayah}`);
}

const divisions = {
    juz: buildDivision(meta.juz),
    hizb: buildDivision(hizbBoundaries),
    rub: buildDivision(meta.rub),
    manzil: buildDivision(meta.manzil),
    ruku: buildDivision(meta.ruku),
    page: buildDivision(meta.page),
};

// Division stats must each sum back to the whole-Quran totals.
for (const [name, list] of Object.entries(divisions)) {
    const sums = list.reduce((acc, d) => ({
        ayahs: acc.ayahs + d.stats.ayahs,
        letters: acc.letters + d.stats.letters,
        words: acc.words + d.stats.words,
    }), { ayahs: 0, letters: 0, words: 0 });
    check(sums.ayahs === TOTAL_AYAHS, `${name}: ayahs sum ${sums.ayahs}`);
    check(sums.letters === totalLetters, `${name}: letters sum ${sums.letters}`);
    check(sums.words === totalWords, `${name}: words sum ${sums.words}`);
}

// ---------------------------------------------------------------- assemble

const surahs = meta.suras.map(s => ({
    number: s.number,
    name: s.name,
    tname: s.tname,
    ename: s.ename,
    type: s.type,
    revelationOrder: s.revelationOrder,
    rukus: s.rukus,
    ayahs: s.ayahs,
    letters: ayahLetters[s.number].reduce((a, b) => a + b, 0),
    words: ayahWords[s.number].reduce((a, b) => a + b, 0),
    globalStart: s.globalStart,
}));

const dataset = {
    meta: {
        dataset: 'quran-analytics',
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        numbering: 'Kufan/Hafs numbering, 6236 ayahs. The unnumbered basmala opening 112 surahs is excluded from all letter/word counts.',
        counting: 'Letters = base rasm letters only (U+0621-063A, U+0641-064A, U+0671); diacritics, dagger alef, tatweel and Quranic annotation marks are not letters. Words = whitespace tokens containing at least one such letter.',
        sources: [
            {
                name: 'Tanzil Quran Text (Uthmani, v1.1)',
                url: 'https://tanzil.net',
                license: 'CC BY 3.0',
                note: 'Attribution with a link to tanzil.net is required by the license.',
            },
            {
                name: 'Tanzil Quran Metadata (v1.0)',
                url: 'https://tanzil.net/docs/quran_metadata',
                license: 'CC BY 3.0',
            },
        ],
        totals: {
            surahs: surahs.length,
            ayahs: TOTAL_AYAHS,
            words: totalWords,
            letters: totalLetters,
            juz: divisions.juz.length,
            hizb: divisions.hizb.length,
            rub: divisions.rub.length,
            manzil: divisions.manzil.length,
            ruku: divisions.ruku.length,
            page: divisions.page.length,
            sajda: meta.sajdas.length,
        },
        basmala: {
            unnumberedOccurrences: 112,
            letters: BASMALA_LETTERS,
            words: BASMALA_WORD_COUNT,
            totalsIncludingUnnumbered: {
                letters: totalLetters + 112 * BASMALA_LETTERS,
                words: totalWords + 112 * BASMALA_WORD_COUNT,
            },
        },
        traditionalTotals: {
            words: 77439,
            letters: 323671,
            note: 'Widely-cited classical figures. They differ from the computed totals because classical counting conventions differ (treatment of hamza, alef maqsura, ta marbuta, shadda, basmala, and orthographic variants between manuscripts). The computed totals are exactly reproducible from the Tanzil Uthmani text with the documented rules.',
        },
    },
    surahs,
    ayahLetters,
    ayahWords,
    divisions,
    sajdas: meta.sajdas,
};

// ------------------------------------------------------------- serialization

// Pretty-print top-level structure but keep row-level objects/arrays on one
// line each, so the file stays diffable without exploding to 100k+ lines.
function serializeDataset(d) {
    const row = x => JSON.stringify(x);
    const rowList = (arr, ind) => arr.map(x => ind + row(x)).join(',\n');
    const perSurah = obj => Object.entries(obj).map(([k, v]) => `    "${k}": ${row(v)}`).join(',\n');
    const out = [];
    out.push('{');
    out.push(`  "meta": ${JSON.stringify(d.meta, null, 2).replace(/\n/g, '\n  ')},`);
    out.push('  "surahs": [');
    out.push(rowList(d.surahs, '    '));
    out.push('  ],');
    out.push('  "ayahLetters": {');
    out.push(perSurah(d.ayahLetters));
    out.push('  },');
    out.push('  "ayahWords": {');
    out.push(perSurah(d.ayahWords));
    out.push('  },');
    out.push('  "divisions": {');
    const divNames = Object.keys(d.divisions);
    divNames.forEach((name, i) => {
        out.push(`    "${name}": [`);
        out.push(rowList(d.divisions[name], '      '));
        out.push(`    ]${i < divNames.length - 1 ? ',' : ''}`);
    });
    out.push('  },');
    out.push('  "sajdas": [');
    out.push(rowList(d.sajdas, '    '));
    out.push('  ]');
    out.push('}');
    return out.join('\n') + '\n';
}

const serialized = serializeDataset(dataset);
JSON.parse(serialized); // the serializer must produce valid JSON
writeFileSync(OUT_PATH, serialized, 'utf8');
console.log(`OK dataset: ${TOTAL_AYAHS} ayahs, ${totalWords} words, ${totalLetters} letters -> ${OUT_PATH}`);

// ------------------------------------------------- optional Wisam app module

const wisamFlag = process.argv.indexOf('--wisam');
if (wisamFlag !== -1) {
    const wisamPath = process.argv[wisamFlag + 1];
    if (!wisamPath) throw new Error('--wisam requires an output path');
    const lines = [];
    lines.push('// ملف مولّد — لا تعدّله يدوياً. أعد توليده من مشروع QuranAnalytics: npm run build:wisam');
    lines.push('// المصدر: Tanzil Quran Text (Uthmani, v1.1) — tanzil.net — رخصة CC BY 3.0 (يلزم ذكر المصدر والرابط)');
    lines.push('// عدد حروف الرسم الأساسية لكل آية (بدون تشكيل ولا بسملة مطلع السور خارج الفاتحة) — العدّ الكوفي 6236 آية');
    lines.push('');
    lines.push('export const AYAH_LETTER_COUNTS = {');
    for (const s of surahs) {
        lines.push(`    ${s.number}: [${ayahLetters[s.number].join(',')}],`);
    }
    lines.push('};');
    lines.push('');
    lines.push(`export const TOTAL_LETTERS = ${totalLetters};`);
    lines.push('');
    lines.push('export const SURAH_LETTER_TOTALS = Object.fromEntries(');
    lines.push('    Object.entries(AYAH_LETTER_COUNTS).map(([n, arr]) => [n, arr.reduce((a, b) => a + b, 0)])');
    lines.push(');');
    lines.push('');
    const outWisam = resolve(ROOT, wisamPath);
    writeFileSync(outWisam, lines.join('\n'), 'utf8');
    console.log(`OK Wisam module -> ${outWisam}`);
}
