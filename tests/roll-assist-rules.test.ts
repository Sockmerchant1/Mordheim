import { describe, expect, it } from "vitest";
import { rulesDb } from "../src/data/rulesDb";
import {
  applyArmourSaveModifier,
  buildRollAssistAttacker,
  calculateCloseCombatRoll,
  calculateShootingRoll,
  getToHitCloseCombat,
  getToHitShooting,
  getToWound
} from "../src/rules/rollAssist";

function equipmentById(id: string) {
  const item = rulesDb.equipmentItems.find((entry) => entry.id === id);
  if (!item) throw new Error(`Missing equipment item ${id}`);
  return item;
}

describe("roll assist rules", () => {
  it("uses the close combat weapon skill table", () => {
    expect(getToHitCloseCombat(4, 3)).toBe(3);
    expect(getToHitCloseCombat(3, 3)).toBe(4);
    expect(getToHitCloseCombat(2, 4)).toBe(5);
  });

  it("uses ballistic skill with modifiers for shooting", () => {
    expect(getToHitShooting(3, 0)).toBe(4);
    expect(getToHitShooting(3, -2)).toBe(6);
    expect(getToHitShooting(3, 1)).toBe(3);
  });

  it("uses the Mordheim strength versus toughness wound chart", () => {
    expect(getToWound(4, 2)).toBe(2);
    expect(getToWound(4, 3)).toBe(3);
    expect(getToWound(3, 3)).toBe(4);
    expect(getToWound(3, 4)).toBe(5);
    expect(getToWound(2, 4)).toBe(6);
  });

  it("applies armour save modifiers from strength and weapons", () => {
    expect(applyArmourSaveModifier(5, 4, 0)).toBe(6);
    expect(applyArmourSaveModifier(5, 4, 1)).toBeNull();
    expect(applyArmourSaveModifier(6, 3, -1)).toBe(5);
    expect(applyArmourSaveModifier(null, 5, 0)).toBeNull();
  });

  it("builds attacker weapon profiles from equipped gear", () => {
    const attacker = buildRollAssistAttacker({
      name: "Captain",
      profile: { WS: 4, BS: 4, S: 3, W: 1, A: 1 },
      equipment: [equipmentById("double-handed-weapon"), equipmentById("short-bow")],
      skills: [],
      specialRules: []
    });

    expect(attacker.closeCombatProfiles[0]).toMatchObject({
      id: "double-handed-weapon",
      strength: 5
    });
    expect(attacker.shootingProfiles[0]).toMatchObject({
      id: "short-bow",
      strength: 3
    });
  });

  it("calculates close combat rolls with auto-hit states and armour modifiers", () => {
    const attacker = buildRollAssistAttacker({
      name: "Warrior",
      profile: { WS: 4, BS: 3, S: 3, W: 1, A: 1 },
      equipment: [equipmentById("axe")],
      skills: [],
      specialRules: []
    });
    const result = calculateCloseCombatRoll(attacker, {
      ws: 3,
      toughness: 3,
      armourSave: 6,
      state: "standing"
    }, {
      weapon: attacker.closeCombatProfiles.find((profile) => profile.id === "axe")
    });
    const stunned = calculateCloseCombatRoll(attacker, {
      ws: 3,
      toughness: 3,
      armourSave: 6,
      state: "stunned"
    }, {
      weapon: attacker.closeCombatProfiles.find((profile) => profile.id === "axe")
    });

    expect(result.hitTarget).toBe(3);
    expect(result.woundTarget).toBe(4);
    expect(result.armourSaveTarget).toBeNull();
    expect(stunned.hitTarget).toBe("auto");
  });

  it("calculates shooting rolls with core Mordheim modifiers", () => {
    const attacker = buildRollAssistAttacker({
      name: "Marksman",
      profile: { WS: 3, BS: 3, S: 3, W: 1, A: 1 },
      equipment: [equipmentById("crossbow")],
      skills: [],
      specialRules: []
    });
    const result = calculateShootingRoll(attacker, {
      toughness: 4,
      armourSave: 5
    }, {
      weapon: attacker.shootingProfiles[0],
      cover: true,
      range: "long",
      shooterMoved: false,
      largeTarget: false
    });

    expect(result.hitTarget).toBe(6);
    expect(result.woundTarget).toBe(4);
    expect(result.armourSaveTarget).toBe(6);
  });
});
