// data-power-and-pawns.js — Power and Pawns (The Emperor's Court) crunch, toggle-gated behind
// Settings.powerAndPawns() (off by default). Campaign plot/lore excluded. Owner-supplied,
// paraphrased (2026-07-08). Ledger T33/T34: Sardaukar · Face Dancer/Tleilaxu · Ginaz (Cadet +
// Swordmaster) faction templates; Spacing Guild archetypes; Sardaukar/Face Dancer/Twisted
// Mentat/Ginaz-Swordmaster/Suk/Guild/Navigator/political talents; Guild focuses; Suk medical
// assets; and 6 alternative drives (subsystem: newDrives).
//
// Talent mechanics live in the effect text (`auto:'narrative'`) except a few broad single-die
// re-rolls mapped to the roller (`rerollOne` with skills). Faction-restricted talents/archetypes
// carry a `faction` id and surface only for that faction via src/content.js.

export const EXPANSION = {
  id: 'powerAndPawns',
  extracted: false, // court factions + Guild + political + new drives done; wider TOC still to map
  npcs: [], subsystems: ['newDrives'],

  // ---------- New faction templates ----------
  factionTemplates: [
    { id: 'sardaukar', name: 'Sardaukar', trait: 'Sardaukar',
      mandatoryTalents: { mode: 'all', options: ['Unquestionable Loyalty'] },
      suggestedArchetypes: ['Commander', 'Duelist', 'Protector', 'Scout', 'Sergeant', 'Strategist', 'Tactician', 'Warrior'],
      note: 'Unquestionable Loyalty (House Corrino only). A Sardaukar may never take Dual Fealty.',
      desc: 'The Emperor’s peerless soldier-fanatics of Salusa Secundus — first and foremost killers, utterly devoted to their comrades and the Padishah Emperor; sometimes seconded to a Great House as counsel or bodyguard.',
      factionIntro: 'A Sardaukar answers only to the Emperor and will never knowingly act against House Corrino — others tend to keep them at arm’s length.' },
    { id: 'faceDancer', name: 'Face Dancer', trait: 'Tleilaxu',
      mandatoryTalents: { mode: 'all', options: ['Facedance', 'Muscular Conditioning'] },
      suggestedArchetypes: ['Athlete', 'Envoy', 'Infiltrator', 'Scout', 'Spy'],
      desc: 'A Bene Tleilax shapeshifter grown to mimic form and face. Best run with the other players aware of their nature, as a spy in (or replacing a member of) the House.',
      factionIntro: 'Face Dancer play is delicate — it easily devolves into “find the impostor.” Coordinate with the GM.' },
    { id: 'ginazCadet', name: 'Ginaz Cadet', trait: 'Ginaz',
      mandatoryTalents: { mode: 'all', options: [] },
      suggestedArchetypes: ['Duelist', 'Protector', 'Warrior'],
      note: 'The GM may require Weapon Focus, or allow a newly-inducted cadet with none. Cadets may not begin play with Swordmaster talents but may learn up to three over play, and gain no personal House-management ventures until they graduate.',
      desc: 'A student of the Ginaz School, already under the fierce discipline and sword-drill that forge living weapons — not yet a Swordmaster.' },
    { id: 'ginazSwordmaster', name: 'Ginaz Swordmaster', trait: 'Ginaz Swordmaster',
      mandatoryTalents: { mode: 'all', options: ['Master of Battle'] },
      suggestedArchetypes: ['Commander', 'Duelist', 'Protector', 'Sergeant', 'Strategist', 'Tactician', 'Warrior'],
      note: 'A full Swordmaster has Master of Battle plus at least one — and no more than three — other Swordmaster talents.',
      desc: 'The finest product of the Ginaz School: deadlier than any duelist and a boon to their House as bodyguard, instructor, envoy, or general.' },
  ],

  // ---------- Spacing Guild archetypes (Guild faction only) ----------
  archetypes: [
    { id: 'guildFinancier', name: 'Guild Financier', faction: 'guildAgent', primary: 'understand', secondary: 'communicate',
      focuses: ['Finance', 'Guild Bureaucracy'], talents: ['Check the Books', 'Methodical Efficiency'],
      driveSuggestions: ['faith', 'duty'],
      desc: 'A financial expert of the Guild Bank, managing noble Houses’ accounts and predicting fiscal trends across the Known Universe.' },
    { id: 'guildEngineer', name: 'Guild Engineer', faction: 'guildAgent', primary: 'understand', secondary: 'discipline',
      focuses: ['Advanced Technology', 'Spaceship Technology'], talents: ['Cool Under Pressure', 'Putting Theory into Practice'],
      driveSuggestions: ['duty', 'faith'],
      desc: 'Designs, builds, and maintains the ships the Navigators fly — in the shipyards or out in the field.' },
    { id: 'guildInspector', name: 'Guild Inspector', faction: 'guildAgent', primary: 'communicate', secondary: 'understand',
      focuses: ['Deductive Reasoning', 'Finance'], talents: ['Methodical Efficiency', 'Nose for Cargo'],
      driveSuggestions: ['truth', 'justice'],
      desc: 'A field agent who examines cargoes, investigates crash sites, and performs the Guild’s methodical field analysis.' },
    { id: 'guildScientist', name: 'Guild Scientist', faction: 'guildAgent', primary: 'understand', secondary: 'communicate',
      focuses: ['Mathematics', 'Physics'], talents: ['Intense Study', 'Power of Neutrality'],
      driveSuggestions: ['truth', 'power'],
      desc: 'Travels the Known Universe studying unique phenomena, strange locations, and discoveries the Guild might exploit.' },
    { id: 'guildScout', name: 'Guild Scout', faction: 'guildAgent', primary: 'move', secondary: 'battle',
      focuses: ['Pilot (Spaceship)', 'Space Navigation'], talents: ['Power of Neutrality', 'Rapid Maneuver'],
      driveSuggestions: ['duty', 'faith'],
      desc: 'An explorer sent to chart new planets and cosmic phenomena — and to hunt for more worlds where spice, or something like it, might be found.' },
    { id: 'guildSpy', name: 'Guild Spy', faction: 'guildAgent', primary: 'communicate', secondary: 'battle',
      focuses: ['Espionage', 'Infiltration'], talents: ['Code of Secrecy', 'Play Both Ends Against the Middle'],
      driveSuggestions: ['duty', 'power'],
      desc: 'A trained infiltrator gathering intelligence for the Guild — sometimes in disguise, sometimes never seen at all.' },
  ],

  // ---------- Talents ----------
  talents: [
    // Sardaukar
    { name: 'Blood Ritual', faction: 'sardaukar', effect: 'Spend an action to anoint yourself with the blood of an enemy you killed this scene: gain 2 Momentum/Threat.', auto: { type: 'narrative' } },
    { name: 'Fanatic Killer', faction: 'sardaukar', effect: 'Gain 1 Momentum each time you attack a foe you have not yet engaged this scene. (Sardaukar or, with GM permission, Fremen.)', auto: { type: 'narrative' } },
    { name: 'Fearsome Spectacle', faction: 'sardaukar', effect: 'After you defeat an enemy, the next attack against you this scene automatically fails. An NPC using this also generates 2 Threat.', auto: { type: 'narrative' } },
    { name: 'Hidden Blade', faction: 'sardaukar', effect: 'Spend an action to create a blade asset (for yourself) in any circumstance, with no test or Momentum/Threat cost.', auto: { type: 'narrative' } },
    { name: 'Killer Reputation', faction: 'sardaukar', effect: 'Substitute your Battle skill for Communicate or Discipline when dissuading someone from attacking you or those under your protection.', auto: { type: 'narrative' } },
    { name: 'Loyal Unto Death', faction: 'sardaukar', effect: 'If defeated in melee, make one strike back at your attacker to try to defeat them too; you remain defeated and fall unconscious, dying without aid before scene end.', auto: { type: 'narrative' } },
    { name: 'Military Counselor', faction: 'sardaukar', effect: 'If you (or those you advise) plan for a coming Duel/Skirmish/Warfare, move one asset to an adjacent zone before round one with no test.', auto: { type: 'narrative' } },
    { name: 'Sacrifice', faction: 'sardaukar', effect: 'Give an allied non-Sardaukar a “Wounded” trait during a physical conflict to gain 2 Momentum/Threat (same ally once per scene).', auto: { type: 'narrative' } },
    { name: 'Silent Attack', faction: 'sardaukar', effect: 'Against an unaware target, your first attack rolls 3d20 instead of 2d20. (Sardaukar or, with GM permission, Fremen.)', auto: { type: 'narrative' } },
    { name: 'Strike from the Shadows', faction: 'sardaukar', effect: 'A stealth test to close on a target for an attack has its Difficulty reduced by 1. (Sardaukar or, with GM permission, Fremen.)', auto: { type: 'narrative' } },
    // Face Dancer
    { name: 'Facedance', faction: 'faceDancer', effect: 'At scene start, alter your form (height, build, colour, age, apparent sex) — near-impossible to see through; mimicking a specific person may be caught by someone who knows them (their Understand vs your Discipline). Form only, not mannerisms.', auto: { type: 'narrative' } },
    { name: 'Muscular Conditioning', faction: 'faceDancer', effect: 'On a Move or Discipline test relying on body control, re-roll one d20. Body/muscle/nerve control only (like prana-bindu, but no Bene Gesserit access).', auto: { type: 'rerollOne', skills: ['move', 'discipline'] } },
    { name: 'Copy', faction: 'faceDancer', effect: 'Observe a target for a scene, make an Average (D1) Understand test to memorise their speech and mannerisms and replace them; only those who know them well can attempt to detect it (their Understand vs your Discipline).', auto: { type: 'narrative' } },
    { name: 'Innocent Form', faction: 'faceDancer', effect: 'Take an unobtrusive or innocent-looking form (choose): reduce the Difficulty of stealth or avoid-suspicion tests. Not usable when disguised as a specific person.', auto: { type: 'narrative' } },
    { name: 'Lightning Reflexes', faction: 'faceDancer', effect: 'Spend 1 Momentum to act first this round regardless of initiative (no extra actions). (Face Dancer or Bene Gesserit.)', auto: { type: 'narrative' } },
    { name: 'Lock Features', faction: 'faceDancer', effect: 'Maintain the last form you took even when unconscious or dead — you do not revert to the formless Face Dancer appearance.', auto: { type: 'narrative' } },
    { name: 'The Right Moment', faction: 'faceDancer', effect: 'If unsuspected and not seen as a threat, your first attack of a skirmish/assassination (before anyone else acts) rolls a full 5d20 for free — but grants no Momentum.', auto: { type: 'narrative' } },
    { name: 'Unobtrusive Change', faction: 'faceDancer', effect: 'In a reasonably crowded place, tailing or spotting you is one Difficulty level harder.', auto: { type: 'narrative' } },
    // Twisted / Mentat
    { name: 'Calculated Distress', faction: 'mentat', effect: '(Twisted) When a plan you’re part of resolves (usually Intrigue/Espionage), impose a negative emotional trait on an opponent to represent the stress you caused.', auto: { type: 'narrative' } },
    { name: 'Exit Trance', faction: 'mentat', effect: 'Enter a deep problem-solving trance for a set time; you cannot be roused, but your body’s normal needs continue.', auto: { type: 'narrative' } },
    { name: 'Mental Map', faction: 'mentat', effect: 'If you have seen a map of your area, spend an action to gain the trait “Knows the Area” for the scene.', auto: { type: 'narrative' } },
    { name: 'Never Forget a Face', faction: 'mentat', effect: 'Spend 1 Momentum to recognise any member of a noble House’s ruling family (position + reputation, not secrets), extrapolating for age.', auto: { type: 'narrative' } },
    { name: 'Triumph of Reason', faction: 'mentat', effect: '(Non-twisted) Meditate ~20 minutes to remove one emotional trait, permanently or for the next scene.', auto: { type: 'narrative' } },
    { name: 'True Agenda', faction: 'mentat', effect: 'When a negotiation opponent makes their opening statements, Obtain Information about their true intentions and needs once for free.', auto: { type: 'narrative' } },
    // Ginaz Swordmaster
    { name: 'Always Armed', faction: 'ginazSwordmaster', effect: 'If unarmed, create a Quality 0 melee weapon asset for free (no test/action) during a conflict from anything to hand; yours only, lost at conflict end.', auto: { type: 'narrative' } },
    { name: 'Blur of Blades', faction: 'ginazSwordmaster', effect: 'When you move a weapon asset in a duel or skirmish, you may move it two zones instead of one, bypassing a facing guard.', auto: { type: 'narrative' } },
    { name: 'Battle Perception', faction: 'ginazSwordmaster', effect: 'You cannot be surprised or ambushed; you always get an action when attacked and need no action to ready an available weapon.', auto: { type: 'narrative' } },
    { name: 'Blademaster', faction: 'ginazSwordmaster', effect: 'Any melee weapon in your hands gains +1 Quality (even one with none), to a maximum of 4.', auto: { type: 'narrative' } },
    { name: 'Combat Meditation', faction: 'ginazSwordmaster', effect: 'Each point of Momentum you spend for any reason also raises the Difficulty for anyone to strike you that round by +1, to a maximum of +3.', auto: { type: 'narrative' } },
    { name: 'Lightning Strike', faction: 'ginazSwordmaster', effect: 'If not surprised/ambushed, take a free action on the first round of combat before anyone else, in addition to your normal action.', auto: { type: 'narrative' } },
    { name: 'Master of Battle', faction: 'ginazSwordmaster', effect: 'At the onset of a skirmish/warfare, make an Average (D1) Battle test; Momentum gained becomes a separate pool only you may spend during that conflict.', auto: { type: 'narrative' } },
    { name: 'Soul of a Swordmaster', faction: 'ginazSwordmaster', effect: 'A full Ginaz graduate: reduce the Difficulty by one step on social tests with other Ginaz; if a Battle-test die rolls a 1, gain an extra Momentum.', auto: { type: 'narrative' } },
    { name: 'Steel Focus', faction: 'ginazSwordmaster', effect: 'When a physical conflict begins, gain a bonus point of Determination, removed (spent or not) at conflict end.', auto: { type: 'narrative' } },
    { name: 'Weapon Focus', faction: 'ginazSwordmaster', effect: 'Attacking with any sword, substitute one d20 for a result of 1 without rolling (as if spending Determination); stacks with Determination and other re-rolls.', auto: { type: 'narrative' } },
    // Suk
    { name: 'Academic Excellence', effect: 'Any task requiring study takes you half the time, and studied tasks are one Difficulty lower.', auto: { type: 'narrative' } },
    { name: 'Bedside Manner', faction: 'sukDoctor', effect: 'When gaining someone’s trust or ingratiating yourself, reduce the Difficulty by 1.', auto: { type: 'narrative' } },
    { name: 'Cybernetic Surgeon', effect: 'Once per scene, repair damaged cybernetics to full; in extended time, implant cybernetics.', auto: { type: 'narrative' } },
    { name: 'Empathetic Diagnostics', faction: 'sukDoctor', effect: 'Diagnose without instruments by touch and intuition; with medical equipment, the test is one Difficulty lower.', auto: { type: 'narrative' } },
    { name: 'Improvised Medicine', faction: 'sukDoctor', effect: 'Create medicine from common chemicals or flora/fauna; any Difficulty penalty for primitive/substandard medical assets is reduced by 1.', auto: { type: 'narrative' } },
    { name: 'Medical Director', effect: 'As medical director in a Warfare conflict, restore one unit asset for 1 Momentum.', auto: { type: 'narrative' } },
    { name: 'Researcher', effect: 'In an extended research task, add +1 to the Quality of the asset you use for the test’s duration.', auto: { type: 'narrative' } },
    // Spacing Guild
    { name: 'Code of Secrecy', faction: 'guildAgent', effect: 'Any attempt to make you reveal confidential client information — persuasion, intimidation, even torture — is one Difficulty level higher.', auto: { type: 'narrative' } },
    { name: 'Guild Peace', faction: 'guildAgent', effect: 'Spend 1 Momentum to add the environmental trait “Guild Peace” to a scene, usually penalising violent actions.', auto: { type: 'narrative' } },
    { name: 'Guild Upbringing', faction: 'guildAgent', effect: 'Stepping aboard a Guild Heighliner, or leaving a planetary atmosphere, gain 1 Momentum.', auto: { type: 'narrative' } },
    { name: 'Methodical Efficiency', faction: 'guildAgent', effect: 'On an Understand test relating to finance, commerce, or bureaucracy, re-roll one of your d20s.', auto: { type: 'rerollOne', skills: ['understand'] } },
    { name: 'Minor Spice Mutation', faction: 'guildAgent', effect: 'Gain the permanent trait “Mutated” (blue-in-blue eyes, concealed deformity). Re-roll 1d20 when using a Spice talent; once per session, consume a spice asset to gain the effect of spending Determination.', auto: { type: 'narrative' } },
    { name: 'Nose for Cargo', faction: 'guildAgent', effect: 'When testing to detect contraband or find a specific item in cargo, reduce the Difficulty by 1 (min 0).', auto: { type: 'narrative' } },
    { name: 'Play Both Ends Against the Middle', faction: 'guildAgent', effect: 'As a neutral party in a conflict between two others, once per scene spend 4 Momentum (group pool) to gain 1 Determination if you have none.', auto: { type: 'narrative' } },
    { name: 'Power of Neutrality', faction: 'guildAgent', effect: 'If recognisably a Guild agent, enemies must spend 2 Momentum/Threat to attack or move against you directly. Lost if you accept a duel or attack.', auto: { type: 'narrative' } },
    { name: 'Space Power', faction: 'guildAgent', effect: 'Adds access to a Guild-only Heighliner asset you may request (not command) to transport you and your assets; the GM arbitrates availability.', auto: { type: 'narrative' } },
    { name: 'Spacer', faction: 'guildAgent', effect: 'In zero/light gravity, or manoeuvring in a ship’s artificial gravity, re-roll 1d20 on any Move test.', auto: { type: 'rerollOne', skills: ['move'] } },
    { name: 'The Cylinder Must Get Through', faction: 'guildAgent', effect: 'On actions directly delivering a message you were tasked with, re-roll one d20; you may also spend Determination on such tasks even if no drive statement applies.', auto: { type: 'narrative' } },
    // Navigator (usually NPC-only; GM may allow via Failed Navigator / Spice-Warped)
    { name: 'Find a Safe Path', faction: 'guildAgent', effect: '(Navigator) Make a Challenging (D2) Discipline test before entering a scene: reduce Threat/Momentum to zero for it — no ambush, surprise, or readied hostile assets.', auto: { type: 'narrative', note: 'Navigator; usually NPC-only.' } },
    { name: 'Foldspace Pilot', faction: 'guildAgent', effect: '(Navigator) Required to make a foldspace jump; an Average (D1) Understand test — failure goes off-course; distance is irrelevant.', auto: { type: 'narrative', note: 'Navigator; usually NPC-only.' } },
    { name: 'Foldspace Technology', effect: 'Without this talent, repairing/adjusting/using foldspace technology is at a 2-step Difficulty penalty; with it, you work it normally.', auto: { type: 'narrative' } },
    { name: 'Null Zone', faction: 'guildAgent', effect: '(Navigator) Prescient/clairvoyant abilities used on you or those near you are one Difficulty harder; spend Threat/Momentum to raise the penalty further.', auto: { type: 'narrative', note: 'Navigator; usually NPC-only.' } },
    { name: 'Sense the Path', faction: 'guildAgent', effect: '(Navigator) When you Obtain Information, ask if a subject has a destiny; spend an extra Threat/Momentum for a glimpse of what it entails.', auto: { type: 'narrative', note: 'Navigator; usually NPC-only.' } },
    { name: 'Spice-Warped', faction: 'guildAgent', effect: 'A failed Navigator, spice-mutated: attempts to read your intent are +1 Difficulty and Obtaining Information about you costs 1 more Momentum; re-roll 1d20 when working on Navigator life-support or Guild technology.', auto: { type: 'narrative' } },
    { name: 'The Right Moment (Navigator)', faction: 'guildAgent', effect: '(Navigator) When you spend Determination on an action, also reduce that action’s Difficulty by one, in addition to the Determination’s other effects.', auto: { type: 'narrative', note: 'Navigator; usually NPC-only.' } },
    { name: 'Sight of the Universe', faction: 'guildAgent', effect: '(Navigator) Send your mind out to see any part of the Known Universe on a planetary scale (bombardments, a sun exploding, a Heighliner folding space) — not individual people.', auto: { type: 'narrative', note: 'Navigator; usually NPC-only.' } },
    // Political (any character)
    { name: 'Come Hither', effect: 'Remove an NPC from a scene as long as you leave with them; they’ll go somewhere private and at least hear your proposal.', auto: { type: 'narrative' } },
    { name: 'Dangerous Seduction', effect: 'Spend 1 Momentum + an Average (D1) Communicate test to convince an NPC you’re secretly on their side; you gain the “Trusted” trait on that matter (GM gains 2 Threat).', auto: { type: 'narrative' } },
    { name: 'Flick of the Wrist', effect: 'Spend 1 Momentum to pick a lock/pocket or a sleight of hand unnoticed (nothing especially important or guarded); no test.', auto: { type: 'narrative' } },
    { name: 'Insight', effect: 'Once per scene, for +1 Threat, ask the GM to name a Talent an NPC has, after conversing with or observing them.', auto: { type: 'narrative' } },
    { name: 'Instant Disguise', effect: 'Spend 1 Momentum to create a Quality 0 disguise asset for the scene; normal disguise tests still apply but are enhanced.', auto: { type: 'narrative' } },
    { name: 'Golden Tongue', effect: 'Once per scene, use Communicate in place of another skill on a single test, counting as having a focus — usually talking your way to a different resolution.', auto: { type: 'narrative' } },
    { name: 'Insult to Compliment', effect: 'Once per scene, if you gain a complication by an embarrassing/damaging remark, spend 1 Momentum to explain yourself and cancel its effects.', auto: { type: 'narrative' } },
    { name: 'Look Out!', effect: 'Once per scene, if a nearby ally suffers a defeat, spend 1 Momentum to let them Resist Defeat (GM gains 3 Threat).', auto: { type: 'narrative' } },
    { name: 'Neutralize', effect: 'Spend 1 Momentum in a social setting, conversing with an NPC, to stop them using a Talent you know they have for the rest of the scene.', auto: { type: 'narrative' } },
    { name: 'Poison Resistance', effect: 'If you imbibe a poison, offer the GM 3 Threat; if accepted, declare it a poison you are immune to.', auto: { type: 'narrative' } },
    { name: 'Rapier Wit', effect: 'During a physical conflict, an Average (D1) Communicate test can remove one of an opponent’s assets by shaming its use (can’t disarm them unless you’re unarmed too).', auto: { type: 'narrative' } },
    { name: 'Slip of the Tongue', effect: 'Once per scene, spend 1 Momentum to force a negative social trait (Embarrassed, Disgraced…) onto an enemy until scene end — even by rumour.', auto: { type: 'narrative' } },
    { name: 'The Perfect Deal', effect: 'Reduce by 1 the Difficulty to get another character to accept a business deal you offer (they must get something out of it).', auto: { type: 'narrative' } },
    { name: 'The Quiet Knife', effect: 'When you attack in a physical conflict, the Difficulty for anyone to hear or notice the attack is one step higher.', auto: { type: 'narrative' } },
    { name: 'Wait!', effect: 'Once per scene, spend 2 Momentum just before a conflict to pause it for a monologue; make an Average (D1) Communicate test for Momentum, then the conflict resumes.', auto: { type: 'narrative' } },
    { name: 'Your Threats Are Meaningless', effect: 'Once per scene, as an action, remove a complication you gained through social interaction.', auto: { type: 'narrative' } },
  ],

  // ---------- Spacing Guild focuses ----------
  focuses: [
    { skill: 'communicate', name: 'Bribery', desc: 'Safely offering a bribe — with what, and how much.' },
    { skill: 'understand', name: 'Finance', desc: 'Managing large sums for a company, House, or bank.' },
    { skill: 'understand', name: 'Foldspace Navigation', desc: 'Plotting an FTL course through foldspace (Guild Navigators only).' },
    { skill: 'understand', name: 'Guild Bureaucracy', desc: 'How the Spacing Guild works behind the scenes.' },
    { skill: 'move', name: 'Low-Gravity Operation', desc: 'Moving and working in low or microgravity.' },
    { skill: 'understand', name: 'Mathematics', desc: 'Numbers, formulas, and spaces — the key to Navigator thinking.' },
    { skill: 'move', name: 'Pilot (Spaceship)', desc: 'Flying a standard (non-foldspace) spacecraft, take-offs and landings.' },
    { skill: 'communicate', name: 'Secret Language (Guild Navigator)', desc: 'The higher-order mathematical tongue of Navigators.' },
    { skill: 'communicate', name: 'Secret Language (Spacing Guild)', desc: 'The Guild’s clipped internal shorthand.' },
    { skill: 'understand', name: 'Space Navigation', desc: 'Traditional (non-foldspace) interplanetary navigation.' },
    { skill: 'battle', name: 'Space Tactics', desc: 'Combat involving spacecraft.' },
    { skill: 'understand', name: 'Spaceship Technology', desc: 'Building and repairing spacecraft of all types.' },
    { skill: 'battle', name: 'Spaceship Weapons', desc: 'Weapons mounted on spacecraft.' },
    { skill: 'battle', name: 'Stunner', desc: 'Stunner weapons, common among Guild agents.' },
  ],

  // ---------- Suk medical assets ----------
  assets: [
    { name: 'Handheld Medical Scanner', quality: 0, tangible: true, keywords: ['Medical', 'Detection', 'Technology'], desc: 'On-the-spot diagnostics and chemical analysis; can double as a poison snooper.' },
    { name: 'Medic Kit', quality: 0, tangible: true, keywords: ['First Aid', 'Survival'], desc: 'Sutures, bandages, needles, and medicine for field first aid or light surgery.' },
    { name: 'Laboratory', quality: 0, tangible: true, keywords: ['Equipment', 'Research'], desc: 'A secure lab for research, experiments, and small batches of medicine, poison, or gadgets.' },
    { name: 'Pharmaceutical Factory', quality: 0, tangible: true, keywords: ['Manufactured', 'Trade Goods', 'Medicine'], desc: 'Full-scale plant producing medicine, spice derivatives, and chemical goods — a source of House wealth.' },
    { name: 'Hospital Ship', quality: 0, tangible: true, keywords: ['Transport', 'Shielded', 'Medical'], desc: 'A self-contained mobile hospital — orbit-capable, Heighliner-transportable, deployable as a field hospital.' },
  ],

  // ---------- Alternative drives (subsystem: newDrives) ----------
  // Any of these may replace a standard drive (Duty/Faith/Justice/Power/Truth) at creation
  // (recommended ≤ 2). Interactive swap in the wizard is a follow-up; shown in the rules library.
  drives: [
    { id: 'challenge', name: 'Challenge', desc: 'The desire to always be tested and to overcome obstacles — even seeking out bad odds.',
      use: 'Use when the character is out of their depth or facing something new that will prove their mettle.',
      statements: ['Because it’s there.', 'My weaknesses must be tested.', 'Life is meaningless without challenge.', 'I can’t stand by and do nothing.', 'I can only improve by doing.', 'Learning is nothing without experience.', 'I will not be found wanting.', 'The scabbard dulls the blade.'] },
    { id: 'glory', name: 'Glory', desc: 'The desire to be rewarded with praise (or feared) — recognition matters more than the deed.',
      use: 'Use when the character seeks recognition or a chance to show off; when their reputation is on the line.',
      statements: ['If no one notices, it’s not worth doing.', 'I’ll show all of you.', 'Respect is love.', 'Better to be feared than adored.', 'People expect greatness from me.', 'Everyone will know my name.', 'My deeds will be spoken of in centuries to come.', 'My name echoes in the highest of places.'] },
    { id: 'indulgence', name: 'Indulgence', desc: 'Focus on personal pleasure and vice above all else — everything else is killing time.',
      use: 'Use when the character wants to see to their own needs, or pursue a vice more easily.',
      statements: ['I take what I want.', 'If I want it, I’ve earned it.', 'Pleasure is always worth pursuing.', 'Nothing is too good for me.', 'Life just gets in the way of [vice].', 'People don’t say no to me.', 'Privilege is a word only poor people use.', 'If it’s rigged in my favour, it’s not unfair.'] },
    { id: 'hate', name: 'Hate', desc: 'A consuming loathing that feeds a cycle of pain. Needs GM (and possibly table) permission; never aimed at another PC.',
      use: 'Use when you see any opportunity to strike at the object of your loathing.',
      statements: ['I hate [enemy].', 'I will drag them down with me.', 'Nothing matters but revenge.', 'A drop of their blood is worth a lake of my own.', 'No price is too high to get even.', 'Every day is a new opportunity to hurt my enemies.', 'Trust is only possible through shared hatred.', 'The last thing they hear will be my laughter.'] },
    { id: 'honor', name: 'Honor', desc: 'A personal code to find a moral path — only as good as the code itself.',
      use: 'Use to follow your own code of ethics, for right reasons or not.',
      statements: ['Never kill an unarmed foe.', 'I face my enemies.', 'Protect the innocent.', 'Honor means more than life.', 'My sword is always ready to defend what is right.', 'I do not break my word.', 'Where I stand will always matter.', 'The letter of the law is what matters.'] },
    { id: 'love', name: 'Love', desc: 'Devotion to specific people — any sacrifice for those you care about. Statements name people, not ideals.',
      use: 'Use when someone you care about is in danger or needs help, or to face difficult decisions for them.',
      statements: ['I love my [partner].', 'I would do anything for my children.', 'My family is everything.', 'My [mentor/teacher] is the most important person in the world.', 'I can’t be without my [sibling].', 'My best friend will never let me down.', 'I can always be trusted to cover my friends’ backs.', 'I will not be the weak link in the chain of my relationships.'] },
  ],
};
