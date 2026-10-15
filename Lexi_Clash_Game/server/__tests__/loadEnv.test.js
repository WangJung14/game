'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseEnv } = require('../loadEnv');

test('parseEnv handles comments, whitespace and quoted values', () => {
  assert.deepEqual(parseEnv('# comment\nSUPABASE_URL = "https://example.supabase.co"\nSUPABASE_SECRET_KEY=secret\n'), {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SECRET_KEY: 'secret'
  });
});
