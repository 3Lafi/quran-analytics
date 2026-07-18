import test from 'node:test';
import assert from 'node:assert/strict';
import { getDataset, globalIndex, refOfGlobal } from '../src/domain/dataset.js';
import { getSurah, getDivision, divisionAt, locate, DIVISION_TYPES } from '../src/domain/structure.js';

test('globalIndex and refOfGlobal are inverse bijections over 1..6236', () => {
    const ds = getDataset();
    let g = 0;
    for (const s of ds.data.surahs) {
        for (let a = 1; a <= s.ayahs; a++) {
            g++;
            assert.equal(globalIndex(s.number, a), g);
        }
    }
    assert.equal(g, 6236);
    assert.deepEqual(refOfGlobal(1), { surah: 1, ayah: 1 });
    assert.deepEqual(refOfGlobal(6236), { surah: 114, ayah: 6 });
    assert.deepEqual(refOfGlobal(8), { surah: 2, ayah: 1 });
});

test('invalid references return null / 0', () => {
    assert.equal(globalIndex(115, 1), null);
    assert.equal(globalIndex(2, 287), null);
    assert.equal(globalIndex(2, 0), null);
    assert.equal(refOfGlobal(0), null);
    assert.equal(refOfGlobal(6237), null);
    assert.equal(getSurah(0), null);
    assert.equal(getDivision('juz', 31), null);
    assert.equal(locate(1, 8), null);
});

test('divisionAt agrees with an independent linear scan', () => {
    const ds = getDataset();
    const probes = [[1, 1], [2, 142], [2, 255], [9, 93], [18, 75], [55, 1], [78, 1], [114, 6]];
    for (const type of DIVISION_TYPES) {
        const list = ds.data.divisions[type];
        for (const [s, a] of probes) {
            const g = globalIndex(s, a);
            // linear reference implementation
            let expected = 1;
            for (let i = 0; i < list.length; i++) {
                if (globalIndex(list[i].start.surah, list[i].start.ayah) <= g) expected = i + 1;
            }
            assert.equal(divisionAt(type, s, a), expected, `${type} at ${s}:${a}`);
        }
    }
});

test('locate returns the full structural position', () => {
    const loc = locate(2, 255);
    assert.equal(loc.surahName, 'البقرة');
    assert.equal(loc.juz, 3);       // juz 3 starts at 2:253
    assert.equal(loc.globalIndex, 7 + 255);
    assert.equal(loc.sajda, null);
    for (const type of DIVISION_TYPES) assert.ok(Number.isInteger(loc[type]));

    const sajdaLoc = locate(96, 19);  // final ayah of Al-Alaq - obligatory sajda
    assert.equal(sajdaLoc.sajda, 'obligatory');
    assert.equal(sajdaLoc.juz, 30);
});
