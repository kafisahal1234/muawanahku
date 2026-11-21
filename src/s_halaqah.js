// Kelola halaqah: bawaan mengikuti asrama (guru = wali asrama); guru tahfidz tanpa asrama bisa mengambil santri dari asrama mana pun
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Card, SubHeader, Row, Pill, Btn, Empty, Field, Sheet, Confirm, Hint, SearchBox } from "./ui.js";
import { S, put, toast, uid } from "./store.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { logUbah } from "./s_koreksi.js";

export const bolehKelolaHalaqah = () => { const m = me(); return !!m && m.roles.some(r => ["admin", "wadir_tahfidz", "mudir"].includes(r)); };
// halaqah asal santri = halaqah milik wali asramanya
export const halaqahAsal = s => { const a = L.asramaById(s.asrama); return a ? L.HALAQAH.find(h => h.guru === a.musyrif) : null; };

export function HalaqahAdmin() {
  useApp();
  const [baru, setBaru] = useState(false); const boleh = bolehKelolaHalaqah();
  return html`<${SubHeader} title="Halaqah" sub=${`${L.HALAQAH.length} halaqah · ${L.santriList().length} santri`} /><div class="wrap">
    <${Hint}>Bawaan: santri ikut halaqah wali asramanya. Guru tahfidz yang tidak memegang asrama (misal Ust. Hidayat) dibuatkan halaqah sendiri lalu mengambil santri dari asrama mana pun.</${Hint}>
    ${boleh ? html`<${Btn} kind="ghost" icon="plus" onClick=${() => setBaru(true)}>Buat halaqah untuk guru tanpa asrama</${Btn}>` : null}
    <div class="mt12"><${Card}><div class="list">${L.HALAQAH.map(h => { const g = L.staffById(h.guru) || {}, l = L.santriHalaqah(h.id), asr = new Set(l.map(s => s.asrama)), punyaAsrama = !!L.asramaOf(h.guru);
      return html`<${Row} name=${h.nama} sub=${`${g.nama || "—"} · ${l.length} santri dari ${asr.size} asrama`} icon=${html`<${Icon} n="bookopen" s=${18} />`}
        right=${html`<${Pill} t=${punyaAsrama ? "Asrama" : "Lintas asrama"} tone=${punyaAsrama ? "muted" : "gold"} />`} onClick=${() => nav.go("halaqahEdit", { hid: h.id })} />`; })}</div></${Card}></div>
    ${baru ? html`<${BaruHalaqah} onClose=${() => setBaru(false)} />` : null}</div>`;
}

function BaruHalaqah({ onClose }) {
  const kandidat = L.STAFF.filter(s => !L.halaqahOf(s.id) && !(L.akunOv(s.username) || {}).hapus);
  const [g, setG] = useState(kandidat[0] ? kandidat[0].id : "");
  const simpan = async () => {
    const st = L.staffById(g), id = uid("hq");
    if (!st.roles.includes("guru_tahfidz")) await put("staffEdit", st.id, { ...((S.data.staffEdit || {})[st.id] || {}), roles: [...st.roles, "guru_tahfidz"] });
    if (await put("halaqahEdit", id, { nama: "Halaqah " + st.pendek, guru: st.id, pondok: "21", ts: Date.now() })) { logUbah("tambah", "halaqahEdit", id, `Halaqah baru ${st.pendek}`); toast("Halaqah dibuat. Sekarang pilih santrinya."); onClose(); nav.go("halaqahEdit", { hid: id }); }
  };
  return html`<${Sheet} open=${true} title="Buat halaqah" onClose=${onClose}>
    ${kandidat.length ? html`<${Field} label="Guru tahfidz" hint="Hanya guru yang belum punya halaqah"><select class="in" value=${g} onChange=${e => setG(e.target.value)}>${kandidat.map(s => html`<option value=${s.id}>${s.nama}</option>`)}</select></${Field}>
      <${Btn} onClick=${simpan} icon="check">Buat halaqah</${Btn}>` : html`<${Empty} t="Semua guru sudah punya halaqah." icon="users" />`}</${Sheet}>`;
}

export function HalaqahEdit({ hid }) {
  useApp();
  const h = L.halaqahById(hid); const [pick, setPick] = useState(false); const [ask, setAsk] = useState(false); const [q, setQ] = useState("");
  if (!h) return html`<${SubHeader} title="Halaqah" /><div class="wrap"><${Card}><${Empty} t="Halaqah tidak ditemukan." /></${Card}></div>`;
  const g = L.staffById(h.guru) || {}, l = L.santriHalaqah(h.id), boleh = bolehKelolaHalaqah(), asal = !!L.asramaOf(h.guru);
  const pindah = async (s, ke) => { const tujuan = ke || halaqahAsal(s); if (!tujuan) return toast("Halaqah asal tidak ditemukan.", "err");
    if (await put("santriEdit", s.id, { ...((S.data.santriEdit || {})[s.id] || {}), halaqah: tujuan.id })) logUbah("ubah", "santriEdit", s.id, `${s.nama} pindah ke ${tujuan.nama}`); };
  const hapus = async () => { setAsk(false); for (const s of l) await pindah(s); await put("halaqahEdit", h.id, { ...((S.data.halaqahEdit || {})[h.id] || {}), hapus: true }); logUbah("hapus", "halaqahEdit", h.id, `Halaqah ${h.nama} dihapus`); toast("Halaqah dihapus, santri kembali ke halaqah asramanya"); nav.back(); };
  const cari = L.santriList().filter(s => s.halaqah !== h.id && (!q || s.nama.toLowerCase().includes(q.toLowerCase()) || L.asramaAman(s.asrama).nama.toLowerCase().includes(q.toLowerCase()))).slice(0, 60);
  return html`<${SubHeader} title=${h.nama} sub=${`${g.nama || "—"} · ${l.length} santri`} /><div class="wrap">
    ${!asal ? html`<${Hint}>Guru ini tidak memegang asrama. Ambil santri dari asrama mana pun; santri tetap tinggal di asramanya, hanya setoran dan absen halaqahnya pindah ke sini.</${Hint}>` : html`<${Hint}>Halaqah bawaan asrama ${L.asramaOf(h.guru).nama}. Santri yang diambil guru lain otomatis keluar dari daftar ini.</${Hint}>`}
    ${boleh ? html`<${Btn} kind="ghost" icon="plus" onClick=${() => setPick(true)}>Tambah santri dari asrama lain</${Btn}>` : null}
    <div class="mt12"><${Card} title=${`Anggota · ${l.length}`}>${l.length ? html`<div class="list">${l.map(s => html`<div class="row"><span class="av">${L.initials(s.nama)}</span><span class="row-t"><b>${s.nama}</b><small>Kelas ${s.kelas} · Asrama ${L.asramaAman(s.asrama).nama}</small></span>
      ${boleh && !asal ? html`<button class="icon-btn" aria-label=${"Kembalikan " + s.nama} onClick=${() => pindah(s)}><${Icon} n="x" s=${20} /></button>` : null}</div>`)}</div>` : html`<${Empty} t="Belum ada santri. Ketuk Tambah santri." icon="users" />`}</${Card}></div>
    ${boleh && !asal ? html`<${Btn} kind="outline" icon="trash" onClick=${() => setAsk(true)}>Hapus halaqah ini</${Btn}>` : null}
    <${Sheet} open=${pick} title="Ambil santri" onClose=${() => setPick(false)}>
      <${SearchBox} value=${q} onInput=${setQ} ph="Cari nama atau asrama" />
      <div class="list">${cari.map(s => html`<${Row} name=${s.nama} sub=${`Kelas ${s.kelas} · ${L.asramaAman(s.asrama).nama} · sekarang ${L.namaHalaqah(s)}`} onClick=${async () => { await pindah(s, h); toast(`${s.nama} masuk ${h.nama}`); }} />`)}</div></${Sheet}>
    <${Confirm} open=${ask} danger title="Hapus halaqah?" text=${`Semua santri (${l.length}) kembali ke halaqah asramanya masing-masing. Riwayat setoran tetap tersimpan.`} yes="Hapus" onYes=${hapus} onNo=${() => setAsk(false)} /></div>`;
}
