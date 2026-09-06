# Lexi — Ngữ cảnh dự án (đọc file này để nắm lại toàn bộ)

## Tổng quan
Web học từ vựng tiếng Anh cá nhân tên **Lexi**, cho Khang và một vài người bạn dùng.
Repo thật đang chạy: **github.com/Khang10072302/Flashcard** (repo `Vocabulary` chỉ là bản
Figma-Make tham khảo thiết kế, không phải app thật).
Deploy qua GitHub Pages: https://khang10072302.github.io/Flashcard/

## Stack kỹ thuật
- Thuần HTML/CSS/JS (không build tool, không React) — mọi file chạy thẳng qua thẻ `<script type="module">`.
- Firebase Auth (email/mật khẩu) + Firestore (đồng bộ dữ liệu nhiều thiết bị).
- Upload file lên GitHub qua giao diện web (không dùng git CLI).

## Quy tắc làm việc quan trọng
- **Chỉ gửi đúng (những) file thật sự thay đổi**, không gửi cả project mỗi lần (trừ khi đổi kiến trúc lớn).
- Không tự ý thêm `?v=` cache-busting vào các file HTML — người dùng tự hard-refresh (Ctrl/Cmd+Shift+R) sau khi cập nhật CSS.
- Trước khi sửa, luôn `curl` lấy bản mới nhất từ `raw.githubusercontent.com/Khang10072302/Flashcard/main/...` để tránh ghi đè nhầm lên các chỉnh sửa gần nhất (kể cả những chỉnh sửa người dùng tự làm tay).
- Sau khi sửa JS, luôn `node --check` để bắt lỗi cú pháp trước khi gửi.

## Cấu trúc file
```
login.html          # Trang đăng nhập (xem phần "Thiết kế đăng nhập" bên dưới)
index.html           # Toàn bộ app sau đăng nhập — 1 trang SPA duy nhất
css/style.css        # CSS riêng cho login.html (theme phong bì thư)
css/app.css          # CSS riêng cho index.html (theme Apple/macOS)
js/firebase-config.js  # Config Firebase thật (đã điền, không phải placeholder)
js/firebase-init.js    # Khởi tạo Firebase, export các hàm SDK dùng chung
js/auth-guard.js       # requireAuth() + wireLogout() dùng ở index.html
js/db.js               # Toàn bộ hàm đọc/ghi Firestore (words + profile)
js/stamps.js           # Danh sách STAMP_FILES dùng chung (login stamp + avatar)
js/app.js              # Toàn bộ logic app chính (rất dài, xem bên dưới)
assets/app-icon.png     # Logo app (favicon + sidebar) — có fallback 📖 nếu thiếu file
assets/stamps/stamp1.png..stamp15.png  # Ảnh tem — dùng ngẫu nhiên cho avatar & trang login
README.md            # Hướng dẫn setup Firebase + deploy (cho người, không phải cho Claude)
```

## Thiết kế trang đăng nhập (login.html + css/style.css)
- Theme "phong bì thư hàng không" (airmail): viền sọc đỏ-xanh quanh 4 cạnh, tem ở góc trên phải
  (ảnh ngẫu nhiên từ `assets/stamps/`), "Kính gửi: Sổ Từ Vựng" ở góc trên trái, form đăng nhập
  ("Người gửi" = email, "Địa chỉ" = mật khẩu, có placeholder "Mật khẩu" bên trong) nằm giữa phong bì.
- Responsive: cùng 1 markup cho desktop lẫn mobile — mobile dùng khối `@media (max-width:760px)`
  RIÊNG BIỆT HOÀN TOÀN (không có rule nào nằm ngoài 2 khối media query) để sửa 1 bên không ảnh hưởng bên kia.
- Đăng ký tài khoản mới: có ô "Xác nhận địa chỉ" (nhập lại mật khẩu) khi ở chế độ Đăng ký.
- Khi đăng ký thành công, tự tạo `users/{uid}` profile doc với avatar tem ngẫu nhiên.

## Thiết kế app chính (index.html + css/app.css)
Phong cách macOS/Apple: sidebar tối trong suốt bên trái, nội dung nền sáng #F5F5F7, font Inter,
xanh dương #0071E3 làm màu chủ đạo. KHÔNG liên quan gì tới theme phong bì của trang login.

### Sidebar
- Logo (ảnh `assets/app-icon.png`) + tên "Lexi" + nút thu gọn (icon panel) cạnh tên.
- Nav: Dashboard, Sổ từ vựng, Flashcard, Luyện viết, Quiz, Tiến độ.
- Nút "+ Từ mới", rồi tới avatar người dùng (bấm mở dropdown Profile/Log out, mũi tên tự xoay).
- **Thu gọn (collapsed)**: chỉ còn icon, width 68px, hover vào logo hiện icon mở-rộng.
  Icon các trang to hơn desktop thường ~20%. Nav-item active có khung vuông 44×44px căn giữa.
  QUAN TRỌNG: dùng `display:none` cho tên app + nút thu gọn khi collapsed (không dùng
  opacity/max-width) — đã bị lỗi "gap ma" lặp lại nhiều lần khi dùng cách mờ dần, nên chốt
  dùng display:none cho 2 phần tử này để tránh tái diễn.
- **Mobile** (<760px): sidebar ẩn hoàn toàn mặc định, nút ☰ cố định góc trên-trái (position:fixed),
  bấm mở full-screen, tự đóng khi chọn mục hoặc bấm lại nút (đổi thành ✕).
- Đã bỏ hẳn khối "Tiến độ hôm nay" khỏi sidebar (dời logic liên quan qua Dashboard).

### Kiến trúc SPA (js/app.js)
M��t file `index.html` + `js/app.js` duy nhất, điều hướng bằng JS (không load lại trang):
- `section` (biến toàn cục) quyết định render gì trong `#content`.
- `goto(name)` đổi section + active nav + đóng mobile drawer + render lại.
- Mỗi section có hàm `render___(root)` riêng: `renderDashboard`, `renderInbox`, `renderFlashcard`,
  `renderWriting`, `renderQuiz`, `renderProgress`, `renderAdd`, `renderProfile`.
- `onWordsChange()` (listener Firestore real-time) chỉ re-render nếu đang ở dashboard/inbox/progress —
  các section có state phiên riêng (flashcard, writing, quiz) chỉ dựng 1 lần lúc `goto()`, không bị
  Firestore cập nhật nền làm vỡ session đang học.

### Model dữ liệu 1 từ (Firestore: `users/{uid}/words/{wordId}`)
```
word, phonetic, meaning, example, tag (Noun/Verb/Adjective/Adverb/Phrase/Idiom)
mastered (bool, tự set khi streak Flashcard >= 10, có thể tự tay bật/tắt)
streak (Flashcard), writingStreak (Luyện viết — TÁCH RIÊNG hoàn toàn với streak)
flashcardSeen/flashcardCorrect/flashcardWrong
writingSeen/writingCorrect/writingWrong
addedAt (serverTimestamp, KHÔNG đổi khi sửa từ)
```
Model profile (`users/{uid}`): `displayName`, `avatar` (đường dẫn ảnh tem), `createdAt`.

**Firestore Rules cần có** (đã hướng dẫn user thêm trong Firebase Console):
```
match /users/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }
match /users/{userId}/words/{wordId} { allow read, write: if request.auth != null && request.auth.uid == userId; }
```

### Thuật toán lặp lại ngắt quãng (spaced repetition) — MỚI HOÀN THÀNH
Nằm trong js/app.js, gần cuối file, ngay trước phần "TIỆN ÍCH DÙNG CHUNG":
- `tierFromStreak(seen, streak)`: < 3 lần ôn → luôn "new" (chưa thuộc); streak ≥ 10 → "mastered"
  (đã thuộc); streak 4-9 → "atrisk" (có thể quên); còn lại → "new".
- `getFlashcardTier(w)` dùng `w.flashcardSeen`/`w.streak`; `getWritingTier(w)` dùng
  `w.writingSeen`/`w.writingStreak` — HAI HỆ THỐNG HOÀN TOÀN ĐỘC LẬP (thuộc nghĩa ≠ viết đúng chính tả).
- `buildDeck(words, tierFn)`: trộn bộ tối đa 20 thẻ theo tỉ lệ 14 (new) / 4 (atrisk) / 2 (mastered);
  nếu 1 nhóm không đủ số lượng thì lấy bù ngẫu nhiên từ các từ còn lại chưa dùng.
- Flashcard & Luyện viết (chế độ Điền từ) đều: hết 1 bộ tự động trộn bộ mới, học liên tục không giới
  hạn (theo yêu cầu người dùng, không có màn "kết thúc" cứng — chỉ có dòng thống kê phiên hiện tại).
- `db.js` có `recordFlashcardResult(uid, wordId, knew, currentStreak)` và
  `recordWritingResult(uid, wordId, correct, currentWritingStreak)` — dùng Firestore `increment()`
  để cộng dồn an toàn, tự tính streak mới (sai → về 0 ngay) và tự cập nhật `mastered`.

### Trang Sổ từ vựng (renderInbox)
- Thẻ từ: bấm mũi tên (bên phải) để mở rộng, không có nút xóa X ở ngoài thẻ nữa.
- Mở rộng ra: Nghĩa/Ví dụ xếp NGANG (2 cột), rồi tới khối "THỐNG KÊ" (heading nhỏ in hoa xám) gồm
  2 thẻ nhỏ nền xám có icon màu (tím=Flashcard, xanh lá=Luyện viết), mỗi thẻ có thanh tỉ lệ
  đúng/sai nhỏ (`.ps-bar`) + số liệu chi tiết bên dưới.
- Nút "Sửa" + "Đánh dấu đã thuộc" ở cuối. "Sửa" mở **modal** (không phải section riêng) —
  `openEditWordModal()` trong app.js, style dùng chung `.form-panel`/`.f-field`/`.modal-card`
  (QUAN TRỌNG: các class input/label chỉ áp dụng trong `.form-panel` HOẶC `.modal-card` — nếu thêm
  modal mới phải nhớ thêm class tương ứng vào CSS selector, nếu không input sẽ hiện thô không style).
  Xóa từ cũng nằm trong modal này (link đỏ "Xóa từ này"), không còn nút xóa ngoài thẻ.
  Sửa xong KHÔNG đổi `addedAt`.

### Dashboard (renderDashboard)
- "Today's Quest": nền TRẮNG (khác bản Figma gốc nền đen, đã đổi theo yêu cầu), vòng tròn % hoàn
  thành, 5 nhiệm vụ tick tay + nút "Đi →" nhảy tới section liên quan (quest KHÔNG lưu Firestore,
  reset khi rời trang — vẫn là placeholder, có thể nâng cấp sau nếu muốn lưu thật).
- Ô "Sổ từ vựng" cũ (gộp danh sách + thống kê) đã đổi thành **3 thẻ RIÊNG BIỆT có khoảng cách**
  (`.dash-vocab-group`, mỗi thẻ là 1 `.dash-card` bình thường): Tổng số từ / Đã thuộc / Chưa thuộc —
  giống hệt phong cách thẻ Flashcard/Luyện viết bên cạnh.
- "Chuỗi ngày học" (heatmap 16 tuần) DÙNG CHUNG 1 hàm `heatmapPanelHtml()` + 1 biến `HEATMAP_DATA`
  module-level với trang Tiến độ — 2 nơi luôn khớp nhau. LƯU Ý: dữ liệu heatmap vẫn là NGẪU NHIÊN
  minh họa, chưa gắn với lịch sử học thật theo từng ngày (muốn làm thật thì cần thêm collection
  log hoạt động theo ngày).

### Quiz & Progress
- Quiz: trắc nghiệm 4 đáp án (1 đúng + 3 nghĩa ngẫu nhiên từ các từ khác), tính điểm cuối.
- Progress: 3 stat card, thanh tiến độ ghi nhớ, top 5 từ streak cao nhất, rồi heatmap dùng chung
  với Dashboard (xem trên).

## Các bug đã gặp và cách tránh lặp lại
1. **Cache trình duyệt**: mọi lần chỉ sửa CSS mà "không thấy gì đổi" → luôn nghi cache trước, bảo
   người dùng hard-refresh. `css/style.css` từng dùng `?v=N` để né cache nhưng người dùng đã yêu cầu
   NGƯNG tự động bump version — giờ chỉ nhắc hard-refresh bằng lời.
2. **"Gap ma" trong flexbox**: ẩn phần tử bằng `opacity:0;max-width:0` mà còn `gap` giữa các flex
   item thì gap đó VẪN chiếm chỗ, làm icon/logo lệch tâm. Bài học: ưu tiên `display:none` cho các
   phần tử ẩn hẳn khi thu gọn sidebar, chỉ dùng mờ dần (opacity/max-width) cho nhãn trong nav-item
   (đã test ổn định).
3. **CSS class chỉ áp dụng trong 1 ancestor cụ thể** (vd `.form-panel input`) — khi tạo UI mới tái
   dùng class cũ (modal Sửa từ) mà quên thêm ancestor class tương ứng, input sẽ mất style hoàn toàn.

## Điều đã hỏi nhưng CHƯA làm / có thể làm tiếp
- Heatmap (Dashboard + Progress) vẫn là dữ liệu giả — nếu muốn thật cần thêm log hoạt động theo ngày.
- Today's Quest ở Dashboard chưa lưu Firestore, chỉ là state phiên.
- Trang Quiz/Progress có thể còn muốn thêm animation/hiệu ứng tương tự Flashcard nếu yêu cầu tiếp.
