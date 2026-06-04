import type { EquipmentItem, Profile, Skill, SpecialRule } from "./types";

export type RollAssistMode = "closeCombat" | "shooting";
export type RollAssistArmourSave = 4 | 5 | 6 | null;
export type RollAssistEnemyWs = 1 | 2 | 3 | 4 | 5;
export type RollAssistEnemyToughness = 2 | 3 | 4 | 5;
export type RollAssistTargetState = "standing" | "knocked_down" | "stunned";
export type RollAssistRangeBand = "short" | "long";

export type RollAssistAttackProfile = {
  id: string;
  name: string;
  mode: RollAssistMode;
  strength: number;
  armourSaveModifier: number;
  ignoresArmourSave: boolean;
  supportsLongRange: boolean;
  notes: string[];
};

export type RollAssistAttacker = {
  name: string;
  profile: Pick<Profile, "WS" | "BS" | "S" | "W" | "A">;
  currentWounds?: number;
  closeCombatProfiles: RollAssistAttackProfile[];
  shootingProfiles: RollAssistAttackProfile[];
  equipment: Array<{ id: string; name: string }>;
  skills: string[];
  specialRules: string[];
};

export type RollAssistCloseCombatTarget = {
  ws: RollAssistEnemyWs;
  toughness: RollAssistEnemyToughness;
  armourSave: RollAssistArmourSave;
  state: RollAssistTargetState;
};

export type RollAssistShootingTarget = {
  toughness: RollAssistEnemyToughness;
  armourSave: RollAssistArmourSave;
};

export type CloseCombatContext = {
  weapon?: RollAssistAttackProfile;
};

export type ShootingContext = {
  weapon?: RollAssistAttackProfile;
  cover: boolean;
  range: RollAssistRangeBand;
  shooterMoved: boolean;
  largeTarget: boolean;
};

export type RollAssistModifier = {
  label: string;
  value: number;
};

export type RollAssistResult = {
  hitTarget: number | "auto";
  woundTarget: number;
  armourSaveTarget: number | null;
  injuryReminder: string;
  weapon: RollAssistAttackProfile;
  modifiers: RollAssistModifier[];
  explanation: string[];
};

type WeaponRuleOverride = Partial<Pick<RollAssistAttackProfile, "strength" | "armourSaveModifier" | "ignoresArmourSave" | "supportsLongRange">> & {
  notes?: string[];
};
type ResolvedWeaponRule = WeaponRuleOverride & { strength: number };

const CLOSE_COMBAT_WEAPON_OVERRIDES: Record<string, WeaponRuleOverride> = {
  axe: {
    armourSaveModifier: 1,
    notes: ["Axe adds an extra -1 armour save modifier."]
  },
  dagger: {
    armourSaveModifier: -1,
    notes: ["Dagger gives the defender +1 armour save."]
  },
  "double-handed-weapon": {
    strength: 0,
    notes: ["Double-handed weapon is treated as +2 Strength."]
  },
  "dwarf-axe": {
    armourSaveModifier: 1,
    notes: ["Dwarf axe adds an extra -1 armour save modifier."]
  },
  halberd: {
    strength: 0,
    notes: ["Halberd is treated as +1 Strength."]
  },
  lance: {
    strength: 0,
    notes: ["Lance is treated as +2 Strength on the charge."]
  },
  "morning-star": {
    strength: 0,
    notes: ["Morning star is treated as +1 Strength in the first round."]
  },
  "sigmarite-warhammer": {
    strength: 0,
    notes: ["Sigmarite warhammer is treated as +1 Strength."]
  }
};

const SHOOTING_WEAPON_OVERRIDES: Record<string, WeaponRuleOverride> = {
  "crossbow-pistol": {
    strength: 4,
    supportsLongRange: false
  },
  "duelling-pistol": {
    strength: 4,
    supportsLongRange: false
  },
  "elf-bow": {
    strength: 3,
    armourSaveModifier: 1,
    notes: ["Elf bow adds an extra -1 armour save modifier."]
  },
  handgun: {
    strength: 4
  },
  "hunting-rifle": {
    strength: 4
  },
  pistol: {
    strength: 4,
    supportsLongRange: false
  },
  "warplock-pistol": {
    strength: 5,
    supportsLongRange: false
  }
};

export function buildRollAssistAttacker(input: {
  name: string;
  profile: Pick<Profile, "WS" | "BS" | "S" | "W" | "A">;
  currentWounds?: number;
  equipment: EquipmentItem[];
  skills: Skill[];
  specialRules: SpecialRule[];
}): RollAssistAttacker {
  const closeCombatProfiles = uniqueProfiles([
    createFallbackCloseCombatProfile(input.profile.S),
    ...input.equipment
      .filter((item) => item.category === "close_combat")
      .map((item) => createAttackProfile(item, input.profile.S, "closeCombat"))
      .filter((item): item is RollAssistAttackProfile => Boolean(item))
  ]);
  const shootingProfiles = uniqueProfiles(
    input.equipment
      .filter((item) => item.category === "missile")
      .map((item) => createAttackProfile(item, input.profile.S, "shooting"))
      .filter((item): item is RollAssistAttackProfile => Boolean(item))
  );

  return {
    name: input.name,
    profile: input.profile,
    currentWounds: input.currentWounds,
    closeCombatProfiles: sortProfiles(closeCombatProfiles),
    shootingProfiles: sortProfiles(shootingProfiles),
    equipment: input.equipment.map((item) => ({ id: item.id, name: item.name })),
    skills: input.skills.map((skill) => skill.name),
    specialRules: input.specialRules.map((rule) => rule.name)
  };
}

export function calculateCloseCombatRoll(
  attacker: RollAssistAttacker,
  target: RollAssistCloseCombatTarget,
  context: CloseCombatContext = {}
): RollAssistResult {
  const weapon = context.weapon ?? attacker.closeCombatProfiles[0] ?? createFallbackCloseCombatProfile(attacker.profile.S);
  const autoHit = target.state === "knocked_down" || target.state === "stunned";
  const hitTarget = autoHit ? "auto" : getToHitCloseCombat(attacker.profile.WS, normalizeEnemyBracket(target.ws));
  const woundTarget = getToWound(weapon.strength, normalizeEnemyBracket(target.toughness));
  const armourSaveTarget = weapon.ignoresArmourSave
    ? null
    : applyArmourSaveModifier(target.armourSave, weapon.strength, weapon.armourSaveModifier);
  const explanation = [
    autoHit
      ? `${titleCase(target.state.replaceAll("_", " "))} targets are hit automatically in close combat.`
      : `Weapon Skill ${attacker.profile.WS} vs enemy WS ${formatBracketValue(target.ws, true)} needs ${hitTarget}+.`,
    `Strength ${weapon.strength} vs Toughness ${formatBracketValue(target.toughness, true)} wounds on ${woundTarget}+.`,
    explainArmourSave(target.armourSave, weapon)
  ];

  return {
    hitTarget,
    woundTarget,
    armourSaveTarget,
    injuryReminder: "If that was the target's last wound, roll on the injury chart.",
    weapon,
    modifiers: [],
    explanation: [...weapon.notes, ...explanation]
  };
}

export function calculateShootingRoll(
  attacker: RollAssistAttacker,
  target: RollAssistShootingTarget,
  context: ShootingContext
): RollAssistResult {
  const weapon = context.weapon ?? attacker.shootingProfiles[0] ?? createFallbackShootingProfile(attacker.profile.S);
  const modifiers: RollAssistModifier[] = [
    ...(context.cover ? [{ label: "Target in cover", value: -1 }] : []),
    ...(context.shooterMoved ? [{ label: "Moved and shot", value: -1 }] : []),
    ...(context.range === "long" ? [{ label: "Long range", value: -1 }] : []),
    ...(context.largeTarget ? [{ label: "Large target", value: 1 }] : [])
  ];
  const modifierTotal = modifiers.reduce((total, modifier) => total + modifier.value, 0);
  const hitTarget = getToHitShooting(attacker.profile.BS, modifierTotal);
  const woundTarget = getToWound(weapon.strength, normalizeEnemyBracket(target.toughness));
  const armourSaveTarget = weapon.ignoresArmourSave
    ? null
    : applyArmourSaveModifier(target.armourSave, weapon.strength, weapon.armourSaveModifier);

  return {
    hitTarget,
    woundTarget,
    armourSaveTarget,
    injuryReminder: "If that was the target's last wound, roll on the injury chart.",
    weapon,
    modifiers,
    explanation: [
      ...weapon.notes,
      `Ballistic Skill ${attacker.profile.BS} with ${formatModifierTotal(modifierTotal)} modifier hits on ${hitTarget}+${hitTarget > 6 ? " (7+ means a 6 followed by another roll)" : ""}.`,
      `Strength ${weapon.strength} vs Toughness ${formatBracketValue(target.toughness, true)} wounds on ${woundTarget}+.`,
      explainArmourSave(target.armourSave, weapon)
    ]
  };
}

export function getToHitCloseCombat(attackerWS: number, defenderWS: number): number {
  if (attackerWS > defenderWS) return 3;
  if (attackerWS * 2 <= defenderWS) return 5;
  return 4;
}

export function getToHitShooting(bs: number, modifiers = 0): number {
  return Math.max(2, 7 - bs - modifiers);
}

export function getToWound(strength: number, toughness: number): number {
  if (strength >= toughness * 2) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (strength * 2 <= toughness) return 6;
  return 5;
}

export function applyArmourSaveModifier(
  baseSave: RollAssistArmourSave,
  strength: number,
  weaponModifiers = 0
): number | null {
  if (baseSave === null) return null;
  const adjusted = baseSave + strengthArmourModifier(strength) + weaponModifiers;
  return adjusted > 6 ? null : Math.max(2, adjusted);
}

export function strengthArmourModifier(strength: number): number {
  if (strength <= 3) return 0;
  if (strength === 4) return 1;
  if (strength === 5) return 2;
  if (strength === 6) return 3;
  if (strength === 7) return 4;
  if (strength === 8) return 5;
  return 6;
}

function createAttackProfile(
  item: EquipmentItem,
  attackerStrength: number,
  mode: RollAssistMode
): RollAssistAttackProfile | undefined {
  const lowerId = item.id.toLowerCase();
  const lowerName = item.name.toLowerCase();
  const inferred = mode === "closeCombat"
    ? inferCloseCombatProfile(lowerId, lowerName, attackerStrength)
    : inferShootingProfile(lowerId, lowerName, attackerStrength);
  if (!inferred) return undefined;

  return {
    id: item.id,
    name: item.name,
    mode,
    strength: inferred.strength,
    armourSaveModifier: inferred.armourSaveModifier ?? 0,
    ignoresArmourSave: inferred.ignoresArmourSave ?? false,
    supportsLongRange: inferred.supportsLongRange ?? true,
    notes: inferred.notes ?? []
  };
}

function inferCloseCombatProfile(
  lowerId: string,
  lowerName: string,
  attackerStrength: number
): ResolvedWeaponRule | undefined {
  const override = CLOSE_COMBAT_WEAPON_OVERRIDES[lowerId];
  if (override) {
    return {
      ...override,
      strength: resolveCloseCombatStrength(lowerId, lowerName, attackerStrength)
    };
  }
  if (lowerName.includes("double-handed")) {
    return { strength: attackerStrength + 2 };
  }
  if (lowerName.includes("halberd")) {
    return { strength: attackerStrength + 1 };
  }
  if (lowerName.includes("sigmarite warhammer")) {
    return { strength: attackerStrength + 1 };
  }
  if (lowerName.includes("axe")) {
    return { strength: attackerStrength, armourSaveModifier: 1 };
  }
  if (lowerName.includes("dagger")) {
    return { strength: attackerStrength, armourSaveModifier: -1 };
  }
  return { strength: attackerStrength };
}

function inferShootingProfile(
  lowerId: string,
  lowerName: string,
  attackerStrength: number
): ResolvedWeaponRule | undefined {
  const override = SHOOTING_WEAPON_OVERRIDES[lowerId];
  if (override?.strength !== undefined) return override as ResolvedWeaponRule;
  if (lowerName.includes("throwing") || lowerName.includes("javelin")) {
    return { strength: attackerStrength };
  }
  if (lowerName.includes("crossbow")) {
    return { strength: 4 };
  }
  if (lowerName.includes("handgun") || lowerName.includes("rifle")) {
    return { strength: 4 };
  }
  if (lowerName.includes("pistol")) {
    return { strength: 4, supportsLongRange: false };
  }
  if (lowerName.includes("sling")) {
    return { strength: 3 };
  }
  if (lowerName.includes("bow")) {
    return { strength: 3 };
  }
  if (lowerName.includes("blowpipe")) {
    return { strength: 3 };
  }
  return { strength: 3 };
}

function resolveCloseCombatStrength(lowerId: string, lowerName: string, attackerStrength: number): number {
  if (lowerId === "double-handed-weapon" || lowerName.includes("double-handed")) return attackerStrength + 2;
  if (lowerId === "halberd" || lowerName.includes("halberd")) return attackerStrength + 1;
  if (lowerId === "sigmarite-warhammer" || lowerName.includes("sigmarite warhammer")) return attackerStrength + 1;
  if (lowerId === "lance" || lowerName.includes("lance")) return attackerStrength + 2;
  if (lowerId === "morning-star" || lowerName.includes("morning star")) return attackerStrength + 1;
  return attackerStrength;
}

function createFallbackCloseCombatProfile(attackerStrength: number): RollAssistAttackProfile {
  return {
    id: "default-close-combat",
    name: "Basic strike",
    mode: "closeCombat",
    strength: attackerStrength,
    armourSaveModifier: 0,
    ignoresArmourSave: false,
    supportsLongRange: true,
    notes: []
  };
}

function createFallbackShootingProfile(attackerStrength: number): RollAssistAttackProfile {
  return {
    id: "default-shooting",
    name: "Missile attack",
    mode: "shooting",
    strength: Math.max(3, attackerStrength),
    armourSaveModifier: 0,
    ignoresArmourSave: false,
    supportsLongRange: true,
    notes: []
  };
}

function uniqueProfiles(profiles: RollAssistAttackProfile[]): RollAssistAttackProfile[] {
  return Array.from(new Map(profiles.map((profile) => [profile.id, profile])).values());
}

function sortProfiles(profiles: RollAssistAttackProfile[]): RollAssistAttackProfile[] {
  return [...profiles].sort((left, right) => (
    right.strength - left.strength ||
    right.armourSaveModifier - left.armourSaveModifier ||
    left.name.localeCompare(right.name)
  ));
}

function normalizeEnemyBracket(value: number): number {
  return value >= 5 ? 5 : value;
}

function formatBracketValue(value: number, plusForFive = false): string {
  return value >= 5 && plusForFive ? "5+" : value.toString();
}

function explainArmourSave(baseSave: RollAssistArmourSave, weapon: RollAssistAttackProfile): string {
  if (weapon.ignoresArmourSave) return `${weapon.name} ignores armour saves.`;
  if (baseSave === null) return "Target has no armour save.";
  const finalSave = applyArmourSaveModifier(baseSave, weapon.strength, weapon.armourSaveModifier);
  if (finalSave === null) return `Base save ${baseSave}+ is reduced beyond 6+, so there is no save.`;
  return `Base save ${baseSave}+ becomes ${finalSave}+ after Strength and weapon modifiers.`;
}

function formatModifierTotal(modifierTotal: number): string {
  if (modifierTotal === 0) return "no";
  return modifierTotal > 0 ? `a +${modifierTotal}` : `${modifierTotal}`;
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
