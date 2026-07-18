// Zero-dependency HTTP server exposing the analytics API.
// Run: npm run serve   (PORT env var, default 8331)

import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { handleRequest } from './router.js';

export function createApp() {
    return createServer((req, res) => {
        const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
        const { status, body } = handleRequest(req.method, url);
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Cache-Control': 'public, max-age=3600',
        };
        if (body === null) {
            res.writeHead(status, headers);
            res.end();
            return;
        }
        res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(body));
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const port = Number(process.env.PORT ?? 8331);
    createApp().listen(port, () => {
        console.log(`quran-analytics API listening on http://localhost:${port}/v1/meta`);
    });
}
