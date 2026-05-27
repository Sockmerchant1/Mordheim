import type { FighterType, Profile, RosterMember } from "./types";

export type AdvanceTableType = "hero" | "henchman";
export type AdvanceStat = keyof Profile;
export type AdvanceKind = "skill" | "stat" | "lad";

export type AdvanceRoll = {
  table: AdvanceTableType;
  dice: [number, number];
  total: number;
  kind: AdvanceKind;
  label: string;
  statOptions: AdvanceStat[];
  followUpDie?: number;
  forcedStat?: AdvanceStat;
};

export const ADVANCE_STATS: AdvanceStat[] = ["M", "WS", "BS", "S", "T", "W", "I", "A", "Ld"];

export const CORE_MAXIMUM_PROFILES: Record<string, Profile> = {
  human: { M: 4, WS: 6, BS: 6, S: 4, T: 4, W: 3, I: 6, A: 4, Ld: 9 },
  elf: { M: 5, WS: 7, BS: 7, S: 4, T: 4, W: 3, I: 9, A: 4, Ld: 10 },
  dwarf: { M: 3, WS: 7, BS: 6, S: 4, T: 5, W: 3, I: 5, A: 4, Ld: 10 },
  ogre: { M: 6, WS: 6, BS: 5, S: 5, T: 5, W: 5, I: 6, A: 5, Ld: 9 },
  halfling: { M: 4, WS: 5, BS: 7, S: 3, T: 3, W: 3, I: 9, A: 4, Ld: 10 },
  beastman: { M: 5, WS: 7, BS: 6, S: 4, T: 5, W: 4, I: 6, A: 4, Ld: 9 },
  possessed: { M: 6, WS: 8, BS: 0, S: 6, T: 6, W: 4, I: 7, A: 5, Ld: 10 },
  vampire: { M: 6, WS: 8, BS: 6, S: 7, T: 6, W: 4, I: 9, A: 4, Ld: 10 },
  skaven: { M: 6, WS: 6, BS: 6, S: 4, T: 4, W: 3, I: 7, A: 4, Ld: 7 },
  skavenPestilens: { M: 5, WS: 6, BS: 6, S: 4, T: 5, W: 3, I: 7, A: 4, Ld: 7 },
  ghoul: { M: 5, WS: 5, BS: 2, S: 4, T: 5, W: 3, I: 5, A: 5, Ld: 7 },
  orc: { M: 4, WS: 6, BS: 6, S: 4, T: 5, W: 3, I: 5, A: 4, Ld: 9 },
  blackOrc: { M: 4, WS: 7, BS: 6, S: 5, T: 6, W: 3, I: 5, A: 4, Ld: 9 },
  goblin: { M: 4, WS: 5, BS: 6, S: 4, T: 4, W: 3, I: 6, A: 4, Ld: 7 },
  skink: { M: 6, WS: 5, BS: 6, S: 4, T: 3, W: 3, I: 7, A: 4, Ld: 8 },
  saurus: { M: 4, WS: 6, BS: 0, S: 5, T: 5, W: 3, I: 4, A: 5, Ld: 10 },
  ungor: { M: 6, WS: 6, BS: 6, S: 4, T: 4, W: 3, I: 7, A: 4, Ld: 7 },
  centigor: { M: 9, WS: 7, BS: 6, S: 4, T: 5, W: 4, I: 6, A: 4, Ld: 9 },
  minotaur: { M: 6, WS: 6, BS: 5, S: 5, T: 5, W: 5, I: 6, A: 5, Ld: 9 }
};

export function rollAdvance(table: AdvanceTableType, random = Math.random): AdvanceRoll {
  const dice: [number, number] = [rollD6(random), rollD6(random)];
  const total = dice[0] + dice[1];
  return table === "henchman" ? henchmanAdvanceRoll(dice, total) : heroAdvanceRoll(dice, total, random);
}

export function advanceTableForMember(member: RosterMember): AdvanceTableType {
  return member.kind === "henchman_group" ? "henchman" : "hero";
}

export function canAdvanceStat(
  member: RosterMember,
  fighterType: FighterType,
  maximumProfile: Profile | undefined,
  stat: AdvanceStat
) {
  if (!maximumProfile) return false;
  if (member.currentProfile[stat] >= maximumProfile[stat]) return false;
  if (member.kind === "henchman_group" && member.currentProfile[stat] >= fighterType.profile[stat] + 1) return false;
  return true;
}

export function legalAdvanceStats(
  member: RosterMember,
  fighterType: FighterType,
  maximumProfile: Profile | undefined,
  stats: AdvanceStat[] = ADVANCE_STATS
) {
  return stats.filter((stat) => canAdvanceStat(member, fighterType, maximumProfile, stat));
}

export function applyStatAdvance(profile: Profile, stat: AdvanceStat): Profile {
  return {
    ...profile,
    [stat]: profile[stat] + 1
  };
}

export function maximumProfileForFighterType(fighterType: FighterType, warbandRace?: string): Profile {
  if (!fighterType.canGainExperience) return fighterType.profile;
  const key = maximumProfileKeyForFighterType(fighterType, warbandRace);
  const maximum = CORE_MAXIMUM_PROFILES[key] ?? CORE_MAXIMUM_PROFILES.human;
  return maxProfileValues(maximum, fighterType.profile);
}

export function advanceResultLabel(roll: AdvanceRoll, selectedStat?: AdvanceStat, selectedName?: string) {
  const rollText = `${roll.table === "hero" ? "Hero" : "Henchman"} advance ${roll.dice.join("+")}=${roll.total}`;
  if (roll.kind === "skill") return selectedName ? `${rollText}: New Skill - ${selectedName}` : `${rollText}: New Skill`;
  if (roll.kind === "lad") return `${rollText}: Lad's Got Talent`;
  return selectedStat ? `${rollText}: +1 ${selectedStat}` : `${rollText}: ${roll.label}`;
}

function heroAdvanceRoll(dice: [number, number], total: number, random: () => number): AdvanceRoll {
  if (total <= 5) return { table: "hero", dice, total, kind: "skill", label: "New Skill", statOptions: [] };
  if (total === 6) {
    const followUpDie = rollD6(random);
    return { table: "hero", dice, total, kind: "stat", label: "+1 Strength or +1 Attack", statOptions: ["S", "A"], followUpDie, forcedStat: followUpDie <= 3 ? "S" : "A" };
  }
  if (total === 7) return { table: "hero", dice, total, kind: "stat", label: "Choose +1 WS or +1 BS", statOptions: ["WS", "BS"] };
  if (total === 8) {
    const followUpDie = rollD6(random);
    return { table: "hero", dice, total, kind: "stat", label: "+1 Initiative or +1 Leadership", statOptions: ["I", "Ld"], followUpDie, forcedStat: followUpDie <= 3 ? "I" : "Ld" };
  }
  if (total === 9) {
    const followUpDie = rollD6(random);
    return { table: "hero", dice, total, kind: "stat", label: "+1 Wound or +1 Toughness", statOptions: ["W", "T"], followUpDie, forcedStat: followUpDie <= 3 ? "W" : "T" };
  }
  return { table: "hero", dice, total, kind: "skill", label: "New Skill", statOptions: [] };
}

function henchmanAdvanceRoll(dice: [number, number], total: number): AdvanceRoll {
  if (total <= 4) return { table: "henchman", dice, total, kind: "stat", label: "+1 Initiative", statOptions: ["I"], forcedStat: "I" };
  if (total === 5) return { table: "henchman", dice, total, kind: "stat", label: "+1 Strength", statOptions: ["S"], forcedStat: "S" };
  if (total <= 7) return { table: "henchman", dice, total, kind: "stat", label: "Choose +1 BS or +1 WS", statOptions: ["BS", "WS"] };
  if (total === 8) return { table: "henchman", dice, total, kind: "stat", label: "+1 Attack", statOptions: ["A"], forcedStat: "A" };
  if (total === 9) return { table: "henchman", dice, total, kind: "stat", label: "+1 Leadership", statOptions: ["Ld"], forcedStat: "Ld" };
  return { table: "henchman", dice, total, kind: "lad", label: "Lad's Got Talent", statOptions: [] };
}

function rollD6(random: () => number) {
  return Math.floor(random() * 6) + 1;
}

function maximumProfileKeyForFighterType(fighterType: FighterType, warbandRace = "") {
  const id = fighterType.id;
  const name = fighterType.name.toLowerCase();
  const race = warbandRace.toLowerCase();
  if (id.includes("vampire")) return "vampire";
  if (id.includes("ghoul")) return "ghoul";
  if (id.includes("possessed")) return "possessed";
  if (id.includes("halfling")) return "halfling";
  if (id.includes("ogre")) return "ogre";
  if (name.includes("black orc")) return "blackOrc";
  if (id.includes("minotaur")) return "minotaur";
  if (id.includes("centigor")) return "centigor";
  if (id.includes("ungor")) return "ungor";
  if (name.includes("beastman") || id.includes("bestigor") || id === "gor" || id.endsWith("-gor")) return "beastman";
  if (id.includes("saurus")) return "saurus";
  if (id.includes("skink")) return "skink";
  if (race.includes("elf")) return "elf";
  if (race.includes("dwarf")) return "dwarf";
  if (id.includes("pestilens") || race.includes("pestilens")) return "skavenPestilens";
  if (race.includes("skaven")) return "skaven";
  if (id.includes("goblin") || race.includes("goblin") && !race.includes("orc")) return "goblin";
  if (id.includes("orc") || race.includes("orc")) return "orc";
  return "human";
}

function maxProfileValues(maximum: Profile, current: Profile): Profile {
  return Object.fromEntries(
    ADVANCE_STATS.map((stat) => [stat, Math.max(maximum[stat], current[stat])])
  ) as Profile;
}
