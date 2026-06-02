import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-06-02T00:00:00.000Z";

export function validNorseExplorers(): Roster {
  return {
    id: "roster-norse-explorers",
    name: "The Sea Wolves",
    warbandTypeId: "norse-explorers",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("jarl", "norse-jarl", "Jarl Haakon", 20, ["axe"]),
      hero("berserker-1", "norse-berserker", "Ulf the Mad", 11, ["axe"]),
      hero("berserker-2", "norse-berserker", "Bjorn Ironarm", 11, ["double-handed-weapon"]),
      hero("ulfwerenar", "norse-ulfwerenar", "Greyfang", 11, []),
      hero("bondsman-1", "norse-bondsman", "Erik", 0, ["axe"]),
      hero("bondsman-2", "norse-bondsman", "Sven", 0, ["sword"]),
      henchmen("marauders", "norse-marauder", "Raiders", 2, ["axe"]),
      henchmen("hunters", "norse-hunter", "Trackers", 1, ["bow"]),
      henchmen("wolves", "norse-wolf", "Wolf Pack", 2, [])
    ],
    campaignLog: [],
    claimedCost: undefined,
    claimedWarbandRating: undefined,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function norseExplorersNoLeader(): Roster {
  const roster = validNorseExplorers();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "norse-jarl");
  return roster;
}

export function norseExplorersTwoLeaders(): Roster {
  const roster = validNorseExplorers();
  roster.members.push(hero("jarl-2", "norse-jarl", "Second Jarl", 20, ["axe"]));
  return roster;
}

export function norseExplorersTooManyBerserkers(): Roster {
  const roster = validNorseExplorers();
  roster.members.push(hero("berserker-3", "norse-berserker", "Third Berserker", 11, ["axe"]));
  return roster;
}

export function norseExplorersTooManyBondsmen(): Roster {
  const roster = validNorseExplorers();
  roster.members.push(hero("bondsman-3", "norse-bondsman", "Third Bondsman", 0, ["axe"]));
  return roster;
}

export function norseExplorersTooManyUlfwerenar(): Roster {
  const roster = validNorseExplorers();
  roster.members.push(hero("ulfwerenar-2", "norse-ulfwerenar", "Second Greyfang", 11, []));
  return roster;
}

export function norseExplorersTooManyHunters(): Roster {
  const roster = validNorseExplorers();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "hunters");
  roster.members.push(henchmen("hunters-1", "norse-hunter", "Trackers", 5, ["bow"]));
  roster.members.push(henchmen("hunters-2", "norse-hunter", "Extra Scouts", 1, ["bow"]));
  return roster;
}

export function norseExplorersTooManyWolves(): Roster {
  const roster = validNorseExplorers();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "wolves");
  roster.members.push(henchmen("wolves-1", "norse-wolf", "Wolf Pack Alpha", 5, []));
  roster.members.push(henchmen("wolves-2", "norse-wolf", "Wolf Pack Beta", 1, []));
  return roster;
}

export function norseExplorersWolvesWithoutUlfwerenar(): Roster {
  const roster = validNorseExplorers();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "norse-ulfwerenar");
  return roster;
}

export function norseExplorersBerserkerWithArmour(): Roster {
  const roster = validNorseExplorers();
  roster.members[1] = { ...roster.members[1], equipment: ["axe", "light-armour"] };
  return roster;
}

export function norseExplorersOverBudget(): Roster {
  const roster = validNorseExplorers();
  roster.members[0] = { ...roster.members[0], equipment: ["axe", "sword", "double-handed-weapon", "shield", "helmet", "light-armour"] };
  roster.members[5] = { ...roster.members[5], equipment: ["axe", "sword", "shield", "helmet", "light-armour"] };
  return roster;
}

export function norseExplorersTooFewWarriors(): Roster {
  const roster = validNorseExplorers();
  roster.members = [roster.members[0], roster.members[1]];
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
    rosterId: "roster-norse-explorers",
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
  if (fighterTypeId === "norse-jarl") return ["leader"];
  if (fighterTypeId === "norse-berserker") return ["frenzy"];
  if (fighterTypeId === "norse-ulfwerenar") return ["fear", "norse-bestial"];
  if (fighterTypeId === "norse-bondsman") return [];
  if (fighterTypeId === "norse-marauder") return [];
  if (fighterTypeId === "norse-hunter") return [];
  if (fighterTypeId === "norse-wolf") return ["animals", "norse-pack-leader"];
  return [];
}

function profileFor(fighterTypeId: string): RosterMember["currentProfile"] {
  const profiles: Record<string, RosterMember["currentProfile"]> = {
    "norse-jarl": { M: 4, WS: 4, BS: 3, S: 4, T: 3, W: 1, I: 4, A: 2, Ld: 8 },
    "norse-berserker": { M: 4, WS: 4, BS: 3, S: 4, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "norse-ulfwerenar": { M: 6, WS: 4, BS: 0, S: 4, T: 4, W: 2, I: 4, A: 2, Ld: 7 },
    "norse-bondsman": { M: 4, WS: 3, BS: 2, S: 3, T: 3, W: 1, I: 2, A: 1, Ld: 6 },
    "norse-marauder": { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "norse-hunter": { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "norse-wolf": { M: 9, WS: 3, BS: 0, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 5 }
  };
  const profile = profiles[fighterTypeId];
  if (!profile) throw new Error(`Missing profile fixture for ${fighterTypeId}`);
  return profile;
}
