import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validShadowWarriors(): Roster {
  return {
    id: "roster-shadow-warriors",
    name: "Night's Edge",
    warbandTypeId: "shadow-warriors",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("master", "shadow-master", "Aerandir", 20, ["dagger", "sword"], ["leader", "hate-dark-elves", "excellent-sight", "distaste-for-poison", "unforgiving", "tolerant"]),
      hero("weaver", "shadow-weaver", "Lethariel", 12, ["dagger"], ["spellcaster", "shadow-magic", "cannot-cast-spells-in-armour", "hate-dark-elves", "excellent-sight", "distaste-for-poison"]),
      hero("walker", "shadow-walker", "Caelith", 12, ["dagger", "long-bow"], ["hate-dark-elves", "excellent-sight", "distaste-for-poison"]),
      henchmen("warriors", "shadow-warrior", "Grey Knives", 2, ["dagger", "bow"]),
      henchmen("novices", "shadow-novice", "New Moons", 2, ["dagger"])
    ],
    campaignLog: [],
    claimedCost: 335,
    claimedWarbandRating: 79,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function shadowWarriorsNoMaster(): Roster {
  const roster = validShadowWarriors();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "shadow-master");
  return roster;
}

export function shadowWarriorsTwoMasters(): Roster {
  const roster = validShadowWarriors();
  roster.members.push(hero("master-2", "shadow-master", "Second Master", 20, ["dagger"], ["leader", "hate-dark-elves", "excellent-sight", "distaste-for-poison"]));
  return roster;
}

export function tooManyShadowWalkers(): Roster {
  const roster = validShadowWarriors();
  roster.members.push(hero("walker-2", "shadow-walker", "Second Walker", 12, ["dagger"]));
  roster.members.push(hero("walker-3", "shadow-walker", "Third Walker", 12, ["dagger"]));
  roster.members.push(hero("walker-4", "shadow-walker", "Fourth Walker", 12, ["dagger"]));
  return roster;
}

export function tooManyShadowWeavers(): Roster {
  const roster = validShadowWarriors();
  roster.members.push(hero("weaver-2", "shadow-weaver", "Second Weaver", 12, ["dagger"], ["spellcaster", "shadow-magic", "cannot-cast-spells-in-armour"]));
  return roster;
}

export function tooManyShadowWarriors(): Roster {
  const roster = validShadowWarriors();
  roster.members[3] = { ...roster.members[3], groupSize: 5 };
  roster.members[4] = { ...roster.members[4], groupSize: 5 };
  return roster;
}

export function shadowNoviceWithRunestones(): Roster {
  const roster = validShadowWarriors();
  roster.members[4] = { ...roster.members[4], equipment: ["dagger", "elven-runestones"] };
  return roster;
}

export function shadowWarriorWithIthilmarWeapon(): Roster {
  const roster = validShadowWarriors();
  roster.members[3] = { ...roster.members[3], equipment: ["dagger", "ithilmar-sword"] };
  return roster;
}

export function invalidShadowSkill(): Roster {
  const roster = validShadowWarriors();
  roster.members[2] = { ...roster.members[2], skills: ["master-of-runes"] };
  return roster;
}

export function shadowWalkerWithPowerfulBuild(): Roster {
  const roster = validShadowWarriors();
  roster.members[2] = { ...roster.members[2], skills: ["powerful-build"] };
  return roster;
}

export function tooManyPowerfulBuilds(): Roster {
  const roster = shadowWalkerWithPowerfulBuild();
  roster.members[0] = { ...roster.members[0], skills: ["powerful-build"] };
  roster.members.push(hero("walker-2", "shadow-walker", "Second Walker", 12, ["dagger"], ["hate-dark-elves", "excellent-sight", "distaste-for-poison"], ["powerful-build"]));
  return roster;
}

export function shadowWeaverWithSpell(): Roster {
  const roster = validShadowWarriors();
  roster.members[1] = {
    ...roster.members[1],
    specialRules: [...roster.members[1].specialRules, "shadow-pool-of-shadow"]
  };
  return roster;
}

export function shadowWeaverWithArmourAndSpell(): Roster {
  const roster = shadowWeaverWithSpell();
  roster.members[1] = {
    ...roster.members[1],
    equipment: ["dagger", "light-armour"]
  };
  return roster;
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
  return member(id, fighterTypeId, displayName, "henchman_group", groupSize, 0, equipment, ["hate-dark-elves", "excellent-sight", "distaste-for-poison"], []);
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
    rosterId: "roster-shadow-warriors",
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

function profileFor(fighterTypeId: string): RosterMember["currentProfile"] {
  const profiles: Record<string, RosterMember["currentProfile"]> = {
    "shadow-master": { M: 5, WS: 5, BS: 5, S: 3, T: 3, W: 1, I: 6, A: 1, Ld: 9 },
    "shadow-walker": { M: 5, WS: 5, BS: 4, S: 3, T: 3, W: 1, I: 6, A: 1, Ld: 8 },
    "shadow-weaver": { M: 5, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 6, A: 1, Ld: 8 },
    "shadow-warrior": { M: 5, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 6, A: 1, Ld: 8 },
    "shadow-novice": { M: 5, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 5, A: 1, Ld: 7 }
  };
  return profiles[fighterTypeId];
}
