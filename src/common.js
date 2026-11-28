import { useState, useEffect } from "preact/hooks";
import { createPortal } from "preact/compat";
import { html, nav, Icon, Sheet, SearchBox, Row, Pill, Card, Counts, STATUS } from "./ui.js";
import { staffById, santriById, initials } from "./logic.js";
import * as L from "./logic.js";
import { get } from "./store.js";
import { Ikon, WARNA } from "./ikon.js";

export const me = () => (nav.user && nav.user.kind === "staff" ? staffById(nav.user.id) : null);
export const has = r => { const m = me(); return !!m && m.roles.includes(r); };

export function SantriPicker({ list, value, onChange, label = "Pilih santri" }) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState("");
  const s = value ? santriById(value) : null;
  const shown = (list || []).filter(x => x && String(x.nama || "").toLowerCase().includes(q.toLowerCase().trim())).slice(0, 80);
  return html`<div>
    <button type="button" class="in pick" style="display:flex;align-items:center;gap:10px;text-align:left;width:100%;border:1.5px solid #D3E0D8;border-radius:14px;padding:10px 12px;background:#fff;min-height:52px" onClick=${() => setOpen(true)}>
      ${s ? html`<span class="av" style="width:34px;height:34px;border-radius:11px">${initials(s.nama)}</span><span style="flex:1"><b style="display:block;font-size:14px">${s.nama}</b><small class="small">Kelas ${s.kelas}</small></span>`
          : html`<span style="flex:1;color:#7A8F85">${label}</span>`}<${Icon} n="down" s=${18} c="#7A8F85" /></button>
    <${Sheet} open=${open} title=${label} onClose=${() => setOpen(false)}>
      <${SearchBox} value=${q} onInput=${setQ} />
      ${shown.length ? html`<div class="list">${shown.map(x => html`<${Row} name=${x.nama} sub=${"Kelas " + (x.kelas || "—")} onClick=${() => { onChange(x.id); setOpen(false); setQ(""); }} />`)}</div>`
        : html`<p class="small center" style="padding:18px 6px">${(list || []).length ? "Nama santri tidak ditemukan." : "Belum ada santri di pondok akun ini. Minta Admin memeriksa pondok akun dan data santri."}</p>`}
    </${Sheet}></div>`;
}

export function StatusPill({ r }) {
  if (!r) return html`<${Pill} t="Belum" tone="muted" />`;
  return r.lulus ? html`<${Pill} t=${"Lulus · " + r.nilai} tone="green" />` : html`<${Pill} t=${"Ulang · " + r.nilai} tone="red" />`;
}

export async function compressImage(file, max = 900, q = 0.72) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    let out = c.toDataURL("image/jpeg", q);
    if (out.length > 150000) out = c.toDataURL("image/jpeg", 0.5);
    return out;
  } finally { URL.revokeObjectURL(url); }
}

// ---------- foto profil ----------
export const kunciFoto = user => (user.kind === "wali" ? "s_" + user.id : user.id);
export const fotoUser = user => ((user && get("profil", kunciFoto(user))) || {}).foto || null;
export const fotoSantri = sid => (get("profil", "s_" + sid) || {}).foto || null;
export function FotoAv({ src, nama, size = 48, cls = "" }) {
  const t = initials((nama || "?").replace(/\([^)]*\)/g, "").replace(/^(Ust\.|Ustdzh\.|H\.)\s*/, "").trim() || "?");
  return html`<span class=${"foto-av " + cls} style=${`width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px`}>${src ? html`<img src=${src} alt=${"Foto " + (nama || "")} />` : t}</span>`;
}
// potong tengah jadi persegi lalu kompres (foto profil ringan)
export async function fotoPersegi(file, n = 320) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(img.width, img.height), c = document.createElement("canvas"); c.width = n; c.height = n;
    c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, n, n);
    return c.toDataURL("image/jpeg", 0.78);
  } finally { URL.revokeObjectURL(url); }
}

// Tampilan setelah absen diisi: ringkasan hanya-baca. Ubah/hapus lewat Riwayat & Koreksi.
const TONE_ST = { H: "green", S: "blue", I: "gold", A: "red", M: "purple" };
export function AbsenSelesai({ judul, oleh, ts, st, grup, opts = ["H", "S", "I", "A"], modul, extra, lanjut }) {
  const [semua, setSemua] = useState(false);
  const tdk = grup.flatMap(g => g.list.filter(s => st[s.id] && st[s.id] !== "H").map(s => ({ s, g })));
  const pill = k => html`<${Pill} t=${(STATUS[k] || ["—"])[0]} tone=${TONE_ST[k] || "muted"} />`;
  return html`<div class="wrap">
    <div class="selesai-card"><span class="sc-ic"><${Icon} n="check" s=${26} c="#fff" w=${3} /></span>
      <div><b>${judul}</b><small>Diisi ${L.staffAman(oleh).pendek} pukul ${L.fmtJam(ts)}</small></div></div>
    <${Card}><${Counts} st=${st} opts=${opts} />
      ${tdk.length ? html`<div class="grp">Tidak hadir / catatan (${tdk.length})</div><div class="list">${tdk.map(({ s, g }) => html`<${Row} name=${s.nama} sub=${grup.length > 1 ? g.nama : null} right=${pill(st[s.id])} />`)}</div>`
        : html`<p class="small center" style="margin:12px 0 4px">Semua santri hadir.</p>`}
      <button type="button" class="link mt8" onClick=${() => setSemua(!semua)}>${semua ? "Sembunyikan daftar lengkap" : "Lihat semua santri"}</button>
      ${semua ? grup.map(g => html`${grup.length > 1 ? html`<div class="grp">${g.nama}</div>` : null}<div class="list">${g.list.map(s => html`<${Row} name=${s.nama} right=${pill(st[s.id])} />`)}</div>`) : null}</${Card}>
    ${extra || null}${lanjut || null}
    <p class="riwayat-hint">Perlu mengubah atau menghapus? <button type="button" class="link" onClick=${() => nav.go("riwayatModul", { modul })}>Buka Riwayat & Koreksi</button></p></div>`;
}

// Pratinjau foto ukuran besar (ketuk foto profil untuk memperbesar)
export function FotoBesar({ src, nama, onClose }) {
  useEffect(() => { const k = e => e.key === "Escape" && onClose(); addEventListener("keydown", k); const o = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { removeEventListener("keydown", k); document.body.style.overflow = o; }; }, []);
  return createPortal(html`<div class="foto-lb" role="dialog" aria-label=${"Foto " + (nama || "")} onClick=${onClose}>
    <button type="button" class="lb-x" aria-label="Tutup" onClick=${onClose}><${Icon} n="x" s=${24} c="#fff" /></button>
    <img src=${src} alt=${"Foto " + (nama || "")} onClick=${e => e.stopPropagation()} />${nama ? html`<p>${nama}</p>` : null}</div>`, document.body);
}
export function FotoLihat({ src, nama, size = 48, cls = "" }) {
  const [buka, setBuka] = useState(false);
  if (!src) return html`<${FotoAv} src=${src} nama=${nama} size=${size} cls=${cls} />`;
  return html`<button type="button" class="foto-btn" aria-label=${"Lihat foto " + (nama || "")} onClick=${e => { e.stopPropagation(); setBuka(true); }}><${FotoAv} src=${src} nama=${nama} size=${size} cls=${cls} /></button>
    ${buka ? html`<${FotoBesar} src=${src} nama=${nama} onClose=${() => setBuka(false)} />` : null}`;
}

// Daftar menu evaluasi untuk Mudir: tiap baris = ikon, nama, keterangan isi, angka singkat (opsional).
export function MenuEvaluasi({ judul = "Evaluasi", ket, items }) {
  return html`<section class="ev"><div class="ev-h"><h3>${judul}</h3>${ket ? html`<small>${ket}</small>` : null}</div>
    <div class="ev-list">${items.filter(Boolean).map(m => html`<button class="ev-row" style=${`--ev:${WARNA[m.w][1]};--ev2:${WARNA[m.w][2]}`} onClick=${m.go}>
      <span class="ev-ic"><${Ikon} n=${m.ic} warna=${m.w} s=${26} /></span>
      <span class="ev-t"><b>${m.t}</b><small>${m.d}</small></span>
      ${m.n != null ? html`<span class=${"ev-n " + (m.tone || "")}><b>${m.n}</b>${m.nl ? html`<em>${m.nl}</em>` : null}</span>` : null}
      <${Icon} n="right" s=${18} c="#9AB0A5" /></button>`)}</div></section>`;
}
