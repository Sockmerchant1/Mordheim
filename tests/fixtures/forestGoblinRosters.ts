import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validForestGoblins(): Roster {
  return {
    id: "roster-forest-goblins",
    name: "Da Webbed Moon",
    warbandTypeId: "forest-goblins",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("chieftain", "forest-goblin-chieftain", "Snagrit", 17, ["dagger", "short-bow", "shield"], ["leader", "forest-goblin-natives", "ride-spiders"]),
      hero("shaman", "forest-goblin-shaman", "Oddgit", 6, ["dagger", "forest-goblin-blowpipe"], ["spellcaster", "forest-goblin-magic", "forest-goblin-natives"]),
      hero("brave", "forest-goblin-brave", "Nikkit", 6, ["dagger", "forest-goblin-spear"], ["forest-goblin-natives", "forest-goblin-animosity"]),
      henchmen("goblins", "forest-goblin", "Stabba Mob", 2, ["dagger", "forest-goblin-spear"]),
      henchmen("red-toof", "red-toof-boy", "Red Toofs", 1, ["dagger", "sword"]),
      henchmen("sluggas", "slugga", "Rock Chuckas", 1, ["dagger", "forest-goblin-throwing-weapons"])
    ],
    campaignLog: [],
    claimedCost: 240,
    claimedWarbandRating: 64,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function forestGoblinsNoChieftain(): Roster {
  const roster = validForestGoblins();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "forest-goblin-chieftain");
  return roster;
}

export function forestGoblinsTwoChieftains(): Roster {
  const roster = validForestGoblins();
  roster.members.push(hero("chieftain-2", "forest-goblin-chieftain", "Second Boss", 17, ["dagger"], ["leader", "forest-goblin-natives", "ride-spiders"]));
  return roster;
}

export function tooManyForestGoblinBraves(): Roster {
  const roster = validForestGoblins();
  for (let index = 2; index <= 5; index += 1) {
    roster.members.push(hero(`brave-${index}`, "forest-goblin-brave", `Brave ${index}`, 6, ["dagger"], ["forest-goblin-natives", "forest-goblin-animosity"]));
  }
  return roster;
}

export function tooManyForestGoblinShamans(): Roster {
  const roster = validForestGoblins();
  roster.members.push(hero("shaman-2", "forest-goblin-shaman", "Other Oddgit", 6, ["dagger"], ["spellcaster", "forest-goblin-magic", "forest-goblin-natives"]));
  return roster;
}

export function tooManyRedToofBoyz(): Roster {
  const roster = validForestGoblins();
  roster.members[4] = { ...roster.members[4], groupSize: 6 };
  return roster;
}

export function tooManySluggas(): Roster {
  const roster = validForestGoblins();
  roster.members[5] = { ...roster.members[5], groupSize: 6 };
  return roster;
}

export function tooManyGiganticSpiders(): Roster {
  const roster = validForestGoblins();
  roster.members.push(henchmen("spider-1", "gigantic-spider", "Shelob-ish", 1, []));
  roster.members.push(henchmen("spider-2", "gigantic-spider", "Other Spider", 1, []));
  return roster;
}

export function tooManyForestGoblinWarriors(): Roster {
  const roster = validForestGoblins();
  roster.members[3] = { ...roster.members[3], groupSize: 5 };
  roster.members[4] = { ...roster.members[4], groupSize: 5 };
  roster.members[5] = { ...roster.members[5], groupSize: 5 };
  roster.members.push(henchmen("goblins-2", "forest-goblin", "More Stabbas", 4, ["dagger"]));
  return roster;
}

export function forestGoblinWithAxe(): Roster {
  const roster = validForestGoblins();
  roster.members[3] = { ...roster.members[3], equipment: ["dagger", "axe"] };
  return roster;
}

export function braveWithMagicGubbinz(): Roster {
  const roster = validForestGoblins();
  roster.members[2] = { ...roster.members[2], equipment: ["dagger", "magic-gubbinz"] };
  return roster;
}

export function giganticSpiderWithWeapon(): Roster {
  const roster = validForestGoblins();
  roster.members.push(henchmen("spider", "gigantic-spider", "Shelob-ish", 1, ["dagger"]));
  return roster;
}

export function forestGoblinWithSpider(): Roster {
  const roster = validForestGoblins();
  roster.members.push(henchmen("spider", "gigantic-spider", "Shelob-ish", 1, []));
  roster.claimedCost = 440;
  roster.claimedWarbandRating = 84;
  return roster;
}

export function invalidForestGoblinSkill(): Roster {
  const roster = validForestGoblins();
  roster.members[0] = { ...roster.members[0], skills: ["shed-animosity"] };
  return roster;
}

export function braveShedsAnimosity(): Roster {
  const roster = validForestGoblins();
  roster.members[2] = { ...roster.members[2], skills: ["shed-animosity"] };
  return roster;
}

export function shamanWithForestGoblinSpell(): Roster {
  const roster = validForestGoblins();
  roster.members[1] = {
    ...roster.members[1],
    specialRules: [...roster.members[1].specialRules, "forest-goblin-wind-of-gork"]
  };
  return roster;
}

export function chieftainWithForestGoblinSpell(): Roster {
  const roster = validForestGoblins();
  roster.members[0] = {
    ...roster.members[0],
    specialRules: [...roster.members[0].specialRules, "forest-goblin-wind-of-gork"]
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
    rosterId: "roster-forest-goblins",
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
  if (fighterTypeId === "forest-goblin") return ["forest-goblin-natives", "forest-goblin-animosity"];
  if (fighterTypeId === "red-toof-boy") return ["forest-goblin-natives", "forest-goblin-animosity", "frenzy", "red-toof-berserkers"];
  if (fighterTypeId === "slugga") return ["forest-goblin-natives", "forest-goblin-animosity", "sluggas-triple-throw"];
  if (fighterTypeId === "gigantic-spider") return ["fear", "large-target", "gigantic-spider-poisonous", "gigantic-spider-native", "gigantic-spider-non-sentient", "gigantic-spider-may-ride", "stupidity"];
  return [];
}

function profileFor(fighterTypeId: string): RosterMember["currentProfile"] {
  const profiles: Record<string, RosterMember["currentProfile"]> = {
    "forest-goblin-chieftain": { M: 4, WS: 3, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 7 },
    "forest-goblin-brave": { M: 4, WS: 2, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 6 },
    "forest-goblin-shaman": { M: 4, WS: 2, BS: 3, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 6 },
    "forest-goblin": { M: 4, WS: 2, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 6 },
    "red-toof-boy": { M: 4, WS: 2, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 6 },
    slugga: { M: 4, WS: 2, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 6 },
    "gigantic-spider": { M: 6, WS: 3, BS: 0, S: 5, T: 5, W: 3, I: 4, A: 2, Ld: 4 }
  };
  return profiles[fighterTypeId];
}
