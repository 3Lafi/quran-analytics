// Dataset integrity: shapes, totals, and hand-audited ground-truth values.

import test from 'node:test';
import assert from 'node:assert/strict';
import { getDataset } from '../src/domain/dataset.js';

const ds = getDataset();
const { meta, surahs, ayahLetters, ayahWords, divisions, sajdas } = ds.data;

test('global shape: 114 surahs, 6236 ayahs, all division counts', () => {
    assert.equal(surahs.length, 114);
    assert.equal(meta.totals.ayahs, 6236);
    assert.equal(surahs.reduce((s, x) => s + x.ayahs, 0), 6236);
    assert.equal(divisions.juz.length, 30);
    assert.equal(divisions.hizb.length, 60);
    assert.equal(divisions.rub.length, 240);
    assert.equal(divisions.manzil.length, 7);
    assert.equal(divisions.ruku.length, 556);
    assert.equal(divisions.page.length, 604);
    assert.equal(sajdas.length, 15);
});

test('per-surah arrays match ayah counts and are positive integers', () => {
    for (const s of surahs) {
        assert.equal(ayahLetters[s.number].length, s.ayahs, `letters surah ${s.number}`);
        assert.equal(ayahWords[s.number].length, s.ayahs, `words surah ${s.number}`);
        assert.ok(ayahLetters[s.number].every(c => Number.isInteger(c) && c > 0));
        assert.ok(ayahWords[s.number].every(c => Number.isInteger(c) && c > 0));
    }
});

test('letter totals match the audited ground truth', () => {
    assert.equal(meta.totals.letters, 325386);
    const sum = Object.values(ayahLetters).flat().reduce((a, b) => a + b, 0);
    assert.equal(sum, meta.totals.letters);
    const wordSum = Object.values(ayahWords).flat().reduce((a, b) => a + b, 0);
    assert.equal(wordSum, meta.totals.words);
});

test('hand-verified spot checks (independent audit 2026-07-12)', () => {
    assert.deepEqual(ayahLetters[1], [19, 17, 12, 11, 19, 18, 43]); // Al-Fatiha
    assert.deepEqual(ayahLetters[112], [11, 9, 12, 15]);            // Al-Ikhlas = 47
    assert.equal(ayahLetters[2][281], 547);  // 2:282 longest ayah
    assert.equal(ayahLetters[2][254], 184);  // Ayat al-Kursi
    assert.equal(ayahLetters[20][0], 2);     // Ta-Ha, shortest
    assert.equal(ayahLetters[108].reduce((a, b) => a + b, 0), 42); // Al-Kawthar
    assert.equal(ayahWords[1][0], 4);        // basmala = 4 words
    assert.equal(ayahWords[112][0], 4);      // qul huwa llahu ahad
});

test('division stats each sum to whole-Quran totals', () => {
    for (const [name, list] of Object.entries(divisions)) {
        const ayahs = list.reduce((s, d) => s + d.stats.ayahs, 0);
        const letters = list.reduce((s, d) => s + d.stats.letters, 0);
        assert.equal(ayahs, 6236, `${name} ayahs`);
        assert.equal(letters, meta.totals.letters, `${name} letters`);
    }
});

test('known structural anchors', () => {
    assert.deepEqual(divisions.juz[0].start, { surah: 1, ayah: 1 });
    assert.deepEqual(divisions.juz[0].end, { surah: 2, ayah: 141 });
    assert.deepEqual(divisions.juz[29].start, { surah: 78, ayah: 1 });
    assert.deepEqual(divisions.page[0].start, { surah: 1, ayah: 1 });
    assert.deepEqual(divisions.page[1].start, { surah: 2, ayah: 1 });
    assert.deepEqual(sajdas[0], { surah: 7, ayah: 206, type: 'recommended' });
    // every 8th rub opens a juz, every 4th opens a hizb
    divisions.juz.forEach((j, i) => assert.deepEqual(divisions.rub[i * 8].start, j.start));
    divisions.hizb.forEach((h, i) => assert.deepEqual(divisions.rub[i * 4].start, h.start));
});
