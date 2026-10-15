const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const played = new Set();
const active = new Set();

function canPlay(key) {
  if (reducedMotion.matches || played.has(key)) return false;
  played.add(key);
  return true;
}

function createLayer(className) {
  const layer = document.createElement('div');
  layer.className = `vfx-layer ${className}`;
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  active.add(layer);
  return layer;
}

function addImage(layer, source, className) {
  const image = document.createElement('img');
  image.className = `vfx-image ${className}`;
  image.src = source;
  image.alt = '';
  image.decoding = 'async';
  layer.append(image);
  return image;
}

function removeLater(layer, duration) {
  const timeout = window.setTimeout(() => {
    active.delete(layer);
    layer.remove();
  }, duration);
  layer.dataset.timeout = String(timeout);
}

function animate(element, keyframes, options) {
  const animation = element.animate(keyframes, { fill: 'both', ...options });
  animation.finished.catch(() => {}).finally(() => animation.cancel());
  return animation;
}

function particleCanvas(layer, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'vfx-canvas';
  layer.append(canvas);
  const context = canvas.getContext('2d');
  const lowTier = window.innerWidth < 700 || navigator.hardwareConcurrency <= 4;
  const count = lowTier ? options.mobileCount ?? 18 : options.desktopCount ?? 42;
  const duration = options.duration ?? 900;
  const colors = options.colors ?? ['#20c997', '#ffb703', '#6c5ce7', '#ffffff'];
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  const resize = () => {
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  resize();
  const originX = options.originX ?? window.innerWidth / 2;
  const originY = options.originY ?? window.innerHeight / 2;
  const particles = Array.from({ length: count }, (_, index) => {
    const angle = options.fall ? Math.random() * Math.PI : Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 220;
    return {
      x: options.fall ? Math.random() * window.innerWidth : originX,
      y: options.fall ? -20 - Math.random() * 120 : originY,
      vx: options.fall ? (Math.random() - .5) * 80 : Math.cos(angle) * speed,
      vy: options.fall ? 100 + Math.random() * 180 : Math.sin(angle) * speed,
      gravity: options.fall ? 80 : 120,
      size: 4 + Math.random() * 8,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - .5) * .18,
      color: colors[index % colors.length]
    };
  });
  const started = performance.now();
  let frame;
  const draw = (now) => {
    const elapsed = now - started;
    const delta = Math.min(32, elapsed ? now - (draw.previous || started) : 16) / 1000;
    draw.previous = now;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    context.globalAlpha = Math.max(0, 1 - elapsed / duration);
    for (const particle of particles) {
      particle.vy += particle.gravity * delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.rotation += particle.spin;
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      if (options.stars) {
        context.beginPath();
        for (let point = 0; point < 8; point += 1) {
          const radius = point % 2 ? particle.size * .42 : particle.size;
          const pointAngle = point * Math.PI / 4;
          context.lineTo(Math.cos(pointAngle) * radius, Math.sin(pointAngle) * radius);
        }
        context.closePath();
        context.fill();
      } else {
        context.fillRect(-particle.size / 2, -particle.size, particle.size, particle.size * 2);
      }
      context.restore();
    }
    if (elapsed < duration) frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  layer._disposeCanvas = () => cancelAnimationFrame(frame);
}

function elementCenter(selector) {
  const element = document.querySelector(selector);
  if (!element) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function clearVfx() {
  for (const layer of active) {
    window.clearTimeout(Number(layer.dataset.timeout));
    layer._disposeCanvas?.();
    layer.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    layer.remove();
  }
  active.clear();
}

export function playCountdown(key) {
  if (!canPlay(`countdown:${key}`)) return;
  const layer = createLayer('vfx-countdown');
  const ring = addImage(layer, '/assets/optimized/effects/countdown_timer-motion.webp', 'vfx-countdown-ring');
  animate(ring, [
    { opacity: 0, transform: 'translate(-50%, -50%) scale(.72) rotate(-12deg)' },
    { opacity: 1, transform: 'translate(-50%, -50%) scale(1.04) rotate(0deg)', offset: .35 },
    { opacity: .88, transform: 'translate(-50%, -50%) scale(1) rotate(4deg)' }
  ], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' });
  removeLater(layer, 5200);
}

export function playBossEntrance(key) {
  if (!canPlay(`boss:${key}`)) return;
  const layer = createLayer('vfx-boss');
  const burst = addImage(layer, '/assets/optimized/effects/speed-burst.webp', 'vfx-boss-burst');
  animate(burst, [
    { opacity: 0, transform: 'translate(-50%, -50%) scale(.35) rotate(-8deg)' },
    { opacity: .9, transform: 'translate(-50%, -50%) scale(1.08) rotate(2deg)', offset: .45 },
    { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2) rotate(5deg)' }
  ], { duration: 1050, easing: 'cubic-bezier(.2,.8,.2,1)' });
  particleCanvas(layer, { mobileCount: 10, desktopCount: 22, duration: 900, colors: ['#ffb703', '#6c5ce7', '#ffffff'], stars: true });
  removeLater(layer, 1150);
}

export function playCorrectAnswer(key) {
  if (!canPlay(`correct:${key}`)) return;
  const origin = elementCenter('.reveal-screen h1');
  const layer = createLayer('vfx-correct');
  const burst = addImage(layer, '/assets/optimized/effects/correct-answer-burst.webp', 'vfx-correct-burst');
  const trail = addImage(layer, '/assets/optimized/effects/xp-reward-trail.webp', 'vfx-xp-trail');
  animate(burst, [
    { opacity: 0, transform: 'translate(-50%, -50%) scale(.55) rotate(-8deg)' },
    { opacity: 1, transform: 'translate(-50%, -50%) scale(1.02) rotate(0deg)', offset: .35 },
    { opacity: 0, transform: 'translate(-50%, -50%) scale(1.16) rotate(6deg)' }
  ], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' });
  animate(trail, [
    { opacity: 0, transform: 'translate(-62%, 35%) scale(.55) rotate(-12deg)' },
    { opacity: .95, transform: 'translate(-50%, -10%) scale(.9) rotate(-3deg)', offset: .4 },
    { opacity: 0, transform: 'translate(-35%, -65%) scale(1.05) rotate(8deg)' }
  ], { duration: 1050, easing: 'cubic-bezier(.16,.84,.3,1)' });
  particleCanvas(layer, { originX: origin.x, originY: origin.y, mobileCount: 14, desktopCount: 28, duration: 850, stars: true });
  removeLater(layer, 1150);
}

export function playLeadChange(key, team) {
  if (!team || !canPlay(`lead:${key}:${team}`)) return;
  const layer = createLayer(`vfx-lead vfx-lead-${team}`);
  const sweep = addImage(layer, '/assets/optimized/effects/team-lead-change.webp', 'vfx-lead-sweep');
  const label = document.createElement('strong');
  label.className = 'vfx-lead-label';
  label.textContent = `ĐỘI ${team === 'red' ? 'ĐỎ' : 'XANH'} VƯƠN LÊN DẪN ĐẦU!`;
  layer.append(label);
  animate(sweep, [
    { opacity: 0, transform: 'translate(-115%, -50%) scale(.75)' },
    { opacity: .95, transform: 'translate(-50%, -50%) scale(1)', offset: .42 },
    { opacity: 0, transform: 'translate(20%, -50%) scale(1.08)' }
  ], { duration: 1000, easing: 'cubic-bezier(.2,.8,.2,1)' });
  animate(label, [
    { opacity: 0, transform: 'translate(-50%, 16px) scale(.92)' },
    { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: .25 },
    { opacity: 1, offset: .72 },
    { opacity: 0, transform: 'translate(-50%, -10px) scale(1.03)' }
  ], { duration: 1450, easing: 'cubic-bezier(.2,.8,.2,1)' });
  removeLater(layer, 1500);
}

export function playVictory(key) {
  if (!canPlay(`victory:${key}`)) return;
  const layer = createLayer('vfx-victory');
  const frame = addImage(layer, '/assets/optimized/effects/victory-confetti.webp', 'vfx-victory-frame');
  animate(frame, [
    { opacity: 0, transform: 'translate(-50%, -50%) scale(.7) rotate(-5deg)' },
    { opacity: 1, transform: 'translate(-50%, -50%) scale(1.02) rotate(0deg)', offset: .35 },
    { opacity: .15, transform: 'translate(-50%, -50%) scale(1.1) rotate(3deg)' }
  ], { duration: 1500, easing: 'cubic-bezier(.2,.8,.2,1)' });
  particleCanvas(layer, { mobileCount: 24, desktopCount: 72, duration: 1450, fall: true, colors: ['#ff4d6d', '#3a86ff', '#ffb703', '#6c5ce7', '#20c997'] });
  removeLater(layer, 1550);
}

reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) clearVfx();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearVfx();
});
