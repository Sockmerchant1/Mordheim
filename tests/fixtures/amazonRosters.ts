import type { Roster, RosterMember } from "../../src/rules/types";

const now = "2026-04-28T00:00:00.000Z";

export function validAmazonsLustria(): Roster {
  return {
    id: "roster-amazons-lustria",
    name: "Heart of Darkness Hunt",
    warbandTypeId: "amazons-lustria",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("serpent", "amazon-serpent-priestess", "Yara of the Serpent", 20, ["dagger", "amazon-lustria-sunstaff"]),
      hero("eagle", "amazon-eagle-warrior", "Ixchel", 8, ["dagger", "amazon-starblade"]),
      hero("piranha", "amazon-piranha-warrior", "Nayeli", 8, ["dagger", "bow"]),
      henchmen("lustria-warriors", "amazon-lustria-warrior", "River Guard", 2, ["dagger", "club"]),
      henchmen("jaguars", "amazon-jaguar-warrior", "Jaguar Stalkers", 2, ["dagger", "amazon-javelins"])
    ],
    campaignLog: [],
    claimedCost: 321,
    claimedWarbandRating: 71,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function validAmazonsMordheim(): Roster {
  return {
    id: "roster-amazons-mordheim",
    name: "The Broken Chain",
    warbandTypeId: "amazons-mordheim",
    treasuryGold: 500,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: [
      hero("priestess", "amazon-priestess", "Priestess Teyacapan", 20, ["dagger", "amazon-sunstaff"]),
      hero("champion", "amazon-champion", "Mireya", 8, ["dagger", "sword"]),
      hero("totem", "amazon-totem-warrior", "Coatl", 8, ["dagger", "amazon-claw-of-the-old-ones"]),
      henchmen("mordheim-warriors", "amazon-mordheim-warrior", "Freed Warriors", 2, ["dagger", "club"]),
      henchmen("scouts", "amazon-scout", "Ruin Scouts", 2, ["dagger", "amazon-javelins"])
    ],
    campaignLog: [],
    claimedCost: 351,
    claimedWarbandRating: 71,
    isDraft: false,
    createdAt: now,
    updatedAt: now
  };
}

export function amazonsLustriaNoPriest(): Roster {
  const roster = validAmazonsLustria();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "amazon-serpent-priestess");
  return roster;
}

export function amazonsLustriaTwoPriestesses(): Roster {
  const roster = validAmazonsLustria();
  roster.members.push(hero("serpent-2", "amazon-serpent-priestess", "Second Serpent", 20, ["dagger"]));
  return roster;
}

export function tooManyAmazonEagleWarriors(): Roster {
  const roster = validAmazonsLustria();
  roster.members.push(hero("eagle-2", "amazon-eagle-warrior", "Second Eagle", 8, ["dagger"]));
  roster.members.push(hero("eagle-3", "amazon-eagle-warrior", "Third Eagle", 8, ["dagger"]));
  return roster;
}

export function tooManyAmazonPiranhaWarriors(): Roster {
  const roster = validAmazonsLustria();
  roster.members.push(hero("piranha-2", "amazon-piranha-warrior", "Second Piranha", 8, ["dagger"]));
  roster.members.push(hero("piranha-3", "amazon-piranha-warrior", "Third Piranha", 8, ["dagger"]));
  return roster;
}

export function amazonsLustriaNoWarriors(): Roster {
  const roster = validAmazonsLustria();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "amazon-lustria-warrior");
  return roster;
}

export function tooManyAmazonJaguarWarriors(): Roster {
  const roster = validAmazonsLustria();
  roster.members[4] = { ...roster.members[4], groupSize: 4 };
  return roster;
}

export function tooManyAmazonsLustriaWarriors(): Roster {
  const roster = validAmazonsLustria();
  roster.members[3] = { ...roster.members[3], groupSize: 5 };
  roster.members[4] = { ...roster.members[4], groupSize: 3 };
  roster.members.push(henchmen("lustria-warriors-2", "amazon-lustria-warrior", "Temple Guard", 5, ["dagger"]));
  return roster;
}

export function lustriaJaguarWithBuckler(): Roster {
  const roster = validAmazonsLustria();
  roster.members[4] = { ...roster.members[4], equipment: ["dagger", "buckler"] };
  return roster;
}

export function lustriaEagleWithConch(): Roster {
  const roster = validAmazonsLustria();
  roster.members[1] = { ...roster.members[1], equipment: ["dagger", "amazon-conch-shell-horn"] };
  return roster;
}

export function lustriaPiranhaWithConch(): Roster {
  const roster = validAmazonsLustria();
  roster.members[2] = { ...roster.members[2], equipment: ["dagger", "amazon-conch-shell-horn"] };
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function lustriaWarriorWithStarsword(): Roster {
  const roster = validAmazonsLustria();
  roster.members[3] = { ...roster.members[3], equipment: ["dagger", "amazon-starsword"] };
  return roster;
}

export function invalidLustriaAmazonSkill(): Roster {
  const roster = validAmazonsLustria();
  roster.members[0] = { ...roster.members[0], skills: ["quick-shot"] };
  return roster;
}

export function lustriaEagleWithAmazonSkill(): Roster {
  const roster = validAmazonsLustria();
  roster.members[1] = { ...roster.members[1], skills: ["amazon-savage-fury"] };
  return roster;
}

export function lustriaSerpentWithRitual(): Roster {
  const roster = validAmazonsLustria();
  roster.members[0] = { ...roster.members[0], specialRules: [...roster.members[0].specialRules, "amazon-singing-wind"] };
  return roster;
}

export function lustriaEagleWithRitual(): Roster {
  const roster = validAmazonsLustria();
  roster.members[1] = { ...roster.members[1], specialRules: ["amazon-singing-wind"] };
  return roster;
}

export function amazonsLustriaWithWarlock(): Roster {
  const roster = validAmazonsLustria();
  roster.members.push(hiredSword("warlock", "Hired Warlock", roster.id));
  return roster;
}

export function amazonsMordheimNoPriestess(): Roster {
  const roster = validAmazonsMordheim();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "amazon-priestess");
  return roster;
}

export function amazonsMordheimTwoPriestesses(): Roster {
  const roster = validAmazonsMordheim();
  roster.members.push(hero("priestess-2", "amazon-priestess", "Second Priestess", 20, ["dagger"]));
  return roster;
}

export function tooManyAmazonChampions(): Roster {
  const roster = validAmazonsMordheim();
  roster.members.push(hero("champion-2", "amazon-champion", "Second Champion", 8, ["dagger"]));
  roster.members.push(hero("champion-3", "amazon-champion", "Third Champion", 8, ["dagger"]));
  return roster;
}

export function tooManyAmazonTotemWarriors(): Roster {
  const roster = validAmazonsMordheim();
  roster.members.push(hero("totem-2", "amazon-totem-warrior", "Second Totem", 8, ["dagger"]));
  roster.members.push(hero("totem-3", "amazon-totem-warrior", "Third Totem", 8, ["dagger"]));
  return roster;
}

export function amazonsMordheimNoWarriors(): Roster {
  const roster = validAmazonsMordheim();
  roster.members = roster.members.filter((member) => member.fighterTypeId !== "amazon-mordheim-warrior");
  return roster;
}

export function tooManyAmazonScouts(): Roster {
  const roster = validAmazonsMordheim();
  roster.members[4] = { ...roster.members[4], groupSize: 4 };
  return roster;
}

export function tooManyAmazonsMordheimWarriors(): Roster {
  const roster = validAmazonsMordheim();
  roster.members[3] = { ...roster.members[3], groupSize: 5 };
  roster.members[4] = { ...roster.members[4], groupSize: 3 };
  roster.members.push(henchmen("mordheim-warriors-2", "amazon-mordheim-warrior", "Second Freed", 5, ["dagger"]));
  return roster;
}

export function mordheimScoutWithSunGauntlet(): Roster {
  const roster = validAmazonsMordheim();
  roster.members[4] = { ...roster.members[4], equipment: ["dagger", "amazon-sun-gauntlet"] };
  return roster;
}

export function mordheimWarriorWithAmulet(): Roster {
  const roster = validAmazonsMordheim();
  roster.members[3] = { ...roster.members[3], equipment: ["dagger", "amazon-amulet-of-the-moon"] };
  return roster;
}

export function mordheimChampionWithSunGauntlet(): Roster {
  const roster = validAmazonsMordheim();
  roster.members[1] = { ...roster.members[1], equipment: ["dagger", "amazon-sun-gauntlet"] };
  roster.claimedCost = undefined;
  roster.claimedWarbandRating = undefined;
  return roster;
}

export function invalidMordheimAmazonSkill(): Roster {
  const roster = validAmazonsMordheim();
  roster.members[0] = { ...roster.members[0], skills: ["amazon-skink-hunter"] };
  return roster;
}

export function mordheimTotemWithQuickShot(): Roster {
  const roster = validAmazonsMordheim();
  roster.members[2] = { ...roster.members[2], skills: ["quick-shot"] };
  return roster;
}

export function mordheimPriestessWithRitual(): Roster {
  const roster = validAmazonsMordheim();
  roster.members[0] = { ...roster.members[0], specialRules: [...roster.members[0].specialRules, "amazon-sirens-dreams"] };
  return roster;
}

export function mordheimChampionWithRitual(): Roster {
  const roster = validAmazonsMordheim();
  roster.members[1] = { ...roster.members[1], specialRules: ["amazon-sirens-dreams"] };
  return roster;
}

export function amazonsMordheimWithWarlock(): Roster {
  const roster = validAmazonsMordheim();
  roster.members.push(hiredSword("warlock", "Hired Warlock", roster.id));
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
  return member(id, fighterTypeId, displayName, "hero", 1, experience, equipment, specialRules, skills, "roster-amazons");
}

function henchmen(id: string, fighterTypeId: string, displayName: string, groupSize: number, equipment: string[]): RosterMember {
  return member(id, fighterTypeId, displayName, "henchman_group", groupSize, 0, equipment, specialRulesFor(fighterTypeId), [], "roster-amazons");
}

function hiredSword(id: string, displayName: string, rosterId: string): RosterMember {
  const fighterTypeId = `hired-sword-${id}`;
  return member(id, fighterTypeId, displayName, "hired_sword", 1, 0, [], specialRulesFor(fighterTypeId), [], rosterId);
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
  skills: string[],
  rosterId: string
): RosterMember {
  return {
    id,
    rosterId,
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
  if (fighterTypeId === "amazon-serpent-priestess" || fighterTypeId === "amazon-priestess") return ["leader", "spellcaster", "amazon-rituals"];
  if (fighterTypeId === "amazon-jaguar-warrior") return ["amazon-one-with-the-jungle"];
  if (fighterTypeId === "amazon-totem-warrior") return ["frenzy"];
  if (fighterTypeId === "amazon-scout") return ["amazon-scout-stealthy"];
  if (fighterTypeId === "hired-sword-warlock") return ["spellcaster"];
  return [];
}

function profileFor(fighterTypeId: string): RosterMember["currentProfile"] {
  const profiles: Record<string, RosterMember["currentProfile"]> = {
    "amazon-serpent-priestess": { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 },
    "amazon-eagle-warrior": { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "amazon-piranha-warrior": { M: 4, WS: 3, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 7 },
    "amazon-lustria-warrior": { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "amazon-jaguar-warrior": { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "amazon-priestess": { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 },
    "amazon-champion": { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "amazon-totem-warrior": { M: 4, WS: 4, BS: 2, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "amazon-mordheim-warrior": { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "amazon-scout": { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
    "hired-sword-warlock": { M: 4, WS: 2, BS: 2, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 }
  };
  const profile = profiles[fighterTypeId];
  if (!profile) throw new Error(`Missing profile fixture for ${fighterTypeId}`);
  return profile;
}
