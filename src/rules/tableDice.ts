export type TableRollKind = "d6" | "2d6" | "d66" | "exploration";

export type TableLookupTable = {
  caption?: string;
  columns: string[];
  rows: string[][];
};

export type TableLookupRecord = {
  id: string;
  name: string;
  tables?: TableLookupTable[];
};

export type TableRowMatch = {
  recordId: string;
  tableCaption?: string;
  tableIndex: number;
  rowIndex: number;
  row: string[];
  rangeLabel: string;
  result: string;
  effect?: string;
};

export type ExplorationCombination = {
  value: number;
  count: number;
  label: string;
  combination: string;
  result?: string;
  effect?: string;
  match?: TableRowMatch;
};

export type ExplorationDiceSummary = {
  diceValues: number[];
  total: number;
  wyrdstoneShards?: number;
  match?: TableRowMatch;
  combinations: ExplorationCombination[];
  description: string;
};

export type TableRollResult = {
  kind: TableRollKind;
  recordId?: string;
  tableCaption?: string;
  tableIndex?: number;
  rowIndex?: number;
  rangeLabel?: string;
  diceValues: number[];
  rollValue: number;
  total: number;
  rollLabel: string;
  result: string;
  effect?: string;
  wyrdstoneShards?: number;
  specialResults?: string[];
};

export type FollowUpSeriousInjuryRoll = TableRollResult & {
  sequence: number;
  rerolled: TableRollResult[];
};

export type ExplorationFollowUpResult = {
  combination: string;
  label: string;
  resultName?: string;
  diceValues: number[];
  total?: number;
  outcome: string;
  goldDelta?: number;
  wyrdstoneDelta?: number;
};

const FORBIDDEN_MULTIPLE_INJURY_RESULTS = new Set(["Dead", "Captured", "Multiple Injuries"]);

export function rollD6(random = Math.random) {
  return Math.floor(random() * 6) + 1;
}

export function rollD3(random = Math.random) {
  return Math.ceil(rollD6(random) / 2);
}

export function rollD6s(count: number, random = Math.random) {
  return Array.from({ length: clampDiceCount(count) }, () => rollD6(random));
}

export function hasExplorationFollowUp(combo: ExplorationCombination) {
  return new Set([
    "1 1",
    "2 2",
    "3 3",
    "4 4",
    "5 5",
    "6 6",
    "1 1 1",
    "2 2 2",
    "3 3 3",
    "4 4 4",
    "5 5 5",
    "1 1 1 1",
    "2 2 2 2",
    "3 3 3 3",
    "4 4 4 4",
    "5 5 5 5",
    "1 1 1 1 1",
    "2 2 2 2 2",
    "3 3 3 3 3",
    "4 4 4 4 4",
    "5 5 5 5 5",
    "1 1 1 1 1 1",
    "2 2 2 2 2 2",
    "3 3 3 3 3 3",
    "4 4 4 4 4 4",
    "6 6 6 6 6 6"
  ]).has(combo.combination);
}

export function rollExplorationFollowUp(combo: ExplorationCombination, random = Math.random): ExplorationFollowUpResult {
  const result = (outcome: string, diceValues: number[] = [], extras: Partial<ExplorationFollowUpResult> = {}): ExplorationFollowUpResult => ({
    combination: combo.combination,
    label: combo.label,
    resultName: combo.result,
    diceValues,
    total: diceValues.length ? sum(diceValues) : undefined,
    outcome,
    ...extras
  });

  switch (combo.combination) {
    case "1 1": {
      const toughnessRoll = rollD6(random);
      return result(
        `Choose a Hero. Toughness test roll ${toughnessRoll}: if this is equal to or below the Hero's Toughness, record 1 extra wyrdstone shard; otherwise that Hero misses the next game.`,
        [toughnessRoll]
      );
    }
    case "2 2": {
      const goldRoll = rollD6(random);
      const charmText = goldRoll === 1 ? " Also found a Lucky Charm." : "";
      return result(`Gain ${goldRoll} gc from the Shop.${charmText}`, [goldRoll], { goldDelta: goldRoll });
    }
    case "3 3": {
      const tableRoll = rollD6(random);
      if (tableRoll <= 2) {
        const goldRoll = rollD6(random);
        return result(`Corpse roll ${tableRoll}: gain ${goldRoll} gc.`, [tableRoll, goldRoll], { goldDelta: goldRoll });
      }
      const outcomes: Record<number, string> = {
        3: "Corpse roll 3: find a Dagger.",
        4: "Corpse roll 4: find an Axe.",
        5: "Corpse roll 5: find a Sword.",
        6: "Corpse roll 6: find a suit of Light Armour."
      };
      return result(outcomes[tableRoll] ?? `Corpse roll ${tableRoll}: resolve manually.`, [tableRoll]);
    }
    case "4 4": {
      const skavenGold = rollDiceTotal(2, random);
      return result(
        `Faction-specific Straggler result. If Skaven, gain ${skavenGold.total} gc (${skavenGold.diceValues.join(", ")}). Possessed, Undead and other warbands resolve their listed option manually.`,
        skavenGold.diceValues
      );
    }
    case "5 5": {
      const tableRoll = rollD6(random);
      if (tableRoll <= 2) return result(`Overturned Cart roll ${tableRoll}: find a Mordheim Map.`, [tableRoll]);
      if (tableRoll <= 4) {
        const purse = rollDiceTotal(2, random);
        return result(
          `Overturned Cart roll ${tableRoll}: purse contains ${purse.total} gc (${purse.diceValues.join(", ")}).`,
          [tableRoll, ...purse.diceValues],
          { goldDelta: purse.total }
        );
      }
      return result(`Overturned Cart roll ${tableRoll}: find a jewelled sword and dagger; keep or sell as your campaign allows.`, [tableRoll]);
    }
    case "6 6": {
      const goldRoll = rollD6(random);
      return result(`Gain ${goldRoll} gc from the ruined hovels.`, [goldRoll], { goldDelta: goldRoll });
    }
    case "1 1 1": {
      const passed = rollDiceTotal(4, random);
      const failed = rollD6(random);
      return result(
        `Resolve the Leader test manually. If passed, gain ${passed.total} gc (${passed.diceValues.join(", ")}). If failed, gain ${failed} gc.`,
        [...passed.diceValues, failed]
      );
    }
    case "2 2 2": {
      const tableRoll = rollD6(random);
      if (tableRoll === 4) {
        const count = rollD3(random);
        return result(`Smithy roll 4: find ${count} Halberd${count === 1 ? "" : "s"}.`, [tableRoll, countToD3Die(count)]);
      }
      if (tableRoll === 6) {
        const gold = rollDiceTotal(2, random);
        return result(`Smithy roll 6: gain ${gold.total} gc (${gold.diceValues.join(", ")}).`, [tableRoll, ...gold.diceValues], { goldDelta: gold.total });
      }
      const outcomes: Record<number, string> = {
        1: "Smithy roll 1: find a Sword.",
        2: "Smithy roll 2: find a Double-handed weapon.",
        3: "Smithy roll 3: find a Flail.",
        5: "Smithy roll 5: find a Lance."
      };
      return result(outcomes[tableRoll] ?? `Smithy roll ${tableRoll}: resolve manually.`, [tableRoll]);
    }
    case "3 3 3": {
      const possessedXp = rollD3(random);
      const skavenGold = rollDiceTotal(3, random);
      const otherGold = rollDiceTotal(2, random);
      return result(
        `Faction-specific Prisoners result. Possessed option: ${possessedXp} XP. Skaven option: ${skavenGold.total} gc (${skavenGold.diceValues.join(", ")}). Other warbands option: ${otherGold.total} gc (${otherGold.diceValues.join(", ")}) and the listed Henchman choice.`,
        [countToD3Die(possessedXp), ...skavenGold.diceValues, ...otherGold.diceValues]
      );
    }
    case "4 4 4": {
      const tableRoll = rollD6(random);
      const amount = tableRoll <= 4 || tableRoll === 6 ? rollD3(random) : undefined;
      const item = tableRoll <= 2 ? "Short Bow" : tableRoll === 3 ? "Bow" : tableRoll === 4 ? "Long Bow" : tableRoll === 5 ? "Quiver of Hunting Arrows" : "Crossbow";
      return result(
        amount ? `Fletcher roll ${tableRoll}: find ${amount} ${item}${amount === 1 ? "" : "s"}.` : `Fletcher roll ${tableRoll}: find a ${item}.`,
        [tableRoll, ...(amount ? [countToD3Die(amount)] : [])]
      );
    }
    case "5 5 5": {
      const gold = rollDiceTotal(2, random);
      return result(`Market Hall loot is worth ${gold.total} gc (${gold.diceValues.join(", ")}).`, gold.diceValues, { goldDelta: gold.total });
    }
    case "1 1 1 1": {
      const tableRoll = rollD6(random);
      const amount = tableRoll === 4 || tableRoll === 5 ? rollD3(random) : undefined;
      const outcomes: Record<number, string> = {
        1: "Gunsmith roll 1: find a Blunderbuss.",
        2: "Gunsmith roll 2: find a Brace of Pistols.",
        3: "Gunsmith roll 3: find a Brace of Duelling Pistols.",
        4: `Gunsmith roll 4: find ${amount} Handgun${amount === 1 ? "" : "s"}.`,
        5: `Gunsmith roll 5: find ${amount} Superior Blackpowder.`,
        6: "Gunsmith roll 6: find a Hochland Long Rifle."
      };
      return result(outcomes[tableRoll] ?? `Gunsmith roll ${tableRoll}: resolve manually.`, [tableRoll, ...(amount ? [countToD3Die(amount)] : [])]);
    }
    case "2 2 2 2": {
      const gold = rollDiceTotal(3, random);
      return result(`Shrine income is ${gold.total} gc (${gold.diceValues.join(", ")}). Sisters of Sigmar and Witch Hunters may also record the listed blessed-weapon option.`, gold.diceValues, { goldDelta: gold.total });
    }
    case "3 3 3 3": {
      const gold = rollDiceTotal(3, random);
      return result(`Townhouse loot is worth ${gold.total} gc (${gold.diceValues.join(", ")}).`, gold.diceValues, { goldDelta: gold.total });
    }
    case "4 4 4 4": {
      const tableRoll = rollD6(random);
      const amount = tableRoll <= 5 ? rollD3(random) : undefined;
      const item = tableRoll <= 2 ? "Shield or Buckler" : tableRoll === 3 ? "Helmet" : tableRoll === 4 ? "Light Armour" : tableRoll === 5 ? "Heavy Armour" : "Ithilmar Armour";
      return result(
        amount ? `Armourer roll ${tableRoll}: find ${amount} ${item}${amount === 1 ? "" : "s"}.` : `Armourer roll ${tableRoll}: find ${item}.`,
        [tableRoll, ...(amount ? [countToD3Die(amount)] : [])]
      );
    }
    case "5 5 5 5": {
      const gold = rollD6(random) * 10;
      const xp = rollD6(random);
      return result(`Graveyard choice: most warbands may loot ${gold} gc; Sisters or Witch Hunters may instead distribute ${xp} XP among Heroes.`, [gold / 10, xp]);
    }
    case "1 1 1 1 1": {
      const gold = rollD6(random) * 10;
      return result(`Moneylender's House contains ${gold} gc.`, [gold / 10], { goldDelta: gold });
    }
    case "2 2 2 2 2": {
      const gold = rollDiceTotal(3, random);
      return result(`Alchemist's Laboratory contains ${gold.total} gc (${gold.diceValues.join(", ")}). Record the Academic skill access note for one Hero if used.`, gold.diceValues, { goldDelta: gold.total });
    }
    case "3 3 3 3 3": {
      const tableRoll = rollD6(random);
      if (tableRoll <= 2) {
        const value = rollD6(random) * 5;
        return result(`Jewelsmith roll ${tableRoll}: quartz worth ${value} gc.`, [tableRoll, value / 5], { goldDelta: value });
      }
      if (tableRoll <= 4) return result(`Jewelsmith roll ${tableRoll}: amethyst worth 20 gc.`, [tableRoll], { goldDelta: 20 });
      if (tableRoll === 5) return result("Jewelsmith roll 5: necklace worth 50 gc.", [tableRoll], { goldDelta: 50 });
      const value = rollD6(random) * 15;
      return result(`Jewelsmith roll 6: ruby worth ${value} gc.`, [tableRoll, value / 15], { goldDelta: value });
    }
    case "4 4 4 4 4": {
      const money = rollDiceTotal(2, random);
      if (money.diceValues[0] === money.diceValues[1]) {
        return result(`Merchant's House money roll is a double (${money.diceValues.join(", ")}). Record the Order of Freetraders symbol result and Haggle for one Hero.`, money.diceValues);
      }
      const value = money.total * 5;
      return result(`Merchant's House contains ${value} gc (${money.diceValues.join(", ")} x 5).`, money.diceValues, { goldDelta: value });
    }
    case "5 5 5 5 5": {
      const shards = rollD3(random);
      const leaderRoll = rollD6(random);
      return result(`Shattered Building gives ${shards} wyrdstone shard${shards === 1 ? "" : "s"}. Leader test roll ${leaderRoll}: if passed, a Wardog joins the warband.`, [countToD3Die(shards), leaderRoll], { wyrdstoneDelta: shards });
    }
    case "1 1 1 1 1 1": {
      const pitRoll = rollD6(random);
      if (pitRoll === 1) return result("Pit roll 1: the chosen Hero is lost. Record the injury/update manually.", [pitRoll]);
      const shards = rollD6(random) + 1;
      return result(`Pit roll ${pitRoll}: the Hero returns with ${shards} wyrdstone shards.`, [pitRoll, shards - 1], { wyrdstoneDelta: shards });
    }
    case "2 2 2 2 2 2": {
      const wyrdstoneCheck = rollD6(random);
      const wyrdstone = wyrdstoneCheck >= 4 ? rollD3(random) : 0;
      const gold = rollDiceTotal(5, random);
      const checks = [
        rollChance("Holy Relic", 5, random),
        rollChance("Heavy Armour", 5, random),
        rollChance("D3 gems", 4, random),
        rollChance("Elven Cloak", 5, random),
        rollChance("Holy Tome", 5, random),
        rollChance("Magical Artefact", 5, random)
      ];
      const diceValues = [wyrdstoneCheck, ...(wyrdstone ? [countToD3Die(wyrdstone)] : []), ...gold.diceValues, ...checks.map((check) => check.roll)];
      return result(
        `Hidden Treasure: ${wyrdstone ? `${wyrdstone} wyrdstone shard${wyrdstone === 1 ? "" : "s"}` : "no extra wyrdstone"}; ${gold.total * 5} gc; ${checks.map((check) => `${check.name} ${check.success ? "found" : "not found"} (${check.roll})`).join(", ")}.`,
        diceValues,
        { goldDelta: gold.total * 5, wyrdstoneDelta: wyrdstone }
      );
    }
    case "3 3 3 3 3 3": {
      const tableRoll = rollD6(random);
      const amount = tableRoll <= 2 ? rollD3(random) : undefined;
      const outcomes: Record<number, string> = {
        1: `Dwarf Smithy roll 1: find ${amount} Double-handed axe${amount === 1 ? "" : "s"}.`,
        2: `Dwarf Smithy roll 2: find ${amount} Heavy Armour.`,
        3: "Dwarf Smithy roll 3: find a Gromril Axe.",
        4: "Dwarf Smithy roll 4: find a Gromril Hammer.",
        5: "Dwarf Smithy roll 5: find a Double-handed Gromril Axe.",
        6: "Dwarf Smithy roll 6: find Gromril Armour."
      };
      return result(outcomes[tableRoll] ?? `Dwarf Smithy roll ${tableRoll}: resolve manually.`, [tableRoll, ...(amount ? [countToD3Die(amount)] : [])]);
    }
    case "4 4 4 4 4 4": {
      const gold = rollDiceTotal(3, random);
      const lightArmourCheck = rollChance("D3 Light Armour", 4, random);
      const lightArmourAmount = lightArmourCheck.success ? rollD3(random) : 0;
      const checks = [
        lightArmourCheck,
        rollChance("Heavy Armour", 5, random),
        rollChance("Mordheim Map", 4, random),
        rollChance("D3 Halberds", 5, random),
        rollChance("D3 Swords", 3, random),
        rollChance("D3 Shields", 2, random),
        rollChance("D3 Bows", 4, random),
        rollChance("D3 Helmets", 2, random)
      ];
      const daggerCount = rollD6(random);
      const diceValues = [
        ...gold.diceValues,
        lightArmourCheck.roll,
        ...(lightArmourAmount ? [countToD3Die(lightArmourAmount)] : []),
        ...checks.slice(1).map((check) => check.roll),
        daggerCount
      ];
      const armourText = lightArmourAmount ? `${lightArmourAmount} Light Armour found` : "D3 Light Armour not found";
      return result(
        `Slaughtered Warband: ${gold.total * 5} gc; ${armourText}; ${daggerCount} Daggers; ${checks.slice(1).map((check) => `${check.name} ${check.success ? "found" : "not found"} (${check.roll})`).join(", ")}.`,
        diceValues,
        { goldDelta: gold.total * 5 }
      );
    }
    case "6 6 6 6 6 6": {
      const tableRoll = rollD6(random);
      if (tableRoll <= 2) {
        const gold = rollD6(random) * 10;
        return result(`Noble's Villa roll ${tableRoll}: gain ${gold} gc.`, [tableRoll, gold / 10], { goldDelta: gold });
      }
      if (tableRoll <= 4) {
        const vials = rollD6(random);
        return result(`Noble's Villa roll ${tableRoll}: gain ${vials} vial${vials === 1 ? "" : "s"} of Crimson Shade.`, [tableRoll, vials]);
      }
      return result(`Noble's Villa roll ${tableRoll}: roll on the Magical Artefacts table.`, [tableRoll]);
    }
    default:
      return result(combo.effect ? `Resolve manually: ${combo.effect}` : "No follow-up roll is listed for this result.");
  }
}

export function rollD66Detailed(random = Math.random) {
  const diceValues = rollD6s(2, random);
  return {
    diceValues,
    value: diceValues[0] * 10 + diceValues[1]
  };
}

export function createTableRoll(
  records: TableLookupRecord[],
  options: {
    kind: TableRollKind;
    recordId?: string;
    tableCaption?: string;
    diceCount?: number;
  },
  random = Math.random
): TableRollResult {
  if (options.kind === "d66") {
    const roll = rollD66Detailed(random);
    return tableRollResult(records, options, roll.diceValues, roll.value, `D66 ${roll.value} (${roll.diceValues.join(", ")})`);
  }

  if (options.kind === "2d6") {
    const diceValues = rollD6s(2, random);
    const total = diceValues.reduce((sum, value) => sum + value, 0);
    return tableRollResult(records, options, diceValues, total, `2D6 ${total} (${diceValues.join(", ")})`);
  }

  if (options.kind === "exploration") {
    const diceValues = rollD6s(options.diceCount ?? 1, random);
    const summary = getExplorationDiceSummary(records, diceValues, options.recordId, options.tableCaption);
    return {
      kind: options.kind,
      recordId: options.recordId,
      tableCaption: summary.match?.tableCaption ?? options.tableCaption,
      tableIndex: summary.match?.tableIndex,
      rowIndex: summary.match?.rowIndex,
      rangeLabel: summary.match?.rangeLabel,
      diceValues,
      rollValue: summary.total,
      total: summary.total,
      rollLabel: `Exploration ${diceValues.join(", ")} = ${summary.total}`,
      result: summary.wyrdstoneShards === undefined ? "No shard result found" : `${summary.wyrdstoneShards} wyrdstone shards`,
      effect: summary.description,
      wyrdstoneShards: summary.wyrdstoneShards,
      specialResults: summary.combinations.map(formatExplorationCombination)
    };
  }

  const diceValues = [rollD6(random)];
  return tableRollResult(records, options, diceValues, diceValues[0], `D6 ${diceValues[0]}`);
}

export function createMultipleSeriousInjuryRoll(
  records: TableLookupRecord[],
  random = Math.random
): {
  countRoll: number;
  rolls: FollowUpSeriousInjuryRoll[];
} {
  const countRoll = rollD6(random);
  return {
    countRoll,
    rolls: createSeriousInjuryFollowUpRolls(records, countRoll, random)
  };
}

export function createSeriousInjuryFollowUpRolls(
  records: TableLookupRecord[],
  count: number,
  random = Math.random
): FollowUpSeriousInjuryRoll[] {
  return Array.from({ length: clampDiceCount(count) }, (_, index) => createAllowedSeriousInjuryRoll(records, index + 1, random));
}

export function findTableRowForRoll(
  records: TableLookupRecord[],
  recordId: string,
  rollValue: number,
  tableCaption?: string
): TableRowMatch | undefined {
  const record = records.find((item) => item.id === recordId);
  if (!record?.tables?.length) return undefined;

  for (let tableIndex = 0; tableIndex < record.tables.length; tableIndex += 1) {
    const table = record.tables[tableIndex];
    if (tableCaption && table.caption !== tableCaption) continue;

    for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
      const row = table.rows[rowIndex];
      const rangeLabel = row[0] ?? "";
      if (!rollMatchesRangeLabel(rangeLabel, rollValue)) continue;

      return {
        recordId,
        tableCaption: table.caption,
        tableIndex,
        rowIndex,
        row,
        rangeLabel,
        result: row[1] ?? "",
        effect: row[2]
      };
    }
  }

  return undefined;
}

export function findExplorationCombinationMatch(
  records: TableLookupRecord[],
  recordId: string,
  value: number,
  count: number
): TableRowMatch | undefined {
  const record = records.find((item) => item.id === recordId);
  if (!record?.tables?.length || count < 2) return undefined;
  const combination = combinationValueLabel(value, count);

  for (let tableIndex = 0; tableIndex < record.tables.length; tableIndex += 1) {
    const table = record.tables[tableIndex];
    if (!table.caption?.startsWith("Exploration Chart")) continue;
    for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
      const row = table.rows[rowIndex];
      if (row[0] !== combination) continue;
      return {
        recordId,
        tableCaption: table.caption,
        tableIndex,
        rowIndex,
        row,
        rangeLabel: row[0],
        result: row[1] ?? "",
        effect: row[2]
      };
    }
  }

  return undefined;
}

function createAllowedSeriousInjuryRoll(
  records: TableLookupRecord[],
  sequence: number,
  random = Math.random
): FollowUpSeriousInjuryRoll {
  const rerolled: TableRollResult[] = [];

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const roll = createTableRoll(records, {
      kind: "d66",
      recordId: "table-serious-injuries",
      tableCaption: "Heroes' Serious Injuries"
    }, random);

    if (!FORBIDDEN_MULTIPLE_INJURY_RESULTS.has(roll.result) || attempt === 29) {
      return { ...roll, sequence, rerolled };
    }

    rerolled.push(roll);
  }

  throw new Error("Unable to resolve serious injury follow-up roll.");
}

export function getExplorationDiceSummary(
  records: TableLookupRecord[],
  diceValues: number[],
  recordId = "table-exploration",
  tableCaption = "Number Of Wyrdstone Shards Found"
): ExplorationDiceSummary {
  const validDice = diceValues.filter((value) => Number.isInteger(value) && value >= 1 && value <= 6).slice(0, 6);
  const total = validDice.reduce((sum, value) => sum + value, 0);
  const match = total > 0 ? findTableRowForRoll(records, recordId, total, tableCaption) : undefined;
  const wyrdstoneShards = match ? Number(match.result) : undefined;
  const combinations = getExplorationCombinations(validDice, records, recordId);
  const comboDescription = combinations.length
    ? combinations.map((combo) => combo.result ? `${combo.label}: ${combo.result}` : combo.label).join(", ")
    : "no doubles or triples";
  const shardDescription = wyrdstoneShards === undefined ? "no shard row matched" : `${wyrdstoneShards} wyrdstone shards`;

  return {
    diceValues: validDice,
    total,
    wyrdstoneShards,
    match,
    combinations,
    description: validDice.length ? `${total} total, ${shardDescription}; ${comboDescription}` : "No dice recorded"
  };
}

export function getExplorationCombinations(diceValues: number[], records: TableLookupRecord[] = [], recordId = "table-exploration") {
  const counts = diceValues.reduce<Record<number, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([value, count]) => ({ value: Number(value), count }))
    .filter((entry) => entry.count >= 2)
    .sort((a, b) => b.count - a.count || b.value - a.value)
    .map((entry): ExplorationCombination => ({
      ...entry,
      label: `${combinationLabel(entry.count)} of ${entry.value}s`,
      combination: combinationValueLabel(entry.value, entry.count),
      ...explorationMatchFields(findExplorationCombinationMatch(records, recordId, entry.value, entry.count))
    }));
}

export function formatExplorationCombination(combo: ExplorationCombination) {
  const prefix = `${combo.label}${combo.result ? ` - ${combo.result}` : ""}`;
  return combo.effect ? `${prefix}: ${combo.effect}` : prefix;
}

export function parseDiceValues(value: string) {
  return value
    .split(/[,\s]+/)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 6)
    .slice(0, 6);
}

export function rollMatchesRangeLabel(label: string, rollValue: number) {
  const cleaned = label.trim();
  const range = cleaned.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    return rollValue >= min && rollValue <= max;
  }

  const plus = cleaned.match(/^(\d+)\+$/);
  if (plus) return rollValue >= Number(plus[1]);

  const exact = cleaned.match(/^\d+$/);
  if (exact) return rollValue === Number(cleaned);

  return false;
}

function tableRollResult(
  records: TableLookupRecord[],
  options: {
    kind: TableRollKind;
    recordId?: string;
    tableCaption?: string;
  },
  diceValues: number[],
  rollValue: number,
  rollLabel: string
): TableRollResult {
  const match = options.recordId ? findTableRowForRoll(records, options.recordId, rollValue, options.tableCaption) : undefined;
  return {
    kind: options.kind,
    recordId: options.recordId,
    tableCaption: match?.tableCaption ?? options.tableCaption,
    tableIndex: match?.tableIndex,
    rowIndex: match?.rowIndex,
    rangeLabel: match?.rangeLabel,
    diceValues,
    rollValue,
    total: diceValues.reduce((sum, value) => sum + value, 0),
    rollLabel,
    result: match?.result ?? `Total ${rollValue}`,
    effect: match?.effect
  };
}

function combinationLabel(count: number) {
  if (count === 2) return "Doubles";
  if (count === 3) return "Triples";
  if (count === 4) return "Four of a kind";
  if (count === 5) return "Five of a kind";
  return "Six of a kind";
}

function combinationValueLabel(value: number, count: number) {
  return Array.from({ length: count }, () => value).join(" ");
}

function explorationMatchFields(match?: TableRowMatch) {
  if (!match) return {};
  return {
    result: match.result,
    effect: match.effect,
    match
  };
}

function rollDiceTotal(count: number, random = Math.random) {
  const diceValues = rollD6s(count, random);
  return {
    diceValues,
    total: sum(diceValues)
  };
}

function rollChance(name: string, target: number, random = Math.random) {
  const roll = rollD6(random);
  return {
    name,
    roll,
    success: roll >= target
  };
}

function countToD3Die(value: number) {
  return value;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function clampDiceCount(count: number) {
  const safeCount = Number.isFinite(count) ? count : 1;
  return Math.max(1, Math.min(6, Math.floor(safeCount)));
}
