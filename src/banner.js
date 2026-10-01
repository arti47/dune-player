// banner.js — a drawn House pennant built from what the House already records:
// `banner.colors` (free text, e.g. "Green and Black") and `banner.crest` (free text, e.g. "Hawk").
// Original art (§12). Colour words map to a fixed desert-friendly palette; crest words map to a
// small emblem set; anything unrecognised falls back to the theme accent and a monogram.

const NS = 'http://www.w3.org/2000/svg';

// Longest phrases first so "sea green" wins over "green".
const COLOURS = [
  ['harvest yellow', '#d9a52b'], ['sunshine yellow', '#e8bf2e'], ['twilight orange', '#d26a2c'],
  ['light green', '#8fb46a'], ['sea green', '#3f8f7a'], ['sky blue', '#7fb2d6'], ['light blue', '#8db8d8'],
  ['deep blue', '#23406e'], ['cave brown', '#6b4a2f'],
  ['green', '#3e6b3a'], ['black', '#1d1813'], ['red', '#9e2a20'], ['crimson', '#8f1d22'],
  ['yellow', '#d9b13a'], ['gold', '#c9a03a'], ['blue', '#2f5a8c'], ['white', '#f3ece0'], ['bone', '#e8dcc4'],
  ['purple', '#5d3a73'], ['violet', '#6a4a8a'], ['brown', '#6b4a2f'], ['orange', '#d26a2c'],
  ['teal', '#2f7f80'], ['indigo', '#33336e'], ['copper', '#b06a3a'], ['bronze', '#9a6b35'],
  ['silver', '#b9bcc0'], ['grey', '#7d7a74'], ['gray', '#7d7a74'], ['scarlet', '#b02a1e'], ['ochre', '#c18a2f'],
];

/** Up to two hex colours from free text, in the order they appear. */
export function parseColours(text) {
  const t = ` ${String(text || '').toLowerCase()} `;
  const hits = [];
  let rest = t;
  for (const [word, hex] of COLOURS) {
    const i = rest.indexOf(word);
    if (i >= 0) {
      hits.push({ at: t.indexOf(word), hex });
      rest = rest.slice(0, i) + ' '.repeat(word.length) + rest.slice(i + word.length);
    }
  }
  return hits.sort((a, b) => a.at - b.at).slice(0, 2).map((h) => h.hex);
}

// 32×32 emblems keyed by crest keywords (first match wins).
const EMBLEMS = [
  [/hawk|eagle|falcon|bird|raven/, '<path d="M6 15c4-1 7 0 10 3 3-3 6-4 10-3-2 1-4 3-5 6-1.6-1.4-3.3-2-5-2s-3.4.6-5 2c-1-3-3-5-5-6z"/><path d="M16 18v6"/>'],
  [/wheat|sheaf|grain/, '<path d="M16 26V10M16 13c-2 0-3-1.2-3-3 2 0 3 1.2 3 3zM16 13c2 0 3-1.2 3-3-2 0-3 1.2-3 3zM16 17c-2 0-3-1.2-3-3 2 0 3 1.2 3 3zM16 17c2 0 3-1.2 3-3-2 0-3 1.2-3 3zM16 21c-2 0-3-1.2-3-3 2 0 3 1.2 3 3zM16 21c2 0 3-1.2 3-3-2 0-3 1.2-3 3z"/>'],
  [/tree|oak|yggdrasil/, '<circle cx="16" cy="12" r="6"/><path d="M16 18v8M12 26h8"/>'],
  [/fan/, '<path d="M16 24 7 12c5-4 13-4 18 0z"/><path d="M16 24 12 10M16 24v-15M16 24l4-14"/>'],
  [/book/, '<path d="M6.5 10c3-1.2 6.5-1.2 9.5 0v13c-3-1.2-6.5-1.2-9.5 0zM16 10c3-1.2 6.5-1.2 9.5 0v13c-3-1.2-6.5-1.2-9.5 0z"/>'],
  [/scythe|sickle/, '<path d="M10 26 20 8"/><path d="M20 8c-6-1-11 2-12 7 3-3 7-4 11-3"/>'],
  [/bull|ox/, '<path d="M8 9c0 4 3 5 5 5M24 9c0 4-3 5-5 5"/><path d="M12 13h8l-1 9h-6z"/><circle cx="14" cy="17" r=".8" fill="currentColor"/><circle cx="18" cy="17" r=".8" fill="currentColor"/>'],
  [/fist|gauntlet/, '<path d="M10 14h12v6c0 3-2 5-6 5s-6-2-6-5z"/><path d="M13 14v-4M16 14V9M19 14v-4"/><path d="M10 17h12"/>'],
  [/horse|stallion/, '<path d="M11 26c0-5 1-8 3-10l-4-3 3-5 5 3c4 1 6 5 6 9v6"/><circle cx="15" cy="12" r=".8" fill="currentColor"/>'],
  [/rose|flower|lotus/, '<circle cx="16" cy="15" r="3"/><circle cx="16" cy="9.5" r="3"/><circle cx="21.2" cy="13.3" r="3"/><circle cx="19.2" cy="19.5" r="3"/><circle cx="12.8" cy="19.5" r="3"/><circle cx="10.8" cy="13.3" r="3"/>'],
  [/gem|jewel|crystal|diamond/, '<path d="M9 13 12 8h8l3 5-7 12z"/><path d="M9 13h14M12 8l4 5 4-5M16 13v12"/>'],
  [/lamp|lantern|candle/, '<path d="M10 24h12M12 24c0-3 2-4 4-4s4 1 4 4"/><path d="M16 20v-3"/><path d="M16 8c2 2.2 2 4.4 0 6-2-1.6-2-3.8 0-6z"/>'],
  [/knife|dagger|blade|crysknife/, '<path d="M16 6c2 4 2 10 0 16-2-6-2-12 0-16z"/><path d="M12 22h8M16 22v4"/>'],
  [/scales|balance/, '<path d="M16 7v18M10 25h12M8 11h16"/><path d="M8 11 5 18h6zM24 11l-3 7h6z"/>'],
  [/hammer|anvil/, '<path d="M9 9h10v5H9z"/><path d="M15 14v12"/>'],
  [/helix|dna|spiral/, '<path d="M11 6c0 6 10 7 10 13M21 6c0 6-10 7-10 13"/><path d="M11 19v7M21 19v7M13 10h6M13 16h6M13 22h6"/>'],
  [/tiger|lion|cat|leopard/, '<path d="M8 10l4 3h8l4-3v8c0 4-4 7-8 7s-8-3-8-7z"/><path d="M13 18h.01M19 18h.01M14 22l2 1 2-1"/>'],
  [/sigil|griffin|griffon|ram/, '<path d="M16 6v20M9 11c3 0 7 2 7 6M23 11c-3 0-7 2-7 6"/><path d="M10 21h12"/>'],
  [/crown/, '<path d="M8 22 7 11l5 4 4-7 4 7 5-4-1 11z"/>'],
  [/sword/, '<path d="M16 5v17M11 22h10M16 22v4"/>'],
  [/sun/, '<circle cx="16" cy="16" r="4"/><path d="M16 6v3M16 23v3M6 16h3M23 16h3M9 9l2 2M21 21l2 2M9 23l2-2M21 11l2-2"/>'],
  [/moon/, '<path d="M20 7a9 9 0 1 0 0 18 7 7 0 0 1 0-18z"/>'],
  [/star/, '<path d="M16 7l2.6 6 6.4.4-5 4 1.7 6.4L16 20.3l-5.7 3.5 1.7-6.4-5-4 6.4-.4z"/>'],
  [/worm|serpent|snake/, '<path d="M8 24c0-5 4-6 8-6s8-1 8-6-4-6-8-6"/><circle cx="16" cy="6" r="1" fill="currentColor"/>'],
  [/tower|castle|keep/, '<path d="M10 26V12h12v14M10 12V8h2.5v2h2V8h3v2h2V8H22v4M14 26v-5h4v5"/>'],
];

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function emblemFor(crestText, houseName) {
  const t = String(crestText || '').toLowerCase();
  const hit = EMBLEMS.find(([re]) => re.test(t));
  if (hit) return hit[1];
  const letter = String(houseName || '?').replace(/^house\s+/i, '').trim().charAt(0).toUpperCase().replace(/[<&]/g, '') || '?';
  return `<text x="16" y="21" text-anchor="middle" fill="currentColor" stroke="none" font-size="14" font-weight="600">${letter}</text>`;
}

/** Pennant <svg> for a House record (needs `name`; reads `banner.colors`/`banner.crest`). */
export function houseBanner(house, size = 56) {
  const colours = parseColours(house?.banner?.colors);
  const a = colours[0] || null;          // null → themed via CSS (accent)
  const b = colours[1] || null;
  // Ink: light on dark fields, dark on light. A two-colour field uses the first colour's contrast.
  const ink = a ? (luminance(a) > 0.45 ? '#2b2016' : '#f6efe2') : null;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 64');
  svg.setAttribute('width', String(Math.round(size * 0.75)));
  svg.setAttribute('height', String(size));
  svg.setAttribute('class', 'house-banner' + (a ? '' : ' themed'));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${house?.name || 'House'} banner${house?.banner?.colors ? ` — ${house.banner.colors}` : ''}${house?.banner?.crest ? `, ${house.banner.crest}` : ''}`);
  const shape = 'M6 6h36v46l-18-8-18 8z';
  const fill = a
    ? (b
      ? `<clipPath id="bc"><path d="${shape}"/></clipPath><g clip-path="url(#bc)"><rect x="6" y="6" width="18" height="50" fill="${a}"/><rect x="24" y="6" width="18" height="50" fill="${b}"/></g>`
      : `<path d="${shape}" fill="${a}"/>`)
    : `<path class="banner-field" d="${shape}"/>`;
  svg.innerHTML = `
    <path d="M3 5h42" stroke="#8a6a3f" stroke-width="2.5" stroke-linecap="round"/>
    ${fill}
    <path d="${shape}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1"/>
    <g transform="translate(8 9)" fill="none" stroke="${ink || 'currentColor'}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${ink ? '' : 'class="banner-ink"'} style="color:${ink || 'inherit'}">
      ${emblemFor(house?.banner?.crest, house?.name)}
    </g>`;
  // Unique clip id per instance (several banners can share a page).
  if (b) {
    const id = 'bc' + Math.random().toString(36).slice(2, 8);
    svg.querySelector('clipPath').id = id;
    svg.querySelector('g[clip-path]').setAttribute('clip-path', `url(#${id})`);
  }
  return svg;
}
