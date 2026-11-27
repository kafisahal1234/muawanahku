// Tarik ke bawah untuk memperbarui (seperti aplikasi bank): saat layar sudah di paling atas,
// geser jari ke bawah → muncul putaran di bagian atas → lepas → data disegarkan.
import { S, sambungUlang, toast, segarkanTampilan } from "./store.js";
import { gulirEl } from "./gulir.js";

const BATAS = 70, TAHAN = 58, MAKS = 120;
const BUILD = typeof __BUILD__ !== "undefined" ? __BUILD__ : "";
const DILEWATI = "input,textarea,select,[contenteditable],.foto-lb,.pad-box,.sheet,.modal,[role=dialog],.no-tarik,.bnav,.hscroll,.chips,.tbl-wrap";

let ind, y0 = 0, x0 = 0, tarik = 0, aktif = false, terkunci = false, sibuk = false;

function indikator() {
  if (ind && document.body.contains(ind)) return ind;
  ind = document.createElement("div"); ind.className = "ptr"; ind.setAttribute("aria-hidden", "true");
  ind.innerHTML = '<span class="ptr-sp"><svg viewBox="0 0 24 24" width="26" height="26">' +
    Array.from({ length: 8 }, (_, i) => `<rect x="11" y="2" width="2" height="6" rx="1" transform="rotate(${i * 45} 12 12)" opacity="${(i + 1) / 8}"/>`).join("") + "</svg></span>";
  document.body.appendChild(ind); return ind;
}
const isi = () => document.querySelector(".app > .scr");
// Bagian kepala (salam/judul) tetap di tempat; yang turun hanya kartu ke bawah. Ruang hijau di bawah kepala memanjang.
let kepala = null, padAsli = 0, celahAsli = 0;
function siapkan() {
  const s = isi(); kepala = null;
  if (!s) return;
  const k = s.querySelector(".ht, .sub-h, .appbar");
  if (k && k.getBoundingClientRect().top < 40) {
    kepala = k; padAsli = parseFloat(getComputedStyle(k).paddingBottom) || 0;
    const isiAkhir = k.querySelector(".ht-sub") || k.querySelector(".ht-row") || k.lastElementChild;
    const r = k.getBoundingClientRect(), dasar = isiAkhir ? isiAkhir.getBoundingClientRect().bottom : r.bottom;
    const nx = k.nextElementSibling, atasKartu = nx ? Math.min(nx.getBoundingClientRect().top, r.bottom) : r.bottom;
    celahAsli = { dasar, atasKartu: Math.max(dasar, atasKartu) };
  }
}
function atur(px, halus) {
  const s = isi(), i = indikator(), tr = "cubic-bezier(.2,.8,.2,1)";
  if (kepala) {
    kepala.style.transition = halus ? `padding-bottom .28s ${tr}` : "none";
    kepala.style.paddingBottom = px ? padAsli + px + "px" : "";
    i.classList.add("tanpa-pita");
    i.style.setProperty("--y", (celahAsli.dasar + celahAsli.atasKartu + px) / 2 + "px");
  } else {
    if (s) { s.style.transition = halus ? `transform .28s ${tr}` : "none"; s.style.transform = px ? `translateY(${px}px)` : ""; }
    i.classList.remove("tanpa-pita");
    i.style.setProperty("--y", "calc(env(safe-area-inset-top, 0px) + " + px / 2 + "px)");
  }
  i.style.transition = halus ? "opacity .2s" : "none";
  i.style.setProperty("--t", px + "px");
  i.style.opacity = px > 0 ? 1 : 0;
  const sp = i.firstChild; if (sp) sp.style.opacity = sibuk ? 1 : Math.min(1, px / BATAS); if (sp && !sibuk) sp.style.transform = `rotate(${px * 3}deg) scale(${Math.min(1, .5 + px / BATAS / 2)})`;
}
async function segarkan() {
  sibuk = true; indikator().classList.add("putar"); atur(TAHAN, true);
  const mulai = Date.now();
  try {
    if (navigator.onLine && /^https?:$/.test(location.protocol) && BUILD) {
      const r = await fetch("./index.html?cek=" + Date.now(), { cache: "no-store" });
      if (r.ok && !(await r.text()).includes(BUILD)) { location.reload(); return; }   // ada versi aplikasi baru
    }
  } catch (e) { }
  try { if (S.terputus) await sambungUlang(); } catch (e) { }
  await new Promise(r => setTimeout(r, Math.max(0, 900 - (Date.now() - mulai))));
  try { segarkanTampilan(); } catch (e) { }
  if (!navigator.onLine) toast("Tidak ada sinyal. Data yang tampil dari HP.", "err");
  atur(0, true); setTimeout(() => { indikator().classList.remove("putar"); sibuk = false; }, 300);
}

export function pasangTarik() {
  if (!("ontouchstart" in window)) return;
  document.addEventListener("touchstart", e => {
    if (sibuk || e.touches.length !== 1) return;
    const g = gulirEl(), t = e.target;
    aktif = !!g && g.classList && g.classList.contains("app") && !g.classList.contains("nonav") && g.scrollTop <= 0 && !!isi() && !(t.closest && t.closest(DILEWATI));
    if (aktif) siapkan();
    terkunci = false; tarik = 0; y0 = e.touches[0].clientY; x0 = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener("touchmove", e => {
    if (!aktif || sibuk) return;
    const dy = e.touches[0].clientY - y0, dx = e.touches[0].clientX - x0;
    if (!terkunci) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || gulirEl().scrollTop > 0) { aktif = false; return; }
      terkunci = true;
    }
    if (e.cancelable) e.preventDefault();
    tarik = Math.min(MAKS, Math.max(0, dy) * .5);
    atur(tarik, false);
  }, { passive: false });
  const lepas = () => {
    if (!aktif) return; aktif = false;
    if (!terkunci) return;
    if (tarik >= BATAS) segarkan(); else atur(0, true);
  };
  document.addEventListener("touchend", lepas, { passive: true });
  document.addEventListener("touchcancel", lepas, { passive: true });
}
