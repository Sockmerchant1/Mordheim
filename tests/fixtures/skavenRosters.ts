import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validSkaven(): Roster {
  return {
    id: "roster-skaven",
    name: "Needle Pack",
    warbandTypeId: "skaven",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("adept", "assassin-adept", "Snik Quickblade", 20, ["sword", "sling"], ["leader", "perfect-killer"]),
      hero("sorcerer", "eshin-sorcerer", "Vritch", 8, ["sling"], ["spellcaster", "magic-of-the-horned-rat"]),
      hero("black-skaven", "black-skaven", "Black Kreech", 8, ["fighting-claws"]),
      hero("night-runner", "night-runner", "Tik", 0, ["club", "sling"]),
      henchmen("verminkin", "verminkin", "Verminkin", 2, ["club", "sling"]),
      henchmen("giant-rats", "giant-rat", "Giant Rats", 2, [])
    ],
    campaignLog: [],
    claimedCost: 299,
    claimedWarbandRating: 76,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function skavenNoAssassin(): Roster {
  const roster = validSkaven();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "assassin-adept");
  return roster;
}

export function skavenTwoAssassins(): Roster {
  const roster = validSkaven();
  roster.members.push(hero("adept-2", "assassin-adept", "Second Adept", 20, ["sword"], ["leader", "perfect-killer"]));
  return roster;
}

export function tooManySkavenWarriors(): Roster {
  const roster = baseSkavenRoster("too-many-warriors", "Too Many Skaven");
  roster.members = [
    hero("adept", "assassin-adept", "Snik Quickblade", 20, ["sword"], ["leader", "perfect-killer"]),
    henchmen("rats-1", "giant-rat", "Rats One", 5, []),
    henchmen("rats-2", "giant-rat", "Rats Two", 5, []),
    henchmen("rats-3", "giant-rat", "Rats Three", 5, []),
    henchmen("rats-4", "giant-rat", "Rats Four", 5, [])
  ];
  return roster;
}

export function tooManyBlackSkaven(): Roster {
  const roster = validSkaven();
  roster.members.push(hero("black-2", "black-skaven", "Black Two", 8, ["sword"]));
  roster.members.push(hero("black-3", "black-skaven", "Black Three", 8, ["sword"]));
  return roster;
}

export function tooManyEshinSorcerers(): Roster {
  const roster = validSkaven();
  roster.members.push(hero("sorcerer-2", "eshin-sorcerer", "Second Sorcerer", 8, ["sling"], ["spellcaster", "magic-of-the-horned-rat"]));
  return roster;
}

export function tooManyNightRunners(): Roster {
  const roster = validSkaven();
  roster.members.push(hero("night-2", "night-runner", "Second Runner", 0, ["club"]));
  roster.members.push(hero("night-3", "night-runner", "Third Runner", 0, ["club"]));
  return roster;
}

export function tooManyRatOgres(): Roster {
  const roster = validSkaven();
  roster.members.push(henchmen("rat-ogre-1", "rat-ogre", "First Rat Ogre", 1, []));
  roster.members.push(henchmen("rat-ogre-2", "rat-ogre", "Second Rat Ogre", 1, []));
  return roster;
}

export function giantRatWithWeapon(): Roster {
  const roster = validSkaven();
  roster.members[5] = {
    ...roster.members[5],
    equipment: ["club"]
  };
  return roster;
}

export function fightingClawsWithSword(): Roster {
  const roster = validSkaven();
  roster.members[2] = {
    ...roster.members[2],
    equipment: ["fighting-claws", "sword"]
  };
  return roster;
}

export function skavenTooManyWeaponsWithoutTailFighting(): Roster {
  const roster = validSkaven();
  roster.members[2] = {
    ...roster.members[2],
    equipment: ["sword", "spear", "halberd"],
    skills: []
  };
  return roster;
}

export function skavenTailFightingExtraWeapon(): Roster {
  const roster = validSkaven();
  roster.members[2] = {
    ...roster.members[2],
    equipment: ["sword", "spear", "halberd"],
    skills: ["tail-fighting"]
  };
  return roster;
}

export function invalidSkavenSkill(): Roster {
  const roster = validSkaven();
  roster.members[2] = {
    ...roster.members[2],
    skills: ["wyrdstone-hunter"]
  };
  return roster;
}

export function skavenWithRatOgre(): Roster {
  const roster = baseSkavenRoster("rat-ogre", "Heavy Pack");
  roster.members = [
    hero("adept", "assassin-adept", "Snik Quickblade", 20, [], ["leader", "perfect-killer"]),
    henchmen("verminkin", "verminkin", "Verminkin", 2, ["club"]),
    henchmen("rat-ogre", "rat-ogre", "Rat Ogre", 1, [])
  ];
  return roster;
}

function baseSkavenRoster(id: string, name: string): Roster {
  return {
    id: `roster-skaven-${id}`,
    name,
    warbandTypeId: "skaven",
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
  return member(id, fighterTypeId, displayName, "henchman_group", groupSize, 0, equipment, [], []);
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
    rosterId: "roster-skaven",
    fighterTypeId,
    displayName,
    kind,
    groupSize,
    currentProfile: profileFor(fighterTypeId),
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
    "assassin-adept": { M: 6, WS: 4, BS: 4, S: 4, T: 3, W: 1, I: 5, A: 1, Ld: 7 },
    "black-skaven": { M: 6, WS: 4, BS: 3, S: 4, T: 3, W: 1, I: 5, A: 1, Ld: 6 },
    "eshin-sorcerer": { M: 5, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 6 },
    "night-runner": { M: 6, WS: 2, BS: 3, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 4 },
    verminkin: { M: 5, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 5 },
    "giant-rat": { M: 6, WS: 2, BS: 0, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 4 },
    "rat-ogre": { M: 6, WS: 3, BS: 3, S: 5, T: 5, W: 3, I: 4, A: 3, Ld: 4 }
  };
  return profiles[fighterTypeId];
}
