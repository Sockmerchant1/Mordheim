import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Coins,
  Copy,
  Dices,
  Download,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Shield,
  Swords,
  Trash2,
  Upload
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { deleteRoster, listRosters, saveRoster } from "./api/rosters";
import rulesLookupSeed from "./data/rulesLookup.json";
import { rulesDb, warbandIndex, type WarbandIndexRecord } from "./data/rulesDb";
import {
  createRosterFromStarterTemplate,
  starterRosterTemplates,
  type StarterRosterTemplate
} from "./data/starterRosters";
import {
  DEFAULT_MORDHEIM_ADVANCE_THRESHOLDS,
  calculateRosterCost,
  calculateWarbandRating,
  createRosterMemberFromType,
  getAllowedEquipment,
  getAllowedFighterTypes,
  getAllowedSkills,
  getAllowedSpecialRules,
  getPendingAdvances,
  validateRoster
} from "./rules/engine";
import { rosterSchema } from "./rules/schemas";
import { GameSchedulerPage } from "./scheduler/GameSchedulerPage";
import {
  createMultipleSeriousInjuryRoll,
  createSeriousInjuryFollowUpRolls,
  createTableRoll,
  formatExplorationCombination,
  getExplorationDiceSummary,
  hasExplorationFollowUp,
  parseDiceValues,
  rollExplorationFollowUp,
  rollD3,
  rollD6,
  type ExplorationCombination,
  type ExplorationFollowUpResult,
  type FollowUpSeriousInjuryRoll,
  type TableRollKind,
  type TableRollResult,
  type TableRowMatch
} from "./rules/tableDice";
import type {
  EquipmentItem,
  FighterType,
  HiredSword,
  Roster,
  RosterMember,
  Skill,
  SpecialRule,
  ValidationIssue,
  WarbandType
} from "./rules/types";

type Mode = "list" | "create" | "roster" | "campaign" | "play" | "afterBattle" | "schedule";
type RuleLookupCategory = "skill" | "spell" | "prayer" | "weapon-rule" | "injury" | "special-rule" | "equipment" | "misc";
type RuleLookupRecord = {
  id: string;
  name: string;
  category: RuleLookupCategory;
  text: string;
  source?: string;
  sourceUrl?: string;
  page?: string;
  tags?: string[];
  aliases?: string[];
  tables?: Array<{
    caption?: string;
    columns: string[];
    rows: string[][];
  }>;
};
type RuleLookupHighlight = {
  tableCaption?: string;
  rowIndex?: number;
  rangeLabel?: string;
  label?: string;
};
type LookupItem =
  | { type: "equipment"; item: EquipmentItem }
  | { type: "skill"; item: Skill }
  | { type: "specialRule"; item: SpecialRule }
  | { type: "rule"; item: RuleLookupRecord; highlight?: RuleLookupHighlight };

type BattleStatus = "active" | "hidden" | "knocked_down" | "stunned" | "out_of_action";
type BattleMemberState = {
  memberId: string;
  status: BattleStatus;
  currentWounds: number;
  enemyOoaXp: number;
  objectiveXp: number;
  otherXp: number;
};
type BattleState = {
  rosterId: string;
  updatedAt: string;
  members: Record<string, BattleMemberState>;
};
type BattleResult = "win" | "loss" | "draw" | "routed" | "wiped-out" | "other";
type AfterBattleDraft = {
  id: string;
  warbandId: string;
  createdAt: string;
  battleStateSnapshot: BattleState;
  battleResult: {
    opponent?: string;
    scenario?: string;
    result?: BattleResult;
    notes?: string;
    datePlayed?: string;
    leaderSurvived?: boolean;
    routType?: string;
  };
  xp: AfterBattleXpEntry[];
  injuries: AfterBattleInjuryEntry[];
  exploration: {
    diceValues: number[];
    wyrdstoneShards: number;
    specialResults?: string[];
    notes?: string;
  };
  treasury: {
    before: number;
    wyrdstoneSold: number;
    shardSaleIncome: number;
    otherIncome: number;
    deductions: number;
    manualAdjustment: number;
    after: number;
  };
  transactions: AfterBattleTransaction[];
  advances: AfterBattleAdvanceEntry[];
  rosterUpdates: AfterBattleRosterUpdate[];
};
type AfterBattleXpEntry = {
  fighterId: string;
  fighterName: string;
  startingXp: number;
  previousXp: number;
  survived: number;
  leaderBonus: number;
  enemyOoa: number;
  objective: number;
  underdog: number;
  other: number;
  gainedXp: number;
  finalXp: number;
  notes?: string;
  pendingAdvanceThresholds: number[];
};
type AfterBattleInjuryEntry = {
  fighterId: string;
  fighterName: string;
  result: string;
  permanentEffect?: string;
  notes?: string;
  resolvedOutsideApp?: boolean;
  casualties?: number;
  multipleInjuriesCountRoll?: number;
  followUpInjuries?: AfterBattleFollowUpInjury[];
};
type AfterBattleFollowUpInjury = {
  id: string;
  sequence: number;
  rollLabel: string;
  result: string;
  effect?: string;
  rangeLabel?: string;
  tableCaption?: string;
  rowIndex?: number;
  rerolled?: string[];
  notes?: string;
};
type AfterBattleTransaction = {
  id: string;
  action: "bought" | "sold" | "moved" | "discarded" | "found" | "other";
  itemName: string;
  equipmentItemId?: string;
  value?: number;
  assignedTo?: string;
  removeFrom?: string;
  rareRoll?: number;
  availability?: "not_required" | "not_checked" | "available" | "failed";
  applyToRoster?: boolean;
  notes?: string;
};
type AfterBattleAdvanceEntry = {
  id: string;
  fighterId: string;
  fighterName: string;
  xpThreshold: number;
  result: string;
  notes?: string;
};
type AfterBattleRosterUpdate = {
  id: string;
  type: string;
  targetId?: string;
  description: string;
  payload?: Record<string, unknown>;
};
type CampaignLogFilter = "all" | "battles" | "income" | "injuries" | "trading" | "advances" | "upkeep" | "stash" | "notes";
type WyrdstoneIncomeRow = {
  "1-3": number;
  "4-6": number;
  "7-9": number;
  "10-12": number;
  "13-15": number;
  "16+": number;
};

const rulesLookupRecords = buildRulesLookupRecords();
const AFTER_BATTLE_STEPS = [
  { label: "Battle result", shortLabel: "Result", help: "Record who you played and how the battle ended." },
  { label: "Experience", shortLabel: "XP", help: "Carry across battle XP and check for advances." },
  { label: "Serious injuries", shortLabel: "Injuries", help: "Resolve fighters who went Out of Action." },
  { label: "Exploration", shortLabel: "Explore", help: "Record dice, wyrdstone and special exploration finds." },
  { label: "Income", shortLabel: "Income", help: "Sell wyrdstone and update the treasury." },
  { label: "Trading", shortLabel: "Trading", help: "Record purchases, sales and equipment movement." },
  { label: "Advances", shortLabel: "Advances", help: "Choose each pending advance result." },
  { label: "Roster updates", shortLabel: "Updates", help: "Review automatic changes and add campaign notes." },
  { label: "Review", shortLabel: "Review", help: "Check the report before applying permanent changes." }
] as const;
const WYRDSTONE_INCOME_TABLE: Record<number, WyrdstoneIncomeRow> = {
  1: { "1-3": 45, "4-6": 40, "7-9": 35, "10-12": 30, "13-15": 30, "16+": 25 },
  2: { "1-3": 60, "4-6": 55, "7-9": 50, "10-12": 45, "13-15": 40, "16+": 35 },
  3: { "1-3": 75, "4-6": 70, "7-9": 65, "10-12": 60, "13-15": 55, "16+": 50 },
  4: { "1-3": 90, "4-6": 80, "7-9": 70, "10-12": 65, "13-15": 60, "16+": 55 },
  5: { "1-3": 110, "4-6": 100, "7-9": 90, "10-12": 80, "13-15": 70, "16+": 65 },
  6: { "1-3": 120, "4-6": 110, "7-9": 100, "10-12": 90, "13-15": 80, "16+": 70 },
  7: { "1-3": 145, "4-6": 130, "7-9": 120, "10-12": 110, "13-15": 100, "16+": 90 },
  8: { "1-3": 155, "4-6": 140, "7-9": 130, "10-12": 120, "13-15": 110, "16+": 100 }
};

export default function App() {
  const [mode, setMode] = useState<Mode>("list");
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [activeRosterId, setActiveRosterId] = useState<string>();
  const [draftRoster, setDraftRoster] = useState<Roster>(() => createRosterDraft("witch-hunters"));
  const [showIllegalOptions, setShowIllegalOptions] = useState(false);
  const [allowDraftSave, setAllowDraftSave] = useState(false);
  const [lookupItem, setLookupItem] = useState<LookupItem>();
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void listRosters().then((items) => {
      setRosters(items);
      setActiveRosterId(items[0]?.id);
    });
  }, []);

  const activeRoster = useMemo(
    () => (mode === "create" ? draftRoster : rosters.find((roster) => roster.id === activeRosterId)),
    [activeRosterId, draftRoster, mode, rosters]
  );

  async function persistRoster(roster: Roster, nextMode: Mode = "play") {
    const saved = await saveRoster({
      ...roster,
      claimedCost: calculateRosterCost(roster, rulesDb),
      claimedWarbandRating: calculateWarbandRating(roster, rulesDb),
      treasuryGold: roster.campaignLog.length === 0 && currentWarband(roster)?.startingGold
        ? Math.max(0, currentWarband(roster)!.startingGold - calculateRosterCost(roster, rulesDb))
        : roster.treasuryGold
    });
    setRosters((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    setActiveRosterId(saved.id);
    setMode(nextMode);
  }

  async function removeRoster(id: string) {
    await deleteRoster(id);
    setRosters((current) => current.filter((roster) => roster.id !== id));
    if (activeRosterId === id) setActiveRosterId(undefined);
  }

  function updateActiveRoster(updater: (roster: Roster) => Roster) {
    if (!activeRoster) return;
    const updated = { ...updater(activeRoster), updatedAt: new Date().toISOString() };
    if (mode === "create") {
      setDraftRoster(updated);
    } else {
      setRosters((current) => current.map((roster) => (roster.id === updated.id ? updated : roster)));
    }
  }

  function duplicateRoster(roster: Roster) {
    const now = new Date().toISOString();
    const copy = {
      ...roster,
      id: `roster-${crypto.randomUUID()}`,
      name: `${roster.name} Copy`,
      isDraft: true,
      createdAt: now,
      updatedAt: now,
      members: roster.members.map((member) => ({ ...member, id: `member-${crypto.randomUUID()}` }))
    };
    void persistRoster(copy);
  }

  function exportRoster(roster: Roster) {
    const blob = new Blob([JSON.stringify(roster, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug(roster.name)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportRosterPdf(roster: Roster) {
    const previousTitle = document.title;
    document.title = `${slug(roster.name)}-warband-roster`;
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => {
        document.title = previousTitle;
      }, 500);
    }, 0);
  }

  async function importRoster(file: File) {
    const imported = rosterSchema.parse(JSON.parse(await file.text()));
    await persistRoster({
      ...imported,
      id: imported.id || `roster-${crypto.randomUUID()}`,
      updatedAt: new Date().toISOString()
    });
  }

  const validation = activeRoster ? validateRoster(activeRoster, rulesDb) : [];
  const blockingErrors = validation.some((issue) => issue.severity === "error");

  return (
    <div className={["app-shell", activeRoster ? `warband-${activeRoster.warbandTypeId}` : ""].filter(Boolean).join(" ")}>
      <header className="topbar">
        <div>
          <p className="eyebrow">Mordheim campaign helper</p>
          <h1>Warband Manager</h1>
        </div>
        <nav aria-label="Main">
          <button className={mode === "list" ? "active" : ""} onClick={() => setMode("list")}>
            <ClipboardList aria-hidden /> Warbands
          </button>
          <button
            className={mode === "create" ? "active" : ""}
            onClick={() => {
              setDraftRoster(createRosterDraft("witch-hunters"));
              setMode("create");
            }}
          >
            <Plus aria-hidden /> Create
          </button>
          <button className={mode === "play" ? "active" : ""} disabled={!activeRosterId} onClick={() => setMode("play")}>
            <Swords aria-hidden /> Roster
          </button>
          <button className={mode === "campaign" ? "active" : ""} disabled={!activeRosterId} onClick={() => setMode("campaign")}>
            <BookOpen aria-hidden /> Campaign
          </button>
          <button className={mode === "schedule" ? "active" : ""} onClick={() => setMode("schedule")}>
            <CalendarDays aria-hidden /> Schedule
          </button>
        </nav>
      </header>

      {mode === "list" && (
        <WarbandList
          rosters={rosters}
          onCreate={() => {
            setDraftRoster(createRosterDraft("witch-hunters"));
            setMode("create");
          }}
          onSelect={(id) => {
            setActiveRosterId(id);
            setMode("play");
          }}
          onCampaign={(id) => {
            setActiveRosterId(id);
            setMode("campaign");
          }}
          onDuplicate={duplicateRoster}
          onDelete={removeRoster}
          onExport={exportRoster}
          onImportClick={() => importInputRef.current?.click()}
        />
      )}

      {mode === "schedule" && (
        <main className="workspace">
          <GameSchedulerPage
            rosters={rosters}
            onWarbands={() => setMode("list")}
            onCampaign={() => setMode(activeRosterId ? "campaign" : "list")}
            onCreateWarband={() => {
              setDraftRoster(createRosterDraft("witch-hunters"));
              setMode("create");
            }}
          />
        </main>
      )}

      {(mode === "create" || mode === "roster" || mode === "campaign" || mode === "play" || mode === "afterBattle") && activeRoster && (
        <main className="workspace">
          {mode === "create" ? (
            <CreateWizard
              roster={activeRoster}
              validation={validation}
              showIllegalOptions={showIllegalOptions}
              allowDraftSave={allowDraftSave}
              blockingErrors={blockingErrors}
              onRosterChange={setDraftRoster}
              onLookup={setLookupItem}
              onToggleIllegal={setShowIllegalOptions}
              onToggleDraftSave={setAllowDraftSave}
              onSave={() => persistRoster({ ...activeRoster, isDraft: blockingErrors })}
            />
          ) : mode === "roster" ? (
            <RosterView
              roster={activeRoster}
              validation={validation}
              showIllegalOptions={showIllegalOptions}
              allowDraftSave={allowDraftSave}
              blockingErrors={blockingErrors}
              onRosterChange={updateActiveRoster}
              onLookup={setLookupItem}
              onToggleIllegal={setShowIllegalOptions}
              onToggleDraftSave={setAllowDraftSave}
              onSave={() => persistRoster({ ...activeRoster, isDraft: blockingErrors }, "roster")}
              onExport={() => exportRoster(activeRoster)}
              onExportPdf={() => exportRosterPdf(activeRoster)}
            />
          ) : mode === "campaign" ? (
            <CampaignView
              roster={activeRoster}
              validation={validation}
              onRosterChange={updateActiveRoster}
              onSave={() => persistRoster(activeRoster, "campaign")}
              onEditRoster={() => setMode("roster")}
              onPlay={() => setMode("play")}
              onAfterBattle={() => setMode("afterBattle")}
            />
          ) : mode === "play" ? (
            <PlayModeView
              roster={activeRoster}
              onEditRoster={() => setMode("roster")}
              onAfterBattle={() => setMode("afterBattle")}
              onExportPdf={() => exportRosterPdf(activeRoster)}
              onLookup={setLookupItem}
            />
          ) : (
            <AfterBattleView
              roster={activeRoster}
              onBackToPlay={() => setMode("play")}
              onEditRoster={() => setMode("roster")}
              onLookup={setLookupItem}
              onApply={(updatedRoster) => persistRoster(updatedRoster, "play")}
            />
          )}
        </main>
      )}

      {lookupItem && <LookupPanel lookupItem={lookupItem} onClose={() => setLookupItem(undefined)} />}

      <input
        ref={importInputRef}
        className="visually-hidden"
        type="file"
        accept="application/json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importRoster(file);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}

function WarbandList({
  rosters,
  onCreate,
  onSelect,
  onCampaign,
  onDuplicate,
  onDelete,
  onExport,
  onImportClick
}: {
  rosters: Roster[];
  onCreate: () => void;
  onSelect: (id: string) => void;
  onCampaign: (id: string) => void;
  onDuplicate: (roster: Roster) => void;
  onDelete: (id: string) => void;
  onExport: (roster: Roster) => void;
  onImportClick: () => void;
}) {
  const [grade, setGrade] = useState("");
  const [race, setRace] = useState("");
  const [officialOnly, setOfficialOnly] = useState(true);
  const [query, setQuery] = useState("");

  const filteredIndex = warbandIndex.warbands.filter((warband) => {
    if (officialOnly && !warband.isOfficial) return false;
    if (grade && warband.broheimGrade !== grade) return false;
    if (race && warband.race !== race) return false;
    if (query && !warband.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const grades = unique(warbandIndex.warbands.map((warband) => warband.broheimGrade));
  const races = unique(warbandIndex.warbands.map((warband) => warband.race));

  return (
    <main className="list-page">
      <section className="toolbar-band">
        <div>
          <h2>Saved Rosters</h2>
          <p>{rosters.length} local roster{rosters.length === 1 ? "" : "s"}</p>
        </div>
        <div className="button-row">
          <button className="primary" onClick={onCreate}>
            <Plus aria-hidden /> New warband
          </button>
          <button onClick={onImportClick}>
            <Upload aria-hidden /> Import JSON
          </button>
        </div>
      </section>

      <section className="roster-list" aria-label="Saved rosters">
        {rosters.length === 0 ? (
          <div className="empty-state">No saved rosters yet.</div>
        ) : (
          rosters.map((roster) => (
            <article className="roster-row" key={roster.id}>
              <div className="roster-identity">
                <WarbandBadge warbandTypeId={roster.warbandTypeId} />
                <div>
                <h3>{roster.name}</h3>
                <p>
                  {warbandName(roster.warbandTypeId)} · {calculateWarbandRating(roster, rulesDb)} rating ·{" "}
                  {calculateRosterCost(roster, rulesDb)} gc
                </p>
              </div>
                </div>
              <div className="icon-row">
                <button onClick={() => onSelect(roster.id)}>Play</button>
                <button onClick={() => onCampaign(roster.id)}>Campaign</button>
                <button aria-label={`Duplicate ${roster.name}`} onClick={() => onDuplicate(roster)}>
                  <Copy aria-hidden />
                </button>
                <button aria-label={`Export ${roster.name}`} onClick={() => onExport(roster)}>
                  <Download aria-hidden />
                </button>
                <button aria-label={`Delete ${roster.name}`} onClick={() => onDelete(roster.id)}>
                  <Trash2 aria-hidden />
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="rules-library">
        <div className="section-heading">
          <div>
            <h2>Broheim Warband Index</h2>
            <p>Discovered from {warbandIndex.sourceUrl}</p>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={officialOnly} onChange={(event) => setOfficialOnly(event.target.checked)} />
            Official only
          </label>
        </div>
        <div className="filters">
          <label>
            <Search aria-hidden />
            <span>Name</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label>
            <span>Grade</span>
            <select value={grade} onChange={(event) => setGrade(event.target.value)}>
              <option value="">All</option>
              {grades.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Race</span>
            <select value={race} onChange={(event) => setRace(event.target.value)}>
              <option value="">All</option>
              {races.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Warband</th>
                <th>Race</th>
                <th>Grade</th>
                <th>Source</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredIndex.slice(0, 80).map((warband: WarbandIndexRecord) => (
                <tr key={`${warband.name}-${warband.sourceUrl}`}>
                  <td>{warband.name}</td>
                  <td>{warband.race}</td>
                  <td>{warband.broheimGradeLabel}</td>
                  <td>
                    <a href={warband.sourceUrl} target="_blank" rel="noreferrer">
                      {warband.sourceCode || "PDF"}
                    </a>
                  </td>
                  <td>
                    <span className={["implemented", "tested"].includes(warband.implementationStatus) ? "pill success" : "pill"}>
                      {warband.implementationStatus.replaceAll("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function CreateWizard({
  roster,
  validation,
  showIllegalOptions,
  allowDraftSave,
  blockingErrors,
  onRosterChange,
  onLookup,
  onToggleIllegal,
  onToggleDraftSave,
  onSave
}: {
  roster: Roster;
  validation: ValidationIssue[];
  showIllegalOptions: boolean;
  allowDraftSave: boolean;
  blockingErrors: boolean;
  onRosterChange: (roster: Roster) => void;
  onLookup: (item: LookupItem) => void;
  onToggleIllegal: (value: boolean) => void;
  onToggleDraftSave: (value: boolean) => void;
  onSave: () => void;
}) {
  const warband = currentWarband(roster)!;
  const sortedWarbandTypes = [...rulesDb.warbandTypes].sort((left, right) => left.name.localeCompare(right.name));
  const allowedFighters = getAllowedFighterTypes(warband.id, roster, rulesDb);

  function updateRoster(updater: (roster: Roster) => Roster) {
    onRosterChange({ ...updater(roster), updatedAt: new Date().toISOString() });
  }

  return (
    <div className="two-column">
      <section className="primary-flow">
        <div className="wizard-steps" aria-label="Create warband steps">
          {["Select", "Name", "Hire", "Equip", "Validate", "Save"].map((step, index) => (
            <span className="step" key={step}>
              {index + 1}. {step}
            </span>
          ))}
        </div>

        <section className="form-band">
          <h2>Create Warband</h2>
          <div className="form-grid">
            <label>
              <span>Warband type</span>
              <select
                value={roster.warbandTypeId}
                onChange={(event) => onRosterChange(createRosterDraft(event.target.value))}
              >
                {sortedWarbandTypes.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Warband name</span>
              <input value={roster.name} onChange={(event) => updateRoster((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span>Starting treasury</span>
              <input value={`${warband.startingGold} gc`} readOnly />
            </label>
          </div>
          <SourceNote sourceUrl={warband.sourceUrl} label={`${warband.name} · Broheim grade ${warband.broheimGrade}`} />
        </section>

        <StarterTemplatePanel
          templates={starterRosterTemplates.filter((template) => template.warbandTypeId === warband.id)}
          onApply={(template) => onRosterChange(createRosterFromStarterTemplate(template, rulesDb))}
        />

        <RosterHeader roster={roster} />

        <section className="add-member-band">
          <div className="section-heading">
            <div>
              <h2>Add Warriors</h2>
              <p>Only currently legal fighter types are enabled.</p>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={showIllegalOptions} onChange={(event) => onToggleIllegal(event.target.checked)} />
              Show illegal options
            </label>
          </div>
          <div className="fighter-buttons">
            {rulesDb.fighterTypes
              .filter((fighterType) => fighterType.warbandTypeId === warband.id)
              .map((fighterType) => {
                const legal = allowedFighters.some((item) => item.id === fighterType.id);
                if (!legal && !showIllegalOptions) return null;
                return (
                  <button
                    key={fighterType.id}
                    disabled={!legal}
                    className={!legal ? "blocked" : ""}
                    onClick={() =>
                      updateRoster((current) => ({
                        ...current,
                        members: [
                          ...current.members,
                          createRosterMemberFromType(
                            fighterType,
                            current.id,
                            fighterType.category === "henchman" ? "henchman_group" : "hero"
                          )
                        ]
                      }))
                    }
                  >
                    <Plus aria-hidden />
                    {fighterType.name} · {fighterType.hireCost} gc
                  </button>
                );
              })}
          </div>
        </section>

        <MemberSections
          roster={roster}
          validation={validation}
          showIllegalOptions={showIllegalOptions}
          onRosterChange={updateRoster}
          onLookup={onLookup}
        />
      </section>

      <aside className="side-panel">
        <WarbandBuildGuide roster={roster} warband={warband} validation={validation} />
        <ValidationPanel issues={validation} />
        <SavePanel
          blockingErrors={blockingErrors}
          allowDraftSave={allowDraftSave}
          onToggleDraftSave={onToggleDraftSave}
          onSave={onSave}
        />
      </aside>
    </div>
  );
}

type BuildGuideStatus = "done" | "todo" | "problem";

function WarbandBuildGuide({
  roster,
  warband,
  validation
}: {
  roster: Roster;
  warband: WarbandType;
  validation: ValidationIssue[];
}) {
  const members = activeWarbandRosterMembers(roster);
  const cost = calculateRosterCost(roster, rulesDb);
  const remainingGold = warband.startingGold - cost;
  const maxWarriors = effectiveWarbandMax(roster, warband);
  const warriorCount = countRosterFighters(members);
  const heroCount = members.filter((member) => fighterTypeForMember(member)?.category === "hero").length;
  const leaderType = rulesDb.fighterTypes.find((fighterType) => fighterType.id === warband.leaderFighterTypeId);
  const leaderCount = members.filter((member) => member.fighterTypeId === warband.leaderFighterTypeId).length;
  const requiredChoiceIssues = validation.filter((issue) => issue.code === "REQUIRED_EQUIPMENT_OPTION");
  const blockingIssues = validation.filter((issue) => issue.severity === "error");
  const remainingHeroTypes = rulesDb.fighterTypes
    .filter((fighterType) => fighterType.warbandTypeId === warband.id && fighterType.category === "hero")
    .filter((fighterType) => fighterType.id !== warband.leaderFighterTypeId)
    .filter((fighterType) => fighterType.maxCount === null || countFighterTypeInRoster(roster, fighterType.id) < fighterType.maxCount)
    .map((fighterType) => fighterType.name);

  const guideItems = [
    {
      status: roster.name.trim() ? "done" : "todo",
      title: "Name",
      detail: roster.name.trim() ? roster.name : "Enter a warband name."
    },
    {
      status: leaderCount === 1 ? "done" : leaderCount > 1 ? "problem" : "todo",
      title: "Leader",
      detail:
        leaderCount === 1
          ? `${leaderType?.name ?? "Leader"} added.`
          : leaderCount > 1
            ? `Keep exactly one ${leaderType?.name ?? "leader"}.`
            : `Add one ${leaderType?.name ?? "leader"}.`
    },
    {
      status: warriorCount > maxWarriors ? "problem" : warriorCount >= warband.minWarriors ? "done" : "todo",
      title: "Warriors",
      detail:
        warriorCount > maxWarriors
          ? `${warriorCount}/${maxWarriors} warriors. Reduce the warband size.`
          : warriorCount >= warband.minWarriors
            ? `${warriorCount}/${maxWarriors} warriors.`
            : `${warriorCount}/${warband.minWarriors} minimum. Hire ${warband.minWarriors - warriorCount} more.`
    },
    {
      status: heroCount > warband.maxHeroes ? "problem" : "done",
      title: "Heroes",
      detail: `${heroCount}/${warband.maxHeroes} hero slots used.`
    },
    {
      status: requiredChoiceIssues.length ? "problem" : "done",
      title: "Required Choices",
      detail: requiredChoiceIssues.length ? `${requiredChoiceIssues.length} fighter option still needed.` : "All required fighter options are selected."
    },
    {
      status: remainingGold < 0 ? "problem" : "done",
      title: "Gold",
      detail: remainingGold < 0 ? `Overspent by ${Math.abs(remainingGold)} gc.` : `${remainingGold} gc remaining.`
    }
  ] satisfies Array<{ status: BuildGuideStatus; title: string; detail: string }>;

  return (
    <section className="build-guide" aria-live="polite">
      <div className="section-heading compact-heading">
        <div>
          <h2>Build Guide</h2>
          <p>{blockingIssues.length ? `${blockingIssues.length} thing${blockingIssues.length === 1 ? "" : "s"} to fix before final save.` : "Ready for final save."}</p>
        </div>
        <ClipboardList aria-hidden />
      </div>

      <div className="guide-metrics">
        <span>{warriorCount} fighters</span>
        <span>{heroCount} heroes</span>
        <span>{cost} gc spent</span>
      </div>

      <div className="guide-list">
        {guideItems.map((item) => (
          <div className={`guide-item ${item.status}`} key={item.title}>
            {item.status === "done" ? <CheckCircle2 aria-hidden /> : <AlertTriangle aria-hidden />}
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {remainingHeroTypes.length > 0 && (
        <div className="guide-hint">
          <strong>Optional heroes still available</strong>
          <p>{remainingHeroTypes.slice(0, 4).join(", ")}{remainingHeroTypes.length > 4 ? `, +${remainingHeroTypes.length - 4} more` : ""}</p>
        </div>
      )}
    </section>
  );
}

function StarterTemplatePanel({
  templates,
  onApply
}: {
  templates: StarterRosterTemplate[];
  onApply: (template: StarterRosterTemplate) => void;
}) {
  if (templates.length === 0) return null;

  return (
    <section className="starter-template-panel">
      <div className="section-heading">
        <div>
          <h2>Starter Rosters</h2>
          <p>Pick a legal example roster, then rename or edit anything you like.</p>
        </div>
      </div>
      <div className="starter-template-grid">
        {templates.map((template) => {
          const previewRoster = createRosterFromStarterTemplate(template, rulesDb);
          const cost = calculateRosterCost(previewRoster, rulesDb);
          const warband = currentWarband(previewRoster);
          return (
            <article className="starter-template-card" key={template.id}>
              <div>
                <p className="eyebrow">Starter template</p>
                <h3>{template.name}</h3>
                <p>{template.summary}</p>
                <p className="muted">{template.playStyle}</p>
              </div>
              <div className="template-metrics">
                <span>{countRosterFighters(previewRoster.members)} fighters</span>
                <span>{cost} gc</span>
                <span>{Math.max(0, (warband?.startingGold ?? 0) - cost)} gc left</span>
              </div>
              <button className="primary" onClick={() => onApply(template)}>
                Use this template
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RosterView({
  roster,
  validation,
  showIllegalOptions,
  allowDraftSave,
  blockingErrors,
  onRosterChange,
  onLookup,
  onToggleIllegal,
  onToggleDraftSave,
  onSave,
  onExport,
  onExportPdf
}: {
  roster: Roster;
  validation: ValidationIssue[];
  showIllegalOptions: boolean;
  allowDraftSave: boolean;
  blockingErrors: boolean;
  onRosterChange: (updater: (roster: Roster) => Roster) => void;
  onLookup: (item: LookupItem) => void;
  onToggleIllegal: (value: boolean) => void;
  onToggleDraftSave: (value: boolean) => void;
  onSave: () => void;
  onExport: () => void;
  onExportPdf: () => void;
}) {
  return (
    <div className="two-column">
      <section className="primary-flow print-sheet">
        <PrintableRosterSheet roster={roster} />
        <RosterHeader roster={roster} />
        <div className="action-strip no-print">
          <label className="toggle">
            <input type="checkbox" checked={showIllegalOptions} onChange={(event) => onToggleIllegal(event.target.checked)} />
            Show illegal options
          </label>
          <button onClick={onSave}>
            <Save aria-hidden /> Save
          </button>
          <button onClick={onExport}>
            <Download aria-hidden /> Export JSON
          </button>
          <button onClick={onExportPdf}>
            <Printer aria-hidden /> Export PDF
          </button>
        </div>
        <HirePanel roster={roster} onRosterChange={onRosterChange} />
        <MemberSections
          roster={roster}
          validation={validation}
          showIllegalOptions={showIllegalOptions}
          onRosterChange={onRosterChange}
          onLookup={onLookup}
        />
        <CampaignPanel roster={roster} onRosterChange={onRosterChange} />
      </section>
      <aside className="side-panel no-print">
        <ValidationPanel issues={validation} />
        <SavePanel
          blockingErrors={blockingErrors}
          allowDraftSave={allowDraftSave}
          onToggleDraftSave={onToggleDraftSave}
          onSave={onSave}
        />
      </aside>
    </div>
  );
}

function CampaignView({
  roster,
  validation,
  onRosterChange,
  onSave,
  onEditRoster,
  onPlay,
  onAfterBattle
}: {
  roster: Roster;
  validation: ValidationIssue[];
  onRosterChange: (updater: (roster: Roster) => Roster) => void;
  onSave: () => void;
  onEditRoster: () => void;
  onPlay: () => void;
  onAfterBattle: () => void;
}) {
  const [entryType, setEntryType] = useState<Roster["campaignLog"][number]["type"]>("note");
  const [description, setDescription] = useState("");
  const [goldDelta, setGoldDelta] = useState(0);
  const [wyrdstoneDelta, setWyrdstoneDelta] = useState(0);
  const [logFilter, setLogFilter] = useState<CampaignLogFilter>("all");
  const warband = currentWarband(roster);
  const activeMembers = roster.members.filter((member) => member.status !== "dead" && member.status !== "retired");
  const summary = campaignSummary(roster);
  const tasks = campaignTasks(roster, validation);
  const progression = campaignFighterProgression(roster);
  const timeline = campaignTimeline(roster).filter((entry) => campaignLogMatchesFilter(entry, logFilter));
  const economy = campaignEconomy(roster);
  const logFilters: Array<{ id: CampaignLogFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "battles", label: "Battles" },
    { id: "income", label: "Income" },
    { id: "injuries", label: "Injuries" },
    { id: "trading", label: "Trading" },
    { id: "advances", label: "Advances" },
    { id: "upkeep", label: "Upkeep" },
    { id: "stash", label: "Stash" },
    { id: "notes", label: "Notes" }
  ];

  function addCampaignEntry() {
    if (!description.trim() && goldDelta === 0 && wyrdstoneDelta === 0) return;
    onRosterChange((current) => ({
      ...current,
      treasuryGold: current.treasuryGold + goldDelta,
      wyrdstoneShards: Math.max(0, current.wyrdstoneShards + wyrdstoneDelta),
      campaignLog: [
        {
          id: id("log"),
          rosterId: current.id,
          date: new Date().toISOString(),
          type: entryType,
          description: description || campaignEntryFallback(entryType),
          goldDelta,
          wyrdstoneDelta,
          rosterChanges: "",
          details: {
            tags: [entryType],
            treasury: goldDelta || wyrdstoneDelta
              ? {
                  before: current.treasuryGold,
                  after: current.treasuryGold + goldDelta,
                  wyrdstoneSold: 0,
                  wyrdstoneIncome: 0,
                  otherIncome: goldDelta,
                  deductions: 0,
                  manualAdjustment: 0
                }
              : undefined,
            exploration: wyrdstoneDelta
              ? {
                  diceValues: [],
                  wyrdstoneFound: wyrdstoneDelta,
                  specialResults: []
                }
              : undefined
          }
        },
        ...current.campaignLog
      ]
    }));
    setDescription("");
    setGoldDelta(0);
    setWyrdstoneDelta(0);
  }

  return (
    <section className="campaign-page">
      <div className="campaign-hero">
        <div className="roster-title-lockup">
          <WarbandBadge warbandTypeId={roster.warbandTypeId} size="large" />
          <div>
            <p className="eyebrow">Campaign</p>
            <h2>{roster.name}</h2>
            <p>{warband?.name ?? roster.warbandTypeId}</p>
          </div>
        </div>
        <div className="button-row">
          <button onClick={onPlay}>
            <Swords aria-hidden /> Play Mode
          </button>
          <button onClick={onEditRoster}>Edit roster</button>
          <button onClick={onAfterBattle}>After Battle</button>
          <button className="primary" onClick={onSave}>
            <Save aria-hidden /> Save Campaign
          </button>
        </div>
      </div>

      <div className="metric-grid campaign-metrics">
        <Metric icon={<Shield aria-hidden />} label="Rating" value={calculateWarbandRating(roster, rulesDb).toString()} />
        <Metric icon={<Swords aria-hidden />} label="Fighters" value={`${countRosterFighters(activeMembers)}`} />
        <Metric icon={<ClipboardList aria-hidden />} label="Battles" value={summary.battles.toString()} />
        <Metric icon={<BookOpen aria-hidden />} label="Record" value={summary.recordLabel} />
        <Metric icon={<Coins aria-hidden />} label="Treasury" value={`${roster.treasuryGold} gc`} />
        <Metric icon={<BookOpen aria-hidden />} label="Wyrdstone" value={`${roster.wyrdstoneShards}`} />
      </div>

      <div className="campaign-grid">
        <section className="campaign-card campaign-tasks">
          <div className="section-heading">
            <div>
              <h3>Campaign Tasks</h3>
              <p>Things to check before the next game.</p>
            </div>
          </div>
          {tasks.length === 0 ? (
            <div className="empty-state">No urgent campaign tasks found.</div>
          ) : (
            <div className="task-list">
              {tasks.map((task) => (
                <article className={`campaign-task ${task.tone ?? ""}`} key={task.id}>
                  {task.tone === "bad" ? <AlertTriangle aria-hidden /> : <CheckCircle2 aria-hidden />}
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="campaign-card economy-card">
          <div className="section-heading">
            <div>
              <h3>Economy</h3>
              <p>Gold, wyrdstone and recorded ledger movement.</p>
            </div>
          </div>
          <div className="economy-stats">
            <span>Gold gained <strong>{signed(economy.goldIn)} gc</strong></span>
            <span>Gold spent <strong>{signed(economy.goldOut)} gc</strong></span>
            <span>Net gold <strong>{signed(economy.netGold)} gc</strong></span>
            <span>Net wyrdstone <strong>{signed(economy.netWyrdstone)}</strong></span>
          </div>
          <div className="campaign-form compact-form">
            <label>
              <span>Type</span>
              <select value={entryType} onChange={(event) => setEntryType(event.target.value as Roster["campaignLog"][number]["type"])}>
                <option value="note">Note</option>
                <option value="battle">Battle</option>
                <option value="post_battle">Post battle</option>
                <option value="purchase">Purchase</option>
                <option value="sale">Sale</option>
                <option value="income">Income</option>
                <option value="exploration">Exploration</option>
                <option value="injury">Injury</option>
                <option value="advance">Advance</option>
                <option value="upkeep">Upkeep</option>
                <option value="stash">Stash</option>
                <option value="status">Status</option>
              </select>
            </label>
            <label>
              <span>Description</span>
              <input value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <NumberField label="Gold delta" value={goldDelta} onChange={setGoldDelta} />
            <NumberField label="Wyrdstone delta" value={wyrdstoneDelta} onChange={setWyrdstoneDelta} />
            <button onClick={addCampaignEntry}>
              <Plus aria-hidden /> Add entry
            </button>
          </div>
        </section>
      </div>

      <div className="campaign-grid wide">
        <CampaignUpkeepTools roster={roster} onRosterChange={onRosterChange} />
        <PostGameTradingChecklist rosterId={roster.id} />
      </div>

      <div className="campaign-grid wide">
        <section className="campaign-card">
          <div className="section-heading">
            <div>
              <h3>Battle History</h3>
              <p>Structured entries can be filtered by campaign activity.</p>
            </div>
          </div>
          <div className="segmented-control wrap" role="group" aria-label="Campaign log filters">
            {logFilters.map((filter) => (
              <button className={logFilter === filter.id ? "active" : ""} key={filter.id} onClick={() => setLogFilter(filter.id)}>
                {filter.label}
              </button>
            ))}
          </div>
          {timeline.length === 0 ? (
            <div className="empty-state">No campaign entries match this filter.</div>
          ) : (
            <div className="campaign-timeline">
              {timeline.map((entry) => (
                <details className="timeline-entry" key={entry.id}>
                  <summary>
                    <span>{new Date(entry.date).toLocaleDateString()}</span>
                    <strong>{entry.description}</strong>
                    <small>{entry.type.replaceAll("_", " ")}</small>
                  </summary>
                  {entry.rosterChanges ? (
                    <div className="campaign-summary">
                      {entry.rosterChanges.split("\n").filter(Boolean).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">No detailed roster changes recorded.</p>
                  )}
                  <StructuredCampaignLogDetails entry={entry} />
                  <p className="muted">Gold {signed(entry.goldDelta)} gc. Wyrdstone {signed(entry.wyrdstoneDelta)}.</p>
                </details>
              ))}
            </div>
          )}
        </section>

        <section className="campaign-card">
          <div className="section-heading">
            <div>
              <h3>Fighter Progression</h3>
              <p>XP, advances, lasting injuries and campaign status.</p>
            </div>
          </div>
          <div className="progression-list">
            {progression.map((fighter) => (
              <article className="progression-card" key={fighter.id}>
                <header>
                  <div>
                    <strong>{fighter.name}</strong>
                    <p>{fighter.typeName}</p>
                  </div>
                  <span className="pill">{fighter.status}</span>
                </header>
                <div className="progression-stats">
                  <span>XP <strong>{fighter.currentXp}</strong></span>
                  <span>Advances <strong>{fighter.advances}</strong></span>
                  <span>Injuries <strong>{fighter.injuries}</strong></span>
                </div>
                {fighter.flags.length > 0 && (
                  <div className="lookup-tags">
                    {fighter.flags.map((flag) => (
                      <span className="pill" key={flag}>{flag}</span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="campaign-card">
        <div className="section-heading">
          <div>
            <h3>Campaign Notes</h3>
            <p>Story notes, rivals, grudges, plans and house-rule reminders.</p>
          </div>
        </div>
        <textarea
          className="campaign-notes-field"
          value={roster.campaignNotes}
          onChange={(event) => onRosterChange((current) => ({ ...current, campaignNotes: event.target.value }))}
        />
      </section>
    </section>
  );
}

function CampaignUpkeepTools({
  roster,
  onRosterChange
}: {
  roster: Roster;
  onRosterChange: (updater: (roster: Roster) => Roster) => void;
}) {
  const [oldBattleRolls, setOldBattleRolls] = useState<Record<string, number>>({});
  const [stashItemId, setStashItemId] = useState(roster.storedEquipment[0] ?? "");
  const [stashTargetId, setStashTargetId] = useState(roster.members.find((member) => member.status === "active")?.id ?? "");
  const [fighterSourceId, setFighterSourceId] = useState(roster.members.find((member) => member.equipment.length > 0)?.id ?? "");
  const sourceMember = roster.members.find((member) => member.id === fighterSourceId);
  const [fighterItemId, setFighterItemId] = useState(sourceMember?.equipment[0] ?? "");
  const activeMembers = roster.members.filter((member) => member.status !== "dead" && member.status !== "retired");
  const hiredSwordMembers = activeMembers.filter((member) => member.kind === "hired_sword");
  const hiredSwordUpkeep = hiredSwordMembers.reduce((total, member) => total + (hiredSwordForMember(member)?.upkeep ?? 0), 0);
  const missNextGameMembers = activeMembers.filter((member) => hasMissNextGameReminder(member));
  const oldBattleWoundMembers = activeMembers.filter((member) => hasOldBattleWound(member));

  useEffect(() => {
    if (stashItemId && roster.storedEquipment.includes(stashItemId)) return;
    setStashItemId(roster.storedEquipment[0] ?? "");
  }, [roster.storedEquipment, stashItemId]);

  useEffect(() => {
    const nextSource = roster.members.find((member) => member.id === fighterSourceId);
    if (nextSource?.equipment.includes(fighterItemId)) return;
    setFighterItemId(nextSource?.equipment[0] ?? "");
  }, [fighterItemId, fighterSourceId, roster.members]);

  function payHiredSwordUpkeep() {
    if (hiredSwordUpkeep <= 0) return;
    const names = hiredSwordMembers.map((member) => member.displayName || hiredSwordForMember(member)?.name || "Hired Sword");
    onRosterChange((current) => ({
      ...current,
      treasuryGold: Math.max(0, current.treasuryGold - hiredSwordUpkeep),
      campaignLog: [
        campaignLogEntry(current, {
          type: "upkeep",
          description: `Paid hired sword upkeep`,
          goldDelta: -hiredSwordUpkeep,
          rosterChanges: `Paid ${hiredSwordUpkeep} gc upkeep for ${names.join(", ")}.`,
          details: {
            tags: ["upkeep", "hired-sword"],
            transactions: hiredSwordMembers.map((member) => {
              const hiredSword = hiredSwordForMember(member);
              return {
                action: "upkeep",
                itemName: member.displayName || hiredSword?.name || "Hired Sword",
                value: -(hiredSword?.upkeep ?? 0),
                assignedTo: member.id,
                notes: "Hired sword upkeep paid before the next battle."
              };
            }),
            treasury: {
              before: current.treasuryGold,
              after: Math.max(0, current.treasuryGold - hiredSwordUpkeep),
              wyrdstoneSold: 0,
              wyrdstoneIncome: 0,
              otherIncome: 0,
              deductions: hiredSwordUpkeep,
              manualAdjustment: 0
            }
          }
        }),
        ...current.campaignLog
      ]
    }));
  }

  function retireHiredSword(memberId: string) {
    const member = roster.members.find((entry) => entry.id === memberId);
    if (!member) return;
    onRosterChange((current) => ({
      ...current,
      members: current.members.map((entry) => (entry.id === memberId ? { ...entry, status: "retired" } : entry)),
      campaignLog: [
        campaignLogEntry(current, {
          type: "status",
          description: `Released ${member.displayName || "Hired Sword"}`,
          rosterChanges: `${member.displayName || "Hired Sword"} released from service.`,
          details: {
            tags: ["hired-sword", "status"],
            rosterUpdates: [{ type: "retired", targetId: memberId, description: "Hired sword released from service." }]
          }
        }),
        ...current.campaignLog
      ]
    }));
  }

  function markMissing(memberId: string) {
    const member = roster.members.find((entry) => entry.id === memberId);
    if (!member) return;
    onRosterChange((current) => ({
      ...current,
      members: current.members.map((entry) => (entry.id === memberId ? { ...entry, status: "missing" } : entry)),
      campaignLog: [
        campaignLogEntry(current, {
          type: "status",
          description: `${member.displayName || "Fighter"} will miss the next game`,
          rosterChanges: `${member.displayName || "Fighter"} marked missing for the next battle.`,
          details: {
            tags: ["miss-next-game", "status"],
            injuries: [{ fighterId: memberId, fighterName: member.displayName || "Fighter", result: "Miss next game", followUps: [] }],
            rosterUpdates: [{ type: "status", targetId: memberId, description: "Marked missing for the next battle." }]
          }
        }),
        ...current.campaignLog
      ]
    }));
  }

  function clearMissNextGame(memberId: string) {
    const member = roster.members.find((entry) => entry.id === memberId);
    if (!member) return;
    onRosterChange((current) => ({
      ...current,
      members: current.members.map((entry) => (
        entry.id === memberId
          ? {
              ...entry,
              status: entry.status === "missing" ? "active" : entry.status,
              injuries: entry.injuries.filter((injury) => !isMissNextGameInjury(injury))
            }
          : entry
      )),
      campaignLog: [
        campaignLogEntry(current, {
          type: "status",
          description: `Cleared miss-next-game reminder for ${member.displayName || "Fighter"}`,
          rosterChanges: `${member.displayName || "Fighter"} is available again.`,
          details: {
            tags: ["miss-next-game", "status"],
            rosterUpdates: [{ type: "status", targetId: memberId, description: "Cleared miss-next-game reminder." }]
          }
        }),
        ...current.campaignLog
      ]
    }));
  }

  function rollOldBattleWound(member: RosterMember) {
    const roll = rollD6();
    setOldBattleRolls((current) => ({ ...current, [member.id]: roll }));
    onRosterChange((current) => ({
      ...current,
      members: current.members.map((entry) => (entry.id === member.id && roll === 1 ? { ...entry, status: "missing" } : entry)),
      campaignLog: [
        campaignLogEntry(current, {
          type: "status",
          description: `Old Battle Wound check: ${member.displayName || "Fighter"} rolled ${roll}`,
          rosterChanges: roll === 1
            ? `${member.displayName || "Fighter"} rolled 1 and misses this battle.`
            : `${member.displayName || "Fighter"} passed the Old Battle Wound check.`,
          details: {
            tags: ["old-battle-wound", "status"],
            injuries: [{
              fighterId: member.id,
              fighterName: member.displayName || "Fighter",
              result: "Old Battle Wound",
              notes: `Pre-battle check roll: ${roll}`,
              followUps: []
            }],
            rosterUpdates: roll === 1
              ? [{ type: "status", targetId: member.id, description: "Marked missing after Old Battle Wound roll." }]
              : []
          }
        }),
        ...current.campaignLog
      ]
    }));
  }

  function assignStashItem() {
    if (!stashItemId || !stashTargetId) return;
    const target = roster.members.find((member) => member.id === stashTargetId);
    onRosterChange((current) => ({
      ...current,
      storedEquipment: removeFirst(current.storedEquipment, stashItemId),
      members: current.members.map((member) => (member.id === stashTargetId ? { ...member, equipment: [...member.equipment, stashItemId] } : member)),
      campaignLog: [
        campaignLogEntry(current, {
          type: "stash",
          description: `Moved ${equipmentName(stashItemId)} from stash`,
          rosterChanges: `${equipmentName(stashItemId)} moved from stash to ${target?.displayName || "a fighter"}.`,
          details: {
            tags: ["stash", "equipment"],
            transactions: [{
              action: "moved",
              itemName: equipmentName(stashItemId),
              assignedTo: stashTargetId,
              notes: "Moved from stash to fighter."
            }]
          }
        }),
        ...current.campaignLog
      ]
    }));
  }

  function moveFighterItemToStash() {
    if (!fighterSourceId || !fighterItemId) return;
    const member = roster.members.find((entry) => entry.id === fighterSourceId);
    onRosterChange((current) => ({
      ...current,
      storedEquipment: [...current.storedEquipment, fighterItemId],
      members: current.members.map((entry) => (entry.id === fighterSourceId ? { ...entry, equipment: removeFirst(entry.equipment, fighterItemId) } : entry)),
      campaignLog: [
        campaignLogEntry(current, {
          type: "stash",
          description: `Moved ${equipmentName(fighterItemId)} to stash`,
          rosterChanges: `${equipmentName(fighterItemId)} moved from ${member?.displayName || "fighter"} to stash.`,
          details: {
            tags: ["stash", "equipment"],
            transactions: [{
              action: "moved",
              itemName: equipmentName(fighterItemId),
              assignedTo: "stash",
              notes: `Moved from ${member?.displayName || "fighter"} to stash.`
            }]
          }
        }),
        ...current.campaignLog
      ]
    }));
  }

  return (
    <section className="campaign-card campaign-tools">
      <div className="section-heading">
        <div>
          <h3>Campaign Upkeep</h3>
          <p>Resolve upkeep, availability checks and stash moves before the next game.</p>
        </div>
      </div>
      <div className="campaign-tool-grid">
        <article className="campaign-tool-box">
          <header>
            <strong>Hired sword upkeep</strong>
            <span className="pill">{hiredSwordUpkeep} gc</span>
          </header>
          {hiredSwordMembers.length === 0 ? (
            <p className="muted">No hired swords currently active.</p>
          ) : (
            <div className="mini-list">
              {hiredSwordMembers.map((member) => {
                const hiredSword = hiredSwordForMember(member);
                return (
                  <div key={member.id}>
                    <span>{member.displayName || hiredSword?.name}</span>
                    <small>{hiredSword?.upkeep ?? 0} gc upkeep</small>
                    <button onClick={() => retireHiredSword(member.id)}>Release</button>
                  </div>
                );
              })}
            </div>
          )}
          <button className="primary" disabled={hiredSwordUpkeep <= 0} onClick={payHiredSwordUpkeep}>
            <Coins aria-hidden /> Pay all upkeep
          </button>
        </article>

        <article className="campaign-tool-box">
          <header>
            <strong>Miss next game</strong>
            <span className="pill">{missNextGameMembers.length}</span>
          </header>
          {missNextGameMembers.length === 0 ? (
            <p className="muted">No miss-next-game reminders found.</p>
          ) : (
            <div className="mini-list">
              {missNextGameMembers.map((member) => (
                <div key={member.id}>
                  <span>{member.displayName}</span>
                  <small>{member.status}</small>
                  <button onClick={() => markMissing(member.id)}>Mark missing</button>
                  <button onClick={() => clearMissNextGame(member.id)}>Clear</button>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="campaign-tool-box">
          <header>
            <strong>Old Battle Wound</strong>
            <span className="pill">{oldBattleWoundMembers.length}</span>
          </header>
          {oldBattleWoundMembers.length === 0 ? (
            <p className="muted">No Old Battle Wound reminders found.</p>
          ) : (
            <div className="mini-list">
              {oldBattleWoundMembers.map((member) => (
                <div key={member.id}>
                  <span>{member.displayName}</span>
                  <small>{oldBattleRolls[member.id] ? `Last roll ${oldBattleRolls[member.id]}` : "Roll before battle"}</small>
                  <button onClick={() => rollOldBattleWound(member)}>
                    <Dices aria-hidden /> Roll
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="campaign-tool-box stash-tool">
          <header>
            <strong>Stash movement</strong>
            <span className="pill">{roster.storedEquipment.length} stored</span>
          </header>
          <div className="form-grid compact-form">
            <label>
              <span>Stash item</span>
              <select value={stashItemId} onChange={(event) => setStashItemId(event.target.value)}>
                <option value="">Choose item</option>
                {roster.storedEquipment.map((itemId, index) => (
                  <option value={itemId} key={`${itemId}-${index}`}>{equipmentName(itemId)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Move to</span>
              <select value={stashTargetId} onChange={(event) => setStashTargetId(event.target.value)}>
                <option value="">Choose fighter</option>
                {activeMembers.map((member) => (
                  <option value={member.id} key={member.id}>{member.displayName}</option>
                ))}
              </select>
            </label>
            <button disabled={!stashItemId || !stashTargetId} onClick={assignStashItem}>Assign from stash</button>
          </div>
          <div className="form-grid compact-form">
            <label>
              <span>Fighter</span>
              <select value={fighterSourceId} onChange={(event) => setFighterSourceId(event.target.value)}>
                <option value="">Choose fighter</option>
                {activeMembers.filter((member) => member.equipment.length > 0).map((member) => (
                  <option value={member.id} key={member.id}>{member.displayName}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Equipment</span>
              <select value={fighterItemId} onChange={(event) => setFighterItemId(event.target.value)}>
                <option value="">Choose item</option>
                {(sourceMember?.equipment ?? []).map((itemId, index) => (
                  <option value={itemId} key={`${itemId}-${index}`}>{equipmentName(itemId)}</option>
                ))}
              </select>
            </label>
            <button disabled={!fighterSourceId || !fighterItemId} onClick={moveFighterItemToStash}>Move to stash</button>
          </div>
        </article>
      </div>
    </section>
  );
}

function PostGameTradingChecklist({ rosterId }: { rosterId: string }) {
  const storageKey = `mordheim.tradingChecklist.${rosterId}`;
  const checklistItems = [
    "Resolve serious injuries",
    "Add XP and allocate advances",
    "Roll exploration",
    "Sell wyrdstone",
    "Pay hired sword upkeep",
    "Search for rare items",
    "Buy, sell or move equipment",
    "Recruit or dismiss fighters",
    "Save campaign changes"
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Record<string, boolean>;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(checked));
  }, [checked, storageKey]);

  function toggle(item: string) {
    setChecked((current) => ({ ...current, [item]: !current[item] }));
  }

  return (
    <section className="campaign-card trading-checklist">
      <div className="section-heading">
        <div>
          <h3>Post-game Trading Checklist</h3>
          <p>A table-side checklist for the steps people most often forget.</p>
        </div>
        <button onClick={() => setChecked({})}>
          <RotateCcw aria-hidden /> Reset
        </button>
      </div>
      <div className="checklist-grid">
        {checklistItems.map((item) => (
          <label className="checklist-item" key={item}>
            <input type="checkbox" checked={Boolean(checked[item])} onChange={() => toggle(item)} />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

function StructuredCampaignLogDetails({ entry }: { entry: Roster["campaignLog"][number] }) {
  const details = entry.details;
  if (!details) return null;
  const tags = campaignLogTags(entry);
  return (
    <div className="structured-log-details">
      {tags.length > 0 && (
        <div className="lookup-tags">
          {tags.map((tag) => <span className="pill" key={tag}>{tag}</span>)}
        </div>
      )}
      {details.battle && (
        <p><strong>Battle:</strong> {[details.battle.result, details.battle.scenario, details.battle.opponent].filter(Boolean).join(" - ")}</p>
      )}
      {details.treasury && (
        <p><strong>Treasury:</strong> {details.treasury.before} gc to {details.treasury.after} gc. Wyrdstone sold {details.treasury.wyrdstoneSold ?? 0}.</p>
      )}
      {details.exploration && (
        <p><strong>Exploration:</strong> {details.exploration.wyrdstoneFound ?? 0} wyrdstone found{details.exploration.diceValues?.length ? ` from dice ${details.exploration.diceValues.join(", ")}` : ""}.</p>
      )}
      {details.injuries?.length ? (
        <p><strong>Injuries:</strong> {details.injuries.map((injury) => `${injury.fighterName}: ${injury.result}`).join(", ")}</p>
      ) : null}
      {details.advances?.length ? (
        <p><strong>Advances:</strong> {details.advances.map((advance) => `${advance.fighterName} ${advance.xpThreshold}: ${advance.result || "not selected"}`).join(", ")}</p>
      ) : null}
      {details.transactions?.length ? (
        <p><strong>Transactions:</strong> {details.transactions.map((transaction) => {
          const value = typeof transaction.value === "number" ? ` (${formatGoldDelta(transaction.value)})` : "";
          const movement = [transaction.removeFrom ? `from ${transaction.removeFrom}` : "", transaction.assignedTo ? `to ${transaction.assignedTo}` : ""].filter(Boolean).join(" ");
          return `${transaction.action} ${transaction.itemName || transaction.equipmentItemId || "item"}${value}${movement ? ` ${movement}` : ""}`;
        }).join(", ")}</p>
      ) : null}
    </div>
  );
}

function PlayModeView({
  roster,
  onEditRoster,
  onAfterBattle,
  onExportPdf,
  onLookup
}: {
  roster: Roster;
  onEditRoster: () => void;
  onAfterBattle: () => void;
  onExportPdf: () => void;
  onLookup: (item: LookupItem) => void;
}) {
  const [battleState, setBattleState] = useState<BattleState>(() => readBattleState(roster));
  const [fighterFilter, setFighterFilter] = useState<"all" | "active">("all");
  const [heroesFirst, setHeroesFirst] = useState(true);
  const [compact, setCompact] = useState(true);
  const [showRulesSearch, setShowRulesSearch] = useState(false);
  const [showDiceTools, setShowDiceTools] = useState(false);
  const [rulesQuery, setRulesQuery] = useState("");
  const [recentRuleIds, setRecentRuleIds] = useState<string[]>(() => readRecentRuleIds());

  useEffect(() => {
    setBattleState(readBattleState(roster));
  }, [roster.id]);

  useEffect(() => {
    setBattleState((current) => {
      const next = ensureBattleState(roster, current);
      writeBattleState(next);
      return next;
    });
  }, [roster]);

  function updateBattleMember(member: RosterMember, patch: Partial<BattleMemberState>) {
    setBattleState((current) => {
      const currentMember = current.members[member.id] ?? defaultBattleMemberState(member);
      const next = {
        ...ensureBattleState(roster, current),
        updatedAt: new Date().toISOString(),
        members: {
          ...current.members,
          [member.id]: { ...currentMember, ...patch, memberId: member.id }
        }
      };
      writeBattleState(next);
      return next;
    });
  }

  function resetBattleState() {
    if (!window.confirm("Reset temporary battle state for this warband? This will not change the saved roster.")) return;
    const next = createBattleState(roster);
    writeBattleState(next);
    setBattleState(next);
  }

  function openRule(record: RuleLookupRecord) {
    const resolvedRecord = rulesLookupRecords.find((item) => item.id === record.id) ?? record;
    const nextRecent = [resolvedRecord.id, ...recentRuleIds.filter((id) => id !== resolvedRecord.id)].slice(0, 6);
    setRecentRuleIds(nextRecent);
    writeRecentRuleIds(nextRecent);
    onLookup({ type: "rule", item: resolvedRecord });
  }

  const playableMembers = roster.members.filter((member) => member.status !== "dead" && member.status !== "retired");
  const sortedMembers = [...playableMembers].sort((a, b) => {
    if (!heroesFirst) return playableMembers.indexOf(a) - playableMembers.indexOf(b);
    const aOrder = a.kind === "hero" ? 0 : a.kind === "henchman_group" ? 1 : 2;
    const bOrder = b.kind === "hero" ? 0 : b.kind === "henchman_group" ? 1 : 2;
    return aOrder - bOrder;
  });
  const visibleMembers = sortedMembers.filter((member) => {
    const state = battleState.members[member.id] ?? defaultBattleMemberState(member);
    return fighterFilter === "all" || state.status !== "out_of_action";
  });
  const totalFighters = countRosterFighters(playableMembers);
  const outOfAction = playableMembers.reduce((total, member) => {
    const state = battleState.members[member.id];
    return total + (state?.status === "out_of_action" ? memberModelCount(member) : 0);
  }, 0);
  const warband = currentWarband(roster);

  return (
    <section className={`play-mode ${compact ? "compact-play" : "comfortable-play"}`}>
      <PrintableRosterSheet roster={roster} />
      <div className="play-summary">
        <div className="roster-title-lockup">
          <WarbandBadge warbandTypeId={roster.warbandTypeId} size="large" />
          <div>
            <p className="eyebrow">Play Mode</p>
            <h2>{roster.name}</h2>
            <p>{warband?.name ?? roster.warbandTypeId}</p>
          </div>
        </div>
        <div className="play-metrics">
          <Metric icon={<Shield aria-hidden />} label="Rating" value={calculateWarbandRating(roster, rulesDb).toString()} />
          <Metric icon={<Swords aria-hidden />} label="Fighters" value={totalFighters.toString()} />
          <Metric icon={<AlertTriangle aria-hidden />} label="Out" value={outOfAction.toString()} tone={outOfAction > 0 ? "bad" : undefined} />
          <Metric icon={<BookOpen aria-hidden />} label="Rout at" value={`${calculateRoutThreshold(totalFighters)} out`} />
        </div>
        <div className="play-actions">
          <button onClick={onExportPdf}>
            <Printer aria-hidden /> Export PDF
          </button>
          <button onClick={() => setShowRulesSearch((value) => !value)}>
            <Search aria-hidden /> Rules
          </button>
          <button onClick={() => setShowDiceTools((value) => !value)}>
            <Dices aria-hidden /> Dice / Tables
          </button>
          <button onClick={resetBattleState}>
            <RotateCcw aria-hidden /> Reset Battle State
          </button>
          <button onClick={onEditRoster}>Edit roster</button>
          <button className="primary" onClick={onAfterBattle}>
            End Battle / After Battle
          </button>
        </div>
      </div>

      {showRulesSearch && (
        <RulesSearchPanel
          query={rulesQuery}
          recentRuleIds={recentRuleIds}
          onQueryChange={setRulesQuery}
          onOpenRule={openRule}
        />
      )}

      {showDiceTools && <DiceTablesPanel onLookup={onLookup} />}

      <div className="play-controls" aria-label="Play Mode filters">
        <label>
          <span>Show fighters</span>
          <select value={fighterFilter} onChange={(event) => setFighterFilter(event.target.value as "all" | "active")}>
            <option value="all">Show all fighters</option>
            <option value="active">Show active only</option>
          </select>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={heroesFirst} onChange={(event) => setHeroesFirst(event.target.checked)} />
          Heroes first
        </label>
        <label className="toggle">
          <input type="checkbox" checked={compact} onChange={(event) => setCompact(event.target.checked)} />
          Compact density
        </label>
      </div>

      <div className="play-card-grid">
        {visibleMembers.map((member) => (
          <FighterCard
            key={member.id}
            roster={roster}
            member={member}
            battleState={battleState.members[member.id] ?? defaultBattleMemberState(member)}
            onBattleChange={(patch) => updateBattleMember(member, patch)}
            onOpenRule={openRule}
          />
        ))}
      </div>
    </section>
  );
}

function RulesSearchPanel({
  query,
  recentRuleIds,
  onQueryChange,
  onOpenRule
}: {
  query: string;
  recentRuleIds: string[];
  onQueryChange: (value: string) => void;
  onOpenRule: (record: RuleLookupRecord) => void;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const recentRules = recentRuleIds
    .map((id) => rulesLookupRecords.find((record) => record.id === id))
    .filter((record): record is RuleLookupRecord => Boolean(record));
  const results = normalizedQuery
    ? rulesLookupRecords
        .filter((record) => ruleMatchesQuery(record, normalizedQuery))
        .slice(0, 30)
    : recentRules;

  return (
    <section className="rules-search-panel">
      <label>
        <span>Rules search</span>
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search skills, spells, equipment and rules" />
      </label>
      <div className="lookup-results">
        {results.length === 0 ? (
          <div className="empty-state">{query ? "No rules found." : "Recent lookups will appear here."}</div>
        ) : (
          results.map((record) => (
            <button className="lookup-result" key={record.id} onClick={() => onOpenRule(record)}>
              <strong>{record.name}</strong>
              <span>{record.category.replaceAll("-", " ")}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function DiceTablesPanel({ onLookup }: { onLookup: (item: LookupItem) => void }) {
  const [explorationDiceCount, setExplorationDiceCount] = useState(3);

  return (
    <section className="dice-helper-panel">
      <div className="section-heading">
        <div>
          <h3>Dice and table helper</h3>
          <p>Quick rolls for common checks, plus linked table results for post-game rolls.</p>
        </div>
      </div>
      <div className="smart-roll-grid">
        <SmartTableRoller title="Quick D6" rollKind="d6" onLookup={onLookup} />
        <SmartTableRoller title="Quick 2D6" rollKind="2d6" onLookup={onLookup} />
        <SmartTableRoller title="Quick D66" rollKind="d66" onLookup={onLookup} />
        <SmartTableRoller
          title="Hero serious injury"
          rollKind="d66"
          recordId="table-serious-injuries"
          tableCaption="Heroes' Serious Injuries"
          helperText="Rolls the Heroes' Serious Injuries table and highlights the matched row."
          onLookup={onLookup}
        />
        <SmartTableRoller
          title="Henchman injury"
          rollKind="d6"
          recordId="table-henchmen-injuries"
          tableCaption="Henchmen Injuries"
          helperText="Rolls the Henchman injury table."
          onLookup={onLookup}
        />
        <SmartTableRoller
          title="Exploration"
          rollKind="exploration"
          recordId="table-exploration"
          tableCaption="Number Of Wyrdstone Shards Found"
          diceCount={explorationDiceCount}
          diceCountOptions={[1, 2, 3, 4, 5, 6]}
          onDiceCountChange={setExplorationDiceCount}
          helperText="Rolls exploration dice, totals wyrdstone and calls out doubles or better."
          onLookup={onLookup}
        />
      </div>
    </section>
  );
}

function SmartTableRoller({
  title,
  rollKind,
  recordId,
  tableCaption,
  diceCount = 1,
  diceCountOptions,
  autoApply = false,
  showFollowUpDice = true,
  helperText,
  onDiceCountChange,
  onUseResult,
  onLookup
}: {
  title: string;
  rollKind: TableRollKind;
  recordId?: string;
  tableCaption?: string;
  diceCount?: number;
  diceCountOptions?: number[];
  autoApply?: boolean;
  showFollowUpDice?: boolean;
  helperText?: string;
  onDiceCountChange?: (value: number) => void;
  onUseResult?: (result: TableRollResult) => void;
  onLookup: (item: LookupItem) => void;
}) {
  const [lastRoll, setLastRoll] = useState<TableRollResult>();
  const rollLabel = rollKind === "exploration" ? "exploration dice" : rollKind.toUpperCase();

  function rollAndMaybeApply() {
    const result = createTableRoll(rulesLookupRecords, { kind: rollKind, recordId, tableCaption, diceCount });
    setLastRoll(result);
    if (autoApply && onUseResult) onUseResult(result);
  }

  return (
    <article className="smart-roll-card">
      <header>
        <div>
          <strong>{title}</strong>
          {helperText && <p>{helperText}</p>}
        </div>
      </header>
      {diceCountOptions && onDiceCountChange && (
        <label>
          <span>Dice</span>
          <select value={diceCount} onChange={(event) => onDiceCountChange(Number(event.target.value))}>
            {diceCountOptions.map((option) => (
              <option value={option} key={option}>{option}</option>
            ))}
          </select>
        </label>
      )}
      <button className="primary" onClick={rollAndMaybeApply}>
        <Dices aria-hidden /> {autoApply && onUseResult ? `Roll ${rollLabel} and apply` : `Roll ${rollLabel}`}
      </button>
      {lastRoll && (
        <SmartRollSummary
          result={lastRoll}
          onLookup={onLookup}
          onUseResult={autoApply ? undefined : onUseResult}
          showFollowUpDice={showFollowUpDice}
        />
      )}
    </article>
  );
}

function SmartRollSummary({
  result,
  onLookup,
  onUseResult,
  showFollowUpDice = true
}: {
  result: TableRollResult;
  onLookup: (item: LookupItem) => void;
  onUseResult?: (result: TableRollResult) => void;
  showFollowUpDice?: boolean;
}) {
  return (
    <div className="smart-roll-result">
      <p>
        <strong>{result.rollLabel}</strong>
        <span>{result.result}</span>
      </p>
      {result.effect && <p>{result.effect}</p>}
      {result.specialResults?.length ? (
        <div className="lookup-tags">
          {result.specialResults.map((item) => (
            <span className="pill" key={item}>{item}</span>
          ))}
        </div>
      ) : null}
      {showFollowUpDice && <FollowUpRollButtons text={result.effect} />}
      <div className="button-row">
        {result.recordId && (
          <button onClick={() => openLookupRecord(result.recordId!, onLookup, highlightForTableRoll(result))}>
            <BookOpen aria-hidden /> Show matched table row
          </button>
        )}
        {onUseResult && (
          <button onClick={() => onUseResult(result)}>Use this result</button>
        )}
      </div>
    </div>
  );
}

function FollowUpRollButtons({ text }: { text?: string }) {
  const dice = detectFollowUpDice(text);
  const [lastRolls, setLastRolls] = useState<Record<string, number>>({});
  if (dice.length === 0) return null;

  return (
    <div className="follow-up-rolls">
      <span>Follow-up roll:</span>
      {dice.map((die) => (
        <button
          key={die}
          onClick={() => setLastRolls((current) => ({ ...current, [die]: die === "D3" ? rollD3() : rollD6() }))}
        >
          Roll {die}{lastRolls[die] ? `: ${lastRolls[die]}` : ""}
        </button>
      ))}
    </div>
  );
}

function ExplorationDiceInsight({
  diceValues,
  onUseShardCount,
  onUseSpecialResults,
  onUseFollowUpResult,
  onLookup
}: {
  diceValues: number[];
  onUseShardCount: (value: number) => void;
  onUseSpecialResults: (values: string[]) => void;
  onUseFollowUpResult: (result: ExplorationFollowUpResult) => void;
  onLookup: (item: LookupItem) => void;
}) {
  const summary = getExplorationDiceSummary(rulesLookupRecords, diceValues);
  const match = summary.match;
  const primaryCombination = summary.combinations[0];
  const primaryMatch = primaryCombination?.match;
  if (summary.diceValues.length === 0) {
    return <div className="empty-state">Enter or roll exploration dice to see wyrdstone totals and matching combinations.</div>;
  }

  return (
    <div className="smart-roll-result exploration-insight">
      <p>
        <strong>Exploration total {summary.total}</strong>
        <span>{summary.wyrdstoneShards === undefined ? "No wyrdstone row matched" : `${summary.wyrdstoneShards} wyrdstone`}</span>
      </p>
      <p>Dice: {summary.diceValues.join(", ")}. {summary.combinations.length ? summary.combinations.map((combo) => combo.result ? `${combo.label}: ${combo.result}` : combo.label).join(", ") : "No doubles or triples."}</p>
      {primaryCombination?.result && (
        <div className="exploration-result-callout">
          <strong>{primaryCombination.label}: {primaryCombination.result}</strong>
          {primaryCombination.effect && <p>{primaryCombination.effect}</p>}
          {summary.combinations.length > 1 && <p>Use the highest/most numerous matching set first.</p>}
        </div>
      )}
      <div className="button-row">
        {summary.wyrdstoneShards !== undefined && (
          <button onClick={() => onUseShardCount(summary.wyrdstoneShards!)}>Record {summary.wyrdstoneShards} wyrdstone</button>
        )}
        {summary.combinations.length > 0 && (
          <button onClick={() => onUseSpecialResults(summary.combinations.map(formatExplorationCombination))}>Record exploration result</button>
        )}
        {match && (
          <button onClick={() => openLookupRecord("table-exploration", onLookup, highlightForTableMatch(match, `Exploration total ${summary.total}`))}>
            <BookOpen aria-hidden /> Show matched wyrdstone row
          </button>
        )}
        {primaryCombination && primaryMatch && (
          <button onClick={() => openLookupRecord("table-exploration", onLookup, highlightForTableMatch(primaryMatch, primaryCombination.label))}>
            <BookOpen aria-hidden /> Show exploration result
          </button>
        )}
      </div>
      {summary.combinations.some(hasExplorationFollowUp) && (
        <div className="exploration-follow-up-list">
          {summary.combinations.filter(hasExplorationFollowUp).map((combo) => (
            <ExplorationFollowUpRoller
              key={combo.combination}
              combo={combo}
              onRecord={onUseFollowUpResult}
              onLookup={onLookup}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExplorationFollowUpRoller({
  combo,
  onRecord,
  onLookup
}: {
  combo: ExplorationCombination;
  onRecord: (result: ExplorationFollowUpResult) => void;
  onLookup: (item: LookupItem) => void;
}) {
  const [roll, setRoll] = useState<ExplorationFollowUpResult>();
  const buttonLabel = `Roll follow-up${combo.result ? ` for ${combo.result}` : ""}`;

  return (
    <article className="exploration-follow-up-card">
      <header>
        <div>
          <strong>{combo.label}{combo.result ? `: ${combo.result}` : ""}</strong>
          {combo.effect && <p>{combo.effect}</p>}
        </div>
        {combo.match && (
          <button onClick={() => openLookupRecord("table-exploration", onLookup, highlightForTableMatch(combo.match!, combo.label))}>
            <BookOpen aria-hidden /> Table row
          </button>
        )}
      </header>
      <div className="button-row">
        <button onClick={() => setRoll(rollExplorationFollowUp(combo, Math.random, rulesLookupRecords))}>
          <Dices aria-hidden /> {buttonLabel}
        </button>
        {roll && (
          <button className="primary" onClick={() => onRecord(roll)}>
            Record follow-up
          </button>
        )}
      </div>
      {roll && (
        <div className="exploration-follow-up-result">
          <p>{roll.outcome}</p>
          <small>
            {roll.diceValues.length ? `Dice: ${roll.diceValues.join(", ")}. ` : ""}
            {typeof roll.goldDelta === "number" ? `Adds ${roll.goldDelta} gc. ` : ""}
            {typeof roll.wyrdstoneDelta === "number" ? `Adds ${roll.wyrdstoneDelta} wyrdstone. ` : ""}
          </small>
        </div>
      )}
    </article>
  );
}

function FighterCard({
  roster,
  member,
  battleState,
  onBattleChange,
  onOpenRule
}: {
  roster: Roster;
  member: RosterMember;
  battleState: BattleMemberState;
  onBattleChange: (patch: Partial<BattleMemberState>) => void;
  onOpenRule: (record: RuleLookupRecord) => void;
}) {
  const fighterType = rulesDb.fighterTypes.find((item) => item.id === member.fighterTypeId)!;
  const [rulesOpen, setRulesOpen] = useState(false);
  const equipment = member.equipment
    .map((itemId) => rulesDb.equipmentItems.find((item) => item.id === itemId))
    .filter((item): item is EquipmentItem => Boolean(item));
  const skills = member.skills
    .map((id) => rulesDb.skills.find((skill) => skill.id === id))
    .filter((skill): skill is Skill => Boolean(skill));
  const specialRules = unique([...fighterType.specialRuleIds, ...member.specialRules])
    .map((id) => rulesDb.specialRules.find((rule) => rule.id === id))
    .filter((rule): rule is SpecialRule => Boolean(rule));
  const castableRules = specialRules.filter((rule) => rule.validation.selectableAs);
  const passiveRules = specialRules.filter((rule) => !rule.validation.selectableAs);
  const maxWounds = maxBattleWounds(member);
  const startingXp = member.startingXp ?? fighterType.startingExperience;
  const currentXp = member.currentXp ?? member.experience;
  const equipmentRuleIds = unique(equipment.flatMap((item) => item.specialRuleIds));
  const equipmentRules = equipmentRuleIds
    .map((id) => rulesDb.specialRules.find((rule) => rule.id === id))
    .filter((rule): rule is SpecialRule => Boolean(rule));
  const statusRule = ruleRecordForBattleStatus(battleState.status);
  const equipmentRecords = equipment.map(ruleRecordForEquipment);
  const relevantRuleRecords = uniqueById([
    ...skills.map(ruleRecordForSkill),
    ...castableRules.map(ruleRecordForSpecialRule),
    ...member.injuries.map(ruleRecordForInjury),
    ...(statusRule ? [statusRule] : []),
    ...[...passiveRules, ...equipmentRules].map(ruleRecordForSpecialRule)
  ]);
  const battleXp = battleState.enemyOoaXp + battleState.objectiveXp + battleState.otherXp;
  const roleLabel = member.kind === "henchman_group"
    ? `Henchmen group x${member.groupSize}`
    : member.kind === "hired_sword"
      ? "Hired sword"
      : "Hero";

  function decrementBattleXp() {
    if (battleState.enemyOoaXp > 0) {
      onBattleChange({ enemyOoaXp: battleState.enemyOoaXp - 1 });
      return;
    }
    if (battleState.objectiveXp > 0) {
      onBattleChange({ objectiveXp: battleState.objectiveXp - 1 });
      return;
    }
    onBattleChange({ otherXp: Math.max(0, battleState.otherXp - 1) });
  }

  return (
    <article className={`play-fighter-card status-${battleState.status}`}>
      <header className="fighter-card-header">
        <div className="fighter-card-identity">
          <span className="fighter-card-icon" aria-hidden>
            <Swords aria-hidden />
          </span>
          <div>
            <h3>{member.displayName || fighterType.name}</h3>
            <p>{fighterType.name} · {roleLabel}</p>
          </div>
        </div>
        <StatusPill status={battleState.status} onChange={(status) => onBattleChange({ status })} />
        <p className="print-only print-status">Battle status: {battleStatusLabel(battleState.status)}</p>
      </header>

      <StatGrid profile={member.currentProfile} />

      <div className="fighter-state-row">
        <SmallPanel label="XP">
          <strong>{currentXp}</strong>
          <small>Starting {startingXp}</small>
        </SmallPanel>
        <SmallPanel label="Wounds">
          <div className="inline-stepper">
            <button aria-label="Reduce current wounds" onClick={() => onBattleChange({ currentWounds: Math.max(0, battleState.currentWounds - 1) })}>
              -
            </button>
            <strong>{Math.min(battleState.currentWounds, maxWounds)} / {maxWounds}</strong>
            <button aria-label="Increase current wounds" onClick={() => onBattleChange({ currentWounds: Math.min(maxWounds, battleState.currentWounds + 1) })}>
              +
            </button>
          </div>
        </SmallPanel>
        <SmallPanel label="Battle XP">
          <div className="inline-stepper battle-xp-stepper">
            <button aria-label="Remove battle XP" onClick={decrementBattleXp}>-</button>
            <strong>{battleXp}</strong>
            <button aria-label="Add battle XP" onClick={() => onBattleChange({ enemyOoaXp: battleState.enemyOoaXp + 1 })}>+</button>
          </div>
        </SmallPanel>
      </div>

      <div className="paper-trackers print-only" aria-hidden="true">
        <div>
          <strong>Battle status</strong>
          <span className="paper-checkline">
            <span className="paper-box" /> Hidden
            <span className="paper-box" /> Knocked down
            <span className="paper-box" /> Stunned
            <span className="paper-box" /> Out
          </span>
        </div>
        <div>
          <strong>Wounds</strong>
          <span className="paper-checkline">
            {Array.from({ length: Math.max(1, maxWounds) }, (_, index) => (
              <span className="paper-box" key={index} />
            ))}
          </span>
        </div>
        <div>
          <strong>XP this battle</strong>
          <span className="paper-line">Enemy out</span>
          <span className="paper-line">Objective</span>
          <span className="paper-line">Other</span>
        </div>
      </div>

      <RelevantRulesPanel
        open={rulesOpen}
        onToggle={() => setRulesOpen((value) => !value)}
        equipmentRecords={equipmentRecords}
        ruleRecords={relevantRuleRecords}
        onOpenRule={onOpenRule}
      />
      {member.notes && (
        <div className="play-notes">
          <strong>Notes</strong>
          <p>{member.notes}</p>
        </div>
      )}
    </article>
  );
}

function StatGrid({ profile }: { profile: RosterMember["currentProfile"] }) {
  const stats = ["M", "WS", "BS", "S", "T", "W", "I", "A", "Ld"] as const;
  return (
    <div className="fighter-stat-grid" role="table" aria-label="Current profile">
      {stats.map((stat) => (
        <StatBox label={stat} value={profile[stat]} key={stat} />
      ))}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-box" role="cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ status, onChange }: { status: BattleStatus; onChange: (status: BattleStatus) => void }) {
  return (
    <label className={`fighter-status-pill status-${status}`}>
      <span className="sr-only">Battle status</span>
      <select value={status} onChange={(event) => onChange(event.target.value as BattleStatus)}>
        <option value="active">Active</option>
        <option value="hidden">Hidden</option>
        <option value="knocked_down">Knocked down</option>
        <option value="stunned">Stunned</option>
        <option value="out_of_action">Out of action</option>
      </select>
    </label>
  );
}

function SmallPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="fighter-small-panel">
      <span>{label}</span>
      <div>{children}</div>
    </section>
  );
}

function RelevantRulesPanel({
  open,
  onToggle,
  equipmentRecords,
  ruleRecords,
  onOpenRule
}: {
  open: boolean;
  onToggle: () => void;
  equipmentRecords: RuleLookupRecord[];
  ruleRecords: RuleLookupRecord[];
  onOpenRule: (record: RuleLookupRecord) => void;
}) {
  const uniqueEquipment = uniqueById(equipmentRecords);
  const uniqueRules = uniqueById(ruleRecords);
  return (
    <section className={`relevant-rules-panel ${open ? "open" : ""}`}>
      <button className="relevant-rules-toggle" onClick={onToggle} aria-expanded={open}>
        <span>
          <ClipboardList aria-hidden />
          Relevant rules
          <b>{uniqueRules.length}</b>
        </span>
        <span>{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="relevant-rules-body">
          {uniqueEquipment.length > 0 && (
            <div className="equipment-tag-row" aria-label="Equipment">
              {uniqueEquipment.map((record) => (
                <button className="equipment-tag" key={record.id} onClick={() => onOpenRule(record)}>
                  {record.name}
                </button>
              ))}
            </div>
          )}
          <div className="relevant-rule-grid">
            {uniqueRules.length ? (
              uniqueRules.map((record) => (
                <button className="relevant-rule-button" key={record.id} onClick={() => onOpenRule(record)}>
                  <strong>{record.name}</strong>
                  <span>Tap to open rule excerpt</span>
                </button>
              ))
            ) : (
              <span className="muted">No relevant rules recorded.</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function PlayChipSection({
  title,
  items,
  onOpenRule
}: {
  title: string;
  items: RuleLookupRecord[];
  onOpenRule: (record: RuleLookupRecord) => void;
}) {
  const uniqueItems = uniqueById(items);
  return (
    <section className="play-chip-section">
      <h4>{title}</h4>
      <div className="chip-list">
        {uniqueItems.length ? (
          uniqueItems.map((record) => (
            <button className="chip" key={record.id} onClick={() => onOpenRule(record)}>
              {record.name}
            </button>
          ))
        ) : (
          <span className="muted">None</span>
        )}
      </div>
    </section>
  );
}

function HirePanel({
  roster,
  onRosterChange
}: {
  roster: Roster;
  onRosterChange: (updater: (roster: Roster) => Roster) => void;
}) {
  const [hireMode, setHireMode] = useState<"warband" | "hiredSwords">("warband");
  const warband = currentWarband(roster)!;
  const allowedWarbandFighters = getAllowedFighterTypes(warband.id, roster, rulesDb);
  const availableHiredSwords = rulesDb.hiredSwords.filter((hiredSword) => {
    if (hiredSword.implementationStatus !== "implemented") return false;
    if (hiredSword.allowedWarbandTypeIds.length > 0 && !hiredSword.allowedWarbandTypeIds.includes(roster.warbandTypeId)) return false;
    if (hiredSword.blockedWarbandTypeIds.includes(roster.warbandTypeId)) return false;
    return true;
  });

  function hireWarbandFighter(fighterType: FighterType) {
    onRosterChange((current) => {
      const kind: RosterMember["kind"] = fighterType.category === "henchman" ? "henchman_group" : "hero";
      const member = createRosterMemberFromType(fighterType, current.id, kind);
      const hireCost = fighterType.hireCost * member.groupSize;
      const campaignHire = current.campaignLog.length > 0;
      return {
        ...current,
        treasuryGold: campaignHire ? Math.max(0, current.treasuryGold - hireCost) : current.treasuryGold,
        members: [...current.members, member],
        campaignLog: campaignHire
          ? [
              campaignLogEntry(current, {
                type: "purchase",
                description: `Hired ${fighterType.name}`,
                goldDelta: -hireCost,
                rosterChanges: `${fighterType.name} added to the warband.`,
                details: {
                  tags: ["purchase", "recruitment"],
                  transactions: [{
                    action: "bought",
                    itemName: fighterType.name,
                    value: -hireCost,
                    assignedTo: member.id,
                    notes: "Warband fighter hired."
                  }],
                  rosterUpdates: [{ type: "recruit", targetId: member.id, description: `${fighterType.name} added to the warband.` }]
                }
              }),
              ...current.campaignLog
            ]
          : current.campaignLog
      };
    });
  }

  function hireHiredSword(hiredSword: HiredSword) {
    const fighterType = fighterTypeForHiredSword(hiredSword);
    if (!fighterType) return;
    onRosterChange((current) => {
      const alreadyHired = current.members.some((member) => member.status !== "dead" && member.status !== "retired" && member.fighterTypeId === fighterType.id);
      if (alreadyHired) return current;
      const member = createHiredSwordMember(hiredSword, fighterType, current.id);
      const campaignHire = current.campaignLog.length > 0;
      return {
        ...current,
        treasuryGold: campaignHire ? Math.max(0, current.treasuryGold - hiredSword.hireFee) : current.treasuryGold,
        members: [...current.members, member],
        campaignLog: campaignHire
          ? [
              campaignLogEntry(current, {
                type: "purchase",
                description: `Hired ${hiredSword.name}`,
                goldDelta: -hiredSword.hireFee,
                rosterChanges: `${hiredSword.name} added as a hired sword. Upkeep: ${hiredSword.upkeep} gc.`,
                details: {
                  tags: ["purchase", "hired-sword", "upkeep"],
                  transactions: [{
                    action: "bought",
                    itemName: hiredSword.name,
                    value: -hiredSword.hireFee,
                    assignedTo: member.id,
                    notes: `Hired Sword. Upkeep ${hiredSword.upkeep} gc.`
                  }],
                  rosterUpdates: [{ type: "recruit", targetId: member.id, description: `${hiredSword.name} added as a hired sword.` }]
                }
              }),
              ...current.campaignLog
            ]
          : current.campaignLog
      };
    });
  }

  return (
    <section className="hired-swords-panel no-print">
      <div className="section-heading">
        <div>
          <h2>Hire Fighters</h2>
          <p>Switch between normal warband recruits and hired swords.</p>
        </div>
        <div className="segmented-control" role="group" aria-label="Hire type">
          <button className={hireMode === "warband" ? "active" : ""} onClick={() => setHireMode("warband")}>
            Warband
          </button>
          <button className={hireMode === "hiredSwords" ? "active" : ""} onClick={() => setHireMode("hiredSwords")}>
            Hired Swords
          </button>
        </div>
      </div>
      <div className="hired-sword-grid">
        {hireMode === "warband" && allowedWarbandFighters.length === 0 ? (
          <div className="empty-state">No legal warband fighters can be hired right now.</div>
        ) : hireMode === "warband" ? (
          allowedWarbandFighters.map((fighterType) => {
            const groupSize = fighterType.category === "henchman" ? fighterType.groupMinSize ?? 1 : 1;
            const hireCost = fighterType.hireCost * groupSize;
            return (
              <article className="hired-sword-option" key={fighterType.id}>
                <div>
                  <strong>{fighterType.name}</strong>
                  <p>{fighterType.category === "henchman" ? `Henchman group starts at ${groupSize}.` : "Hero recruit."}</p>
                  <small>Hire {hireCost} gc{groupSize > 1 ? ` (${groupSize} models)` : ""}.</small>
                </div>
                <button onClick={() => hireWarbandFighter(fighterType)}>
                  <Plus aria-hidden /> Hire
                </button>
              </article>
            );
          })
        ) : availableHiredSwords.length === 0 ? (
          <div className="empty-state">No hired swords are available to this warband yet.</div>
        ) : (
          availableHiredSwords.map((hiredSword) => {
            const alreadyHired = roster.members.some((member) => member.status !== "dead" && member.status !== "retired" && member.fighterTypeId === `hired-sword-${hiredSword.id}`);
            return (
              <article className="hired-sword-option" key={hiredSword.id}>
                <div>
                  <strong>{hiredSword.name}</strong>
                  <p>{hiredSword.availabilitySummary}</p>
                  <small>Hire {hiredSword.hireFee} gc. Upkeep {hiredSword.upkeep} gc.</small>
                </div>
                <button disabled={alreadyHired} onClick={() => hireHiredSword(hiredSword)}>
                  <Plus aria-hidden /> {alreadyHired ? "Hired" : "Hire"}
                </button>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function fighterTypeForHiredSword(hiredSword: HiredSword) {
  return rulesDb.fighterTypes.find((fighterType) => fighterType.id === `hired-sword-${hiredSword.id}`);
}

function createHiredSwordMember(hiredSword: HiredSword, fighterType: FighterType, rosterId: string): RosterMember {
  const member = createRosterMemberFromType(fighterType, rosterId, "hired_sword", hiredSword.name);
  return {
    ...member,
    equipment: [...hiredSword.equipmentItemIds],
    skills: [],
    specialRules: [...fighterType.specialRuleIds],
    notes: [
      `Hired Sword. Hire fee: ${hiredSword.hireFee} gc. Upkeep: ${hiredSword.upkeep} gc.`,
      hiredSword.availabilitySummary,
      hiredSword.notes
    ].filter(Boolean).join("\n")
  };
}

function AfterBattleView({
  roster,
  onBackToPlay,
  onEditRoster,
  onLookup,
  onApply
}: {
  roster: Roster;
  onBackToPlay: () => void;
  onEditRoster: () => void;
  onLookup: (item: LookupItem) => void;
  onApply: (roster: Roster) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<AfterBattleDraft>(() => prepareAfterBattleDraft(roster));
  const steps = AFTER_BATTLE_STEPS;

  useEffect(() => {
    setDraft(prepareAfterBattleDraft(roster));
    setStepIndex(0);
  }, [roster.id]);

  useEffect(() => {
    writeAfterBattleDraft(draft);
  }, [draft]);

  function updateDraft(updater: (current: AfterBattleDraft) => AfterBattleDraft) {
    setDraft((current) => syncDraftAdvances(updater(current)));
  }

  const canContinue = canContinueAfterBattleStep(stepIndex, draft, roster);
  const stepBlocker = canContinue ? "" : afterBattleStepBlocker(stepIndex, draft, roster);
  const blockers = reviewBlockingMessages(draft, roster);

  return (
    <section className="after-battle">
      <div className="after-battle-header">
        <div>
          <p className="eyebrow">After Action Report</p>
          <h2>{roster.name}</h2>
          <p>Resolve the post-game steps here. Nothing permanent changes until the final review.</p>
        </div>
        <div className="button-row">
          <button onClick={onBackToPlay}>Back to Play Mode</button>
          <button onClick={onEditRoster}>Edit roster</button>
        </div>
      </div>

      <AfterBattleOverview
        draft={draft}
        roster={roster}
        blockers={blockers}
        currentStep={steps[stepIndex]}
        onGoToStep={setStepIndex}
      />

      <nav className="after-steps" aria-label="After Battle steps">
        {steps.map((step, index) => (
          <button
            key={step.label}
            className={index === stepIndex ? "active" : ""}
            onClick={() => setStepIndex(index)}
          >
            <span>{index + 1}. {step.shortLabel}</span>
            <small>{afterBattleStepStatus(index, draft, roster)}</small>
          </button>
        ))}
      </nav>

      <div className="after-step-body">
        {stepIndex === 0 && <BattleResultStep draft={draft} roster={roster} onChange={updateDraft} />}
        {stepIndex === 1 && <ExperienceStep draft={draft} onChange={updateDraft} />}
        {stepIndex === 2 && <SeriousInjuriesStep draft={draft} roster={roster} onChange={updateDraft} onLookup={onLookup} />}
        {stepIndex === 3 && <ExplorationStep draft={draft} roster={roster} onChange={updateDraft} onLookup={onLookup} />}
        {stepIndex === 4 && <IncomeStep draft={draft} roster={roster} onChange={updateDraft} onLookup={onLookup} />}
        {stepIndex === 5 && <TradingStep draft={draft} roster={roster} onChange={updateDraft} />}
        {stepIndex === 6 && <AdvancesStep draft={draft} onChange={updateDraft} />}
        {stepIndex === 7 && <RosterUpdatesStep draft={draft} roster={roster} onChange={updateDraft} />}
        {stepIndex === 8 && (
          <ReviewApplyStep
            draft={draft}
            roster={roster}
            onApply={() => {
              const updated = applyAfterBattleDraft(roster, draft);
              clearAfterBattleDraft(roster.id);
              resetBattleStateStorage(roster);
              onApply(updated);
            }}
          />
        )}
      </div>

      <div className="after-step-actions">
        <button disabled={stepIndex === 0} onClick={() => setStepIndex((index) => Math.max(0, index - 1))}>
          Previous
        </button>
        {stepIndex < steps.length - 1 ? (
          <button className="primary" disabled={!canContinue} onClick={() => setStepIndex((index) => Math.min(steps.length - 1, index + 1))}>
            Next
          </button>
        ) : (
          <span className="muted">Review the draft, then apply when ready.</span>
        )}
      </div>
      {stepBlocker && <p className="after-step-blocker">{stepBlocker}</p>}
    </section>
  );
}

function AfterBattleOverview({
  draft,
  roster,
  blockers,
  currentStep,
  onGoToStep
}: {
  draft: AfterBattleDraft;
  roster: Roster;
  blockers: string[];
  currentStep: (typeof AFTER_BATTLE_STEPS)[number];
  onGoToStep: (step: number) => void;
}) {
  const xpEntries = draft.xp.filter((entry) => entry.gainedXp > 0);
  const pendingAdvances = draft.advances.length;
  const unresolvedInjuries = draft.injuries.filter((entry) => {
    const member = roster.members.find((item) => item.id === entry.fighterId);
    if (member?.kind === "henchman_group") return false;
    return !entry.resolvedOutsideApp && !entry.result.trim();
  }).length;
  const treasuryDelta = draft.treasury.after - roster.treasuryGold;
  const changedUpdates = previewRosterUpdates(roster, draft).filter((line) => line !== "No roster updates recorded.").length;

  return (
    <section className="after-report-summary">
      <div className="after-report-current">
        <span className="eyebrow">Current step</span>
        <strong>{currentStep.label}</strong>
        <p>{currentStep.help}</p>
      </div>
      <div className="after-report-metrics">
        <button type="button" onClick={() => onGoToStep(1)}>
          <span>XP entered</span>
          <strong>{xpEntries.length}</strong>
          <small>{pendingAdvances ? `${pendingAdvances} advance${pendingAdvances === 1 ? "" : "s"} pending` : "No advances pending"}</small>
        </button>
        <button type="button" onClick={() => onGoToStep(2)}>
          <span>Injuries</span>
          <strong>{draft.injuries.length}</strong>
          <small>{unresolvedInjuries ? `${unresolvedInjuries} unresolved` : "Resolved so far"}</small>
        </button>
        <button type="button" onClick={() => onGoToStep(3)}>
          <span>Wyrdstone</span>
          <strong>{draft.exploration.wyrdstoneShards}</strong>
          <small>{draft.treasury.wyrdstoneSold} marked to sell</small>
        </button>
        <button type="button" onClick={() => onGoToStep(8)}>
          <span>Final treasury</span>
          <strong>{draft.treasury.after} gc</strong>
          <small>{treasuryDelta === 0 ? "No gold change" : `${treasuryDelta > 0 ? "+" : ""}${treasuryDelta} gc`}</small>
        </button>
      </div>
      <div className={`after-report-attention ${blockers.length ? "needs-work" : "ready"}`}>
        {blockers.length ? (
          <>
            <strong>Needs attention</strong>
            <p>{blockers[0]}</p>
          </>
        ) : (
          <>
            <strong>Ready so far</strong>
            <p>{changedUpdates} roster change{changedUpdates === 1 ? "" : "s"} currently queued for review.</p>
          </>
        )}
      </div>
    </section>
  );
}

function BattleResultStep({
  draft,
  roster,
  onChange
}: {
  draft: AfterBattleDraft;
  roster: Roster;
  onChange: (updater: (current: AfterBattleDraft) => AfterBattleDraft) => void;
}) {
  function updateBattleResult(patch: Partial<AfterBattleDraft["battleResult"]>) {
    onChange((current) => applyBattleResultXpDefaults({
      ...current,
      battleResult: { ...current.battleResult, ...patch }
    }, roster, patch));
  }

  return (
    <section className="after-card">
      <h3>Battle result</h3>
      {draft.battleResult.result === "win" && (
        <div className="exploration-result-callout">
          <strong>Winning leader XP</strong>
          <p>The leader of the winning warband normally gains +1 XP. This has been added in the Experience step and can still be edited there.</p>
        </div>
      )}
      <div className="form-grid">
        <label>
          <span>Opponent warband</span>
          <input value={draft.battleResult.opponent ?? ""} onChange={(event) => updateBattleResult({ opponent: event.target.value })} />
        </label>
        <label>
          <span>Scenario</span>
          <input value={draft.battleResult.scenario ?? ""} onChange={(event) => updateBattleResult({ scenario: event.target.value })} />
        </label>
        <label>
          <span>Result</span>
          <select value={draft.battleResult.result ?? ""} onChange={(event) => updateBattleResult({ result: event.target.value as BattleResult })}>
            <option value="">Select result</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="draw">Draw</option>
            <option value="routed">Routed</option>
            <option value="wiped-out">Wiped out</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          <span>Date played</span>
          <input type="date" value={draft.battleResult.datePlayed ?? ""} onChange={(event) => updateBattleResult({ datePlayed: event.target.value })} />
        </label>
        <label>
          <span>Rout detail</span>
          <select value={draft.battleResult.routType ?? ""} onChange={(event) => updateBattleResult({ routType: event.target.value })}>
            <option value="">Not recorded</option>
            <option value="voluntary">Voluntary rout</option>
            <option value="failed-test">Failed rout test</option>
            <option value="not-routed">Did not rout</option>
          </select>
        </label>
        <label className="toggle after-toggle">
          <input
            type="checkbox"
            checked={draft.battleResult.leaderSurvived ?? true}
            onChange={(event) => updateBattleResult({ leaderSurvived: event.target.checked })}
          />
          Leader survived
        </label>
      </div>
      <label>
        <span>Notes</span>
        <textarea value={draft.battleResult.notes ?? ""} onChange={(event) => updateBattleResult({ notes: event.target.value })} />
      </label>
    </section>
  );
}

function ExperienceStep({
  draft,
  onChange
}: {
  draft: AfterBattleDraft;
  onChange: (updater: (current: AfterBattleDraft) => AfterBattleDraft) => void;
}) {
  function updateXpEntry(fighterId: string, patch: Partial<AfterBattleXpEntry>) {
    onChange((current) => ({
      ...current,
      xp: current.xp.map((entry) => {
        if (entry.fighterId !== fighterId) return entry;
        return recalculateXpEntry({ ...entry, ...patch });
      })
    }));
  }

  return (
    <section className="after-card">
      <div className="section-heading">
        <div>
          <h3>Experience</h3>
          <p>Use the quick buttons for common XP, then open a fighter only when you need the extra fields.</p>
        </div>
        <span className="pill">{draft.advances.length ? `${draft.advances.length} advance${draft.advances.length === 1 ? "" : "s"} pending` : "No advances pending"}</span>
      </div>
      <div className="xp-grid">
        {draft.xp.length === 0 ? (
          <div className="empty-state">No fighters in this roster can gain experience.</div>
        ) : (
          draft.xp.map((entry) => (
            <details className="xp-panel xp-panel-details" key={entry.fighterId} open={(entry.gainedXp > 0 || entry.pendingAdvanceThresholds.length > 0 || Boolean(entry.notes)) || undefined}>
              <summary>
                <div>
                  <strong>{entry.fighterName}</strong>
                  <p>Starting {entry.startingXp} XP. Previous {entry.previousXp} XP.</p>
                </div>
                <div className="xp-summary-stack">
                  <span className="pill">{advanceSummary(entry.pendingAdvanceThresholds.length)}</span>
                  <strong>{entry.gainedXp > 0 ? `+${entry.gainedXp} XP` : "0 XP"}</strong>
                </div>
              </summary>
              <div className="quick-xp compact">
                <button onClick={() => updateXpEntry(entry.fighterId, { enemyOoa: Math.max(0, entry.enemyOoa + 1) })}>+1 enemy OOA</button>
                <button onClick={() => updateXpEntry(entry.fighterId, { objective: Math.max(0, entry.objective + 1) })}>+1 objective</button>
                <button onClick={() => updateXpEntry(entry.fighterId, { other: entry.other + 1 })}>+1 other</button>
              </div>
              <div className="xp-controls xp-controls-primary">
                <NumberField label="Enemy OOA" value={entry.enemyOoa} onChange={(value) => updateXpEntry(entry.fighterId, { enemyOoa: value })} />
                <NumberField label="Objective" value={entry.objective} onChange={(value) => updateXpEntry(entry.fighterId, { objective: value })} />
                <NumberField label="Manual / other" value={entry.other} onChange={(value) => updateXpEntry(entry.fighterId, { other: value })} />
              </div>
              <details className="optional-after-fields">
                <summary>Survival, leader, underdog and notes</summary>
                <div className="xp-controls">
                  <NumberField label="Survived" value={entry.survived} onChange={(value) => updateXpEntry(entry.fighterId, { survived: value })} />
                  <NumberField label="Leader bonus" value={entry.leaderBonus} onChange={(value) => updateXpEntry(entry.fighterId, { leaderBonus: value })} />
                  <NumberField label="Underdog" value={entry.underdog} onChange={(value) => updateXpEntry(entry.fighterId, { underdog: value })} />
                </div>
                <label>
                  <span>XP notes</span>
                  <input value={entry.notes ?? ""} onChange={(event) => updateXpEntry(entry.fighterId, { notes: event.target.value })} />
                </label>
              </details>
              <div className="xp-total-line">
                <strong>Gained {entry.gainedXp}</strong>
                <strong>Final XP {entry.finalXp}</strong>
                <span>Thresholds: {entry.pendingAdvanceThresholds.length ? entry.pendingAdvanceThresholds.join(", ") : "none"}</span>
              </div>
            </details>
          ))
        )}
      </div>
    </section>
  );
}

function SeriousInjuriesStep({
  draft,
  roster,
  onChange,
  onLookup
}: {
  draft: AfterBattleDraft;
  roster: Roster;
  onChange: (updater: (current: AfterBattleDraft) => AfterBattleDraft) => void;
  onLookup: (item: LookupItem) => void;
}) {
  function updateInjury(fighterId: string, patch: Partial<AfterBattleInjuryEntry>) {
    onChange((current) => ({
      ...current,
      injuries: current.injuries.map((entry) => (entry.fighterId === fighterId ? { ...entry, ...patch } : entry))
    }));
  }

  function updateFollowUpInjury(fighterId: string, followUpId: string, patch: Partial<AfterBattleFollowUpInjury>) {
    onChange((current) => ({
      ...current,
      injuries: current.injuries.map((entry) => {
        if (entry.fighterId !== fighterId) return entry;
        return {
          ...entry,
          followUpInjuries: (entry.followUpInjuries ?? []).map((followUp) => (
            followUp.id === followUpId ? { ...followUp, ...patch } : followUp
          ))
        };
      })
    }));
  }

  return (
    <section className="after-card">
      <div className="section-heading">
        <div>
          <h3>Serious injuries</h3>
          <p>Fighters marked Out of Action in Play Mode appear here automatically.</p>
        </div>
        <button onClick={() => openLookupRecord("table-serious-injuries", onLookup)}>
          <BookOpen aria-hidden /> Injury table
        </button>
      </div>
      {draft.injuries.length === 0 ? (
        <div className="empty-state">No fighters were marked Out of Action in Play Mode.</div>
      ) : (
        <div className="injury-grid">
          {draft.injuries.map((entry) => {
            const member = roster.members.find((item) => item.id === entry.fighterId);
            const simpleFollowUp = simpleInjuryFollowUpFor(entry.result);
            const needsFollowUp = entry.result === "Multiple Injuries" || entry.result === "Bitter Enmity" || Boolean(simpleFollowUp) || entry.result === "Sold To The Pits";
            const hasFollowUps = (
              entry.result === "Multiple Injuries" && (entry.followUpInjuries?.length ?? 0) > 0
            ) || (
              entry.result === "Bitter Enmity" && Boolean(entry.permanentEffect?.trim())
            ) || (
              Boolean(simpleFollowUp) && Boolean(entry.permanentEffect?.trim())
            ) || (
              entry.result === "Sold To The Pits" && Boolean(entry.permanentEffect?.trim())
            );
            const isResolved = entry.resolvedOutsideApp || Boolean(entry.result.trim());
            return (
              <article className="injury-panel" key={entry.fighterId}>
                <header>
                  <strong>{entry.fighterName}</strong>
                  <span className="pill">{isResolved ? "Result recorded" : member?.kind === "henchman_group" ? "Needs casualty result" : "Needs injury result"}</span>
                </header>
                <ol className="resolution-flow" aria-label="Serious injury resolution order">
                  <li className={entry.result || entry.resolvedOutsideApp ? "done" : "current"}>Roll or choose result</li>
                  <li className={hasFollowUps ? "done" : needsFollowUp ? "current" : "muted"}>Resolve follow-up rolls</li>
                  <li className={isResolved ? "done" : "muted"}>Confirm final effect</li>
                </ol>
                <SmartTableRoller
                  title={member?.kind === "henchman_group" ? "Henchman casualty roll" : "Hero serious injury roll"}
                  rollKind={member?.kind === "henchman_group" ? "d6" : "d66"}
                  recordId={member?.kind === "henchman_group" ? "table-henchmen-injuries" : "table-serious-injuries"}
                  tableCaption={member?.kind === "henchman_group" ? "Henchmen Injuries" : "Heroes' Serious Injuries"}
                  autoApply
                  showFollowUpDice={false}
                  helperText={member?.kind === "henchman_group" ? "Rolls D6 and applies the group casualty result." : "Rolls D66 and applies the serious injury result."}
                  onLookup={onLookup}
                  onUseResult={(roll) => updateInjury(entry.fighterId, injuryPatchFromRoll(entry, roll, member?.kind === "henchman_group"))}
                />
                {member?.kind === "henchman_group" && (
                  <NumberField label="Casualties / group size reduction" value={entry.casualties ?? 0} onChange={(value) => updateInjury(entry.fighterId, { casualties: Math.max(0, value) })} />
                )}
                <label>
                  <span>Final injury result</span>
                  <select value={entry.result} onChange={(event) => updateInjury(entry.fighterId, injuryResultPatch(entry, event.target.value))}>
                    <option value="">Select or mark resolved</option>
                    {SERIOUS_INJURY_RESULTS.map((result) => (
                      <option key={result}>{result}</option>
                    ))}
                  </select>
                </label>
                {member?.kind !== "henchman_group" && entry.result === "Multiple Injuries" && (
                  <MultipleInjuriesResolver
                    entry={entry}
                    onChange={(patch) => updateInjury(entry.fighterId, patch)}
                    onUpdateFollowUp={(followUpId, patch) => updateFollowUpInjury(entry.fighterId, followUpId, patch)}
                    onLookup={onLookup}
                  />
                )}
                {member?.kind !== "henchman_group" && entry.result === "Bitter Enmity" && (
                  <BitterEnmityResolver
                    entry={entry}
                    onChange={(patch) => updateInjury(entry.fighterId, patch)}
                    onLookup={onLookup}
                  />
                )}
                {member?.kind !== "henchman_group" && simpleFollowUp && (
                  <SimpleInjuryFollowUpResolver
                    entry={entry}
                    config={simpleFollowUp}
                    onChange={(patch) => updateInjury(entry.fighterId, patch)}
                    onLookup={onLookup}
                  />
                )}
                {member?.kind !== "henchman_group" && entry.result === "Captured" && (
                  <CapturedResolver
                    entry={entry}
                    onChange={(patch) => updateInjury(entry.fighterId, patch)}
                    onLookup={onLookup}
                  />
                )}
                {member?.kind !== "henchman_group" && entry.result === "Sold To The Pits" && (
                  <SoldToPitsResolver
                    entry={entry}
                    onChange={(patch) => updateInjury(entry.fighterId, patch)}
                    onLookup={onLookup}
                  />
                )}
                <details className="optional-after-fields" open={Boolean(entry.permanentEffect || entry.notes || entry.resolvedOutsideApp) || undefined}>
                  <summary>Permanent effect, outside result and notes</summary>
                  <label>
                    <span>Permanent effect</span>
                    <input value={entry.permanentEffect ?? ""} onChange={(event) => updateInjury(entry.fighterId, { permanentEffect: event.target.value })} />
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={entry.resolvedOutsideApp ?? false}
                      onChange={(event) => updateInjury(entry.fighterId, { resolvedOutsideApp: event.target.checked })}
                    />
                    Resolved outside app
                  </label>
                  <label>
                    <span>Notes</span>
                    <textarea value={entry.notes ?? ""} onChange={(event) => updateInjury(entry.fighterId, { notes: event.target.value })} />
                  </label>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function BitterEnmityResolver({
  entry,
  onChange,
  onLookup
}: {
  entry: AfterBattleInjuryEntry;
  onChange: (patch: Partial<AfterBattleInjuryEntry>) => void;
  onLookup: (item: LookupItem) => void;
}) {
  function applyHatredRoll(roll: TableRollResult) {
    const target = [roll.result, roll.effect].filter(Boolean).join(" - ");
    onChange({
      permanentEffect: `Hatred: ${target}`,
      notes: prependNote(`${roll.rollLabel}: Bitter Enmity - ${target}.`, entry.notes)
    });
  }

  return (
    <section className="multiple-injuries-box bitter-enmity-box">
      <div className="section-heading">
        <div>
          <h4>Bitter Enmity follow-up</h4>
          <p>Roll D6 to determine who the Hero hates from now on.</p>
        </div>
        <button onClick={() => openLookupRecord("table-bitter-enmity", onLookup)}>
          <BookOpen aria-hidden /> Hatred table
        </button>
      </div>
      <SmartTableRoller
        title="Bitter Enmity hatred roll"
        rollKind="d6"
        recordId="table-bitter-enmity"
        tableCaption="Bitter Enmity Hatred"
        autoApply
        helperText="Rolls the Bitter Enmity D6 table and records the hatred target as the permanent effect."
        onLookup={onLookup}
        onUseResult={applyHatredRoll}
      />
      {entry.permanentEffect?.trim() && (
        <div className="exploration-follow-up-result">
          <strong>Recorded effect</strong>
          <p>{entry.permanentEffect}</p>
        </div>
      )}
    </section>
  );
}

function SimpleInjuryFollowUpResolver({
  entry,
  config,
  onChange,
  onLookup
}: {
  entry: AfterBattleInjuryEntry;
  config: NonNullable<ReturnType<typeof simpleInjuryFollowUpFor>>;
  onChange: (patch: Partial<AfterBattleInjuryEntry>) => void;
  onLookup: (item: LookupItem) => void;
}) {
  function applyFollowUpRoll(roll: TableRollResult) {
    const effect = [roll.result, roll.effect].filter(Boolean).join(" - ");
    onChange({
      permanentEffect: effect,
      notes: prependNote(`${roll.rollLabel}: ${entry.result} - ${effect}.`, entry.notes)
    });
  }

  return (
    <section className="multiple-injuries-box">
      <div className="section-heading">
        <div>
          <h4>{config.title}</h4>
          <p>{config.helperText}</p>
        </div>
        <button onClick={() => openLookupRecord(config.recordId, onLookup)}>
          <BookOpen aria-hidden /> Follow-up table
        </button>
      </div>
      <SmartTableRoller
        title={config.title}
        rollKind="d6"
        recordId={config.recordId}
        tableCaption={config.tableCaption}
        autoApply
        helperText={config.helperText}
        onLookup={onLookup}
        onUseResult={applyFollowUpRoll}
      />
      {entry.permanentEffect?.trim() && (
        <div className="exploration-follow-up-result">
          <strong>Recorded effect</strong>
          <p>{entry.permanentEffect}</p>
        </div>
      )}
    </section>
  );
}

function CapturedResolver({
  entry,
  onChange,
  onLookup
}: {
  entry: AfterBattleInjuryEntry;
  onChange: (patch: Partial<AfterBattleInjuryEntry>) => void;
  onLookup: (item: LookupItem) => void;
}) {
  function applySaleRoll(roll: TableRollResult) {
    const effect = `Sold to slavers: ${roll.result}`;
    onChange({
      permanentEffect: effect,
      notes: prependNote(`${roll.rollLabel}: Captured - ${effect}. Add the gold in the Income step if your warband receives it.`, entry.notes)
    });
  }

  return (
    <section className="multiple-injuries-box">
      <div className="section-heading">
        <div>
          <h4>Captured options</h4>
          <p>Use this if the captive is sold to slavers. Ransom, exchange and faction-specific outcomes can be recorded manually.</p>
        </div>
        <button onClick={() => openLookupRecord("table-captured-sale", onLookup)}>
          <BookOpen aria-hidden /> Slaver sale table
        </button>
      </div>
      <SmartTableRoller
        title="Sell captive to slavers"
        rollKind="d6"
        recordId="table-captured-sale"
        tableCaption="Captured Sale To Slavers"
        autoApply
        helperText="Rolls D6 x 5 gc for selling the captive to slavers."
        onLookup={onLookup}
        onUseResult={applySaleRoll}
      />
    </section>
  );
}

function SoldToPitsResolver({
  entry,
  onChange,
  onLookup
}: {
  entry: AfterBattleInjuryEntry;
  onChange: (patch: Partial<AfterBattleInjuryEntry>) => void;
  onLookup: (item: LookupItem) => void;
}) {
  const [lastRoll, setLastRoll] = useState<{ roll: TableRollResult; rerolled: TableRollResult[] }>();

  function recordWin() {
    onChange({
      permanentEffect: "Won pit fight: gains 50 gc and +2 Experience; rejoins with weapons and equipment.",
      notes: prependNote("Sold To The Pits: won the pit fight. Add 50 gc in Income and +2 XP in Experience.", entry.notes)
    });
  }

  function rollLosingInjury() {
    const result = createSoldToPitsLosingInjuryRoll();
    setLastRoll(result);
    const effect = `${result.roll.result}${result.roll.effect ? ` - ${result.roll.effect}` : ""}`;
    onChange({
      permanentEffect: `Lost pit fight: ${effect}. If not dead, loses weapons and armour before rejoining.`,
      notes: prependNote(`${result.roll.rollLabel}: Sold To The Pits losing injury - ${effect}.`, entry.notes)
    });
  }

  return (
    <section className="multiple-injuries-box">
      <div className="section-heading">
        <div>
          <h4>Sold To The Pits follow-up</h4>
          <p>Resolve the pit fight. If the Hero loses, roll a D66 result from 11-35.</p>
        </div>
        <button onClick={() => openLookupRecord("table-sold-to-pits-losing-injury", onLookup)}>
          <BookOpen aria-hidden /> Losing injury table
        </button>
      </div>
      <div className="button-row">
        <button onClick={recordWin}>Record pit fight win</button>
        <button className="primary" onClick={rollLosingInjury}>
          <Dices aria-hidden /> Roll losing injury
        </button>
      </div>
      {lastRoll && (
        <div className="exploration-follow-up-result">
          <strong>{lastRoll.roll.rollLabel}: {lastRoll.roll.result}</strong>
          {lastRoll.roll.effect && <p>{lastRoll.roll.effect}</p>}
          {lastRoll.rerolled.length > 0 && <p className="muted">Re-rolled outside 11-35: {lastRoll.rerolled.map((roll) => roll.rollLabel).join(", ")}</p>}
        </div>
      )}
      {entry.permanentEffect?.trim() && (
        <div className="exploration-follow-up-result">
          <strong>Recorded effect</strong>
          <p>{entry.permanentEffect}</p>
        </div>
      )}
    </section>
  );
}

function ExplorationStep({
  draft,
  roster,
  onChange,
  onLookup
}: {
  draft: AfterBattleDraft;
  roster: Roster;
  onChange: (updater: (current: AfterBattleDraft) => AfterBattleDraft) => void;
  onLookup: (item: LookupItem) => void;
}) {
  const [diceInput, setDiceInput] = useState(() => draft.exploration.diceValues.join(", "));
  const [diceCount, setDiceCount] = useState(Math.max(1, draft.exploration.diceValues.length || 1));
  const incomeWarriors = countIncomeWarriors(roster);

  useEffect(() => {
    setDiceInput(draft.exploration.diceValues.join(", "));
  }, [draft.id]);

  function updateExploration(patch: Partial<AfterBattleDraft["exploration"]>) {
    onChange((current) => ({ ...current, exploration: { ...current.exploration, ...patch } }));
  }

  function updateWyrdstoneFound(value: number) {
    const found = Math.max(0, value);
    onChange((current) => ({
      ...current,
      exploration: {
        ...current.exploration,
        wyrdstoneShards: found
      },
      treasury: current.treasury.wyrdstoneSold === 0
        ? treasuryWithWyrdstoneSale(current.treasury, found, incomeWarriors)
        : current.treasury
    }));
  }

  function useExplorationShardCount(value: number) {
    onChange((current) => ({
      ...current,
      exploration: {
        ...current.exploration,
        wyrdstoneShards: Math.max(0, value),
        notes: appendUniqueNote(current.exploration.notes, `Recorded ${value} wyrdstone from exploration.`)
      },
      treasury: current.treasury.wyrdstoneSold === 0
        ? treasuryWithWyrdstoneSale(current.treasury, Math.max(0, value), incomeWarriors)
        : current.treasury
    }));
  }

  function useExplorationSpecialResults(values: string[]) {
    onChange((current) => ({
      ...current,
      exploration: {
        ...current.exploration,
        specialResults: uniquePreserveOrder([...(current.exploration.specialResults ?? []), ...values]),
        notes: appendUniqueNote(current.exploration.notes, `Exploration result: ${values.join("; ")}`)
      }
    }));
  }

  function useExplorationFollowUpResult(result: ExplorationFollowUpResult) {
    const resultText = `${result.label}${result.resultName ? ` - ${result.resultName}` : ""}: ${result.outcome}`;
    onChange((current) => {
      const wyrdstoneFound = Math.max(0, current.exploration.wyrdstoneShards + (result.wyrdstoneDelta ?? 0));
      const treasuryAfterGold = addGoldToTreasury(current.treasury, result.goldDelta ?? 0);
      return {
        ...current,
        exploration: {
          ...current.exploration,
          wyrdstoneShards: wyrdstoneFound,
          specialResults: uniquePreserveOrder([...(current.exploration.specialResults ?? []), resultText]),
          notes: appendUniqueNote(current.exploration.notes, `Exploration follow-up: ${resultText}`)
        },
        treasury: treasuryAfterGold
      };
    });
  }

  function applyExplorationRoll(roll: TableRollResult) {
    setDiceInput(roll.diceValues.join(", "));
    onChange((current) => ({
      ...current,
      exploration: {
        ...current.exploration,
        diceValues: roll.diceValues,
        wyrdstoneShards: roll.wyrdstoneShards ?? current.exploration.wyrdstoneShards,
        specialResults: roll.specialResults ?? current.exploration.specialResults
      },
      treasury: current.treasury.wyrdstoneSold === 0 && roll.wyrdstoneShards !== undefined
        ? treasuryWithWyrdstoneSale(current.treasury, roll.wyrdstoneShards, incomeWarriors)
        : current.treasury
    }));
  }

  return (
    <section className="after-card">
      <div className="section-heading">
        <div>
          <h3>Exploration</h3>
          <p>Enter the dice you rolled, or randomise them here.</p>
        </div>
        <button onClick={() => openLookupRecord("table-exploration", onLookup)}>
          <BookOpen aria-hidden /> Exploration table
        </button>
      </div>
      <div className="after-action-cards">
        <article>
          <span>Dice total</span>
          <strong>{draft.exploration.diceValues.length ? draft.exploration.diceValues.reduce((total, value) => total + value, 0) : "-"}</strong>
          <p>{draft.exploration.diceValues.length ? describeExplorationDice(draft.exploration.diceValues) : "Enter dice or use the roller."}</p>
        </article>
        <article>
          <span>Wyrdstone found</span>
          <strong>{draft.exploration.wyrdstoneShards}</strong>
          <p>{draft.treasury.wyrdstoneSold ? `${draft.treasury.wyrdstoneSold} will be sold in Income.` : "Nothing marked for sale yet."}</p>
        </article>
        <article>
          <span>Special results</span>
          <strong>{draft.exploration.specialResults?.length ?? 0}</strong>
          <p>{(draft.exploration.specialResults ?? []).slice(0, 2).join("; ") || "No doubles, triples or follow-up results recorded."}</p>
        </article>
      </div>
      <div className="form-grid">
        <label>
          <span>Dice rolled</span>
          <input
            value={diceInput}
            onChange={(event) => {
              setDiceInput(event.target.value);
              updateExploration({ diceValues: parseDiceValues(event.target.value) });
            }}
            placeholder="Example: 1, 3, 3, 6"
          />
        </label>
        <NumberField label="Wyrdstone found" value={draft.exploration.wyrdstoneShards} onChange={updateWyrdstoneFound} />
      </div>
      <ExplorationDiceInsight
        diceValues={draft.exploration.diceValues}
        onUseShardCount={useExplorationShardCount}
        onUseSpecialResults={useExplorationSpecialResults}
        onUseFollowUpResult={useExplorationFollowUpResult}
        onLookup={onLookup}
      />
      <SmartTableRoller
        title="Exploration roller"
        rollKind="exploration"
        recordId="table-exploration"
        tableCaption="Number Of Wyrdstone Shards Found"
        diceCount={diceCount}
        diceCountOptions={[1, 2, 3, 4, 5, 6]}
        onDiceCountChange={setDiceCount}
        autoApply
        helperText="Rolls exploration dice, sets the wyrdstone total, and records doubles or better."
        onLookup={onLookup}
        onUseResult={applyExplorationRoll}
      />
      <div className="button-row">
        <button disabled={draft.exploration.diceValues.length >= 6} onClick={() => {
          const diceValues = [...draft.exploration.diceValues, rollD6()].slice(0, 6);
          setDiceInput(diceValues.join(", "));
          updateExploration({ diceValues });
        }}>
          Add random D6
        </button>
      </div>
      <details className="optional-after-fields" open={Boolean(draft.exploration.notes || draft.exploration.specialResults?.length) || undefined}>
        <summary>Manual special results and notes</summary>
        <label>
          <span>Special results</span>
          <input
            value={(draft.exploration.specialResults ?? []).join(", ")}
            onChange={(event) => updateExploration({ specialResults: splitList(event.target.value) })}
          />
        </label>
        <label>
          <span>Exploration notes</span>
          <textarea value={draft.exploration.notes ?? ""} onChange={(event) => updateExploration({ notes: event.target.value })} />
        </label>
      </details>
    </section>
  );
}

function MultipleInjuriesResolver({
  entry,
  onChange,
  onUpdateFollowUp,
  onLookup
}: {
  entry: AfterBattleInjuryEntry;
  onChange: (patch: Partial<AfterBattleInjuryEntry>) => void;
  onUpdateFollowUp: (followUpId: string, patch: Partial<AfterBattleFollowUpInjury>) => void;
  onLookup: (item: LookupItem) => void;
}) {
  const followUps = entry.followUpInjuries ?? [];
  const count = Math.max(0, Math.min(6, entry.multipleInjuriesCountRoll ?? followUps.length));

  function rollCountAndResults() {
    const result = createMultipleSeriousInjuryRoll(rulesLookupRecords);
    onChange({
      result: "Multiple Injuries",
      multipleInjuriesCountRoll: result.countRoll,
      followUpInjuries: result.rolls.map(followUpInjuryFromRoll),
      notes: prependNote(`Multiple Injuries count roll D6 ${result.countRoll}; generated ${result.countRoll} follow-up injury rolls.`, entry.notes)
    });
  }

  function rollCurrentCount() {
    const safeCount = Math.max(1, Math.min(6, count || 1));
    const rolls = createSeriousInjuryFollowUpRolls(rulesLookupRecords, safeCount);
    onChange({
      multipleInjuriesCountRoll: safeCount,
      followUpInjuries: rolls.map(followUpInjuryFromRoll),
      notes: prependNote(`Re-rolled ${safeCount} Multiple Injuries follow-up result${safeCount === 1 ? "" : "s"}.`, entry.notes)
    });
  }

  function updateCount(value: number) {
    const safeCount = Math.max(0, Math.min(6, Math.floor(Number.isFinite(value) ? value : 0)));
    onChange({
      multipleInjuriesCountRoll: safeCount,
      followUpInjuries: resizeFollowUpInjuries(followUps, safeCount)
    });
  }

  function removeFollowUp(followUpId: string) {
    const nextFollowUps = followUps
      .filter((followUp) => followUp.id !== followUpId)
      .map((followUp, index) => ({ ...followUp, sequence: index + 1 }));
    onChange({
      multipleInjuriesCountRoll: nextFollowUps.length,
      followUpInjuries: nextFollowUps
    });
  }

  return (
    <section className="multiple-injuries-box">
      <div className="section-heading">
        <div>
          <h4>Multiple Injuries follow-up</h4>
          <p>Roll D6 for the number of extra injury rolls. Dead, Captured and further Multiple Injuries are re-rolled automatically.</p>
        </div>
      </div>
      <div className="button-row">
        <button className="primary" onClick={rollCountAndResults}>
          <Dices aria-hidden /> Roll D6 and extra injuries
        </button>
        <button onClick={rollCurrentCount} disabled={count <= 0}>
          Re-roll current extra injuries
        </button>
      </div>
      <div className="form-grid">
        <NumberField label="Extra injury count" value={count} onChange={updateCount} />
      </div>
      {followUps.length === 0 ? (
        <div className="empty-state">No extra injury results recorded yet.</div>
      ) : (
        <div className="follow-up-injury-list">
          {followUps.map((followUp) => (
            <article className="follow-up-injury" key={followUp.id}>
              <header>
                <strong>Extra injury {followUp.sequence}</strong>
                <span className="pill">{followUp.rollLabel}</span>
              </header>
              {followUp.rerolled?.length ? (
                <p className="muted">Re-rolled forbidden result{followUp.rerolled.length === 1 ? "" : "s"}: {followUp.rerolled.join(", ")}</p>
              ) : null}
              <label>
                <span>Result</span>
                <select value={followUp.result} onChange={(event) => onUpdateFollowUp(followUp.id, { result: event.target.value })}>
                  <option value="">Select result</option>
                  {SERIOUS_INJURY_RESULTS.filter((result) => !["Dead", "Captured", "Multiple Injuries"].includes(result)).map((result) => (
                    <option key={result}>{result}</option>
                  ))}
                </select>
              </label>
              {followUp.effect && <p>{followUp.effect}</p>}
              <label>
                <span>Extra notes</span>
                <input value={followUp.notes ?? ""} onChange={(event) => onUpdateFollowUp(followUp.id, { notes: event.target.value })} />
              </label>
              <div className="button-row">
                {followUp.rangeLabel && (
                  <button onClick={() => openLookupRecord("table-serious-injuries", onLookup, followUpHighlight(followUp))}>
                    <BookOpen aria-hidden /> Show row
                  </button>
                )}
                <button className="icon-danger" onClick={() => removeFollowUp(followUp.id)}>
                  <Trash2 aria-hidden /> Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function IncomeStep({
  draft,
  roster,
  onChange,
  onLookup
}: {
  draft: AfterBattleDraft;
  roster: Roster;
  onChange: (updater: (current: AfterBattleDraft) => AfterBattleDraft) => void;
  onLookup: (item: LookupItem) => void;
}) {
  const incomeWarriors = countIncomeWarriors(roster);
  const storedWyrdstone = Math.max(0, roster.wyrdstoneShards);
  const foundWyrdstone = Math.max(0, draft.exploration.wyrdstoneShards);
  const availableWyrdstone = storedWyrdstone + foundWyrdstone;
  const expectedSaleIncome = calculateWyrdstoneSaleIncome(draft.treasury.wyrdstoneSold, incomeWarriors);

  function updateTreasury(patch: Partial<AfterBattleDraft["treasury"]>, recalculate = true) {
    onChange((current) => {
      const nextTreasury = { ...current.treasury, ...patch };
      return {
        ...current,
        treasury: recalculate ? recalculateTreasuryAfter(nextTreasury) : nextTreasury
      };
    });
  }

  function updateWyrdstoneSold(value: number) {
    const sold = Math.max(0, Math.min(availableWyrdstone, value));
    const shardSaleIncome = calculateWyrdstoneSaleIncome(sold, incomeWarriors);
    updateTreasury({ wyrdstoneSold: sold, shardSaleIncome });
  }

  function sellAllAvailable() {
    updateWyrdstoneSold(availableWyrdstone);
  }

  return (
    <section className="after-card">
      <div className="section-heading">
        <div>
          <h3>Income and treasury</h3>
          <p>Sell wyrdstone using the income chart for a {incomeWarriors}-fighter warband.</p>
        </div>
        <button onClick={() => openLookupRecord("table-wyrdstone-income", onLookup)}>
          <BookOpen aria-hidden /> Wyrdstone income table
        </button>
      </div>
      <div className="after-action-cards">
        <article>
          <span>Available wyrdstone</span>
          <strong>{availableWyrdstone}</strong>
          <p>{storedWyrdstone} stored before battle, {foundWyrdstone} found this battle.</p>
        </article>
        <article>
          <span>Marked to sell</span>
          <strong>{draft.treasury.wyrdstoneSold}</strong>
          <p>{expectedSaleIncome} gc by the income chart for {incomeWarriors} warriors.</p>
        </article>
        <article>
          <span>Treasury preview</span>
          <strong>{draft.treasury.after} gc</strong>
          <p>{draft.treasury.after - draft.treasury.before >= 0 ? "+" : ""}{draft.treasury.after - draft.treasury.before} gc after income and deductions.</p>
        </article>
      </div>
      <div className="income-metrics">
        <span>Stored wyrdstone before battle <strong>{storedWyrdstone}</strong></span>
        <span>Wyrdstone found this battle <strong>{foundWyrdstone}</strong></span>
        <span>Wyrdstone available <strong>{availableWyrdstone}</strong></span>
        <span>Chart income <strong>{expectedSaleIncome} gc</strong></span>
      </div>
      <div className="button-row">
        <button disabled={availableWyrdstone === 0} onClick={sellAllAvailable}>Sell all available wyrdstone</button>
        <button disabled={draft.treasury.wyrdstoneSold === 0} onClick={() => updateTreasury({ shardSaleIncome: expectedSaleIncome })}>Use chart income</button>
      </div>
      {draft.treasury.wyrdstoneSold > 0 && draft.treasury.shardSaleIncome !== expectedSaleIncome && (
        <div className="exploration-result-callout">
          <strong>Wyrdstone sale income does not match the chart.</strong>
          <p>{draft.treasury.wyrdstoneSold} wyrdstone sold by a {incomeWarriors}-fighter warband should be {expectedSaleIncome} gc.</p>
          <div className="button-row">
            <button onClick={() => updateTreasury({ shardSaleIncome: expectedSaleIncome })}>Use {expectedSaleIncome} gc</button>
          </div>
        </div>
      )}
      <div className="form-grid">
        <NumberField label="Treasury before" value={draft.treasury.before} onChange={(value) => updateTreasury({ before: value })} />
        <NumberField label="Wyrdstone sold" value={draft.treasury.wyrdstoneSold} onChange={updateWyrdstoneSold} />
        <NumberField label="Wyrdstone sale income" value={draft.treasury.shardSaleIncome} onChange={(value) => updateTreasury({ shardSaleIncome: value })} />
        <NumberField label="Other income" value={draft.treasury.otherIncome} onChange={(value) => updateTreasury({ otherIncome: value })} />
        <NumberField label="Upkeep / deductions" value={draft.treasury.deductions} onChange={(value) => updateTreasury({ deductions: value })} />
        <NumberField label="Manual adjustment" value={draft.treasury.manualAdjustment} onChange={(value) => updateTreasury({ manualAdjustment: value })} />
        <NumberField label="Treasury after" value={draft.treasury.after} onChange={(value) => updateTreasury({ after: value }, false)} />
      </div>
      <p className="muted">Treasury after = before + wyrdstone sale income + other income - deductions + manual adjustment. You can still edit the final total for house rules.</p>
    </section>
  );
}

function TradingStep({
  draft,
  roster,
  onChange
}: {
  draft: AfterBattleDraft;
  roster: Roster;
  onChange: (updater: (current: AfterBattleDraft) => AfterBattleDraft) => void;
}) {
  const activeMembers = roster.members.filter((member) => member.status !== "dead" && member.status !== "retired");
  const equipmentOptions = useMemo(
    () => [...rulesDb.equipmentItems].sort((left, right) => left.name.localeCompare(right.name)),
    []
  );
  const tradingDelta = tradingGoldDelta(draft.transactions);
  const rosterEffects = previewTradingRosterEffects(roster, draft);
  const pendingRareChecks = draft.transactions.filter((transaction) => {
    const item = rulesDb.equipmentItems.find((equipment) => equipment.id === transaction.equipmentItemId);
    return item?.rarity && transaction.action === "bought" && transaction.availability !== "available";
  }).length;

  function setTransactions(transform: (transactions: AfterBattleTransaction[]) => AfterBattleTransaction[]) {
    onChange((current) => syncDraftTransactions(current, transform(current.transactions)));
  }

  function addTransaction(action: AfterBattleTransaction["action"] = "bought") {
    setTransactions((transactions) => [...transactions, createAfterBattleTransaction(action)]);
  }

  function updateTransaction(transactionId: string, patch: Partial<AfterBattleTransaction>) {
    setTransactions((transactions) =>
      transactions.map((entry) => (entry.id === transactionId ? { ...entry, ...patch } : entry))
    );
  }

  function removeTransaction(transactionId: string) {
    setTransactions((transactions) => transactions.filter((entry) => entry.id !== transactionId));
  }

  function selectAction(transaction: AfterBattleTransaction, action: AfterBattleTransaction["action"]) {
    const item = rulesDb.equipmentItems.find((equipment) => equipment.id === transaction.equipmentItemId);
    updateTransaction(transaction.id, {
      action,
      value: defaultTradeGoldValue(action, item),
      assignedTo: action === "sold" || action === "discarded" ? "" : transaction.assignedTo || "stash",
      removeFrom: action === "bought" || action === "found" ? "" : transaction.removeFrom,
      applyToRoster: transaction.equipmentItemId ? action !== "other" : false
    });
  }

  function selectEquipment(transaction: AfterBattleTransaction, equipmentItemId: string) {
    if (!equipmentItemId) {
      updateTransaction(transaction.id, {
        equipmentItemId: undefined,
        itemName: "",
        value: defaultTradeGoldValue(transaction.action),
        availability: "not_required",
        applyToRoster: false
      });
      return;
    }

    const item = rulesDb.equipmentItems.find((equipment) => equipment.id === equipmentItemId);
    if (!item) return;
    updateTransaction(transaction.id, {
      equipmentItemId: item.id,
      itemName: item.name,
      value: defaultTradeGoldValue(transaction.action, item),
      availability: item.rarity ? "not_checked" : "not_required",
      applyToRoster: transaction.action !== "other"
    });
  }

  function sourceHasItem(sourceId: string | undefined, itemId: string | undefined) {
    if (!sourceId || !itemId) return false;
    if (sourceId === "stash") return roster.storedEquipment.includes(itemId);
    return roster.members.find((member) => member.id === sourceId)?.equipment.includes(itemId) ?? false;
  }

  function sourceOptions(transaction: AfterBattleTransaction) {
    const options = [
      { value: "", label: "Choose source" },
      { value: "stash", label: `Stash (${roster.storedEquipment.filter((itemId) => !transaction.equipmentItemId || itemId === transaction.equipmentItemId).length})` },
      ...activeMembers
        .filter((member) => !transaction.equipmentItemId || member.equipment.includes(transaction.equipmentItemId))
        .map((member) => ({ value: member.id, label: member.displayName }))
    ];
    if (transaction.removeFrom && !options.some((option) => option.value === transaction.removeFrom)) {
      options.push({ value: transaction.removeFrom, label: `${tradeTargetLabel(roster, transaction.removeFrom)} (item not found)` });
    }
    return options;
  }

  function transactionWarnings(transaction: AfterBattleTransaction) {
    const warnings: string[] = [];
    const item = rulesDb.equipmentItems.find((equipment) => equipment.id === transaction.equipmentItemId);
    if (!transaction.equipmentItemId && !transaction.itemName.trim()) warnings.push("Add an item name before applying the report.");
    if (transaction.action === "bought" && (transaction.value ?? 0) > 0) warnings.push("Bought items normally use a negative gold change.");
    if (transaction.action === "sold" && (transaction.value ?? 0) < 0) warnings.push("Sold items normally use a positive gold change.");
    if (item?.rarity && transaction.action === "bought" && transaction.availability !== "available") {
      warnings.push("Rare item availability is not marked as available yet.");
    }
    if (
      transaction.equipmentItemId &&
      transaction.applyToRoster !== false &&
      ["sold", "moved", "discarded"].includes(transaction.action) &&
      !transaction.removeFrom
    ) {
      warnings.push("Choose where this item comes from if you want the roster to be updated.");
    }
    if (
      transaction.equipmentItemId &&
      transaction.removeFrom &&
      ["sold", "moved", "discarded"].includes(transaction.action) &&
      !sourceHasItem(transaction.removeFrom, transaction.equipmentItemId)
    ) {
      warnings.push("The selected source does not currently have this item.");
    }
    return warnings;
  }

  return (
    <section className="after-card">
      <div className="section-heading">
        <div>
          <h3>Trading and equipment</h3>
          <p>Record purchases, sales, found items and stash moves. Gold changes are carried into the Income manual adjustment.</p>
        </div>
        <div className="button-row">
          <button onClick={() => addTransaction("bought")}><Plus aria-hidden /> Buy item</button>
          <button onClick={() => addTransaction("sold")}>Sell item</button>
          <button onClick={() => addTransaction("moved")}>Move item</button>
          <button onClick={() => addTransaction("found")}>Found item</button>
        </div>
      </div>
      <div className="after-action-cards">
        <article>
          <span>Ledger gold</span>
          <strong>{formatGoldDelta(tradingDelta)}</strong>
          <p>Included in treasury manual adjustment.</p>
        </article>
        <article>
          <span>Roster equipment</span>
          <strong>{rosterEffects.length}</strong>
          <p>Canonical item change{rosterEffects.length === 1 ? "" : "s"} queued for final apply.</p>
        </article>
        <article>
          <span>Rare checks</span>
          <strong>{pendingRareChecks}</strong>
          <p>Rare purchases still marked not available or not checked.</p>
        </article>
      </div>
      <PostGameTradingChecklist rosterId={roster.id} />
      <div className="transaction-list">
        {draft.transactions.length === 0 ? (
          <div className="empty-state">No trading transactions recorded.</div>
        ) : (
          draft.transactions.map((transaction) => {
            const item = rulesDb.equipmentItems.find((equipment) => equipment.id === transaction.equipmentItemId);
            const warnings = transactionWarnings(transaction);
            const needsSource = ["sold", "moved", "discarded"].includes(transaction.action);
            const needsDestination = ["bought", "found", "moved", "other"].includes(transaction.action);
            return (
              <article className="transaction-row transaction-row-wide" key={transaction.id}>
                <div className="transaction-row-header">
                  <strong>{transaction.action.replaceAll("_", " ")} {tradeItemLabel(transaction)}</strong>
                  <button
                    className="icon-danger"
                    aria-label="Remove transaction"
                    onClick={() => removeTransaction(transaction.id)}
                  >
                    <Trash2 aria-hidden />
                  </button>
                </div>
                <label>
                  <span>Action</span>
                  <select value={transaction.action} onChange={(event) => selectAction(transaction, event.target.value as AfterBattleTransaction["action"])}>
                    <option value="bought">Bought</option>
                    <option value="sold">Sold</option>
                    <option value="moved">Moved</option>
                    <option value="discarded">Discarded</option>
                    <option value="found">Found</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  <span>Rules item</span>
                  <select value={transaction.equipmentItemId ?? ""} onChange={(event) => selectEquipment(transaction, event.target.value)}>
                    <option value="">Custom / not in data</option>
                    {equipmentOptions.map((equipment) => (
                      <option value={equipment.id} key={equipment.id}>
                        {equipment.name} ({equipment.cost} gc)
                      </option>
                    ))}
                  </select>
                </label>
                {!transaction.equipmentItemId && (
                  <label>
                    <span>Custom item</span>
                    <input value={transaction.itemName} onChange={(event) => updateTransaction(transaction.id, { itemName: event.target.value })} />
                  </label>
                )}
                <NumberField label="Gold change" value={transaction.value ?? 0} onChange={(value) => updateTransaction(transaction.id, { value })} />
                {item && (
                  <button onClick={() => updateTransaction(transaction.id, { value: defaultTradeGoldValue(transaction.action, item) })}>
                    Use default gold
                  </button>
                )}
                {needsSource && (
                  <label>
                    <span>From</span>
                    <select value={transaction.removeFrom ?? ""} onChange={(event) => updateTransaction(transaction.id, { removeFrom: event.target.value })}>
                      {sourceOptions(transaction).map((option) => (
                        <option value={option.value} key={option.value || "empty"}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {needsDestination && (
                  <label>
                    <span>To</span>
                    <select value={transaction.assignedTo ?? ""} onChange={(event) => updateTransaction(transaction.id, { assignedTo: event.target.value })}>
                      <option value="">Unassigned / note only</option>
                      <option value="stash">Stash</option>
                      {activeMembers.map((member) => (
                        <option value={member.id} key={member.id}>
                          {member.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {item?.rarity && (
                  <>
                    <NumberField label="Rare roll" value={transaction.rareRoll ?? 0} onChange={(value) => updateTransaction(transaction.id, { rareRoll: value })} />
                    <label>
                      <span>Availability</span>
                      <select value={transaction.availability ?? "not_checked"} onChange={(event) => updateTransaction(transaction.id, { availability: event.target.value as AfterBattleTransaction["availability"] })}>
                        <option value="not_checked">Not checked</option>
                        <option value="available">Available</option>
                        <option value="failed">Failed</option>
                        <option value="not_required">Not required</option>
                      </select>
                    </label>
                  </>
                )}
                <label className="checklist-item transaction-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(transaction.equipmentItemId && transaction.action !== "other" && transaction.applyToRoster !== false)}
                    disabled={!transaction.equipmentItemId || transaction.action === "other"}
                    onChange={(event) => updateTransaction(transaction.id, { applyToRoster: event.target.checked })}
                  />
                  <span>Update stash/fighter on final apply</span>
                </label>
                <label>
                  <span>Notes / rarity</span>
                  <input value={transaction.notes ?? ""} onChange={(event) => updateTransaction(transaction.id, { notes: event.target.value })} />
                </label>
                {item && (
                  <p className="transaction-hint">
                    {item.category.replaceAll("_", " ")} · {item.cost} gc{item.rarity ? ` · Rare ${item.rarity}` : ""} · {item.sourceDocumentId}{item.pageRef ? ` ${item.pageRef}` : ""}
                  </p>
                )}
                {warnings.length > 0 && (
                  <div className="transaction-warning">
                    {warnings.map((warning) => <p key={warning}>{warning}</p>)}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function AdvancesStep({
  draft,
  onChange
}: {
  draft: AfterBattleDraft;
  onChange: (updater: (current: AfterBattleDraft) => AfterBattleDraft) => void;
}) {
  function updateAdvance(advanceId: string, patch: Partial<AfterBattleAdvanceEntry>) {
    onChange((current) => ({
      ...current,
      advances: current.advances.map((entry) => (entry.id === advanceId ? { ...entry, ...patch } : entry))
    }));
  }

  return (
    <section className="after-card">
      <h3>Advances</h3>
      {draft.advances.length === 0 ? (
        <div className="empty-state">No advances are due from the XP entered so far.</div>
      ) : (
        <div className="advance-grid">
          {draft.advances.map((advance) => (
            <article className="advance-panel" key={advance.id}>
              <strong>{advance.fighterName}</strong>
              <p>XP threshold reached: {advance.xpThreshold}</p>
              <label>
                <span>Advance result</span>
                <select value={advance.result} onChange={(event) => updateAdvance(advance.id, { result: event.target.value })}>
                  <option value="">Select result</option>
                  {ADVANCE_RESULTS.map((result) => (
                    <option key={result}>{result}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Notes</span>
                <input value={advance.notes ?? ""} onChange={(event) => updateAdvance(advance.id, { notes: event.target.value })} />
              </label>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function RosterUpdatesStep({
  draft,
  roster,
  onChange
}: {
  draft: AfterBattleDraft;
  roster: Roster;
  onChange: (updater: (current: AfterBattleDraft) => AfterBattleDraft) => void;
}) {
  const automaticUpdates = previewRosterUpdates(roster, draft);
  const quickUpdates = [
    { type: "recruit", title: "Recruit warrior", description: "Recruit a new warrior after the game." },
    { type: "equipment", title: "Move equipment", description: "Move equipment between a fighter and the stash." },
    { type: "injury", title: "Add injury note", description: "Record an injury or miss next game reminder." },
    { type: "skill", title: "Add skill or spell", description: "Record a new skill, spell, prayer or special rule." },
    { type: "note", title: "Campaign note", description: "Add a general post-game note." }
  ];

  function addManualUpdate(type = "note", description = "") {
    onChange((current) => ({
      ...current,
      rosterUpdates: [...current.rosterUpdates, { id: id("update"), type, description }]
    }));
  }

  function updateRosterUpdate(updateId: string, patch: Partial<AfterBattleRosterUpdate>) {
    onChange((current) => ({
      ...current,
      rosterUpdates: current.rosterUpdates.map((entry) => (entry.id === updateId ? { ...entry, ...patch } : entry))
    }));
  }

  return (
    <section className="after-card">
      <div className="section-heading">
        <div>
          <h3>Roster updates</h3>
          <p>Check what will be applied, then add any extra campaign decisions as simple action notes.</p>
        </div>
        <button onClick={() => addManualUpdate()}>
          <Plus aria-hidden /> Add manual update
        </button>
      </div>
      <div className="after-action-cards">
        {quickUpdates.map((template) => (
          <article key={template.title}>
            <span>{template.title}</span>
            <p>{template.description}</p>
            <button onClick={() => addManualUpdate(template.type, template.description)}>
              <Plus aria-hidden /> Add
            </button>
          </article>
        ))}
      </div>
      <div className="review-list automatic-update-list">
        <strong>Automatic changes queued</strong>
        {automaticUpdates.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="transaction-list">
        {draft.rosterUpdates.map((update) => (
          <article className="transaction-row" key={update.id}>
            <label>
              <span>Update type</span>
              <select value={update.type} onChange={(event) => updateRosterUpdate(update.id, { type: event.target.value })}>
                <option value="note">Note</option>
                <option value="recruit">Recruit new warrior</option>
                <option value="equipment">Equipment change</option>
                <option value="rename">Rename fighter</option>
                <option value="skill">Skill / spell / rule</option>
                <option value="injury">Injury</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              <span>Target</span>
              <select value={update.targetId ?? ""} onChange={(event) => updateRosterUpdate(update.id, { targetId: event.target.value })}>
                <option value="">Roster / stash</option>
                {roster.members.map((member) => (
                  <option value={member.id} key={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Description</span>
              <input value={update.description} onChange={(event) => updateRosterUpdate(update.id, { description: event.target.value })} />
            </label>
            <button
              className="icon-danger"
              aria-label="Remove roster update"
              onClick={() => onChange((current) => ({ ...current, rosterUpdates: current.rosterUpdates.filter((entry) => entry.id !== update.id) }))}
            >
              <Trash2 aria-hidden />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReviewApplyStep({
  draft,
  roster,
  onApply
}: {
  draft: AfterBattleDraft;
  roster: Roster;
  onApply: () => void;
}) {
  const updatedRoster = applyAfterBattleDraft(roster, draft);
  const beforeRating = calculateWarbandRating(roster, rulesDb);
  const afterRating = calculateWarbandRating(updatedRoster, rulesDb);
  const blockingMessages = reviewBlockingMessages(draft, roster);
  const tradingDelta = tradingGoldDelta(draft.transactions);
  const tradingRosterEffects = previewTradingRosterEffects(roster, draft);

  return (
    <section className="after-card">
      <div className="section-heading">
        <div>
          <h3>Review and apply</h3>
          <p>This is the After Action Report that will be saved to the campaign log.</p>
        </div>
        <span className="pill">{blockingMessages.length ? `${blockingMessages.length} item${blockingMessages.length === 1 ? "" : "s"} to finish` : "Ready to apply"}</span>
      </div>
      {blockingMessages.length > 0 && (
        <div className="member-issues">
          {blockingMessages.map((message) => (
            <article className="validation-message error" key={message}>
              <AlertTriangle aria-hidden />
              <div>
                <strong>{message}</strong>
                <p>Return to the relevant step and finish this before applying permanent updates.</p>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="after-action-cards review-report-lead">
        <article>
          <span>Battle</span>
          <strong>{draft.battleResult.result?.replaceAll("-", " ") || "Not recorded"}</strong>
          <p>{draft.battleResult.scenario || "Scenario not recorded"} vs {draft.battleResult.opponent || "unknown opponent"}</p>
        </article>
        <article>
          <span>Campaign gains</span>
          <strong>{draft.exploration.wyrdstoneShards} wyrdstone</strong>
          <p>{draft.treasury.before} gc to {draft.treasury.after} gc, including {formatGoldDelta(tradingDelta)} from trading.</p>
        </article>
        <article>
          <span>Roster impact</span>
          <strong>{draft.advances.length} advance{draft.advances.length === 1 ? "" : "s"}</strong>
          <p>{draft.injuries.length} injury record{draft.injuries.length === 1 ? "" : "s"}, {draft.transactions.length} transaction{draft.transactions.length === 1 ? "" : "s"}.</p>
        </article>
      </div>
      <div className="review-grid">
        <ReviewBlock title="Battle result" lines={[
          `Opponent: ${draft.battleResult.opponent || "not recorded"}`,
          `Scenario: ${draft.battleResult.scenario || "not recorded"}`,
          `Result: ${draft.battleResult.result || "not recorded"}`
        ]} />
        <ReviewBlock title="XP gained" lines={draft.xp.map((entry) => `${entry.fighterName}: ${entry.previousXp} -> ${entry.finalXp} XP (${advanceSummary(entry.pendingAdvanceThresholds.length)})`)} />
        <ReviewBlock title="Injuries" lines={draft.injuries.map((entry) => `${entry.fighterName}: ${injurySummary(entry)}`)} />
        <ReviewBlock title="Exploration" lines={[
          `Dice: ${draft.exploration.diceValues.join(", ") || "not recorded"}`,
          `Wyrdstone found: ${draft.exploration.wyrdstoneShards}`,
          `Special: ${(draft.exploration.specialResults ?? []).join(", ") || "none"}`
        ]} />
        <ReviewBlock title="Treasury" lines={[
          `${draft.treasury.before} gc -> ${draft.treasury.after} gc`,
          `Wyrdstone sold: ${draft.treasury.wyrdstoneSold}`,
          `Trading ledger: ${formatGoldDelta(tradingDelta)}`
        ]} />
        <ReviewBlock title="Trading" lines={[
          ...draft.transactions.map((entry) => `${entry.action}: ${tradeItemLabel(entry)} ${typeof entry.value === "number" ? `(${formatGoldDelta(entry.value)})` : ""}`),
          ...tradingRosterEffects.map((line) => `Apply: ${line}`)
        ]} />
        <ReviewBlock title="Advances" lines={draft.advances.map((entry) => `${entry.fighterName} at ${entry.xpThreshold} XP: ${entry.result || "not selected"}`)} />
        <ReviewBlock title="Roster changes" lines={previewRosterUpdates(roster, draft)} />
        <ReviewBlock title="Warband rating" lines={[`${beforeRating} before`, `${afterRating} after`]} />
      </div>
      <button className="primary apply-button" disabled={blockingMessages.length > 0} onClick={onApply}>
        Apply After Battle Updates
      </button>
    </section>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span>{label}</span>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function ReviewBlock({ title, lines }: { title: string; lines: string[] }) {
  const visibleLines = lines.length ? lines : ["None"];
  return (
    <article className="review-block">
      <h4>{title}</h4>
      {visibleLines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </article>
  );
}

function PrintableRosterSheet({ roster }: { roster: Roster }) {
  const warband = currentWarband(roster)!;
  const cost = calculateRosterCost(roster, rulesDb);
  const rating = calculateWarbandRating(roster, rulesDb);
  const activeMembers = roster.members.filter((member) => member.status !== "dead" && member.status !== "retired");
  const sections = [
    { title: "Heroes", members: activeMembers.filter((member) => member.kind === "hero") },
    { title: "Henchmen", members: activeMembers.filter((member) => member.kind === "henchman_group") },
    { title: "Hired Swords", members: activeMembers.filter((member) => member.kind === "hired_sword") }
  ].filter((section) => section.members.length > 0);

  return (
    <section className="print-roster-sheet print-only" aria-label="Printable roster sheet">
      <header className="print-roster-title">
        <div>
          <p>Mordheim Warband Roster</p>
          <h1>{roster.name || "Unnamed Warband"}</h1>
          <span>{warband.name} | {warband.sourceCode} | Broheim grade {warband.broheimGrade}</span>
        </div>
        <div className="print-summary-grid">
          <PrintSummary label="Treasury" value={`${roster.treasuryGold} gc`} />
          <PrintSummary label="Wyrdstone" value={roster.wyrdstoneShards.toString()} />
          <PrintSummary label="Cost" value={`${cost} gc`} />
          <PrintSummary label="Rating" value={rating.toString()} />
          <PrintSummary label="Warriors" value={countRosterFighters(activeMembers).toString()} />
          <PrintSummary label="Rout" value={`${calculateRoutThreshold(countRosterFighters(activeMembers))} out`} />
        </div>
      </header>

      <section className="print-ledger-row">
        <div>
          <strong>Stored equipment</strong>
          <p>{roster.storedEquipment.length ? roster.storedEquipment.map(equipmentName).join(", ") : "None"}</p>
        </div>
        <div>
          <strong>Campaign notes</strong>
          <p>{roster.campaignNotes || " "}</p>
        </div>
      </section>

      {sections.map((section) => (
        <section className="print-member-section" key={section.title}>
          <h2>{section.title}</h2>
          <div className="print-member-grid">
            {section.members.map((member) => (
              <PrintableMemberBlock roster={roster} member={member} key={member.id} />
            ))}
          </div>
        </section>
      ))}

      <section className="print-after-battle">
        <h2>Battle & After-Battle Notes</h2>
        <div className="print-notes-grid">
          <PrintBlankLines title="Battle result / opponent / scenario" lines={3} />
          <PrintBlankLines title="Exploration / wyrdstone / income" lines={3} />
          <PrintBlankLines title="Injuries / advances / purchases" lines={4} />
        </div>
      </section>
    </section>
  );
}

function PrintableMemberBlock({ roster, member }: { roster: Roster; member: RosterMember }) {
  const fighterType = rulesDb.fighterTypes.find((item) => item.id === member.fighterTypeId);
  if (!fighterType) return null;

  const equipment = member.equipment
    .map((itemId) => rulesDb.equipmentItems.find((item) => item.id === itemId))
    .filter((item): item is EquipmentItem => Boolean(item));
  const weapons = equipment.filter((item) => item.category === "close_combat" || item.category === "missile");
  const armour = equipment.filter((item) => item.category === "armour");
  const otherEquipment = equipment.filter((item) => item.category !== "close_combat" && item.category !== "missile" && item.category !== "armour");
  const skills = member.skills
    .map((skillId) => rulesDb.skills.find((skill) => skill.id === skillId)?.name)
    .filter(Boolean) as string[];
  const specialRules = unique([...fighterType.specialRuleIds, ...member.specialRules])
    .map((ruleId) => rulesDb.specialRules.find((rule) => rule.id === ruleId))
    .filter((rule): rule is SpecialRule => Boolean(rule));
  const castableRules = specialRules.filter((rule) => rule.validation.selectableAs).map((rule) => rule.name);
  const passiveRules = specialRules.filter((rule) => !rule.validation.selectableAs).map((rule) => rule.name);
  const memberCost = calculateRosterCost({ ...roster, members: [member] }, rulesDb);
  const startingXp = member.startingXp ?? fighterType.startingExperience;
  const currentXp = member.currentXp ?? member.experience;

  return (
    <article className="print-member-card">
      <header>
        <div>
          <h3>{member.displayName || fighterType.name}</h3>
          <p>{fighterType.name} {member.kind === "henchman_group" ? `x${member.groupSize}` : member.kind === "hired_sword" ? "Hired Sword" : "Hero"}</p>
        </div>
        <div className="print-member-meta">
          <span>{memberCost} gc</span>
          <span>{member.status}</span>
        </div>
      </header>

      <PrintProfile profile={member.currentProfile} />

      <div className="print-track-grid">
        <div>
          <strong>XP</strong>
          <span>Start {startingXp} | Current {currentXp}</span>
          <PrintBoxes count={10} />
        </div>
        <div>
          <strong>Wounds</strong>
          <PrintBoxes count={Math.max(1, maxBattleWounds(member))} />
        </div>
        <div>
          <strong>Status</strong>
          <span className="print-status-boxes">
            <PrintCheck label="Hidden" />
            <PrintCheck label="Down" />
            <PrintCheck label="Stun" />
            <PrintCheck label="Out" />
          </span>
        </div>
      </div>

      <div className="print-member-fields">
        <PrintField label="Weapons" value={namesOrNone(weapons.map((item) => item.name))} />
        <PrintField label="Armour" value={namesOrNone(armour.map((item) => item.name))} />
        <PrintField label="Equipment" value={namesOrNone(otherEquipment.map((item) => item.name))} />
        <PrintField label="Skills" value={namesOrNone(skills)} />
        <PrintField label="Spells / prayers" value={namesOrNone(castableRules)} />
        <PrintField label="Special rules" value={namesOrNone(passiveRules)} />
        <PrintField label="Injuries" value={namesOrNone(member.injuries)} />
        <PrintField label="Notes" value={member.notes || " "} />
      </div>
    </article>
  );
}

function PrintSummary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PrintProfile({ profile }: { profile: RosterMember["currentProfile"] }) {
  const stats: Array<keyof RosterMember["currentProfile"]> = ["M", "WS", "BS", "S", "T", "W", "I", "A", "Ld"];
  return (
    <div className="print-profile">
      {stats.map((stat) => (
        <div key={stat}>
          <span>{stat}</span>
          <strong>{profile[stat]}</strong>
        </div>
      ))}
    </div>
  );
}

function PrintField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <strong>{label}</strong>
      <p>{value}</p>
    </div>
  );
}

function PrintBoxes({ count }: { count: number }) {
  return (
    <span className="print-boxes">
      {Array.from({ length: Math.max(1, count) }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

function PrintCheck({ label }: { label: string }) {
  return (
    <span className="print-check">
      <span />
      {label}
    </span>
  );
}

function PrintBlankLines({ title, lines }: { title: string; lines: number }) {
  return (
    <div>
      <strong>{title}</strong>
      {Array.from({ length: lines }, (_, index) => (
        <span className="print-blank-line" key={index} />
      ))}
    </div>
  );
}

function RosterHeader({ roster }: { roster: Roster }) {
  const warband = currentWarband(roster)!;
  const cost = calculateRosterCost(roster, rulesDb);
  const rating = calculateWarbandRating(roster, rulesDb);
  const remainingGold = warband.startingGold - cost;
  const displayedTreasury = roster.campaignLog.length === 0 ? Math.max(0, remainingGold) : roster.treasuryGold;

  return (
    <section className="roster-header">
      <div className="roster-title-lockup">
        <WarbandBadge warbandTypeId={roster.warbandTypeId} size="large" />
        <div>
        <p className="eyebrow">Warband name</p>
        <h2>{roster.name || "Unnamed Warband"}</h2>
        <SourceNote sourceUrl={warband.sourceUrl} label={`${warband.name} · ${warband.sourceCode}`} />
      </div>
        </div>
      <div className="metric-grid">
        <Metric icon={<Coins aria-hidden />} label="Treasury" value={`${displayedTreasury} gc`} tone={remainingGold < 0 ? "bad" : "good"} />
        <Metric icon={<Swords aria-hidden />} label="Cost" value={`${cost} gc`} />
        <Metric icon={<Shield aria-hidden />} label="Rating" value={rating.toString()} />
        <Metric icon={<BookOpen aria-hidden />} label="Wyrdstone" value={roster.wyrdstoneShards.toString()} />
      </div>
      <div className="stored-equipment">
        <strong>Stored equipment</strong>
        <p>{roster.storedEquipment.length ? roster.storedEquipment.map(equipmentName).join(", ") : "None"}</p>
      </div>
    </section>
  );
}

function MemberSections({
  roster,
  validation,
  showIllegalOptions,
  onRosterChange,
  onLookup
}: {
  roster: Roster;
  validation: ValidationIssue[];
  showIllegalOptions: boolean;
  onRosterChange: (updater: (roster: Roster) => Roster) => void;
  onLookup: (item: LookupItem) => void;
}) {
  const sections = [
    { title: "Heroes", members: roster.members.filter((member) => member.kind === "hero") },
    { title: "Henchman Groups", members: roster.members.filter((member) => member.kind === "henchman_group") },
    { title: "Hired Swords", members: roster.members.filter((member) => member.kind === "hired_sword") }
  ];

  return (
    <>
      {sections.map((section) => (
        <section className="member-section" key={section.title}>
          <h2>{section.title}</h2>
          {section.members.length === 0 ? (
            <div className="empty-state">No {section.title.toLowerCase()}.</div>
          ) : (
            <div className="member-grid">
              {section.members.map((member) => (
                <MemberCard
                  key={member.id}
                  roster={roster}
                  member={member}
                  issues={validation.filter((issue) => issue.affectedMemberId === member.id)}
                  showIllegalOptions={showIllegalOptions}
                  onLookup={onLookup}
                  onChange={(updated) =>
                    onRosterChange((current) => ({
                      ...current,
                      members: current.members.map((item) => (item.id === member.id ? updated : item))
                    }))
                  }
                  onRemove={() =>
                    onRosterChange((current) => ({
                      ...current,
                      members: current.members.filter((item) => item.id !== member.id)
                    }))
                  }
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}

function MemberCard({
  roster,
  member,
  issues,
  showIllegalOptions,
  onLookup,
  onChange,
  onRemove
}: {
  roster: Roster;
  member: RosterMember;
  issues: ValidationIssue[];
  showIllegalOptions: boolean;
  onLookup: (item: LookupItem) => void;
  onChange: (member: RosterMember) => void;
  onRemove: () => void;
}) {
  const fighterType = rulesDb.fighterTypes.find((item) => item.id === member.fighterTypeId)!;
  const specialRules = unique([...fighterType.specialRuleIds, ...member.specialRules])
    .map((id) => rulesDb.specialRules.find((rule) => rule.id === id))
    .filter(Boolean) as SpecialRule[];
  const castableRules = specialRules.filter((rule) => Boolean(rule.validation.selectableAs));
  const passiveRules = specialRules.filter((rule) => !rule.validation.selectableAs);
  const castableOptions = getAllowedSpecialRules(member, roster, rulesDb);
  const hasCastableChoices = castableRules.length > 0 || castableOptions.some((option) => option.allowed);
  const hasRequiredEquipmentChoices = fighterType.validation.requiredOneOfEquipmentItemIds.length > 0;

  return (
    <article className="member-card">
      <header>
        <div>
          <label>
            <span>Name</span>
            <input value={member.displayName} onChange={(event) => onChange({ ...member, displayName: event.target.value })} />
          </label>
          <p className="member-type">{fighterType.name}</p>
        </div>
        <button className="icon-danger" aria-label={`Remove ${member.displayName}`} onClick={onRemove}>
          <Trash2 aria-hidden />
        </button>
      </header>

      <div className="member-controls">
        {member.kind === "henchman_group" && (
          <label>
            <span>No.</span>
            <input
              type="number"
              min={fighterType.groupMinSize ?? 1}
              max={fighterType.groupMaxSize ?? undefined}
              value={member.groupSize}
              onChange={(event) => onChange({ ...member, groupSize: Number(event.target.value) })}
            />
          </label>
        )}
        <label>
          <span>XP</span>
          <input
            type="number"
            min={0}
            value={member.experience}
            onChange={(event) => onChange({ ...member, experience: Number(event.target.value) })}
          />
        </label>
        <label>
          <span>Status</span>
          <select value={member.status} onChange={(event) => onChange({ ...member, status: event.target.value as RosterMember["status"] })}>
            <option value="active">Active</option>
            <option value="missing">Missing</option>
            <option value="dead">Dead</option>
            <option value="retired">Retired</option>
          </select>
        </label>
      </div>

      <ProfileTable base={fighterType.profile} current={member.currentProfile} onChange={(profile) => onChange({ ...member, currentProfile: profile })} />

      {hasRequiredEquipmentChoices && (
        <RequiredEquipmentOptionPicker roster={roster} member={member} fighterType={fighterType} onChange={onChange} onLookup={onLookup} />
      )}

      <EquipmentPicker roster={roster} member={member} showIllegalOptions={showIllegalOptions} onChange={onChange} onLookup={onLookup} />

      <div className="member-detail-grid">
        <section>
          <h3>Skills</h3>
          <SkillPicker roster={roster} member={member} onChange={onChange} onLookup={onLookup} />
        </section>
        {hasCastableChoices && (
          <section>
            <h3>Prayers & Spells</h3>
            <SpellPrayerPicker roster={roster} member={member} onChange={onChange} onLookup={onLookup} />
          </section>
        )}
        <section>
          <h3>Special Rules</h3>
          <div className="chip-list">
            {passiveRules.length ? (
              passiveRules.map((rule) => (
                <button className="chip" key={rule.id} onClick={() => onLookup({ type: "specialRule", item: rule })}>
                  {rule.name}
                </button>
              ))
            ) : (
              <span className="muted">None</span>
            )}
          </div>
        </section>
      </div>

      <label>
        <span>Injuries and notes</span>
        <textarea value={[...member.injuries, member.notes].filter(Boolean).join("\n")} onChange={(event) => onChange({ ...member, notes: event.target.value })} />
      </label>

      {issues.length > 0 && (
        <div className="member-issues">
          {issues.map((issue) => (
            <ValidationMessage issue={issue} key={`${issue.code}-${issue.message}`} />
          ))}
        </div>
      )}
    </article>
  );
}

function RequiredEquipmentOptionPicker({
  roster,
  member,
  fighterType,
  onChange,
  onLookup
}: {
  roster: Roster;
  member: RosterMember;
  fighterType: FighterType;
  onChange: (member: RosterMember) => void;
  onLookup: (item: LookupItem) => void;
}) {
  const requiredIds = fighterType.validation.requiredOneOfEquipmentItemIds;
  const requiredItems = requiredIds
    .map((id) => rulesDb.equipmentItems.find((item) => item.id === id))
    .filter((item): item is EquipmentItem => Boolean(item));
  const selectedItems = member.equipment
    .map((id) => requiredItems.find((item) => item.id === id))
    .filter((item): item is EquipmentItem => Boolean(item));
  const allowedOptions = getAllowedEquipment(member, roster, rulesDb)
    .filter((option) => requiredIds.includes(option.item.id) && option.allowed && !member.equipment.includes(option.item.id));
  const isNurgleBlessing = requiredItems.some((item) => item.validation.costGroupId === "nurgle-blessing");
  const title = isNurgleBlessing ? "Blessings of Nurgle" : "Required options";
  const placeholder = isNurgleBlessing ? "Add Blessing of Nurgle" : "Add required option";
  const helpText = isNurgleBlessing
    ? "Tainted Ones must start with at least one Blessing. Additional Blessings are allowed and their paid cost is included in the roster total."
    : "This fighter type must include at least one of these paid options.";

  function removeItem(itemId: string) {
    onChange({ ...member, equipment: member.equipment.filter((id, index) => id !== itemId || index !== member.equipment.indexOf(itemId)) });
  }

  return (
    <section className="required-option-picker">
      <div className="section-heading compact">
        <div>
          <h3>{title}</h3>
          <p>{helpText}</p>
        </div>
      </div>
      <div className="chip-list">
        {selectedItems.map((item) => (
          <span className="choice-chip" key={item.id}>
            <button className="chip" onClick={() => onLookup({ type: "equipment", item })}>
              {item.name} ({item.cost} gc)
            </button>
            <button className="mini-remove" aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.id)}>
              Remove
            </button>
          </span>
        ))}
        {selectedItems.length === 0 && <span className="muted">None selected</span>}
      </div>
      <select
        value=""
        onChange={(event) => {
          const item = requiredItems.find((entry) => entry.id === event.target.value);
          if (item && !member.equipment.includes(item.id)) onChange({ ...member, equipment: [...member.equipment, item.id] });
        }}
      >
        <option value="">{placeholder}</option>
        {allowedOptions.map((option) => (
          <option value={option.item.id} key={option.item.id}>
            {option.item.name} - {option.item.cost} gc
          </option>
        ))}
      </select>
    </section>
  );
}

function ProfileTable({
  base,
  current,
  onChange
}: {
  base: RosterMember["currentProfile"];
  current: RosterMember["currentProfile"];
  onChange: (profile: RosterMember["currentProfile"]) => void;
}) {
  const stats = ["M", "WS", "BS", "S", "T", "W", "I", "A", "Ld"] as const;
  return (
    <div className="profile-table" role="table" aria-label="Profile">
      <div role="row">
        {stats.map((stat) => (
          <strong role="columnheader" key={stat}>
            {stat}
          </strong>
        ))}
      </div>
      <div role="row">
        {stats.map((stat) => (
          <span role="cell" key={`${stat}-base`}>
            {base[stat]}
          </span>
        ))}
      </div>
      <div role="row">
        {stats.map((stat) => (
          <input
            aria-label={`Current ${stat}`}
            key={`${stat}-current`}
            type="number"
            value={current[stat]}
            onChange={(event) => onChange({ ...current, [stat]: Number(event.target.value) })}
          />
        ))}
      </div>
    </div>
  );
}

function EquipmentPicker({
  roster,
  member,
  showIllegalOptions,
  onChange,
  onLookup
}: {
  roster: Roster;
  member: RosterMember;
  showIllegalOptions: boolean;
  onChange: (member: RosterMember) => void;
  onLookup: (item: LookupItem) => void;
}) {
  const [category, setCategory] = useState<EquipmentItem["category"] | "all">("all");
  const options = getAllowedEquipment(member, roster, rulesDb);
  const visibleOptions = options.filter((option) => {
    if (category !== "all" && option.item.category !== category) return false;
    return showIllegalOptions || option.allowed || member.equipment.includes(option.item.id);
  });

  function toggle(itemId: string) {
    const exists = member.equipment.includes(itemId);
    onChange({
      ...member,
      equipment: exists ? member.equipment.filter((id, index) => id !== itemId || index !== member.equipment.indexOf(itemId)) : [...member.equipment, itemId]
    });
  }

  return (
    <section className="equipment-picker">
      <div className="section-heading compact">
        <h3>Equipment</h3>
        <select value={category} onChange={(event) => setCategory(event.target.value as EquipmentItem["category"] | "all")}>
          <option value="all">All</option>
          <option value="close_combat">Close combat</option>
          <option value="missile">Missile</option>
          <option value="armour">Armour</option>
          <option value="miscellaneous">Misc.</option>
        </select>
      </div>
      <div className="equipment-list">
        {visibleOptions.map((option) => {
          const selected = member.equipment.includes(option.item.id);
          return (
            <div className={`equipment-option ${!option.allowed ? "blocked" : ""}`} key={option.item.id}>
              <label>
                <input type="checkbox" checked={selected} disabled={!option.allowed && !selected} onChange={() => toggle(option.item.id)} />
                <span>{option.item.name}</span>
                <small>{option.item.cost} gc</small>
              </label>
              <button aria-label={`Lookup ${option.item.name}`} onClick={() => onLookup({ type: "equipment", item: option.item })}>
                <BookOpen aria-hidden />
              </button>
              <p>{option.reason}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SkillPicker({
  roster,
  member,
  onChange,
  onLookup
}: {
  roster: Roster;
  member: RosterMember;
  onChange: (member: RosterMember) => void;
  onLookup: (item: LookupItem) => void;
}) {
  const options = getAllowedSkills(member, roster, rulesDb).filter((option) => option.allowed);
  const selectedSkills = member.skills.map((id) => rulesDb.skills.find((skill) => skill.id === id)).filter(Boolean) as Skill[];

  return (
    <div className="skill-picker">
      <div className="chip-list">
        {selectedSkills.map((skill) => (
          <button className="chip" key={skill.id} onClick={() => onLookup({ type: "skill", item: skill })}>
            {skill.name}
          </button>
        ))}
        {selectedSkills.length === 0 && <span className="muted">None</span>}
      </div>
      <select
        value=""
        onChange={(event) => {
          const skill = rulesDb.skills.find((item) => item.id === event.target.value);
          if (skill && !member.skills.includes(skill.id)) onChange({ ...member, skills: [...member.skills, skill.id] });
        }}
      >
        <option value="">Add skill</option>
        {options.map((option) => (
          <option value={option.item.id} key={option.item.id}>
            {option.item.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function SpellPrayerPicker({
  roster,
  member,
  onChange,
  onLookup
}: {
  roster: Roster;
  member: RosterMember;
  onChange: (member: RosterMember) => void;
  onLookup: (item: LookupItem) => void;
}) {
  const options = getAllowedSpecialRules(member, roster, rulesDb).filter((option) => option.item.validation.selectableAs && option.allowed);
  const selectedRules = member.specialRules
    .map((id) => rulesDb.specialRules.find((rule) => rule.id === id))
    .filter((rule): rule is SpecialRule => Boolean(rule?.validation.selectableAs));

  function removeRule(ruleId: string) {
    onChange({ ...member, specialRules: member.specialRules.filter((id) => id !== ruleId) });
  }

  return (
    <div className="skill-picker">
      <div className="chip-list">
        {selectedRules.map((rule) => (
          <span className="choice-chip" key={rule.id}>
            <button className="chip" onClick={() => onLookup({ type: "specialRule", item: rule })}>
              {rule.name}
            </button>
            <button className="mini-remove" aria-label={`Remove ${rule.name}`} onClick={() => removeRule(rule.id)}>
              Remove
            </button>
          </span>
        ))}
        {selectedRules.length === 0 && <span className="muted">None</span>}
      </div>
      <select
        value=""
        onChange={(event) => {
          const rule = rulesDb.specialRules.find((item) => item.id === event.target.value);
          if (rule && !member.specialRules.includes(rule.id)) onChange({ ...member, specialRules: [...member.specialRules, rule.id] });
        }}
      >
        <option value="">Add prayer or spell</option>
        {options.map((option) => (
          <option value={option.item.id} key={option.item.id}>
            {option.item.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampaignPanel({
  roster,
  onRosterChange
}: {
  roster: Roster;
  onRosterChange: (updater: (roster: Roster) => Roster) => void;
}) {
  const [description, setDescription] = useState("");
  const [goldDelta, setGoldDelta] = useState(0);
  const [wyrdstoneDelta, setWyrdstoneDelta] = useState(0);

  function addLog() {
    if (!description.trim() && goldDelta === 0 && wyrdstoneDelta === 0) return;
    onRosterChange((current) => ({
      ...current,
      treasuryGold: current.treasuryGold + goldDelta,
      wyrdstoneShards: current.wyrdstoneShards + wyrdstoneDelta,
      campaignLog: [
        campaignLogEntry(current, {
          type: "post_battle",
          description: description || "Post-battle update",
          goldDelta,
          wyrdstoneDelta,
          rosterChanges: "",
          details: {
            tags: ["post-battle"],
            treasury: goldDelta
              ? {
                  before: current.treasuryGold,
                  after: current.treasuryGold + goldDelta,
                  wyrdstoneSold: 0,
                  wyrdstoneIncome: 0,
                  otherIncome: goldDelta,
                  deductions: 0,
                  manualAdjustment: 0
                }
              : undefined,
            exploration: wyrdstoneDelta
              ? {
                  diceValues: [],
                  wyrdstoneFound: wyrdstoneDelta,
                  specialResults: []
                }
              : undefined
          }
        }),
        ...current.campaignLog
      ]
    }));
    setDescription("");
    setGoldDelta(0);
    setWyrdstoneDelta(0);
  }

  return (
    <section className="campaign-panel">
      <div className="section-heading">
        <div>
          <h2>Campaign Log</h2>
          <p>Post-game income, exploration, injuries, advances and notes.</p>
        </div>
      </div>
      <div className="campaign-form">
        <label>
          <span>Note</span>
          <input value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          <span>Gold delta</span>
          <input type="number" value={goldDelta} onChange={(event) => setGoldDelta(Number(event.target.value))} />
        </label>
        <label>
          <span>Wyrdstone delta</span>
          <input type="number" value={wyrdstoneDelta} onChange={(event) => setWyrdstoneDelta(Number(event.target.value))} />
        </label>
        <button onClick={addLog}>
          <Plus aria-hidden /> Add entry
        </button>
      </div>
      <div className="campaign-log">
        {roster.campaignLog.length === 0 ? (
          <div className="empty-state">No campaign entries yet.</div>
        ) : (
          roster.campaignLog.map((entry) => (
            <article key={entry.id}>
              <strong>{new Date(entry.date).toLocaleDateString()}</strong>
              <p>{entry.description}</p>
              {entry.rosterChanges && (
                <div className="campaign-summary">
                  {entry.rosterChanges.split("\n").filter(Boolean).map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
              <small>
                Gold {entry.goldDelta >= 0 ? "+" : ""}
                {entry.goldDelta} · Wyrdstone {entry.wyrdstoneDelta >= 0 ? "+" : ""}
                {entry.wyrdstoneDelta}
              </small>
            </article>
          ))
        )}
      </div>
      <label>
        <span>Campaign notes</span>
        <textarea value={roster.campaignNotes} onChange={(event) => onRosterChange((current) => ({ ...current, campaignNotes: event.target.value }))} />
      </label>
    </section>
  );
}

function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  return (
    <section className="validation-panel" aria-live="polite">
      <h2>Validation</h2>
      {issues.map((issue) => (
        <ValidationMessage issue={issue} key={`${issue.code}-${issue.message}-${issue.affectedMemberId ?? "roster"}`} />
      ))}
    </section>
  );
}

function ValidationMessage({ issue }: { issue: ValidationIssue }) {
  const Icon = issue.severity === "error" ? AlertTriangle : CheckCircle2;
  return (
    <article className={`validation-message ${issue.severity}`}>
      <Icon aria-hidden />
      <div>
        <strong>{issue.message}</strong>
        <p>{issue.detail}</p>
        {issue.suggestedFix && <p className="suggestion">{issue.suggestedFix}</p>}
        {issue.source?.sourceUrl && (
          <a href={issue.source.sourceUrl} target="_blank" rel="noreferrer">
            {issue.source.label || issue.source.sourceDocumentId} {issue.source.pageRef ? `· ${issue.source.pageRef}` : ""}
          </a>
        )}
      </div>
    </article>
  );
}

function SavePanel({
  blockingErrors,
  allowDraftSave,
  onToggleDraftSave,
  onSave
}: {
  blockingErrors: boolean;
  allowDraftSave: boolean;
  onToggleDraftSave: (value: boolean) => void;
  onSave: () => void;
}) {
  return (
    <section className="save-panel">
      <label className="toggle">
        <input type="checkbox" checked={allowDraftSave} onChange={(event) => onToggleDraftSave(event.target.checked)} />
        Allow draft save with errors
      </label>
      <button className="primary" disabled={blockingErrors && !allowDraftSave} onClick={onSave}>
        <Save aria-hidden /> Save roster
      </button>
    </section>
  );
}

function LookupPanel({ lookupItem, onClose }: { lookupItem: LookupItem; onClose: () => void }) {
  const item = lookupItem.item;
  const overrideRecord = lookupRecordForLookupItem(lookupItem);
  const highlight = lookupItem.type === "rule" ? lookupItem.highlight : undefined;
  const title = overrideRecord?.name ?? item.name;
  const category =
    overrideRecord
      ? overrideRecord.category.replaceAll("-", " ")
      : lookupItem.type === "equipment"
        ? lookupItem.item.category.replaceAll("_", " ")
        : lookupItem.type === "skill"
          ? skillCategoryName(lookupItem.item.categoryId)
          : lookupItem.type === "specialRule"
            ? lookupItem.item.validation.selectableAs ?? "special rule"
            : lookupItem.item.category.replaceAll("-", " ");
  const summary =
    overrideRecord
      ? overrideRecord.text || "Rule text not available yet. Add this rule to the rules data file."
      : lookupItem.type === "equipment"
        ? lookupItem.item.rulesSummary
        : lookupItem.type === "skill"
          ? lookupItem.item.effectSummary
          : lookupItem.type === "specialRule"
            ? lookupItem.item.effectSummary
            : lookupItem.item.text || "Rule text not available yet. Add this rule to the rules data file.";
  const restrictions = lookupItem.type !== "rule" && "restrictions" in item ? item.restrictions : undefined;
  const sourceUrl = overrideRecord?.sourceUrl ?? ("sourceUrl" in item ? item.sourceUrl : undefined);
  const pageRef = overrideRecord?.page ?? ("pageRef" in item ? item.pageRef : undefined);
  const sourceLabel = overrideRecord?.source;

  return (
    <aside className="lookup-panel" role="dialog" aria-modal="true" aria-label={`${title} lookup`}>
      <button className="close-button" onClick={onClose}>
        Close
      </button>
      <p className="eyebrow">{category}</p>
      <h2>{title}</h2>
      {highlight?.label && <p className="lookup-highlight-note">Highlighted roll: {highlight.label}</p>}
      <p>{summary}</p>
      {overrideRecord?.tables?.map((table) => (
        <RuleLookupTable table={table} highlight={highlight} key={table.caption ?? table.columns.join("-")} />
      ))}
      {restrictions && (
        <>
          <h3>Restrictions</h3>
          <p>{restrictions}</p>
        </>
      )}
      {lookupItem.type === "equipment" && <p className="cost-line">{lookupItem.item.cost} gc</p>}
      {overrideRecord && (
        <>
          {(overrideRecord.tags?.length || overrideRecord.aliases?.length) && (
            <div className="lookup-tags">
              {[...(overrideRecord.tags ?? []), ...(overrideRecord.aliases ?? [])].map((tag) => (
                <span className="pill" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          {(sourceLabel || pageRef) && (
            <p className="lookup-source">
              {sourceLabel}
              {pageRef ? ` · ${pageRef}` : ""}
            </p>
          )}
        </>
      )}
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noreferrer">
          Source {pageRef ? `· ${pageRef}` : ""}
        </a>
      )}
    </aside>
  );
}

function RuleLookupTable({ table, highlight }: { table: NonNullable<RuleLookupRecord["tables"]>[number]; highlight?: RuleLookupHighlight }) {
  return (
    <div className="lookup-table-wrap">
      {table.caption && <h3>{table.caption}</h3>}
      <table className="lookup-table">
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr
              className={isHighlightedLookupRow(table, row, rowIndex, highlight) ? "highlighted-row" : ""}
              key={`${rowIndex}-${row.join("|")}`}
            >
              {table.columns.map((column, columnIndex) => (
                <td key={`${column}-${columnIndex}`}>{row[columnIndex] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function isHighlightedLookupRow(
  table: NonNullable<RuleLookupRecord["tables"]>[number],
  row: string[],
  rowIndex: number,
  highlight?: RuleLookupHighlight
) {
  if (!highlight) return false;
  if (highlight.tableCaption && table.caption !== highlight.tableCaption) return false;
  if (highlight.rowIndex !== undefined) return rowIndex === highlight.rowIndex;
  return Boolean(highlight.rangeLabel && row[0] === highlight.rangeLabel);
}

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className={`metric ${tone ?? ""}`}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SourceNote({ sourceUrl, label }: { sourceUrl: string; label: string }) {
  return (
    <a className="source-note" href={sourceUrl} target="_blank" rel="noreferrer">
      <BookOpen aria-hidden /> {label}
    </a>
  );
}

function WarbandBadge({ warbandTypeId, size = "normal" }: { warbandTypeId: string; size?: "normal" | "large" }) {
  const warband = rulesDb.warbandTypes.find((item) => item.id === warbandTypeId);
  const meta = warbandBadgeMeta(warbandTypeId, warband);
  const tokenImage = warbandBadgeImage(warbandTypeId);
  return (
    <span
      className={`warband-badge badge-${warbandTypeId} ${tokenImage ? "has-token-image" : ""} ${size === "large" ? "large" : ""}`}
      aria-label={`${meta.title} badge`}
      title={`${meta.title} badge`}
    >
      {tokenImage ? (
        <picture className="warband-token-picture">
          <source srcSet={tokenImage.dark} media="(prefers-color-scheme: dark)" />
          <img src={tokenImage.light} alt="" loading="lazy" decoding="async" />
        </picture>
      ) : (
        <WarbandBadgeSymbol warbandTypeId={warbandTypeId} fallback={meta.mark} />
      )}
    </span>
  );
}

function warbandBadgeImage(warbandTypeId: string): { light: string; dark: string } | undefined {
  const available = new Set([
    "witch-hunters",
    "reiklanders",
    "middenheimers",
    "marienburgers",
    "sisters-of-sigmar",
    "carnival-of-chaos",
    "skaven",
    "skaven-of-clan-pestilens",
    "undead",
    "orc-mob",
    "dwarf-treasure-hunters",
    "beastmen-raiders",
    "shadow-warriors",
    "lizardmen",
    "forest-goblins",
    "black-orcs",
    "averlanders",
    "cult-of-the-possessed",
    "kislevites",
    "ostlanders"
  ]);
  if (!available.has(warbandTypeId)) return undefined;
  return {
    light: `/warband-icons/light/${warbandTypeId}.png`,
    dark: `/warband-icons/dark/${warbandTypeId}.png`
  };
}

function TokenIcon({ letters, children }: { letters: string; children: ReactNode }) {
  return (
    <svg className="token-icon" viewBox="0 0 64 64" aria-hidden>
      <circle className="token-ring" cx="32" cy="32" r="29" />
      <circle className="token-inner-ring" cx="32" cy="32" r="24" />
      <g className="token-art">{children}</g>
      <text className={`token-letter ${letters.length > 2 ? "token-letter-wide" : ""}`} x="32" y="57" textAnchor="middle">
        {letters}
      </text>
    </svg>
  );
}

function WarbandBadgeSymbol({ warbandTypeId, fallback }: { warbandTypeId: string; fallback: string }) {
  const common = { vectorEffect: "non-scaling-stroke" as const };
  switch (warbandTypeId) {
    case "witch-hunters":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M32 8v31M18 19h28M21 13l22 22M43 13 21 35" />
          <path {...common} d="M23 28c0-7 4-11 9-11s9 4 9 11c0 6-3 10-9 10s-9-4-9-10z" />
          <path {...common} d="M27 39h10M28 29h.5M36 29h.5M30 35h4" />
        </TokenIcon>
      );
    case "reiklanders":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M16 35c8-19 21-25 35-17-7 2-11 6-12 11 5 3 4 9-2 13-6-5-13-7-21-7z" />
          <path {...common} d="M28 19 21 9M36 18l7-7M22 35l-7 11M34 38l1 10M40 28h.5" />
          <path {...common} d="M25 26c5 0 9 1 13 4" />
        </TokenIcon>
      );
    case "middenheimers":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M14 34c7-15 16-21 28-18 4 1 7 3 10 7-7 0-12 3-14 8 4 5 1 11-6 14-6-6-12-9-18-11z" />
          <path {...common} d="M25 19 21 8M37 18l5-9M24 36 16 47M35 39l2 9M40 26h.5" />
        </TokenIcon>
      );
    case "marienburgers":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M16 40h32l-6 8H22zM20 48c5-3 9-3 14 0 5 3 10 3 15 0" />
          <path {...common} d="M32 12v28M32 15c8 4 12 9 12 18H32zM32 18c-7 4-11 9-11 17h11z" />
          <path {...common} d="M36 13l9 4" />
        </TokenIcon>
      );
    case "sisters-of-sigmar":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M32 12c6 5 7 11 0 17-7-6-6-12 0-17zM20 28c-6-4-5-11 2-14 5 5 4 11-2 14zM44 28c6-4 5-11-2-14-5 5-4 11 2 14z" />
          <path {...common} d="M32 27v19M22 35h20M18 45h28M13 21l6 6M51 21l-6 6" />
        </TokenIcon>
      );
    case "skaven":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M18 39c2-14 12-24 28-25-7 6-8 13-2 22 3 5 0 12-8 14-8 2-16-2-18-11z" />
          <path {...common} d="M29 29l-8-13M36 29l11-10M31 41h2M42 22l10-4M22 34l-11 3" />
        </TokenIcon>
      );
    case "skaven-of-clan-pestilens":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M20 37c2-13 9-20 20-21 4 3 6 8 6 14 0 10-6 17-14 17-6 0-10-3-12-10z" />
          <path {...common} d="M24 18c1-6 5-10 11-12M40 18l8-7M29 32h.5M38 31h.5M31 40h5" />
          <path {...common} d="M17 31h10M19 42l-7 7M44 40l8 7" />
        </TokenIcon>
      );
    case "undead":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M18 17 46 45M46 17 18 45" />
          <path {...common} d="M20 28c0-10 6-17 12-17s12 7 12 17c0 8-4 13-12 13s-12-5-12-13z" />
          <path {...common} d="M24 47h16M27 40v10M32 41v12M37 40v10M27 29h.5M37 29h.5M29 36h6" />
        </TokenIcon>
      );
    case "carnival-of-chaos":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M32 8v9M32 46v7M13 28h9M42 28h9M18 14l6 7M46 14l-6 7M18 44l6-7M46 44l-6-7" />
          <path {...common} d="M17 23c9-9 21-9 30 0-1 16-6 25-15 28-9-3-14-12-15-28z" />
          <path {...common} d="M23 31c4-3 8-3 11 0M41 31c-3-3-7-3-11 0M28 40c3 2 6 2 9 0" />
        </TokenIcon>
      );
    case "orc-mob":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M17 34c4-13 26-13 30 0-3 12-10 18-15 18s-12-6-15-18z" />
          <path {...common} d="M21 36l-8-6M43 36l8-6M25 41l4 7M39 41l-4 7M26 31h.5M38 31h.5M25 20l-7-8M39 20l7-8" />
          <path {...common} d="M25 39c5 3 9 3 14 0" />
        </TokenIcon>
      );
    case "black-orcs":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M15 39c4-15 30-15 34 0-4 10-10 15-17 15S19 49 15 39z" />
          <path {...common} d="M20 35 11 25M44 35l9-10M24 30h.5M40 30h.5M26 42l6 5 6-5" />
          <path {...common} d="M21 12h22l-5 13H26zM18 23h28M29 12l-3-5M35 12l3-5" />
        </TokenIcon>
      );
    case "beastmen-raiders":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M20 32c3-10 21-10 24 0 0 12-5 20-12 20s-12-8-12-20z" />
          <path {...common} d="M24 21C16 13 11 13 8 19c8 1 13 5 16 12M40 21c8-8 13-8 16-2-8 1-13 5-16 12" />
          <path {...common} d="M27 35h.5M37 35h.5M28 43l4 3 4-3M32 19v-8M16 44l-7 5M48 44l7 5" />
        </TokenIcon>
      );
    case "dwarf-treasure-hunters":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M18 18 31 31M45 17 32 31M44 17l6 6M19 18l-6 6" />
          <path {...common} d="M18 25h28l-5 13H23zM23 38h18l-4 11H27z" />
          <path {...common} d="M25 17c4-6 10-6 14 0M27 31h.5M37 31h.5" />
        </TokenIcon>
      );
    case "forest-goblins":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M18 38c4-12 10-19 18-21 6 5 9 11 9 18 0 8-5 13-13 13-6 0-11-3-14-10z" />
          <path {...common} d="M22 28 10 18M42 29l12-10M24 38 9 43M42 38l13 5M27 32h.5M38 32h.5" />
          <path {...common} d="M27 17l-3-8M38 19l5-8" />
        </TokenIcon>
      );
    case "shadow-warriors":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M20 17c7-8 18-8 25 0l-5 28H25z" />
          <path {...common} d="M25 29c4-3 10-3 14 0M22 44l20-20M42 44 22 24" />
          <path {...common} d="M14 17l11 11M50 17 39 28" />
        </TokenIcon>
      );
    case "lizardmen":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M16 37c12-19 25-23 36-14-6 2-10 5-11 10 4 5 2 11-5 15-8-5-15-8-20-11z" />
          <path {...common} d="M22 38l-8 11M32 42l-1 12M41 36l10 7M37 25l7-11M27 29h.5" />
          <path {...common} d="M20 35c7 1 13 3 18 7" />
        </TokenIcon>
      );
    case "averlanders":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M32 9v10M32 43v9M15 30h10M39 30h10M20 18l7 7M44 18l-7 7M20 44l7-7M44 44l-7-7" />
          <path {...common} d="M20 25h24v14H20zM32 25v14M20 32h24" />
          <path {...common} d="M26 16h12M27 45h10" />
        </TokenIcon>
      );
    case "cult-of-the-possessed":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M32 8v9M32 45v8M14 30h9M41 30h9M19 16l7 8M45 16l-7 8M20 45l7-8M44 45l-7-8" />
          <path {...common} d="M23 41c-4-10 3-17 9-29 7 13 13 20 9 29-2 5-6 8-9 8s-7-3-9-8z" />
          <path {...common} d="M32 24c3 6 4 10 1 16" />
        </TokenIcon>
      );
    case "kislevites":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M19 26c2-10 9-16 13-16s11 6 13 16l-5 16H24z" />
          <path {...common} d="M21 25c7 3 15 3 22 0M24 16l-5-6M40 16l5-6M26 34h.5M38 34h.5M28 42h8" />
          <path {...common} d="M15 34h8M41 34h8M18 47l28-28" />
        </TokenIcon>
      );
    case "ostlanders":
      return (
        <TokenIcon letters={fallback}>
          <path {...common} d="M14 38c11-19 23-23 36-17-6 3-9 6-9 10 5 4 4 10-2 15-8-4-17-6-25-8z" />
          <path {...common} d="M22 36l-9 11M33 39v12M42 32l11 6M28 24l-5-11M38 23l6-10M25 30h.5" />
          <path {...common} d="M20 38c8 0 15 2 21 6" />
        </TokenIcon>
      );
    default:
      return <span>{fallback}</span>;
  }
}

function warbandBadgeMeta(warbandTypeId: string, warband?: WarbandType): { mark: string; title: string } {
  const known: Record<string, { mark: string; title: string }> = {
    "witch-hunters": { mark: "WH", title: "Witch Hunters" },
    "sisters-of-sigmar": { mark: "SS", title: "Sisters of Sigmar" },
    skaven: { mark: "SK", title: "Skaven" },
    undead: { mark: "UD", title: "Undead" },
    "carnival-of-chaos": { mark: "CoC", title: "Carnival of Chaos" },
    "orc-mob": { mark: "OM", title: "Orc Mob" },
    "black-orcs": { mark: "BO", title: "Black Orcs" },
    "beastmen-raiders": { mark: "BR", title: "Beastmen Raiders" },
    "dwarf-treasure-hunters": { mark: "DH", title: "Dwarf Treasure Hunters" },
    "shadow-warriors": { mark: "SW", title: "Shadow Warriors" },
    lizardmen: { mark: "LM", title: "Lizardmen" },
    "forest-goblins": { mark: "FG", title: "Forest Goblins" },
    "skaven-of-clan-pestilens": { mark: "SP", title: "Skaven of Clan Pestilens" },
    averlanders: { mark: "AV", title: "Averlanders" },
    "cult-of-the-possessed": { mark: "CP", title: "Cult of the Possessed" },
    kislevites: { mark: "KS", title: "Kislevites" },
    ostlanders: { mark: "OS", title: "Ostlanders" },
    reiklanders: { mark: "RK", title: "Reiklanders" },
    middenheimers: { mark: "MH", title: "Middenheimers" },
    marienburgers: { mark: "MB", title: "Marienburgers" }
  };
  if (known[warbandTypeId]) return known[warbandTypeId];

  const title = warband?.name ?? warbandTypeId;
  const mark = title
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "WB";
  return { mark, title };
}

const SERIOUS_INJURY_RESULTS = [
  "Dead",
  "Multiple Injuries",
  "Leg Wound",
  "Arm Wound",
  "Madness",
  "Smashed Leg",
  "Chest Wound",
  "Blinded In One Eye",
  "Old Battle Wound",
  "Nervous Condition",
  "Hand Injury",
  "Deep Wound",
  "Robbed",
  "Full Recovery",
  "Bitter Enmity",
  "Captured",
  "Hardened",
  "Horrible Scars",
  "Sold To The Pits",
  "Survives Against The Odds",
  "Miss Next Game",
  "Other / custom"
];

const SERIOUS_INJURY_TABLE = [
  { min: 11, max: 15, result: "Dead" },
  { min: 16, max: 21, result: "Multiple Injuries" },
  { min: 22, max: 22, result: "Leg Wound" },
  { min: 23, max: 23, result: "Arm Wound" },
  { min: 24, max: 24, result: "Madness" },
  { min: 25, max: 25, result: "Smashed Leg" },
  { min: 26, max: 26, result: "Chest Wound" },
  { min: 31, max: 31, result: "Blinded In One Eye" },
  { min: 32, max: 32, result: "Old Battle Wound" },
  { min: 33, max: 33, result: "Nervous Condition" },
  { min: 34, max: 34, result: "Hand Injury" },
  { min: 35, max: 35, result: "Deep Wound" },
  { min: 36, max: 36, result: "Robbed" },
  { min: 41, max: 55, result: "Full Recovery" },
  { min: 56, max: 56, result: "Bitter Enmity" },
  { min: 61, max: 61, result: "Captured" },
  { min: 62, max: 63, result: "Hardened" },
  { min: 64, max: 64, result: "Horrible Scars" },
  { min: 65, max: 65, result: "Sold To The Pits" },
  { min: 66, max: 66, result: "Survives Against The Odds" }
];

const SIMPLE_SERIOUS_INJURY_FOLLOW_UPS = {
  "Arm Wound": {
    recordId: "table-arm-wound",
    tableCaption: "Arm Wound Follow-up",
    title: "Arm Wound follow-up",
    helperText: "Rolls the Arm Wound D6 table and records the permanent effect."
  },
  Madness: {
    recordId: "table-madness",
    tableCaption: "Madness Follow-up",
    title: "Madness follow-up",
    helperText: "Rolls the Madness D6 table and records Stupidity or Frenzy."
  },
  "Smashed Leg": {
    recordId: "table-smashed-leg",
    tableCaption: "Smashed Leg Follow-up",
    title: "Smashed Leg follow-up",
    helperText: "Rolls the Smashed Leg D6 table and records the result."
  },
  "Deep Wound": {
    recordId: "table-deep-wound",
    tableCaption: "Deep Wound Recovery",
    title: "Deep Wound recovery",
    helperText: "Rolls the Deep Wound D3 result using a D6 table and records how many games are missed."
  }
} as const;

const ADVANCE_RESULTS = [
  "+1 M",
  "+1 WS",
  "+1 BS",
  "+1 S",
  "+1 T",
  "+1 W",
  "+1 I",
  "+1 A",
  "+1 Ld",
  "New skill",
  "New spell / prayer",
  "Other / custom"
];

function buildRulesLookupRecords(): RuleLookupRecord[] {
  return uniqueById([
    ...(rulesLookupSeed as RuleLookupRecord[]),
    ...rulesDb.equipmentItems.map(ruleRecordForEquipment),
    ...rulesDb.skills.map(ruleRecordForSkill),
    ...rulesDb.specialRules.map(ruleRecordForSpecialRule),
    ...rulesDb.ruleReferences.map((rule): RuleLookupRecord => ({
      id: `reference-${rule.id}`,
      name: rule.name,
      category: "misc",
      text: rule.summary || "Rule text not available yet. Add this rule to the rules data file.",
      source: rule.sourceDocumentId,
      sourceUrl: rule.sourceUrl,
      page: rule.pageRef,
      tags: [rule.ruleCategory],
      aliases: [rule.id]
    }))
  ]);
}

function lookupRecordForLookupItem(lookupItem: LookupItem): RuleLookupRecord | undefined {
  if (lookupItem.type === "rule") return lookupItem.item;
  const prefix = lookupItem.type === "equipment" ? "equipment" : lookupItem.type === "skill" ? "skill" : "special";
  return rulesLookupRecords.find((record) => record.id === `${prefix}-${lookupItem.item.id}`);
}

function openLookupRecord(recordId: string, onLookup: (item: LookupItem) => void, highlight?: RuleLookupHighlight) {
  const record = rulesLookupRecords.find((item) => item.id === recordId);
  if (record) onLookup({ type: "rule", item: record, highlight });
}

function highlightForTableRoll(result: TableRollResult): RuleLookupHighlight | undefined {
  if (result.rowIndex === undefined && !result.rangeLabel) return undefined;
  return {
    tableCaption: result.tableCaption,
    rowIndex: result.rowIndex,
    rangeLabel: result.rangeLabel,
    label: result.rollLabel
  };
}

function highlightForTableMatch(match: TableRowMatch, label: string): RuleLookupHighlight {
  return {
    tableCaption: match.tableCaption,
    rowIndex: match.rowIndex,
    rangeLabel: match.rangeLabel,
    label
  };
}

function ruleRecordForEquipment(item: EquipmentItem): RuleLookupRecord {
  return {
    id: `equipment-${item.id}`,
    name: item.name,
    category: "equipment",
    text: item.rulesSummary || "Rule text not available yet. Add this rule to the rules data file.",
    source: item.sourceDocumentId,
    sourceUrl: item.sourceUrl,
    page: item.pageRef,
    tags: [item.category.replaceAll("_", " "), ...(item.specialRuleIds ?? [])],
    aliases: [item.id, item.rarity ?? ""].filter(Boolean)
  };
}

function ruleRecordForSkill(skill: Skill): RuleLookupRecord {
  return {
    id: `skill-${skill.id}`,
    name: skill.name,
    category: "skill",
    text: skill.effectSummary || "Rule text not available yet. Add this rule to the rules data file.",
    source: skill.sourceDocumentId,
    sourceUrl: skill.sourceUrl,
    page: skill.pageRef,
    tags: [skill.categoryId, ...skill.relatedRuleIds],
    aliases: [skill.id]
  };
}

function ruleRecordForSpecialRule(rule: SpecialRule): RuleLookupRecord {
  const category: RuleLookupCategory =
    rule.validation.selectableAs === "prayer" ? "prayer" :
      rule.validation.selectableAs === "spell" ? "spell" :
        rule.validation.selectableAs === "ritual" ? "spell" :
          "special-rule";
  return {
    id: `special-${rule.id}`,
    name: rule.name,
    category,
    text: rule.effectSummary || "Rule text not available yet. Add this rule to the rules data file.",
    source: rule.sourceDocumentId,
    sourceUrl: rule.sourceUrl,
    page: rule.pageRef,
    tags: [rule.appliesTo, ...rule.relatedRuleIds, rule.validation.selectableAs ?? ""].filter(Boolean),
    aliases: [rule.id]
  };
}

function ruleRecordForInjury(injury: string): RuleLookupRecord {
  const normalized = injury.toLowerCase();
  const existing = rulesLookupRecords.find((record) => {
    if (record.category !== "injury") return false;
    return record.name.toLowerCase() === normalized || record.aliases?.some((alias) => alias.toLowerCase() === normalized);
  });
  if (existing) return existing;
  return {
    id: `injury-${slug(injury)}`,
    name: injury,
    category: "injury",
    text: "Rule text not available yet. Add this rule to the rules data file.",
    tags: ["injury"],
    aliases: [injury]
  };
}

function ruleRecordForBattleStatus(status: BattleStatus): RuleLookupRecord | undefined {
  const statusRuleIds: Partial<Record<BattleStatus, string>> = {
    hidden: "battle-hidden",
    knocked_down: "battle-knocked-down",
    stunned: "battle-stunned",
    out_of_action: "battle-out-of-action"
  };
  const ruleId = statusRuleIds[status];
  return ruleId ? rulesLookupRecords.find((record) => record.id === ruleId) : undefined;
}

function battleStatusLabel(status: BattleStatus) {
  const labels: Record<BattleStatus, string> = {
    active: "Active",
    hidden: "Hidden",
    knocked_down: "Knocked down",
    stunned: "Stunned",
    out_of_action: "Out of action"
  };
  return labels[status];
}

function ruleMatchesQuery(record: RuleLookupRecord, normalizedQuery: string) {
  return [
    record.name,
    record.category,
    record.text,
    ...(record.tags ?? []),
    ...(record.aliases ?? [])
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
}

function createBattleState(roster: Roster): BattleState {
  return {
    rosterId: roster.id,
    updatedAt: new Date().toISOString(),
    members: Object.fromEntries(
      roster.members
        .filter((member) => member.status !== "dead" && member.status !== "retired")
        .map((member) => [member.id, defaultBattleMemberState(member)])
    )
  };
}

function ensureBattleState(roster: Roster, current?: BattleState): BattleState {
  const base = current?.rosterId === roster.id ? current : createBattleState(roster);
  const liveMemberIds = new Set(roster.members.filter((member) => member.status !== "dead" && member.status !== "retired").map((member) => member.id));
  const members = Object.fromEntries(
    roster.members
      .filter((member) => liveMemberIds.has(member.id))
      .map((member) => {
        const existing = base.members[member.id];
        const maxWounds = maxBattleWounds(member);
        return [
          member.id,
          {
            ...defaultBattleMemberState(member),
            ...existing,
            memberId: member.id,
            currentWounds: Math.min(existing?.currentWounds ?? maxWounds, maxWounds)
          }
        ];
      })
  );
  return { rosterId: roster.id, updatedAt: base.updatedAt, members };
}

function defaultBattleMemberState(member: RosterMember): BattleMemberState {
  return {
    memberId: member.id,
    status: "active",
    currentWounds: maxBattleWounds(member),
    enemyOoaXp: 0,
    objectiveXp: 0,
    otherXp: 0
  };
}

function readBattleState(roster: Roster): BattleState {
  try {
    const stored = JSON.parse(localStorage.getItem(battleStateKey(roster.id)) ?? "null") as BattleState | null;
    return ensureBattleState(roster, stored ?? undefined);
  } catch {
    return createBattleState(roster);
  }
}

function writeBattleState(state: BattleState) {
  localStorage.setItem(battleStateKey(state.rosterId), JSON.stringify(state));
}

function resetBattleStateStorage(roster: Roster) {
  localStorage.setItem(battleStateKey(roster.id), JSON.stringify(createBattleState(roster)));
}

function battleStateKey(rosterId: string) {
  return `mordheim.playState.${rosterId}`;
}

function readRecentRuleIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem("mordheim.recentRules") ?? "[]");
  } catch {
    return [];
  }
}

function writeRecentRuleIds(ids: string[]) {
  localStorage.setItem("mordheim.recentRules", JSON.stringify(ids));
}

function maxBattleWounds(member: RosterMember) {
  return Math.max(1, member.currentProfile.W * memberModelCount(member));
}

function memberModelCount(member: RosterMember) {
  return member.kind === "henchman_group" ? Math.max(0, member.groupSize) : 1;
}

function hasMissNextGameReminder(member: RosterMember) {
  return member.injuries.some(isMissNextGameInjury);
}

function isMissNextGameInjury(injury: string) {
  return /miss(?:es)? next|miss the next|deep wound/i.test(injury);
}

function hasOldBattleWound(member: RosterMember) {
  return member.injuries.some((injury) => /old battle wound/i.test(injury));
}

function countRosterFighters(members: RosterMember[]) {
  return members.reduce((total, member) => total + memberModelCount(member), 0);
}

function countIncomeWarriors(roster: Roster) {
  return Math.max(1, countRosterFighters(activeWarbandRosterMembers(roster)));
}

function calculateWyrdstoneSaleIncome(wyrdstoneSold: number, warriorCount: number) {
  const safeSold = Math.max(0, Math.floor(wyrdstoneSold));
  if (safeSold <= 0) return 0;
  const row = WYRDSTONE_INCOME_TABLE[Math.min(safeSold, 8)];
  return row[incomeWarriorBand(warriorCount)];
}

function incomeWarriorBand(warriorCount: number): keyof WyrdstoneIncomeRow {
  if (warriorCount <= 3) return "1-3";
  if (warriorCount <= 6) return "4-6";
  if (warriorCount <= 9) return "7-9";
  if (warriorCount <= 12) return "10-12";
  if (warriorCount <= 15) return "13-15";
  return "16+";
}

function treasuryWithWyrdstoneSale(
  treasury: AfterBattleDraft["treasury"],
  wyrdstoneSold: number,
  warriorCount: number
) {
  return recalculateTreasuryAfter({
    ...treasury,
    wyrdstoneSold,
    shardSaleIncome: calculateWyrdstoneSaleIncome(wyrdstoneSold, warriorCount)
  });
}

function addGoldToTreasury(treasury: AfterBattleDraft["treasury"], goldDelta: number) {
  if (!goldDelta) return treasury;
  return recalculateTreasuryAfter({
    ...treasury,
    otherIncome: treasury.otherIncome + goldDelta
  });
}

function recalculateTreasuryAfter(treasury: AfterBattleDraft["treasury"]) {
  return {
    ...treasury,
    after: treasury.before + treasury.shardSaleIncome + treasury.otherIncome - treasury.deductions + treasury.manualAdjustment
  };
}

function tradingGoldDelta(transactions: AfterBattleTransaction[]) {
  return transactions.reduce((total, transaction) => total + (Number.isFinite(transaction.value) ? transaction.value ?? 0 : 0), 0);
}

function formatGoldDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value} gc`;
}

function syncDraftTransactions(current: AfterBattleDraft, transactions: AfterBattleTransaction[]): AfterBattleDraft {
  const previousTradingDelta = tradingGoldDelta(current.transactions);
  const nextTradingDelta = tradingGoldDelta(transactions);
  const manualWithoutTrading = current.treasury.manualAdjustment - previousTradingDelta;
  return {
    ...current,
    transactions,
    treasury: recalculateTreasuryAfter({
      ...current.treasury,
      manualAdjustment: manualWithoutTrading + nextTradingDelta
    })
  };
}

function defaultTradeGoldValue(action: AfterBattleTransaction["action"], item?: EquipmentItem) {
  if (action === "bought") return -(item?.cost ?? 0);
  if (action === "sold") return Math.floor((item?.cost ?? 0) / 2);
  return 0;
}

function createAfterBattleTransaction(action: AfterBattleTransaction["action"] = "bought", item?: EquipmentItem): AfterBattleTransaction {
  return {
    id: id("trade"),
    action,
    itemName: item?.name ?? "",
    equipmentItemId: item?.id,
    value: defaultTradeGoldValue(action, item),
    assignedTo: action === "sold" || action === "discarded" ? "" : "stash",
    removeFrom: "",
    availability: item?.rarity ? "not_checked" : "not_required",
    applyToRoster: Boolean(item),
    notes: ""
  };
}

function tradeTargetLabel(roster: Roster, targetId?: string) {
  if (!targetId) return "Unassigned";
  if (targetId === "stash") return "Stash";
  return roster.members.find((member) => member.id === targetId)?.displayName ?? targetId;
}

function tradeItemLabel(transaction: AfterBattleTransaction) {
  return transaction.itemName || (transaction.equipmentItemId ? equipmentName(transaction.equipmentItemId) : "unnamed item");
}

function removeFirstItem(items: string[], itemId: string) {
  const index = items.indexOf(itemId);
  if (index < 0) return items;
  return [...items.slice(0, index), ...items.slice(index + 1)];
}

function applyTradingEquipmentChanges(
  roster: Roster,
  members: RosterMember[],
  transactions: AfterBattleTransaction[]
): { members: RosterMember[]; storedEquipment: string[] } {
  let nextMembers = members;
  let storedEquipment = [...roster.storedEquipment];

  function removeFromSource(sourceId: string | undefined, itemId: string) {
    if (!sourceId) return;
    if (sourceId === "stash") {
      storedEquipment = removeFirstItem(storedEquipment, itemId);
      return;
    }
    nextMembers = nextMembers.map((member) =>
      member.id === sourceId ? { ...member, equipment: removeFirstItem(member.equipment, itemId) } : member
    );
  }

  function addToDestination(destinationId: string | undefined, itemId: string) {
    if (!destinationId || destinationId === "stash") {
      storedEquipment = [...storedEquipment, itemId];
      return;
    }
    nextMembers = nextMembers.map((member) =>
      member.id === destinationId ? { ...member, equipment: [...member.equipment, itemId] } : member
    );
  }

  for (const transaction of transactions) {
    if (!transaction.equipmentItemId || transaction.applyToRoster === false) continue;
    if (transaction.action === "bought" || transaction.action === "found") {
      addToDestination(transaction.assignedTo || "stash", transaction.equipmentItemId);
    }
    if (transaction.action === "sold" || transaction.action === "discarded") {
      removeFromSource(transaction.removeFrom, transaction.equipmentItemId);
    }
    if (transaction.action === "moved") {
      removeFromSource(transaction.removeFrom, transaction.equipmentItemId);
      addToDestination(transaction.assignedTo || "stash", transaction.equipmentItemId);
    }
  }

  return { members: nextMembers, storedEquipment };
}

function previewTradingRosterEffects(roster: Roster, draft: AfterBattleDraft): string[] {
  return draft.transactions.flatMap((transaction) => {
    const itemName = tradeItemLabel(transaction);
    if (!transaction.equipmentItemId) {
      return transaction.itemName.trim() ? [`${transaction.action} ${itemName}: logged only, because it is a custom item.`] : [];
    }
    if (transaction.applyToRoster === false || transaction.action === "other") {
      return [`${transaction.action} ${itemName}: logged only.`];
    }
    if (transaction.action === "bought" || transaction.action === "found") {
      return [`${transaction.action} ${itemName}: add to ${tradeTargetLabel(roster, transaction.assignedTo || "stash")}.`];
    }
    if (transaction.action === "sold" || transaction.action === "discarded") {
      return [`${transaction.action} ${itemName}: remove from ${tradeTargetLabel(roster, transaction.removeFrom)}.`];
    }
    if (transaction.action === "moved") {
      return [`moved ${itemName}: ${tradeTargetLabel(roster, transaction.removeFrom)} to ${tradeTargetLabel(roster, transaction.assignedTo || "stash")}.`];
    }
    return [];
  });
}

function activeWarbandRosterMembers(roster: Roster) {
  return roster.members.filter((member) => {
    if (member.status === "dead" || member.status === "retired") return false;
    const fighterType = fighterTypeForMember(member);
    return fighterType?.warbandTypeId === roster.warbandTypeId;
  });
}

function countFighterTypeInRoster(roster: Roster, fighterTypeId: string) {
  const fighterType = rulesDb.fighterTypes.find((item) => item.id === fighterTypeId);
  return activeWarbandRosterMembers(roster)
    .filter((member) => member.fighterTypeId === fighterTypeId)
    .reduce((total, member) => total + (fighterType?.category === "henchman" ? member.groupSize : 1), 0);
}

function effectiveWarbandMax(roster: Roster, warband: WarbandType) {
  return activeWarbandRosterMembers(roster).reduce((maximum, member) => {
    const fighterType = fighterTypeForMember(member);
    return maximum + (fighterType?.validation.warbandMaxWarriorsBonus ?? 0);
  }, warband.maxWarriors);
}

function fighterTypeForMember(member: RosterMember) {
  return rulesDb.fighterTypes.find((fighterType) => fighterType.id === member.fighterTypeId);
}

function calculateRoutThreshold(totalFighters: number) {
  return Math.max(1, Math.ceil(totalFighters / 4));
}

function prepareAfterBattleDraft(roster: Roster): AfterBattleDraft {
  const battleState = readBattleState(roster);
  const stored = readAfterBattleDraft(roster);
  return stored ? mergeAfterBattleDraftWithBattleState(stored, roster, battleState) : createAfterBattleDraft(roster, battleState);
}

function mergeAfterBattleDraftWithBattleState(draft: AfterBattleDraft, roster: Roster, battleState: BattleState): AfterBattleDraft {
  const snapshot = ensureBattleState(roster, battleState);
  const previousSnapshot = draft.battleStateSnapshot ?? createBattleState(roster);
  const activeMembers = roster.members.filter((member) => member.status !== "dead" && member.status !== "retired");
  const injuryIds = new Set(draft.injuries.map((entry) => entry.fighterId));
  const injuries = [
    ...draft.injuries,
    ...activeMembers
      .filter((member) => snapshot.members[member.id]?.status === "out_of_action" && !injuryIds.has(member.id))
      .map(afterBattleInjuryEntryForMember)
  ];
  const xpIds = new Set(draft.xp.map((entry) => entry.fighterId));
  const missingXp = activeMembers.flatMap((member) => {
    if (xpIds.has(member.id)) return [];
    const fighterType = rulesDb.fighterTypes.find((item) => item.id === member.fighterTypeId);
    if (!fighterType?.canGainExperience) return [];
    return [afterBattleXpEntryForMember(member, fighterType, snapshot)];
  });
  const xp = [...draft.xp.map((entry) => {
    const memberState = snapshot.members[entry.fighterId];
    const previousState = previousSnapshot.members[entry.fighterId];
    if (!memberState) return recalculateXpEntry(entry);
    return recalculateXpEntry({
      ...entry,
      enemyOoa: !previousState || entry.enemyOoa === previousState.enemyOoaXp ? memberState.enemyOoaXp : entry.enemyOoa,
      objective: !previousState || entry.objective === previousState.objectiveXp ? memberState.objectiveXp : entry.objective,
      other: !previousState || entry.other === previousState.otherXp ? memberState.otherXp : entry.other
    });
  }), ...missingXp];

  return syncDraftAdvances({
    ...draft,
    battleStateSnapshot: snapshot,
    xp,
    injuries
  });
}

function afterBattleXpEntryForMember(member: RosterMember, fighterType: FighterType, battleState: BattleState): AfterBattleXpEntry {
  const startingXp = member.startingXp ?? fighterType.startingExperience;
  const previousXp = member.currentXp ?? member.experience;
  const memberBattleState = battleState.members[member.id] ?? defaultBattleMemberState(member);
  return recalculateXpEntry({
    fighterId: member.id,
    fighterName: member.displayName || fighterType.name,
    startingXp,
    previousXp,
    survived: 0,
    leaderBonus: 0,
    enemyOoa: memberBattleState.enemyOoaXp,
    objective: memberBattleState.objectiveXp,
    underdog: 0,
    other: memberBattleState.otherXp,
    gainedXp: 0,
    finalXp: previousXp,
    notes: "",
    pendingAdvanceThresholds: []
  });
}

function afterBattleInjuryEntryForMember(member: RosterMember): AfterBattleInjuryEntry {
  return {
    fighterId: member.id,
    fighterName: member.displayName,
    result: "",
    permanentEffect: "",
    notes: "",
    casualties: member.kind === "henchman_group" ? 0 : undefined
  };
}

function createAfterBattleDraft(roster: Roster, battleState: BattleState): AfterBattleDraft {
  const now = new Date().toISOString();
  const activeMembers = roster.members.filter((member) => member.status !== "dead" && member.status !== "retired");
  const xp = activeMembers.flatMap((member) => {
    const fighterType = rulesDb.fighterTypes.find((item) => item.id === member.fighterTypeId);
    if (!fighterType?.canGainExperience) return [];
    return [afterBattleXpEntryForMember(member, fighterType, battleState)];
  });
  const injuries = activeMembers
    .filter((member) => battleState.members[member.id]?.status === "out_of_action")
    .map(afterBattleInjuryEntryForMember);

  return syncDraftAdvances({
    id: id("after-battle"),
    warbandId: roster.id,
    createdAt: now,
    battleStateSnapshot: ensureBattleState(roster, battleState),
    battleResult: {
      datePlayed: now.slice(0, 10),
      leaderSurvived: true
    },
    xp,
    injuries,
    exploration: {
      diceValues: [],
      wyrdstoneShards: 0,
      specialResults: [],
      notes: ""
    },
    treasury: {
      before: roster.treasuryGold,
      wyrdstoneSold: 0,
      shardSaleIncome: 0,
      otherIncome: 0,
      deductions: 0,
      manualAdjustment: 0,
      after: roster.treasuryGold
    },
    transactions: [],
    advances: [],
    rosterUpdates: []
  });
}

function recalculateXpEntry(entry: AfterBattleXpEntry): AfterBattleXpEntry {
  const gainedXp = entry.survived + entry.leaderBonus + entry.enemyOoa + entry.objective + entry.underdog + entry.other;
  const finalXp = Math.max(entry.startingXp, entry.previousXp + gainedXp);
  return {
    ...entry,
    gainedXp,
    finalXp,
    pendingAdvanceThresholds: getPendingAdvances(entry.previousXp, finalXp, DEFAULT_MORDHEIM_ADVANCE_THRESHOLDS)
  };
}

function applyBattleResultXpDefaults(
  draft: AfterBattleDraft,
  roster: Roster,
  patch: Partial<AfterBattleDraft["battleResult"]>
): AfterBattleDraft {
  if (!Object.prototype.hasOwnProperty.call(patch, "result")) return draft;

  const leaderMember = leaderMemberForRoster(roster);
  if (!leaderMember) return draft;

  const result = patch.result;
  const xp = draft.xp.map((entry) => {
    if (entry.fighterId !== leaderMember.id) return entry;
    if (result === "win" && entry.leaderBonus === 0) {
      return recalculateXpEntry({ ...entry, leaderBonus: 1 });
    }
    if (result !== "win" && entry.leaderBonus === 1) {
      return recalculateXpEntry({ ...entry, leaderBonus: 0 });
    }
    return recalculateXpEntry(entry);
  });

  return syncDraftAdvances({ ...draft, xp });
}

function leaderMemberForRoster(roster: Roster): RosterMember | undefined {
  const warband = currentWarband(roster);
  if (!warband) return undefined;
  return roster.members.find((member) =>
    member.status !== "dead" &&
    member.status !== "retired" &&
    member.fighterTypeId === warband.leaderFighterTypeId
  );
}

function syncDraftAdvances(draft: AfterBattleDraft): AfterBattleDraft {
  const existing = new Map(draft.advances.map((advance) => [`${advance.fighterId}:${advance.xpThreshold}`, advance]));
  const advances = draft.xp.flatMap((entry) =>
    entry.pendingAdvanceThresholds.map((threshold) => {
      const key = `${entry.fighterId}:${threshold}`;
      return existing.get(key) ?? {
        id: `advance-${entry.fighterId}-${threshold}`,
        fighterId: entry.fighterId,
        fighterName: entry.fighterName,
        xpThreshold: threshold,
        result: "",
        notes: ""
      };
    })
  );
  return { ...draft, advances };
}

function readAfterBattleDraft(roster: Roster): AfterBattleDraft | undefined {
  try {
    const stored = JSON.parse(localStorage.getItem(afterBattleKey(roster.id)) ?? "null") as AfterBattleDraft | null;
    if (!stored || stored.warbandId !== roster.id) return undefined;
    return syncDraftAdvances(stored);
  } catch {
    return undefined;
  }
}

function writeAfterBattleDraft(draft: AfterBattleDraft) {
  localStorage.setItem(afterBattleKey(draft.warbandId), JSON.stringify(draft));
}

function clearAfterBattleDraft(rosterId: string) {
  localStorage.removeItem(afterBattleKey(rosterId));
}

function afterBattleKey(rosterId: string) {
  return `mordheim.afterBattle.${rosterId}`;
}

function applyAfterBattleDraft(roster: Roster, draft: AfterBattleDraft): Roster {
  const now = new Date().toISOString();
  const xpByMember = new Map(draft.xp.map((entry) => [entry.fighterId, entry]));
  const injuriesByMember = new Map(draft.injuries.map((entry) => [entry.fighterId, entry]));
  const advancesByMember = new Map<string, AfterBattleAdvanceEntry[]>();
  for (const advance of draft.advances.filter((entry) => entry.result.trim())) {
    advancesByMember.set(advance.fighterId, [...(advancesByMember.get(advance.fighterId) ?? []), advance]);
  }

  const membersAfterPostBattle = roster.members.map((member) => {
    const xp = xpByMember.get(member.id);
    const injury = injuriesByMember.get(member.id);
    const advances = advancesByMember.get(member.id) ?? [];
    let next: RosterMember = { ...member };

    if (xp) {
      next = {
        ...next,
        startingXp: xp.startingXp,
        currentXp: xp.finalXp,
        experience: xp.finalXp
      };
    }

    if (advances.length) {
      next = {
        ...next,
        advances: [...next.advances, ...advances.map((advance) => `${advance.xpThreshold}: ${advance.result}`)],
        advancesTaken: [
          ...(next.advancesTaken ?? []),
          ...advances.map((advance) => ({
            id: advance.id,
            xpAt: advance.xpThreshold,
            result: advance.result,
            date: draft.battleResult.datePlayed || now,
            notes: advance.notes
          }))
        ]
      };
    }

    if (injury && !injury.resolvedOutsideApp) {
      const injuryTexts = permanentInjuryEntries(injury);
      if (injuryTexts.length) next = { ...next, injuries: [...next.injuries, ...injuryTexts] };
      if (injury.result.toLowerCase() === "dead") next = { ...next, status: "dead" };
      if (member.kind === "henchman_group" && injury.casualties) {
        const groupSize = Math.max(0, next.groupSize - injury.casualties);
        next = { ...next, groupSize, status: groupSize === 0 ? "dead" : next.status };
      }
    }

    return next;
  });
  const tradingApplication = applyTradingEquipmentChanges(roster, membersAfterPostBattle, draft.transactions);

  const goldDelta = draft.treasury.after - roster.treasuryGold;
  const wyrdstoneDelta = draft.exploration.wyrdstoneShards - draft.treasury.wyrdstoneSold;
  const resultLabel = draft.battleResult.result?.replaceAll("-", " ") ?? "result not recorded";
  const historyLines = [
    `Battle result: ${resultLabel}`,
    `Opponent: ${draft.battleResult.opponent || "not recorded"}`,
    `Scenario: ${draft.battleResult.scenario || "not recorded"}`,
    `Date played: ${draft.battleResult.datePlayed || "not recorded"}`,
    `Leader survived: ${draft.battleResult.leaderSurvived === false ? "no" : "yes"}`,
    draft.battleResult.routType ? `Rout: ${draft.battleResult.routType.replaceAll("-", " ")}` : "",
    `XP: ${draft.xp.map((entry) => `${entry.fighterName} +${entry.gainedXp} (${entry.previousXp} to ${entry.finalXp})`).join(", ") || "none"}`,
    `Advances: ${draft.advances.map((entry) => `${entry.fighterName} ${entry.xpThreshold} XP - ${entry.result || "not selected"}`).join(", ") || "none"}`,
    `Injuries: ${draft.injuries.map((entry) => `${entry.fighterName} ${injurySummary(entry)}`).join(", ") || "none"}`,
    `Exploration: dice ${draft.exploration.diceValues.join(", ") || "not recorded"}; ${draft.exploration.wyrdstoneShards} wyrdstone found`,
    `Treasury: ${draft.treasury.before} gc to ${draft.treasury.after} gc`,
    `Trading: ${draft.transactions.map((entry) => `${entry.action} ${tradeItemLabel(entry)}${typeof entry.value === "number" ? ` (${formatGoldDelta(entry.value)})` : ""}`).join(", ") || "none"}`,
    `Roster updates: ${draft.rosterUpdates.map((entry) => entry.description).filter(Boolean).join("; ") || "none"}`
  ].filter(Boolean);

  return {
    ...roster,
    treasuryGold: draft.treasury.after,
    wyrdstoneShards: Math.max(0, roster.wyrdstoneShards + wyrdstoneDelta),
    storedEquipment: tradingApplication.storedEquipment,
    members: tradingApplication.members,
    campaignLog: [
      campaignLogEntry(roster, {
        type: "post_battle",
        description: `After Battle: ${resultLabel} - ${draft.battleResult.scenario || "Battle"} vs ${draft.battleResult.opponent || "unknown opponent"}`,
        goldDelta,
        wyrdstoneDelta,
        rosterChanges: historyLines.join("\n"),
        details: {
          tags: ["after-battle", "battle", "income", "exploration", "trading"],
          battle: {
            opponent: draft.battleResult.opponent,
            scenario: draft.battleResult.scenario,
            result: draft.battleResult.result,
            datePlayed: draft.battleResult.datePlayed,
            leaderSurvived: draft.battleResult.leaderSurvived,
            routType: draft.battleResult.routType,
            notes: draft.battleResult.notes
          },
          xp: draft.xp.map((entry) => ({
            fighterId: entry.fighterId,
            fighterName: entry.fighterName,
            previousXp: entry.previousXp,
            gainedXp: entry.gainedXp,
            finalXp: entry.finalXp,
            pendingAdvanceThresholds: entry.pendingAdvanceThresholds
          })),
          injuries: draft.injuries.map((entry) => ({
            fighterId: entry.fighterId,
            fighterName: entry.fighterName,
            result: entry.resolvedOutsideApp ? "Resolved outside app" : entry.result,
            permanentEffect: entry.permanentEffect,
            notes: entry.notes,
            casualties: entry.casualties,
            followUps: (entry.followUpInjuries ?? []).map((followUp) => ({
              result: followUp.result,
              effect: followUp.effect,
              notes: followUp.notes
            }))
          })),
          exploration: {
            diceValues: draft.exploration.diceValues,
            wyrdstoneFound: draft.exploration.wyrdstoneShards,
            specialResults: draft.exploration.specialResults ?? [],
            notes: draft.exploration.notes
          },
          treasury: {
            before: draft.treasury.before,
            after: draft.treasury.after,
            wyrdstoneSold: draft.treasury.wyrdstoneSold,
            wyrdstoneIncome: draft.treasury.shardSaleIncome,
            otherIncome: draft.treasury.otherIncome,
            deductions: draft.treasury.deductions,
            manualAdjustment: draft.treasury.manualAdjustment
          },
          transactions: draft.transactions.map((entry) => ({
            action: entry.action,
            itemName: entry.itemName,
            equipmentItemId: entry.equipmentItemId,
            value: entry.value,
            assignedTo: entry.assignedTo,
            removeFrom: entry.removeFrom,
            rareRoll: entry.rareRoll,
            availability: entry.availability,
            applyToRoster: entry.applyToRoster,
            notes: entry.notes
          })),
          advances: draft.advances.map((entry) => ({
            fighterId: entry.fighterId,
            fighterName: entry.fighterName,
            xpThreshold: entry.xpThreshold,
            result: entry.result,
            notes: entry.notes
          })),
          rosterUpdates: draft.rosterUpdates.map((entry) => ({
            type: entry.type,
            targetId: entry.targetId,
            description: entry.description,
            payload: entry.payload
          }))
        }
      }),
      ...roster.campaignLog
    ],
    updatedAt: now
  };
}

function previewRosterUpdates(roster: Roster, draft: AfterBattleDraft): string[] {
  const lines = [
    ...draft.xp.map((entry) => `${entry.fighterName}: set XP to ${entry.finalXp}`),
    ...draft.advances.filter((entry) => entry.result).map((entry) => `${entry.fighterName}: record ${entry.result} at ${entry.xpThreshold} XP`),
    ...draft.injuries.filter((entry) => entry.result || entry.resolvedOutsideApp).map((entry) => `${entry.fighterName}: ${injurySummary(entry)}`),
    `Treasury: ${roster.treasuryGold} gc to ${draft.treasury.after} gc`,
    `Wyrdstone: ${roster.wyrdstoneShards} to ${Math.max(0, roster.wyrdstoneShards + draft.exploration.wyrdstoneShards - draft.treasury.wyrdstoneSold)}`,
    ...previewTradingRosterEffects(roster, draft),
    ...draft.rosterUpdates.map((entry) => entry.description).filter(Boolean)
  ];
  return lines.length ? lines : ["No roster updates recorded."];
}

function reviewBlockingMessages(draft: AfterBattleDraft, roster: Roster): string[] {
  const messages: string[] = [];
  for (const injury of draft.injuries) {
    const member = roster.members.find((item) => item.id === injury.fighterId);
    if (member?.kind !== "henchman_group" && !injury.resolvedOutsideApp && !injury.result.trim()) {
      messages.push(`${injury.fighterName} needs a serious injury result.`);
    }
    if (member?.kind !== "henchman_group" && !injury.resolvedOutsideApp && injury.result === "Multiple Injuries") {
      const followUps = injury.followUpInjuries ?? [];
      if (followUps.length === 0 || followUps.some((followUp) => !followUp.result.trim())) {
        messages.push(`${injury.fighterName} needs serious injury follow-up rolls for Multiple Injuries.`);
      }
    }
    if (member?.kind !== "henchman_group" && !injury.resolvedOutsideApp && injury.result === "Bitter Enmity" && !injury.permanentEffect?.trim()) {
      messages.push(`${injury.fighterName} needs a Bitter Enmity hatred roll or manual hatred target.`);
    }
    if (member?.kind !== "henchman_group" && !injury.resolvedOutsideApp && simpleInjuryFollowUpFor(injury.result) && !injury.permanentEffect?.trim()) {
      messages.push(`${injury.fighterName} needs a ${injury.result} follow-up roll or manual permanent effect.`);
    }
    if (member?.kind !== "henchman_group" && !injury.resolvedOutsideApp && injury.result === "Sold To The Pits" && !injury.permanentEffect?.trim()) {
      messages.push(`${injury.fighterName} needs the Sold To The Pits result recorded or marked resolved outside app.`);
    }
  }
  for (const advance of draft.advances) {
    if (!advance.result.trim()) messages.push(`${advance.fighterName} needs an advance result for ${advance.xpThreshold} XP.`);
  }
  for (const transaction of draft.transactions) {
    if (!transaction.equipmentItemId && !transaction.itemName.trim()) messages.push("A trading entry needs an item name.");
  }
  return messages;
}

function afterBattleStepStatus(stepIndex: number, draft: AfterBattleDraft, roster: Roster) {
  if (stepIndex === 0) return draft.battleResult.result ? "done" : "optional";
  if (stepIndex === 1) return draft.xp.some((entry) => entry.gainedXp > 0) ? "xp entered" : "ready";
  if (stepIndex === 2) {
    const injuryBlockers = reviewBlockingMessages({ ...draft, advances: [] }, roster);
    if (injuryBlockers.length) return "needs result";
    return draft.injuries.length ? "done" : "none";
  }
  if (stepIndex === 3) return draft.exploration.diceValues.length || draft.exploration.wyrdstoneShards ? "recorded" : "ready";
  if (stepIndex === 4) return draft.treasury.wyrdstoneSold || draft.treasury.after !== roster.treasuryGold ? "updated" : "ready";
  if (stepIndex === 5) return draft.transactions.length ? `${draft.transactions.length} item${draft.transactions.length === 1 ? "" : "s"}` : "optional";
  if (stepIndex === 6) {
    if (!draft.advances.length) return "none";
    return draft.advances.every((advance) => advance.result.trim()) ? "done" : "needs result";
  }
  if (stepIndex === 7) return previewRosterUpdates(roster, draft).length ? "queued" : "optional";
  return reviewBlockingMessages(draft, roster).length ? "blocked" : "ready";
}

function afterBattleStepBlocker(stepIndex: number, draft: AfterBattleDraft, roster: Roster) {
  if (stepIndex === 2) {
    return reviewBlockingMessages({ ...draft, advances: [] }, roster)[0] ?? "Finish the injury results before moving on.";
  }
  if (stepIndex === 6) {
    const missing = draft.advances.find((advance) => !advance.result.trim());
    return missing ? `${missing.fighterName} still needs an advance result.` : "Choose every pending advance before moving on.";
  }
  return "Finish the required fields before moving on.";
}

function canContinueAfterBattleStep(stepIndex: number, draft: AfterBattleDraft, roster: Roster) {
  if (stepIndex === 2) {
    return reviewBlockingMessages({ ...draft, advances: [] }, roster).length === 0;
  }
  if (stepIndex === 6) {
    return draft.advances.every((advance) => advance.result.trim());
  }
  return true;
}

function advanceSummary(count: number) {
  if (count === 0) return "No advance due";
  if (count === 1) return "1 advance to allocate";
  return `${count} advances to allocate`;
}

function seriousInjuryResultForRoll(roll: number) {
  return SERIOUS_INJURY_TABLE.find((entry) => roll >= entry.min && roll <= entry.max)?.result ?? "Other / custom";
}

function simpleInjuryFollowUpFor(result: string) {
  return SIMPLE_SERIOUS_INJURY_FOLLOW_UPS[result as keyof typeof SIMPLE_SERIOUS_INJURY_FOLLOW_UPS];
}

function createSoldToPitsLosingInjuryRoll(random = Math.random): { roll: TableRollResult; rerolled: TableRollResult[] } {
  const rerolled: TableRollResult[] = [];
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const roll = createTableRoll(rulesLookupRecords, {
      kind: "d66",
      recordId: "table-sold-to-pits-losing-injury",
      tableCaption: "Sold To The Pits Losing Injury"
    }, random);
    if (roll.rangeLabel || attempt === 29) return { roll, rerolled };
    rerolled.push(roll);
  }
  return { roll: createTableRoll(rulesLookupRecords, { kind: "d66" }, random), rerolled };
}

function injuryPatchFromRoll(entry: AfterBattleInjuryEntry, roll: TableRollResult, isHenchmanGroup: boolean): Partial<AfterBattleInjuryEntry> {
  const result = roll.result || (roll.kind === "d66" ? seriousInjuryResultForRoll(roll.rollValue) : "Other / custom");
  const rollNote = `${roll.rollLabel}: ${result}${roll.effect ? ` - ${roll.effect}` : ""}.`;
  return {
    result,
    casualties: isHenchmanGroup && result === "Dead" ? Math.max(1, entry.casualties ?? 0) : entry.casualties,
    multipleInjuriesCountRoll: result === "Multiple Injuries" ? entry.multipleInjuriesCountRoll : undefined,
    followUpInjuries: result === "Multiple Injuries" ? entry.followUpInjuries : undefined,
    notes: prependNote(rollNote, entry.notes)
  };
}

function injuryResultPatch(entry: AfterBattleInjuryEntry, result: string): Partial<AfterBattleInjuryEntry> {
  if (result === "Multiple Injuries") {
    return {
      result,
      multipleInjuriesCountRoll: entry.multipleInjuriesCountRoll,
      followUpInjuries: entry.followUpInjuries
    };
  }

  return {
    result,
    multipleInjuriesCountRoll: undefined,
    followUpInjuries: undefined
  };
}

function followUpInjuryFromRoll(roll: FollowUpSeriousInjuryRoll): AfterBattleFollowUpInjury {
  return {
    id: id("injury-follow-up"),
    sequence: roll.sequence,
    rollLabel: roll.rollLabel,
    result: roll.result,
    effect: roll.effect,
    rangeLabel: roll.rangeLabel,
    tableCaption: roll.tableCaption,
    rowIndex: roll.rowIndex,
    rerolled: roll.rerolled.map((item) => `${item.rollLabel}: ${item.result}`),
    notes: ""
  };
}

function resizeFollowUpInjuries(current: AfterBattleFollowUpInjury[], count: number): AfterBattleFollowUpInjury[] {
  const safeCount = Math.max(0, Math.min(6, Math.floor(Number.isFinite(count) ? count : 0)));
  const resized = current.slice(0, safeCount).map((followUp, index) => ({ ...followUp, sequence: index + 1 }));
  while (resized.length < safeCount) {
    resized.push({
      id: id("injury-follow-up"),
      sequence: resized.length + 1,
      rollLabel: "Manual result",
      result: "",
      notes: ""
    });
  }
  return resized;
}

function followUpHighlight(followUp: AfterBattleFollowUpInjury): RuleLookupHighlight {
  return {
    tableCaption: followUp.tableCaption,
    rowIndex: followUp.rowIndex,
    rangeLabel: followUp.rangeLabel,
    label: followUp.rollLabel
  };
}

function injurySummary(injury: AfterBattleInjuryEntry) {
  if (injury.resolvedOutsideApp) return "resolved outside app";
  const main = injury.result || "not recorded";
  const followUps = followUpInjurySummary(injury);
  const permanent = injury.permanentEffect?.trim() ? `; ${injury.permanentEffect}` : "";
  return followUps ? `${main}; ${followUps}${permanent}` : `${main}${permanent}`;
}

function followUpInjurySummary(injury: AfterBattleInjuryEntry) {
  const followUps = injury.followUpInjuries ?? [];
  if (injury.result !== "Multiple Injuries" || followUps.length === 0) return "";
  const count = injury.multipleInjuriesCountRoll ?? followUps.length;
  return `Multiple Injuries follow-ups (${count}): ${followUps.map((followUp) => {
    const rerolled = followUp.rerolled?.length ? `; re-rolled ${followUp.rerolled.join(", ")}` : "";
    const notes = followUp.notes ? `; ${followUp.notes}` : "";
    return `#${followUp.sequence} ${followUp.result || "not recorded"}${rerolled}${notes}`;
  }).join("; ")}`;
}

function permanentInjuryEntries(injury: AfterBattleInjuryEntry) {
  if (!injury.result) return [];
  if (injury.result === "Multiple Injuries" && injury.followUpInjuries?.length) {
    return [
      `Multiple Injuries (${injury.multipleInjuriesCountRoll ?? injury.followUpInjuries.length} follow-up rolls)`,
      ...injury.followUpInjuries.map((followUp) => followUp.result).filter(Boolean)
    ];
  }
  return [[injury.result, injury.permanentEffect, injury.notes].filter(Boolean).join(" - ")].filter(Boolean);
}

function detectFollowUpDice(text?: string) {
  if (!text) return [];
  return unique([
    ...(text.match(/\bD3\b/gi) ?? []).map(() => "D3"),
    ...(text.match(/\bD6\b/gi) ?? []).map(() => "D6")
  ]);
}

function prependNote(note: string, existing?: string) {
  return [note, existing].filter(Boolean).join(" ");
}

function appendUniqueNote(existing: string | undefined, note: string) {
  const current = existing?.trim();
  if (!current) return note;
  return current.includes(note) ? current : `${current}\n${note}`;
}

function describeExplorationDice(values: number[]) {
  return getExplorationDiceSummary(rulesLookupRecords, values).description;
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function id(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

function createRosterDraft(warbandTypeId: string): Roster {
  const warband = rulesDb.warbandTypes.find((item) => item.id === warbandTypeId) ?? rulesDb.warbandTypes[0];
  const leader = rulesDb.fighterTypes.find((fighterType) => fighterType.id === warband.leaderFighterTypeId);
  const now = new Date().toISOString();
  const rosterId = `roster-${crypto.randomUUID()}`;
  return {
    id: rosterId,
    name: `${warband.name} Warband`,
    warbandTypeId: warband.id,
    treasuryGold: warband.startingGold,
    wyrdstoneShards: 0,
    storedEquipment: [],
    campaignNotes: "",
    members: leader ? [createRosterMemberFromType(leader, rosterId, "hero", leader.name)] : [],
    campaignLog: [],
    isDraft: true,
    createdAt: now,
    updatedAt: now
  };
}

function currentWarband(roster: Roster) {
  return rulesDb.warbandTypes.find((warband) => warband.id === roster.warbandTypeId);
}

function campaignLogEntry(
  roster: Roster,
  entry: {
    type: Roster["campaignLog"][number]["type"];
    description: string;
    goldDelta?: number;
    wyrdstoneDelta?: number;
    rosterChanges?: string;
    details?: Roster["campaignLog"][number]["details"];
  }
): Roster["campaignLog"][number] {
  return {
    id: id("log"),
    rosterId: roster.id,
    date: new Date().toISOString(),
    type: entry.type,
    description: entry.description,
    goldDelta: entry.goldDelta ?? 0,
    wyrdstoneDelta: entry.wyrdstoneDelta ?? 0,
    rosterChanges: entry.rosterChanges ?? "",
    details: entry.details
  };
}

type CampaignTask = {
  id: string;
  title: string;
  detail: string;
  tone?: "bad" | "good";
};

function campaignSummary(roster: Roster) {
  const battles = roster.campaignLog.filter((entry) => isBattleHistoryEntry(entry));
  const results = battles.map((entry) => campaignResultFromEntry(entry)).filter(Boolean);
  const wins = results.filter((result) => result === "win").length;
  const losses = results.filter((result) => result === "loss" || result === "routed" || result === "wiped out").length;
  const draws = results.filter((result) => result === "draw").length;
  return {
    battles: battles.length,
    recordLabel: battles.length ? `${wins}-${losses}-${draws}` : "0-0-0"
  };
}

function campaignTasks(roster: Roster, validation: ValidationIssue[]): CampaignTask[] {
  const tasks: CampaignTask[] = [];
  const draft = readAfterBattleDraft(roster);
  const blockingErrors = validation.filter((issue) => issue.severity === "error");
  const pendingAdvances = pendingCampaignAdvances(roster);
  const missingNextGame = roster.members.filter(hasMissNextGameReminder);
  const oldBattleWounds = roster.members.filter(hasOldBattleWound);
  const captured = roster.members.filter((member) => member.injuries.some((injury) => /captured/i.test(injury)) || member.status === "missing");
  const hiredSwords = roster.members.filter((member) => member.kind === "hired_sword" && member.status === "active");
  const upkeep = hiredSwords.reduce((total, member) => total + (hiredSwordForMember(member)?.upkeep ?? 0), 0);

  if (draft) {
    tasks.push({
      id: "after-battle-draft",
      title: "After Battle draft in progress",
      detail: "Finish or apply the saved After Battle draft before starting another campaign update.",
      tone: "bad"
    });
  }

  if (blockingErrors.length) {
    tasks.push({
      id: "validation-errors",
      title: `${blockingErrors.length} roster validation issue${blockingErrors.length === 1 ? "" : "s"}`,
      detail: "Open the roster editor to fix blocking roster problems.",
      tone: "bad"
    });
  }

  if (pendingAdvances.length) {
    tasks.push({
      id: "pending-advances",
      title: `${pendingAdvances.length} possible unrecorded advance${pendingAdvances.length === 1 ? "" : "s"}`,
      detail: pendingAdvances.slice(0, 3).map((advance) => `${advance.name} at ${advance.threshold} XP`).join(", "),
      tone: "bad"
    });
  }

  if (missingNextGame.length) {
    tasks.push({
      id: "miss-next-game",
      title: `${missingNextGame.length} fighter${missingNextGame.length === 1 ? "" : "s"} may miss the next game`,
      detail: missingNextGame.map((member) => member.displayName).join(", "),
      tone: "bad"
    });
  }

  if (oldBattleWounds.length) {
    tasks.push({
      id: "old-battle-wounds",
      title: "Old Battle Wound checks",
      detail: `${oldBattleWounds.map((member) => member.displayName).join(", ")} should roll before the next battle.`,
      tone: "bad"
    });
  }

  if (captured.length) {
    tasks.push({
      id: "captured",
      title: "Captured or missing fighters",
      detail: captured.map((member) => member.displayName).join(", "),
      tone: "bad"
    });
  }

  if (hiredSwords.length) {
    tasks.push({
      id: "hired-sword-upkeep",
      title: "Hired sword upkeep",
      detail: upkeep ? `${hiredSwords.length} hired sword${hiredSwords.length === 1 ? "" : "s"} currently require ${upkeep} gc upkeep.` : "Check hired sword upkeep before the next battle.",
      tone: roster.treasuryGold < upkeep ? "bad" : undefined
    });
  }

  if (roster.storedEquipment.length) {
    tasks.push({
      id: "stash",
      title: "Stored equipment in stash",
      detail: `${roster.storedEquipment.length} item${roster.storedEquipment.length === 1 ? "" : "s"} in storage. Assign or sell them if needed.`
    });
  }

  return tasks;
}

function campaignTimeline(roster: Roster) {
  return [...roster.campaignLog].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function campaignLogMatchesFilter(entry: Roster["campaignLog"][number], filter: CampaignLogFilter) {
  const details = entry.details;
  if (filter === "all") return true;
  if (filter === "battles") return isBattleHistoryEntry(entry);
  if (filter === "income") return entry.type === "income" || entry.type === "exploration" || Boolean(details?.treasury) || entry.goldDelta > 0 || entry.wyrdstoneDelta !== 0;
  if (filter === "injuries") return entry.type === "injury" || Boolean(details?.injuries?.length);
  if (filter === "trading") return entry.type === "purchase" || entry.type === "sale" || Boolean(details?.transactions?.length);
  if (filter === "advances") return entry.type === "advance" || Boolean(details?.advances?.length);
  if (filter === "upkeep") return entry.type === "upkeep" || campaignLogTags(entry).includes("upkeep");
  if (filter === "stash") return entry.type === "stash" || campaignLogTags(entry).includes("stash");
  if (filter === "notes") return entry.type === "note";
  return true;
}

function campaignLogTags(entry: Roster["campaignLog"][number]) {
  return uniquePreserveOrder([
    entry.type.replaceAll("_", " "),
    ...(entry.details?.tags ?? []),
    entry.details?.battle ? "battle" : "",
    entry.details?.treasury ? "income" : "",
    entry.details?.exploration ? "exploration" : "",
    entry.details?.injuries?.length ? "injury" : "",
    entry.details?.transactions?.length ? "trading" : "",
    entry.details?.advances?.length ? "advance" : ""
  ].filter(Boolean));
}

function campaignEconomy(roster: Roster) {
  const goldIn = roster.campaignLog.reduce((total, entry) => total + Math.max(0, entry.goldDelta), 0);
  const goldOut = roster.campaignLog.reduce((total, entry) => total + Math.min(0, entry.goldDelta), 0);
  const netWyrdstone = roster.campaignLog.reduce((total, entry) => total + entry.wyrdstoneDelta, 0);
  return {
    goldIn,
    goldOut,
    netGold: goldIn + goldOut,
    netWyrdstone
  };
}

function campaignFighterProgression(roster: Roster) {
  return roster.members.map((member) => {
    const fighterType = fighterTypeForMember(member);
    const currentXp = member.currentXp ?? member.experience;
    const flags = [
      member.status !== "active" ? member.status.replaceAll("_", " ") : "",
      hasMissNextGameReminder(member) ? "miss next game" : "",
      hasOldBattleWound(member) ? "old battle wound" : "",
      member.injuries.some((injury) => /captured/i.test(injury)) ? "captured" : "",
      ...pendingCampaignAdvancesForMember(member, fighterType).map((threshold) => `advance at ${threshold}`)
    ].filter(Boolean);

    return {
      id: member.id,
      name: member.kind === "henchman_group" ? `${member.displayName} x${member.groupSize}` : member.displayName || fighterType?.name || "Unnamed fighter",
      typeName: fighterType?.name ?? member.fighterTypeId,
      currentXp,
      advances: member.advancesTaken?.length || member.advances.length,
      injuries: member.injuries.length,
      status: member.status.replaceAll("_", " "),
      flags
    };
  });
}

function pendingCampaignAdvances(roster: Roster) {
  return roster.members.flatMap((member) => {
    const fighterType = fighterTypeForMember(member);
    return pendingCampaignAdvancesForMember(member, fighterType).map((threshold) => ({
      memberId: member.id,
      name: member.displayName || fighterType?.name || "Unnamed fighter",
      threshold
    }));
  });
}

function pendingCampaignAdvancesForMember(member: RosterMember, fighterType?: FighterType) {
  if (!fighterType?.canGainExperience || member.status === "dead" || member.status === "retired") return [];
  const startingXp = member.startingXp ?? fighterType.startingExperience;
  const currentXp = member.currentXp ?? member.experience;
  const taken = new Set([
    ...(member.advancesTaken ?? []).map((advance) => advance.xpAt),
    ...member.advances.map((advance) => Number(advance.split(":")[0])).filter((value) => Number.isFinite(value))
  ]);
  return DEFAULT_MORDHEIM_ADVANCE_THRESHOLDS.filter((threshold) => threshold > startingXp && threshold <= currentXp && !taken.has(threshold));
}

function hiredSwordForMember(member: RosterMember): HiredSword | undefined {
  const hiredSwordId = member.fighterTypeId.startsWith("hired-sword-") ? member.fighterTypeId.replace("hired-sword-", "") : "";
  return rulesDb.hiredSwords.find((hiredSword) => hiredSword.id === hiredSwordId);
}

function isBattleHistoryEntry(entry: Roster["campaignLog"][number]) {
  return Boolean(entry.details?.battle) || entry.type === "battle" || entry.type === "post_battle" || entry.description.toLowerCase().startsWith("after battle:");
}

function campaignResultFromEntry(entry: Roster["campaignLog"][number]) {
  if (entry.details?.battle?.result) return entry.details.battle.result.toLowerCase();
  const resultLine = entry.rosterChanges.split("\n").find((line) => line.toLowerCase().startsWith("battle result:"));
  return resultLine?.replace(/^battle result:\s*/i, "").trim().toLowerCase();
}

function campaignEntryFallback(type: Roster["campaignLog"][number]["type"]) {
  return type === "note" ? "Campaign note" : type.replaceAll("_", " ");
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function warbandName(warbandTypeId: string) {
  return rulesDb.warbandTypes.find((warband) => warband.id === warbandTypeId)?.name ?? warbandTypeId;
}

function equipmentName(itemId: string) {
  return rulesDb.equipmentItems.find((item) => item.id === itemId)?.name ?? itemId;
}

function namesOrNone(items: string[]) {
  return items.length ? items.join(", ") : "None";
}

function skillCategoryName(categoryId: string) {
  return rulesDb.skillCategories.find((category) => category.id === categoryId)?.name ?? categoryId;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items)).sort();
}

function uniquePreserveOrder<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function removeFirst<T>(items: T[], value: T): T[] {
  const index = items.indexOf(value);
  if (index < 0) return items;
  return [...items.slice(0, index), ...items.slice(index + 1)];
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "roster";
}
