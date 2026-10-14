**LEXI CLASH**

**ENGLISH BATTLE ARENA**

**TÀI LIỆU THIẾT KẾ GAME (GDD)  
VÀ LỘ TRÌNH PHÁT TRIỂN**

Học tiếng Anh bằng cách phối hợp, giải đố và chiến đấu theo đội

| **RED TEAM** | **VS** | **BLUE TEAM** |
| ------------ | ------ | ------------- |

**PHIÊN BẢN 0.1 | NGÀY 15/10/2026**

_Tài liệu khởi đầu dành cho người lần đầu phát triển game. Các con số và cơ chế là giả thuyết thiết kế cần được thử nghiệm, không phải đặc tả cuối cùng._

# Cách dùng tài liệu này

Đây là bản thiết kế phiên bản 0.1 để biến ý tưởng thành một sản phẩm có thể xây dựng và kiểm thử. Bạn không cần làm mọi thứ trong tài liệu ngay lập tức. Hãy dùng GDD này làm "nguồn sự thật" chung: khi thay đổi luật chơi, cập nhật tài liệu trước rồi mới sửa code.

**NGUYÊN TẮC SỐ 1**

Đừng bắt đầu bằng hiệu ứng đẹp hoặc bản đồ phức tạp. Hãy chứng minh rằng một phòng chơi có thể đồng bộ câu hỏi, nhận câu trả lời, tính điểm và tạo cảm giác cạnh tranh trước.

## Lộ trình tổng quan

| **Giai đoạn**         | **Bạn tạo ra gì?**                                             | **Chưa làm gì?**                      |
| --------------------- | -------------------------------------------------------------- | ------------------------------------- |
| 0\. Chốt đề bài       | Xác nhận yêu cầu với giáo viên; chốt nền tảng và tiêu chí nộp. | Chưa lập trình.                       |
| 1\. Thiết kế game     | GDD, luật chơi, luồng màn hình, mẫu câu hỏi.                   | Chưa làm đồ họa hoàn chỉnh.           |
| 2\. Prototype         | Một vòng chơi thử được trên một máy.                           | Chưa có multiplayer.                  |
| 3\. Multiplayer       | Tạo phòng, mã phòng, join, chia đội, đồng bộ câu hỏi.          | Chưa có bản đồ chiến thuật phức tạp.  |
| 4\. Tạo cảm giác game | Điểm đội, thanh Boss, phản hồi đúng/sai, âm thanh đơn giản.    | Chưa thêm nhiều kỹ năng.              |
| 5\. Nội dung học tập  | Ngân hàng câu hỏi, lời giải thích, thống kê cơ bản.            | Chưa cần tài khoản đầy đủ.            |
| 6\. Kiểm thử và nộp   | Sửa lỗi, chạy thử với người thật, hướng dẫn chạy và báo cáo.   | Không thêm tính năng lớn sát hạn nộp. |

## Những việc cần chốt với giáo viên trước khi code

- \[ \] Game bắt buộc phải chơi trên web hay có thể chạy ứng dụng Windows?
- \[ \] Có bắt buộc nhiều máy cùng tham gia một phòng qua mạng không?
- \[ \] Nội dung tiếng Anh thuộc lớp/cấp độ nào và có chủ đề bắt buộc không?
- \[ \] Có cần lưu kết quả học sinh, tài khoản hoặc báo cáo điểm không?
- \[ \] Tiêu chí chấm điểm là gameplay, kiến thức, đồ họa, kỹ thuật hay báo cáo?

Nếu chưa nhận được câu trả lời, hãy dùng các giả định trong GDD này và tránh xây tính năng khó đảo ngược.

# 1\. Tóm tắt dự án

| **Mục**             | **Định nghĩa phiên bản 0.1**                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Tên làm việc        | Lexi Clash: English Battle Arena                                                             |
| Thể loại            | Game học tiếng Anh nhiều người, quiz battle, giải đố theo đội.                               |
| Đối tượng           | Học sinh cấp 3; chơi trong lớp hoặc nhóm bạn.                                                |
| Thiết bị            | Trình duyệt trên laptop/PC; điện thoại có thể tối ưu sau.                                    |
| Ngôn ngữ giao diện  | Tiếng Việt để điều hướng; câu hỏi và nội dung học bằng tiếng Anh.                            |
| Số người thử nghiệm | 8–20 người trong một phòng là mục tiêu thử nghiệm ban đầu; chưa phải cam kết tải tối đa.     |
| Thời lượng trận     | Khoảng 5–8 phút, có thể điều chỉnh.                                                          |
| Mục tiêu học tập    | Luyện từ vựng, chính tả và ngữ pháp cơ bản; giúp người chơi hiểu vì sao đáp án đúng.         |
| Công nghệ dự kiến   | HTML, CSS, JavaScript phía client; Node.js và Socket.IO cho multiplayer.                     |
| Phạm vi MVP         | Phòng chơi, 2 đội, câu hỏi đồng bộ, tính điểm, thanh tiến triển trận đấu, kết quả cuối trận. |

# 2\. Tầm nhìn và nguyên tắc thiết kế

## Một câu mô tả game

**PITCH**

Hai đội Red và Blue tham gia một đấu trường tiếng Anh. Mỗi người giải câu đố trên thiết bị của mình; câu trả lời đúng đóng góp điểm cho bản thân và sức mạnh cho đội. Đội phối hợp tốt hơn sẽ giành chiến thắng.

## Năm nguyên tắc thiết kế

| **Nguyên tắc**               | **Áp dụng vào game**                                                     | **Dấu hiệu cần tránh**                                    |
| ---------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| Học là hành động chính       | Mỗi câu trả lời phải giúp luyện một kỹ năng tiếng Anh cụ thể.            | Câu hỏi chỉ là phần chen giữa các hiệu ứng chiến đấu.     |
| Ai cũng có lượt              | Mỗi người tự gửi đáp án trong từng vòng; đóng góp cá nhân được ghi nhận. | Chỉ một bạn giỏi trả lời thay cho cả đội.                 |
| Trận đấu có nhịp             | Xen kẽ câu nhanh, câu nhập từ và vòng đặc biệt.                          | Tất cả vòng đều là bốn nút A/B/C/D.                       |
| Cạnh tranh thân thiện        | Sai được phản hồi và giải thích; không làm nhục người trả lời sai.       | Phạt nặng hoặc loại người chơi sớm.                       |
| Phạm vi nhỏ nhưng hoàn chỉnh | Hoàn thành một trận từ đầu tới cuối trước khi thêm tính năng.            | Làm đồng thời bản đồ lớn, cửa hàng, kỹ năng và tài khoản. |

## Mục tiêu không nằm trong MVP

- Không làm thế giới mở, di chuyển nhân vật tự do hoặc chiến đấu thời gian thực.
- Không làm voice chat, chat tự do hoặc hệ thống bạn bè.
- Không cần đăng nhập OAuth, cửa hàng vật phẩm hoặc tiền tệ ảo.
- Không cần database ở phiên bản đầu nếu chỉ cần chơi thử và không phải lưu lâu dài.
- Không dùng AI tạo câu hỏi trực tiếp khi trận đang diễn ra; nội dung ban đầu nên được biên soạn và rà soát trước.

# 3\. Vòng lặp trải nghiệm của người chơi

## Vòng lặp cốt lõi

```
Vào phòng → Chọn tên / tham gia đội → Đọc câu hỏi → Tự trả lời → Nhận phản hồi
→ Đóng góp điểm cho đội → Xem thay đổi thanh chiến đấu → Sang câu tiếp theo → Tổng kết
```

Mỗi vòng nên làm cho người chơi hiểu ba điều: câu hỏi muốn mình làm gì, mình vừa làm đúng hay sai, và câu trả lời của mình ảnh hưởng đến trận đấu như thế nào.

## Luồng một trận đề xuất

| **Bước**                       | **Thời gian dự kiến** | **Trải nghiệm**                                                               |
| ------------------------------ | --------------------- | ----------------------------------------------------------------------------- |
| Lobby                          | 30–60 giây            | Host tạo phòng; người chơi nhập mã; đội được chia tự động hoặc host cân bằng. |
| Hướng dẫn ngắn                 | 15 giây               | Hiện cách trả lời, luật điểm và mục tiêu trận.                                |
| Vòng 1–2: Quick Attack         | 20–25 giây/vòng       | Câu trắc nghiệm dễ để mọi người nhập cuộc.                                    |
| Vòng 3–5: Word Forge / Grammar | 30–40 giây/vòng       | Gõ từ hoặc sửa câu; mức thử thách tăng nhẹ.                                   |
| Vòng 6–7: Mixed Challenge      | 25–40 giây/vòng       | Trộn loại câu hỏi, thêm manh mối hoặc câu điểm cao.                           |
| Vòng cuối: Boss Battle         | 30–45 giây            | Câu tổng kết; kết quả gây thay đổi lớn hơn nhưng không xoá công sức trước đó. |
| Tổng kết                       | 30–45 giây            | Công bố đội thắng, thành viên đóng góp và các câu cần ôn lại.                 |

Tổng thời lượng thực tế phụ thuộc tốc độ đọc, thời gian giải thích và số người tham gia. Hãy đo trong playtest thay vì cố ép trận phải dài đúng một con số.

# 4\. Thiết kế các kiểu câu hỏi

MVP chỉ cần hai kiểu câu hỏi chính và một vòng kết thúc đặc biệt. Vòng Boss có thể dùng lại bộ câu hỏi hiện có, không cần xây thêm một hệ thống gameplay hoàn toàn mới.

| **Kiểu**                  | **Ví dụ**                                                                     | **Thời gian** | **Cách chấm MVP**                                                                   |
| ------------------------- | ----------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------- |
| Quick Attack: trắc nghiệm | Choose the closest meaning of "careful". A. lazy B. cautious C. noisy D. rude | 15–20 giây    | So sánh option ID với đáp án đúng.                                                  |
| Word Forge: nhập từ       | Clue: "A place where students borrow books." Answer: library                  | 25–35 giây    | Trim khoảng trắng, không phân biệt hoa/thường; chưa xử lý lỗi chính tả gần đúng.    |
| Grammar Repair: sửa câu   | She go to school every day. → She goes to school every day.                   | 30–40 giây    | MVP có thể chấp nhận một đáp án chuẩn; bổ sung nhiều đáp án hợp lệ ở giai đoạn sau. |
| Boss Battle               | Một câu khó hơn hoặc chuỗi 2–3 câu tổng hợp.                                  | 30–45 giây    | Kết quả đội gây sát thương lên Boss theo số thành viên trả lời đúng.                |

## Quy tắc biên soạn câu hỏi

- Mỗi câu có một mục tiêu học tập rõ: từ vựng, chính tả, đọc hiểu hoặc ngữ pháp.
- Đáp án sai phải hợp lý nhưng không gây tranh cãi; tránh câu có hai đáp án đúng khi chỉ cho phép một.
- Giải thích sau khi trả lời nên ngắn: đáp án, nghĩa/cấu trúc và một ví dụ nếu cần.
- Ghi độ khó và chủ đề để trộn câu hỏi có kiểm soát.
- Không dùng tốc độ làm yếu tố quyết định chính; cho điểm tốc độ rất nhỏ hoặc bỏ khỏi MVP để công bằng với người đọc chậm.

## Ví dụ dữ liệu câu hỏi

```
{
  "id": "vocab_001",
  "type": "multiple_choice",
  "level": "A2",
  "topic": "school",
  "prompt": "Choose the closest meaning of careful.",
  "options": [
    { "id": "A", "text": "lazy" },
    { "id": "B", "text": "cautious" },
    { "id": "C", "text": "noisy" },
    { "id": "D", "text": "rude" }
  ],
  "correctAnswer": "B",
  "explanation": "Careful means giving attention to avoid mistakes or danger.",
  "points": 100
}
```

Ví dụ chỉ để minh hoạ định dạng. Trong code thật, đáp án đúng không nên được gửi tới trình duyệt trước khi người chơi nộp bài; server cần giữ đáp án để giảm khả năng gian lận.

# 5\. Luật chơi và tính điểm

## Luật cơ bản

- Mỗi phòng có một Host và hai đội Red / Blue.
- Mỗi người chỉ được gửi một đáp án cho mỗi câu; khi hết giờ, câu hỏi tự khoá.
- Server chấm điểm và phát kết quả tới toàn phòng; trình duyệt không tự quyết định điểm chính thức.
- Người chơi có XP cá nhân; đội có Battle Score dùng để quyết định tiến triển trận đấu.
- Sai không loại người chơi và không làm mất toàn bộ điểm đã kiếm được.
- Kết thúc trận, hiển thị đội thắng, XP cá nhân, tỷ lệ đúng và câu cần ôn.

## Công thức điểm đơn giản cho MVP

| **Sự kiện**          | **XP cá nhân**                    | **Battle Score đội**                  |
| -------------------- | --------------------------------- | ------------------------------------- |
| Trả lời đúng         | +100                              | +1 đóng góp đúng                      |
| Trả lời sai          | +0; vẫn được ghi nhận đã tham gia | +0 đóng góp đúng                      |
| Không trả lời        | +0                                | Không tính là đúng; ghi nhận vắng câu |
| Hoàn thành vòng Boss | +0 đến +50 XP thưởng tuỳ kết quả  | Cộng tiến triển theo số đáp án đúng   |

Mỗi vòng, server tính tỷ lệ đúng của đội = số người trả lời đúng / số người đã trả lời. Với MVP, dùng số câu đúng để quyết định tiến triển Boss, còn tỷ lệ đúng dùng cho báo cáo học tập. Cần quyết định rõ cách tính khi người chơi mất kết nối; đề xuất bỏ người không gửi đáp án khỏi mẫu số tỷ lệ đúng nhưng vẫn báo riêng tỷ lệ tham gia.

## Công bằng và chống một người gánh đội

- Cho mỗi người trả lời riêng; không có ô đáp án chung cho cả đội trong các vòng bình thường.
- Điểm cá nhân không được cộng trực tiếp thành toàn bộ điểm đội mà không chuẩn hoá theo số người.
- Có thể thưởng "team participation" nhỏ khi phần lớn thành viên gửi đáp án, bất kể đúng sai; không thưởng quá lớn để tránh spam.
- Chưa làm xếp hạng toàn trường hoặc so sánh công khai giữa các cá nhân trong MVP.
- Ở chế độ lớp học, host có thể chọn tên hiển thị; không yêu cầu người chơi nhập thông tin riêng tư.

# 6\. Màn hình cần thiết

| **Màn hình**      | **Thành phần tối thiểu**                                           | **Hoàn thành khi...**                                           |
| ----------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| Landing / Join    | Tên game, ô room code, tên hiển thị, nút Join.                     | Người chơi nhập mã hợp lệ và vào đúng phòng.                    |
| Host Lobby        | Mã phòng dễ đọc, danh sách người chơi, cân bằng đội, nút Start.    | Host thấy ai đã vào; không thể bắt đầu khi không có người chơi. |
| Player Lobby      | Tên và màu đội, số người hai đội, trạng thái chờ.                  | Người chơi biết mình ở đội nào và khi nào trận bắt đầu.         |
| Question          | Nội dung câu hỏi, lựa chọn/ô nhập, đồng hồ, nút Submit.            | Câu hỏi đồng bộ; gửi một lần; nút khoá khi hết giờ.             |
| Reveal / Feedback | Đúng/sai, đáp án, giải thích, điểm cá nhân, thay đổi Battle Score. | Mọi người thấy cùng một kết quả.                                |
| Battle HUD        | Red vs Blue, thanh Boss hoặc thanh tiến triển, vòng hiện tại.      | Mọi hành động được server xác nhận và cập nhật đồng nhất.       |
| Results           | Đội thắng, điểm đội, XP cá nhân, accuracy, câu cần ôn.             | Host có thể kết thúc hoặc chơi lại.                             |

## Bố cục màn hình câu hỏi

```
TOP BAR: RED TEAM 320 pts  |  ROUND 3 / 8  |  BLUE TEAM 290 pts
BOSS ENERGY: 10 / 16

QUESTION 03
Choose the closest meaning of careful.

[ A. lazy ]     [ B. cautious ]
[ C. noisy ]    [ D. rude ]

TIME LEFT: 12 seconds
[ SUBMIT ANSWER ]
```

Đây là wireframe chữ để thống nhất thứ tự thông tin, không phải mẫu giao diện cuối. Ưu tiên chữ dễ đọc, vùng bấm lớn, màu đội có nhãn đi kèm và không dùng màu sắc làm tín hiệu duy nhất.

# 7\. Kiến trúc kỹ thuật đề xuất

**STACK KHUYÊN DÙNG**

Frontend: HTML + CSS + JavaScript. Backend realtime: Node.js + Express + Socket.IO. MVP chưa cần database; dữ liệu phòng và trận được giữ trong bộ nhớ server. Khi cần lưu lịch sử, hãy bổ sung database sau.

## Vai trò của từng phần

| **Thành phần** | **Trách nhiệm**                                                              | **Không nên làm**                                                   |
| -------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Frontend       | Hiển thị màn hình, lấy đáp án, hiện đồng hồ và kết quả nhận từ server.       | Không tự quyết định đáp án đúng hoặc điểm chính thức.               |
| Node.js server | Quản lý phòng, trạng thái trận, thời gian, đáp án và điểm số.                | Không tin điểm số do client gửi lên.                                |
| Socket.IO      | Gửi sự kiện theo phòng: người vào/ra, câu hỏi mới, kết quả, trận kết thúc.   | Không phát đáp án đúng trước khi đóng nhận bài.                     |
| Question bank  | Dữ liệu câu hỏi có type, prompt, options, correctAnswer, explanation, level. | Không để câu hỏi thiếu đáp án hoặc giải thích không rõ.             |
| Memory state   | Lưu room, players, current round, timer state, scores.                       | Không xem dữ liệu trong RAM là lịch sử bền vững sau khi server tắt. |

## Cấu trúc thư mục ban đầu

```
lexi-clash/
  package.json
  server/
    index.js              # Khởi tạo Express và Socket.IO
    roomManager.js        # Tạo phòng, tham gia, rời phòng
    gameManager.js        # Trạng thái trận, vòng chơi, điểm
    questionBank.js       # Ngân hàng câu hỏi
  public/
    index.html
    css/style.css
    js/app.js             # Điều phối giao diện phía client
    js/socketClient.js    # Kết nối và lắng nghe sự kiện
    js/screens/            # Có thể tách màn hình khi code lớn lên
  README.md
```

Đây là cấu trúc gợi ý. Không cần tạo đủ file từ ngày đầu; hãy bắt đầu với server/index.js, public/index.html, public/css/style.css, public/js/app.js và questionBank.js rồi tách nhỏ khi cần.

## Luồng sự kiện realtime tối thiểu

| **Sự kiện**   | **Ai gửi?**              | **Ý nghĩa**                                                         |
| ------------- | ------------------------ | ------------------------------------------------------------------- |
| room:create   | Host → server            | Tạo phòng, nhận room code.                                          |
| room:join     | Player → server          | Tham gia phòng; server gán ID và đội.                               |
| lobby:update  | Server → cả phòng        | Cập nhật danh sách người chơi và đội.                               |
| game:start    | Host → server            | Bắt đầu nếu phòng đủ điều kiện.                                     |
| question:show | Server → cả phòng        | Gửi nội dung câu hỏi, question ID, thời hạn; không gửi đáp án.      |
| answer:submit | Player → server          | Gửi answer + question ID; server kiểm tra và ghi nhận một lần.      |
| round:result  | Server → cả phòng        | Gửi đúng/sai, giải thích, điểm và trạng thái trận.                  |
| game:over     | Server → cả phòng        | Gửi kết quả cuối và thống kê.                                       |
| error:notice  | Server → người liên quan | Báo mã phòng không hợp lệ, câu đã khoá hoặc hành động không hợp lệ. |

# 8\. Quy trình phát triển theo thứ tự

Thời gian dưới đây là khung tham khảo cho một người mới làm game và học dần trong lúc triển khai. Có thể dài hơn nếu bạn chưa quen JavaScript, Node.js hoặc Socket.IO. Mỗi giai đoạn phải có sản phẩm kiểm tra được trước khi chuyển tiếp.

| **Giai đoạn**            | **Việc phải làm**                                                                             | **Đầu ra / điều kiện qua bước**                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 0\. Chốt yêu cầu         | Trao đổi giáo viên; ghi rõ thiết bị, số người, nội dung tiếng Anh, tiêu chí chấm và deadline. | Một trang phạm vi dự án; các yêu cầu bắt buộc được đánh dấu.                      |
| 1\. GDD                  | Chốt loop, luật, loại câu hỏi, điểm, màn hình, phạm vi MVP.                                   | Tài liệu này được chỉnh lại theo yêu cầu thật; không còn quyết định lớn bị mơ hồ. |
| 2\. Prototype trên giấy  | Vẽ 5–7 màn hình bằng giấy/Figma; diễn thử 3 câu hỏi với bạn bè.                               | Người khác hiểu cách chơi mà không cần bạn giải thích miệng quá nhiều.            |
| 3\. Local vertical slice | Làm một câu hỏi, nhập đáp án, chấm, hiện giải thích và cập nhật thanh Boss trên một máy.      | Một vòng hoàn chỉnh chạy được từ đầu đến cuối.                                    |
| 4\. Multiplayer cơ bản   | Tạo phòng, join bằng mã, chia đội, đồng bộ người chơi và câu hỏi.                             | Hai trình duyệt khác nhau nhìn thấy cùng câu hỏi và cùng kết quả.                 |
| 5\. Trận hoàn chỉnh      | 8 câu, timer trên server, khoá đáp án, XP, Battle Score, kết quả.                             | Có thể hoàn thành một trận mà không sửa dữ liệu thủ công.                         |
| 6\. Học tập và phản hồi  | Thêm giải thích, topic/level, thống kê câu sai và trang ôn tập.                               | Mỗi câu sai đều cho người chơi biết lý do hoặc cách học lại.                      |
| 7\. Playtest và sửa lỗi  | Thử với 4–8 người trước, sau đó tăng dần; ghi lại lỗi và điểm gây khó hiểu.                   | Không có lỗi chặn trận; game có thể chơi lại và người mới tự hiểu luồng.          |
| 8\. Đóng gói và nộp      | README, cách cài, cách chạy, ảnh chụp, báo cáo chức năng, ghi nhận thư viện/asset.            | Một người khác có thể clone và chạy theo hướng dẫn.                               |

## Thứ tự code chi tiết: làm theo lát cắt dọc

1. Làm trang Join với tên hiển thị và room code giả lập; kiểm tra giao diện trên hai kích thước màn hình.
2. Viết một câu hỏi local: hiển thị lựa chọn, nhận submit, kiểm tra đúng/sai, giải thích và điểm.
3. Đặt trạng thái game rõ ràng: lobby → question → reveal → next question → results.
4. Đưa timer và chấm điểm sang server để mọi người có cùng thời gian và kết quả.
5. Thêm Socket.IO: tạo phòng, join, broadcast câu hỏi và nhận đáp án.
6. Thêm team score và thanh Boss/tiến triển trận đấu như phần thưởng nhìn thấy được.
7. Thêm nhập từ (Word Forge), sau đó thêm câu hỏi ngữ pháp nếu còn thời gian.
8. Chạy playtest, fix lỗi, rồi mới làm hiệu ứng âm thanh/animation.

# 9\. Kế hoạch kiểm thử

## Các ca bắt buộc phải thử

| **Tình huống**                 | **Kỳ vọng**                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| Mã phòng sai hoặc đã đóng      | Thông báo rõ; không tạo trạng thái phòng lỗi.                                        |
| Hai người vào gần như cùng lúc | Cả hai được ghi vào đúng phòng; không bị ghi đè.                                     |
| Đội mất cân bằng               | Tự gán đội cân bằng hoặc cho host đổi đội trước khi start.                           |
| Người gửi hai đáp án           | Server chỉ nhận đáp án hợp lệ đầu tiên hoặc áp dụng chính sách đã định.              |
| Trả lời sau giờ                | Server từ chối vì câu hỏi đã khoá.                                                   |
| Người chơi refresh trang       | Hiện thông báo hoặc cho phép kết nối lại theo chính sách MVP.                        |
| Host refresh / rời phòng       | Phòng không bị kẹt im lặng; hiện thông báo hoặc chuyển quyền host nếu đã triển khai. |
| Không ai trả lời               | Hết giờ vẫn chuyển sang reveal và vòng tiếp theo.                                    |
| Hai đội hoà điểm               | Luật hoà được xác định trước, ví dụ cùng thắng hoặc một câu phụ.                     |
| Server khởi động lại           | MVP có thể mất phòng đang chơi; README phải nói rõ giới hạn này.                     |

## Chỉ số nên quan sát khi chơi thử

- Tỷ lệ người chơi gửi đáp án ở mỗi vòng.
- Số người hỏi lại luật hoặc không biết phải bấm gì.
- Vòng nào khiến người chơi hào hứng nhất và vòng nào bị chờ lâu.
- Tỷ lệ đúng theo chủ đề và độ khó; câu nào có đáp án gây tranh cãi.
- Số lần disconnect, gửi đáp án trùng hoặc timer lệch giữa các máy.
- Người chơi có thể giải thích mình vừa học được gì sau trận hay không.

# 10\. Những rủi ro thường gặp và cách tránh

| **Rủi ro**               | **Vì sao xảy ra**                                                         | **Cách xử lý**                                                                              |
| ------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Tham quá nhiều tính năng | Bản đồ, skill, vật phẩm, chat và tài khoản đều kéo theo nhiều trạng thái. | Khoá phạm vi MVP; chỉ mở rộng khi một trận cơ bản chạy ổn định.                             |
| Multiplayer khó debug    | Timer, thứ tự sự kiện và trạng thái mỗi client dễ lệch.                   | Server làm nguồn sự thật; log room code, phase, question ID và hành động.                   |
| Game giống bài kiểm tra  | Mọi vòng cùng một kiểu câu hỏi, phản hồi điểm quá ít.                     | Xen kẽ trắc nghiệm, nhập từ và vòng Boss; câu trả lời phải làm trận thay đổi.               |
| Một người gánh đội       | Điểm chỉ dựa trên tổng điểm của vài người giỏi.                           | Mỗi người trả lời riêng; báo participation và accuracy; cân bằng đội.                       |
| Câu hỏi tranh cãi        | Câu không rõ ngữ cảnh hoặc có nhiều đáp án đúng.                          | Rà soát trước; có explanation; ghi đáp án hợp lệ; playtest với người học.                   |
| Mất tiến độ khi refresh  | Dữ liệu chỉ ở bộ nhớ client hoặc chưa có cơ chế reconnect.                | Trong MVP có thể thông báo giới hạn; nếu còn thời gian lưu trạng thái phòng theo player ID. |
| Dùng asset thiếu quyền   | Ảnh, font, âm thanh không cùng giấy phép với code.                        | Dùng asset tự tạo hoặc kiểm tra giấy phép và lưu ghi nhận nguồn.                            |

# 11\. Định nghĩa "MVP đã hoàn thành"

Chỉ coi MVP đạt khi có thể mở hai cửa sổ trình duyệt khác nhau và chơi trọn một trận từ tạo phòng đến kết quả cuối, không cần sửa code hoặc dữ liệu trong lúc chơi.

- \[ \] Host tạo được phòng và mã phòng được hiển thị rõ.
- \[ \] Tối thiểu 4 người có thể vào phòng thử nghiệm; đội được phân đúng và hiển thị đồng nhất.
- \[ \] Host bắt đầu trận; tất cả client nhận cùng question ID và cùng phase.
- \[ \] Mỗi người gửi được một câu trả lời; server chấm đúng/sai và từ chối submit trùng hoặc quá giờ.
- \[ \] Điểm cá nhân và điểm đội được cập nhật nhất quán ở mọi client.
- \[ \] Có ít nhất hai kiểu câu hỏi trong trận.
- \[ \] Có phản hồi giải thích, màn hình kết thúc và nút chơi lại hoặc tạo trận mới.
- \[ \] Có bộ câu hỏi đủ cho một trận thử và đã rà soát đáp án.
- \[ \] README nêu rõ cách cài đặt, chạy server, truy cập từ thiết bị khác trong cùng mạng (nếu hỗ trợ), và giới hạn hiện tại.

# 12\. Việc cần làm đầu tiên: checklist 2 ngày

## Ngày 1 — Chốt thiết kế trước khi viết code

- \[ \] Đọc tài liệu này một lượt, đánh dấu yêu cầu nào cần hỏi giáo viên.
- \[ \] Chốt phạm vi MVP: phòng chơi, hai đội, trắc nghiệm + nhập từ, điểm và Boss bar.
- \[ \] Viết 10 câu hỏi thử: 6 từ vựng, 2 chính tả/nhập từ, 2 ngữ pháp; kèm đáp án và giải thích.
- \[ \] Vẽ 5 màn hình: Join, Host Lobby, Player Lobby, Question/Reveal, Results.
- \[ \] Viết một trang "luật chơi phiên bản 0.1" để đọc cho bạn bè; xem họ có hiểu ngay không.

## Ngày 2 — Tạo prototype nhỏ nhất

- \[ \] Tạo thư mục project và Git repository riêng.
- \[ \] Tạo trang Question tĩnh bằng HTML/CSS với một câu hỏi mẫu.
- \[ \] Viết JavaScript để submit đáp án, chấm đúng/sai, hiện explanation và cập nhật điểm.
- \[ \] Chuyển từ câu thứ nhất sang câu thứ hai; không thêm multiplayer cho đến khi luồng này chạy ổn.
- \[ \] Cho một người khác thử mà không hướng dẫn; ghi lại chỗ họ bối rối.

**CỔNG KIỂM TRA SAU NGÀY 2**

Bạn có thể mở trang, đọc câu hỏi, trả lời, xem kết quả và sang câu tiếp theo. Nếu chưa làm được điều này, hãy chưa chuyển sang Socket.IO hoặc bản đồ chiến đấu.

# Phụ lục B. Từ vựng dự án cần biết

| **Thuật ngữ**                | **Ý nghĩa dễ hiểu**                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| GDD (Game Design Document)   | Tài liệu mô tả game: người chơi làm gì, luật gì, mục tiêu gì và phạm vi ra sao.                              |
| MVP (Minimum Viable Product) | Phiên bản nhỏ nhất nhưng chơi được trọn vẹn, dùng để kiểm chứng ý tưởng.                                     |
| Prototype                    | Bản thử nghiệm đơn giản để xem cơ chế có hoạt động và có vui không.                                          |
| Vertical slice               | Một lát cắt nhỏ nhưng hoàn chỉnh của trải nghiệm, từ đầu đến cuối.                                           |
| Game loop                    | Chu trình lặp chính của người chơi, ví dụ đọc câu → trả lời → nhận phản hồi → tiến triển trận.               |
| Playtest                     | Cho người thật chơi để quan sát vấn đề, không chỉ tự kiểm tra code.                                          |
| Server authoritative         | Server là nơi quyết định thời gian, đáp án và điểm chính thức; client chỉ gửi hành động và hiển thị kết quả. |
| Scope creep                  | Tính năng cứ nảy sinh thêm khiến dự án vượt thời gian hoặc không hoàn thành.                                 |