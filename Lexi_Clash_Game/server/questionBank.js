'use strict';

/**
 * questionBank.js
 * Loads and validates questions from data/questions.json.
 * Validates schema on startup so bad data fails fast.
 */

const path = require('path');
const fs = require('fs');

const DATA_PATH = path.join(__dirname, '..', 'data', 'questions.json');

const REQUIRED_FIELDS = ['id', 'type', 'level', 'topic', 'prompt',
  'correctAnswer', 'acceptedAnswers', 'explanation', 'timeLimitSec',
  'isBossRound', 'points'];

const VALID_TYPES = new Set(['multiple_choice', 'word_forge']);
const VALID_LEVELS = new Set(['A1', 'A2', 'B1']);

/**
 * Validate a single question object.
 * @param {object} q
 * @returns {string|null} error message, or null if valid
 */
function validateQuestion(q) {
  for (const field of REQUIRED_FIELDS) {
    if (q[field] === undefined || q[field] === null) {
      return `Question "${q.id || '?'}": missing field "${field}"`;
    }
  }
  if (!VALID_TYPES.has(q.type)) {
    return `Question "${q.id}": invalid type "${q.type}"`;
  }
  if (!VALID_LEVELS.has(q.level)) {
    return `Question "${q.id}": invalid level "${q.level}"`;
  }
  if (q.type === 'multiple_choice') {
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return `Question "${q.id}": multiple_choice needs at least 2 options`;
    }
    const ids = q.options.map((o) => o.id);
    if (!ids.includes(q.correctAnswer)) {
      return `Question "${q.id}": correctAnswer "${q.correctAnswer}" not in options`;
    }
  }
  if (!Array.isArray(q.acceptedAnswers) || q.acceptedAnswers.length === 0) {
    return `Question "${q.id}": acceptedAnswers must be a non-empty array`;
  }
  if (typeof q.timeLimitSec !== 'number' || q.timeLimitSec < 5) {
    return `Question "${q.id}": timeLimitSec must be a number >= 5`;
  }
  return null;
}

/**
 * Load and validate all questions. Throws on validation error.
 * @returns {object[]} validated question array
 */
function loadQuestions() {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Question bank not found at: ${DATA_PATH}`);
  }
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  let questions;
  try {
    questions = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse questions.json: ${err.message}`);
  }
  if (!Array.isArray(questions)) {
    throw new Error('questions.json must be a JSON array');
  }
  if (questions.length === 0) {
    throw new Error('questions.json is empty');
  }

  // Check for duplicate IDs
  const ids = questions.map((q) => q.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length > 0) {
    throw new Error(`Duplicate question IDs: ${dupes.join(', ')}`);
  }

  // Validate each question
  for (const q of questions) {
    const err = validateQuestion(q);
    if (err) throw new Error(err);
  }

  console.log(`[questionBank] Loaded ${questions.length} questions OK`);
  return questions;
}

// Lazy singleton
let _questions = null;

function getQuestions() {
  if (!_questions) {
    _questions = loadQuestions();
  }
  return _questions;
}

function getQuestionById(id) {
  return getQuestions().find((q) => q.id === id) || null;
}

module.exports = { loadQuestions, getQuestions, getQuestionById, validateQuestion };
