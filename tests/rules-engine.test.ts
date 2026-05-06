import { describe, expect, it } from "vitest";
import { rulesDb } from "../src/data/rulesDb";
import {
  calculateRosterCost,
  calculateWarbandRating,
  createRosterMemberFromType,
  getAllowedEquipment,
  getAllowedFighterTypes,
  getAllowedSkills,
  getAllowedSpecialRules,
  getAllowedWarbands,
  getPendingAdvances,
  validateRoster
} from "../src/rules/engine";
import {
  illegalEquipmentWitchHunters,
  invalidHenchmanGroupWitchHunters,
  invalidSkillWitchHunters,
  legalBraceAndCrossbow,
  noCaptainWitchHunters,
  overspentWitchHunters,
  tooManyCloseCombatWeapons,
  tooManyMissileWeapons,
  tooManyPriests,
  tooManyWarhounds,
  tooManyWarriorsWitchHunters,
  tooManyWitchHunters,
  twoCaptainWitchHunters,
  validStartingWitchHunters
} from "./fixtures/witchHunterRosters";
import {
  marienburgExpensiveButLegal,
  mercenaryIllegalEquipment,
  mercenaryNoCaptain,
  reiklandOverspentWithMarienburgGear,
  tooManyMercenaryMarksmen,
  tooManyMercenarySwordsmen,
  tooManyMercenaryWarriors,
  validMarienburgers,
  validMercenaries,
  validMiddenheimers,
  validReiklanders
} from "./fixtures/mercenaryRosters";
import {
  augurWithArmour,
  matriarchWithSpecialSkill,
  noviceWithHolyTome,
  sisterSuperiorWithMatriarchOnlySkill,
  sistersNoMatriarch,
  tooManyAugurs,
  tooManyNovices,
  tooManySisterSuperiors,
  tooManySistersWarriors,
  validSistersOfSigmar
} from "./fixtures/sistersRosters";
import {
  bruteWithPistol,
  carnivalNoMaster,
  carnivalWithCartAtSeventeenWarriors,
  carnivalWithoutCartAtSeventeenWarriors,
  invalidCarnivalSkill,
  taintedWithTwoBlessings,
  taintedWithoutBlessing,
  tooManyCarnivalBrutes,
  tooManyPlagueBearers,
  tooManyPlagueCarts,
  tooManyTaintedOnes,
  validCarnivalOfChaos
} from "./fixtures/carnivalRosters";
import {
  fightingClawsWithSword,
  giantRatWithWeapon,
  invalidSkavenSkill,
  skavenNoAssassin,
  skavenTailFightingExtraWeapon,
  skavenTwoAssassins,
  skavenTooManyWeaponsWithoutTailFighting,
  skavenWithRatOgre,
  tooManyBlackSkaven,
  tooManyEshinSorcerers,
  tooManyNightRunners,
  tooManyRatOgres,
  tooManySkavenWarriors,
  validSkaven
} from "./fixtures/skavenRosters";
import {
  invalidPestilensSkill,
  pestilensCenserBearerWithBlackHunger,
  pestilensCenserBearerWithoutBlackHunger,
  pestilensNoPriest,
  pestilensRatWithWeapon,
  pestilensSorcererWithSpell,
  pestilensTwoPriests,
  pestilensWithRatOgre,
  plagueNoviceWithCenser,
  plaguePriestWithHornedRatSpell,
  tooManyMonkInitiates,
  tooManyPestilensRatOgres,
  tooManyPestilensSorcerers,
  tooManyPestilensWarriors,
  tooManyPlagueMonks,
  validSkavenPestilens
} from "./fixtures/pestilensRosters";
import {
  invalidShadowSkill,
  shadowNoviceWithRunestones,
  shadowWalkerWithPowerfulBuild,
  shadowWarriorWithIthilmarWeapon,
  shadowWarriorsNoMaster,
  shadowWarriorsTwoMasters,
  shadowWeaverWithArmourAndSpell,
  shadowWeaverWithSpell,
  tooManyPowerfulBuilds,
  tooManyShadowWalkers,
  tooManyShadowWarriors,
  tooManyShadowWeavers,
  validShadowWarriors
} from "./fixtures/shadowWarriorRosters";
import {
  greatCrestWithBoneHelmet,
  invalidLizardmenSkill,
  kroxigorWithoutHalberd,
  lizardmenHeroWithTwoSacredMarkings,
  lizardmenNoPriest,
  lizardmenPriestWithSpell,
  lizardmenTwoPriests,
  lizardmenWithWarlock,
  saurusBraveWithShortBow,
  skinkBraveWithSword,
  tooManyGreatCrests,
  tooManyLizardmenWarriors,
  tooManySaurusBravesForSkinks,
  tooManySaurusBravesMaximum,
  tooManyTotemWarriors,
  validKroxigor,
  validLizardmen
} from "./fixtures/lizardmenRosters";
import {
  braveShedsAnimosity,
  braveWithMagicGubbinz,
  chieftainWithForestGoblinSpell,
  forestGoblinWithAxe,
  forestGoblinWithSpider,
  forestGoblinsNoChieftain,
  forestGoblinsTwoChieftains,
  giganticSpiderWithWeapon,
  invalidForestGoblinSkill,
  shamanWithForestGoblinSpell,
  tooManyForestGoblinBraves,
  tooManyForestGoblinShamans,
  tooManyForestGoblinWarriors,
  tooManyGiganticSpiders,
  tooManyRedToofBoyz,
  tooManySluggas,
  validForestGoblins
} from "./fixtures/forestGoblinRosters";

describe("rules engine - Witch Hunters", () => {
  it("calculates pending advance thresholds from XP crossings", () => {
    expect(getPendingAdvances(1, 4)).toEqual([2, 4]);
    expect(getPendingAdvances(4, 6)).toEqual([6]);
    expect(getPendingAdvances(6, 6)).toEqual([]);
  });

  it("returns allowed warbands with filters", () => {
    expect(getAllowedWarbands(rulesDb, { officialOnly: true }).map((warband) => warband.id)).toContain("witch-hunters");
    expect(getAllowedWarbands(rulesDb, { race: "Human" }).map((warband) => warband.id)).toContain("witch-hunters");
  });

  it("requires exactly one Witch Hunter Captain", () => {
    expect(codes(validStartingWitchHunters())).not.toContain("REQUIRED_LEADER");
    expect(codes(noCaptainWitchHunters())).toContain("REQUIRED_LEADER");
    expect(codes(twoCaptainWitchHunters())).toContain("REQUIRED_LEADER");
  });

  it("enforces Witch Hunter maximum total warriors", () => {
    expect(codes(tooManyWarriorsWitchHunters())).toContain("MAX_WARRIORS");
  });

  it("enforces maximum of three Witch Hunters", () => {
    expect(codes(tooManyWitchHunters())).toContain("FIGHTER_MAX_COUNT");
  });

  it("enforces maximum of one Warrior-Priest", () => {
    expect(codes(tooManyPriests())).toContain("FIGHTER_MAX_COUNT");
  });

  it("enforces maximum of five Warhounds", () => {
    expect(codes(tooManyWarhounds())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyWarhounds())).toContain("HENCHMAN_GROUP_SIZE");
  });

  it("calculates starting cost from hire costs and equipment", () => {
    expect(calculateRosterCost(validStartingWitchHunters(), rulesDb)).toBe(292);
    expect(codes(overspentWitchHunters())).toContain("STARTING_TREASURY_OVERSPENT");
  });

  it("restricts equipment by fighter type equipment list", () => {
    expect(codes(illegalEquipmentWitchHunters())).toContain("INVALID_EQUIPMENT");
    const roster = validStartingWitchHunters();
    const options = getAllowedEquipment(roster.members[2], roster, rulesDb);
    expect(options.find((option) => option.item.id === "bow")?.allowed).toBe(false);
    expect(options.find((option) => option.item.id === "crossbow")?.allowed).toBe(true);
  });

  it("enforces close combat weapon limits", () => {
    expect(codes(tooManyCloseCombatWeapons())).toContain("TOO_MANY_CLOSE_COMBAT_WEAPONS");
  });

  it("enforces missile weapon limits", () => {
    expect(codes(tooManyMissileWeapons())).toContain("TOO_MANY_MISSILE_WEAPONS");
  });

  it("counts a brace of pistols correctly for weapon limits", () => {
    expect(codes(legalBraceAndCrossbow())).not.toContain("TOO_MANY_MISSILE_WEAPONS");
  });

  it("enforces henchman group equipment uniformity", () => {
    expect(codes(invalidHenchmanGroupWitchHunters())).toContain("HENCHMAN_EQUIPMENT_UNIFORMITY");
  });

  it("calculates warband rating", () => {
    expect(calculateWarbandRating(validStartingWitchHunters(), rulesDb)).toBe(88);
  });

  it("restricts skills by fighter skill categories", () => {
    expect(codes(invalidSkillWitchHunters())).toContain("INVALID_SKILL");
    const roster = validStartingWitchHunters();
    const captainSkills = getAllowedSkills(roster.members[0], roster, rulesDb);
    expect(captainSkills.find((option) => option.item.id === "wyrdstone-hunter")?.allowed).toBe(true);
    const priestSkills = getAllowedSkills(roster.members[1], roster, rulesDb);
    expect(priestSkills.find((option) => option.item.id === "wyrdstone-hunter")?.allowed).toBe(false);
  });

  it("skill lookup returns effect text and source reference", () => {
    const roster = validStartingWitchHunters();
    const captainSkills = getAllowedSkills(roster.members[0], roster, rulesDb);
    const stepAside = captainSkills.find((option) => option.item.id === "step-aside");
    expect(stepAside?.item.effectSummary).toContain("5+ save");
    expect(stepAside?.source?.sourceDocumentId).toBe("mordheim-core-rules");
    expect(stepAside?.source?.pageRef).toBeTruthy();
  });

  it("allows Warrior-Priests to select Prayers of Sigmar", () => {
    const roster = validStartingWitchHunters();
    const priestPrayers = getAllowedSpecialRules(roster.members[1], roster, rulesDb);
    const captainPrayers = getAllowedSpecialRules(roster.members[0], roster, rulesDb);

    expect(priestPrayers.find((option) => option.item.id === "sigmar-healing-hand")?.allowed).toBe(true);
    expect(captainPrayers.find((option) => option.item.id === "sigmar-healing-hand")?.allowed).toBe(false);

    const rosterWithPrayer = validStartingWitchHunters();
    rosterWithPrayer.members[1] = { ...rosterWithPrayer.members[1], specialRules: ["sigmar-healing-hand"] };
    expect(errorCodes(rosterWithPrayer)).toEqual([]);

    const invalidPrayer = validStartingWitchHunters();
    invalidPrayer.members[0] = { ...invalidPrayer.members[0], specialRules: ["sigmar-healing-hand"] };
    expect(codes(invalidPrayer)).toContain("INVALID_SPECIAL_RULE");
  });

  it("returns only fighter types still legal to add", () => {
    const roster = validStartingWitchHunters();
    expect(getAllowedFighterTypes("witch-hunters", roster, rulesDb).map((fighter) => fighter.id)).toContain("witch-hunter");

    const fullHunters = tooManyWitchHunters();
    expect(getAllowedFighterTypes("witch-hunters", fullHunters, rulesDb).map((fighter) => fighter.id)).not.toContain("witch-hunter");
  });

  it("supports hiring available hired swords without counting them toward warband size", () => {
    const roster = validStartingWitchHunters();
    const trollSlayer = rulesDb.fighterTypes.find((fighter) => fighter.id === "hired-sword-dwarf-troll-slayer");
    expect(trollSlayer).toBeTruthy();
    roster.members.push(createRosterMemberFromType(trollSlayer!, roster.id, "hired_sword", "Snorri"));

    expect(errorCodes(roster)).toEqual([]);
    expect(calculateRosterCost(roster, rulesDb)).toBe(317);
    expect(calculateWarbandRating(roster, rulesDb)).toBe(100);
  });
});

describe("rules engine - Mercenaries", () => {
  it("loads all three official Mercenary variants", () => {
    const ids = getAllowedWarbands(rulesDb, { officialOnly: true }).map((warband) => warband.id);
    expect(ids).toContain("reiklanders");
    expect(ids).toContain("middenheimers");
    expect(ids).toContain("marienburgers");
  });

  it("validates basic starting rosters for each Mercenary variant", () => {
    expect(errorCodes(validReiklanders())).toEqual([]);
    expect(errorCodes(validMiddenheimers())).toEqual([]);
    expect(errorCodes(validMarienburgers())).toEqual([]);
    expect(calculateRosterCost(validReiklanders(), rulesDb)).toBe(254);
    expect(calculateWarbandRating(validReiklanders(), rulesDb)).toBe(63);
  });

  it("requires exactly one Mercenary Captain", () => {
    expect(codes(mercenaryNoCaptain())).toContain("REQUIRED_LEADER");
  });

  it("enforces Mercenary maximum total warriors", () => {
    expect(codes(tooManyMercenaryWarriors())).toContain("MAX_WARRIORS");
  });

  it("enforces Marksmen and Swordsmen caps", () => {
    expect(codes(tooManyMercenaryMarksmen())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyMercenarySwordsmen())).toContain("FIGHTER_MAX_COUNT");
  });

  it("applies variant profiles and starting treasury", () => {
    const reiklandMarksman = rulesDb.fighterTypes.find((fighter) => fighter.id === "reikland-marksman");
    const middenheimCaptain = rulesDb.fighterTypes.find((fighter) => fighter.id === "middenheim-mercenary-captain");
    const middenheimChampion = rulesDb.fighterTypes.find((fighter) => fighter.id === "middenheim-champion");
    const marienburg = rulesDb.warbandTypes.find((warband) => warband.id === "marienburgers");

    expect(reiklandMarksman?.profile.BS).toBe(4);
    expect(middenheimCaptain?.profile.S).toBe(4);
    expect(middenheimChampion?.profile.S).toBe(4);
    expect(marienburg?.startingGold).toBe(600);
    expect(errorCodes(marienburgExpensiveButLegal())).not.toContain("STARTING_TREASURY_OVERSPENT");
    expect(codes(reiklandOverspentWithMarienburgGear())).toContain("STARTING_TREASURY_OVERSPENT");
  });

  it("enforces Mercenary and Marksman equipment lists", () => {
    expect(codes(mercenaryIllegalEquipment())).toContain("INVALID_EQUIPMENT");

    const roster = validReiklanders();
    const warriorOptions = getAllowedEquipment(roster.members[3], roster, rulesDb);
    const marksmanOptions = getAllowedEquipment(roster.members[4], roster, rulesDb);

    expect(warriorOptions.find((option) => option.item.id === "long-bow")?.allowed).toBe(false);
    expect(marksmanOptions.find((option) => option.item.id === "long-bow")?.allowed).toBe(true);
    expect(marksmanOptions.find((option) => option.item.id === "heavy-armour")?.allowed).toBe(false);
  });

  it("enforces variant skill tables", () => {
    const reikland = validMercenaries("reikland");
    const middenheim = validMercenaries("middenheim");
    const marienburg = validMercenaries("marienburg");

    const reiklandChampionSkills = getAllowedSkills(reikland.members[1], reikland, rulesDb);
    const middenheimChampionSkills = getAllowedSkills(middenheim.members[1], middenheim, rulesDb);
    const marienburgChampionSkills = getAllowedSkills(marienburg.members[1], marienburg, rulesDb);

    expect(reiklandChampionSkills.find((option) => option.item.id === "quick-shot")?.allowed).toBe(true);
    expect(reiklandChampionSkills.find((option) => option.item.id === "step-aside")?.allowed).toBe(false);
    expect(middenheimChampionSkills.find((option) => option.item.id === "quick-shot")?.allowed).toBe(false);
    expect(middenheimChampionSkills.find((option) => option.item.id === "step-aside")?.allowed).toBe(true);
    expect(marienburgChampionSkills.find((option) => option.item.id === "mighty-blow")?.allowed).toBe(false);
    expect(marienburgChampionSkills.find((option) => option.item.id === "step-aside")?.allowed).toBe(true);
  });

  it("returns source-backed Mercenary special rules", () => {
    const rules = ["reikland-discipline", "middenheim-physical-prowess", "marienburg-traders", "expert-swordsmen"]
      .map((id) => rulesDb.specialRules.find((rule) => rule.id === id));
    expect(rules.every((rule) => rule?.sourceDocumentId === "mhr-mercenaries")).toBe(true);
    expect(rules.every((rule) => rule?.pageRef)).toBe(true);
  });
});

describe("rules engine - Sisters of Sigmar", () => {
  it("loads the official Sisters of Sigmar warband", () => {
    const ids = getAllowedWarbands(rulesDb, { officialOnly: true }).map((warband) => warband.id);
    expect(ids).toContain("sisters-of-sigmar");
  });

  it("validates a basic starting Sisters roster", () => {
    expect(errorCodes(validSistersOfSigmar())).toEqual([]);
    expect(calculateRosterCost(validSistersOfSigmar(), rulesDb)).toBe(249);
    expect(calculateWarbandRating(validSistersOfSigmar(), rulesDb)).toBe(63);
  });

  it("requires exactly one Sigmarite Matriarch", () => {
    expect(codes(sistersNoMatriarch())).toContain("REQUIRED_LEADER");
  });

  it("enforces Sister Superior, Augur, Novice and total warrior limits", () => {
    expect(codes(tooManySisterSuperiors())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyAugurs())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyNovices())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManySistersWarriors())).toContain("MAX_WARRIORS");
  });

  it("enforces Augur armour restriction and heroine-only equipment", () => {
    expect(codes(augurWithArmour())).toContain("INVALID_EQUIPMENT");
    expect(codes(noviceWithHolyTome())).toContain("INVALID_EQUIPMENT");

    const roster = validSistersOfSigmar();
    const augurOptions = getAllowedEquipment(roster.members[2], roster, rulesDb);
    const noviceOptions = getAllowedEquipment(roster.members[3], roster, rulesDb);

    expect(augurOptions.find((option) => option.item.id === "light-armour")?.allowed).toBe(false);
    expect(augurOptions.find((option) => option.item.id === "holy-tome")?.allowed).toBe(true);
    expect(noviceOptions.find((option) => option.item.id === "holy-tome")?.allowed).toBe(false);
  });

  it("enforces Sisters special skill restrictions", () => {
    expect(errorCodes(matriarchWithSpecialSkill())).toEqual([]);
    expect(codes(sisterSuperiorWithMatriarchOnlySkill())).toContain("INVALID_SKILL");

    const roster = validSistersOfSigmar();
    const matriarchSkills = getAllowedSkills(roster.members[0], roster, rulesDb);
    const superiorSkills = getAllowedSkills(roster.members[1], roster, rulesDb);
    const augurSkills = getAllowedSkills(roster.members[2], roster, rulesDb);

    expect(matriarchSkills.find((option) => option.item.id === "utter-determination")?.allowed).toBe(true);
    expect(superiorSkills.find((option) => option.item.id === "utter-determination")?.allowed).toBe(false);
    expect(augurSkills.find((option) => option.item.id === "absolute-faith")?.allowed).toBe(true);
    expect(augurSkills.find((option) => option.item.id === "mighty-blow")?.allowed).toBe(false);
  });

  it("returns source-backed Sisters lookup data", () => {
    const sigmariteWarhammer = rulesDb.equipmentItems.find((item) => item.id === "sigmarite-warhammer");
    const blessedSight = rulesDb.specialRules.find((rule) => rule.id === "blessed-sight");
    const signOfSigmar = rulesDb.skills.find((skill) => skill.id === "sign-of-sigmar");

    expect(sigmariteWarhammer?.sourceDocumentId).toBe("mhr-sisters-of-sigmar");
    expect(sigmariteWarhammer?.specialRuleIds).toContain("sigmarite-warhammer-holy");
    expect(blessedSight?.sourceDocumentId).toBe("mhr-sisters-of-sigmar");
    expect(signOfSigmar?.sourceDocumentId).toBe("mhr-sisters-of-sigmar");
  });

  it("allows Sigmarite Matriarchs to select Prayers of Sigmar", () => {
    const roster = validSistersOfSigmar();
    const matriarchPrayers = getAllowedSpecialRules(roster.members[0], roster, rulesDb);
    const superiorPrayers = getAllowedSpecialRules(roster.members[1], roster, rulesDb);

    expect(matriarchPrayers.find((option) => option.item.id === "sigmar-soulfire")?.allowed).toBe(true);
    expect(superiorPrayers.find((option) => option.item.id === "sigmar-soulfire")?.allowed).toBe(false);

    const rosterWithPrayer = validSistersOfSigmar();
    rosterWithPrayer.members[0] = { ...rosterWithPrayer.members[0], specialRules: ["sigmar-soulfire"] };
    expect(errorCodes(rosterWithPrayer)).toEqual([]);
  });
});

describe("rules engine - Carnival of Chaos", () => {
  it("loads the official Carnival of Chaos warband", () => {
    const ids = getAllowedWarbands(rulesDb, { officialOnly: true }).map((warband) => warband.id);
    expect(ids).toContain("carnival-of-chaos");
  });

  it("validates a basic starting Carnival roster", () => {
    expect(errorCodes(validCarnivalOfChaos())).toEqual([]);
    expect(calculateRosterCost(validCarnivalOfChaos(), rulesDb)).toBe(321);
    expect(calculateWarbandRating(validCarnivalOfChaos(), rulesDb)).toBe(68);
  });

  it("requires exactly one Carnival Master", () => {
    expect(codes(carnivalNoMaster())).toContain("REQUIRED_LEADER");
  });

  it("enforces Carnival fighter caps", () => {
    expect(codes(tooManyCarnivalBrutes())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyTaintedOnes())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyPlagueBearers())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyPlagueCarts())).toContain("FIGHTER_MAX_COUNT");
  });

  it("requires Tainted Ones to buy a Blessing of Nurgle", () => {
    expect(codes(taintedWithoutBlessing())).toContain("REQUIRED_EQUIPMENT_OPTION");
  });

  it("doubles second and later Blessing costs", () => {
    expect(errorCodes(taintedWithTwoBlessings())).toEqual([]);
    expect(calculateRosterCost(taintedWithTwoBlessings(), rulesDb)).toBe(396);
  });

  it("applies the Plague Cart warband size bonus", () => {
    expect(errorCodes(carnivalWithCartAtSeventeenWarriors())).toEqual([]);
    expect(codes(carnivalWithoutCartAtSeventeenWarriors())).toContain("MAX_WARRIORS");
  });

  it("enforces Carnival equipment lists", () => {
    expect(codes(bruteWithPistol())).toContain("INVALID_EQUIPMENT");

    const roster = validCarnivalOfChaos();
    const bruteOptions = getAllowedEquipment(roster.members[1], roster, rulesDb);
    const taintedOptions = getAllowedEquipment(roster.members[2], roster, rulesDb);

    expect(bruteOptions.find((option) => option.item.id === "pistol")?.allowed).toBe(false);
    expect(bruteOptions.find((option) => option.item.id === "carnival-flail")?.allowed).toBe(true);
    expect(taintedOptions.find((option) => option.item.id === "blessing-nurgles-rot")?.allowed).toBe(true);
  });

  it("enforces Carnival skill tables", () => {
    expect(codes(invalidCarnivalSkill())).toContain("INVALID_SKILL");

    const roster = validCarnivalOfChaos();
    const masterSkills = getAllowedSkills(roster.members[0], roster, rulesDb);
    const bruteSkills = getAllowedSkills(roster.members[1], roster, rulesDb);
    const taintedSkills = getAllowedSkills(roster.members[2], roster, rulesDb);

    expect(masterSkills.find((option) => option.item.id === "sorcery")?.allowed).toBe(true);
    expect(bruteSkills.find((option) => option.item.id === "mighty-blow")?.allowed).toBe(true);
    expect(bruteSkills.find((option) => option.item.id === "quick-shot")?.allowed).toBe(false);
    expect(taintedSkills.find((option) => option.item.id === "step-aside")?.allowed).toBe(true);
    expect(taintedSkills.find((option) => option.item.id === "wyrdstone-hunter")?.allowed).toBe(false);
  });

  it("returns source-backed Carnival lookup data", () => {
    const blessing = rulesDb.equipmentItems.find((item) => item.id === "blessing-nurgles-rot");
    const rituals = rulesDb.specialRules.find((rule) => rule.id === "nurgle-rituals");
    const strongman = rulesDb.skills.find((skill) => skill.id === "strongman");

    expect(blessing?.sourceDocumentId).toBe("eif-empire-in-flames");
    expect(blessing?.pageRef).toContain("Empire in Flames");
    expect(rituals?.sourceDocumentId).toBe("eif-empire-in-flames");
    expect(strongman?.sourceDocumentId).toBe("mordheim-core-rules");
  });

  it("allows Carnival Masters to select Nurgle rituals", () => {
    const roster = validCarnivalOfChaos();
    const masterRituals = getAllowedSpecialRules(roster.members[0], roster, rulesDb);
    const bruteRituals = getAllowedSpecialRules(roster.members[1], roster, rulesDb);

    expect(masterRituals.find((option) => option.item.id === "nurgle-buboes")?.allowed).toBe(true);
    expect(bruteRituals.find((option) => option.item.id === "nurgle-buboes")?.allowed).toBe(false);
  });
});

describe("rules engine - Skaven", () => {
  it("loads the official Skaven warband", () => {
    const ids = getAllowedWarbands(rulesDb, { officialOnly: true }).map((warband) => warband.id);
    expect(ids).toContain("skaven");
  });

  it("validates a basic starting Skaven roster", () => {
    expect(errorCodes(validSkaven())).toEqual([]);
    expect(calculateRosterCost(validSkaven(), rulesDb)).toBe(299);
    expect(calculateWarbandRating(validSkaven(), rulesDb)).toBe(76);
  });

  it("requires exactly one Assassin Adept", () => {
    expect(codes(skavenNoAssassin())).toContain("REQUIRED_LEADER");
    expect(codes(skavenTwoAssassins())).toContain("REQUIRED_LEADER");
  });

  it("enforces Skaven fighter caps and warrior limit", () => {
    expect(codes(tooManySkavenWarriors())).toContain("MAX_WARRIORS");
    expect(codes(tooManyBlackSkaven())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyEshinSorcerers())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyNightRunners())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyRatOgres())).toContain("FIGHTER_MAX_COUNT");
  });

  it("enforces Skaven equipment lists and fighting claws exclusivity", () => {
    expect(codes(giantRatWithWeapon())).toContain("INVALID_EQUIPMENT");
    expect(codes(fightingClawsWithSword())).toContain("CANNOT_COMBINE_WEAPONS");
    expect(codes(skavenTooManyWeaponsWithoutTailFighting())).toContain("TOO_MANY_CLOSE_COMBAT_WEAPONS");
    expect(errorCodes(skavenTailFightingExtraWeapon())).toEqual([]);

    const roster = validSkaven();
    const assassinOptions = getAllowedEquipment({ ...roster.members[0], equipment: [] }, roster, rulesDb);
    const nightRunnerOptions = getAllowedEquipment(roster.members[3], roster, rulesDb);
    const giantRatOptions = getAllowedEquipment(roster.members[5], roster, rulesDb);

    expect(assassinOptions.find((option) => option.item.id === "fighting-claws")?.allowed).toBe(true);
    expect(assassinOptions.find((option) => option.item.id === "club")?.allowed).toBe(false);
    expect(nightRunnerOptions.find((option) => option.item.id === "club")?.allowed).toBe(true);
    expect(nightRunnerOptions.find((option) => option.item.id === "weeping-blades")?.allowed).toBe(false);
    expect(giantRatOptions.find((option) => option.item.id === "club")?.allowed).toBe(false);
  });

  it("applies Rat Ogre large creature rating metadata", () => {
    expect(errorCodes(skavenWithRatOgre())).toEqual([]);
    expect(calculateWarbandRating(skavenWithRatOgre(), rulesDb)).toBe(55);
  });

  it("enforces Skaven skill tables", () => {
    expect(codes(invalidSkavenSkill())).toContain("INVALID_SKILL");

    const roster = validSkaven();
    const adeptSkills = getAllowedSkills(roster.members[0], roster, rulesDb);
    const sorcererSkills = getAllowedSkills(roster.members[1], roster, rulesDb);
    const blackSkavenSkills = getAllowedSkills(roster.members[2], roster, rulesDb);
    const nightRunnerSkills = getAllowedSkills(roster.members[3], roster, rulesDb);

    expect(adeptSkills.find((option) => option.item.id === "battle-tongue")?.allowed).toBe(true);
    expect(sorcererSkills.find((option) => option.item.id === "sorcery")?.allowed).toBe(true);
    expect(sorcererSkills.find((option) => option.item.id === "mighty-blow")?.allowed).toBe(false);
    expect(blackSkavenSkills.find((option) => option.item.id === "black-hunger")?.allowed).toBe(true);
    expect(blackSkavenSkills.find((option) => option.item.id === "wyrdstone-hunter")?.allowed).toBe(false);
    expect(nightRunnerSkills.find((option) => option.item.id === "infiltration")?.allowed).toBe(true);
    expect(nightRunnerSkills.find((option) => option.item.id === "step-aside")?.allowed).toBe(false);
  });

  it("returns source-backed Skaven lookup data", () => {
    const blowpipe = rulesDb.equipmentItems.find((item) => item.id === "blowpipe");
    const magic = rulesDb.specialRules.find((rule) => rule.id === "magic-of-the-horned-rat");
    const blackHunger = rulesDb.skills.find((skill) => skill.id === "black-hunger");

    expect(blowpipe?.sourceDocumentId).toBe("mhr-skaven");
    expect(blowpipe?.specialRuleIds).toContain("blowpipe-stealthy");
    expect(magic?.sourceDocumentId).toBe("mhr-skaven");
    expect(magic?.relatedRuleIds).toContain("horned-rat-warpfire");
    expect(blackHunger?.sourceDocumentId).toBe("mhr-skaven");
    expect(rulesDb.specialRules.find((rule) => rule.id === "horned-rat-warpfire")?.effectSummary).toContain("Difficulty 8");
  });

  it("allows Eshin Sorcerers to select Magic of the Horned Rat spells", () => {
    const roster = validSkaven();
    const sorcererSpells = getAllowedSpecialRules(roster.members[1], roster, rulesDb);
    const adeptSpells = getAllowedSpecialRules(roster.members[0], roster, rulesDb);

    expect(sorcererSpells.find((option) => option.item.id === "horned-rat-warpfire")?.allowed).toBe(true);
    expect(adeptSpells.find((option) => option.item.id === "horned-rat-warpfire")?.allowed).toBe(false);
  });
});

describe("rules engine - Skaven of Clan Pestilens", () => {
  it("loads the Grade 1b Clan Pestilens warband", () => {
    const ids = getAllowedWarbands(rulesDb, { broheimGrade: "1b" }).map((warband) => warband.id);
    expect(ids).toContain("skaven-of-clan-pestilens");
  });

  it("validates a basic starting Clan Pestilens roster", () => {
    expect(errorCodes(validSkavenPestilens())).toEqual([]);
    expect(calculateRosterCost(validSkavenPestilens(), rulesDb)).toBe(353);
    expect(calculateWarbandRating(validSkavenPestilens(), rulesDb)).toBe(86);
  });

  it("requires exactly one Plague Priest and enforces fighter caps", () => {
    expect(codes(pestilensNoPriest())).toContain("REQUIRED_LEADER");
    expect(codes(pestilensTwoPriests())).toContain("REQUIRED_LEADER");
    expect(codes(tooManyPestilensWarriors())).toContain("MAX_WARRIORS");
    expect(codes(tooManyPestilensSorcerers())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyPlagueMonks())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyMonkInitiates())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyPestilensRatOgres())).toContain("FIGHTER_MAX_COUNT");
  });

  it("enforces Clan Pestilens equipment lists", () => {
    expect(codes(plagueNoviceWithCenser())).toContain("INVALID_EQUIPMENT");
    expect(codes(pestilensRatWithWeapon())).toContain("INVALID_EQUIPMENT");

    const roster = validSkavenPestilens();
    const priestOptions = getAllowedEquipment({ ...roster.members[0], equipment: [] }, roster, rulesDb);
    const noviceOptions = getAllowedEquipment(roster.members[4], roster, rulesDb);

    expect(priestOptions.find((option) => option.item.id === "censer")?.allowed).toBe(true);
    expect(priestOptions.find((option) => option.item.id === "disease-dagger")?.allowed).toBe(true);
    expect(priestOptions.find((option) => option.item.id === "weeping-blades")?.allowed).toBe(false);
    expect(noviceOptions.find((option) => option.item.id === "censer")?.allowed).toBe(false);
  });

  it("enforces Clan Pestilens skill prerequisites", () => {
    expect(codes(invalidPestilensSkill())).toContain("INVALID_SKILL");
    expect(codes(pestilensCenserBearerWithoutBlackHunger())).toContain("INVALID_SKILL");
    expect(errorCodes(pestilensCenserBearerWithBlackHunger())).toEqual([]);

    const roster = validSkavenPestilens();
    const monkSkills = getAllowedSkills(roster.members[2], roster, rulesDb);
    const monkWithBlackHungerSkills = getAllowedSkills({ ...roster.members[2], skills: ["pestilens-black-hunger"] }, roster, rulesDb);

    expect(monkSkills.find((option) => option.item.id === "pestilens-black-hunger")?.allowed).toBe(true);
    expect(monkSkills.find((option) => option.item.id === "censer-bearer")?.allowed).toBe(false);
    expect(monkWithBlackHungerSkills.find((option) => option.item.id === "censer-bearer")?.allowed).toBe(true);
  });

  it("allows the Pestilens Sorcerer to select Horned Rat spells", () => {
    expect(errorCodes(pestilensSorcererWithSpell())).toEqual([]);
    expect(codes(plaguePriestWithHornedRatSpell())).toContain("INVALID_SPECIAL_RULE");

    const roster = validSkavenPestilens();
    const sorcererSpells = getAllowedSpecialRules(roster.members[1], roster, rulesDb);
    const priestSpells = getAllowedSpecialRules(roster.members[0], roster, rulesDb);

    expect(sorcererSpells.find((option) => option.item.id === "horned-rat-warpfire")?.allowed).toBe(true);
    expect(priestSpells.find((option) => option.item.id === "horned-rat-warpfire")?.allowed).toBe(false);
  });

  it("applies Rat Ogre large creature rating metadata", () => {
    expect(errorCodes(pestilensWithRatOgre())).toEqual([]);
    expect(calculateWarbandRating(pestilensWithRatOgre(), rulesDb)).toBe(55);
  });
});

describe("rules engine - Shadow Warriors", () => {
  it("loads the Grade 1b Shadow Warriors warband", () => {
    const ids = getAllowedWarbands(rulesDb, { broheimGrade: "1b" }).map((warband) => warband.id);
    expect(ids).toContain("shadow-warriors");
  });

  it("validates a basic starting Shadow Warriors roster", () => {
    expect(errorCodes(validShadowWarriors())).toEqual([]);
    expect(calculateRosterCost(validShadowWarriors(), rulesDb)).toBe(335);
    expect(calculateWarbandRating(validShadowWarriors(), rulesDb)).toBe(79);
  });

  it("enforces Shadow Warrior fighter caps and warrior limit", () => {
    expect(codes(shadowWarriorsNoMaster())).toContain("REQUIRED_LEADER");
    expect(codes(shadowWarriorsTwoMasters())).toContain("REQUIRED_LEADER");
    expect(codes(tooManyShadowWalkers())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyShadowWeavers())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyShadowWarriors())).toContain("MAX_WARRIORS");
  });

  it("enforces Shadow Warrior equipment lists", () => {
    expect(codes(shadowNoviceWithRunestones())).toContain("INVALID_EQUIPMENT");
    expect(codes(shadowWarriorWithIthilmarWeapon())).toContain("INVALID_EQUIPMENT");

    const roster = validShadowWarriors();
    const masterOptions = getAllowedEquipment(roster.members[0], roster, rulesDb);
    const weaverOptions = getAllowedEquipment(roster.members[1], roster, rulesDb);
    const warriorOptions = getAllowedEquipment(roster.members[3], roster, rulesDb);

    expect(masterOptions.find((option) => option.item.id === "standard-of-nagarythe")?.allowed).toBe(true);
    expect(weaverOptions.find((option) => option.item.id === "elven-runestones")?.allowed).toBe(true);
    expect(warriorOptions.find((option) => option.item.id === "elf-bow")?.allowed).toBe(true);
    expect(warriorOptions.find((option) => option.item.id === "elven-runestones")?.allowed).toBe(false);
  });

  it("enforces Shadow Warrior skills and Shadow Magic access", () => {
    expect(codes(invalidShadowSkill())).toContain("INVALID_SKILL");
    expect(errorCodes(shadowWalkerWithPowerfulBuild())).toEqual([]);
    expect(codes(tooManyPowerfulBuilds())).toContain("INVALID_SKILL");
    expect(errorCodes(shadowWeaverWithSpell())).toEqual([]);
    expect(codes(shadowWeaverWithArmourAndSpell())).toContain("INVALID_SPECIAL_RULE");

    const roster = validShadowWarriors();
    const masterSkills = getAllowedSkills(roster.members[0], roster, rulesDb);
    const weaverSkills = getAllowedSkills(roster.members[1], roster, rulesDb);
    const powerfulRoster = shadowWalkerWithPowerfulBuild();
    const powerfulWalkerSkills = getAllowedSkills(powerfulRoster.members[2], powerfulRoster, rulesDb);
    const weaverSpells = getAllowedSpecialRules(roster.members[1], roster, rulesDb);
    const masterSpells = getAllowedSpecialRules(roster.members[0], roster, rulesDb);

    expect(masterSkills.find((option) => option.item.id === "powerful-build")?.allowed).toBe(true);
    expect(weaverSkills.find((option) => option.item.id === "powerful-build")?.allowed).toBe(false);
    expect(weaverSkills.find((option) => option.item.id === "master-of-runes")?.allowed).toBe(true);
    expect(powerfulWalkerSkills.find((option) => option.item.id === "mighty-blow")?.allowed).toBe(true);
    expect(weaverSpells.find((option) => option.item.id === "shadow-pool-of-shadow")?.allowed).toBe(true);
    expect(masterSpells.find((option) => option.item.id === "shadow-pool-of-shadow")?.allowed).toBe(false);
  });
});

describe("rules engine - Lizardmen", () => {
  it("loads the Grade 1b Lizardmen warband", () => {
    const ids = getAllowedWarbands(rulesDb, { broheimGrade: "1b" }).map((warband) => warband.id);
    expect(ids).toContain("lizardmen");
  });

  it("validates a basic starting Lizardmen roster", () => {
    expect(errorCodes(validLizardmen())).toEqual([]);
    expect(calculateRosterCost(validLizardmen(), rulesDb)).toBe(309);
    expect(calculateWarbandRating(validLizardmen(), rulesDb)).toBe(74);
  });

  it("enforces Lizardmen leader, fighter caps, ratios and warrior limit", () => {
    expect(codes(lizardmenNoPriest())).toContain("REQUIRED_LEADER");
    expect(codes(lizardmenTwoPriests())).toContain("REQUIRED_LEADER");
    expect(codes(tooManyTotemWarriors())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyGreatCrests())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManySaurusBravesMaximum())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManySaurusBravesForSkinks())).toContain("FIGHTER_RATIO_LIMIT");
    expect(codes(tooManyLizardmenWarriors())).toContain("MAX_WARRIORS");
  });

  it("enforces Lizardmen equipment lists and required/exclusive options", () => {
    expect(codes(skinkBraveWithSword())).toContain("INVALID_EQUIPMENT");
    expect(codes(saurusBraveWithShortBow())).toContain("INVALID_EQUIPMENT");
    expect(codes(greatCrestWithBoneHelmet())).toContain("INVALID_EQUIPMENT");
    expect(codes(kroxigorWithoutHalberd())).toContain("REQUIRED_EQUIPMENT_OPTION");
    expect(errorCodes(validKroxigor())).toEqual([]);
    expect(codes(lizardmenHeroWithTwoSacredMarkings())).toContain("EXCLUSIVE_EQUIPMENT_GROUP");

    const roster = validLizardmen();
    const priestOptions = getAllowedEquipment(roster.members[0], roster, rulesDb);
    const crestOptions = getAllowedEquipment(roster.members[2], roster, rulesDb);
    const skinkOptions = getAllowedEquipment(roster.members[3], roster, rulesDb);
    const saurusOptions = getAllowedEquipment(roster.members[4], roster, rulesDb);

    expect(priestOptions.find((option) => option.item.id === "bone-helmet")?.allowed).toBe(true);
    expect(crestOptions.find((option) => option.item.id === "bone-helmet")?.allowed).toBe(false);
    expect(skinkOptions.find((option) => option.item.id === "javelin")?.allowed).toBe(true);
    expect(skinkOptions.find((option) => option.item.id === "sword")?.allowed).toBe(false);
    expect(saurusOptions.find((option) => option.item.id === "short-bow")?.allowed).toBe(false);
    expect(saurusOptions.find((option) => option.item.id === "lizardmen-light-armour")?.allowed).toBe(true);
  });

  it("enforces Lizardmen special skills, magic and hired sword restrictions", () => {
    expect(codes(invalidLizardmenSkill())).toContain("INVALID_SKILL");
    expect(errorCodes(lizardmenPriestWithSpell())).toEqual([]);
    expect(codes(lizardmenWithWarlock())).toContain("HIRED_SWORD_NOT_AVAILABLE");

    const roster = validLizardmen();
    const priestSkills = getAllowedSkills(roster.members[0], roster, rulesDb);
    const totemSkills = getAllowedSkills(roster.members[1], roster, rulesDb);
    const crestSkills = getAllowedSkills(roster.members[2], roster, rulesDb);
    const priestSpells = getAllowedSpecialRules(roster.members[0], roster, rulesDb);
    const totemSpells = getAllowedSpecialRules(roster.members[1], roster, rulesDb);

    expect(priestSkills.find((option) => option.item.id === "lizardmen-infiltration")?.allowed).toBe(true);
    expect(priestSkills.find((option) => option.item.id === "bellowing-battle-roar")?.allowed).toBe(false);
    expect(totemSkills.find((option) => option.item.id === "bellowing-battle-roar")?.allowed).toBe(true);
    expect(totemSkills.find((option) => option.item.id === "great-hunter")?.allowed).toBe(false);
    expect(crestSkills.find((option) => option.item.id === "great-hunter")?.allowed).toBe(true);
    expect(priestSpells.find((option) => option.item.id === "lizardmen-chotecs-wrath")?.allowed).toBe(true);
    expect(totemSpells.find((option) => option.item.id === "lizardmen-chotecs-wrath")?.allowed).toBe(false);
  });
});

describe("rules engine - Forest Goblins", () => {
  it("loads the Grade 1b Forest Goblins warband", () => {
    const ids = getAllowedWarbands(rulesDb, { broheimGrade: "1b" }).map((warband) => warband.id);
    expect(ids).toContain("forest-goblins");
  });

  it("validates a basic starting Forest Goblins roster", () => {
    expect(errorCodes(validForestGoblins())).toEqual([]);
    expect(calculateRosterCost(validForestGoblins(), rulesDb)).toBe(240);
    expect(calculateWarbandRating(validForestGoblins(), rulesDb)).toBe(64);
  });

  it("enforces Forest Goblin leader, fighter caps and warrior limit", () => {
    expect(codes(forestGoblinsNoChieftain())).toContain("REQUIRED_LEADER");
    expect(codes(forestGoblinsTwoChieftains())).toContain("REQUIRED_LEADER");
    expect(codes(tooManyForestGoblinBraves())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyForestGoblinShamans())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyRedToofBoyz())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManySluggas())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyGiganticSpiders())).toContain("FIGHTER_MAX_COUNT");
    expect(codes(tooManyForestGoblinWarriors())).toContain("MAX_WARRIORS");
  });

  it("enforces Forest Goblin equipment lists", () => {
    expect(codes(forestGoblinWithAxe())).toContain("INVALID_EQUIPMENT");
    expect(codes(braveWithMagicGubbinz())).toContain("INVALID_EQUIPMENT");
    expect(codes(giganticSpiderWithWeapon())).toContain("INVALID_EQUIPMENT");
    expect(errorCodes(forestGoblinWithSpider())).toEqual([]);
    expect(calculateWarbandRating(forestGoblinWithSpider(), rulesDb)).toBe(84);

    const roster = validForestGoblins();
    const chieftainOptions = getAllowedEquipment(roster.members[0], roster, rulesDb);
    const shamanOptions = getAllowedEquipment(roster.members[1], roster, rulesDb);
    const henchmanOptions = getAllowedEquipment(roster.members[3], roster, rulesDb);

    expect(chieftainOptions.find((option) => option.item.id === "boss-pole")?.allowed).toBe(true);
    expect(chieftainOptions.find((option) => option.item.id === "giant-spider-mount")?.allowed).toBe(true);
    expect(shamanOptions.find((option) => option.item.id === "magic-gubbinz")?.allowed).toBe(true);
    expect(henchmanOptions.find((option) => option.item.id === "forest-goblin-throwing-weapons")?.allowed).toBe(true);
    expect(henchmanOptions.find((option) => option.item.id === "axe")?.allowed).toBe(false);
  });

  it("enforces Forest Goblin skill and magic access", () => {
    expect(codes(invalidForestGoblinSkill())).toContain("INVALID_SKILL");
    expect(errorCodes(braveShedsAnimosity())).toEqual([]);
    expect(errorCodes(shamanWithForestGoblinSpell())).toEqual([]);
    expect(codes(chieftainWithForestGoblinSpell())).toContain("INVALID_SPECIAL_RULE");

    const roster = validForestGoblins();
    const chieftainSkills = getAllowedSkills(roster.members[0], roster, rulesDb);
    const braveSkills = getAllowedSkills(roster.members[2], roster, rulesDb);
    const shamanSpells = getAllowedSpecialRules(roster.members[1], roster, rulesDb);
    const chieftainSpells = getAllowedSpecialRules(roster.members[0], roster, rulesDb);

    expect(chieftainSkills.find((option) => option.item.id === "shed-animosity")?.allowed).toBe(false);
    expect(braveSkills.find((option) => option.item.id === "shed-animosity")?.allowed).toBe(true);
    expect(shamanSpells.find((option) => option.item.id === "forest-goblin-wind-of-gork")?.allowed).toBe(true);
    expect(chieftainSpells.find((option) => option.item.id === "forest-goblin-wind-of-gork")?.allowed).toBe(false);
  });
});

function codes(roster: ReturnType<typeof validStartingWitchHunters>) {
  return validateRoster(roster, rulesDb).map((issue) => issue.code);
}

function errorCodes(roster: ReturnType<typeof validStartingWitchHunters>) {
  return validateRoster(roster, rulesDb)
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.code);
}
