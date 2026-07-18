import * as domain from './domain.js';

const fmt = n => n.toLocaleString('en-US');
const pct = n => `${n.toFixed(2)}%`;

// ---------- routing ----------

const tabsEl = document.getElementById('tabs');
const views = {
    overview: document.getElementById('view-overview'),
    browse: document.getElementById('view-browse'),
    progress: document.getElementById('view-progress'),
    lookup: document.getElementById('view-lookup'),
};

function showView(name) {
    for (const [key, el] of Object.entries(views)) el.classList.toggle('active', key === name);
    for (const btn of tabsEl.querySelectorAll('button')) btn.classList.toggle('active', btn.dataset.view === name);
    location.hash = name;
}

tabsEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-view]');
    if (btn) showView(btn.dataset.view);
});

window.addEventListener('hashchange', () => {
    const name = location.hash.replace('#', '');
    if (views[name]) showView(name);
});

// ---------- overview ----------

function renderOverview() {
    const t = domain.totals();
    const cards = [
        ['Surahs', t.surahs], ['Ayahs', t.ayahs], ['Words', t.words], ['Letters', t.letters],
        ['Juz', t.juz], ['Hizb', t.hizb], ['Rubʿ', t.rub], ['Manzil', t.manzil],
        ['Rukuʿ', t.ruku], ['Pages', t.page], ['Sajdas', t.sajda],
    ];
    document.getElementById('overview-cards').innerHTML = cards.map(([label, value]) => `
        <div class="stat-card"><div class="value">${fmt(value)}</div><div class="label">${label}</div></div>
    `).join('');

    document.getElementById('traditional-note').textContent = t.traditionalTotals.note;
    const diff = (a, b) => { const d_ = a - b; return `${d_ >= 0 ? '+' : ''}${fmt(d_)}`; };
    document.getElementById('traditional-table').innerHTML = `
        <tr><td>Words</td><td>${fmt(t.words)}</td><td>${fmt(t.traditionalTotals.words)}</td><td>${diff(t.words, t.traditionalTotals.words)}</td></tr>
        <tr><td>Letters</td><td>${fmt(t.letters)}</td><td>${fmt(t.traditionalTotals.letters)}</td><td>${diff(t.letters, t.traditionalTotals.letters)}</td></tr>
    `;

    const b = t.basmala;
    document.getElementById('basmala-grid').innerHTML = `
        <div class="kv"><div class="k">Occurrences</div><div class="v">${fmt(b.unnumberedOccurrences)}</div></div>
        <div class="kv"><div class="k">Letters (each)</div><div class="v">${fmt(b.letters)}</div></div>
        <div class="kv"><div class="k">Words (each)</div><div class="v">${fmt(b.words)}</div></div>
        <div class="kv"><div class="k">If included: letters</div><div class="v">${fmt(b.totalsIncludingUnnumbered.letters)}</div></div>
        <div class="kv"><div class="k">If included: words</div><div class="v">${fmt(b.totalsIncludingUnnumbered.words)}</div></div>
    `;
}

// ---------- browse ----------

const browseType = document.getElementById('browse-type');
const browseSearch = document.getElementById('browse-search');
const browseThead = document.getElementById('browse-thead');
const browseTbody = document.getElementById('browse-tbody');
const browseDetail = document.getElementById('browse-detail');

function refOf(type, entry) {
    return `${entry.start.surah}:${entry.start.ayah} – ${entry.end.surah}:${entry.end.ayah}`;
}

function renderBrowseList() {
    const type = browseType.value;
    const q = browseSearch.value.trim().toLowerCase();
    browseDetail.style.display = 'none';

    if (type === 'surah') {
        browseThead.innerHTML = `<tr><th>#</th><th>Name</th><th>Translit.</th><th>English</th><th>Type</th><th>Ayahs</th><th>Letters</th><th>Words</th><th>% (letters)</th></tr>`;
        let rows = domain.listSurahs();
        if (q) rows = rows.filter(s => String(s.number) === q || s.tname.toLowerCase().includes(q) || s.ename.toLowerCase().includes(q) || s.name.includes(q));
        browseTbody.innerHTML = rows.map(s => {
            const p = domain.percentOfQuran(s).byLetters;
            return `<tr data-n="${s.number}"><td>${s.number}</td><td class="arabic">${s.name}</td><td>${s.tname}</td><td>${s.ename}</td><td>${s.type}</td><td>${fmt(s.ayahs)}</td><td>${fmt(s.letters)}</td><td>${fmt(s.words)}</td><td>${pct(p)}</td></tr>`;
        }).join('');
    } else {
        const label = { juz: 'Juz', hizb: 'Hizb', rub: 'Rubʿ', manzil: 'Manzil', ruku: 'Rukuʿ', page: 'Page' }[type];
        browseThead.innerHTML = `<tr><th>#</th><th>Range</th><th>Ayahs</th><th>Letters</th><th>Words</th><th>% (letters)</th></tr>`;
        let rows = domain.listDivision(type).map((d, i) => ({ ...d, n: i + 1 }));
        if (q) rows = rows.filter(d => String(d.n) === q);
        browseTbody.innerHTML = rows.map(d => {
            const p = domain.percentOfQuran(d.stats).byLetters;
            return `<tr data-n="${d.n}">
                <td>${label} ${d.n}</td><td>${refOf(type, d)}</td>
                <td>${fmt(d.stats.ayahs)}</td><td>${fmt(d.stats.letters)}</td><td>${fmt(d.stats.words)}</td><td>${pct(p)}</td>
            </tr>`;
        }).join('');
    }
}

function renderBrowseDetail(n) {
    const type = browseType.value;
    browseDetail.style.display = 'block';

    if (type === 'surah') {
        const s = domain.surahStats(n);
        const letters = domain.surahAyahLetters(n);
        const words = domain.surahAyahWords(n);
        browseDetail.innerHTML = `
            <h3><span class="arabic">${s.name}</span> — ${s.tname} <span class="muted">(${s.ename})</span> <span class="badge">${s.type}</span></h3>
            <div class="kv-grid">
                <div class="kv"><div class="k">Ayahs</div><div class="v">${fmt(s.ayahs)}</div></div>
                <div class="kv"><div class="k">Letters</div><div class="v">${fmt(s.letters)}</div></div>
                <div class="kv"><div class="k">Words</div><div class="v">${fmt(s.words)}</div></div>
                <div class="kv"><div class="k">Rukuʿ</div><div class="v">${fmt(s.rukus)}</div></div>
                <div class="kv"><div class="k">% by letters</div><div class="v">${pct(s.percentOfQuran.byLetters)}</div></div>
                <div class="kv"><div class="k">Revelation order</div><div class="v">${s.revelationOrder}</div></div>
            </div>
            <h3>Per-ayah</h3>
            <div class="table-scroll" style="max-height:300px">
                <table>
                    <thead><tr><th>Ayah</th><th>Letters</th><th>Words</th></tr></thead>
                    <tbody>${letters.map((l, i) => `<tr><td>${s.number}:${i + 1}</td><td>${fmt(l)}</td><td>${fmt(words[i])}</td></tr>`).join('')}</tbody>
                </table>
            </div>
        `;
    } else {
        const label = { juz: 'Juz', hizb: 'Hizb', rub: 'Rubʿ', manzil: 'Manzil', ruku: 'Rukuʿ', page: 'Page' }[type];
        const d = domain.divisionStats(type, n);
        browseDetail.innerHTML = `
            <h3>${label} ${n}</h3>
            <p class="muted">Spans ${refOf(type, d)}</p>
            <div class="kv-grid">
                <div class="kv"><div class="k">Ayahs</div><div class="v">${fmt(d.stats.ayahs)}</div></div>
                <div class="kv"><div class="k">Letters</div><div class="v">${fmt(d.stats.letters)}</div></div>
                <div class="kv"><div class="k">Words</div><div class="v">${fmt(d.stats.words)}</div></div>
                <div class="kv"><div class="k">% by letters</div><div class="v">${pct(d.percentOfQuran.byLetters)}</div></div>
                <div class="kv"><div class="k">% by words</div><div class="v">${pct(d.percentOfQuran.byWords)}</div></div>
                <div class="kv"><div class="k">% by ayahs</div><div class="v">${pct(d.percentOfQuran.byAyahs)}</div></div>
            </div>
        `;
    }
}

browseType.addEventListener('change', renderBrowseList);
browseSearch.addEventListener('input', renderBrowseList);
browseTbody.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-n]');
    if (!tr) return;
    for (const row of browseTbody.querySelectorAll('tr')) row.classList.remove('selected');
    tr.classList.add('selected');
    renderBrowseDetail(Number(tr.dataset.n));
});

// ---------- progress ----------

const PRESETS = [
    { label: 'Juz ʿAmma (78–114)', scope: 'juz:30', memorized: '' },
    { label: 'Al-Baqara', scope: '2', memorized: '' },
    { label: 'Whole Quran', scope: 'all', memorized: '' },
    { label: 'Example: Naba–Buruj memorized', scope: 'juz:30', memorized: '78-85' },
];

function renderProgressPresets() {
    document.getElementById('progress-presets').innerHTML = PRESETS.map((p, i) =>
        `<button class="chip" data-i="${i}">${p.label}</button>`).join('');
}

document.getElementById('progress-presets').addEventListener('click', e => {
    const btn = e.target.closest('button[data-i]');
    if (!btn) return;
    const p = PRESETS[Number(btn.dataset.i)];
    document.getElementById('progress-scope').value = p.scope;
    document.getElementById('progress-memorized').value = p.memorized;
    computeProgress();
});

function computeProgress() {
    const scope = document.getElementById('progress-scope').value;
    const memorized = document.getElementById('progress-memorized').value;
    const weight = document.getElementById('progress-weight').value;
    const errorEl = document.getElementById('progress-error');
    const resultEl = document.getElementById('progress-result');
    errorEl.innerHTML = '';

    let result;
    try {
        result = domain.computeProgress({ scope, memorized, weight });
    } catch (err) {
        errorEl.innerHTML = `<div class="error-box">${err.message}</div>`;
        resultEl.innerHTML = '';
        return;
    }

    resultEl.innerHTML = `
        <div class="progress-result">
            <div class="progress-percent">${pct(result.percent)}</div>
            <div style="flex:1">
                <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${Math.min(100, result.percent).toFixed(2)}%"></div></div>
                <p class="muted" style="margin:8px 0 0">weighted by ${result.weight}</p>
            </div>
        </div>
        <div class="kv-grid">
            <div class="kv"><div class="k">% by letters</div><div class="v">${pct(result.percentBy.letters)}</div></div>
            <div class="kv"><div class="k">% by words</div><div class="v">${pct(result.percentBy.words)}</div></div>
            <div class="kv"><div class="k">% by ayahs</div><div class="v">${pct(result.percentBy.ayahs)}</div></div>
        </div>
        <h3 style="margin-top:18px">Scope vs. memorized</h3>
        <table>
            <thead><tr><th></th><th>Ayahs</th><th>Letters</th><th>Words</th></tr></thead>
            <tbody>
                <tr><td>Scope</td><td>${fmt(result.scope.ayahs)}</td><td>${fmt(result.scope.letters)}</td><td>${fmt(result.scope.words)}</td></tr>
                <tr><td>Memorized</td><td>${fmt(result.memorized.ayahs)}</td><td>${fmt(result.memorized.letters)}</td><td>${fmt(result.memorized.words)}</td></tr>
            </tbody>
        </table>
        ${result.memorizedOutsideScopeAyahs > 0
            ? `<p class="muted" style="margin-top:10px">${fmt(result.memorizedOutsideScopeAyahs)} memorized ayah(s) fall outside the scope and were not counted toward progress.</p>`
            : ''}
    `;
}

document.getElementById('progress-compute').addEventListener('click', computeProgress);
for (const id of ['progress-scope', 'progress-memorized']) {
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') computeProgress(); });
}
document.getElementById('progress-weight').addEventListener('change', computeProgress);

// ---------- lookup ----------

function runLookup() {
    const surah = Number(document.getElementById('lookup-surah').value);
    const ayah = Number(document.getElementById('lookup-ayah').value);
    const errorEl = document.getElementById('lookup-error');
    const resultEl = document.getElementById('lookup-result');
    errorEl.innerHTML = '';

    const stats = domain.ayahStats(surah, ayah);
    const loc = domain.locate(surah, ayah);
    if (!stats || !loc) {
        errorEl.innerHTML = `<div class="error-box">No such ayah: ${surah}:${ayah}</div>`;
        resultEl.innerHTML = '';
        return;
    }

    resultEl.innerHTML = `
        <h3><span class="arabic">${loc.surahName}</span> ${surah}:${ayah} <span class="muted">(global #${loc.globalIndex})</span></h3>
        <div class="kv-grid">
            <div class="kv"><div class="k">Letters</div><div class="v">${fmt(stats.letters)}</div></div>
            <div class="kv"><div class="k">Words</div><div class="v">${fmt(stats.words)}</div></div>
            <div class="kv"><div class="k">% by letters</div><div class="v">${pct(stats.percentOfQuran.byLetters)}</div></div>
            <div class="kv"><div class="k">% by words</div><div class="v">${pct(stats.percentOfQuran.byWords)}</div></div>
        </div>
        <h3 style="margin-top:18px">Location</h3>
        <div class="kv-grid">
            <div class="kv"><div class="k">Juz</div><div class="v">${loc.juz}</div></div>
            <div class="kv"><div class="k">Hizb</div><div class="v">${loc.hizb}</div></div>
            <div class="kv"><div class="k">Rubʿ</div><div class="v">${loc.rub}</div></div>
            <div class="kv"><div class="k">Manzil</div><div class="v">${loc.manzil}</div></div>
            <div class="kv"><div class="k">Rukuʿ</div><div class="v">${loc.ruku}</div></div>
            <div class="kv"><div class="k">Page</div><div class="v">${loc.page}</div></div>
        </div>
        ${loc.sajda ? `<p class="muted" style="margin-top:10px">Sajda: <strong>${loc.sajda}</strong></p>` : ''}
    `;
}

document.getElementById('lookup-go').addEventListener('click', runLookup);
for (const id of ['lookup-surah', 'lookup-ayah']) {
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') runLookup(); });
}

// ---------- boot ----------

async function boot() {
    try {
        await domain.loadDataset('/data/quran-analytics.json');
    } catch (err) {
        document.getElementById('loading').textContent = `Failed to load dataset: ${err.message}`;
        return;
    }
    document.getElementById('loading').remove();

    renderOverview();
    renderBrowseList();
    renderProgressPresets();
    computeProgress();
    runLookup();

    const initial = location.hash.replace('#', '');
    showView(views[initial] ? initial : 'overview');
}

boot();
