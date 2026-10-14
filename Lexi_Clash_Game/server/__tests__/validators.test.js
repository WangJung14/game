'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { normalize, checkAnswer } = require('../validators');

// ── normalize ────────────────────────────────────────────────────────────────

describe('normalize()', () => {
  test('V01 — trims leading and trailing whitespace, lowercases', () => {
    assert.equal(normalize('  LIBRARY  '), 'library');
  });

  test('V02 — NFC normalize only; does NOT strip diacritics', () => {
    // café composed vs decomposed — both should normalize to the same NFC form
    const composed = 'café';        // U+00E9
    const decomposed = 'café'; // e + combining accent
    assert.equal(normalize(composed), normalize(decomposed));
    // and the result still contains the accented char
    assert.ok(normalize(composed).includes('é'));
  });

  test('V03 — collapses internal whitespace to a single space', () => {
    assert.equal(normalize('hello  world'), 'hello world');
    assert.equal(normalize('a  b   c'), 'a b c');
  });

  test('V04 — null input returns empty string', () => {
    assert.equal(normalize(null), '');
  });

  test('V05 — undefined input returns empty string', () => {
    assert.equal(normalize(undefined), '');
  });

  test('V06 — empty string returns empty string', () => {
    assert.equal(normalize(''), '');
  });

  test('V07 — normalizes curly single quotes to straight apostrophe', () => {
    assert.equal(normalize('she’s'), "she's");   // right single quote
    assert.equal(normalize('she‘s'), "she's");   // left single quote
  });

  test('V08 — normalizes curly double quotes to straight quote', () => {
    assert.equal(normalize('“hello”'), '"hello"');
  });

  test('V09 — non-string input returns empty string', () => {
    assert.equal(normalize(42), '');
    assert.equal(normalize({}), '');
  });
});

// ── checkAnswer — multiple_choice ────────────────────────────────────────────

const MC_B = {
  type: 'multiple_choice',
  correctAnswer: 'B',
  acceptedAnswers: ['B']
};

describe('checkAnswer() — multiple_choice', () => {
  test('V07 — correct option id returns isCorrect true', () => {
    assert.deepEqual(checkAnswer('B', MC_B), { isCorrect: true });
  });

  test('V08 — lowercase option id returns isCorrect false (case-sensitive)', () => {
    assert.deepEqual(checkAnswer('b', MC_B), { isCorrect: false });
  });

  test('V09 — wrong option returns isCorrect false', () => {
    assert.deepEqual(checkAnswer('A', MC_B), { isCorrect: false });
  });

  test('V10 — empty string returns isCorrect false', () => {
    assert.deepEqual(checkAnswer('', MC_B), { isCorrect: false });
  });
});

// ── checkAnswer — word_forge ──────────────────────────────────────────────────

const WF_LIBRARY = {
  type: 'word_forge',
  correctAnswer: 'library',
  acceptedAnswers: ['library']
};

const WF_TUESDAY = {
  type: 'word_forge',
  correctAnswer: 'tuesday',
  acceptedAnswers: ['tuesday', 'Tuesday']
};

describe('checkAnswer() — word_forge', () => {
  test('V11 — exact lowercase match returns isCorrect true', () => {
    assert.deepEqual(checkAnswer('library', WF_LIBRARY), { isCorrect: true });
  });

  test('V12 — uppercase input normalizes and matches', () => {
    assert.deepEqual(checkAnswer('LIBRARY', WF_LIBRARY), { isCorrect: true });
  });

  test('V13 — padded whitespace normalizes and matches', () => {
    assert.deepEqual(checkAnswer('  library  ', WF_LIBRARY), { isCorrect: true });
  });

  test('V14 — mixed case input normalizes and matches', () => {
    assert.deepEqual(checkAnswer('Library', WF_LIBRARY), { isCorrect: true });
  });

  test('V15 — spelling mistake returns isCorrect false', () => {
    assert.deepEqual(checkAnswer('libary', WF_LIBRARY), { isCorrect: false });
  });

  test('V16 — extra word returns isCorrect false', () => {
    assert.deepEqual(checkAnswer('a library', WF_LIBRARY), { isCorrect: false });
  });

  test('V17 — empty string returns isCorrect false', () => {
    assert.deepEqual(checkAnswer('', WF_LIBRARY), { isCorrect: false });
  });

  test('V18 — multiple accepted answers: first variant matches', () => {
    assert.deepEqual(checkAnswer('tuesday', WF_TUESDAY), { isCorrect: true });
  });

  test('V19 — multiple accepted answers: capitalized variant matches', () => {
    assert.deepEqual(checkAnswer('Tuesday', WF_TUESDAY), { isCorrect: true });
  });
});

// ── checkAnswer — edge cases ──────────────────────────────────────────────────

describe('checkAnswer() — edge cases', () => {
  test('V20 — null question returns isCorrect false', () => {
    assert.deepEqual(checkAnswer('B', null), { isCorrect: false });
  });

  test('V21 — non-string answer returns isCorrect false', () => {
    assert.deepEqual(checkAnswer(42, MC_B), { isCorrect: false });
  });

  test('V22 — unknown question type returns isCorrect false', () => {
    assert.deepEqual(checkAnswer('B', { type: 'unknown', correctAnswer: 'B', acceptedAnswers: ['B'] }), { isCorrect: false });
  });
});
