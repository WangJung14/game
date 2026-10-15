'use strict';

const { randomUUID } = require('crypto');

function createMemoryQuestionStore() {
  const records = new Map();
  const library = new Map();
  return {
    kind: 'memory',
    async save(record) { records.set(record.roomCode, structuredClone(record)); return records.get(record.roomCode); },
    async get(roomCode) { return records.get(roomCode) || null; },
    async delete(roomCode) { return records.delete(roomCode); },
    async listSets() { return Array.from(library.values(), (value) => structuredClone(value)); },
    async getSet(id) { return library.has(id) ? structuredClone(library.get(id)) : null; },
    async saveSet(record) {
      const id = record.id || randomUUID();
      const saved = { ...structuredClone(record), id, updatedAt: new Date().toISOString() };
      library.set(id, saved);
      return structuredClone(saved);
    },
    records, library
  };
}

function createSupabaseQuestionStore(options = {}) {
  const url = String(options.url || process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const secretKey = options.secretKey || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fetchImpl = options.fetch || fetch;
  if (!url || !secretKey) return createMemoryQuestionStore();

  async function request(path, requestOptions = {}) {
    const response = await fetchImpl(`${url}/rest/v1/${path}`, {
      ...requestOptions,
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        ...(requestOptions.headers || {})
      }
    });
    if (!response.ok) {
      const body = await response.text();
      const error = new Error(`Supabase request failed (${response.status}): ${body.slice(0, 300)}`);
      error.code = 'QUESTION_STORE_UNAVAILABLE';
      throw error;
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  return {
    kind: 'supabase',
    async save(record) {
      const rows = await request('room_question_sets?on_conflict=room_code', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          room_code: record.roomCode,
          title: record.title,
          questions: record.questions,
          question_count: record.questions.length,
          updated_at: new Date().toISOString()
        })
      });
      return rows?.[0] || null;
    },
    async get(roomCode) {
      const rows = await request(`room_question_sets?room_code=eq.${encodeURIComponent(roomCode)}&select=room_code,title,questions,question_count,updated_at&limit=1`);
      return rows?.[0] || null;
    },
    async delete(roomCode) {
      await request(`room_question_sets?room_code=eq.${encodeURIComponent(roomCode)}`, { method: 'DELETE' });
      return true;
    },
    async listSets() {
      return request('question_sets?select=id,title,description,question_count,created_at,updated_at&order=updated_at.desc&limit=100');
    },
    async getSet(id) {
      const rows = await request(`question_sets?id=eq.${encodeURIComponent(id)}&select=id,title,description,questions,question_count,created_at,updated_at&limit=1`);
      return rows?.[0] || null;
    },
    async saveSet(record) {
      const body = {
        ...(record.id ? { id: record.id } : {}), title: record.title, description: record.description || '',
        questions: record.questions, question_count: record.questions.length, updated_at: new Date().toISOString()
      };
      const rows = await request(`question_sets${record.id ? '?on_conflict=id' : ''}`, {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(body)
      });
      return rows?.[0] || null;
    }
  };
}

module.exports = { createMemoryQuestionStore, createSupabaseQuestionStore };
