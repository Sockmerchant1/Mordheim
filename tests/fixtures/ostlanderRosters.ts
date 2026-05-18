import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validOstlanders(): Roster {
  return {
    id: "roster-ostlanders",
    name: "Sable Stag Kinband",
    warbandTypeId: "ostlanders",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("elder", "ostlander-elder", "Elder Kruger", 20, ["dagger", "sword"], ["leader"]),
      hero("brother-1", "blood-brother", "Hagen", 12, ["dagger", "axe"]),
      hero("brother-2", "blood-brother", "Oskar", 12, ["dagger", "hammer"]),
      hero("priest", "priest-of-taal", "Father Ulbrecht", 12, ["dagger", "mace"], ["prayers-of-taal", "strictures"]),
      henchmen("kin", "ostlander-kin", "Sable Kin", 2, ["dagger", "mace"]),
      henchmen("ruffians", "ruffian", "Alehouse Ruffians", 2, ["dagger", "mace"]),
      henchmen("jaeger", "jaeger", "Hochland Jaeger", 1, ["dagger", "bow"])
    ],
    campaignLog: [],
    claimedCost: 343,
    claimedWarbandRating: 101,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function ostlandersNoElder(): Roster {
  const roster = validOstlanders();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "ostlander-elder");
  return roster;
}

export function ostlandersTwoElders(): Roster {
  const roster = validOstlanders();
  roster.members.push(hero("elder-2", "ostlander-elder", "Second Elder", 20, ["dagger"], ["leader"]));
  return roster;
}

export function tooManyOstlanders(): Roster {
  const roster = validOstlanders();
  roster.members[4] = { ...roster.members[4], groupSize: 5 };
  roster.members[5] = { ...roster.members[5], groupSize: 5 };
  roster.members.push(henchmen("more-kin", "ostlander-kin", "More Kin", 4, ["dagger", "mace"]));
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function tooManyBloodBrothers(): Roster {
  const roster = validOstlanders();
  roster.members.push(hero("brother-3", "blood-brother", "Third Brother", 12, ["dagger"]));
  return roster;
}

export function tooManyPriestsOfTaal(): Roster {
  const roster = validOstlanders();
  roster.members.push(hero("priest-2", "priest-of-taal", "Second Priest", 12, ["dagger"], ["prayers-of-taal", "strictures"]));
  return roster;
}

export function tooManyRuffians(): Roster {
  const roster = validOstlanders();
  roster.members[5] = { ...roster.members[5], groupSize: 6 };
  return roster;
}

export function tooManyJaegers(): Roster {
  const roster = validOstlanders();
  roster.members[6] = { ...roster.members[6], groupSize: 8 };
  return roster;
}

export function validOstlandersWithOgre(): Roster {
  const roster = validOstlanders();
  roster.members[4] = { ...roster.members[4], groupSize: 1 };
  roster.members.push(henchmen("ogre", "ostlander-ogre", "Grum", 1, ["club"], ["fear", "large-target", "ostlander-ogre-skills", "slow-witted"]));
  roster.claimedCost = 478;
  roster.claimedWarbandRating = 116;
  return roster;
}

export function tooManyOstlanderOgres(): Roster {
  const roster = validOstlandersWithOgre();
  roster.members.push(henchmen("ogre-2", "ostlander-ogre", "Second Ogre", 1, ["club"], ["fear", "large-target", "ostlander-ogre-skills", "slow-witted"]));
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function priestOfTaalWithHeavyArmour(): Roster {
  const roster = validOstlanders();
  roster.members[3] = { ...roster.members[3], equipment: ["dagger", "mace", "heavy-armour"] };
  return roster;
}

export function ruffianWithBow(): Roster {
  const roster = validOstlanders();
  roster.members[5] = { ...roster.members[5], equipment: ["dagger", "bow"] };
  return roster;
}

export function kinWithHuntingRifle(): Roster {
  const roster = validOstlanders();
  roster.members[4] = { ...roster.members[4], equipment: ["dagger", "hunting-rifle"] };
  return roster;
}

export function jaegerWithHeavyArmour(): Roster {
  const roster = validOstlanders();
  roster.members[6] = { ...roster.members[6], equipment: ["dagger", "heavy-armour"] };
  return roster;
}

export function ogreWithBow(): Roster {
  const roster = validOstlandersWithOgre();
  roster.members[7] = { ...roster.members[7], equipment: ["club", "bow"] };
  return roster;
}

export function jaegerWithDoubleBarrelledHuntingRifle(): Roster {
  return {
    id: "roster-ostlanders-rifle",
    name: "Hochland Gun Test",
    warbandTypeId: "ostlanders",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("elder", "ostlander-elder", "Elder Kruger", 20, ["dagger"], ["leader"]),
      hero("priest", "priest-of-taal", "Father Ulbrecht", 12, ["dagger"], ["prayers-of-taal", "strictures"]),
      henchmen("jaeger", "jaeger", "Hochland Jaeger", 1, ["dagger", "double-barrelled-hunting-rifle"])
    ],
    campaignLog: [],
    claimedCost: 430,
    claimedWarbandRating: 47,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function invalidOstlanderSkill(): Roster {
  const roster = validOstlanders();
  roster.members[1] = { ...roster.members[1], skills: ["quick-shot"] };
  return roster;
}

export function ostlanderElderWithBloodOath(): Roster {
  const roster = validOstlanders();
  roster.members[0] = { ...roster.members[0], skills: ["blood-oath"] };
  return roster;
}

export function bloodBrotherWithBloodOath(): Roster {
  const roster = validOstlanders();
  roster.members[1] = { ...roster.members[1], skills: ["blood-oath"] };
  return roster;
}

export function priestOfTaalWithPrayer(): Roster {
  const roster = validOstlanders();
  roster.members[3] = { ...roster.members[3], specialRules: ["prayers-of-taal", "strictures", "taal-stags-leap"] };
  return roster;
}

export function elderWithTaalPrayer(): Roster {
  const roster = validOstlanders();
  roster.members[0] = { ...roster.members[0], specialRules: ["leader", "taal-stags-leap"] };
  return roster;
}

export function ostlandersWithOgreBodyguard(): Roster {
  const roster = validOstlanders();
  roster.members.push(hiredSword("ogre-bodyguard", "Hired Ogre"));
  roster.claimedCost = 423;
  roster.claimedWarbandRating = 126;
  return roster;
}

export function ostlandersWithWarlock(): Roster {
  const roster = validOstlanders();
  roster.members.push(hiredSword("warlock", "Hired Warlock"));
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
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

function hiredSword(id: string, displayName: string): RosterMember {
  const fighterTypeId = `hired-sword-${id}`;
  return member(id, fighterTypeId, displayName, "hired_sword", 1, 0, [], specialRulesFor(fighterTypeId), []);
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
    rosterId: "roster-ostlanders",
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
  if (fighterTypeId === "ostlander-elder") return ["leader"];
  if (fighterTypeId === "priest-of-taal") return ["prayers-of-taal", "strictures"];
  if (fighterTypeId === "ruffian") return ["drunk", "no-respect"];
  if (fighterTypeId === "ostlander-ogre") return ["fear", "large-target", "ostlander-ogre-skills", "slow-witted"];
  if (fighterTypeId === "hired-sword-ogre-bodyguard") return ["fear", "large-target"];
  if (fighterTypeId === "hired-sword-warlock") return ["spellcaster"];
  return [];
}

function profileFor(fighterTypeId: string): RosterMember["currentProfile"] {
  const profiles: Record<string, RosterMember["currentProfile"]> = {
    "ostlander-elder": { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 },
    "blood-brother": { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "priest-of-taal": { M: 4, WS: 2, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "ostlander-kin": { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    ruffian: { M: 4, WS: 2, BS: 2, S: 3, T: 3, W: 1, I: 2, A: 1, Ld: 10 },
    jaeger: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "ostlander-ogre": { M: 6, WS: 3, BS: 2, S: 4, T: 4, W: 3, I: 3, A: 2, Ld: 7 },
    "hired-sword-ogre-bodyguard": { M: 6, WS: 3, BS: 2, S: 4, T: 4, W: 3, I: 3, A: 2, Ld: 7 },
    "hired-sword-warlock": { M: 4, WS: 2, BS: 2, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 }
  };
  return profiles[fighterTypeId];
}
