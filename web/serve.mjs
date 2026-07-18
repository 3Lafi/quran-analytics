// Zero-dependency static file server for the website (npm run site).
// Serves web/ at "/" and the generated dataset at "/data/quran-analytics.json"
// so the site always reads the same artifact the API and tests use — no
// copy of the data lives under web/.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const WEB_ROOT = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(WEB_ROOT, '..', 'data', 'generated', 'quran-analytics.json');
const PORT = Number(process.env.PORT) || 8332;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
};

async function send(res, status, filePath) {
    try {
        const body = await readFile(filePath);
        res.writeHead(status, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
        res.end(body);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    }
}

const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/data/quran-analytics.json') {
        return send(res, 200, DATA_FILE);
    }
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    // Keep resolved path inside WEB_ROOT — reject any ../ escape attempt.
    const resolved = normalize(join(WEB_ROOT, path));
    if (!resolved.startsWith(WEB_ROOT)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Forbidden');
    }
    return send(res, 200, resolved);
});

server.listen(PORT, () => {
    console.log(`Quran Analytics site: http://localhost:${PORT}`);
});
