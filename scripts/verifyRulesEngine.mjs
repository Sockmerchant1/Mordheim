import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { hiredSwordSchema, rulesDbSchema, warbandSeedCollectionSchema, warbandSeedSchema } from "../src/rules/schemas.ts";
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
} from "../src/rules/engine.ts";
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
} from "../tests/fixtures/witchHunterRosters.ts";
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
} from "../tests/fixtures/mercenaryRosters.ts";
import {
  averlandBergjaegerWithHuntingArrows,
  averlandBergjaegerWithHuntingArrowsNoBow,
  averlandCaptainWithBattleTongue,
  averlandHalflingWithLongBow,
  averlandMarksmanWithHeavyArmour,
  averlandMountainguardWithHuntingRifle,
  averlandersNoCaptain,
  averlandersTwoCaptains,
  invalidAverlandSkill,
  tooManyAverlandHalflings,
  tooManyAverlandSergeants,
  tooManyAverlandWarriors,
  tooManyAverlandYoungbloods,
  tooManyBergjaegers,
  validAverlanders
} from "../tests/fixtures/averlanderRosters.ts";
import {
  bearTamerWithMightyBlow,
  esaulWithQuickShot,
  invalidKisleviteSkill,
  kislevCaptainWithBattleTongue,
  kislevitesNoCaptain,
  kislevitesTwoCaptains,
  streltsiWithGunRestKit,
  streltsiWithHeavyArmour,
  tooManyBearTamers,
  tooManyEsauls,
  tooManyKisleviteWarriors,
  tooManyKislevYouths,
  tooManyStreltsi,
  tooManyTrainedBears,
  trainedBearWithWeapon,
  trainedBearWithoutTamer,
  validKislevites,
  validKislevitesWithBear,
  warriorWithHandgun
} from "../tests/fixtures/kisleviteRosters.ts";
import {
  bloodBrotherWithBloodOath,
  elderWithTaalPrayer,
  invalidOstlanderSkill,
  jaegerWithDoubleBarrelledHuntingRifle,
  jaegerWithHeavyArmour,
  kinWithHuntingRifle,
  ogreWithBow,
  ostlanderElderWithBloodOath,
  ostlandersNoElder,
  ostlandersTwoElders,
  ostlandersWithOgreBodyguard,
  ostlandersWithWarlock,
  priestOfTaalWithHeavyArmour,
  priestOfTaalWithPrayer,
  ruffianWithBow,
  tooManyBloodBrothers,
  tooManyJaegers,
  tooManyOstlanderOgres,
  tooManyOstlanders,
  tooManyPriestsOfTaal,
  tooManyRuffians,
  validOstlanders,
  validOstlandersWithOgre
} from "../tests/fixtures/ostlanderRosters.ts";
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
} from "../tests/fixtures/sistersRosters.ts";
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
} from "../tests/fixtures/carnivalRosters.ts";
import {
  cultNoMagister,
  cultTwoMagisters,
  darksoulWithBow,
  invalidCultSkill,
  magisterWithChaosRitual,
  mutantWithExtraArmAndTwoHandedExtraWeapon,
  mutantWithExtraArmExtraWeapon,
  mutantWithExtraWeaponWithoutExtraArm,
  mutantWithTwoMutations,
  mutantWithoutMutation,
  possessedWithChaosRitual,
  possessedWithMutation,
  possessedWithWeapon,
  tooManyCultBeastmen,
  tooManyCultWarriors,
  tooManyDarksouls,
  tooManyMutants,
  tooManyPossessed,
  validCultOfThePossessed
} from "../tests/fixtures/cultRosters.ts";
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
} from "../tests/fixtures/skavenRosters.ts";
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
} from "../tests/fixtures/pestilensRosters.ts";
import {
  direWolfWithWeapon,
  ghoulWithArmour,
  invalidUndeadSkill,
  undeadNoVampire,
  undeadTooManyDireWolves,
  undeadTooManyDregs,
  undeadTooManyWarriors,
  undeadTwoVampires,
  validUndead,
  zombieWithWeapon
} from "../tests/fixtures/undeadRosters.ts";
import {
  ballAndChainWithShield,
  ballAndChainWithoutMushrooms,
  caveSquigWithWeapon,
  goblinWithBallAndChain,
  invalidOrcSkill,
  orcNoBoss,
  orcTwoBosses,
  shamanWithArmour,
  tooManyCaveSquigsForGoblins,
  tooManyCaveSquigsMaximum,
  tooManyGoblinWarriorsForOrcs,
  tooManyOrcBigUns,
  tooManyOrcShamans,
  tooManyTrolls,
  validOrcMob
} from "../tests/fixtures/orcRosters.ts";
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
} from "../tests/fixtures/shadowWarriorRosters.ts";
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
} from "../tests/fixtures/lizardmenRosters.ts";
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
} from "../tests/fixtures/forestGoblinRosters.ts";
import {
  amazonsLustriaNoPriest,
  amazonsLustriaNoWarriors,
  amazonsLustriaTwoPriestesses,
  amazonsLustriaWithWarlock,
  amazonsMordheimNoPriestess,
  amazonsMordheimNoWarriors,
  amazonsMordheimTwoPriestesses,
  amazonsMordheimWithWarlock,
  invalidLustriaAmazonSkill,
  invalidMordheimAmazonSkill,
  lustriaEagleWithAmazonSkill,
  lustriaEagleWithConch,
  lustriaEagleWithRitual,
  lustriaJaguarWithBuckler,
  lustriaPiranhaWithConch,
  lustriaSerpentWithRitual,
  lustriaWarriorWithStarsword,
  mordheimChampionWithRitual,
  mordheimChampionWithSunGauntlet,
  mordheimPriestessWithRitual,
  mordheimScoutWithSunGauntlet,
  mordheimTotemWithQuickShot,
  mordheimWarriorWithAmulet,
  tooManyAmazonChampions,
  tooManyAmazonEagleWarriors,
  tooManyAmazonJaguarWarriors,
  tooManyAmazonPiranhaWarriors,
  tooManyAmazonScouts,
  tooManyAmazonTotemWarriors,
  tooManyAmazonsLustriaWarriors,
  tooManyAmazonsMordheimWarriors,
  validAmazonsLustria,
  validAmazonsMordheim
} from "../tests/fixtures/amazonRosters.ts";
import {
  crewWithSwivelGun,
  gunnerWithAmmoNoSwivelGun,
  gunnerWithSwivelGunBallShot,
  invalidPirateSkill,
  pirateCaptainWithSeaShanty,
  piratesNoCaptain,
  piratesTwoCaptains,
  swabbieWithExperience,
  swabbieWithPistol,
  tooManyBoatswains,
  tooManyCabinBoys,
  tooManyPirateGunners,
  tooManyPirateMates,
  tooManyPiratesWarriors,
  tooManySwabbiesForFreeCrew,
  validPirates
} from "../tests/fixtures/pirateRosters.ts";
import {
  gunnerySchoolNoOfficer,
  gunnerySchoolTwoOfficers,
  invalidNulnSkill,
  nulnInstructorWithMortar,
  nulnMarksmanWithDuellingPistol,
  nulnMarksmanWithRepeaterHandgun,
  nulnOfficerWithBow,
  nulnOfficerWithHunterSkill,
  nulnOfficerWithWeaponsExpertAndBow,
  nulnPistolierWithRepeaterPistol,
  tooManyNulnInstructors,
  tooManyNulnMarksmen,
  tooManyNulnPistoliers,
  tooManyNulnWarriors,
  tooManySeniorStudents,
  tooManyUnderclassmen,
  validGunnerySchoolOfNuln
} from "../tests/fixtures/gunnerySchoolRosters.ts";
import {
  createRosterFromStarterTemplate,
  starterRosterTemplates
} from "../src/data/starterRosters.ts";

const rulesDb = await loadRulesDb();
const rulesLookup = JSON.parse(await fs.readFile(new URL("../src/data/rulesLookup.json", import.meta.url), "utf8"));

assert.ok(rulesLookup.some((rule) => rule.id === "equipment-helmet" && rule.text.includes("4+")));
assert.ok(rulesLookup.some((rule) => rule.id === "special-sigmar-healing-hand" && rule.text.includes("2 inches")));
assert.ok(rulesLookup.some((rule) => rule.id === "injury-leg-wound" && rule.text.includes("-1 Movement")));
assert.ok(rulesLookup.some((rule) => rule.id === "table-serious-injuries" && rule.text.includes("D66")));
assert.ok(rulesLookup.some((rule) => rule.id === "table-exploration" && rule.tables?.some((table) => table.rows.some((row) => row.includes("36+")))));
assert.ok(rulesLookup.some((rule) => rule.id === "special-set-traps" && rule.text.includes("Strength 4")));
assert.ok(rulesLookup.some((rule) => rule.id === "equipment-hunting-arrows" && rule.text.includes("+1")));
assert.ok(rulesLookup.some((rule) => rule.id === "special-bear-hug" && rule.text.includes("automatic wound")));
assert.ok(rulesLookup.some((rule) => rule.id === "equipment-vodka" && rule.text.includes("+1 Leadership")));
assert.ok(!rulesLookup.some((rule) => /Placeholder injury entry|Rule text not available yet/i.test(rule.text)));

assert.deepEqual(getPendingAdvances(1, 4), [2, 4]);
assert.deepEqual(getPendingAdvances(4, 6), [6]);
assert.deepEqual(getPendingAdvances(6, 6), []);

assert.ok(getAllowedWarbands(rulesDb, { officialOnly: true }).some((warband) => warband.id === "witch-hunters"));

const templateWarbandIds = new Set(starterRosterTemplates.map((template) => template.warbandTypeId));
for (const warband of rulesDb.warbandTypes.filter((item) => item.implementationStatus === "tested")) {
  assert.ok(templateWarbandIds.has(warband.id), `Missing starter roster template for ${warband.id}`);
}
for (const template of starterRosterTemplates) {
  const templateRoster = createRosterFromStarterTemplate(template, rulesDb);
  const templateErrors = validateRoster(templateRoster, rulesDb).filter((issue) => issue.severity === "error");
  assert.deepEqual(templateErrors.map((issue) => `${issue.code}: ${issue.message}`), [], `Starter template ${template.id} should be valid`);
  const templateCost = calculateRosterCost(templateRoster, rulesDb);
  const templateWarband = rulesDb.warbandTypes.find((warband) => warband.id === template.warbandTypeId);
  assert.ok(templateWarband, `Starter template ${template.id} should reference a known warband`);
  assert.ok(templateCost <= templateWarband.startingGold, `Starter template ${template.id} should not overspend`);
  assert.equal(templateRoster.claimedCost, templateCost);
  assert.equal(templateRoster.claimedWarbandRating, calculateWarbandRating(templateRoster, rulesDb));
  assert.equal(templateRoster.treasuryGold, templateWarband.startingGold - templateCost);
}

assert.doesNotMatch(codes(validStartingWitchHunters()).join(","), /REQUIRED_LEADER/);
assert.ok(codes(noCaptainWitchHunters()).includes("REQUIRED_LEADER"));
assert.ok(codes(twoCaptainWitchHunters()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManyWarriorsWitchHunters()).includes("MAX_WARRIORS"));
assert.ok(codes(tooManyWitchHunters()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyPriests()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyWarhounds()).includes("FIGHTER_MAX_COUNT"));
assert.equal(calculateRosterCost(validStartingWitchHunters(), rulesDb), 292);
assert.ok(codes(overspentWitchHunters()).includes("STARTING_TREASURY_OVERSPENT"));
assert.ok(codes(illegalEquipmentWitchHunters()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(tooManyCloseCombatWeapons()).includes("TOO_MANY_CLOSE_COMBAT_WEAPONS"));
assert.ok(codes(tooManyMissileWeapons()).includes("TOO_MANY_MISSILE_WEAPONS"));
assert.ok(!codes(legalBraceAndCrossbow()).includes("TOO_MANY_MISSILE_WEAPONS"));
assert.ok(codes(invalidHenchmanGroupWitchHunters()).includes("HENCHMAN_EQUIPMENT_UNIFORMITY"));
assert.equal(calculateWarbandRating(validStartingWitchHunters(), rulesDb), 88);
assert.ok(codes(invalidSkillWitchHunters()).includes("INVALID_SKILL"));

const roster = validStartingWitchHunters();
const captainEquipmentOptions = getAllowedEquipment(roster.members[0], roster, rulesDb);
const equipmentOptions = getAllowedEquipment(roster.members[2], roster, rulesDb);
assert.equal(captainEquipmentOptions.find((option) => option.item.id === "warhorse")?.allowed, true);
assert.equal(equipmentOptions.find((option) => option.item.id === "bow")?.allowed, false);
assert.equal(equipmentOptions.find((option) => option.item.id === "crossbow")?.allowed, true);

const captainSkills = getAllowedSkills(roster.members[0], roster, rulesDb);
const priestSkills = getAllowedSkills(roster.members[1], roster, rulesDb);
assert.equal(captainSkills.find((option) => option.item.id === "wyrdstone-hunter")?.allowed, true);
assert.equal(priestSkills.find((option) => option.item.id === "wyrdstone-hunter")?.allowed, false);
const stepAside = captainSkills.find((option) => option.item.id === "step-aside");
assert.match(stepAside?.item.effectSummary ?? "", /5\+ save/);
assert.equal(stepAside?.source?.sourceDocumentId, "mordheim-core-rules");
const priestPrayers = getAllowedSpecialRules(roster.members[1], roster, rulesDb);
const captainPrayers = getAllowedSpecialRules(roster.members[0], roster, rulesDb);
assert.equal(priestPrayers.find((option) => option.item.id === "sigmar-healing-hand")?.allowed, true);
assert.equal(captainPrayers.find((option) => option.item.id === "sigmar-healing-hand")?.allowed, false);
const witchHunterPrayerRoster = validStartingWitchHunters();
witchHunterPrayerRoster.members[1] = { ...witchHunterPrayerRoster.members[1], specialRules: ["sigmar-healing-hand"] };
assert.deepEqual(errorCodes(witchHunterPrayerRoster), []);
const invalidWitchHunterPrayerRoster = validStartingWitchHunters();
invalidWitchHunterPrayerRoster.members[0] = { ...invalidWitchHunterPrayerRoster.members[0], specialRules: ["sigmar-healing-hand"] };
assert.ok(codes(invalidWitchHunterPrayerRoster).includes("INVALID_SPECIAL_RULE"));

assert.ok(getAllowedFighterTypes("witch-hunters", roster, rulesDb).some((fighter) => fighter.id === "witch-hunter"));
assert.ok(!getAllowedFighterTypes("witch-hunters", tooManyWitchHunters(), rulesDb).some((fighter) => fighter.id === "witch-hunter"));

const allowedOfficialWarbands = getAllowedWarbands(rulesDb, { officialOnly: true }).map((warband) => warband.id);
assert.ok(allowedOfficialWarbands.includes("reiklanders"));
assert.ok(allowedOfficialWarbands.includes("middenheimers"));
assert.ok(allowedOfficialWarbands.includes("marienburgers"));
assert.deepEqual(errorCodes(validReiklanders()), []);
assert.deepEqual(errorCodes(validMiddenheimers()), []);
assert.deepEqual(errorCodes(validMarienburgers()), []);
assert.equal(calculateRosterCost(validReiklanders(), rulesDb), 254);
assert.equal(calculateWarbandRating(validReiklanders(), rulesDb), 63);
assert.ok(codes(mercenaryNoCaptain()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManyMercenaryWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(tooManyMercenaryMarksmen()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyMercenarySwordsmen()).includes("FIGHTER_MAX_COUNT"));
assert.equal(rulesDb.fighterTypes.find((fighter) => fighter.id === "reikland-marksman")?.profile.BS, 4);
assert.equal(rulesDb.fighterTypes.find((fighter) => fighter.id === "middenheim-mercenary-captain")?.profile.S, 4);
assert.equal(rulesDb.fighterTypes.find((fighter) => fighter.id === "middenheim-champion")?.profile.S, 4);
assert.equal(rulesDb.warbandTypes.find((warband) => warband.id === "marienburgers")?.startingGold, 600);
assert.ok(!errorCodes(marienburgExpensiveButLegal()).includes("STARTING_TREASURY_OVERSPENT"));
assert.ok(codes(reiklandOverspentWithMarienburgGear()).includes("STARTING_TREASURY_OVERSPENT"));
assert.ok(codes(mercenaryIllegalEquipment()).includes("INVALID_EQUIPMENT"));

const reiklandRoster = validReiklanders();
const captainOptions = getAllowedEquipment(reiklandRoster.members[0], reiklandRoster, rulesDb);
const warriorOptions = getAllowedEquipment(reiklandRoster.members[3], reiklandRoster, rulesDb);
const marksmanOptions = getAllowedEquipment(reiklandRoster.members[4], reiklandRoster, rulesDb);
assert.equal(captainOptions.find((option) => option.item.id === "warhorse")?.allowed, true);
assert.equal(captainOptions.find((option) => option.item.id === "barding")?.allowed, false);
assert.equal(warriorOptions.find((option) => option.item.id === "long-bow")?.allowed, false);
assert.equal(warriorOptions.find((option) => option.item.id === "warhorse")?.allowed, false);
assert.equal(marksmanOptions.find((option) => option.item.id === "long-bow")?.allowed, true);
assert.equal(marksmanOptions.find((option) => option.item.id === "heavy-armour")?.allowed, false);

const reiklandChampionSkills = getAllowedSkills(validMercenaries("reikland").members[1], validMercenaries("reikland"), rulesDb);
const middenheimChampionSkills = getAllowedSkills(validMercenaries("middenheim").members[1], validMercenaries("middenheim"), rulesDb);
const marienburgChampionSkills = getAllowedSkills(validMercenaries("marienburg").members[1], validMercenaries("marienburg"), rulesDb);
assert.equal(reiklandChampionSkills.find((option) => option.item.id === "quick-shot")?.allowed, true);
assert.equal(reiklandChampionSkills.find((option) => option.item.id === "step-aside")?.allowed, false);
assert.equal(middenheimChampionSkills.find((option) => option.item.id === "quick-shot")?.allowed, false);
assert.equal(middenheimChampionSkills.find((option) => option.item.id === "step-aside")?.allowed, true);
assert.equal(marienburgChampionSkills.find((option) => option.item.id === "mighty-blow")?.allowed, false);
assert.equal(marienburgChampionSkills.find((option) => option.item.id === "step-aside")?.allowed, true);

assert.ok(allowedOfficialWarbands.includes("averlanders"));
assert.deepEqual(errorCodes(validAverlanders()), []);
assert.equal(calculateRosterCost(validAverlanders(), rulesDb), 334);
assert.equal(calculateWarbandRating(validAverlanders(), rulesDb), 77);
assert.ok(codes(averlandersNoCaptain()).includes("REQUIRED_LEADER"));
assert.ok(codes(averlandersTwoCaptains()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManyAverlandWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(tooManyAverlandSergeants()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyBergjaegers()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyAverlandYoungbloods()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyAverlandHalflings()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(averlandMarksmanWithHeavyArmour()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(averlandHalflingWithLongBow()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(averlandMountainguardWithHuntingRifle()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(averlandBergjaegerWithHuntingArrowsNoBow()).includes("MISSING_REQUIRED_EQUIPMENT"));
assert.deepEqual(errorCodes(averlandBergjaegerWithHuntingArrows()), []);
assert.ok(codes(invalidAverlandSkill()).includes("INVALID_SKILL"));
assert.deepEqual(errorCodes(averlandCaptainWithBattleTongue()), []);

const averlandRoster = validAverlanders();
const averlandCaptainOptions = getAllowedEquipment(averlandRoster.members[0], averlandRoster, rulesDb);
const bergjaegerOptions = getAllowedEquipment(averlandRoster.members[2], averlandRoster, rulesDb);
const averlandMarksmanOptions = getAllowedEquipment(averlandRoster.members[5], averlandRoster, rulesDb);
const halflingScoutOptions = getAllowedEquipment(averlandRoster.members[6], averlandRoster, rulesDb);
assert.equal(averlandCaptainOptions.find((option) => option.item.id === "brace-of-duelling-pistols")?.allowed, true);
assert.equal(bergjaegerOptions.find((option) => option.item.id === "hunting-arrows")?.allowed, true);
assert.equal(bergjaegerOptions.find((option) => option.item.id === "blunderbuss")?.allowed, false);
assert.equal(averlandMarksmanOptions.find((option) => option.item.id === "hunting-rifle")?.allowed, true);
assert.equal(halflingScoutOptions.find((option) => option.item.id === "long-bow")?.allowed, false);
const averlandCaptainSkills = getAllowedSkills(averlandRoster.members[0], averlandRoster, rulesDb);
const averlandSergeantSkills = getAllowedSkills(averlandRoster.members[1], averlandRoster, rulesDb);
const bergjaegerSkills = getAllowedSkills(averlandRoster.members[2], averlandRoster, rulesDb);
assert.equal(averlandCaptainSkills.find((option) => option.item.id === "battle-tongue")?.allowed, true);
assert.equal(averlandSergeantSkills.find((option) => option.item.id === "quick-shot")?.allowed, false);
assert.equal(bergjaegerSkills.find((option) => option.item.id === "quick-shot")?.allowed, true);
assert.equal(bergjaegerSkills.find((option) => option.item.id === "mighty-blow")?.allowed, false);
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "hunting-arrows")?.specialRuleIds.includes("hunting-arrows-injury"), true);
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "set-traps")?.sourceDocumentId, "mhr-averlanders");

assert.ok(allowedOfficialWarbands.includes("kislevites"));
assert.deepEqual(errorCodes(validKislevites()), []);
assert.equal(calculateRosterCost(validKislevites(), rulesDb), 419);
assert.equal(calculateWarbandRating(validKislevites(), rulesDb), 86);
assert.ok(codes(kislevitesNoCaptain()).includes("REQUIRED_LEADER"));
assert.ok(codes(kislevitesTwoCaptains()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManyKisleviteWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(tooManyBearTamers()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyEsauls()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyKislevYouths()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyStreltsi()).includes("FIGHTER_MAX_COUNT"));
assert.deepEqual(errorCodes(validKislevitesWithBear()), []);
assert.equal(calculateRosterCost(validKislevitesWithBear(), rulesDb), 444);
assert.equal(calculateWarbandRating(validKislevitesWithBear(), rulesDb), 96);
assert.ok(codes(trainedBearWithoutTamer()).includes("FIGHTER_RATIO_LIMIT"));
assert.ok(codes(tooManyTrainedBears()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(trainedBearWithWeapon()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(streltsiWithHeavyArmour()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(warriorWithHandgun()).includes("INVALID_EQUIPMENT"));
assert.deepEqual(errorCodes(streltsiWithGunRestKit()), []);
assert.ok(codes(invalidKisleviteSkill()).includes("INVALID_SKILL"));
assert.deepEqual(errorCodes(kislevCaptainWithBattleTongue()), []);
assert.deepEqual(errorCodes(bearTamerWithMightyBlow()), []);
assert.deepEqual(errorCodes(esaulWithQuickShot()), []);

const kislevRoster = validKislevites();
const kislevCaptainOptions = getAllowedEquipment(kislevRoster.members[0], kislevRoster, rulesDb);
const kislevWarriorOptions = getAllowedEquipment(kislevRoster.members[4], kislevRoster, rulesDb);
const kislevStreltsiOptions = getAllowedEquipment(kislevRoster.members[6], kislevRoster, rulesDb);
const kislevBearRoster = validKislevitesWithBear();
const kislevBearOptions = getAllowedEquipment(kislevBearRoster.members[7], kislevBearRoster, rulesDb);
assert.equal(kislevCaptainOptions.find((option) => option.item.id === "brace-of-duelling-pistols")?.allowed, true);
assert.equal(kislevWarriorOptions.find((option) => option.item.id === "throwing-knives")?.allowed, true);
assert.equal(kislevWarriorOptions.find((option) => option.item.id === "handgun")?.allowed, false);
assert.equal(kislevStreltsiOptions.find((option) => option.item.id === "handgun")?.allowed, true);
assert.equal(kislevStreltsiOptions.find((option) => option.item.id === "heavy-armour")?.allowed, false);
assert.equal(kislevBearOptions.find((option) => option.item.id === "dagger")?.allowed, false);

const kislevCaptainSkills = getAllowedSkills(kislevRoster.members[0], kislevRoster, rulesDb);
const kislevTamerSkills = getAllowedSkills(kislevRoster.members[1], kislevRoster, rulesDb);
const kislevEsaulSkills = getAllowedSkills(kislevRoster.members[2], kislevRoster, rulesDb);
const kislevYouthSkills = getAllowedSkills(kislevRoster.members[3], kislevRoster, rulesDb);
assert.equal(kislevCaptainSkills.find((option) => option.item.id === "battle-tongue")?.allowed, true);
assert.equal(kislevTamerSkills.find((option) => option.item.id === "mighty-blow")?.allowed, true);
assert.equal(kislevTamerSkills.find((option) => option.item.id === "quick-shot")?.allowed, false);
assert.equal(kislevEsaulSkills.find((option) => option.item.id === "quick-shot")?.allowed, true);
assert.equal(kislevYouthSkills.find((option) => option.item.id === "quick-shot")?.allowed, false);
const kislevFreelancerRoster = validKislevites();
const kislevFreelancerType = rulesDb.fighterTypes.find((fighterType) => fighterType.id === "hired-sword-freelancer");
assert.ok(kislevFreelancerType);
kislevFreelancerRoster.members.push(createRosterMemberFromType(kislevFreelancerType, kislevFreelancerRoster.id, "hired_sword", "Sir Aleksei"));
assert.deepEqual(errorCodes(kislevFreelancerRoster), []);
assert.equal(calculateRosterCost(kislevFreelancerRoster, rulesDb), 469);
assert.equal(calculateWarbandRating(kislevFreelancerRoster, rulesDb), 107);
assert.equal(rulesDb.warbandTypes.find((warband) => warband.id === "kislevites")?.sourceDocumentId, "mhr-kislevites");
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "inheritance")?.sourceDocumentId, "mhr-kislevites");
assert.match(rulesDb.specialRules.find((rule) => rule.id === "gun-rest")?.effectSummary ?? "", /\+1 to hit/);
assert.match(rulesDb.specialRules.find((rule) => rule.id === "bear-hug")?.effectSummary ?? "", /automatic wound/);
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "vodka")?.sourceDocumentId, "mhr-kislevites");
assert.ok(rulesDb.equipmentItems.find((item) => item.id === "bear-claw-necklace")?.specialRuleIds.includes("bear-claw-necklace-frenzy"));

assert.ok(allowedOfficialWarbands.includes("ostlanders"));
assert.deepEqual(errorCodes(validOstlanders()), []);
assert.equal(calculateRosterCost(validOstlanders(), rulesDb), 343);
assert.equal(calculateWarbandRating(validOstlanders(), rulesDb), 101);
assert.ok(codes(ostlandersNoElder()).includes("REQUIRED_LEADER"));
assert.ok(codes(ostlandersTwoElders()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManyOstlanders()).includes("MAX_WARRIORS"));
assert.ok(codes(tooManyBloodBrothers()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyPriestsOfTaal()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyRuffians()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyJaegers()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyOstlanderOgres()).includes("FIGHTER_MAX_COUNT"));
assert.deepEqual(errorCodes(validOstlandersWithOgre()), []);
assert.equal(calculateRosterCost(validOstlandersWithOgre(), rulesDb), 478);
assert.equal(calculateWarbandRating(validOstlandersWithOgre(), rulesDb), 116);
assert.ok(codes(ogreWithBow()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(priestOfTaalWithHeavyArmour()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(ruffianWithBow()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(kinWithHuntingRifle()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(jaegerWithHeavyArmour()).includes("INVALID_EQUIPMENT"));
assert.deepEqual(errorCodes(jaegerWithDoubleBarrelledHuntingRifle()), []);
assert.ok(codes(invalidOstlanderSkill()).includes("INVALID_SKILL"));
assert.deepEqual(errorCodes(ostlanderElderWithBloodOath()), []);
assert.ok(codes(bloodBrotherWithBloodOath()).includes("INVALID_SKILL"));
assert.deepEqual(errorCodes(priestOfTaalWithPrayer()), []);
assert.ok(codes(elderWithTaalPrayer()).includes("INVALID_SPECIAL_RULE"));
assert.deepEqual(errorCodes(ostlandersWithOgreBodyguard()), []);
assert.equal(calculateRosterCost(ostlandersWithOgreBodyguard(), rulesDb), 423);
assert.equal(calculateWarbandRating(ostlandersWithOgreBodyguard(), rulesDb), 126);
assert.ok(codes(ostlandersWithWarlock()).includes("HIRED_SWORD_NOT_AVAILABLE"));

const ostlanderRoster = validOstlanders();
const ostlanderElderOptions = getAllowedEquipment(ostlanderRoster.members[0], ostlanderRoster, rulesDb);
const ostlanderPriestOptions = getAllowedEquipment(ostlanderRoster.members[3], ostlanderRoster, rulesDb);
const ostlanderRuffianOptions = getAllowedEquipment(ostlanderRoster.members[5], ostlanderRoster, rulesDb);
const ostlanderJaegerOptions = getAllowedEquipment(ostlanderRoster.members[6], ostlanderRoster, rulesDb);
const ostlanderOgreRoster = validOstlandersWithOgre();
const ostlanderOgreOptions = getAllowedEquipment(ostlanderOgreRoster.members[7], ostlanderOgreRoster, rulesDb);
assert.equal(ostlanderElderOptions.find((option) => option.item.id === "pistol")?.allowed, true);
assert.equal(ostlanderElderOptions.find((option) => option.item.id === "hunting-rifle")?.allowed, false);
assert.equal(ostlanderPriestOptions.find((option) => option.item.id === "heavy-armour")?.allowed, false);
assert.equal(ostlanderRuffianOptions.find((option) => option.item.id === "bow")?.allowed, false);
assert.equal(ostlanderJaegerOptions.find((option) => option.item.id === "double-barrelled-pistol")?.allowed, true);
assert.equal(ostlanderJaegerOptions.find((option) => option.item.id === "double-barrelled-hunting-rifle")?.allowed, true);
assert.equal(ostlanderOgreOptions.find((option) => option.item.id === "club")?.allowed, true);
assert.equal(ostlanderOgreOptions.find((option) => option.item.id === "bow")?.allowed, false);

const ostlanderElderSkills = getAllowedSkills(ostlanderRoster.members[0], ostlanderRoster, rulesDb);
const ostlanderBrotherSkills = getAllowedSkills(ostlanderRoster.members[1], ostlanderRoster, rulesDb);
const ostlanderPriestSkills = getAllowedSkills(ostlanderRoster.members[3], ostlanderRoster, rulesDb);
const ostlanderPriestPrayers = getAllowedSpecialRules(ostlanderRoster.members[3], ostlanderRoster, rulesDb);
assert.equal(ostlanderElderSkills.find((option) => option.item.id === "blood-oath")?.allowed, true);
assert.equal(ostlanderBrotherSkills.find((option) => option.item.id === "quick-shot")?.allowed, false);
assert.equal(ostlanderBrotherSkills.find((option) => option.item.id === "bull-rush")?.allowed, true);
assert.equal(ostlanderPriestSkills.find((option) => option.item.id === "taunt")?.allowed, true);
assert.equal(ostlanderPriestPrayers.find((option) => option.item.id === "taal-stags-leap")?.allowed, true);
assert.equal(ostlanderPriestPrayers.find((option) => option.item.id === "taal-summon-squirrels")?.allowed, true);
assert.equal(rulesDb.warbandTypes.find((warband) => warband.id === "ostlanders")?.sourceDocumentId, "mhr-ostlanders");
assert.match(rulesDb.specialRules.find((rule) => rule.id === "double-barrelled-gun")?.effectSummary ?? "", /two hits/);
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "taal-stags-leap")?.validation.selectableAs, "prayer");
assert.equal(rulesDb.skills.find((skill) => skill.id === "bull-rush")?.sourceDocumentId, "mhr-ostlanders");
assert.ok(rulesDb.equipmentItems.find((item) => item.id === "double-barrelled-hunting-rifle")?.specialRuleIds.includes("double-barrelled-gun"));

assert.ok(allowedOfficialWarbands.includes("sisters-of-sigmar"));
assert.deepEqual(errorCodes(validSistersOfSigmar()), []);
assert.equal(calculateRosterCost(validSistersOfSigmar(), rulesDb), 249);
assert.equal(calculateWarbandRating(validSistersOfSigmar(), rulesDb), 63);
assert.ok(codes(sistersNoMatriarch()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManySisterSuperiors()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyAugurs()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyNovices()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManySistersWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(augurWithArmour()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(noviceWithHolyTome()).includes("INVALID_EQUIPMENT"));
assert.deepEqual(errorCodes(matriarchWithSpecialSkill()), []);
assert.ok(codes(sisterSuperiorWithMatriarchOnlySkill()).includes("INVALID_SKILL"));

const sistersRoster = validSistersOfSigmar();
const matriarchOptions = getAllowedEquipment(sistersRoster.members[0], sistersRoster, rulesDb);
const augurOptions = getAllowedEquipment(sistersRoster.members[2], sistersRoster, rulesDb);
const noviceOptions = getAllowedEquipment(sistersRoster.members[3], sistersRoster, rulesDb);
assert.equal(matriarchOptions.find((option) => option.item.id === "riding-horse")?.allowed, true);
assert.equal(augurOptions.find((option) => option.item.id === "light-armour")?.allowed, false);
assert.equal(augurOptions.find((option) => option.item.id === "holy-tome")?.allowed, true);
assert.equal(noviceOptions.find((option) => option.item.id === "holy-tome")?.allowed, false);
assert.equal(noviceOptions.find((option) => option.item.id === "warhorse")?.allowed, false);

const matriarchSkills = getAllowedSkills(sistersRoster.members[0], sistersRoster, rulesDb);
const superiorSkills = getAllowedSkills(sistersRoster.members[1], sistersRoster, rulesDb);
const augurSkills = getAllowedSkills(sistersRoster.members[2], sistersRoster, rulesDb);
assert.equal(matriarchSkills.find((option) => option.item.id === "utter-determination")?.allowed, true);
assert.equal(superiorSkills.find((option) => option.item.id === "utter-determination")?.allowed, false);
assert.equal(augurSkills.find((option) => option.item.id === "absolute-faith")?.allowed, true);
assert.equal(augurSkills.find((option) => option.item.id === "mighty-blow")?.allowed, false);
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "sigmarite-warhammer")?.sourceDocumentId, "mhr-sisters-of-sigmar");
assert.ok(rulesDb.equipmentItems.find((item) => item.id === "sigmarite-warhammer")?.specialRuleIds.includes("sigmarite-warhammer-holy"));
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "blessed-sight")?.sourceDocumentId, "mhr-sisters-of-sigmar");
assert.equal(rulesDb.skills.find((skill) => skill.id === "sign-of-sigmar")?.sourceDocumentId, "mhr-sisters-of-sigmar");
const matriarchPrayers = getAllowedSpecialRules(sistersRoster.members[0], sistersRoster, rulesDb);
const superiorPrayers = getAllowedSpecialRules(sistersRoster.members[1], sistersRoster, rulesDb);
assert.equal(matriarchPrayers.find((option) => option.item.id === "sigmar-soulfire")?.allowed, true);
assert.equal(superiorPrayers.find((option) => option.item.id === "sigmar-soulfire")?.allowed, false);
const sistersPrayerRoster = validSistersOfSigmar();
sistersPrayerRoster.members[0] = { ...sistersPrayerRoster.members[0], specialRules: ["sigmar-soulfire"] };
assert.deepEqual(errorCodes(sistersPrayerRoster), []);

assert.ok(allowedOfficialWarbands.includes("carnival-of-chaos"));
assert.deepEqual(errorCodes(validCarnivalOfChaos()), []);
assert.equal(calculateRosterCost(validCarnivalOfChaos(), rulesDb), 321);
assert.equal(calculateWarbandRating(validCarnivalOfChaos(), rulesDb), 68);
assert.ok(codes(carnivalNoMaster()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManyCarnivalBrutes()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyTaintedOnes()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyPlagueBearers()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyPlagueCarts()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(taintedWithoutBlessing()).includes("REQUIRED_EQUIPMENT_OPTION"));
assert.deepEqual(errorCodes(taintedWithTwoBlessings()), []);
assert.equal(calculateRosterCost(taintedWithTwoBlessings(), rulesDb), 396);
assert.deepEqual(errorCodes(carnivalWithCartAtSeventeenWarriors()), []);
assert.ok(codes(carnivalWithoutCartAtSeventeenWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(bruteWithPistol()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(invalidCarnivalSkill()).includes("INVALID_SKILL"));

const carnivalRoster = validCarnivalOfChaos();
const bruteOptions = getAllowedEquipment(carnivalRoster.members[1], carnivalRoster, rulesDb);
const taintedOptions = getAllowedEquipment(carnivalRoster.members[2], carnivalRoster, rulesDb);
assert.equal(bruteOptions.find((option) => option.item.id === "pistol")?.allowed, false);
assert.equal(bruteOptions.find((option) => option.item.id === "carnival-flail")?.allowed, true);
assert.equal(taintedOptions.find((option) => option.item.id === "blessing-nurgles-rot")?.allowed, true);

const masterSkills = getAllowedSkills(carnivalRoster.members[0], carnivalRoster, rulesDb);
const bruteSkills = getAllowedSkills(carnivalRoster.members[1], carnivalRoster, rulesDb);
const taintedSkills = getAllowedSkills(carnivalRoster.members[2], carnivalRoster, rulesDb);
assert.equal(masterSkills.find((option) => option.item.id === "sorcery")?.allowed, true);
assert.equal(bruteSkills.find((option) => option.item.id === "mighty-blow")?.allowed, true);
assert.equal(bruteSkills.find((option) => option.item.id === "quick-shot")?.allowed, false);
assert.equal(taintedSkills.find((option) => option.item.id === "step-aside")?.allowed, true);
assert.equal(taintedSkills.find((option) => option.item.id === "wyrdstone-hunter")?.allowed, false);
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "blessing-nurgles-rot")?.sourceDocumentId, "eif-empire-in-flames");
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "nurgle-rituals")?.sourceDocumentId, "eif-empire-in-flames");
assert.equal(rulesDb.skills.find((skill) => skill.id === "strongman")?.sourceDocumentId, "mordheim-core-rules");
const masterRituals = getAllowedSpecialRules(carnivalRoster.members[0], carnivalRoster, rulesDb);
const bruteRituals = getAllowedSpecialRules(carnivalRoster.members[1], carnivalRoster, rulesDb);
assert.equal(masterRituals.find((option) => option.item.id === "nurgle-buboes")?.allowed, true);
assert.equal(bruteRituals.find((option) => option.item.id === "nurgle-buboes")?.allowed, false);

assert.ok(allowedOfficialWarbands.includes("cult-of-the-possessed"));
assert.deepEqual(errorCodes(validCultOfThePossessed()), []);
assert.equal(calculateRosterCost(validCultOfThePossessed(), rulesDb), 404);
assert.equal(calculateWarbandRating(validCultOfThePossessed(), rulesDb), 63);
assert.ok(codes(cultNoMagister()).includes("REQUIRED_LEADER"));
assert.ok(codes(cultTwoMagisters()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManyCultWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(tooManyPossessed()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyMutants()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyDarksouls()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyCultBeastmen()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(mutantWithoutMutation()).includes("REQUIRED_EQUIPMENT_OPTION"));
assert.deepEqual(errorCodes(mutantWithTwoMutations()), []);
assert.equal(calculateRosterCost(mutantWithTwoMutations(), rulesDb), 449);
assert.deepEqual(errorCodes(mutantWithExtraArmExtraWeapon()), []);
assert.ok(codes(mutantWithExtraWeaponWithoutExtraArm()).includes("TOO_MANY_CLOSE_COMBAT_WEAPONS"));
assert.ok(codes(mutantWithExtraArmAndTwoHandedExtraWeapon()).includes("TOO_MANY_CLOSE_COMBAT_WEAPONS"));
assert.deepEqual(errorCodes(possessedWithMutation()), []);
assert.ok(codes(possessedWithWeapon()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(darksoulWithBow()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(invalidCultSkill()).includes("INVALID_SKILL"));
assert.deepEqual(errorCodes(magisterWithChaosRitual()), []);
assert.ok(codes(possessedWithChaosRitual()).includes("INVALID_SPECIAL_RULE"));

const cultRoster = validCultOfThePossessed();
const magisterOptions = getAllowedEquipment(cultRoster.members[0], cultRoster, rulesDb);
const possessedOptions = getAllowedEquipment(cultRoster.members[1], cultRoster, rulesDb);
const darksoulOptions = getAllowedEquipment(cultRoster.members[5], cultRoster, rulesDb);
assert.equal(magisterOptions.find((option) => option.item.id === "cult-bow")?.allowed, true);
assert.equal(possessedOptions.find((option) => option.item.id === "mutation-great-claw")?.allowed, true);
assert.equal(possessedOptions.find((option) => option.item.id === "dagger")?.allowed, false);
assert.equal(darksoulOptions.find((option) => option.item.id === "flail")?.allowed, true);
assert.equal(darksoulOptions.find((option) => option.item.id === "cult-bow")?.allowed, false);
const extraArmRoster = mutantWithExtraArmExtraWeapon();
const extraArmOptions = getAllowedEquipment({ ...extraArmRoster.members[2], equipment: ["dagger", "axe", "sword", "mutation-extra-arm"] }, extraArmRoster, rulesDb);
assert.equal(extraArmOptions.find((option) => option.item.id === "mace")?.allowed, true);
assert.equal(extraArmOptions.find((option) => option.item.id === "double-handed-weapon")?.allowed, false);
const magisterSkills = getAllowedSkills(cultRoster.members[0], cultRoster, rulesDb);
const possessedSkills = getAllowedSkills(cultRoster.members[1], cultRoster, rulesDb);
const mutantSkills = getAllowedSkills(cultRoster.members[2], cultRoster, rulesDb);
const magisterRituals = getAllowedSpecialRules(cultRoster.members[0], cultRoster, rulesDb);
const possessedRituals = getAllowedSpecialRules(cultRoster.members[1], cultRoster, rulesDb);
assert.equal(magisterSkills.find((option) => option.item.id === "sorcery")?.allowed, true);
assert.equal(possessedSkills.find((option) => option.item.id === "mighty-blow")?.allowed, true);
assert.equal(mutantSkills.find((option) => option.item.id === "step-aside")?.allowed, true);
assert.equal(mutantSkills.find((option) => option.item.id === "wyrdstone-hunter")?.allowed, false);
assert.equal(magisterRituals.find((option) => option.item.id === "chaos-eye-of-god")?.allowed, true);
assert.equal(possessedRituals.find((option) => option.item.id === "chaos-eye-of-god")?.allowed, false);
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "mutation-daemon-soul")?.sourceDocumentId, "mhr-cult-of-the-possessed");
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "crazed")?.sourceDocumentId, "mhr-cult-of-the-possessed");

assert.ok(allowedOfficialWarbands.includes("skaven"));
assert.deepEqual(errorCodes(validSkaven()), []);
assert.equal(calculateRosterCost(validSkaven(), rulesDb), 299);
assert.equal(calculateWarbandRating(validSkaven(), rulesDb), 76);
assert.ok(codes(skavenNoAssassin()).includes("REQUIRED_LEADER"));
assert.ok(codes(skavenTwoAssassins()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManySkavenWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(tooManyBlackSkaven()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyEshinSorcerers()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyNightRunners()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyRatOgres()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(giantRatWithWeapon()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(fightingClawsWithSword()).includes("CANNOT_COMBINE_WEAPONS"));
assert.ok(codes(skavenTooManyWeaponsWithoutTailFighting()).includes("TOO_MANY_CLOSE_COMBAT_WEAPONS"));
assert.deepEqual(errorCodes(skavenTailFightingExtraWeapon()), []);
assert.deepEqual(errorCodes(skavenWithRatOgre()), []);
assert.equal(calculateWarbandRating(skavenWithRatOgre(), rulesDb), 55);
assert.ok(codes(invalidSkavenSkill()).includes("INVALID_SKILL"));

const skavenRoster = validSkaven();
const assassinOptions = getAllowedEquipment({ ...skavenRoster.members[0], equipment: [] }, skavenRoster, rulesDb);
const nightRunnerOptions = getAllowedEquipment(skavenRoster.members[3], skavenRoster, rulesDb);
const giantRatOptions = getAllowedEquipment(skavenRoster.members[5], skavenRoster, rulesDb);
assert.equal(assassinOptions.find((option) => option.item.id === "fighting-claws")?.allowed, true);
assert.equal(assassinOptions.find((option) => option.item.id === "club")?.allowed, false);
assert.equal(nightRunnerOptions.find((option) => option.item.id === "club")?.allowed, true);
assert.equal(nightRunnerOptions.find((option) => option.item.id === "weeping-blades")?.allowed, false);
assert.equal(giantRatOptions.find((option) => option.item.id === "club")?.allowed, false);

const adeptSkills = getAllowedSkills(skavenRoster.members[0], skavenRoster, rulesDb);
const sorcererSkills = getAllowedSkills(skavenRoster.members[1], skavenRoster, rulesDb);
const blackSkavenSkills = getAllowedSkills(skavenRoster.members[2], skavenRoster, rulesDb);
const nightRunnerSkills = getAllowedSkills(skavenRoster.members[3], skavenRoster, rulesDb);
assert.equal(adeptSkills.find((option) => option.item.id === "battle-tongue")?.allowed, true);
assert.equal(sorcererSkills.find((option) => option.item.id === "sorcery")?.allowed, true);
assert.equal(sorcererSkills.find((option) => option.item.id === "mighty-blow")?.allowed, false);
assert.equal(blackSkavenSkills.find((option) => option.item.id === "black-hunger")?.allowed, true);
assert.equal(blackSkavenSkills.find((option) => option.item.id === "wyrdstone-hunter")?.allowed, false);
assert.equal(nightRunnerSkills.find((option) => option.item.id === "infiltration")?.allowed, true);
assert.equal(nightRunnerSkills.find((option) => option.item.id === "step-aside")?.allowed, false);
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "blowpipe")?.sourceDocumentId, "mhr-skaven");
assert.ok(rulesDb.equipmentItems.find((item) => item.id === "blowpipe")?.specialRuleIds.includes("blowpipe-stealthy"));
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "magic-of-the-horned-rat")?.sourceDocumentId, "mhr-skaven");
assert.ok(rulesDb.specialRules.find((rule) => rule.id === "magic-of-the-horned-rat")?.relatedRuleIds.includes("horned-rat-warpfire"));
assert.match(rulesDb.specialRules.find((rule) => rule.id === "horned-rat-warpfire")?.effectSummary ?? "", /Difficulty 8/);
assert.equal(rulesDb.skills.find((skill) => skill.id === "black-hunger")?.sourceDocumentId, "mhr-skaven");
const sorcererSpells = getAllowedSpecialRules(skavenRoster.members[1], skavenRoster, rulesDb);
const adeptSpells = getAllowedSpecialRules(skavenRoster.members[0], skavenRoster, rulesDb);
assert.equal(sorcererSpells.find((option) => option.item.id === "horned-rat-warpfire")?.allowed, true);
assert.equal(adeptSpells.find((option) => option.item.id === "horned-rat-warpfire")?.allowed, false);

assert.ok(getAllowedWarbands(rulesDb, { broheimGrade: "1b" }).some((warband) => warband.id === "skaven-of-clan-pestilens"));
assert.deepEqual(errorCodes(validSkavenPestilens()), []);
assert.equal(calculateRosterCost(validSkavenPestilens(), rulesDb), 353);
assert.equal(calculateWarbandRating(validSkavenPestilens(), rulesDb), 86);
assert.ok(codes(pestilensNoPriest()).includes("REQUIRED_LEADER"));
assert.ok(codes(pestilensTwoPriests()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManyPestilensWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(tooManyPestilensSorcerers()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyPlagueMonks()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyMonkInitiates()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyPestilensRatOgres()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(plagueNoviceWithCenser()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(pestilensRatWithWeapon()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(invalidPestilensSkill()).includes("INVALID_SKILL"));
assert.ok(codes(pestilensCenserBearerWithoutBlackHunger()).includes("INVALID_SKILL"));
assert.deepEqual(errorCodes(pestilensCenserBearerWithBlackHunger()), []);
assert.deepEqual(errorCodes(pestilensWithRatOgre()), []);
assert.equal(calculateWarbandRating(pestilensWithRatOgre(), rulesDb), 55);
assert.deepEqual(errorCodes(pestilensSorcererWithSpell()), []);
assert.ok(codes(plaguePriestWithHornedRatSpell()).includes("INVALID_SPECIAL_RULE"));

const pestilensRoster = validSkavenPestilens();
const pestilensPriestOptions = getAllowedEquipment({ ...pestilensRoster.members[0], equipment: [] }, pestilensRoster, rulesDb);
const pestilensNoviceOptions = getAllowedEquipment(pestilensRoster.members[4], pestilensRoster, rulesDb);
const pestilensRatOptions = getAllowedEquipment(pestilensRoster.members[5], pestilensRoster, rulesDb);
assert.equal(pestilensPriestOptions.find((option) => option.item.id === "censer")?.allowed, true);
assert.equal(pestilensPriestOptions.find((option) => option.item.id === "disease-dagger")?.allowed, true);
assert.equal(pestilensPriestOptions.find((option) => option.item.id === "weeping-blades")?.allowed, false);
assert.equal(pestilensNoviceOptions.find((option) => option.item.id === "sling")?.allowed, true);
assert.equal(pestilensNoviceOptions.find((option) => option.item.id === "censer")?.allowed, false);
assert.equal(pestilensRatOptions.find((option) => option.item.id === "club")?.allowed, false);

const pestilensMonkSkills = getAllowedSkills(pestilensRoster.members[2], pestilensRoster, rulesDb);
const pestilensMonkWithBlackHungerSkills = getAllowedSkills(
  { ...pestilensRoster.members[2], skills: ["pestilens-black-hunger"] },
  pestilensRoster,
  rulesDb
);
const pestilensSorcererSkills = getAllowedSkills(pestilensRoster.members[1], pestilensRoster, rulesDb);
assert.equal(pestilensMonkSkills.find((option) => option.item.id === "pestilens-black-hunger")?.allowed, true);
assert.equal(pestilensMonkSkills.find((option) => option.item.id === "censer-bearer")?.allowed, false);
assert.equal(pestilensMonkWithBlackHungerSkills.find((option) => option.item.id === "censer-bearer")?.allowed, true);
assert.equal(pestilensSorcererSkills.find((option) => option.item.id === "sorcery")?.allowed, true);
assert.equal(pestilensSorcererSkills.find((option) => option.item.id === "mighty-blow")?.allowed, false);
assert.equal(rulesDb.skills.find((skill) => skill.id === "censer-bearer")?.validation.requiredSkillIds.includes("pestilens-black-hunger"), true);
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "censer")?.sourceDocumentId, "tc29-skaven-pestilens");
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "disease-dagger")?.sourceDocumentId, "tc29-skaven-pestilens");
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "disease-dagger-infecting")?.sourceDocumentId, "tc29-skaven-pestilens");
const pestilensSorcererSpells = getAllowedSpecialRules(pestilensRoster.members[1], pestilensRoster, rulesDb);
const pestilensPriestSpells = getAllowedSpecialRules(pestilensRoster.members[0], pestilensRoster, rulesDb);
assert.equal(pestilensSorcererSpells.find((option) => option.item.id === "horned-rat-warpfire")?.allowed, true);
assert.equal(pestilensPriestSpells.find((option) => option.item.id === "horned-rat-warpfire")?.allowed, false);

assert.ok(allowedOfficialWarbands.includes("undead"));
assert.deepEqual(errorCodes(validUndead()), []);
assert.equal(calculateRosterCost(validUndead(), rulesDb), 310);
assert.equal(calculateWarbandRating(validUndead(), rulesDb), 68);
assert.ok(codes(undeadNoVampire()).includes("REQUIRED_LEADER"));
assert.ok(codes(undeadTwoVampires()).includes("REQUIRED_LEADER"));
assert.ok(codes(undeadTooManyWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(undeadTooManyDregs()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(undeadTooManyDireWolves()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(zombieWithWeapon()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(ghoulWithArmour()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(direWolfWithWeapon()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(invalidUndeadSkill()).includes("INVALID_SKILL"));

const undeadRoster = validUndead();
const vampireOptions = getAllowedEquipment(undeadRoster.members[0], undeadRoster, rulesDb);
const necromancerOptions = getAllowedEquipment(undeadRoster.members[1], undeadRoster, rulesDb);
const dregOptions = getAllowedEquipment(undeadRoster.members[2], undeadRoster, rulesDb);
const zombieOptions = getAllowedEquipment(undeadRoster.members[3], undeadRoster, rulesDb);
assert.equal(vampireOptions.find((option) => option.item.id === "halberd")?.allowed, true);
assert.equal(vampireOptions.find((option) => option.item.id === "pistol")?.allowed, false);
assert.equal(vampireOptions.find((option) => option.item.id === "nightmare")?.allowed, true);
assert.equal(necromancerOptions.find((option) => option.item.id === "nightmare")?.allowed, true);
assert.equal(dregOptions.find((option) => option.item.id === "nightmare")?.allowed, false);
assert.equal(zombieOptions.find((option) => option.item.id === "dagger")?.allowed, false);
const mountedUndead = validUndead();
mountedUndead.members[0] = { ...mountedUndead.members[0], equipment: [...mountedUndead.members[0].equipment, "nightmare"] };
assert.deepEqual(errorCodes(mountedUndead), []);
assert.equal(calculateRosterCost(mountedUndead, rulesDb), 405);

const vampireSkills = getAllowedSkills(undeadRoster.members[0], undeadRoster, rulesDb);
const necromancerSkills = getAllowedSkills(undeadRoster.members[1], undeadRoster, rulesDb);
const dregSkills = getAllowedSkills(undeadRoster.members[2], undeadRoster, rulesDb);
assert.equal(vampireSkills.find((option) => option.item.id === "mighty-blow")?.allowed, true);
assert.equal(vampireSkills.find((option) => option.item.id === "quick-shot")?.allowed, false);
assert.equal(necromancerSkills.find((option) => option.item.id === "sorcery")?.allowed, true);
assert.equal(necromancerSkills.find((option) => option.item.id === "mighty-blow")?.allowed, false);
assert.equal(dregSkills.find((option) => option.item.id === "mighty-blow")?.allowed, true);
assert.equal(dregSkills.find((option) => option.item.id === "step-aside")?.allowed, false);
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "necromancy")?.sourceDocumentId, "mordheim-core-rules");
assert.ok(rulesDb.specialRules.find((rule) => rule.id === "necromancy")?.relatedRuleIds.includes("necromancy-lifestealer"));
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "no-pain")?.sourceDocumentId, "mhr-undead");
const necromancySpells = getAllowedSpecialRules(undeadRoster.members[1], undeadRoster, rulesDb);
const vampireSpells = getAllowedSpecialRules(undeadRoster.members[0], undeadRoster, rulesDb);
assert.equal(necromancySpells.find((option) => option.item.id === "necromancy-lifestealer")?.allowed, true);
assert.equal(vampireSpells.find((option) => option.item.id === "necromancy-lifestealer")?.allowed, false);

assert.ok(allowedOfficialWarbands.includes("orc-mob"));
assert.deepEqual(errorCodes(validOrcMob()), []);
assert.equal(calculateRosterCost(validOrcMob(), rulesDb), 290);
assert.equal(calculateWarbandRating(validOrcMob(), rulesDb), 85);
assert.ok(codes(orcNoBoss()).includes("REQUIRED_LEADER"));
assert.ok(codes(orcTwoBosses()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManyOrcShamans()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyOrcBigUns()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyGoblinWarriorsForOrcs()).includes("FIGHTER_RATIO_LIMIT"));
assert.ok(codes(tooManyCaveSquigsForGoblins()).includes("FIGHTER_RATIO_LIMIT"));
assert.ok(codes(tooManyCaveSquigsMaximum()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyTrolls()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(shamanWithArmour()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(caveSquigWithWeapon()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(ballAndChainWithoutMushrooms()).includes("MISSING_REQUIRED_EQUIPMENT"));
assert.ok(codes(ballAndChainWithShield()).includes("CANNOT_COMBINE_EQUIPMENT"));
assert.deepEqual(errorCodes(goblinWithBallAndChain()), []);
assert.ok(codes(invalidOrcSkill()).includes("INVALID_SKILL"));

const orcRoster = validOrcMob();
const bossOptions = getAllowedEquipment(orcRoster.members[0], orcRoster, rulesDb);
const shamanOptions = getAllowedEquipment(orcRoster.members[1], orcRoster, rulesDb);
const goblinOptions = getAllowedEquipment(orcRoster.members[4], orcRoster, rulesDb);
const goblinWithMushroomsOptions = getAllowedEquipment({ ...orcRoster.members[4], equipment: ["mad-cap-mushrooms"] }, orcRoster, rulesDb);
const squigOptions = getAllowedEquipment(orcRoster.members[5], orcRoster, rulesDb);
assert.equal(bossOptions.find((option) => option.item.id === "crossbow")?.allowed, true);
assert.equal(bossOptions.find((option) => option.item.id === "war-boar")?.allowed, true);
assert.equal(shamanOptions.find((option) => option.item.id === "light-armour")?.allowed, false);
assert.equal(goblinOptions.find((option) => option.item.id === "mad-cap-mushrooms")?.allowed, true);
assert.equal(goblinOptions.find((option) => option.item.id === "war-boar")?.allowed, false);
assert.equal(goblinOptions.find((option) => option.item.id === "ball-and-chain")?.allowed, false);
assert.equal(goblinWithMushroomsOptions.find((option) => option.item.id === "ball-and-chain")?.allowed, true);
assert.equal(squigOptions.find((option) => option.item.id === "dagger")?.allowed, false);

const bossSkills = getAllowedSkills(orcRoster.members[0], orcRoster, rulesDb);
const shamanSkills = getAllowedSkills(orcRoster.members[1], orcRoster, rulesDb);
const bigUnSkills = getAllowedSkills(orcRoster.members[2], orcRoster, rulesDb);
assert.equal(bossSkills.find((option) => option.item.id === "da-cunnin-plan")?.allowed, true);
assert.equal(shamanSkills.find((option) => option.item.id === "sorcery")?.allowed, false);
assert.equal(shamanSkills.find((option) => option.item.id === "waaagh-charge")?.allowed, true);
assert.equal(bigUnSkills.find((option) => option.item.id === "da-cunnin-plan")?.allowed, false);
assert.equal(bigUnSkills.find((option) => option.item.id === "eadbasher")?.allowed, true);
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "waaagh-magic")?.sourceDocumentId, "mhr-orc-mob");
assert.ok(rulesDb.specialRules.find((rule) => rule.id === "waaagh-magic")?.relatedRuleIds.includes("waaagh-zzap"));
assert.equal(rulesDb.skills.find((skill) => skill.id === "eadbasher")?.sourceDocumentId, "mhr-orc-mob");
const shamanSpells = getAllowedSpecialRules(orcRoster.members[1], orcRoster, rulesDb);
const bossSpells = getAllowedSpecialRules(orcRoster.members[0], orcRoster, rulesDb);
assert.equal(shamanSpells.find((option) => option.item.id === "waaagh-zzap")?.allowed, true);
assert.equal(bossSpells.find((option) => option.item.id === "waaagh-zzap")?.allowed, false);

assert.ok(getAllowedWarbands(rulesDb, { broheimGrade: "1b" }).some((warband) => warband.id === "shadow-warriors"));
assert.deepEqual(errorCodes(validShadowWarriors()), []);
assert.equal(calculateRosterCost(validShadowWarriors(), rulesDb), 335);
assert.equal(calculateWarbandRating(validShadowWarriors(), rulesDb), 79);
assert.ok(codes(shadowWarriorsNoMaster()).includes("REQUIRED_LEADER"));
assert.ok(codes(shadowWarriorsTwoMasters()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManyShadowWalkers()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyShadowWeavers()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyShadowWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(shadowNoviceWithRunestones()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(shadowWarriorWithIthilmarWeapon()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(invalidShadowSkill()).includes("INVALID_SKILL"));
assert.deepEqual(errorCodes(shadowWalkerWithPowerfulBuild()), []);
assert.ok(codes(tooManyPowerfulBuilds()).includes("INVALID_SKILL"));
assert.deepEqual(errorCodes(shadowWeaverWithSpell()), []);
assert.ok(codes(shadowWeaverWithArmourAndSpell()).includes("INVALID_SPECIAL_RULE"));

const shadowRoster = validShadowWarriors();
const shadowMasterOptions = getAllowedEquipment(shadowRoster.members[0], shadowRoster, rulesDb);
const shadowWeaverOptions = getAllowedEquipment(shadowRoster.members[1], shadowRoster, rulesDb);
const shadowWarriorOptions = getAllowedEquipment(shadowRoster.members[3], shadowRoster, rulesDb);
assert.equal(shadowMasterOptions.find((option) => option.item.id === "standard-of-nagarythe")?.allowed, true);
assert.equal(shadowMasterOptions.find((option) => option.item.id === "elven-steed")?.allowed, true);
assert.equal(shadowWeaverOptions.find((option) => option.item.id === "elven-runestones")?.allowed, true);
assert.equal(shadowWarriorOptions.find((option) => option.item.id === "elf-bow")?.allowed, true);
assert.equal(shadowWarriorOptions.find((option) => option.item.id === "elven-runestones")?.allowed, false);
assert.equal(shadowWarriorOptions.find((option) => option.item.id === "elven-steed")?.allowed, false);

const shadowMasterSkills = getAllowedSkills(shadowRoster.members[0], shadowRoster, rulesDb);
const shadowWeaverSkills = getAllowedSkills(shadowRoster.members[1], shadowRoster, rulesDb);
const powerfulBuildRoster = shadowWalkerWithPowerfulBuild();
const powerfulWalkerSkills = getAllowedSkills(powerfulBuildRoster.members[2], powerfulBuildRoster, rulesDb);
assert.equal(shadowMasterSkills.find((option) => option.item.id === "powerful-build")?.allowed, true);
assert.equal(shadowWeaverSkills.find((option) => option.item.id === "powerful-build")?.allowed, false);
assert.equal(shadowWeaverSkills.find((option) => option.item.id === "master-of-runes")?.allowed, true);
assert.equal(powerfulWalkerSkills.find((option) => option.item.id === "mighty-blow")?.allowed, true);
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "shadow-magic")?.sourceDocumentId, "mhr-shadow-warriors");
assert.ok(rulesDb.specialRules.find((rule) => rule.id === "shadow-magic")?.relatedRuleIds.includes("shadow-shadowbind"));
assert.equal(rulesDb.skills.find((skill) => skill.id === "powerful-build")?.sourceDocumentId, "mhr-shadow-warriors");
const shadowWeaverSpells = getAllowedSpecialRules(shadowRoster.members[1], shadowRoster, rulesDb);
const armouredWeaverSpells = getAllowedSpecialRules({ ...shadowRoster.members[1], equipment: ["dagger", "light-armour"] }, shadowRoster, rulesDb);
const shadowMasterSpells = getAllowedSpecialRules(shadowRoster.members[0], shadowRoster, rulesDb);
assert.equal(shadowWeaverSpells.find((option) => option.item.id === "shadow-pool-of-shadow")?.allowed, true);
assert.equal(armouredWeaverSpells.find((option) => option.item.id === "shadow-pool-of-shadow")?.allowed, false);
assert.equal(shadowMasterSpells.find((option) => option.item.id === "shadow-pool-of-shadow")?.allowed, false);
assert.ok(rulesDb.hiredSwords.find((hiredSword) => hiredSword.id === "elf-ranger")?.allowedWarbandTypeIds.includes("shadow-warriors"));

const freelancer = rulesDb.hiredSwords.find((hiredSword) => hiredSword.id === "freelancer");
const pitFighter = rulesDb.hiredSwords.find((hiredSword) => hiredSword.id === "pit-fighter");
const warlockHiredSword = rulesDb.hiredSwords.find((hiredSword) => hiredSword.id === "warlock");
const halflingScout = rulesDb.hiredSwords.find((hiredSword) => hiredSword.id === "halfling-scout");
assert.deepEqual(freelancer?.equipmentItemIds, ["heavy-armour", "shield", "lance", "sword", "warhorse"]);
assert.ok(pitFighter?.equipmentItemIds.includes("spiked-gauntlet"));
assert.ok(warlockHiredSword?.equipmentItemIds.includes("staff"));
assert.ok(warlockHiredSword?.specialRuleIds.includes("lesser-magic"));
assert.ok(halflingScout?.equipmentItemIds.includes("cooking-pot-helmet"));
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "lance")?.sourceDocumentId, "mordheim-core-rules");
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "spiked-gauntlet")?.validation.isBuckler, true);
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "cooking-pot-helmet")?.validation.isHelmet, true);
assert.ok(rulesDb.equipmentItems.find((item) => item.id === "warhorse")?.validation.allowedFighterTypeIds.includes("hired-sword-freelancer"));

const hiredSwordRoster = { ...validStartingWitchHunters(), id: "roster-hired-sword-equipment", warbandTypeId: "witch-hunters", members: [] };
const freelancerType = rulesDb.fighterTypes.find((fighterType) => fighterType.id === "hired-sword-freelancer");
const pitFighterType = rulesDb.fighterTypes.find((fighterType) => fighterType.id === "hired-sword-pit-fighter");
const warlockType = rulesDb.fighterTypes.find((fighterType) => fighterType.id === "hired-sword-warlock");
assert.ok(freelancerType?.equipmentListIds.includes("hired-sword-freelancer-equipment"));
assert.ok(pitFighterType?.equipmentListIds.includes("hired-sword-pit-fighter-equipment"));
assert.ok(warlockType?.equipmentListIds.includes("hired-sword-warlock-equipment"));
const freelancerMember = createRosterMemberFromType(freelancerType, hiredSwordRoster.id, "hired_sword", "Freelancer");
const freelancerOptions = getAllowedEquipment(freelancerMember, hiredSwordRoster, rulesDb);
const mountedFreelancerOptions = getAllowedEquipment({ ...freelancerMember, equipment: ["warhorse"] }, hiredSwordRoster, rulesDb);
const pitFighterOptions = getAllowedEquipment(createRosterMemberFromType(pitFighterType, hiredSwordRoster.id, "hired_sword", "Pit Fighter"), hiredSwordRoster, rulesDb);
const warlockMember = createRosterMemberFromType(warlockType, hiredSwordRoster.id, "hired_sword", "Warlock");
const warlockOptions = getAllowedEquipment(warlockMember, hiredSwordRoster, rulesDb);
const warlockSpells = getAllowedSpecialRules(warlockMember, hiredSwordRoster, rulesDb);
assert.equal(freelancerOptions.find((option) => option.item.id === "warhorse")?.allowed, true);
assert.equal(freelancerOptions.find((option) => option.item.id === "lance")?.allowed, false);
assert.equal(mountedFreelancerOptions.find((option) => option.item.id === "lance")?.allowed, true);
assert.equal(pitFighterOptions.find((option) => option.item.id === "spiked-gauntlet")?.allowed, true);
assert.equal(warlockOptions.find((option) => option.item.id === "staff")?.allowed, true);
assert.equal(warlockSpells.filter((option) => option.allowed && option.item.validation.requiredSpecialRuleIds.includes("lesser-magic")).length, 6);
assert.equal(calculateWarbandRating({ ...hiredSwordRoster, members: [{ ...freelancerMember, equipment: freelancer.equipmentItemIds }] }, rulesDb), 21);

assert.ok(getAllowedWarbands(rulesDb, { broheimGrade: "1b" }).some((warband) => warband.id === "lizardmen"));
assert.deepEqual(errorCodes(validLizardmen()), []);
assert.equal(calculateRosterCost(validLizardmen(), rulesDb), 309);
assert.equal(calculateWarbandRating(validLizardmen(), rulesDb), 74);
assert.ok(codes(lizardmenNoPriest()).includes("REQUIRED_LEADER"));
assert.ok(codes(lizardmenTwoPriests()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManyTotemWarriors()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyGreatCrests()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManySaurusBravesMaximum()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManySaurusBravesMaximum()).includes("HENCHMAN_GROUP_SIZE"));
assert.ok(codes(tooManySaurusBravesForSkinks()).includes("FIGHTER_RATIO_LIMIT"));
assert.ok(codes(tooManyLizardmenWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(skinkBraveWithSword()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(saurusBraveWithShortBow()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(greatCrestWithBoneHelmet()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(kroxigorWithoutHalberd()).includes("REQUIRED_EQUIPMENT_OPTION"));
assert.deepEqual(errorCodes(validKroxigor()), []);
assert.ok(codes(lizardmenHeroWithTwoSacredMarkings()).includes("EXCLUSIVE_EQUIPMENT_GROUP"));
assert.ok(codes(invalidLizardmenSkill()).includes("INVALID_SKILL"));
assert.deepEqual(errorCodes(lizardmenPriestWithSpell()), []);
assert.ok(codes(lizardmenWithWarlock()).includes("HIRED_SWORD_NOT_AVAILABLE"));

const lizardmenRoster = validLizardmen();
const priestOptions = getAllowedEquipment(lizardmenRoster.members[0], lizardmenRoster, rulesDb);
const crestOptions = getAllowedEquipment(lizardmenRoster.members[2], lizardmenRoster, rulesDb);
const skinkOptions = getAllowedEquipment(lizardmenRoster.members[3], lizardmenRoster, rulesDb);
const saurusOptions = getAllowedEquipment(lizardmenRoster.members[4], lizardmenRoster, rulesDb);
const kroxigorRoster = kroxigorWithoutHalberd();
const kroxigorOptions = getAllowedEquipment(kroxigorRoster.members[2], kroxigorRoster, rulesDb);
assert.equal(priestOptions.find((option) => option.item.id === "bone-helmet")?.allowed, true);
assert.equal(priestOptions.find((option) => option.item.id === "cold-one")?.allowed, true);
assert.equal(crestOptions.find((option) => option.item.id === "bone-helmet")?.allowed, false);
assert.equal(skinkOptions.find((option) => option.item.id === "javelin")?.allowed, true);
assert.equal(skinkOptions.find((option) => option.item.id === "cold-one")?.allowed, false);
assert.equal(skinkOptions.find((option) => option.item.id === "sword")?.allowed, false);
assert.equal(saurusOptions.find((option) => option.item.id === "short-bow")?.allowed, false);
assert.equal(saurusOptions.find((option) => option.item.id === "lizardmen-light-armour")?.allowed, true);
assert.equal(kroxigorOptions.find((option) => option.item.id === "kroxigor-halberd")?.allowed, true);

const lizardmenPriestSkills = getAllowedSkills(lizardmenRoster.members[0], lizardmenRoster, rulesDb);
const totemSkills = getAllowedSkills(lizardmenRoster.members[1], lizardmenRoster, rulesDb);
const crestSkills = getAllowedSkills(lizardmenRoster.members[2], lizardmenRoster, rulesDb);
assert.equal(lizardmenPriestSkills.find((option) => option.item.id === "lizardmen-infiltration")?.allowed, true);
assert.equal(lizardmenPriestSkills.find((option) => option.item.id === "bellowing-battle-roar")?.allowed, false);
assert.equal(totemSkills.find((option) => option.item.id === "bellowing-battle-roar")?.allowed, true);
assert.equal(totemSkills.find((option) => option.item.id === "great-hunter")?.allowed, false);
assert.equal(crestSkills.find((option) => option.item.id === "great-hunter")?.allowed, true);

const priestSpells = getAllowedSpecialRules(lizardmenRoster.members[0], lizardmenRoster, rulesDb);
const totemSpells = getAllowedSpecialRules(lizardmenRoster.members[1], lizardmenRoster, rulesDb);
assert.equal(priestSpells.find((option) => option.item.id === "lizardmen-chotecs-wrath")?.allowed, true);
assert.equal(totemSpells.find((option) => option.item.id === "lizardmen-chotecs-wrath")?.allowed, false);
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "lizardmen-magic")?.sourceDocumentId, "tc11-lizardmen");
assert.ok(rulesDb.specialRules.find((rule) => rule.id === "lizardmen-magic")?.relatedRuleIds.includes("lizardmen-chotecs-wrath"));
assert.equal(rulesDb.skills.find((skill) => skill.id === "bellowing-battle-roar")?.sourceDocumentId, "tc11-lizardmen");
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "bolas")?.sourceDocumentId, "tc11-lizardmen");
assert.ok(rulesDb.hiredSwords.find((hiredSword) => hiredSword.id === "warlock")?.blockedWarbandTypeIds.includes("lizardmen"));

const grade1bWarbands = getAllowedWarbands(rulesDb, { broheimGrade: "1b" }).map((warband) => warband.id);
assert.ok(grade1bWarbands.includes("amazons-lustria"));
assert.ok(grade1bWarbands.includes("amazons-mordheim"));
assert.deepEqual(errorCodes(validAmazonsLustria()), []);
assert.deepEqual(errorCodes(validAmazonsMordheim()), []);
assert.equal(calculateRosterCost(validAmazonsLustria(), rulesDb), 321);
assert.equal(calculateWarbandRating(validAmazonsLustria(), rulesDb), 71);
assert.equal(calculateRosterCost(validAmazonsMordheim(), rulesDb), 351);
assert.equal(calculateWarbandRating(validAmazonsMordheim(), rulesDb), 71);
assert.ok(codes(amazonsLustriaNoPriest()).includes("REQUIRED_LEADER"));
assert.ok(codes(amazonsLustriaTwoPriestesses()).includes("REQUIRED_LEADER"));
assert.ok(codes(amazonsLustriaNoWarriors()).includes("FIGHTER_MIN_COUNT"));
assert.ok(codes(tooManyAmazonEagleWarriors()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyAmazonPiranhaWarriors()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyAmazonJaguarWarriors()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyAmazonsLustriaWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(amazonsMordheimNoPriestess()).includes("REQUIRED_LEADER"));
assert.ok(codes(amazonsMordheimTwoPriestesses()).includes("REQUIRED_LEADER"));
assert.ok(codes(amazonsMordheimNoWarriors()).includes("FIGHTER_MIN_COUNT"));
assert.ok(codes(tooManyAmazonChampions()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyAmazonTotemWarriors()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyAmazonScouts()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyAmazonsMordheimWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(lustriaJaguarWithBuckler()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(lustriaEagleWithConch()).includes("INVALID_EQUIPMENT"));
assert.deepEqual(errorCodes(lustriaPiranhaWithConch()), []);
assert.ok(codes(lustriaWarriorWithStarsword()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(mordheimScoutWithSunGauntlet()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(mordheimWarriorWithAmulet()).includes("INVALID_EQUIPMENT"));
assert.deepEqual(errorCodes(mordheimChampionWithSunGauntlet()), []);
assert.ok(codes(invalidLustriaAmazonSkill()).includes("INVALID_SKILL"));
assert.deepEqual(errorCodes(lustriaEagleWithAmazonSkill()), []);
assert.deepEqual(errorCodes(lustriaSerpentWithRitual()), []);
assert.ok(codes(lustriaEagleWithRitual()).includes("INVALID_SPECIAL_RULE"));
assert.ok(codes(invalidMordheimAmazonSkill()).includes("INVALID_SKILL"));
assert.ok(codes(mordheimTotemWithQuickShot()).includes("INVALID_SKILL"));
assert.deepEqual(errorCodes(mordheimPriestessWithRitual()), []);
assert.ok(codes(mordheimChampionWithRitual()).includes("INVALID_SPECIAL_RULE"));
assert.ok(codes(amazonsLustriaWithWarlock()).includes("HIRED_SWORD_NOT_AVAILABLE"));
assert.ok(codes(amazonsMordheimWithWarlock()).includes("HIRED_SWORD_NOT_AVAILABLE"));

const amazonsLustriaRoster = validAmazonsLustria();
const amazonSerpentOptions = getAllowedEquipment({ ...amazonsLustriaRoster.members[0], equipment: ["dagger"] }, amazonsLustriaRoster, rulesDb);
const amazonJaguarOptions = getAllowedEquipment(amazonsLustriaRoster.members[4], amazonsLustriaRoster, rulesDb);
const amazonPiranhaOptions = getAllowedEquipment(amazonsLustriaRoster.members[2], amazonsLustriaRoster, rulesDb);
const amazonSerpentSkills = getAllowedSkills(amazonsLustriaRoster.members[0], amazonsLustriaRoster, rulesDb);
const amazonEagleSkills = getAllowedSkills(amazonsLustriaRoster.members[1], amazonsLustriaRoster, rulesDb);
const amazonSerpentRituals = getAllowedSpecialRules(amazonsLustriaRoster.members[0], amazonsLustriaRoster, rulesDb);
assert.equal(amazonSerpentOptions.find((option) => option.item.id === "amazon-lustria-sunstaff")?.allowed, true);
assert.equal(amazonJaguarOptions.find((option) => option.item.id === "amazon-bolas")?.allowed, true);
assert.equal(amazonJaguarOptions.find((option) => option.item.id === "buckler")?.allowed, false);
assert.equal(amazonPiranhaOptions.find((option) => option.item.id === "amazon-conch-shell-horn")?.allowed, true);
assert.equal(amazonSerpentSkills.find((option) => option.item.id === "amazon-concealment")?.allowed, true);
assert.equal(amazonSerpentSkills.find((option) => option.item.id === "quick-shot")?.allowed, false);
assert.equal(amazonEagleSkills.find((option) => option.item.id === "amazon-savage-fury")?.allowed, true);
assert.equal(amazonSerpentRituals.find((option) => option.item.id === "amazon-singing-wind")?.allowed, true);

const amazonsMordheimRoster = validAmazonsMordheim();
const amazonPriestessOptions = getAllowedEquipment({ ...amazonsMordheimRoster.members[0], equipment: ["dagger"] }, amazonsMordheimRoster, rulesDb);
const amazonScoutOptions = getAllowedEquipment(amazonsMordheimRoster.members[4], amazonsMordheimRoster, rulesDb);
const amazonPriestessSkills = getAllowedSkills(amazonsMordheimRoster.members[0], amazonsMordheimRoster, rulesDb);
const amazonTotemSkills = getAllowedSkills(amazonsMordheimRoster.members[2], amazonsMordheimRoster, rulesDb);
const amazonPriestessRituals = getAllowedSpecialRules(amazonsMordheimRoster.members[0], amazonsMordheimRoster, rulesDb);
assert.equal(amazonPriestessOptions.find((option) => option.item.id === "amazon-sunstaff")?.allowed, true);
assert.equal(amazonPriestessOptions.find((option) => option.item.id === "amazon-sun-gauntlet")?.allowed, true);
assert.equal(amazonScoutOptions.find((option) => option.item.id === "amazon-javelins")?.allowed, true);
assert.equal(amazonScoutOptions.find((option) => option.item.id === "amazon-sun-gauntlet")?.allowed, false);
assert.equal(amazonPriestessSkills.find((option) => option.item.id === "mighty-blow")?.allowed, true);
assert.equal(amazonPriestessSkills.find((option) => option.item.id === "amazon-skink-hunter")?.allowed, false);
assert.equal(amazonTotemSkills.find((option) => option.item.id === "quick-shot")?.allowed, false);
assert.equal(amazonPriestessRituals.find((option) => option.item.id === "amazon-sirens-dreams")?.allowed, true);
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "amazon-rituals")?.sourceDocumentId, "tc15-amazons-lustria");
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "amazon-sunstaff")?.sourceDocumentId, "tc23-amazons-mordheim");
assert.ok(rulesDb.hiredSwords.find((hiredSword) => hiredSword.id === "warlock")?.blockedWarbandTypeIds.includes("amazons-mordheim"));

assert.ok(grade1bWarbands.includes("pirates"));
assert.deepEqual(errorCodes(validPirates()), []);
assert.equal(calculateRosterCost(validPirates(), rulesDb), 351);
assert.equal(calculateWarbandRating(validPirates(), rulesDb), 78);
assert.ok(codes(piratesNoCaptain()).includes("REQUIRED_LEADER"));
assert.ok(codes(piratesTwoCaptains()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManyPirateMates()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyCabinBoys()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyPirateGunners()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyBoatswains()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyPiratesWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(tooManySwabbiesForFreeCrew()).includes("FIGHTER_RATIO_LIMIT"));
assert.ok(codes(swabbieWithExperience()).includes("EXPERIENCE_NOT_ALLOWED"));
assert.ok(codes(crewWithSwivelGun()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(gunnerWithAmmoNoSwivelGun()).includes("MISSING_REQUIRED_EQUIPMENT"));
assert.deepEqual(errorCodes(gunnerWithSwivelGunBallShot()), []);
assert.ok(codes(swabbieWithPistol()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(invalidPirateSkill()).includes("INVALID_SKILL"));
assert.deepEqual(errorCodes(pirateCaptainWithSeaShanty()), []);

const pirateRoster = validPirates();
const pirateCaptainOptions = getAllowedEquipment({ ...pirateRoster.members[0], equipment: ["dagger"] }, pirateRoster, rulesDb);
const pirateGunnerOptions = getAllowedEquipment({ ...pirateRoster.members[4], equipment: ["dagger", "swivel-gun"] }, pirateRoster, rulesDb);
const pirateCrewOptions = getAllowedEquipment(pirateRoster.members[3], pirateRoster, rulesDb);
const pirateBoatswainOptions = getAllowedEquipment({ ...pirateRoster.members[5], equipment: ["dagger"] }, pirateRoster, rulesDb);
const pirateSwabbieOptions = getAllowedEquipment(pirateRoster.members[6], pirateRoster, rulesDb);
assert.equal(pirateCaptainOptions.find((option) => option.item.id === "cat-o-nine-tails")?.allowed, true);
assert.equal(pirateCaptainOptions.find((option) => option.item.id === "swivel-gun")?.allowed, false);
assert.equal(pirateGunnerOptions.find((option) => option.item.id === "swivel-gun-ball-shot")?.allowed, true);
assert.equal(pirateCrewOptions.find((option) => option.item.id === "swivel-gun")?.allowed, false);
assert.equal(pirateBoatswainOptions.find((option) => option.item.id === "boat-hook")?.allowed, true);
assert.equal(pirateSwabbieOptions.find((option) => option.item.id === "pistol")?.allowed, false);
const pirateCaptainSkills = getAllowedSkills(pirateRoster.members[0], pirateRoster, rulesDb);
const pirateCabinBoySkills = getAllowedSkills(pirateRoster.members[2], pirateRoster, rulesDb);
const pirateCrewSkills = getAllowedSkills(pirateRoster.members[3], pirateRoster, rulesDb);
assert.equal(pirateCaptainSkills.find((option) => option.item.id === "sea-shanty")?.allowed, true);
assert.equal(pirateCabinBoySkills.find((option) => option.item.id === "mighty-blow")?.allowed, false);
assert.equal(pirateCrewSkills.find((option) => option.item.id === "sea-shanty")?.allowed, false);
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "pirate-shanghaied")?.sourceDocumentId, "tc9-pirates");
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "swivel-gun")?.sourceDocumentId, "tc9-pirates");
assert.equal(rulesDb.skills.find((skill) => skill.id === "sea-shanty")?.sourceDocumentId, "tc9-pirates");

assert.ok(grade1bWarbands.includes("gunnery-school-of-nuln"));
assert.deepEqual(errorCodes(validGunnerySchoolOfNuln()), []);
assert.equal(calculateRosterCost(validGunnerySchoolOfNuln(), rulesDb), 464);
assert.equal(calculateWarbandRating(validGunnerySchoolOfNuln(), rulesDb), 85);
assert.ok(codes(gunnerySchoolNoOfficer()).includes("REQUIRED_LEADER"));
assert.ok(codes(gunnerySchoolTwoOfficers()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManyNulnInstructors()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManySeniorStudents()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyUnderclassmen()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyNulnMarksmen()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyNulnPistoliers()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyNulnWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(nulnOfficerWithBow()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(nulnOfficerWithWeaponsExpertAndBow()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(nulnMarksmanWithDuellingPistol()).includes("INVALID_EQUIPMENT"));
assert.deepEqual(errorCodes(nulnMarksmanWithRepeaterHandgun()), []);
assert.deepEqual(errorCodes(nulnInstructorWithMortar()), []);
assert.ok(codes(nulnPistolierWithRepeaterPistol()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(invalidNulnSkill()).includes("INVALID_SKILL"));
assert.deepEqual(errorCodes(nulnOfficerWithHunterSkill()), []);

const nulnRoster = validGunnerySchoolOfNuln();
const nulnOfficerOptions = getAllowedEquipment({ ...nulnRoster.members[0], equipment: ["dagger"] }, nulnRoster, rulesDb);
const nulnInstructorOptions = getAllowedEquipment({ ...nulnRoster.members[1], equipment: ["dagger"] }, nulnRoster, rulesDb);
const nulnMarksmanOptions = getAllowedEquipment({ ...nulnRoster.members[5], equipment: ["dagger"] }, nulnRoster, rulesDb);
const nulnPistolierOptions = getAllowedEquipment({ ...nulnRoster.members[6], equipment: ["dagger"] }, nulnRoster, rulesDb);
assert.equal(nulnOfficerOptions.find((option) => option.item.id === "nuln-double-barrelled-duelling-pistol")?.allowed, true);
assert.equal(nulnOfficerOptions.find((option) => option.item.id === "bow")?.allowed, false);
assert.equal(nulnInstructorOptions.find((option) => option.item.id === "hand-held-mortar")?.allowed, true);
assert.equal(nulnMarksmanOptions.find((option) => option.item.id === "nuln-repeater-handgun")?.allowed, true);
assert.equal(nulnMarksmanOptions.find((option) => option.item.id === "nuln-duelling-pistol")?.allowed, false);
assert.equal(nulnPistolierOptions.find((option) => option.item.id === "nuln-repeater-pistol")?.allowed, false);
const nulnOfficerSkills = getAllowedSkills(nulnRoster.members[0], nulnRoster, rulesDb);
const nulnInstructorSkills = getAllowedSkills(nulnRoster.members[1], nulnRoster, rulesDb);
const nulnUnderclassmanSkills = getAllowedSkills(nulnRoster.members[3], nulnRoster, rulesDb);
const nulnMarksmanSkills = getAllowedSkills(nulnRoster.members[5], nulnRoster, rulesDb);
assert.equal(nulnOfficerSkills.find((option) => option.item.id === "hunter")?.allowed, true);
assert.equal(nulnInstructorSkills.find((option) => option.item.id === "mighty-blow")?.allowed, false);
assert.equal(nulnUnderclassmanSkills.find((option) => option.item.id === "pistolier")?.allowed, true);
assert.equal(nulnMarksmanSkills.find((option) => option.item.id === "hunter")?.allowed, false);
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "nuln-proud-to-a-fault")?.sourceDocumentId, "nc-gunnery-school-of-nuln");
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "nuln-repeater-handgun")?.sourceDocumentId, "nc-gunnery-school-of-nuln");
assert.equal(rulesDb.skills.find((skill) => skill.id === "hunter")?.sourceDocumentId, "mordheim-core-rules");

assert.ok(getAllowedWarbands(rulesDb, { broheimGrade: "1b" }).some((warband) => warband.id === "forest-goblins"));
assert.deepEqual(errorCodes(validForestGoblins()), []);
assert.equal(calculateRosterCost(validForestGoblins(), rulesDb), 240);
assert.equal(calculateWarbandRating(validForestGoblins(), rulesDb), 64);
assert.ok(codes(forestGoblinsNoChieftain()).includes("REQUIRED_LEADER"));
assert.ok(codes(forestGoblinsTwoChieftains()).includes("REQUIRED_LEADER"));
assert.ok(codes(tooManyForestGoblinBraves()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyForestGoblinShamans()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyRedToofBoyz()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyRedToofBoyz()).includes("HENCHMAN_GROUP_SIZE"));
assert.ok(codes(tooManySluggas()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyGiganticSpiders()).includes("FIGHTER_MAX_COUNT"));
assert.ok(codes(tooManyForestGoblinWarriors()).includes("MAX_WARRIORS"));
assert.ok(codes(forestGoblinWithAxe()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(braveWithMagicGubbinz()).includes("INVALID_EQUIPMENT"));
assert.ok(codes(giganticSpiderWithWeapon()).includes("INVALID_EQUIPMENT"));
assert.deepEqual(errorCodes(forestGoblinWithSpider()), []);
assert.equal(calculateRosterCost(forestGoblinWithSpider(), rulesDb), 440);
assert.equal(calculateWarbandRating(forestGoblinWithSpider(), rulesDb), 84);
assert.ok(codes(invalidForestGoblinSkill()).includes("INVALID_SKILL"));
assert.deepEqual(errorCodes(braveShedsAnimosity()), []);
assert.deepEqual(errorCodes(shamanWithForestGoblinSpell()), []);
assert.ok(codes(chieftainWithForestGoblinSpell()).includes("INVALID_SPECIAL_RULE"));

const forestGoblinRoster = validForestGoblins();
const forestChieftainOptions = getAllowedEquipment(forestGoblinRoster.members[0], forestGoblinRoster, rulesDb);
const forestShamanOptions = getAllowedEquipment(forestGoblinRoster.members[1], forestGoblinRoster, rulesDb);
const forestBraveOptions = getAllowedEquipment(forestGoblinRoster.members[2], forestGoblinRoster, rulesDb);
const forestHenchmanOptions = getAllowedEquipment(forestGoblinRoster.members[3], forestGoblinRoster, rulesDb);
const forestSpiderOptions = getAllowedEquipment(forestGoblinWithSpider().members[6], forestGoblinWithSpider(), rulesDb);
assert.equal(forestChieftainOptions.find((option) => option.item.id === "boss-pole")?.allowed, true);
assert.equal(forestChieftainOptions.find((option) => option.item.id === "giant-spider-mount")?.allowed, true);
assert.equal(forestShamanOptions.find((option) => option.item.id === "magic-gubbinz")?.allowed, true);
assert.equal(forestBraveOptions.find((option) => option.item.id === "magic-gubbinz")?.allowed, false);
assert.equal(forestHenchmanOptions.find((option) => option.item.id === "forest-goblin-throwing-weapons")?.allowed, true);
assert.equal(forestHenchmanOptions.find((option) => option.item.id === "axe")?.allowed, false);
assert.equal(forestSpiderOptions.find((option) => option.item.id === "dagger")?.allowed, false);

const forestChieftainSkills = getAllowedSkills(forestGoblinRoster.members[0], forestGoblinRoster, rulesDb);
const forestBraveSkills = getAllowedSkills(forestGoblinRoster.members[2], forestGoblinRoster, rulesDb);
const forestShamanSkills = getAllowedSkills(forestGoblinRoster.members[1], forestGoblinRoster, rulesDb);
assert.equal(forestChieftainSkills.find((option) => option.item.id === "shed-animosity")?.allowed, false);
assert.equal(forestBraveSkills.find((option) => option.item.id === "shed-animosity")?.allowed, true);
assert.equal(forestShamanSkills.find((option) => option.item.id === "sorcery")?.allowed, true);
assert.equal(forestShamanSkills.find((option) => option.item.id === "mighty-blow")?.allowed, false);

const forestShamanSpells = getAllowedSpecialRules(forestGoblinRoster.members[1], forestGoblinRoster, rulesDb);
const forestChieftainSpells = getAllowedSpecialRules(forestGoblinRoster.members[0], forestGoblinRoster, rulesDb);
assert.equal(forestShamanSpells.find((option) => option.item.id === "forest-goblin-wind-of-gork")?.allowed, true);
assert.equal(forestChieftainSpells.find((option) => option.item.id === "forest-goblin-wind-of-gork")?.allowed, false);
assert.equal(rulesDb.specialRules.find((rule) => rule.id === "forest-goblin-magic")?.sourceDocumentId, "nc-forest-goblins");
assert.ok(rulesDb.specialRules.find((rule) => rule.id === "forest-goblin-magic")?.relatedRuleIds.includes("forest-goblin-wind-of-gork"));
assert.equal(rulesDb.skills.find((skill) => skill.id === "shed-animosity")?.sourceDocumentId, "nc-forest-goblins");
assert.equal(rulesDb.equipmentItems.find((item) => item.id === "boss-pole")?.sourceDocumentId, "nc-forest-goblins");

console.log("Rules engine verification passed.");

function codes(roster) {
  return validateRoster(roster, rulesDb).map((issue) => issue.code);
}

function errorCodes(roster) {
  return validateRoster(roster, rulesDb)
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.code);
}

async function loadRulesDb() {
  const [sourceDocuments, equipmentItems, skillSeed, specialRules, hiredSwords, ruleReferences, amazonsLustria, amazonsMordheim, pirates, gunnerySchoolOfNuln, witchHunters, mercenaries, averlanders, kislevites, ostlanders, sisters, carnival, cultOfThePossessed, skaven, pestilens, undead, orcMob, beastmenRaiders, blackOrcs, dwarfTreasureHunters, shadowWarriors, lizardmen, forestGoblins] = await Promise.all([
    readJson("../src/data/sources.json"),
    readJson("../src/data/equipment.json"),
    readJson("../src/data/skills.json"),
    readJson("../src/data/specialRules.json"),
    readJson("../src/data/hiredSwords.json"),
    readJson("../src/data/ruleReferences.json"),
    readJson("../src/data/warbands/amazons-lustria.json"),
    readJson("../src/data/warbands/amazons-mordheim.json"),
    readJson("../src/data/warbands/pirates.json"),
    readJson("../src/data/warbands/gunnery-school-of-nuln.json"),
    readJson("../src/data/warbands/witch-hunters.json"),
    readJson("../src/data/warbands/mercenaries.json"),
    readJson("../src/data/warbands/averlanders.json"),
    readJson("../src/data/warbands/kislevites.json"),
    readJson("../src/data/warbands/ostlanders.json"),
    readJson("../src/data/warbands/sisters-of-sigmar.json"),
    readJson("../src/data/warbands/carnival-of-chaos.json"),
    readJson("../src/data/warbands/cult-of-the-possessed.json"),
    readJson("../src/data/warbands/skaven.json"),
    readJson("../src/data/warbands/skaven-pestilens.json"),
    readJson("../src/data/warbands/undead.json"),
    readJson("../src/data/warbands/orc-mob.json"),
    readJson("../src/data/warbands/beastmen-raiders.json"),
    readJson("../src/data/warbands/black-orcs.json"),
    readJson("../src/data/warbands/dwarf-treasure-hunters.json"),
    readJson("../src/data/warbands/shadow-warriors.json"),
    readJson("../src/data/warbands/lizardmen.json"),
    readJson("../src/data/warbands/forest-goblins.json")
  ]);
  const amazonsLustriaSeed = warbandSeedSchema.parse(amazonsLustria);
  const amazonsMordheimSeed = warbandSeedSchema.parse(amazonsMordheim);
  const piratesSeed = warbandSeedSchema.parse(pirates);
  const gunnerySchoolOfNulnSeed = warbandSeedSchema.parse(gunnerySchoolOfNuln);
  const warbandSeed = warbandSeedSchema.parse(witchHunters);
  const averlandersSeed = warbandSeedSchema.parse(averlanders);
  const kislevitesSeed = warbandSeedSchema.parse(kislevites);
  const ostlandersSeed = warbandSeedSchema.parse(ostlanders);
  const sistersSeed = warbandSeedSchema.parse(sisters);
  const carnivalSeed = warbandSeedSchema.parse(carnival);
  const cultOfThePossessedSeed = warbandSeedSchema.parse(cultOfThePossessed);
  const skavenSeed = warbandSeedSchema.parse(skaven);
  const pestilensSeed = warbandSeedSchema.parse(pestilens);
  const undeadSeed = warbandSeedSchema.parse(undead);
  const orcMobSeed = warbandSeedSchema.parse(orcMob);
  const beastmenRaidersSeed = warbandSeedSchema.parse(beastmenRaiders);
  const blackOrcsSeed = warbandSeedSchema.parse(blackOrcs);
  const dwarfTreasureHuntersSeed = warbandSeedSchema.parse(dwarfTreasureHunters);
  const shadowWarriorsSeed = warbandSeedSchema.parse(shadowWarriors);
  const lizardmenSeed = warbandSeedSchema.parse(lizardmen);
  const forestGoblinsSeed = warbandSeedSchema.parse(forestGoblins);
  const mercenarySeed = warbandSeedCollectionSchema.parse(mercenaries);
  const parsedHiredSwords = hiredSwordSchema.array().parse(hiredSwords);
  const hiredSwordFighterTypes = parsedHiredSwords
    .filter((hiredSword) => hiredSword.profile)
    .map((hiredSword) => ({
      id: `hired-sword-${hiredSword.id}`,
      warbandTypeId: "hired-swords",
      name: hiredSword.name,
      category: "hired_sword",
      minCount: 0,
      maxCount: 1,
      groupMinSize: null,
      groupMaxSize: null,
      hireCost: hiredSword.hireFee,
      startingExperience: hiredSword.startingExperience,
      profile: hiredSword.profile,
      equipmentListIds: [`hired-sword-${hiredSword.id}-equipment`],
      skillCategoryIds: hiredSword.skillCategoryIds,
      specialRuleIds: hiredSword.specialRuleIds,
      canGainExperience: true,
      isLargeCreature: hiredSword.isLargeCreature,
      ratingOverride: hiredSword.ratingOverride ?? null,
      notes: [hiredSword.effectSummary, hiredSword.availabilitySummary, hiredSword.notes].filter(Boolean).join(" "),
      validation: {
        requiredOneOfEquipmentItemIds: [],
        warbandMaxWarriorsBonus: 0,
        maxCountPerFighterTypeIds: []
      },
      source: {
        sourceDocumentId: hiredSword.sourceDocumentId,
        sourceUrl: hiredSword.sourceUrl,
        pageRef: hiredSword.pageRef,
        label: hiredSword.name
      }
    }));
  const hiredSwordEquipmentLists = parsedHiredSwords
    .filter((hiredSword) => hiredSword.profile)
    .map((hiredSword) => ({
      id: `hired-sword-${hiredSword.id}-equipment`,
      name: `${hiredSword.name} Fixed Equipment`,
      warbandTypeId: "hired-swords",
      allowedEquipmentItemIds: Array.from(new Set(hiredSword.equipmentItemIds)),
      appliesToFighterTypeIds: [`hired-sword-${hiredSword.id}`],
      notes: "Fixed equipment from this Hired Sword's source entry. Players cannot buy extra equipment for hired swords."
    }));
  return rulesDbSchema.parse({
    sourceDocuments,
    warbandTypes: [amazonsLustriaSeed.warbandType, amazonsMordheimSeed.warbandType, piratesSeed.warbandType, gunnerySchoolOfNulnSeed.warbandType, warbandSeed.warbandType, averlandersSeed.warbandType, kislevitesSeed.warbandType, ostlandersSeed.warbandType, sistersSeed.warbandType, carnivalSeed.warbandType, cultOfThePossessedSeed.warbandType, skavenSeed.warbandType, pestilensSeed.warbandType, undeadSeed.warbandType, orcMobSeed.warbandType, beastmenRaidersSeed.warbandType, blackOrcsSeed.warbandType, dwarfTreasureHuntersSeed.warbandType, shadowWarriorsSeed.warbandType, lizardmenSeed.warbandType, forestGoblinsSeed.warbandType, ...mercenarySeed.warbandTypes],
    fighterTypes: [...amazonsLustriaSeed.fighterTypes, ...amazonsMordheimSeed.fighterTypes, ...piratesSeed.fighterTypes, ...gunnerySchoolOfNulnSeed.fighterTypes, ...warbandSeed.fighterTypes, ...averlandersSeed.fighterTypes, ...kislevitesSeed.fighterTypes, ...ostlandersSeed.fighterTypes, ...sistersSeed.fighterTypes, ...carnivalSeed.fighterTypes, ...cultOfThePossessedSeed.fighterTypes, ...skavenSeed.fighterTypes, ...pestilensSeed.fighterTypes, ...undeadSeed.fighterTypes, ...orcMobSeed.fighterTypes, ...beastmenRaidersSeed.fighterTypes, ...blackOrcsSeed.fighterTypes, ...dwarfTreasureHuntersSeed.fighterTypes, ...shadowWarriorsSeed.fighterTypes, ...lizardmenSeed.fighterTypes, ...forestGoblinsSeed.fighterTypes, ...mercenarySeed.fighterTypes, ...hiredSwordFighterTypes],
    equipmentItems,
    equipmentLists: [...amazonsLustriaSeed.equipmentLists, ...amazonsMordheimSeed.equipmentLists, ...piratesSeed.equipmentLists, ...gunnerySchoolOfNulnSeed.equipmentLists, ...warbandSeed.equipmentLists, ...averlandersSeed.equipmentLists, ...kislevitesSeed.equipmentLists, ...ostlandersSeed.equipmentLists, ...sistersSeed.equipmentLists, ...carnivalSeed.equipmentLists, ...cultOfThePossessedSeed.equipmentLists, ...skavenSeed.equipmentLists, ...pestilensSeed.equipmentLists, ...undeadSeed.equipmentLists, ...orcMobSeed.equipmentLists, ...beastmenRaidersSeed.equipmentLists, ...blackOrcsSeed.equipmentLists, ...dwarfTreasureHuntersSeed.equipmentLists, ...shadowWarriorsSeed.equipmentLists, ...lizardmenSeed.equipmentLists, ...forestGoblinsSeed.equipmentLists, ...mercenarySeed.equipmentLists, ...hiredSwordEquipmentLists],
    skillCategories: skillSeed.categories,
    skills: skillSeed.skills,
    specialRules,
    hiredSwords: parsedHiredSwords,
    ruleReferences
  });
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(new URL(relativePath, import.meta.url), "utf8"));
}
