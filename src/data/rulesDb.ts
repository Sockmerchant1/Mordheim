import equipmentItems from "./equipment.json";
import hiredSwords from "./hiredSwords.json";
import ruleReferences from "./ruleReferences.json";
import skillsSeed from "./skills.json";
import sourceDocuments from "./sources.json";
import specialRules from "./specialRules.json";
import beastmenRaiders from "./warbands/beastmen-raiders.json";
import blackOrcs from "./warbands/black-orcs.json";
import carnivalOfChaos from "./warbands/carnival-of-chaos.json";
import dwarfTreasureHunters from "./warbands/dwarf-treasure-hunters.json";
import forestGoblins from "./warbands/forest-goblins.json";
import lizardmen from "./warbands/lizardmen.json";
import mercenaries from "./warbands/mercenaries.json";
import orcMob from "./warbands/orc-mob.json";
import shadowWarriors from "./warbands/shadow-warriors.json";
import sistersOfSigmar from "./warbands/sisters-of-sigmar.json";
import skaven from "./warbands/skaven.json";
import skavenPestilens from "./warbands/skaven-pestilens.json";
import undead from "./warbands/undead.json";
import witchHunters from "./warbands/witch-hunters.json";
import warbandIndexSeed from "./warbandIndex.json";
import { hiredSwordSchema, rulesDbSchema, warbandSeedCollectionSchema, warbandSeedSchema } from "../rules/schemas";
import type { EquipmentList, FighterType, RulesDb } from "../rules/types";

const warbandSeeds = [
  warbandSeedSchema.parse(witchHunters),
  warbandSeedSchema.parse(sistersOfSigmar),
  warbandSeedSchema.parse(carnivalOfChaos),
  warbandSeedSchema.parse(skaven),
  warbandSeedSchema.parse(undead),
  warbandSeedSchema.parse(orcMob),
  warbandSeedSchema.parse(beastmenRaiders),
  warbandSeedSchema.parse(blackOrcs),
  warbandSeedSchema.parse(dwarfTreasureHunters),
  warbandSeedSchema.parse(shadowWarriors),
  warbandSeedSchema.parse(lizardmen),
  warbandSeedSchema.parse(forestGoblins),
  warbandSeedSchema.parse(skavenPestilens)
];
const warbandSeedCollections = [warbandSeedCollectionSchema.parse(mercenaries)];
const parsedHiredSwords = hiredSwordSchema.array().parse(hiredSwords);
const hiredSwordFighterTypes: FighterType[] = parsedHiredSwords
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
    profile: hiredSword.profile!,
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
const hiredSwordEquipmentLists: EquipmentList[] = parsedHiredSwords
  .filter((hiredSword) => hiredSword.profile)
  .map((hiredSword) => ({
    id: `hired-sword-${hiredSword.id}-equipment`,
    name: `${hiredSword.name} Fixed Equipment`,
    warbandTypeId: "hired-swords",
    allowedEquipmentItemIds: Array.from(new Set(hiredSword.equipmentItemIds)),
    appliesToFighterTypeIds: [`hired-sword-${hiredSword.id}`],
    notes: "Fixed equipment from this Hired Sword's source entry. Players cannot buy extra equipment for hired swords."
  }));

export const rulesDb: RulesDb = rulesDbSchema.parse({
  sourceDocuments,
  warbandTypes: [
    ...warbandSeeds.map((seed) => seed.warbandType),
    ...warbandSeedCollections.flatMap((seed) => seed.warbandTypes)
  ],
  fighterTypes: [
    ...warbandSeeds.flatMap((seed) => seed.fighterTypes),
    ...warbandSeedCollections.flatMap((seed) => seed.fighterTypes),
    ...hiredSwordFighterTypes
  ],
  equipmentItems,
  equipmentLists: [
    ...warbandSeeds.flatMap((seed) => seed.equipmentLists),
    ...warbandSeedCollections.flatMap((seed) => seed.equipmentLists),
    ...hiredSwordEquipmentLists
  ],
  skillCategories: skillsSeed.categories,
  skills: skillsSeed.skills,
  specialRules,
  hiredSwords: parsedHiredSwords,
  ruleReferences
});

export type WarbandIndexRecord = {
  id: string;
  name: string;
  race: string;
  broheimGrade: string;
  broheimGradeLabel: string;
  isOfficial: boolean;
  sourceCode: string;
  sourceUrl: string;
  implementationStatus: "not_started" | "extracted" | "reviewed" | "implemented" | "tested";
};

export const warbandIndex = warbandIndexSeed as {
  sourceUrl: string;
  extractedAt: string;
  warbands: WarbandIndexRecord[];
};
