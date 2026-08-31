// Danh sách ảnh tem dùng chung — cho cả con tem trang trí ở trang đăng nhập
// VÀ cho avatar người dùng (avatar = 1 trong các ảnh tem này).
// Đặt ảnh vào assets/stamps/ với tên: stamp1.png, stamp2.png ... (đánh số liên tục).
// Thêm ảnh mới thì chỉ cần tăng STAMP_COUNT ở đây — mọi chỗ dùng chung sẽ tự cập nhật.
export const STAMP_COUNT = 15;
export const STAMP_FILES = Array.from({ length: STAMP_COUNT }, (_, i) => `assets/stamps/stamp${i + 1}.png`);

export function randomStamp() {
  return STAMP_FILES[Math.floor(Math.random() * STAMP_FILES.length)];
}
