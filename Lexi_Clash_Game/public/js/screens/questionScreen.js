import { artwork, escapeHtml, scoreBoard, teamBadge } from '../ui.js';

export function updateSubmissionStatus(container, state) {
  const status = container.querySelector('.submission-status');
  if (status) status.textContent = state.submitted ? 'Đã ghi nhận đáp án · Chờ kết quả' : state.pending ? 'Đang gửi đáp án…' : `${state.submissionCount.submitted}/${state.submissionCount.total} người đã trả lời`;
}

export function renderQuestionScreen(container, state, actions) {
  const question = state.question;
  const host = state.role === 'host';
  const isLeader = state.players?.some((player) => player.playerId === state.playerId && player.isLeader);
  const duelSpectator = question.isLeaderDuel && !host && !isLeader;
  const locked = state.submitted || state.pending;
  const everyoneAnswered = state.submissionCount.total > 0 && state.submissionCount.submitted >= state.submissionCount.total;
  const controls = host
    ? `<div class="host-question-controls"><p class="host-notice">${everyoneAnswered ? 'Tất cả người chơi đã trả lời. Có thể kết thúc câu ngay.' : 'Màn hình giáo viên · Theo dõi người chơi trả lời.'}</p><div class="host-game-actions"><button id="stop-question" class="button secondary" ${everyoneAnswered ? '' : 'disabled'}>${everyoneAnswered ? 'Kết thúc câu ngay' : 'Đang chờ người chơi'}</button><button id="end-game-now" class="button danger" type="button">Kết thúc trận ngay</button></div></div>`
    : duelSpectator
      ? '<div class="duel-spectator"><strong>⚔️ Round đối đầu đội trưởng</strong><p>Hai đội trưởng đang thi đấu. Bạn hãy cổ vũ cho đội của mình!</p></div>'
      : question.type === 'multiple_choice'
      ? `<p class="answer-help">Chạm một đáp án để gửi. Mỗi câu chỉ trả lời một lần.</p><div class="options">${question.options.map((option) => `<button class="option ${state.selectedAnswer === option.id ? 'selected' : ''}" data-answer="${escapeHtml(option.id)}" aria-pressed="${state.selectedAnswer === option.id}" ${locked ? 'disabled' : ''}><b>${escapeHtml(option.id)}</b><span>${escapeHtml(option.text)}</span></button>`).join('')}</div>`
      : `<form id="answer-form" class="answer-form"><label class="sr-only" for="text-answer">Câu trả lời</label><input id="text-answer" name="answer" placeholder="Nhập từ tiếng Anh…" autocomplete="off" maxlength="80" value="${escapeHtml(state.selectedAnswer || '')}" ${locked ? 'disabled' : ''} required><button class="button primary" ${locked ? 'disabled' : ''}>Gửi đáp án</button></form>`;
  container.innerHTML = `<section class="game-screen ${question.isBossRound ? 'boss-round' : ''}">
    ${scoreBoard(state.teamScores)}
    <div class="round-meta"><span>Câu ${question.roundNumber}/${question.totalRounds}</span>${question.isBossRound ? `<strong class="boss">${artwork('Boss Badge.png')} BOSS ×2</strong>` : ''}${question.isLeaderDuel ? '<strong class="duel-badge">⚔️ LEADER DUEL</strong>' : ''}<strong id="timer" class="timer" aria-label="Thời gian còn lại">--</strong></div>
    ${!host ? `<div class="your-team">${teamBadge(state.playerTeam)} Bạn thuộc đội ${state.playerTeam === 'red' ? 'Đỏ' : 'Xanh'}</div>` : ''}
    <article class="question-card"><p class="eyebrow">${question.type === 'word_forge' ? `${artwork('categories/word-forge.png')} Word Forge` : 'Chọn đáp án đúng'}</p><h1>${escapeHtml(question.prompt)}</h1>${controls}</article>
    <p class="submission-status" role="status"></p>
  </section>`;
  const timer = container.querySelector('#timer');
  const updateTimer = () => {
    const remaining = Math.max(0, question.endsAt - Date.now());
    timer.textContent = `${Math.ceil(remaining / 1000)}s`;
    timer.classList.toggle('urgent', remaining > 0 && remaining <= 5000);
    if (!remaining) {
      container.querySelectorAll('.option, #answer-form input, #answer-form button').forEach((control) => { control.disabled = true; });
      if (!state.submitted && !state.pending) container.querySelector('.submission-status').textContent = 'Hết giờ · Đang chờ kết quả';
    }
  };
  updateSubmissionStatus(container, state);
  updateTimer();
  const interval = window.setInterval(updateTimer, 250);
  container.querySelectorAll('.option').forEach((button) => button.addEventListener('click', () => actions.onSubmit(button.dataset.answer)));
  container.querySelector('#stop-question')?.addEventListener('click', actions.onStop);
  container.querySelector('#end-game-now')?.addEventListener('click', actions.onEnd);
  container.querySelector('#answer-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    actions.onSubmit(new FormData(event.currentTarget).get('answer'));
  });
  return () => window.clearInterval(interval);
}
