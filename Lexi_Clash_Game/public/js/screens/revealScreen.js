export function renderRevealScreen(container, state, actions) {
  const result = state.roundResult;
  const personal = state.personalRound;
  container.innerHTML = `<section class="center-screen reveal-screen">
    <p class="eyebrow">Kết quả câu ${result.roundNumber}/${result.totalRounds}</p>
    ${state.role === 'player' && personal ? `<div class="status-icon">${personal.isCorrect ? '✓' : '✕'}</div><h1>${personal.isCorrect ? 'Chính xác!' : 'Chưa đúng'}</h1><p class="xp-earned">+${personal.xpEarned} XP</p>` : '<h1>Đáp án đã được công bố</h1>'}
    <article class="answer-reveal"><span>Đáp án đúng</span><strong>${result.correctAnswer}</strong><p>${result.explanation}</p></article>
    <div class="result-scores"><div class="red-text">ĐỘI ĐỎ <b>${result.teamScores.red.battleScore}</b></div><div class="blue-text">ĐỘI XANH <b>${result.teamScores.blue.battleScore}</b></div></div>
    ${state.role === 'host' ? '<button id="next-question" class="button primary">Câu tiếp theo</button>' : '<p>Tự động chuyển sau 5 giây…</p>'}
  </section>`;
  container.querySelector('#next-question')?.addEventListener('click', actions.onNext);
}
