// Koreksi data: ubah & hapus data yang sudah diinput, dengan jejak perubahan (log)
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Card, SubHeader, Row, Pill, Btn, Empty, Sheet, Confirm, Hint, Seg, SearchBox } from "./ui.js";
import { all, get, put, del, toast, uid } from "./store.js";
import * as L from "./logic.js";
import { me } from "./common.js";

export function logUbah(aksi, col, id, ket, data) {
  const m = me(), u = nav.user;
  return put("log", uid("l"), { aksi, col, id, ket, data: data ? JSON.parse(JSON.stringify(data)) : null, oleh: m ? m.id : u && u.kind === "wali" ? "w:" + u.id : "?", ts: Date.now() });
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
  if (col === "tahsin") { const s = L.santriById(r.santri), nm = s ? s.nama : "-";
    if (r.jenis === "ujian") return { jud: `Ujian Iqro' ${r.jilid} · ${nm}`, det: `${r.lulus ? "Lulus" : "Belum lulus"}${r.skor != null ? " · nilai " + r.skor : ""}${r.penguji ? " · penguji " + L.staffAman(r.penguji).pendek : ""} · ${L.fmtTgl(r.tanggal)}`, ic: "award" };
    if (r.jenis === "ajukan") return { jud: `Pengajuan ujian Iqro' ${r.jilid} · ${nm}`, det: `Menunggu ujian Wadir Tahfidz · ${L.fmtTgl(r.tanggal)}`, ic: "send" };
    return { jud: `Tahsin · ${nm}`, det: `${r.tingkat === "quran" ? r.posisi || "Al-Qur'an" : `Iqro' ${r.jilid} hal. ${r.dari}–${r.sampai}`} · ${L.TAHSIN_NILAI[r.nilai] || ""} · ${L.fmtTgl(r.tanggal)}`, ic: "book" }; }
  if (col === "absenHalaqah") return { jud: `Absen halaqah ${r.sesi}`, det: `${L.asramaAman(r.asrama).nama} · ${L.fmtTgl(r.tanggal)}`, ic: "checksq" };
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

export function KoreksiSheet({ item, onClose, onHapus }) {
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
  if (col === "tahsin" && r.jenis !== "ajukan") ubah = () => nav.go("tahsin", { sid: r.santri, edit: r.id });
  if (col === "absenHalaqah") ubah = () => nav.go("absenHalaqah", { sesi: r.sesi, tgl: r.tanggal, ubah: true });
  if (col === "motd") ubah = () => nav.go("motd", { tgl: r.tanggal, waktu: r.waktu, ubah: true });
  if (col === "mutabaah") ubah = () => nav.go("mutabaah", { tgl: r.tanggal, sid: r.santri, ubah: true });
  if (col === "absenKelas") ubah = () => nav.go("absenKelas", { jid: r.jadwal, kelas: r.kelas, mapel: r.mapel, tgl: r.tanggal, ubah: true });
  if (col === "nilaiMapel") ubah = () => nav.go("nilaiMapel", { mapel: r.mapel, kelas: r.kelas });
  if (col === "izin") ubah = r.jenis === "Skorsing" && r.bap && get("bap", r.bap) ? () => nav.go("formBap", { edit: r.bap }) : () => nav.go("suratIzin", { edit: r.id });
  if (col === "bap") ubah = () => nav.go("formBap", { edit: r.id });
  if (col === "izinGuru") ubah = () => nav.go("izinGuru", { edit: r.id });
  const hapus = async () => {
    setAsk(false);
    const ids = list.map(x => x.id), ikut = col === "bap" ? all("izin").filter(i => ids.includes(i.bap)).map(i => i.id) : [];
    if (await hapusData(col, ids, `${e.jud} · ${e.det}`)) {
      if (ikut.length) await hapusData("izin", ikut, `Status skorsing dari ${e.jud}`);
      toast("Data dihapus. Tercatat di log perubahan."); onClose(); if (onHapus) onHapus();
    }
  };
  const efek = col === "setoran" && r.jenis === "ziyadah" ? "Posisi hafalan santri kembali ke sebelum setoran ini." : col === "setoran" && r.jenis === "tasmi" && r.lulus ? "Juz kembali belum lulus tasmi', santri kembali ke juz tersebut." : col === "absenHalaqah" || col === "motd" || col === "absenKelas" ? "Sesi ini kembali tercatat belum diabsen pada rekap." : col === "mutabaah" ? "Hari ini kembali tercatat belum diinput (nilai 0) pada rekap." : col === "bap" ? "Poin pelanggaran dan surat-surat dari BAP ini ikut hilang." : col === "izin" ? "Santri tidak lagi tercatat sedang izin." : "";
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
export function kumpulRiwayat(id, semua, cols, cocok = () => true) {
  const ev = [], mine = r => (semua || r.guru === id || r.oleh === id) && cocok(r);
  const C = cols || ["setoran", "tahsin", "absenHalaqah", "mutabaah", "absenKelas", "izin", "bap", "nilaiMapel", "pengumuman", "izinGuru"];
  C.filter(c => c !== "motd").forEach(col => all(col).filter(mine).forEach(r => ev.push({ col, list: [r], ts: (r.diubah && r.diubah.ts) || r.ts || 0 })));
  const g = {}; if (C.includes("motd")) all("motd").filter(mine).forEach(r => { const k = `${r.pondok}_${r.tanggal}_${r.waktu}`; (g[k] = g[k] || []).push(r); });
  Object.values(g).forEach(list => ev.push({ col: "motd", list, ts: Math.max(...list.map(x => x.ts || 0)) }));
  return ev.sort((a, b) => b.ts - a.ts);
}

// Log perubahan di menu Akun: hanya jejak milik akun ini (yang ia ubah/hapus, dan input miliknya yang dikoreksi orang lain)
const namaPelaku = o => (String(o).startsWith("w:") ? "Wali " + (L.santriById(o.slice(2)) || { nama: "santri" }).nama : (L.staffById(o) || {}).pendek || "akun lain");
export function LogPerubahan() {
  useApp();
  const u = nav.user, aku = u.kind === "wali" ? "w:" + u.id : u.id, [f, setF] = useState("saya");
  const milikku = x => (x.data && (x.data.guru === u.id || x.data.oleh === u.id || x.data.pencatat === u.id)) || (u.kind === "wali" && x.col === "santriEdit" && x.id === u.id);
  const semua = all("log").filter(x => x.oleh === aku || milikku(x)).sort((a, b) => b.ts - a.ts);
  const l = (u.kind === "staff" && f === "lain" ? semua.filter(x => x.oleh !== aku) : u.kind === "staff" ? semua.filter(x => x.oleh === aku) : semua).slice(0, 100);
  const nLain = semua.filter(x => x.oleh !== aku).length;
  return html`<${SubHeader} title="Log Perubahan" sub="Hanya perubahan yang menyangkut akun ini">${u.kind === "staff" ? html`<${Seg} small items=${[["saya", "Oleh saya"], ["lain", `Input saya dikoreksi${nLain ? " (" + nLain + ")" : ""}`]]} value=${f} onChange=${setF} />` : null}</${SubHeader}><div class="wrap"><${Card}>
    ${l.length ? html`<div class="list">${l.map(x => html`<${Row} name=${x.ket || x.col} sub=${`${x.aksi === "hapus" ? "Dihapus" : "Diubah"} oleh ${x.oleh === aku ? "Anda" : namaPelaku(x.oleh)} · ${L.fmtDT(new Date(x.ts).toISOString())}`}
      icon=${html`<${Icon} n=${x.aksi === "hapus" ? "trash" : "edit"} s=${18} />`} right=${html`<${Pill} t=${x.aksi === "hapus" ? "Hapus" : "Ubah"} tone=${x.aksi === "hapus" ? "red" : "blue"} />`} />`)}</div>`
      : html`<${Empty} t=${f === "lain" ? "Belum ada input Anda yang dikoreksi akun lain." : "Belum ada perubahan data dari akun ini."} icon="clipboard" />`}</${Card}></div>`;
}

// ---------------- koreksi langsung dari tiap menu ----------------
// Tombol "Ubah / hapus" di layar detail (izin, BAP, dll.); hanya staf yang berhak
export function TombolKoreksi({ col, rec, label = "Ubah / hapus data ini", balik = true }) {
  const [open, setOpen] = useState(false);
  if (!rec || !nav.user || nav.user.kind !== "staff" || !bolehUbah(rec)) return null;
  return html`<div class="koreksi-bar"><${Btn} kind="ghost" icon="edit" onClick=${() => setOpen(true)}>${label}</${Btn}></div>
    ${open ? html`<${KoreksiSheet} item=${{ col, list: [rec] }} onClose=${() => setOpen(false)} onHapus=${balik ? () => nav.back() : null} />` : null}`;
}
// Banner di layar input bila data sudah pernah disimpan: info + tombol hapus
export function SudahAda({ col, recs, teks, ket }) {
  const [ask, setAsk] = useState(false);
  const l = (recs || []).filter(Boolean); if (!l.length) return null;
  const boleh = nav.user && nav.user.kind === "staff" && l.every(bolehUbah);
  const hapus = async () => { setAsk(false); if (await hapusData(col, l.map(x => x.id), ket || teks)) { toast("Data dihapus. Tercatat di log perubahan."); nav.back(); } };
  return html`<div class="sudah-ada"><${Icon} n="check" s=${18} /><span>${teks}${boleh ? " Ubah isiannya lalu simpan lagi untuk memperbaiki." : ""}</span>
    ${boleh ? html`<button type="button" class="sa-del" onClick=${() => setAsk(true)}><${Icon} n="trash" s=${16} />Hapus</button>` : null}
    <${Confirm} open=${ask} danger title="Hapus data ini?" text=${`${ket || teks} akan dihapus dan kembali tercatat belum diisi pada rekap. Tercatat di log perubahan.`} yes="Hapus" onYes=${hapus} onNo=${() => setAsk(false)} /></div>`;
}
// Riwayat & koreksi per modul (Tahfidz, Asrama, Mapel, Kesantrian, Izin guru)
export const MODUL = {
  tahfidz: { judul: "Tahfidz", cols: ["setoran", "tahsin", "absenHalaqah"], pengawas: ["wadir_tahfidz"] },
  asrama: { judul: "Mutaba'ah", cols: ["mutabaah"], pengawas: ["wadir_kesantrian"] },
  mapel: { judul: "Mapel", cols: ["absenKelas", "nilaiMapel"], pengawas: ["wadir_kurikulum"] },
  kesantrian: { judul: "Kesantrian", cols: ["izin", "bap"], pengawas: ["wadir_kesantrian"] },
  guru: { judul: "Izin Guru", cols: ["izinGuru"], pengawas: ["wadir_kurikulum"] },
};
export function RiwayatModul({ modul = "tahfidz" }) {
  useApp();
  const M = MODUL[modul] || MODUL.tahfidz, m = me();
  const pengawas = m.roles.some(r => ["mudir", "admin", ...M.pengawas].includes(r));
  const [mode, setMode] = useState(pengawas ? "semua" : "saya"); const [q, setQ] = useState(""); const [sel, setSel] = useState(null); const [n, setN] = useState(40);
  const pondok = m.roles.includes("wadir_kesantrian") && !m.roles.includes("mudir") ? m.pondok : null;
  const cocok = r => !pondok || !(modul === "kesantrian" || modul === "asrama") || (r.pondok ? r.pondok === pondok : L.pondokOfSantri(L.santriAman(r.santri)) === pondok);
  const ev = kumpulRiwayat(m.id, pengawas && mode === "semua", M.cols, cocok).map(x => ({ ...x, e: entriRiwayat(x.col, x.list) }))
    .filter(x => !q || (x.e.jud + " " + x.e.det).toLowerCase().includes(q.toLowerCase()));
  return html`<${SubHeader} title="Riwayat & Koreksi" sub=${`${M.judul} · ketuk untuk ubah atau hapus`}>
      ${pengawas ? html`<${Seg} small items=${[["semua", "Semua guru"], ["saya", "Input saya"]]} value=${mode} onChange=${setMode} />` : null}</${SubHeader}>
    <div class="wrap"><${SearchBox} value=${q} onInput=${setQ} ph="Cari nama santri atau jenis input" />
      <${Card}>${ev.length ? html`<div class="list">${ev.slice(0, n).map(x => { const r = x.list[0], oleh = L.staffAman(r.guru || r.oleh).pendek;
        return html`<${Row} name=${x.e.jud} sub=${`${x.e.det} · ${L.fmtShort(L.ymd(new Date(x.ts)))} ${L.fmtJam(x.ts)}${mode === "semua" ? " · " + oleh : ""}`} icon=${html`<${Icon} n=${x.e.ic} s=${18} />`}
          right=${r.diubah ? html`<${Pill} t="Dikoreksi" tone="blue" />` : null} onClick=${() => setSel(x)} />`; })}</div>
        ${ev.length > n ? html`<${Btn} kind="ghost" onClick=${() => setN(n + 40)}>Tampilkan lebih banyak</${Btn}>` : null}`
        : html`<${Empty} t=${q ? "Tidak ada yang cocok." : "Belum ada data yang diinput."} icon="clock" />`}</${Card}>
      <p class="small center">Setiap ubah & hapus tercatat di log perubahan.</p></div>
    ${sel ? html`<${KoreksiSheet} item=${sel} onClose=${() => setSel(null)} />` : null}`;
}
