// crests.js — original emblem set for the 5 faction templates and 20 archetypes (§12: no copied
// art). Factions sit in a hexagonal shield, archetypes in a ring, so the two read as different
// kinds of thing at a glance. Monoline `currentColor`, so crests theme with the surrounding text.
// Expansion factions/archetypes with no bespoke emblem get a monogram in the same frame.

const NS = 'http://www.w3.org/2000/svg';

// 32×32 emblem markup, drawn inside the frame's inner ~18px area (centre 16,16).
const FACTION = {
  beneGesserit: '<path d="M8.5 17c2.5-4 12.5-4 15 0-2.5 4-12.5 4-15 0z"/><circle cx="16" cy="17" r="2.2"/><path d="M11 11.5c3-2.2 7-2.2 10 0"/>',
  fremen: '<path d="M16 7.5c2.2 3 2.6 8 0 14-2.6-6-2.2-11 0-14z"/><path d="M12.5 21.5h7M16 21.5v3"/>',
  mentat: '<circle cx="16" cy="16" r="2"/><circle cx="16" cy="9.5" r="1.4"/><circle cx="21.6" cy="19.3" r="1.4"/><circle cx="10.4" cy="19.3" r="1.4"/><path d="M16 11v3M20.4 18.6l-2.6-1.5M11.6 18.6l2.6-1.5"/>',
  guildAgent: '<path d="M16 16c0-1.6 1.6-2.4 2.8-1.6 1.6 1 1.4 3.8-.6 4.8-2.6 1.3-5.8-.6-6-3.6-.3-3.6 3.2-6.2 6.8-5.4 4.2 1 5.8 5.6 4 9.2"/>',
  sukDoctor: '<path d="M16 8.5 22.5 16 16 23.5 9.5 16z"/><path d="M16 12.5v7M12.5 16h7"/>',
};

const ARCHETYPE = {
  analyst: '<circle cx="14.5" cy="14.5" r="4.5"/><path d="M18 18l4.5 4.5"/>',
  athlete: '<path d="M10 20.5 14 16l2.5 2 5.5-6.5"/><path d="M18.5 11.5h3.5V15"/>',
  commander: '<path d="M11 23.5V8.5"/><path d="M11 9h10l-2.5 3.2L21 15.5H11"/>',
  courtier: '<path d="M9 13c2.2-1.6 4.4-1.6 7 0 2.6-1.6 4.8-1.6 7 0-.4 4-3 6-7 6.5-4-.5-6.6-2.5-7-6.5z"/><path d="M12 15.3h2.2M17.8 15.3H20"/>',
  duelist: '<path d="M9.5 9.5 22 22M22.5 9.5 10 22"/><path d="M8.5 13l4.5-4.5M19 8.5l4.5 4.5"/>',
  empath: '<circle cx="13.3" cy="16" r="4.5"/><circle cx="18.7" cy="16" r="4.5"/>',
  envoy: '<path d="M9.5 10.5h13v11h-13z"/><path d="M9.5 10.5 16 16l6.5-5.5"/><circle cx="16" cy="19" r="1.6"/>',
  herald: '<path d="M9 18.5v-5l9-4v13l-9-4z"/><path d="M18 12.5c2 .4 3.5 1.8 3.5 3.5s-1.5 3.1-3.5 3.5"/>',
  infiltrator: '<path d="M9.5 21c0-6 3-11.5 6.5-11.5S22.5 15 22.5 21"/><path d="M13 18.5h6"/><circle cx="16" cy="15" r="1.2" fill="currentColor"/>',
  messenger: '<path d="M9 18c4.5 0 8-2.5 10.5-7 .4 3.2-.6 6-3 8 2.6 0 4.6-.6 6.5-1.8-2.2 3.8-6.4 5.3-14 3.8z"/>',
  protector: '<path d="M16 8.5 22 11v4.5c0 3.8-2.6 6.6-6 7.8-3.4-1.2-6-4-6-7.8V11z"/>',
  scholar: '<path d="M9 10.5c2.2-.9 4.8-.9 7 0v11.5c-2.2-.9-4.8-.9-7 0zM16 10.5c2.2-.9 4.8-.9 7 0v11.5c-2.2-.9-4.8-.9-7 0z"/>',
  scout: '<circle cx="16" cy="16" r="6.5"/><path d="M18.6 13.4 17.2 17.2 13.4 18.6 14.8 14.8z"/>',
  sergeant: '<path d="M10 12l6 3.5 6-3.5M10 16.5l6 3.5 6-3.5M10 21l6 3.5 6-3.5"/>',
  smuggler: '<path d="M9.5 12.5 16 9l6.5 3.5v7.5L16 23.5 9.5 20z"/><path d="M9.5 12.5 16 16l6.5-3.5M16 16v7.5"/>',
  spy: '<circle cx="16" cy="14.5" r="5"/><circle cx="16" cy="13.6" r="1.4"/><path d="M15 15.2l-.6 2.6h3.2l-.6-2.6"/>',
  steward: '<circle cx="12.5" cy="12.5" r="3.5"/><path d="M15 15l7.5 7.5M19.5 19.5l2-2M17.5 17.5l1.6-1.6"/>',
  strategist: '<path d="M11 23.5h10M12.5 23.5l1-9h5l1 9"/><path d="M12 14.5V9.5h2V11h1.3V9.5h1.4V11H18V9.5h2v5"/>',
  tactician: '<path d="M9 10.5l4.5-1.5 5 1.5 4.5-1.5v12.5l-4.5 1.5-5-1.5L9 23z"/><path d="M12 18l3-3 2.5 2 3-3.5"/>',
  warrior: '<path d="M16 7v18"/><path d="M13.5 11 16 7l2.5 4"/><path d="M12.5 21h7"/>',
};

// House domains (rounded square frame).
const DOMAIN = {
  artistic: '<path d="M11 22.5c0-5 1-10 5-14 4 4 5 9 5 14"/><path d="M12.5 17.5h7M12 21h8"/><path d="M16 8.5v14"/>',
  espionage: '<circle cx="16" cy="13.5" r="3"/><path d="M14.6 16.3 13.5 22.5h5l-1.1-6.2"/>',
  farming: '<path d="M16 23.5V9"/><path d="M16 12.5c-2.2 0-3.5-1.4-3.5-3.5 2.2 0 3.5 1.4 3.5 3.5zM16 12.5c2.2 0 3.5-1.4 3.5-3.5-2.2 0-3.5 1.4-3.5 3.5zM16 16.5c-2.2 0-3.5-1.4-3.5-3.5 2.2 0 3.5 1.4 3.5 3.5zM16 16.5c2.2 0 3.5-1.4 3.5-3.5-2.2 0-3.5 1.4-3.5 3.5zM16 20.5c-2.2 0-3.5-1.4-3.5-3.5 2.2 0 3.5 1.4 3.5 3.5zM16 20.5c2.2 0 3.5-1.4 3.5-3.5-2.2 0-3.5 1.4-3.5 3.5z"/>',
  industrial: '<path d="M9.5 19.5h13l-1.5 3h-10z"/><path d="M11.5 19.5v-2h9v2"/><path d="M12.5 14.5 18 9l2.5 2.5-5.5 5.5"/><path d="M16.5 10.5 13.5 7.5"/>',
  kanly: '<path d="M10 22 20 9.5M22 22 12 9.5"/><path d="M20.5 18.5c1.4 1.9 2 3 2 3.8a2 2 0 0 1-4 0c0-.8.6-1.9 2-3.8z" fill="currentColor"/>',
  military: '<path d="M9.5 18c0-4.5 3-8 6.5-8s6.5 3.5 6.5 8v2.5h-13z"/><path d="M16 10v10.5M12.5 16.5h7"/>',
  political: '<path d="M10 21.5c-1.8-3.6-1.4-8.4 1.5-11.5M22 21.5c1.8-3.6 1.4-8.4-1.5-11.5"/><path d="M10.6 14l-1.8-.6M10 18l-1.9.3M21.4 14l1.8-.6M22 18l1.9.3"/><path d="M13 22.5h6"/>',
  religion: '<circle cx="16" cy="15" r="3"/><path d="M16 8.5v2M16 19.5v2M9.5 15h2M20.5 15h2M11.4 10.4l1.4 1.4M19.2 18.2l1.4 1.4M11.4 19.6l1.4-1.4M19.2 11.8l1.4-1.4"/><path d="M11 23.5h10"/>',
  science: '<path d="M13.5 8.5h5M14.5 8.5v5.5L10 22.5h12l-4.5-8.5V8.5"/><path d="M12 19h8"/>',
};

// House roles (arched cartouche frame).
const ROLE = {
  ruler: '<path d="M9.5 20.5 8.5 11.5l4.5 4 3-6 3 6 4.5-4-1 9z"/><path d="M10 23h12"/>',
  consort: '<circle cx="13.5" cy="17" r="4"/><circle cx="18.5" cy="17" r="4"/><path d="M16 9.5l1 1.5-1 1.5-1-1.5z"/>',
  heir: '<path d="M11 21.5 10.5 15l3 2.5L16 13l2.5 4.5 3-2.5-.5 6.5z"/><path d="M16 8v2.5M14.8 9.2h2.4"/>',
  advisor: '<path d="M21.5 8.5C15 10 11.5 15 11 22.5"/><path d="M21.5 8.5c-.5 4-3 7-7 8.2"/><path d="M10 23.5h4"/>',
  chiefPhysician: '<path d="M8.5 16.5h4l1.5-4 3 8 1.8-5.5 1.2 1.5h3.5"/>',
  councilor: '<path d="M11 9.5h10v13H11z"/><path d="M13.5 13h5M13.5 16h5M13.5 19h3"/>',
  envoy: '<path d="M9.5 13h12l-3-3M22.5 19h-12l3 3"/>',
  marshal: '<path d="M10 22 21 11"/><path d="M19.5 9.5l3 3M8.5 20.5l3 3"/>',
  scholar: '<path d="M11.5 21.5h9l-1.5-4h-6z"/><path d="M16 17.5v-3"/><path d="M16 8.5c1.6 1.8 1.6 3.6 0 5-1.6-1.4-1.6-3.2 0-5z"/>',
  spymaster: '<path d="M9 14.5c2.2-1.8 4.6-1.8 7 0 2.4-1.8 4.8-1.8 7 0-.5 3.2-2.8 4.6-7 4.8-4.2-.2-6.5-1.6-7-4.8z"/><path d="M12.5 15.8h1.8M17.7 15.8h1.8"/><path d="M16 19.3v3.2"/>',
  swordmaster: '<path d="M16 8v12"/><path d="M12 20h8M16 20v3.5"/><path d="M14.8 9.5 16 8l1.2 1.5"/>',
  treasurer: '<ellipse cx="16" cy="11" rx="5.5" ry="2"/><path d="M10.5 11v3.5c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2V11M10.5 14.5V18c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-3.5M10.5 18v3.5c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2V18"/>',
  warmaster: '<path d="M11 23.5V9M21 23.5V9"/><path d="M11 9.5h6l-1.5 2.2 1.5 2.3h-6M21 9.5h-6l1.5 2.2-1.5 2.3h6"/>',
};

const FRAMES = {
  faction: '<path class="crest-frame" d="M16 1.8 28.5 9v14L16 30.2 3.5 23V9z"/>',
  archetype: '<circle class="crest-frame" cx="16" cy="16" r="14.2"/>',
  domain: '<rect class="crest-frame" x="2.5" y="2.5" width="27" height="27" rx="7"/>',
  role: '<path class="crest-frame" d="M4 29.5V13C4 6.6 9.4 2 16 2s12 4.6 12 11v16.5z"/>',
};

function build(kind, id, name, size) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', `crest crest-${kind}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${name || id} ${kind} crest`);
  const table = { faction: FACTION, archetype: ARCHETYPE, domain: DOMAIN, role: ROLE }[kind];
  const emblem = table[id]
    || `<text x="16" y="20.5" text-anchor="middle" fill="currentColor" stroke="none" font-size="12" font-weight="600">${
      String(name || id || '?').trim().charAt(0).toUpperCase().replace(/[<&]/g, '')}</text>`;
  svg.innerHTML = FRAMES[kind] + emblem;
  return svg;
}

/** Faction-template crest (hex shield). Unknown ids fall back to a monogram. */
export function factionCrest(id, name, size = 32) { return build('faction', id, name, size); }
/** Archetype crest (ring). Unknown ids fall back to a monogram. */
export function archetypeCrest(id, name, size = 32) { return build('archetype', id, name, size); }

/** House domain crest (rounded square). */
export function domainCrest(id, name, size = 32) { return build('domain', id, name, size); }
/** House role crest (arched cartouche). */
export function roleCrest(id, name, size = 32) { return build('role', id, name, size); }

export const CREST_IDS = {
  faction: Object.keys(FACTION), archetype: Object.keys(ARCHETYPE),
  domain: Object.keys(DOMAIN), role: Object.keys(ROLE),
};
