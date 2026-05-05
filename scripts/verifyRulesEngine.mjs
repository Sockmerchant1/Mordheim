import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { hiredSwordSchema, rulesDbSchema, warbandSeedCollectionSchema, warbandSeedSchema } from "../src/rules/schemas.ts";
import {
  calculateRosterCost,
  calculateWarbandRating,
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
  createRosterFromStarterTemplate,
  starterRosterTemplates
} from "../src/data/starterRosters.ts";

const rulesDb = await loadRulesDb();
const rulesLookup = JSON.parse(await fs.readFile(new URL("../src/data/rulesLookup.json", import.meta.url), "utf8"));

assert.ok(rulesLookup.some((rule) => rule.id === "equipment-helmet" && rule.text.includes("4+")));
assert.ok(rulesLookup.some((rule) => rule.id === "special-sigmar-healing-hand" && rule.text.includes("2 inches")));
assert.ok(rulesLookup.some((rule) => rule.id === "injury-leg-wound" && rule.text.includes("-1 Movement")));
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
const equipmentOptions = getAllowedEquipment(roster.members[2], roster, rulesDb);
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
const warriorOptions = getAllowedEquipment(reiklandRoster.members[3], reiklandRoster, rulesDb);
const marksmanOptions = getAllowedEquipment(reiklandRoster.members[4], reiklandRoster, rulesDb);
assert.equal(warriorOptions.find((option) => option.item.id === "long-bow")?.allowed, false);
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
const augurOptions = getAllowedEquipment(sistersRoster.members[2], sistersRoster, rulesDb);
const noviceOptions = getAllowedEquipment(sistersRoster.members[3], sistersRoster, rulesDb);
assert.equal(augurOptions.find((option) => option.item.id === "light-armour")?.allowed, false);
assert.equal(augurOptions.find((option) => option.item.id === "holy-tome")?.allowed, true);
assert.equal(noviceOptions.find((option) => option.item.id === "holy-tome")?.allowed, false);

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
const zombieOptions = getAllowedEquipment(undeadRoster.members[3], undeadRoster, rulesDb);
assert.equal(vampireOptions.find((option) => option.item.id === "halberd")?.allowed, true);
assert.equal(vampireOptions.find((option) => option.item.id === "pistol")?.allowed, false);
assert.equal(zombieOptions.find((option) => option.item.id === "dagger")?.allowed, false);

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
assert.equal(shamanOptions.find((option) => option.item.id === "light-armour")?.allowed, false);
assert.equal(goblinOptions.find((option) => option.item.id === "mad-cap-mushrooms")?.allowed, true);
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
assert.equal(shadowWeaverOptions.find((option) => option.item.id === "elven-runestones")?.allowed, true);
assert.equal(shadowWarriorOptions.find((option) => option.item.id === "elf-bow")?.allowed, true);
assert.equal(shadowWarriorOptions.find((option) => option.item.id === "elven-runestones")?.allowed, false);

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
assert.equal(crestOptions.find((option) => option.item.id === "bone-helmet")?.allowed, false);
assert.equal(skinkOptions.find((option) => option.item.id === "javelin")?.allowed, true);
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
  const [sourceDocuments, equipmentItems, skillSeed, specialRules, hiredSwords, ruleReferences, witchHunters, mercenaries, sisters, carnival, skaven, undead, orcMob, shadowWarriors, lizardmen, forestGoblins] = await Promise.all([
    readJson("../src/data/sources.json"),
    readJson("../src/data/equipment.json"),
    readJson("../src/data/skills.json"),
    readJson("../src/data/specialRules.json"),
    readJson("../src/data/hiredSwords.json"),
    readJson("../src/data/ruleReferences.json"),
    readJson("../src/data/warbands/witch-hunters.json"),
    readJson("../src/data/warbands/mercenaries.json"),
    readJson("../src/data/warbands/sisters-of-sigmar.json"),
    readJson("../src/data/warbands/carnival-of-chaos.json"),
    readJson("../src/data/warbands/skaven.json"),
    readJson("../src/data/warbands/undead.json"),
    readJson("../src/data/warbands/orc-mob.json"),
    readJson("../src/data/warbands/shadow-warriors.json"),
    readJson("../src/data/warbands/lizardmen.json"),
    readJson("../src/data/warbands/forest-goblins.json")
  ]);
  const warbandSeed = warbandSeedSchema.parse(witchHunters);
  const sistersSeed = warbandSeedSchema.parse(sisters);
  const carnivalSeed = warbandSeedSchema.parse(carnival);
  const skavenSeed = warbandSeedSchema.parse(skaven);
  const undeadSeed = warbandSeedSchema.parse(undead);
  const orcMobSeed = warbandSeedSchema.parse(orcMob);
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
      equipmentListIds: [],
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
  return rulesDbSchema.parse({
    sourceDocuments,
    warbandTypes: [warbandSeed.warbandType, sistersSeed.warbandType, carnivalSeed.warbandType, skavenSeed.warbandType, undeadSeed.warbandType, orcMobSeed.warbandType, shadowWarriorsSeed.warbandType, lizardmenSeed.warbandType, forestGoblinsSeed.warbandType, ...mercenarySeed.warbandTypes],
    fighterTypes: [...warbandSeed.fighterTypes, ...sistersSeed.fighterTypes, ...carnivalSeed.fighterTypes, ...skavenSeed.fighterTypes, ...undeadSeed.fighterTypes, ...orcMobSeed.fighterTypes, ...shadowWarriorsSeed.fighterTypes, ...lizardmenSeed.fighterTypes, ...forestGoblinsSeed.fighterTypes, ...mercenarySeed.fighterTypes, ...hiredSwordFighterTypes],
    equipmentItems,
    equipmentLists: [...warbandSeed.equipmentLists, ...sistersSeed.equipmentLists, ...carnivalSeed.equipmentLists, ...skavenSeed.equipmentLists, ...undeadSeed.equipmentLists, ...orcMobSeed.equipmentLists, ...shadowWarriorsSeed.equipmentLists, ...lizardmenSeed.equipmentLists, ...forestGoblinsSeed.equipmentLists, ...mercenarySeed.equipmentLists],
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
