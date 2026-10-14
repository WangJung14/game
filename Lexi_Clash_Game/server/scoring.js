'use strict';

/**
 * scoring.js
 * Pure functions for XP and Battle Score calculation.
 * No side effects, no I/O — safe to unit test in isolation.
 *
 * Spec: docs/01_FUNCTIONAL_SPEC.md §4
 */

const BASE_XP = 100;
const SPEED_BONUS_MAX = 20;
const PARTICIPATION_XP = 5;
const BOSS_MULTIPLIER = 2;

/**
 * Calculate XP earned by a single player for one question.
 *
 * @param {boolean} isCorrect        Whether the answer was correct
 * @param {boolean} isBoss           Whether this is a boss round
 * @param {number}  remainingFraction  Fraction of time remaining when answer
 *                                    was submitted. Range [0, 1]. Values
 *                                    outside this range are clamped.
 * @returns {number} XP earned (non-negative integer)
 */
function calcXP(isCorrect, isBoss, remainingFraction) {
  const fraction = Math.min(1, Math.max(0, remainingFraction));
  const multiplier = isBoss ? BOSS_MULTIPLIER : 1;

  if (isCorrect) {
    const speedBonus = Math.floor(SPEED_BONUS_MAX * fraction);
    return (BASE_XP + speedBonus) * multiplier;
  }

  // Wrong answer: participation XP only
  return PARTICIPATION_XP * multiplier;
}

/**
 * Calculate Battle Score delta for a team for one round.
 *
 * Formula: 70 × accuracy + 30 × participation
 *   accuracy    = correctCount / submittedCount  (0 when submittedCount = 0)
 *   participation = submittedCount / rosterCount  (0 when rosterCount = 0)
 *
 * Boss rounds multiply the result by BOSS_MULTIPLIER.
 *
 * @param {number} correctCount   Number of players who answered correctly
 * @param {number} submittedCount Number of players who submitted any answer
 * @param {number} rosterCount    Number of players currently connected in team
 * @param {boolean} isBoss        Whether this is a boss round
 * @returns {number} Battle Score delta (non-negative integer)
 */
function calcBattleScore(correctCount, submittedCount, rosterCount, isBoss) {
  const accuracy = submittedCount > 0 ? correctCount / submittedCount : 0;
  const participation = rosterCount > 0 ? submittedCount / rosterCount : 0;

  const raw = 70 * accuracy + 30 * participation;
  const multiplier = isBoss ? BOSS_MULTIPLIER : 1;

  return Math.floor(raw * multiplier);
}

/**
 * Compute remainingFraction from timestamps.
 * Used by gameManager before calling calcXP.
 *
 * @param {number} submittedAt  ms timestamp when answer arrived at server
 * @param {number} startedAt    ms timestamp when question became active
 * @param {number} timeLimitSec Question time limit in seconds
 * @returns {number} fraction in [0, 1]
 */
function calcRemainingFraction(submittedAt, startedAt, timeLimitSec) {
  const elapsed = submittedAt - startedAt;
  const limitMs = timeLimitSec * 1000;
  const remaining = limitMs - elapsed;
  return Math.min(1, Math.max(0, remaining / limitMs));
}

module.exports = { calcXP, calcBattleScore, calcRemainingFraction };
