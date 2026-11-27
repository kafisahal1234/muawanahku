// Rekap berbasis hari aktif (harian, pekanan, bulanan, mid, semester, tahunan) + kalender akademik
import { useState } from "preact/hooks";
import { unduhPdf, tabelKePdf } from "./pdf.js";
import { html, nav, useApp, Icon, Card, SubHeader, Row, Pill, Btn, Empty, Seg, Section, Sheet, Field, Confirm, Bar, Hint, Stat } from "./ui.js";
import { all, get, put, del, toast, uid } from "./store.js";
import { DATA } from "./data.js";
import { LIBUR_NASIONAL } from "./libur.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { logUbah } from "./s_koreksi.js";
import { unduh, docHtml, esc } from "./s_system.js";
import { KartuAI } from "./s_ai.js";
import { tanyaAI, SISTEM_DASAR } from "./ai.js";
import { ttdUntukPdf } from "./s_ttd.js";

const tone = v => (v == null ? "muted" : v >= 90 ? "green" : v >= 75 ? "blue" : v >= 60 ? "gold" : "red");
const P = v => (v == null ? "—" : v + "%");

// Pemilih periode rekap: hanya Bulanan, Tengah semester (mid), dan Semester. Satu tombol → lembar pilihan.
const BLN_P = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export function usePeriode(def = "bulanan", izin = null, fokus = null) {
  const [pil, setPil] = useState({ jenis: ["bulanan", "mid", "semester"].includes(def) ? def : "bulanan", ref: L.today() }), [buka, setBuka] = useState(false);
  const jenis = pil.jenis, rg = L.periodeRange(jenis, pil.ref), rh = L.rentangHitung(rg), sm = L.semesterKini();
  const hari = fokus ? L.hariAktifDalam(rg, fokus).length : 0, namaHari = { halaqah: "hari halaqah", kbm: "hari KBM", asrama: "hari aktif" }[fokus] || "hari";
  // bulan-bulan semester berjalan sampai bulan ini (terbaru di atas)
  const bulan = []; { const a = L.parseYmd(sm.mulai), b = L.parseYmd(L.today()); for (let d = new Date(b.getFullYear(), b.getMonth(), 1); d >= new Date(a.getFullYear(), a.getMonth(), 1); d = new Date(d.getFullYear(), d.getMonth() - 1, 1)) bulan.push(L.ymd(d)); }
  const pilih = (j, ref) => { setPil({ jenis: j, ref: ref || L.today() }); setBuka(false); };
  const aktif = (j, ref) => jenis === j && (j !== "bulanan" || (pil.ref || "").slice(0, 7) === ref.slice(0, 7));
  const opsi = (j, ref, judul, ket) => html`<button type="button" class=${"per-op" + (aktif(j, ref) ? " on" : "")} onClick=${() => pilih(j, ref)}><span><b>${judul}</b><small>${ket}</small></span>${aktif(j, ref) ? html`<${Icon} n="check" s=${20} />` : null}</button>`;
  const jenisTeks = { bulanan: "Rekap bulanan", mid: "Rekap tengah semester", semester: "Rekap semester" }[jenis];
  const bar = html`<button type="button" class="per-pick" onClick=${() => setBuka(true)}>
      <span class="per-ic"><${Icon} n="calendar" s=${20} /></span>
      <span class="per-tx"><small>${jenisTeks}</small><b>${rg.label}</b><em>${rh.kosong ? "Belum ada hari yang dihitung" : `${L.fmtShort(rh.dari)} – ${L.fmtShort(rh.sampai)}${fokus ? ` · ${hari} ${namaHari}` : ""}`}</em></span>
      <span class="per-ganti">Ganti <${Icon} n="down" s=${16} /></span></button>
    <${Sheet} open=${buka} title="Pilih periode rekap" onClose=${() => setBuka(false)}>
      <p class="per-grp">Bulanan</p>
      ${bulan.map(b => { const d = L.parseYmd(b); return opsi("bulanan", b, `${BLN_P[d.getMonth()]} ${d.getFullYear()}`, b.slice(0, 7) === L.today().slice(0, 7) ? "Bulan ini" : "Satu bulan penuh"); })}
      <p class="per-grp">Semester ${sm.nama.toLowerCase()} ${L.setelan().tp}</p>
      ${opsi("mid", L.today(), "Tengah semester (mid)", `${L.fmtShort(sm.mulai)} – ${L.fmtShort(sm.mid)}`)}
      ${opsi("semester", L.today(), "Satu semester", `${L.fmtShort(sm.mulai)} – ${L.fmtShort(sm.selesai)}`)}
    </${Sheet}>`;
  return { jenis, rg, bar };
}

// Kewenangan rekap per peran
const P2 = v => (v == null ? "—" : v + "%");
const rata = xs => { const v = xs.filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
const santriPondok = p => L.santriList().filter(s => L.pondokOfSantri(s) === p);
export function lingkup() {
  const m = me(), r = m.roles, a = L.asramaOf(m.id), hq = L.halaqahOf(m.id), mp = L.mudirPondok(m), mudir = !!mp;
  // Mudir umum: semua pondok; Mudir Pondok 21: hanya halaqah, asrama, kelas, dan santri pondok 21
  const urut = (arr, mine) => (mine ? [mine, ...arr.filter(x => x.id !== mine.id)] : arr);
  const pAsr = new Set([...(mp || []), ...(r.includes("wadir_kesantrian") ? [m.pondok] : [])]);
  const hqs = r.includes("wadir_tahfidz") ? urut(L.HALAQAH, hq) : mudir ? urut(L.HALAQAH.filter(h => mp.includes(L.pondokHalaqah(h)) || (hq && h.id === hq.id)), hq) : r.includes("guru_tahfidz") && hq ? [hq] : [];
  const asr = pAsr.size ? urut(L.ASRAMA.filter(x => pAsr.has(x.pondok) || (a && x.id === a.id)), a) : r.includes("musyrif") && a ? [a] : [];
  const semuaKls = r.includes("wadir_kurikulum") || (mudir && mp.length > 1);
  const semuaPair = [...new Map(L.jadwalAll().map(j => [`${j.mapel}|${j.kelas}`, [j.mapel, j.kelas]])).values()].sort((x, y) => (x[0] + x[1]).localeCompare(y[0] + y[1]));
  const ajar = r.includes("guru_mapel") ? (m.ajar || []).map(x => [...x]) : [];
  const pairs = semuaKls ? semuaPair : mudir ? [...new Map([...semuaPair.filter(([, k]) => mp.includes(L.pondokKelas(k))), ...ajar].map(x => [x.join("|"), x])).values()] : ajar;
  const pondok = ["29", "21"].filter(p => pAsr.has(p));
  // kelompok pelanggaran: per pondok (kesantrian/mudir) atau per asrama binaan (wali asrama)
  const kelPel = pondok.length ? pondok.map(p => ({ id: "p" + p, nama: "Pondok " + p, list: santriPondok(p), pondok: p })) : asr.map(x => ({ id: x.id, nama: "Asrama " + x.nama, list: L.santriAsrama(x.id), aid: x.id }));
  const tabs = [];
  if (hqs.length) tabs.push(["tahfidz", "Tahfidz"]);
  if (pairs.length) tabs.push(["mapel", "Mapel"]);
  if (kelPel.length) tabs.push(["pelanggaran", "Pelanggaran"]);
  if (asr.length) tabs.push(["mut", "Mutaba'ah"]);
  return { m, asr, hqs, pairs, pondok, kelPel, tabs, semuaKls };
}
const ALIAS = { halaqah: "tahfidz", hafalan: "tahfidz", kbm: "mapel", motd: "pelanggaran", kes: "pelanggaran" };
const pengampu = (mp, k) => (L.jadwalAll().find(j => j.mapel === mp && j.kelas === k) || {}).guru || ((L.pengampu(mp, k) || {}).id);
const totalSemua = list => list.reduce((n, s) => n + L.barisTotal(L.hafalan(s)), 0);

// Tabel rekap (untuk unduhan): ringkasan per kelompok + rincian per santri
function tabel(tab, lk, rg) {
  if (tab === "tahfidz") return { judul: "Rekap Tahfidz", ringkas: { kol: ["Halaqah", "Guru", "Santri", "Absen terisi (guru)", "Kehadiran santri", "Hafalan baru periode ini", "Rata total hafalan"], rows: lk.hqs.map(h => { const k = L.kinerjaHalaqah(h.id, rg), l = L.santriHalaqah(h.id), baru = l.reduce((n, s) => n + L.hafalanDalam(s.id, rg).baris, 0);
      return [h.nama, (L.staffById(h.guru) || {}).nama || "—", l.length, `${k.isi}/${k.sesi} (${P2(k.pct)})`, P2(rata(l.map(s => L.kehadiranHalaqah(s.id, rg).pct))), L.fmtBaris(baru), L.fmtBaris(l.length ? Math.round(totalSemua(l) / l.length) : 0)]; }) },
    rinci: { kol: ["Santri", "Halaqah", "H", "S", "I", "A", "Belum diabsen", "Kehadiran", "Hafalan baru", "Hari setor", "Tasmi' lulus", "Total hafalan"], rows: lk.hqs.flatMap(h => L.santriHalaqah(h.id).map(s => { const k = L.kehadiranHalaqah(s.id, rg), x = L.hafalanDalam(s.id, rg);
      return [s.nama, h.nama, k.H, k.S, k.I, k.A, k.kosong, P2(k.pct), L.fmtBaris(x.baris), x.hari, x.tasmi.length ? "Juz " + x.tasmi.join(", ") : "—", L.fmtJumlah(L.hafalan(s))]; })) } };
  if (tab === "mapel") return { judul: "Rekap Mapel", ringkas: { kol: ["Mapel", "Kelas", "Guru", "Pertemuan terlaksana", "Kehadiran santri", "Projek periode ini"], rows: lk.pairs.map(([mp, k]) => { const g = pengampu(mp, k), kj = L.kinerjaMapel(g, rg, k), pj = L.projekDalam(mp, k, rg);
      return [L.mapelById(mp).nama, k, (L.staffById(g) || {}).nama || "—", `${kj.absen}/${kj.sesi} (${P2(kj.pct)})`, P2(rata(L.santriKelas(k).map(s => L.kehadiranKelas(s.id, mp, rg).pct))), pj.length ? pj.map(p => `${p.nama} (${L.fmtShort(p.tgl)}, rata ${p.rata ?? "—"})`).join("; ") : "—"]; }) },
    rinci: { kol: ["Santri", "Mapel", "Kelas", "Hadir", "Pertemuan", "Kehadiran", "Nilai projek periode ini"], rows: lk.pairs.flatMap(([mp, k]) => { const pj = L.projekDalam(mp, k, rg); return L.santriKelas(k).map(s => { const kh = L.kehadiranKelas(s.id, mp, rg);
      return [s.nama, L.mapelById(mp).nama, k, kh.H || 0, kh.sesi || 0, P2(kh.pct), pj.length ? pj.map(p => `${p.nama}: ${p.nilai[s.id] ?? "—"}`).join("; ") : "—"]; }); }) } };
  if (tab === "pelanggaran") return { judul: "Rekap Pelanggaran", ringkas: { kol: ["Kelompok", "Santri", "Ringan (MOTD)", "Poin ringan", "Sedang", "Berat", "Poin sedang–berat"], rows: lk.kelPel.map(g => { const xs = g.list.map(s => L.pelanggaranDalam(s.id, rg)), sum = f => xs.reduce((n, x) => n + x[f], 0);
      return [g.nama, g.list.length, sum("ringan"), sum("poinRingan"), sum("sedang"), sum("berat"), sum("poinSB")]; }) },
    rinci: { kol: ["Santri", "Kelompok", "Alpa", "Masbuq", "Ringan", "Sedang", "Berat", "Poin total", "Pelanggaran BAP"], rows: lk.kelPel.flatMap(g => g.list.map(s => { const x = L.pelanggaranDalam(s.id, rg);
      return [s.nama, g.nama, x.alpa, x.masbuq, x.ringan, x.sedang, x.berat, x.poinRingan + x.poinSB, x.bap.map(b => b.pelanggaranNama).join("; ") || "—"]; }).filter(r => r[4] || r[5] || r[6])) } };
  return { judul: "Rekap Mutaba'ah", ringkas: { kol: ["Asrama", "Wali asrama", "Input terisi", "Diisi menyusul", "Hari tidak dinilai", "Ibadah", "Adab"], rows: lk.asr.map(a => { const k = L.kinerjaMut(a.id, rg), ps = L.santriAsrama(a.id).map(s => L.mutPersen(s.id, rg)); return [a.nama, (L.staffById(a.musyrif) || {}).nama, `${k.isi}/${k.target} (${P2(k.pct)})`, k.menyusul, k.hariLibur, P2(rata(ps.map(x => x.ibadah))), P2(rata(ps.map(x => x.adab)))]; }) },
    rinci: { kol: ["Santri", "Asrama", "Hari dinilai", "Hari diinput", "Menyusul", "Tidak dinilai", "Ibadah", "Adab"], rows: lk.asr.flatMap(a => L.santriAsrama(a.id).map(s => { const k = L.mutPersen(s.id, rg); return [s.nama, a.nama, k.hari, k.isi, k.menyusul, k.dikecualikan, P2(k.ibadah), P2(k.adab)]; })) } };
}

function unduhRekap(tab, lk, rg, fmt) {
  const t = tabel(tab, lk, rg), nama = `${t.judul} - ${rg.label}`.replace(/[\/:]/g, "-");
  if (fmt === "csv") {
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`, sec = (j, x) => [q(j), x.kol.map(q).join(";"), ...x.rows.map(r => r.map(q).join(";"))].join("\r\n");
    return unduh(nama + ".csv", "﻿" + [q(`${t.judul} · ${rg.label}`), "", sec("Ringkasan", t.ringkas), "", sec("Rincian per santri", t.rinci)].join("\r\n"));
  }
  const rh = L.rentangHitung(rg);
  if (fmt === "pdf") return unduhPdf(nama, () => tabelKePdf({ judul: t.judul, sub: `${rg.label}${rh.kosong ? "" : ` · dihitung ${L.fmtTgl(rh.dari, false)} – ${L.fmtTgl(rh.sampai, false)}`}`,
    catatan: "Persentase = yang tercatat dibagi hari/sesi aktif. Hari tanpa input dihitung 0. Hafalan: 15 baris = 1 halaman, 20 halaman = 1 juz.",
    oleh: `Dicetak oleh ${me().nama}, ${L.fmtTgl(L.today())} · MuawanahQu`, bagian: [{ judul: "Ringkasan", ...t.ringkas }, { judul: "Rincian per santri", ...t.rinci }],
    ttd: ttdUntukPdf({ tahfidz: "tahfidz", halaqah: "tahfidz", mapel: "mapel", kbm: "mapel", pelanggaran: "kesantrian", mut: "asrama", motd: "asrama" }[tab] || "") }));
  const tb = x => `<table><tr>${x.kol.map(k => `<th>${esc(k)}</th>`).join("")}</tr>${x.rows.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</table>`;
  const body = `<h1>${esc(t.judul.toUpperCase())}<br><span class="small">${esc(rg.label)}${rh.kosong ? "" : ` · dihitung ${L.fmtTgl(rh.dari, false)} – ${L.fmtTgl(rh.sampai, false)}`}</span></h1>
    <p class="small">Persentase = yang tercatat dibagi hari/sesi aktif. Hari tanpa input dihitung 0. Hafalan: 15 baris = 1 halaman, 20 halaman = 1 juz. Dicetak oleh ${esc(me().nama)}, ${L.fmtTgl(L.today())}.</p>
    <h2>Ringkasan</h2>${tb(t.ringkas)}<h2>Rincian per santri</h2>${t.rinci.rows.length ? tb(t.rinci) : "<p>Tidak ada data.</p>"}`;
  return unduh(nama + ".html", docHtml(t.judul, body));
}

const HINT = { tahfidz: "Hafalan baru = ziyadah lulus dalam periode: 15 baris = 1 halaman, 20 halaman = 1 juz. Kehadiran = sesi tercatat hadir dibagi sesi aktif; sesi yang tidak diabsen dihitung 0.",
  mapel: "Kehadiran dibagi pertemuan terjadwal pada hari KBM aktif. Projek dihitung dari tanggal projek di menu Input Nilai.",
  pelanggaran: "Ringan = dari MOTD (alpa/masbuq): sifatnya teguran dan hukuman ringan. Sedang dan berat = dari BAP Kesantrian.",
  mut: "Persentase = yang tercatat dibagi hari aktif asrama. Hari yang tidak diinput dihitung 0." };
// Rekap dibuka dari menu masing-masing modul; tab dikunci sesuai modul (Tahfidz, Kurikulum/Mapel, Kesantrian, Asrama)
const MODUL_TAB = { tahfidz: ["tahfidz"], mapel: ["mapel"], kurikulum: ["mapel"], kesantrian: ["pelanggaran", "mut"], asrama: ["pelanggaran", "mut"] };
const MODUL_JUDUL = { tahfidz: "Rekap Tahfidz", mapel: "Rekap Kelas", kurikulum: "Rekap Kurikulum", kesantrian: "Rekap Kesantrian", asrama: "Rekap Asrama" };
export function RekapHub({ tab: t0, modul }) {
  useApp();
  const lk0 = lingkup(), lk = modul && MODUL_TAB[modul] ? { ...lk0, tabs: lk0.tabs.filter(([k]) => MODUL_TAB[modul].includes(k)) } : lk0, t1 = ALIAS[t0] || t0; const [tab, setTab] = useState(lk.tabs.find(x => x[0] === t1) ? t1 : (lk.tabs[0] || [""])[0]); const [dl, setDl] = useState(false);
  const p = usePeriode("bulanan");
  const judul = MODUL_JUDUL[modul] || "Rekap";
  if (!lk.tabs.length) return html`<${SubHeader} title=${judul} /><div class="wrap"><${Card}><${Empty} t="Tidak ada data rekap untuk peran ini." icon="chart" /></${Card}></div>`;
  return html`<${SubHeader} title=${judul} sub="Sesuai kewenangan · berdasarkan hari aktif">${lk.tabs.length > 1 ? html`<div class="seg rk-tabs">${lk.tabs.map(([k, t]) => html`<button type="button" class=${k === tab ? "on" : ""} onClick=${() => setTab(k)}>${t}</button>`)}</div>` : null}</${SubHeader}>
    <div class="wrap">${p.bar}
      ${tab === "tahfidz" ? html`<${RekapTahfidzP} hqs=${lk.hqs} rg=${p.rg} />` : tab === "mapel" ? html`<${RekapMapelP} lk=${lk} rg=${p.rg} />` : tab === "pelanggaran" ? html`<${RekapPelP} lk=${lk} rg=${p.rg} />` : html`<${RekapMutP} asr=${lk.asr} rg=${p.rg} />`}
      <${Hint}>${HINT[tab]}</${Hint}>
      <${Btn} kind="ghost" icon="download" onClick=${() => setDl(true)}>Unduh rekap ini</${Btn}></div>
    <${Sheet} open=${dl} title="Unduh rekap" onClose=${() => setDl(false)}>
      <p class="small" style="margin-top:0">${(lk.tabs.find(x => x[0] === tab) || [])[1]} · ${p.rg.label}. Berisi ringkasan dan rincian per santri.</p>
      <button class="menu-row" onClick=${() => { setDl(false); unduhRekap(tab, lk, p.rg, "pdf"); }}><${Icon} n="file" s=${22} c="#0B6B43" /><span>Dokumen PDF<br /><small class="small">Siap dicetak atau dikirim, dengan kop pondok</small></span><${Icon} n="right" s=${18} /></button>
      <button class="menu-row" onClick=${() => { setDl(false); unduhRekap(tab, lk, p.rg, "csv"); }}><${Icon} n="grid" s=${22} c="#1F56B5" /><span>Tabel Excel (CSV)<br /><small class="small">Bisa dibuka di Excel / Google Sheets</small></span><${Icon} n="right" s=${18} /></button></${Sheet}>`;
}

function Kartu({ title, sub, onClick, stats, children }) {
  return html`<button class="card rk" onClick=${onClick}><div class="card-h"><h3>${title}</h3><${Icon} n="right" s=${18} c="#9AB0A5" /></div>${sub ? html`<div class="small mb8">${sub}</div>` : null}
    <div class="rk-g">${stats.map(([lab, v, s, teks, cls]) => html`<div><span>${lab}</span>${teks != null ? html`<b class=${cls || "t-green"} style="font-size:17px">${teks}</b>` : html`<b class=${"t-" + tone(v)}>${P(v)}</b><${Bar} v=${v || 0} tone=${tone(v) === "muted" ? "green" : tone(v)} />`}${s ? html`<small>${s}</small>` : null}</div>`)}</div>${children || null}</button>`;
}

function RekapTahfidzP({ hqs, rg }) {
  return html`${hqs.map(h => { const k = L.kinerjaHalaqah(h.id, rg), list = L.santriHalaqah(h.id), xs = list.map(s => L.hafalanDalam(s.id, rg)), baru = xs.reduce((n, x) => n + x.baris, 0);
    const kh = rata(list.map(s => L.kehadiranHalaqah(s.id, rg).pct)), tot = list.length ? Math.round(totalSemua(list) / list.length) : 0;
    return html`<${Kartu} title=${h.nama} sub=${`${list.length} santri · absen guru ${k.isi}/${k.sesi} sesi · ${xs.filter(x => x.setor).length} santri setor`} onClick=${() => nav.go("rekapDetail", { jenis: "tahfidz", hid: h.id, pj: rg })}
      stats=${[["Absensi santri", kh], ["Hafalan baru periode ini", null, list.length ? `rata ${L.fmtBaris(Math.round(baru / list.length))}/santri` : null, L.fmtBaris(baru)], ["Total hafalan", null, "rata per santri", L.fmtBaris(tot)]]} />`; })}`;
}
function RekapMapelP({ lk, rg }) {
  const mps = [...new Set(lk.pairs.map(([mp]) => mp))], milik = (lk.m.ajar || []).map(([mp]) => mp).find(x => mps.includes(x));
  const [f, setF] = useState(milik || mps[0]);
  const pairs = mps.length > 1 ? lk.pairs.filter(([mp]) => mp === f) : lk.pairs;
  return html`${mps.length > 1 ? html`<div class="seg small mb8">${mps.map(mp => html`<button type="button" class=${mp === f ? "on" : ""} onClick=${() => setF(mp)}>${L.mapelById(mp).nama.replace("Pendidikan ", "").replace("Bahasa ", "B. ")}</button>`)}</div>` : null}
  ${pairs.map(([mp, k]) => { const g = pengampu(mp, k), kj = L.kinerjaMapel(g, rg, k), pj = L.projekDalam(mp, k, rg), n = L.santriKelas(k).length;
    const kh = rata(L.santriKelas(k).map(s => L.kehadiranKelas(s.id, mp, rg).pct));
    return html`<${Kartu} title=${`${L.mapelById(mp).nama} · Kelas ${k}`} sub=${`${(L.staffById(g) || {}).pendek || "—"} · ${n} santri`} onClick=${() => nav.go("rekapDetail", { jenis: "mapel", mapel: mp, kelas: k, pj: rg })}
      stats=${[["Absensi santri", kh], ["Pertemuan terlaksana", kj.pct, `${kj.absen}/${kj.sesi}`], ["Projek", null, "periode ini", String(pj.length)]]}>
      ${pj.length ? html`<div class="rk-pj">${pj.map(p => html`<div><span><b>${p.nama}</b><small>${L.fmtTgl(p.tgl)} · ${p.dinilai}/${n} dinilai</small></span><em class=${p.rata == null ? "" : p.rata < 70 ? "t-red" : "t-green"}>${p.rata ?? "—"}</em></div>`)}</div>` : html`<p class="rk-kosong">Belum ada projek pada periode ini.</p>`}</${Kartu}>`; })}`;
}
function RekapPelP({ lk, rg }) {
  return html`${lk.kelPel.map(g => { const xs = g.list.map(s => ({ s, x: L.pelanggaranDalam(s.id, rg) })), sum = f => xs.reduce((n, o) => n + o.x[f], 0);
    const top = xs.filter(o => o.x.poinRingan + o.x.poinSB).sort((a, b) => b.x.poinRingan + b.x.poinSB - (a.x.poinRingan + a.x.poinSB)).slice(0, 3);
    return html`<${Kartu} title=${g.nama} sub=${`${g.list.length} santri`} onClick=${() => nav.go("rekapDetail", { jenis: "pelanggaran", aid: g.aid, pondok: g.pondok, pj: rg })}
      stats=${[["Ringan (MOTD)", null, `poin ${sum("poinRingan")} · teguran`, String(sum("ringan")), "t-gold"], ["Sedang", null, "dari BAP", String(sum("sedang")), "t-orange"], ["Berat", null, `poin S–B ${sum("poinSB")}`, String(sum("berat")), "t-red"]]}>
      ${top.length ? html`<div class="rk-pj">${top.map(({ s, x }) => html`<div><span><b>${s.nama}</b><small>Ringan ${x.ringan} · sedang ${x.sedang} · berat ${x.berat}</small></span><em class="t-red">${x.poinRingan + x.poinSB} poin</em></div>`)}</div>` : html`<p class="rk-kosong">Tidak ada pelanggaran pada periode ini.</p>`}</${Kartu}>`; })}`;
}
function RekapMutP({ asr, rg }) {
  return html`${asr.map(a => { const k = L.kinerjaMut(a.id, rg), ps = L.santriAsrama(a.id).map(s => L.mutPersen(s.id, rg)).filter(x => x.ibadah != null);
    const av = f => (ps.length ? Math.round(ps.reduce((x, y) => x + y[f], 0) / ps.length) : null);
    return html`<${Kartu} title=${a.nama} sub=${`${(L.staffById(a.musyrif) || {}).pendek} · input ${k.isi}/${k.target}${k.menyusul ? ` · ${k.menyusul} menyusul` : ""}${k.hariLibur ? ` · ${k.hariLibur} hari tidak dinilai` : ""}`} onClick=${() => nav.go("rekapDetail", { jenis: "mut", aid: a.id, pj: rg })}
      stats=${[["Ibadah", av("ibadah")], ["Adab", av("adab")], ["Input terisi", k.pct]]} />`; })}`;
}

export function RekapDetail({ jenis: j0, aid, hid, kelas, mapel, pondok, pj }) {
  useApp();
  const jenis = ALIAS[j0] || j0, rg = pj || L.periodeRange("pekanan");
  const list = hid ? L.santriHalaqah(hid) : pondok ? santriPondok(pondok) : aid ? L.santriAsrama(aid) : L.santriKelas(kelas);
  const judul = { tahfidz: "Rekap Tahfidz", mapel: "Rekap Mapel", pelanggaran: "Rekap Pelanggaran", mut: "Rekap Mutaba'ah" }[jenis];
  const nm = hid ? L.halaqahById(hid).nama : pondok ? "Pondok " + pondok : aid ? L.asramaAman(aid).nama : `${L.mapelById(mapel).nama} · Kelas ${kelas}`;
  const pjk = jenis === "mapel" ? L.projekDalam(mapel, kelas, rg) : [];
  const rows = list.map(s => {
    if (jenis === "tahfidz") { const k = L.kehadiranHalaqah(s.id, rg), x = L.hafalanDalam(s.id, rg);
      return [s, k.pct, `Hadir ${P(k.pct)} (H ${k.H} · S ${k.S} · I ${k.I} · A ${k.A}${k.kosong ? ` · ${k.kosong} belum diabsen` : ""}) · total hafalan ${L.fmtJumlah(L.hafalan(s))}${x.tasmi.length ? " · tasmi' Juz " + x.tasmi.join(", ") : ""}`, L.fmtBaris(x.baris), x.baris]; }
    if (jenis === "mapel") { const k = L.kehadiranKelas(s.id, mapel, rg), nil = pjk.map(p => p.nilai[s.id]).filter(v => v !== "" && v != null).map(Number);
      return [s, k.pct, `Hadir ${P(k.pct)} (${k.H || 0}/${k.sesi || 0} pertemuan)${pjk.length ? " · " + pjk.map(p => `${p.nama}: ${p.nilai[s.id] ?? "—"}`).join(" · ") : ""}`, nil.length ? "Projek " + Math.round(nil.reduce((a, b) => a + b, 0) / nil.length) : P(k.pct), k.pct ?? -1]; }
    if (jenis === "pelanggaran") { const x = L.pelanggaranDalam(s.id, rg), po = x.poinRingan + x.poinSB;
      return [s, null, `Ringan ${x.ringan} (alpa ${x.alpa} · masbuq ${x.masbuq}) · sedang ${x.sedang} · berat ${x.berat}${x.bap.length ? " · " + x.bap.map(b => b.pelanggaranNama).join(", ") : ""}`, `${po} poin`, -po]; }
    const k = L.mutPersen(s.id, rg); return [s, k.ibadah == null ? null : Math.round((k.ibadah + k.adab) / 2), `Ibadah ${P(k.ibadah)} · Adab ${P(k.adab)} · diinput ${k.isi}/${k.hari} hari${k.menyusul ? ` (${k.menyusul} menyusul)` : ""}${k.dikecualikan ? ` · ${k.dikecualikan} hari tidak dinilai` : ""}`];
  }).filter(r => jenis !== "pelanggaran" || r[4] < 0).sort((a, b) => (a[4] != null ? a[4] - b[4] : (a[1] ?? -1) - (b[1] ?? -1)));
  const nada = (jenis, v, teks) => (jenis === "pelanggaran" ? "red" : jenis === "tahfidz" ? "green" : teks && teks.startsWith("Projek") ? "blue" : tone(v));
  return html`<${SubHeader} title=${judul} sub=${`${nm} · ${rg.label}`} />
    <div class="wrap">${pjk.length ? html`<${Card} title="Projek periode ini"><div class="rk-pj">${pjk.map(p => html`<div><span><b>${p.nama}</b><small>${L.fmtTgl(p.tgl)} · ${p.dinilai}/${list.length} dinilai</small></span><em class=${p.rata == null ? "" : p.rata < 70 ? "t-red" : "t-green"}>${p.rata ?? "—"}</em></div>`)}</div></${Card}>` : null}
    <${KartuAI} judul="Analisis AI" tombol="Analisis rekap ini" ket="AI merangkum temuan penting dan saran tindak lanjut dari data di bawah."
      buat=${() => tanyaAI({ sistem: SISTEM_DASAR, teks: `Analisis rekap pondok berikut untuk pimpinan.\nJenis: ${judul}\nKelompok: ${nm}\nPeriode: ${rg.label}\nCatatan: hari/sesi tanpa input dihitung tidak terlaksana; 15 baris = 1 halaman, 20 halaman = 1 juz; pelanggaran ringan dari MOTD (teguran), sedang-berat dari BAP.\nData per santri (nama: nilai · rincian):\n${rows.map(([s, v, sub, teks]) => `${s.nama}: ${teks != null ? teks : v == null ? "belum ada data" : v + "%"} · ${sub}`).join("\n")}\n\nFormat jawaban: 1 kalimat kesimpulan umum, lalu butir "- " berisi: santri yang perlu perhatian (maks. 5 nama), pola yang terlihat, dan 2–3 saran tindak lanjut yang konkret. Maksimal 150 kata.` })} />
    <${Card}>${rows.length ? html`<div class="list">${rows.map(([s, v, sub, teks]) => html`<${Row} name=${s.nama} sub=${sub} right=${html`<${Pill} t=${teks != null ? teks : P(v)} tone=${nada(jenis, v, teks)} />`} onClick=${() => nav.go("santri", { sid: s.id })} />`)}</div>`
      : html`<${Empty} t=${jenis === "pelanggaran" ? "Tidak ada pelanggaran pada periode ini." : "Belum ada data."} icon="check" />`}</${Card}>
    <${Hint}>${HINT[jenis]}</${Hint}></div>`;
}

// ---------------- Kalender akademik (admin) ----------------
export function Kalender() {
  useApp();
  const st = L.setelan(), lp = L.liburPondok(); const [ed, setEd] = useState(null); const [f, setF] = useState(null); const [th, setTh] = useState(L.today().slice(0, 4));
  const bisa = me().roles.some(r => ["admin", "mudir", "wadir_kurikulum"].includes(r));
  const simpanSet = async () => { if (await put("kalender", "setelan", { ...st, ...f })) { logUbah("ubah", "kalender", "setelan", "Ubah tanggal semester"); toast("Kalender akademik disimpan"); setF(null); } };
  const togAbaikan = async tgl => { const ab = new Set(st.abaikan || []); ab.has(tgl) ? ab.delete(tgl) : ab.add(tgl); await put("kalender", "setelan", { ...st, abaikan: [...ab] }); };
  const fld = (k, lab) => html`<${Field} label=${lab}><input class="in" type="date" value=${(f || st)[k]} onInput=${e => setF({ ...(f || st), [k]: e.target.value })} /></${Field}>`;
  const nas = LIBUR_NASIONAL.filter(l => l.tgl.startsWith(th));
  return html`<${SubHeader} title="Kalender Akademik" sub=${`Tahun pelajaran ${st.tp}`} />
    <div class="wrap">
    <${Card} title="Hari aktif">
      <div class="kv"><span>KBM mapel</span><b>Senin – Jumat</b></div><div class="kv"><span>Halaqah</span><b>Senin – Sabtu (Sabtu Shubuh, khusus manzil)</b></div>
      <div class="kv"><span>Mutaba'ah</span><b>Senin – Jumat</b></div><div class="kv"><span>Tidak dihitung</span><b>Ahad, libur nasional, libur pondok</b></div></${Card}>
    <${Card} title="Semester & mulai pakai" right=${bisa && !f ? html`<button class="link" onClick=${() => setF({ ...st })}>Ubah</button>` : null}>
      ${f ? html`<div class="btn-row">${fld("ganjilMulai", "Ganjil mulai")}${fld("ganjilMid", "Akhir mid ganjil")}</div><div class="btn-row">${fld("ganjilSelesai", "Ganjil selesai")}${fld("genapMulai", "Genap mulai")}</div>
          <div class="btn-row">${fld("genapMid", "Akhir mid genap")}${fld("genapSelesai", "Genap selesai")}</div>${fld("mulaiPakai", "Mulai pakai aplikasi")}
          <p class="small">Rekap hanya menghitung hari sejak aplikasi mulai dipakai, supaya hari sebelum ada aplikasi tidak dihitung 0.</p>
          <div class="btn-row"><${Btn} kind="ghost" onClick=${() => setF(null)}>Batal</${Btn}><${Btn} onClick=${simpanSet}>Simpan</${Btn}></div>`
        : html`<div class="kv"><span>Semester ganjil</span><b>${L.fmtTgl(st.ganjilMulai, false)} – ${L.fmtTgl(st.ganjilSelesai, false)}</b></div><div class="kv"><span>Mid ganjil sampai</span><b>${L.fmtTgl(st.ganjilMid, false)}</b></div>
          <div class="kv"><span>Semester genap</span><b>${L.fmtTgl(st.genapMulai, false)} – ${L.fmtTgl(st.genapSelesai, false)}</b></div><div class="kv"><span>Mid genap sampai</span><b>${L.fmtTgl(st.genapMid, false)}</b></div>
          <div class="kv"><span>Mulai pakai aplikasi</span><b>${L.fmtTgl(st.mulaiPakai, false)}</b></div>`}</${Card}>
    <${Card} title="Libur pondok" right=${bisa ? html`<button class="link" onClick=${() => setEd({ baru: true, nama: "", mulai: L.today(), selesai: L.today(), jenis: "pondok" })}>+ Tambah</button>` : null}>
      ${lp.length ? html`<div class="list">${lp.map(l => html`<${Row} name=${l.nama} sub=${`${L.fmtTgl(l.mulai, false)} – ${L.fmtTgl(l.selesai, false)} · ${L.hariRentang(l.mulai, l.selesai).length} hari · ${l.jenis === "kbm" ? "libur KBM saja" : "semua kegiatan libur"}`}
          icon=${html`<${Icon} n="calendar" s=${18} />`} onClick=${bisa ? () => setEd({ ...l }) : null} />`)}</div>` : html`<${Empty} t="Belum ada libur pondok. Tambahkan libur panjang (misal libur semester) agar tidak masuk rekap." icon="calendar" />`}</${Card}>
    <${Card} title="Libur nasional & cuti bersama" right=${html`<div class="seg small" style="width:120px">${["2026", "2027"].map(y => html`<button class=${y === th ? "on" : ""} onClick=${() => setTh(y)}>${y}</button>`)}</div>`}>
      <p class="small" style="margin-top:0">Sesuai SKB 3 Menteri. Pada tanggal ini KBM dan halaqah tidak dihitung. Jika pondok tetap berkegiatan, ketuk untuk menandai "tetap masuk".</p>
      <div class="list">${nas.map(l => { const ab = (st.abaikan || []).includes(l.tgl); return html`<${Row} name=${l.nama} sub=${`${L.fmtTgl(l.tgl)}${l.jenis === "cuti" ? " · cuti bersama" : ""}`}
        icon=${html`<${Icon} n="calendar" s=${18} />`} right=${html`<${Pill} t=${ab ? "Tetap masuk" : "Libur"} tone=${ab ? "green" : "red"} />`} onClick=${bisa ? () => togAbaikan(l.tgl) : null} />`; })}</div></${Card}></div>
    ${ed ? html`<${EditLibur} e=${ed} onClose=${() => setEd(null)} />` : null}`;
}
function EditLibur({ e, onClose }) {
  const [f, setF] = useState(e); const [ask, setAsk] = useState(false);
  const ok = f.nama.trim() && f.mulai && f.selesai && f.selesai >= f.mulai;
  const save = async () => { const id = e.baru ? uid("lb") : e.id; const d = { nama: f.nama.trim(), mulai: f.mulai, selesai: f.selesai, jenis: f.jenis, oleh: me().id, ts: Date.now() };
    if (await put("kalender", id, d)) { logUbah(e.baru ? "tambah" : "ubah", "kalender", id, `Libur pondok: ${d.nama}`); toast("Libur pondok disimpan. Rekap otomatis menyesuaikan."); onClose(); } };
  const hapus = async () => { setAsk(false); await logUbah("hapus", "kalender", e.id, `Libur pondok: ${e.nama}`, e); await del("kalender", e.id); toast("Libur dihapus"); onClose(); };
  return html`<${Sheet} open=${true} title=${e.baru ? "Tambah libur pondok" : "Ubah libur pondok"} onClose=${onClose}>
    <${Field} label="Nama libur"><input class="in" value=${f.nama} placeholder="Misal: Libur akhir semester ganjil" onInput=${x => setF({ ...f, nama: x.target.value })} /></${Field}>
    <div class="btn-row"><${Field} label="Mulai"><input class="in" type="date" value=${f.mulai} onInput=${x => setF({ ...f, mulai: x.target.value })} /></${Field}>
      <${Field} label="Selesai"><input class="in" type="date" value=${f.selesai} onInput=${x => setF({ ...f, selesai: x.target.value })} /></${Field}></div>
    <${Field} label="Jenis"><${Seg} small items=${[["pondok", "Semua libur (santri pulang)"], ["kbm", "Libur KBM saja"]]} value=${f.jenis} onChange=${v => setF({ ...f, jenis: v })} /></${Field}>
    <p class="small">${f.mulai && f.selesai >= f.mulai ? `${L.hariRentang(f.mulai, f.selesai).length} hari tidak dihitung di rekap ${f.jenis === "kbm" ? "KBM" : "halaqah, MOTD, mutaba'ah, dan KBM"}.` : "Tanggal selesai harus sama atau setelah tanggal mulai."}</p>
    <div class="btn-row mt8">${!e.baru ? html`<${Btn} kind="outline" icon="trash" onClick=${() => setAsk(true)}>Hapus</${Btn}>` : null}<${Btn} disabled=${!ok} onClick=${save}>Simpan</${Btn}></div>
    <${Confirm} open=${ask} danger title="Hapus libur ini?" text="Hari-hari ini akan kembali dihitung sebagai hari aktif di rekap." yes="Hapus" onYes=${hapus} onNo=${() => setAsk(false)} /></${Sheet}>`;
}

// ---------------- Rekap untuk wali santri (hanya data ananda sendiri) ----------------
export function WaliRekap() {
  useApp();
  const s = L.santriById(nav.user.id), p = usePeriode("bulanan"), rg = p.rg;
  const kh = L.kehadiranHalaqah(s.id, rg), hf = L.hafalanDalam(s.id, rg), h = L.hafalan(s), c = L.capaianJuz(s), mp = L.mutPersen(s.id, rg), pl = L.pelanggaranDalam(s.id, rg);
  const kk = rata(DATA.mapel.map(m => L.kehadiranKelas(s.id, m.id, rg).pct)), r = L.rentangHitung(rg);
  const iz = r.kosong ? [] : all("izin").filter(i => i.santri === s.id && i.keluar && i.keluar.slice(0, 10) >= r.dari && i.keluar.slice(0, 10) <= r.sampai).sort((a, b) => b.ts - a.ts);
  const motd = r.kosong ? [] : L.motdCatatan(s.id).filter(x => x.tanggal >= r.dari && x.tanggal <= r.sampai);
  return html`<${SubHeader} title="Rekap Ananda" sub=${s.nama} />
    <div class="wrap">${p.bar}
      <${Card} title="Tahfidz"><div class="rk-g">
        <div><span>Kehadiran halaqah</span><b class=${"t-" + tone(kh.pct)}>${P(kh.pct)}</b><${Bar} v=${kh.pct || 0} tone=${tone(kh.pct) === "muted" ? "green" : tone(kh.pct)} /><small>H ${kh.H} · S ${kh.S} · I ${kh.I} · A ${kh.A}</small></div>
        <div><span>Hafalan baru</span><b class="t-green" style="font-size:17px">${L.fmtBaris(hf.baris)}</b><small>${hf.hari} hari setor${hf.tasmi.length ? " · tasmi' Juz " + hf.tasmi.join(", ") : ""}</small></div>
        <div><span>Total hafalan</span><b class="t-green" style="font-size:17px">${L.fmtJumlah(h)}</b><small>semester ${c.juz.toLocaleString("id-ID")}/${c.target} juz</small></div></div></${Card}>
      <${Card} title="Kehadiran kelas & mutaba'ah"><div class="rk-g">
        <div><span>Kehadiran kelas</span><b class=${"t-" + tone(kk)}>${P(kk)}</b><${Bar} v=${kk || 0} tone=${tone(kk) === "muted" ? "green" : tone(kk)} /></div>
        <div><span>Ibadah</span><b class=${"t-" + tone(mp.ibadah)}>${P(mp.ibadah)}</b><${Bar} v=${mp.ibadah || 0} tone=${tone(mp.ibadah) === "muted" ? "green" : tone(mp.ibadah)} /></div>
        <div><span>Adab</span><b class=${"t-" + tone(mp.adab)}>${P(mp.adab)}</b><${Bar} v=${mp.adab || 0} tone=${tone(mp.adab) === "muted" ? "green" : tone(mp.adab)} /></div></div></${Card}>
      <${Card} title="Izin" right=${html`<small>${iz.length} kali</small>`}>${iz.length ? html`<div class="list">${iz.map(i => html`<${Row} name=${i.jenis === "Skorsing" ? "Skorsing" : `Izin ${i.jenis}`} sub=${`${L.fmtDT(i.keluar)} → ${L.fmtDT(i.kembali)} · ${i.alasan}`} icon=${html`<${Icon} n="door" s=${18} />`} right=${html`<${Pill} t=${i.status === "aktif" ? "Aktif" : i.telat ? "Terlambat" : "Kembali"} tone=${i.status === "aktif" || i.telat ? "gold" : "green"} />`} onClick=${() => nav.go("izinView", { id: i.id })} />`)}</div>` : html`<${Empty} t="Tidak ada izin pada periode ini." icon="door" />`}</${Card}>
      <${Card} title="Pelanggaran" right=${html`<${Pill} t=${pl.poinRingan + pl.poinSB + " poin"} tone=${pl.poinRingan + pl.poinSB ? "red" : "green"} />`}>
        <div class="rk-g mb8"><div><span>Ringan (teguran)</span><b class="t-gold">${pl.ringan}</b></div><div><span>Sedang</span><b class="t-orange">${pl.sedang}</b></div><div><span>Berat</span><b class="t-red">${pl.berat}</b></div></div>
        ${pl.bap.length || motd.length ? html`<div class="list">${pl.bap.map(b => html`<${Row} name=${b.pelanggaranNama} sub=${`${L.fmtTgl(b.tanggal)} · ${b.tingkat} · ketuk untuk kronologi & bukti`} icon=${html`<${Icon} n="clipboard" s=${18} />`} right=${html`<${Pill} t=${b.poin + " poin"} tone="red" />`} onClick=${() => nav.go("bapView", { id: b.id })} />`)}
          ${motd.map(x => html`<${Row} name=${`${x.st === "A" ? "Alpa" : "Masbuq"} sholat ${(L.WAKTU.find(w => w[0] === x.waktu) || [, x.waktu])[1]}`} sub=${L.fmtTgl(x.tanggal) + " · ringan, teguran dari wali asrama"} icon=${html`<${Icon} n="moon" s=${18} />`} right=${html`<${Pill} t=${x.poin + " poin"} tone="gold" />`} />`)}</div>` : html`<${Empty} t="Alhamdulillah, tidak ada pelanggaran pada periode ini." icon="check" />`}</${Card}>
      <p class="fab-note">Rekap hanya berisi data ananda. Nilai PTS, PAS, dan rapor dibagikan saat pembagian rapor.</p></div>`;
}
