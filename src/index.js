// Public library surface. Everything is a pure, synchronous query over the
// generated dataset - safe to use from any Node app or to wrap in any server.

export { getDataset, globalIndex, refOfGlobal, DIVISION_TYPES } from './domain/dataset.js';
export {
    listSurahs, getSurah, surahAyahLetters, surahAyahWords,
    listDivision, getDivision, listSajdas, divisionAt, locate,
} from './domain/structure.js';
export {
    totals, ayahLetters, ayahWords, surahLetters, surahWords, surahAyahs,
    lettersInScope, wordsInScope, ayahsInScope,
    percentOfQuran, ayahStats, surahStats, divisionStats,
} from './domain/stats.js';
export { parseSelector, SelectorError } from './domain/selectors.js';
export { computeProgress, WEIGHTS } from './domain/progress.js';
