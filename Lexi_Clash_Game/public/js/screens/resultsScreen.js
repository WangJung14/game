export function renderResultsScreen(container, state, actions) {
  const result = state.gameResult;
  const personal = state.personalResult;
  const winnerText = result.winner === 'tie' ? 'HAI ĐỘI HÒA NHAU' : `ĐỘI ${result.winner === 'red' ? 'ĐỎ' : 'XANH'} CHIẾN THẮNG`;
  container.innerHTML = `<section class="center-screen results-screen">
    <div class="status-icon">🏆</div><p class="eyebrow">Kết thúc trận đấu</p><h1>${winnerText}</h1>
    <div class="final-scores"><div class="red-team"><span>ĐỘI ĐỎ</span><strong>${result.teamScores.red.battleScore}</strong><small>${result.teamScores.red.totalXP} XP</small></div><div class="blue-team"><span>ĐỘI XANH</span><strong>${result.teamScores.blue.battleScore}</strong><small>${result.teamScores.blue.totalXP} XP</small></div></div>
    ${personal ? `<article class="personal-summary"><h2>Kết quả của bạn</h2><p><b>${personal.xp}</b> XP · <b>${Math.round(personal.accuracy * 100)}%</b> chính xác</p><h3>Câu cần ôn</h3>${personal.missedQuestions.length ? `<ul>${personal.missedQuestions.map((item) => `<li>${item.prompt} <strong>${item.correctAnswer}</strong></li>`).join('')}</ul>` : '<p>Tuyệt vời — không có câu nào cần ôn!</p>'}</article>` : ''}
    ${state.role === 'host' ? '<div class="result-actions"><button id="restart-game" class="button primary">Chơi trận mới</button><button id="close-room" class="button secondary">Đóng phòng</button></div>' : ''}
  </section>`;
  container.querySelector('#restart-game')?.addEventListener('click', actions.onRestart);
  container.querySelector('#close-room')?.addEventListener('click', actions.onClose);
}
