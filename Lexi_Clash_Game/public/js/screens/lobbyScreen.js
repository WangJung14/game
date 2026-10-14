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
  return `<li class="player ${player.isConnected ? '' : 'offline'}">
    <span class="avatar">${player.displayName.charAt(0).toUpperCase()}</span>
    <span>${escapeHtml(player.displayName)}${player.playerId === state.playerId ? ' (Bạn)' : ''}</span>
    ${moveButton}
  </li>`;
}

export function renderLobbyScreen(container, state, actions) {
  const redPlayers = state.players.filter((player) => player.team === 'red');
  const bluePlayers = state.players.filter((player) => player.team === 'blue');
  container.innerHTML = `
    <section class="lobby-screen">
      <header class="lobby-header">
        <div><p class="eyebrow">Mã phòng</p><h1 class="room-code">${state.roomCode}</h1></div>
        <div class="connection-pill">● Đã kết nối</div>
      </header>
      <p class="lobby-message">${state.role === 'host' ? 'Chia đội và bắt đầu khi mọi người đã sẵn sàng.' : `Bạn thuộc ĐỘI ${state.playerTeam === 'red' ? 'ĐỎ' : 'XANH'}. Chờ giáo viên bắt đầu.`}</p>
      <div class="teams">
        <section class="team-panel red-team"><h2>ĐỘI ĐỎ <span>${redPlayers.length}</span></h2><ul>${redPlayers.map((player) => playerCard(player, state)).join('') || '<li class="empty">Chưa có người chơi</li>'}</ul></section>
        <section class="team-panel blue-team"><h2>ĐỘI XANH <span>${bluePlayers.length}</span></h2><ul>${bluePlayers.map((player) => playerCard(player, state)).join('') || '<li class="empty">Chưa có người chơi</li>'}</ul></section>
      </div>
      ${state.role === 'host' ? `<button class="button primary start-button" ${state.canStart ? '' : 'disabled'} title="Luồng trận đấu được nối ở milestone M4">${state.canStart ? 'Bắt đầu trận' : 'Cần ít nhất 1 người mỗi đội'}</button>` : ''}
    </section>`;
  container.querySelectorAll('.move-button').forEach((button) => {
    button.addEventListener('click', () => actions.onMovePlayer(button.dataset.playerId, button.dataset.targetTeam));
  });
}
