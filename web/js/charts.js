// Minimal inline-SVG chart primitives — no charting library, consistent with
// the site's zero-dependency, zero-build-step approach. Each function returns
// an SVG markup string; native <title> elements give free hover tooltips.

function escapeXml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Bar chart stretched to its container's width via preserveAspectRatio="none"
// — pair with a fixed-height CSS container so it reflows on resize for free.
export function barChart(values, { width = 600, height = 120, color = 'var(--accent)', titles = null } = {}) {
    const max = Math.max(1, ...values);
    const n = values.length;
    const barW = width / n;
    const gap = barW > 3 ? Math.min(1, barW * 0.15) : 0;
    let bars = '';
    for (let i = 0; i < n; i++) {
        const v = values[i];
        const h = Math.max((v / max) * height, 0.6);
        const x = i * barW;
        const y = height - h;
        const title = titles ? `<title>${escapeXml(titles[i])}</title>` : '';
        bars += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${Math.max(barW - gap, 0.4).toFixed(2)}" height="${h.toFixed(2)}" fill="${color}">${title}</rect>`;
    }
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img">${bars}</svg>`;
}

// Donut chart via stroke-dasharray on concentric-offset circles — simple and
// exact for a handful of segments, no path-arc math needed.
export function donutChart(segments, { size = 150, thickness = 24 } = {}) {
    const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
    const r = (size - thickness) / 2;
    const c = size / 2;
    const circumference = 2 * Math.PI * r;
    let offset = 0;
    let circles = '';
    for (const seg of segments) {
        const frac = seg.value / total;
        const dash = frac * circumference;
        circles += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${thickness}" ` +
            `stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" ` +
            `transform="rotate(-90 ${c} ${c})"><title>${escapeXml(seg.label)}: ${seg.value.toLocaleString()} (${(frac * 100).toFixed(1)}%)</title></circle>`;
        offset += dash;
    }
    return `<svg class="chart-svg donut" viewBox="0 0 ${size} ${size}" role="img">${circles}</svg>`;
}
