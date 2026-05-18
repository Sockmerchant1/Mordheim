import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validAverlanders(): Roster {
  return {
    id: "roster-averlanders",
    name: "Black Fire Patrol",
    warbandTypeId: "averlanders",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("captain", "averland-captain", "Captain Leitdorf", 20, ["dagger", "sword"], ["leader"]),
      hero("sergeant", "averland-sergeant", "Sergeant Voss", 8, ["dagger", "hammer"]),
      hero("bergjaeger", "averland-bergjaeger", "Klaus", 4, ["dagger", "bow"], ["set-traps"]),
      hero("youngblood", "averland-youngblood", "Milo", 0, ["dagger"]),
      henchmen("mountainguard", "mountainguard", "Black Fire Guard", 2, ["dagger", "mace"]),
      henchmen("marksmen", "averland-marksman", "Hill Marksmen", 2, ["dagger", "bow"]),
      henchmen("halfling", "averland-halfling-scout", "Pip", 1, ["dagger", "bow"], ["halfling-promotion"])
    ],
    campaignLog: [],
    claimedCost: 334,
    claimedWarbandRating: 77,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function averlandersNoCaptain(): Roster {
  const roster = validAverlanders();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "averland-captain");
  return roster;
}

export function averlandersTwoCaptains(): Roster {
  const roster = validAverlanders();
  roster.members.push(hero("captain-2", "averland-captain", "Second Captain", 20, ["dagger"], ["leader"]));
  return roster;
}

export function tooManyAverlandWarriors(): Roster {
  const roster = validAverlanders();
  roster.members[4] = { ...roster.members[4], groupSize: 5 };
  roster.members[5] = { ...roster.members[5], groupSize: 5 };
  roster.members[6] = { ...roster.members[6], groupSize: 3 };
  roster.members.push(henchmen("extra-mountainguard", "mountainguard", "Extra Guard", 3, ["dagger"]));
  return roster;
}

export function tooManyAverlandSergeants(): Roster {
  const roster = validAverlanders();
  roster.members.push(hero("sergeant-2", "averland-sergeant", "Second Sergeant", 8, ["dagger"]));
  return roster;
}

export function tooManyBergjaegers(): Roster {
  const roster = validAverlanders();
  roster.members.push(hero("bergjaeger-2", "averland-bergjaeger", "Second Bergjaeger", 4, ["dagger", "bow"], ["set-traps"]));
  roster.members.push(hero("bergjaeger-3", "averland-bergjaeger", "Third Bergjaeger", 4, ["dagger", "bow"], ["set-traps"]));
  return roster;
}

export function tooManyAverlandYoungbloods(): Roster {
  const roster = validAverlanders();
  roster.members.push(hero("youngblood-2", "averland-youngblood", "Second Youngblood", 0, ["dagger"]));
  return roster;
}

export function tooManyAverlandHalflings(): Roster {
  const roster = validAverlanders();
  roster.members[6] = { ...roster.members[6], groupSize: 4 };
  return roster;
}

export function averlandMarksmanWithHeavyArmour(): Roster {
  const roster = validAverlanders();
  roster.members[5] = { ...roster.members[5], equipment: ["dagger", "bow", "heavy-armour"] };
  return roster;
}

export function averlandHalflingWithLongBow(): Roster {
  const roster = validAverlanders();
  roster.members[6] = { ...roster.members[6], equipment: ["dagger", "long-bow"] };
  return roster;
}

export function averlandBergjaegerWithHuntingArrows(): Roster {
  const roster = validAverlanders();
  roster.members[2] = { ...roster.members[2], equipment: ["dagger", "long-bow", "hunting-arrows"] };
  roster.claimedCost = 374;
  return roster;
}

export function averlandBergjaegerWithHuntingArrowsNoBow(): Roster {
  const roster = validAverlanders();
  roster.members[2] = { ...roster.members[2], equipment: ["dagger", "hunting-arrows"] };
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function averlandMountainguardWithHuntingRifle(): Roster {
  const roster = validAverlanders();
  roster.members[4] = { ...roster.members[4], groupSize: 1, equipment: ["dagger", "hunting-rifle"] };
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function invalidAverlandSkill(): Roster {
  const roster = validAverlanders();
  roster.members[1] = { ...roster.members[1], skills: ["quick-shot"] };
  return roster;
}

export function averlandCaptainWithBattleTongue(): Roster {
  const roster = validAverlanders();
  roster.members[0] = { ...roster.members[0], skills: ["battle-tongue"] };
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

function henchmen(
  id: string,
  fighterTypeId: string,
  displayName: string,
  groupSize: number,
  equipment: string[],
  specialRules: string[] = specialRulesFor(fighterTypeId)
): RosterMember {
  return member(id, fighterTypeId, displayName, "henchman_group", groupSize, 0, equipment, specialRules, []);
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
    rosterId: "roster-averlanders",
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
  if (fighterTypeId === "averland-halfling-scout") return ["halfling-promotion"];
  return [];
}

function profileFor(fighterTypeId: string): RosterMember["currentProfile"] {
  const profiles: Record<string, RosterMember["currentProfile"]> = {
    "averland-captain": { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 },
    "averland-sergeant": { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "averland-bergjaeger": { M: 4, WS: 2, BS: 4, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "averland-youngblood": { M: 4, WS: 2, BS: 2, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 6 },
    mountainguard: { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "averland-marksman": { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "averland-halfling-scout": { M: 4, WS: 2, BS: 4, S: 2, T: 2, W: 1, I: 4, A: 1, Ld: 8 }
  };
  return profiles[fighterTypeId];
}
