'use strict';

/**
 * validators.js
 * Answer normalization and correctness checking.
 * All functions are pure (no side effects, no I/O).
 */

/**
 * Normalize a text answer using a 5-step pipeline:
 *   1. Unicode NFC normalization
 *   2. toLowerCase()
 *   3. trim()
 *   4. Collapse internal whitespace to single space
 *   5. Normalize quotation marks to standard apostrophe/double-quote
 *
 * @param {string|null|undefined} str
 * @returns {string}
 */
function normalize(str) {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') return '';

  return str
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[‘’‚‛]/g, "'")   // curly single quotes → '
    .replace(/[“”„‟]/g, '"');   // curly double quotes → "
}

/**
 * Check whether a player's answer is correct for a given question.
 *
 * For multiple_choice: compares answer directly to correctAnswer (case-sensitive
 * option ID match — options are "A", "B", "C", "D").
 *
 * For word_forge: normalizes the player's answer and compares against every
 * entry in acceptedAnswers (also normalized). Returns true on first match.
 *
 * @param {string} playerAnswer  Raw answer string from the player
 * @param {object} question      Question object from questionBank
 * @returns {{ isCorrect: boolean }}
 */
function checkAnswer(playerAnswer, question) {
  if (!question || typeof playerAnswer !== 'string') {
    return { isCorrect: false };
  }

  if (question.type === 'multiple_choice') {
    // Option IDs are uppercase letters — exact match only
    return { isCorrect: playerAnswer === question.correctAnswer };
  }

  if (question.type === 'word_forge') {
    const normalized = normalize(playerAnswer);
    if (normalized === '') return { isCorrect: false };

    const accepted = Array.isArray(question.acceptedAnswers)
      ? question.acceptedAnswers
      : [];

    for (const candidate of accepted) {
      if (normalize(candidate) === normalized) {
        return { isCorrect: true };
      }
    }
    return { isCorrect: false };
  }

  // Unknown type — safe default
  return { isCorrect: false };
}

module.exports = { normalize, checkAnswer };
