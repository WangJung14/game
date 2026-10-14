export function renderJoinScreen(container, actions) {
  container.innerHTML = `
    <section class="join-screen">
      <header class="brand">
        <p class="eyebrow">English Battle Arena</p>
        <h1>LEXI <span>CLASH</span></h1>
        <p>Thi đấu từ vựng cùng cả lớp.</p>
      </header>
      <div class="join-grid">
        <form id="join-form" class="panel">
          <h2>Tham gia phòng</h2>
          <label for="room-code">Mã phòng</label>
          <input id="room-code" name="roomCode" maxlength="6" autocomplete="off" placeholder="ABCDEF" required>
          <label for="display-name">Tên hiển thị</label>
          <input id="display-name" name="displayName" minlength="2" maxlength="16" autocomplete="nickname" placeholder="Tên của bạn" required>
          <button class="button primary" type="submit">Tham gia</button>
        </form>
        <section class="panel host-card">
          <h2>Dành cho giáo viên</h2>
          <p>Tạo phòng mới và chia học sinh thành hai đội.</p>
          <button id="create-room" class="button secondary" type="button">Tạo phòng</button>
        </section>
      </div>
    </section>`;
  container.querySelector('#join-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    actions.onJoin({ roomCode: String(form.get('roomCode')).trim().toUpperCase(), displayName: String(form.get('displayName')).trim() });
  });
  container.querySelector('#create-room').addEventListener('click', actions.onCreate);
}
