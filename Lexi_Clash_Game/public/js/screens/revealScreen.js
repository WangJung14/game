import { artwork, escapeHtml, mascot, scoreBoard } from '../ui.js';

export function renderRevealScreen(container, state, actions) {
  const result = state.roundResult;
  const personal = state.personalRound;
  container.innerHTML = `<section class="center-screen reveal-screen">
    <p class="eyebrow">Kết quả câu ${result.roundNumber}/${result.totalRounds}</p>
    ${mascot(personal?.isCorrect ? 'celebrate' : 'thinking')}
    ${state.role === 'player' && personal ? `<h1>${artwork(`icons/icon-${personal.isCorrect ? 'correct' : 'incorrect'}.png`)}${personal.isCorrect ? 'Chính xác!' : 'Câu sau cố gắng nhé!'}</h1><p class="xp-earned">${artwork('icons/icon-xp.png')} +${personal.xpEarned} XP</p>` : '<h1>Cùng khám phá đáp án</h1>'}
    <article class="answer-reveal"><span>Đáp án đúng</span><strong>${escapeHtml(result.correctAnswer)}</strong><p>${escapeHtml(result.explanation)}</p></article>
    ${result.isLeaderDuel ? `<section class="duel-result"><strong>⚔️ Kết quả đối đầu đội trưởng</strong><p>${result.leaderDuelResult?.winner ? `Đội ${result.leaderDuelResult.winner === 'red' ? 'Đỏ' : 'Xanh'} thắng: nhân đôi điểm round. Đội thua bị trừ ${result.leaderDuelResult[result.leaderDuelResult.winner === 'red' ? 'blue' : 'red'].penalty} điểm thưởng.` : 'Hai đội hòa, không áp dụng thưởng hoặc phạt.'}</p></section>` : ''}
    ${scoreBoard(result.teamScores, true)}
    ${state.role === 'host' ? '<div class="host-game-actions"><button id="next-question" class="button primary">Tiếp tục</button><button id="end-game-now" class="button danger" type="button">Kết thúc trận ngay</button></div>' : '<p>Đang chờ vòng tiếp theo…</p>'}
  </section>`;
  container.querySelector('#next-question')?.addEventListener('click', actions.onNext);
  container.querySelector('#end-game-now')?.addEventListener('click', actions.onEnd);
}
