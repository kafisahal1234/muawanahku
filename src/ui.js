import { h } from "preact";
import { createPortal } from "preact/compat";
import { useState, useEffect, useRef } from "preact/hooks";
import htm from "htm";
import { subscribe, onToast } from "./store.js";
import { LOGO } from "./data.js";
import { APP_LOGO } from "./logo_app.js";
import { Ikon, adaIkon, WARNA } from "./ikon.js";
export const html = htm.bind(h);

// ---------------- navigasi (tombol/gesture kembali Android & iOS ikut bekerja) ----------------
const N = { stack: [], tab: "home", user: null, ver: 0, dir: "tab", splash: false };
const nsubs = new Set();
let live = 0, ignore = false;
function nemit() { N.ver++; nsubs.forEach(f => f(N.ver)); }
// Transisi antar layar: View Transitions API (Chrome/Edge, Safari 18+) — layar baru menggeser masuk, tombol kembali menggeser keluar.
// Browser lama tetap memakai animasi CSS sederhana (.scr.dir-*). Mengikuti pengaturan "kurangi gerakan" perangkat.
const VT = (() => { try { return typeof document !== "undefined" && !!document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();
try { if (VT) document.documentElement.classList.add("vt"); } catch (e) { }
function pindah(dir, ubah) {
  if (!VT || !N.user || N.splash) { ubah(); return; }
  const el = document.documentElement;
  try {
    el.dataset.nav = dir;
    const t = document.startViewTransition(() => new Promise(res => { ubah(); setTimeout(res, 0); }));
    const beres = () => { if (el.dataset.nav === dir) delete el.dataset.nav; };
    t.ready.catch(() => { }); t.updateCallbackDone.catch(() => { }); t.finished.then(beres, beres);
  } catch (e) { ubah(); }
}
function unwind() { if (live > 0) { try { ignore = true; history.go(-live); } catch (e) { ignore = false; } live = 0; } }
try {
  window.addEventListener("popstate", () => {
    if (ignore) { ignore = false; return; }
    if (live > 0) live--;
    if (N.stack.length) pindah("back", () => { N.dir = "back"; N.stack.pop(); nemit(); window.scrollTo(0, 0); });
    else if (N.user && N.tab !== "home") pindah("tab", () => { N.dir = "back"; N.tab = "home"; nemit(); });
  });
} catch (e) { }
export const nav = {
  get user() { return N.user; }, get tab() { return N.tab; }, get dir() { return N.dir; }, get splash() { return N.splash; }, get kembali() { return N.kembali; }, endSplash() { N.splash = false; nemit(); }, get top() { return N.stack[N.stack.length - 1]; }, get depth() { return N.stack.length; },
  setUser(u, opt = {}) { unwind(); N.user = u; N.stack = []; N.tab = "home"; N.dir = "tab"; N.splash = !!(u && opt.splash); N.kembali = !!opt.kembali; try { if (u) localStorage.setItem("mk_user", JSON.stringify(u)); else { localStorage.removeItem("mk_user"); sessionStorage.removeItem("mk_user"); } } catch (e) { } nemit(); },
  go(screen, params = {}) { pindah("fwd", () => { N.dir = "fwd"; N.stack.push({ screen, params }); try { history.pushState({ mk: N.stack.length }, ""); live++; } catch (e) { } nemit(); window.scrollTo(0, 0); }); },
  replace(screen, params = {}) { pindah("fwd", () => { N.dir = "fwd"; N.stack[N.stack.length - 1] = { screen, params }; nemit(); window.scrollTo(0, 0); }); },
  back() { if (live > 0) { try { history.back(); return; } catch (e) { } } pindah("back", () => { N.dir = "back"; N.stack.pop(); nemit(); window.scrollTo(0, 0); }); },
  home() { pindah("back", () => { unwind(); N.dir = "back"; N.stack = []; N.tab = "home"; nemit(); window.scrollTo(0, 0); }); },
  setTab(t) { if (t === N.tab && !N.stack.length) { window.scrollTo({ top: 0, behavior: "smooth" }); return; } pindah("tab", () => { unwind(); N.dir = "tab"; N.stack = []; N.tab = t; nemit(); window.scrollTo(0, 0); }); },
};
export function useApp() {
  const [, set] = useState(0);
  useEffect(() => { const a = subscribe(v => set(x => x + 1)); const b = (f => (nsubs.add(f), () => nsubs.delete(f)))(() => set(x => x + 1)); return () => { a(); b(); }; }, []);
}

// ---------------- ikon ----------------
const P = {
  copy: "M9 9h11v11H9zM5 15H4V4h11v1", stop: "M7 7h10v10H7z", image: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 8.5h.01",
  clip: "M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9",
  share: "M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13", newchat: "M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7M17 3l4 4-9 9H8v-4z",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  calendar: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4",
  clock: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3 2",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16M8 7h7",
  bookopen: "M2 5h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2zM22 5h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z",
  check: "M5 12.5 10 17l9-10",
  checksq: "M9 11l3 3 8-8M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  clipboard: "M9 4h6v3H9zM8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2M9 12h6M9 16h4",
  file: "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h6",
  award: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 14 7 22l5-3 5 3-1.5-8",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  bell: "M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0",
  logout: "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H4",
  plus: "M12 5v14M5 12h14", minus: "M5 12h14",
  left: "M15 5l-7 7 7 7", right: "M9 5l7 7-7 7", down: "M5 9l7 7 7-7",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  alert: "M12 3 2 20h20zM12 10v4M12 17v.5",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  sun: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v4h16v-4",
  megaphone: "M3 10v4h3l7 5V5L6 10zM17 8a5 5 0 0 1 0 8",
  settings: "M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 13.7H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10.3 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  layers: "M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 17.5l10 5 10-5",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  heart: "M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z",
  x: "M6 6l12 12M18 6 6 18",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  cal2: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M12 14h2M16 14h0M8 17h2",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
  eyeoff: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
  download: "M12 4v12M7 11l5 5 5-5M4 20h16",
  wifioff: "M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M14 10.3A10 10 0 0 1 19 13M2 9.5a15 15 0 0 1 4.5-2.8M11 6a15 15 0 0 1 11 3.5M12 20h.01",
  mic: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3",
  home2: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6",
  door: "M4 21h16M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M14 12h.5",
  pen: "M12 20h9M16.5 3.5a2 2 0 0 1 3 3L7 19l-4 1 1-4z",
  sliders: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  briefcase: "M4 8h16v12H4zM9 8V5h6v3M4 13h16",
  target: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM12 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2z",
  printer: "M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  send: "M4 12l16-8-6 16-2.5-6.5zM11.5 13.5L20 4",
  chat: "M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 10.5h.01M12 10.5h.01M16 10.5h.01",
  right: "M9 6l6 6-6 6",
  chev: "M9 6l6 6-6 6",
  sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8zM5 2l.6 1.4L7 4l-1.4.6L5 6l-.6-1.4L3 4l1.4-.6z",
  camera: "M4 7h4l2-3h4l2 3h4v13H4zM12 10a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
};
export function Icon({ n, s = 22, w = 2, c = "currentColor" }) {
  return html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke=${c} stroke-width=${w} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${P[n] || P.grid} /></svg>`;
}
export const TILE = { emerald: ["#22B573", "#0B7A45"], blue: ["#4B8DF0", "#1D58C4"], orange: ["#F7883A", "#C9500D"], coral: ["#F06A55", "#C23324"], gold: ["#F2BE4E", "#C3860D"], teal: ["#22AEB2", "#0A7479"],
  indigo: ["#7C7CF0", "#4646C2"], purple: ["#A07AF7", "#6A3BD9"], pink: ["#F06BA3", "#C22D6C"], slate: ["#7B8F86", "#435650"], green: ["#16A063", "#0B5D3B"] };

// ---------------- komponen ----------------
export const Logo = ({ s = 44 }) => html`<span class="logo applogo" style=${`width:${s}px;height:${s}px`}><img src=${APP_LOGO} alt="Logo MuawanahQu" /></span>`;
export function Tile({ icon, label, color = "emerald", badge, onClick }) {
  const w = WARNA[color] || WARNA.emerald;
  return html`<button class="tile" onClick=${onClick}><span class="tile-ic" style=${`background:${w[2]}`}>${adaIkon(icon) ? html`<${Ikon} n=${icon} warna=${color} s=${34} />` : html`<${Icon} n=${icon} s=${28} c=${w[1]} w=${2.2} />`}${badge ? html`<b class="badge">${badge > 99 ? "99+" : badge}</b>` : null}</span><span class="tile-lb">${label}</span></button>`;
}
export function Card({ title, right, children, cls = "" }) {
  return html`<section class=${"card " + cls}>${title ? html`<div class="card-h"><h3>${title}</h3>${right || null}</div>` : null}${children}</section>`;
}
export function SubHeader({ title, sub, right, children }) {
  return html`<header class="sub-h"><div class="sub-row"><button class="back" aria-label="Kembali" onClick=${() => nav.back()}><${Icon} n="left" s=${24} /></button><div class="sub-t"><h1>${title}</h1>${sub ? html`<p>${sub}</p>` : null}</div>${right || null}</div>${children || null}</header>`;
}
// Angka yang "menghitung naik" saat pertama tampil (mengikuti pengaturan kurangi gerakan)
const KURANGI = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return true; } })();
const angkaKe = (p, e) => { const dec = (p.split(",")[1] || "").length, n = Number(p.replace(",", ".")) * e, t = dec ? n.toFixed(dec).replace(".", ",") : String(Math.round(n)); return p.length > 1 && p[0] === "0" && !dec ? t.padStart(p.length, "0") : t; };
export function Angka({ v }) {
  const s = String(v ?? ""); const [d, setD] = useState(s); const awal = useRef(true);
  useEffect(() => {
    if (!awal.current) { setD(s); return; } awal.current = false;
    const parts = s.split(/(\d+(?:,\d+)?)/); if (KURANGI || parts.length < 2 || s.length > 24) return;
    const t0 = performance.now(); let raf;
    const step = now => { const k = Math.min(1, (now - t0) / 750), e = 1 - Math.pow(1 - k, 3); setD(parts.map((p, i) => (i % 2 ? angkaKe(p, e) : p)).join("")); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [s]);
  return html`${d}`;
}
export function Stat({ label, value, sub, tone }) { return html`<div class=${"stat " + (tone || "")}><span>${label}</span><b>${typeof value === "string" || typeof value === "number" ? html`<${Angka} v=${value} />` : value}</b>${sub ? html`<small>${sub}</small>` : null}</div>`; }
export function Avatar({ name, tone }) {
  const t = (name || "?").replace(/^(Ust\.|Ustdzh\.)\s*/, "").replace(/^(M\.?|Muhammad|Muhamad)\s+/i, "").split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return html`<span class=${"av " + (tone || "")}>${t}</span>`;
}
export function Row({ name, sub, right, onClick, tone, icon }) {
  const inner = html`${icon ? html`<span class="row-ic">${icon}</span>` : html`<${Avatar} name=${name} tone=${tone} />`}<span class="row-t"><b>${name}</b>${sub ? html`<small>${sub}</small>` : null}</span>${right != null ? html`<span class="row-r">${right}</span>` : null}`;
  return onClick ? html`<button class="row" onClick=${onClick}>${inner}<${Icon} n="right" s=${18} c="#9AB0A5" /></button>` : html`<div class="row">${inner}</div>`;
}
export const Pill = ({ t, tone = "green" }) => html`<span class=${"pill " + tone}>${t}</span>`;
export function Btn({ children, onClick, kind = "primary", disabled, full = true, type = "button", icon }) {
  return html`<button type=${type} class=${`btn ${kind} ${full ? "full" : ""}`} disabled=${disabled} onClick=${onClick}>${icon ? html`<${Icon} n=${icon} s=${19} />` : null}${children}</button>`;
}
export function AbsenItem({ s, sub, value, onChange, opts = ["H", "S", "I", "A"] }) {
  return html`<div class="absen-row stack"><div class="nm"><b>${s.nama}</b>${sub ? html`<small>${sub}</small>` : null}</div><${StatusPick} name=${s.nama} opts=${opts} value=${value} onChange=${onChange} /></div>`;
}
export function Counts({ st, opts = ["H", "S", "I", "A"] }) {
  const tone = { H: "green", S: "blue", I: "gold", A: "red", M: "purple" };
  return html`<div class="minis">${opts.map(k => html`<${Pill} t=${STATUS[k][0] + " " + Object.values(st).filter(v => v === k).length} tone=${tone[k]} />`)}</div>`;
}
export const Hint = ({ children }) => html`<p class="hint">${children}</p>`;
export function Empty({ t, icon = "clipboard" }) { return html`<div class="empty"><${Icon} n=${icon} s=${30} c="#9AB0A5" /><p>${t}</p></div>`; }
export function Bar({ v, tone = "green" }) { return html`<span class="bar"><i class=${tone} style=${`width:${Math.max(0, Math.min(100, v || 0))}%`}></i></span>`; }
export function Field({ label, hint, children }) { return html`<label class="field"><span>${label}</span>${children}${hint ? html`<small>${hint}</small>` : null}</label>`; }
// Kotak kata sandi dengan tombol mata (tampilkan/sembunyikan)
export function PassInput({ value, onInput, autocomplete = "current-password", placeholder, label = "kata sandi" }) {
  const [show, setShow] = useState(false);
  return html`<div class="pass-in"><input class="in" type=${show ? "text" : "password"} autocomplete=${autocomplete} autocapitalize="none" spellcheck="false" value=${value} placeholder=${placeholder || ""} aria-label=${label} onInput=${onInput} />
    <button type="button" class="pass-eye" aria-label=${show ? "Sembunyikan " + label : "Tampilkan " + label} aria-pressed=${show} onClick=${() => setShow(!show)}><${Icon} n=${show ? "eyeoff" : "eye"} s=${20} /></button></div>`;
}
export function Seg({ items, value, onChange, small }) {
  return html`<div class=${"seg " + (small ? "small" : "")}>${items.map(([k, lab]) => html`<button type="button" aria-pressed=${k === value} class=${k === value ? "on" : ""} onClick=${() => onChange(k)}>${lab}</button>`)}</div>`;
}
export function Stepper({ value, onChange, min = 0, max = 999, step = 1, label }) {
  const v = value === "" ? "" : Number(value);
  const set = x => onChange(Math.max(min, Math.min(max, x)));
  return html`<div class="stepper">
    <button aria-label=${"Kurangi " + (label || "")} onClick=${() => set((Number(v) || 0) - step)}><${Icon} n="minus" /></button>
    <input type="number" inputmode="numeric" min=${min} max=${max} value=${v} aria-label=${label}
      onInput=${e => { const t = e.target.value; if (t === "") onChange(""); else { const n = Math.floor(Number(t)); if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n))); } }}
      onFocus=${e => e.target.select()} />
    <button aria-label=${"Tambah " + (label || "")} onClick=${() => set((Number(v) || 0) + step)}><${Icon} n="plus" /></button>
  </div>`;
}
export const STATUS = { H: ["Hadir", "st-h"], S: ["Sakit", "st-s"], I: ["Izin", "st-i"], A: ["Alpa", "st-a"], M: ["Masbuq", "st-m"] };
export function StatusPick({ value, opts = ["H", "S", "I", "A"], onChange, name, locked }) {
  return html`<div class="stpick">${opts.map(k => html`<button aria-label=${STATUS[k][0] + " untuk " + name} aria-pressed=${value === k} disabled=${locked && value !== k}
    class=${value === k ? "on " + STATUS[k][1] : ""} onClick=${() => onChange(k)}>${k}</button>`)}</div>`;
}
export function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return createPortal(html`<div class="sheet-bg" onClick=${e => { if (e.target.classList.contains("sheet-bg")) onClose(); }}><div class="sheet" role="dialog" aria-label=${title}>
    <div class="sheet-h"><h3>${title}</h3><button type="button" class="icon-btn" aria-label="Tutup" onClick=${onClose}><${Icon} n="x" /></button></div><div class="sheet-b">${children}</div></div></div>`, document.body);
}
export function Confirm({ open, title, text, yes = "Ya", onYes, onNo, danger }) {
  if (!open) return null;
  return createPortal(html`<div class="sheet-bg center" onClick=${e => { if (e.target.classList.contains("sheet-bg")) onNo(); }}><div class="dialog" role="alertdialog" aria-labelledby="dlg-t">
    ${danger ? html`<span class="dlg-ic"><${Icon} n="alert" s=${26} c="#B3261E" /></span>` : null}<h3 id="dlg-t">${title}</h3><p>${text}</p>
    <div class="dlg-stack"><${Btn} kind=${danger ? "danger" : "primary"} onClick=${onYes}>${yes}</${Btn}><${Btn} kind="text" onClick=${onNo}>Batal</${Btn}></div></div></div>`, document.body);
}
export function ToastHost() {
  const [t, setT] = useState(null); const tm = useRef(0);
  useEffect(() => onToast((msg, kind) => { setT({ msg, kind, id: Date.now() }); clearTimeout(tm.current); tm.current = setTimeout(() => setT(null), 2600); }), []);
  return t ? html`${t.kind !== "err" ? html`<div class="ok-burst" key=${t.id} aria-hidden="true"><span><${Icon} n="check" s=${40} w=${3} c="#fff" /></span></div>` : null}
    <div class=${"toast " + t.kind} key=${"t" + t.id} role="status"><span class="t-ic"><${Icon} n=${t.kind === "err" ? "alert" : "check"} s=${16} w=${2.6} /></span>${t.msg}</div>` : null;
}
export function SearchBox({ value, onInput, ph = "Cari nama santri" }) {
  return html`<div class="search"><${Icon} n="search" s=${18} c="#7A8F85" /><input value=${value} placeholder=${ph} onInput=${e => onInput(e.target.value)} /></div>`;
}
export function Section({ t, right }) { return html`<div class="sec"><h4>${t}</h4>${right || null}</div>`; }
