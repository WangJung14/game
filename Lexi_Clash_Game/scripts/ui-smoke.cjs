const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createLexiServer } = require('../server');
const { io } = require('socket.io-client');

async function main() {
  const server = createLexiServer({
    gameOptions: { countdownMs: 1800, resultMs: 1000, random: () => 0 },
    questions: [
      { id: 'qa-mc', type: 'multiple_choice', prompt: 'Pick B', options: [{ id: 'A', text: 'First' }, { id: 'B', text: 'Second' }], correctAnswer: 'B', acceptedAnswers: ['B'], explanation: 'B is correct.', timeLimitSec: 3, isBossRound: false },
      { id: 'qa-wf', type: 'word_forge', prompt: 'Type library', correctAnswer: 'library', acceptedAnswers: ['library'], explanation: 'Library is correct.', timeLimitSec: 6, isBossRound: true }
    ]
  });
  const address = await server.listen(0);
  const origin = `http://127.0.0.1:${address.port}`;
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'lexi-ui-'));
  const executable = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let client;
  const sockets = [];
  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try { port = (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await wait(100); }
    }
    assert.ok(port, 'Headless Chrome debugging port available');
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${origin}`, { method: 'PUT' })).json();
    client = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { client.onopen = resolve; client.onerror = reject; });
    let sequence = 0;
    const pending = new Map();
    const errors = [];
    client.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
      if (pending.has(message.id)) {
        const { resolve, reject, timer } = pending.get(message.id);
        clearTimeout(timer);
        pending.delete(message.id);
        message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
      }
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
      pending.set(id, { resolve, reject, timer });
      client.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.qaIntervals = new Set(); window.qaFrames = new Set(); const originalInterval = window.setInterval.bind(window); const originalClear = window.clearInterval.bind(window); const originalFrame = window.requestAnimationFrame.bind(window); const originalCancelFrame = window.cancelAnimationFrame.bind(window); window.setInterval = (...args) => { const handle = originalInterval(...args); window.qaIntervals.add(handle); return handle; }; window.clearInterval = (handle) => { window.qaIntervals.delete(handle); originalClear(handle); }; window.requestAnimationFrame = (callback) => { let handle; handle = originalFrame((time) => { window.qaFrames.delete(handle); callback(time); }); window.qaFrames.add(handle); return handle; }; window.cancelAnimationFrame = (handle) => { window.qaFrames.delete(handle); originalCancelFrame(handle); };` });
    await send('Page.navigate', { url: origin });
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (await evaluate('Boolean(document.querySelector("#join-form"))')) break;
      await wait(100);
    }
    const audioChecks = await evaluate(`(async () => {
      const audio = await import('/js/audio.js');
      const landingMusicControlsVisible = !document.querySelector('#host-music-controls').hidden;
      audio.audioDebug.settings.musicEnabled = false;
      audio.setAudioContext('player', 'lobby');
      const playerMusicVisible = !document.querySelector('#host-music-controls').hidden;
      audio.setAudioContext('host', 'lobby');
      const hostMusicVisible = !document.querySelector('#host-music-controls').hidden;
      const musicDefaultOff = document.querySelector('#music-toggle').getAttribute('aria-pressed') === 'false';
      const panelStartsClosed = document.querySelector('#audio-controls').classList.contains('collapsed');
      document.querySelector('#audio-panel-toggle').click();
      const panelOpens = !document.querySelector('#audio-controls').classList.contains('collapsed') && document.querySelector('#audio-panel-toggle').getAttribute('aria-expanded') === 'true';
      document.dispatchEvent(new KeyboardEvent('keydown', {key:'Tab'}));
      const first = audio.playSfx('answerSelect', 'qa-dedupe');
      const duplicate = audio.playSfx('answerSelect', 'qa-dedupe');
      const missing = audio.playSfx('notAvailable', 'qa-missing');
      document.querySelector('#sfx-volume').value = '42';
      document.querySelector('#sfx-volume').dispatchEvent(new Event('input', {bubbles:true}));
      document.querySelector('#audio-mute').click();
      const muted = audio.audioDebug.settings.muted;
      document.querySelector('#audio-mute').click();
      audio.setAudioContext('player', 'join');
      document.querySelector('#audio-panel-toggle').click();
      return {landingMusicControlsVisible, playerMusicVisible, hostMusicVisible, musicDefaultOff, panelStartsClosed, panelOpens, first, duplicate, missing, muted, sfxVolume: audio.audioDebug.settings.sfxVolume};
    })()`);
    assert.deepEqual(audioChecks, {landingMusicControlsVisible:true, playerMusicVisible:true, hostMusicVisible:true, musicDefaultOff:true, panelStartsClosed:true, panelOpens:true, first:true, duplicate:false, missing:false, muted:true, sfxVolume:.42});
    const output = path.join(__dirname, '../docs/reports/screenshots');
    await fs.mkdir(output, { recursive: true });
    const fixtures = {
      lobby: { role: 'host', roomCode: 'ABCDEF', canStart: true, players: [{ playerId: 'one', displayName: 'Nguyễn Minh Anh', team: 'red', isConnected: true, isLeader: true }, { playerId: 'two', displayName: 'Bạn đang offline', team: 'blue', isConnected: false, isLeader: true }] },
      question: { role: 'player', playerId: 'one', playerTeam: 'red', players: [{ playerId: 'one', isLeader: true }], submissionCount: { submitted: 1, total: 2 }, question: { questionId: 'preview', roundNumber: 8, totalRounds: 8, type: 'multiple_choice', prompt: 'Choose the correct sentence.', options: [{ id: 'A', text: 'She goes to school every day.' }, { id: 'B', text: 'She go to school every day.' }], endsAt: Date.now() + 300000, isBossRound: true, isLeaderDuel: true } },
      reveal: { role: 'player', personalRound: { isCorrect: true, xpEarned: 110 }, roundResult: { roundNumber: 1, totalRounds: 8, correctAnswer: 'A', explanation: 'Use goes with she.', isLeaderDuel: true, leaderDuelResult: { winner: 'red', red: { bonus: 100, penalty: 0 }, blue: { bonus: 0, penalty: 100 } }, teamScores: { red: { battleScore: 200 }, blue: { battleScore: 0 } } } },
      results: { role: 'player', playerId: 'one', gameResult: { winner: 'red', teamScores: { red: { battleScore: 720, totalXP: 840 }, blue: { battleScore: 600, totalXP: 760 } }, leaderboard: [{ rank: 1, playerId: 'one', displayName: 'Nguyễn Minh Anh', team: 'red', isLeader: true, xp: 840, accuracy: .875 }, { rank: 2, playerId: 'two', displayName: 'Lan', team: 'blue', isLeader: true, xp: 760, accuracy: .75 }] }, personalResult: { xp: 840, accuracy: .875, missedQuestions: [{ prompt: 'A question to review', correctAnswer: 'library' }] } }
    };
    for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1440, 900], [1920, 1080]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
      for (const screen of ['join', 'lobby', 'question', 'reveal', 'results']) {
        await evaluate(`(async () => { window.previewCleanup?.(); document.body.dataset.screen = '${screen}'; const module = await import('/js/screens/${screen}Screen.js'); const container = document.querySelector('#app'); const actions = {onCreate(){},onJoin(){},onMovePlayer(){},onStart(){},onSubmit(){},onNext(){},onRestart(){},onClose(){}}; window.previewCleanup = module.render${screen[0].toUpperCase() + screen.slice(1)}Screen(container, ${screen === 'join' ? 'actions' : `${JSON.stringify(fixtures[screen])}, actions`}); await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); })()`);
        await wait(450);
        const metrics = await evaluate(`({overflow: document.documentElement.scrollWidth > innerWidth, broken: [...document.images].filter(image => !image.naturalWidth).map(image => image.src), small: [...document.querySelectorAll('button,input')].filter(element => element.getClientRects().length && element.getBoundingClientRect().height < 44).length})`);
        assert.equal(metrics.overflow, false, `${screen} ${width}: horizontal overflow`);
        assert.deepEqual(metrics.broken, [], `${screen} ${width}: missing assets`);
        assert.equal(metrics.small, 0, `${screen} ${width}: undersized controls`);
        if (width === 390 || width === 1440) {
          const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
          await fs.writeFile(path.join(output, `${screen}-${width}.png`), Buffer.from(screenshot.data, 'base64'));
        }
        console.log(`PASS ${screen} ${width}x${height}: overflow, assets, targets`);
      }
    }
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.trophy')).animationName`), 'none');
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await evaluate(`(async () => { window.previewCleanup?.(); const module = await import('/js/screens/questionScreen.js'); const container = document.querySelector('#app'); window.previewCleanup = module.renderQuestionScreen(container, {role:'host',submissionCount:{submitted:2,total:2},question:{questionId:'host-stop',roundNumber:1,totalRounds:1,type:'multiple_choice',prompt:'Host control',options:[{id:'A',text:'A'}],endsAt:Date.now()+10000,isBossRound:false}}, {onStop(){},onSubmit(){}}); })()`);
    assert.equal(await evaluate('document.querySelector("#stop-question")?.disabled'), false, 'Host stop button enables when everyone answered');
    await evaluate('window.previewCleanup?.()');
    const until = async (expression) => {
      for (let attempt = 0; attempt < 240; attempt += 1) {
        if (await evaluate(expression)) return;
        await wait(50);
      }
      throw new Error(`Timed out: ${expression}`);
    };
    const event = (socket, name) => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Socket timeout ${name}`)), 10000);
      socket.once(name, (payload) => { clearTimeout(timeout); resolve(payload); });
    });
    const host = io(origin, { transports: ['websocket'] });
    const other = io(origin, { transports: ['websocket'] });
    sockets.push(host, other);
    await Promise.all([event(host, 'connect'), event(other, 'connect')]);
    const created = event(host, 'room:created');
    host.emit('room:create');
    const room = await created;
    const joined = event(other, 'room:joined');
    other.emit('room:join', { roomCode: room.roomCode, displayName: 'Other player' });
    await joined;
    await send('Page.navigate', { url: origin });
    await until('Boolean(document.querySelector("#join-form"))');
    await until('(async () => (await import("/js/socketClient.js")).socket.connected)()');
    await evaluate(`document.querySelector('#room-code').value = '${room.roomCode}'; document.querySelector('#display-name').value = 'Browser player'; document.querySelector('#join-form').requestSubmit()`);
    await until('Boolean(document.querySelector(".room-code"))');
    assert.equal(await evaluate('location.pathname'), `/room=${room.roomCode}`, 'Room URL contains the active room code');
    host.emit('game:start');
    await until('Boolean(document.querySelector(".vfx-countdown"))');
    await until('[...document.querySelectorAll(".vfx-countdown img")].every(image => image.complete && image.naturalWidth)');
    await wait(1100);
    const ringOffset = await evaluate(`(() => { const rect = document.querySelector('.vfx-countdown-ring').getBoundingClientRect(); return {x: Math.abs(rect.left + rect.width / 2 - innerWidth / 2), y: Math.abs(rect.top + rect.height / 2 - innerHeight / 2)}; })()`);
    assert.ok(ringOffset.x < 2 && ringOffset.y < 2, 'Countdown ring remains centered after WAAPI completes');
    await until('Boolean(document.querySelector(".option"))');
    assert.equal(await evaluate('Boolean(document.querySelector(".duel-badge"))'), true, 'Leader duel badge renders on selected round');
    const locked = await evaluate(`(() => { document.querySelector('[data-answer="B"]').click(); return [...document.querySelectorAll('.option')].every(button => button.disabled); })()`);
    assert.equal(locked, true, 'Answer locks immediately before server acknowledgement');
    await until('document.querySelector(".submission-status")?.textContent.includes("Đã ghi nhận")');
    await until('Boolean(document.querySelector(".reveal-screen"))');
    assert.equal(await evaluate('Boolean(document.querySelector(".duel-result"))'), true, 'Leader duel result explains bonus and penalty');
    await until('Boolean(document.querySelector(".vfx-correct"))');
    await until('[...document.querySelectorAll(".vfx-correct img")].length === 2 && [...document.querySelectorAll(".vfx-correct img")].every(image => image.complete && image.naturalWidth)');
    assert.equal(await evaluate('document.querySelectorAll(".vfx-correct").length'), 1, 'Correct effect plays once');
    assert.equal(await evaluate('document.querySelectorAll(".vfx-lead").length'), 1, 'Lead change effect follows first non-tied score');
    await until('Boolean(document.querySelector("#text-answer"))');
    await until('Boolean(document.querySelector(".vfx-boss"))');
    await until('[...document.querySelectorAll(".vfx-boss img")].every(image => image.complete && image.naturalWidth)');
    await evaluate(`document.querySelector('#text-answer').value = 'library'; document.querySelector('#text-answer').focus()`);
    const acknowledged = event(other, 'answer:ack');
    other.emit('answer:submit', { questionId: 'qa-wf', answer: 'library' });
    await acknowledged;
    await wait(150);
    assert.equal(await evaluate(`document.querySelector('#text-answer').value`), 'library', 'Other submissions preserve draft');
    assert.equal(await evaluate(`document.activeElement.id`), 'text-answer', 'Other submissions preserve focus');
    await evaluate(`(async () => { const {socket} = await import('/js/socketClient.js'); socket.disconnect(); })()`);
    assert.equal(await evaluate(`document.querySelector('#connection-status').hidden`), false);
    await evaluate(`(async () => { const {socket} = await import('/js/socketClient.js'); socket.connect(); })()`);
    await until('document.querySelector("#connection-status").hidden && Boolean(document.querySelector("#text-answer"))');
    await wait(1200);
    assert.equal(await evaluate('document.querySelectorAll(".vfx-boss").length'), 0, 'Reconnect snapshot does not replay boss effect');
    await wait(150);
    await evaluate(`document.querySelector('#text-answer').value = 'library'; document.querySelector('#answer-form').requestSubmit()`);
    await until('document.querySelector(".submission-status")?.textContent.includes("Đã ghi nhận")');
    await until('Boolean(document.querySelector(".results-screen"))');
    assert.equal(await evaluate('document.querySelectorAll(".leaderboard-row").length'), 2, 'Final results render every player in leaderboard');
    await until('Boolean(document.querySelector(".vfx-victory"))');
    await until('[...document.querySelectorAll(".vfx-victory img")].every(image => image.complete && image.naturalWidth)');
    assert.equal(await evaluate('window.qaIntervals.size'), 0, 'Countdown/question intervals disposed after results');
    await wait(1700);
    assert.equal(await evaluate('document.querySelectorAll(".vfx-layer").length'), 0, 'VFX layers remove after completion');
    assert.equal(await evaluate('window.qaFrames.size'), 0, 'Canvas animation frames stop after completion');
    const summary = await evaluate('document.querySelector(".personal-summary").textContent');
    assert.ok(summary.includes('100%'), 'Browser player completed both correct answers');
    host.emit('game:restart');
    await until('Boolean(document.querySelector(".room-code"))');
    host.emit('room:close');
    await until('Boolean(document.querySelector("#join-form"))');
    assert.equal(await evaluate('location.pathname'), '/', 'Room close resets the URL');
    await evaluate(`localStorage.setItem('lexiHostSession', JSON.stringify({roomCode:'ABCDEF',hostToken:'expired'}))`);
    await send('Page.navigate', { url: origin });
    await until('Boolean(document.querySelector("#join-form")) && !localStorage.getItem("lexiHostSession")');
    assert.ok((await evaluate('document.querySelector("#toast").textContent')).includes('hết hạn'));
    console.log('PASS real browser player: join, countdown, MC lock/ack, reveal, Word Forge draft/focus, disconnect/rejoin, boss, results, restart, close');
    assert.deepEqual(errors, []);
    console.log('PASS reduced motion; no runtime exceptions. 25 screen/viewport checks.');
  } finally {
    client?.close();
    sockets.forEach((socket) => socket.disconnect());
    browser.kill();
    await server.close();
    console.log(`Temporary Chrome profile: ${profile}`);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
