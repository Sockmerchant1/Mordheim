import { describe, expect, it } from "vitest";
import {
  applyStatAdvance,
  canAdvanceStat,
  legalAdvanceStats,
  maximumProfileForFighterType,
  rollAdvance
} from "../src/rules/advancement";
import type { FighterType, Profile, RosterMember } from "../src/rules/types";

const humanProfile: Profile = { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 };

function randomSequence(values: number[]) {
  let index = 0;
  return () => values[index++] ?? 0;
}

function fighterType(profile: Profile = humanProfile): FighterType {
  return {
    id: "mercenary-warrior",
    warbandTypeId: "reiklanders",
    name: "Warrior",
    category: "henchman",
    minCount: 0,
    maxCount: null,
    groupMinSize: null,
    groupMaxSize: null,
    hireCost: 25,
    startingExperience: 0,
    profile,
    maximumProfile: maximumProfileForFighterType({
      ...fighterTypeWithoutMaximum(profile)
    }, "Human"),
    equipmentListIds: [],
    skillCategoryIds: [],
    specialRuleIds: [],
    canGainExperience: true,
    isLargeCreature: false,
    ratingOverride: null,
    validation: { requiredOneOfEquipmentItemIds: [], warbandMaxWarriorsBonus: 0, maxCountPerFighterTypeIds: [] },
    source: { sourceDocumentId: "core", sourceUrl: "https://example.com" }
  };
}

function fighterTypeWithoutMaximum(profile: Profile): FighterType {
  return {
    id: "mercenary-warrior",
    warbandTypeId: "reiklanders",
    name: "Warrior",
    category: "henchman",
    minCount: 0,
    maxCount: null,
    groupMinSize: null,
    groupMaxSize: null,
    hireCost: 25,
    startingExperience: 0,
    profile,
    equipmentListIds: [],
    skillCategoryIds: [],
    specialRuleIds: [],
    canGainExperience: true,
    isLargeCreature: false,
    ratingOverride: null,
    validation: { requiredOneOfEquipmentItemIds: [], warbandMaxWarriorsBonus: 0, maxCountPerFighterTypeIds: [] },
    source: { sourceDocumentId: "core", sourceUrl: "https://example.com" }
  };
}

function member(kind: RosterMember["kind"], currentProfile: Profile = humanProfile): RosterMember {
  return {
    id: "member-1",
    fighterTypeId: "mercenary-warrior",
    displayName: "Warrior",
    kind,
    groupSize: kind === "henchman_group" ? 3 : 1,
    currentProfile,
    startingXp: 0,
    currentXp: 0,
    experience: 0,
    advances: [],
    advancesTaken: [],
    injuries: [],
    equipment: [],
    skills: [],
    specialRules: [],
    castableDifficultyAdjustments: [],
    notes: "",
    status: "active"
  };
}

describe("advancement rolls", () => {
  it("maps hero 2D6 totals and follow-up rolls to the hero advance table", () => {
    const roll = rollAdvance("hero", randomSequence([0.34, 0.34, 0]));

    expect(roll.total).toBe(6);
    expect(roll.kind).toBe("stat");
    expect(roll.statOptions).toEqual(["S", "A"]);
    expect(roll.followUpDie).toBe(1);
    expect(roll.forcedStat).toBe("S");
  });

  it("maps henchman high totals to Lad's Got Talent", () => {
    const roll = rollAdvance("henchman", randomSequence([0.84, 0.84]));

    expect(roll.total).toBe(12);
    expect(roll.kind).toBe("lad");
    expect(roll.label).toBe("Lad's Got Talent");
  });

  it("applies characteristic advances without mutating the original profile", () => {
    const advanced = applyStatAdvance(humanProfile, "WS");

    expect(advanced.WS).toBe(4);
    expect(humanProfile.WS).toBe(3);
  });
});

describe("advancement legality", () => {
  it("blocks hero stat advances at the maximum profile", () => {
    const type = fighterType();
    const maxedHero = member("hero", { ...humanProfile, WS: type.maximumProfile!.WS });

    expect(canAdvanceStat(maxedHero, type, type.maximumProfile, "WS")).toBe(false);
    expect(legalAdvanceStats(maxedHero, type, type.maximumProfile, ["WS", "BS"])).toEqual(["BS"]);
  });

  it("blocks henchman group stats more than one over the initial profile", () => {
    const type = fighterType();
    const henchmen = member("henchman_group", { ...humanProfile, I: humanProfile.I + 1 });

    expect(canAdvanceStat(henchmen, type, type.maximumProfile, "I")).toBe(false);
  });

  it("keeps official maximums at least as high as unusual starting profiles", () => {
    const type = fighterTypeWithoutMaximum({ ...humanProfile, S: 5 });
    const maximum = maximumProfileForFighterType(type, "Human");

    expect(maximum.S).toBe(5);
    expect(maximum.WS).toBe(6);
  });
});
