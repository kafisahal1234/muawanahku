// Di HP, yang menggulir adalah kotak .app (bukan halaman/dokumen), supaya bagian paling atas layar
// tidak ikut tergulir ke bawah bilah status (iOS memberi efek buram di sana) dan bisa "tarik untuk memperbarui".
export function gulirEl() {
  const a = document.querySelector(".app");
  try { if (a && getComputedStyle(a).overflowY === "auto") return a; } catch (e) { }
  return document.scrollingElement || document.documentElement;
}
export function keAtas(halus) { const el = gulirEl(); try { el.scrollTo(halus ? { top: 0, behavior: "smooth" } : { top: 0 }); } catch (e) { el.scrollTop = 0; } }
export function dekatBawah(jarak = 160) { const el = gulirEl(); return el.scrollTop + el.clientHeight >= el.scrollHeight - jarak; }
