// Pure text-counting rules for the Tanzil Uthmani text.
// A "letter" is a base rasm letter only: hamza..ghain (U+0621-U+063A),
// fa..ya (U+0641-U+064A), and alef-wasla (U+0671). Everything else that may
// appear in the text (space, tatweel, tashkeel, dagger alef, Quranic
// annotation marks U+06D6-U+06ED) is deliberately ignored.
// Any character outside these two sets throws: the corpus must be fully
// classified, nothing may be dropped silently.

export const COUNTED = /[ء-غف-يٱ]/u;
export const IGNORED = /[ ـً-ٰۖ-ۭ]/u;

// The basmala matched on bare rasm letters (diacritics differ between
// surah openings, e.g. shadda on the ba at the start of At-Tin).
const BASMALA_WORDS = ['بسم', 'الله', 'الرحمن', 'الرحيم'];
export const BASMALA_LETTERS = 19;
export const BASMALA_WORD_COUNT = BASMALA_WORDS.length;

export function bareLetters(word) {
    return [...word].filter(ch => COUNTED.test(ch)).join('').replace(/ٱ/g, 'ا');
}

export function countLetters(text, where) {
    let count = 0;
    for (const ch of text) {
        if (COUNTED.test(ch)) count++;
        else if (!IGNORED.test(ch)) {
            const cp = ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
            throw new Error(`Unclassified codepoint U+${cp} in ${where}: ${text}`);
        }
    }
    return count;
}

// A word is a whitespace-separated token containing at least one counted
// letter (this excludes any token made only of annotation marks).
export function countWords(text) {
    return text.split(' ').filter(tok => COUNTED.test(tok)).length;
}

// Removes the (unnumbered) basmala from the start of an ayah text.
// Throws if the text does not actually start with the basmala.
export function stripBasmala(text, where) {
    const words = text.split(' ');
    const isBasmala = words.length > BASMALA_WORDS.length &&
        BASMALA_WORDS.every((w, i) => bareLetters(words[i]) === w);
    if (!isBasmala) throw new Error(`Expected basmala at the start of ${where}`);
    return words.slice(BASMALA_WORDS.length).join(' ');
}
