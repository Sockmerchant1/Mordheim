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
    id: "amazons-lustria-balanced",
    warbandTypeId: "amazons-lustria",
    name: "Heart of Darkness Hunt",
    summary: "A Lustria Amazon start with Serpent Priestess, Eagle Warrior, Piranha Warrior, Warriors and Jaguars.",
    playStyle: "Ritual support, flexible short-ranged pressure and fast jungle fighters.",
    members: [
      { fighterTypeId: "amazon-serpent-priestess", displayName: "Yara of the Serpent", equipment: ["dagger", "amazon-lustria-sunstaff"] },
      { fighterTypeId: "amazon-eagle-warrior", displayName: "Ixchel", equipment: ["dagger", "amazon-starblade"] },
      { fighterTypeId: "amazon-piranha-warrior", displayName: "Nayeli", equipment: ["dagger", "bow"] },
      { fighterTypeId: "amazon-lustria-warrior", displayName: "River Guard", groupSize: 2, equipment: ["dagger", "club"] },
      { fighterTypeId: "amazon-jaguar-warrior", displayName: "Jaguar Stalkers", groupSize: 2, equipment: ["dagger", "amazon-javelins"] }
    ]
  },
  {
    id: "amazons-mordheim-balanced",
    warbandTypeId: "amazons-mordheim",
    name: "The Broken Chain",
    summary: "A Mordheim Amazon start with Priestess, Champion, Totem Warrior, Warriors and Scouts.",
    playStyle: "Elite artefact users, frenzied melee threat and mobile javelin support.",
    members: [
      { fighterTypeId: "amazon-priestess", displayName: "Priestess Teyacapan", equipment: ["dagger", "amazon-sunstaff"] },
      { fighterTypeId: "amazon-champion", displayName: "Mireya", equipment: ["dagger", "sword"] },
      { fighterTypeId: "amazon-totem-warrior", displayName: "Coatl", equipment: ["dagger", "amazon-claw-of-the-old-ones"] },
      { fighterTypeId: "amazon-mordheim-warrior", displayName: "Freed Warriors", groupSize: 2, equipment: ["dagger", "club"] },
      { fighterTypeId: "amazon-scout", displayName: "Ruin Scouts", groupSize: 2, equipment: ["dagger", "amazon-javelins"] }
    ]
  },
  {
    id: "pirates-balanced",
    warbandTypeId: "pirates",
    name: "The Salt Saint's Due",
    summary: "A broad Pirate start with Captain, Mate, Cabin Boy, Crew, Gunners, Boatswain and Swabbies.",
    playStyle: "Many bodies, mixed pistols and bows, with a Boatswain to keep the deck clear.",
    members: [
      { fighterTypeId: "pirate-captain", displayName: "Captain Rosk", equipment: ["dagger", "sword"] },
      { fighterTypeId: "pirate-mate", displayName: "Mara Finch", equipment: ["dagger", "axe"] },
      { fighterTypeId: "cabin-boy", displayName: "Pip Lowtide", equipment: ["dagger"] },
      { fighterTypeId: "pirate-crew", displayName: "Deck Crew", groupSize: 2, equipment: ["dagger", "mace"] },
      { fighterTypeId: "pirate-gunner", displayName: "Powder Gunners", groupSize: 2, equipment: ["dagger", "pistol"] },
      { fighterTypeId: "boatswain", displayName: "Bosun Mott", groupSize: 1, equipment: ["dagger", "boat-hook"] },
      { fighterTypeId: "swabbie", displayName: "Pressed Hands", groupSize: 2, equipment: ["dagger", "bow"] }
    ]
  },
  {
    id: "gunnery-school-of-nuln-balanced",
    warbandTypeId: "gunnery-school-of-nuln",
    name: "The Blackpowder Thesis",
    summary: "A Nuln fieldwork party with Officer, Instructor, Senior Student, Underclassman, support crew, Marksmen and a Pistolier.",
    playStyle: "Blackpowder range control, careful positioning and expensive but accurate shooting.",
    members: [
      { fighterTypeId: "senior-gunnery-officer", displayName: "Officer Steiger", equipment: ["dagger", "sword", "nuln-pistol"] },
      { fighterTypeId: "nuln-instructor", displayName: "Instructor Lotte", equipment: ["dagger", "nuln-handgun"] },
      { fighterTypeId: "senior-student", displayName: "Jannik von Meissen", equipment: ["dagger", "axe", "nuln-brace-of-pistols"] },
      { fighterTypeId: "underclassman", displayName: "Otto", equipment: ["dagger", "mace"] },
      { fighterTypeId: "son-of-the-guns", displayName: "Powder Runners", groupSize: 2, equipment: ["dagger", "mace"] },
      { fighterTypeId: "nuln-marksman", displayName: "Range Marksmen", groupSize: 2, equipment: ["dagger", "nuln-handgun"] },
      { fighterTypeId: "nuln-pistolier", displayName: "Ruprecht", groupSize: 1, equipment: ["dagger", "nuln-brace-of-pistols"] }
    ]
  },
  {
    id: "averlanders-balanced",
    warbandTypeId: "averlanders",
    name: "Black Fire Patrol",
    summary: "A flexible Averland start with Captain, Sergeant, Bergjaeger, Youngblood, Mountainguard, Marksmen and a Halfling.",
    playStyle: "Strong ranged access, reliable human bodies and a Bergjaeger for trap tricks.",
    members: [
      { fighterTypeId: "averland-captain", displayName: "Captain Leitdorf", equipment: ["dagger", "sword"] },
      { fighterTypeId: "averland-sergeant", displayName: "Sergeant Voss", equipment: ["dagger", "hammer"] },
      { fighterTypeId: "averland-bergjaeger", displayName: "Klaus", equipment: ["dagger", "bow"] },
      { fighterTypeId: "averland-youngblood", displayName: "Milo", equipment: ["dagger"] },
      { fighterTypeId: "mountainguard", displayName: "Black Fire Guard", groupSize: 2, equipment: ["dagger", "mace"] },
      { fighterTypeId: "averland-marksman", displayName: "Hill Marksmen", groupSize: 2, equipment: ["dagger", "bow"] },
      { fighterTypeId: "averland-halfling-scout", displayName: "Pip", groupSize: 1, equipment: ["dagger", "bow"] }
    ]
  },
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
    name: "The Griffon Lanterns",
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
    name: "White Wolf Ironsworn",
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
    name: "The Gilded Gull Company",
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
    id: "cult-of-the-possessed-balanced",
    warbandTypeId: "cult-of-the-possessed",
    name: "The Red Sable",
    summary: "A legal Cult start with Magister, Possessed, two Mutants, Brethren and a Darksoul.",
    playStyle: "Mutation-driven heroes with expendable cultists and one reliable Crazed henchman.",
    members: [
      { fighterTypeId: "magister", displayName: "Magister Varr", equipment: ["dagger", "sword"] },
      { fighterTypeId: "possessed", displayName: "The Vessel", equipment: [] },
      { fighterTypeId: "mutant", displayName: "Ghorst", equipment: ["dagger", "axe", "mutation-hideous"] },
      { fighterTypeId: "mutant", displayName: "Ilya", equipment: ["dagger", "mace", "mutation-cloven-hoofs"] },
      { fighterTypeId: "cult-brethren", displayName: "Red Brethren", groupSize: 2, equipment: ["dagger", "mace"] },
      { fighterTypeId: "darksoul", displayName: "Broken Mask", groupSize: 1, equipment: ["dagger", "axe"] }
    ]
  },
  {
    id: "skaven-balanced",
    warbandTypeId: "skaven",
    name: "The Needlefang Pact",
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
    name: "Da Ironjaw Krumpany",
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
    id: "kislevites-balanced",
    warbandTypeId: "kislevites",
    name: "The White Bear Oathband",
    summary: "A flexible Kislevite start with Captain, Bear Tamer, Esaul, Youths, Warriors, Cossacks and Streltsi.",
    playStyle: "Brave human heroes, flexible equipment and Streltsi gun-rest tricks, with room to add a bear later.",
    members: [
      { fighterTypeId: "druzhina-captain", displayName: "Captain Ivan", equipment: ["dagger", "sword"] },
      { fighterTypeId: "bear-tamer", displayName: "Mikhail", equipment: ["dagger", "axe"] },
      { fighterTypeId: "esaul", displayName: "Boris", equipment: ["dagger", "hammer"] },
      { fighterTypeId: "kislev-youth", displayName: "Yuri", equipment: ["dagger"] },
      { fighterTypeId: "kislev-warrior", displayName: "Gospodar Warriors", groupSize: 2, equipment: ["dagger", "mace"] },
      { fighterTypeId: "cossack", displayName: "Steppe Cossacks", groupSize: 2, equipment: ["dagger", "spear"] },
      { fighterTypeId: "streltsi", displayName: "Erengrad Streltsi", groupSize: 2, equipment: ["dagger", "handgun"] }
    ]
  },
  {
    id: "ostlanders-balanced",
    warbandTypeId: "ostlanders",
    name: "Sable Stag Kinband",
    summary: "A broad Ostlander start with Elder, Blood-Brothers, Priest of Taal, Kin, Ruffians and a Jaeger.",
    playStyle: "Large human family warband with unusual morale, Taal prayers and a path toward Jaeger rifles or an Ogre later.",
    members: [
      { fighterTypeId: "ostlander-elder", displayName: "Elder Kruger", equipment: ["dagger", "sword"] },
      { fighterTypeId: "blood-brother", displayName: "Hagen", equipment: ["dagger", "axe"] },
      { fighterTypeId: "blood-brother", displayName: "Oskar", equipment: ["dagger", "hammer"] },
      { fighterTypeId: "priest-of-taal", displayName: "Father Ulbrecht", equipment: ["dagger", "mace"] },
      { fighterTypeId: "ostlander-kin", displayName: "Sable Kin", groupSize: 2, equipment: ["dagger", "mace"] },
      { fighterTypeId: "ruffian", displayName: "Alehouse Ruffians", groupSize: 2, equipment: ["dagger", "mace"] },
      { fighterTypeId: "jaeger", displayName: "Hochland Jaeger", groupSize: 1, equipment: ["dagger", "bow"] }
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
    name: "Sunscale Cohort",
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
  const groupSize = kind === "henchman_group" ? template.groupSize ?? fighterType.groupMinSize ?? 1 : 1;
  return {
    ...member,
    groupSize,
    henchmanModels: kind === "henchman_group"
      ? Array.from({ length: groupSize }, (_, index) => ({
          id: id("henchman-model"),
          name: `${template.displayName ?? fighterType.name} #${index + 1}`,
          status: "active" as const,
          injuries: [],
          notes: ""
        }))
      : [],
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
