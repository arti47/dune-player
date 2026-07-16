// data-oracle.js — Homebrew GM/solo "oracle" idea-generator tables.
//
// NOT rulebook content (§2/§10.8): these are house-made brainstorming word lists for solo play or
// GM prep, not official Dune: Adventures in the Imperium rules. Labeled as such in the UI. Roll a
// d100 on each of the four tables → one word each → a 4-word seed to spark a scene/beat.
//
// Index 0 = roll 1 … index 99 = roll 100.

export const ORACLE = {
  note: 'Homebrew idea generator — not official rules. Roll for a spark, then write it into your notes.',
  tables: [
    {
      id: 'action', label: 'Action',
      words: [
        'Abandon', 'Adapt', 'Ally', 'Ambush', 'Annihilate', 'Assassinate', 'Avenge', 'Awaken', 'Banish', 'Betray',
        'Bless', 'Breed', 'Bribe', 'Capture', 'Challenge', 'Change', 'Claim', 'Command', 'Compel', 'Conceal',
        'Condition', 'Conquer', 'Conspire', 'Continue', 'Convert', 'Crown', 'Curse', 'Deceive', 'Decode', 'Defy',
        'Detonate', 'Distill', 'Dominate', 'Dream', 'Encircle', 'Endure', 'Enslave', 'Escape', 'Escort', 'Excavate',
        'Exile', 'Explore', 'Expose', 'Feint', 'Flee', 'Foresee', 'Fortify', 'Guard', 'Harvest', 'Hunt',
        'Infiltrate', 'Interrogate', 'Irrigate', 'Kneel', 'Liberate', 'Manipulate', 'Marry', 'Meditate', 'Migrate', 'Mourn',
        'Mutate', 'Navigate', 'Negotiate', 'Observe', 'Overrun', 'Parry', 'Pledge', 'Plot', 'Poison', 'Preach',
        'Preserve', 'Prophesy', 'Protect', 'Provoke', 'Punish', 'Purge', 'Raid', 'Ration', 'Reclaim', 'Recruit',
        'Rescue', 'Reveal', 'Revolt', 'Ride', 'Sabotage', 'Sacrifice', 'Salvage', 'Scheme', 'Slay', 'Smuggle',
        'Spy', 'Stalk', 'Start', 'Stop', 'Submit', 'Summon', 'Survive', 'Terraform', 'Track', 'Train',
      ],
    },
    {
      id: 'descriptor', label: 'Descriptor',
      words: [
        'Addictive', 'Alien', 'Amber', 'Ancient', 'Apocalyptic', 'Arid', 'Aristocratic', 'Armored', 'Artificial', 'Austere',
        'Azure', 'Barren', 'Blinding', 'Buried', 'Calculated', 'Ceremonial', 'Colossal', 'Contested', 'Corrupt', 'Coveted',
        'Cruel', 'Cunning', 'Damned', 'Decadent', 'Dehydrated', 'Desolate', 'Destined', 'Devious', 'Devout', 'Disciplined',
        'Distant', 'Divine', 'Doomed', 'Dreadful', 'Duplicitous', 'Dynastic', 'Efficient', 'Embattled', 'Endless', 'Eternal',
        'Euphoric', 'Fanatical', 'Fated', 'Feral', 'Feudal', 'Fierce', 'Forbidden', 'Foreboding', 'Galactic', 'Genetic',
        'Glowing', 'Golden', 'Hallowed', 'Hardened', 'Harsh', 'Hereditary', 'Heretical', 'Hoarded', 'Holy', 'Hooded',
        'Hostile', 'Immortal', 'Imperial', 'Inevitable', 'Intoxicating', 'Isolated', 'Lavish', 'Lethal', 'Logical', 'Masked',
        'Merciless', 'Monstrous', 'Mundane', 'Mysterious', 'Noble', 'Nomadic', 'Offworld', 'Ominous', 'Opulent', 'Oracular',
        'Paranoid', 'Parched', 'Precious', 'Precise', 'Prescient', 'Primal', 'Rhythmic', 'Royal', 'Ruthless', 'Sacred',
        'Savage', 'Scarce', 'Scarred', 'Scorched', 'Searing', 'Secretive', 'Silent', 'Strange', 'Subterranean', 'Twisted',
      ],
    },
    {
      id: 'event', label: 'Event',
      words: [
        'Alliance', 'Anointing', 'Ascension', 'Assassination', 'Auction', 'Audience', 'Betrothal', 'Birth', 'Blockade', 'Bombardment',
        'Boom', 'Bounty', 'Ceasefire', 'Census', 'Collapse', 'Conclave', 'Conscription', 'Coronation', 'Council', 'Coup',
        'Crash', 'Crossing', 'Crusade', 'Decrease', 'Defection', 'Disappearance', 'Discovery', 'Drought', 'Duel', 'Eclipse',
        'Embargo', 'Emergence', 'Emissary', 'Epidemic', 'Eruption', 'Execution', 'Exodus', 'Expulsion', 'Extra', 'Famine',
        'Feast', 'Festival', 'Feud', 'Funeral', 'Gathering', 'Heist', 'Increase', 'Infestation', 'Inheritance', 'Inquisition',
        'Insurrection', 'Invasion', 'Judgment', 'Kidnapping', 'Landing', 'Levy', 'Manhunt', 'Massacre', 'Miracle', 'Mutiny',
        'Omen', 'Ordeal', 'Outbreak', 'Parley', 'Pilgrimage', 'Plague', 'Portent', 'Proclamation', 'Quake', 'Ransom',
        'Rebellion', 'Rebirth', 'Reckoning', 'Reunion', 'Riot', 'Ritual', 'Rumor', 'Sandstorm', 'Scandal', 'Shortage',
        'Siege', 'Skirmish', 'Stampede', 'Standoff', 'Succession', 'Summit', 'Surrender', 'Swarm', 'Tempest', 'Theft',
        'Treason', 'Trial', 'Tribunal', 'Truce', 'Uprising', 'Verdict', 'Vigil', 'Wedding', 'Windfall', 'Withdrawal',
      ],
    },
    {
      id: 'lore', label: 'Lore',
      words: [
        'Abomination', 'Amtal', 'Arrakeen', 'Arrakis', 'Atomics', 'Atreides', 'Axlotl', 'Baliset', 'Bashar', 'Bindu',
        'Bled', 'Butlerian', 'Caladan', 'Carryall', 'Carthag', 'Chakobsa', 'Chapterhouse', 'Chaumurky', 'CHOAM', 'Coriolis',
        'Corrino', 'Crysknife', 'Deathstill', 'Distrans', 'Drumsand', 'Ecaz', 'Elacca', 'Erg', 'Facedancer', 'Faufreluches',
        'Fedaykin', 'Filmbook', 'Fremkit', 'Galach', 'Gammu', 'Ghola', 'Giedi', 'Ginaz', 'Glowglobe', 'Grumman',
        'Harkonnen', 'Harvester', 'Heighliner', 'Holtzman', 'Hunter-Seeker', 'Imperium', 'Ix', 'Kaitain', 'Kanly', 'Karama',
        'Kwisatz', 'Landsraad', 'Lasgun', 'Litany', 'Mahdi', 'Maker', 'Maula', 'Missionaria', 'Naib', 'No-ship',
        'Ornithopter', 'Padishah', 'Paracompass', 'Prana', 'Qanat', 'Qizarate', 'Rakis', 'Razzia', 'Richese', 'Salusa',
        'Sandrider', 'Sandtrout', 'Sandwalk', 'Sapho', 'Sardaukar', 'Sayyadina', 'Scattering', 'Semuta', 'Shadout', 'Shai-Hulud',
        'Shaitan', 'Shigawire', 'Snooper', 'Spiceblow', 'Stoneburner', 'Suk', 'Suspensor', 'Swordmaster', 'Tabr', 'Tanzerouft',
        'Tau', 'Thumper', 'Tleilax', 'Tleilaxu', 'Truthsayer', 'Tupile', 'Verite', 'Wallach', 'Weirding', 'Windtrap',
      ],
    },
  ],
};
