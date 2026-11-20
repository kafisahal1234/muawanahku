// Koreksi data: ubah & hapus data yang sudah diinput, dengan jejak perubahan (log)
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Card, SubHeader, Row, Pill, Btn, Empty, Sheet, Confirm, Hint, Seg } from "./ui.js";
import { all, get, put, del, toast, uid } from "./store.js";
import * as L from "./logic.js";
import { me } from "./common.js";

export function logUbah(aksi, col, id, ket, data) {
  const m = me();
  return put("log", uid("l"), { aksi, col, id, ket, data: data ? JSON.parse(JSON.stringify(data)) : null, oleh: m ? m.id : "?", ts: Date.now() });
}
export async function hapusData(col, ids, ket) {
  let ok = true;
  for (const id of ids) { const d = get(col, id); if (!d) continue; await logUbah("hapus", col, id, ket, d); ok = (await del(col, id)) !== false && ok; }
  return ok;
}
const PENGAWAS = ["mudir", "admin", "wadir_tahfidz", "wadir_kurikulum", "wadir_kesantrian"];
export function bolehUbah(rec) {
  const m = me(); if (!m) return false;
  return rec.guru === m.id || rec.oleh === m.id || m.roles.some(r => PENGAWAS.includes(r));
}
const J = { ziyadah: "Ziyadah", murojaah: "Murojaah", manzil: "Manzil", tasmi: "Tasmi'" };

// Ringkasan satu entri riwayat → judul, detail, ikon, aksi ubah
export function entriRiwayat(col, list) {
  const r = list[0];
  if (col === "setoran") {
    const s = L.santriById(r.santri), jud = `${J[r.jenis]} · ${s ? s.nama : "-"}`;
    const det = r.jenis === "ziyadah" ? `${r.baris} baris · nilai ${r.nilai}` : r.jenis === "murojaah" ? `Juz ${r.juz} hal. ${r.halDari}–${r.halSampai} · nilai ${r.nilai}` : `Juz ${r.juz} · nilai ${r.nilai}`;
    return { jud, det: det + (r.lulus ? "" : " · ulang"), ic: "bookopen" };
  }
  if (col === "absenHalaqah") return { jud: `Absen halaqah ${r.sesi}`, det: `${L.asramaById(r.asrama).nama} · ${L.fmtTgl(r.tanggal)}`, ic: "checksq" };
  if (col === "motd") return { jud: `Absen MOTD ${(L.WAKTU.find(x => x[0] === r.waktu) || [0, r.waktu])[1]}`, det: `Pondok ${r.pondok} · ${list.length} asrama · ${L.fmtTgl(r.tanggal)}`, ic: "moon" };
  if (col === "mutabaah") return { jud: `Mutaba'ah · ${(L.santriById(r.santri) || {}).nama}`, det: L.fmtTgl(r.tanggal), ic: "checksq" };
  if (col === "absenKelas") return { jud: `Absen kelas ${r.kelas} · ${L.mapelById(r.mapel).nama}`, det: `${L.fmtTgl(r.tanggal)} · ${r.materi ? "Jurnal: " + r.materi : "Jurnal belum diisi"}`, ic: "users" };
  if (col === "izin") return { jud: `Surat izin · ${(L.santriById(r.santri) || {}).nama}`, det: r.jenis, ic: "file" };
  if (col === "bap") return { jud: `BAP · ${(L.santriById(r.santri) || {}).nama}`, det: r.pelanggaranNama, ic: "clipboard" };
  if (col === "nilaiMapel") return { jud: `Nilai ${L.mapelById(r.mapel).nama} · ${r.kelas}`, det: "Nilai projek, PTS, PAS & aspek", ic: "edit" };
  if (col === "pengumuman") return { jud: "Pengumuman", det: r.judul, ic: "megaphone" };
  if (col === "izinGuru") return { jud: `Izin guru · ${r.jenis}`, det: L.fmtTgl(r.tanggal), ic: "briefcase" };
  return { jud: col, det: "", ic: "clipboard" };
}

// Setoran ziyadah/tasmi' hanya bisa dikoreksi bila setoran terakhir santri itu, agar urutan hafalan tetap benar
export function setoranTerakhir(r) {
  const l = L.setoranSantri(r.santri).filter(x => x.jenis === "ziyadah" || x.jenis === "tasmi");
  return !l.length || l[l.length - 1].id === r.id;
}

export function KoreksiSheet({ item, onClose }) {
  const [ask, setAsk] = useState(false);
  if (!item) return null;
  const { col, list } = item, r = list[0], e = entriRiwayat(col, list), boleh = bolehUbah(r);
  const urut = col === "setoran" && (r.jenis === "ziyadah" || r.jenis === "tasmi") ? setoranTerakhir(r) : true;
  let ubah = null;
  if (col === "setoran") {
    if (r.jenis === "ziyadah") ubah = () => nav.go("ziyadah", { sid: r.santri, edit: r.id });
    if (r.jenis === "murojaah") ubah = () => nav.go("murojaah", { sid: r.santri, edit: r.id });
    if (r.jenis === "tasmi") ubah = () => nav.go("tasmi", { sid: r.santri, edit: r.id });
  }
  if (col === "absenHalaqah") ubah = () => nav.go("absenHalaqah", { sesi: r.sesi, tgl: r.tanggal });
  if (col === "motd") ubah = () => nav.go("motd", { tgl: r.tanggal, waktu: r.waktu });
  if (col === "mutabaah") ubah = () => nav.go("mutabaah", { tgl: r.tanggal, sid: r.santri });
  if (col === "absenKelas") ubah = () => nav.go("absenKelas", { jid: r.jadwal, kelas: r.kelas, mapel: r.mapel, tgl: r.tanggal });
  if (col === "nilaiMapel") ubah = () => nav.go("nilaiMapel", { mapel: r.mapel, kelas: r.kelas });
  const hapus = async () => {
    setAsk(false);
    if (await hapusData(col, list.map(x => x.id), `${e.jud} · ${e.det}`)) { toast("Data dihapus. Tercatat di log perubahan."); onClose(); }
  };
  const efek = col === "setoran" && r.jenis === "ziyadah" ? "Posisi hafalan santri kembali ke sebelum setoran ini." : col === "setoran" && r.jenis === "tasmi" && r.lulus ? "Juz kembali belum lulus tasmi', santri kembali ke juz tersebut." : col === "absenHalaqah" || col === "motd" || col === "absenKelas" ? "Sesi ini kembali tercatat belum diabsen pada rekap." : col === "mutabaah" ? "Hari ini kembali tercatat belum diinput (nilai 0) pada rekap." : "";
  return html`<${Sheet} open=${true} title="Koreksi data" onClose=${onClose}>
    <div class="row" style="border:none"><span class="row-ic"><${Icon} n=${e.ic} s=${18} /></span><span class="row-t"><b>${e.jud}</b><small>${e.det}</small></span></div>
    <div class="kv"><span>Dicatat oleh</span><b>${(L.staffById(r.guru || r.oleh) || {}).pendek || "—"}</b></div>
    <div class="kv"><span>Waktu input</span><b>${r.ts ? L.fmtDT(new Date(r.ts).toISOString()) : "—"}</b></div>
    ${r.diubah ? html`<div class="kv"><span>Terakhir dikoreksi</span><b>${(L.staffById(r.diubah.oleh) || {}).pendek} · ${L.fmtDT(new Date(r.diubah.ts).toISOString())}</b></div>` : null}
    ${!boleh ? html`<div class="note mt8"><${Icon} n="lock" s=${18} />Hanya yang mencatat, Wadir, Admin, atau Mudir yang bisa mengoreksi data ini.</div>`
      : !urut ? html`<div class="note mt8"><${Icon} n="alert" s=${18} />Yang bisa dikoreksi hanya setoran ziyadah/tasmi' terakhir santri ini, supaya urutan hafalan tidak rusak. Koreksi setoran sesudahnya lebih dulu.</div>`
      : html`<div class="btn-row mt12">${ubah ? html`<${Btn} kind="ghost" icon="edit" onClick=${() => { onClose(); ubah(); }}>Ubah</${Btn}>` : null}<${Btn} kind="outline" icon="trash" onClick=${() => setAsk(true)}>Hapus</${Btn}></div>
        <p class="small mt8">${ubah ? "Ubah membuka data ini untuk diperbaiki lalu disimpan ulang. " : ""}Semua koreksi tercatat di log perubahan.</p>`}
    <${Confirm} open=${ask} danger title="Hapus data ini?" text=${`${e.jud} (${e.det}) akan dihapus. ${efek}`} yes="Hapus" onYes=${hapus} onNo=${() => setAsk(false)} /></${Sheet}>`;
}

// Kumpulkan entri riwayat milik guru (atau semua bila pengawas & mode semua)
export function kumpulRiwayat(id, semua) {
  const ev = [], mine = r => semua || r.guru === id || r.oleh === id;
  ["setoran", "absenHalaqah", "mutabaah", "absenKelas", "izin", "bap", "nilaiMapel", "pengumuman", "izinGuru"].forEach(col => all(col).filter(mine).forEach(r => ev.push({ col, list: [r], ts: (r.diubah && r.diubah.ts) || r.ts || 0 })));
  const g = {}; all("motd").filter(mine).forEach(r => { const k = `${r.pondok}_${r.tanggal}_${r.waktu}`; (g[k] = g[k] || []).push(r); });
  Object.values(g).forEach(list => ev.push({ col: "motd", list, ts: Math.max(...list.map(x => x.ts || 0)) }));
  return ev.sort((a, b) => b.ts - a.ts);
}

export function LogPerubahan() {
  useApp();
  const l = all("log").sort((a, b) => b.ts - a.ts).slice(0, 100);
  return html`<${SubHeader} title="Log Perubahan" sub="Jejak koreksi & penghapusan data" /><div class="wrap"><${Card}>
    ${l.length ? html`<div class="list">${l.map(x => html`<${Row} name=${x.ket || x.col} sub=${`${x.aksi === "hapus" ? "Dihapus" : "Diubah"} oleh ${(L.staffById(x.oleh) || {}).pendek || x.oleh} · ${L.fmtDT(new Date(x.ts).toISOString())}`}
      icon=${html`<${Icon} n=${x.aksi === "hapus" ? "trash" : "edit"} s=${18} />`} right=${html`<${Pill} t=${x.aksi === "hapus" ? "Hapus" : "Ubah"} tone=${x.aksi === "hapus" ? "red" : "blue"} />`} />`)}</div>`
      : html`<${Empty} t="Belum ada koreksi data." icon="clipboard" />`}</${Card}></div>`;
}
