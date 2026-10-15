# VFX technology decision — 2026-10-15

## Decision
Keep DOM/CSS for baseline. Add native Web Animations API only for cancellable sequences; add one bounded Canvas 2D overlay for P1 particles after measurement. No animation package or WebGL context is installed by this refactor. This vanilla ES module application has no bundler, so npm installation alone does not make bare package imports work in the browser.

## Comparison
Estimates below are planning ranges for minified/compressed application additions, not measured production bundles. Import selection, version, plugins and compression alter results; measure a locked production build before adoption.
|Technology|Compatibility / visual result|Mobile CPU/GPU / size estimate|Implementation, maintenance, learning|Accessibility / decision|
|---|---|---|---|---|
|CSS animations|Native DOM; excellent button/card feedback|No library bytes; transforms/opacity may composite|Low complexity, low maintenance|Reduced-motion media query; use now|
|Web Animations API|Native JS; cancellable sequences|No library bytes; similar compositor opportunities|Low–medium; track Animation handles|Cancel on screen disposal and preference change; recommended next|
|Motion JavaScript|Vanilla API available; springs/sequences|Official mini 2.3 KB, hybrid 18 KB claims; validate delivered build|Medium; adds packaging/version upkeep|Explicit reduced-motion policy; optional if WAAPI becomes verbose|
|Framer Motion / Motion React|React component integration|React runtime plus animation library would be extra|High architecture cost here|Do not introduce React just for effects|
|GSAP|Vanilla DOM/SVG timelines; polished choreography|Rough budget 25–50 KB core, plugins extra; CPU depends on properties|Medium; clear timeline disposal required|App owns motion settings; optional for complex cinematic sequences|
|Canvas 2D|Native; excellent sparse confetti/trails|No library bytes; CPU draw loop and bitmap/GPU compositing cost|Medium; explicit resize, DPR, pooling and teardown|Nonsemantic overlay; DOM retains all essential information; P1 choice|
|PixiJS|2D sprite batching, filters, many moving sprites|Budget hundreds of KB; GPU/WebGL/WebGPU and texture memory|Medium–high; renderer lifecycle and atlas management|DOM fallback and context-loss handling needed; evaluate only after Canvas bottleneck|
|Three.js|3D camera, lighting, geometry, depth|Budget hundreds of KB; GPU context plus models/textures|High; material/geometry disposal, camera tuning|DOM fallback; not justified for current 2D UI|
|WebGL shaders|Custom distortion, glow and energy fields|Shader files small; renderer and fill-rate can be expensive|High GPU expertise/testing burden|No flashing and reduced-motion fallback; P2 only|
|Web Audio API|Native sounds, mixing, generated tones|No library; decoded audio memory and DSP CPU|Medium; unlock and suspend context correctly|Mute/volume, no audio-only information; P1|
|Howler.js|Audio loading, sprites and cross-browser abstraction|Planning budget 7–15 KB plus audio|Low–medium; still needs user gesture and lifecycle|App owns mute state; optional for multiple sound assets|

Three.js becomes reasonable only with an approved true 3D requirement (rotating trophy model with camera/light interaction). A 2D trophy scale/fade, team sweep or confetti does not justify it. Canvas suits tens of short-lived particles; Pixi may be appropriate for hundreds of batched sprites or repeated filters after profiling. CSS is preferable to GSAP for ordinary interaction states; GSAP earns its dependency when coordinated timelines become difficult to maintain.

Multiple systems are justified only with clear ownership: CSS controls UI, Canvas owns particle overlay, Web Audio owns sound. Never have two engines write the same transform. Do not adopt GSAP, Motion, Pixi and Three together for this application.

## Architecture for future work
Presentation effect controller receives existing state transitions, keyed by room/question/event. It never emits gameplay events or waits before advancing game state. Methods: play(effect, payload), stopAll(), setReducedMotion(), dispose(). Deduplicate on reconnect/snapshot; authoritative scores stay immediate, animated numbers are decorative copies. One overlay, pointer-events:none, aria-hidden:true, below dialogs and above background; never obscure choices. On screen change/visibility hidden: cancel animation frames, dispose animations, stop sources; on re-entry reconstruct from state without replaying rewards. No permanent render loop.

## Performance budgets / acceptance targets (not measured results)
- Baseline: zero WebGL contexts and zero added JS runtime dependencies.
- Initial visible art target <=500 KiB transfer; measure cold/warm cache on classroom LAN.
- P1 Canvas: 24 particles on low tier, <=80 on desktop, <=1.2s lifetime, DPR capped at 1.5; stop when idle.
- Target <=4ms effect work per frame on target hardware; reduce counts if exceeded. Do not assert FPS without traces.
- No animation changes gameplay deadlines; no forced layout loops; 44px minimum touch targets.
- Reduced motion uses immediate final states and no particles. Hidden tab stops decorative work.
- Keep text contrast >=4.5:1 and large text >=3:1; use dark variants for success/warning/team text, not saturated accent text on white.
- Profile Chrome Android low-end device and Safari iPhone before P1 release. WebP byte reductions are measured separately; FPS/INP not yet measured.

## Installation / packaging
Recommended baseline and Canvas/Web Audio phase: no npm install required.
Optional candidate evaluation commands: `npm.cmd install --save-exact motion`, `npm.cmd install --save-exact gsap`, `npm.cmd install --save-exact pixi.js`, `npm.cmd install --save-exact three`, `npm.cmd install --save-exact howler`.
Run only the selected candidate, inspect lockfile/license, then vendor its supported browser distribution or introduce an explicitly reviewed bundler. Do not serve node_modules wholesale, rely on an unpinned CDN, or assume Node package resolution in native browser modules.

## Primary references consulted
- [Motion animate](https://motion.dev/docs/animate): native JS API and mini/hybrid footprint.
- [GSAP docs](https://gsap.com/docs/v3/GSAP/): timeline orchestration.
- [Pixi performance guidance](https://pixijs.com/8.x/guides/concepts/performance-tips): batching and GPU workload considerations.
- [Three.js fundamentals](https://threejs.org/manual/pages/fundamentals.html): 3D scene, geometry and rendering responsibilities.
- [MDN Web Animations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API): native animation controls.
- [MDN Canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas): bounded drawing and scaling.
- [MDN autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay): user activation and audio restrictions.
- [Howler project](https://github.com/goldfire/howler.js): optional audio abstraction; verify selected version before installation.

