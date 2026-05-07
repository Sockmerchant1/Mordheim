export type SchedulerLocationType = "nova_games" | "player_house";
export type SchedulerGameStatus = "draft" | "open" | "scheduled" | "full" | "cancelled" | "completed";
export type SchedulerInviteStatus = "invited" | "accepted" | "declined" | "maybe" | "host";

export type PlayerProfile = {
  playerId: string;
  playerName: string;
  email?: string;
  lastSeenAt?: string;
  sessionToken?: string;
  sessionExpiresAt?: string;
};

export type SchedulerAuthInput = {
  playerName: string;
  email?: string;
  password: string;
};

export type SchedulerLoginInput = {
  playerNameOrEmail: string;
  password: string;
};

export type ScheduledGame = {
  gameId: string;
  campaignId: string;
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  locationType: SchedulerLocationType;
  locationName: string;
  hostPlayerId: string;
  hostName: string;
  maxPlayers: number;
  notes: string;
  status: SchedulerGameStatus;
  googleCalendarEventId?: string;
  googleCalendarEventUrl?: string;
  googleCalendarInviteCreatedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type GameInvitation = {
  gameId: string;
  playerId: string;
  playerName: string;
  email?: string;
  warbandName?: string;
  inviteStatus: SchedulerInviteStatus;
  respondedAt?: string;
};

export type SchedulerSnapshot = {
  games: ScheduledGame[];
  invitations: GameInvitation[];
  players: PlayerProfile[];
  backend: "google-sheet" | "local";
  warning?: string;
};

export type CreateGameInput = {
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  locationType: SchedulerLocationType;
  locationName: string;
  maxPlayers: number;
  notes: string;
  invitedPlayers: Array<{
    playerId?: string;
    playerName: string;
    email?: string;
    warbandName?: string;
  }>;
};
