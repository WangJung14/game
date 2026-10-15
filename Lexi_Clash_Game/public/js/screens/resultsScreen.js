import { artwork, avatar, escapeHtml, mascot, teamBadge } from '../ui.js';

export function renderResultsScreen(container, state, actions) {
  const result = state.gameResult;
  const personal = state.personalResult;
  const winnerText = result.winner === 'tie' ? 'HAI ĐỘI HÒA NHAU' : `ĐỘI ${result.winner === 'red' ? 'ĐỎ' : 'XANH'} CHIẾN THẮNG`;
  const leaderboard = result.leaderboard || [];
  container.innerHTML = `<section class="center-screen results-screen">
    <div class="victory-art">${artwork('icons/icon-trophy.png', 'trophy')}${mascot('winner')}</div><p class="eyebrow">Kết thúc trận đấu</p><h1>${winnerText}</h1>
    <div class="final-scores"><div class="red-team">${teamBadge('red')}<span>ĐỘI ĐỎ</span><strong>${result.teamScores.red.battleScore}</strong><small>${result.teamScores.red.totalXP} XP</small></div><div class="blue-team">${teamBadge('blue')}<span>ĐỘI XANH</span><strong>${result.teamScores.blue.battleScore}</strong><small>${result.teamScores.blue.totalXP} XP</small></div></div>
    <section class="leaderboard" aria-labelledby="leaderboard-title"><h2 id="leaderboard-title">Bảng xếp hạng cá nhân</h2><div class="leaderboard-list">${leaderboard.map((player) => `<article class="leaderboard-row ${player.playerId === state.playerId ? 'is-you' : ''}"><strong class="leaderboard-rank">${player.rank <= 3 ? ['🥇', '🥈', '🥉'][player.rank - 1] : `#${player.rank}`}</strong>${avatar(player.playerId)}<div><b>${escapeHtml(player.displayName)}${player.playerId === state.playerId ? ' (Bạn)' : ''}</b><small>${player.team === 'red' ? 'Đội Đỏ' : 'Đội Xanh'}${player.isLeader ? ' · Đội trưởng' : ''}</small></div><span><b>${player.xp} XP</b><small>${Math.round(player.accuracy * 100)}% chính xác</small></span></article>`).join('')}</div></section>
    ${personal ? `<article class="personal-summary">${avatar(state.playerId)}<h2>Kết quả của bạn</h2><p><b>${personal.xp}</b> XP · <b>${Math.round(personal.accuracy * 100)}%</b> chính xác</p><h3>Câu cần ôn</h3>${personal.missedQuestions.length ? `<ul>${personal.missedQuestions.map((item) => `<li>${escapeHtml(item.prompt)} <strong>${escapeHtml(item.correctAnswer)}</strong></li>`).join('')}</ul>` : '<p>Tuyệt vời — không có câu nào cần ôn!</p>'}</article>` : ''}
    ${state.role === 'host' ? '<div class="result-actions"><button id="restart-game" class="button primary">Chơi trận mới</button><button id="close-room" class="button danger">Đóng phòng</button></div>' : '<p>Chờ giáo viên mở trận mới. Bạn vẫn ở trong phòng.</p>'}
  </section>`;
  container.querySelector('#restart-game')?.addEventListener('click', actions.onRestart);
  container.querySelector('#close-room')?.addEventListener('click', actions.onClose);
}
