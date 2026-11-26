// Tema (terang/gelap) & bahasa (Indonesia/English/العربية) — disimpan di HP ini
import { KAMUS, HARI, BULAN } from "./kamus.js";
const LS = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
const akar = () => document.documentElement;

// ---------- tema ----------
let mqGelap = null;
export const temaSaatIni = () => LS("mk_tema", "terang");
export function terapkanTema(t = temaSaatIni()) {
  try {
    if (!mqGelap) { mqGelap = matchMedia("(prefers-color-scheme: dark)"); if (mqGelap.addEventListener) mqGelap.addEventListener("change", () => { if (temaSaatIni() === "sistem") terapkanTema(); }); }
    const gelap = t === "gelap" || (t === "sistem" && mqGelap.matches);
    akar().dataset.tema = gelap ? "gelap" : "terang";
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", gelap ? "#07402A" : "#0B6B43");
  } catch (e) { }
}
export function setTema(t) { try { localStorage.setItem("mk_tema", t); } catch (e) { } terapkanTema(t); }

// ---------- bahasa ----------
export const BAHASA = [["id", "Bahasa Indonesia"], ["en", "English"], ["ar", "العربية"]];
export const bahasa = () => LS("mk_bahasa", "id");
const IX = { en: 0, ar: 1 };
const REX_BLN = /^(, ?)(\d{1,2}) (Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Agt|Sep|Okt|Nov|Des)( \d{4})?$/;
const REX_TGL = /^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Ahad)(, ?)(\d{1,2}) (Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Agt|Sep|Okt|Nov|Des)( \d{4})?$/;
function terjemah(teks, i) {
  const k = teks.trim(); if (!k || k.length > 80) return null;
  const iso = x => (i === 1 ? "\u2068" + x + "\u2069" : x); // teks Arab diisolasi agar urutan kalimat tetap kiri-ke-kanan
  const v = KAMUS[k]; if (v) return teks.replace(k, iso(v[i]));
  const m = REX_TGL.exec(k); if (m) return teks.replace(k, i === 1 ? `${iso(HARI[m[1]][i] + "،")} ${m[3]} ${iso(BULAN[m[4]][i])}${m[5] || ""}` : `${HARI[m[1]][i]}${m[2]}${m[3]} ${BULAN[m[4]][i]}${m[5] || ""}`);
  const b = REX_BLN.exec(k); if (b) return teks.replace(k, `${i === 1 ? "، " : b[1]}${b[2]} ${iso(BULAN[b[3]][i])}${b[4] || ""}`);
  return null;
}
const ATR = ["placeholder", "aria-label", "title"];
const lewati = el => !el || el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "TEXTAREA" || el.isContentEditable || (el.closest && el.closest("[data-asli]"));
function teksNode(x, i) { if (lewati(x.parentNode)) return; const t = terjemah(x.data, i); if (t != null && t !== x.data) x.data = t; }
function atrNode(el, i) { ATR.forEach(a => { const v = el.getAttribute(a); if (v) { const t = terjemah(v, i); if (t != null && t !== v) el.setAttribute(a, t); } }); }
function prosesNode(n, i) {
  if (n.nodeType === 3) return teksNode(n, i);
  if (n.nodeType !== 1 || lewati(n)) return;
  atrNode(n, i);
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let x;
  while ((x = w.nextNode())) x.nodeType === 3 ? teksNode(x, i) : atrNode(x, i);
}
export function terapkanBahasa() {
  const b = bahasa(); try { akar().lang = b; akar().dir = "ltr"; /* tata letak tidak dibalik untuk bahasa Arab */ } catch (e) { }
  if (b === "id" || typeof MutationObserver === "undefined") return;
  const i = IX[b];
  const mulai = () => {
    prosesNode(document.body, i);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === "childList") m.addedNodes.forEach(n => prosesNode(n, i)); else prosesNode(m.target, i); } })
      .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATR });
  };
  document.body ? mulai() : addEventListener("DOMContentLoaded", mulai);
}
export function setBahasa(b) { try { localStorage.setItem("mk_bahasa", b); } catch (e) { } location.reload(); }
