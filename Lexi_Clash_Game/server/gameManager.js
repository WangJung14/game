'use strict';

const { checkAnswer } = require('./validators');
const { calcXP, calcBattleScore, calcRemainingFraction } = require('./scoring');

const STATES = Object.freeze({
  LOBBY: 'LOBBY', COUNTDOWN: 'COUNTDOWN', QUESTION_ACTIVE: 'QUESTION_ACTIVE',
  QUESTION_LOCKED: 'QUESTION_LOCKED', ROUND_RESULT: 'ROUND_RESULT', PAUSED: 'PAUSED', FINISHED: 'FINISHED'
});
const COUNTDOWN_MS = 5000;
const GRACE_MS = 500;
const RESULT_MS = 5000;

function gameError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function createTeamScore() {
  return { battleScore: 0, totalXP: 0, roundHistory: [] };
}

function createGameManager(options = {}) {
  const games = options.games || new Map();
  const now = options.now || Date.now;
  const schedule = options.schedule || setTimeout;
  const cancel = options.cancel || clearTimeout;
  const autoSchedule = options.autoSchedule !== false;

  function transition(game, allowedStates, nextState) {
    if (!allowedStates.includes(game.state)) {
      throw gameError('INVALID_STATE', `Cannot transition from ${game.state} to ${nextState}`);
    }
    game.state = nextState;
    game.room.state = nextState;
  }

  function createGame(room, questions) {
    if (!room || room.state !== STATES.LOBBY) throw gameError('INVALID_STATE', 'Game can only be created from the lobby');
    if (!Array.isArray(questions) || questions.length === 0) throw gameError('NO_QUESTIONS', 'At least one question is required');
    if (games.has(room.roomId)) throw gameError('GAME_EXISTS', 'A game already exists for this room');
    const game = {
      roomId: room.roomId, room, questions: questions.slice(), currentRoundIndex: -1, state: STATES.LOBBY,
      previousState: null, roundTimer: null, nextRoundTimer: null, roundStartedAt: null, endsAt: null,
      submissions: new Map(), teamScores: { red: createTeamScore(), blue: createTeamScore() }, pausedAt: null
    };
    games.set(room.roomId, game);
    return game;
  }

  function getGame(roomId) {
    return games.get(roomId) || null;
  }

  function requireGame(roomId) {
    const game = getGame(roomId);
    if (!game) throw gameError('GAME_NOT_FOUND', 'Game not found');
    return game;
  }

  function scheduleTimer(callback, delay) {
    return autoSchedule ? schedule(callback, delay) : null;
  }

  function startGame(roomId) {
    const game = requireGame(roomId);
    const connected = Array.from(game.room.players.values()).filter((player) => player.isConnected);
    if (connected.length < 2 || !connected.some((player) => player.team === 'red') || !connected.some((player) => player.team === 'blue')) {
      throw gameError('NOT_ENOUGH_PLAYERS', 'At least one connected player per team is required');
    }
    transition(game, [STATES.LOBBY], STATES.COUNTDOWN);
    game.endsAt = now() + COUNTDOWN_MS;
    game.roundTimer = scheduleTimer(() => nextQuestion(roomId), COUNTDOWN_MS);
    return { startsIn: COUNTDOWN_MS / 1000, endsAt: game.endsAt };
  }

  function nextQuestion(roomId) {
    const game = requireGame(roomId);
    if (game.nextRoundTimer) cancel(game.nextRoundTimer);
    if (game.roundTimer) cancel(game.roundTimer);
    if (game.state === STATES.ROUND_RESULT && game.currentRoundIndex >= game.questions.length - 1) return endGame(roomId);
    transition(game, [STATES.COUNTDOWN, STATES.ROUND_RESULT], STATES.QUESTION_ACTIVE);
    game.currentRoundIndex += 1;
    game.submissions = new Map();
    game.roundStartedAt = now();
    const question = game.questions[game.currentRoundIndex];
    game.endsAt = game.roundStartedAt + question.timeLimitSec * 1000;
    game.roundTimer = scheduleTimer(() => lockQuestion(roomId), question.timeLimitSec * 1000 + GRACE_MS);
    return getQuestionPayload(game);
  }

  function getQuestionPayload(game) {
    const question = game.questions[game.currentRoundIndex];
    const payload = {
      questionId: question.id, roundNumber: game.currentRoundIndex + 1, totalRounds: game.questions.length,
      type: question.type, prompt: question.prompt, timeLimitSec: question.timeLimitSec,
      endsAt: game.endsAt, serverNow: now(), isBossRound: question.isBossRound
    };
    if (question.type === 'multiple_choice') payload.options = question.options;
    return payload;
  }

  function submitAnswer(roomId, playerId, questionId, answer, submittedAt = now()) {
    const game = requireGame(roomId);
    if (game.state !== STATES.QUESTION_ACTIVE || submittedAt > game.endsAt + GRACE_MS) {
      throw gameError('QUESTION_LOCKED', 'Question is not accepting answers');
    }
    const question = game.questions[game.currentRoundIndex];
    if (question.id !== questionId) throw gameError('WRONG_QUESTION', 'Submission does not match the active question');
    const player = game.room.players.get(playerId);
    if (!player || !player.isConnected) throw gameError('PLAYER_NOT_FOUND', 'Connected player not found');
    if (player.joinedAtRound > game.currentRoundIndex) throw gameError('NOT_ELIGIBLE', 'Player becomes eligible next round');
    if (game.submissions.has(playerId) || player.answeredQuestions.has(questionId)) {
      throw gameError('ALREADY_ANSWERED', 'Player has already answered this question');
    }
    const { isCorrect } = checkAnswer(answer, question);
    const remainingFraction = calcRemainingFraction(submittedAt, game.roundStartedAt, question.timeLimitSec);
    const xpEarned = calcXP(isCorrect, question.isBossRound, remainingFraction);
    const submission = { playerId, questionId, answer, submittedAt, isCorrect, xpEarned };
    game.submissions.set(playerId, submission);
    player.answeredQuestions.add(questionId);
    player.xp += xpEarned;
    return submission;
  }

  function lockQuestion(roomId) {
    const game = requireGame(roomId);
    transition(game, [STATES.QUESTION_ACTIVE], STATES.QUESTION_LOCKED);
    if (game.roundTimer) cancel(game.roundTimer);
    const question = game.questions[game.currentRoundIndex];
    for (const team of ['red', 'blue']) {
      const roster = Array.from(game.room.players.values()).filter((player) =>
        player.team === team && player.isConnected && player.joinedAtRound <= game.currentRoundIndex);
      const submissions = roster.map((player) => game.submissions.get(player.playerId)).filter(Boolean);
      const correctCount = submissions.filter((submission) => submission.isCorrect).length;
      const roundDelta = calcBattleScore(correctCount, submissions.length, roster.length, question.isBossRound);
      const totalXP = submissions.reduce((sum, submission) => sum + submission.xpEarned, 0);
      const score = game.teamScores[team];
      score.battleScore += roundDelta;
      score.totalXP += totalXP;
      score.roundHistory.push({
        roundIndex: game.currentRoundIndex, roundDelta,
        accuracy: submissions.length > 0 ? correctCount / submissions.length : 0,
        participation: roster.length > 0 ? submissions.length / roster.length : 0,
        correctCount, submittedCount: submissions.length
      });
    }
    transition(game, [STATES.QUESTION_LOCKED], STATES.ROUND_RESULT);
    game.nextRoundTimer = scheduleTimer(() => nextQuestion(roomId), RESULT_MS);
    return getRoundResult(game);
  }

  function getRoundResult(game) {
    const question = game.questions[game.currentRoundIndex];
    return {
      questionId: question.id, correctAnswer: question.correctAnswer, explanation: question.explanation,
      submittedCount: game.submissions.size,
      totalPlayers: Array.from(game.room.players.values()).filter((player) => player.isConnected).length,
      playerSummary: Array.from(game.submissions.values(), (submission) => ({
        playerId: submission.playerId, team: game.room.players.get(submission.playerId).team, isCorrect: submission.isCorrect
      })),
      teamScores: game.teamScores, roundNumber: game.currentRoundIndex + 1, totalRounds: game.questions.length
    };
  }

  function determineWinner(game) {
    const red = game.teamScores.red;
    const blue = game.teamScores.blue;
    if (red.battleScore !== blue.battleScore) return red.battleScore > blue.battleScore ? 'red' : 'blue';
    const accuracy = (score) => {
      const totals = score.roundHistory.reduce((result, round) => ({
        correct: result.correct + round.correctCount,
        submitted: result.submitted + round.submittedCount
      }), { correct: 0, submitted: 0 });
      return totals.submitted > 0 ? totals.correct / totals.submitted : 0;
    };
    const redAccuracy = accuracy(red);
    const blueAccuracy = accuracy(blue);
    if (redAccuracy === blueAccuracy) return 'tie';
    return redAccuracy > blueAccuracy ? 'red' : 'blue';
  }

  function endGame(roomId) {
    const game = requireGame(roomId);
    if (game.state === STATES.FINISHED) return { winner: determineWinner(game), teamScores: game.teamScores };
    if (game.roundTimer) cancel(game.roundTimer);
    if (game.nextRoundTimer) cancel(game.nextRoundTimer);
    transition(game, [STATES.COUNTDOWN, STATES.QUESTION_ACTIVE, STATES.QUESTION_LOCKED, STATES.ROUND_RESULT, STATES.PAUSED], STATES.FINISHED);
    return { winner: determineWinner(game), teamScores: game.teamScores };
  }

  function pauseGame(roomId) {
    const game = requireGame(roomId);
    game.previousState = game.state;
    transition(game, [STATES.QUESTION_ACTIVE, STATES.ROUND_RESULT], STATES.PAUSED);
    if (game.roundTimer) cancel(game.roundTimer);
    if (game.nextRoundTimer) cancel(game.nextRoundTimer);
    game.roundTimer = null;
    game.nextRoundTimer = null;
    game.pausedAt = now();
    return game;
  }

  function resumeGame(roomId) {
    const game = requireGame(roomId);
    if (game.state !== STATES.PAUSED) throw gameError('INVALID_STATE', 'Game is not paused');
    game.pausedAt = null;
    if (game.previousState === STATES.QUESTION_ACTIVE) {
      transition(game, [STATES.PAUSED], STATES.QUESTION_ACTIVE);
      const remainingMs = game.endsAt + GRACE_MS - now();
      if (remainingMs <= 0) return lockQuestion(roomId);
      game.roundTimer = scheduleTimer(() => lockQuestion(roomId), remainingMs);
      return game;
    }
    transition(game, [STATES.PAUSED], STATES.ROUND_RESULT);
    game.nextRoundTimer = scheduleTimer(() => nextQuestion(roomId), RESULT_MS);
    return game;
  }

  return { games, createGame, getGame, startGame, nextQuestion, submitAnswer, lockQuestion, endGame, pauseGame, resumeGame };
}

const defaultManager = createGameManager();

module.exports = { ...defaultManager, createGameManager, STATES, constants: { COUNTDOWN_MS, GRACE_MS, RESULT_MS } };
