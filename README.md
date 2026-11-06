# 🌿 Vườn Bình Yên — game giải tỏa căng thẳng, ôn KHTN 7 Vật lí (bài 8–20)

Game kiểu Blooket, giao diện "hacker xanh": học sinh trả lời câu hỏi Vật lí, mở hộp quà, trồng khu vườn của mình, nghỉ hít thở giữa chừng và chọn biểu cảm tâm trạng trước/sau khi chơi. Trả lời sai không bị trừ điểm.

| Trang | Đường dẫn | Dành cho |
|---|---|---|
| Người chơi | `/` | Học sinh: nhập mã phòng hoặc chơi một mình |
| Quản lí | `/admin` | Giáo viên: tạo phòng, chọn bài và thời gian, bắt đầu/kết thúc ván, xem xếp hạng và tâm trạng của lớp, mời người chơi ra khỏi phòng |

Không cần cài thư viện nào, chỉ cần Node.js 18 trở lên.

## Chạy trên máy

```bash
ADMIN_PASSWORD=matkhaucuaban node server.js
# mở http://localhost:3000 (người chơi) và http://localhost:3000/admin (quản lí)
```

## Đưa lên GitHub

1. Vào https://github.com/new, tạo repo mới (ví dụ `vuon-binh-yen`), **không** tick "Add a README".
2. Trong thư mục này chạy:
   ```bash
   git init
   git add .
   git commit -m "Vườn Bình Yên"
   git branch -M main
   git remote add origin https://github.com/<tên-github-của-bạn>/vuon-binh-yen.git
   git push -u origin main
   ```
   (Hoặc trên trang repo bấm **uploading an existing file**, rồi kéo thả toàn bộ file và thư mục `public` vào.)

## Deploy lên Render

1. Đăng nhập https://render.com bằng tài khoản GitHub.
2. **New → Web Service**, rồi chọn repo `vuon-binh-yen`.
3. Điền:
   - Runtime: **Node**
   - Build Command: `npm install` (hoặc để trống)
   - Start Command: `node server.js`
   - Instance Type: **Free**
4. Mục **Environment Variables**: thêm `ADMIN_PASSWORD` = mật khẩu quản lí của bạn.
5. Bấm **Create Web Service**. Khoảng 1–2 phút sau bạn sẽ có link dạng `https://vuon-binh-yen.onrender.com`.

Cách khác: repo đã có sẵn `render.yaml`, bạn có thể chọn **New → Blueprint** và trỏ tới repo này.

## Lưu ý về gói Free của Render

- Server sẽ "ngủ" sau khoảng 15 phút không có ai truy cập. Lần mở đầu tiên có thể mất khoảng 30–60 giây. **Hãy mở trang `/admin` trước giờ học vài phút.**
- Phòng chơi được lưu trong bộ nhớ: khi server khởi động lại (deploy mới hoặc sau khi ngủ), phòng cũ mất và bạn cần tạo phòng mới.

## Sửa / thêm câu hỏi

Mở `public/questions.js`. Mỗi câu là một dòng:

```js
[bài, "Câu hỏi", ["Đáp án đúng", "Sai 1", "Sai 2", "Sai 3"], 0, "Giải thích ngắn"],
```

Số `0` là vị trí của đáp án đúng. Thứ tự các đáp án sẽ được xáo trộn khi chơi. Commit lên GitHub thì Render sẽ tự deploy lại.

## Cấu trúc

```
server.js            máy chủ (http + Server-Sent Events, không dùng thư viện)
public/index.html    trang người chơi
public/admin.html    trang quản lí
public/questions.js  ngân hàng câu hỏi (39 câu, bài 8–20)
public/style.css     giao diện hacker xanh
public/fx.js         hiệu ứng mưa code + chữ gõ kiểu terminal
render.yaml          cấu hình Render (tùy chọn)
```
