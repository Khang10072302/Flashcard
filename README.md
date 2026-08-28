# Sổ Từ Vựng — hướng dẫn cài đặt

Web học từ vựng tiếng Anh: thêm từ (có thể bóc tách từ text copy trên Cambridge
Dictionary), học bằng flashcard, và luyện viết lại từ. Dữ liệu lưu trên
Firebase nên mở trên máy nào, thiết bị nào (đăng nhập cùng tài khoản) cũng
thấy y hệt.

Không cần cài Node hay build gì cả — đây là HTML/CSS/JS thuần, đẩy thẳng lên
GitHub Pages là chạy.

## Bước 1 — Tạo project Firebase (miễn phí)

1. Vào https://console.firebase.google.com → **Add project** → đặt tên tùy
   ý (vd. `so-tu-vung`) → tạo xong.
2. Trong project, vào **Build → Authentication → Get started** → tab
   **Sign-in method** → bật **Email/Password**.
3. Vào **Build → Firestore Database → Create database** → chọn chế độ
   **Production mode** → chọn khu vực gần bạn (vd. `asia-southeast1`).
4. Vào **Project settings** (icon bánh răng) → mục **Your apps** → bấm
   biểu tượng `</>` (Web) → đặt tên app → **Register app**. Firebase sẽ
   hiện ra một đoạn `firebaseConfig`.

## Bước 2 — Dán config vào code

Mở file `js/firebase-config.js`, thay các giá trị `YOUR_...` bằng đúng giá
trị Firebase vừa cho bạn:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## Bước 3 — Cài đặt luật bảo mật Firestore (bắt buộc)

Trong Firebase Console → **Firestore Database → Rules**, dán đè nội dung
này rồi **Publish** — luật này đảm bảo chỉ chính bạn (đã đăng nhập) mới đọc
được dữ liệu của mình:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/words/{wordId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Bước 4 — Đẩy code lên GitHub và bật GitHub Pages

1. Tạo một repo mới trên GitHub, push toàn bộ nội dung thư mục này lên
   (bao gồm cả `index.html`, `login.html`, thư mục `css/`, `js/`...).
2. Vào repo trên GitHub → **Settings → Pages** → phần **Source** chọn
   **Deploy from a branch** → chọn branch `main`, thư mục `/ (root)` →
   **Save**.
3. Đợi khoảng 1–2 phút, GitHub sẽ cho bạn một link dạng
   `https://<username>.github.io/<ten-repo>/`. Mở link đó là dùng được.
4. Quay lại Firebase Console → **Authentication → Settings → Authorized
   domains** → **Add domain** → dán domain GitHub Pages của bạn (vd.
   `<username>.github.io`) để đăng nhập hoạt động đúng trên domain đó.

## Cách dùng

- **Trang "Sổ từ"** (`index.html`): dán đoạn text bạn copy từ trang từ
  trên `dictionary.cambridge.org` vào ô ở trên, bấm **Phân tích văn bản**
  — form bên dưới sẽ tự điền từ, IPA, loại từ, nghĩa, ví dụ. Việc bóc
  tách chỉ là gợi ý (định dạng text của Cambridge không cố định 100%),
  nên hãy xem lại rồi sửa nếu cần trước khi bấm **Lưu**. Bạn cũng có thể
  bỏ qua bước dán text và tự nhập tay hoàn toàn.
- **Trang "Flashcard"**: bấm vào thẻ để lật xem nghĩa, phát âm bằng nút
  loa (dùng giọng đọc có sẵn của trình duyệt), rồi đánh giá "Chưa nhớ" /
  "Nhớ rồi" — từ nhớ tốt nhiều lần liên tiếp sẽ được đánh dấu "đã thuộc"
  và mặc định không xuất hiện lại (có thể bật lại bằng ô "Bao gồm từ đã
  thuộc").
- **Trang "Luyện viết"**: đọc định nghĩa (và câu ví dụ đã che từ), gõ lại
  đúng từ tiếng Anh.

## Giới hạn cần biết

- Phát âm dùng **Web Speech API** của trình duyệt (giọng máy tổng hợp),
  không phải file âm thanh gốc của Cambridge — vì không thể tải trực
  tiếp file đó do bản quyền và giới hạn kỹ thuật.
- Việc bóc tách text Cambridge là suy đoán theo định dạng thường gặp, có
  thể sai với một số từ có cấu trúc đặc biệt (từ đa nghĩa phức tạp, thành
  ngữ...) — luôn kiểm tra lại trước khi lưu.
