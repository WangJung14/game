# Supabase Question Import Backend

**Date:** 2026-10-16  
**Status:** Backend implemented; Teacher import UI is the next phase.

## Implemented

- Room-scoped JSON and CSV question import API.
- Host authorization using the active room's `hostToken` through the `x-host-token` header.
- Server-side normalization and validation for Multiple Choice and Word Forge.
- Limits of 2 MB and 50 questions per import.
- Automatic IDs when a row omits `id`.
- Supabase REST persistence using a server-only secret key.
- In-memory fallback when Supabase environment variables are absent, keeping local development and tests operational.
- Imported questions are attached to the active room and become the authoritative game questions when the Host starts.
- Demo `data/questions.json` remains the fallback when no import exists.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/202610160001_create_room_question_sets.sql` in the Supabase SQL Editor or through the Supabase CLI.
3. Copy `.env.example` to `.env`.
4. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
5. Keep the secret key on the Node.js server only. Never expose it through frontend JavaScript, HTML or a public environment variable.
6. Restart the Node.js server.

The migration enables RLS, revokes access from `anon` and `authenticated`, and grants table access only to `service_role`. The Node backend verifies the room Host token before using its server-side Supabase credential.

## API

### Download CSV template

`GET /api/question-template.csv`

### Read the current room set

`GET /api/rooms/:roomCode/questions`

Required header: `x-host-token: <hostToken>`

### Import JSON

`PUT /api/rooms/:roomCode/questions`

Headers:

- `content-type: application/json`
- `x-host-token: <hostToken>`
- `x-question-set-title: Lesson title` (optional)

Body may be a question array or `{ "title": "...", "questions": [...] }`.

### Import CSV

Use the same PUT endpoint with `content-type: text/csv`. Supported columns are:

`type, level, topic, prompt, option_a, option_b, option_c, option_d, correct_answer, accepted_answers, explanation, time_limit, boss_round, points`

Separate multiple accepted Word Forge answers with `|`.

## Security and limitations

- Supabase recommends keeping secret/service-role keys strictly server-side because they bypass RLS. The application follows that model.
- A Host can change questions only while the room is in `LOBBY`.
- The current project has no Teacher accounts. Imported rows persist in Supabase, but reusable personal libraries and cross-session ownership require Supabase Auth in a later phase.
- Rooms and reconnect identity still live in server RAM. Restarting Node invalidates active rooms even though imported data remains in Supabase.
- CSV is parsed by the server without spreadsheet formulas or code execution.

## Verification

- `npm.cmd test`: 90 passed, 0 failed.
- Coverage includes CSV quoting, Word Forge aliases, invalid answer rejection, 50-question limit, memory isolation, Supabase authentication headers/upsert, unauthorized API rejection and starting a real Socket.IO game with imported questions.
