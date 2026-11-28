// Layar tidak bisa diperbesar dengan cubit (rasa aplikasi asli).
// Pengecualian: ketuk 3 kali cepat di tempat yang sama → mode perbesar aktif (boleh cubit);
// ketuk 3 kali lagi → kembali normal.
import { toast } from "./store.js";

const KUNCI = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
const BEBAS = "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover";
let bebas = false, ketuk = [];

function setViewport(isi) {
  let m = document.querySelector('meta[name="viewport"]');
  if (!m) { m = document.createElement("meta"); m.name = "viewport"; document.head.appendChild(m); }
  m.setAttribute("content", isi);
}
function ubah(on) {
  bebas = on; setViewport(on ? BEBAS : KUNCI);
  document.documentElement.classList.toggle("zoom-bebas", on);
  toast(on ? "Mode perbesar aktif. Cubit layar untuk memperbesar; ketuk 3 kali untuk kembali." : "Mode perbesar dimatikan.");
}
export function pasangZoom() {
  setViewport(KUNCI);
  // Safari iOS: gerakan cubit
  ["gesturestart", "gesturechange", "gestureend"].forEach(n => document.addEventListener(n, e => { if (!bebas) e.preventDefault(); }, { passive: false }));
  // dua jari bergerak = cubit. Pendengar penahan hanya dipasang selama ada dua jari, supaya gulir satu jari tidak pernah tertahan (mulus 120 Hz)
  const cegah = e => { if (!bebas && e.touches.length > 1 && e.cancelable) e.preventDefault(); };
  let terpasang = false;
  document.addEventListener("touchstart", e => { if (e.touches.length > 1 && !terpasang) { document.addEventListener("touchmove", cegah, { passive: false }); terpasang = true; } }, { passive: true });
  const lepasDua = e => { if (terpasang && e.touches.length < 2) { document.removeEventListener("touchmove", cegah); terpasang = false; } };
  document.addEventListener("touchend", lepasDua, { passive: true }); document.addEventListener("touchcancel", lepasDua, { passive: true });
  // Ctrl + roda tetikus / pinch trackpad di laptop
  document.addEventListener("wheel", e => { if (!bebas && e.ctrlKey) e.preventDefault(); }, { passive: false });
  // ketuk 3 kali
  document.addEventListener("touchend", e => {
    if (e.changedTouches.length !== 1 || e.touches.length) return;
    if (e.target.closest && e.target.closest("button,a,input,textarea,select,label,[role=button],.menu-row,.row")) { ketuk = []; return; }
    const t = e.changedTouches[0], now = Date.now();
    ketuk = ketuk.filter(k => now - k.w < 650 && Math.hypot(k.x - t.clientX, k.y - t.clientY) < 40);
    ketuk.push({ w: now, x: t.clientX, y: t.clientY });
    if (ketuk.length >= 3) { ketuk = []; ubah(!bebas); }
  }, { passive: true });
}
