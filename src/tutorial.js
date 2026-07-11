// tutorial.js — Phase 7 Onboarding & Tutorial (§13 design decisions).
// A modular, opt-in guided sample session (§13 #1/#2): the learner picks a pregen (#8) and
// works through self-contained lesson widgets that reuse the REAL engine (#6) with scripted
// dice (#7). Teaching state is a disposable in-memory sandbox (#3) — nothing here touches the
// player's saved characters or pools. The "Create your character" lesson hands off to the real
// wizard (#3). Reachable from the first-launch prompt + Settings only (#4).

import { el, clamp } from './core.js';
import { showToast } from './ui.js';
import { Settings } from './settings.js';
import { evaluateDice } from './roller.js';
import { targetNumber, normalizeCharacter, clampMomentum, clampDetermination } from './derived.js';
import { startCharacterWizard } from './wizard.js';
import { cite } from './cite.js';
import { DATA } from '../data.js';
import { PREGENS } from '../data-pregens.js';

const SKILLS = DATA.skills;
const DRIVE_NAME = Object.fromEntries(DATA.drives.map((d) => [d.id, d.name]));
const goto = (id) => { location.hash = `#/${id}`; };

// Disposable teaching state — a pregen clone + a local Momentum/Threat pool. Never persisted.
let sandbox = null;
function makeSandbox(pregen) {
  const char = normalizeCharacter({ id: 'tutorial-sandbox', identity: { ...pregen.identity }, ...pregen });
  return { char, pregenId: pregen.pregenId, pools: { momentum: 0, threat: 0, determination: char.determination ?? 1 } };
}
function pregenById(id) { return PREGENS.find((p) => p.pregenId === id) || null; }

// ---------- lesson catalogue (§13 #5: six full-core lessons) ----------
// Each lesson: { id, title, summary, available, beats(sandbox) → [{ title, render(container) }] }.
export const LESSONS = [
  {
    id: 'first-test', title: 'Your first test', available: true,
    summary: 'Roll 2d20 against Skill + Drive — successes, crits, and complications.',
    beats: firstTestBeats,
  },
  { id: 'pools', title: 'Momentum, Threat & Determination', available: true,
    summary: 'The three shared/personal resources that power the game.', beats: poolsBeats },
  { id: 'drives', title: 'Drives & statements', available: false,
    summary: 'Why your drives and their statements matter — and how they earn Determination.' },
  { id: 'create', title: 'Create your character', available: false,
    summary: 'Hand off to the real 8-step wizard and build a keeper.' },
  { id: 'conflict', title: 'Conflict & defeat', available: false,
    summary: 'Opposed tests, defeat tracks, and staying in the fight.' },
  { id: 'lifecycle', title: 'Scene lifecycle & advancement', available: false,
    summary: 'Ending scenes/adventures and spending advancement.' },
];

// ---------- screen ----------
export function renderTutorial(root) {
  const render = () => { root.replaceChildren(); build(root, render); };
  build(root, render);
}

function build(root, render) {
  // Restore the demo character from the remembered pregen (§13 #8) if one was chosen before.
  if (!sandbox) {
    const saved = pregenById(Settings.tutorial().pregenId);
    if (saved) sandbox = makeSandbox(saved);
  }
  if (!sandbox) { renderPicker(root, render); return; }
  renderMenu(root, render);
}

// §13 #8 — the learner picks a pregen to teach with.
function renderPicker(root, render) {
  root.append(el('section', { class: 'card' },
    el('h2', {}, 'Learn to play'),
    el('p', { class: 'small muted' },
      'A short, hands-on tour of Dune: Adventures in the Imperium — using the app’s real dice engine, with scripted rolls so every example lands the same way. Nothing here touches your saved characters.'),
    el('p', { class: 'small' }, 'First, pick an iconic character to learn with:'),
    el('ul', { class: 'char-list' }, ...PREGENS.map((p) => el('li', {},
      el('button', { class: 'btn secondary', style: 'width:100%;text-align:left',
        onclick: () => { sandbox = makeSandbox(p); Settings.setTutorial({ pregenId: p.pregenId }); render(); } },
        `${p.identity.name}`,
        el('span', { class: 'small muted' }, ` · ${p.identity.archetype || 'Iconic'}`)))))));
  root.append(el('section', { class: 'card' },
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn secondary', onclick: () => goto('home') }, 'Exit tutorial'))));
}

function renderMenu(root, render) {
  const done = new Set(Settings.tutorial().completedLessons);
  const c = sandbox.char;
  root.append(el('section', { class: 'card' },
    el('h2', {}, 'Lessons'),
    el('p', { class: 'small muted' }, `Learning with ${c.identity.name}. Pick any lesson — do them in order the first time.`),
    el('ul', { class: 'char-list' }, ...LESSONS.map((l) => {
      const isDone = done.has(l.id);
      const row = el('li', {},
        el('div', {},
          el('span', {}, l.title),
          isDone ? el('span', { class: 'tag' }, '✓ done') : (l.available ? null : el('span', { class: 'tag' }, 'coming soon')),
          el('p', { class: 'small muted' }, l.summary)));
      if (l.available) {
        const btn = el('button', { class: 'btn', style: 'margin-top:6px', onclick: () => runLesson(root, l, render) }, isDone ? 'Replay' : 'Start');
        row.append(btn);
      }
      return row;
    }))));
  root.append(el('section', { class: 'card' },
    el('div', { class: 'cta-row' },
      el('button', { class: 'btn secondary', onclick: () => { sandbox = null; Settings.setTutorial({ pregenId: null }); render(); } }, 'Change character'),
      el('button', { class: 'btn secondary', onclick: () => goto('home') }, 'Exit tutorial'))));
}

// ---------- lesson runner (stepped beats with Back/Next/Finish) ----------
function runLesson(root, lesson, backToMenu) {
  let i = 0;
  const beats = lesson.beats(sandbox);
  const draw = () => {
    root.replaceChildren();
    const body = el('div', {});
    beats[i].render(body);
    root.append(el('section', { class: 'card' },
      el('p', { class: 'small muted' }, `${lesson.title} · step ${i + 1} of ${beats.length}`),
      el('h2', {}, beats[i].title),
      body,
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn secondary', onclick: () => { i > 0 ? (i--, draw()) : backToMenu(); } }, i > 0 ? 'Back' : 'Menu'),
        i < beats.length - 1
          ? el('button', { class: 'btn', onclick: () => { i++; draw(); } }, 'Next')
          : el('button', { class: 'btn', onclick: () => { Settings.markLessonDone(lesson.id); showToast('Lesson complete'); backToMenu(); } }, 'Finish'))));
  };
  draw();
}

// ---------- a reusable scripted-dice widget (§13 #6/#7) ----------
// Rolls the REAL evaluateDice against fixed `values` so the lesson is deterministic.
function scriptedRoll(values, { tn, skillRating, focus = false, difficulty }) {
  const dice = evaluateDice(values, { tn, skillRating, focus });
  const successes = dice.reduce((n, d) => n + d.successes, 0);
  const complications = dice.filter((d) => d.complication).length;
  const passed = successes >= difficulty;
  const chip = (d) => el('span', {
    class: 'die ' + (d.complication ? 'comp' : d.crit ? 'crit' : d.success ? 'hit' : 'miss'),
    title: d.complication ? 'natural 20 — complication' : d.crit ? 'crit (2 successes)' : d.success ? '1 success' : 'miss',
  }, String(d.value));
  return {
    successes, complications, passed,
    node: el('div', {},
      el('div', { class: 'dice-row' }, ...dice.map(chip)),
      el('p', { 'aria-live': 'polite' },
        el('span', { class: 'pill' }, `${successes} success${successes === 1 ? '' : 'es'}`),
        el('span', { class: 'pill' }, passed ? `+${Math.max(0, successes - difficulty)} Momentum` : 'failed vs Difficulty ' + difficulty),
        complications ? el('span', { class: 'pill danger-pill' }, `${complications} complication${complications === 1 ? '' : 's'}`) : null)),
  };
}

// ---------- Lesson 7b: Your first test ----------
function firstTestBeats(sb) {
  const c = sb.char;
  // A stable choice for the lesson: the pregen's best skill + a drive with a statement.
  const skillId = SKILLS.slice().sort((a, b) => c.skills[b.id] - c.skills[a.id])[0].id;
  const driveId = Object.keys(c.driveStatements || {})[0]
    || Object.keys(c.drives).sort((a, b) => c.drives[b] - c.drives[a])[0];
  const state = { skill: skillId, drive: driveId, difficulty: 1 };
  const tn = () => targetNumber(c, state.skill, state.drive);
  const skillRating = () => c.skills[state.skill];

  return [
    { title: 'What a test is', render: (b) => {
      b.append(
        el('p', { class: 'small' }, `Almost everything in the game is a skill test. You build a dice pool of 2d20 and try to roll low.`, cite('Skill test basics')),
        el('p', { class: 'small' }, `Each die that rolls at or under your Target Number scores 1 success. Your Target Number is a Skill + a Drive — both rated 4–8.`),
        el('p', { class: 'small muted' }, `${c.identity.name} will show you how.`));
    } },
    { title: 'Build the Target Number', render: (b) => {
      const skillSel = el('select', { 'aria-label': 'Skill' }, ...SKILLS.map((s) =>
        el('option', { value: s.id, selected: state.skill === s.id ? '' : null }, `${s.name} ${c.skills[s.id]}`)));
      const driveSel = el('select', { 'aria-label': 'Drive' }, ...Object.keys(c.drives).map((d) =>
        el('option', { value: d, selected: state.drive === d ? '' : null }, `${DRIVE_NAME[d] || d} ${c.drives[d]}`)));
      const tnPill = el('span', { class: 'pill' }, `Target number ${tn()}`);
      skillSel.addEventListener('change', () => { state.skill = skillSel.value; tnPill.textContent = `Target number ${tn()}`; });
      driveSel.addEventListener('change', () => { state.drive = driveSel.value; tnPill.textContent = `Target number ${tn()}`; });
      b.append(
        el('p', { class: 'small' }, 'Pick a Skill and a Drive. Watch the Target Number — it’s just the two added together.'),
        el('div', { class: 'field' }, el('span', {}, 'Skill'), skillSel),
        el('div', { class: 'field' }, el('span', {}, 'Drive'), driveSel),
        el('p', {}, tnPill));
    } },
    { title: 'Roll the dice', render: (b) => {
      // Scripted: a natural 1 (crit → 2 successes) + a die 2 under the TN (a normal success).
      const values = [1, Math.max(2, tn() - 2)];
      const r = scriptedRoll(values, { tn: tn(), skillRating: skillRating(), difficulty: 1 });
      b.append(
        el('p', { class: 'small' }, `Here's a roll against Target Number ${tn()} at Difficulty 1 (you need 1 success):`),
        r.node,
        el('p', { class: 'small muted' }, `A natural 1 is a critical hit — it counts as 2 successes. Extra successes past the Difficulty become Momentum, a shared resource you'll meet next lesson.`));
    } },
    { title: 'Crits, focuses & complications', render: (b) => {
      const badValues = [20, Math.max(2, skillRating() - 1)];
      const r = scriptedRoll(badValues, { tn: tn(), skillRating: skillRating(), focus: true, difficulty: 2 });
      b.append(
        el('p', { class: 'small' }, `A focus widens your crit range: with an applicable focus, any die at or under your Skill rating (${skillRating()}) crits, not just a natural 1.`),
        el('p', { class: 'small' }, `And a natural 20 always causes a complication — a snag the GM introduces. Here's a focused roll at Difficulty 2 that both crits and complicates:`),
        r.node,
        el('p', { class: 'small muted' }, 'You can buy off a complication for 2 Threat, or spend Determination to re-roll — more on those soon.', cite('Complications')));
    } },
    { title: 'You’ve got it', render: (b) => {
      b.append(
        el('p', { class: 'small' }, 'That’s the core loop: pick Skill + Drive, roll 2d20, count successes at/under the Target Number, beat the Difficulty.'),
        el('p', { class: 'small' }, 'On your real characters, the sheet’s “⚂ Roll a test” button does all this for you — buying dice, focuses, Determination, and talents included.'),
        el('p', { class: 'small muted' }, 'Next up: Momentum, Threat & Determination.'));
    } },
  ];
}

// ---------- Lesson 7c: Momentum, Threat & Determination ----------
function poolsBeats(sb) {
  const c = sb.char;
  const MOM_CAP = clampMomentum(99);           // read the real caps from the engine (data-driven)
  const DET_CAP = clampDetermination(99);
  const hasStatement = Object.values(c.driveStatements || {}).some((s) => s && s.text && !s.challenged);
  const pill = (label, cls) => el('span', { class: 'pill' + (cls ? ' ' + cls : '') }, label);

  // A live, self-contained resource widget over the disposable sandbox pools (never persisted).
  const momentumWidget = () => {
    const wrap = el('div', {});
    const draw = () => { const p = sb.pools; wrap.replaceChildren(
      el('p', {}, pill(`Momentum ${p.momentum}/${MOM_CAP}`)),
      el('div', { class: 'cta-row' },
        el('button', { class: 'btn secondary', onclick: () => { p.momentum = clampMomentum(p.momentum + 2); draw(); } }, '+2 from extra successes'),
        el('button', { class: 'btn secondary', disabled: p.momentum < 1 ? '' : null, onclick: () => { p.momentum = clampMomentum(p.momentum - 1); draw(); } }, 'Obtain Information (−1)'),
        el('button', { class: 'btn secondary', disabled: p.momentum < 3 ? '' : null, onclick: () => { p.momentum = clampMomentum(p.momentum - 3); draw(); } }, 'Buy a 3rd die (−3)'))); };
    draw(); return wrap;
  };
  const threatWidget = () => {
    const wrap = el('div', {});
    const draw = () => { const p = sb.pools; wrap.replaceChildren(
      el('p', {}, pill(`Threat ${p.threat}`, 'danger-pill')),
      el('div', { class: 'cta-row' },
        el('button', { class: 'btn secondary', onclick: () => { p.threat += 1; draw(); } }, 'Give the GM 1 Threat (skip spending Momentum)'),
        el('button', { class: 'btn secondary', disabled: p.threat < 2 ? '' : null, onclick: () => { p.threat = Math.max(0, p.threat - 2); draw(); } }, 'GM raises a Difficulty (−2)'))); };
    draw(); return wrap;
  };
  const detWidget = () => {
    const wrap = el('div', {});
    const draw = () => { const p = sb.pools; wrap.replaceChildren(
      el('p', {}, pill(`Determination ${p.determination}/${DET_CAP}`)),
      el('div', { class: 'cta-row' },
        el('button', { class: 'btn secondary', disabled: (p.determination < 1 || !hasStatement) ? '' : null, onclick: () => { p.determination = clampDetermination(p.determination - 1); draw(); } }, 'Spend 1 to re-roll'),
        el('button', { class: 'btn secondary', onclick: () => { p.determination = clampDetermination(p.determination + 1); draw(); } }, 'Earn 1 (new statement)')),
      hasStatement ? null : el('p', { class: 'small muted' }, `${c.identity.name} has no unchallenged drive statement, so Determination can’t be spent — that’s the gate.`)); };
    draw(); return wrap;
  };

  return [
    { title: 'Three resources', render: (b) => {
      b.append(
        el('p', { class: 'small' }, 'Three pools flow around the table: '),
        el('ul', {},
          el('li', { class: 'small' }, el('strong', {}, 'Momentum'), ' — the players’ shared pool of extra successes.'),
          el('li', { class: 'small' }, el('strong', {}, 'Threat'), ' — the GM’s mirror pool, spent to make life harder.'),
          el('li', { class: 'small' }, el('strong', {}, 'Determination'), ' — your character’s personal grit.')),
        el('p', { class: 'small muted' }, 'These are the demo pools — nothing here changes your real game.'));
    } },
    { title: 'Momentum — the shared pool', render: (b) => {
      b.append(
        el('p', { class: 'small' }, `Beat a test with successes to spare and the extras become Momentum, shared by the whole group. Spend it to buy dice, obtain information, create assets, and more.`, cite('Momentum spends')),
        momentumWidget(),
        el('p', { class: 'small muted' }, `It caps at ${MOM_CAP}, and it drops by 1 at the end of every scene — so use it or lose it.`));
    } },
    { title: 'Threat — the GM’s mirror', render: (b) => {
      b.append(
        el('p', { class: 'small' }, 'Any time you could spend Momentum, you can instead hand the GM that much Threat. The GM banks it, then spends it to buy NPC dice, raise your Difficulty, or bring a rival onto the scene.', cite('Threat spends (GM)')),
        threatWidget(),
        el('p', { class: 'small muted' }, 'Threat is the price of pushing your luck — every point you give now can bite later.'));
    } },
    { title: 'Determination — personal grit', render: (b) => {
      b.append(
        el('p', { class: 'small' }, `Determination is yours alone (cap ${DET_CAP}). Spend 1 to re-roll dice, or to turn one die into a guaranteed success — but only when a drive statement supports what you’re doing.`, cite('Determination')),
        detWidget(),
        el('p', { class: 'small muted' }, 'You earn it back by writing new drive statements or when your drives are challenged — the next lesson.'));
    } },
    { title: 'That’s the economy', render: (b) => {
      b.append(
        el('p', { class: 'small' }, 'Momentum fuels the players, Threat fuels the GM, and Determination is your personal reserve. On a real sheet these live in the header bar above every in-play screen.'),
        el('p', { class: 'small muted' }, 'Next up: Drives & statements — where Determination comes from.'));
    } },
  ];
}
