import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Home,
  Mail,
  MapPin,
  Plus,
  RotateCcw,
  Swords,
  Users,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { errorMessage } from "../lib/errors";
import type { Roster } from "../rules/types";
import { schedulerConfig } from "./config";
import {
  acceptedPlayerCount,
  createGame,
  createGoogleCalendarInvite,
  currentPlayerInvite,
  invitationsForGame,
  isSchedulerAuthenticated,
  listSchedule,
  respondToInvite,
  updateGameStatus
} from "./store";
import type {
  CreateGameInput,
  GameInvitation,
  PlayerProfile,
  ScheduledGame,
  SchedulerGameStatus,
  SchedulerInviteStatus,
  SchedulerLocationType,
  SchedulerSnapshot
} from "./types";

type ScheduleFilter = {
  location: "all" | SchedulerLocationType;
  status: "all" | SchedulerGameStatus;
};

const todayKey = dateKey(new Date());

export function GameSchedulerPage({
  rosters,
  profile,
  authenticated,
  onWarbands,
  onCampaign
}: {
  rosters: Roster[];
  profile?: PlayerProfile;
  authenticated: boolean;
  onWarbands: () => void;
  onCampaign: () => void;
}) {
  const [snapshot, setSnapshot] = useState<SchedulerSnapshot>({ games: [], invitations: [], players: [], backend: "local" });
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [monthCursor, setMonthCursor] = useState(startOfMonth(new Date()));
  const [filter, setFilter] = useState<ScheduleFilter>({ location: "all", status: "all" });
  const [showCreate, setShowCreate] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const schedulerAuthenticated = authenticated && isSchedulerAuthenticated(profile);

  useEffect(() => {
    if (schedulerAuthenticated) {
      void refreshSchedule();
    } else {
      setLoading(false);
      setSnapshot({ games: [], invitations: [], players: [], backend: schedulerConfig.cloudEnabled ? "turso" : schedulerConfig.appsScriptUrl ? "google-sheet" : "local" });
    }
  }, [schedulerAuthenticated, profile?.playerId]);

  async function refreshSchedule() {
    setLoading(true);
    setError("");
    try {
      const loaded = await listSchedule(profile);
      setSnapshot(loaded);
      if (loaded.warning) setMessage(loaded.warning);
    } catch (loadError) {
      setError(errorText(loadError) || "Could not load schedule.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGame(input: CreateGameInput) {
    if (!schedulerAuthenticated || !profile) {
      setError("Log in before scheduling games.");
      return;
    }
    setError("");
    setMessage("Saving game...");
    try {
      const updated = await createGame(input, profile);
      setSnapshot(updated);
      setSelectedDate(input.date);
      setMonthCursor(startOfMonth(parseLocalDate(input.date)));
      setMessage("Game saved and invitations created.");
      setShowCreate(false);
    } catch (createError) {
      setError(errorText(createError) || "Could not save game.");
    }
  }

  async function handleInviteResponse(gameId: string, status: Exclude<SchedulerInviteStatus, "host">, warbandName?: string) {
    if (!schedulerAuthenticated || !profile) {
      setError("Log in before responding to invitations.");
      return;
    }
    setError("");
    setMessage("Updating invitation...");
    try {
      setSnapshot(await respondToInvite(gameId, profile, status, warbandName));
      setMessage("Invitation updated.");
    } catch (responseError) {
      setError(errorText(responseError) || "Could not update invitation.");
    }
  }

  async function handleStatusChange(gameId: string, status: SchedulerGameStatus) {
    setError("");
    try {
      setSnapshot(await updateGameStatus(gameId, status));
      setMessage(`Game marked ${status.replaceAll("_", " ")}.`);
    } catch (statusError) {
      setError(errorText(statusError) || "Could not update game.");
    }
  }

  async function handleCalendarInvite(game: ScheduledGame) {
    setError("");
    setMessage("Creating calendar invite...");
    try {
      setSnapshot(await createGoogleCalendarInvite(game.gameId));
      setMessage("Calendar invite created.");
    } catch (calendarError) {
      setError(errorText(calendarError) || "Could not create calendar invite.");
    }
  }

  const filteredGames = useMemo(
    () => snapshot.games.filter((game) => gameMatchesFilter(game, filter)),
    [snapshot.games, filter]
  );
  const invitations = snapshot.invitations;
  const upcomingGames = filteredGames
    .filter((game) => game.date >= todayKey && game.status !== "cancelled" && game.status !== "completed")
    .sort(compareGames)
    .slice(0, 8);
  const nextGame = upcomingGames[0];
  const pastGames = filteredGames
    .filter((game) => game.date < todayKey || game.status === "completed")
    .sort((a, b) => compareGames(b, a))
    .slice(0, 8);
  const pendingInvitations = profile
    ? snapshot.invitations
        .filter((invite) => invite.playerId === profile.playerId && invite.inviteStatus === "invited")
        .map((invite) => snapshot.games.find((game) => game.gameId === invite.gameId))
        .filter((game): game is ScheduledGame => Boolean(game))
        .sort(compareGames)
    : [];
  const thisWeekCount = snapshot.games.filter((game) => isWithinNextDays(game.date, 7)).length;
  const locationCount = new Set(snapshot.games.map((game) => game.locationName).filter(Boolean)).size;

  return (
    <section className="scheduler-page">
      <div className="scheduler-hero">
        <div>
          <p className="eyebrow">Mordheim campaign helper</p>
          <h2>Game Scheduler</h2>
          <p>{schedulerConfig.campaignName}</p>
        </div>
        <div className="button-row">
          <button onClick={onWarbands}>
            <Users aria-hidden /> Warbands
          </button>
          <button onClick={onCampaign}>
            <CalendarDays aria-hidden /> Campaign
          </button>
          <button className="active">
            <CalendarDays aria-hidden /> Schedule
          </button>
          <button className="primary" onClick={() => setShowCreate((current) => !current)}>
            <Plus aria-hidden /> Host Game
          </button>
        </div>
      </div>

      {message && <div className="status-banner info">{message}</div>}
      {error && <div className="status-banner error"><AlertTriangle aria-hidden /> {error}</div>}
      {loading && <div className="empty-state">Loading schedule...</div>}

      <SchedulerAccountPanel
        profile={profile}
        authenticated={schedulerAuthenticated}
      />

      <NextGamePanel
        game={nextGame}
        invitations={invitations}
        profile={profile}
      />

      <div className="metric-grid scheduler-metrics">
        <MetricBox icon={<CalendarDays aria-hidden />} label="Upcoming games" value={upcomingGames.length.toString()} />
        <MetricBox icon={<Mail aria-hidden />} label="Open invitations" value={pendingInvitations.length.toString()} />
        <MetricBox icon={<MapPin aria-hidden />} label="Locations" value={locationCount.toString()} />
        <MetricBox icon={<Clock aria-hidden />} label="This week" value={thisWeekCount.toString()} />
      </div>

      {showCreate && (
        <GameCreateForm
          disabled={!schedulerAuthenticated}
          rosters={rosters}
          players={snapshot.players}
          profile={profile}
          onCreate={handleCreateGame}
        />
      )}

      <div className="scheduler-layout">
        <section className="scheduler-card calendar-card">
          <div className="section-heading">
            <div>
              <h3>Calendar</h3>
              <p>Month view for scheduled campaign games.</p>
            </div>
            <div className="button-row">
              <button onClick={() => setMonthCursor(addMonths(monthCursor, -1))}>Previous</button>
              <button onClick={() => setMonthCursor(startOfMonth(new Date()))}>Today</button>
              <button onClick={() => setMonthCursor(addMonths(monthCursor, 1))}>Next</button>
            </div>
          </div>
          <ScheduleCalendar
            month={monthCursor}
            games={filteredGames}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </section>

        <SelectedDayGames
          date={selectedDate}
          games={filteredGames.filter((game) => game.date === selectedDate).sort(compareGames)}
          invitations={invitations}
          rosters={rosters}
          profile={profile}
          onRespond={handleInviteResponse}
          onCalendarInvite={handleCalendarInvite}
          onStatusChange={handleStatusChange}
        />
      </div>

      <section className="scheduler-card schedule-filters">
        <div className="section-heading">
          <div>
            <h3>Show Games</h3>
            <p>Filter upcoming and past game cards.</p>
          </div>
          <button onClick={() => setFilter({ location: "all", status: "all" })}>
            <RotateCcw aria-hidden /> Reset
          </button>
        </div>
        <div className="form-grid compact-form">
          <label>
            <span>Location</span>
            <select value={filter.location} onChange={(event) => setFilter((current) => ({ ...current, location: event.target.value as ScheduleFilter["location"] }))}>
              <option value="all">All locations</option>
              <option value="nova_games">Nova Games</option>
              <option value="player_house">Player house</option>
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={filter.status} onChange={(event) => setFilter((current) => ({ ...current, status: event.target.value as ScheduleFilter["status"] }))}>
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="scheduled">Scheduled</option>
              <option value="full">Full</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>
      </section>

      <div className="scheduler-columns">
        <GameListSection
          title="Pending Invitations"
          empty="No pending invitations"
          games={pendingInvitations}
          invitations={invitations}
          rosters={rosters}
          profile={profile}
          onRespond={handleInviteResponse}
          onCalendarInvite={handleCalendarInvite}
          onStatusChange={handleStatusChange}
        />
        <GameListSection
          title="Upcoming Games"
          empty="No upcoming games"
          games={upcomingGames}
          invitations={invitations}
          rosters={rosters}
          profile={profile}
          onRespond={handleInviteResponse}
          onCalendarInvite={handleCalendarInvite}
          onStatusChange={handleStatusChange}
        />
        <GameListSection
          title="Past Games"
          empty="No past games"
          games={pastGames}
          invitations={invitations}
          rosters={rosters}
          profile={profile}
          onRespond={handleInviteResponse}
          onCalendarInvite={handleCalendarInvite}
          onStatusChange={handleStatusChange}
        />
      </div>

      {!schedulerAuthenticated && (
        <div className="status-banner warning">
          <AlertTriangle aria-hidden /> Log in before accepting invitations or creating games.
        </div>
      )}
      <p className="muted scheduler-footnote">
        {schedulerBackendFootnote(snapshot.backend)}
      </p>
    </section>
  );
}

function SchedulerAccountPanel({ profile, authenticated }: { profile?: PlayerProfile; authenticated: boolean }) {
  return (
    <section className="scheduler-card profile-card">
      <div className="section-heading">
        <div>
          <h3>Campaign Account</h3>
          <p>{authenticated ? "Using the same cloud account as warband saves." : "Log in from Cloud Saves above to use the shared campaign schedule."}</p>
        </div>
        {authenticated && <span className="pill">Signed in</span>}
      </div>
      {authenticated && profile ? (
        <div className="auth-summary">
          <div>
            <strong>{profile.playerName}</strong>
            <p className="muted">{profile.email || "No email saved"}</p>
          </div>
          <span className="pill success">Scheduler ready</span>
        </div>
      ) : (
        <div className="status-banner warning">
          <AlertTriangle aria-hidden /> Use the Cloud Saves account panel in the header to log in once for rosters and scheduling.
        </div>
      )}
    </section>
  );
}

function NextGamePanel({
  game,
  invitations,
  profile
}: {
  game?: ScheduledGame;
  invitations: GameInvitation[];
  profile?: PlayerProfile;
}) {
  const myInvite = game ? currentPlayerInvite(game.gameId, profile, invitations) : undefined;
  return (
    <section className="scheduler-card profile-card">
      <div className="section-heading">
        <div>
          <h3>Next Game</h3>
          <p>{game ? `${formatDateLong(game.date)} at ${game.time}` : "No upcoming game is scheduled yet."}</p>
        </div>
        {game && <span className={`status-pill status-${game.status}`}>{game.status}</span>}
      </div>
      {game ? (
        <div className="auth-summary">
          <div>
            <strong>{game.title}</strong>
            <p className="muted">
              {game.locationName} · {acceptedPlayerCount(game, invitations)} / {game.maxPlayers} players
              {myInvite ? ` · My RSVP: ${myInvite.inviteStatus}${myInvite.warbandName ? ` with ${myInvite.warbandName}` : ""}` : ""}
            </p>
          </div>
          <span className="pill">{game.hostName} hosting</span>
        </div>
      ) : (
        <div className="empty-state">Use Host Game to put the next session on the campaign calendar.</div>
      )}
    </section>
  );
}

function schedulerBackendFootnote(backend: SchedulerSnapshot["backend"]) {
  if (backend === "turso") {
    return `Shared cloud backend: Turso. Campaign: ${schedulerConfig.campaignName} (${schedulerConfig.campaignId}).`;
  }
  if (backend === "google-sheet") {
    return `Shared sheet: ${schedulerConfig.googleSheetId}. Backend: Google Sheet via Apps Script.`;
  }
  return "Backend: local fallback on this device only.";
}

function GameCreateForm({
  disabled,
  rosters,
  players,
  profile,
  onCreate
}: {
  disabled: boolean;
  rosters: Roster[];
  players: PlayerProfile[];
  profile?: PlayerProfile;
  onCreate: (input: CreateGameInput) => void;
}) {
  const [title, setTitle] = useState("Mordheim campaign game");
  const [date, setDate] = useState(todayKey);
  const [time, setTime] = useState("18:30");
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [locationType, setLocationType] = useState<SchedulerLocationType>("nova_games");
  const [locationName, setLocationName] = useState("Nova Games");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [notes, setNotes] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualWarband, setManualWarband] = useState("");
  const [hostWarbandName, setHostWarbandName] = useState("");
  const [invitedPlayers, setInvitedPlayers] = useState<CreateGameInput["invitedPlayers"]>([]);
  const availablePlayers = players.filter((player) => player.playerId !== profile?.playerId && !invitedPlayers.some((invite) => invite.playerId === player.playerId));

  function changeLocationType(nextType: SchedulerLocationType) {
    setLocationType(nextType);
    setLocationName(nextType === "nova_games" ? "Nova Games" : `${profile?.playerName || "Player"}'s House`);
  }

  function addKnownPlayer(playerId: string) {
    const player = players.find((entry) => entry.playerId === playerId);
    if (!player) return;
    setInvitedPlayers((current) => [...current, { playerId: player.playerId, playerName: player.playerName, email: player.email }]);
  }

  function addManualPlayer() {
    if (!manualName.trim()) return;
    setInvitedPlayers((current) => [
      ...current,
      { playerName: manualName.trim(), email: manualEmail.trim() || undefined, warbandName: manualWarband.trim() || undefined }
    ]);
    setManualName("");
    setManualEmail("");
    setManualWarband("");
  }

  function removeInvite(index: number) {
    setInvitedPlayers((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <section className="scheduler-card create-game-card">
      <div className="section-heading">
        <div>
          <h3>Campaign Schedule</h3>
          <p>{schedulerConfig.campaignName}</p>
        </div>
        {disabled && <span className="pill warning-pill">Profile required</span>}
      </div>
      <div className="form-grid">
        <label>
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          <span>Date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label>
          <span>Time</span>
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        <label>
          <span>Duration</span>
          <select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}>
            <option value={120}>2 hours</option>
            <option value={180}>3 hours</option>
            <option value={240}>4 hours</option>
            <option value={300}>5 hours</option>
          </select>
        </label>
        <label>
          <span>Players, 2-6</span>
          <select value={maxPlayers} onChange={(event) => setMaxPlayers(Number(event.target.value))}>
            {[2, 3, 4, 5, 6].map((count) => <option value={count} key={count}>{count}</option>)}
          </select>
        </label>
        <div>
          <span className="field-label">Location Type</span>
          <div className="segmented-control schedule-location-toggle">
            <button className={locationType === "nova_games" ? "active" : ""} onClick={() => changeLocationType("nova_games")}>Nova Games</button>
            <button className={locationType === "player_house" ? "active" : ""} onClick={() => changeLocationType("player_house")}>Player House</button>
          </div>
        </div>
        <label>
          <span>Venue / Host</span>
          <input value={locationName} onChange={(event) => setLocationName(event.target.value)} />
        </label>
        <label>
          <span>Known players</span>
          <select value="" onChange={(event) => addKnownPlayer(event.target.value)}>
            <option value="">Add known player</option>
            {availablePlayers.map((player) => <option value={player.playerId} key={player.playerId}>{player.playerName}</option>)}
          </select>
        </label>
        <label>
          <span>My warband, optional</span>
          <select value={hostWarbandName} onChange={(event) => setHostWarbandName(event.target.value)}>
            <option value="">No warband selected</option>
            {rosters.map((roster) => <option value={roster.name} key={roster.id}>{roster.name}</option>)}
          </select>
        </label>
      </div>
      <div className="invite-chip-box">
        <strong>Invited players</strong>
        <div className="chip-list">
          {invitedPlayers.length ? invitedPlayers.map((player, index) => (
            <button className="chip remove-chip" key={`${player.playerName}-${index}`} onClick={() => removeInvite(index)}>
              {player.playerName} <X aria-hidden />
            </button>
          )) : <span className="muted">No invited players yet.</span>}
        </div>
      </div>
      <div className="form-grid compact-form">
        <label>
          <span>Add player name</span>
          <input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Martin" />
        </label>
        <label>
          <span>Email, optional</span>
          <input value={manualEmail} onChange={(event) => setManualEmail(event.target.value)} />
        </label>
        <label>
          <span>Warband, optional</span>
          <input value={manualWarband} onChange={(event) => setManualWarband(event.target.value)} list="local-warband-names" />
          <datalist id="local-warband-names">
            {rosters.map((roster) => <option value={roster.name} key={roster.id} />)}
          </datalist>
        </label>
        <button onClick={addManualPlayer} disabled={!manualName.trim()}>
          <Plus aria-hidden /> Add Player
        </button>
      </div>
      <label>
        <span>Notes, optional</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Bring extra terrain." />
      </label>
      <button
        className="primary wide-action"
        disabled={disabled}
        onClick={() => onCreate({ title, date, time, durationMinutes, locationType, locationName, maxPlayers, notes, hostWarbandName, invitedPlayers })}
      >
        <Swords aria-hidden /> Host Game
      </button>
    </section>
  );
}

function ScheduleCalendar({
  month,
  games,
  selectedDate,
  onSelectDate
}: {
  month: Date;
  games: ScheduledGame[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const days = calendarMonthDays(month);
  const gamesByDate = new Map<string, ScheduledGame[]>();
  for (const game of games) {
    gamesByDate.set(game.date, [...(gamesByDate.get(game.date) ?? []), game]);
  }

  return (
    <div className="schedule-calendar">
      <header>
        <h4>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h4>
      </header>
      <div className="calendar-weekdays">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-grid">
        {days.map((day) => {
          const key = dateKey(day.date);
          const dayGames = gamesByDate.get(key) ?? [];
          return (
            <button
              className={["calendar-day", day.inMonth ? "" : "muted-day", key === selectedDate ? "selected" : ""].filter(Boolean).join(" ")}
              key={key}
              onClick={() => onSelectDate(key)}
            >
              <span>{day.date.getDate()}</span>
              <div className="calendar-markers">
                {dayGames.slice(0, 2).map((game) => <CalendarGameMarker game={game} key={game.gameId} />)}
                {dayGames.length > 2 && <small>+{dayGames.length - 2}</small>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarGameMarker({ game }: { game: ScheduledGame }) {
  return <span className={`calendar-marker status-${game.status}`}>{game.time} {game.title}</span>;
}

function SelectedDayGames({
  date,
  games,
  invitations,
  rosters,
  profile,
  onRespond,
  onCalendarInvite,
  onStatusChange
}: GameListProps & { date: string }) {
  return (
    <section className="scheduler-card selected-day-games">
      <div className="section-heading">
        <div>
          <h3>{formatDateLong(date)}</h3>
          <p>Games scheduled for the selected day.</p>
        </div>
      </div>
      {games.length === 0 ? (
        <div className="empty-state">No games scheduled for this day.</div>
      ) : (
        <div className="game-card-list">
          {games.map((game) => (
            <GameCard
              game={game}
              invitations={invitations}
              rosters={rosters}
              profile={profile}
              onRespond={onRespond}
              onCalendarInvite={onCalendarInvite}
              onStatusChange={onStatusChange}
              key={game.gameId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

type GameListProps = {
  games: ScheduledGame[];
  invitations: GameInvitation[];
  rosters: Roster[];
  profile?: PlayerProfile;
  onRespond: (gameId: string, status: Exclude<SchedulerInviteStatus, "host">, warbandName?: string) => void;
  onCalendarInvite: (game: ScheduledGame) => void;
  onStatusChange: (gameId: string, status: SchedulerGameStatus) => void;
};

function GameListSection({
  title,
  empty,
  games,
  invitations,
  rosters,
  profile,
  onRespond,
  onCalendarInvite,
  onStatusChange
}: GameListProps & { title: string; empty: string }) {
  return (
    <section className="scheduler-card">
      <div className="section-heading">
        <div>
          <h3>{title}</h3>
          <p>{games.length} shown</p>
        </div>
      </div>
      {games.length === 0 ? (
        <div className="empty-state">{empty}</div>
      ) : (
        <div className="game-card-list">
          {games.map((game) => (
            <GameCard
              game={game}
              invitations={invitations}
              rosters={rosters}
              profile={profile}
              onRespond={onRespond}
              onCalendarInvite={onCalendarInvite}
              onStatusChange={onStatusChange}
              key={game.gameId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function GameCard({
  game,
  invitations,
  rosters,
  profile,
  onRespond,
  onCalendarInvite,
  onStatusChange
}: {
  game: ScheduledGame;
  invitations: GameInvitation[];
  rosters: Roster[];
  profile?: PlayerProfile;
  onRespond: (gameId: string, status: Exclude<SchedulerInviteStatus, "host">, warbandName?: string) => void;
  onCalendarInvite: (game: ScheduledGame) => void;
  onStatusChange: (gameId: string, status: SchedulerGameStatus) => void;
}) {
  const gameInvites = invitationsForGame(game.gameId, invitations);
  const accepted = acceptedPlayerCount(game, invitations);
  const currentInvite = currentPlayerInvite(game.gameId, profile, invitations);
  const isHost = profile?.playerId === game.hostPlayerId;
  const calendarEligible = canCreateCalendarInvite(game, gameInvites);
  const missingEmails = gameInvites.filter((invite) => ["host", "accepted", "invited"].includes(invite.inviteStatus) && !invite.email).length;
  const [selectedWarbandName, setSelectedWarbandName] = useState(currentInvite?.warbandName ?? rosters[0]?.name ?? "");

  useEffect(() => {
    setSelectedWarbandName(currentInvite?.warbandName ?? rosters[0]?.name ?? "");
  }, [currentInvite?.warbandName, rosters]);

  return (
    <article className={`game-card status-${game.status}`}>
      <div className="game-date-tile">
        <span>{parseLocalDate(game.date).toLocaleDateString(undefined, { month: "short" })}</span>
        <strong>{parseLocalDate(game.date).getDate()}</strong>
        <small>{parseLocalDate(game.date).toLocaleDateString(undefined, { weekday: "short" })}</small>
      </div>
      <div className="game-card-body">
        <header>
          <div>
            <h4>{game.title}</h4>
            <p><Clock aria-hidden /> {game.time} for {game.durationMinutes / 60}h</p>
          </div>
          <span className={`status-pill status-${game.status}`}>{game.status}</span>
        </header>
        <div className="game-facts">
          <span>{game.locationType === "nova_games" ? <MapPin aria-hidden /> : <Home aria-hidden />} {game.locationName}</span>
          <span><Users aria-hidden /> {accepted} / {game.maxPlayers} players</span>
          <span>Host: {game.hostName}</span>
        </div>
        <div className="chip-list">
          {gameInvites.map((invite) => (
            <span className={`chip invite-${invite.inviteStatus}`} key={`${invite.gameId}-${invite.playerId}`}>
              {invite.playerName}{invite.warbandName ? ` - ${invite.warbandName}` : ""} {invite.inviteStatus}
            </span>
          ))}
        </div>
        {game.notes && <p className="muted">{game.notes}</p>}
        {game.googleCalendarEventUrl && (
          <a className="source-note" href={game.googleCalendarEventUrl} target="_blank" rel="noreferrer">
            <CalendarDays aria-hidden /> Open Calendar Event
          </a>
        )}
        {missingEmails > 0 && isHost && <p className="muted">{missingEmails} player{missingEmails === 1 ? "" : "s"} do not have email addresses for calendar invites.</p>}
        {currentInvite && currentInvite.inviteStatus !== "host" && (
          <label className="inline-warband-select">
            <span>Warband for RSVP</span>
            <select value={selectedWarbandName} onChange={(event) => setSelectedWarbandName(event.target.value)}>
              <option value="">No warband selected</option>
              {rosters.map((roster) => <option value={roster.name} key={roster.id}>{roster.name}</option>)}
              {currentInvite.warbandName && !rosters.some((roster) => roster.name === currentInvite.warbandName) && (
                <option value={currentInvite.warbandName}>{currentInvite.warbandName}</option>
              )}
            </select>
          </label>
        )}
        <div className="button-row">
          {currentInvite?.inviteStatus === "invited" && (
            <>
              <button className="primary" disabled={accepted >= game.maxPlayers} onClick={() => onRespond(game.gameId, "accepted", selectedWarbandName)}>Accept</button>
              <button onClick={() => onRespond(game.gameId, "maybe", selectedWarbandName)}>Maybe</button>
              <button className="icon-danger" onClick={() => onRespond(game.gameId, "declined")}>Decline</button>
            </>
          )}
          {currentInvite && ["accepted", "maybe"].includes(currentInvite.inviteStatus) && (
            <button onClick={() => onRespond(game.gameId, currentInvite.inviteStatus as Exclude<SchedulerInviteStatus, "host">, selectedWarbandName)}>
              Save Warband
            </button>
          )}
          {isHost && !game.googleCalendarEventId && (
            <button disabled={!calendarEligible} onClick={() => onCalendarInvite(game)}>
              <Mail aria-hidden /> Create Google Calendar Invite
            </button>
          )}
          {isHost && game.status !== "cancelled" && game.status !== "completed" && (
            <>
              <button onClick={() => onStatusChange(game.gameId, "completed")}>Complete</button>
              <button className="icon-danger" onClick={() => onStatusChange(game.gameId, "cancelled")}>Cancel</button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function MetricBox({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function gameMatchesFilter(game: ScheduledGame, filter: ScheduleFilter) {
  if (filter.location !== "all" && game.locationType !== filter.location) return false;
  if (filter.status !== "all" && game.status !== filter.status) return false;
  return true;
}

function canCreateCalendarInvite(game: ScheduledGame, invitations: GameInvitation[]) {
  if (!game.date || !game.time || !game.durationMinutes || !game.locationName) return false;
  if (game.googleCalendarEventId) return false;
  return invitations.some((invite) => ["host", "accepted", "invited"].includes(invite.inviteStatus) && Boolean(invite.email));
}

function compareGames(a: ScheduledGame, b: ScheduledGame) {
  return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
}

function isWithinNextDays(date: string, days: number) {
  const gameDate = parseLocalDate(date).getTime();
  const start = parseLocalDate(todayKey).getTime();
  const end = start + days * 24 * 60 * 60 * 1000;
  return gameDate >= start && gameDate <= end;
}

function calendarMonthDays(month: Date) {
  const first = startOfMonth(month);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, inMonth: date.getMonth() === month.getMonth() };
  });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year || 2000, (month || 1) - 1, day || 1);
}

function formatDateLong(value: string) {
  return parseLocalDate(value).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function errorText(error: unknown) {
  return errorMessage(error);
}
