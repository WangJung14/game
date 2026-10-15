'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMemoryQuestionStore, createSupabaseQuestionStore } = require('../questionStore');

test('memory question store saves isolated copies', async () => {
  const store = createMemoryQuestionStore();
  const record = { roomCode: 'ABCDEF', title: 'Test', questions: [{ id: 'q1' }] };
  await store.save(record);
  record.questions[0].id = 'changed';
  assert.equal((await store.get('ABCDEF')).questions[0].id, 'q1');
});

test('memory question store creates and updates reusable library sets', async () => {
  const store = createMemoryQuestionStore();
  const created = await store.saveSet({ title: 'Set one', description: '', questions: [{ id: 'q1' }] });
  assert.ok(created.id);
  await store.saveSet({ id: created.id, title: 'Updated', description: '', questions: [{ id: 'q1' }, { id: 'q2' }] });
  assert.equal((await store.listSets()).length, 1);
  assert.equal((await store.getSet(created.id)).title, 'Updated');
});

test('Supabase store uses server credentials and upserts by room code', async () => {
  let request;
  const store = createSupabaseQuestionStore({
    url: 'https://example.supabase.co', secretKey: 'server-secret',
    fetch: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify([{ room_code: 'ABCDEF' }]), { status: 200 });
    }
  });
  await store.save({ roomCode: 'ABCDEF', title: 'Lesson', questions: [{ id: 'q1' }] });
  assert.match(request.url, /room_question_sets\?on_conflict=room_code$/);
  assert.equal(request.options.headers.apikey, 'server-secret');
  assert.equal(request.options.headers.Authorization, 'Bearer server-secret');
  assert.equal(JSON.parse(request.options.body).question_count, 1);
});
