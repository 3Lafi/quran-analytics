import test from 'node:test';
import assert from 'node:assert/strict';
import { computeProgress } from '../src/domain/progress.js';
import { parseSelector, SelectorError } from '../src/domain/selectors.js';

test('scope-relative: full scope memorized = 100%, empty = 0%', () => {
    assert.equal(computeProgress({ scope: '1', memorized: '1' }).percent, 100);
    assert.equal(computeProgress({ scope: '1', memorized: '' }).percent, 0);
    assert.equal(computeProgress({ scope: 'juz:30', memorized: '78-114' }).percent, 100);
    assert.equal(computeProgress({ scope: 'all', memorized: 'all' }).percent, 100);
});

test('letter weighting shrinks juz-amm progress versus ayah counting', () => {
    const p = computeProgress({ scope: 'all', memorized: '78-114' });
    assert.ok(Math.abs(p.percentBy.ayahs - (564 / 6236) * 100) < 1e-9);
    assert.ok(p.percentBy.letters < p.percentBy.ayahs / 2,
        `letters ${p.percentBy.letters} should be far below ayahs ${p.percentBy.ayahs}`);
    assert.equal(p.percent, p.percentBy.letters); // default weight
});

test('selectors compose, deduplicate, and honor ayah ranges', () => {
    const a = computeProgress({ scope: 'all', memorized: '1,1,1:1-7' });
    const b = computeProgress({ scope: 'all', memorized: '1' });
    assert.equal(a.memorized.letters, b.memorized.letters);
    assert.equal(b.memorized.letters, 139); // Al-Fatiha total

    const half = computeProgress({ scope: '2:1-141', memorized: '2:1-141' });
    assert.equal(half.percent, 100);
    assert.equal(half.scope.ayahs, 141);

    const kursi = computeProgress({ scope: 'all', memorized: '2:255' });
    assert.equal(kursi.memorized.letters, 184);
    assert.equal(kursi.memorized.ayahs, 1);
});

test('memorized outside scope is ignored but reported', () => {
    const p = computeProgress({ scope: '1', memorized: '112' });
    assert.equal(p.percent, 0);
    assert.equal(p.memorizedOutsideScopeAyahs, 4);
});

test('weights validated, bad selectors throw SelectorError', () => {
    assert.throws(() => computeProgress({ weight: 'pages' }), RangeError);
    for (const bad of ['115', '2:300', 'juz:31', 'foo:1', '5-3', '2:9-4', '1;2', 'juz:0']) {
        assert.throws(() => parseSelector(bad), SelectorError, `selector "${bad}"`);
    }
});

test('empty scope yields 0% not NaN', () => {
    const p = computeProgress({ scope: '', memorized: 'all' });
    assert.equal(p.percent, 0);
    assert.equal(p.scope.letters, 0);
});
