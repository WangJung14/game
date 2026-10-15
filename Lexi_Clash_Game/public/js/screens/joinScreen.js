import { artwork, mascot } from '../ui.js';

export function renderJoinScreen(container, actions) {
  container.innerHTML = `
    <section class="join-screen">
      <header class="brand">
        <div class="brand-art">${artwork('Lexi Clash Energy Badge Logo.png', 'brand-logo', 'Lexi Clash')}${mascot('welcome')}</div>
        <p class="eyebrow">English Battle Arena</p>
        <h1>LEXI <span>CLASH</span></h1>
        <p>Hai đội. Một thử thách. Cùng nhau giỏi tiếng Anh hơn.</p>
      </header>
      <div class="join-grid">
        <form id="join-form" class="panel">
          <p class="eyebrow">Dành cho người chơi</p><h2>Vào đội của bạn</h2>
          <label for="room-code">Mã phòng</label>
          <input id="room-code" name="roomCode" minlength="6" maxlength="6" pattern="[A-Za-z0-9]{6}" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCDEF" aria-describedby="code-help" required>
          <small id="code-help">Nhập mã 6 ký tự do giáo viên cung cấp.</small>
          <label for="display-name">Tên hiển thị</label>
          <input id="display-name" name="displayName" minlength="2" maxlength="16" autocomplete="nickname" placeholder="Tên của bạn" required>
          <button class="button primary" type="submit">Tham gia</button>
        </form>
        <section class="panel host-card">
          ${artwork('icons/icon-create-room.png', 'host-art')}
          <p class="eyebrow">Dành cho giáo viên</p><h2>Khởi động đấu trường</h2>
          <p>Tạo phòng mới và chia học sinh thành hai đội.</p>
          <button id="create-room" class="button secondary" type="button">Tạo phòng mới</button>
          <small>Chia sẻ mã phòng → Chia đội → Bắt đầu</small>
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
