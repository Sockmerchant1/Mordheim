import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validPirates(): Roster {
  return {
    id: "roster-pirates",
    name: "The Salt Saint's Due",
    warbandTypeId: "pirates",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("captain", "pirate-captain", "Captain Rosk", 20, ["dagger", "sword"]),
      hero("mate", "pirate-mate", "Mara Finch", 8, ["dagger", "axe"]),
      hero("cabin-boy", "cabin-boy", "Pip Lowtide", 0, ["dagger"]),
      henchmen("crew", "pirate-crew", "Deck Crew", 2, ["dagger", "mace"]),
      henchmen("gunners", "pirate-gunner", "Powder Gunners", 2, ["dagger", "pistol"]),
      henchmen("boatswain", "boatswain", "Bosun Mott", 1, ["dagger", "boat-hook"]),
      henchmen("swabbies", "swabbie", "Pressed Hands", 2, ["dagger", "bow"])
    ],
    campaignLog: [],
    claimedCost: 351,
    claimedWarbandRating: 78,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function piratesNoCaptain(): Roster {
  const roster = validPirates();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "pirate-captain");
  return roster;
}

export function piratesTwoCaptains(): Roster {
  const roster = validPirates();
  roster.members.push(hero("captain-2", "pirate-captain", "Second Captain", 20, ["dagger"]));
  return roster;
}

export function tooManyPirateMates(): Roster {
  const roster = validPirates();
  roster.members.push(hero("mate-2", "pirate-mate", "Second Mate", 8, ["dagger"]));
  roster.members.push(hero("mate-3", "pirate-mate", "Third Mate", 8, ["dagger"]));
  return roster;
}

export function tooManyCabinBoys(): Roster {
  const roster = validPirates();
  roster.members.push(hero("cabin-boy-2", "cabin-boy", "Second Cabin Boy", 0, ["dagger"]));
  roster.members.push(hero("cabin-boy-3", "cabin-boy", "Third Cabin Boy", 0, ["dagger"]));
  return roster;
}

export function tooManyPirateGunners(): Roster {
  const roster = validPirates();
  roster.members[4] = { ...roster.members[4], groupSize: 5 };
  roster.members.push(henchmen("gunners-2", "pirate-gunner", "Extra Gunners", 3, ["dagger"]));
  return roster;
}

export function tooManyBoatswains(): Roster {
  const roster = validPirates();
  roster.members[5] = { ...roster.members[5], groupSize: 5 };
  roster.members.push(henchmen("boatswain-2", "boatswain", "Extra Bosun", 1, ["dagger"]));
  return roster;
}

export function tooManyPiratesWarriors(): Roster {
  const roster = validPirates();
  roster.members[3] = { ...roster.members[3], groupSize: 5 };
  roster.members[4] = { ...roster.members[4], groupSize: 5 };
  return roster;
}

export function tooManySwabbiesForFreeCrew(): Roster {
  const roster = validPirates();
  roster.members[6] = { ...roster.members[6], groupSize: 5 };
  roster.members.push(henchmen("swabbies-2", "swabbie", "More Pressed Hands", 1, ["dagger"]));
  return roster;
}

export function swabbieWithExperience(): Roster {
  const roster = validPirates();
  roster.members[6] = { ...roster.members[6], currentXp: 1, experience: 1 };
  return roster;
}

export function crewWithSwivelGun(): Roster {
  const roster = validPirates();
  roster.members[3] = { ...roster.members[3], equipment: ["dagger", "swivel-gun"] };
  return roster;
}

export function gunnerWithAmmoNoSwivelGun(): Roster {
  const roster = validPirates();
  roster.members[4] = { ...roster.members[4], equipment: ["dagger", "swivel-gun-ball-shot"] };
  return roster;
}

export function gunnerWithSwivelGunBallShot(): Roster {
  const roster = validPirates();
  roster.members[4] = { ...roster.members[4], groupSize: 1, equipment: ["dagger", "swivel-gun", "swivel-gun-ball-shot"] };
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function swabbieWithPistol(): Roster {
  const roster = validPirates();
  roster.members[6] = { ...roster.members[6], equipment: ["dagger", "pistol"] };
  return roster;
}

export function invalidPirateSkill(): Roster {
  const roster = validPirates();
  roster.members[2] = { ...roster.members[2], skills: ["mighty-blow"] };
  return roster;
}

export function pirateCaptainWithSeaShanty(): Roster {
  const roster = validPirates();
  roster.members[0] = { ...roster.members[0], skills: ["sea-shanty"] };
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
    rosterId: "roster-pirates",
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
  if (fighterTypeId === "pirate-captain") return ["leader"];
  if (fighterTypeId === "swabbie") return ["pirate-shanghaied"];
  return [];
}

function profileFor(fighterTypeId: string): RosterMember["currentProfile"] {
  const profiles: Record<string, RosterMember["currentProfile"]> = {
    "pirate-captain": { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 },
    "pirate-mate": { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "cabin-boy": { M: 4, WS: 2, BS: 2, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 6 },
    "pirate-crew": { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "pirate-gunner": { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    boatswain: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    swabbie: { M: 4, WS: 2, BS: 2, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 6 }
  };
  const profile = profiles[fighterTypeId];
  if (!profile) throw new Error(`Missing profile fixture for ${fighterTypeId}`);
  return profile;
}
