# Lexi Clash

Lexi Clash là game thi đấu tiếng Anh realtime cho lớp học. Một giáo viên tạo phòng và điều khiển trận đấu; học sinh tham gia bằng mã 6 ký tự, được chia vào Đội Đỏ hoặc Đội Xanh và trả lời câu hỏi trên thiết bị riêng.

## Tính năng

- Phòng realtime tối đa 30 người chơi, tự cân bằng đội và cho phép host đổi đội.
- Hai dạng câu hỏi: Multiple Choice và Word Forge.
- Timer authoritative trên server, grace period 500 ms và first-write-wins.
- XP cá nhân, speed bonus, Battle Score chuẩn hóa và Boss round ×2.
- Reconnect player trong 90 giây; host disconnect sẽ pause trận và giữ phòng 120 giây.
- Kết quả từng vòng, tổng kết cá nhân, danh sách câu cần ôn và chơi lại.
- Giao diện responsive từ mobile 375 px đến desktop/projector.

## Yêu cầu

- Node.js 22 trở lên.
- Các thiết bị phải truy cập được cùng server qua mạng LAN hoặc Internet.

## Cài đặt và chạy

```bash
npm install
npm start
```

Mở `http://localhost:3000`. Để chơi trong mạng LAN, tìm IP của máy chạy server rồi mở `http://<IP-máy-chủ>:3000` trên các thiết bị khác. Cho phép Node.js qua firewall nếu hệ điều hành yêu cầu.

Có thể đổi cổng bằng biến môi trường `PORT`:

```bash
PORT=8080 npm start
```

Trên PowerShell:

```powershell
$env:PORT=8080; npm.cmd start
```

## Kiểm thử

```bash
npm test
```

Test suite dùng `node:test` và `socket.io-client`, bao phủ normalization, scoring, room lifecycle, state machine và trận realtime nhiều client.

## Cấu trúc chính

- `server/index.js`: HTTP server và Socket.IO event handlers.
- `server/roomManager.js`: vòng đời phòng, player, đội và reconnect.
- `server/gameManager.js`: state machine, timer, submission và scoring.
- `data/questions.json`: bộ 8 câu demo A2/B1.
- `public/`: client HTML/CSS/JavaScript thuần, không cần build.

## Giới hạn MVP

- Dữ liệu phòng chỉ nằm trong RAM; restart server sẽ mất các trận đang chạy.
- Chưa có tài khoản, cơ sở dữ liệu, moderation hoặc dashboard quản trị.
- Bộ câu hỏi demo cần được giáo viên kiểm duyệt trước khi dùng chính thức.
- Không có âm thanh; hình ảnh và hiệu ứng dùng CSS/Unicode, không phụ thuộc asset ngoài.

## Nguồn và giấy phép

Ứng dụng dùng Express và Socket.IO. Giao diện dùng system font và asset CSS/Unicode tự tạo, không tải font hoặc hình ảnh bên ngoài.
