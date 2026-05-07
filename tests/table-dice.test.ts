import { describe, expect, it } from "vitest";
import rulesLookupSeed from "../src/data/rulesLookup.json";
import {
  createMultipleSeriousInjuryRoll,
  createTableRoll,
  findTableRowForRoll,
  getExplorationDiceSummary,
  parseDiceValues,
  rollExplorationFollowUp,
  type TableLookupRecord
} from "../src/rules/tableDice";

const records = rulesLookupSeed as TableLookupRecord[];

describe("smart table dice helpers", () => {
  it("matches D66 serious injury rolls to table rows", () => {
    const match = findTableRowForRoll(records, "table-serious-injuries", 31, "Heroes' Serious Injuries");

    expect(match?.result).toBe("Blinded In One Eye");
    expect(match?.effect).toContain("-1 Ballistic Skill");
  });

  it("creates deterministic D66 table roll results", () => {
    const randomValues = [0, 0.99];
    const roll = createTableRoll(
      records,
      { kind: "d66", recordId: "table-serious-injuries", tableCaption: "Heroes' Serious Injuries" },
      () => randomValues.shift() ?? 0
    );

    expect(roll.rollValue).toBe(16);
    expect(roll.result).toBe("Multiple Injuries");
    expect(roll.rowIndex).toBeGreaterThanOrEqual(0);
  });

  it("summarises exploration dice with shard totals and combinations", () => {
    const summary = getExplorationDiceSummary(records, [1, 3, 3, 6]);

    expect(summary.total).toBe(13);
    expect(summary.wyrdstoneShards).toBe(3);
    expect(summary.combinations.map((combo) => combo.label)).toContain("Doubles of 3s");
    expect(summary.combinations[0].result).toBe("Corpse");
    expect(summary.combinations[0].effect).toContain("Dagger");
  });

  it("parses comma-separated dice values and keeps a maximum of six dice", () => {
    expect(parseDiceValues("1, 2, 6, 7, bad, 3 4 5 6")).toEqual([1, 2, 6, 3, 4, 5]);
  });

  it("resolves Shop exploration follow-up rolls", () => {
    const summary = getExplorationDiceSummary(records, [2, 2, 5]);
    const followUp = rollExplorationFollowUp(summary.combinations[0], () => 0);

    expect(followUp.goldDelta).toBe(1);
    expect(followUp.outcome).toContain("Lucky Charm");
  });

  it("resolves Overturned Cart purse follow-up rolls", () => {
    const summary = getExplorationDiceSummary(records, [5, 5, 2, 3]);
    const randomValues = [0.4, 0.5, 0.8];
    const followUp = rollExplorationFollowUp(summary.combinations[0], () => randomValues.shift() ?? 0);

    expect(followUp.goldDelta).toBe(9);
    expect(followUp.outcome).toContain("purse");
  });

  it("resolves Shattered Building wyrdstone follow-up rolls", () => {
    const summary = getExplorationDiceSummary(records, [5, 5, 5, 5, 5, 1]);
    const randomValues = [0.99, 0];
    const followUp = rollExplorationFollowUp(summary.combinations[0], () => randomValues.shift() ?? 0);

    expect(followUp.wyrdstoneDelta).toBe(3);
    expect(followUp.outcome).toContain("Wardog");
  });

  it("rolls Multiple Injuries follow-ups and rerolls forbidden outcomes", () => {
    const randomValues = [
      0.34,
      0, 0.99,
      0.2, 0.2,
      0.99, 0,
      0.5, 0,
      0, 0.8,
      0.99, 0.5
    ];
    const result = createMultipleSeriousInjuryRoll(records, () => randomValues.shift() ?? 0);

    expect(result.countRoll).toBe(3);
    expect(result.rolls.map((roll) => roll.result)).toEqual(["Leg Wound", "Full Recovery", "Horrible Scars"]);
    expect(result.rolls.flatMap((roll) => roll.rerolled.map((reroll) => reroll.result))).toEqual([
      "Multiple Injuries",
      "Captured",
      "Dead"
    ]);
  });
});
