'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calcXP, calcBattleScore, calcRemainingFraction } = require('../scoring');

// ── calcXP ───────────────────────────────────────────────────────────────────

describe('calcXP()', () => {
  test('S01 — correct answer with 0.8 fraction → 100 + floor(20×0.8) = 116', () => {
    assert.equal(calcXP(true, false, 0.8), 116);
  });

  test('S02 — correct answer with 0.0 fraction (submitted at last second) → 100', () => {
    assert.equal(calcXP(true, false, 0.0), 100);
  });

  test('S03 — correct answer with 1.0 fraction (instant) → 120', () => {
    assert.equal(calcXP(true, false, 1.0), 120);
  });

  test('S04 — correct boss round with 0.5 fraction → (100 + 10) × 2 = 220', () => {
    assert.equal(calcXP(true, true, 0.5), 220);
  });

  test('S05 — correct boss round with 1.0 fraction → (100 + 20) × 2 = 240', () => {
    assert.equal(calcXP(true, true, 1.0), 240);
  });

  test('S06 — wrong answer → participation XP = 5', () => {
    assert.equal(calcXP(false, false, 0.9), 5);
  });

  test('S07 — wrong boss round → participation × 2 = 10', () => {
    assert.equal(calcXP(false, true, 0.5), 10);
  });

  test('S08 — fraction below 0 is clamped to 0 → correct gives 100', () => {
    assert.equal(calcXP(true, false, -0.5), 100);
  });

  test('S09 — fraction above 1 is clamped to 1 → correct gives 120', () => {
    assert.equal(calcXP(true, false, 1.5), 120);
  });

  test('S10 — wrong answer, fraction irrelevant → always 5', () => {
    assert.equal(calcXP(false, false, 0.0), 5);
    assert.equal(calcXP(false, false, 1.0), 5);
  });
});

// ── calcBattleScore ───────────────────────────────────────────────────────────

describe('calcBattleScore()', () => {
  test('S11 — 7 correct, 9 submitted, 10 roster → floor(70×(7/9) + 30×(9/10)) = 81', () => {
    // 70 × 0.7778 + 30 × 0.9 = 54.44 + 27 = 81.44 → floor = 81
    assert.equal(calcBattleScore(7, 9, 10, false), 81);
  });

  test('S12 — nobody submitted → 0', () => {
    assert.equal(calcBattleScore(0, 0, 5, false), 0);
  });

  test('S13 — nobody submitted, empty roster → 0', () => {
    assert.equal(calcBattleScore(0, 0, 0, false), 0);
  });

  test('S14 — perfect round (all correct, all submitted) → 100', () => {
    assert.equal(calcBattleScore(5, 5, 5, false), 100);
  });

  test('S15 — perfect boss round → 200', () => {
    assert.equal(calcBattleScore(5, 5, 5, true), 200);
  });

  test('S16 — 3 correct, 5 submitted, 5 roster → floor(70×0.6 + 30×1.0) = 72', () => {
    // 42 + 30 = 72
    assert.equal(calcBattleScore(3, 5, 5, false), 72);
  });

  test('S17 — 0 correct, 5 submitted, 5 roster (all wrong) → floor(0 + 30) = 30', () => {
    assert.equal(calcBattleScore(0, 5, 5, false), 30);
  });

  test('S18 — boss with 0 submitted → 0', () => {
    assert.equal(calcBattleScore(0, 0, 4, true), 0);
  });

  test('S19 — partial participation: 2 submitted out of 5 → floor(70×0.5 + 30×0.4) = 47', () => {
    // 1 correct out of 2, 2 submitted out of 5: accuracy=0.5, part=0.4
    // 35 + 12 = 47
    assert.equal(calcBattleScore(1, 2, 5, false), 47);
  });
});

// ── calcRemainingFraction ────────────────────────────────────────────────────

describe('calcRemainingFraction()', () => {
  test('S20 — submitted at start → fraction = 1.0', () => {
    const start = 1000000;
    assert.equal(calcRemainingFraction(start, start, 20), 1.0);
  });

  test('S21 — submitted exactly at limit → fraction = 0.0', () => {
    const start = 1000000;
    const submitted = start + 20000; // exactly 20s later
    assert.equal(calcRemainingFraction(submitted, start, 20), 0.0);
  });

  test('S22 — submitted halfway through → fraction = 0.5', () => {
    const start = 1000000;
    const submitted = start + 10000; // 10s into 20s limit
    assert.equal(calcRemainingFraction(submitted, start, 20), 0.5);
  });

  test('S23 — submitted after limit (late) → clamped to 0.0', () => {
    const start = 1000000;
    const submitted = start + 25000; // 25s into 20s limit
    assert.equal(calcRemainingFraction(submitted, start, 20), 0.0);
  });
});
