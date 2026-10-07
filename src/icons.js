// icons.js — original monoline SVG icon set (hand-authored; no third-party art, §12).
//
// 24×24 viewBox, 1.75 stroke, round caps/joins, `currentColor` — so every icon follows the text
// colour and works in light, dark and accent contexts with no extra CSS. Decorative by default
// (aria-hidden); pass `label` to make an icon announce itself.

const NS = 'http://www.w3.org/2000/svg';

// Each entry is the inner markup of a 24×24 stroke icon.
const PATHS = {
  // navigation
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  play: '<circle cx="12" cy="12" r="8.5"/><path d="M10 8.5v7l5.5-3.5z"/>',
  sheet: '<path d="M6 3.5h9l3 3v14H6z"/><path d="M15 3.5v3h3"/><path d="M9 11h6M9 14.5h6M9 18h4"/>',
  rules: '<path d="M4 5.5c2.5-1.2 5.5-1.2 8 0v14c-2.5-1.2-5.5-1.2-8 0z"/><path d="M12 5.5c2.5-1.2 5.5-1.2 8 0v14c-2.5-1.2-5.5-1.2-8 0z"/>',
  journal: '<path d="M16.5 3.5 20.5 7.5 9 19H5v-4z"/><path d="M14 6l4 4"/>',
  house: '<path d="M4 20.5h16"/><path d="M5.5 20.5V10l6.5-5.5 6.5 5.5v10.5"/><path d="M9 20.5v-6h6v6"/><path d="M12 4.5V2.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  gm: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  table: '<path d="M3 9h18"/><path d="M5 9l-1 11M19 9l1 11"/><path d="M7 13.5h10"/><path d="M9 9V5.5h6V9"/>',
  more: '<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
  learn: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v5c1.5 1.5 3.5 2 5.5 2s4-.5 5.5-2v-5"/>',
  // game concepts
  d20: '<path d="M12 2.5 20.5 7.5v9L12 21.5 3.5 16.5v-9z"/><path d="M12 2.5 7.5 15h9z"/><path d="M3.5 7.5 7.5 15 3.5 16.5M20.5 7.5 16.5 15l4 1.5M7.5 15 12 21.5 16.5 15"/>',
  momentum: '<path d="M12 3c3.5 4.2 5.5 7.4 5.5 10.2A5.5 5.5 0 0 1 12 18.7a5.5 5.5 0 0 1-5.5-5.5C6.5 10.4 8.5 7.2 12 3z"/><path d="M12 21v-2.3"/>',
  threat: '<path d="M12 3 21 19.5H3z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="16.8" r=".6" fill="currentColor"/>',
  determination: '<path d="M12 21c-4 0-6.5-2.6-6.5-6.2 0-3.3 2.4-5.2 3.6-8.3.7 1.7 1.7 2.6 2.9 3 .2-2.6 1.3-4.6 3.2-6 .2 3.5 3.3 5.6 3.3 10.8 0 4-2.6 6.7-6.5 6.7z"/>',
  chaos: '<circle cx="12" cy="12" r="8.5"/><path d="M12 12c0-2.5 2-4 4-3.3M12 12c-2.5 0-4-2-3.3-4M12 12c0 2.5-2 4-4 3.3M12 12c2.5 0 4 2 3.3 4"/>',
  oracle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="M12 7l1.6 3.4L17 12l-3.4 1.6L12 17l-1.6-3.4L7 12l3.4-1.6z"/>',
  scroll: '<path d="M7 4.5h11v12a3 3 0 0 1-3 3H6"/><path d="M7 4.5a2.5 2.5 0 0 0-2.5 2.5V8H7"/><path d="M6 19.5a3 3 0 0 0 3-3V7"/><path d="M10.5 9h4.5M10.5 12.5h4.5"/>',
  hourglass: '<path d="M6.5 3.5h11M6.5 20.5h11"/><path d="M7.5 3.5c0 4.5 4.5 5.5 4.5 8.5S7.5 16 7.5 20.5M16.5 3.5c0 4.5-4.5 5.5-4.5 8.5s4.5 4 4.5 8.5"/>',
  dune: '<path d="M2.5 17c3-4 6.5-5 9.5-3s6.5 1 9.5-2"/><path d="M2.5 20.5h19"/><circle cx="17" cy="6.5" r="2"/>',
  person: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
  thread: '<path d="M4 7c4-3 6 3 10 0s4-1 6 0"/><path d="M4 12c4-3 6 3 10 0s4-1 6 0"/><path d="M4 17c4-3 6 3 10 0s4-1 6 0"/>',
  shield: '<path d="M12 3 19.5 6v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/>',
  theme: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor"/>',
  check: '<path d="M5 12.5 10 17.5 19.5 7"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".9" fill="currentColor"/>',
  coin: '<ellipse cx="12" cy="7" rx="7" ry="2.8"/><path d="M5 7v5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V7M5 12v5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-5"/>',
  bolt: '<path d="M13.5 2.5 5 13.5h6l-1 8 8.5-11h-6z"/>',
  star: '<path d="M12 3.5l2.5 5.4 5.9.6-4.4 4 1.3 5.8L12 16.4l-5.3 2.9L8 13.5l-4.4-4 5.9-.6z"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r=".9" fill="currentColor"/><circle cx="4.8" cy="12" r=".9" fill="currentColor"/><circle cx="4.8" cy="17.5" r=".9" fill="currentColor"/>',
  crown: '<path d="M4.5 18 3.5 8l5 4 3.5-6 3.5 6 5-4-1 10z"/><path d="M5 20.5h14"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5 13.3 13.3 8.5 15.5 10.7 10.7z"/>',
  swords: '<path d="M5 4.5 19.5 19M19 4.5 4.5 19"/><path d="M3.5 15.5l5 5M15.5 20.5l5-5"/>',
  group: '<circle cx="9" cy="8.5" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3.5 19.5c.6-3.4 2.8-5.3 5.5-5.3s4.9 1.9 5.5 5.3M14.5 14.5c2.6-.6 5.2.8 6 4.5"/>',
  up: '<path d="M12 20.5V4.5M6 10.5l6-6 6 6"/>',
  flag: '<path d="M5.5 21V3.5"/><path d="M5.5 4h12l-3 4 3 4h-12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pencil: '<path d="M15.5 4.5 19.5 8.5 8.5 19.5H4.5v-4z"/><path d="M13 7l4 4"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  undo: '<path d="M8.5 5 4 9.5 8.5 14"/><path d="M4 9.5h10a5.5 5.5 0 0 1 0 11h-3"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10.5 11v5.5M13.5 11v5.5"/>',
  download: '<path d="M12 3.5v11M7 10l5 5 5-5"/><path d="M4.5 19.5h15"/>',
  worm: '<path d="M3.5 18c0-4 3-6 6.5-6s4.5-1.5 4.5-4 2-4 4.5-4"/><path d="M3.5 18c2 0 3 1.5 3 2.5M19 4c1.4.5 1.5 2 1 3"/><circle cx="18.2" cy="5.2" r=".8" fill="currentColor"/>',
};

/** Build an icon <svg>. `size` in px; `label` makes it accessible (otherwise aria-hidden). */
export function icon(name, { size = 20, label = null, cls = '' } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', ('icon ' + cls).trim());
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); }
  else svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = PATHS[name] || PATHS.oracle;
  return svg;
}

export const ICON_NAMES = Object.keys(PATHS);

/** An illustrated empty state (audit 2: a small scene — the icon set in a medallion over a dune
 *  horizon, drawn in CSS) + a line of text. */
export function emptyState(name, text) {
  const wrap = document.createElement('div');
  wrap.className = 'empty-state';
  const art = document.createElement('div');
  art.className = 'empty-art';
  art.setAttribute('aria-hidden', 'true');
  const medal = document.createElement('span');
  medal.className = 'empty-medal';
  medal.append(icon(name, { size: 30 }));
  art.append(medal);
  wrap.append(art);
  const p = document.createElement('p');
  p.className = 'small muted';
  p.textContent = text;
  wrap.append(p);
  return wrap;
}

/** Segmented meter: `value` of `max` filled pips (Momentum 6, Determination 3, Chaos 9…). */
export function pips(value, max, { label = '', cls = '' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = ('pips ' + cls).trim();
  wrap.setAttribute('role', 'meter');
  wrap.setAttribute('aria-valuemin', '0');
  wrap.setAttribute('aria-valuemax', String(max));
  wrap.setAttribute('aria-valuenow', String(value));
  if (label) wrap.setAttribute('aria-label', label);
  for (let i = 0; i < max; i++) {
    const p = document.createElement('span');
    p.className = 'pip' + (i < value ? ' on' : '');
    wrap.append(p);
  }
  return wrap;
}

/** Radar / compass chart (audit 2): `axes` = [{ label, value }] on a 4–8 scale, drawn as a
 *  ringed pentagon with the character's shape filled in. Decorative — the numbers sit beside it. */
export function radar(axes, { size = 150, min = 2, max = 8, cls = '', title = '' } = {}) {
  // Wider than tall: room for full axis names left and right of the pentagon.
  const W = size + 84, cx = W / 2, c = size / 2 + 4, r = size / 2 - 22, n = axes.length;
  const pt = (i, f) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r * f, c + Math.sin(a) * r * f];
  };
  const ring = (f) => axes.map((_, i) => pt(i, f).map((v) => v.toFixed(1)).join(',')).join(' ');
  const frac = (v) => Math.max(0, Math.min(1, (v - min) / (max - min)));
  const shape = axes.map((a, i) => pt(i, frac(a.value)).map((v) => v.toFixed(1)).join(',')).join(' ');
  const labels = axes.map((a, i) => {
    const [x, y] = pt(i, 1.24);
    const anchor = Math.abs(x - cx) < 4 ? 'middle' : x < cx ? 'end' : 'start';
    const esc = String(a.label).replace(/[<&]/g, '');
    return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="${anchor}" class="radar-label">${esc}</text>`;
  }).join('');
  const dots = axes.map((a, i) => { const [x, y] = pt(i, frac(a.value)); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" class="radar-dot"/>`; }).join('');
  const spokes = axes.map((_, i) => { const [x, y] = pt(i, 1); return `<path d="M${cx} ${c}L${x.toFixed(1)} ${y.toFixed(1)}"/>`; }).join('');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${size + 8}`);
  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(size + 8));
  svg.setAttribute('class', ('radar ' + cls).trim());
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<g class="radar-grid"><polygon points="${ring(1)}"/><polygon points="${ring(2 / 3)}"/><polygon points="${ring(1 / 3)}"/>${spokes}</g>`
    + `<polygon points="${shape}" class="radar-shape"/>${dots}${labels}`
    + (title ? `<text x="${cx}" y="${c + 4}" text-anchor="middle" class="radar-title">${title.replace(/[<&]/g, '')}</text>` : '');
  return svg;
}

/** Semicircle dial (audit 2: Chaos Factor) — `value` of `min…max`, ticks cool → hot, a needle and
 *  the number in the hub. A labelled meter. */
export function dial(value, { min = 1, max = 9, label = '', caption = '' } = {}) {
  const n = max - min + 1, cx = 60, cy = 58, r = 46;
  const ang = (v) => Math.PI + ((v - min) / (max - min)) * Math.PI;
  const ticks = Array.from({ length: n }, (_, i) => {
    const v = min + i, a = ang(v), heat = i < n / 3 ? 'cool' : i < (2 * n) / 3 ? 'warm' : 'hot';
    const x1 = cx + Math.cos(a) * (r - 9), y1 = cy + Math.sin(a) * (r - 9), x2 = cx + Math.cos(a) * r, y2 = cy + Math.sin(a) * r;
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" class="dial-tick ${heat}${v <= value ? ' on' : ''}"/>`;
  }).join('');
  const a = ang(Math.max(min, Math.min(max, value)));
  const nx = cx + Math.cos(a) * (r - 14), ny = cy + Math.sin(a) * (r - 14);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 120 70');
  svg.setAttribute('width', '120');
  svg.setAttribute('height', '70');
  svg.setAttribute('class', 'dial');
  svg.setAttribute('role', 'meter');
  svg.setAttribute('aria-valuemin', String(min));
  svg.setAttribute('aria-valuemax', String(max));
  svg.setAttribute('aria-valuenow', String(value));
  if (label) svg.setAttribute('aria-label', label);
  svg.innerHTML = `<path d="M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}" class="dial-arc"/>${ticks}`
    + `<path d="M${cx} ${cy}L${nx.toFixed(1)} ${ny.toFixed(1)}" class="dial-needle"/><circle cx="${cx}" cy="${cy}" r="11" class="dial-hub"/>`
    + `<text x="${cx}" y="${cy + 4.5}" text-anchor="middle" class="dial-num">${value}</text>`
    + (caption ? `<text x="${cx}" y="${cy - 22}" text-anchor="middle" class="dial-cap">${caption.replace(/[<&]/g, '')}</text>` : '');
  return svg;
}

// ---------- Cinematic scene bands (radical UI, 2026-10-07) ----------
// Original wide SVG vignettes for the top of Now, Prep and the Library: layered dunes under a sky
// with two moons, plus a per-place motif. Theme-coloured through CSS variables; decorative only.
const BAND_MOTIF = {
  // Play: a d20 rising like a sun between the moons.
  play: '<g transform="translate(160 44)"><polygon points="0,-24 21,-12 21,12 0,24 -21,12 -21,-12" class="band-motif"/>' +
        '<path d="M0,-24 L-12,6 L12,6 Z M-21,-12 L-12,6 M21,-12 L12,6 M0,24 L-12,6 M0,24 L12,6" class="band-line"/></g>',
  // Prep: a palace skyline with a banner pole.
  prep: '<g class="band-motif"><rect x="120" y="44" width="18" height="34"/><rect x="142" y="30" width="36" height="48"/>' +
        '<path d="M142 30 Q160 10 178 30 Z"/><rect x="182" y="40" width="18" height="38"/><rect x="214" y="18" width="2" height="60"/></g>' +
        '<path d="M216 20 L240 26 L216 32 Z" class="band-flag"/>',
  // Library: an open book on the horizon.
  library: '<g transform="translate(160 52)"><path d="M0,-6 C-14,-16 -34,-16 -44,-10 L-44,18 C-34,12 -14,12 0,22 Z M0,-6 C14,-16 34,-16 44,-10 L44,18 C34,12 14,12 0,22 Z" class="band-motif"/>' +
           '<path d="M-36,-4 C-26,-8 -14,-8 -6,-2 M-36,4 C-26,0 -14,0 -6,6 M36,-4 C26,-8 14,-8 6,-2 M36,4 C26,0 14,0 6,6" class="band-line"/></g>',
};
export function sceneBand(kind = 'play') {
  const wrap = document.createElement('div');
  wrap.className = `scene-band band-${kind}`;
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<svg viewBox="0 0 320 96" preserveAspectRatio="xMidYMax slice" focusable="false">' +
    '<circle cx="56" cy="26" r="11" class="band-moon"/><circle cx="82" cy="18" r="6" class="band-moon small"/>' +
    '<circle cx="262" cy="22" r="1.4" class="band-star"/><circle cx="288" cy="38" r="1" class="band-star"/><circle cx="236" cy="12" r="1" class="band-star"/>' +
    (BAND_MOTIF[kind] || '') +
    '<path d="M0 74 C50 58 90 66 140 72 S230 60 320 68 L320 96 L0 96 Z" class="band-dune back"/>' +
    '<path d="M0 84 C60 72 120 90 180 82 S270 74 320 86 L320 96 L0 96 Z" class="band-dune front"/></svg>';
  return wrap;
}
