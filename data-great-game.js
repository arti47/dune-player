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
  extracted: false, // full T33–T37 pass pending; houseManagement subsystem + CHOAM options below are done
  archetypes: [],
  assets: [], npcs: [],
  subsystems: ['houseManagement', 'planetGenerator'],

  // ---------- GM planet generator (d20 tables; index = roll − 1) ----------
  planetGenerator: {
    rollDie: 'd20',
    tables: {
      planetType: ['Uninhabitable gas giant', 'Uninhabitable rocky world', 'Uninhabitable moon/planetoid', 'Uninhabitable ice giant', 'Uninhabitable toxic-atmosphere planet', 'Uninhabitable furnace planet', 'Abandoned volcanic planet', 'Asteroid', 'Ice asteroid', 'Mineral-rich asteroid', 'Habitable alpine world', 'Habitable mineral world', 'Habitable frozen world', 'Habitable ocean world', 'Habitable arid world', 'Habitable forested world', 'Habitable tropical world', 'Habitable savanna world', 'Habitable mined-out world', 'Earth-like planet'],
      politicalAffiliation: ['Core world under direct House Corrino control', 'Core world under a Great House', 'Core world under a Major House', 'Core world under a Minor/Nascent House', 'Industrial world, House Corrino governorship', 'Agricultural world, House Corrino governorship', 'Mineral-mining world, House Corrino governorship', 'Industrial world, Great House', 'Industrial world, Major House', 'Industrial world, Minor/Nascent House', 'Agricultural world, Great House', 'Agricultural world, Major House', 'Agricultural world, Minor/Nascent House', 'Mineral-mining world, Great House', 'Mineral-mining world, Major House', 'Mineral-mining world, Minor/Nascent House', 'Military-training planet, House Corrino', 'Military-training planet, Great House', 'Military-training planet, Major House', 'Outlier independent world, no affiliation'],
      militaryPower: ['Major ground forces, space fleet, heavy defenses (key world)', 'Major ground forces, space fleet, heavy defenses', 'Ground forces, space fleet, medium defenses', 'Ground forces, medium defenses', 'Police forces, medium defenses', 'Police forces, small fleet, medium defenses', 'Space fleet, heavy defenses', 'Major space fleet, ground forces, medium defenses', 'Military outpost, space fleet only', 'Military outpost, space fleet only', 'Ground forces, medium defenses', 'Ground forces, small fleet, medium defenses', 'Ground forces, large space fleet, medium defenses', 'Very large ground-training post, small fleet, medium defenses', 'Police forces, medium fleet, basic defenses', 'Police forces, medium fleet, no defenses', 'Police forces, small fleet, no defenses', 'Police forces on the ground, no defenses', 'Lightly policed, no defenses', 'Undefended, only local militia'],
      populationLifestyle: ['Massive population, trade wealth, bureaucratic services', 'Massive population, agrarian culture', 'Massive population, industrial culture', 'Massive population, mining/smelting', 'Average population, mixed business', 'Average population, higher education & training', 'Average population, military-training facility', 'Average population, agriculture', 'Average population, space shipyards & refitting', 'Average population, entertainment production', 'Low population, nature reserves/zoos/hunting', 'Low population, casinos & pleasure resorts', 'Low population, agriculture & fisheries', 'Low population, religious retreats', 'Low population, ore-refining stations', 'Low population, gas-refining stations', 'Low population, smuggler outpost(s)', 'Low population, Imperial outpost(s)', 'Small towns, subsistence farming', 'Small village(s), a few dozen people'],
    },
  },

  // ---------- CHOAM options (T33 · owner-supplied 2026-07-08) ----------
  // A CHOAM Agent faction template + 7 CHOAM talents + CHOAM focus examples. Paraphrased.
  factionTemplates: [
    {
      id: 'choamAgent',
      name: 'CHOAM Agent',
      trait: 'CHOAM Agent',
      mandatoryTalents: { mode: 'all', options: ['Hand of CHOAM'] },
      suggestedArchetypes: ['Analyst', 'Courtier', 'Envoy', 'Steward', 'Strategist'],
      desc: 'Embedded in a House to keep it profitable and compliant with the Landsraad trade bureaucracy — while quietly securing CHOAM’s share of every deal, and occasionally spying on their own House for the corporation. Often serves as treasurer, advisor, or envoy.',
      factionIntro: 'Serving two masters: a CHOAM agent enriches the House but answers to the corporation. Actions that threaten trade — or dishonest dealing that risks an Imperial audit — can put them at odds with the House they serve.',
    },
  ],
  talents: [
    { name: 'Hand of CHOAM', faction: 'choamAgent',
      effect: 'Once per session, on a test dealing with planetary or galactic trade you act in or assist, apply the effect of spending 1 Determination — revealing your CHOAM ties to everyone involved.',
      auto: { type: 'narrative', note: 'Once/session: a free Determination effect on a Trade test.' } },
    { name: 'Audit', faction: 'choamAgent',
      effect: 'Spend 1 Momentum to compel a House or CHOAM trade member to show their recent trade records (which may be falsified, but must show something). Abusing it may cost you the talent.',
      auto: { type: 'narrative' } },
    { name: 'Check the Books', faction: 'choamAgent',
      effect: 'Reviewing financial records, when you spend 1 Momentum to Obtain Information you may ask two questions for that first point instead of one.',
      auto: { type: 'obtainInfoBonus', extraQuestions: 1, condition: 'financial records' } },
    { name: 'Deep Pockets', faction: 'choamAgent',
      effect: 'Once per session create a temporary Wealth asset for trade or purchases; it expires at scene end and can’t be made permanent. Raise its Quality by +1 per Momentum spent when created.',
      auto: { type: 'createAsset', assetName: 'Wealth', temporary: true, qualityPerMomentum: 1, oncePerSession: true } },
    { name: 'Dirty Money', faction: 'choamAgent',
      effect: 'On a successful Discipline test, spend 1+ Momentum to legitimise one illegal asset (or a level of its Quality) for a scene; or 2 Momentum per asset/level to make another’s asset suspect, exposing it to CHOAM/Landsraad sanction.',
      auto: { type: 'narrative', skill: 'discipline' } },
    { name: 'Master of Coin', faction: 'choamAgent',
      effect: 'On a financial/economic test where CHOAM’s influence is relevant, re-roll 1d20 that didn’t succeed. Also: a Challenging (D2) Understand test adds +5 to your House’s Wealth for the session (House management).',
      auto: { type: 'rerollOne', skills: ['understand', 'communicate'], condition: 'financial/economic test where CHOAM is relevant' } },
    { name: 'Report Malfeasance', faction: 'choamAgent',
      effect: 'At any time, give a target who’d fear a CHOAM audit the complication “Reported to CHOAM”, lasting until they prove innocence or the investigation ends. Spurious reports invite CHOAM reprisal.',
      auto: { type: 'narrative' } },
    // CHOAM Director talents — high-level CHOAM agents (also eligible for the CHOAM talents above)
    { name: 'Access to CHOAM Facilities', faction: 'choamAgent',
      effect: 'Once per session, spend 1 Momentum to obtain any physical asset (knife to Heighliner) from CHOAM for the next scene, delivered at Quality 0 (rare items may take time, GM’s call).',
      auto: { type: 'narrative' } },
    { name: 'Financial Analysis', faction: 'choamAgent',
      effect: 'Your accountants forensically read any ledgers you access: Obtain Information about the status of any organisation whose records you hold.',
      auto: { type: 'narrative' } },
    { name: 'Pull the Strings', faction: 'choamAgent',
      effect: 'Nudge the Imperial market: every primary and secondary domain in your House generates an additional Wealth point during House management.',
      auto: { type: 'narrative' } },
    { name: 'Rich Beyond the Dreams of Avarice', faction: 'choamAgent',
      effect: 'Any asset you create starts at Quality 1; spend 1 Momentum to make it Quality 2 (in addition to any Momentum spent to make it permanent).',
      auto: { type: 'narrative' } },
    { name: 'Sanction Shareholder', faction: 'choamAgent',
      effect: 'Once per adventure, sanction a shareholder (usually stripping territory/production). The next time they move against you or your faction, their Threat costs the GM double.',
      auto: { type: 'narrative' } },
  ],
  focuses: [
    { skill: 'understand', name: 'CHOAM Bureaucracy', desc: 'The corporation’s trade rules, audits, and paperwork.' },
    { skill: 'understand', name: 'Data Analysis', desc: 'Reading ledgers, markets, and figures for the real story.' },
    { skill: 'understand', name: 'Imperial Politics', desc: 'The Landsraad and court forces that move trade.' },
    { skill: 'understand', name: 'Smuggling', desc: 'Moving goods around the rules — and spotting others doing it.' },
    { skill: 'communicate', name: 'Bartering', desc: 'Haggling a deal to your (and CHOAM’s) advantage.' },
  ],

  // ---------- House Management (T36) — the Wealth/Resources ECONOMY only ----------
  // Core owns the House's narrative + structural layer (type, domain names + counts, the
  // areas-of-expertise detail, starting Threat) in data.js. This file adds only the numeric
  // economy The Great Game layers on top: the House skill VALUES and the domain income table.
  houseManagement: {
    // House type → the five House skill values assigned. (Domain counts are Core: DATA.houseDomainCounts.)
    skillArrays: {
      nascent: [6, 5, 5, 4, 4],
      minor:   [7, 6, 6, 5, 4],
      major:   [8, 7, 6, 5, 4],
      great:   [9, 8, 7, 6, 5],
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

    // ---------- The yearly House Management session (T36) ----------
    // The full management subsystem: one session ≈ one game year, run every 2–3 adventures.
    // These income/skill numbers are corroborated by the Houses of the Landsraad management
    // chapter (Machinery P 12R/32W, societal −3R/+8W, floor 2R/10W, Great 9/8/7/6/5, …).
    management: {
      cadence: 'One session ≈ one game year. Rule of thumb: run after every 2–3 adventures. The more often you run it, the faster the House grows — treat it like the pace of character advancement.',
      steps: [
        { name: 'News from the Imperium', optional: true, desc: 'The GM narrates the past year’s major events; players may add rumors (true, false, or misleading — GM decides) as adventure hooks.' },
        { name: 'Income', desc: 'Each primary/secondary domain generates Wealth + Resources (see the income tables). A Treasurer adds +10 Wealth.' },
        { name: 'Event', optional: true, desc: 'Roll d20 on the Events table (column by status) for an Opportunity or Crisis.' },
        { name: 'Upkeep', desc: 'Spend Wealth to maintain Military Power, Population Loyalty, Lifestyle, House skills, and extra House roles — or let them lapse.' },
        { name: 'Ventures', desc: 'Pursue up to 2 ventures (buy more at 10 Wealth each) to build facilities or gain boons.' },
        { name: 'End of Year & Downtime', desc: 'Stockpile ≤10 Resources (Wealth unlimited but 20+ risks theft); each character may attempt one personal venture.' },
      ],

      // What each House skill represents (values + starting arrays are in skillArrays above).
      skillMeanings: {
        battle: 'Military power — training, equipment, and the tactical skill/positioning of the House’s forces. Used when the House goes to war.',
        communicate: 'Diplomatic reputation, favors owed, and the acumen of envoys/spies/diplomats. Used to exert influence in court or the Landsraad.',
        discipline: 'The loyalty of the House’s people and forces — how well they obey and resist enemy infiltration.',
        move: 'Response time to a crisis — how many well-placed agents and resources the House can bring to bear quickly.',
        understand: 'Academic excellence — research, art, and craft. Vital for developing or upgrading projects and technology.',
      },
      skillMaximum: 10,

      // An NPC House with no specific character acting uses a single drive rated by its Hatred.
      npcHouseHatredDrive: [
        { hatred: 'Ambivalent', drive: 4 }, { hatred: 'Dislike', drive: 5 },
        { hatred: 'Loathing', drive: 6 }, { hatred: 'Rival', drive: 7 }, { hatred: 'Kanly', drive: 8 },
      ],
      npcHouseDriveStatements: {
        duty: ['Debt', 'Family Ties'], faith: ['Ancient Feud', 'Morality'],
        justice: ['Slight', 'Servitude', 'Theft'], power: ['Competition'], truth: ['Jealousy'],
      },

      // Status & reputation (1–100; Imperial throne ≈ 90).
      status: {
        note: 'Status is the House’s relative power/influence (distinct from Wealth), measured 1–100. Too low invites attack; too high breeds jealousy — keep it near what your House type warrants.',
        startingByType: { nascent: 15, minor: 25, major: 45, great: 65 },
        // Each level’s status band per House type + its Difficulty effect. (Nascent uses the Minor band.)
        levels: [
          { name: 'Feeble', minor: '0–10', major: '0–20', great: '0–40', effect: 'Aggressive actions & attempts to gain allies suffer +2 Difficulty; attacks are inevitable.' },
          { name: 'Weak', minor: '11–20', major: '21–40', great: '41–60', effect: 'Aggressive actions & gaining allies/favor suffer +1 Difficulty.' },
          { name: 'Respected', minor: '21–40', major: '41–60', great: '61–70', effect: 'No modifier — the House sits where its peers expect.' },
          { name: 'Strong', minor: '41–50', major: '61–70', great: '71–80', effect: 'All House actions −1 Difficulty.' },
          { name: 'Problematic', minor: '51–70', major: '71–80', great: '81–90', effect: 'Aggressive actions −2 Difficulty, but gaining favor/alliance +1; every House action/venture generates 1 Threat.' },
          { name: 'Dangerous', minor: '71+', major: '81+', great: '91+', effect: 'Aggressive/threatening actions −2 Difficulty, but diplomacy +2; every House action/venture generates 2 Threat.' },
        ],
      },

      // Domains & planetary space.
      space: {
        note: 'A planet has ~80 buildable spaces, a moon ~30 (GM may vary). Each primary domain occupies 25 spaces, each secondary 10. Over-industrialising or reclaiming land adds space at the cost of Population Loyalty.',
        planet: 80, moon: 30, reclaimablePlanet: 20, reclaimableMoon: 10,
        byType: { nascent: 10, minor: 35, major: 60, great: 100 },
        primaryDomainSpaces: 25, secondaryDomainSpaces: 10,
        domainLossNote: 'A primary domain reduced to 20 facilities drops to secondary; a secondary reduced to 8 loses domain status (only one downgrade per session).',
      },

      // Upkeep options (Wealth per session).
      militaryPower: [
        { level: 'None', difficulty: 0, upkeep: 0, desc: 'Only militia and ceremonial guards.' },
        { level: 'Militia', difficulty: 1, upkeep: 5, desc: 'Ceremonial army; can resist troops and cover a noble escape, not defend the planet.' },
        { level: 'Ground Defense', difficulty: 2, upkeep: 10, desc: 'Solid planet-wide ground army.' },
        { level: 'Planetary Defense', difficulty: 3, upkeep: 20, desc: 'Large army + space fleet that can repel invasion in orbit.' },
        { level: 'Assault Force', difficulty: 4, upkeep: 30, desc: 'Can send an offworld assault force and still defend the homeworld.' },
        { level: 'Invasion Fleet', difficulty: 5, upkeep: 50, desc: 'Imperial-scale fleet protecting several worlds and mounting large invasions.' },
      ],
      populationLoyalty: [
        { level: 'Hatred', upkeep: 0, modifier: '±2', desc: 'Despised; military counts one step lower; enemy espionage −2 Difficulty, your people-actions +2.' },
        { level: 'Loathing', upkeep: 5, modifier: '±1', desc: 'Disliked but tolerated.' },
        { level: 'Acceptance', upkeep: 10, modifier: '0', desc: 'Life as expected; no modifier.' },
        { level: 'Appreciation', upkeep: 20, modifier: '±1', desc: 'People-actions −1 Difficulty; enemy espionage +1.' },
        { level: 'Love', upkeep: 40, modifier: '±2', desc: 'Actively supported; people-actions −2, enemy espionage +2.' },
      ],
      lifestyle: [
        { level: 'Of the People', upkeep: 0, trait: 'Commoners', desc: 'Lives like commoners; no personal equipment for agents.' },
        { level: 'Poor', upkeep: 5, trait: 'Poor', desc: 'Middle-class; small personal items only.' },
        { level: 'Noble', upkeep: 10, trait: null, desc: 'Luxurious but not lavish; agents get most personal items.' },
        { level: 'Wealthy', upkeep: 30, trait: 'Impressive', desc: 'Lap of luxury; agent gear up to vehicles, GM may allow Quality 1.' },
        { level: 'Imperial', upkeep: 60, trait: 'Envied', desc: 'Rivals the Emperor; agents mistaken for nobles.' },
      ],
      skillUpkeep: [
        { skill: '0–4', wealth: 0 }, { skill: '5–6', wealth: 2 }, { skill: '7', wealth: 4 },
        { skill: '8', wealth: 8 }, { skill: '9', wealth: 12 }, { skill: '10', wealth: 24 },
      ],
      skillUpkeepNote: 'Unpaid skill upkeep drops the skill by 1 permanently and costs status equal to half its upkeep.',
      roleUpkeep: [
        { role: 'Advisor', wealth: 5 }, { role: 'Chief Physician', wealth: 5, note: '15 if Suk Doctor' },
        { role: 'Scholar', wealth: 5 }, { role: 'Spymaster', wealth: 5 },
        { role: 'Swordmaster', wealth: 5, note: '15 if Ginaz' }, { role: 'Treasurer', wealth: 5, note: '+1 per Treasurer already employed' },
        { role: 'Warmaster', wealth: 5 }, { role: 'Bene Gesserit-trained', wealth: 5, note: 'added to the normal cost' },
        { role: 'Any other role', wealth: 2 },
      ],
      additionalRoles: { nascent: 2, minor: 4, major: 6, great: 8 },
      // What a filled (expert) role grants during management.
      roleBenefits: {
        Ruler: 'Sets House direction; without one, all House skill tests are +1 Difficulty.',
        Consort: 'If spouse of the Ruler, may inspire the Ruler/Heir for +2 Momentum on House tests.',
        Advisor: 'Pick a skill + focus; add +1d20 to any House test using that skill (focus applies if relevant). Repeatable.',
        'Chief Physician': 'Counts as the “Trusted” trait; House troops defend at +1 Quality (max 4).',
        Councilor: 'Discipline House tests are treated as having an applicable focus.',
        Envoy: 'Reduce the Difficulty of one Communicate test with another House/faction by one step.',
        Heir: 'Instantly becomes Ruler if the Ruler is lost — no power vacuum.',
        Marshal: '+1 Resource per Marshal (safer, more productive people).',
        Scholar: 'Research/academic Understand tests −1 Difficulty and +1d20.',
        Spymaster: 'Enemy espionage against the House is +1 Difficulty.',
        Swordmaster: 'Pick two weapons; House soldiers gain focus in both; bodyguards the Ruler/Heir.',
        Treasurer: '+10 Wealth each session; up to five may be employed.',
        Warmaster: 'A House conflict the Warmaster commands starts with a Momentum pool of 4.',
      },

      // Ventures.
      ventureRules: {
        perSession: 2, buyExtraCost: 10, tradeUnused: 3, extraDieCosts: [5, 10, 15],
        convert: 'Trade converts 3 Wealth ↔ 1 Resource (max ⅓ of the pool per session, or ½ with a Spaceport); each direction costs one venture.',
        forcedLabor: 'Reduce Population Loyalty by 1 for +1 venture (max twice/session); Loyalty then costs +5 Wealth next session (+10 if reduced to 0).',
        test: 'Roll 2d20 (buy up to +3 dice at 5/10/15 Wealth) using the venture’s House skill + the leading character’s drive vs the listed successes. Cost is paid whether or not the test succeeds; a failed venture retries next session at +½ cost.',
      },
      constructionVentures: [
        { name: 'Claim Domain', cost: 'R12 (secondary) / R24 (primary)', skill: 'Communicate / Understanding', successes: 5, desc: 'Upgrade dedicated facilities (10 for secondary, 25 for primary) into a trading domain.' },
        { name: 'Domain Facility', cost: 'R5', skill: 'Variable', successes: 1, desc: 'Build one facility for an area of expertise (6 of a kind = a small bonus).' },
        { name: 'Expand Estate — Stylish', cost: 'R12', skill: 'Understanding', successes: 2, desc: 'Fit the estate to Imperial fashion for hosting nobles.' },
        { name: 'Expand Estate — Luxurious', cost: 'R16', skill: 'Understanding', successes: 3, desc: 'Requires Stylish; host diplomacy at −1 Difficulty.' },
        { name: 'Expand Estate — Palatial', cost: 'R20', skill: 'Understanding', successes: 4, desc: 'Requires Luxurious; host diplomacy at −2 Difficulty.' },
        { name: 'Expand Estate — Escape System', cost: 'R20', skill: 'Understanding', successes: 4, desc: 'Escape actions during a siege −2 Difficulty.' },
        { name: 'Expand Land', cost: 'R6', skill: 'Discipline', successes: 1, desc: '+1 space (up to the planet/moon max), or demolish a holding to reclaim its space.' },
        { name: 'Festival', cost: 'R2', skill: 'Communicate', successes: 0, desc: 'Ask one Obtain-Information question about the people/enemy spies at session end.' },
        { name: 'Fortifications', cost: 'R4 (standard) / R8 (enhanced)', skill: 'Discipline', successes: 1, desc: 'Add one (or, enhanced, two) fortification assets to an area.' },
        { name: 'Great Monument', cost: 'R8', skill: 'Discipline', successes: 3, desc: 'Vanity build carrying the “Impressive” trait.' },
        { name: 'Hidden Area', cost: 'R10', skill: 'Understanding', successes: 4, desc: '“Hidden” trait; conceals a facility or stores up to 20 Resources (not if fortified).' },
        { name: 'Industrialize', cost: 'R2', skill: 'Discipline', successes: 2, desc: 'Build a second holding on an occupied space; nearby Population Loyalty −1 level.' },
        { name: 'Military Base', cost: 'R2', skill: 'Battle', successes: 0, desc: 'Base for Military Developments (max ⅓ of a domain’s spaces).' },
        { name: 'Military Development', cost: 'Variable', skill: 'Battle', successes: 'Variable', desc: 'Command Bunker (R6/S2), Garrison (R8/S1), Landing Pad (R8/S1), Sentry Posts (R6/S2), Shield (R10/S3), Shuttle Platform (R4/S3), Vehicle Bay (R10/S1).' },
        { name: 'Mine', cost: 'R10', skill: 'Discipline', successes: 2, desc: '+2 Resources/session; roll d20 each time — under the years active, it exhausts.' },
        { name: 'Orbital Facility', cost: 'R10', skill: 'Understanding', successes: 3, desc: 'Build a usable space in orbit (bypasses land clearing).' },
        { name: 'Planetary Feature', cost: 'R4', skill: 'Discipline', successes: 1, desc: 'Flavor construction (statue, park, retreat…) with no mechanical benefit.' },
        { name: 'Pleasure District', cost: 'R10', skill: 'Understanding', successes: 2, desc: 'Each district reduces Population Loyalty cost by 1 Wealth.' },
        { name: 'Spaceport', cost: 'R10', skill: 'Understanding', successes: 3, desc: 'Convert up to ½ (not ⅓) of Wealth/Resources by trade.' },
        { name: 'Transit System', cost: 'R4', skill: 'Move', successes: 1, desc: 'Link four spaces for movement; build a network with more.' },
        { name: 'Storage Facility', cost: 'R2', skill: 'Discipline', successes: 0, desc: 'Each silo stores 10 Resources past end-of-year.' },
      ],
      boonVentures: [
        { name: 'Balk Enemy', cost: 'W5', skill: 'Battle', successes: 1, desc: 'Bringing an enemy House into a scene costs the GM 3 Threat (not 1) until next session.' },
        { name: 'Bene Gesserit Alliance', cost: 'W10', skill: 'Discipline', successes: 4, desc: 'Tests against a Bene Gesserit agent −1 Difficulty until next session.' },
        { name: 'CHOAM Agreement', cost: 'W5', skill: 'Communicate', successes: 2, desc: 'One domain grants +10 Wealth next session.' },
        { name: 'CHOAM Influence', cost: 'W10', skill: 'Communicate', successes: 3, desc: '+1 success on one trade negotiation (once).' },
        { name: 'Cultivate Initiative', cost: 'W10', skill: 'Understand', successes: 2, desc: 'Minor supporting characters next adventure gain Bold (one skill).' },
        { name: 'Cultivate Obedience', cost: 'W10', skill: 'Understand', successes: 2, desc: 'Minor supporting characters next adventure gain Cautious (one skill).' },
        { name: 'Cultivate Unity', cost: 'W10', skill: 'Understand', successes: 3, desc: 'Next adventure’s Momentum pool starts at a minimum of 3.' },
        { name: 'Enlist Ally', cost: 'W20', skill: 'Communicate', successes: 3, desc: 'Spend 1 Momentum to bring an allied House into a scene, until next session.' },
        { name: 'Establish Reputation', cost: 'W20', skill: 'Communicate', successes: 3, desc: 'Make a 3-session-maintained trait a permanent House trait.' },
        { name: 'Favor of the Bene Gesserit', cost: 'W10', skill: 'Discipline', successes: 1, desc: '+1 success on one test with a Bene Gesserit (once).' },
        { name: 'Favor of the Spacing Guild', cost: 'W15', skill: 'Discipline', successes: 1, desc: '+1 success on one test with a Guild agent (once).' },
        { name: 'Fill a House Role', cost: 'W25', skill: 'Understand', successes: 1, desc: 'Hire an expert into a vacant role (+10 Wealth if a Mentat).' },
        { name: 'Fund Discovery', cost: 'W30', skill: 'Move', successes: 4, desc: 'Bribe the Guild for first word of a new colonizable planet.' },
        { name: 'Gain Reputation', cost: 'W20', skill: 'Communicate', successes: 4, desc: 'Gain a temporary House trait (permanent after 3 straight sessions via Establish Reputation).' },
        { name: 'Gain Territory', cost: 'W50', skill: 'Communicate', successes: 5, desc: 'Claim a newly discovered planet (needs Emperor’s favor + a funded discovery).' },
        { name: 'Guild Alliance', cost: 'W10', skill: 'Move', successes: 4, desc: 'Tests against any Guild agent −1 Difficulty until next session.' },
        { name: 'Heighliner Charter', cost: 'W40', skill: 'Move', successes: 2, desc: 'Instantly relocate nonmilitary assets to another planet.' },
        { name: 'Humanitarian Aid', cost: 'W20', skill: 'Move', successes: 3, desc: '+2 status and the temporary “Charitable” trait (needs a farming domain).' },
        { name: 'Improve Skills', cost: 'see table', skill: 'the skill raised', successes: 'see table', desc: '+1 to a House skill (max 10).' },
        { name: 'Mount Invasion', cost: '10 W/unit', skill: 'Battle', successes: 1, desc: 'Send an invasion fleet (see Warfare).' },
        { name: 'Prepare for War', cost: 'W30', skill: 'Battle', successes: 2, desc: 'Next warfare conflict starts at full (6) Momentum; decays 1/session unused.' },
        { name: 'Reduce Status', cost: 'W20', skill: 'Discipline', successes: 3, desc: '−1 status per success (max −5); on failure +3 status.' },
        { name: 'Saber Rattling', cost: 'W10', skill: 'Battle', successes: 3, desc: '+2 status and the temporary “Aggressive” trait (needs a military domain).' },
        { name: 'Secret Store', cost: 'W10', skill: 'Discipline', successes: 4, desc: 'Hide another House’s contraband for +10 Wealth / +5 Resources next session; on failure gain “Criminal”.' },
      ],
      boonStatusNote: 'Each successful boon grants +1 status (each failure −1). A new secondary domain adds 5 status; a new primary adds 10.',
      improveSkillTable: [
        { current: 4, wealth: 20, difficulty: 2 }, { current: 5, wealth: 30, difficulty: 3 },
        { current: 6, wealth: 40, difficulty: 4 }, { current: 7, wealth: 50, difficulty: 5 },
        { current: 8, wealth: 60, difficulty: 5 }, { current: 9, wealth: 80, difficulty: 5 },
      ],
      personalVentures: [
        { name: 'Affirm Allegiance', skill: 'Communicate', difficulty: 2, desc: 'Gain the “Friend of X” trait with an allied House/faction.' },
        { name: 'Combat Training', skill: 'Battle', difficulty: 2, desc: 'One weapon counts as +1 Quality (max 4) until next session.' },
        { name: 'Craft Item', skill: 'Understand', difficulty: '2–4', desc: '2 successes = a new machine asset; 4 = Quality 1 (prototypes cap at Quality 0).' },
        { name: 'Create Composition', skill: 'Communicate', difficulty: 'Various', desc: 'A work of art asset; +1 Quality per success beyond the first.' },
        { name: 'Develop Contact', skill: 'Communicate', difficulty: 2, desc: 'Gain a named contact asset.' },
        { name: 'Heal Complication', skill: 'Move', difficulty: 1, desc: 'Remove a lingering complication.' },
        { name: 'Skill Training', skill: 'as specified', difficulty: '1–3', desc: 'Add +1d20 to one (or, on 3+ successes, two) tests of that skill next adventure.' },
        { name: 'Monitor Enemies', skill: 'Move', difficulty: 3, desc: '+1d20 vs that enemy, or one GM question about their plans.' },
        { name: 'Romantic Connection', skill: 'Communicate', difficulty: 3, desc: 'Gain a contact/ally romantic partner.' },
        { name: 'Seek Consort', skill: 'Communicate / Discipline', difficulty: 4, desc: 'Make a 3-session partner a Quality-2 ally/contact; House +1 status.' },
        { name: 'Seek House Favor', skill: 'Discipline', difficulty: 3, desc: 'Interactions with House superiors −1 Difficulty until next session.' },
        { name: 'Train Subordinates', skill: 'Understand', difficulty: 2, desc: '+1 Quality to a human asset (max +2 by this method).' },
      ],

      // Events (roll d20; the column depends on current status level).
      eventsByStatus: [
        { column: 'Feeble / Weak', opportunity: '1–4', crisis: '17–20' },
        { column: 'Respected', opportunity: '1–5', crisis: '16–20' },
        { column: 'Strong', opportunity: '1–6', crisis: '15–20' },
        { column: 'Problematic', opportunity: '1–7', crisis: '14–20' },
        { column: 'Dangerous', opportunity: '1–8', crisis: '13–20' },
      ],
      opportunities: [
        { roll: '1–2', name: 'Archaeological Find', desc: 'A ruin or relic surfaces in House territory, drawing attention.' },
        { roll: '3–4', name: 'Diplomatic Overture', desc: 'Another House sends an ambassador to negotiate a treaty or alliance.' },
        { roll: '5–6', name: 'Discovery', desc: 'Rare ores, a new route, or a research/spiritual breakthrough is found.' },
        { roll: '7–8', name: 'Economic Boom', desc: 'A well-placed House can profit before the downturn.' },
        { roll: '9–10', name: 'Festive Invitation', desc: 'Another House invites the players to a gathering — an ally to court or an enemy to read.' },
        { roll: '11–12', name: 'Justice Prevails', desc: 'A criminal/espionage operation is uncovered — how deep does it go?' },
        { roll: '13–14', name: 'Land Rush', desc: 'Nearby land is up for grabs — and others want it too.' },
        { roll: '15–16', name: 'New Subjects', desc: 'A group arrives seeking to settle — opportunity and problem both.' },
        { roll: '17–18', name: 'Political Calm', desc: 'A lull to press existing agendas — but what are rivals doing?' },
        { roll: '19–20', name: 'Convenient Misfortune', desc: 'Roll on the Crisis table — it happens to a rival House instead.' },
      ],
      crises: [
        { roll: '1–2', name: 'Assassination Attempt', desc: 'A player character is targeted.' },
        { roll: '3–4', name: 'Bandit Activity', desc: 'Outlaws (or a rival’s proxies) prey on the frontier.' },
        { roll: '5–6', name: 'Kanly', desc: 'A formal vendetta with a rival House commences.' },
        { roll: '7–8', name: 'Food Shortage', desc: 'Harvests/imports fall — unrest looms.' },
        { roll: '9–10', name: 'Espionage', desc: 'A mole is leaking to rivals.' },
        { roll: '11–12', name: 'Disaster', desc: 'Fire/storm/quake/flood damages infrastructure.' },
        { roll: '13–14', name: 'Plague', desc: 'A sickness spreads through the population.' },
        { roll: '15–16', name: 'Public Scandal', desc: 'A House leader is implicated in a crime, shaking public trust.' },
        { roll: '17–18', name: 'Smugglers', desc: 'Black-marketeers siphon off the House’s goods.' },
      ],
      crisesGap: 'The 19–20 Crisis row was not in the supplied text (source-blocked, §2).',

      // End of year.
      endOfYear: {
        resourceStockpile: 10,
        wealthNote: 'Wealth carries over without limit, but holding 20+ risks theft.',
        wealthTheft: [
          { roll: '1–7', lost: 0 }, { roll: '8–12', lost: 5 }, { roll: '13–17', lost: 10 },
          { roll: '18–19', lost: 15 }, { roll: '20', lost: 20 },
        ],
      },

      // House ascension.
      ascension: [
        { from: 'Nascent → Established Minor', reqs: 'Gain a primary domain (alongside the starting secondary). Same status track as a Minor House.' },
        { from: 'Minor → Major', reqs: '1 primary + 2 secondary domains; undisputed control of a planet; owe allegiance to none but the Emperor; status ≥50; a Major House to sponsor the request.' },
        { from: 'Major → Great', reqs: '2 primary + 3 secondary domains; status ≥75; a Communicate venture (50 Wealth, Difficulty 5) succeeded on 3 consecutive sessions. Success → status resets to 65 on the Great track; failure → −10 status.' },
      ],
      warfareNote: 'Large planetary warfare uses the planet’s spaces as zones. Moving units offworld via the Guild costs 5 Wealth/unit (a venture) plus a chartered Heighliner. The defender rolls a d20 pool equal to their Military Power Difficulty to field 3 assets +1 per success (doubled if forewarned); attackers spend two turns landing, then move (Move test) and raze zones (Battle test) at a base Difficulty of the defender’s Military Power. Full rules use the Core warfare conflict system.',
    },
  },

  // ---------- Example Houses of the Landsraad (T33/T36 reference) ----------
  // The book's ready-made example Houses, reduced to their House-creation CRUNCH only:
  // House Traits, banner (colors + crest), and primary/secondary domains with subtypes +
  // a one-line paraphrased product note. All setting lore (history, homeworld, noble family,
  // agenda, Minor Houses) is intentionally omitted per the IP/scope rules (§12/§10). `type`
  // is recorded only where the book states it explicitly; others are left null (inferred).
  landsraadHousesNote: 'Ready-made Houses from Houses of the Landsraad, reduced to their creation crunch (traits, banner, domains). Note the printed domain counts do not always match the by-type creation minimums — these are reference entries, not wizard pregens.',
  landsraadHouses: [
    { name: 'House Alexin', type: 'major', traits: ['Industrious', 'Pragmatic'], colors: 'Harvest Yellow', crest: 'Wheat sheaf',
      primary: [{ domain: 'Farming', subtype: 'produce', note: 'staple foods — wheat, gourds' }],
      secondary: [{ domain: 'Farming', subtype: 'machinery', note: 'automated harvesting gear' }, { domain: 'Logistics', subtype: 'machinery', note: 'bulk-food transport' }] },
    { name: 'House Atreides', type: 'great', traits: ['Honorable', 'Popular'], colors: 'Green and Black', crest: 'Hawk',
      primary: [{ domain: 'Farming', subtype: 'produce', note: 'pundi rice' }],
      secondary: [{ domain: 'Farming', subtype: 'produce', note: 'moonfish / large-scale fishing' }, { domain: 'Artistic', subtype: 'understanding', note: 'diplomacy & negotiation' }, { domain: 'Military', subtype: 'expertise', note: 'sought-after tacticians & instructors' }] },
    { name: 'House Ecaz', type: 'great', traits: ['Just', 'Determined'], colors: 'Light Green', crest: 'Tree (Yggdrasil)',
      primary: [{ domain: 'Farming', subtype: 'produce', note: 'forestry — elacca wood, fogwood, tent silk' }],
      secondary: [{ domain: 'Science', subtype: 'produce', note: 'pharmaceuticals' }, { domain: 'Political', subtype: 'understanding', note: 'Landsraad politics' }] },
    { name: 'House Hagal', type: 'great', traits: ['Ambitious', 'Wealthy'], colors: 'Sky Blue', crest: 'Fan',
      primary: [{ domain: 'Industrial', subtype: 'produce', note: 'gem & mineral mining — soostones, fire opals' }],
      secondary: [{ domain: 'Industrial', subtype: 'machinery', note: 'mining machinery' }, { domain: 'Artistic', subtype: 'produce', note: 'folk music' }] },
    { name: 'House Harkonnen', type: 'great', traits: ['Brutal', 'Cunning'], colors: 'Red and Black', crest: 'Sigil',
      primary: [{ domain: 'Farming', subtype: 'produce', note: 'spice (Arrakis governors)' }, { domain: 'Industrial', subtype: 'produce', note: 'refined alloys' }],
      secondary: [{ domain: 'Industrial', subtype: 'produce', note: 'cheap mass-produced goods' }, { domain: 'Farming', subtype: 'produce', note: 'whale fur (Lankiveil)' }] },
    { name: 'House Kenola', type: 'major', traits: ['Dogmatic', 'Faithful'], colors: 'White', crest: 'Open book',
      primary: [{ domain: 'Religion', subtype: 'machinery', note: 'religious paraphernalia & Bibles' }],
      secondary: [{ domain: 'Religion', subtype: 'understanding', note: 'retreat for contemplation' }, { domain: 'Artistic', subtype: 'produce', note: 'religious art & poetry' }] },
    { name: 'House Lindaren', type: 'major', traits: ['Passionate', 'Righteous'], colors: 'Deep Blue', crest: 'Scythe / sickle',
      primary: [{ domain: 'Industrial', subtype: 'produce', note: 'lichen fabrics & foodstuffs' }],
      secondary: [{ domain: 'Military', subtype: 'produce', note: 'small arms & ammunition' }, { domain: 'Industrial', subtype: 'understanding', note: 'logistics & distribution' }] },
    { name: 'House Maros', type: 'major', traits: ['Just', 'Respectful'], colors: 'Sunshine Yellow', crest: 'Bull',
      primary: [{ domain: 'Farming', subtype: 'produce', note: 'Marosdeer venison' }],
      secondary: [{ domain: 'Industrial', subtype: 'machinery', note: 'offworld factories & abattoirs' }, { domain: 'Artistic', subtype: 'expertise', note: 'landscape & environmental design' }] },
    { name: 'House Mikarrol', type: null, traits: ['Cruel', 'Amoral'], colors: 'Purple', crest: 'Mailed fist',
      primary: [{ domain: 'Farming/Industrial', subtype: 'workers', note: 'slave holdings' }],
      secondary: [{ domain: 'Farming', subtype: 'produce', note: 'herd animals / meat' }, { domain: 'Science', subtype: 'understanding', note: 'alien flora & fauna databases' }] },
    { name: 'House Moritani', type: 'major', traits: ['Independent', 'Vengeful'], colors: 'Black', crest: 'Horse',
      primary: [{ domain: 'Military', subtype: 'machinery', note: 'atomics & munitions stockpile' }],
      secondary: [{ domain: 'Industrial', subtype: 'produce', note: 'raw salt' }, { domain: 'Kanly', subtype: 'expertise', note: 'mercenaries & assassins' }] },
    { name: 'House Mutelli', type: null, traits: ['Respected', 'Unthreatening'], colors: 'White', crest: 'Tudor rose',
      primary: [{ domain: 'Political', subtype: 'expertise', note: 'diplomacy & mediation' }],
      secondary: [{ domain: 'Political', subtype: 'produce', note: 'secrets & favors' }, { domain: 'Kanly', subtype: 'expertise', note: 'assassination consultation' }] },
    { name: 'House Novebruns', type: null, traits: ['Cutthroat', 'Expansionist'], colors: 'Cave Brown', crest: 'Cut gemstone',
      primary: [{ domain: 'Industrial', subtype: 'produce', note: 'refined ore' }],
      secondary: [{ domain: 'Industrial', subtype: 'machinery', note: 'mining tools & machinery' }, { domain: 'Science', subtype: 'understanding', note: 'planetological data & expertise' }] },
    { name: 'House Richese', type: 'major', traits: ['Innovative', 'Resourceful'], colors: 'Light Blue', crest: 'Lamp',
      primary: [{ domain: 'Industrial', subtype: 'produce', note: 'miniaturization — power chips, data coils' }],
      secondary: [{ domain: 'Industrial', subtype: 'machinery', note: 'Heighliner construction' }] },
    { name: 'House Spinnette', type: null, traits: ['Cunning', 'Discreet'], colors: 'Twilight Orange', crest: 'Knife',
      primary: [{ domain: 'Kanly', subtype: 'workers', note: 'trained assassins' }],
      secondary: [{ domain: 'Artistic', subtype: 'expertise', note: 'poison-concealing chefs' }, { domain: 'Science', subtype: 'produce', note: 'drugs, poisons, flavor extracts' }] },
    { name: 'House Taligari', type: 'major', traits: ['Artistic', 'Deceptive'], colors: 'Teal', crest: 'Scales',
      primary: [{ domain: 'Artistic', subtype: 'expertise', note: 'poets, dancers, playwrights' }],
      secondary: [{ domain: 'Artistic', subtype: 'machinery', note: 'stagecraft & performance tech' }, { domain: 'Political', subtype: 'workers', note: 'actor & technician training' }] },
    { name: 'House Thorvald', type: null, traits: ['Diligent', 'Competitive'], colors: 'Indigo and Yellow', crest: 'Hammer',
      primary: [{ domain: 'Industrial', subtype: 'produce', note: 'smelting & refined alloys' }],
      secondary: [{ domain: 'Military', subtype: 'understanding', note: 'War Academy tacticians' }] },
    { name: 'House Vernius', type: 'major', traits: ['Cunning', 'Creative'], colors: 'Purple and Copper', crest: 'Double helix',
      primary: [{ domain: 'Industrial', subtype: 'machinery', note: 'Heighliners, machines, orships' }],
      secondary: [{ domain: 'Espionage', subtype: 'machinery', note: 'spy-eyes, hunter-seekers, surveillance' }] },
    { name: 'House Wydras', type: 'great', traits: ['Subtle', 'Impartial', 'Refined'], colors: 'Sea Green', crest: 'Laza tiger',
      primary: [{ domain: 'Espionage', subtype: 'understanding', note: 'espionage arts & schools' }],
      secondary: [{ domain: 'Espionage', subtype: 'produce', note: 'data archives' }, { domain: 'Religion', subtype: 'expertise', note: 'theological colleges' }] },
  ],
};
