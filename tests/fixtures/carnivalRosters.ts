import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validCarnivalOfChaos(): Roster {
  return {
    id: "roster-carnival",
    name: "The Gilded Pox",
    warbandTypeId: "carnival-of-chaos",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("master", "carnival-master", "Master Bile", 20, ["dagger", "sword", "carnival-bow"], ["leader", "spellcaster", "nurgle-rituals"]),
      hero("brute", "carnival-brute", "Strongman Grue", 8, ["dagger", "double-handed-weapon"], ["unnatural-strength"], ["strongman"]),
      hero("tainted", "tainted-one", "The Laughing Fool", 0, ["dagger", "blessing-cloud-of-flies"], ["tainted", "blessings-of-nurgle"]),
      henchmen("brethren", "brethren", "Painted Brethren", 2, ["dagger", "hammer"]),
      henchmen("nurglings", "nurgling", "Tiny Chorus", 3, [])
    ],
    campaignLog: [],
    claimedCost: 321,
    claimedWarbandRating: 68,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function carnivalNoMaster(): Roster {
  const roster = validCarnivalOfChaos();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "carnival-master");
  return roster;
}

export function tooManyCarnivalBrutes(): Roster {
  const roster = validCarnivalOfChaos();
  roster.members.push(hero("brute-2", "carnival-brute", "Second Brute", 8, ["dagger"], ["unnatural-strength"], ["strongman"]));
  roster.members.push(hero("brute-3", "carnival-brute", "Third Brute", 8, ["dagger"], ["unnatural-strength"], ["strongman"]));
  return roster;
}

export function tooManyTaintedOnes(): Roster {
  const roster = validCarnivalOfChaos();
  roster.members.push(hero("tainted-2", "tainted-one", "Second Fool", 0, ["dagger", "blessing-stream-of-corruption"], ["tainted", "blessings-of-nurgle"]));
  roster.members.push(hero("tainted-3", "tainted-one", "Third Fool", 0, ["dagger", "blessing-mark-of-nurgle"], ["tainted", "blessings-of-nurgle"]));
  return roster;
}

export function tooManyPlagueBearers(): Roster {
  const roster = validCarnivalOfChaos();
  roster.members.push(henchmen("plaguebearers", "plague-bearer", "Tallymen", 3, []));
  return roster;
}

export function tooManyPlagueCarts(): Roster {
  const roster = validCarnivalOfChaos();
  roster.members.push(henchmen("cart-1", "plague-cart", "First Cart", 1, []));
  roster.members.push(henchmen("cart-2", "plague-cart", "Second Cart", 1, []));
  return roster;
}

export function taintedWithoutBlessing(): Roster {
  const roster = validCarnivalOfChaos();
  roster.members[2] = {
    ...roster.members[2],
    equipment: ["dagger", "sword"]
  };
  return roster;
}

export function bruteWithPistol(): Roster {
  const roster = validCarnivalOfChaos();
  roster.members[1] = {
    ...roster.members[1],
    equipment: ["dagger", "pistol"]
  };
  return roster;
}

export function taintedWithTwoBlessings(): Roster {
  const roster = validCarnivalOfChaos();
  roster.members[2] = {
    ...roster.members[2],
    equipment: ["dagger", "blessing-nurgles-rot", "blessing-stream-of-corruption"]
  };
  roster.claimedCost = 396;
  return roster;
}

export function carnivalWithCartAtSeventeenWarriors(): Roster {
  const roster = baseCarnivalRoster("cart-limit", "Cart Limit Test");
  roster.members = [
    hero("master", "carnival-master", "Master Bile", 20, ["dagger"], ["leader", "spellcaster", "nurgle-rituals"]),
    henchmen("cart", "plague-cart", "Grand Cart", 1, []),
    henchmen("nurglings", "nurgling", "Big Swarm", 15, [])
  ];
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function carnivalWithoutCartAtSeventeenWarriors(): Roster {
  const roster = baseCarnivalRoster("no-cart-limit", "No Cart Limit Test");
  roster.members = [
    hero("master", "carnival-master", "Master Bile", 20, ["dagger"], ["leader", "spellcaster", "nurgle-rituals"]),
    henchmen("nurglings", "nurgling", "Big Swarm", 16, [])
  ];
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function invalidCarnivalSkill(): Roster {
  const roster = validCarnivalOfChaos();
  roster.members[2] = {
    ...roster.members[2],
    skills: ["wyrdstone-hunter"]
  };
  return roster;
}

function baseCarnivalRoster(id: string, name: string): Roster {
  return {
    id: `roster-carnival-${id}`,
    name,
    warbandTypeId: "carnival-of-chaos",
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
    rosterId: "roster-carnival",
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
    "carnival-master": { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 8 },
    "carnival-brute": { M: 4, WS: 4, BS: 0, S: 4, T: 4, W: 1, I: 2, A: 2, Ld: 7 },
    "tainted-one": { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "plague-bearer": { M: 4, WS: 4, BS: 3, S: 4, T: 4, W: 1, I: 4, A: 2, Ld: 10 },
    brethren: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    nurgling: { M: 4, WS: 3, BS: 0, S: 3, T: 2, W: 1, I: 3, A: 1, Ld: 10 },
    "plague-cart": { M: 0, WS: 0, BS: 0, S: 0, T: 8, W: 4, I: 0, A: 0, Ld: 0 }
  };
  return profiles[fighterTypeId];
}
