import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validKislevites(): Roster {
  return {
    id: "roster-kislevites",
    name: "Great Bear Company",
    warbandTypeId: "kislevites",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("captain", "druzhina-captain", "Captain Ivan", 20, ["dagger", "sword"], ["leader", "inheritance"]),
      hero("tamer", "bear-tamer", "Mikhail", 8, ["dagger", "axe"], ["bear-handler"]),
      hero("esaul", "esaul", "Boris", 8, ["dagger", "hammer"]),
      hero("youth", "kislev-youth", "Yuri", 0, ["dagger"]),
      henchmen("warriors", "kislev-warrior", "Gospodar Warriors", 2, ["dagger", "mace"]),
      henchmen("cossacks", "cossack", "Steppe Cossacks", 2, ["dagger", "spear"], ["hate-chaos"]),
      henchmen("streltsi", "streltsi", "Erengrad Streltsi", 2, ["dagger", "handgun"], ["gun-rest"])
    ],
    campaignLog: [],
    claimedCost: 419,
    claimedWarbandRating: 86,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function kislevitesNoCaptain(): Roster {
  const roster = validKislevites();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "druzhina-captain");
  return roster;
}

export function kislevitesTwoCaptains(): Roster {
  const roster = validKislevites();
  roster.members.push(hero("captain-2", "druzhina-captain", "Second Captain", 20, ["dagger"], ["leader", "inheritance"]));
  return roster;
}

export function tooManyKisleviteWarriors(): Roster {
  const roster = validKislevites();
  roster.members[4] = { ...roster.members[4], groupSize: 5 };
  roster.members[5] = { ...roster.members[5], groupSize: 5 };
  return roster;
}

export function tooManyBearTamers(): Roster {
  const roster = validKislevites();
  roster.members.push(hero("tamer-2", "bear-tamer", "Second Bear Tamer", 8, ["dagger"], ["bear-handler"]));
  return roster;
}

export function tooManyEsauls(): Roster {
  const roster = validKislevites();
  roster.members.push(hero("esaul-2", "esaul", "Second Esaul", 8, ["dagger"]));
  return roster;
}

export function tooManyKislevYouths(): Roster {
  const roster = validKislevites();
  roster.members.push(hero("youth-2", "kislev-youth", "Second Youth", 0, ["dagger"]));
  roster.members.push(hero("youth-3", "kislev-youth", "Third Youth", 0, ["dagger"]));
  return roster;
}

export function tooManyStreltsi(): Roster {
  const roster = validKislevites();
  roster.members[6] = { ...roster.members[6], groupSize: 4 };
  return roster;
}

export function validKislevitesWithBear(): Roster {
  const roster = validKislevites();
  roster.members[5] = { ...roster.members[5], groupSize: 1 };
  roster.members[6] = { ...roster.members[6], groupSize: 1 };
  roster.members.push(henchmen("bear", "trained-bear", "Misha", 1, [], ["trained-bear", "fear", "bear-hug", "fiercely-loyal", "animals", "large-target", "stupidity"]));
  roster.claimedCost = 444;
  roster.claimedWarbandRating = 96;
  return roster;
}

export function trainedBearWithoutTamer(): Roster {
  const roster = validKislevitesWithBear();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "bear-tamer");
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function tooManyTrainedBears(): Roster {
  const roster = validKislevitesWithBear();
  roster.members.push(henchmen("bear-2", "trained-bear", "Second Bear", 1, [], ["trained-bear", "fear", "bear-hug", "fiercely-loyal", "animals", "large-target", "stupidity"]));
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function trainedBearWithWeapon(): Roster {
  const roster = validKislevitesWithBear();
  roster.members[7] = { ...roster.members[7], equipment: ["dagger"] };
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function streltsiWithHeavyArmour(): Roster {
  const roster = validKislevites();
  roster.members[6] = { ...roster.members[6], equipment: ["dagger", "handgun", "heavy-armour"] };
  return roster;
}

export function warriorWithHandgun(): Roster {
  const roster = validKislevites();
  roster.members[4] = { ...roster.members[4], equipment: ["dagger", "handgun"] };
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function streltsiWithGunRestKit(): Roster {
  const roster = validKislevites();
  roster.members[6] = { ...roster.members[6], equipment: ["dagger", "halberd", "handgun"] };
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function invalidKisleviteSkill(): Roster {
  const roster = validKislevites();
  roster.members[1] = { ...roster.members[1], skills: ["quick-shot"] };
  return roster;
}

export function kislevCaptainWithBattleTongue(): Roster {
  const roster = validKislevites();
  roster.members[0] = { ...roster.members[0], skills: ["battle-tongue"] };
  return roster;
}

export function bearTamerWithMightyBlow(): Roster {
  const roster = validKislevites();
  roster.members[1] = { ...roster.members[1], skills: ["mighty-blow"] };
  return roster;
}

export function esaulWithQuickShot(): Roster {
  const roster = validKislevites();
  roster.members[2] = { ...roster.members[2], skills: ["quick-shot"] };
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
    rosterId: "roster-kislevites",
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
  if (fighterTypeId === "cossack") return ["hate-chaos"];
  if (fighterTypeId === "streltsi") return ["gun-rest"];
  if (fighterTypeId === "trained-bear") return ["trained-bear", "fear", "bear-hug", "fiercely-loyal", "animals", "large-target", "stupidity"];
  return [];
}

function profileFor(fighterTypeId: string): RosterMember["currentProfile"] {
  const profiles: Record<string, RosterMember["currentProfile"]> = {
    "druzhina-captain": { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 },
    "bear-tamer": { M: 4, WS: 3, BS: 3, S: 4, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    esaul: { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "kislev-youth": { M: 4, WS: 2, BS: 2, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 6 },
    "kislev-warrior": { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    cossack: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    streltsi: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "trained-bear": { M: 6, WS: 3, BS: 0, S: 5, T: 5, W: 2, I: 2, A: 2, Ld: 6 }
  };
  return profiles[fighterTypeId];
}
