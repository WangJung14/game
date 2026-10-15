import { avatar, mascot, teamBadge } from '../ui.js';

let previousTeams = new Map();

const CHATGPT_PROMPT = `Bạn là chuyên gia thiết kế câu hỏi tiếng Anh cho trò chơi LEXI CLASH.
Hãy tạo một bộ gồm 10 câu hỏi trình độ A2, chủ đề [ĐIỀN CHỦ ĐỀ].
Chỉ trả về JSON hợp lệ, không dùng Markdown và không giải thích bên ngoài JSON.

JSON phải có dạng { "title": "Tên bộ đề", "questions": [...] }.
Mỗi câu bắt buộc có: id duy nhất, type (multiple_choice hoặc word_forge), level (A1/A2/B1), topic, prompt, options, correctAnswer, acceptedAnswers, explanation, timeLimitSec >= 5, isBossRound và points > 0.
Với multiple_choice: options gồm ít nhất 2 phần tử { "id": "A", "text": "..." }, correctAnswer là id đáp án đúng, acceptedAnswers chứa id đó.
Với word_forge: options là null, acceptedAnswers liệt kê các cách viết được chấp nhận.
Chỉ có tối đa 50 câu. Dùng isBossRound: true cho đúng 1 câu khó nhất.`;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function playerCard(player, state) {
  const targetTeam = player.team === 'red' ? 'blue' : 'red';
  const moveButton = state.role === 'host'
    ? `<button class="move-button" data-player-id="${player.playerId}" data-target-team="${targetTeam}">Đổi đội</button>`
    : '';
  const changed = previousTeams.get(player.playerId) !== player.team;
  return `<li class="player ${changed ? 'player-enter' : ''} ${player.isConnected ? '' : 'offline'}">
    ${avatar(player.playerId)}
    <span class="player-name">${escapeHtml(player.displayName)}${player.playerId === state.playerId ? ' (Bạn)' : ''}${player.isLeader ? '<strong class="leader-badge" title="Đội trưởng">♛ Đội trưởng</strong>' : ''}<small>${player.isConnected ? 'Sẵn sàng' : 'Đang kết nối lại'}</small></span>
    ${moveButton}
  </li>`;
}

function questionEditorCard(question, index) {
  const options = Array.isArray(question.options) ? question.options.map((option) => `${option.id}|${option.text}`).join('\n') : '';
  return `<article class="question-editor-card" data-question-index="${index}">
    <header><h3>Câu ${index + 1}</h3><button class="remove-question button danger" type="button">Xóa câu</button></header>
    <div class="question-editor-grid">
      <label>ID<input data-field="id" value="${escapeHtml(question.id || `question_${index + 1}`)}"></label>
      <label>Loại<select data-field="type"><option value="multiple_choice" ${question.type === 'multiple_choice' ? 'selected' : ''}>Trắc nghiệm</option><option value="word_forge" ${question.type === 'word_forge' ? 'selected' : ''}>Nhập từ</option></select></label>
      <label>Trình độ<select data-field="level">${['A1', 'A2', 'B1'].map((level) => `<option ${question.level === level ? 'selected' : ''}>${level}</option>`).join('')}</select></label>
      <label>Chủ đề<input data-field="topic" value="${escapeHtml(question.topic || 'general')}"></label>
      <label class="full">Câu hỏi<textarea data-field="prompt" rows="2">${escapeHtml(question.prompt || '')}</textarea></label>
      <label class="full">Các lựa chọn <small>Mỗi dòng theo dạng A|Nội dung. Bỏ trống với câu nhập từ.</small><textarea data-field="options" rows="4">${escapeHtml(options)}</textarea></label>
      <label>Đáp án đúng<input data-field="correctAnswer" value="${escapeHtml(question.correctAnswer || '')}" placeholder="B hoặc library"></label>
      <label>Đáp án chấp nhận<input data-field="acceptedAnswers" value="${escapeHtml((question.acceptedAnswers || []).join(' | '))}" placeholder="library | Library"></label>
      <label class="full">Giải thích<textarea data-field="explanation" rows="2">${escapeHtml(question.explanation || '')}</textarea></label>
      <label>Thời gian (giây)<input data-field="timeLimitSec" type="number" min="5" value="${Number(question.timeLimitSec) || 20}"></label>
      <label>Điểm<input data-field="points" type="number" min="1" value="${Number(question.points) || 100}"></label>
      <label class="boss-toggle"><input data-field="isBossRound" type="checkbox" ${question.isBossRound ? 'checked' : ''}> Boss Round</label>
    </div>
  </article>`;
}

function collectEditor(container) {
  return [...container.querySelectorAll('.question-editor-card')].map((card) => {
    const value = (field) => card.querySelector(`[data-field="${field}"]`).value.trim();
    const type = value('type');
    const options = value('options').split(/\r?\n/).map((line) => {
      const separator = line.indexOf('|');
      return separator > 0 ? { id: line.slice(0, separator).trim().toUpperCase(), text: line.slice(separator + 1).trim() } : null;
    }).filter(Boolean);
    return {
      id: value('id'), type, level: value('level'), topic: value('topic'), prompt: value('prompt'),
      options: type === 'multiple_choice' ? options : null,
      correctAnswer: value('correctAnswer'),
      acceptedAnswers: value('acceptedAnswers').split('|').map((answer) => answer.trim()).filter(Boolean),
      explanation: value('explanation'), timeLimitSec: Number(value('timeLimitSec')),
      isBossRound: card.querySelector('[data-field="isBossRound"]').checked, points: Number(value('points'))
    };
  });
}

export function renderLobbyScreen(container, state, actions) {
  const focusedPlayer = container.querySelector('.move-button:focus')?.dataset.playerId;
  const redPlayers = state.players.filter((player) => player.team === 'red');
  const bluePlayers = state.players.filter((player) => player.team === 'blue');
  const questionSet = state.questionSet || { source: 'demo', title: 'Bộ câu hỏi mẫu', count: 8 };
  container.innerHTML = `
    <section class="lobby-screen">
      <header class="lobby-header">
        <div><p class="eyebrow">Mã phòng</p><h1 class="room-code">${state.roomCode}</h1></div>
        <button id="copy-code" class="button secondary">Sao chép mã phòng</button>
      </header>
      <p class="lobby-message">${state.role === 'host' ? 'Chia đội và bắt đầu khi mọi người đã sẵn sàng.' : `Bạn thuộc ĐỘI ${state.playerTeam === 'red' ? 'ĐỎ' : 'XANH'}. Chờ giáo viên bắt đầu.`}</p>
      ${state.role === 'host' ? `<details class="question-import panel">
        <summary>Thư viện và chỉnh sửa bộ câu hỏi</summary>
        <div class="question-import-content">
          <p class="question-set-status"><strong>${escapeHtml(questionSet.title)}</strong> · ${questionSet.count} câu · ${questionSet.source === 'demo' ? 'Bộ mặc định' : 'Đang dùng'}</p>
          <div class="library-picker">
            <label for="library-set">Thư viện Supabase (${state.librarySets?.length || 0} bộ)</label>
            <select id="library-set"><option value="">Chọn bộ câu hỏi…</option>${(state.librarySets || []).map((set) => `<option value="${escapeHtml(set.id)}" ${set.id === state.editorSetId ? 'selected' : ''}>${escapeHtml(set.title)} (${set.question_count ?? set.questionCount} câu)</option>`).join('')}</select>
            <button id="load-library-set" class="button secondary" type="button">Tải để chỉnh sửa</button>
            <button id="new-question-set" class="button secondary" type="button">Tạo bộ mới</button>
          </div>
          <label for="question-set-title">Tên bộ câu hỏi</label>
          <input id="question-set-title" maxlength="120" value="${escapeHtml(state.editorTitle || '')}" placeholder="Ví dụ: Unit 5 - Environment">
          ${state.editorQuestions?.length ? `<section class="question-editor-list">${state.editorQuestions.map(questionEditorCard).join('')}</section>
          <div class="question-import-actions"><button id="add-question" class="button secondary" type="button">+ Thêm câu</button><button id="save-question-set" class="button primary" type="button" ${state.importingQuestions ? 'disabled' : ''}>${state.importingQuestions ? 'Đang lưu…' : state.editorSetId ? 'Lưu thay đổi và dùng' : 'Lưu bộ mới và dùng'}</button></div>` : `<details class="json-import-box"><summary>Import từ ChatGPT JSON</summary>
          <label for="question-json">Dán JSON vào đây</label><textarea id="question-json" rows="10" spellcheck="false" placeholder='{"title":"Unit 5","questions":[...]}'>${escapeHtml(state.editorJson || '')}</textarea>
          <div class="question-import-actions">
            <button id="import-questions" class="button primary" type="button">Đưa vào trình chỉnh sửa</button>
            <button id="paste-question-json" class="button secondary" type="button">Dán từ clipboard</button>
            <a class="button secondary" href="/api/question-template.json" download>Tải JSON mẫu</a>
            <button id="copy-ai-prompt" class="button secondary" type="button">Sao chép prompt ChatGPT</button>
          </div></details>`}
          <p class="import-help">JSON được kiểm tra trên server trước khi lưu. Import chỉ khả dụng khi trận chưa bắt đầu.</p>
        </div>
      </details>` : ''}
      <div class="teams">
        <section class="team-panel red-team"><h2>${teamBadge('red')} ĐỘI ĐỎ <span>${redPlayers.length}</span></h2><ul>${redPlayers.map((player) => playerCard(player, state)).join('') || `<li class="empty">${mascot('idle')}<p>Đang chờ đồng đội đầu tiên</p></li>`}</ul></section>
        <section class="team-panel blue-team"><h2>${teamBadge('blue')} ĐỘI XANH <span>${bluePlayers.length}</span></h2><ul>${bluePlayers.map((player) => playerCard(player, state)).join('') || `<li class="empty">${mascot('idle')}<p>Đang chờ đồng đội đầu tiên</p></li>`}</ul></section>
      </div>
      ${state.role === 'host' ? `<div class="lobby-actions"><button class="button primary start-button" ${state.canStart ? '' : 'disabled'}>${state.canStart ? 'Bắt đầu trận' : 'Cần ít nhất 1 người mỗi đội'}</button><button id="close-room" class="button danger" type="button">Thoát và đóng phòng</button></div>` : '<p class="waiting-note">Đội đã sẵn sàng. Chờ giáo viên bắt đầu!</p>'}
    </section>`;
  container.querySelectorAll('.move-button').forEach((button) => {
    button.addEventListener('click', () => actions.onMovePlayer(button.dataset.playerId, button.dataset.targetTeam));
  });
  container.querySelector('.start-button')?.addEventListener('click', actions.onStart);
  container.querySelector('#close-room')?.addEventListener('click', actions.onClose);
  container.querySelector('#import-questions')?.addEventListener('click', () => {
    const jsonText = container.querySelector('#question-json').value;
    const title = container.querySelector('#question-set-title').value.trim();
    if (!jsonText.trim()) {
      container.querySelector('#question-json').focus();
      return;
    }
    actions.onPrepareQuestions(jsonText, title);
  });
  container.querySelector('#save-question-set')?.addEventListener('click', () => actions.onSaveQuestions({ title: container.querySelector('#question-set-title').value.trim(), questions: collectEditor(container) }));
  container.querySelector('#add-question')?.addEventListener('click', () => actions.onEditorQuestionsChange([...collectEditor(container), { id: `question_${Date.now()}`, type: 'multiple_choice', level: 'A2', topic: 'general', prompt: '', options: [{ id: 'A', text: '' }, { id: 'B', text: '' }], correctAnswer: 'A', acceptedAnswers: ['A'], explanation: '', timeLimitSec: 20, isBossRound: false, points: 100 }], container.querySelector('#question-set-title').value.trim()));
  container.querySelectorAll('.remove-question').forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.closest('.question-editor-card').dataset.questionIndex);
    actions.onEditorQuestionsChange(collectEditor(container).filter((_question, questionIndex) => questionIndex !== index), container.querySelector('#question-set-title').value.trim());
  }));
  container.querySelector('#load-library-set')?.addEventListener('click', () => actions.onLoadLibrary(container.querySelector('#library-set').value));
  container.querySelector('#new-question-set')?.addEventListener('click', actions.onNewQuestionSet);
  container.querySelector('#question-json')?.addEventListener('input', () => actions.onEditorChange(container.querySelector('#question-json').value, container.querySelector('#question-set-title').value));
  container.querySelector('#question-set-title')?.addEventListener('input', () => actions.onEditorChange(container.querySelector('#question-json').value, container.querySelector('#question-set-title').value));
  container.querySelector('#paste-question-json')?.addEventListener('click', async (event) => {
    try {
      container.querySelector('#question-json').value = await navigator.clipboard.readText();
      event.currentTarget.textContent = 'Đã dán JSON!';
    } catch (_error) {
      event.currentTarget.textContent = 'Nhấn Ctrl+V để dán';
      container.querySelector('#question-json').focus();
    }
  });
  container.querySelector('#copy-ai-prompt')?.addEventListener('click', async (event) => {
    try {
      await navigator.clipboard.writeText(CHATGPT_PROMPT);
      event.currentTarget.textContent = 'Đã sao chép prompt!';
    } catch (_error) {
      event.currentTarget.textContent = 'Không thể sao chép';
    }
  });
  previousTeams = new Map(state.players.map((player) => [player.playerId, player.team]));
  if (focusedPlayer) {
    [...container.querySelectorAll('.move-button')].find((button) => button.dataset.playerId === focusedPlayer)?.focus();
  }
  container.querySelector('#copy-code').addEventListener('click', async (event) => {
    try {
      await navigator.clipboard.writeText(state.roomCode);
      event.target.textContent = 'Đã sao chép!';
    } catch (_error) {
      event.target.textContent = `Sao chép thủ công: ${state.roomCode}`;
    }
  });
}
