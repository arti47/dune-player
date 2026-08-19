// data-help.js — plain-language "how to use this" copy for every app surface.
//
// NOT rules content (§10.8/§12): this is UI guidance written for someone who has never read the
// rulebook and has never played a tabletop RPG. Rules numbers are never restated here — where a
// number matters the surface itself shows it, and the ⓘ links go to the rules library.
//
// Shape per entry: { steps: [..], example: '..' }. Rendered as a collapsed "How to use" accordion
// by src/help.js. Keep steps to 3–6 short imperatives; keep the example concrete.

export const HELP = {
  // ---------- first run ----------
  firstRun: {
    steps: [
      'Take the tutorial if you have never played this game — it teaches the dice in a few minutes and nothing you do there is saved.',
      'Make a character: use the 8-step wizard, or tap "Play an iconic" to start instantly as a character from the novels.',
      'Open the Sheet tab. That is your character and every button you need in play.',
      'Press "⚂ Roll a test" whenever you try something risky. The app does the maths.',
      'Playing without a gamemaster? Switch on solo play and the app runs the world for you.',
    ],
    example: 'Never played before? Tutorial → "Play an iconic" → Sheet → ⚂ Roll a test. You are playing within five minutes.',
  },

  // ---------- the persistent resource bar ----------
  pools: {
    steps: [
      'Momentum is the group’s pool of good luck. You earn it by rolling better than you needed, and spend it to buy extra dice or extra effects.',
      'Threat is the gamemaster’s version of the same pool. It grows when you take shortcuts, and the GM spends it to make life harder.',
      'Determination is personal grit. You start each adventure with some and spend it to re-roll dice or force a moment to go your way.',
      'You rarely need to touch these buttons — rolling a test adjusts them for you. Use − and + only to correct a mistake.',
    ],
    example: 'You roll 3 successes when you only needed 1. The 2 spare successes become Momentum, and the bar goes up on its own.',
  },

  // ---------- character sheet ----------
  sheet: {
    steps: [
      'Skills and Drives are your two halves: add one of each together and that is the number you must roll under.',
      'Focuses are things you are specially trained in — they make good rolls better.',
      'Talents are special abilities. The roller offers them automatically when they apply.',
      'Traits are short truths about your situation ("Injured", "Well-armed"). Negative ones make tests harder.',
      'Assets are the useful things you have. Everything else on this page updates itself as you play.',
    ],
    example: 'Battle 6 + Duty 8 = 14. Press ⚂ Roll a test, pick Battle and Duty, and every die that rolls 14 or under succeeds.',
  },

  roller: {
    steps: [
      'Pick the skill that matches what you are doing, and the drive that matches why you are doing it.',
      'The gamemaster (or you, solo) sets the Difficulty — how many dice have to succeed. One is normal.',
      'Roll. Dice at or under your number succeed; spares become Momentum. A 20 causes a complication — a snag, not a failure.',
      'Anything else on the dialog is optional. Ignore it until you want it.',
      'Press Apply to save the result and update your pools.',
    ],
    example: 'Climbing a wall: Move + Duty, Difficulty 1. You roll 7 and 19 — the 7 succeeds, so you are up.',
  },

  lifecycle: {
    steps: [
      'A scene is one place and moment — a conversation, a fight, a search.',
      'Press End scene when it is over. Momentum drains a little and temporary advantages expire.',
      'An adventure is a whole story, usually several sessions. Press End adventure at the end of one.',
      'Both show you exactly what changed, and both can be undone immediately if you pressed the wrong one.',
    ],
    example: 'The negotiation ends and you walk out. End scene → "Momentum 4 → 3, 1 temporary asset expired."',
  },

  tasks: {
    steps: [
      'Use this for anything too big for a single roll — repairing a ship, riding a sandworm, digging someone out.',
      'Name the job and set how many points it needs. The gamemaster decides; bigger jobs need more.',
      'Each time you succeed at a related roll, press Record success to add points.',
      'When the bar fills, the job is done.',
    ],
    example: 'Repair the ornithopter, requirement 6. Two good rolls score 3 each and it flies again.',
  },

  conflict: {
    steps: [
      'Start a conflict when people fight, chase, spy on, or argue against each other.',
      'Add everyone involved to Side A or Side B — your characters and their opposition.',
      'Zones are just places: "the courtyard", "the balcony". Move people between them.',
      'Press ⚔ Attack to act against someone; the app rolls both sides and tracks the damage.',
      'When someone fills their defeat track they are out of the scene — beaten, not necessarily dead.',
    ],
    example: 'A duel: you in "the floor", the assassin in "the balcony". Move to the balcony, then ⚔ Attack.',
  },

  defeat: {
    steps: [
      'This bar tracks how close you are to being taken out of the scene.',
      'Losing a contest adds hits to it; the requirement is how many you can take.',
      'When it fills you are defeated — captured, knocked out, humiliated. Defeat is not death.',
      'Resist Defeat lets you stay in the scene once per scene, at the cost of a complication.',
      'Afterwards an ally can help you recover with an extended task.',
    ],
    example: 'Your track hits 6 of 6 in a duel. Resist Defeat: you stay on your feet, but gain the trait "Bleeding".',
  },

  advancement: {
    steps: [
      'You earn points for pushing your ambition, being defeated, failing hard tests, and surviving the gamemaster’s worst.',
      'Press the button that matches what happened to add points.',
      'Press Purchase an advance to spend them on a better skill, a new focus, a new talent, or better gear.',
      'You can only buy one advance per adventure, so pick the one you want most.',
    ],
    example: 'You failed a daunting test and the story moved on: press "Failure" for a point.',
  },

  rollLog: {
    steps: [
      'Every roll you apply is recorded here, newest first.',
      'Use it to check what happened a moment ago, or to copy a result into your notes.',
      'Press × on a row to remove a mistaken roll, or Clear all to empty the log.',
    ],
    example: 'You are unsure whether that last test succeeded — the top row shows the dice and the result.',
  },

  // ---------- other tabs ----------
  house: {
    steps: [
      'Your House is your family and its holdings — shared by everyone at the table, not owned by one character.',
      'Collect income once per year of game time, then pay upkeep for your soldiers, people, and lifestyle.',
      'Spend what is left on ventures: build things, chase opportunities, improve the House.',
      'End the year when you are done, and the cycle starts again.',
      'You can load one of the famous Houses instead of building your own.',
    ],
    example: 'Collect income → Wealth 82. Pay upkeep → −48. Spend the rest on a venture to build a new spice refinery.',
  },

  gm: {
    steps: [
      'This screen is for whoever runs the game. Players do not need it.',
      'Threat is your budget for making the players’ lives harder — spend it to raise difficulties and let enemies act.',
      'Party shows every character at a glance so you can set difficulties fairly.',
      'The generators invent story hooks and enemies when you need something now.',
      'The compendium has ready-made opponents with full statistics.',
    ],
    example: 'Players walk into an ambush: roll a hook for the reason, pull a Sardaukar block from the compendium, spend Threat to open the fight.',
  },

  rules: {
    steps: [
      'This is the reference, not a tutorial — look things up when a term confuses you.',
      'Type in the search box to filter; every mechanic in the game has a card.',
      'The ⓘ links elsewhere in the app jump straight to the matching card.',
      'If you are brand new, take the tutorial first — it teaches the same things by playing them.',
    ],
    example: 'The roller says "complication" and you do not know what that means: search "complication".',
  },

  settings: {
    steps: [
      'Toggles add optional parts of the app. Everything is off by default so the app starts simple.',
      'Turn on an expansion only if you own that book — it adds extra talents, characters, and gear.',
      'Turn on the GM screen if you run the game; the Journal and Meaning Tables if you play alone.',
      'Back up your characters to a file here, and restore them on another device.',
    ],
    example: 'Playing solo? Switch on Journal and Meaning Tables, and a new tab appears with the tools.',
  },

  // ---------- plain-language glossary (rules library) ----------
  glossary: [
    ['Skill', 'One of five broad abilities (Battle, Communicate, Discipline, Move, Understand), rated 4–8.'],
    ['Drive', 'One of five motivations (Duty, Faith, Justice, Power, Truth), rated 4–8. Why you act.'],
    ['Target number', 'Skill + Drive. Roll a d20 at or under it to score a success.'],
    ['d20', 'A twenty-sided die. You normally roll two.'],
    ['Difficulty', 'How many successes a task needs. 1 is ordinary; 0 is trivial; 3+ is hard.'],
    ['Success', 'One die that rolled at or under your target number.'],
    ['Momentum', 'The group’s shared pool of spare successes. Spend it for extra dice and effects.'],
    ['Threat', 'The gamemaster’s pool for complicating your life. Your shortcuts feed it.'],
    ['Determination', 'Personal grit. Spend it to re-roll dice or force a moment your way.'],
    ['Focus', 'A speciality that widens what counts as a great roll on matching tests.'],
    ['Talent', 'A special ability. The app offers yours automatically when they apply.'],
    ['Trait', 'A short truth about you or the scene that makes things easier, harder, or impossible.'],
    ['Complication', 'A snag, not a failure — something goes wrong alongside whatever you rolled.'],
    ['Asset', 'Equipment, allies, or advantages you can bring to bear. Quality is how good it is.'],
    ['Drive statement', 'A sentence saying what a drive means to you. It unlocks Determination.'],
    ['Ambition', 'Your character’s long-term goal. Chasing it earns advancement points.'],
    ['Extended task', 'A job too big for one roll, tracked with points over several rolls.'],
    ['Defeat', 'Being taken out of a scene — beaten, captured, humiliated. Not automatically death.'],
    ['Archetype', 'Your character’s role, like Duelist or Mentat. It sets your starting shape.'],
    ['House', 'Your noble family and its holdings, shared by everyone at the table.'],
    ['Chaos Factor', 'Solo play only: how unstable the story is. It decides whether scenes go to plan.'],
    ['Oracle', 'Solo play only: dice that answer yes/no questions when there is no gamemaster.'],
  ],
};
