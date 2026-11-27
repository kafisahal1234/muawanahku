// Angka ringkasan "menghitung naik" saat pertama tampil (sekali per tampilan).
// Hanya mengubah nilai teks yang sudah ada (bukan mengganti elemen) supaya pembaruan data tetap tampil benar.
const POLA = /^(\d+)([.,]\d+)?(%?)$/;
function naikkan(node) {
  const akhir = node.nodeValue.trim(), m = POLA.exec(akhir);
  if (!m) return;
  const desimal = m[2] ? m[2].length - 1 : 0, pemisah = m[2] ? m[2][0] : "", tujuan = parseFloat(m[1] + (m[2] ? "." + m[2].slice(1) : ""));
  if (!tujuan) return;
  const mulai = performance.now(), lama = 750;
  const langkah = t => {
    if (node.nodeValue.trim() !== akhir && node.__naik !== akhir) return;   // data berubah: biarkan
    const p = Math.min(1, (t - mulai) / lama), e = 1 - Math.pow(1 - p, 3);
    const v = p < 1 ? (tujuan * e).toFixed(desimal).replace(".", pemisah || ".") + m[3] : akhir;
    node.__naik = akhir; node.nodeValue = v;
    if (p < 1) requestAnimationFrame(langkah); else node.__naik = null;
  };
  node.__naik = akhir; requestAnimationFrame(langkah);
}
export function pasangHitung() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cari = akar => akar.querySelectorAll && akar.querySelectorAll(".sum .stat b, .hf-ring b, .stats .stat b").forEach(b => {
    if (b.dataset.naik) return; b.dataset.naik = "1";
    const n = b.firstChild; if (n && n.nodeType === 3) naikkan(n);
  });
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(cari))).observe(document.getElementById("root"), { childList: true, subtree: true });
}
