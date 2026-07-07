# Imperium Player — Project Canonical Spec (CLAUDE.md)

> Instantiated from "RPG Player-Character App — Autonomous Build Instructions" after the
> Stage B checkpoint sign-off (2026-07-06). This file is the project's **living canonical
> spec**: every code change updates it in the same change (features, data model, file
> tables, roadmap checkboxes, changelog). A code change with a stale CLAUDE.md is
> incomplete.
>
> **Rulebook source:** the user's NotebookLM notebook **"Dune RPG"**
> (id `88b91692-f24b-4a50-82f1-2060c525a600`) containing the *Dune: Adventures in the
> Imperium* Core Rulebook + 5 sourcebooks. Notebook answers are non-deterministic —
> corroborate surprising values with a second, differently-phrased query before recording.
> Never substitute training-data memory for the source.

---

## 1. What we are building

| | |
|---|---|
| **Game** | *Dune: Adventures in the Imperium* (Modiphius 2d20) — core rules only |
| **App name** | **Imperium Player** |
| **Audience** | Players (player-facing tool with opt-in GM screen) |
| **Platforms** | Phone, browser, desktop — one installable PWA |
| **Core job** | Character + House creation wizards · full in-play tracker · native 2d20 dice engine |
| **Multiplayer** | Multiple characters per device + real-time shared party & conflict tracker |
| **Backend** | Firebase Realtime Database + Storage; offline-capable; runs keyless in local mode |
| **Theme** | Desert trade-dress (no copied art/logos): sand/bone parchment light mode, night-desert dark mode, spice-orange accent, sharp geometric/monoline type. Default follows system (`prefers-color-scheme`); in-app toggle overrides. |

**Mandatory scope:** creation wizard (character + House) · full in-play sheet · native dice
engine · assets & Determination tracking · searchable rules library · NPC compendium ·
Firebase multiplayer party with shared conflict tracker · GM screen.
**Conditional resolution (from checkpoint):** solo mode **omitted** (no official rules) ·
`power-automation.js` **omitted** (powers are talents; their embedded effects live in the
roller/talent layer) · pregens **included** (iconic characters, book-sanctioned) ·
5 expansion sourcebooks behind toggles (rules crunch only, never campaign plot).

### 1.1 Product decisions (plan review Q&A, 2026-07-06)

1. **Local-first.** Build and playtest the single-device experience first. Architecture
   stays Firebase-ready (locked schema, roles from day one), but **Phase 5 starts only
   after the First Session Playable milestone passes at a real session.**
2. **The user is a player** (not GM). Player surfaces (sheet, roller, Determination) are
   the heart; GM screen remains late and toggle-gated as planned.
3. **Dice are digital only.** Tap-to-roll; no manual physical-dice entry mode.
4. **Expansion commitment:** Sand and Dust, The Great Game, Power and Pawns =
   **committed** toggles; Masters of Dune, Fall of the Imperium = **stretch** (toggle
   architecture kept, extraction only if requested).
5. **Mixed devices** at the table — even responsive effort across the range; no form
   factor beyond the locked 360px-first baseline gets special treatment.
6. **Theme default: follow system**, toggle overrides (stored explicitly).

**Review improvements adopted:** First Session Playable milestone (after Phase 3) ·
JSON export/import backup (Phase 2) · lifecycle events get confirmation summary +
one-step undo (Phase 4) · persistent Momentum/Threat/Determination header on all in-play
screens (Phase 2) · every automated rule surface links to its rules-library entry (T38
citations, Phase 3).

---

## 2. Rulebook ingestion rules (carried over)

- Every number, list, table, formula, and procedure comes **from the notebook source**.
  Missing value → query the notebook; still missing → ask the user or mark blocked. Never
  fill gaps from memory of the game.
- **Extraction is complete, not sampled.** All ~53 talents, all ~40 assets, all ~35–40 NPC
  stat blocks, all 18 archetypes, all 5 faction templates, all focus example lists, all
  House domains/roles/enemy tables go into the data files.
- Corroborate surprising notebook answers with a second, differently-phrased query.
- **Paraphrase, don't copy.** Extract numbers and mechanics; rewrite all effect/flavor
  text concisely. No setting, adventure, art, or logo content (Core Ch. 2 lore and Ch. 10
  adventure are excluded).

---

## 2.1 Data Extraction Ledger — the complete table inventory

> **How to continue (for any AI resuming this project):** this ledger is the single
> to-do list for rulebook data. Work top to bottom within the current roadmap phase
> (§9: 0a → 0e, expansions in Phase 6). For each item: query the notebook
> (id `88b91692-f24b-4a50-82f1-2060c525a600`), corroborate surprising values with a
> re-phrased query, write the table into the target file (paraphrased, cited to
> chapter), then tick the checkbox **in the same change** and append a changelog row.
> Estimated counts ("~") are notebook estimates — extraction is complete-not-sampled,
> the real count wins; record it next to the item when done. An unticked box = data
> not yet extracted; never build UI against an unticked table.

### `data.js` — core mechanics (roadmap 0a)
- [x] **T01 Skills list** (5) — names + full descriptions (enriched to the book's wording, incl. Discipline's overt-authority-over-others nuance) + short tag *(2026-07-06)*
- [x] **T02 Drives list** (5) — names + full descriptions (Faith-in-faction/friends, Justice-can-uphold-bad-laws, Power-as-ego, Truth-even-if-dangerous) + short tag *(2026-07-06)*
- [x] **T03 Focus example lists** — real counts: Battle 13 · Communicate 19 · Discipline 9 · Move 14 · Understand 27 = **82** *(2026-07-06)*
- [x] **T04 Difficulty ladder** — 0–5, names + example tasks *(2026-07-06)*
- [x] **T05 Momentum spend table** — 9 spends + cap 6 + scene decay *(2026-07-06)*
- [x] **T06 Threat spend table** — 7 spends + NPC spend-instead-of-generate note *(2026-07-06)*
- [x] **T07 Determination table** — earn triggers + 4 spends + cap 3 *(2026-07-06)*
- [x] **T08 Complication effects** — 3 consequences, 2-Threat buy-off, removal paths; example lists for Battle/Communicate/Discipline. **Gap:** Move/Understand example lists absent from source excerpts — re-check during audit *(2026-07-06)*
- [x] **T09 Dice-buying ladder** — 1/2/3 Momentum-or-Threat, max +3 *(2026-07-06)*

### `data.js` — creation options (roadmap 0b)
- [x] **T10 Archetype table** — real count **20** (initial notebook extraction missed **Smuggler** (Move/Battle · Pilot, Unobtrusive · Subtle Step) and **Strategist** (Understand/Battle · Kanly, Strategy · Master-at-Arms); added 2026-07-06 from the owner's book). Each carries primary/secondary skills, 2 suggested focuses, 1 suggested talent, a paraphrased `desc`, and `driveSuggestions`. **Scout ruling #5:** the printed entry lists 1 focus + 2 "talents" (Endurance, Stealth), breaking the standard 2-focus/1-talent shape — reconciled to focuses [Endurance, Stealth] + talent [Putting Theory into Practice] (the only one of the three that exists in the talent catalog) *(2026-07-06)*
- [x] **T11 Faction template table** (5) — traits + mandatory talents (Fremen/Mentat are choose-one lists, "any may be taken in place of another talent choice"; BG/Guild/Suk are fixed) + suggested archetypes + paraphrased `desc` + `factionIntro` cautions. All suggested archetypes now resolve to real entries (Strategist/Smuggler added). "Mind Place" template typo + "Foreknowledge" no-catalog-entry gap retained as notes *(2026-07-06)*
- [x] **T12 Creation constants** — full array + count constants incl. max 1 faction template *(2026-07-06)*

### `data.js` — talents (roadmap 0c)
- [x] **T13 Talent catalog** — real count **55** (index estimate was ~53) — name, faction/skill restriction, prerequisite, paraphrased effect, **machine-readable `auto` effect descriptor** for every dice-affecting talent (Voice, Mentat Discipline, Prana-Bindu Conditioning, Calculated Prediction, Adrenaline Shot, Rapid Recovery, Specialist, Bold (Skill), …). Faction counts: BG 4 · Mentat 5 · Suk 3 · Guild 3 · Fremen 1. **Gap:** "Foreknowledge" is printed as a Mentat mandatory-talent option but has no core talent entry — audit item *(2026-07-06)*

### `data.js` — assets & House tables (roadmap 0d)
- [x] **T14 Asset catalog** — real count **85** (index estimate was ~40) — name, category (personal/warfare/espionage/intrigue), tangible (`true`/`false`/`'either'`), baseline Quality + `qualityNote`, `defensive`/`fast` flags, paraphrased rider. Most are Quality 0; notable printed values: troop ladder Conscript 0 · Shield Infantry 1 · Specialist 2 · Elite 3–4 · Fedaykin/Sardaukar 4, Crysknife 1+ *(2026-07-06, troop ladder corroborated)*
- [x] **T15 Wealth price ladder** — tiers 0→+5 with example items + purchase rules (buy free at ≤ Wealth; exactly +1 over costs ½ Wealth point; can't buy 2+ over or luxuries while negative). +4 = personal ornithopter (matches §3.11) *(2026-07-06, corroborated)*
- [x] **T16 House type table** (4) — **SOURCE (owner-confirmed 2026-07-06, revised):** the Core Rulebook House chapter gives the 4 type *names* (`DATA.houseTypes`), the **starting domains per type** (`DATA.houseDomainCounts`: Nascent 0P/1S · Minor 1P/1S · Major 1P/2S · Great 2P/3S), and the GM's **starting Threat per player** (`DATA.houseStartingThreat`: 0/1/2/3). Only the numeric **House skill arrays** are Great Game crunch (`EXPANSION.houseManagement.skillArrays`: Nascent 6/5/5/4/4 · Minor 7/6/6/5/4 · Major 8/7/6/5/4 · Great 9/8/7/6/5, greatGame toggle). *(Prior extraction mis-attributed the domain counts to Great Game; the owner confirmed the House-creation chapter — type/Threat/domains/starting-domains/areas-of-expertise — is Core.)*
- [x] **T17 Domain table** — **SOURCE (owner-confirmed 2026-07-06, revised):** Core gives the 9 domain *names* (`DATA.houseDomains`) **plus the full areas-of-expertise detail** — descriptions + Machinery/Produce/Expertise/Workers/Understanding example lists for all 9 domains (`DATA.houseDomainDetails`), the primary/secondary meaning (`DATA.houseDomainGuidance`), and the subtype definitions (`DATA.houseSubtypeDefs`). Only the numeric **Wealth/Resources income model** is Great Game crunch (`EXPANSION.houseManagement`): base income per asset subtype (× Primary/Secondary) **+** category modifier (societal −3R/+8W vs tangible +3R/−6W primary; halved secondary), floored at 2 R / 10 W. Corroborated Machinery P 12R/32W · Expertise P 6R/44W
- [x] **T18 Homeworld option lists** — `DATA.homeworld.options`: weather / habitation / crimeRate / crimeStance / contentment / publicWealth. Core frames these as guiding questions, not roll tables *(2026-07-06)*
- [x] **T19 House roles list** (13) — `DATA.houseRoles`, each id + name + one-line duty. Matches §3.5 list exactly *(2026-07-06)*
- [x] **T20 House enemy tables** — `DATA.houseEnemies`: d20 Hatred (4 degrees, Dislike = +1 Difficulty) × d20 Reasons. **Correction (corroborated 2026-07-06):** Reasons is **10** entries, not 9 — the 10th is **"No Reason" (19–20)**, missed in the Stage A extraction. Full d20 coverage for both tables. **Added `perType` (corroborated 2026-07-06):** starting-enemy count/make-up scales with House type — Nascent 0 · Minor 1 (a House Minor) · Major 2 (a House Major + a serving House Minor) · Great 3 (a principal enemy — one Great House, OR two Majors, OR a major faction such as the Bene Gesserit/Imperial Court — plus a "host" of allied Minors; the book is open-ended, so the enforced floor reads "host" as 2 Minors). Each enemy carries name + type + Hatred + Reason (+ notes in-app) *(2026-07-06)*
- [x] **T21 House trait examples** — `DATA.houseTraits`: 1 domain trait (matches primary domain) + reputation examples (Honorable/Brutal/Secretive; open-ended). In play, 1 Momentum applies a House trait to a character for a scene *(2026-07-06)*

### `data.js` — conflict & advancement (roadmap 0a/0d)
- [x] **T22 Conflict type definitions** (5) — attack skills: duel/skirmish/warfare = Battle, espionage = Move (vs Discipline/Understand), intrigue = Communicate (vs Discipline/Communicate); asset kinds + lasting-defeat meaning per type; no prescribed drives *(2026-07-06)*
- [x] **T23 Defeat-track formulas** — requirement, 2+Quality progress, 4+Quality recovery, Diff 2 stabilize *(2026-07-06)*
- [x] **T24 Advancement tables** — 6 earn triggers + 5 cost formulas + retraining *(2026-07-06)*
- [x] **T25 Sandworm riding requirements** — 4/8/12/16 *(2026-07-06)*
- [x] **T26 Desert hazard traits** — thirst, exertion, coriolis storm crash, worm sign (core book). **Note:** further named hazards (drum sand, salt pans) live in Sand and Dust *(2026-07-06)*

### `data-npcs.js` (roadmap 0e)
- [x] **T27 NPC tier build rules** — Minor/Notable/Major stat recipes → `NPCS.tierRecipes` in `data-npcs.js`. Minor 6/5/5/4/4 · single Quality-Drive 4–8 (typ 5) · 1 focus (7→2, 8→3) · 0–1 talent · one-hit defeat; Notable 7/6/5/5/4 · drives 7&6 rest 5 · 1 statement · 3 focuses · 1–2 talents · extended-task defeat; Major drives 8/7/6/5/4 · skills 4+11 (cap 8) · 3–5 focuses · 2–4 talents. General: NPCs add/spend 3 Threat for a Determination effect + take NPC Special Abilities in place of talents (list to extract with T28/T29). Corroborates §3.13 *(2026-07-06)*
- [x] **T28 Generic archetype stat blocks** (25) → `NPCS.archetypes`, plus the 6 **NPC Special Abilities** (Proficiency, Threatening, Guidance, Substitution, Familiarity, Additional Threat Option) → `NPCS.specialAbilities`. Full stat blocks (skills/focuses/drives/statements/traits/talents/assets). **Tier is not printed on generic blocks** — inferred from build (skill 8 > Notable array max 7 ⇒ Major: Reverend Mother, Fremen Elder, Fremen Warrior, Sardaukar; rest Notable), flagged `tierInferred` *(2026-07-06)*. Merchant assets (Information Network, Ornithopter, Warehouse) completed from the owner's book *(2026-07-06)*
- [x] **T29 Iconic character stat blocks** — real count **12**, all complete → `NPCS.iconics`: Leto, Jessica, **Paul**, Gurney, Thufir, Duncan, Yueh, Feyd-Rautha, Rabban, Fenring, Stilgar, Liet Kynes. Rabban, Fenring, Paul, and Feyd completed from the **owner's transcription of the printed book** (2026-07-06) — the notebook excerpts had cut off, and had **served Rabban's numbers under Feyd's name** (the printed Feyd differs: Communicate 6, Move 7, Understand 6, Short Blades focus, distinct statements — drives coincidentally matched). Iconic blocks print **no asset lines** (owner-confirmed) — `assets: []` is by design. **No source gaps remain in T29** *(2026-07-06)*

### `data-pregens.js` (roadmap 0e)
- [x] **T30 Iconic pregens** — `PREGENS` in `data-pregens.js`: **all 12 iconics** mapped into PC records (Determination 1, cap 3 — ruling #1), built from `NPCS.iconics` so numbers stay single-sourced; round-trips through `normalizeCharacter` *(2026-07-06)*

### `data.js` — GM screen tables (roadmap 0e)
- [x] **T31 Story Hook Generator** → `DATA.storyHooks`: d20 × 5 columns (Plot/Goal/Location/Hazard/Character). The printed table maps each column to **5 entries over ranges 1–4/5–8/9–12/13–16/17–20** (index = floor((roll−1)/4)) — 100 cells, 25 distinct values *(2026-07-06)*
- [x] **T32 Enemy generator** — no new data: `DATA.houseEnemies` (T20) is already a rollable d20 table (rollDie + ranges on Hatred and Reasons); GM-screen wiring is Phase 6 *(2026-07-06)*

### `data.js` — rules library content (rolling, alongside 0a–0e)
- [ ] **T38 Rules library quick-reference** — a paraphrased, searchable entry for every §3 mechanic (test flow, opposed tests, extended tasks, Momentum/Threat/Determination spends, traits, conflict types, defeat/Resist/lasting, recovery, advancement, scene lifecycle) — powers the searchable rules library screen
- [x] **T39 Creation guidance** — `DATA.creationGuidance`: the book's example drive statements (8 per drive), statement-writing tips, ambition intro + themes per drive + Kara example + **ambition-change rule** (must change if the base drive drops below 6), the appearance (6) / relationship (6) guiding questions, **`stepNotes`** (paraphrased skills/focuses/talents/drives creation rules from Core Ch.3), and the **`driveRanking`** "One Way to Choose Drives" pairwise method (intro + all 10 drive pairs). Powers the wizard's Drives + Finishing helper UI, the pairwise drive-ranking helper, and the rules library's Skills/Drives/Ambition/Building-a-character/Choosing-drives + descriptive Focus cards *(2026-07-06)*
- [x] **T40 Creation in Play** — `DATA.creationInPlay` (Core alternative creation method): intro + the 7 limited-use **define options** (trait ×1 · skills ×3 at 4/5/6 · focuses ×2 · talents ×2 · drives ×4 · ambition ×1 · assets ×2), the **drive-importance table** (1st–5th → 8/7/6/5/4, corroborates the creation array + statement-on-6+), and notes (new statement → +1 Determination; no drive-challenge until complete; GM time-limit; complete → advancement). **Data + rules-library reference card only**; the interactive tracker (spending define-options on a live sheet) is a Phase 2 build — see roadmap *(2026-07-06)*
- [x] **T41 Supporting characters** — `DATA.supportingCharacters` (Core Rulebook, §3.18): the second, player-controlled character type (shared by the group, created as needed, not owned by one player). **Minor** (1 job trait · single Drive 4–8, typ 5 / secondary-domain 6 / primary-domain 7 / low-rank 4 · skills 6/5/5/4/4 · focuses 1@6·2@7·3@8 · House-granted talent · costs 1 Momentum/Threat, one free when not controlling another character · unlimited) and **Notable** (1 role trait, +1 cost adds a reputation trait · drives 7&6 rest 5, 1 statement +1-cost 2nd · skills 7/6/5/5/4, +1-cost +1 to two · focuses 1@6·2@7·3@8, +1-cost +2 · 1 talent, +2-cost 2nd · costs 3 Momentum/Threat + extras, reuse = half rounded up · max 5/adventure). Plus the **uncontrolled-character rules** (Difficulty-0 tests · Assistance · Follow Orders · Sacrifice for 1 Momentum/Threat · count as a trait · take control on defeat). Distinct from T27 NPC tier recipes (GM-run). Rendered in the rules library *(2026-07-06)*

### Expansion files (Phase 6; committed: Sand and Dust, The Great Game, Power and Pawns · stretch: Masters of Dune, Fall of the Imperium — §1.1 decision #4)
- [ ] **T33 New talents / archetypes / faction templates / focuses** per book
- [ ] **T34 New assets & equipment** per book
- [ ] **T35 New NPC stat blocks** per book
- [ ] **T36 New subsystems & rules tables** per book (e.g. spice sickness, court positions) — map each book's TOC first; inventory intentionally open until then. **Great Game House Management subsystem DONE early** (`EXPANSION.houseManagement`: **the Wealth/Resources economy only** — House skill arrays, domain income table, category modifiers, Income floor) because the core House wizard depends on it. *(The domain detail, subtype definitions, primary/secondary guidance, starting-domains-per-type, and starting-Threat-per-type are **Core**, owner-confirmed 2026-07-06 — see T16/T17 + `DATA.houseDomainDetails`/`houseDomainGuidance`/`houseSubtypeDefs`/`houseDomainCounts`/`houseStartingThreat`.)* Remaining Great Game TOC still to map
- [ ] **T37 Core errata/revisions** found in any expansion → applied to `data.js` (canonical regardless of toggle)

---

## 3. System Profile — COMPLETED (Stage A, signed off 2026-07-06)

### 3.1 Core resolution mechanic
- Skill test: roll a pool of **d20s, base 2, max 5**. Target number = **Skill + Drive**
  (each 4–8; drive must fit the motivation/statements).
- Each die ≤ target number = **1 success**. GM sets **Difficulty 0–5** (0 Simple,
  1 Average, 2 Challenging, 3 Daunting, 4 Dire, 5 Epic) = successes required. Extra
  successes become **Momentum**.
- **Crits:** a natural **1** = 2 successes. With an applicable **Focus**, every die ≤
  **Skill rating** crits.
- **Complications:** each natural **20** = a complication (negative trait, +50% time, or
  +1 Difficulty on subsequent tests). Buy off a complication for **2 Threat**.
- **Buying dice (before roll, after Difficulty set, max +3):** 1st/2nd/3rd die costs
  1/2/3 **Momentum**, or generates the equivalent **Threat** instead.
- **Momentum pool:** group-shared, **max 6**, **decays 1 per scene end**. Standard spends:
  extra d20s 1/2/3 · create/alter/remove trait 2 · create scene asset 2 (+2 to make
  permanent) · Obtain Information 1/question · Keep the Initiative 2 · extra asset move 2 ·
  asset Quality +1 for one attack 2 · inflict lasting defeat 2 · Resist Defeat 1 + attacking
  asset Quality.
- **Threat (GM mirror):** buy NPC dice 1/2/3 · +1 Difficulty on a PC test = 2 (declared
  before dice bought/rolled) · buy off NPC complication 2 · trait 2 · rival House enters 1 ·
  NPC Keep the Initiative 2 · NPC "Determination" effect 3. NPC actions that would generate
  Threat for a PC instead **spend** it.
- **Determination (no push mechanic exists; this is the re-roll economy):** start each
  adventure with 1, **pool cap 3** (some talents grant more at adventure start). Earn: GM offers a point when a drive statement conflicts with the
  action — **comply** (immediate complication) or **challenge** (cross out statement, lose
  that drive's use until recovered); +1 instantly for writing a new drive statement in
  play. Spend 1 (drive statement must support the action): **auto-1** on one die before
  rolling · **re-roll** any number of dice after rolling · **declaration** (create/change/
  remove a trait) · **extra action** in conflict (stacks with Keep the Initiative).
- **Traits (modifier model):** "Because of [trait], this is easier / harder / possible /
  impossible" — GM adjusts Difficulty or gates the attempt. No flat numeric modifiers.
- **Assists:** each assistant picks their own skill+drive, rolls exactly **1d20** (no
  bought dice; focuses apply), successes add to the leader's total **only if the leader
  scores ≥1 success** themselves.
- **Opposed tests (exact sequence):** the **defender rolls first** against their own
  target number; their successes set the active character's Difficulty (+1 per defensive
  asset in their zone, in conflicts). The active character then rolls; **equal successes =
  the active character wins**. If the active character fails, the **defender gains the
  shortfall as Momentum**, spendable immediately.
- **Extended tasks (exact procedure):** GM sets a **requirement**; each passed skill test
  scores **2 points + the Quality of an applicable asset (≥1)**; Momentum can be spent to
  add points; a complication can reduce the points scored that attempt. **Multiple
  characters may contribute** tests toward the same requirement. (Powers defeat tracks
  §3.7, recovery §3.8, sandworm riding §3.13 — one shared tracker component.)

### 3.2 Attributes & scales
No classic attributes. **Skills** ×5: Battle, Communicate, Discipline, Move, Understand.
**Drives** ×5: Duty, Faith, Justice, Power, Truth. All rated **4–8**. One generation
method: skills — archetype primary 6, secondary 5, rest 4, then **+5 free points, cap 8**;
drives — fixed array **8/7/6/5/4** ranked by importance.

### 3.3 Derived stats
Only the per-test **target number = Skill + Drive**. Nothing else is computed. Keep
`derived.js` for target-number building, asset-cap checks, and normalization/migration.

### 3.4 Skills & focuses
The 5 skills (§3.2). **Focuses** = specializations that widen crit range to ≤ Skill on
matching tests. Starting characters: **4 focuses — at least one on the primary skill AND at
least one on the secondary skill** (the archetype supplies those two; you may swap them but
must keep one on each). The other 2 are free. The book provides example focus lists per
skill (extract all into `data.js`).

### 3.5 Creation options
**Character wizard (8 steps, rule-legal order):**
1. **Concept** — optional faction template (Bene Gesserit Sister, Fremen, Mentat, Spacing
   Guild Agent, Suk Doctor) granting a bonus trait + **mandatory talents**.
2. **Archetype** (18: Analyst, Athlete, Commander, Courtier, Duelist, Empath, Envoy,
   Herald, Infiltrator, Messenger, Protector, Scholar, Scout, Sergeant, Spy, Steward,
   Tactician, Warrior) — grants archetype trait, sets primary/secondary skills, suggests
   focuses/talents.
3. **Skills** — 6/5/4/4/4 + 5 points (cap 8).
4. **Focuses** — pick 4 (**≥1 on primary skill AND ≥1 on secondary skill**; other 2 free).
5. **Talents** — pick 3 (≥1 archetype-related; faction templates force mandatory picks).
   Skill/drive/asset-category-bound talents (Bold, Advisor, The Reason I Fight, Specialist…)
   choose their parameter when picked and **may be taken again for a different parameter**
   (e.g. Bold (Battle) + Bold (Communicate) as two separate picks).
6. **Drives** — assign 8/7/6/5/4; write **3 drive statements** on the 8/7/6 drives.
7. **Assets** — pick 3, **≥1 tangible**.
8. **Finishing** — 1 reputation/personality trait, **Ambition** (long-term goal tied to
   highest drive), name/appearance/relationships.

**Creation in Play (Core alternative, T40 · `DATA.creationInPlay`):** instead of finishing
the wizard up front, a group may start with incomplete characters and *define* their
remaining choices during play as situations demand — a set of limited-use options (trait ×1,
skills ×3 at 4/5/6, focuses ×2, talents ×2, drives ×4, ambition ×1, assets ×2). Defining a
drive statement grants 1 Determination immediately; a drive can't be challenged until the
character is complete. Currently shipped as a **rules-library reference**; the interactive
tracker is a Phase 2 build on the live sheet.

**House wizard (7 steps, shared campaign entity):**

> **Core vs Great Game (owner-confirmed 2026-07-06, revised):** the Core Rulebook House
> chapter is richer than first extracted. Core owns the House's whole **narrative + structural**
> layer — type, the **starting domains per type** (counts), the GM's **starting Threat per
> player** by type, the full **areas-of-expertise** domain detail (descriptions + example
> lists), the primary/secondary meaning, roles, enemies, and traits. The **only** Great Game
> crunch is the numeric **Wealth/Resources economy**: the House **skill values** and the domain
> **income table** (`EXPANSION.houseManagement`, `greatGame` toggle). So steps 1–2 below are
> fully playable in core (with count enforcement + domain detail); Great Game only *adds*
> skill/Wealth/Resources numbers on top.

1. **House type** (Nascent · Minor · Major · Great). Core sets the **starting domains per
   type** (0P/1S · 1P/1S · 1P/2S · 2P/3S — `houseDomainCounts`, enforced) and the GM's
   **starting Threat per player** (0 · 1 · 2 · 3 — `houseStartingThreat`). *Great Game adds*
   the House skill array (Nascent 6/5/5/4/4 · Minor 7/6/6/5/4 · Major 8/7/6/5/4 · Great
   9/8/7/6/5).
2. **Domains** (Artistic, Espionage, Farming, Industrial, Kanly, Military, Political,
   Religion, Science). Core provides the **areas-of-expertise detail** (`houseDomainDetails`:
   a description + Machinery/Produce/Expertise/Workers/Understanding example lists for all 9
   domains), the primary-vs-secondary meaning (`houseDomainGuidance`), and the subtype
   definitions (`houseSubtypeDefs`) — all shown in core. *Great Game adds* the numeric income:
   base per asset subtype (× Primary/Secondary) + category modifier (societal −3R/+8W vs
   tangible +3R/−6W primary; halved secondary), floored at 2 R / 10 W. E.g. primary Machinery
   12 R / 32 W, primary Expertise 6 R / 44 W. Income table in `data-great-game.js`.
3. **Homeworld** (weather, habitation, crime, contentment, public wealth).
4. **Banner & arms** (crest + 1–2 colors).
5. **House traits** — 1 from primary domain + 1 reputation (Honorable/Brutal/Secretive…).
   In play: spend **1 Momentum** to apply House traits to a character for a scene.
6. **Roles** (13): Ruler, Consort, Heir, Advisor, Chief Physician, Councilor, Envoy,
   Marshal, Scholar, Spymaster, Swordmaster, Treasurer, Warmaster.
7. **Enemies** — number and rival make-up scale with House type (Nascent 0 · Minor 1 · Major 2 ·
   Great 3 — principal + a host of Minors; `DATA.houseEnemies.perType`). Each enemy = name + rival type + d20 Hatred degree
   (Dislike/Rival/Loathing/Kanly) × d20 Reason (Competition, Slight, Debt, Ancient Feud, Morality,
   Servitude, Family Ties, Theft, Jealousy, **No Reason** — 10 reasons, corrected from 9) + notes.
   Dislike imposes +1 Difficulty on interactions.

### 3.6 Conditions & statuses
No fixed condition list. Complications create **negative traits** (injured, exhausted…)
that **auto-apply**: +1 Difficulty on affected tests or gate actions impossible. Removal:
**2 Threat** buy-off · ally describes a fix + **Difficulty 2 test** · specific talents
(e.g. Adrenaline Shot suppresses for a scene; Rapid Recovery removes injury for 2 Threat).

### 3.7 Health, damage & death
**No HP, no soak.** Attacks are contested tests; each defensive asset in the defender's
zone = **+1 Difficulty** to the attacker (armor also raises the wearer's movement
complication range by its rating). Minor NPCs lose = defeated instantly. Notable/Major
characters and PCs have an **extended-task defeat track**: requirement ≈ defender's
relevant skill + defensive asset Quality; each winning attack scores **2 + asset Quality**.
**Defeat ≠ death** (out of scene: yielded, unconscious, disgraced…). **Lasting defeat**
(attacker spends 2 Momentum after defeat) = death/dismemberment/ruin per conflict type.
**Resist Defeat** — once per scene, cost 1 Momentum (or Threat) + attacker asset Quality,
suffer a complication, stay in the scene.
**Guided defeat procedure UI:** defeated → offer Resist Defeat (if unused this scene) →
attacker lasting-defeat choice → ally stabilize **Difficulty 2** (prevents permanent
effect; character still out for the scene) → record permanent negative traits if unstopped.

### 3.8 Rest & recovery
- **Non-lasting defeat:** ally runs an extended task, requirement **4 + Quality** of the
  defeating asset; success = rejoin scene.
- **Lasting defeat:** ally **Difficulty 2** stabilize; survivor cannot rejoin the scene.
- **Challenged drive statements:** recover at end of any scene of contemplation (if no
  Determination spent/gained) or automatically between adventures — either write a **new
  statement**, or **−1 the challenged drive / +1 next-lowest** (keep the statement if the
  drive stays ≥6; below 6 the statement is lost). Enforce these limits.

### 3.9 Powers — RESOLVED: no separate subsystem
Voice, Mentat computation, prana-bindu, prescience etc. are **talents** with embedded
mechanics, resolved in the roller: e.g. **Voice** — spend up to 3 Threat for auto-successes
(1/point) on an influence Communicate test or to resist the Voice; **Mentat Discipline** —
one d20 auto-counts as a 1 on data-related Understand tests; **Calculated Prediction**,
**Prana-Bindu Conditioning** (re-roll a die on body-control Move/Discipline tests). Every
talent with a dice effect must be automated ("tap to use"), not just displayed.

### 3.10 Advancement
**Advancement points:** ambition progress **1 minor / 3 major** · defeated in conflict
**1** · fail a Difficulty ≥3 test **1** · GM spends ≥4 Threat at once **1** · group award
**1 max/session**. **Max one advance purchased per adventure.** Costs: **skill +1** (cap 8)
= 10 + 1 per previous skill advance · **new focus** (skill must be ≥6) = # focuses owned ·
**new talent** = 3 × # talents owned · **asset → permanent** = 3 · **asset Quality +1** =
3 × current Quality. **Drives never advance by points** (narrative challenge/recovery
only, §3.8). **Retraining:** halve an advance's cost (round up) by permanently dropping a
skill point (min 4), focus, or talent. The app automates earning, spending, and the
one-advance-per-adventure gate.

### 3.11 Inventory & wealth
Abstract **assets** (tangible or intangible; Quality ratings; created-in-play assets are
**Quality 0** unless a printed value exists — checkpoint ruling #3). **Max 5 permanent
assets** per character (the **Specialist** talent raises the cap) — enforce, don't just
warn. No encumbrance, no coin-counting; currency (solari) is narrative. Purchases dip into
the **House Wealth index** (e.g. noble ubiquities 0, advanced tech +1, personal
ornithopter +4 — extract the full price ladder).

### 3.12 Combat structure
One engine, **5 conflict types**: Dueling, Skirmish, Warfare, Espionage, Intrigue —
differing in scale, valid assets, and the skills/drives used. **Zones** may be physical or
abstract (social circles). Turn structure: GM picks the first actor (or spends 2 Threat to
seize it); after each turn initiative passes to an opposing side; **Keep the Initiative** =
2 Momentum/Threat, ally acts at +1 Difficulty, never twice in a row; last actor of a round
picks (or pays 2 to keep) the next round's opener. **One action per turn** (move self/asset
1 zone, attack, create trait/asset, etc.); 2 Momentum = extra zone or second asset move.
**Subtle move** (Diff 2: no reactions, Keep the Initiative costs 0) / **bold move** (Diff
2: force an enemy asset to move 1 zone). Attacks: declare asset + target → pick
skill+drive per conflict type → **defender rolls first**, successes (+1 per defensive
asset in their zone) = attacker's Difficulty → attacker rolls, **tie = attacker wins**,
failed attack banks the shortfall as defender Momentum → resolve per §3.7. **Architect/Agent duality:** Architect-scale actions use
assets-in-play (often gating possibility, not bonuses); actions on behalf of the House use
**House skill + personal drive** as the target number (GM assigns House drive if no
character leads).

### 3.13 Bestiary & NPCs
**Tiers:** **Minor** (1 role trait; flat drive 4–8, no statements; skills 6/5/5/4/4;
1 focus; 0–1 talents) · **Notable** (role + optional reputation trait; drives 7/6 rest 5,
1 statement; skills 7/6/5/5/4; focuses on skills ≥6; 1–2 talents) · **Major** (2–3 traits;
full drives 4–8 with statements on ≥6; skills all 4 + 11 points, cap 8; 3–5 focuses; 2–4
talents or NPC special abilities). NPCs run on **Threat** (3 Threat = Determination
effect). Extract **all ~25 generic archetypes** (Arrakeen Native → Water Seller) and
**all 12 iconic characters** (Duke Leto, Lady Jessica, **Paul Atreides**, Gurney Halleck,
Thufir Hawat, Duncan Idaho, Dr. Yueh, Feyd-Rautha, Rabban, Count Fenring, Stilgar,
Liet Kynes — Rabban/Fenring/Paul/Feyd from the owner's book transcription 2026-07-06;
all complete). **Sandworms = force majeure**, no stat block; riding = extended
task 4/8/12/16 (Juvenile/Adult/Large Adult/Shai-Hulud). Desert hazards = environmental
traits.

### 3.14 Pre-generated characters — RESOLVED: included
Iconic characters ship as one-tap pregens (book-sanctioned: "You might even play them as
characters"). **Checkpoint ruling #1:** instantiated as PCs with standard Determination
rules (not NPC Threat rules).

### 3.15 Solo rules — RESOLVED: absent
No official solo rules in any supplied book. **No solo tab, no `solo.js`,
no `data-solo.js`.**

### 3.16 GM tables
**Story Hook Generator** (d20 × 5 columns: Plot / Goal / Location / Hazard / Character) ·
House **enemy generator** (Hatred × Reason) · complication examples from the skill/conflict
chapters · sandworm riding requirements · desert hazard traits. All rollable from the GM
screen.

### 3.17 Scene & adventure lifecycle — the app owns these events
A **scene** = one place/time/cast. **End of scene** (GM button; local-mode button):
**−1 Momentum** from the pool · **temporary assets expire** (unless 2 Momentum spent to
make permanent) · **Resist Defeat flags reset** · prompt **challenged-statement recovery**
(if the character reflected and no Determination was spent/gained that scene). Traits do
not auto-expire — they end when no longer true (manual removal; single-test complications
auto-clear).
**Start of adventure:** Determination resets to **1** (+ talent bonuses, cap 3);
`advancesPurchasedThisAdventure` resets. **End of adventure:** purchase **max 1 advance**;
unrecovered challenged statements **auto-recover** (player picks new-statement or −1/+1
per §3.8).

### 3.18 Supporting characters — the second player-controlled character type
Alongside main PCs, players share a pool of **supporting characters** (`DATA.supportingCharacters`,
T40) — the House's lesser servants (functionaries, spies, soldiers), created as needed and
**not permanently owned** by any one player. At scene start a player picks which of their
available characters to control; the controlled character is a full PC for that scene.
**Two types:** **Minor** (1 job trait · single Drive 4–8 [typ 5 · secondary domain 6 ·
primary domain 7 · low-rank 4] · skills 6/5/5/4/4 · focuses 1@6/2@7/3@8 · House-granted
talent only · costs **1 Momentum or +1 Threat**, one free when you control no other character
in the scene · unlimited) and **Notable** (1 role trait, **+1 cost** for a reputation trait ·
drives 7&6 rest 5, 1 statement, **+1 cost** for a 2nd · skills 7/6/5/5/4, **+1 cost** for +1 to
two · focuses 1@6/2@7/3@8, **+1 cost** for 2 more · 1 talent, **+2 cost** for a 2nd · costs
**3 Momentum or +3 Threat** plus extras, reuse = **half the creation cost, rounded up** ·
**max 5 per adventure**, House may adjust).
**Uncontrolled characters** (a player's other characters in the same scene) may only:
attempt **Difficulty-0 tests** (higher auto-fails), **assist**, **follow orders** (with the
orderer assisting), be **sacrificed** (1 Momentum / +1 Threat to take a controlled character's
fate), or **count as a trait** (make a multi-person task possible / lower Difficulty, down to 0
in concert). If your controlled character is defeated, immediately **take control** of an
uncontrolled one. *(These are player-side rules; the GM's NPC tier recipes are T27 in
`data-npcs.js`.)*

### Checkpoint rulings (recorded)
1. Iconic pregens use PC rules (Determination, not Threat).
2. Assistant dice follow all normal die rules (focus crits count double on assists).
3. In-play created assets default Quality 0; printed Qualities win where given.
4. The House is campaign-level shared state; editable by GM + the Ruler-role player.
5. **Scout archetype** — the printed entry's focus/talent split is internally inconsistent (1 focus + 2 "talents", where the "talents" Endurance/Stealth have no catalog entry). Reconciled to the standard 2-focus/1-talent shape: focuses [Endurance, Stealth], talent [Putting Theory into Practice].

---

## 4. Expansions (5 toggles, off by default)

| Toggle | Data file | Book | Commitment |
|---|---|---|---|
| Sand and Dust | `data-sand-and-dust.js` | Sand and Dust — The Arrakis Sourcebook | **Committed** |
| The Great Game | `data-great-game.js` | The Great Game — Houses of the Landsraad | **Committed** |
| Power and Pawns | `data-power-and-pawns.js` | Power and Pawns — The Emperor's Court | **Committed** |
| Masters of Dune | `data-masters-of-dune.js` | Masters of Dune — Campaign Sourcebook | Stretch (on request) |
| Fall of the Imperium | `data-fall-of-imperium.js` | Fall of the Imperium — Campaign Sourcebook | Stretch (on request) |

"Rules crunch" = new talents, archetypes, faction templates, assets, focuses, NPC stat
blocks, subsystems (e.g. spice sickness, court positions). Campaign plot, adventures, and
setting lore are excluded. Errata/revisions of core content are canonical everywhere
regardless of toggle.

---

## 5. Architecture — LOCKED

- **No build step.** Vanilla JS, native ES modules (`<script type="module" src="src/main.js">`).
  Clone-and-run must always work.
- **Installable PWA:** `manifest.json`, `service-worker.js` (network-first, caches app
  shell + all data files, versioned `CACHE_VERSION`), SVG icon, "Update available — reload"
  toast.
- **Storage modes:** `localStorage` local-only mode works with zero configuration; real
  keys in `firebase-config.js` (placeholder block + `FIREBASE_ENABLED` flag) switch on
  cloud sync. Never commit real keys.
- **Firebase:** Realtime Database + Storage for portraits (canvas-compressed to ~400px).
- **Auth:** instant anonymous launch; optional Google account linking in Settings.
- **Roles from day one:** `members/{uid}.role: "player" | "gm"` in schema **and**
  `database.rules.json`.
- **Campaigns:** memorable fantasy-phrase join codes (e.g. `spice-falcon-blade`).
- **Themed UI primitives:** no native `alert/confirm/prompt` — shared `modal()` +
  `showToast/confirmModal/promptModal`, accessible (focus trap, Escape, `aria-modal`,
  focus restore), visual-viewport sized.
- **Accessibility:** keyboard + screen-reader usable — `aria-live` roll results and
  defeat-track changes, labeled icon-only buttons, `aria-current` nav.
- **Responsive:** phone-first; zero horizontal overflow at 360px on every screen.

---

## 6. File structure — LOCKED

| File | Purpose |
|---|---|
| `index.html` | App shell: header, bottom nav, screen mount, module entry |
| `styles.css` | Desert theme (light + dark) + all component styles |
| `data.js` | Core rules library — every §3 list/table/formula from the core book |
| `data-sand-and-dust.js` … `data-fall-of-imperium.js` | Expansion crunch behind toggles (§4) |
| `data-npcs.js` | All NPC stat blocks: 25 generic archetypes + iconic characters |
| `data-pregens.js` | Iconic characters as one-tap PC pregens |
| `firebase-config.js` | Placeholder config + `FIREBASE_ENABLED` flag |
| `database.rules.json` | RTDB security rules (player/GM roles; House write rules per ruling #4) |
| `manifest.json`, `service-worker.js`, `icon.svg` | PWA |
| `tests/` + `package.json` | Dev-only headless regression harness (`npm test`); dev-only `playwright-core`; `node_modules` gitignored; not in SW app shell |
| `README.md` | Setup incl. Firebase steps + personal-use licensing note (§12) |
| `CLAUDE.md` | This document |

*(`data-monsters.js` from the template is not used — this game has no monster bestiary;
sandworms are unstatted forces of nature. `data-solo.js` omitted per §3.15.)*

### 6.1 `src/` module map — LOCKED responsibilities

| Module | Responsibility |
|---|---|
| `core.js` | Foundational constants, DOM/util helpers, raw d20 functions. No imports. |
| `ui.js` | Themed modals/toasts/confirm/prompt. |
| `rules.js` | Pure rules lookups over data libraries (find talent/archetype/asset, focus matching, requirement checks). |
| `derived.js` | Target-number building, asset-cap checks, data normalization/migration. |
| `settings.js` | Feature/content toggles (5 expansions, GM screen, advanced automation). |
| `store.js` | Local/cloud character + House persistence, pools, roll log, conflict mirroring, JSON `exportAll`/`importAll`. |
| `sync.js` | Firebase auth, campaigns, join codes, presence + theme. |
| `wizard.js` | Character creation wizard (8 steps) + House wizard (7 steps) + pregens. |
| `roller.js` | 2d20 engine: dice buying, crits/focus ranges, complications, Momentum/Threat/Determination spends, talent-embedded effects (Voice, Mentat…), assists, opposed tests (defender-first sequence), extended-task scoring (2+Quality), Architect-mode House-skill substitution, roll-log writes. |
| `sheet.js` | Full character sheet + all in-play tracking (drives/statements, traits, assets, Determination, defeat track, advancement). Exports `poolsHeader` (the persistent Momentum/Threat/Determination bar) for reuse by in-play screens. |
| `combat.js` | Shared conflict tracker: 5 conflict types, zones, initiative-passing (acted-this-round flags, Keep-the-Initiative not-twice-in-a-row, last-actor-picks-opener), pending-contest coordination (defender rolls first), defeat/Resist Defeat/lasting-defeat flow, generic extended-task tracker, scene/adventure lifecycle events (§3.17). |
| `gm.js` | GM dashboard: party panel, peek sheets, Threat pool, drop-in NPCs, §3.16 rollable tables. |
| `screens.js` | Top-level screens (home/rules/House/about) + party banner. |
| `router.js` | Bottom-nav routing + conditional tab gating. |
| `main.js` | Entry point / boot. |

*(`power-automation.js` and `solo.js` omitted per §3.9/§3.15 resolutions.)*

When adding or moving a `src/` file: update these tables **and** the service-worker
app-shell list, then bump `CACHE_VERSION` — in the same change.

---

## 7. Data model (Firebase) — LOCKED shape, Dune field names

```
campaigns/{campaignId}
  meta:    { name, joinCode, createdAt, ownerUid }
  members/{uid}: { displayName, characterId, role: "player" | "gm" }
  house:   { name, type, skills{battle,communicate,discipline,move,understand},  // skills: Great Game only
             domains[{id,tier,subtype?}], wealth, resources,                     // wealth/resources/subtype: Great Game only
             homeworld{name,weather,habitation,crimeRate,crimeStance,contentment,publicWealth},
             banner{crest,colors}, traits[{name,type}],
             roles{ <role>: uid|npcName },                                       // ruling #4
             enemies[{name,type,hatred,reason,notes}] }                          // count/make-up scale with type
             // Core fills only narrative fields (name, type, domains[], homeworld, banner, traits, roles, enemies).
             // skills{}, wealth, resources populate from EXPANSION.houseManagement when the greatGame toggle is on.
  momentum: number   // shared pool, max 6
  threat:   number   // GM pool (GM screen)
  conflict: { active, type: "duel"|"skirmish"|"warfare"|"espionage"|"intrigue",
              round, zones[], currentSide, keptInitiative,
              pendingContest: { attackerId, defenderId, defenderSuccesses, difficulty },
              combatants{ id: { name, side, zoneId, actedThisRound,
                                defeatTrack{req, progress},
                                resistUsedThisScene, assetsInPlay[] } } }
  tasks/{taskId}: { name, requirement, progress, contributors[] }   // generic extended tasks
  rollLog/{pushId}: { by, characterName, skill, drive, tn, dice[], successes,
                      complications, momentumDelta, threatDelta, note, ts }  // capped ~100
  broadcast/{pushId}: { text, ts, from }

characters/{characterId}
  owner, campaignId
  identity:  { name, archetype, factionTemplate, houseRole, appearance,
               ambition, portraitUrl }
  skills:    { battle, communicate, discipline, move, understand }      // 4–8
  drives:    { duty, faith, justice, power, truth }                     // 8/7/6/5/4
  driveStatements: { <drive>: { text, challenged: bool } }              // 3 at creation
  focuses:   [ { skill, name } ]                                        // 4 at creation
  talents:   [ { name, skill?, drive?, category?, source } ]           // 3 at creation; skill/drive/category = bound-talent parameter
  traits:    [ { name, negative: bool, source } ]                      // incl. complications
  assets:    [ { name, quality, tangible: bool, permanent: bool } ]    // max 5 permanent
  determination: number                                              // cap 3
  state:     { defeated, lastingDefeat, resistUsedThisScene, defeatTrack{req,progress} }
  advancement: { points, advancesPurchasedThisAdventure, skillAdvancesTotal, log[] }
  notes: ""
```

Rules: every rules number the schema references lives in the data files; every schema
addition ships with a normalization path back-filling defaults on old characters; every
field addition is documented here **in the same change**.

---

## 8. Settings & toggle pattern — LOCKED

One pattern for all optional surfaces: flag in `settings.js`
(`Settings.<flag>() → !!get("<flag>")`, off by default), toggle row in Settings & About
with a one-line description, every related UI checks the flag, router hides gated tabs.
Explicit user choice beats role-based defaults (store `true`/`false` distinctly from
unset).

Toggles: `sandAndDust` · `greatGame` · `powerAndPawns` · `mastersOfDune` ·
`fallOfImperium` · `gmScreen` · `advancedAutomation` (if built).

---

## 9. Build roadmap

> Per-feature spec format (mandatory): **Rule** (canonical mechanic, cited to source) ·
> **Target** (file · module · function) · **Behavior/UI** · **Schema** (new fields + §7
> update) · **Acceptance** (how to confirm in a browser).

- [x] **Phase 0 — Foundations** — scaffold + all data extraction (0a–0e) complete *(2026-07-06)*. Rolling item **T38** (full rules-library quick-reference for every §3 mechanic) continues alongside later phases; the library screen currently renders the 0a tables.
  - [x] Scaffold all §6 files; theme (light/dark); PWA shell; router; local storage *(2026-07-06 — verified headless: all tabs, zero console errors, 0px overflow at 360px, GM tab gating, theme toggle)*
  - [x] Data extraction 0a: ledger **T01–T09, T22–T26** (core mechanics, conflict, advancement) *(2026-07-06 — rules library screen renders all 15 sections; `npm test` invariants green)*
  - [x] Data extraction 0b: ledger **T10–T12** (archetypes, faction templates, creation constants) *(2026-07-06 — npm test invariants green)*
  - [x] Data extraction 0c: ledger **T13** (55 talents with machine-readable `auto` effect descriptors) *(2026-07-06 — 0c invariants green: 55 talents, faction counts, Voice/Specialist descriptors, every archetype- & faction-suggested talent resolves to catalog; "Foreknowledge" gap recorded)*
  - [x] Data extraction 0d: ledger **T14–T21** (assets, wealth ladder, House tables) — T14 (85 assets) · T15 (wealth ladder) · T16/T17 (House types + domains; numeric economy relocated to `data-great-game.js` per source) · T18 (homeworld options) · T19 (13 roles) · T20 (enemy d20 tables, Reasons corrected 9→10) · T21 (trait examples) *(2026-07-06 — npm test invariants green across all 0d)*
  - [x] Data extraction 0e: ledger **T27–T32** — T27 tier recipes · 6 NPC special abilities · T28 (25 generic stat blocks) · T29 (11 iconics; Rabban/Fenring stats a source gap) · T30 (9 pregens) → `data-npcs.js`/`data-pregens.js`; T31 story-hook d20 table · T32 enemy generator (T20 reused) → `data.js` *(2026-07-06 — npm test 149 checks green)*
- [ ] **Phase 1 — Creation Wizards**
  - [x] Character wizard: 8 steps in `wizard.js`, full legality validation (skill +5/cap-8 math, 4 focuses w/ ≥1 primary, 3 talents w/ ≥1 archetype-related + faction mandatory, 8/7/6/5/4 drive permutation + statements on 8/7/6, 3 assets w/ ≥1 tangible, name/trait/ambition). Saves via `store`, routes to sheet. `sheet.js` shows a read-only summary so creation is verifiable pre-Phase-2 *(2026-07-06 — browser-verified full flow end-to-end: schema-correct save, 0 console errors, 0px overflow at 360px)*. **Playtest-feedback pass (2026-07-06):** focus name is a **dependent dropdown limited to the selected skill's printed focus examples** (the custom "Other…" entry was **removed 2026-07-06** per user — focuses are book-list only); drive-value dropdowns **exclude already-assigned array values**; drive-statement fields gained **book example pickers + writing tips**; Finishing gained **per-drive ambition guidance + appearance/relationship prompts** (all from `DATA.creationGuidance`, T39); sheet summary now shows **traits tagged by source** (reputation visible) + **Appearance/Relationships**. Fixed a routing bug: creating/instantiating while already on `#/sheet` now force-re-renders (`goToScreen`). **Faction-restricted talents (gap closed v0.28.0):** the Talents step now **hides** any talent whose `faction` differs from the character's template (non-faction characters see no faction talents; a Bene Gesserit sees Voice but not Mentat talents). **Core Ch.3 rules pass (2026-07-06, v0.20.0):** focus validation now requires **≥1 on primary AND ≥1 on secondary** skill; skill/drive/asset-category-bound talents pick their parameter and **repeat** (Bold (Battle) + Bold (Communicate)), stored as `talents[{name,skill?/drive?/category?}]`; the Drives step gained the **"One Way to Choose Drives" pairwise helper**; authoritative creation `stepNotes` surface in the wizard + a rules-library "Building a character" / "Choosing drives" card.
  - [x] House wizard: 7 steps in `wizard.js` (Type · Domains · Homeworld · Banner · Traits · Roles · Enemies). Narrative core always; the **Great Game numeric layer surfaces only under the `greatGame` toggle** — House skill-array assignment + per-domain subtype income (base + category modifier, floored) with a live Wealth/Resources total. Enemies step rolls the d20 Hatred × Reason tables. Saves via `store.saveHouse` (normalized by `normalizeHouse`, §7). **Not gated** (user decision): Home surfaces both "Create your House" and "Create a character", recommends House-first when none exists but never blocks; the character **Finishing** step gains a House-role picker when a House is present, writing `identity.houseRole` and the House `roles` map (ruling #4). *(2026-07-06 — browser-verified core + Great Game end-to-end: House Minor income 17R/52W = Military-tangible-primary-Machinery 15R/26W + Political-societal-secondary-Expertise 2R/26W; edit preserves roles; 0 console errors, 0px overflow at 360px)*. **Feedback refinements (2026-07-06):** domain tier options **ghost/disable once the type's primary/secondary cap is reached** (Great Game); Homeworld step gained a **name field**; Enemies became a full model (**name · rival type · Hatred · Reason · notes**) with per-type make-up + count pill from `DATA.houseEnemies.perType` (Nascent 0 · Minor 1 · Major 2 · Great 3 = principal + a host of Minors). The step **enforces the type's count as a minimum** (user decision) — you can't finish short, but a GM may add more rivals.
  - [x] Pregens: one-tap iconic instantiation (ruling #1) — `openPregenPicker`/`instantiatePregen` in `wizard.js`; **all 12** iconics build as PCs (Determination 1) and route to the sheet *(2026-07-06 — browser-verified: Paul instantiated end-to-end (Discipline+Truth TN 14, 3 statements, Det 1); picker lists all 12)*
- [~] **Phase 2 — Core Tracker** *(core in; skill/drive/focus/talent editing + portrait deferred to the advancement loop, Phase 4)*
  - [x] Live sheet (`sheet.js`): skills/drives shown; **drive-statement challenge/recover** per §3.8; focuses/talents shown (talents show their bound skill/drive/category parameter); **traits** add/remove (with a complication/negative flag); **assets** add/remove + Quality steppers + make-permanent with the **5-permanent cap enforced** (blocks the toggle, not just warns); **Determination** stepper (cap 3); ambition/appearance/relationships shown; editable **notes**; delete-character. Every edit persists immediately (`saveCharacter`/`savePools`) and re-renders. **Deferred:** inline skill/drive/focus/talent editing (these change via the §3.10 advancement loop, Phase 4) and portrait upload *(2026-07-06 — browser-verified at 360px: pools persist, statement toggles + persists, 0 overflow, 0 console errors)*
  - [x] Persistent **Momentum/Threat/Determination header** (`poolsHeader`, exported) at the top of the Sheet screen — Momentum clamps to cap 6, Threat unbounded, Determination is the current character's (cap 3). The combat/GM in-play screens reuse `poolsHeader` when they land (Phases 4/6) *(2026-07-06)*
  - [x] **JSON export/import** of characters + House + pools in Settings → `store.exportAll`/`importAll`; download a dated `imperium-backup-*.json`, import replaces local data (foreign files rejected; all characters run through `normalizeCharacter` on import) *(2026-07-06 — browser-verified export button; round-trip + foreign-file-reject covered by npm test)*
  - [ ] **Creation-in-Play interactive tracker (T40):** start with an incomplete character and spend the limited-use define options (trait ×1 · skills ×3 @ 4/5/6 · focuses ×2 · talents ×2 · drives ×4 · ambition ×1 · assets ×2) from the live sheet; defining a drive statement grants 1 Determination; block drive-challenge until complete; mark complete → unlock advancement. Data + rules reference already shipped (`DATA.creationInPlay`); this is the UI, built on the live sheet.
  - [x] Persistence + migration — `normalizeCharacter`/`normalizeHouse` back-fill on every read and on import (existing path; import reuses it)
- [~] **Phase 3 — Dice Engine** *(core skill-test roller in; opposed/assist/talent-automation/Architect/citations deferred to later Phase-3 passes)*
  - [x] 2d20 test flow (`roller.js` · `openRollDialog`): skill+drive pick (live TN), Difficulty 0–5, **buy 1–3 dice** (spend Momentum or give Threat, affordability-checked), **applicable-focus** toggle (crit ≤ Skill), **nat-1 crit / nat-20 complication**, successes vs Difficulty, **Momentum generation** (extra successes, cap 6). Entry point: "⚂ Roll a test" on the live sheet. Pure `evaluateDice` unit-tested *(2026-07-06 — browser-verified: Battle+Duty TN14, [20,1] → 2 successes + 1 complication, +1 Momentum, applied to pools; 0 console errors, 0px overflow)*
  - [~] Determination spends — **auto-1** (before roll) + **re-roll** (select dice after roll) done, **gated on an unchallenged statement on the chosen drive** (§3.1); declaration + extra-action (conflict) deferred to Phase 4
  - [x] Roll log: every applied roll appended (`store.appendRoll`, capped ~100), `aria-live` result summary in the dialog, recent 8 shown on the sheet *(2026-07-06)*
  - [ ] Trait auto-application (+1 Difficulty / impossible); assists (1d20, leader-success gate)
  - [ ] Opposed-test flow: defender-first, defensive-asset Difficulty adds, tie-to-attacker, defender Momentum on failed attack
  - [ ] Talent-embedded automation: Voice, Mentat Discipline, Prana-Bindu, etc.
  - [ ] Architect-mode toggle in the roll dialog (House skill + personal drive per §3.12)
  - [ ] Rules citations: every automated surface (roll results, defeat prompts, advancement costs) links to its rules-library entry (T38)
- [ ] **🏁 Milestone — First Session Playable:** create character → live sheet → roll tests → track pools end-to-end, verified at a real play session. **Phase 5 is gated on this milestone.**
- [ ] **Phase 4 — In-Play Systems**
  - [ ] Guided defeat procedure (defeat → Resist → lasting → stabilize) per §3.7
  - [ ] Generic extended-task tracker (requirement / progress / contributors; 2+Quality scoring, Momentum adds, complication reductions) — reused by defeat tracks, recovery, sandworm riding
  - [ ] Scene & adventure lifecycle engine per §3.17 (End Scene / End Adventure buttons: Momentum decay, temp-asset expiry, Resist-Defeat reset, statement-recovery prompts, Determination reset to 1 cap 3, advance-gate reset) — with confirmation summary + one-step undo
  - [ ] Recovery flows per §3.8 (extended task 4+Quality; statement recovery rules)
  - [ ] Advancement loop per §3.10 (earning triggers, cost formulas, 1-advance/adventure gate, retraining)
  - [ ] Local conflict helper with NPC compendium
- [ ] **Phase 5 — Multiplayer & Sync** *(deferred: starts only after the First Session Playable milestone — §1.1 decision #1)*
  - [ ] Firebase, security rules (incl. House write rules, ruling #4), anonymous auth + Google link
  - [ ] Campaigns/join codes; party overview; shared Momentum/Threat pools
  - [ ] Shared conflict tracker: 5 types, zones, initiative passing, two-way defeat-track sync, pending-contest coordination (defender-first), shared extended tasks + roll log
  - [ ] Portraits; PWA update toast
- [ ] **Phase 6 — Conditional surfaces**
  - [ ] GM screen: party panel, peek sheets, Threat pool, drop-in NPCs, rollable story-hook/enemy tables
  - [ ] Expansion extraction + toggles (§4): ledger **T33–T37** per book — committed: Sand and Dust, The Great Game, Power and Pawns; stretch: Masters of Dune, Fall of the Imperium
- [ ] **Hardening**
  - [ ] Committed regression harness (`npm test`)
  - [ ] Accessibility pass
  - [ ] Rules-accuracy audit (§11) with every finding closed

---

## 10. Process rules — LOCKED

1. **Living spec.** This CLAUDE.md is canonical; every code change updates it in the same
   change.
2. **Single source of truth.** All rules numbers live in `data*.js`. Never hardcode a
   rules value in a `src/` module.
3. **Changelog table.** Every change appends a dated row: what, why, root cause for fixes,
   verification performed, cache version.
4. **Verify in a real browser.** Every phase/feature verified headless (Playwright,
   Firebase requests aborted) before being marked complete: end-to-end with zero console
   errors.
5. **Committed regression harness.** `npm test` asserts at minimum: boot/wiring smoke
   (every tab, zero JS errors); target-number and House-math invariants across generated +
   pregen characters; dice-engine invariants (crit ranges, complication counts, buy costs);
   every talent with a dice effect opens a non-empty resolution; asset-cap enforcement;
   zero horizontal overflow at 360/390px; a11y basics; every closed audit finding. Every
   bug fix adds a check that would catch its return.
6. **Cache discipline.** Any shipped-file change bumps `CACHE_VERSION`.
7. **Root-cause fixes.** Debug to the actual cause; record cause + fix in the changelog.
8. **Scope guard.** Core rules + toggled expansion crunch only. No setting/adventure
   content. Nothing invented presented as official; house conveniences labeled as such.
9. **Module discipline.** Respect §6.1; explicit import/export; split modules that outgrow
   their job.

---

## 11. Rules-accuracy audit — mandatory before "done"

Re-verify the finished app against the notebook:
- **Data values:** spot-check every category; fully check every formula and creation table
  (skill/drive arrays, House type arrays, domain Wealth/Resources, advancement costs).
- **Engine behavior — audit hardest here:** Determination gating on statements + cap 3,
  Resist Defeat once-per-scene, Keep-the-Initiative not-twice-in-a-row, Momentum cap 6 +
  scene decay, complication buy-off costs, assist leader-success gate, focus crit ranges,
  one-advance-per-adventure, asset caps, Architect House-skill substitution,
  **opposed-test sequence** (defender first, tie-to-attacker, defender Momentum on failed
  attack), **extended-task scoring** (2 + Quality, complication reductions), scene-end
  event bundle (§3.17).
- Findings = numbered work-list (**Rule / Target / Fix / Why**); close each with a
  regression check; record what was verified clean.
- Re-verification method: pull the app's value from data files, query the notebook for the
  canonical value, compare; corroborate surprising answers before editing.

---

## 12. Content & IP rules

- Extract numbers and mechanics; paraphrase all effect/flavor text concisely — never copy
  rules prose verbatim. No setting, adventure, art, or logo content.
- This app is a **personal play aid** built from the user's own books. The README must
  state that publishing or distributing it makes licensing the user's responsibility, and
  that openly licensed material is the safe basis for anything public.

---

## Changelog

| Date | Change | Why | Root cause (fixes) | Verification | Cache ver |
|---|---|---|---|---|---|
| 2026-07-06 | CLAUDE.md instantiated from template after Stage B sign-off | Stage C start | — | System Profile extracted from NotebookLM, corroborated (House skills), checkpoint signed off | — |
| 2026-07-06 | Added §2.1 Data Extraction Ledger (T01–T37) + linked §9 Phase 0/6 items to ledger IDs | Make remaining extraction work explicit and resumable by any AI | — | Ledger cross-checked against §3 System Profile and checkpoint inventory | — |
| 2026-07-06 | Planning-gap pass: exact opposed-test sequence (defender first, tie-to-attacker, defender Momentum) corrected in §3.1/§3.12; extended-task procedure (2+Quality) added; Determination cap 3 recorded; new §3.17 scene/adventure lifecycle; schema + roadmap additions (roll log, pending contest, generic tasks, actedThisRound, lifecycle engine, Architect toggle); ledger T38 (rules library content) | User review asked "how combat runs / dice roller in tracker / roll logging" — spec had gaps | Earlier extraction summarized opposed tests as simultaneous "contested tests"; notebook re-query gave the exact sequential rule | Notebook query corroborated against Core Rules chapter (same conversation thread) | — |
| 2026-07-06 | Plan review Q&A: added §1.1 product decisions (local-first w/ Phase 5 gate, player-focus, digital-only dice, 3 committed + 2 stretch expansions, mixed devices, system-default theme) + 5 improvements (First Session Playable milestone, JSON export/import, lifecycle confirm/undo, persistent resource header, T38 rules citations); §4 commitment column; roadmap/ledger updated to match | Full-plan review with user sign-off on each decision | — | Each decision answered explicitly by user via 6-question review | — |
| 2026-07-06 | Phase 0 scaffold: all §6 files created (app shell, desert theme light/dark w/ system default, hash router w/ GM gating, themed modal/toast/confirm/prompt, localStorage store, PWA manifest+SW+icon, Firebase placeholders + security rules, README, tests). Data extraction 0a complete: T01–T09, T22–T26 in `data.js` (82 focus examples; T08 Move/Understand example gap recorded); searchable rules library renders all 0a tables | Phase 0 roadmap | — | `npm test` (60+ static+invariant checks green); headless browser: 4 tabs render, zero console errors/warnings, 0px overflow at 360px, GM toggle gates nav live, theme toggle + persistence | imperium-v0.1.0 |
| 2026-07-06 | Data extraction 0b: T10 (18 archetypes), T11 (5 faction templates w/ mandatory-talent modes), T12 (creation constants) → `data.js`; 0b invariants added to harness | Phase 0 roadmap | — | Scout focus/talent split corroborated w/ re-phrased query (book prints it that way); npm test green | imperium-v0.2.0 |
| 2026-07-06 | Data extraction 0c: T13 talent catalog (55 talents, real count vs ~53 estimate) with machine-readable `auto` effect descriptors → `data.js`; `derived.js` reads `auto.type === 'assetCapBonus'` for the permanent-asset cap; 0c invariants added to harness | Phase 0 roadmap | — | npm test green (55 talents; faction counts BG4/Mentat5/Suk3/Guild3/Fremen1; Voice max-3 & Specialist +2 descriptors; every archetype- and faction-suggested talent resolves to a catalog entry). "Foreknowledge" Mentat mandatory option has no core entry — recorded as audit gap | imperium-v0.3.0 |
| 2026-07-06 | Ledger/roadmap/changelog reconciled to match shipped code (T13 + roadmap 0c ticked, this v0.3.0 row added) | Code had advanced to 0c but §2.1/§9/changelog still showed 0b — violated §10 living-spec rule | Prior session ended mid-work after shipping 0c data+tests+SW bump without the same-change spec update | Confirmed via `data.js` key map + green 0c test block + SW at v0.3.0 | imperium-v0.3.0 |
| 2026-07-06 | Data extraction 0d (partial): T14 asset catalog (85 assets, real count vs ~40 estimate) as `DATA.assets` with category/tangible/quality/`defensive`/`fast`/rider fields + `DATA.wealth` T15 price ladder (tiers 0–5 + purchase rules) → `data.js`; 0d invariants added to harness | Phase 0 roadmap | — | Two notebook queries; troop Quality ladder + wealth ladder corroborated with a re-phrased query (Conscript 0 / Shield Infantry 1 / Specialist 2 / Elite 3–4 / Fedaykin·Sardaukar 4; +4 = personal ornithopter). npm test green (85 assets, troop ladder, Crysknife 1, ornithopter `fast`, shields `defensive`, wealth tiers 0–5). T16–T21 House tables still pending | imperium-v0.4.0 |
| 2026-07-06 | Data extraction 0d cont.: T16 (House types) + T17 (domains). **Scope correction**: numeric House economy (skill arrays, domain income table, Income phase) relocated from core to `data-great-game.js` (`EXPANSION.houseManagement`, greatGame toggle); `data.js` keeps only narrative `houseTypes` (4 names) + `houseDomains` (9 names) + `houseScopeNote`. Locked §3.5/§3/§7 revised to match; ledger T16/T17 + T36 updated | Source says the numeric House economy is Great Game crunch, not Core — §3.5/§3/§7 had conflated the two | Earlier System-Profile extraction (Stage A) recorded the House economy as core; re-query attributed skill arrays + income table to The Great Game | Two notebook queries; source attribution corroborated with a differently-phrased query (a/b/c/d/e per-book breakdown: types & domain names = Core; skill arrays, income table, Income phase = Great Game). User approved gating behind the greatGame toggle. npm test green (12 new House checks incl. a computed income-formula + floor sample: Military-tangible primary Machinery = 15R/26W, Understanding-societal secondary floored to 2R/26W) | imperium-v0.5.0 |
| 2026-07-06 | Data extraction 0d complete: T18 homeworld options + T19 (13 House roles) + T20 (enemy d20 tables) + T21 (House trait examples) → `data.js` (all core narrative); 0d roadmap item ticked | Phase 0 roadmap | — | Two notebook queries. **T20 correction**: enemy Reasons is a **10-entry d20** (Stage A recorded 9) — missing "No Reason" (19–20); corroborated with a differently-phrased query confirming d20 ranges + Dislike = +1 Difficulty. §3.5 step 7 + ledger T20 fixed. npm test green (5 new checks: 6 homeworld categories, 13 roles, Hatred 1–20 coverage, 10 Reasons incl. "No Reason", 3 reputation examples) | imperium-v0.6.0 |
| 2026-07-06 | Data extraction 0e begins: T27 NPC tier build recipes (Minor/Notable/Major + general NPC rules) → `NPCS.tierRecipes` in `data-npcs.js` | Phase 0 roadmap; T28/T29 stat blocks build against these recipes so T27 goes first | — | One notebook query; recipes independently corroborate the Stage A §3.13 record (Minor 6/5/5/4/4 one-hit defeat; Notable 7/6/5/5/4; Major 4+11 cap 8) with added precision (Minor focus scaling 7→2/8→3, single Quality-Drive typ 5, NPC Special Abilities in place of talents, 3 Threat = Determination effect). npm test green (5 new checks). T28–T32 pending | imperium-v0.7.0 |
| 2026-07-06 | Data extraction 0e complete (Phase 0 data done): 6 NPC special abilities + T28 (25 generic stat blocks) + T29 (11 iconics) → `data-npcs.js`; T30 (9 iconic PC pregens, built from the iconics) → `data-pregens.js`; T31 story-hook d20 generator → `data.js`; T32 satisfied by T20. Ledger T28–T32 + roadmap 0e + Phase 0 parent ticked | Phase 0 roadmap; user asked to finish 0e | — | Six notebook queries (special abilities; 3 batches of generic blocks; 2 batches of iconics + 1 targeted follow-up). **Source gaps recorded, not invented**: Rabban & Fenring numeric stats absent from notebook (two re-phrased queries) → `statsIncomplete`; Merchant assets not listed; no Paul block. Generic-block tiers not printed → inferred from build (skill 8 ⇒ Major), flagged `tierInferred`. npm test green (149 checks incl. 25 blocks validated for 5-skill/5-drive/focus-skill-id integrity, 9 pregens round-tripping normalizeCharacter, story-hook d20 index mapping) | imperium-v0.8.0 |
| 2026-07-06 | Phase 1 (partial): character creation wizard (8 steps + legality validation) + one-tap pregens built in `wizard.js`; entry points wired into Home (`screens.js`) and Sheet; `sheet.js` now renders a read-only character summary; wizard/summary styles added to `styles.css` | Phase 1 roadmap; turns Phase-0 data into interactive creation | — | Browser-verified end-to-end (own server on :8399, other chat holds :8321): built a Duelist through all 8 steps → localStorage record is schema-correct (skills base+5, 8/7/6/5/4 drive permutation, 3 statements on 8/7/6, talent source-tagging, Crysknife Q1 preserved, Determination 1); pregen path instantiated Duncan Idaho as a PC; 0 console errors; 0px overflow at 360px on sheet + wizard. Data harness still 149 green. **Known gap logged**: wizard doesn't block faction-restricted talents for non-faction PCs | imperium-v0.9.0 |
| 2026-07-06 | Source gaps closed from the **owner's printed-book transcriptions**: Rabban + Fenring full stats, **Paul Atreides added** (12th iconic, "Kwisatz Haderach in Waiting"), Merchant assets (Information Network, Ornithopter, Warehouse), iconic no-asset-line confirmed. **Discovery:** the transcription proved the notebook had served Rabban's numbers under Feyd-Rautha's name (identical skills/drives/focuses/statements) — Feyd's numerics reset to `statsIncomplete` pending his printed page. Jessica's talent name normalized to 'Prana-Bindu Conditioning'. Pregens now 11 (Feyd out, Paul/Rabban/Fenring in) | User supplied the missing data + photos transcription | Notebook conflated two adjacent stat blocks (Rabban/Feyd) — caught only because the printed page contradicted the recorded Feyd numbers | npm test green (T29: 12 iconics, exactly-Feyd blocked, owner-stat spot checks; T30: 11 pregens); browser-verified pregen picker | imperium-v0.10.0 |
| 2026-07-06 | **Feyd-Rautha stat block completed** ("Elegant Knife Fighter") from the owner's printed page: Battle 7/Communicate 6/Discipline 5/Move 7/Understand 6; drives 6/7/4/8/5; focuses Short Blades, Intimidation, Listening, Swift; 3 statements. Confirms the conflation — his skills/focuses/statements differ from Rabban's (drives coincidentally matched). **All 12 iconics now complete; zero source gaps remain in T29/T30.** Pregens now 12 | User supplied Feyd's printed page | — | npm test 152 checks green (all 12 iconics stat-complete, Feyd≠Rabban skills asserted, 12 pregens); browser-verified: picker lists 12, Feyd instantiated end-to-end (Battle+Power TN 15, 3 statements, Det 1, routed to sheet), 0 console errors, 0px overflow at 375px | imperium-v0.11.0 |
| 2026-07-06 | **Wizard playtest-feedback pass** + new ledger **T39** (`DATA.creationGuidance`, extracted from the notebook: 8 example statements/drive, statement-writing tips, per-drive ambition themes + Kara example, appearance/relationship prompts). Wizard fixes: focus name → dependent dropdown limited to the chosen skill's focuses (+ custom); drive dropdowns exclude already-taken array values; drive-statement example pickers + tips; Finishing ambition/appearance/relationship guidance. Sheet: traits tagged by source (reputation now visible), Appearance/Relationships shown | User playtest feedback (focuses unfiltered/missing, drive values reusable, no statement help, reputation/finishing details not visible) | **Routing bug found + fixed:** creating/instantiating a character while already on `#/sheet` set an unchanged `location.hash`, so the router's `hashchange` never fired and the sheet didn't re-render — added `goToScreen()` which force-dispatches `hashchange` when already on target | npm test 156 green (T39 guidance invariants); browser-verified full 8-step build (Duelist): focus dropdown shows only Battle's 13 (no leakage) + Other, Faith excludes 8 & Power excludes 8/7/6, example-insert works, Finishing shows Duty ambition themes + prompts; sheet shows "Secretive reputation" pill + Appearance/Relationships; pregen-from-sheet now re-renders; 0 console errors, 0px overflow | imperium-v0.12.0 |
| 2026-07-06 | **House wizard built** (7 steps) + focus dropdown "Other…" custom entry **removed** (focuses now book-list only, per user) + House-not-gated design + Merchant source-gap **retracted**. Home surfaces House + character creation side by side (House-first recommended, never gated); character Finishing gains a House-role picker; `normalizeHouse` added to `derived.js`, `store.getHouse` normalizes on read. Great Game toggle drives the House skill-array + domain-income layer | Phase 1 House wizard; user design ruling (House is shared/group-level — joining an existing House must not require rebuilding it) | Earlier "Merchant assets not listed" / "iconic assets not printed" were logged as source gaps; **re-query proved the Merchant IS printed (Information Network/Ornithopter/Warehouse) — a NotebookLM retrieval miss, now corrected in `data-npcs.js`**; iconic no-asset-lines re-confirmed as genuinely by-source. Also fixed: editing a core House after enabling Great Game left `skillAssign` null → guarded with `ensureSkillAssign` | npm test green (+Merchant-assets guard, +`normalizeHouse` core/GG checks); browser-verified core House (skills/wealth/resources null) **and** Great Game House (Minor 7/6/6/5/4; income 17R/52W) end-to-end, role links character↔House, focus dropdown has no "Other…", 0 console errors, 0px overflow at 360px | imperium-v0.13.0 |
| 2026-07-06 | **House wizard feedback pass** (user): (1) domain tier options **ghost/disable once the Great Game primary/secondary cap is hit**; (2) Homeworld gained a **name field** (`homeworld.name`, added to `normalizeHouse`); (3) **enemy count/type tied to House type** — added `DATA.houseEnemies.perType` (Nascent 0 · Minor 1 · Major 2 · Great 2+ with rival make-up); (4) enemy model expanded to **name · type · Hatred · Reason · notes** with a per-type guidance line + count pill | User House-wizard feedback | Enemy-count-per-type corroborated against the notebook (Nascent none / Minor 1 Minor / Major 1 Major+1 serving Minor / Great 1 Great or 2 Majors/faction + allied Minors; each enemy named + typed, then d20 Hatred & Reason) — recorded in Core `houseEnemies` alongside the existing tables | npm test green (+perType counts/types, +`homeworld.name` in normalizeHouse); browser-verified (Great Game): domain caps ghost sibling options, Homeworld name "Caladan" saved, enemy "House Acturi" (Minor · Kanly · Theft · notes) round-trips through save + edit-reload, 0 console errors, 0px overflow at 360px | imperium-v0.14.0 |
| 2026-07-06 | Enemy count **enforced** (user): the House wizard's Enemies step now validates `enemies.length ≥ perType.count` — a minimum, so a GM can still add more rivals but can't finish short. Nascent (0) always passes | User asked to enforce (was guidance) | — | browser-verified (core mode, House Major = 2): finishing with 0 and with 1 enemy is **blocked** with a clear toast ("A House Major starts with 2 enemies…"), pill tracks 0/2→1/2→2/2, and at 2/2 the House establishes and saves both rivals; npm test still green | imperium-v0.15.0 |
| 2026-07-06 | **Great House enemy floor corrected** from 2 → **3** after the user supplied the exact rulebook text. Nascent/Minor/Major (0/1/2) confirmed exact; Great reads "one Great House (or two Majors, or a faction) **plus a host of minor Houses**" — the open-ended "host" is floored at 2 Minors, so a Great House enforces ≥3 enemies (`perType.great` = count 3, types `['great','minor','minor']`) | User pasted the printed enemy rules | Prior extraction floored Great at 2, which under-counted the "host of Minors" | npm test green (enemy-count check updated to Great 3); ledger T20 / §3.5 step 7 / roadmap updated | imperium-v0.16.0 |
| 2026-07-06 | **Description-refinement pass** (owner supplied the book's authoritative text): enriched `DATA.skills[].desc` + `DATA.drives[].desc` to the book's fuller wording (Discipline now includes overt authority over others; Power named as ego; Faith-in-faction/friends; Justice can uphold bad laws; Truth even when dangerous) + added short `tag` per skill/drive. Enriched `creationGuidance` ambition guidance (intro, fuller per-drive themes, **ambition-change rule**). Rules library gained **Skills**, **Drives**, and **Ambition** cards, and the **Focus examples** card now shows each focus's description in collapsible per-skill lists | Owner pasted authoritative skill/drive/focus/ambition text; asked to add it to the app | — | npm test 167 green (skill/drive desc length + nuance checks, ambition-change-rule check, every-focus-has-desc); browser-verified rules library: Skills/Drives/Ambition cards render w/ book nuance, focus lists expand w/ descriptions, search works, 0 console errors, 0px overflow at 360px (all focus lists expanded) | imperium-v0.17.0 |
| 2026-07-06 | **Archetype count corrected 18 → 20** (owner's book): added **Smuggler** (Move/Battle) and **Strategist** (Understand/Battle), which the initial NotebookLM extraction had missed and I'd wrongly recorded as "faction suggestions with no matching archetype." Added paraphrased `desc` + `driveSuggestions` to all 20 archetypes; `desc` + `factionIntro` cautions to all 5 faction templates. New rules-library **Archetypes** and **Faction templates** cards; wizard Concept/Archetype steps now show descriptions. Checkpoint ruling #5 (Scout focus/talent reconciliation) recorded | Owner supplied full archetype text + a 20-row summary table; asked to add everything | NotebookLM omitted 2 archetypes (same class of gap as the Feyd/Rabban conflation) — caught by the owner's printed table | npm test 171 green (20 archetypes, Smuggler/Strategist stats, every archetype desc+driveSuggestions, every faction suggested-archetype resolves, faction descs); browser-verified via cache-busted fresh import (preview HTTP-cached stale wizard.js module — served file + tests confirm correct): 20 archetype cards w/ descriptions, Strategist/Smuggler show flavor, faction intro + BG desc render, 0 console errors, 0px overflow at 360px | imperium-v0.18.0 |
| 2026-07-06 | **House wizard bug fix**: editing a House first built in core mode after enabling The Great Game left its pre-existing domains without an asset `subtype`, so they showed 0 income and failed subtype validation despite a populated-looking dropdown. Added `ensureDomainSubtypes(state)` (back-fills the first subtype for any domain missing one when greatGame is on), called in `hStepDomains` + `hValidateDomains` | User: "fix the house wizard" | Core-mode domains persist as `{id,tier}` (no subtype); the Great Game domain step assumed a subtype existed | Browser-verified (cache-busted fresh import — preview HTTP-caches modules): core→GG edit now computes income (16R/52W) and advances; fresh GG create + establish (Major 8/7/6/5/4 skills, 3 domains all subtyped, 21R/72W, 2 enemies) saves + routes home; Home shows House + income; 0 overflow at 360px, 0 console errors. npm test 172 green (+guard: every asset subtype yields non-zero primary & secondary income, so a defaulted subtype always works) | imperium-v0.19.0 |
| 2026-07-06 | **Character-creation rules pass from the owner's Core Ch.3 text.** (1) **Focus rule corrected**: creation now requires **≥1 focus on the primary AND ≥1 on the secondary skill** (`DATA.creation.focuses.minOnSecondarySkill`; enforced in `validateFocuses`) — previously only the primary was enforced, letting a character finish with no secondary-skill focus (a rules bug). (2) **Skill/drive/asset-category-bound talents** (Bold, Advisor, Cautious, Cool Under Pressure, Collaboration, Resilience, To Fight Someone Is to Know Them, The Reason I Fight, Specialist) now **pick their parameter in the wizard and may repeat** with a different parameter (Bold (Battle) + Bold (Communicate)); stored as `talents[{name,skill?/drive?/category?,source}]` (§7 schema extended). `permanentAssetCap`/build now key talents by base name (also fixes a latent cap-miss for parameterised Specialist). (3) New **"One Way to Choose Drives"** pairwise helper in the Drives step (`DATA.creationGuidance.driveRanking` + pure `rankDrivesFromComparisons` in `rules.js`). (4) Authoritative **`stepNotes`** (skills/focuses/talents/drives) surfaced as wizard intros + new rules-library **"Building a character"** and **"Choosing drives"** cards. §3.4/§3.5/§7/T39 updated. | User: "Add all the info to the app" (three Core Ch.3 excerpts: skills/focuses/talents, drives + pairwise method, full 55-talent catalog) | Focus secondary-skill requirement was omitted in the original Stage-A extraction; talent skill/drive binding was never wired into the wizard UI | **Headless browser (Chromium via playwright-core) end-to-end**: built a Duelist — all-primary focuses **blocked** with "≥1 on your secondary skill (Move)", fixed to 3 Battle + 1 Move; Talents step added **Bold (Battle) + Bold (Communicate)** (both saved with `skill` params) + archetype talent; drive-ranking helper filled 8/7/6/5/4 (duty→truth) and statements landed on the top three; saved record schema-correct; 0 console errors, 0px overflow at 360px. Talent catalog (T13) re-audited against the full 55-talent text — **no data changes needed** (names, faction counts, effects, `auto`, requirements, `creationOnly` all matched). npm test **180 green** (+8 creation-rule checks). | imperium-v0.20.0 |
| 2026-07-06 | **House domain detail + starting Threat added** from the owner's House-management text. (1) Core: enriched the **"Rival House enters"** Threat spend ("House Threat" — spend 1 Threat to bring an enemy House into the adventure, in person or as a rumor). (2) Great Game (`EXPANSION.houseManagement`, greatGame toggle — placed here per the corroborated split that the detailed House layer is *Houses of the Landsraad*, not Core): `startingThreatPerPlayer` (Nascent 0 · Minor 1 · Major 2 · Great 3), `domainGuidance` (primary = near-monopoly the House is famed for; secondary = contested growth area), `subtypeDefs` (Machinery/Produce/Expertise/Workers/Understanding), and `domainDetails` — a description + example lists for all **9 domains × 5 subtypes = 45 lists**. (3) UI: House-wizard Type step shows Threat/player; Domains step shows the primary/secondary guidance + each chosen domain's description & subtype examples; new greatGame-gated rules-library cards "House domains (Great Game)" + "House type & Threat (Great Game)". §3.5/T36 updated. | User: "Add all of these to the app" (House Type & Threat, domains, starting domains, areas of expertise, House Threat) | Detailed House-management content belongs to The Great Game per the corroborated core-vs-toggle split (Core lists domain *names* only); the enemy-House spend was already core (kept there, wording enriched) | **Headless browser (greatGame on)**: rules library shows both gated cards with all 9 domains + 45 example lists + the Threat/domain table; House wizard Major shows "2 Threat per player", Domains step shows the primary/secondary guidance and (Military primary) "Battlefield weapons…" example + live income; 0 console errors, 0px overflow on House steps at 360px. npm test **186 green** (+6 House-detail checks). | imperium-v0.21.0 |
| 2026-07-06 | **House-management placement corrected: it's Core, not Great Game** (owner: "the information above are all from core book"). Moved the domain detail (`houseDomainDetails` — 9 domains × description + 5 subtype example lists), `houseDomainGuidance` (primary/secondary meaning), `houseSubtypeDefs`, `houseDomainCounts` (starting domains per type), and `houseStartingThreat` (0/1/2/3 per player) from `data-great-game.js` → **`data.js` (Core, always on)**. `EXPANSION.houseManagement` now holds **only the Wealth/Resources economy** (skill arrays + income table). UI un-gated: the House wizard shows starting Threat, the primary/secondary guidance, and each domain's description + example lists in **core mode**, and now **enforces the starting domain counts per type in every mode** (previously core was free-form). Rules-library cards renamed "House domains" / "House type & Threat" and shown always. §3.5/§3/T16/T17/T36/`houseScopeNote` revised. | Owner confirmed the House-creation chapter (type & Threat, domains, starting domains, areas of expertise, House Threat) is printed in the **Core Rulebook** — reversing the earlier NotebookLM-corroborated split that had attributed the domain counts + detail to *Houses of the Landsraad* | **Headless browser, both modes**: core mode (greatGame off) — House Major enforces "1 primary + 2 secondary" (finishing short is blocked), shows starting Threat 2/player, and Military domain shows its description + all 5 subtype example lists, 0 income numbers; Great Game on — same plus skill array + per-subtype income; rules library shows "House domains" + "House type & Threat" cards regardless of toggle; 0 console errors, 0px overflow at 360px. npm test **188 green**. | imperium-v0.22.0 |
| 2026-07-06 | **Creation in Play extracted (ledger T40)** from the owner's Core "Running Creation in Play" text. `DATA.creationInPlay`: intro + the 7 limited-use **define options** (trait ×1 · skills ×3 at 4/5/6 · focuses ×2 · talents ×2 · drives ×4 · ambition ×1 · assets ×2), the **drive-importance table** (1st–5th → 8/7/6/5/4 — corroborates `creation.driveArray` and the statement-on-6+ rule), and the rules notes (new statement → +1 Determination; no drive-challenge until complete; GM time-limit; complete → advancement). Surfaced as a rules-library **"Creating a character in play"** card. §2.1 (T40), §3.5 (alternative-method note), Phase 2 roadmap (interactive tracker), changelog updated. | Owner pasted the Core "Running Creation in Play" rules; added as reference (the interactive tracker needs the Phase 2 live sheet, so it's data + rules card now, UI later) | Data-level: npm test **192 green** (+4 T40 checks: 7 options, exact use counts, drive-importance = 8/7/6/5/4, Determination/no-challenge notes). Headless browser: rules library renders the "Creating a character in play" card with the define-options table + drive-importance table; 0 console errors, 0px overflow at 360px. | imperium-v0.23.0 |
| 2026-07-06 | **GitHub Pages deployment** — added `.github/workflows/pages.yml` (static, no-build deploy to Pages on every push to `main` via `configure-pages`/`upload-pages-artifact`/`deploy-pages`), a `.nojekyll` marker, and a README "Hosted on GitHub Pages" section. App paths were already relative (`scope: "./"`, `start_url: "./index.html"`, relative module/SW registration), so it serves correctly from the `/dune-player/` sub-path. | User: "Create the GitHub page / set up GitHub Pages" | — | **Headless browser under a `/dune-player/` sub-path**: boots, all 4 tabs render, manifest/icon/styles/data modules all resolve (0 failed requests), 0 console errors, 0px overflow at 360px — confirming the sub-path hosting works. `npm test` still green. | imperium-v0.23.0 |
| 2026-07-06 | *(parallel branch 9ns2vl)* **Supporting characters added** (ledger **T41** · new §3.18) from the owner's printed transcription: `DATA.supportingCharacters` — the second, player-controlled character type (Minor + Notable creation recipes with Momentum/Threat costs + optional-extra costs, per-adventure/free-one limits) plus the uncontrolled-character rules (Difficulty-0 tests, assist, follow orders, sacrifice, count-as-trait, take-control-on-defeat). Also **enriched T24 Advancement** to the book's named earn triggers (Pain/Failure/Peril/Ambition/Impressing the Group) + nuances (each skill advances once; retrain-skill drop doesn't count as that advance; drives change only via §3.8). New rules-library **Supporting characters** card + enriched Advancement card | User supplied printed transcriptions (Supporting Characters + Advancement pages), asked to add them | — | npm test green (+4 checks: named earn triggers; minor 6/5/5/4/4 & drive 4–8 typ 5; notable 7/6/5/5/4 drives 7&6; 5 uncontrolled actions incl. Sacrifice + notable 5/adventure) | (parallel-branch tag; unified at v0.24.0) |
| 2026-07-06 | *(parallel branch 9ns2vl)* **Phase 2 — Core Tracker (core)**: live in-play sheet (`sheet.js` rewritten) — persistent Momentum/Threat/Determination header (`poolsHeader`, exported), drive-statement challenge/recover (§3.8), traits add/remove w/ complication flag, assets add/remove + Quality steppers + make-permanent with the **5-permanent cap enforced**, Determination stepper (cap 3), editable notes, delete-character; every edit persists + re-renders. **JSON export/import** of characters+House+pools in Settings (`store.exportAll`/`importAll`, `dataCard` in `screens.js`); new `.gitignore` (node_modules), dev-only `playwright-core` added for the browser harness | Phase 2 roadmap; user asked to start Phase 2 | — | npm test green (+3: exportAll shape, importAll foreign-file reject, importAll round-trip+normalize). Browser-verified headless (Chromium at 360px): pools stepper persists, statement Challenge toggles + persists, Export JSON present, 0px overflow, 0 console errors | (parallel-branch tag; unified at v0.24.0) |
| 2026-07-06 | **Merged the two parallel work branches into `main`** (`claude-md-codebase-review-8k3cbc` + `claude-md-review-9ns2vl`) and set up **GitHub Pages** hosting. Reconciled the branches' overlaps: the **T40 collision** → Creation in Play stays **T40**, Supporting characters becomes **T41**; T39 kept the superset (with `stepNotes`/`driveRanking`); Phase 2 roadmap merged (live sheet + pools header + export/import done, Creation-in-Play tracker still pending); `sheet.js` live sheet now also shows each talent's bound skill/drive/category parameter; single `pages.yml` (with `configure-pages enablement: true`) + `.nojekyll`; CACHE_VERSION unified. | User: "Merge all the branches to main. Set up GitHub page." | Two sessions developed in parallel from the same base, both editing CLAUDE.md/service-worker.js/sheet.js and both using T40 | `npm test` green after merge (combined data + Phase-2 store + supporting-character + creation-in-play + House checks); headless browser under the `/dune-player/` sub-path boots with all tabs, every asset resolving, 0 console errors, 0px overflow; Pages workflow runs on push to `main`. | imperium-v0.24.0 |
| 2026-07-06 | **Wizard suggestion/lock UX pass** (user-directed, questions answered up front). (1) **Concept/Archetype:** when a faction template is chosen, the Archetype step splits into a **"Suggested for [Faction]"** group on top + **"Other archetypes"** below (`f.suggestedArchetypes`). (2) **Archetype fixes** now shown as locked labels — a "fixed" recap (trait + primary 6 / secondary 5) on the Archetype step and **"primary/secondary · fixed base"** tags on the Skills step (the +5 points still work). (3) **Pre-fill from suggestions** (editable): picking an archetype pre-fills its 2 suggested focuses (on primary/secondary skill, tagged "suggested"; the focus dropdown now also includes a suggested name not in the generic examples list), its suggested talent, and its 2 suggested drives at **8 and 7** (`applyArchetypeSuggestions`); changing archetype/faction **re-applies** the new suggestions. (4) **Mandatory talents locked:** a faction's fixed ('all'-mode) talent renders **checked + disabled** with a "required" tag; a 'choose-one' ('atLeastOne') faction **locks after the first pick** with an "Unlock to change" control, driven by a live **required/✓ banner**. | User request: faction suggested-archetypes first + fixed mandatory talent; archetype fixed trait/skills, suggested focuses/talent, highlighted-but-editable drives | — | **Headless browser (Chromium) end-to-end**: Bene Gesserit + a suggested archetype → "Suggested for"/"Other" groups render, archetype "fixed" recap + 2 skill "fixed base" tags, 2 pre-filled focuses tagged "suggested", Prana-Bindu **locked disabled** with required tag + banner, talents pre-filled 2/3; Fremen 'choose-one' → required banner, then picking Dedication locks it with "Unlock to change" + ✓ banner, unlocking restores the required banner; 0 console errors. npm test **199 green** (+1: every archetype supplies 2 focuses/1 talent/2 drive suggestions for pre-fill). | imperium-v0.25.0 |
| 2026-07-06 | **Talents-step revision** (user refinement of v0.25.0). The Talents step is now three grouped sections: (1) **"Mandatory — choose one"** — a **radio** group of the faction's mandatory options; the player picks exactly one (single-option factions like Bene Gesserit show one radio). A drive/skill-bound mandatory (e.g. Fremen's "The Reason I Fight") reveals an inline param picker when selected; switching radios replaces the pick. Tracked via `state.mandatoryOption/Param/Key`; `clearMandatory` resets it on faction change. (2) **"Suggested for your archetype"** — the archetype's talent(s) shown **highlighted but NOT pre-selected** (removed the auto-fill). (3) **"All talents"** — searchable remainder. Also **removed the Skills "fixed base" tags** (kept the archetype's plain trait/primary/secondary recap on the Archetype step). Focus + drive pre-fill (8/7) unchanged. | User: "Factions — mandatory talents (choose one from the list); archetype talents are suggestions; Skills remove fixed base tag; all these show at the top." | v0.25.0 had over-locked mandatory talents (disabled checkboxes) and pre-selected the archetype talent | **Headless browser (Chromium)**: Bene Gesserit → 1 mandatory radio, req→✓ banner on pick, status 1/3 (archetype talent not auto-selected); Fremen → 7 radios, selecting drive-bound "The Reason I Fight" shows a drive param picker (still required until chosen, then ✓), switching to Dedication replaces it (stays 1/3); Skills step shows **0** "fixed base" tags; 0 console errors. npm test **199 green**. | imperium-v0.26.0 |
| 2026-07-06 | **Phase 3 begins — the 2d20 skill-test roller** (`roller.js`, replacing the stub). `openRollDialog(character)`: pick skill+drive (live target number = Skill+Drive), Difficulty 0–5, **buy 1–3 extra dice** (spend Momentum, affordability-checked, or give the GM Threat), an **applicable-focus** toggle (crit on ≤ Skill), the roll (**nat 1 = 2-success crit, nat 20 = complication**), successes vs Difficulty, and **Momentum generation** from extra successes (pool capped at 6). **Determination**: spend 1 for an **automatic 1** before rolling, and **re-roll** selected dice after — both **gated on an unchallenged drive statement on the chosen drive** (§3.1). Each applied roll writes to the **roll log** (`store.appendRoll`), announced `aria-live`, with the recent 8 shown on the sheet. Entry point: a "⚂ Roll a test" button on the live sheet; pure `evaluateDice` unit-tested. Deferred to later Phase-3 passes: opposed tests, assists, trait auto-application, talent-embedded automation, Architect mode, T38 citations. | User: "Let's do the next phase" (Phase 3) | roller.js was a stub throwing "Dice engine arrives in Phase 3" | npm test **205 green** (+6 dice-engine checks: nat-1 crit, nat-20 complication, focus crit ≤ skill, plain success, a mixed pool 5 successes/1 complication). **Headless browser**: injected a Battle 6 / Duty 8 character → TN 14; Determination checkbox **enabled on Duty (has statement), disabled on Truth (none)**; roll [20,1] → 2 successes + 1 complication → Success vs Diff 1, +1 Momentum applied to the pool; roll log shows the entry; 0 console errors, 0px overflow at 360px. | imperium-v0.27.0 |
| 2026-07-06 | **Wizard refinement pass** (user): (1) **Talents — faction-restricted talents hidden** unless the character belongs to that faction (`talentAllowed`; closes the long-standing gap — Voice shows for Bene Gesserit, hidden otherwise; Mentat talents hidden for a BG PC). (2) **Focuses — the first two are fixed to the primary/secondary skill** (rendered as a locked `.locked-skill` label with a primary/secondary tag; only the focus *name* is chosen); the other two stay free. Structurally guarantees the ≥1-primary + ≥1-secondary rule. (3) **Skills — primary/secondary tagged** ("primary"/"secondary" on the Skills step). (4) **Assets — tag wording** clarified: `Q1` → `Quality 1`, `either` → `tangible/intangible`. | User request | — | **Headless browser (Chromium)**: non-faction PC → Voice/Mentat Discipline absent, no "faction-only" tag; Bene Gesserit → Voice present, Mentat Discipline absent; Focuses show 2 locked-skill labels (Discipline primary / Understand secondary) + 2 free rows; Skills show primary/secondary tags; Assets show "Crysknife · PERSONAL · TANGIBLE · QUALITY 1" and "Residual Poison · TANGIBLE/INTANGIBLE"; 0 console errors, 0px overflow. npm test **205 green**. | imperium-v0.28.0 |
