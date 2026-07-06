// data-great-game.js — The Great Game (Houses of the Landsraad) expansion crunch,
// toggle-gated behind Settings.greatGame() (off by default). Campaign plot/lore excluded.
//
// Ledger T33–T37: talents/archetypes/factions/focuses/assets/NPCs NOT YET EXTRACTED (Phase 6).
// The House Management SUBSYSTEM (T36) IS extracted here now: the source places the numeric
// House economy — skill arrays, the domain Wealth/Resources income table, and the Income
// phase — in this book, NOT the Core Rulebook (corroborated 2026-07-06). The Core book creates
// a House only narratively (see DATA.houseTypes / DATA.houseDomains + DATA.houseScopeNote).

export const EXPANSION = {
  id: 'greatGame',
  extracted: false, // full T33–T37 pass pending; houseManagement subsystem below is done
  talents: [], archetypes: [], factionTemplates: [], focuses: [],
  assets: [], npcs: [],
  subsystems: ['houseManagement'],

  // ---------- House Management (T36) ----------
  houseManagement: {
    // House type → the five House skill values assigned, and how many domains it holds.
    skillArrays: {
      nascent: [6, 5, 5, 4, 4],
      minor:   [7, 6, 6, 5, 4],
      major:   [8, 7, 6, 5, 4],
      great:   [9, 8, 7, 6, 5],
    },
    domainCounts: {
      nascent: { primary: 0, secondary: 1 },
      minor:   { primary: 1, secondary: 1 },
      major:   { primary: 1, secondary: 2 },
      great:   { primary: 2, secondary: 3 },
    },

    // Base passive income per asset-subtype, as a Primary vs Secondary domain (Income phase).
    subtypeIncome: {
      machinery:     { primary: { resources: 12, wealth: 32 }, secondary: { resources: 6, wealth: 16 } },
      produce:       { primary: { resources: 10, wealth: 30 }, secondary: { resources: 5, wealth: 18 } },
      expertise:     { primary: { resources: 6,  wealth: 44 }, secondary: { resources: 3, wealth: 22 } },
      workers:       { primary: { resources: 8,  wealth: 40 }, secondary: { resources: 4, wealth: 20 } },
      understanding: { primary: { resources: 6,  wealth: 42 }, secondary: { resources: 3, wealth: 22 } },
    },

    // The overarching domain category then modifies the base numbers.
    categoryModifiers: {
      societal: {
        label: 'Society & culture (Artistic, Espionage, Political, Religion) — fewer Resources, more Wealth',
        domains: ['artistic', 'espionage', 'political', 'religion'],
        primary:   { resources: -3, wealth: 8 },
        secondary: { resources: -1, wealth: 4 },
      },
      tangible: {
        label: 'Tangible output (Farming, Industrial, Kanly, Military, Science) — more Resources, less Wealth',
        domains: ['farming', 'industrial', 'kanly', 'military', 'science'],
        primary:   { resources: 3, wealth: -6 },
        secondary: { resources: 1, wealth: -4 },
      },
    },

    // Floor after all modifiers.
    minimum: { resources: 2, wealth: 10 },

    // income = subtypeIncome[subtype][slot] + categoryModifiers[group][slot], clamped to minimum.
    incomeFormula: 'Per domain: base income for its asset subtype (as Primary or Secondary) + its category modifier, but never below 2 Resources / 10 Wealth.',
    incomeNote: 'Wealth = abstract finances/investments; Resources = raw materials, workers, construction expertise. Generated passively each Income phase and spent on Ventures.',
  },
};
