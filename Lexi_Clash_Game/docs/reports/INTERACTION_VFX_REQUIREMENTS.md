# Interaction & VFX requirements — owner handoff

## Scope
Baseline UI is implemented; advanced particles, audio, choreography and illustrated animation are proposals. The game supports MC, Word Forge and a boss multiplier, not additional subject-selection modes. No new backend rules are requested.

## A. Existing reusable assets
|Use|Exact original paths (WebP counterpart in public/assets/optimized)|
|---|---|
|Correct|public/assets/icons/icon-correct.png; public/assets/mascots/mascot-celebrate.png; public/assets/effects/magic-sparkle.png|
|Incorrect|public/assets/icons/icon-incorrect.png; public/assets/mascots/mascot-thinking.png|
|XP|public/assets/icons/icon-xp.png; public/assets/decorative/gold-star.png|
|Victory|public/assets/icons/icon-trophy.png; public/assets/mascots/mascot-winner.png; public/assets/effects/confetti-burst.png|
|Boss|public/assets/Boss Badge.png; public/assets/decorative/gold-lightning.png; public/assets/effects/speed-burst.png|
|Lobby|public/assets/mascots/mascot-idle.png; public/assets/avatars/avatar-01.png through avatar-12.png|
|Reconnect|public/assets/mascots/mascot-loading.png; public/assets/icons/icon-reconnect.png|
|Teams|public/assets/Red Team Badge.png; public/assets/Blue Team Badge.png|
|Backgrounds|public/assets/background/background-join.png; background-battle.png; background-results.png|
Full file-by-file dimensions/alpha/usage are in ASSET_INTEGRATION_REPORT.md. Effect sheets are single still effects, not time-sequenced animation frames.

## B. Missing visual resources
No new P0 artwork is required. Fix existing quality issues before expanding art.
|Resource|Purpose/screen|Description|Size/ratio/alpha/format|Sprite sheet / AI suitability|Priority|
|---|---|---|---|---|---|
|Reading and speaking recrop|Future category UI|Complete book silhouette and microphone with no neighboring book fragment|512×512, 1:1, transparent PNG/WebP|No sheet needed; deterministic recrop first, AI not needed|P1 before these categories are used|
|Clean avatar 06 source|Lobby/results|Remove unintended dark mark near ear while preserving character|256×256, 1:1, transparent PNG|No sheet; original artist repair preferred|P1|
|Mascot celebration sequence (optional)|Victory|Same character, anchored feet, 6–8 coherent celebratory poses|Each 256×256; 2048×256 strip for 8 frames; transparent PNG master/WebP delivery|Sheet appropriate; AI draft needs continuity QA by animator|P2|
|Mascot idle sequence (optional)|Lobby only|Subtle blink, same bounds/pivot, no constant distracting movement|4 frames 256×256; 1024×256 strip; transparent|Sheet optional; prefer artist frames over inconsistent generated poses|P2|
No requested new trophy, empty-lobby drawing, success/failure illustration, particle texture, glow texture or boss badge: existing files/code cover them.

## C. Animation deliverables
Baseline needs no Lottie, Rive, shader texture or rig. CSS/WAAPI can transform the existing mascot without changing its drawing. Confetti rectangles/circles and simple star particles should be generated in code. Existing burst PNGs can fade/scale but cannot yield independently moving particles without splitting or code generation. SVG is suitable for a radial timer drawn in code. Only request sprite animation frames after P2 approval; provide frame count, fps (8–12), pivot, bounds, loop metadata and transparent padding. Lottie/Rive would introduce a separate runtime/art pipeline without a current requirement.

## D. Audio delivery
No audio files are currently present. Audio is optional P1/P2, never required to answer. Supply licensed masters (WAV 44.1/48kHz) plus web MP3 and OGG versions, normalized consistently with no clipping and short quiet tails. Values below are suggested relative categories, not mastered loudness guarantees.
|File proposal|Length|Loop|Volume category|Trigger|Priority|
|ui-click.mp3/.ogg|50–100ms|No|UI low (~0.15)|Valid button press|P2|
|answer-correct.mp3/.ogg|300–600ms|No|Feedback medium (~0.3)|Personal correct reveal|P1|
|answer-incorrect.mp3/.ogg|200–400ms|No|Feedback low (~0.2)|Personal incorrect reveal; gentle tone|P1|
|countdown-tick.mp3/.ogg|80–150ms|No|UI low (~0.2)|Changed countdown second, max once/second|P1|
|boss-intro.mp3/.ogg|800–1200ms|No|Stinger medium (~0.35)|Boss question begins|P1|
|score-up.mp3/.ogg|100–200ms|No|UI low (~0.15)|Team score delta, rate limited|P2|
|xp-reward.mp3/.ogg|200–400ms|No|UI low (~0.2)|Personal reward once|P2|
|victory.mp3/.ogg|2–3s|No|Stinger medium (~0.4)|Final winner once|P1|
|lobby-music.mp3/.ogg|30–60s|Yes seamless|Music low (~0.1)|Lobby only, explicit opt-in|P2|
Clicks/ticks and simple reward tones can be synthesized with Web Audio, so owner need not supply those unless branded sound is desired. Artist-supplied fanfare/music preferred. Add mute/volume, unlock after user gesture, no autoplay music, duck competing sounds, suspend when hidden. Prefer host-only shared stingers in a classroom to avoid many devices playing simultaneously; confirm desired audio policy before enabling.

## E. Technical resources
No new dependency required for P0 or proposed Canvas/Web Audio P1. Candidate install commands, bundle ranges and fallback decisions: VFX_TECHNOLOGY_DECISION.md. Need a representative low-end Android device, iPhone Safari, classroom projector and a throttled LAN test. GPU acceleration is not required by baseline; Canvas may use browser acceleration. Low tier falls back to static CSS/PNG/WebP, reduced motion disables particles. Owner need not supply shaders or a 3D model for current requirements.

## F. Owner action checklist
### Already available — no action
- [x] Approved palette and existing logo, team badges, boss badge, avatars, mascots.
- [x] Static success/failure/XP/trophy and three background images.
- [x] Category, decorative and still-effect art.
- [x] Existing room/game events and authoritative scoring.
### Must be supplied by owner for later acceptance
- [ ] Choose representative classroom/mobile devices and approve UI on actual projector.
- [ ] Confirm rights/source metadata for delivered artwork and any new audio.
- [ ] For branded audio: supply correct/incorrect, boss and victory cues; music only if desired.
- [ ] Review avatar 06 and reading/speaking source-quality repairs; no new art pack required.
- [ ] Optional P2 only: commission coherent mascot frame sequences after animation direction approval.
### Coding agent can implement
- [x] UI asset integration, WebP derivatives, button/focus/selection states.
- [x] Deadline display, pending submission lock, timer cleanup, reduced motion.
- [ ] Canvas confetti, mint particles, XP trails, team sweep and radial timer.
- [ ] Native tone synthesis, mute controls, audio loading/disposal, deduplication.
- [ ] Optional score count-up and keyed player entrance without replay on unrelated updates.

## Complete interaction matrix
Current behavior describes this refactor; desired animation may be future work. Durations in ms, S/M = small/medium complexity. All audio suggestions are unimplemented. Asset short names resolve through section A/inventory.
|Screen|Action/event|Current behavior|Desired feedback|Duration|Easing|Trigger|Audio|Asset|Technology|Cost|Priority|Complexity|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|All|Hover button|CSS lift|Lift 2px|140|ease-out|pointer hover|none|none|CSS|low|P0|S|
|All|Press button|CSS press|Translate/scale|140|ease-out|pointer active|click optional|none|CSS|low|P0|S|
|Join|Enter code|Native validation/help|Focus ring; preserve entered code on error|140|ease-out|input focus|none|none|CSS/HTML|low|P0|S|
|Join|Create/join pending|Disabled buttons, aria-busy|Inline progress wording|150|ease-out|room request|none|icon-join-room|DOM|low|P0|S|
|Join|Join success|Lobby renders|Single entrance; focus screen heading|260|ease-out|room:joined|join optional|mascot-welcome|CSS/WAAPI|low|P1|S|
|Join|Invalid/full/missing room|Vietnamese toast|Persistent field-associated error next|180|ease-out|error:notice|none|icon-warning|DOM/CSS|low|P0|M|
|Lobby|Player joins|Roster updates/avatar|Animate only new playerId, not entire roster|220|ease-out|lobby:update added ID|none|avatars/*|WAAPI|low|P1|M|
|Lobby|Player leaves|Offline text and dimming|Fade status, preserve position|180|ease-out|lobby:update disconnected ID|none|icon-offline|CSS|low|P1|S|
|Lobby|Switch team|Roster moves|FLIP card motion keyed by playerId|260|ease-out|lobby:update team change|none|team badges|WAAPI|medium|P1|M|
|Lobby|Copy code|Copy success/fallback text|Short confirmation|0|none|clipboard result|none|icon-copy-room-code|DOM|low|P0|S|
|Lobby|Start disabled|Requirement text|No motion|0|none|canStart false|none|none|HTML|low|P0|S|
|Lobby|Host starts|Server countdown|One focus transition|260|ease-out|game:countdown|countdown optional|mascot-ready|CSS|low|P0|S|
|Countdown|Starts/ticks|Stable DOM numbers|Single scale per second|220|ease-out|changed server-derived second|tick optional|mascot-ready|WAAPI|low|P1|S|
|Countdown|Zero|GO then server question|Fade only on actual transition|180|ease-out|question:show|go optional|none|CSS|low|P1|S|
|Question|Question appears|Card entrance|Current opacity/translate|260|ease-out|question:show|none|word-forge if applicable|CSS|low|P0|S|
|Question|Select option|Selected tint, immediate lock|Border and press feedback|140|ease-out|click while eligible|click optional|none|CSS/DOM|low|P0|S|
|Question|Submit text|Immediate lock; pending status|Acknowledged label; never clear draft on counts|0|none|answer:submit / answer:ack|none|none|DOM|low|P0|M|
|Question|Other player answers|Status-only update|No input redraw or focus change|0|none|round:submissionCount|none|none|DOM|low|P0|M|
|Reveal|Correct|Mascot, check, XP entrance|Mint burst away from answer|600|ease-out|round:personal isCorrect|correct optional|mascot-celebrate; magic-sparkle|Canvas/CSS|medium|P1|M|
|Reveal|Incorrect|Encouragement and cross|Gentle coral highlight; no harsh flashing|220|ease-out|round:personal false|incorrect optional|mascot-thinking; icon-incorrect|CSS|low|P1|S|
|Reveal|Score increases|Authoritative totals shown|Pulse changed score only|240|ease-out|round:result delta|score optional|icon-score|WAAPI|low|P1|S|
|Reveal|XP increases|XP entrance|Short bounded trail to summary|500|ease-out|round:personal xpEarned|xp optional|icon-xp; gold-star|Canvas|medium|P1|M|
|Question|Timer <=5s|Bounded 3-cycle pulse + red text|Keep current; no flashing|700|ease|remaining 0<ms<=5000|tick optional|none|CSS|low|P0|S|
|Question|Time expires|Controls disabled; text status|No animation needed|0|none|endsAt reached|none|none|DOM|low|P0|S|
|Boss|Starts|Badge, gold border|Gold energy behind card; short title entrance|600|ease-out|question:show isBossRound|boss optional|Boss Badge; gold-lightning|CSS/Canvas|medium|P1|M|
|Boss|Ends|Normal reveal|Fade gold atmosphere|260|ease-out|round:result boss|none|none|CSS|low|P1|S|
|Reveal|Team takes lead|Scores update|Team-colored sweep with text; deduplicated|400|ease-out|compare old/new authoritative totals|none|team badges|CSS/WAAPI|low|P1|M|
|All|Connection lost|Persistent banner/toast|Static actionable status|0|none|disconnect|none|mascot-loading optional|DOM|low|P0|S|
|All|Reconnect success|Token restore and snapshot|Short restored status; never replay rewards|180|ease-out|state:sync after reconnect|none|icon-reconnect|DOM/CSS|low|P1|M|
|Paused|Host disconnect|Loading mascot, pause explanation|Static waiting state|0|none|room:paused|none|mascot-loading|DOM|low|P0|S|
|Results|Winner announced|Trophy entrance/mascot|Confetti overlay; tie-aware neutral effect|1200|ease-out|game:over once per game|victory optional|trophy; mascot-winner; confetti-burst|Canvas/WAAPI|medium|P1|M|
|Results|Results open|Scores, badges, personal review|Optional decorative score count-up|700|ease-out|game:over; never on personal update|none|avatars; trophy|WAAPI|low|P1|M|
|Results|Restart/return lobby|Host game:restart|Fresh lobby entrance, reset effects|260|ease-out|game:restarted|none|mascot-idle|CSS|low|P0|S|
|Results|Close room|Toast then join|Cancel all effects and timers|0|none|room:closed|none|none|DOM|low|P0|S|
|All|Reduced motion/hidden tab|CSS override; future controller|Immediate final state/cancel particles|0|none|media/visibility change|mute hidden optional|none|DOM|low|P0|M|

## Effect concepts and acceptance
Correct: mint Canvas particles behind feedback card, 12–24 particles, 600ms, never cover correct answer. Incorrect: CSS coral border and optional 2px shake (disabled with reduced motion); encouragement stays readable. XP: generated gold dots travel from reward label toward summary, never move authoritative DOM score. Countdown: native text + CSS/WAAPI scale; optional SVG radial progress, no image needed. Boss: supplied lightning and speed burst behind card, gold background transition, 600ms maximum; no WebGL. Lead: CSS team sweep plus team name; deduplicate tie transitions. Victory: procedural Canvas confetti and existing trophy/mascot, <=1.2s, tie uses both colors. Reconnect: static waiting mascot and DOM status, optional small CSS spinner; restore from snapshot without replaying any effect.

All overlays must be pointer-events:none and aria-hidden. Cancel animation handles, frame callbacks and audio sources on exit. Effects cannot delay answer submission or server transitions. See roadmap for staged acceptance.

