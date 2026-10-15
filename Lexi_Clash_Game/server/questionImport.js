'use strict';

const { validateQuestion } = require('./questionBank');

const MAX_QUESTIONS = 50;
const MAX_TEXT_LENGTH = 1000;

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'y'].includes(String(value || '').trim().toLowerCase());
}

function parseCsv(text) {
  if (typeof text !== 'string' || !text.trim()) throw importError('EMPTY_IMPORT', 'CSV file is empty');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field); field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field); field = '';
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else field += character;
  }
  if (quoted) throw importError('INVALID_CSV', 'CSV contains an unclosed quoted field');
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length < 2) throw importError('EMPTY_IMPORT', 'CSV must contain a header and at least one question');
  const headers = rows[0].map((value) => value.trim().toLowerCase().replace(/\s+/g, '_'));
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function importError(code, message, details = []) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function cleanText(value, field, rowNumber, required = true) {
  const text = String(value ?? '').trim();
  if (required && !text) throw importError('INVALID_QUESTION_SET', `Row ${rowNumber}: ${field} is required`);
  if (text.length > MAX_TEXT_LENGTH) throw importError('INVALID_QUESTION_SET', `Row ${rowNumber}: ${field} is too long`);
  return text;
}

function normalizeQuestion(input, index) {
  const rowNumber = index + 1;
  const type = cleanText(input.type, 'type', rowNumber).toLowerCase();
  const correctAnswerRaw = input.correctAnswer ?? input.correct_answer;
  const optionValues = ['A', 'B', 'C', 'D'].map((id) => ({
    id,
    text: cleanText(input[`option_${id.toLowerCase()}`] ?? input[`option${id}`], `option_${id.toLowerCase()}`, rowNumber, false)
  })).filter((option) => option.text);
  const options = Array.isArray(input.options)
    ? input.options.map((option) => ({ id: cleanText(option.id, 'option id', rowNumber), text: cleanText(option.text, 'option text', rowNumber) }))
    : optionValues;
  const acceptedRaw = input.acceptedAnswers ?? input.accepted_answers;
  const acceptedAnswers = Array.isArray(acceptedRaw)
    ? acceptedRaw.map((answer) => cleanText(answer, 'accepted answer', rowNumber)).filter(Boolean)
    : String(acceptedRaw ?? '').split('|').map((answer) => answer.trim()).filter(Boolean);
  const correctAnswer = type === 'multiple_choice'
    ? cleanText(correctAnswerRaw, 'correct_answer', rowNumber).toUpperCase()
    : cleanText(correctAnswerRaw ?? acceptedAnswers[0], 'correct_answer', rowNumber);
  if (!acceptedAnswers.length) acceptedAnswers.push(correctAnswer);
  const question = {
    id: cleanText(input.id || `import_${String(rowNumber).padStart(3, '0')}`, 'id', rowNumber),
    type,
    level: cleanText(input.level || 'A2', 'level', rowNumber).toUpperCase(),
    topic: cleanText(input.topic || 'general', 'topic', rowNumber),
    prompt: cleanText(input.prompt ?? input.question, 'prompt', rowNumber),
    options: type === 'multiple_choice' ? options : null,
    correctAnswer,
    acceptedAnswers,
    explanation: cleanText(input.explanation, 'explanation', rowNumber),
    timeLimitSec: Number(input.timeLimitSec ?? input.time_limit ?? 20),
    isBossRound: parseBoolean(input.isBossRound ?? input.boss_round),
    points: Number(input.points ?? 100)
  };
  const validationError = validateQuestion(question);
  if (validationError) throw importError('INVALID_QUESTION_SET', `Row ${rowNumber}: ${validationError}`);
  if (!Number.isFinite(question.points) || question.points <= 0) {
    throw importError('INVALID_QUESTION_SET', `Row ${rowNumber}: points must be a positive number`);
  }
  return question;
}

function normalizeQuestionSet(input) {
  const rows = Array.isArray(input) ? input : input?.questions;
  if (!Array.isArray(rows) || rows.length === 0) throw importError('EMPTY_IMPORT', 'At least one question is required');
  if (rows.length > MAX_QUESTIONS) throw importError('TOO_MANY_QUESTIONS', `A question set can contain at most ${MAX_QUESTIONS} questions`);
  const questions = rows.map(normalizeQuestion);
  const ids = new Set();
  for (const question of questions) {
    if (ids.has(question.id)) throw importError('DUPLICATE_QUESTION_ID', `Duplicate question id: ${question.id}`);
    ids.add(question.id);
  }
  return questions;
}

module.exports = { parseCsv, normalizeQuestionSet, constants: { MAX_QUESTIONS, MAX_TEXT_LENGTH } };
