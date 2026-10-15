# UX/UI audit — 2026-10-15

## Implementation inspected
Vanilla ES modules, HTML template renderers, one CSS stylesheet; Express 4 and Socket.IO 4. No bundler, router, React, animation dependency or frontend test runner. Screens: join/create, lobby/team assignment, countdown, MC/Word Forge/boss question, reveal, results/review, host pause and disconnection. Server owns deadlines, XP, battle score, progression and reconnect tokens. Existing `npm test` uses node:test and socket.io-client. No lint/build/typecheck scripts.

## Findings before refactor
|Severity|Finding / impact|Correction|
|---|---|---|
|High|Every submission count redraws question, erasing Word Forge input/focus and creating another timer|Update only status text; dispose screen timer|
|High|Answer buttons stay enabled until acknowledgement|Immediate pending lock and selected state, recover errors|
|High|Socket transport reconnect does not rejoin application room|Restore existing token on every connection|
|High|No reduced-motion support; timer pulses continuously|Reduced-motion override and bounded urgency|
|High|Unescaped question/review template values; name initial inserted as HTML|Central escape helper for dynamic strings|
|Medium|Assets entirely unused; emoji trophy and letter avatars|Use supplied badges, mascot, avatars, icons and backgrounds|
|Medium|Palette differs from approved identity; weak button/card hierarchy|Official tokens, dark accessible text variants, stronger cards|
|Medium|36px move controls; 280px start button on 320px display; long names overflow|44px targets, min-width:0, wrapping, responsive layouts|
|Medium|Join has no pending/error status, recovery toast disappears|Pending button feedback and persistent connection banner|
|Medium|Main region announces full redraws; no screen focus management|Focus heading on screen changes, targeted live status|
|Low|Host start tooltip refers to unfinished milestone|Remove internal implementation wording|

## Visual and responsive review
Original single breakpoint: 700px. Typography uses system sans; spacing 8–48px without scale, hardcoded status colors and gradients. Two-column cards collapse but answer input, long player names and action groups need explicit width constraints. Background has no brand composition. Results lack hierarchy and personal avatar. Countdown redraws five times/second. Static host scoreboard has no badges. Team labels supplement color, which should be preserved.

## Scope / risks
Modify public/index.html, public/css/style.css, public/js/app.js, all five screen modules; add shared ui.js and visual CSS. No backend contract or scoring changes. Preserve 6-character code, identity tokens, existing host controls and server timing. Asset source quality and payload sizes need inventory; category crops must be checked before use. A fresh rejoin snapshot does not expose current submission; server remains authoritative for duplicate rejection. Browser QA must distinguish simulated screens from real socket integration.
