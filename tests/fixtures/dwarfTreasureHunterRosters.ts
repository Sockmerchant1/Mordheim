import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validDwarfTreasureHunters(): Roster {
  return {
    id: "roster-dwarf-treasure-hunters",
    name: "Cragbrow's Claim",
    warbandTypeId: "dwarf-treasure-hunters",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("noble", "dwarf-noble", "Lord Cragbrow", 20, ["dagger", "axe", "shield"], ["leader", "dwarf-hard-to-kill", "dwarf-hard-head", "dwarf-armour", "dwarf-hate-orcs-goblins", "dwarf-grudgebearers", "incomparable-miners"]),
      hero("engineer", "dwarf-engineer", "Borin Gearhand", 10, ["dagger", "hammer", "crossbow"], ["dwarf-hard-to-kill", "dwarf-hard-head", "dwarf-armour", "dwarf-hate-orcs-goblins", "expert-weaponsmith"]),
      hero("slayer", "dwarf-troll-slayer", "Snorri Doombound", 8, ["dagger", "dwarf-axe"], ["dwarf-hard-to-kill", "dwarf-hard-head", "dwarf-hate-orcs-goblins", "deathwish", "slayer-skills"]),
      henchmen("clansmen", "dwarf-clansman", "Stoneguard", 2, ["dagger", "hammer"]),
      henchmen("thunderers", "dwarf-thunderer", "Blackpowder Kin", 2, ["dagger", "crossbow"])
    ],
    campaignLog: [],
    claimedCost: 454,
    claimedWarbandRating: 73,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function dwarfNoNoble(): Roster {
  const roster = validDwarfTreasureHunters();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "dwarf-noble");
  return roster;
}

export function dwarfTwoNobles(): Roster {
  const roster = validDwarfTreasureHunters();
  roster.members.push(hero("noble-2", "dwarf-noble", "Second Noble", 20, ["dagger"], ["leader", "dwarf-hard-to-kill", "dwarf-hard-head", "dwarf-armour", "dwarf-hate-orcs-goblins", "dwarf-grudgebearers", "incomparable-miners"]));
  return roster;
}

export function tooManyDwarfWarriors(): Roster {
  const roster = validDwarfTreasureHunters();
  roster.members.push(hero("slayer-2", "dwarf-troll-slayer", "Other Slayer", 8, ["dagger"], ["dwarf-hard-to-kill", "dwarf-hard-head", "dwarf-hate-orcs-goblins", "deathwish", "slayer-skills"]));
  roster.members[3] = { ...roster.members[3], groupSize: 5 };
  roster.members[4] = { ...roster.members[4], groupSize: 5 };
  return roster;
}

export function tooManyDwarfEngineers(): Roster {
  const roster = validDwarfTreasureHunters();
  roster.members.push(hero("engineer-2", "dwarf-engineer", "Second Engineer", 10, ["dagger"], ["dwarf-hard-to-kill", "dwarf-hard-head", "dwarf-armour", "dwarf-hate-orcs-goblins", "expert-weaponsmith"]));
  return roster;
}

export function tooManyDwarfTrollSlayers(): Roster {
  const roster = validDwarfTreasureHunters();
  roster.members.push(hero("slayer-2", "dwarf-troll-slayer", "Other Slayer", 8, ["dagger"], ["dwarf-hard-to-kill", "dwarf-hard-head", "dwarf-hate-orcs-goblins", "deathwish", "slayer-skills"]));
  roster.members.push(hero("slayer-3", "dwarf-troll-slayer", "Third Slayer", 8, ["dagger"], ["dwarf-hard-to-kill", "dwarf-hard-head", "dwarf-hate-orcs-goblins", "deathwish", "slayer-skills"]));
  return roster;
}

export function tooManyDwarfThunderers(): Roster {
  const roster = validDwarfTreasureHunters();
  roster.members[4] = { ...roster.members[4], groupSize: 6 };
  return roster;
}

export function dwarfThundererWithDwarfAxe(): Roster {
  const roster = validDwarfTreasureHunters();
  roster.members[4] = { ...roster.members[4], equipment: ["dagger", "dwarf-axe"] };
  return roster;
}

export function dwarfSlayerWithCrossbow(): Roster {
  const roster = validDwarfTreasureHunters();
  roster.members[2] = { ...roster.members[2], equipment: ["dagger", "crossbow"] };
  return roster;
}

export function dwarfClansmanWithGromrilArmour(): Roster {
  const roster = validDwarfTreasureHunters();
  roster.members[3] = { ...roster.members[3], groupSize: 1, equipment: ["dagger", "hammer", "gromril-armour"] };
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function invalidDwarfSkill(): Roster {
  const roster = validDwarfTreasureHunters();
  roster.members[1] = { ...roster.members[1], skills: ["mighty-blow"] };
  return roster;
}

export function dwarfNobleWithResourceHunter(): Roster {
  const roster = validDwarfTreasureHunters();
  roster.members[0] = { ...roster.members[0], skills: ["resource-hunter"] };
  return roster;
}

export function dwarfSlayerWithBerserker(): Roster {
  const roster = validDwarfTreasureHunters();
  roster.members[2] = { ...roster.members[2], skills: ["troll-slayer-berserker"] };
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
    rosterId: "roster-dwarf-treasure-hunters",
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
  if (fighterTypeId === "dwarf-clansman" || fighterTypeId === "dwarf-thunderer" || fighterTypeId === "beardling") {
    return ["dwarf-hard-to-kill", "dwarf-hard-head", "dwarf-armour", "dwarf-hate-orcs-goblins"];
  }
  return [];
}

function profileFor(fighterTypeId: string): RosterMember["currentProfile"] {
  const profiles: Record<string, RosterMember["currentProfile"]> = {
    "dwarf-noble": { M: 3, WS: 5, BS: 4, S: 3, T: 4, W: 1, I: 2, A: 1, Ld: 9 },
    "dwarf-engineer": { M: 3, WS: 4, BS: 3, S: 3, T: 4, W: 1, I: 2, A: 1, Ld: 9 },
    "dwarf-troll-slayer": { M: 3, WS: 4, BS: 3, S: 3, T: 4, W: 1, I: 2, A: 1, Ld: 9 },
    "dwarf-clansman": { M: 3, WS: 4, BS: 3, S: 3, T: 4, W: 1, I: 2, A: 1, Ld: 9 },
    "dwarf-thunderer": { M: 3, WS: 4, BS: 3, S: 3, T: 4, W: 1, I: 2, A: 1, Ld: 9 },
    beardling: { M: 3, WS: 3, BS: 2, S: 3, T: 4, W: 1, I: 2, A: 1, Ld: 8 }
  };
  return profiles[fighterTypeId];
}
