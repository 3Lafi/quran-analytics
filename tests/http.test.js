import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../src/http/router.js';
import { createApp } from '../src/http/server.mjs';

const get = path => handleRequest('GET', new URL(`http://x${path}`));

test('router: core endpoints', () => {
    assert.equal(get('/').status, 200);
    assert.equal(get('/v1/meta').body.data.letters, 325386);
    assert.equal(get('/v1/surahs').body.data.length, 114);
    assert.equal(get('/v1/surahs/112').body.data.letters, 47);
    assert.deepEqual(get('/v1/surahs/1/ayahs').body.data.letters, [19, 17, 12, 11, 19, 18, 43]);
    assert.equal(get('/v1/ayahs/2/282').body.data.letters, 547);
    assert.equal(get('/v1/ayahs/2/282').body.data.location.juz, 3);
    assert.equal(get('/v1/juz').body.data.length, 30);
    assert.equal(get('/v1/rub').body.data.length, 240);
    assert.equal(get('/v1/hizb/59').body.data.start.surah, 78); // hizb 59 opens juz 30
    assert.equal(get('/v1/hizb/60').body.data.start.surah, 87); // hizb 60 starts at Al-A'la
    assert.equal(get('/v1/sajdas').body.data.length, 15);
});

test('router: progress endpoint', () => {
    const r = get('/v1/progress?scope=juz:30&memorized=78-114&weight=letters');
    assert.equal(r.status, 200);
    assert.equal(r.body.data.percent, 100);
});

test('router: error handling', () => {
    assert.equal(get('/v1/surahs/200').status, 404);
    assert.equal(get('/v1/ayahs/2/999').status, 404);
    assert.equal(get('/v1/nope').status, 404);
    assert.equal(get('/v1/progress?memorized=juz:99').status, 400);
    assert.equal(get('/v1/progress?weight=bogus').status, 400);
    assert.equal(handleRequest('POST', new URL('http://x/v1/meta')).status, 405);
    assert.equal(handleRequest('OPTIONS', new URL('http://x/v1/meta')).status, 204);
});

test('server: real HTTP round-trip with CORS headers', async () => {
    const app = createApp();
    await new Promise(resolve => app.listen(0, resolve));
    const { port } = app.address();
    try {
        const res = await fetch(`http://127.0.0.1:${port}/v1/surahs/1`);
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('access-control-allow-origin'), '*');
        const json = await res.json();
        assert.equal(json.ok, true);
        assert.equal(json.data.name, 'الفاتحة');
    } finally {
        await new Promise(resolve => app.close(resolve));
    }
});
