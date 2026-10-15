'use strict';

const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../server/loadEnv');
const { normalizeQuestionSet } = require('../server/questionImport');
const { createSupabaseQuestionStore } = require('../server/questionStore');

async function main() {
  loadEnv();
  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  }
  const source = path.join(__dirname, '..', 'data', 'question-set.seed.json');
  const payload = JSON.parse(fs.readFileSync(source, 'utf8'));
  const questions = normalizeQuestionSet(payload);
  const store = createSupabaseQuestionStore();
  await store.save({ roomCode: 'DEMO01', title: payload.title, questions });
  console.log(`[seed] Saved ${questions.length} questions as room DEMO01`);
}

main().catch((error) => {
  console.error(`[seed] ${error.message}`);
  if (error.message.includes('PGRST205') || error.message.includes('room_question_sets')) {
    const projectRef = (() => {
      try { return new URL(process.env.SUPABASE_URL).hostname.split('.')[0]; } catch (_error) { return 'unknown'; }
    })();
    console.error(`[seed] Confirm SQL Editor is open for project ${projectRef}.`);
    console.error('[seed] Run all SQL in supabase/migrations/202610160001_create_room_question_sets.sql, then retry.');
  }
  process.exitCode = 1;
});

