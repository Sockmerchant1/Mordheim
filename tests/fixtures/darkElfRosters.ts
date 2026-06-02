import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-06-02T00:00:00.000Z";

export function validDarkElves(): Roster {
  return {
    id: "roster-dark-elves",
    name: "The Black Ark Corsairs",
    warbandTypeId: "dark-elves",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("high-born", "high-born", "Lord Vaelith", 20, ["dagger"]),
      hero("beastmaster", "beastmaster", "Kaelthos", 8, ["dagger"]),
      hero("fellblade-1", "fellblade", "Malek", 12, ["dagger"]),
      hero("fellblade-2", "fellblade", "Zareth", 12, ["dagger"]),
      hero("sorceress", "dark-elf-sorceress", "Morathi", 12, ["dagger"]),
      henchmen("corsairs", "corsair", "Corsair Reavers", 1, ["dagger"]),
      henchmen("shades", "shade", "Shadow Scouts", 2, ["dagger"]),
      henchmen("hounds", "cold-one-beasthound", "Beasthounds", 1, [])
    ],
    campaignLog: [],
    claimedCost: undefined,
    claimedWarbandRating: undefined,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function darkElvesNoLeader(): Roster {
  const roster = validDarkElves();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "high-born");
  return roster;
}

export function darkElvesTwoLeaders(): Roster {
  const roster = validDarkElves();
  roster.members.push(hero("high-born-2", "high-born", "Second High Born", 20, ["dagger"]));
  return roster;
}

export function darkElvesTooManyFellblades(): Roster {
  const roster = validDarkElves();
  roster.members.push(hero("fellblade-3", "fellblade", "Third Fellblade", 12, ["dagger"]));
  return roster;
}

export function darkElvesTooManyShades(): Roster {
  const roster = validDarkElves();
  roster.members[6] = { ...roster.members[6], groupSize: 5 };
  roster.members.push(henchmen("shades-2", "shade", "Extra Scouts", 1, ["dagger"]));
  return roster;
}

export function darkElvesTooManyHounds(): Roster {
  const roster = validDarkElves();
  roster.members[7] = { ...roster.members[7], groupSize: 3 };
  return roster;
}

export function darkElvesFellbladeWithCrossbow(): Roster {
  const roster = validDarkElves();
  roster.members[2] = { ...roster.members[2], equipment: ["dagger", "repeater-crossbow"] };
  return roster;
}

export function darkElvesOverBudget(): Roster {
  const roster = validDarkElves();
  roster.members[0] = { ...roster.members[0], equipment: ["dagger", "sword", "light-armour", "shield", "dark-elf-blade"] };
  roster.members[5] = { ...roster.members[5], equipment: ["dagger", "sword", "sea-dragon-cloak", "repeater-crossbow"] };
  return roster;
}

function hero(
  id: string,
  fighterTypeId: string,
  displayName: string,
  experience: number,
  equipment: string[],
  specialRules: string[] = specialRulesFor(fighterTypeId),
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
    rosterId: "roster-dark-elves",
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
  const elfRules = ["kindred-hatred", "excellent-sight", "black-powder-weapons"];
  if (fighterTypeId === "high-born") return ["leader", ...elfRules];
  if (fighterTypeId === "beastmaster") return [...elfRules, "beastmaster-hounds"];
  if (fighterTypeId === "fellblade") return [...elfRules, "melee-specialists"];
  if (fighterTypeId === "dark-elf-sorceress") return [...elfRules, "spellcaster", "dark-elf-magic", "cannot-cast-spells-in-armour"];
  if (fighterTypeId === "corsair") return [...elfRules];
  if (fighterTypeId === "shade") return [...elfRules, "natural-stealth"];
  if (fighterTypeId === "cold-one-beasthound") return [...elfRules, "animals", "beastmaster-hounds", "cold-one-beasthound-stupidity", "cold-one-beasthound-scaly-skin", "fear"];
  return elfRules;
}

function profileFor(fighterTypeId: string): RosterMember["currentProfile"] {
  const profiles: Record<string, RosterMember["currentProfile"]> = {
    "high-born": { M: 5, WS: 5, BS: 4, S: 3, T: 3, W: 1, I: 6, A: 1, Ld: 9 },
    "beastmaster": { M: 5, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 6, A: 1, Ld: 8 },
    "fellblade": { M: 5, WS: 5, BS: 4, S: 3, T: 3, W: 1, I: 6, A: 1, Ld: 8 },
    "dark-elf-sorceress": { M: 5, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 6, A: 1, Ld: 8 },
    "corsair": { M: 5, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 6, A: 1, Ld: 8 },
    "shade": { M: 5, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 5, A: 1, Ld: 8 },
    "cold-one-beasthound": { M: 6, WS: 3, BS: 0, S: 4, T: 4, W: 1, I: 1, A: 1, Ld: 4 }
  };
  const profile = profiles[fighterTypeId];
  if (!profile) throw new Error(`Missing profile fixture for ${fighterTypeId}`);
  return profile;
}
