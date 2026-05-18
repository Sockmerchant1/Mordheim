import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validCultOfThePossessed(): Roster {
  return {
    id: "roster-cult-of-the-possessed",
    name: "The Red Sable",
    warbandTypeId: "cult-of-the-possessed",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("magister", "magister", "Magister Varr", 20, ["dagger", "sword"], ["leader", "spellcaster", "chaos-rituals"]),
      hero("possessed", "possessed", "The Vessel", 8, [], ["fear", "cult-mutations"]),
      hero("mutant-1", "mutant", "Ghorst", 0, ["dagger", "axe", "mutation-hideous"], ["cult-mutations"]),
      hero("mutant-2", "mutant", "Ilya", 0, ["dagger", "mace", "mutation-cloven-hoofs"], ["cult-mutations"]),
      henchmen("brethren", "cult-brethren", "Red Brethren", 2, ["dagger", "mace"]),
      henchmen("darksoul", "darksoul", "Broken Mask", 1, ["dagger", "axe"], ["crazed"])
    ],
    campaignLog: [],
    claimedCost: 404,
    claimedWarbandRating: 63,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function cultNoMagister(): Roster {
  const roster = validCultOfThePossessed();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "magister");
  return roster;
}

export function cultTwoMagisters(): Roster {
  const roster = validCultOfThePossessed();
  roster.members.push(hero("magister-2", "magister", "Second Magister", 20, ["dagger"], ["leader", "spellcaster", "chaos-rituals"]));
  return roster;
}

export function tooManyCultWarriors(): Roster {
  const roster = validCultOfThePossessed();
  roster.members.push(henchmen("extra-brethren-1", "cult-brethren", "More Brethren", 5, ["dagger"]));
  roster.members.push(henchmen("extra-brethren-2", "cult-brethren", "Even More Brethren", 4, ["dagger"]));
  return roster;
}

export function tooManyPossessed(): Roster {
  const roster = validCultOfThePossessed();
  roster.members.push(hero("possessed-2", "possessed", "Second Vessel", 8, [], ["fear", "cult-mutations"]));
  roster.members.push(hero("possessed-3", "possessed", "Third Vessel", 8, [], ["fear", "cult-mutations"]));
  return roster;
}

export function tooManyMutants(): Roster {
  const roster = validCultOfThePossessed();
  roster.members.push(hero("mutant-3", "mutant", "Third Mutant", 0, ["dagger", "mutation-daemon-soul"], ["cult-mutations"]));
  return roster;
}

export function tooManyDarksouls(): Roster {
  const roster = validCultOfThePossessed();
  roster.members.push(henchmen("darksouls-extra", "darksoul", "More Darksouls", 5, ["dagger"], ["crazed"]));
  return roster;
}

export function tooManyCultBeastmen(): Roster {
  const roster = validCultOfThePossessed();
  roster.members.push(henchmen("beastmen-1", "cult-beastman", "Beastmen", 3, ["dagger"]));
  roster.members.push(henchmen("beastmen-2", "cult-beastman", "Extra Beastman", 1, ["dagger"]));
  return roster;
}

export function mutantWithoutMutation(): Roster {
  const roster = validCultOfThePossessed();
  roster.members[2] = { ...roster.members[2], equipment: ["dagger", "axe"] };
  return roster;
}

export function mutantWithTwoMutations(): Roster {
  const roster = validCultOfThePossessed();
  roster.members[2] = { ...roster.members[2], equipment: ["dagger", "mutation-great-claw", "mutation-daemon-soul"] };
  roster.claimedCost = 449;
  return roster;
}

export function mutantWithExtraArmExtraWeapon(): Roster {
  const roster = validCultOfThePossessed();
  roster.members[2] = { ...roster.members[2], equipment: ["dagger", "axe", "sword", "mace", "mutation-extra-arm"] };
  roster.claimedCost = 417;
  return roster;
}

export function mutantWithExtraWeaponWithoutExtraArm(): Roster {
  const roster = validCultOfThePossessed();
  roster.members[2] = { ...roster.members[2], equipment: ["dagger", "axe", "sword", "mace", "mutation-hideous"] };
  roster.claimedCost = 417;
  return roster;
}

export function mutantWithExtraArmAndTwoHandedExtraWeapon(): Roster {
  const roster = validCultOfThePossessed();
  roster.members[2] = { ...roster.members[2], equipment: ["dagger", "axe", "sword", "double-handed-weapon", "mutation-extra-arm"] };
  roster.claimedCost = 429;
  return roster;
}

export function possessedWithMutation(): Roster {
  const roster = validCultOfThePossessed();
  roster.members[1] = { ...roster.members[1], equipment: ["mutation-daemon-soul"] };
  return roster;
}

export function possessedWithWeapon(): Roster {
  const roster = validCultOfThePossessed();
  roster.members[1] = { ...roster.members[1], equipment: ["dagger"] };
  return roster;
}

export function darksoulWithBow(): Roster {
  const roster = validCultOfThePossessed();
  roster.members[5] = { ...roster.members[5], equipment: ["dagger", "cult-bow"] };
  return roster;
}

export function invalidCultSkill(): Roster {
  const roster = validCultOfThePossessed();
  roster.members[2] = { ...roster.members[2], skills: ["wyrdstone-hunter"] };
  return roster;
}

export function magisterWithChaosRitual(): Roster {
  const roster = validCultOfThePossessed();
  roster.members[0] = { ...roster.members[0], specialRules: ["leader", "spellcaster", "chaos-rituals", "chaos-eye-of-god"] };
  return roster;
}

export function possessedWithChaosRitual(): Roster {
  const roster = validCultOfThePossessed();
  roster.members[1] = { ...roster.members[1], specialRules: ["fear", "cult-mutations", "chaos-eye-of-god"] };
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
  specialRules: string[] = []
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
    rosterId: "roster-cult-of-the-possessed",
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
    magister: { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 8 },
    possessed: { M: 5, WS: 4, BS: 0, S: 4, T: 4, W: 2, I: 4, A: 2, Ld: 7 },
    mutant: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "cult-brethren": { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    darksoul: { M: 4, WS: 2, BS: 2, S: 4, T: 3, W: 1, I: 3, A: 1, Ld: 6 },
    "cult-beastman": { M: 4, WS: 4, BS: 3, S: 3, T: 4, W: 2, I: 3, A: 1, Ld: 7 }
  };
  return profiles[fighterTypeId];
}
