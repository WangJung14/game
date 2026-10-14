'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { io: createClient } = require('socket.io-client');
const { createLexiServer } = require('../index');

function waitFor(socket, event, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    function handler(payload) {
      clearTimeout(timeout);
      resolve(payload);
    }
    socket.once(event, handler);
  });
}

async function emitAndWait(socket, emitEvent, payload, responseEvent) {
  const response = waitFor(socket, responseEvent);
  socket.emit(emitEvent, payload);
  return response;
}

describe('Socket.IO lobby integration', () => {
  let server;
  let url;
  let clients;

  beforeEach(async () => {
    server = createLexiServer();
    const address = await server.listen(0);
    url = `http://127.0.0.1:${address.port}`;
    clients = [];
  });

  afterEach(async () => {
    for (const client of clients) client.disconnect();
    await server.close();
  });

  async function connect() {
    const client = createClient(url, { transports: ['websocket'], forceNew: true });
    clients.push(client);
    await waitFor(client, 'connect');
    return client;
  }

  async function createRoom(host) {
    return emitAndWait(host, 'room:create', {}, 'room:created');
  }

  test('host creates a room with a six-character code and token', async () => {
    const host = await connect();
    const created = await createRoom(host);
    assert.match(created.roomCode, /^[ACDEFGHJKMNPQRTUVWXY]{6}$/);
    assert.equal(typeof created.hostToken, 'string');
  });

  test('two players join balanced teams and everyone receives lobby updates', async () => {
    const host = await connect();
    const first = await connect();
    const second = await connect();
    const { roomCode } = await createRoom(host);

    const hostUpdateOne = waitFor(host, 'lobby:update');
    const firstJoined = await emitAndWait(first, 'room:join', { roomCode, displayName: 'Minh' }, 'room:joined');
    const firstLobby = await hostUpdateOne;
    assert.equal(firstJoined.team, 'red');
    assert.equal(firstLobby.players.length, 1);

    const hostUpdateTwo = waitFor(host, 'lobby:update');
    const firstUpdateTwo = waitFor(first, 'lobby:update');
    const secondJoined = await emitAndWait(second, 'room:join', { roomCode, displayName: 'Lan' }, 'room:joined');
    const [hostLobby, firstLobbyAfterJoin] = await Promise.all([hostUpdateTwo, firstUpdateTwo]);
    assert.equal(secondJoined.team, 'blue');
    assert.equal(hostLobby.canStart, true);
    assert.equal(firstLobbyAfterJoin.players.length, 2);
  });

  test('host moves a player and all clients receive the changed team', async () => {
    const host = await connect();
    const player = await connect();
    const { roomCode } = await createRoom(host);
    const joined = await emitAndWait(player, 'room:join', { roomCode, displayName: 'Minh' }, 'room:joined');
    await waitFor(host, 'lobby:update');

    const hostUpdate = waitFor(host, 'lobby:update');
    const playerUpdate = waitFor(player, 'lobby:update');
    host.emit('lobby:movePlayer', { playerId: joined.playerId, targetTeam: 'blue' });
    const [hostLobby, playerLobby] = await Promise.all([hostUpdate, playerUpdate]);
    assert.equal(hostLobby.players[0].team, 'blue');
    assert.equal(playerLobby.players[0].team, 'blue');
  });

  test('non-host cannot move a player', async () => {
    const host = await connect();
    const player = await connect();
    const { roomCode } = await createRoom(host);
    const joined = await emitAndWait(player, 'room:join', { roomCode, displayName: 'Minh' }, 'room:joined');
    const error = await emitAndWait(player, 'lobby:movePlayer', { playerId: joined.playerId, targetTeam: 'blue' }, 'error:notice');
    assert.equal(error.code, 'NOT_HOST');
  });

  test('invalid room join returns a scoped error', async () => {
    const player = await connect();
    const error = await emitAndWait(player, 'room:join', { roomCode: 'AAAAAA', displayName: 'Minh' }, 'error:notice');
    assert.equal(error.code, 'ROOM_NOT_FOUND');
  });

  test('disconnected player can rejoin with the same identity', async () => {
    const host = await connect();
    const player = await connect();
    const { roomCode } = await createRoom(host);
    const joined = await emitAndWait(player, 'room:join', { roomCode, displayName: 'Minh' }, 'room:joined');
    await waitFor(host, 'lobby:update');
    const offlineUpdate = waitFor(host, 'lobby:update');
    player.disconnect();
    await offlineUpdate;

    const rejoinedClient = await connect();
    const syncPromise = waitFor(rejoinedClient, 'state:sync');
    const rejoined = await emitAndWait(rejoinedClient, 'room:rejoin', { roomCode, playerToken: joined.playerToken }, 'room:joined');
    const snapshot = await syncPromise;
    assert.equal(rejoined.playerId, joined.playerId);
    assert.equal(rejoined.rejoined, true);
    assert.equal(snapshot.players[0].isConnected, true);
  });
});
