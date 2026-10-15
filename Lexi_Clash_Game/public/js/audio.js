const SFX = Object.freeze({
  button: '/assets/audio/button-click.mp3',
  join: '/assets/audio/player_join_success.wav',
  gameStart: '/assets/audio/game-start.wav',
  countdownTick: '/assets/audio/countdown-tick.wav',
  countdownGo: '/assets/audio/countdown-go.wav',
  answerSelect: '/assets/audio/answer-select.wav',
  answerSubmit: '/assets/audio/Answer-Submit.wav',
  correct: '/assets/audio/correct-answer.wav',
  incorrect: '/assets/audio/incorrect-answer.wav',
  xp: '/assets/audio/xp-reward.wav',
  leadChange: '/assets/audio/team-lead-change.wav',
  lowTime: '/assets/audio/low-time-warning.wav',
  timeUp: '/assets/audio/time-up.wav',
  bossIntro: '/assets/audio/boss-round-intro.wav',
  victory: '/assets/audio/victory-fanfare.wav',
  roomClose: '/assets/audio/room-closing.wav'
});

const MUSIC = Object.freeze({ lobby: 'K6cf7sf2ybs', battle: 'atq9S7pp1rQ', results: 'EB9e7EhLQqo' });
const STORAGE_KEY = 'lexiAudioSettings';
const played = new Map();
const activeSounds = new Set();
let role = null;
let screen = 'join';
let unlocked = false;
let countdownInterval = null;
let questionTimers = [];
let youtubePromise = null;
let youtubePlayer = null;
let youtubePlayerPromise = null;
let youtubeReady = false;
let musicPlaying = false;
let currentTrack = null;
let duckTimer = null;

const saved = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (_error) { return {}; }
})();
const settings = {
  muted: Boolean(saved.muted),
  sfxVolume: Number.isFinite(saved.sfxVolume) ? saved.sfxVolume : 0.7,
  musicVolume: Number.isFinite(saved.musicVolume) ? saved.musicVolume : 0.35,
  musicEnabled: false,
  panelOpen: Boolean(saved.panelOpen)
};

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function prunePlayed() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, timestamp] of played) if (timestamp < cutoff) played.delete(key);
}

function canPlay(key) {
  prunePlayed();
  if (!key || played.has(key)) return false;
  played.set(key, Date.now());
  return true;
}

function setStatus(message) {
  const status = document.querySelector('#audio-status');
  if (status) status.textContent = message;
}

function actualMusicVolume() {
  return settings.muted ? 0 : Math.round(settings.musicVolume * 100);
}

function applyMusicVolume() {
  if (!youtubeReady) return;
  youtubePlayer.setVolume(actualMusicVolume());
  settings.muted ? youtubePlayer.mute() : youtubePlayer.unMute();
}

function duckMusic(duration = 1100) {
  if (!youtubeReady || !settings.musicEnabled) return;
  window.clearTimeout(duckTimer);
  youtubePlayer.setVolume(Math.round(actualMusicVolume() * 0.3));
  duckTimer = window.setTimeout(applyMusicVolume, duration);
}

export function playSfx(name, key, options = {}) {
  if (!unlocked || settings.muted || !SFX[name] || !canPlay(`sfx:${name}:${key}`)) return false;
  if (activeSounds.size >= 4) return false;
  const audio = new Audio(SFX[name]);
  audio.volume = Math.min(1, Math.max(0, settings.sfxVolume * (options.gain ?? 1)));
  activeSounds.add(audio);
  const dispose = () => activeSounds.delete(audio);
  audio.addEventListener('ended', dispose, { once: true });
  audio.addEventListener('error', () => {
    dispose();
    setStatus(`Không tải được âm thanh ${name}. Trò chơi vẫn tiếp tục.`);
  }, { once: true });
  audio.play().catch(dispose);
  if (options.duck) duckMusic(options.duration);
  return true;
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubePromise) return youtubePromise;
  youtubePromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('YouTube API unavailable'));
    document.head.append(script);
    window.setTimeout(() => reject(new Error('YouTube API timeout')), 10000);
  });
  return youtubePromise;
}

async function ensureMusicPlayer() {
  if (youtubePlayer) return youtubePlayer;
  if (youtubePlayerPromise) return youtubePlayerPromise;
  youtubePlayerPromise = (async () => {
    try {
      await loadYouTubeApi();
      youtubePlayer = new window.YT.Player('youtube-player', {
      width: 200,
      height: 200,
      videoId: MUSIC.lobby,
      playerVars: { controls: 0, playsinline: 1, rel: 0 },
      events: {
        onReady: () => {
          youtubeReady = true;
          applyMusicVolume();
          syncMusic();
        },
        onStateChange: (event) => {
          musicPlaying = event.data === window.YT.PlayerState.PLAYING;
          renderControls();
          if (event.data === window.YT.PlayerState.ENDED && settings.musicEnabled && currentTrack) {
            youtubePlayer.loadVideoById(MUSIC[currentTrack]);
          }
        },
        onAutoplayBlocked: () => {
          settings.musicEnabled = false;
          persist();
          renderControls();
          setStatus('Trình duyệt đã chặn tự phát nhạc. Nhấn “Phát nhạc” để tiếp tục.');
        },
        onError: () => setStatus('Video YouTube không phát được. Bạn có thể thử lại hoặc tắt nhạc nền.')
      }
      });
      return youtubePlayer;
    } catch (_error) {
      setStatus('Không tải được YouTube. SFX và trò chơi vẫn hoạt động bình thường.');
      youtubePlayerPromise = null;
      return null;
    }
  })();
  return youtubePlayerPromise;
}

function wantedTrack() {
  if (screen === 'join' || screen === 'lobby') return 'lobby';
  if (['countdown', 'question', 'reveal'].includes(screen)) return 'battle';
  if (screen === 'results') return 'results';
  return null;
}

async function syncMusic() {
  const canOwnMusic = role === 'host' || role === 'player' || screen === 'join';
  const track = canOwnMusic && settings.musicEnabled && !document.hidden ? wantedTrack() : null;
  if (!track) {
    if (youtubeReady) youtubePlayer.pauseVideo();
    currentTrack = null;
    return;
  }
  await ensureMusicPlayer();
  if (!youtubeReady) return;
  applyMusicVolume();
  if (currentTrack !== track) {
    currentTrack = track;
    youtubePlayer.loadVideoById(MUSIC[track]);
  } else {
    youtubePlayer.playVideo();
  }
}

function renderControls() {
  const mute = document.querySelector('#audio-mute');
  const sfx = document.querySelector('#sfx-volume');
  const music = document.querySelector('#music-volume');
  const toggle = document.querySelector('#music-toggle');
  const hostMusic = document.querySelector('#host-music-controls');
  const controls = document.querySelector('#audio-controls');
  const panelToggle = document.querySelector('#audio-panel-toggle');
  if (!mute) return;
  mute.textContent = settings.muted ? '🔇 Bật âm thanh' : '🔊 Tắt âm thanh';
  mute.setAttribute('aria-pressed', String(settings.muted));
  sfx.value = String(Math.round(settings.sfxVolume * 100));
  music.value = String(Math.round(settings.musicVolume * 100));
  document.querySelector('#sfx-volume-value').textContent = `${sfx.value}%`;
  document.querySelector('#music-volume-value').textContent = `${music.value}%`;
  toggle.textContent = musicPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc';
  toggle.setAttribute('aria-pressed', String(musicPlaying));
  hostMusic.hidden = false;
  controls.classList.toggle('collapsed', !settings.panelOpen);
  panelToggle.setAttribute('aria-expanded', String(settings.panelOpen));
  panelToggle.textContent = settings.panelOpen ? '✕ Đóng âm thanh' : '🔊 Âm thanh';
}

export function initAudioControls() {
  renderControls();
  const unlock = () => { unlocked = true; };
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock);
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.disabled || button.closest('#audio-controls')) return;
    if (button.classList.contains('option')) playSfx('answerSelect', `${performance.now()}`);
    else if (!button.closest('#answer-form')) playSfx('button', `${performance.now()}`);
  });
  document.querySelector('#audio-panel-toggle').addEventListener('click', () => {
    settings.panelOpen = !settings.panelOpen;
    persist();
    renderControls();
  });
  document.querySelector('#audio-mute').addEventListener('click', () => {
    unlocked = true;
    settings.muted = !settings.muted;
    persist(); renderControls(); applyMusicVolume();
    if (settings.muted) stopAllSfx();
  });
  document.querySelector('#sfx-volume').addEventListener('input', (event) => {
    settings.sfxVolume = Number(event.target.value) / 100;
    document.querySelector('#sfx-volume-value').textContent = `${event.target.value}%`;
    for (const audio of activeSounds) audio.volume = settings.muted ? 0 : settings.sfxVolume;
    persist();
  });
  document.querySelector('#music-volume').addEventListener('input', (event) => {
    settings.musicVolume = Number(event.target.value) / 100;
    document.querySelector('#music-volume-value').textContent = `${event.target.value}%`;
    persist(); applyMusicVolume();
  });
  document.querySelector('#music-toggle').addEventListener('click', async () => {
    unlocked = true;
    if (musicPlaying) {
      settings.musicEnabled = false;
      persist();
      youtubePlayer?.pauseVideo?.();
      renderControls();
      return;
    }
    settings.musicEnabled = true;
    persist();
    await ensureMusicPlayer();
    await syncMusic();
    youtubePlayer?.playVideo?.();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAllSfx();
      youtubePlayer?.pauseVideo?.();
    } else {
      syncMusic();
    }
  });
}

export function setAudioContext(nextRole, nextScreen) {
  role = nextRole;
  screen = nextScreen;
  renderControls();
  syncMusic();
}

export async function enableRoomMusic() {
  if (role !== 'host' && role !== 'player') return false;
  unlocked = true;
  settings.musicEnabled = true;
  persist();
  renderControls();
  await ensureMusicPlayer();
  await syncMusic();
  return youtubeReady;
}

export async function enableLandingMusic() {
  if (screen !== 'join') return false;
  settings.musicEnabled = true;
  persist();
  renderControls();
  await ensureMusicPlayer();
  await syncMusic();
  return youtubeReady;
}

export function startCountdownAudio(endsAt, key) {
  stopCountdownAudio();
  if (role !== 'host') return;
  playSfx('gameStart', `${key}:start`, { duck: true, duration: 900 });
  let previous;
  const update = () => {
    const seconds = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    if (seconds === previous) return;
    previous = seconds;
    if (seconds > 0) playSfx('countdownTick', `${key}:${seconds}`, { gain: 0.8 });
    else {
      playSfx('countdownGo', `${key}:go`, { duck: true });
      stopCountdownAudio();
    }
  };
  update();
  countdownInterval = window.setInterval(update, 100);
}

export function stopCountdownAudio() {
  window.clearInterval(countdownInterval);
  countdownInterval = null;
}

export function scheduleQuestionAudio(question, key, playIntro = true) {
  clearQuestionAudio();
  if (playIntro && role === 'host' && question.isBossRound) playSfx('bossIntro', `${key}:boss`, { duck: true, duration: 1500 });
  const warningDelay = question.endsAt - Date.now() - 5000;
  const endDelay = question.endsAt - Date.now();
  if (warningDelay > 0) questionTimers.push(window.setTimeout(() => playSfx('lowTime', `${key}:warning`), warningDelay));
  if (endDelay > 0) questionTimers.push(window.setTimeout(() => playSfx('timeUp', `${key}:timeup`), endDelay));
}

export function clearQuestionAudio() {
  questionTimers.forEach(window.clearTimeout);
  questionTimers = [];
}

export function stopAllSfx() {
  for (const audio of activeSounds) { audio.pause(); audio.currentTime = 0; }
  activeSounds.clear();
}

export function closeAudio() {
  stopCountdownAudio();
  clearQuestionAudio();
  stopAllSfx();
  youtubePlayer?.pauseVideo?.();
  musicPlaying = false;
  currentTrack = null;
}

export const audioDebug = { settings, SFX, MUSIC, played, activeSounds };
