// Letter-weighted memorization progress.
//
// The core idea: an ayah's share of progress is proportional to how much text
// it actually contains (letters by default), never "1 ayah = 1 unit". Ta-Ha
// 20:1 has 2 letters while 2:282 has 547 - equal-ayah counting distorts
// progress by two orders of magnitude on such pairs.
//
// Rules:
//   - Sum raw letter counts first, divide once. Never round intermediates.
//   - Progress is scope-relative: memorizing all of a Fatiha-only scope is 100%.
//   - Memorized ayahs outside the scope are ignored (reported separately).

import { getDataset } from './dataset.js';
import { parseSelector } from './selectors.js';

export const WEIGHTS = ['letters', 'words', 'ayahs'];

function sumOverMask(mask, values) {
    // values[g-1] belongs to global index g; values === null counts ayahs.
    let sum = 0;
    for (let g = 1; g < mask.length; g++) {
        if (mask[g]) sum += values ? values[g - 1] : 1;
    }
    return sum;
}

// scope / memorized: selector strings (see selectors.js) or prebuilt masks.
export function computeProgress({ scope = 'all', memorized = '', weight = 'letters' } = {}) {
    if (!WEIGHTS.includes(weight)) {
        throw new RangeError(`weight must be one of ${WEIGHTS.join(', ')}`);
    }
    const ds = getDataset();
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
        letters: sumOverMask(mask, ds.flatLetters),
        words: sumOverMask(mask, ds.flatWords),
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
