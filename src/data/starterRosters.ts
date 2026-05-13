import {
  calculateRosterCost,
  calculateWarbandRating,
  createRosterMemberFromType
} from "../rules/engine.ts";
import type { Roster, RosterMember, RulesDb } from "../rules/types.ts";

export type StarterRosterMemberTemplate = {
  fighterTypeId: string;
  displayName: string;
  groupSize?: number;
  equipment?: string[];
  skills?: string[];
  specialRules?: string[];
  notes?: string;
};

export type StarterRosterTemplate = {
  id: string;
  warbandTypeId: string;
  name: string;
  summary: string;
  playStyle: string;
  members: StarterRosterMemberTemplate[];
};

export const starterRosterTemplates: StarterRosterTemplate[] = [
  {
    id: "witch-hunters-balanced",
    warbandTypeId: "witch-hunters",
    name: "Ashen Bell Company",
    summary: "A cautious Witch Hunter patrol with pistols, a crossbow, zealots and hounds.",
    playStyle: "Balanced heroes, cheap bodies and fast hound pressure.",
    members: [
      { fighterTypeId: "witch-hunter-captain", displayName: "Captain Holt", equipment: ["dagger", "hammer", "brace-of-pistols"] },
      { fighterTypeId: "warrior-priest", displayName: "Brother Odo", equipment: ["dagger", "hammer"] },
      { fighterTypeId: "witch-hunter", displayName: "Elsbeth", equipment: ["dagger", "crossbow"] },
      { fighterTypeId: "witch-hunter", displayName: "Markus", equipment: ["dagger", "axe"] },
      { fighterTypeId: "zealot", displayName: "Lantern Zealots", groupSize: 2, equipment: ["dagger", "mace"] },
      { fighterTypeId: "warhound", displayName: "Cinder Hounds", groupSize: 2, equipment: [] }
    ]
  },
  {
    id: "reiklanders-balanced",
    warbandTypeId: "reiklanders",
    name: "Reikland Company",
    summary: "A dependable mercenary crew with all key hero slots and a bow-armed marksman.",
    playStyle: "Reliable leadership, mixed melee and a small shooting base.",
    members: [
      { fighterTypeId: "reikland-mercenary-captain", displayName: "Captain Adler", equipment: ["dagger", "mace"] },
      { fighterTypeId: "reikland-champion", displayName: "Konrad", equipment: ["dagger", "axe"] },
      { fighterTypeId: "reikland-youngblood", displayName: "Matthias", equipment: ["dagger"] },
      { fighterTypeId: "reikland-warrior", displayName: "Warriors", groupSize: 2, equipment: ["dagger", "mace"] },
      { fighterTypeId: "reikland-marksman", displayName: "Marksman", groupSize: 1, equipment: ["dagger", "bow"] },
      { fighterTypeId: "reikland-swordsman", displayName: "Swordsman", groupSize: 1, equipment: ["dagger", "sword"] }
    ]
  },
  {
    id: "middenheimers-balanced",
    warbandTypeId: "middenheimers",
    name: "Middenheim Company",
    summary: "A hard-hitting mercenary band using the same practical core as the Reiklanders.",
    playStyle: "Melee-leaning heroes with enough bodies to avoid early rout pressure.",
    members: [
      { fighterTypeId: "middenheim-mercenary-captain", displayName: "Captain Kruger", equipment: ["dagger", "mace"] },
      { fighterTypeId: "middenheim-champion", displayName: "Otto", equipment: ["dagger", "axe"] },
      { fighterTypeId: "middenheim-youngblood", displayName: "Lukas", equipment: ["dagger"] },
      { fighterTypeId: "middenheim-warrior", displayName: "Warriors", groupSize: 2, equipment: ["dagger", "mace"] },
      { fighterTypeId: "middenheim-marksman", displayName: "Marksman", groupSize: 1, equipment: ["dagger", "bow"] },
      { fighterTypeId: "middenheim-swordsman", displayName: "Swordsman", groupSize: 1, equipment: ["dagger", "sword"] }
    ]
  },
  {
    id: "marienburgers-balanced",
    warbandTypeId: "marienburgers",
    name: "Marienburg Company",
    summary: "A wealthy mercenary start with the same broad shape and extra gold left for upgrades.",
    playStyle: "Flexible, forgiving and easy to customise after creation.",
    members: [
      { fighterTypeId: "marienburg-mercenary-captain", displayName: "Captain van der Laan", equipment: ["dagger", "mace"] },
      { fighterTypeId: "marienburg-champion", displayName: "Silas", equipment: ["dagger", "axe"] },
      { fighterTypeId: "marienburg-youngblood", displayName: "Pieter", equipment: ["dagger"] },
      { fighterTypeId: "marienburg-warrior", displayName: "Warriors", groupSize: 2, equipment: ["dagger", "mace"] },
      { fighterTypeId: "marienburg-marksman", displayName: "Marksman", groupSize: 1, equipment: ["dagger", "bow"] },
      { fighterTypeId: "marienburg-swordsman", displayName: "Swordsman", groupSize: 1, equipment: ["dagger", "sword"] }
    ]
  },
  {
    id: "sisters-balanced",
    warbandTypeId: "sisters-of-sigmar",
    name: "Rock of Mercy",
    summary: "A compact Sisters roster with Matriarch, Superior, Augur and two henchwoman groups.",
    playStyle: "Close-range control with cheap slings and solid leadership.",
    members: [
      { fighterTypeId: "sigmarite-matriarch", displayName: "Mother Adelheid", equipment: ["dagger", "sigmarite-warhammer"] },
      { fighterTypeId: "sister-superior", displayName: "Sister Magda", equipment: ["dagger", "steel-whip"] },
      { fighterTypeId: "augur", displayName: "Blind Hanna", equipment: ["dagger", "sling"] },
      { fighterTypeId: "novice", displayName: "Novices", groupSize: 2, equipment: ["dagger", "hammer"] },
      { fighterTypeId: "sigmarite-sister", displayName: "Sisters", groupSize: 2, equipment: ["dagger", "mace"] }
    ]
  },
  {
    id: "carnival-balanced",
    warbandTypeId: "carnival-of-chaos",
    name: "The Gilded Pox",
    summary: "A legal Carnival start with a blessed Tainted One, Brute, Brethren and Nurglings.",
    playStyle: "Durable, strange and scenario-friendly with several special rules in play.",
    members: [
      { fighterTypeId: "carnival-master", displayName: "Master Bile", equipment: ["dagger", "sword", "carnival-bow"] },
      { fighterTypeId: "carnival-brute", displayName: "Strongman Grue", equipment: ["dagger", "double-handed-weapon"], skills: ["strongman"] },
      { fighterTypeId: "tainted-one", displayName: "The Laughing Fool", equipment: ["dagger", "blessing-cloud-of-flies"] },
      { fighterTypeId: "brethren", displayName: "Painted Brethren", groupSize: 2, equipment: ["dagger", "hammer"] },
      { fighterTypeId: "nurgling", displayName: "Tiny Chorus", groupSize: 3, equipment: [] }
    ]
  },
  {
    id: "skaven-balanced",
    warbandTypeId: "skaven",
    name: "Needle Pack",
    summary: "A fast Skaven start with Assassin, Sorcerer, Black Skaven, Night Runner and rats.",
    playStyle: "Speed, numbers and cheap shooting with slings.",
    members: [
      { fighterTypeId: "assassin-adept", displayName: "Snik Quickblade", equipment: ["sword", "sling"] },
      { fighterTypeId: "eshin-sorcerer", displayName: "Vritch", equipment: ["sling"] },
      { fighterTypeId: "black-skaven", displayName: "Black Kreech", equipment: ["fighting-claws"] },
      { fighterTypeId: "night-runner", displayName: "Tik", equipment: ["club", "sling"] },
      { fighterTypeId: "verminkin", displayName: "Verminkin", groupSize: 2, equipment: ["club", "sling"] },
      { fighterTypeId: "giant-rat", displayName: "Giant Rats", groupSize: 2, equipment: [] }
    ]
  },
  {
    id: "pestilens-balanced",
    warbandTypeId: "skaven-of-clan-pestilens",
    name: "The Rusted Bell",
    summary: "A Clan Pestilens start with Priest, Sorcerer, a Censer-bearing Monk, Novices and rats.",
    playStyle: "Durable heroes, cheap bodies and one dangerous plague weapon.",
    members: [
      { fighterTypeId: "plague-priest", displayName: "Father Skratch", equipment: ["dagger", "club"] },
      { fighterTypeId: "pestilens-sorcerer", displayName: "Vilek", equipment: ["dagger", "sling"] },
      { fighterTypeId: "plague-monk", displayName: "Rotclaw", equipment: ["dagger", "censer"] },
      { fighterTypeId: "monk-initiate", displayName: "Puskit", equipment: ["dagger", "sling"] },
      { fighterTypeId: "plague-novice", displayName: "Novice Brood", groupSize: 3, equipment: ["dagger", "sling"] },
      { fighterTypeId: "pestilens-giant-rat", displayName: "Pox Rats", groupSize: 3, equipment: [] }
    ]
  },
  {
    id: "undead-balanced",
    warbandTypeId: "undead",
    name: "Drakenhof Night Watch",
    summary: "A classic Undead start with Vampire, Necromancer, Dreg, Zombies and Ghouls.",
    playStyle: "Elite leader, cheap fear-causing bodies and dependable undead rules.",
    members: [
      { fighterTypeId: "vampire", displayName: "Count Orlok", equipment: ["dagger", "sword"] },
      { fighterTypeId: "necromancer", displayName: "Morbius", equipment: ["dagger"] },
      { fighterTypeId: "dreg", displayName: "Igor", equipment: ["dagger", "bow"] },
      { fighterTypeId: "zombie", displayName: "Shambling Dead", groupSize: 3, equipment: [] },
      { fighterTypeId: "ghoul", displayName: "Crypt Eaters", groupSize: 2, equipment: [] }
    ]
  },
  {
    id: "orc-mob-balanced",
    warbandTypeId: "orc-mob",
    name: "Grubnash's Ladz",
    summary: "A mixed Orc and Goblin start with Boss, Shaman, Big 'Un, Boyz and Squigs.",
    playStyle: "Punchy heroes with cheap Goblin support and a Squig threat.",
    members: [
      { fighterTypeId: "orc-boss", displayName: "Grubnash", equipment: ["dagger", "sword"] },
      { fighterTypeId: "orc-shaman", displayName: "Old Git", equipment: ["dagger"] },
      { fighterTypeId: "orc-big-un", displayName: "Snagga", equipment: ["dagger", "axe"] },
      { fighterTypeId: "orc-boy", displayName: "Da Boyz", groupSize: 2, equipment: ["dagger", "axe"] },
      { fighterTypeId: "goblin-warrior", displayName: "Stikkits", groupSize: 2, equipment: ["dagger", "short-bow"] },
      { fighterTypeId: "cave-squig", displayName: "Biters", groupSize: 1, equipment: [] }
    ]
  },
  {
    id: "black-orcs-balanced",
    warbandTypeId: "black-orcs",
    name: "Ironjaw's Bashers",
    summary: "A compact Black Orc start with Boss, Black Orc, upgraded Young'un, Boyz, Shootaz and a Nutta.",
    playStyle: "Tough heroes, controlled shooting and one unstable melee threat.",
    members: [
      { fighterTypeId: "black-orc-boss", displayName: "Ironjaw", equipment: ["dagger", "axe", "shield"] },
      { fighterTypeId: "black-orc", displayName: "Gorbad", equipment: ["dagger", "black-orc-choppa"] },
      { fighterTypeId: "black-orc-youngun", displayName: "Ruk", equipment: ["dagger", "axe", "black-orc-blood-upgrade"] },
      { fighterTypeId: "black-orc-boy", displayName: "Da Boyz", groupSize: 2, equipment: ["dagger", "axe"] },
      { fighterTypeId: "black-orc-shoota", displayName: "Da Shootaz", groupSize: 2, equipment: ["dagger", "bow"] },
      { fighterTypeId: "orc-nutta", displayName: "Snort", groupSize: 1, equipment: ["dagger", "axe"] }
    ]
  },
  {
    id: "beastmen-raiders-balanced",
    warbandTypeId: "beastmen-raiders",
    name: "Gorehorn Herd",
    summary: "A fast Beastmen start with Chief, Shaman, Bestigor, Centigor, Gor, Ungor and a Chaos Hound.",
    playStyle: "Mobile, melee-focused and straightforward, with Chaos Rituals for table tricks.",
    members: [
      { fighterTypeId: "beastman-chief", displayName: "Krazak Gorehorn", equipment: ["dagger", "axe", "shield"] },
      { fighterTypeId: "beastman-shaman", displayName: "Morgoth", equipment: ["dagger", "hammer"] },
      { fighterTypeId: "bestigor", displayName: "Brak", equipment: ["dagger", "halberd"] },
      { fighterTypeId: "centigor", displayName: "Boroq", equipment: ["dagger", "axe", "shield"] },
      { fighterTypeId: "gor", displayName: "Gor Pack", groupSize: 2, equipment: ["dagger", "mace"] },
      { fighterTypeId: "ungor", displayName: "Ungor Pack", groupSize: 2, equipment: ["dagger", "axe"] },
      { fighterTypeId: "warhound-of-chaos", displayName: "Chaos Hound", groupSize: 1, equipment: [] }
    ]
  },
  {
    id: "dwarf-treasure-hunters-balanced",
    warbandTypeId: "dwarf-treasure-hunters",
    name: "Cragbrow's Claim",
    summary: "A steady Dwarf start with Noble, Engineer, Troll Slayer, Clansmen and Thunderers.",
    playStyle: "Tough, compact and reliable, with crossbow fire and a Slayer for counter-charges.",
    members: [
      { fighterTypeId: "dwarf-noble", displayName: "Lord Cragbrow", equipment: ["dagger", "axe", "shield"] },
      { fighterTypeId: "dwarf-engineer", displayName: "Borin Gearhand", equipment: ["dagger", "hammer", "crossbow"] },
      { fighterTypeId: "dwarf-troll-slayer", displayName: "Snorri Doombound", equipment: ["dagger", "dwarf-axe"] },
      { fighterTypeId: "dwarf-clansman", displayName: "Stoneguard", groupSize: 2, equipment: ["dagger", "hammer"] },
      { fighterTypeId: "dwarf-thunderer", displayName: "Blackpowder Kin", groupSize: 2, equipment: ["dagger", "crossbow"] }
    ]
  },
  {
    id: "shadow-warriors-balanced",
    warbandTypeId: "shadow-warriors",
    name: "Night's Edge",
    summary: "An elite Shadow Warrior patrol with Master, Weaver, Walker and two small groups.",
    playStyle: "Accurate shooting, strong heroes and fewer models to manage.",
    members: [
      { fighterTypeId: "shadow-master", displayName: "Aerandir", equipment: ["dagger", "sword"] },
      { fighterTypeId: "shadow-weaver", displayName: "Lethariel", equipment: ["dagger"] },
      { fighterTypeId: "shadow-walker", displayName: "Caelith", equipment: ["dagger", "long-bow"] },
      { fighterTypeId: "shadow-warrior", displayName: "Grey Knives", groupSize: 2, equipment: ["dagger", "bow"] },
      { fighterTypeId: "shadow-novice", displayName: "New Moons", groupSize: 2, equipment: ["dagger"] }
    ]
  },
  {
    id: "lizardmen-balanced",
    warbandTypeId: "lizardmen",
    name: "Children of the Sun",
    summary: "A mixed Lizardmen force with Priest, Totem Warrior, Great Crest, Skinks and Saurus.",
    playStyle: "Durable Saurus backed by mobile Skink shooting.",
    members: [
      { fighterTypeId: "skink-priest", displayName: "Tlaxtlan", equipment: ["dagger", "short-bow"] },
      { fighterTypeId: "saurus-totem-warrior", displayName: "Gor-Rok", equipment: ["dagger", "stone-axe", "shield"] },
      { fighterTypeId: "skink-great-crest", displayName: "Chakax", equipment: ["dagger", "javelin"] },
      { fighterTypeId: "skink-brave", displayName: "River Skinks", groupSize: 2, equipment: ["dagger", "short-bow"] },
      { fighterTypeId: "saurus-brave", displayName: "Temple Guard", groupSize: 2, equipment: ["dagger", "stone-axe"] }
    ]
  },
  {
    id: "forest-goblins-balanced",
    warbandTypeId: "forest-goblins",
    name: "Da Webbed Moon",
    summary: "A Forest Goblin start with Chieftain, Shaman, Brave, Sluggas and Red Toof support.",
    playStyle: "Lots of tricks, cheap models and poison-flavoured ranged pressure.",
    members: [
      { fighterTypeId: "forest-goblin-chieftain", displayName: "Snagrit", equipment: ["dagger", "short-bow", "shield"] },
      { fighterTypeId: "forest-goblin-shaman", displayName: "Oddgit", equipment: ["dagger", "forest-goblin-blowpipe"] },
      { fighterTypeId: "forest-goblin-brave", displayName: "Nikkit", equipment: ["dagger", "forest-goblin-spear"] },
      { fighterTypeId: "forest-goblin", displayName: "Stabba Mob", groupSize: 2, equipment: ["dagger", "forest-goblin-spear"] },
      { fighterTypeId: "red-toof-boy", displayName: "Red Toofs", groupSize: 1, equipment: ["dagger", "sword"] },
      { fighterTypeId: "slugga", displayName: "Rock Chuckas", groupSize: 1, equipment: ["dagger", "forest-goblin-throwing-weapons"] }
    ]
  }
];

export function createRosterFromStarterTemplate(
  template: StarterRosterTemplate,
  rulesDb: RulesDb,
  options: { name?: string; isDraft?: boolean } = {}
): Roster {
  const warband = rulesDb.warbandTypes.find((item) => item.id === template.warbandTypeId);
  if (!warband) throw new Error(`Unknown starter template warband: ${template.warbandTypeId}`);

  const now = new Date().toISOString();
  const rosterId = id("roster");
  const roster: Roster = {
    id: rosterId,
    name: options.name ?? template.name,
    warbandTypeId: template.warbandTypeId,
    treasuryGold: warband.startingGold,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: template.summary,
    members: template.members.map((memberTemplate) => createStarterMember(memberTemplate, rosterId, rulesDb)),
    campaignLog: [],
    isDraft: options.isDraft ?? true,
    createdAt: now,
    updatedAt: now
  };

  const cost = calculateRosterCost(roster, rulesDb);
  return {
    ...roster,
    treasuryGold: Math.max(0, warband.startingGold - cost),
    claimedCost: cost,
    claimedWarbandRating: calculateWarbandRating(roster, rulesDb)
  };
}

function createStarterMember(
  template: StarterRosterMemberTemplate,
  rosterId: string,
  rulesDb: RulesDb
): RosterMember {
  const fighterType = rulesDb.fighterTypes.find((item) => item.id === template.fighterTypeId);
  if (!fighterType) throw new Error(`Unknown starter template fighter type: ${template.fighterTypeId}`);

  const kind: RosterMember["kind"] =
    fighterType.category === "henchman"
      ? "henchman_group"
      : fighterType.category === "hired_sword"
        ? "hired_sword"
        : "hero";

  const member = createRosterMemberFromType(fighterType, rosterId, kind, template.displayName);
  return {
    ...member,
    groupSize: kind === "henchman_group" ? template.groupSize ?? fighterType.groupMinSize ?? 1 : 1,
    equipment: template.equipment ?? [],
    skills: template.skills ?? [],
    specialRules: uniquePreserveOrder([...member.specialRules, ...(template.specialRules ?? [])]),
    notes: template.notes ?? ""
  };
}

function uniquePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

function id(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}
