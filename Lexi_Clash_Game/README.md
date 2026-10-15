# Lexi Clash

Lexi Clash là game thi đấu tiếng Anh realtime cho lớp học. Một giáo viên tạo phòng và điều khiển trận đấu; học sinh tham gia bằng mã 6 ký tự, được chia vào Đội Đỏ hoặc Đội Xanh và trả lời câu hỏi trên thiết bị riêng.

## Tính năng

- Phòng realtime tối đa 30 người chơi, tự cân bằng đội và cho phép host đổi đội.
- Hai dạng câu hỏi: Multiple Choice và Word Forge.
- Timer authoritative trên server, grace period 500 ms và first-write-wins.
- XP cá nhân, speed bonus, Battle Score chuẩn hóa và Boss round ×2.
- Mỗi đội có một đội trưởng được chọn ngẫu nhiên khi bắt đầu; đội chỉ có một thành viên sẽ tự động chọn người đó.
- Một round thường được chọn ngẫu nhiên làm Leader Duel: chỉ hai đội trưởng trả lời, đội thắng nhận gấp đôi điểm round và đội thua bị trừ phần điểm thưởng tương ứng (điểm tổng không âm).
- Host có thể kết thúc câu hỏi sớm; giao diện chỉ mở nút khi tất cả người chơi hợp lệ đã trả lời.
- Reconnect player trong 90 giây; host disconnect sẽ pause trận và giữ phòng 120 giây.
- Kết quả từng vòng, bảng xếp hạng cá nhân theo XP/độ chính xác, danh sách câu cần ôn và chơi lại.
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
- `server/questionImport.js`: parse/normalize/validate bộ câu hỏi JSON và CSV.
- `server/questionStore.js`: lưu bộ câu hỏi trên Supabase hoặc RAM khi local chưa cấu hình.
- `public/`: client HTML/CSS/JavaScript thuần, không cần build.

## Giới hạn MVP

- Dữ liệu phòng chỉ nằm trong RAM; restart server sẽ mất các trận đang chạy.
- Chưa có tài khoản Teacher, thư viện đề theo người dùng, moderation hoặc dashboard quản trị; Supabase hiện chỉ lưu bộ câu hỏi import theo room.
- Bộ câu hỏi demo cần được giáo viên kiểm duyệt trước khi dùng chính thức.
- Nhạc YouTube phụ thuộc kết nối mạng, quyền autoplay và khả năng nhúng video; SFX cục bộ hoạt động độc lập.

## Supabase và import câu hỏi

Backend import JSON/CSV theo room đã được triển khai. Chạy migration `supabase/migrations/202610160001_create_room_question_sets.sql`, sau đó cấu hình `SUPABASE_URL` và `SUPABASE_SECRET_KEY` theo `.env.example`. Secret key chỉ được đặt trên server. Hướng dẫn API đầy đủ nằm tại `docs/reports/SUPABASE_QUESTION_IMPORT_BACKEND.md`.

Host có thể import JSON ngay trong lobby, tải file mẫu và sao chép prompt tạo đề cho ChatGPT. Xem schema và cách seed Supabase tại `docs/QUESTION_IMPORT_GUIDE.md`. Chạy `npm.cmd run seed:supabase` để nạp `data/question-set.seed.json` vào bảng `room_question_sets`.

## Deploy Render

Repository dùng `render.yaml` ở git root và đặt `rootDir: Lexi_Clash_Game`. Nếu cấu hình Web Service thủ công, đặt **Root Directory** là `Lexi_Clash_Game`, **Build Command** là `npm ci`, **Start Command** là `npm start` và **Health Check Path** là `/ping`. Khai báo `SUPABASE_URL` cùng `SUPABASE_SECRET_KEY` trong Render Environment; không upload `.env`.

## Nguồn và giấy phép

Ứng dụng dùng Express và Socket.IO. Giao diện dùng system font và artwork được cung cấp trong `public/assets`, không tải font hoặc hình ảnh từ CDN. Chủ dự án lưu thông tin nguồn/giấy phép artwork và audio khi bổ sung.

## UI và VFX

Thiết kế Modern Classroom Battle dùng token trong `public/css/arena.css`, thành phần HTML dùng chung tại `public/js/ui.js`. Các báo cáo audit, inventory, yêu cầu tài nguyên, lựa chọn công nghệ, tổng kết và roadmap nằm trong `docs/reports/`.

Tạo lại WebP từ PNG nguồn: `cut_img\venv\Scripts\python.exe cut_img\optimize_assets.py` (cần Pillow trong môi trường Python). PNG gốc được giữ nguyên.

Kiểm thử Chrome headless: `node scripts/ui-smoke.cjs`. Mặc định dùng Chrome trên Windows; đặt `CHROME_PATH` nếu executable nằm ở vị trí khác. Script tự mở server trên cổng trống, kiểm tra 5 viewport và trận thật với client trình duyệt; screenshot được lưu tại `docs/reports/screenshots/`. Không cần cài thư viện browser automation. Kiểm tra Safari và thiết bị thật vẫn cần thực hiện riêng.

## Âm thanh

SFX cục bộ và nhạc nền YouTube được quản lý tại `public/js/audio.js`. Track Lobby tự thử phát từ trang `/` và tiếp tục ở phòng chờ; Teacher và Player đều nhận track Lobby/Battle/Results trên thiết bị của mình. Nếu trình duyệt chặn autoplay, dùng nút `Phát nhạc` trong panel âm thanh. Báo cáo triển khai và các giới hạn của YouTube nằm tại `docs/reports/AUDIO_IMPLEMENTATION_REPORT.md`.
