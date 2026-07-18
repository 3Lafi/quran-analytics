import test from 'node:test';
import assert from 'node:assert/strict';
import {
    totals, ayahLetters, ayahWords, surahLetters, surahAyahs,
    lettersInScope, ayahsInScope, ayahStats, surahStats, divisionStats,
} from '../src/domain/stats.js';

test('totals expose computed and traditional figures side by side', () => {
    const t = totals();
    assert.equal(t.letters, 325386);
    assert.equal(t.ayahs, 6236);
    assert.equal(t.traditionalTotals.letters, 323671);
    assert.equal(t.traditionalTotals.words, 77439);
    assert.equal(t.basmala.letters, 19);
});

test('ayah and surah lookups', () => {
    assert.equal(ayahLetters(2, 282), 547);
    assert.equal(ayahLetters(20, 1), 2);
    assert.equal(ayahWords(1, 1), 4);
    assert.equal(surahLetters(112), 47);
    assert.equal(surahLetters(999), 0);
    assert.equal(ayahLetters(2, 999), 0);
    assert.equal(surahAyahs(2), 286);
});

test('scope sums', () => {
    assert.equal(lettersInScope([112, 108]), 47 + 42);
    assert.equal(ayahsInScope([1, 114]), 13);
    assert.equal(lettersInScope([]), 0);
});

test('percentages: known anchors and whole-Quran sum', () => {
    const dain = ayahStats(2, 282).percentOfQuran.byLetters;
    assert.ok(Math.abs(dain - 0.1681) < 0.0005, `2:282 = ${dain}`);
    const taha = ayahStats(20, 1).percentOfQuran.byLetters;
    assert.ok(Math.abs(taha - 0.0006) < 0.0001, `20:1 = ${taha}`);

    let sum = 0;
    for (let n = 1; n <= 114; n++) sum += surahStats(n).percentOfQuran.byLetters;
    assert.ok(Math.abs(sum - 100) < 1e-9, `surah letter percents sum to ${sum}`);
});

test('division stats carry percentages', () => {
    const juz30 = divisionStats('juz', 30);
    assert.ok(juz30.percentOfQuran.byLetters > 1 && juz30.percentOfQuran.byLetters < 5);
    assert.ok(juz30.percentOfQuran.byAyahs > 8, 'juz amm is ayah-dense');
    assert.equal(divisionStats('juz', 31), null);
    assert.equal(divisionStats('nope', 1), null);
});
