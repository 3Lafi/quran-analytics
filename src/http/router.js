// Maps URLs to domain calls. Pure function of (method, URL) -> { status, body }
// so it is trivially unit-testable without sockets.

import { totals, surahStats, ayahStats, divisionStats } from '../domain/stats.js';
import { listSurahs, listDivision, listSajdas, locate, surahAyahLetters, surahAyahWords, DIVISION_TYPES } from '../domain/structure.js';
import { computeProgress, WEIGHTS } from '../domain/progress.js';
import { SelectorError } from '../domain/selectors.js';
import { percentOfQuran } from '../domain/stats.js';

const ok = data => ({ status: 200, body: { ok: true, data } });
const err = (status, message) => ({ status, body: { ok: false, error: message } });

function intParam(text, what) {
    if (!/^\d+$/.test(text)) throw new SelectorError(`${what} must be a positive integer`);
    return Number(text);
}

const API_INDEX = {
    name: 'quran-analytics',
    version: 'v1',
    docs: 'https://tanzil.net attribution required (CC BY 3.0). See project docs/API.md.',
    endpoints: [
        'GET /v1/meta',
        'GET /v1/surahs',
        'GET /v1/surahs/{1-114}',
        'GET /v1/surahs/{n}/ayahs',
        'GET /v1/ayahs/{surah}/{ayah}',
        ...DIVISION_TYPES.map(t => `GET /v1/${t} and /v1/${t}/{n}`),
        'GET /v1/sajdas',
        'GET /v1/progress?scope=all&memorized=78-114&weight=letters|words|ayahs',
    ],
};

export function handleRequest(method, url) {
    try {
        if (method === 'OPTIONS') return { status: 204, body: null };
        if (method !== 'GET') return err(405, 'Only GET is supported');

        const seg = url.pathname.split('/').filter(Boolean);
        if (seg.length === 0) return ok(API_INDEX);
        if (seg[0] === 'health') return ok({ status: 'ok' });
        if (seg[0] !== 'v1') return err(404, 'Unknown path; API lives under /v1');
        const [, a, b, c] = seg;

        if (a === 'meta' && !b) return ok(totals());
        if (a === 'sajdas' && !b) return ok(listSajdas());

        if (a === 'surahs') {
            if (!b) return ok(listSurahs().map(s => ({ ...s, percentOfQuran: percentOfQuran(s) })));
            const n = intParam(b, 'surah number');
            const stats = surahStats(n);
            if (!stats) return err(404, `Unknown surah ${n}`);
            if (!c) return ok(stats);
            if (c === 'ayahs') {
                return ok({ surah: n, letters: surahAyahLetters(n), words: surahAyahWords(n) });
            }
            return err(404, `Unknown surah sub-resource "${c}"`);
        }

        if (a === 'ayahs' && b && c && seg.length === 4) {
            const s = intParam(b, 'surah number');
            const ayah = intParam(c, 'ayah number');
            const stats = ayahStats(s, ayah);
            if (!stats) return err(404, `Unknown ayah ${s}:${ayah}`);
            return ok({ ...stats, location: locate(s, ayah) });
        }

        if (DIVISION_TYPES.includes(a)) {
            if (!b) return ok(listDivision(a).map(d => ({ ...d, percentOfQuran: percentOfQuran(d.stats) })));
            const n = intParam(b, `${a} number`);
            const stats = divisionStats(a, n);
            if (!stats) return err(404, `Unknown ${a} ${n}`);
            return ok(stats);
        }

        if (a === 'progress' && !b) {
            const q = url.searchParams;
            const weight = q.get('weight') ?? 'letters';
            if (!WEIGHTS.includes(weight)) return err(400, `weight must be one of ${WEIGHTS.join(', ')}`);
            return ok(computeProgress({
                scope: q.get('scope') ?? 'all',
                memorized: q.get('memorized') ?? '',
                weight,
            }));
        }

        return err(404, 'Not found');
    } catch (e) {
        if (e instanceof SelectorError || e instanceof RangeError) return err(400, e.message);
        console.error(e);
        return err(500, 'Internal error');
    }
}
