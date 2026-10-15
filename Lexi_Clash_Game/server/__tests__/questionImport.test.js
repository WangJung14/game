'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, normalizeQuestionSet } = require('../questionImport');

describe('question import', () => {
  test('parses quoted CSV and normalizes a multiple-choice question', () => {
    const rows = parseCsv([
      'type,level,topic,prompt,option_a,option_b,correct_answer,accepted_answers,explanation,time_limit,boss_round,points',
      'multiple_choice,A2,school,"Choose, please",Wrong,Right,B,B,"Because B, not A",20,false,100'
    ].join('\n'));
    const questions = normalizeQuestionSet(rows);
    assert.equal(questions.length, 1);
    assert.equal(questions[0].prompt, 'Choose, please');
    assert.equal(questions[0].options[1].text, 'Right');
    assert.equal(questions[0].correctAnswer, 'B');
  });

  test('normalizes Word Forge aliases and accepted answers', () => {
    const [question] = normalizeQuestionSet([{ type: 'word_forge', question: 'Type the place', correct_answer: 'library', accepted_answers: 'library|Library', explanation: 'Books live here', time_limit: '25' }]);
    assert.equal(question.options, null);
    assert.deepEqual(question.acceptedAnswers, ['library', 'Library']);
    assert.equal(question.timeLimitSec, 25);
  });

  test('rejects invalid answers and oversized sets', () => {
    assert.throws(() => normalizeQuestionSet([{ type: 'multiple_choice', prompt: 'Bad', option_a: 'A', option_b: 'B', correct_answer: 'C', explanation: 'No', time_limit: 20 }]), { code: 'INVALID_QUESTION_SET' });
    assert.throws(() => normalizeQuestionSet(Array.from({ length: 51 }, () => ({}))), { code: 'TOO_MANY_QUESTIONS' });
  });
});
