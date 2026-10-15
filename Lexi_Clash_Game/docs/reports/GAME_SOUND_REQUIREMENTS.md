# Game Sound Requirements

**Date:** 2026-10-16  
**Status:** Specification only. No audio file, player, dependency or playback code is included.

## Delivery standard

Supply a clean WAV master (48 kHz, 24-bit preferred) and browser versions in MP3 plus OGG. UI sounds should have short tails and no leading silence. Avoid clipping; master all effects to a consistent perceived level. Music should loop seamlessly. Final playback needs a user-controlled mute/volume setting, browser user-gesture unlock, hidden-tab suspension and no audio-only information.

For classroom use, shared dramatic cues should normally play on the Host/projector only. Personal answer and XP cues should play on the relevant Player device only. “Both” means each connected role may play the cue once from its own event.

## Recommended files

| Filename | Trigger / event | Purpose | Duration | Formats | Style / description | Priority | Device |
|---|---|---|---|---|---|---|---|
| `ui-button-click` | Valid primary/secondary button press | Confirm a deliberate UI action | 50–100 ms | WAV, MP3, OGG | Soft rounded digital tap; no sharp transient | Required | Both |
| `ui-copy-success` | Room code copied successfully | Confirm clipboard action | 120–220 ms | WAV, MP3, OGG | Light two-note sparkle | Optional | Host |
| `room-create-success` | `room:created` | Confirm arena creation | 300–500 ms | WAV, MP3, OGG | Warm violet power-up chime | Optional | Host |
| `room-join-success` | `room:joined` | Welcome player and confirm join | 250–450 ms | WAV, MP3, OGG | Friendly ascending two-note cue | Required | Player |
| `ui-error` | `error:notice` validation/recovery error | Draw attention without punishment | 180–300 ms | WAV, MP3, OGG | Muted coral thud with soft descending tone | Required | Affected device |
| `player-join` | Lobby update adds a player | Make lobby activity noticeable | 150–280 ms | WAV, MP3, OGG | Short pop/bubble | Optional | Host |
| `player-leave` | Lobby update marks/removes player | Indicate roster change | 180–300 ms | WAV, MP3, OGG | Gentle downward soft pop | Optional | Host |
| `team-switch` | Lobby update changes a player's team | Reinforce card movement/team assignment | 220–380 ms | WAV, MP3, OGG | Quick stereo-neutral energy swoosh | Optional | Host and switched Player |
| `game-start` | Host presses start / `game:countdown` begins | Announce transition from lobby | 500–900 ms | WAV, MP3, OGG | Competitive but friendly arena rise | Required | Host |
| `countdown-tick` | Each changed countdown second above zero | Establish timing | 70–130 ms | WAV, MP3, OGG | Dry electronic tick with slight pitch rise | Required | Host |
| `countdown-go` | Countdown reaches zero / first question begins | Release anticipation | 250–450 ms | WAV, MP3, OGG | Bright impact and short whoosh | Required | Host |
| `question-enter` | Fresh `question:show` | Mark a new question without distracting reading | 150–280 ms | WAV, MP3, OGG | Very soft card whoosh | Optional | Both |
| `answer-select` | Player selects an MC option | Immediate tactile confirmation | 60–120 ms | WAV, MP3, OGG | Crisp soft click, distinct from submit | Required | Player |
| `answer-submit` | Answer acknowledged by `answer:ack` | Confirm server receipt | 120–220 ms | WAV, MP3, OGG | Short lock-in tone | Required | Player |
| `answer-correct` | Personal `round:personal.isCorrect === true` | Reward learning success | 450–750 ms | WAV, MP3, OGG | Mint sparkle burst, ascending major interval | Required | Player |
| `answer-incorrect` | Personal incorrect round result | Give gentle corrective feedback | 300–550 ms | WAV, MP3, OGG | Soft coral wobble/descending minor second; never buzzer harsh | Required | Player |
| `xp-reward` | Personal result with XP earned | Reinforce progression | 250–500 ms | WAV, MP3, OGG | Golden coin/star trail with 3–5 ascending particles | Required | Player |
| `team-score-up` | `round:result` contains positive round delta | Reinforce team progress | 180–350 ms | WAV, MP3, OGG | Compact score pulse; pitch may scale within a narrow range | Optional | Host |
| `team-lead-change` | Authoritative leader changes after `round:result` | Highlight match momentum | 550–900 ms | WAV, MP3, OGG | Red/blue-neutral energy sweep ending in confident hit | Required | Host |
| `timer-warning` | Question timer first crosses five seconds | Warn without repeating every render | 180–300 ms | WAV, MP3, OGG | Low-volume urgent pulse | Optional | Player and Host |
| `time-up` | Active question reaches `endsAt` | Signal input lock | 250–450 ms | WAV, MP3, OGG | Clean stop/chime, not an error buzzer | Required | Both |
| `boss-round-intro` | Fresh Boss `question:show` | Announce multiplier/challenge | 900–1400 ms | WAV, MP3, OGG | Gold lightning, low impact, violet energy rise | Required | Host |
| `boss-round-complete` | Boss `round:result` | Resolve the special round | 500–900 ms | WAV, MP3, OGG | Energy release with short positive/neutral ending | Optional | Host |
| `connection-lost` | Socket `disconnect` | Alert user to unavailable interaction | 250–450 ms | WAV, MP3, OGG | Soft low double pulse; not alarming | Required | Affected device |
| `connection-restored` | Successful rejoin and `state:sync` | Confirm recovery | 300–500 ms | WAV, MP3, OGG | Calm ascending reconnect chime | Required | Affected device |
| `game-paused` | `room:paused` after Host disconnect | Explain interruption through feedback | 300–550 ms | WAV, MP3, OGG | Gentle power-down tone | Optional | Player |
| `victory-fanfare` | Fresh `game:over` with a winner | Celebrate final result | 2–3 s | WAV, MP3, OGG | Energetic classroom-safe brass/synth fanfare | Required | Host |
| `tie-result` | `game:over.winner === 'tie'` | Celebrate both teams fairly | 1.5–2.5 s | WAV, MP3, OGG | Balanced uplifting resolve without winner accent | Required | Host |
| `confetti-pop` | Victory confetti VFX begins | Add impact to visual burst | 250–500 ms | WAV, MP3, OGG | Layered paper pops and soft sparkle | Optional | Host |
| `personal-results` | `game:personal` arrives | Mark personal summary availability | 350–650 ms | WAV, MP3, OGG | Reflective achievement chime | Optional | Player |
| `game-restart` | `game:restarted` | Signal fresh lobby/session | 350–600 ms | WAV, MP3, OGG | Upward reset swoosh | Optional | Both |
| `room-close` | `room:closed` | Signal session ending | 350–650 ms | WAV, MP3, OGG | Warm descending close, not failure-themed | Required | Both |
| `lobby-music-loop` | Lobby while explicitly enabled | Give waiting state atmosphere | 45–90 s loop | WAV master, MP3, OGG | Light modern edtech groove, 90–110 BPM, no vocals | Optional | Host only |
| `battle-music-loop` | Active questions if explicitly enabled | Maintain energy across rounds | 60–120 s loop | WAV master, MP3, OGG | Low-density competitive electronic bed, no distracting melody | Optional | Host only |
| `results-music-loop` | Results screen if explicitly enabled | Sustain celebration while reviewing | 30–60 s loop | WAV master, MP3, OGG | Uplifting, calmer than fanfare, seamless loop | Optional | Host only |

## Playback rules for the next phase

- Unlock audio only after a user gesture. Never attempt audible autoplay on page load.
- Store master mute, effects volume and music volume locally. Default music off until the owner approves classroom behavior.
- Deduplicate sound with the same room/question/game keys used by VFX. A reconnect snapshot must not replay correct, XP, Boss or victory audio.
- Rate-limit lobby joins and score pulses so multiple simultaneous events do not create noise.
- One countdown tick per displayed second; never from the 200 ms timer interval.
- Pause loops and stop disposable sources while the tab is hidden. Resume only if the screen still owns that loop.
- Duck music under Boss intro, correct feedback and victory fanfare.
- Keep gameplay and error messages readable without sound. Provide visible states for every audible cue.
- Personal correct/incorrect/XP sounds stay on Player devices. Shared countdown/Boss/lead/victory cues default to Host/projector to prevent a classroom echo.
- Recommended first delivery: required non-music cues only. Add optional loops after testing in a real classroom.

