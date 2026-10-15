# Hướng dẫn import bộ câu hỏi JSON

## Cách sử dụng

1. Giáo viên tạo phòng và mở mục **Import bộ câu hỏi JSON** trong lobby.
2. Dùng nút sao chép prompt, gửi prompt cho ChatGPT và sao chép JSON kết quả.
3. Dán JSON vào ô nhập liệu rồi bấm **Kiểm tra và import**. Có thể tải `data/question-set.seed.json` để xem mẫu đầy đủ.
4. Khi giao diện báo số câu đã import, bắt đầu trận như bình thường.

Server kiểm tra toàn bộ câu hỏi trước khi lưu. Một bộ đề có từ 1 đến 50 câu và chỉ có thể thay đổi khi phòng còn ở lobby.

## JSON mẫu

```json
{
  "title": "Unit 5 - Environment",
  "questions": [
    {
      "id": "unit5_001",
      "type": "multiple_choice",
      "level": "A2",
      "topic": "environment",
      "prompt": "Which item can usually be recycled?",
      "options": [
        { "id": "A", "text": "Glass bottle" },
        { "id": "B", "text": "Used tissue" },
        { "id": "C", "text": "Food waste" },
        { "id": "D", "text": "Dirty sponge" }
      ],
      "correctAnswer": "A",
      "acceptedAnswers": ["A"],
      "explanation": "Glass bottles can usually be cleaned and recycled.",
      "timeLimitSec": 20,
      "isBossRound": false,
      "points": 100
    }
  ]
}
```

`type` nhận `multiple_choice` hoặc `word_forge`. `level` nhận `A1`, `A2` hoặc `B1`. Với `word_forge`, đặt `options` thành `null` và thêm các cách viết hợp lệ vào `acceptedAnswers`.

## Prompt gửi ChatGPT

```text
Bạn là chuyên gia thiết kế câu hỏi tiếng Anh cho trò chơi LEXI CLASH.
Hãy tạo một bộ gồm 10 câu hỏi trình độ A2, chủ đề [ĐIỀN CHỦ ĐỀ].
Chỉ trả về JSON hợp lệ, không dùng Markdown và không giải thích bên ngoài JSON.

JSON phải có dạng { "title": "Tên bộ đề", "questions": [...] }.
Mỗi câu bắt buộc có: id duy nhất, type (multiple_choice hoặc word_forge), level (A1/A2/B1), topic, prompt, options, correctAnswer, acceptedAnswers, explanation, timeLimitSec >= 5, isBossRound và points > 0.
Với multiple_choice: options gồm ít nhất 2 phần tử { "id": "A", "text": "..." }, correctAnswer là id đáp án đúng, acceptedAnswers chứa id đó.
Với word_forge: options là null, acceptedAnswers liệt kê các cách viết được chấp nhận.
Chỉ có tối đa 50 câu. Dùng isBossRound: true cho đúng 1 câu khó nhất.
```

Nút **Sao chép prompt ChatGPT** trong lobby sao chép chính prompt này.

## Seed Supabase

Sau khi đã cấu hình `.env`, chạy:

```powershell
npm.cmd run seed:supabase
```

Lệnh đọc `data/question-set.seed.json`, validate bằng cùng logic import và lưu bộ mẫu với mã `DEMO01` vào bảng `room_question_sets`.

## Thư viện bộ câu hỏi dùng chung

Chạy toàn bộ nội dung `supabase/migrations/202610160002_create_question_library.sql` trong Supabase SQL Editor để tạo bảng `question_sets`. Không dán đường dẫn file vào SQL Editor.

Trong lobby, Host có thể:

- Dán JSON và chọn **Lưu bộ mới và dùng** để thêm vào thư viện đồng thời áp dụng cho phòng.
- Chọn một bộ trong **Thư viện Supabase**, bấm **Tải để chỉnh sửa**, sửa JSON rồi chọn **Lưu thay đổi và dùng**.
- Chọn **Tạo bộ mới** để không ghi đè bộ đang tải.

Thư viện hiện dùng chung cho mọi Host. Dữ liệu chỉ đi qua backend bằng secret key; trình duyệt không nhận Supabase key. Khi bổ sung tài khoản giáo viên, nên thêm `owner_id` và phân quyền sở hữu trước khi cho phép cập nhật/xóa theo người dùng.

