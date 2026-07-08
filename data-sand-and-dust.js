// data-sand-and-dust.js — Sand and Dust (The Arrakis Sourcebook) crunch, toggle-gated behind
// Settings.sandAndDust() (off by default). Campaign plot/lore excluded. Owner-supplied,
// paraphrased (2026-07-08). Ledger T33 (Fremen archetypes/talents/focuses + Spice talents),
// plus the Fremen life-events table and the Spice asset/addiction note (T34/T36).
//
// Fremen archetypes carry `faction:'fremen'` and surface in the wizard only for a Fremen
// character (they replace the standard archetype choices). Most talents here embed their
// mechanic in the effect text (`auto.type:'narrative'`) — they appear and are selectable, and
// worm-riding / scene-long effects live in the extended-task + trait layers rather than the
// per-roll dialog.

export const EXPANSION = {
  id: 'sandAndDust',
  extracted: false, // Fremen + Spice done; wider Sand and Dust TOC still to map
  factionTemplates: [], npcs: [], subsystems: ['fremenLifeEvents', 'spice'],

  // ---------- Fremen archetypes (Fremen faction only) ----------
  archetypes: [
    { id: 'naib', name: 'Naib', faction: 'fremen', primary: 'battle', secondary: 'understand',
      focuses: ['Dueling', 'Leadership'], talents: ['Ways of the Ichwan Bedwine', 'To Fight Someone Is to Know Them'],
      driveSuggestions: ['duty', 'power'],
      desc: 'War-leader and protector of the whole sietch — the toughest, most remorseless Fremen, sworn never to be taken alive. Becomes naib only by defeating the last one.' },
    { id: 'fedaykin', name: 'Fedaykin', faction: 'fremen', primary: 'battle', secondary: 'move',
      focuses: ['Dueling', 'Short Blades'], talents: ['Bold (Battle)', 'Crysknife Master'],
      driveSuggestions: ['justice', 'faith'],
      desc: 'A death-commando of the Fremen, dedicated to the blade and to retribution against those who wronged the Ichwan Bedwine.' },
    { id: 'sayyadina', name: 'Sayyadina', faction: 'fremen', primary: 'understand', secondary: 'communicate',
      focuses: ['Deductive Reasoning', 'Empathy'], talents: ['Ways of the Ichwan Bedwine'],
      driveSuggestions: ['truth', 'faith'],
      desc: 'Priestess and wise-woman: keeper of the tribe’s lore and living memory, the heart and soul of the sietch.' },
    { id: 'sandRunner', name: 'Sand Runner', faction: 'fremen', primary: 'move', secondary: 'discipline',
      focuses: ['Resolve', 'Self-control'], talents: ['Chosen of Shai-Hulud', 'Peace of Shai-Hulud'],
      driveSuggestions: ['duty', 'power'],
      desc: 'An especially skilled worm-rider used to carry messages between tribes — calling and taming a maker large enough to run the deep desert at speed.' },
    { id: 'wali', name: 'Wali', faction: 'fremen', primary: 'discipline', secondary: 'battle',
      focuses: ['Self-control', 'Stamina'], talents: ['Walk Without Rhythm', 'Water Wisdom'],
      driveSuggestions: ['faith', 'power'],
      desc: 'A young, unblooded member of the sietch — full of Fremen strength and skill, still waiting to be tested in the Great Flat.' },
    { id: 'ecologist', name: 'Ecologist', faction: 'fremen', primary: 'discipline', secondary: 'understand',
      focuses: ['Ecology', 'Precision'], talents: ['Fremen Technology', 'Water Wisdom'],
      driveSuggestions: ['faith', 'duty'],
      desc: 'A secret servant of Kynes’s dream of a green Arrakis — patient, learned in new equipment, working for a world they may never live to see.' },
  ],

  // ---------- Fremen + Spice talents ----------
  talents: [
    // Fremen talents
    { name: 'Chosen of Shai-Hulud', faction: 'fremen', pick: 'skill', repeatable: true,
      effect: 'Pick Move, Discipline, or Understand: reduce the Difficulty by 2 on that skill when mounting or riding a sandworm. May be taken up to 3× (a different skill each time).',
      auto: { type: 'narrative', note: '−2 Difficulty on the chosen skill when mounting/riding a sandworm.' } },
    { name: 'Crysknife Master', faction: 'fremen',
      effect: 'When you succeed on a crysknife attack in a duel or skirmish, generate 1 free Momentum.',
      auto: { type: 'narrative' } },
    { name: 'Desert Walker',
      effect: 'Ignore the detrimental effects of one active environmental trait relating to deserts, heat, thirst, or Arrakis.',
      auto: { type: 'narrative' } },
    { name: 'Fremen Technology',
      effect: 'When you Obtain Information about a piece of Fremen technology, or attempt to repair one, re-roll 1d20.',
      auto: { type: 'narrative', note: 'Re-roll 1d20 on Fremen-tech repair / Obtain Information.' } },
    { name: 'Jacurutu', faction: 'fremen',
      effect: 'Descended from an outcast sietch and hiding among the Fremen: the Difficulty to deceive any Fremen is reduced by 1.',
      auto: { type: 'narrative' } },
    { name: 'Peace of Shai-Hulud', faction: 'fremen',
      effect: 'Reduce the Difficulty to spot wormsign by 1; you always know a spotted worm’s direction and time to arrive, and reduce the Difficulty to avoid it by 1.',
      auto: { type: 'narrative' } },
    { name: 'Walk Without Rhythm',
      effect: 'Crossing open sand at a walk, you need not test to avoid attracting a worm; anything faster than a walk may still provoke a test.',
      auto: { type: 'narrative' } },
    { name: 'Tooth Crafter', faction: 'fremen',
      effect: 'Present to collect a slain worm’s teeth, make a Difficulty 4 Discipline test; on success spend 1 Momentum per crysknife crafted (one roll only).',
      auto: { type: 'narrative' } },
    { name: 'Water Wisdom', faction: 'fremen',
      effect: 'Adept at managing your water: ignore the effects of any one trait relating to thirst or water loss in a scene.',
      auto: { type: 'narrative' } },
    { name: 'Ways of the Ichwan Bedwine', faction: 'fremen',
      effect: 'Gain one automatic success on an Understand test about the Fremen’s history or culture.',
      auto: { type: 'narrative', note: '+1 automatic success on Understand (Fremen history/culture).' } },
    // Spice talents (physical) — require ingesting spice; see spice.addictionNote
    { name: 'Spice Lore', spice: true,
      effect: 'Once per scene, on an Understand test related to the spice melange, re-roll up to two d20s.',
      auto: { type: 'narrative' } },
    { name: 'Spice Refinement', spice: true,
      effect: 'On a task relating to the mechanics/logistics of spice production or refinement, gain one free d20.',
      auto: { type: 'narrative' } },
    { name: 'Improved Healing', spice: true, spiceRegular: true,
      effect: 'Taking spice regularly: once per scene, re-roll one d20 that would cause a complication if that complication is an injury.',
      auto: { type: 'narrative' } },
    { name: 'Enhanced Lifespan', spice: true, spiceRegular: true,
      effect: 'Taking spice regularly: ignore any complication or trait due to old age for 1 Momentum. Lost if the spice supply stops for more than a few days.',
      auto: { type: 'narrative' } },
    // Spice talents (mental)
    { name: 'Foresight', spice: true,
      effect: 'Consume two spice assets: at scene start, ask the GM two questions about the coming scene or alter one of its defining attributes — then suffer a consequence of the GM’s choosing.',
      auto: { type: 'narrative' } },
    { name: 'Shortening the Way', spice: true,
      effect: 'Consume one spice asset: for the rest of the scene, all your Move tests are one step of Difficulty lower.',
      auto: { type: 'narrative' } },
    { name: 'Voice of the Inner Dark', spice: true,
      effect: 'Consume one spice asset: ask the GM one question that past/ancestral memory might answer; gain Exhausted for a day. Using it again within that day works, then the character dies.',
      auto: { type: 'narrative' } },
  ],

  // ---------- Fremen + Spice focuses ----------
  focuses: [
    { skill: 'understand', name: 'Desert Navigation', desc: 'Orienting yourself in the open desert.' },
    { skill: 'discipline', name: 'Fremen Crafting', desc: 'Patient making — weaving, ropemaking, and the like.' },
    { skill: 'understand', name: 'Fremen Culture', desc: 'The ways of the Fremen people.' },
    { skill: 'understand', name: 'Fremen Technology', desc: 'Repairing and building stillsuits, fremkits, and such.' },
    { skill: 'discipline', name: 'Forging', desc: 'Crafting metal items at a forge or furnace.' },
    { skill: 'discipline', name: 'Interpretation', desc: 'Reading signs, dreams, and visions (or believing you can).' },
    { skill: 'communicate', name: 'Leadership', desc: 'Making people want to follow you, not merely obey.' },
    { skill: 'discipline', name: 'Metalwork', desc: 'Working forged metal into small items of art or utility.' },
    { skill: 'battle', name: 'Pistol', desc: 'Firearms such as maula pistols or dartguns.' },
    { skill: 'discipline', name: 'Pottery', desc: 'Crafting ceramic goods for art or utility.' },
    { skill: 'battle', name: 'Rifle', desc: 'Non-lasgun rifle weapons.' },
    { skill: 'communicate', name: 'Speechmaking', desc: 'Swaying a large crowd with an idea or command.' },
    { skill: 'discipline', name: 'Stillness', desc: 'Holding a quiet, meditative posture for hours — for ambush or to stay unseen.' },
    { skill: 'discipline', name: 'Stonemason', desc: 'Working and carving stone for art or building.' },
    { skill: 'understand', name: 'Weather Lore', desc: 'Reading weather patterns and coming storms.' },
    { skill: 'discipline', name: 'Woodcarving', desc: 'Constructing wooden items for art or utility.' },
  ],

  // ---------- Fremen life events (character-background d20 table) ----------
  lifeEvents: {
    rollDie: 'd20',
    table: [
      { range: '1–3', name: 'Child of the Storm', desc: 'Born during a devastating sandstorm — marked as special, carrying a sense of grand destiny.' },
      { range: '4–7', name: 'Orphaned', desc: 'Raised by the tribe after both parents died; kindly kept, but never free of the loss.' },
      { range: '8–10', name: 'Water Thief', desc: 'Once falsely accused of the ultimate crime and cleared it — but the taint clings to you.' },
      { range: '11–13', name: 'Chosen of Shai-Hulud', desc: 'Sworn to become a great worm-rider, whatever sacrifices or enemies it costs.' },
      { range: '14–16', name: 'Blood Feud', desc: 'Bound into a smouldering feud of honour that has not yet — but may soon — turn to slaughter.' },
      { range: '17–18', name: 'Lover of Battle', desc: 'Legendary skill at arms, but a feared battle-lust you must keep in check.' },
      { range: '19–20', name: 'True Believer', desc: 'A fanatic certain you will serve at Muad’Dib’s side in the coming jihad.' },
    ],
  },

  // ---------- Spice as an asset + the addiction trait ----------
  spice: {
    talentNote: 'Spice talents work like any other talent but require ingesting spice to activate; some require taking spice regularly.',
    addictionTrait: 'Spice Addicted',
    addictionNote: 'A character taking spice regularly gains the trait “Spice Addicted”: without their ration they suffer withdrawal (spice talents disabled, usable as a complication). Even when supplied, it marks a weakness and a cost their House is paying for.',
    asset: {
      name: 'Spice (melange)',
      quality: 0,
      keywords: ['Drug', 'Geriatric', 'Knowledge', 'Prophecy'],
      desc: 'A tube or canister of melange — one adult dose, as essence, capsules, or gas. A bargaining chip, a mark of prestige, and the key to certain traits and talents when ingested.',
    },
  },
};
