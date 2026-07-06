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

    // House type → the GM's starting session Threat, per player. (Nascent none; scales with type.)
    startingThreatPerPlayer: { nascent: 0, minor: 1, major: 2, great: 3 },
    startingThreatNote: 'At the start of each session the gamemaster begins with this much Threat per player, set by the House type (Nascent 0 · Minor 1 · Major 2 · Great 3). An enemy House is never far away — the GM may also spend 1 Threat to bring an enemy House into the adventure (see the core “Rival House enters” Threat spend).',
    // Starting domains per type = domainCounts above (Nascent 0P/1S · Minor 1P/1S · Major 1P/2S · Great 2P/3S).
    startingDomainsNote: 'Each House begins with a fixed number of domains by type: Nascent 1 secondary · Minor 1 primary + 1 secondary · Major 1 primary + 2 secondary · Great 2 primary + 3 secondary.',

    // What primary vs secondary domains mean, and what the five subtype "sections" represent.
    domainGuidance: {
      intro: 'A House’s domains are the areas of business or produce it is famous for — the things the Imperium knows it for. Pick from the areas of expertise below (or invent your own); a House’s other interests still exist, but a domain is where it truly excels.',
      primary: 'A primary domain is what your House is considered one of the best in the universe at — a near-monopoly that invites little competition, but whose loss can bring the House down quickly. It is the narrative aid that explains what your House really does.',
      secondary: 'A secondary domain is lucrative and respected but not a monopoly — the House is a serious contender vying with others, often fiercely. It shows where the House is in conflict and the direction it is trying to grow.',
    },
    subtypeDefs: {
      machinery: 'Large-scale machinery or devices the area produces, or that it needs to craft and maintain its output.',
      produce: 'The goods the area actually produces — often several different kinds.',
      expertise: 'Training and managing the people who lead the area.',
      workers: 'Trained or produced staff who do the actual work, usually needed in large numbers.',
      understanding: 'The theoretical side — secret new techniques or strategies the House can develop and share with others for a price.',
    },

    // Areas of expertise: a short description + example items per subtype, for all 9 domains.
    domainDetails: {
      artistic: {
        desc: 'Grants fame and respect across the universe rather than raw power; a traveling company can also conceal spies.',
        examples: {
          machinery: ['Stage effects', 'scenery pieces', 'scenic art', 'lighting & sound systems'],
          produce: ['Plays', 'poems', 'novels', 'comedy sketches', 'musical pieces'],
          expertise: ['Playwrights', 'poets', 'composers', 'directors'],
          workers: ['Actors', 'stage crew', 'musicians', 'speakers', 'traveling companies'],
          understanding: ['Philosophy', 'literary criticism', 'theatrical performance styles'],
        },
      },
      espionage: {
        desc: 'Intelligence operations and secrets; some Houses supply the tools of the spy trade or infiltrate others to sell what they learn.',
        examples: {
          machinery: ['Surveillance devices', 'sensors', 'jamming technology'],
          produce: ['Secrets stolen from other Houses (e.g. military secrets, blackmail)'],
          expertise: ['Spymasters', 'agent handlers'],
          workers: ['Agents', 'spies', 'infiltrators'],
          understanding: ['Espionage & counter-intelligence techniques'],
        },
      },
      farming: {
        desc: 'Pastoral, peaceful worlds whose power lies in producing staples that other Houses quietly rely on.',
        examples: {
          machinery: ['Tractors', 'harvesters', 'large-scale farming equipment'],
          produce: ['Crops & animal products (special wheat, sheep, cheese)'],
          expertise: ['Stewards', 'land managers'],
          workers: ['Farm laborers', 'shepherds', 'herders'],
          understanding: ['New farming techniques (e.g. crop rotation) that raise yield'],
        },
      },
      industrial: {
        desc: 'Planets of factories and production — from filmbook readers to Guild Heighliners — mindful of Butlerian proscriptions.',
        examples: {
          machinery: ['Factory machines', 'spacecraft', 'large vehicles'],
          produce: ['Mass-produced goods', 'refined alloys', 'toys'],
          expertise: ['Supervisors', 'business managers'],
          workers: ['Factory workers', 'craftsmen', 'mechanics'],
          understanding: ['New business-management & factory-operation techniques'],
        },
      },
      kanly: {
        desc: 'Sanctioned assassination under the ruthlessly enforced forms of kanly — a limited but lucrative business.',
        examples: {
          machinery: ['Assassination weapons & traps (hunter-seekers, mines, bombs)'],
          produce: ['Poisons (to kill, stun, or weaken; near-undetectable)'],
          expertise: ['Assassin masters', 'operation planners', 'trainers'],
          workers: ['Assassins', 'thugs', 'infiltration specialists'],
          understanding: ['Means of assassination', 'infiltration techniques', 'deadly combat strikes'],
        },
      },
      military: {
        desc: 'Soldiers and materiel to take and hold territory — costly and logistically hard, but no House wants to look weak.',
        examples: {
          machinery: ['Battlefield weapons', 'artillery', 'large-scale shields', 'tanks'],
          produce: ['Ammunition', 'personal weapons', 'small arms (rifles, pistols)'],
          expertise: ['Tacticians', 'officers', 'strategists'],
          workers: ['Soldiers', 'engineers', 'pilots', 'logistics personnel'],
          understanding: ['Military strategies & new tactics'],
        },
      },
      political: {
        desc: 'Masters of the Landsraad’s games and etiquette — little personal power, but powerful friends and useful mediators.',
        examples: {
          machinery: ['Couture fashion', 'expensive trinkets', 'message services'],
          produce: ['Information, secrets & favors (even from the Imperial House)'],
          expertise: ['Political analysts', 'mediators', 'diplomats', 'fashionistas', 'social planners'],
          workers: ['Courtiers', 'spies', 'administrators', 'servants', 'entourage'],
          understanding: ['Diplomacy techniques', 'forms of etiquette'],
        },
      },
      religion: {
        desc: 'Faith monetized and packaged for sale; its trappings create leverage in business ventures.',
        examples: {
          machinery: ['Churches', 'statues', 'prayer beads', 'religious symbols', 'religious books'],
          produce: ['Prayers', 'hymns', 'religious & inspirational writings'],
          expertise: ['Philosophers', 'clergy'],
          workers: ['Choristers', 'altar servants', 'community managers'],
          understanding: ['New religious philosophies', 'new forms of faith'],
        },
      },
      science: {
        desc: 'Research and development within Butlerian limits; pairs well with Industrial to exploit its own discoveries.',
        examples: {
          machinery: ['Laboratory equipment', 'quarantine areas', 'whole scientific facilities'],
          produce: ['Chemical compounds', 'drugs', 'genetically adapted humans & animals'],
          expertise: ['Scientists', 'researchers'],
          workers: ['Lab assistants', 'managers'],
          understanding: ['New scientific research across many fields'],
        },
      },
    },
  },
};
