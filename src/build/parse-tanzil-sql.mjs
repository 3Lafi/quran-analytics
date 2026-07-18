// Parses the Tanzil quran-uthmani.sql dump into ayah rows.
// Returns [{ index, sura, aya, text }] with index contiguous 1..6236.

import { readFileSync } from 'node:fs';

const ROW_RE = /^\((\d+), (\d+), (\d+), '(.*)'\)[,;]$/gm;
export const TOTAL_AYAHS = 6236;

export function parseTanzilSql(sqlPath) {
    const sql = readFileSync(sqlPath, 'utf8');
    if (sql.includes("\\'")) throw new Error('Unexpected escaped quotes in SQL dump');

    const rows = [];
    for (const m of sql.matchAll(ROW_RE)) {
        rows.push({ index: Number(m[1]), sura: Number(m[2]), aya: Number(m[3]), text: m[4] });
    }

    if (rows.length !== TOTAL_AYAHS) {
        throw new Error(`Expected ${TOTAL_AYAHS} ayah rows, found ${rows.length}`);
    }
    rows.forEach((r, i) => {
        if (r.index !== i + 1) throw new Error(`Non-contiguous index at row ${i + 1} (got ${r.index})`);
    });
    return rows;
}
