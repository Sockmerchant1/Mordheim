/**
 * Mordheim Campaign Helper scheduler backend.
 *
 * Copy this file into a Google Apps Script project attached to, or allowed to
 * access, the shared scheduler sheet:
 * https://docs.google.com/spreadsheets/d/1n2hA3dIFmkJ_gha16WkRD0hqNC5Zt9tmiUHwuJsVCkE/edit
 *
 * Deploy as a Web App and set VITE_SCHEDULER_APPS_SCRIPT_URL to the deployed URL.
 */

const SPREADSHEET_ID = "1n2hA3dIFmkJ_gha16WkRD0hqNC5Zt9tmiUHwuJsVCkE";
const GAMES_COLUMNS = [
  "gameId",
  "campaignId",
  "title",
  "date",
  "time",
  "durationMinutes",
  "locationType",
  "locationName",
  "hostPlayerId",
  "hostName",
  "maxPlayers",
  "notes",
  "status",
  "googleCalendarEventId",
  "googleCalendarEventUrl",
  "googleCalendarInviteCreatedAt",
  "createdAt",
  "updatedAt"
];
const INVITATION_COLUMNS = [
  "gameId",
  "playerId",
  "playerName",
  "email",
  "warbandName",
  "inviteStatus",
  "respondedAt"
];
const AUTH_REQUIRED = true;
const SESSION_DAYS = 14;
const PLAYER_COLUMNS = [
  "playerId",
  "playerName",
  "email",
  "lastSeenAt",
  "passwordSalt",
  "passwordHash",
  "sessionTokenHash",
  "sessionExpiresAt",
  "createdAt"
];

function doPost(event) {
  try {
    const request = JSON.parse(event.postData.contents || "{}");
    const action = request.action;
    ensureSheets();
    if (action === "registerPlayer") return jsonResponse({ ok: true, data: registerPlayer_(request) });
    if (action === "loginPlayer") return jsonResponse({ ok: true, data: loginPlayer_(request) });
    if (AUTH_REQUIRED) requireSession_(request);
    if (action === "listGames") return jsonResponse({ ok: true, data: snapshot(request.campaignId) });
    if (action === "upsertPlayer") {
      updatePublicPlayer_(request.player);
      return jsonResponse({ ok: true, data: snapshot(request.campaignId) });
    }
    if (action === "createGame") {
      upsertRow_("Games", GAMES_COLUMNS, "gameId", request.game);
      (request.invitations || []).forEach((invite) => upsertInvitation_(invite));
      if (request.host) upsertRow_("Players", PLAYER_COLUMNS, "playerId", request.host);
      return jsonResponse({ ok: true, data: snapshot(request.campaignId) });
    }
    if (action === "respondToInvite") {
      respondToInvite_(request.gameId, request.playerId, request.inviteStatus);
      refreshGameStatus_(request.gameId);
      return jsonResponse({ ok: true, data: snapshot(request.campaignId) });
    }
    if (action === "updateGame") {
      const games = readRows_("Games", GAMES_COLUMNS);
      const game = games.find((entry) => entry.gameId === request.gameId);
      if (!game) throw new Error("Game not found.");
      upsertRow_("Games", GAMES_COLUMNS, "gameId", Object.assign({}, game, request.patch || {}, { updatedAt: new Date().toISOString() }));
      return jsonResponse({ ok: true, data: snapshot(request.campaignId) });
    }
    if (action === "cancelGame") {
      const games = readRows_("Games", GAMES_COLUMNS);
      const game = games.find((entry) => entry.gameId === request.gameId);
      if (!game) throw new Error("Game not found.");
      upsertRow_("Games", GAMES_COLUMNS, "gameId", Object.assign({}, game, { status: "cancelled", updatedAt: new Date().toISOString() }));
      return jsonResponse({ ok: true, data: snapshot(request.campaignId) });
    }
    if (action === "createGoogleCalendarInvite") {
      createGoogleCalendarInvite_(request.gameId, request.googleCalendarId);
      return jsonResponse({ ok: true, data: snapshot(request.campaignId) });
    }
    throw new Error("Unknown scheduler action: " + action);
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function snapshot(campaignId) {
  const games = readRows_("Games", GAMES_COLUMNS).filter((game) => !campaignId || game.campaignId === campaignId);
  const gameIds = new Set(games.map((game) => game.gameId));
  return {
    games,
    invitations: readRows_("Invitations", INVITATION_COLUMNS).filter((invite) => gameIds.has(invite.gameId)),
    players: readRows_("Players", PLAYER_COLUMNS).map(publicPlayer_),
    backend: "google-sheet"
  };
}

function registerPlayer_(request) {
  const playerName = String(request.playerName || "").trim();
  const email = String(request.email || "").trim();
  const password = String(request.password || "");
  if (!playerName) throw new Error("Player name is required.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  const players = readRows_("Players", PLAYER_COLUMNS);
  const duplicate = players.find((player) =>
    normalise_(player.playerName) === normalise_(playerName) ||
    (email && normalise_(player.email) === normalise_(email))
  );
  if (duplicate) throw new Error("That player name or email is already registered.");
  const now = new Date().toISOString();
  const salt = Utilities.getUuid();
  const session = createSession_();
  const player = {
    playerId: "player-" + Utilities.getUuid(),
    playerName,
    email,
    lastSeenAt: now,
    passwordSalt: salt,
    passwordHash: hashValue_(salt + password),
    sessionTokenHash: hashValue_(session.token),
    sessionExpiresAt: session.expiresAt,
    createdAt: now
  };
  upsertRow_("Players", PLAYER_COLUMNS, "playerId", player);
  return Object.assign(publicPlayer_(player), { sessionToken: session.token, sessionExpiresAt: session.expiresAt });
}

function loginPlayer_(request) {
  const login = normalise_(request.playerNameOrEmail || "");
  const password = String(request.password || "");
  if (!login || !password) throw new Error("Player name/email and password are required.");
  const players = readRows_("Players", PLAYER_COLUMNS);
  const player = players.find((entry) => normalise_(entry.playerName) === login || normalise_(entry.email) === login);
  if (!player || !player.passwordSalt || !player.passwordHash) throw new Error("Incorrect player name/email or password.");
  if (hashValue_(player.passwordSalt + password) !== player.passwordHash) throw new Error("Incorrect player name/email or password.");
  const session = createSession_();
  const updated = Object.assign({}, player, {
    sessionTokenHash: hashValue_(session.token),
    sessionExpiresAt: session.expiresAt,
    lastSeenAt: new Date().toISOString()
  });
  upsertRow_("Players", PLAYER_COLUMNS, "playerId", updated);
  return Object.assign(publicPlayer_(updated), { sessionToken: session.token, sessionExpiresAt: session.expiresAt });
}

function requireSession_(request) {
  const auth = request.auth || {};
  if (!auth.playerId || !auth.sessionToken) throw new Error("Login required.");
  const player = readRows_("Players", PLAYER_COLUMNS).find((entry) => entry.playerId === auth.playerId);
  if (!player || !player.sessionTokenHash || hashValue_(auth.sessionToken) !== player.sessionTokenHash) throw new Error("Login required.");
  if (!player.sessionExpiresAt || new Date(player.sessionExpiresAt).getTime() < Date.now()) throw new Error("Session expired. Log in again.");
  return player;
}

function createSession_() {
  const token = Utilities.getUuid() + Utilities.getUuid();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return { token, expiresAt };
}

function publicPlayer_(player) {
  return {
    playerId: player.playerId,
    playerName: player.playerName,
    email: player.email || "",
    lastSeenAt: player.lastSeenAt || "",
    sessionExpiresAt: player.sessionExpiresAt || ""
  };
}

function updatePublicPlayer_(player) {
  if (!player || !player.playerId) throw new Error("Player not found.");
  const existing = readRows_("Players", PLAYER_COLUMNS).find((entry) => entry.playerId === player.playerId);
  if (!existing) throw new Error("Player not found.");
  upsertRow_("Players", PLAYER_COLUMNS, "playerId", Object.assign({}, existing, {
    playerName: player.playerName || existing.playerName,
    email: player.email || existing.email,
    lastSeenAt: new Date().toISOString()
  }));
}

function createGoogleCalendarInvite_(gameId, googleCalendarId) {
  const games = readRows_("Games", GAMES_COLUMNS);
  const game = games.find((entry) => entry.gameId === gameId);
  if (!game) throw new Error("Game not found.");
  if (game.googleCalendarEventId) throw new Error("Calendar invite already exists for this game.");
  const invitations = readRows_("Invitations", INVITATION_COLUMNS).filter((invite) => invite.gameId === gameId);
  const guests = invitations
    .filter((invite) => ["host", "accepted", "invited"].includes(invite.inviteStatus) && invite.email)
    .map((invite) => invite.email);
  if (!guests.length) throw new Error("No invitee email addresses found.");

  const start = new Date(game.date + "T" + game.time + ":00");
  const end = new Date(start.getTime() + Number(game.durationMinutes || 180) * 60 * 1000);
  const calendar = googleCalendarId ? CalendarApp.getCalendarById(googleCalendarId) : CalendarApp.getDefaultCalendar();
  if (!calendar) throw new Error("Could not open Google Calendar.");
  const event = calendar.createEvent(game.title, start, end, {
    location: game.locationName,
    description: [
      "Mordheim campaign game",
      "Host: " + game.hostName,
      game.notes || "",
      "Players: " + invitations.map((invite) => invite.playerName + " (" + invite.inviteStatus + ")").join(", ")
    ].filter(Boolean).join("\n"),
    guests: guests.join(","),
    sendInvites: true
  });
  const now = new Date().toISOString();
  upsertRow_("Games", GAMES_COLUMNS, "gameId", Object.assign({}, game, {
    googleCalendarEventId: event.getId(),
    googleCalendarEventUrl: "https://calendar.google.com/calendar/u/0/r",
    googleCalendarInviteCreatedAt: now,
    updatedAt: now
  }));
}

function respondToInvite_(gameId, playerId, inviteStatus) {
  const invitations = readRows_("Invitations", INVITATION_COLUMNS);
  const invitation = invitations.find((entry) => entry.gameId === gameId && entry.playerId === playerId);
  if (!invitation) throw new Error("Invitation not found.");
  if (inviteStatus === "accepted") {
    const game = readRows_("Games", GAMES_COLUMNS).find((entry) => entry.gameId === gameId);
    const accepted = invitations.filter((entry) => entry.gameId === gameId && ["host", "accepted"].includes(entry.inviteStatus)).length;
    if (game && accepted >= Number(game.maxPlayers) && invitation.inviteStatus !== "accepted") throw new Error("This game is already full.");
  }
  upsertInvitation_(Object.assign({}, invitation, { inviteStatus, respondedAt: new Date().toISOString() }));
}

function refreshGameStatus_(gameId) {
  const games = readRows_("Games", GAMES_COLUMNS);
  const game = games.find((entry) => entry.gameId === gameId);
  if (!game || ["cancelled", "completed"].includes(game.status)) return;
  const invitations = readRows_("Invitations", INVITATION_COLUMNS).filter((entry) => entry.gameId === gameId);
  const accepted = invitations.filter((entry) => ["host", "accepted"].includes(entry.inviteStatus)).length;
  const status = accepted >= Number(game.maxPlayers) ? "full" : accepted >= 2 ? "scheduled" : "open";
  upsertRow_("Games", GAMES_COLUMNS, "gameId", Object.assign({}, game, { status, updatedAt: new Date().toISOString() }));
}

function upsertInvitation_(invitation) {
  const rows = readRows_("Invitations", INVITATION_COLUMNS);
  const index = rows.findIndex((entry) => entry.gameId === invitation.gameId && entry.playerId === invitation.playerId);
  const sheet = sheet_("Invitations", INVITATION_COLUMNS);
  const values = INVITATION_COLUMNS.map((column) => invitation[column] || "");
  if (index >= 0) {
    sheet.getRange(index + 2, 1, 1, INVITATION_COLUMNS.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }
}

function upsertRow_(sheetName, columns, idColumn, row) {
  const rows = readRows_(sheetName, columns);
  const index = rows.findIndex((entry) => entry[idColumn] === row[idColumn]);
  const sheet = sheet_(sheetName, columns);
  const values = columns.map((column) => row[column] || "");
  if (index >= 0) {
    sheet.getRange(index + 2, 1, 1, columns.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }
}

function readRows_(sheetName, columns) {
  const sheet = sheet_(sheetName, columns);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  return values.slice(1).filter((row) => row.some(Boolean)).map((row) => {
    const entry = {};
    columns.forEach((column, index) => {
      entry[column] = row[index] === undefined ? "" : row[index];
    });
    return entry;
  });
}

function ensureSheets() {
  sheet_("Games", GAMES_COLUMNS);
  sheet_("Invitations", INVITATION_COLUMNS);
  sheet_("Players", PLAYER_COLUMNS);
}

function sheet_(name, columns) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  const firstRow = sheet.getRange(1, 1, 1, columns.length).getValues()[0];
  if (firstRow.join("") === "" || columns.some((column, index) => firstRow[index] !== column)) {
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
  }
  return sheet;
}

function hashValue_(value) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return Utilities.base64Encode(digest);
}

function normalise_(value) {
  return String(value || "").trim().toLowerCase();
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
