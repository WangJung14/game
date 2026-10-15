# Future VFX implementation roadmap

## Delivery order
Finish P0 acceptance on physical devices, then ship one small P1 effect at a time. P2 depends on measured need and art approval, not a requirement to adopt a 3D engine. Existing gameplay events and backend contracts remain authoritative.

|Milestone|Scope|Dependencies|Complexity|Acceptance criteria|
|---|---|---|---|---|
|P0.1 — baseline UI (implemented)|Tokens, reusable artwork/score helpers, join/lobby/countdown/question/reveal/results and recovery|Existing PNGs and state/event contracts|Medium|No missing artwork; touch controls >=44px; supported mobile widths no horizontal overflow; no gameplay changes|
|P0.2 — interaction reliability (implemented)|Pending lock, draft/focus preservation on submission counts, timer disposal, reconnect token restore, reduced motion|Question renderer lifecycle and app state|Medium|Real browser MC/WF flow; repeated click cannot send twice while pending; input unaffected by other answers; successful application rejoin|
|P0.3 — release acceptance (remaining)|Safari, physical Android/iPhone, projected display, keyboard/screen reader, slow LAN, invalid-session recovery|Owner device access|Medium|Readable projector at viewing distance; keyboard focus predictable; live labels not noisy; no missing controls; document failures before release|
|P1.1 — effect lifecycle (implemented)|Effect controller with deduplication, reduced-motion/visibility listeners and teardown|P0 signoff|Medium|Verified: reconnect snapshots do not replay Boss; zero idle RAF after completion; screen changes dispose effects|
|P1.2 — score/team feedback (implemented)|Keyed player movement and authoritative lead change sweep|Controller, stable IDs and previous scores|Medium|Leader compares server totals; ties are ignored; overlay never blocks input|
|P1.3 — bounded particles (implemented)|Correct burst, XP trail, Boss energy and victory confetti|Controller and Chrome lifecycle checks|Medium|14–24 mobile and 22–72 desktop particles; <=1.55s; DPR <=1.5; reduced-motion and hidden-tab cancellation|
|P1.4 — optional audio|Mute/volume, user-gesture unlock, correct/incorrect/countdown/boss/victory cues|Owner audio/policy approval|Medium|No autoplay; no essential information audio-only; no repeated fanfare on sync; hidden-tab suspension; classroom avoids multi-device cacophony|
|P2.1 — mascot animation|Optional artist-approved idle/celebration sequences|Consistent frames, pivot and timing metadata|Medium|No clipping/position jumps; atlas lazy loaded; no constant movement while reading; static reduced-motion pose|
|P2.2 — cinematic sequences|Boss title choreography and end-game scene|P1 performance evidence|High|Same accessibility and frame budget; GSAP only if WAAPI complexity warrants; timeline cleanups tested|
|P2.3 — renderer escalation (conditional)|Evaluate Pixi for high sprite/filter load; Three only for approved real 3D feature|Measured Canvas bottleneck or signed-off 3D design|High|Prototype benchmark against baseline; bundle/texture/context budget documented; context-loss and non-GPU fallback; no regression to gameplay|

## Planned effect contract
Use a room/game/question/event identity to deduplicate rewards. A resumed snapshot renders final state without replaying victory. All particles are decorative; DOM owns answer controls, score labels, text and accessibility. Abort effects immediately on screen change; do not await animations in socket handlers. Keep audio enabled/muted preference separate from gameplay.

## Release checklist
- Run `npm.cmd test` and `node scripts/ui-smoke.cjs`.
- Manually verify Safari and actual 320/390px-class phones, tablet, 1440×900 host and 1920×1080 projector.
- Test long names, 30 players, late join, host pause, invalid/expired tokens, offline/online, simultaneous answers and restart.
- Record network bytes, CPU trace, memory after 20 rounds and reduced-motion behavior; do not infer FPS from desktop screenshots.
- Verify artwork paths and license provenance; request no new generic art until an existing asset/code solution is ruled out.
- Keep optional audio and P2 engine disabled until separately accepted.

