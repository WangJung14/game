'use strict';

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const roomManagerModule = require('./roomManager');

const DEFAULT_PORT = process.env.PORT || 3000;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

function errorPayload(error) {
  return { code: error.code || 'INTERNAL_ERROR', message: error.code ? error.message : 'Unexpected server error' };
}

function createLexiServer(options = {}) {
  const roomManager = options.roomManager || roomManagerModule.createRoomManager();
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });

  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.get('/ping', (_request, response) => response.json({ ok: true }));

  function emitLobby(roomCode) {
    const state = roomManager.getRoomState(roomCode);
    io.to(roomCode).emit('lobby:update', { players: state.players, canStart: state.canStart });
  }

  io.on('connection', (socket) => {
    socket.on('room:create', () => {
      try {
        const room = roomManager.createRoom(socket.id);
        socket.join(room.roomId);
        socket.data = { role: 'host', roomCode: room.roomId };
        socket.emit('room:created', { roomCode: room.roomId, hostToken: room.hostToken });
      } catch (error) {
        socket.emit('error:notice', errorPayload(error));
      }
    });

    socket.on('room:join', (payload = {}) => {
      try {
        const roomCode = String(payload.roomCode || '').trim().toUpperCase();
        const player = roomManager.joinRoom(roomCode, payload.displayName, socket.id);
        socket.join(roomCode);
        socket.data = { role: 'player', roomCode, playerId: player.playerId };
        socket.emit('room:joined', {
          roomCode,
          playerId: player.playerId,
          playerToken: player.playerToken,
          team: player.team,
          displayName: player.displayName
        });
        emitLobby(roomCode);
      } catch (error) {
        socket.emit('error:notice', errorPayload(error));
      }
    });

    socket.on('room:rejoin', (payload = {}) => {
      try {
        const roomCode = String(payload.roomCode || '').trim().toUpperCase();
        const player = roomManager.rejoinRoom(roomCode, payload.playerToken, socket.id);
        socket.join(roomCode);
        socket.data = { role: 'player', roomCode, playerId: player.playerId };
        socket.emit('room:joined', {
          roomCode,
          playerId: player.playerId,
          playerToken: player.playerToken,
          team: player.team,
          displayName: player.displayName,
          rejoined: true
        });
        socket.emit('state:sync', roomManager.getRoomState(roomCode));
        emitLobby(roomCode);
      } catch (error) {
        socket.emit('error:notice', errorPayload(error));
      }
    });

    socket.on('lobby:movePlayer', (payload = {}) => {
      try {
        const { role, roomCode } = socket.data || {};
        const room = roomManager.getRoom(roomCode);
        if (role !== 'host' || !room || room.hostSocketId !== socket.id) {
          const error = new Error('Only the host can move players');
          error.code = 'NOT_HOST';
          throw error;
        }
        roomManager.movePlayer(roomCode, payload.playerId, payload.targetTeam);
        emitLobby(roomCode);
      } catch (error) {
        socket.emit('error:notice', errorPayload(error));
      }
    });

    socket.on('disconnect', () => {
      const { role, roomCode, playerId } = socket.data || {};
      if (role !== 'player' || !roomCode || !playerId || !roomManager.getRoom(roomCode)) return;
      try {
        roomManager.leaveRoom(roomCode, playerId);
        emitLobby(roomCode);
      } catch (_error) {
        return;
      }
    });
  });

  const cleanupTimer = setInterval(() => {
    for (const roomCode of roomManager.rooms.keys()) roomManager.removeDisconnectedPlayers(roomCode);
    roomManager.cleanupExpired();
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();

  function listen(port = DEFAULT_PORT) {
    return new Promise((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(port, () => {
        httpServer.off('error', reject);
        resolve(httpServer.address());
      });
    });
  }

  function close() {
    clearInterval(cleanupTimer);
    return new Promise((resolve) => io.close(resolve));
  }

  return { app, httpServer, io, roomManager, listen, close };
}

if (require.main === module) {
  const server = createLexiServer();
  server.listen(DEFAULT_PORT).then(() => {
    console.log(`Lexi Clash server listening on http://localhost:${DEFAULT_PORT}`);
  });
}

module.exports = { createLexiServer };
