'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createRoomManager, constants } = require('../roomManager');

function setup() {
  let timestamp = 1000;
  let sequence = 0;
  const manager = createRoomManager({
    now: () => timestamp,
    createId: () => `id-${sequence += 1}`
  });
  return { manager, advance: (milliseconds) => { timestamp += milliseconds; } };
}

describe('roomManager', () => {
  test('creates unique six-character room codes from the safe alphabet', () => {
    const { manager } = setup();
    const first = manager.createRoom('host-1');
    const second = manager.createRoom('host-2');
    assert.notEqual(first.roomId, second.roomId);
    assert.match(first.roomId, new RegExp(`^[${constants.ROOM_CODE_CHARACTERS}]{6}$`));
  });

  test('assigns consecutive players to balanced teams', () => {
    const { manager } = setup();
    const room = manager.createRoom();
    assert.equal(manager.joinRoom(room.roomId, 'Minh').team, 'red');
    assert.equal(manager.joinRoom(room.roomId, 'Lan').team, 'blue');
    assert.equal(manager.joinRoom(room.roomId, 'An').team, 'red');
  });

  test('adds suffixes to duplicate display names', () => {
    const { manager } = setup();
    const room = manager.createRoom();
    manager.joinRoom(room.roomId, 'Minh');
    assert.equal(manager.joinRoom(room.roomId, ' Minh ').displayName, 'Minh (2)');
  });

  test('keeps a suffixed duplicate name within sixteen characters', () => {
    const { manager } = setup();
    const room = manager.createRoom();
    manager.joinRoom(room.roomId, 'SixteenCharName!');
    assert.equal(manager.joinRoom(room.roomId, 'SixteenCharName!').displayName.length, 16);
  });

  test('rejects invalid names and unknown rooms', () => {
    const { manager } = setup();
    const room = manager.createRoom();
    assert.throws(() => manager.joinRoom(room.roomId, 'A'), { code: 'INVALID_NAME' });
    assert.throws(() => manager.joinRoom('AAAAAA', 'Minh'), { code: 'ROOM_NOT_FOUND' });
  });

  test('rejects the thirty-first player', () => {
    const { manager } = setup();
    const room = manager.createRoom();
    for (let index = 0; index < constants.MAX_PLAYERS; index += 1) {
      manager.joinRoom(room.roomId, `P${String(index).padStart(2, '0')}`);
    }
    assert.throws(() => manager.joinRoom(room.roomId, 'Extra'), { code: 'ROOM_FULL' });
  });

  test('moves players only while in the lobby', () => {
    const { manager } = setup();
    const room = manager.createRoom();
    const player = manager.joinRoom(room.roomId, 'Minh');
    assert.equal(manager.movePlayer(room.roomId, player.playerId, 'blue').team, 'blue');
    room.state = 'QUESTION_ACTIVE';
    assert.throws(() => manager.movePlayer(room.roomId, player.playerId, 'red'), { code: 'INVALID_STATE' });
  });

  test('requires one connected player on each team to start', () => {
    const { manager } = setup();
    const room = manager.createRoom();
    assert.equal(manager.canStart(room), false);
    manager.joinRoom(room.roomId, 'Minh');
    assert.equal(manager.canStart(room), false);
    manager.joinRoom(room.roomId, 'Lan');
    assert.equal(manager.canStart(room), true);
  });

  test('rejoins a disconnected player within ninety seconds', () => {
    const { manager, advance } = setup();
    const room = manager.createRoom();
    const player = manager.joinRoom(room.roomId, 'Minh', 'socket-1');
    manager.leaveRoom(room.roomId, player.playerId);
    advance(constants.REJOIN_WINDOW_MS);
    const rejoined = manager.rejoinRoom(room.roomId, player.playerToken, 'socket-2');
    assert.equal(rejoined.socketId, 'socket-2');
    assert.equal(rejoined.isConnected, true);
  });

  test('expires a disconnected player after ninety seconds', () => {
    const { manager, advance } = setup();
    const room = manager.createRoom();
    const player = manager.joinRoom(room.roomId, 'Minh');
    manager.leaveRoom(room.roomId, player.playerId);
    advance(constants.REJOIN_WINDOW_MS + 1);
    assert.throws(() => manager.rejoinRoom(room.roomId, player.playerToken), { code: 'REJOIN_EXPIRED' });
  });

  test('removes rooms whose inactivity TTL elapsed', () => {
    const { manager, advance } = setup();
    const room = manager.createRoom();
    advance(constants.ROOM_TTL_MS);
    assert.deepEqual(manager.cleanupExpired(), [room.roomId]);
    assert.equal(manager.getRoom(room.roomId), null);
  });

  test('returns a public room snapshot without tokens', () => {
    const { manager } = setup();
    const room = manager.createRoom();
    manager.joinRoom(room.roomId, 'Minh');
    manager.joinRoom(room.roomId, 'Lan');
    const state = manager.getRoomState(room.roomId);
    assert.equal(state.players.length, 2);
    assert.equal(state.canStart, true);
    assert.equal(state.players[0].playerToken, undefined);
  });
});
