import { auth, onAuthStateChanged, signOut } from "./firebase-init.js";

// Trả về Promise<uid> — chỉ resolve khi đã xác nhận đăng nhập.
// Nếu chưa đăng nhập, tự động chuyển hướng về login.html.
export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      resolve(user.uid);
    });
  });
}

export function wireLogout(selector = "#logoutBtn") {
  const btn = document.querySelector(selector);
  if (!btn) return;
  btn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}
