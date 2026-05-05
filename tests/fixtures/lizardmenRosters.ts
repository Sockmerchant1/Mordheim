import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validLizardmen(): Roster {
  return {
    id: "roster-lizardmen",
    name: "Children of the Sun",
    warbandTypeId: "lizardmen",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("priest", "skink-priest", "Tlaxtlan", 20, ["dagger", "short-bow"], ["leader", "spellcaster", "lizardmen-magic", "scaly-skin-skink", "cold-blooded", "aquatic", "jungle-born"]),
      hero("totem", "saurus-totem-warrior", "Gor-Rok", 11, ["dagger", "stone-axe", "shield"], ["scaly-skin-saurus", "cold-blooded", "lizardmen-bite-attack"]),
      hero("crest", "skink-great-crest", "Chakax", 8, ["dagger", "javelin"], ["scaly-skin-skink", "cold-blooded", "aquatic", "jungle-born"]),
      henchmen("skinks", "skink-brave", "River Skinks", 2, ["dagger", "short-bow"]),
      henchmen("saurus", "saurus-brave", "Temple Guard", 2, ["dagger", "stone-axe"])
    ],
    campaignLog: [],
    claimedCost: 309,
    claimedWarbandRating: 74,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function lizardmenNoPriest(): Roster {
  const roster = validLizardmen();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "skink-priest");
  return roster;
}

export function lizardmenTwoPriests(): Roster {
  const roster = validLizardmen();
  roster.members.push(hero("priest-2", "skink-priest", "Second Priest", 20, ["dagger"], ["leader", "spellcaster", "lizardmen-magic", "scaly-skin-skink", "cold-blooded", "aquatic", "jungle-born"]));
  return roster;
}

export function tooManyGreatCrests(): Roster {
  const roster = validLizardmen();
  roster.members.push(hero("crest-2", "skink-great-crest", "Second Crest", 8, ["dagger"], ["scaly-skin-skink", "cold-blooded", "aquatic", "jungle-born"]));
  roster.members.push(hero("crest-3", "skink-great-crest", "Third Crest", 8, ["dagger"], ["scaly-skin-skink", "cold-blooded", "aquatic", "jungle-born"]));
  return roster;
}

export function tooManyTotemWarriors(): Roster {
  const roster = validLizardmen();
  roster.members.push(hero("totem-2", "saurus-totem-warrior", "Second Totem", 11, ["dagger"], ["scaly-skin-saurus", "cold-blooded", "lizardmen-bite-attack"]));
  return roster;
}

export function tooManySaurusBravesMaximum(): Roster {
  const roster = validLizardmen();
  roster.members[3] = { ...roster.members[3], groupSize: 5 };
  roster.members[4] = { ...roster.members[4], groupSize: 5 };
  return roster;
}

export function tooManySaurusBravesForSkinks(): Roster {
  const roster = validLizardmen();
  roster.members[3] = { ...roster.members[3], groupSize: 1 };
  roster.members[4] = { ...roster.members[4], groupSize: 2 };
  return roster;
}

export function tooManyLizardmenWarriors(): Roster {
  const roster = validLizardmen();
  roster.members[3] = { ...roster.members[3], groupSize: 5 };
  roster.members[4] = { ...roster.members[4], groupSize: 4 };
  roster.members.push(henchmen("skinks-2", "skink-brave", "Canopy Skinks", 5, ["dagger"]));
  roster.members.push(henchmen("skinks-3", "skink-brave", "Pool Skinks", 4, ["dagger"]));
  return roster;
}

export function skinkBraveWithSword(): Roster {
  const roster = validLizardmen();
  roster.members[3] = { ...roster.members[3], equipment: ["dagger", "sword"] };
  return roster;
}

export function saurusBraveWithShortBow(): Roster {
  const roster = validLizardmen();
  roster.members[4] = { ...roster.members[4], equipment: ["dagger", "short-bow"] };
  return roster;
}

export function greatCrestWithBoneHelmet(): Roster {
  const roster = validLizardmen();
  roster.members[2] = { ...roster.members[2], equipment: ["dagger", "bone-helmet"] };
  return roster;
}

export function kroxigorWithoutHalberd(): Roster {
  const roster = baseLizardmenRoster("kroxigor-missing-halberd", "Missing Halberd");
  roster.members = [
    hero("priest", "skink-priest", "Tlaxtlan", 20, ["dagger"], ["leader", "spellcaster", "lizardmen-magic", "scaly-skin-skink", "cold-blooded", "aquatic", "jungle-born"]),
    henchmen("skinks", "skink-brave", "River Skinks", 2, ["dagger"]),
    henchmen("kroxigor", "kroxigor", "Oxotl", 1, [])
  ];
  return roster;
}

export function validKroxigor(): Roster {
  const roster = kroxigorWithoutHalberd();
  roster.members[2] = { ...roster.members[2], equipment: ["kroxigor-halberd"] };
  return roster;
}

export function lizardmenHeroWithTwoSacredMarkings(): Roster {
  const roster = validLizardmen();
  roster.members[0] = {
    ...roster.members[0],
    equipment: ["dagger", "sacred-marking-poison-glands", "sacred-marking-mark-of-the-old-ones"]
  };
  return roster;
}

export function invalidLizardmenSkill(): Roster {
  const roster = validLizardmen();
  roster.members[0] = { ...roster.members[0], skills: ["bellowing-battle-roar"] };
  return roster;
}

export function lizardmenPriestWithSpell(): Roster {
  const roster = validLizardmen();
  roster.members[0] = {
    ...roster.members[0],
    specialRules: [...roster.members[0].specialRules, "lizardmen-chotecs-wrath"]
  };
  return roster;
}

export function lizardmenWithWarlock(): Roster {
  const roster = validLizardmen();
  roster.members.push({
    id: "hired-warlock",
    rosterId: "roster-lizardmen",
    fighterTypeId: "hired-sword-warlock",
    displayName: "Warlock",
    kind: "hired_sword",
    groupSize: 1,
    currentProfile: { M: 4, WS: 2, BS: 2, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 },
    startingXp: 0,
    currentXp: 0,
    experience: 0,
    advances: [],
    advancesTaken: [],
    injuries: [],
    equipment: [],
    skills: [],
    specialRules: ["spellcaster"],
    notes: "",
    status: "active"
  });
  return roster;
}

function baseLizardmenRoster(id: string, name: string): Roster {
  return {
    id: `roster-lizardmen-${id}`,
    name,
    warbandTypeId: "lizardmen",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [],
    campaignLog: [],
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

function hero(
  id: string,
  fighterTypeId: string,
  displayName: string,
  experience: number,
  equipment: string[],
  specialRules: string[] = [],
  skills: string[] = []
): RosterMember {
  return member(id, fighterTypeId, displayName, "hero", 1, experience, equipment, specialRules, skills);
}

function henchmen(id: string, fighterTypeId: string, displayName: string, groupSize: number, equipment: string[]): RosterMember {
  return member(id, fighterTypeId, displayName, "henchman_group", groupSize, 0, equipment, specialRulesFor(fighterTypeId), []);
}

function member(
  id: string,
  fighterTypeId: string,
  displayName: string,
  kind: RosterMember["kind"],
  groupSize: number,
  experience: number,
  equipment: string[],
  specialRules: string[],
  skills: string[]
): RosterMember {
  return {
    id,
    rosterId: "roster-lizardmen",
    fighterTypeId,
    displayName,
    kind,
    groupSize,
    currentProfile: profileFor(fighterTypeId),
    startingXp: experience,
    currentXp: experience,
    experience,
    advances: [],
    advancesTaken: [],
    injuries: [],
    equipment,
    skills,
    specialRules,
    notes: "",
    status: "active"
  };
}

function specialRulesFor(fighterTypeId: string): string[] {
  if (fighterTypeId === "skink-brave") return ["scaly-skin-skink", "cold-blooded", "aquatic", "jungle-born"];
  if (fighterTypeId === "saurus-brave") return ["scaly-skin-saurus", "cold-blooded", "lizardmen-bite-attack", "saurus-rarity"];
  if (fighterTypeId === "kroxigor") return ["scaly-skin-kroxigor", "cold-blooded", "aquatic", "fear", "large-target", "kroxigor-animal"];
  return [];
}

function profileFor(fighterTypeId: string): RosterMember["currentProfile"] {
  const profiles: Record<string, RosterMember["currentProfile"]> = {
    "skink-priest": { M: 6, WS: 3, BS: 4, S: 3, T: 3, W: 1, I: 5, A: 1, Ld: 7 },
    "saurus-totem-warrior": { M: 4, WS: 3, BS: 0, S: 4, T: 4, W: 1, I: 1, A: 2, Ld: 8 },
    "skink-great-crest": { M: 6, WS: 2, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 7 },
    "skink-brave": { M: 6, WS: 2, BS: 3, S: 3, T: 2, W: 1, I: 4, A: 1, Ld: 6 },
    "saurus-brave": { M: 4, WS: 3, BS: 0, S: 4, T: 4, W: 1, I: 1, A: 2, Ld: 7 },
    kroxigor: { M: 6, WS: 3, BS: 0, S: 5, T: 4, W: 3, I: 1, A: 3, Ld: 8 }
  };
  return profiles[fighterTypeId];
}
