// data.js — Imperium Player core rules library.
// Game: Dune: Adventures in the Imperium (Modiphius 2d20). Personal play aid.
// Source: owner's rulebooks via NotebookLM notebook "Dune RPG" (Core Rulebook).
// All text paraphrased — no rules prose reproduced. See CLAUDE.md §2.1 ledger.
//
// Extracted 2026-07-06 (ledger): T01 skills · T02 drives · T03 focus examples ·
// T04 difficulty · T05 momentum · T06 threat · T07 determination · T08 complications
// (Move/Understand example lists absent from source — recorded gap, re-check in audit) ·
// T09 dice buying · T22 conflict types · T23 defeat formulas · T24 advancement ·
// T25 sandworm riding · T26 desert hazards (some named hazards live in Sand and Dust).
// Pending here: T10–T21, T31–T32, T38 (see CLAUDE.md §2.1).

export const DATA = {

  // ---------- T01 · Skills (rated 4–8) ----------
  skills: [
    { id: 'battle',      name: 'Battle',      tag: 'Physical conflict & strategy',
      desc: 'Skill at arms, awareness of danger, grasp of tactics and strategy, and knowledge of the tools, techniques, and history of combat.' },
    { id: 'communicate', name: 'Communicate', tag: 'Social tests',
      desc: 'Skillful conversation, discussion, and debate — using implication, innuendo, subtext, and context to convey or hide intent, and to read the same in others.' },
    { id: 'discipline',  name: 'Discipline',  tag: 'Willpower & authority',
      desc: 'Control of your own mind and body (overruling instinct and autonomic function), overt influence over others through presence, force of will, and authority, and the focus to concentrate on a complex task such as picking a lock.' },
    { id: 'move',        name: 'Move',        tag: 'Athletics & speed',
      desc: 'Mobility — maneuvering through an environment quickly or carefully, and overcoming physical obstacles.' },
    { id: 'understand',  name: 'Understand',  tag: 'Knowledge & deduction',
      desc: 'Taking in and processing information, recalling and applying it later, logical deduction and intuitive comprehension, and deep academic, technical, or scientific knowledge.' },
  ],

  // ---------- T02 · Drives (array 8/7/6/5/4) ----------
  drives: [
    { id: 'duty',    name: 'Duty',    tag: 'Your responsibility',
      desc: 'The pressure to find your place in society and fulfill your role — and the weight of obligation and personal responsibility.' },
    { id: 'faith',   name: 'Faith',   tag: 'What your heart trusts',
      desc: 'Spiritual need and the moral expectation of religion — dedication to a higher power or the hand of destiny. A high Faith need not be religious: some place their faith in their faction or friends as much as in God.' },
    { id: 'justice', name: 'Justice', tag: 'What is right',
      desc: 'A drive toward balance and fairness and the will to redress injustices — though it can as easily uphold bad laws or serve as an excuse for revenge.' },
    { id: 'power',   name: 'Power',   tag: 'What you want',
      desc: 'The pursuit of greater influence, authority, or control — the character’s ego, their belief in their own moral authority and their right to take what they want.' },
    { id: 'truth',   name: 'Truth',   tag: 'What the facts are',
      desc: 'The desire for knowledge and the need to uncover or define what is true — revealing the right answers even when they are uncomfortable or dangerous.' },
  ],

  // ---------- T03 · Focus example lists (82 total; * = specify a specialty) ----------
  focusExamples: {
    battle: [
      { name: 'Assassination',  desc: 'Closing on a target to kill' },
      { name: 'Atomics',        desc: 'Use and lore of atomic weapons' },
      { name: 'Dirty Fighting', desc: 'Brawling and improvised weapons' },
      { name: 'Dueling',        desc: 'Duel technique and etiquette' },
      { name: 'Evasive Action', desc: 'Dodging and avoiding blows' },
      { name: 'Lasgun',         desc: 'Laser weapons' },
      { name: 'Long Blades',    desc: 'Swords' },
      { name: 'Shield Fighting',desc: 'Using shields and getting past them' },
      { name: 'Short Blades',   desc: 'Knives and daggers' },
      { name: 'Sneak Attacks',  desc: 'Ambushes' },
      { name: 'Strategy',       desc: 'Battlefield-scale conflict' },
      { name: 'Tactics',        desc: 'Small-unit conflict' },
      { name: 'Unarmed Combat', desc: 'Fighting without a weapon' },
    ],
    communicate: [
      { name: 'Acting',          desc: 'Playing a part convincingly' },
      { name: 'Bartering',       desc: 'Haggling prices down' },
      { name: 'Charm',           desc: 'Winning people over' },
      { name: 'Deceit',          desc: 'Lies and plots' },
      { name: 'Diplomacy',       desc: 'Negotiating agreements' },
      { name: 'Disguise',        desc: 'Appearing to be someone else' },
      { name: 'Empathy',         desc: 'Reading emotional responses' },
      { name: 'Gossip',          desc: 'Local rumors and talk' },
      { name: 'Innuendo',        desc: 'Saying things without saying them' },
      { name: 'Inspiration',     desc: 'Sparking others through artistry' },
      { name: 'Interrogation',   desc: 'Extracting information, subtly or not' },
      { name: 'Intimidation',    desc: 'Making others back down' },
      { name: 'Linguistics',     desc: 'Languages and their nature' },
      { name: 'Listening',       desc: 'Catching quiet or hidden speech' },
      { name: 'Music*',          desc: 'A chosen instrument' },
      { name: 'Neurolinguistics',desc: 'Planting ideas unnoticed' },
      { name: 'Persuasion',      desc: 'Getting agreement to an action' },
      { name: 'Secret Language*',desc: 'A faction’s hidden tongue' },
      { name: 'Teaching',        desc: 'Explaining quickly and simply' },
    ],
    discipline: [
      { name: 'Command',      desc: 'Giving orders that get followed' },
      { name: 'Composure',    desc: 'Staying calm under stress' },
      { name: 'Espionage',    desc: 'Spycraft and shadowing targets' },
      { name: 'Infiltration', desc: 'Gaining access to places and factions' },
      { name: 'Observe',      desc: 'Watching for intelligence' },
      { name: 'Precision',    desc: 'Delicate, complex handwork' },
      { name: 'Resolve',      desc: 'Enduring environmental danger' },
      { name: 'Self-Control', desc: 'Mastering feelings and reactions' },
      { name: 'Survival*',    desc: 'A chosen environment (desert, urban…)' },
    ],
    move: [
      { name: 'Acrobatics',       desc: 'Tumbling and swinging' },
      { name: 'Body Control',     desc: 'Commanding heartbeat and breath' },
      { name: 'Climb',            desc: 'Scaling surfaces' },
      { name: 'Dance',            desc: 'Dancing and performance' },
      { name: 'Distance Running', desc: 'Endurance running' },
      { name: 'Drive',            desc: 'Ground vehicles' },
      { name: 'Escaping',         desc: 'Slipping bonds' },
      { name: 'Grace',            desc: 'Poise and style in motion' },
      { name: 'Pilot*',           desc: 'A chosen craft type' },
      { name: 'Stealth',          desc: 'Moving unseen' },
      { name: 'Swift',            desc: 'Sheer speed' },
      { name: 'Swim',             desc: 'Swimming anywhere' },
      { name: 'Unobtrusive',      desc: 'Hiding in plain sight' },
      { name: 'Worm Rider',       desc: 'Calling and riding worms (Fremen)' },
    ],
    understand: [
      { name: 'Advanced Technology', desc: 'Repairing and crafting machines' },
      { name: 'Botany',              desc: 'Plants' },
      { name: 'CHOAM Bureaucracy',   desc: 'CHOAM law and operations' },
      { name: 'Cultural Studies',    desc: 'Cultures beyond the Imperium' },
      { name: 'Danger Sense',        desc: 'Feeling when something is wrong' },
      { name: 'Data Analysis',       desc: 'Collating and cross-referencing' },
      { name: 'Deductive Reasoning', desc: 'Sound conclusions from evidence' },
      { name: 'Ecology',             desc: 'Planetary living systems' },
      { name: 'Emergency Medicine',  desc: 'First aid and lifesaving' },
      { name: 'Etiquette',           desc: 'The rules of good society' },
      { name: 'Faction Lore*',       desc: 'A chosen faction’s ways' },
      { name: 'Genetics',            desc: 'Genetic data' },
      { name: 'Geology',             desc: 'Rock and land' },
      { name: 'House Politics',      desc: 'Histories and rivalries of Houses' },
      { name: 'Imperial Politics',   desc: 'The Imperial court and state' },
      { name: 'Infectious Diseases', desc: 'Disease' },
      { name: 'Kanly',               desc: 'The accepted forms of vendetta' },
      { name: 'Philosophy',          desc: 'Debating thought itself' },
      { name: 'Physical Empathy',    desc: 'Reading bodies, not words' },
      { name: 'Physics',             desc: 'The physical universe' },
      { name: 'Poison',              desc: 'Study, effects, and use of poisons' },
      { name: 'Psychiatry',          desc: 'The human mind' },
      { name: 'Religion',            desc: 'Faiths and their study' },
      { name: 'Smuggling',           desc: 'Evading customs authorities' },
      { name: 'Surgery',             desc: 'Surgical technique' },
      { name: 'Traps',               desc: 'Building and beating traps' },
      { name: 'Virology',            desc: 'Viruses and immunology' },
    ],
  },

  // ---------- T04 · Difficulty ladder ----------
  difficulty: [
    { value: 0, name: 'Simple',      example: 'Nudge a stuck door; recall common knowledge.' },
    { value: 1, name: 'Average',     example: 'Pick a simple lock; deceive a trusting subject.' },
    { value: 2, name: 'Challenging', example: 'Tail a subject in the dark; pick a complex lock.' },
    { value: 3, name: 'Daunting',    example: 'Pick a complex lock in a hurry; ask a difficult favor.' },
    { value: 4, name: 'Dire',        example: 'Uncover knowledge that was actively hidden.' },
    { value: 5, name: 'Epic',        example: 'A complex lock, hurried, without tools, mid-battle.' },
  ],

  // ---------- T09 · Dice pool & buying ----------
  dicePool: {
    base: 2, max: 5,
    buyMax: 3, buyCosts: [1, 2, 3],   // 1st/2nd/3rd extra die; pay Momentum or generate equal Threat
  },

  // ---------- T05 · Momentum ----------
  momentumRules: { cap: 6, sceneDecay: 1 },
  momentumSpends: [
    { name: 'Buy extra d20',        cost: '1/2/3',      desc: 'First/second/third bonus die, before rolling (max 3).' },
    { name: 'Create or change trait', cost: '2',        desc: 'Create, alter, or remove a trait in play.' },
    { name: 'Create scene asset',   cost: '2 (+2)',     desc: 'Temporary Quality 0 asset; +2 more makes it permanent.' },
    { name: 'Obtain information',   cost: '1/question', desc: 'Ask the GM a question about the situation.' },
    { name: 'Keep the Initiative',  cost: '2',          desc: 'An ally acts next at +1 Difficulty; never twice in a row.' },
    { name: 'Extra move',           cost: '2',          desc: 'Move an extra zone, or move a second asset this turn.' },
    { name: 'Sharpen asset',        cost: '2',          desc: 'Asset Quality +1 for a single attack.' },
    { name: 'Inflict lasting defeat', cost: '2',        desc: 'After a defeat: make the consequence permanent.' },
    { name: 'Resist defeat',        cost: '1 + Quality',desc: 'Once per scene: stay in the scene, suffer a complication.' },
  ],

  // ---------- T06 · Threat (GM mirror) ----------
  threatSpends: [
    { name: 'NPC extra d20',          cost: '1/2/3', desc: 'Bonus dice for an NPC test.' },
    { name: 'Raise Difficulty',       cost: '2/+1',  desc: '+1 Difficulty to a PC test; declared before dice are bought or rolled.' },
    { name: 'Buy off NPC complication', cost: '2',   desc: 'Ignore a complication an NPC rolled.' },
    { name: 'Create or change trait', cost: '2',     desc: 'Create, alter, or remove a trait.' },
    { name: 'Rival House enters',     cost: '1',     desc: 'An enemy House or its agents join the scene.' },
    { name: 'NPC Keep the Initiative', cost: '2',    desc: 'An allied NPC acts next (+1 Difficulty; not twice in a row).' },
    { name: 'NPC determination effect', cost: '3',   desc: 'An NPC gains a Determination-style benefit.' },
  ],
  threatNote: 'NPC actions that would hand a player character Threat instead spend it from the pool.',

  // ---------- T07 · Determination ----------
  determination: {
    startPerAdventure: 1,
    cap: 3,
    earn: [
      { desc: 'Begin each adventure with 1 (some talents grant more)' },
      { desc: 'Accept the GM’s offer when a drive statement conflicts with your action: comply (suffer an immediate complication) or challenge (cross out the statement, lose that drive until recovered)' },
      { desc: 'Write a new drive statement during play (+1 immediately)' },
    ],
    spends: [
      { id: 'auto1',       name: 'Automatic 1', desc: 'Before rolling: one die counts as a natural 1 (a critical success).' },
      { id: 'reroll',      name: 'Re-roll',     desc: 'After rolling: re-roll any number of dice in the pool.' },
      { id: 'declaration', name: 'Declaration', desc: 'Create, change, or remove a trait — reveal something true.' },
      { id: 'extraAction', name: 'Extra action',desc: 'In conflict: act again immediately (stacks with Keep the Initiative).' },
    ],
    gate: 'A drive statement must support the action to spend Determination on it.',
  },

  // ---------- T08 · Complications ----------
  complications: {
    effects: [
      'Create a negative trait that limits your options',
      'The action takes 50% longer',
      '+1 Difficulty on subsequent related tests',
    ],
    buyOffThreat: 2,
    removal: [
      'Add 2 Threat to remove it immediately',
      'An ally describes a fix and passes a Difficulty 2 test',
      'Specific talents suppress or remove it',
    ],
    // Example negative traits by skill. Move/Understand lists are absent from the
    // source excerpts — recorded gap; re-check during the rules-accuracy audit.
    examplesBySkill: {
      battle:      ['Bruised', 'Exhausted', 'Flanked', 'Injured', 'Stunned', 'Unarmed'],
      communicate: ['Disconnected', 'Gauche', 'Inferior', 'Outsider', 'Rude', 'Tongue-tied'],
      discipline:  ['Angry', 'Conflicted', 'Distracted', 'Frightened', 'Intoxicated', 'Unfocused'],
      move:        [],
      understand:  [],
    },
  },

  // ---------- Core procedures (recorded in §3; engine constants live here) ----------
  crit: { naturalOne: 2, focusWidensToSkill: true },   // nat 1 = 2 successes; focus: ≤ Skill crits
  traitRule: 'Because of [trait], this is easier / harder / possible / impossible — the GM adjusts Difficulty or gates the attempt. No flat numeric modifiers.',
  assists: {
    dicePerAssistant: 1, assistantsMayBuyDice: false, focusesApply: true,
    leaderMustScore: 1,  // assistant successes count only if the leader scores ≥1
  },
  opposedTest: {
    defenderRollsFirst: true,
    defenderSuccessesSetDifficulty: true,
    defensiveAssetDifficultyBonus: 1,   // per defensive asset in the defender's zone
    tieGoesToActive: true,
    failedAttackShortfallToDefender: 'momentum',
  },
  extendedTask: {
    basePoints: 2,                 // per passed test
    assetQualityAdds: true,        // Quality ≥1 adds its rating
    momentumAddsPoints: true,
    complicationsReducePoints: true,
    multipleContributors: true,
  },

  // ---------- T22 · Conflict types ----------
  conflictTypes: [
    {
      id: 'duel', name: 'Dueling', scale: 'One-on-one personal combat',
      attackSkill: 'battle', defendSkills: ['battle'],
      assetKinds: ['Melee weapons', 'Subtle weapons (needles, concealed blades)', 'Shields & armor', 'Positioning (intangible)'],
      lastingDefeat: 'Death or maiming',
      note: 'Ranged weapons largely useless against personal shields.',
    },
    {
      id: 'skirmish', name: 'Skirmish', scale: 'Small groups over terrain',
      attackSkill: 'battle', defendSkills: ['battle'],
      assetKinds: ['Weapons (blades, maula pistols)', 'Shields & defenses', 'Cover, aim, positioning (intangible)'],
      lastingDefeat: 'Death or serious injury',
    },
    {
      id: 'warfare', name: 'Warfare', scale: 'Armies, vehicles, and strategy',
      attackSkill: 'battle', defendSkills: ['battle'],
      assetKinds: ['Troops & specialist forces', 'Vehicles & artillery', 'Fortifications', 'Ambushes & ploys (intangible)'],
      lastingDefeat: 'Forces broken or destroyed',
    },
    {
      id: 'espionage', name: 'Espionage', scale: 'Covert struggle over secrets',
      attackSkill: 'move', defendSkills: ['discipline', 'understand'],
      assetKinds: ['Spies & informants', 'Surveillance devices', 'Security (guards, locks, no-rooms)', 'Rumors & leaks (intangible)'],
      lastingDefeat: 'Networks exposed, agents eliminated',
    },
    {
      id: 'intrigue', name: 'Intrigue', scale: 'Status, words, and leverage',
      attackSkill: 'communicate', defendSkills: ['discipline', 'communicate'],
      assetKinds: ['Knowledge & rumors', 'Wealth (money, land, contracts)', 'Blackmail & leverage (intangible)', 'Hard evidence & bribes (tangible)'],
      lastingDefeat: 'Social ruin and disgrace',
    },
  ],
  conflictDriveNote: 'No drive is prescribed per conflict type — the drive must fit the character’s motivation (Power is often useful in conflict).',

  // ---------- T23 · Defeat & recovery formulas ----------
  defeat: {
    minorNpcsDefeatedInstantly: true,
    trackRequirement: 'defender skill + defensive asset Quality',
    pointsPerHit: '2 + attacking asset Quality',
    resistDefeat: { oncePerScene: true, cost: '1 Momentum/Threat + attacker asset Quality', consequence: 'Suffer a complication' },
    lastingDefeatMomentumCost: 2,
    recovery: {
      normal:  { kind: 'extendedTask', requirement: '4 + defeating asset Quality', outcome: 'Rejoin the scene' },
      lasting: { kind: 'test', difficulty: 2, outcome: 'Stabilized — permanent effect prevented; out for the scene' },
    },
  },

  // ---------- Conflict turn economy ----------
  initiative: {
    gmSeizeFirstActionThreat: 2,
    keepInitiativeCost: 2, keepInitiativePenalty: 1, notTwiceInARow: true,
    lastActorPicksNextRoundOpener: true,
  },
  movement: {
    zonesPerAction: 1, subtleMoveDifficulty: 2, boldMoveDifficulty: 2,
    extraZoneMomentum: 2,
    armorNote: 'Armor raises the attacker’s Difficulty but also raises the wearer’s complication range on movement by its rating.',
  },

  // ---------- Asset basics ----------
  assetRules: {
    permanentCap: 5,
    createdInPlayQuality: 0, // checkpoint ruling #3
    // Cap bonuses come from talents with auto.type === 'assetCapBonus'
    // (Specialist +2 per purchase, category-restricted; Improved Resources +1 per purchase).
    categories: ['personal', 'warfare', 'espionage', 'intrigue'],
    // Fields per asset: name · category · tangible (true|false|'either') · quality (baseline
    // number; qualityNote holds printed variability) · defensive?/fast? mechanical flags · rider (paraphrased).
  },

  // ---------- T14 · Asset catalog (real count 85; index estimate was ~40) ----------
  assets: [
    // — Personal: melee weapons —
    { name: 'Blade', category: 'personal', tangible: true, quality: 0,
      rider: 'Daggers/swords/rapiers; a controlled hand-to-hand thrust can slip past a personal shield.' },
    { name: 'Bodkin', category: 'personal', tangible: true, quality: 0,
      rider: 'Concealable stabbing blade; hides in a wrist sheath.' },
    { name: 'Crysknife', category: 'personal', tangible: true, quality: 1, qualityNote: 'minimum; higher if poisoned',
      rider: 'Effective against shielded foes and a sacred Fremen status symbol. Unfixed blades disintegrate away from a body’s electrical field; tradition forbids sheathing it unblooded.' },
    { name: 'Unarmed Attack', category: 'personal', tangible: true, quality: 0,
      rider: 'Granted automatically to a character caught with no weapon.' },
    // — Personal: defenses —
    { name: 'Shield (Full or Half)', category: 'personal', tangible: true, quality: 0, defensive: true,
      rider: 'Blocks fast ranged attacks (wearer also cannot fire ranged); a lasgun strike triggers an atomic blast. A full shield cannot move; a half-shield can move between zones.' },
    { name: 'Jubba Cloak', category: 'personal', tangible: true, quality: 0,
      rider: 'Desert survival cloak that reads as an ordinary garment until used.' },
    { name: 'Stillsuit', category: 'personal', tangible: true, quality: 0, qualityNote: 'better suits lose less water',
      rider: 'Limits water loss to ~2.7 ml/day, enabling deep-desert survival.' },
    // — Personal: communication & information —
    { name: 'Communinet', category: 'personal', tangible: true, quality: 0,
      rider: 'Universal comms infrastructure; hackable and weaponizable against rival Houses.' },
    { name: 'Emergency Transmitter', category: 'personal', tangible: true, quality: 0,
      rider: 'Calls reinforcements — a good justification for creating extra troop assets.' },
    { name: 'Filmbook', category: 'personal', tangible: true, quality: 0,
      rider: 'Shigawire imprint that trains students via mnemonic pulses.' },
    { name: 'Memocorder', category: 'personal', tangible: true, quality: 0,
      rider: 'Records nerve-receptor messages; crackable only by very advanced tech.' },
    { name: 'Ridulian Crystal', category: 'personal', tangible: true, quality: 0, qualityNote: 'value = usefulness of stored data',
      rider: 'Holds vast data in a sliver molecules thick.' },
    // — Personal: tools & equipment —
    { name: 'Baradye Pistol', category: 'personal', tangible: true, quality: 0,
      rider: 'Covert signalling weapon; a static charge brightly stains a 20 m area for hours.' },
    { name: 'Cibus Hood', category: 'personal', tangible: true, quality: 0,
      rider: 'Conceals features and emits zero energy readings; blend seamlessly into crowds.' },
    { name: 'Dew Collector', category: 'personal', tangible: true, quality: 0,
      rider: 'Egg-shaped tool that gathers morning dew to sustain life on Arrakis.' },
    { name: 'Fremkit', category: 'personal', tangible: true, quality: 0,
      rider: '~1 month of desert survival supplies, incl. patches that repair stillsuit tears for a day.' },
    { name: 'Glowglobe', category: 'personal', tangible: true, quality: 0,
      rider: 'Hovering light; also usable as a distraction or a concealed explosive delivery.' },
    { name: 'Krimskel Fiber Rope', category: 'personal', tangible: true, quality: 0,
      rider: 'Self-tightening rope; binds prisoners or secures doors.' },
    { name: 'Palm Lock', category: 'personal', tangible: true, quality: 0, qualityNote: 'higher Quality is harder to pick',
      rider: 'Keyed to a specific palm or to Bene Gesserit genetics.' },
    { name: 'Paracompass', category: 'personal', tangible: true, quality: 0,
      rider: 'Navigates by reading magnetic anomalies.' },
    { name: 'Poison Snooper', category: 'personal', tangible: true, quality: 0, qualityNote: 'varies',
      rider: 'Automatically detects any poison asset in play of equal or lower Quality.' },
    { name: 'Ixian Probe', category: 'personal', tangible: true, quality: 0,
      rider: 'Scans and replicates brain signals to access a simulacrum of a living or recently dead person.' },
    { name: 'Sapho', category: 'personal', tangible: true, quality: 0,
      rider: 'Mentat stimulant; amplifies cognition, highly addictive, stains the lips red.' },
    { name: 'Personal Suspensor', category: 'personal', tangible: true, quality: 0,
      rider: 'Anti-grav aid for transport or carrying heavy ordnance.' },
    { name: 'Thumper', category: 'personal', tangible: true, quality: 0,
      rider: 'Summons or distracts sandworms; delayed variants grow more likely to fail over time.' },

    // — Warfare: fortifications —
    { name: 'Strategic / House Shield', category: 'warfare', tangible: true, quality: 0, defensive: true,
      rider: 'Battle-turning shield; used on Arrakis outside the Imperial Basin it attracts and enrages sandworms.' },
    { name: 'Fortress', category: 'warfare', tangible: true, quality: 0, defensive: true,
      rider: 'With strategic shields, impedes and kills attackers while giving heavy cover.' },
    { name: 'Bunker / Pillbox', category: 'warfare', tangible: true, quality: 0, defensive: true,
      rider: 'Heavy cover; bonuses to units and characters defending the location.' },
    // — Warfare: soldiers (printed Quality ladder) —
    { name: 'Conscript', category: 'warfare', tangible: true, quality: 0, qualityNote: 'larger units may be higher',
      rider: 'Expendable, poorly trained troops that distract, hinder, or tie up enemy forces.' },
    { name: 'Shield Infantry', category: 'warfare', tangible: true, quality: 1, qualityNote: 'larger units may be higher',
      rider: 'Standard shielded melee line infantry fighting in mass formation.' },
    { name: 'Specialist Troops', category: 'warfare', tangible: true, quality: 2,
      rider: 'Support troops — engineers, sappers, medics, drivers, pilots. (Printed name "Specialist".)' },
    { name: 'Elite Troop', category: 'warfare', tangible: true, quality: 3, qualityNote: '3–4',
      rider: 'House guards with the best equipment, elite morale, and supreme training.' },
    { name: 'Fedaykin', category: 'warfare', tangible: true, quality: 4,
      rider: 'Fremen death commandos; unmatched desert guerrilla fighters.' },
    { name: 'Sardaukar', category: 'warfare', tangible: true, quality: 4,
      rider: 'The Emperor’s elite army; brutal training and a feared reputation.' },
    // — Warfare: transports & vehicles —
    { name: 'Personnel Carrier', category: 'warfare', tangible: true, quality: 0, qualityNote: 'scales with troop capacity',
      rider: 'Shielded troop transport (tracked, wheeled, or anti-grav).' },
    { name: 'Anti-Grav Platform', category: 'warfare', tangible: true, quality: 0,
      rider: 'Crosses impassable terrain and fortress walls; ferries troops.' },
    { name: 'Ornithopter', category: 'warfare', tangible: true, quality: 0, fast: true,
      rider: 'Fast asset — moves one extra zone per movement. Scout/Transport/Attack variants.' },
    { name: 'Carryall', category: 'warfare', tangible: true, quality: 0,
      rider: 'Suborbital workhorse hauling spice harvesters or heavy personnel.' },
    { name: 'Spice Harvester', category: 'warfare', tangible: true, quality: 0,
      rider: 'Mobile spice factory; a prime target of the Arrakis shadow wars.' },
    { name: 'Orbital Transport', category: 'warfare', tangible: true, quality: 0,
      rider: 'Shuttles goods and people to and from Guild Heighliners.' },
    // — Warfare: artillery & anti-air —
    { name: 'Artillery', category: 'warfare', tangible: true, quality: 0,
      rider: 'Crew-served cannons firing explosive, armour-piercing, or toxin shells at unshielded targets.' },
    { name: 'Rocket / Missile Launcher', category: 'warfare', tangible: true, quality: 0,
      rider: 'Anti-armour/anti-air fire vs unshielded targets; guided and unguided variants.' },

    // — Espionage: weapons —
    { name: 'Dartgun', category: 'espionage', tangible: true, quality: 0,
      rider: 'Tiny, quiet weapon dispensing a range of drugs and poisons.' },
    { name: 'Hunter-Seeker', category: 'espionage', tangible: true, quality: 0,
      rider: 'Remote suspensor assassination device; needs a nearby operator.' },
    { name: 'Poisoned Tooth', category: 'espionage', tangible: true, quality: 0,
      rider: 'Beats poison snoopers; biting down releases a lethal gas cloud around the bearer and anyone near.' },
    { name: 'Shigawire', category: 'espionage', tangible: true, quality: 0,
      rider: 'Ultra-strong thin wire; comms material or a subtle garrote.' },
    { name: 'Slip-Tip', category: 'espionage', tangible: true, quality: 0,
      rider: 'Short poisoned off-hand blade; a mere scratch disables an opponent.' },
    // — Espionage: drugs & poisons —
    { name: 'Chaumas & Chaumurky', category: 'espionage', tangible: true, quality: 0,
      rider: 'Poison administered through solid food (chaumas) or drink (chaumurky).' },
    { name: 'Elacca', category: 'espionage', tangible: true, quality: 0,
      rider: 'Narcotic that suppresses survival instinct and induces rage; tints the skin.' },
    { name: 'Residual Poison', category: 'espionage', tangible: 'either', quality: 0,
      rider: 'Blackmail failsafe (intangible once inside a victim); death follows without regular antidotes.' },
    { name: 'Semuta', category: 'espionage', tangible: true, quality: 0,
      rider: 'Addictive narcotic; euphoric only when paired with atonal semuta music.' },
    { name: 'Verite', category: 'espionage', tangible: true, quality: 0,
      rider: 'Ingested truth narcotic used for interrogation.' },
    // — Espionage: communication & covert tools —
    { name: 'Bene Gesserit Coded Dots', category: 'espionage', tangible: 'either', quality: 0,
      rider: 'Tactile hidden messages read only by trained fingertips.' },
    { name: 'Distrans', category: 'espionage', tangible: 'either', quality: 0,
      rider: 'Neural steganographic message concealed inside an animal.' },
    { name: 'Intercepted Communications', category: 'espionage', tangible: false, quality: 0,
      rider: 'Secret intelligence offering insight into the workings of the Imperium.' },
    { name: 'Interrogation', category: 'espionage', tangible: false, quality: 0,
      rider: 'Torture or drugs used to extract secrets.' },
    { name: 'Map', category: 'espionage', tangible: 'either', quality: 0,
      rider: 'Reveals geography, House hideouts, or hidden resources.' },
    { name: 'Surveillance Device', category: 'espionage', tangible: true, quality: 0,
      rider: 'Records remotely; cannot move once placed (retrieval is the only way to get its data) and is destroyed if targeted.' },
    { name: 'Security Measures', category: 'espionage', tangible: 'either', quality: 0, qualityNote: 'equal to its rating',
      rider: '+1 Difficulty to move a spy asset subtly/boldly and +1 to gather-information tests, per measure in the zone.' },
    { name: 'Rumors, Propaganda & Lies', category: 'espionage', tangible: false, quality: 0,
      rider: 'Acts as Knowledge until enough doubt is cast, then loses any Quality.' },
    // — Espionage: contacts & agents —
    { name: 'Spy', category: 'espionage', tangible: true, quality: 0, qualityNote: 'set by owner’s Understand/Move',
      rider: 'Infiltrates zones; if targeted, exposed and forced into hiding rather than eliminated.' },
    { name: 'Informant', category: 'espionage', tangible: true, quality: 0, qualityNote: 'usually lower than a Spy',
      rider: 'Well-placed but less capable; captured and executed if exposed.' },
    { name: 'Assassin', category: 'espionage', tangible: true, quality: 0,
      rider: 'Kills to the Assassins’ Handbook with minimal collateral damage.' },
    { name: 'Corporate Spy', category: 'espionage', tangible: true, quality: 0,
      rider: 'Embedded in CHOAM or rival Houses to steal schematics, tech, or financial data.' },
    { name: 'Face Dancer', category: 'espionage', tangible: true, quality: 0,
      rider: 'Tleilaxu shapeshifter; perfectly mimics a target’s appearance and sex.' },
    { name: 'Political Spy', category: 'espionage', tangible: true, quality: 0,
      rider: 'Gathers War-of-Assassins intel, blackmail material, or Landsraad proposals.' },

    // — Intrigue: favors —
    { name: 'Debtor', category: 'intrigue', tangible: false, quality: 0,
      rider: 'One-time favor for a vital resource; calling it permanently burns the relationship.' },
    { name: 'Old Friendship', category: 'intrigue', tangible: false, quality: 0,
      rider: 'Loyal connection for information, spy work, or safehouses, leaving no paper trail.' },
    { name: 'Service', category: 'intrigue', tangible: false, quality: 0,
      rider: 'Quid pro quo with a large organisation; converts into as much of another needed asset as required.' },
    // — Intrigue: valuables —
    { name: 'Land Rights', category: 'intrigue', tangible: 'either', quality: 0,
      rider: 'Generates raw materials and pressures lessees into further deals.' },
    { name: 'Manufactured Goods', category: 'intrigue', tangible: true, quality: 0,
      rider: 'Processed valuables (weapons, shields, refined spice) that open normally closed doors.' },
    { name: 'Raw Materials', category: 'intrigue', tangible: true, quality: 0,
      rider: 'Base trade goods exchanged in vast quantities to secure influence.' },
    { name: 'Supply Contract', category: 'intrigue', tangible: false, quality: 0,
      rider: 'Long-term deal that makes hostile action against you exceedingly costly.' },
    { name: 'Valuable Item', category: 'intrigue', tangible: true, quality: 0,
      rider: 'Portable art/relic; strong leverage in trade negotiations.' },
    // — Intrigue: blackmail —
    { name: 'Hostage', category: 'intrigue', tangible: true, quality: 0,
      rider: 'Captured loved one as extreme leverage; high risk, needs resources to hold.' },
    { name: 'Illicit Recording', category: 'intrigue', tangible: 'either', quality: 0,
      rider: 'Damaging or embarrassing audio/visual evidence.' },
    { name: 'Stolen File', category: 'intrigue', tangible: 'either', quality: 0,
      rider: 'Internal files proving wrongdoing; a strong inducement for good behaviour.' },
    // — Intrigue: contacts —
    { name: 'Black Market Trader', category: 'intrigue', tangible: true, quality: 0,
      rider: 'Sources obscure, illegal goods instantly with no questions asked.' },
    { name: 'Courtesan', category: 'intrigue', tangible: true, quality: 0,
      rider: 'Cunning; holds access to the bedchambers of the wealthy and influential.' },
    { name: 'Ex-Agent', category: 'intrigue', tangible: true, quality: 0,
      rider: 'Untrustworthy but knowledgeable; provides safehouses and predicts opponents’ moves.' },
    { name: 'Favorite of the Emperor', category: 'intrigue', tangible: true, quality: 0,
      rider: 'Opens highly exclusive doors but risks drawing you into Imperial purges.' },
    { name: 'House Retainer', category: 'intrigue', tangible: true, quality: 0,
      rider: 'A wholly loyal, familiar extension of the House.' },
    { name: 'Indebted Landowner', category: 'intrigue', tangible: true, quality: 0,
      rider: 'A noble subsisting on debt to maintain an illusion of prosperity.' },
    { name: 'Veteran Courtier', category: 'intrigue', tangible: true, quality: 0,
      rider: 'A wily survivor who knows everyone and everything at court.' },
    // — Other —
    { name: 'Mask of Power (Fake Asset)', category: 'intrigue', tangible: false, quality: 0,
      rider: 'Created free via the Mask of Power talent (fake blackmail/favor); if you are defeated in the conflict the bluff is exposed for an extra complication.' },
  ],
  assetNote: 'Created-in-play assets default to Quality 0 (ruling #3); printed Qualities above win where given. Most catalog assets are Quality 0 — the troop ladder (Conscript 0 · Shield Infantry 1 · Specialist 2 · Elite 3–4 · Fedaykin/Sardaukar 4) and Crysknife (1+) are the notable exceptions.',

  // ---------- T15 · Wealth price ladder ----------
  wealth: {
    purchaseRule: 'Buy freely if House Wealth ≥ the item’s tier. An item exactly 1 tier above Wealth can still be bought but costs the House ½ point of Wealth. Cannot buy items 2+ tiers above current Wealth, nor luxury assets while Wealth is negative.',
    halfPointCost: 0.5,
    ladder: [
      { tier: 0, examples: 'Ubiquitous goods of noble quality — knives, fine clothes.' },
      { tier: 1, examples: 'Impressive valuable goods; advanced technology such as personal shields.' },
      { tier: 2, examples: 'Specialized equipment — Fremen stillsuits, Tleilaxu eyes.' },
      { tier: 3, examples: 'A Suk doctor’s attention; a decent bribe to a high-ranking official.' },
      { tier: 4, examples: 'Large ground vehicles, personal ornithopters, unique poisons.' },
      { tier: 5, examples: 'Large ornithopters, spacecraft, large residences.' },
    ],
  },

  // ---------- T16/T17 (core scaffolding) · Houses ----------
  // The Core Rulebook builds a House NARRATIVELY only — no numeric economy. House types and
  // domain names live here; the skill arrays, domain income table, and Income phase are
  // Great Game crunch (GG.houseManagement, greatGame toggle). Corroborated 2026-07-06.
  houseTypes: [
    { id: 'nascent', name: 'Nascent House' },
    { id: 'minor',   name: 'House Minor' },
    { id: 'major',   name: 'House Major' },
    { id: 'great',   name: 'Great House' },
  ],
  houseDomains: [
    { id: 'artistic',   name: 'Artistic' },
    { id: 'espionage',  name: 'Espionage' },
    { id: 'farming',    name: 'Farming' },
    { id: 'industrial', name: 'Industrial' },
    { id: 'kanly',      name: 'Kanly' },
    { id: 'military',   name: 'Military' },
    { id: 'political',  name: 'Political' },
    { id: 'religion',   name: 'Religion' },
    { id: 'science',    name: 'Science' },
  ],
  houseScopeNote: 'Core creates a House with narrative tools only: type, domains, roles, enemies, and traits — no Wealth/Resources numbers. The Core book states resource-management systems arrive "in later supplements." The numeric House economy (skill arrays, domain Wealth/Resources income table, Income phase) is in The Great Game — see EXPANSION.houseManagement in data-great-game.js, gated by the greatGame toggle. House skills referenced by the Architect/Agent duality (§3.12) take their starting values from that table when the toggle is on; otherwise the GM assigns them narratively.',

  // ---------- T18 · Homeworld options (core narrative — guiding questions, not strict tables) ----------
  homeworld: {
    note: 'The Core Rulebook frames these as questions to shape the House’s holdings, not roll tables.',
    options: {
      weather:      ['Hot', 'A little cold', 'Always rainy'],
      habitation:   ['Mainly cities', 'Mainly towns', 'Isolated farms'],
      crimeRate:    ['Peaceful', 'Violent'],
      crimeStance:  ['Soft on crime', 'Hard on crime'],
      contentment:  ['The people respect their rulers', 'The people labour in fear of them'],
      publicWealth: ['The House keeps its wealth for itself', 'Holdings full of public works and support systems'],
    },
  },

  // ---------- T19 · House roles (13) ----------
  houseRoles: [
    { id: 'ruler',          name: 'Ruler',          duty: 'Leads the House and bears its name; makes the biggest decisions and appoints the other roles.' },
    { id: 'consort',        name: 'Consort',        duty: 'Companion who always has the Ruler’s ear and great influence behind the throne.' },
    { id: 'heir',           name: 'Heir',           duty: 'Designated successor (usually the eldest child); learns to rule and stays safe.' },
    { id: 'advisor',        name: 'Advisor',        duty: 'Expert in one field (politics, finance, history…) who supplies answers when the Ruler has a problem.' },
    { id: 'chiefPhysician', name: 'Chief Physician', duty: 'Heads all medical staff; guards the ruling family’s health against poison and bioweapons.' },
    { id: 'councilor',      name: 'Councilor',      duty: 'Connects Ruler and people; sorts citizen requests and relays the Ruler’s decisions.' },
    { id: 'envoy',          name: 'Envoy',          duty: 'Diplomat for foreign policy — rivals, CHOAM, the Landsraad, third parties.' },
    { id: 'marshal',        name: 'Marshal',        duty: 'Chief law enforcer; keeps the House’s laws upheld and territories orderly.' },
    { id: 'scholar',        name: 'Scholar',        duty: 'Representative of higher learning; researches, gathers information, advises on science and academia.' },
    { id: 'spymaster',      name: 'Spymaster',      duty: 'Intelligence chief; runs the network of spies, assassins, and informants.' },
    { id: 'swordmaster',    name: 'Swordmaster',    duty: 'Martial expert — military advisor, tactician, and bodyguard to the noble family.' },
    { id: 'treasurer',      name: 'Treasurer',      duty: 'Chief financial officer; monitors funds, tax collection, and finances.' },
    { id: 'warmaster',      name: 'Warmaster',      duty: 'Highest military officer; raises, maintains, and leads House troops in battle.' },
  ],

  // ---------- T20 · House enemy generator (rollable d20; also wired by T32) ----------
  houseEnemies: {
    rollDie: 'd20',
    hatred: [
      { range: '1–5',   name: 'Dislike',  effect: 'Distrustful; any interaction with this House is at +1 Difficulty.' },
      { range: '6–10',  name: 'Rival',    effect: 'Works to bring your House down via court whispers and lies, but avoids open conflict.' },
      { range: '11–15', name: 'Loathing', effect: 'Always has a plan to destroy your House, but risks its own resources only for serious damage.' },
      { range: '16–20', name: 'Kanly',    effect: 'Commits all resources to wiping your House out to the last person, at any risk.' },
    ],
    reasons: [
      { range: '1–2',   name: 'Competition', desc: 'Rivalry over a resource, market, holding, or planet.' },
      { range: '3–4',   name: 'Slight',      desc: 'An action at court cost them reputation; an apology isn’t enough.' },
      { range: '5–6',   name: 'Debt',        desc: 'One House reneged on a deal, by choice or circumstance.' },
      { range: '7–8',   name: 'Ancient Feud', desc: 'An ancestral rift thousands of years old; the cause may be forgotten.' },
      { range: '9–10',  name: 'Morality',    desc: 'Clashing views on morals, loyalty, or religion.' },
      { range: '11–12', name: 'Servitude',   desc: 'A former master/vassal bond gone sour.' },
      { range: '13–14', name: 'Family Ties', desc: 'A tradition of intermarriage one House refused to continue.' },
      { range: '15–16', name: 'Theft',       desc: 'Dispute over an item, artifact, or title one House claims as its own.' },
      { range: '17–18', name: 'Jealousy',    desc: 'One House covets the other, believing it unworthy of its benefits.' },
      { range: '19–20', name: 'No Reason',   desc: 'No one knows why the Houses are rivals — they just are.' },
    ],
    // Starting enemies are tied to House type/size (a House attracts more foes as it rises).
    // Each enemy gets a name + type, then a d20 Hatred and a d20 Reason. `types` is the
    // recommended rival make-up; `count` is its length. The Great option is open-ended.
    perType: {
      nascent: { count: 0, types: [],                     makeup: 'No starting enemy Houses.' },
      minor:   { count: 1, types: ['minor'],              makeup: 'One House Minor.' },
      major:   { count: 2, types: ['major', 'minor'],     makeup: 'One House Major and one House Minor that serves them.' },
      // Great: a principal enemy (one Great, OR two Majors, OR a major faction) + a host of Minors.
      // Book is open-ended ("a host"); the enforced floor reads it as principal + 2 Minors = 3.
      great:   { count: 3, types: ['great', 'minor', 'minor'], makeup: 'One Great House (or two House Majors, or a major faction such as the Bene Gesserit or Imperial Court), plus a host of allied House Minors.' },
    },
  },

  // ---------- T21 · House trait examples ----------
  houseTraits: {
    domainTraitNote: 'A House begins with one trait matching its primary domain — use the domain names in houseDomains (Artistic, Espionage, Farming, Industrial, Kanly, Military, Political, Religion, Science).',
    reputationExamples: ['Honorable', 'Brutal', 'Secretive'],
    reputationNote: 'Reputation trait examples are open-ended; the book prints these as examples. In play, spend 1 Momentum to apply a House trait to a character for a scene.',
  },

  // ---------- T24 · Advancement ----------
  advancement: {
    earn: [
      { desc: 'Ambition progress — minor', points: 1 },
      { desc: 'Ambition progress — major', points: 3 },
      { desc: 'Defeated in a conflict', points: 1 },
      { desc: 'Fail a Difficulty 3+ test', points: 1 },
      { desc: 'GM spends 4+ Threat at once', points: 1 },
      { desc: 'Group award (max once per session)', points: 1 },
    ],
    costs: {
      skill:          { name: 'Skill +1 (cap 8)',        cost: '10 + 1 per previous skill advance' },
      focus:          { name: 'New focus (skill ≥ 6)',   cost: 'Number of focuses owned' },
      talent:         { name: 'New talent',              cost: '3 × talents owned' },
      assetPermanent: { name: 'Make asset permanent',    cost: '3' },
      assetQuality:   { name: 'Asset Quality +1',        cost: '3 × current Quality' },
    },
    maxPerAdventure: 1,
    drivesNeverAdvanceByPoints: true,
    retraining: 'Halve one advance’s cost (round up) by permanently dropping a skill point (min 4), a focus, or a talent.',
  },

  // ---------- T25 · Sandworm riding (extended task requirements) ----------
  sandwormRiding: [
    { size: 'Juvenile',    requirement: 4 },
    { size: 'Adult',       requirement: 8 },
    { size: 'Large Adult', requirement: 12 },
    { size: 'Shai-Hulud',  requirement: 16 },
  ],
  sandwormNote: 'Sandworms are a force of nature — no stat block; flee or be devoured.',

  // ---------- T26 · Desert hazards (environmental traits) ----------
  desertHazards: [
    { name: 'Thirst',            effect: 'Desert trek without extra water: gain the Thirsty trait; no water + damaged stillsuit: Weakened.' },
    { name: 'Desert exertion',   effect: 'Carrying a person through desert: Move (D2) or gain Fatigued.' },
    { name: 'Coriolis storm',    effect: 'Aircraft forced down. Crash-landing: Move (D3) — success lands hard (Rattled); failure tumbles the craft: all aboard Move (D2) or Bruised/Battered.' },
    { name: 'Sandworm sign',     effect: 'Rhythmic vibration draws worms; active shields enrage them. Flee a crash site: Move (D2) or Exhausted — or be consumed if trapped.' },
  ],
  desertHazardsNote: 'Further named hazards (drum sand, salt pans…) belong to the Sand and Dust sourcebook (toggle).',

  // ---------- T12 · Creation constants ----------
  creation: {
    skillArray: { primary: 6, secondary: 5, rest: 4, freePoints: 5, cap: 8 },
    driveArray: [8, 7, 6, 5, 4],
    driveStatements: { count: 3, onDrivesRated: [8, 7, 6] },
    // Focuses: the archetype supplies 2 (one on the primary skill, one on the secondary);
    // you may swap them, but you MUST still have at least one focus on your primary skill AND
    // at least one on your secondary skill. The remaining 2 are free (any skill). (Core, Ch. 3.)
    focuses: { count: 4, minOnPrimarySkill: 1, minOnSecondarySkill: 1 },
    talents: { count: 3, minArchetypeRelated: 1 },
    assets: { count: 3, minTangible: 1 },
    finishing: { traits: 1, ambitionTiedToHighestDrive: true },
    maxFactionTemplates: 1,
  },

  // ---------- T39 · Creation guidance (book helper text; paraphrased/quoted prompts) ----------
  creationGuidance: {
    // Example drive statements printed in the book, per drive.
    driveStatementExamples: {
      duty: [
        'People are the true strength of a Great House.',
        'I serve at the pleasure of the House.',
        'Humans live best when each has their place.',
        'Acceptance of place is the death of freedom.',
        'Those above offer duty to those below.',
        'I know my responsibilities.',
        'Duty is a sharp blade.',
        'What must be done, must be done.',
      ],
      faith: [
        'My faith gives me certainty where others might doubt.',
        'Faith is merely obedience to the myths of the past.',
        'God will deliver me to whatever fate is mine.',
        'Machines are things of corruption.',
        'I trust my heart, not my head.',
        'Our trials are how God tests us.',
        'Those who doubt my faith will be proved wrong.',
        'God has forgotten us, for we are not worthy.',
      ],
      justice: [
        'I must shield those in my care.',
        'I will get revenge on those who have wronged me.',
        'I have no patience for those who complain that life is unfair.',
        'What we do will return to us.',
        "Life isn't fair.",
        'Justice is what you can get away with.',
        'Justice is only for the wealthy.',
        'Everyone should be treated equally.',
      ],
      power: [
        'Power must be used wisely and cleverly.',
        'The power to destroy a thing is absolute control over it.',
        'All power invites challenge.',
        'Those who have true power need seldom wield it.',
        'Power attracts those who are corruptible.',
        "Power comes at a knife's edge.",
        'I will have what is owed to me.',
        'Strength is nothing without grace.',
      ],
      truth: [
        'Respect for the truth comes close to being the basis for all morality.',
        'I decide what is true.',
        'I seek to uncover the many secrets of the universe.',
        'If I do not know it, it is irrelevant.',
        'The purpose of argument is to change the nature of truth.',
        'What one wishes were true is seldom so.',
        'You will know me by my deeds.',
        'Truth is the first casualty of war.',
      ],
    },
    // How to write good statements (book guidance, paraphrased).
    driveStatementTips: [
      'Keep it a short, clear sentence — you and the GM should instantly know if it helps, hinders, or does not apply.',
      'Write at least one helpful statement (to use a high drive and spend Determination) and at least one that can cause you problems (to earn Determination).',
      "Statements needn't be positive — high Truth doesn't mean honest; high Faith could mean you think religion is harmful.",
      'Contradictions between statements are good — they create roleplaying tension.',
      'Aim for range: one for how you respond physically, one mentally, one socially.',
      "Start simple — statements change in play, so don't chase the perfect wording.",
    ],
    // Ambition = a short phrase for the character's ultimate goal, set by the highest-rated
    // drive at creation. Taking steps toward it earns advancement (§3.10). Themes per drive:
    ambitionIntro: 'An ambition is the long-term goal that guides a character beyond the immediate needs of life. Taking steps toward it makes them more capable — better able to influence others and impose their will.',
    ambitionRule: 'Your Ambition is a short phrase describing your ultimate goal, defined by your highest-rated drive at creation. Work with your GM to set one that comes up in play often.',
    ambitionByDrive: {
      duty:    'Service to a cause or group · discovering or understanding your place in the universe · or freedom from the strictures and responsibilities that bind you.',
      faith:   'Zealous crusades · spiritual fulfilment · matters of prophecy or destiny — or attempts to undermine or destroy those things.',
      justice: 'A sense of fairness or balance · righting wrongs and injustices · including personal grudges and vendettas.',
      power:   'Gaining influence or status · taking it from others · manipulating those who hold it · or changing the ways people gain influence or status.',
      truth:   'Uncovering knowledge or revealing secrets · concealing knowledge or protecting secrets · spreading knowledge (including propaganda or misinformation) · or exposing the lies of others.',
    },
    ambitionExample: 'Example: Kara (highest drive Faith) believes in destiny, so her ambition is to become a master assassin while appearing to be an ordinary noblewoman.',
    // An ambition may change when the highest-rated drive changes (optional) — but MUST
    // change if the drive it was based on drops below 6 and loses its statement.
    ambitionChangeRule: 'Your ambition can change if your highest-rated drive changes — you needn’t change it (goals can outlast a shift in worldview), but if the drive it was based on ever drops below 6 and loses its statement, you must set a new ambition.',
    // Guiding questions the book offers when you're stuck.
    appearanceQuestions: [
      'Do you usually wear some sort of uniform?',
      'Do you take care of your appearance? If so, how much?',
      'Do you like to be noticed, or dress to hide away?',
      'Do you stay fashionable, or keep to your own style?',
      'Are your outfits practical or impractical?',
      'Any distinguishing marks, such as a tattoo or a scar?',
    ],
    relationshipQuestions: [
      'Do you have a family, and how often do you see them?',
      'Which other player character do you like best?',
      'Which other player character do you like the least?',
      'Do you believe in your House’s goals, or is it just a job?',
      'How much do you respect the rulers of your House?',
      'What, if anything, would make you betray those around you?',
    ],
    // "One Way to Choose Drives" sidebar (Core, Ch. 3): compare each drive against every other
    // (10 pairings for 5 drives); whichever wins most is highest (8), and so on down to 4.
    // A two-way tie is broken by the direct matchup between those drives.
    driveRanking: {
      intro: 'Not sure how to rank your drives? Compare them two at a time. For each pair, pick the drive that matters more to your character. The drive that wins most comparisons is your 8, then 7, 6, 5, and 4. If two drives tie, the pair where you compared them directly breaks the tie.',
      // Every unordered pair of the five drives, in book order.
      pairs: [
        ['duty', 'faith'], ['duty', 'justice'], ['duty', 'power'], ['duty', 'truth'],
        ['faith', 'justice'], ['faith', 'power'], ['faith', 'truth'],
        ['justice', 'power'], ['justice', 'truth'],
        ['power', 'truth'],
      ],
    },
    // Authoritative step-by-step creation notes (paraphrased from Core, Ch. 3) — surfaced in the
    // rules library and as wizard step intros so the rules travel with the tool.
    stepNotes: {
      skills: 'Your five skills (Battle, Communicate, Discipline, Move, Understand) are each rated 4–8. Your archetype sets your primary skill to 6 and your secondary to 5; the other three start at 4. Then distribute 5 more points however you like, but no skill may exceed 8 this way.',
      focuses: 'A focus is a narrow specialization tied to one skill, though it can apply to any skill where it fits. You have four focuses. Your archetype offers two — one on your primary skill and one on your secondary — which you may replace, but you must keep at least one focus on your primary skill and one on your secondary. The remaining two focuses may go on any skills.',
      talents: 'Talents are special abilities that make a character stand out. You have three. Your archetype suggests one (with thematic options); at least one of your talents must relate to your archetype. Some talents are tied to a skill or drive chosen when you take them (e.g. Bold (Battle)); the same talent may be taken again for a different skill (Bold (Communicate)). Faction talents (Mentat, Bene Gesserit, etc.) may only be taken by members of that faction.',
      drives: 'Your five drives (Duty, Faith, Justice, Power, Truth) are each rated 4–8, showing how important each is. Rank them and assign 8, 7, 6, 5, and 4 in order of importance. Then write a drive statement for each of your three highest drives (8, 7, 6) — a short belief that shapes how the character acts.',
    },
  },

  // ---------- T10 · Archetypes (20) ----------
  // The archetype grants a trait (its name, which you may reskin), sets primary/secondary
  // skills, and suggests 2 primary-skill focuses + 1 talent (suggestions, not mandatory).
  // driveSuggestions = the drives the book highlights for the type (guidance only).
  archetypes: [
    { id: 'analyst',     name: 'Analyst',     primary: 'discipline',  secondary: 'understand',
      focuses: ['Attention to Detail', 'Composure'], talents: ['Intense Study'],
      driveSuggestions: ['truth', 'duty'],
      desc: 'Studies the details and trends of business, politics, and warfare for a House; Mentats make especially prized analysts.' },
    { id: 'athlete',     name: 'Athlete',     primary: 'move',        secondary: 'discipline',
      focuses: ['Grace', 'Stamina'], talents: ['Nimble'],
      driveSuggestions: ['power', 'faith'],
      desc: 'Hones the body to great physical feats — an entertainer at sports and games, or a trainer conditioning a House’s members.' },
    { id: 'commander',   name: 'Commander',   primary: 'communicate', secondary: 'battle',
      focuses: ['Inspiration', 'Leadership'], talents: ['Specialist (Warfare Assets)'],
      driveSuggestions: ['duty', 'power'],
      desc: 'A senior military leader who decides the plan and gives the orders; a House may keep a Warmaster in this role.' },
    { id: 'courtier',    name: 'Courtier',    primary: 'communicate', secondary: 'understand',
      focuses: ['Charm', 'Musical Instrument'], talents: ['Subtle Words'],
      driveSuggestions: ['power', 'duty'],
      desc: 'An attendant, advisor, or agent with access to the House’s rulers — a skilled speaker and listener, often amid palace intrigue.' },
    { id: 'duelist',     name: 'Duelist',     primary: 'battle',      secondary: 'move',
      focuses: ['Dueling', 'Short Blades'], talents: ['The Slow Blade'],
      driveSuggestions: ['justice', 'faith'],
      desc: 'A master of the blade, prized as bodyguard, champion, gladiator, or tutor to a House’s young scions.' },
    { id: 'empath',      name: 'Empath',      primary: 'understand',  secondary: 'communicate',
      focuses: ['Body Language', 'Social Awareness'], talents: ['Passive Scrutiny'],
      driveSuggestions: ['truth', 'power'],
      desc: 'Reads the motives, truth, and falsehood of others — a rare, sought-after knack short of full Bene Gesserit truthsense.' },
    { id: 'envoy',       name: 'Envoy',       primary: 'communicate', secondary: 'move',
      focuses: ['Diplomacy', 'Persuasion'], talents: ['Binding Promise'],
      driveSuggestions: ['duty', 'justice'],
      desc: 'Carries a master’s words and will in negotiation and diplomacy; well-travelled, quick-witted, and quick on their feet.' },
    { id: 'herald',      name: 'Herald',      primary: 'discipline',  secondary: 'communicate',
      focuses: ['Command', 'Composure'], talents: ['Rigorous Control'],
      driveSuggestions: ['faith', 'duty'],
      desc: 'A ceremonial officer of heraldry, genealogy, and pedigree; advises the House and often doubles as messenger or diplomat.' },
    { id: 'infiltrator', name: 'Infiltrator', primary: 'discipline',  secondary: 'move',
      focuses: ['Infiltration', 'Precision'], talents: ['Subtle Step'],
      driveSuggestions: ['truth', 'power'],
      desc: 'Slips into secure places for the espionage that quietly shapes Imperium politics; needs boundless resolve and focus.' },
    { id: 'messenger',   name: 'Messenger',   primary: 'move',        secondary: 'communicate',
      focuses: ['Pilot', 'Unobtrusive'], talents: ['Masterful Innuendo'],
      driveSuggestions: ['power', 'faith'],
      desc: 'Moves communiqués and valuables swiftly and securely; masters secret languages and messages hidden within messages.' },
    { id: 'protector',   name: 'Protector',   primary: 'discipline',  secondary: 'battle',
      focuses: ['Resolve', 'Self-Control'], talents: ['Bolster'],
      driveSuggestions: ['duty', 'justice'],
      desc: 'An elite bodyguard of unyielding resolve who puts a charge’s safety above glory, outlasting ordinary troops.' },
    { id: 'scholar',     name: 'Scholar',     primary: 'understand',  secondary: 'discipline',
      focuses: ['Data Analysis', 'Deductive Reasoning'], talents: ['Intense Study'],
      driveSuggestions: ['truth', 'power'],
      desc: 'A seeker and curator of knowledge — collects, studies, and archives to advise; many of the best are Mentats.' },
    // Scout: the printed entry lists 1 focus + 2 "talents" (Endurance, Stealth), breaking the
    // standard 2-focus/1-talent shape. Reconciled (checkpoint ruling #5): "Putting Theory into
    // Practice" is the talent (it exists in the catalog); Endurance & Stealth are the focuses
    // (Stealth is a printed Move focus; Endurance/Stealth are not talents).
    { id: 'scout',       name: 'Scout',       primary: 'move',        secondary: 'understand',
      focuses: ['Endurance', 'Stealth'], talents: ['Putting Theory into Practice'],
      driveSuggestions: ['duty', 'truth'],
      desc: 'Ventures ahead of comrades through hostile, unknown territory to gather intelligence and return to tell it.' },
    { id: 'sergeant',    name: 'Sergeant',    primary: 'battle',      secondary: 'communicate',
      focuses: ['Long Blades', 'Strategy'], talents: ['Master-at-Arms'],
      driveSuggestions: ['duty', 'justice'],
      desc: 'A practical, hardened veteran who leads rank-and-file troops by example and earns their loyalty.' },
    { id: 'smuggler',    name: 'Smuggler',    primary: 'move',        secondary: 'battle',
      focuses: ['Pilot', 'Unobtrusive'], talents: ['Subtle Step'],
      driveSuggestions: ['power', 'justice'],
      desc: 'Moves valuable goods through illicit channels; spice smugglers brave sandworms and Fremen raiders for a hefty price.' },
    { id: 'spy',         name: 'Spy',         primary: 'understand',  secondary: 'move',
      focuses: ['Deductive Reasoning', 'Kanly'], talents: ['Hidden Motives'],
      driveSuggestions: ['truth', 'duty'],
      desc: 'Performs the espionage between Houses and factions — through personal aliases or cultivated networks of informants.' },
    { id: 'steward',     name: 'Steward',     primary: 'communicate', secondary: 'discipline',
      focuses: ['Leadership', 'Negotiation'], talents: ['Stirring Rhetoric'],
      driveSuggestions: ['duty', 'power'],
      desc: 'Runs the day-to-day operations of the House in its ruler’s name — capable, decisive, and good at organizing people.' },
    { id: 'strategist',  name: 'Strategist',  primary: 'understand',  secondary: 'battle',
      focuses: ['Kanly', 'Strategy'], talents: ['Master-at-Arms'],
      driveSuggestions: ['power', 'faith'],
      desc: 'Composes the orders of battle, supply, and deployment; expert in mass warfare and the traditions of kanly. Many are Mentats.' },
    { id: 'tactician',   name: 'Tactician',   primary: 'battle',      secondary: 'understand',
      focuses: ['Combat Awareness', 'Tactics'], talents: ['Decisive Action'],
      driveSuggestions: ['power', 'justice'],
      desc: 'Directs fighting on a smaller scale than a strategist; drills the ranks and spots opportunities lesser fighters miss.' },
    { id: 'warrior',     name: 'Warrior',     primary: 'battle',      secondary: 'discipline',
      focuses: ['Dirty Fighting', 'Long Blade'], talents: ['To Fight Someone Is to Know Them'],
      driveSuggestions: ['power', 'justice'],
      desc: 'A capable soldier of a House army or mercenary company, the best rising to elite units or a notable’s personal guard.' },
  ],
  archetypeRule: 'The archetype grants a trait (its name — reskinnable with GM approval), sets the primary (6) and secondary (5) skills, and suggests 2 primary-skill focuses + 1 talent. Suggestions are not mandatory; the drive hints only guide later choices.',

  // ---------- T11 · Faction templates (5; max one per character) ----------
  factionIntro: 'Most player characters are capable but otherwise ordinary servants of the House. A few belong to a faction beyond the noble Houses — Bene Gesserit, Mentat, Spacing Guild, Suk, or Fremen. They are loyal to the House but carry other ties that cannot be ignored, and command some of the most advanced training in the Imperium. Choosing a faction limits some options but grants powerful abilities and connections. Pick one deliberately and make it core to your concept — until you prove yourself, your loyalty to the House will be questioned, and take care not to overshadow the rest of the group.',
  factionTemplates: [
    {
      id: 'beneGesserit', name: 'Bene Gesserit Sister', trait: 'Bene Gesserit',
      mandatoryTalents: { mode: 'all', options: ['Prana-Bindu Conditioning'] },
      suggestedArchetypes: ['Analyst', 'Athlete', 'Courtier', 'Empath', 'Envoy', 'Infiltrator', 'Protector', 'Scholar', 'Spy', 'Warrior'],
      desc: 'Sisters of the Sisterhood serve the nobility as consorts, concubines, and advisors — and, as deadly fighters and keen observers, as spies and bodyguards. Their placement always carries a hidden agenda; nothing is ever free.',
    },
    {
      id: 'fremen', name: 'Fremen', trait: 'Fremen',
      mandatoryTalents: { mode: 'atLeastOne', options: ['Dedication', 'Driven', 'Master-at-Arms', 'Rapid Recovery', 'Resilience (Battle)', 'Subtle Step', 'The Reason I Fight'] },
      suggestedArchetypes: ['Athlete', 'Duelist', 'Infiltrator', 'Protector', 'Scout', 'Sergeant', 'Warrior'],
      note: 'Playable outside Arrakis campaigns only with GM permission.',
      desc: 'The desert tribes of Arrakis, exceptionally rare offworld. Slow to trust anyone beyond their tribe, but once their loyalty is given it is absolute — and they are peerless guides in the deep desert.',
    },
    {
      id: 'mentat', name: 'Mentat', trait: 'Mentat',
      // "Mind Place" as printed in the template; the talent chapter prints "Mind Palace".
      mandatoryTalents: { mode: 'atLeastOne', options: ['Foreknowledge', 'Mentat Discipline', 'Mind Palace', 'Twisted Mentat'] },
      suggestedArchetypes: ['Analyst', 'Empath', 'Envoy', 'Herald', 'Scholar', 'Spy', 'Steward', 'Strategist', 'Tactician'],
      desc: 'Human computers trained to store and process vast data. Considered essential assets, most serve as trusted advisors at the highest levels of the Landsraad.',
    },
    {
      id: 'guildAgent', name: 'Spacing Guild Agent', trait: 'Guild Agent',
      mandatoryTalents: { mode: 'all', options: ['Guildsman'] },
      suggestedArchetypes: ['Analyst', 'Courtier', 'Envoy', 'Messenger', 'Scholar', 'Scout', 'Smuggler', 'Spy', 'Strategist'],
      desc: 'The Guild’s point of contact for Houses that wish to travel or trade, often assigned to a House or to one hosting a Guild facility. Excellent financial advisors and experienced space travellers (though they cannot pilot a foldspace vessel). Navigators and Steersmen are never player characters.',
    },
    {
      id: 'sukDoctor', name: 'Suk Doctor', trait: 'Suk Doctor',
      mandatoryTalents: { mode: 'all', options: ['Imperial Conditioning'] },
      suggestedArchetypes: ['Analyst', 'Commander', 'Courtier', 'Herald', 'Scholar', 'Steward'],
      desc: 'The finest physicians in the universe — costly, but what they cannot cure cannot be cured. Their Imperial Conditioning makes them incapable of harming a patient, prizing them among the nobility.',
    },
  ],
  factionTemplateNote: '"Mind Place" is printed in the Mentat template (the talent chapter prints "Mind Palace"); "Foreknowledge" is a Mentat mandatory option with no core talent entry (known gap). All suggested archetypes now resolve to real entries (Strategist and Smuggler were missing from the initial extraction — added 2026-07-06).',

  // ---------- T13 · Talent catalog (55 — real count; index said ~53) ----------
  // pick: parameter chosen at selection ('skill' | 'drive' | 'assetCategory').
  // auto: machine-readable descriptor consumed by the roller/sheet ("tap to use").
  talents: [
    { name: 'Adrenaline Shot', faction: 'sukDoctor',
      effect: 'Action: suppress all effects of a physical complication on a character in your zone until scene end (once per character per scene).',
      auto: { type: 'suppressComplication', scope: 'scene', limit: 'oncePerCharacterPerScene' } },
    { name: 'Advisor', pick: 'skill',
      effect: 'When assisting with the chosen skill, the assisted ally may re-roll one d20.',
      auto: { type: 'assistAllyRerollOne' } },
    { name: 'Binding Promise',
      effect: 'After winning a Communicate test to seal an agreement, spend 1–3 Momentum: breaking it costs the target twice that in Threat.',
      auto: { type: 'sealPromise', momentum: [1, 3], breakCostMultiplier: 2 } },
    { name: 'Bold', pick: 'skill',
      effect: 'On chosen-skill tests where you bought dice by generating Threat, re-roll one d20.',
      auto: { type: 'rerollOne', when: 'boughtDiceWithThreat' } },
    { name: 'Bolster',
      effect: 'Once per scene when an ally fails a test: 2 Momentum (or +2 Threat) lets them re-roll, substituting your Discipline for their skill.',
      auto: { type: 'allyRerollWithYourDiscipline', cost: '2 Momentum or +2 Threat', limit: 'oncePerScene' } },
    { name: 'Calculated Prediction', faction: 'mentat',
      effect: 'Minutes of meditation + Understand test (D4): the GM states a likely future event; +1 prediction per 2 Momentum.',
      auto: { type: 'testForPredictions', skill: 'understand', difficulty: 4, extraPerMomentum: 2 } },
    { name: 'Cautious', pick: 'skill',
      effect: 'On chosen-skill tests where you bought dice by spending Momentum, re-roll one d20.',
      auto: { type: 'rerollOne', when: 'boughtDiceWithMomentum' } },
    { name: 'Collaboration', pick: 'skill', requirement: 'Chosen skill rated 6+',
      effect: '2 Momentum: an ally you can communicate with uses your chosen skill score (and an applicable focus of yours) for their test.',
      auto: { type: 'lendSkillToAlly', cost: 2 } },
    { name: 'Combat Medic', faction: 'sukDoctor',
      effect: 'Action + 1 Momentum: reduce an ally’s defeat track by 2 in physical conflict.',
      auto: { type: 'reduceDefeatTrack', amount: 2, cost: 1 } },
    { name: 'Constantly Watching',
      effect: 'Detect-danger tests are Difficulty −2 (min 0). Once per scene, +2 Threat to an enemy’s Keep the Initiative cost.',
      auto: { type: 'difficultyDelta', delta: -2, condition: 'detect danger/hidden enemies' } },
    { name: 'Cool Under Pressure', pick: 'skill',
      effect: 'Spend 1 Determination before rolling the chosen skill: automatic success, 0 Momentum generated (statement must support it).',
      auto: { type: 'determinationAutoSucceed', momentumGenerated: 0 } },
    { name: 'Decisive Action',
      effect: 'After a Battle test that removes an enemy asset (having bought dice via Threat): 2 Momentum removes a second asset.',
      auto: { type: 'removeSecondAsset', cost: 2, when: 'boughtDiceWithThreat' } },
    { name: 'Dedication',
      effect: 'Scene start with an empty Momentum pool: roll 1d20; ≤ Discipline adds 1 Momentum.',
      auto: { type: 'momentumSeedRoll', under: 'discipline', when: 'sceneStartPoolEmpty' } },
    { name: 'Deliberate Motion',
      effect: 'Ignore complications on a Move test for 1 Momentum each.',
      auto: { type: 'buyOffComplications', costEach: 1, skill: 'move' } },
    { name: 'Direct',
      effect: 'Once per scene: command an ally to act immediately (on your turn, in conflict) and assist their test; doesn’t consume their turn.',
      auto: { type: 'commandAllyAction', limit: 'oncePerScene' } },
    { name: 'Driven',
      effect: 'After spending Determination, roll 1d20; ≤ Discipline regains the point.',
      auto: { type: 'regainDeterminationRoll', under: 'discipline' } },
    { name: 'Dual Fealty',
      effect: 'Loyal to two factions openly; friendly standing with both.',
      auto: null },
    { name: 'Failed Navigator', faction: 'guildAgent',
      effect: 'Whenever you spend Determination, the GM grants an additional insight.',
      auto: { type: 'insightOnDeterminationSpend' } },
    { name: 'Find Trouble',
      effect: 'Once per adventure: locate and contact the local criminal underworld or black market (if one exists).',
      auto: { type: 'narrative', limit: 'oncePerAdventure' } },
    { name: 'Guildsman', faction: 'guildAgent',
      effect: 'Use Guild facilities/resources or arrange meetings: free once per adventure; each further use costs +2 more Threat (2, then 4…).',
      auto: { type: 'escalatingThreatUse', firstFree: true, step: 2 } },
    { name: 'Hidden Motives',
      effect: 'When an opponent fails an Understand/Communicate test against you, create a free trait of mistaken belief about you.',
      auto: { type: 'freeTraitOnEnemyFailure', skills: ['understand', 'communicate'] } },
    { name: 'Hyperawareness', faction: 'beneGesserit',
      effect: 'Obtain Information about the observable scene: first Momentum buys two questions; normal noticing limits don’t apply.',
      auto: { type: 'obtainInfoBonus', firstPointQuestions: 2 } },
    { name: 'Imperial Conditioning', faction: 'sukDoctor',
      effect: 'Cannot willingly harm/kill humans; coercion to do so auto-fails. Auto-succeed on tests to persuade others you mean no harm.',
      auto: { type: 'conditioning' } },
    { name: 'Improved Resources', repeatable: true,
      effect: 'Permanent asset limit +1. May be taken multiple times.',
      auto: { type: 'assetCapBonus', bonus: 1 } },
    { name: 'Improvised Weapon',
      effect: 'Once per scene in duel/skirmish: create a free Quality 0 weapon asset; it breaks when the conflict ends.',
      auto: { type: 'createAsset', quality: 0, expiry: 'conflictEnd', limit: 'oncePerScene' } },
    { name: 'Intense Study',
      effect: 'Once per scene: substitute Understand for any other skill on one test, counting as focused.',
      auto: { type: 'substituteSkill', skill: 'understand', countsAsFocused: true, limit: 'oncePerScene' } },
    { name: 'Make Haste',
      effect: 'On a Move test, accept one extra complication for one automatic success. In conflict, +1 Threat to act first.',
      auto: { type: 'tradeComplicationForSuccess', skill: 'move' } },
    { name: 'Mask of Power',
      effect: 'Once per scene: create a fake asset to initiate intrigue/espionage; exposed (extra complication) if you lose.',
      auto: { type: 'createAsset', fake: true, conflicts: ['intrigue', 'espionage'], limit: 'oncePerScene' } },
    { name: 'Master-at-Arms',
      effect: 'Scene start (duel/skirmish/battle) + 1 Momentum: one melee-weapon or troop asset gains Quality +1 for the next conflict.',
      auto: { type: 'assetQualityBuff', amount: 1, cost: 1, scope: 'nextConflict' } },
    { name: 'Masterful Innuendo',
      effect: 'Hide a message in plain speech (+1 Difficulty on the Communicate test); only the stated recipient understands it.',
      auto: { type: 'difficultyDelta', delta: +1, skill: 'communicate', benefit: 'hidden message' } },
    { name: 'Mentat Discipline', faction: 'mentat',
      effect: 'On Understand tests to recall data, one die automatically counts as a natural 1.',
      auto: { type: 'autoOneDie', skill: 'understand', condition: 'data recall' } },
    { name: 'Mind Palace', faction: 'mentat',
      effect: 'Understand test (D0) to relive a past event/place; Momentum works as Obtain Information about that memory.',
      auto: { type: 'testForInfo', skill: 'understand', difficulty: 0, scope: 'past events' } },
    { name: 'Nimble',
      effect: 'Move tests through difficult terrain/obstacles are Difficulty −2 (at 0, pass freely).',
      auto: { type: 'difficultyDelta', delta: -2, skill: 'move', condition: 'terrain/obstacles' } },
    { name: 'Other Memory', faction: 'beneGesserit', requirement: 'Reverend Mother',
      effect: 'Tests aided by knowledge of past generations auto-score 3 successes; share genetic memory with other Reverend Mothers.',
      auto: { type: 'autoSuccesses', count: 3, condition: 'ancestral knowledge' } },
    { name: 'Passive Scrutiny',
      effect: 'Once per scene on entering: ask one free Obtain Information question.',
      auto: { type: 'freeObtainInfo', questions: 1, limit: 'oncePerScene' } },
    { name: 'Performer',
      effect: 'Once per scene: a short performance adds 1 to the group Momentum pool.',
      auto: { type: 'addMomentum', amount: 1, limit: 'oncePerScene' } },
    { name: 'Prana-Bindu Conditioning', faction: 'beneGesserit',
      effect: 'Re-roll one d20 on Move/Discipline tests of body control; perfect command of autonomic functions.',
      auto: { type: 'rerollOne', skills: ['move', 'discipline'], condition: 'body control' } },
    { name: 'Priority Boarding', faction: 'guildAgent',
      effect: 'Guild inspectors wave your cargo through — smuggle freely aboard Guild ships. Lost permanently if it burns the Guild.',
      auto: { type: 'narrative', lossCondition: 'harming Guild interests' } },
    { name: 'Putting Theory into Practice',
      effect: 'Once per scene when you Obtain Information: create a free trait for a weakness/advantage you deduced.',
      auto: { type: 'freeTraitOnObtainInfo', limit: 'oncePerScene' } },
    { name: 'Ransack',
      effect: '+2 Threat: an Understand search test is Difficulty −1 and takes half the time.',
      auto: { type: 'difficultyDelta', delta: -1, skill: 'understand', cost: '+2 Threat', condition: 'searching' } },
    { name: 'Rapid Maneuver',
      effect: 'Reach-destination tests are Difficulty −1; moving an asset an extra zone costs 1 Momentum instead of 2.',
      auto: { type: 'moveDiscount', extraZoneCost: 1 } },
    { name: 'Rapid Recovery',
      effect: 'Start of turn, once per scene: +2 Threat removes a physical-injury complication. Also allows one extra Resist Defeat per conflict.',
      auto: { type: 'removeInjury', cost: '+2 Threat', limit: 'oncePerScene', resistDefeatExtra: 1 } },
    { name: 'Resilience', pick: 'skill', faction: 'fremen',
      effect: 'In conflicts using the chosen skill, Resist Defeat twice per scene instead of once.',
      auto: { type: 'resistDefeatExtra', extra: 1 } },
    { name: 'Rigorous Control',
      effect: '1 Momentum: substitute Discipline for the skill an extended-task requirement is based on (if already Discipline: requirement +1).',
      auto: { type: 'extendedTaskSubstitute', skill: 'discipline', cost: 1 } },
    { name: 'Specialist', pick: 'assetCategory', repeatable: true,
      effect: 'Permanent asset limit +2; the extra assets must come from the chosen category (dueling, warfare, espionage, or intrigue).',
      auto: { type: 'assetCapBonus', bonus: 2, restrictedToCategory: true } },
    { name: 'Stirring Rhetoric',
      effect: 'Win a Communicate test addressing a group: up to Communicate-rating listeners re-roll one d20 on their next test using your drive.',
      auto: { type: 'groupRerollBuff', maxTargets: 'communicate' } },
    { name: 'Subtle Step',
      effect: 'On stealth Move tests (or moving an asset subtly), the first bought d20 is free.',
      auto: { type: 'firstBoughtDieFree', condition: 'stealth' } },
    { name: 'Subtle Words',
      effect: 'On Communicate tests where you bought dice with Momentum: create a free trait reflecting your influence on the listener.',
      auto: { type: 'freeTraitOnMomentumBuy', skill: 'communicate' } },
    { name: 'The Reason I Fight', pick: 'drive', requirement: 'Chosen drive rated 6+',
      effect: 'Battle tests using the chosen drive (statement must align): re-roll one d20.',
      auto: { type: 'rerollOne', skill: 'battle', usesPickedDrive: true } },
    { name: 'The Slow Blade',
      effect: 'Melee attacks in duel/skirmish where you bought dice with Momentum: ignore one enemy asset in the zone.',
      auto: { type: 'ignoreEnemyAsset', count: 1, when: 'boughtDiceWithMomentum' } },
    { name: 'To Fight Someone Is to Know Them', pick: 'skill',
      effect: 'Win a conflict with the chosen skill: gain 2 bonus Momentum usable only for Obtain Information or insight traits about the opponent.',
      auto: { type: 'bonusMomentum', amount: 2, restricted: 'info/insight about opponent' } },
    { name: 'Twisted Mentat', faction: 'mentat', creationOnly: true,
      effect: 'Understand tests with Threat-bought dice: +1 bonus Momentum per Threat die, usable only for cruelty-focused information or weakness traits.',
      auto: { type: 'bonusMomentumPerThreatDie', restricted: 'harm-focused info' } },
    { name: 'Unquestionable Loyalty',
      effect: 'Start each adventure with +1 Determination, usable only in direct service to your House.',
      auto: { type: 'bonusDeterminationAtStart', count: 1, restricted: 'House service' } },
    { name: 'Verify', faction: 'mentat',
      effect: '1 Momentum: ask the GM whether a piece of information is true or false — no test needed.',
      auto: { type: 'truthCheck', cost: 1 } },
    { name: 'Voice', faction: 'beneGesserit',
      effect: 'Observe a target who can hear you: spend 1–3 Threat for that many automatic successes on a Communicate test to influence them (or to resist the Voice). Louder = more noticeable.',
      auto: { type: 'buyAutoSuccessesWithThreat', max: 3, skill: 'communicate' } },
  ],
  talentNotes: 'Real count 55 (index estimate was ~53). "Foreknowledge" is printed as a Mentat mandatory-talent option but has no core talent entry — audit item.',

  // ---------- T31 · Story Hook Generator (GM d20 table, §3.16) ----------
  // Roll d20 per column; each entry spans 4 rolls, so index = floor((roll − 1) / 4).
  // A hook reads: [Plot] [Goal], at/involving [Location], guarded by [Hazard], tied to [Character].
  storyHooks: {
    rollDie: 'd20',
    ranges: ['1–4', '5–8', '9–12', '13–16', '17–20'],
    columns: {
      plot: [
        'Break in and steal or kidnap the…',
        'Solve the mystery of the…',
        'Investigate the murder or destruction of the…',
        'Cause the murder or destruction of the…',
        'Rescue or recover the…',
      ],
      goal: ['Secret Data', 'House Minor Heir', 'Artifact', 'Illegal Technology', 'Secret Spice Stores'],
      location: ['Warehouse', 'Manor House', 'Sietch', 'Smuggler’s Base', 'The Desert'],
      hazard: ['Sardaukar Soldiers', 'Security Systems', 'The Desert', 'The Spacing Guild', 'The Smugglers'],
      character: [
        'Bashira, the head of a House Minor’s security',
        'Kaunos, the merchant',
        'Anca, the Fremen stillsuit seller',
        'Hegai, the smuggler',
        'Akira, the ornithopter pilot',
      ],
    },
  },
  // T32 · Enemy generator — no new data: houseEnemies (T20) is already a rollable d20 table
  // (rollDie + ranges on both Hatred and Reasons). The GM screen wires it in Phase 6.

  // ---------- §3.17 · Scene & adventure lifecycle ----------
  lifecycle: {
    sceneEnd: [
      'Momentum pool loses 1',
      'Temporary assets expire (unless 2 Momentum made them permanent)',
      'Resist Defeat becomes available again',
      'Challenged drive statement may recover if the character reflected and no Determination was spent or gained',
    ],
    adventureStart: [
      'Determination resets to 1 (talents may add; cap 3)',
      'Advance-purchase gate resets',
    ],
    adventureEnd: [
      'Purchase at most 1 advance',
      'Unrecovered challenged statements recover: write a new statement, or −1 the challenged drive / +1 the next lowest (statement kept if the drive stays ≥ 6)',
    ],
  },
};
