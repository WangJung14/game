'use strict';

const { randomBytes, randomUUID } = require('crypto');

const ROOM_CODE_CHARACTERS = 'ACDEFGHJKMNPQRTUVWXY';
const ROOM_CODE_LENGTH = 6;
const MAX_PLAYERS = 30;
const ROOM_TTL_MS = 3 * 60 * 60 * 1000;
const REJOIN_WINDOW_MS = 90 * 1000;
const JOINABLE_STATES = new Set(['LOBBY', 'COUNTDOWN', 'QUESTION_ACTIVE', 'QUESTION_LOCKED', 'ROUND_RESULT', 'PAUSED']);

function roomError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function sanitizeDisplayName(value) {
  if (typeof value !== 'string') throw roomError('INVALID_NAME', 'Display name must be a string');
  const displayName = value.trim().replace(/\s+/g, ' ');
  if (displayName.length < 2 || displayName.length > 16) {
    throw roomError('INVALID_NAME', 'Display name must contain 2 to 16 characters');
  }
  return displayName;
}

function createRoomManager(options = {}) {
  const rooms = options.rooms || new Map();
  const now = options.now || Date.now;
  const createId = options.createId || randomUUID;
  const random = options.random || Math.random;
  const roomTtlMs = options.roomTtlMs || ROOM_TTL_MS;
  const rejoinWindowMs = options.rejoinWindowMs || REJOIN_WINDOW_MS;

  function generateRoomCode() {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const bytes = randomBytes(ROOM_CODE_LENGTH);
      let code = '';
      for (const byte of bytes) code += ROOM_CODE_CHARACTERS[byte % ROOM_CODE_CHARACTERS.length];
      if (!rooms.has(code)) return code;
    }
    throw roomError('ROOM_CODE_EXHAUSTED', 'Unable to generate a unique room code');
  }

  function getRoom(roomCode) {
    return rooms.get(String(roomCode || '').toUpperCase()) || null;
  }

  function requireRoom(roomCode) {
    const room = getRoom(roomCode);
    if (!room) throw roomError('ROOM_NOT_FOUND', 'Room not found');
    return room;
  }

  function touch(room) {
    room.lastActivityAt = now();
    room.ttl = room.lastActivityAt + roomTtlMs;
  }

  function createRoom(hostSocketId = null) {
    const createdAt = now();
    const roomId = generateRoomCode();
    const room = {
      roomId, hostSocketId, hostToken: createId(), state: 'LOBBY', players: new Map(),
      teamLeaders: { red: null, blue: null },
      createdAt, lastActivityAt: createdAt, ttl: createdAt + roomTtlMs
    };
    rooms.set(roomId, room);
    return room;
  }

  function uniqueDisplayName(room, requestedName) {
    const baseName = sanitizeDisplayName(requestedName);
    const names = new Set(Array.from(room.players.values(), (player) => player.displayName.toLowerCase()));
    if (!names.has(baseName.toLowerCase())) return baseName;
    let suffix = 2;
    let candidate;
    do {
      const suffixText = ` (${suffix})`;
      candidate = `${baseName.slice(0, 16 - suffixText.length)}${suffixText}`;
      suffix += 1;
    } while (names.has(candidate.toLowerCase()));
    return candidate;
  }

  function connectedTeamCount(room, team) {
    return Array.from(room.players.values()).filter((player) => player.team === team && player.isConnected).length;
  }

  function assignTeamLeader(room, team, force = false) {
    const candidates = Array.from(room.players.values()).filter((player) => player.team === team && player.isConnected);
    const current = room.players.get(room.teamLeaders[team]);
    if (!force && current?.isConnected && current.team === team) return current;
    const selected = candidates.length ? candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))] : null;
    room.teamLeaders[team] = selected?.playerId || null;
    return selected;
  }

  function assignTeamLeaders(roomCode, force = true) {
    const room = requireRoom(roomCode);
    assignTeamLeader(room, 'red', force);
    assignTeamLeader(room, 'blue', force);
    touch(room);
    return room.teamLeaders;
  }

  function joinRoom(roomCode, displayName, socketId = null, currentRoundIndex = -1) {
    const room = requireRoom(roomCode);
    if (room.state === 'FINISHED') throw roomError('ROOM_FINISHED', 'Room has finished');
    if (!JOINABLE_STATES.has(room.state)) throw roomError('INVALID_STATE', 'Room cannot be joined in its current state');
    if (room.players.size >= MAX_PLAYERS) throw roomError('ROOM_FULL', 'Room is full');
    const redCount = connectedTeamCount(room, 'red');
    const blueCount = connectedTeamCount(room, 'blue');
    const player = {
      playerId: createId(), playerToken: createId(), socketId,
      displayName: uniqueDisplayName(room, displayName), team: redCount <= blueCount ? 'red' : 'blue',
      isConnected: true, disconnectedAt: null,
      joinedAtRound: room.state === 'LOBBY' ? 0 : currentRoundIndex + 1,
      xp: 0, answeredQuestions: new Set()
    };
    room.players.set(player.playerId, player);
    assignTeamLeader(room, player.team);
    touch(room);
    return player;
  }

  function leaveRoom(roomCode, playerId) {
    const room = requireRoom(roomCode);
    const player = room.players.get(playerId);
    if (!player) throw roomError('PLAYER_NOT_FOUND', 'Player not found');
    player.socketId = null;
    player.isConnected = false;
    player.disconnectedAt = now();
    if (room.teamLeaders[player.team] === playerId) assignTeamLeader(room, player.team, true);
    touch(room);
    return player;
  }

  function rejoinRoom(roomCode, playerToken, socketId = null) {
    const room = requireRoom(roomCode);
    const player = Array.from(room.players.values()).find((candidate) => candidate.playerToken === playerToken);
    if (!player) throw roomError('TOKEN_INVALID', 'Player token is invalid');
    if (player.isConnected) throw roomError('ALREADY_CONNECTED', 'Player is already connected');
    if (player.disconnectedAt === null || now() - player.disconnectedAt > rejoinWindowMs) {
      room.players.delete(player.playerId);
      throw roomError('REJOIN_EXPIRED', 'Player rejoin window has expired');
    }
    player.socketId = socketId;
    player.isConnected = true;
    player.disconnectedAt = null;
    assignTeamLeader(room, player.team);
    touch(room);
    return player;
  }

  function movePlayer(roomCode, playerId, targetTeam) {
    const room = requireRoom(roomCode);
    if (room.state !== 'LOBBY') throw roomError('INVALID_STATE', 'Players can only change teams in the lobby');
    if (targetTeam !== 'red' && targetTeam !== 'blue') throw roomError('INVALID_TEAM', 'Target team must be red or blue');
    const player = room.players.get(playerId);
    if (!player) throw roomError('PLAYER_NOT_FOUND', 'Player not found');
    const previousTeam = player.team;
    player.team = targetTeam;
    if (room.teamLeaders[previousTeam] === playerId) assignTeamLeader(room, previousTeam, true);
    assignTeamLeader(room, targetTeam);
    touch(room);
    return player;
  }

  function canStart(roomOrCode) {
    const room = typeof roomOrCode === 'string' ? getRoom(roomOrCode) : roomOrCode;
    if (!room || room.state !== 'LOBBY') return false;
    return connectedTeamCount(room, 'red') >= 1 && connectedTeamCount(room, 'blue') >= 1;
  }

  function removeDisconnectedPlayers(roomCode, at = now()) {
    const room = requireRoom(roomCode);
    const removed = [];
    for (const [playerId, player] of room.players) {
      if (!player.isConnected && player.disconnectedAt !== null && at - player.disconnectedAt > rejoinWindowMs) {
        room.players.delete(playerId);
        removed.push(playerId);
      }
    }
    if (removed.length > 0) touch(room);
    return removed;
  }

  function cleanupExpired(at = now()) {
    const removed = [];
    for (const [roomId, room] of rooms) {
      if (at >= room.ttl) {
        rooms.delete(roomId);
        removed.push(roomId);
      }
    }
    return removed;
  }

  function getRoomState(roomCode) {
    const room = requireRoom(roomCode);
    return {
      roomId: room.roomId,
      state: room.state,
      players: Array.from(room.players.values(), (player) => ({
        playerId: player.playerId, displayName: player.displayName, team: player.team,
        isConnected: player.isConnected, xp: player.xp,
        isLeader: room.teamLeaders[player.team] === player.playerId
      })),
      canStart: canStart(room)
    };
  }

  function deleteRoom(roomCode) {
    return rooms.delete(String(roomCode || '').toUpperCase());
  }

  return {
    rooms, createRoom, getRoom, joinRoom, leaveRoom, rejoinRoom, movePlayer, canStart, assignTeamLeaders,
    getRoomState, removeDisconnectedPlayers, cleanupExpired, deleteRoom
  };
}

const defaultManager = createRoomManager();

module.exports = {
  ...defaultManager,
  createRoomManager,
  sanitizeDisplayName,
  constants: { ROOM_CODE_CHARACTERS, ROOM_CODE_LENGTH, MAX_PLAYERS, ROOM_TTL_MS, REJOIN_WINDOW_MS }
};
