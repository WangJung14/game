'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createRoomManager } = require('../roomManager');
const { createGameManager, STATES, constants } = require('../gameManager');

const questions = [
  {
    id: 'q1', type: 'multiple_choice', prompt: 'Pick B', options: [{ id: 'A', text: 'A' }, { id: 'B', text: 'B' }],
    correctAnswer: 'B', acceptedAnswers: ['B'], explanation: 'B is correct', timeLimitSec: 20, isBossRound: false
  },
  {
    id: 'q2', type: 'word_forge', prompt: 'Type library', correctAnswer: 'library', acceptedAnswers: ['library'],
    explanation: 'library', timeLimitSec: 30, isBossRound: true
  }
];

function setup() {
  let timestamp = 10_000;
  let sequence = 0;
  const roomManager = createRoomManager({ now: () => timestamp, createId: () => `id-${sequence += 1}` });
  const room = roomManager.createRoom();
  const red = roomManager.joinRoom(room.roomId, 'Red Player');
  const blue = roomManager.joinRoom(room.roomId, 'Blue Player');
  const gameManager = createGameManager({ now: () => timestamp, autoSchedule: false, random: () => 0 });
  const game = gameManager.createGame(room, questions);
  return { room, red, blue, game, gameManager, advance: (milliseconds) => { timestamp += milliseconds; } };
}

describe('gameManager state machine', () => {
  test('follows lobby, countdown and question-active order without leaking answers', () => {
    const { room, game, gameManager } = setup();
    const countdown = gameManager.startGame(room.roomId);
    assert.equal(game.state, STATES.COUNTDOWN);
    assert.equal(countdown.startsIn, 5);
    const payload = gameManager.nextQuestion(room.roomId);
    assert.equal(game.state, STATES.QUESTION_ACTIVE);
    assert.equal(payload.questionId, 'q1');
    assert.equal(payload.correctAnswer, undefined);
  });

  test('rejects an invalid transition', () => {
    const { room, gameManager } = setup();
    assert.throws(() => gameManager.nextQuestion(room.roomId), { code: 'INVALID_STATE' });
  });

  test('records the first answer and rejects duplicates', () => {
    const { room, red, gameManager } = setup();
    gameManager.startGame(room.roomId);
    gameManager.nextQuestion(room.roomId);
    const submission = gameManager.submitAnswer(room.roomId, red.playerId, 'q1', 'B');
    assert.equal(submission.isCorrect, true);
    assert.equal(submission.xpEarned, 120);
    assert.throws(() => gameManager.submitAnswer(room.roomId, red.playerId, 'q1', 'A'), { code: 'ALREADY_ANSWERED' });
  });

  test('rejects wrong-question and late submissions', () => {
    const { room, red, gameManager, advance } = setup();
    gameManager.startGame(room.roomId);
    gameManager.nextQuestion(room.roomId);
    assert.throws(() => gameManager.submitAnswer(room.roomId, red.playerId, 'q2', 'B'), { code: 'WRONG_QUESTION' });
    advance(20_000 + constants.GRACE_MS + 1);
    assert.throws(() => gameManager.submitAnswer(room.roomId, red.playerId, 'q1', 'B'), { code: 'QUESTION_LOCKED' });
  });

  test('locks a round and calculates team scores', () => {
    const { room, red, blue, game, gameManager } = setup();
    gameManager.startGame(room.roomId);
    gameManager.nextQuestion(room.roomId);
    gameManager.submitAnswer(room.roomId, red.playerId, 'q1', 'B');
    gameManager.submitAnswer(room.roomId, blue.playerId, 'q1', 'A');
    const result = gameManager.lockQuestion(room.roomId);
    assert.equal(game.state, STATES.ROUND_RESULT);
    assert.equal(result.isLeaderDuel, true);
    assert.equal(result.leaderDuelResult.winner, 'red');
    assert.equal(result.teamScores.red.battleScore, 200);
    assert.equal(result.teamScores.blue.battleScore, 0);
  });

  test('allows only leaders in the duel and applies winner bonus plus loser penalty', () => {
    let timestamp = 10_000;
    let sequence = 0;
    const roomManager = createRoomManager({
      now: () => timestamp, createId: () => `duel-${sequence += 1}`, random: () => 0
    });
    const room = roomManager.createRoom();
    const redLeader = roomManager.joinRoom(room.roomId, 'Red Leader');
    const blueLeader = roomManager.joinRoom(room.roomId, 'Blue Leader');
    const redMember = roomManager.joinRoom(room.roomId, 'Red Member');
    roomManager.joinRoom(room.roomId, 'Blue Member');
    roomManager.assignTeamLeaders(room.roomId, true);
    const gameManager = createGameManager({ now: () => timestamp, autoSchedule: false, random: () => 0 });
    gameManager.createGame(room, questions);
    gameManager.startGame(room.roomId);
    const question = gameManager.nextQuestion(room.roomId);
    assert.equal(question.isLeaderDuel, true);
    assert.throws(
      () => gameManager.submitAnswer(room.roomId, redMember.playerId, 'q1', 'B'),
      { code: 'LEADER_DUEL_ONLY' }
    );
    gameManager.submitAnswer(room.roomId, redLeader.playerId, 'q1', 'B');
    timestamp += 100;
    gameManager.submitAnswer(room.roomId, blueLeader.playerId, 'q1', 'A');
    const result = gameManager.lockQuestion(room.roomId);
    assert.equal(result.leaderDuelResult.winner, 'red');
    assert.equal(result.leaderDuelResult.red.bonus, 100);
    assert.equal(result.leaderDuelResult.blue.penalty, 100);
    assert.equal(result.teamScores.red.battleScore, 200);
    assert.equal(result.teamScores.blue.battleScore, 0);
    gameManager.endGame(room.roomId);
    assert.deepEqual(gameManager.getPlayerGameResult(gameManager.getGame(room.roomId), redMember.playerId).missedQuestions, []);
  });

  test('ends after the final result and chooses the higher score', () => {
    const { room, red, blue, game, gameManager } = setup();
    gameManager.startGame(room.roomId);
    gameManager.nextQuestion(room.roomId);
    gameManager.submitAnswer(room.roomId, red.playerId, 'q1', 'B');
    gameManager.submitAnswer(room.roomId, blue.playerId, 'q1', 'A');
    gameManager.lockQuestion(room.roomId);
    gameManager.nextQuestion(room.roomId);
    gameManager.submitAnswer(room.roomId, red.playerId, 'q2', 'library');
    gameManager.lockQuestion(room.roomId);
    const result = gameManager.nextQuestion(room.roomId);
    assert.equal(game.state, STATES.FINISHED);
    assert.equal(result.winner, 'red');
    assert.equal(result.leaderboard.length, 2);
    assert.equal(result.leaderboard[0].playerId, red.playerId);
    assert.equal(result.leaderboard[0].rank, 1);
    assert.equal(result.leaderboard[0].accuracy, 1);
    assert.equal(result.leaderboard[1].playerId, blue.playerId);
  });

  test('pauses and resumes an active question', () => {
    const { room, game, gameManager } = setup();
    gameManager.startGame(room.roomId);
    gameManager.nextQuestion(room.roomId);
    gameManager.pauseGame(room.roomId);
    assert.equal(game.state, STATES.PAUSED);
    gameManager.resumeGame(room.roomId);
    assert.equal(game.state, STATES.QUESTION_ACTIVE);
  });

  test('scores an active question when resuming after its deadline', () => {
    const { room, red, game, gameManager, advance } = setup();
    gameManager.startGame(room.roomId);
    gameManager.nextQuestion(room.roomId);
    gameManager.submitAnswer(room.roomId, red.playerId, 'q1', 'B');
    gameManager.pauseGame(room.roomId);
    advance(20_000 + constants.GRACE_MS + 1);
    const result = gameManager.resumeGame(room.roomId);
    assert.equal(game.state, STATES.ROUND_RESULT);
    assert.equal(result.teamScores.red.battleScore, 200);
  });
});
