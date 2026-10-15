export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

export function artwork(path, className = 'ui-icon', alt = '') {
  return `<img class="${className}" src="/assets/optimized/${encodeURI(path.replace(/\.png$/, '.webp'))}" alt="${escapeHtml(alt)}" width="256" height="256" decoding="async">`;
}

export function mascot(expression) {
  return artwork(`mascots/mascot-${expression}.png`, 'mascot');
}

export function teamBadge(team) {
  return artwork(`${team === 'red' ? 'Red' : 'Blue'} Team Badge.png`, 'team-badge');
}

export function avatar(playerId) {
  const hash = Array.from(String(playerId)).reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 0);
  return artwork(`avatars/avatar-${String(hash % 12 + 1).padStart(2, '0')}.png`, 'avatar');
}

export function scoreBoard(scores, showDelta = false) {
  const maximum = Math.max(100, scores?.red?.battleScore || 0, scores?.blue?.battleScore || 0);
  return `<div class="scoreboard">${['red', 'blue'].map((team) => {
    const score = scores?.[team]?.battleScore || 0;
    const delta = scores?.[team]?.roundHistory?.at(-1)?.roundDelta;
    return `<div class="score-card ${team}-team">${teamBadge(team)}<strong>ĐỘI ${team === 'red' ? 'ĐỎ' : 'XANH'}</strong><span>${score}${showDelta && Number.isFinite(delta) ? `<small class="score-delta">+${delta} vòng này</small>` : ''}</span><div class="score-track" role="meter" aria-label="Điểm đội ${team}" aria-valuemin="0" aria-valuemax="${maximum}" aria-valuenow="${score}"><i class="${team}-fill" style="width:${score / maximum * 100}%"></i></div></div>`;
  }).join('')}</div>`;
}
