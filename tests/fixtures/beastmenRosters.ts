import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validBeastmenRaiders(): Roster {
  return {
    id: "roster-beastmen-raiders",
    name: "Gorehorn Herd",
    warbandTypeId: "beastmen-raiders",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("chief", "beastman-chief", "Krazak Gorehorn", 20, ["dagger", "axe", "shield"], ["leader"]),
      hero("shaman", "beastman-shaman", "Morgoth", 11, ["dagger", "hammer"], ["spellcaster", "chaos-rituals"]),
      hero("bestigor", "bestigor", "Brak", 8, ["dagger", "halberd"]),
      hero("centigor", "centigor", "Boroq", 8, ["dagger", "axe", "shield"], ["centigor-drunken", "centigor-woodland-dwelling", "centigor-trample"]),
      henchmen("gor", "gor", "Gor Pack", 2, ["dagger", "mace"]),
      henchmen("ungor", "ungor", "Ungor Pack", 2, ["dagger", "axe"]),
      henchmen("hound", "warhound-of-chaos", "Chaos Hound", 1, [])
    ],
    campaignLog: [],
    claimedCost: 419,
    claimedWarbandRating: 92,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function beastmenNoChief(): Roster {
  const roster = validBeastmenRaiders();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "beastman-chief");
  return roster;
}

export function beastmenTwoChiefs(): Roster {
  const roster = validBeastmenRaiders();
  roster.members.push(hero("chief-2", "beastman-chief", "Second Chief", 20, ["dagger"], ["leader"]));
  return roster;
}

export function tooManyBeastmenWarriors(): Roster {
  const roster = validBeastmenRaiders();
  roster.members.push(henchmen("extra-ungor", "ungor", "Too Many Ungor", 7, ["dagger"]));
  return roster;
}

export function tooManyBeastmenShamans(): Roster {
  const roster = validBeastmenRaiders();
  roster.members.push(hero("shaman-2", "beastman-shaman", "Second Shaman", 11, ["dagger"], ["spellcaster", "chaos-rituals"]));
  return roster;
}

export function tooManyBestigors(): Roster {
  const roster = validBeastmenRaiders();
  roster.members.push(hero("bestigor-2", "bestigor", "Second Bestigor", 8, ["dagger"]));
  roster.members.push(hero("bestigor-3", "bestigor", "Third Bestigor", 8, ["dagger"]));
  return roster;
}

export function tooManyCentigors(): Roster {
  const roster = validBeastmenRaiders();
  roster.members.push(hero("centigor-2", "centigor", "Second Centigor", 8, ["dagger"], ["centigor-drunken", "centigor-woodland-dwelling", "centigor-trample"]));
  return roster;
}

export function tooManyGors(): Roster {
  const roster = validBeastmenRaiders();
  roster.members.push(henchmen("extra-gor", "gor", "More Gor", 4, ["dagger"]));
  return roster;
}

export function tooManyChaosHounds(): Roster {
  const roster = validBeastmenRaiders();
  roster.members.push(henchmen("extra-hounds", "warhound-of-chaos", "More Hounds", 5, []));
  return roster;
}

export function tooManyMinotaurs(): Roster {
  const roster = validBeastmenRaiders();
  roster.members.push(henchmen("minotaur-1", "minotaur", "Bull One", 1, ["dagger"]));
  roster.members.push(henchmen("minotaur-2", "minotaur", "Bull Two", 1, ["dagger"]));
  return roster;
}

export function shamanWithArmour(): Roster {
  const roster = validBeastmenRaiders();
  roster.members[1] = { ...roster.members[1], equipment: ["dagger", "light-armour"] };
  return roster;
}

export function ungorWithHelmet(): Roster {
  const roster = validBeastmenRaiders();
  roster.members[5] = { ...roster.members[5], groupSize: 1, equipment: ["dagger", "helmet"] };
  return roster;
}

export function warhoundWithWeapon(): Roster {
  const roster = validBeastmenRaiders();
  roster.members[6] = { ...roster.members[6], equipment: ["dagger"] };
  return roster;
}

export function beastmanWithBow(): Roster {
  const roster = validBeastmenRaiders();
  roster.members[0] = { ...roster.members[0], equipment: ["dagger", "bow"] };
  return roster;
}

export function invalidBeastmenSkill(): Roster {
  const roster = validBeastmenRaiders();
  roster.members[2] = { ...roster.members[2], skills: ["sprint"] };
  return roster;
}

export function bestigorWithBellowingRoar(): Roster {
  const roster = validBeastmenRaiders();
  roster.members[2] = { ...roster.members[2], skills: ["bellowing-roar"] };
  return roster;
}

export function chiefWithBellowingRoar(): Roster {
  const roster = validBeastmenRaiders();
  roster.members[0] = { ...roster.members[0], skills: ["bellowing-roar"] };
  return roster;
}

export function shamanWithChaosRitual(): Roster {
  const roster = validBeastmenRaiders();
  roster.members[1] = { ...roster.members[1], specialRules: ["spellcaster", "chaos-rituals", "chaos-eye-of-god"] };
  return roster;
}

export function chiefWithChaosRitual(): Roster {
  const roster = validBeastmenRaiders();
  roster.members[0] = { ...roster.members[0], specialRules: ["leader", "chaos-eye-of-god"] };
  return roster;
}

export function beastmenWithWarlock(): Roster {
  const roster = validBeastmenRaiders();
  roster.members.push({
    id: "warlock",
    rosterId: roster.id,
    fighterTypeId: "hired-sword-warlock",
    displayName: "Warlock",
    kind: "hired_sword",
    groupSize: 1,
    currentProfile: { M: 4, WS: 2, BS: 2, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 },
    startingXp: 0,
    currentXp: 0,
    experience: 0,
    advances: [],
    advancesTaken: [],
    injuries: [],
    equipment: ["staff"],
    skills: [],
    specialRules: ["spellcaster"],
    notes: "",
    status: "active"
  });
  return roster;
}

export function validBeastmenMinotaur(): Roster {
  const roster = baseBeastmenRoster("minotaur", "Minotaur Test");
  roster.members = [
    hero("chief", "beastman-chief", "Krazak Gorehorn", 20, ["dagger"], ["leader"]),
    henchmen("gor", "gor", "Gor", 1, ["dagger"]),
    henchmen("minotaur", "minotaur", "Bull", 1, ["dagger"])
  ];
  return roster;
}

export function chaosHoundWithExperience(): Roster {
  const roster = validBeastmenRaiders();
  roster.members[6] = { ...roster.members[6], experience: 2, currentXp: 2 };
  return roster;
}

function baseBeastmenRoster(id: string, name: string): Roster {
  return {
    id: `roster-beastmen-${id}`,
    name,
    warbandTypeId: "beastmen-raiders",
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
    rosterId: "roster-beastmen-raiders",
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
    "beastman-chief": { M: 5, WS: 4, BS: 3, S: 4, T: 4, W: 1, I: 4, A: 1, Ld: 7 },
    "beastman-shaman": { M: 5, WS: 4, BS: 3, S: 3, T: 4, W: 1, I: 3, A: 1, Ld: 6 },
    bestigor: { M: 5, WS: 4, BS: 3, S: 4, T: 4, W: 1, I: 3, A: 1, Ld: 7 },
    centigor: { M: 8, WS: 4, BS: 3, S: 4, T: 4, W: 1, I: 2, A: 1, Ld: 7 },
    ungor: { M: 5, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 6 },
    gor: { M: 5, WS: 4, BS: 3, S: 3, T: 4, W: 1, I: 3, A: 1, Ld: 6 },
    "warhound-of-chaos": { M: 7, WS: 4, BS: 0, S: 4, T: 3, W: 1, I: 3, A: 1, Ld: 5 },
    minotaur: { M: 6, WS: 4, BS: 3, S: 4, T: 4, W: 3, I: 4, A: 3, Ld: 8 }
  };
  return profiles[fighterTypeId];
}
