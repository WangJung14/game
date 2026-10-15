# Audio Implementation Report

**Date:** 2026-10-16  
**Status:** Implemented and tested

## Implementation

The client now uses one dependency-free audio manager in `public/js/audio.js`. It owns SFX playback, deduplication, concurrency, volume, mute state, countdown/question timers, music ducking, page-visibility cleanup and the single YouTube IFrame player.

| Available file | Integrated trigger | Device rule |
|---|---|---|
| `button-click.mp3` | Enabled non-audio button click | Host and Player |
| `player_join_success.wav` | Fresh `room:joined` | Joining Player |
| `game-start.wav` | Fresh `game:countdown` | Host |
| `countdown-tick.wav` | Each changed countdown second above zero | Host |
| `countdown-go.wav` | Countdown reaches zero | Host |
| `answer-select.wav` | Player selects a multiple-choice option | Player |
| `Answer-Submit.wav` | `answer:ack` | Player |
| `correct-answer.wav` | Correct `round:personal` | Player |
| `incorrect-answer.wav` | Incorrect `round:personal` | Player |
| `xp-reward.wav` | Any personal result with positive XP | Player |
| `team-lead-change.wav` | Authoritative score leader changes | Host |
| `low-time-warning.wav` | Active question first reaches five seconds | Host and eligible Player |
| `time-up.wav` | Active question reaches its deadline | Host and Player |
| `boss-round-intro.wav` | Fresh Boss `question:show` | Host |
| `victory-fanfare.wav` | Fresh `game:over` | Host |
| `room-closing.wav` | `room:closed` | Host and Player |

All 16 supplied files were recognized by `ffprobe`. Fifteen are WAV and one is MP3. Actual filenames are preserved, including the case-sensitive `Answer-Submit.wav` and the specification differences `button-click.mp3`, `correct-answer.wav`, `incorrect-answer.wav`, `low-time-warning.wav`, `player_join_success.wav` and `room-closing.wav`.

## YouTube music

The official YouTube IFrame Player API is loaded when Host music starts. One 200×200 API player is reused for all tracks, but its video surface is visually clipped so the game UI shows audio controls only, as requested:

- Lobby: `K6cf7sf2ybs`
- Battle/countdown/reveal: `atq9S7pp1rQ`
- Results: `EB9e7EhLQqo`

Music is available on both Host and Player devices. It automatically attempts to start the Lobby track on the landing page and after room entry, then switches each device to Battle and Results tracks without creating additional players. The previous track is paused or replaced. A Play/Pause fallback remains available because browsers may reject the automatic attempt. The player is paused when the tab is hidden, the room closes or the current screen has no music context. SFX volume, music volume and master mute are accessible controls; volume and mute preferences persist locally. Both range controls use isolated styling and update currently playing audio immediately.

YouTube playback still depends on network access, video embed permission, regional availability, account policy, ads and browser autoplay policy. API, playback and autoplay failures do not block gameplay. Ads and YouTube-controlled playback cannot be skipped or synchronized precisely. Music ducking uses the supported `setVolume()` API but cannot alter ad behavior. Audio-only presentation through a visually clipped embed may be restricted by future YouTube policy or player changes; local licensed music files remain the recommended production solution.

## Lifecycle and safety

- SFX begins only after keyboard/pointer interaction and failed `HTMLAudioElement.play()` promises are ignored safely.
- Event keys prevent duplicate correct, XP, Boss, lead, victory and countdown cues.
- `state:sync` restores only future warning/time-up timers; it does not replay Boss or result cues.
- Concurrent SFX is capped at four; dramatic cues temporarily duck YouTube music.
- Disposable timers and sounds stop on screen lifecycle, room close, mute and hidden-tab transitions.
- Missing or undecodable files update an accessible status message and never interrupt gameplay.
- No backend gameplay, scoring or Socket.IO contract was changed for audio.

## Files changed

- `public/js/audio.js` — SFX and YouTube audio manager.
- `public/js/app.js` — gameplay event integration.
- `public/index.html` — accessible audio controls and visible YouTube mount.
- `public/css/arena.css` — responsive audio control/player styling.
- `scripts/ui-smoke.cjs` — audio role, defaults, volume, mute, dedupe and missing-key checks.
- `docs/reports/AUDIO_IMPLEMENTATION_REPORT.md` — this report.

## Verification

- `node --check public/js/audio.js`, `public/js/app.js`, `scripts/ui-smoke.cjs`: passed.
- `npm.cmd test`: 84 passed, 0 failed.
- `node scripts/ui-smoke.cjs`: 25 screen/viewport combinations and the real Chrome multiplayer flow passed.
- Browser smoke checks Host/Player music separation before room creation, SFX volume, master mute, duplicate suppression, unknown-sound fallback, responsive controls, reconnect and cleanup.
- All supplied audio files passed `ffprobe` format/duration inspection.

## Remaining issues and recommendations

1. `button-click.mp3` is approximately 1.49 seconds, much longer than the requested 50–100 ms UI cue. Replace or trim the source to avoid a long tail during rapid navigation.
2. The requested sounds not supplied are not synthesized or substituted: copy success, room create, UI error, player leave, team switch, question enter, team score, Boss complete, connection lost/restored, game paused, tie-specific result, confetti pop, personal results and game restart.
3. Only WAV is supplied for most effects. Add MP3/OGG browser derivatives if older-browser or bandwidth testing requires them.
4. Verify all three YouTube videos manually in the deployment region and school network; embed permissions, audio-only presentation and ads can change independently of the game.
5. Test perceived loudness on the actual classroom projector and representative phones before release.
