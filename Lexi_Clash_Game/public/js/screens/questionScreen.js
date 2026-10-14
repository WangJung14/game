function scoreBoard(scores) {
  const red = scores?.red?.battleScore || 0;
  const blue = scores?.blue?.battleScore || 0;
  const maximum = Math.max(100, red, blue);
  return `<div class="scoreboard">
    <div><strong>ĐỘI ĐỎ</strong><span>${red}</span><div class="score-track"><i class="red-fill" style="width:${red / maximum * 100}%"></i></div></div>
    <div><strong>ĐỘI XANH</strong><span>${blue}</span><div class="score-track"><i class="blue-fill" style="width:${blue / maximum * 100}%"></i></div></div>
  </div>`;
}

export function renderQuestionScreen(container, state, actions) {
  const question = state.question;
  const host = state.role === 'host';
  const controls = host
    ? '<p class="host-notice">Màn hình giáo viên — theo dõi số người đã trả lời.</p>'
    : question.type === 'multiple_choice'
      ? `<div class="options">${question.options.map((option) => `<button class="option" data-answer="${option.id}" ${state.submitted ? 'disabled' : ''}><b>${option.id}</b>${option.text}</button>`).join('')}</div>`
      : `<form id="answer-form" class="answer-form"><input name="answer" autocomplete="off" maxlength="80" aria-label="Câu trả lời" ${state.submitted ? 'disabled' : ''} required><button class="button primary" ${state.submitted ? 'disabled' : ''}>Gửi đáp án</button></form>`;
  container.innerHTML = `<section class="game-screen">
    ${scoreBoard(state.teamScores)}
    <div class="round-meta"><span>Câu ${question.roundNumber}/${question.totalRounds}</span>${question.isBossRound ? '<strong class="boss">BOSS ×2</strong>' : ''}<strong id="timer" class="timer">--</strong></div>
    <article class="question-card"><p class="eyebrow">${question.type === 'word_forge' ? 'Word Forge' : 'Multiple Choice'}</p><h1>${question.prompt}</h1>${controls}</article>
    <p class="submission-status">${state.submitted ? '✓ Đã ghi nhận đáp án' : `${state.submissionCount.submitted}/${state.submissionCount.total} người đã trả lời`}</p>
  </section>`;
  const timer = container.querySelector('#timer');
  const updateTimer = () => {
    const remaining = Math.max(0, question.endsAt - Date.now());
    timer.textContent = `${Math.ceil(remaining / 1000)}s`;
    timer.classList.toggle('urgent', remaining <= 5000);
  };
  updateTimer();
  const interval = window.setInterval(updateTimer, 100);
  window.setTimeout(() => window.clearInterval(interval), Math.max(0, question.endsAt - Date.now()) + 1000);
  container.querySelectorAll('.option').forEach((button) => button.addEventListener('click', () => actions.onSubmit(button.dataset.answer)));
  container.querySelector('#answer-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    actions.onSubmit(new FormData(event.currentTarget).get('answer'));
  });
}
