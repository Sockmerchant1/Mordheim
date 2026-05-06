import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validSkavenPestilens(): Roster {
  return {
    id: "roster-pestilens",
    name: "The Rusted Bell",
    warbandTypeId: "skaven-of-clan-pestilens",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("priest", "plague-priest", "Father Skratch", 20, ["dagger", "club"], ["leader"]),
      hero("sorcerer", "pestilens-sorcerer", "Vilek", 8, ["dagger", "sling"], ["spellcaster", "magic-of-the-horned-rat"]),
      hero("monk", "plague-monk", "Rotclaw", 8, ["dagger", "censer"]),
      hero("initiate", "monk-initiate", "Puskit", 0, ["dagger", "sling"]),
      henchmen("novices", "plague-novice", "Novice Brood", 3, ["dagger", "sling"]),
      henchmen("rats", "pestilens-giant-rat", "Pox Rats", 3, [])
    ],
    campaignLog: [],
    claimedCost: 353,
    claimedWarbandRating: 86,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function pestilensNoPriest(): Roster {
  const roster = validSkavenPestilens();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "plague-priest");
  return roster;
}

export function pestilensTwoPriests(): Roster {
  const roster = validSkavenPestilens();
  roster.members.push(hero("priest-2", "plague-priest", "Second Priest", 20, ["dagger"], ["leader"]));
  return roster;
}

export function tooManyPestilensWarriors(): Roster {
  const roster = basePestilensRoster("too-many-warriors", "Too Many Pox Rats");
  roster.members = [
    hero("priest", "plague-priest", "Father Skratch", 20, ["dagger"], ["leader"]),
    henchmen("rats-1", "pestilens-giant-rat", "Rats One", 5, []),
    henchmen("rats-2", "pestilens-giant-rat", "Rats Two", 5, []),
    henchmen("rats-3", "pestilens-giant-rat", "Rats Three", 5, [])
  ];
  return roster;
}

export function tooManyPestilensSorcerers(): Roster {
  const roster = validSkavenPestilens();
  roster.members.push(hero("sorcerer-2", "pestilens-sorcerer", "Other Vilek", 8, ["dagger"], ["spellcaster", "magic-of-the-horned-rat"]));
  return roster;
}

export function tooManyPlagueMonks(): Roster {
  const roster = validSkavenPestilens();
  roster.members.push(hero("monk-2", "plague-monk", "Second Monk", 8, ["dagger"]));
  roster.members.push(hero("monk-3", "plague-monk", "Third Monk", 8, ["dagger"]));
  return roster;
}

export function tooManyMonkInitiates(): Roster {
  const roster = validSkavenPestilens();
  roster.members.push(hero("initiate-2", "monk-initiate", "Second Initiate", 0, ["dagger"]));
  roster.members.push(hero("initiate-3", "monk-initiate", "Third Initiate", 0, ["dagger"]));
  return roster;
}

export function tooManyPestilensRatOgres(): Roster {
  const roster = validSkavenPestilens();
  roster.members.push(henchmen("rat-ogre-1", "pestilens-rat-ogre", "First Rat Ogre", 1, []));
  roster.members.push(henchmen("rat-ogre-2", "pestilens-rat-ogre", "Second Rat Ogre", 1, []));
  return roster;
}

export function plagueNoviceWithCenser(): Roster {
  const roster = validSkavenPestilens();
  roster.members[4] = {
    ...roster.members[4],
    equipment: ["dagger", "censer"]
  };
  return roster;
}

export function pestilensRatWithWeapon(): Roster {
  const roster = validSkavenPestilens();
  roster.members[5] = {
    ...roster.members[5],
    equipment: ["club"]
  };
  return roster;
}

export function invalidPestilensSkill(): Roster {
  const roster = validSkavenPestilens();
  roster.members[2] = {
    ...roster.members[2],
    skills: ["wyrdstone-hunter"]
  };
  return roster;
}

export function pestilensCenserBearerWithoutBlackHunger(): Roster {
  const roster = validSkavenPestilens();
  roster.members[2] = {
    ...roster.members[2],
    skills: ["censer-bearer"]
  };
  return roster;
}

export function pestilensCenserBearerWithBlackHunger(): Roster {
  const roster = validSkavenPestilens();
  roster.members[2] = {
    ...roster.members[2],
    skills: ["pestilens-black-hunger", "censer-bearer"]
  };
  return roster;
}

export function pestilensSorcererWithSpell(): Roster {
  const roster = validSkavenPestilens();
  roster.members[1] = {
    ...roster.members[1],
    specialRules: [...roster.members[1].specialRules, "horned-rat-warpfire"]
  };
  return roster;
}

export function plaguePriestWithHornedRatSpell(): Roster {
  const roster = validSkavenPestilens();
  roster.members[0] = {
    ...roster.members[0],
    specialRules: [...roster.members[0].specialRules, "horned-rat-warpfire"]
  };
  return roster;
}

export function pestilensWithRatOgre(): Roster {
  const roster = basePestilensRoster("rat-ogre", "Bell Guard");
  roster.members = [
    hero("priest", "plague-priest", "Father Skratch", 20, ["dagger"], ["leader"]),
    henchmen("novices", "plague-novice", "Novice Brood", 2, ["dagger"]),
    henchmen("rat-ogre", "pestilens-rat-ogre", "Rat Ogre", 1, [])
  ];
  return roster;
}

function basePestilensRoster(id: string, name: string): Roster {
  return {
    id: `roster-pestilens-${id}`,
    name,
    warbandTypeId: "skaven-of-clan-pestilens",
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
    rosterId: "roster-pestilens",
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
    "plague-priest": { M: 5, WS: 4, BS: 4, S: 4, T: 4, W: 1, I: 5, A: 1, Ld: 7 },
    "pestilens-sorcerer": { M: 5, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 6 },
    "plague-monk": { M: 5, WS: 4, BS: 3, S: 3, T: 4, W: 1, I: 5, A: 1, Ld: 6 },
    "monk-initiate": { M: 5, WS: 2, BS: 3, S: 2, T: 2, W: 1, I: 4, A: 1, Ld: 4 },
    "plague-novice": { M: 5, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 5 },
    "pestilens-giant-rat": { M: 6, WS: 2, BS: 0, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 4 },
    "pestilens-rat-ogre": { M: 6, WS: 3, BS: 3, S: 5, T: 5, W: 3, I: 4, A: 3, Ld: 4 }
  };
  return profiles[fighterTypeId];
}
