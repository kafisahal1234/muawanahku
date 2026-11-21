import { useState } from "preact/hooks";
import { html, nav, Icon, Sheet, SearchBox, Row, Pill } from "./ui.js";
import { staffById, santriById, initials } from "./logic.js";
import { get } from "./store.js";

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
  const t = initials((nama || "?").replace(/^(Ust\.|Ustdzh\.)\s*/, ""));
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
