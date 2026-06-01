import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validGunnerySchoolOfNuln(): Roster {
  return {
    id: "roster-gunnery-school-of-nuln",
    name: "The Blackpowder Thesis",
    warbandTypeId: "gunnery-school-of-nuln",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("officer", "senior-gunnery-officer", "Officer Steiger", 20, ["dagger", "sword", "nuln-pistol"]),
      hero("instructor", "nuln-instructor", "Instructor Lotte", 12, ["dagger", "nuln-handgun"]),
      hero("senior-student", "senior-student", "Jannik von Meissen", 8, ["dagger", "axe", "nuln-brace-of-pistols"]),
      hero("underclassman", "underclassman", "Otto", 0, ["dagger", "mace"]),
      henchmen("sons", "son-of-the-guns", "Powder Runners", 2, ["dagger", "mace"]),
      henchmen("marksmen", "nuln-marksman", "Range Marksmen", 2, ["dagger", "nuln-handgun"]),
      henchmen("pistolier", "nuln-pistolier", "Ruprecht", 1, ["dagger", "nuln-brace-of-pistols"])
    ],
    campaignLog: [],
    claimedCost: 464,
    claimedWarbandRating: 85,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function gunnerySchoolNoOfficer(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "senior-gunnery-officer");
  return roster;
}

export function gunnerySchoolTwoOfficers(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members.push(hero("officer-2", "senior-gunnery-officer", "Second Officer", 20, ["dagger"]));
  return roster;
}

export function tooManyNulnInstructors(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members.push(hero("instructor-2", "nuln-instructor", "Second Instructor", 12, ["dagger"]));
  return roster;
}

export function tooManySeniorStudents(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members.push(hero("senior-student-2", "senior-student", "Second Senior Student", 8, ["dagger"]));
  return roster;
}

export function tooManyUnderclassmen(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members.push(hero("underclassman-2", "underclassman", "Ernst", 0, ["dagger"]));
  roster.members.push(hero("underclassman-3", "underclassman", "Karl", 0, ["dagger"]));
  return roster;
}

export function tooManyNulnMarksmen(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members[5] = { ...roster.members[5], groupSize: 5 };
  roster.members.push(henchmen("marksmen-2", "nuln-marksman", "Extra Marksmen", 3, ["dagger"]));
  return roster;
}

export function tooManyNulnPistoliers(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members[6] = { ...roster.members[6], groupSize: 5 };
  roster.members.push(henchmen("pistolier-2", "nuln-pistolier", "Extra Pistolier", 1, ["dagger"]));
  return roster;
}

export function tooManyNulnWarriors(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members[4] = { ...roster.members[4], groupSize: 5 };
  roster.members[5] = { ...roster.members[5], groupSize: 5 };
  roster.members[6] = { ...roster.members[6], groupSize: 5 };
  return roster;
}

export function nulnOfficerWithBow(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members[0] = { ...roster.members[0], equipment: ["dagger", "bow"] };
  return roster;
}

export function nulnOfficerWithWeaponsExpertAndBow(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members[0] = { ...roster.members[0], equipment: ["dagger", "bow"], skills: ["weapons-expert"] };
  return roster;
}

export function nulnMarksmanWithDuellingPistol(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members[5] = { ...roster.members[5], equipment: ["dagger", "nuln-duelling-pistol"] };
  return roster;
}

export function nulnMarksmanWithRepeaterHandgun(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members[5] = { ...roster.members[5], groupSize: 1, equipment: ["dagger", "nuln-repeater-handgun"] };
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function nulnInstructorWithMortar(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members[1] = { ...roster.members[1], equipment: ["dagger", "hand-held-mortar"] };
  roster.members[5] = { ...roster.members[5], groupSize: 1, equipment: ["dagger"] };
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function nulnPistolierWithRepeaterPistol(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members[6] = { ...roster.members[6], equipment: ["dagger", "nuln-repeater-pistol"] };
  return roster;
}

export function invalidNulnSkill(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members[1] = { ...roster.members[1], skills: ["mighty-blow"] };
  return roster;
}

export function nulnOfficerWithHunterSkill(): Roster {
  const roster = validGunnerySchoolOfNuln();
  roster.members[0] = { ...roster.members[0], skills: ["hunter"] };
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
    rosterId: "roster-gunnery-school-of-nuln",
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
  const schoolRules = ["nuln-impeccable-care", "nuln-properly-used", "nuln-proud-to-a-fault"];
  if (fighterTypeId === "senior-gunnery-officer") return ["leader", "hunter", ...schoolRules];
  if (fighterTypeId === "nuln-instructor") return [...schoolRules, "nuln-expert-weaponsmith"];
  if (fighterTypeId === "nuln-marksman") return [...schoolRules, "nuln-quick-reload"];
  if (fighterTypeId === "nuln-pistolier") return [...schoolRules, "nuln-crack-shot"];
  return schoolRules;
}

function profileFor(fighterTypeId: string): RosterMember["currentProfile"] {
  const profiles: Record<string, RosterMember["currentProfile"]> = {
    "senior-gunnery-officer": { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 },
    "nuln-instructor": { M: 4, WS: 3, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 7 },
    "senior-student": { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    underclassman: { M: 4, WS: 3, BS: 2, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 6 },
    "son-of-the-guns": { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "nuln-marksman": { M: 4, WS: 3, BS: 4, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "nuln-pistolier": { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 }
  };
  const profile = profiles[fighterTypeId];
  if (!profile) throw new Error(`Missing profile fixture for ${fighterTypeId}`);
  return profile;
}
