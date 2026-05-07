import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
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
import type { Roster } from "../rules/types";
import {
  acceptedPlayerCount,
  createGame,
  createGoogleCalendarInvite,
  currentPlayerInvite,
  invitationsForGame,
  isSchedulerAuthenticated,
  listSchedule,
  loginPlayer,
  logoutPlayer,
  readPlayerProfile,
  registerPlayer,
  respondToInvite,
  schedulerConfig,
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
  SchedulerLoginInput,
  SchedulerSnapshot,
  SchedulerAuthInput
} from "./types";

type ScheduleFilter = {
  location: "all" | SchedulerLocationType;
  status: "all" | SchedulerGameStatus;
};

const todayKey = dateKey(new Date());

export function GameSchedulerPage({
  rosters,
  onWarbands,
  onCampaign,
  onCreateWarband
}: {
  rosters: Roster[];
  onWarbands: () => void;
  onCampaign: () => void;
  onCreateWarband: () => void;
}) {
  const [profile, setProfile] = useState<PlayerProfile | undefined>(() => readPlayerProfile());
  const [snapshot, setSnapshot] = useState<SchedulerSnapshot>({ games: [], invitations: [], players: [], backend: "local" });
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [monthCursor, setMonthCursor] = useState(startOfMonth(new Date()));
  const [filter, setFilter] = useState<ScheduleFilter>({ location: "all", status: "all" });
  const [showCreate, setShowCreate] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const authenticated = isSchedulerAuthenticated(profile);

  useEffect(() => {
    if (authenticated) {
      void refreshSchedule();
    } else {
      setLoading(false);
    }
  }, [authenticated]);

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

  async function handleRegister(input: SchedulerAuthInput) {
    setError("");
    setMessage("Creating player login...");
    try {
      const updated = await registerPlayer(input);
      setProfile(updated);
      setMessage("Player login created.");
    } catch (authError) {
      setError(errorText(authError) || "Could not create player login.");
    }
  }

  async function handleLogin(input: SchedulerLoginInput) {
    setError("");
    setMessage("Logging in...");
    try {
      const updated = await loginPlayer(input);
      setProfile(updated);
      setMessage("Logged in.");
    } catch (authError) {
      setError(errorText(authError) || "Could not log in.");
    }
  }

  function handleLogout() {
    logoutPlayer();
    setProfile(undefined);
    setSnapshot({ games: [], invitations: [], players: [], backend: schedulerConfig.appsScriptUrl ? "google-sheet" : "local" });
    setMessage("Logged out.");
  }

  async function handleCreateGame(input: CreateGameInput) {
    if (!authenticated || !profile) {
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

  async function handleInviteResponse(gameId: string, status: Exclude<SchedulerInviteStatus, "host">) {
    if (!authenticated || !profile) {
      setError("Log in before responding to invitations.");
      return;
    }
    setError("");
    setMessage("Updating invitation...");
    try {
      setSnapshot(await respondToInvite(gameId, profile, status));
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
            <Plus aria-hidden /> Create Game
          </button>
        </div>
      </div>

      {message && <div className="status-banner info">{message}</div>}
      {error && <div className="status-banner error"><AlertTriangle aria-hidden /> {error}</div>}
      {loading && <div className="empty-state">Loading schedule...</div>}

      <PlayerAuthPanel
        profile={profile}
        authenticated={authenticated}
        onRegister={handleRegister}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <div className="metric-grid scheduler-metrics">
        <MetricBox icon={<CalendarDays aria-hidden />} label="Upcoming games" value={upcomingGames.length.toString()} />
        <MetricBox icon={<Mail aria-hidden />} label="Open invitations" value={pendingInvitations.length.toString()} />
        <MetricBox icon={<MapPin aria-hidden />} label="Locations" value={locationCount.toString()} />
        <MetricBox icon={<Clock aria-hidden />} label="This week" value={thisWeekCount.toString()} />
      </div>

      {showCreate && (
        <GameCreateForm
          disabled={!authenticated}
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
          profile={profile}
          onRespond={handleInviteResponse}
          onCalendarInvite={handleCalendarInvite}
          onStatusChange={handleStatusChange}
        />
      </div>

      {!authenticated && (
        <div className="status-banner warning">
          <AlertTriangle aria-hidden /> Log in before accepting invitations or creating games.
        </div>
      )}
      <p className="muted scheduler-footnote">
        Shared sheet: {schedulerConfig.googleSheetId}. Backend: {snapshot.backend === "google-sheet" ? "Google Sheet via Apps Script" : "local fallback"}.
      </p>
    </section>
  );
}

function PlayerAuthPanel({
  profile,
  authenticated,
  onRegister,
  onLogin,
  onLogout
}: {
  profile?: PlayerProfile;
  authenticated: boolean;
  onRegister: (input: SchedulerAuthInput) => void;
  onLogin: (input: SchedulerLoginInput) => void;
  onLogout: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginName, setLoginName] = useState(profile?.email || profile?.playerName || "");
  const [loginPassword, setLoginPassword] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <section className="scheduler-card profile-card">
      <div className="section-heading">
        <div>
          <h3>Player Login</h3>
          <p>{authenticated ? "You are signed in for shared campaign scheduling." : "Sign in before creating games or responding to invitations."}</p>
        </div>
        {authenticated && <span className="pill">Signed in</span>}
      </div>
      {authenticated && profile ? (
        <div className="auth-summary">
          <div>
            <strong>{profile.playerName}</strong>
            <p className="muted">{profile.email || "No email saved"}</p>
          </div>
          <button onClick={onLogout}>Log out</button>
        </div>
      ) : (
        <>
          <div className="segmented-control" role="group" aria-label="Login mode">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Log in</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
          </div>
          {mode === "login" ? (
            <div className="form-grid compact-form">
              <label>
                <span>Player name or email</span>
                <input value={loginName} onChange={(event) => setLoginName(event.target.value)} placeholder="Paul" />
              </label>
              <label>
                <span>Password</span>
                <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} />
              </label>
              <button className="primary" disabled={!loginName.trim() || !loginPassword} onClick={() => onLogin({ playerNameOrEmail: loginName, password: loginPassword })}>
                <CheckCircle2 aria-hidden /> Log in
              </button>
            </div>
          ) : (
            <div className="form-grid compact-form">
              <label>
                <span>Player name</span>
                <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Paul" />
              </label>
              <label>
                <span>Email, optional</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
              </label>
              <label>
                <span>Password</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              <button className="primary" disabled={!playerName.trim() || password.length < 6} onClick={() => onRegister({ playerName, email, password })}>
                <CheckCircle2 aria-hidden /> Register
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
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
        onClick={() => onCreate({ title, date, time, durationMinutes, locationType, locationName, maxPlayers, notes, invitedPlayers })}
      >
        <Swords aria-hidden /> Schedule Game
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
  profile?: PlayerProfile;
  onRespond: (gameId: string, status: Exclude<SchedulerInviteStatus, "host">) => void;
  onCalendarInvite: (game: ScheduledGame) => void;
  onStatusChange: (gameId: string, status: SchedulerGameStatus) => void;
};

function GameListSection({
  title,
  empty,
  games,
  invitations,
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
  profile,
  onRespond,
  onCalendarInvite,
  onStatusChange
}: {
  game: ScheduledGame;
  invitations: GameInvitation[];
  profile?: PlayerProfile;
  onRespond: (gameId: string, status: Exclude<SchedulerInviteStatus, "host">) => void;
  onCalendarInvite: (game: ScheduledGame) => void;
  onStatusChange: (gameId: string, status: SchedulerGameStatus) => void;
}) {
  const gameInvites = invitationsForGame(game.gameId, invitations);
  const accepted = acceptedPlayerCount(game, invitations);
  const currentInvite = currentPlayerInvite(game.gameId, profile, invitations);
  const isHost = profile?.playerId === game.hostPlayerId;
  const calendarEligible = canCreateCalendarInvite(game, gameInvites);
  const missingEmails = gameInvites.filter((invite) => ["host", "accepted", "invited"].includes(invite.inviteStatus) && !invite.email).length;

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
              {invite.playerName} {invite.inviteStatus}
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
        <div className="button-row">
          {currentInvite?.inviteStatus === "invited" && (
            <>
              <button className="primary" disabled={accepted >= game.maxPlayers} onClick={() => onRespond(game.gameId, "accepted")}>Accept</button>
              <button onClick={() => onRespond(game.gameId, "maybe")}>Maybe</button>
              <button className="icon-danger" onClick={() => onRespond(game.gameId, "declined")}>Decline</button>
            </>
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
  return error instanceof Error ? error.message : String(error);
}
