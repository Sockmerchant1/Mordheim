import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validBlackOrcs(): Roster {
  return {
    id: "roster-black-orcs",
    name: "Ironjaw's Bashers",
    warbandTypeId: "black-orcs",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("boss", "black-orc-boss", "Ironjaw", 20, ["dagger", "axe", "shield"], ["leader", "black-orc-natural-armour", "oi-behave", "let-the-goons-do-the-work"]),
      hero("black-orc", "black-orc", "Gorbad", 8, ["dagger", "black-orc-choppa"], ["black-orc-natural-armour", "let-the-goons-do-the-work"]),
      hero("youngun", "black-orc-youngun", "Ruk", 0, ["dagger", "axe", "black-orc-blood-upgrade"]),
      henchmen("boyz", "black-orc-boy", "Da Boyz", 2, ["dagger", "axe"]),
      henchmen("shootaz", "black-orc-shoota", "Da Shootaz", 2, ["dagger", "bow"]),
      henchmen("nutta", "orc-nutta", "Snort", 1, ["dagger", "axe"])
    ],
    campaignLog: [],
    claimedCost: 385,
    claimedWarbandRating: 68,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function blackOrcsNoBoss(): Roster {
  const roster = validBlackOrcs();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "black-orc-boss");
  return roster;
}

export function blackOrcsTwoBosses(): Roster {
  const roster = validBlackOrcs();
  roster.members.push(hero("boss-2", "black-orc-boss", "Second Boss", 20, ["dagger"], ["leader", "black-orc-natural-armour", "oi-behave", "let-the-goons-do-the-work"]));
  return roster;
}

export function tooManyBlackOrcWarriors(): Roster {
  const roster = validBlackOrcs();
  roster.members.push(henchmen("extra-boyz", "black-orc-boy", "Too Many Boyz", 5, ["dagger"]));
  return roster;
}

export function tooManyBlackOrcs(): Roster {
  const roster = validBlackOrcs();
  roster.members.push(hero("black-orc-2", "black-orc", "Second Black Orc", 8, ["dagger"], ["black-orc-natural-armour", "let-the-goons-do-the-work"]));
  roster.members.push(hero("black-orc-3", "black-orc", "Third Black Orc", 8, ["dagger"], ["black-orc-natural-armour", "let-the-goons-do-the-work"]));
  return roster;
}

export function tooManyBlackOrcYounguns(): Roster {
  const roster = validBlackOrcs();
  roster.members.push(hero("youngun-2", "black-orc-youngun", "Second Ruk", 0, ["dagger"]));
  roster.members.push(hero("youngun-3", "black-orc-youngun", "Third Ruk", 0, ["dagger"]));
  return roster;
}

export function tooManyShootazForBoyz(): Roster {
  const roster = baseBlackOrcRoster("too-many-shootaz", "Too Many Shootaz");
  roster.members = [
    hero("boss", "black-orc-boss", "Ironjaw", 20, ["dagger"], ["leader", "black-orc-natural-armour", "oi-behave", "let-the-goons-do-the-work"]),
    henchmen("boyz", "black-orc-boy", "Da Boyz", 1, ["dagger"]),
    henchmen("shootaz", "black-orc-shoota", "Too Many Shootaz", 2, ["dagger", "bow"])
  ];
  return roster;
}

export function tooManyNuttaz(): Roster {
  const roster = validBlackOrcs();
  roster.members.push(henchmen("nuttaz-2", "orc-nutta", "More Nuttaz", 4, ["dagger", "axe"]));
  return roster;
}

export function tooManyBlackOrcTrolls(): Roster {
  const roster = validBlackOrcs();
  roster.members.push(henchmen("troll-1", "black-orc-troll", "Grub", 1, []));
  roster.members.push(henchmen("troll-2", "black-orc-troll", "Grub's Mate", 1, []));
  return roster;
}

export function shootaWithDoubleHandedWeapon(): Roster {
  const roster = validBlackOrcs();
  roster.members[4] = { ...roster.members[4], groupSize: 1, equipment: ["dagger", "double-handed-weapon"] };
  return roster;
}

export function nuttaWithBow(): Roster {
  const roster = validBlackOrcs();
  roster.members[5] = { ...roster.members[5], equipment: ["dagger", "bow"] };
  return roster;
}

export function trollWithWeapon(): Roster {
  const roster = validBlackOrcs();
  roster.members.push(henchmen("troll", "black-orc-troll", "Grub", 1, ["dagger"]));
  return roster;
}

export function twoYoungunsWithBlackOrcBlood(): Roster {
  const roster = validBlackOrcs();
  roster.members.push(hero("youngun-2", "black-orc-youngun", "Second Ruk", 0, ["dagger", "black-orc-blood-upgrade"]));
  return roster;
}

export function youngunWithProvenWarriorWithoutUpgrade(): Roster {
  const roster = validBlackOrcs();
  roster.members[2] = { ...roster.members[2], equipment: ["dagger", "axe"], experience: 25, currentXp: 25, skills: ["proven-warrior"] };
  return roster;
}

export function youngunWithProvenWarriorTooEarly(): Roster {
  const roster = validBlackOrcs();
  roster.members[2] = { ...roster.members[2], experience: 24, currentXp: 24, skills: ["proven-warrior"] };
  return roster;
}

export function youngunWithProvenWarriorAndMightyBlow(): Roster {
  const roster = validBlackOrcs();
  roster.members[2] = { ...roster.members[2], experience: 25, currentXp: 25, skills: ["proven-warrior", "mighty-blow"] };
  return roster;
}

export function blackOrcWithBossOnlySkill(): Roster {
  const roster = validBlackOrcs();
  roster.members[1] = { ...roster.members[1], skills: ["black-orc-da-cunnin-plan"] };
  return roster;
}

function baseBlackOrcRoster(id: string, name: string): Roster {
  return {
    id: `roster-black-orc-${id}`,
    name,
    warbandTypeId: "black-orcs",
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
    rosterId: "roster-black-orcs",
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
    "black-orc-boss": { M: 4, WS: 4, BS: 4, S: 4, T: 4, W: 1, I: 3, A: 1, Ld: 8 },
    "black-orc": { M: 4, WS: 4, BS: 3, S: 4, T: 4, W: 1, I: 3, A: 1, Ld: 7 },
    "black-orc-youngun": { M: 4, WS: 2, BS: 2, S: 3, T: 4, W: 1, I: 2, A: 1, Ld: 6 },
    "black-orc-boy": { M: 4, WS: 3, BS: 3, S: 3, T: 4, W: 1, I: 2, A: 1, Ld: 7 },
    "black-orc-shoota": { M: 4, WS: 3, BS: 3, S: 3, T: 4, W: 1, I: 2, A: 1, Ld: 7 },
    "orc-nutta": { M: 4, WS: 3, BS: 2, S: 3, T: 4, W: 1, I: 2, A: 1, Ld: 5 },
    "black-orc-troll": { M: 6, WS: 3, BS: 1, S: 5, T: 4, W: 3, I: 1, A: 3, Ld: 4 }
  };
  return profiles[fighterTypeId];
}
