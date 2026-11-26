// Rapor persis mengikuti Format_Rapor_MuawanahQu (4 halaman A4: kop, A Tahfidz, B Mapel, C Mutaba'ah, D–E catatan, tanda tangan)
import { useState, useEffect, useRef } from "preact/hooks";
import { unduhPdf, htmlKePdf } from "./pdf.js";
import { html, nav, useApp, Icon, Card, SubHeader, Btn, Field, Seg, Hint } from "./ui.js";
import { get, put, toast } from "./store.js";
import { DATA } from "./data.js";
import { RP_HEAD, RP_FOOT } from "./rapor_assets.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { useDownloads, unduh, esc } from "./s_system.js";
import { AiBtn, useAIRun, tulisCatatanRapor } from "./s_ai.js";

const J30 = ["An Naas", "Al Falaq", "Al Ikhlas", "Al Lahab", "An Nashr", "Al Kaafiruun", "Al Kautsar", "Al Maa'un", "Quraisy", "Al Fiil", "Al Humazah", "Al 'Ashr", "At Takaatsur",
  "Al Qaari'ah", "Al 'Aadiyaat", "Az Zalzalah", "Al Bayyinah", "Al Qadr", "Al 'Alaq", "At Tiin", "Asy Syarh", "Adh Dhuha", "Al Lail", "Asy Syams", "Al Balad", "Al Fajr",
  "Al Ghaasyiyah", "Al A'laa", "Ath Thaariq", "Al Buruuj", "Al Insyiqaaq", "Al Muthaffifiin", "Al Infithaar", "At Takwiir", "'Abasa", "An Naazi'aat", "An Naba'"];
const J29 = ["Al Mursalaat", "Al Insaan", "Al Qiyaamah", "Al Muddatstsir", "Al Muzzammil", "Al Jinn", "Nuh", "Al Ma'aarij", "Al Haaqqah", "Al Qalam", "Al Mulk"];
const MAPEL_RAPOR = [["fiqih", "FIQIH"], ["it", "IT (TEKNOLOGI INFORMASI)"], ["karakter", "PENDIDIKAN KARAKTER"], ["bing", "BAHASA INGGRIS"]];

export const RP_CSS = `.rp{font-family:Montserrat,"Plus Jakarta Sans",Arial,sans-serif;color:#2E2F30}
.rp-page{width:794px;height:1123px;background:#fff;position:relative;overflow:hidden;box-sizing:border-box;padding:183px 85px 133px 96px;margin:0 auto 16px;box-shadow:0 1px 6px rgba(0,0,0,.15)}
.rp-head{position:absolute;left:35px;top:11px;width:763px;height:auto}.rp-foot{position:absolute;left:14px;bottom:10px;width:785px;height:auto}
.rp h1{margin:0;text-align:center;font-size:17px;font-weight:700;color:#3D5F78;letter-spacing:.2px}.rp .qsub{text-align:center;font-size:12px;font-style:italic;margin:0 0 10px}
.rp .qsec{font-size:14px;font-weight:700;color:#0C9954;border-bottom:1px solid #E5AC4C;padding-bottom:2px;margin:12px 0 5px}
.rp .qnote{font-size:10.6px;font-style:italic;margin:0 0 5px}.rp .qlbl{font-size:12px;font-weight:700;color:#3D5F78;margin:8px 0 4px}
.rp table{border-collapse:collapse;width:100%;table-layout:fixed}.rp td,.rp th{border:1px solid #BFC8D0;padding:1.7px 4.7px;font-size:11.3px;line-height:1.2;vertical-align:middle;height:21px}.rp th{height:18px}
.rp th{background:#3D5F78;color:#fff;font-weight:700;text-align:center}.rp .qh2 th{background:#DCE8F0;color:#3D5F78}.rp .qh2 th.qj29{background:#FBEFD9}
.rp .qc{text-align:center}.rp .qb{font-weight:700}.rp .qs{font-size:10px}.rp .qtight td{height:19px}.rp .qket td,.rp .qket th{font-size:10px;height:15px}.rp .qn30{background:#DCE8F0}.rp .qn29{background:#FBEFD9}.rp .qjx{background:#E3F2EA}.rp .qtot{background:#EEF2F5;font-weight:700}
.rp .qz{background:#F4F7F9}.rp .qv{font-weight:700;color:#0B5D3B}.rp .qred{color:#E2564E}
.rp .qid td{border:none;font-size:12px;padding:1px 3px;height:auto}.rp .qid td.qk{font-weight:700}
.rp .qbox{border:1px solid #BFC8D0;min-height:93px;padding:6px 8px;font-size:12px;white-space:pre-wrap}
.rp .qg{display:flex;align-items:center;justify-content:center}.rp .qttd-img{max-height:92%;max-width:88%;object-fit:contain}.rp .qttd{display:flex;justify-content:space-around;text-align:center;font-size:12px;margin-top:6px}.rp .qttd>div{width:45%}.rp .qttd .qg{height:84px;width:100%}.rp .qttd3 .qg{width:100%}
.rp .qstats{display:flex;gap:8px;margin:2px 0 8px}.rp .qstat{flex:1;border:1px solid #BFC8D0;border-top:3px solid #0C9954;border-radius:6px;padding:7px 10px;background:#F4F7F9}
.rp .qstat:nth-child(2){border-top-color:#3D5F78}.rp .qstat:nth-child(3){border-top-color:#E5AC4C}
.rp .qstat span{display:block;font-size:10.5px;color:#3D5F78;font-weight:700}.rp .qstat b{display:block;font-size:17px;color:#2E2F30;margin:2px 0 1px}.rp .qstat small{font-size:10px;color:#5B6B75}
.rp .qttd3{display:flex;justify-content:space-between;text-align:center;font-size:12px;margin-top:6px}.rp .qttd3>div{width:32%}.rp .qttd3 .qg{height:54px}.rp .qttd3 b{font-size:11px;white-space:nowrap}.rp .rp-mid .qsec{margin-top:9px}`;

// tanda tangan tersimpan (Akun → Tanda Tangan) ditempel otomatis di atas nama
const mdr = () => L.mudirStaff() || L.staffAman("syamsul");
const ttdImg = id => { const t = L.ttdOf(id); return t ? `<img class="qttd-img" src="${t}" alt="">` : ""; };
function nilaiJuz(d, j) {
  if (!d) return null;
  const v = Object.entries(d).filter(([k]) => (j >= 29 ? k.startsWith(j + ":") : k === "j" + j)).map(([, x]) => x).filter(x => x !== "" && x != null);
  return v.length ? Math.round(v.reduce((a, b) => a + Number(b), 0) / v.length) : null;
}
const d = x => (x == null || x === "" ? "" : esc(x));

export function raporHTML(sid, periode) {
  const s = L.santriById(sid), a = L.asramaById(s.asrama), mus = L.staffById(a.musyrif), h = L.hafalan(s);
  const rgS = L.periodeRange("semester"), nt = (get("nilaiTahfidz", sid) || {})[periode] || {}, kh = L.kehadiranHalaqah(sid, rgS), mb = L.mutPerButir(sid, rgS);
  const cat = (get("raporCatatan", `${sid}_${periode}`) || {}).teks || "";
  const head = `<img class="rp-head" src="${RP_HEAD}" alt="">`, foot = `<img class="rp-foot" src="${RP_FOOT}" alt="">`;
  // ---------- halaman 1: identitas & tahfidz ----------
  const idr = [["Nama Santri", s.nama, "Halaqah", (L.guruHalaqah(s) || mus).pendek], ["NIS", s.nis || "—", "Asrama", a.nama], ["Kelas", s.kelas, "Semester", periode === "mid" ? "Ganjil (Tengah Semester)" : "Ganjil"], ["Wali Asrama", mus.nama, "Tahun Pelajaran", "2026/2027"]];
  const ident = `<table class="qid"><colgroup><col style="width:97px"><col style="width:200px"><col style="width:120px"><col></colgroup>${idr.map(r => `<tr><td class="qk">${r[0]}</td><td>: ${esc(r[1])}</td><td class="qk">${r[2]}</td><td>: ${esc(r[3])}</td></tr>`).join("")}</table>`;
  const v30 = n => d(nt["30:" + n]), v29 = n => d(nt["29:" + n]);
  const left = J30.map((nm, i) => [114 - i, nm]), right = J29.map((nm, i) => [77 - i, nm]);
  const blocks = [left.slice(0, 13), left.slice(13, 25), left.slice(25), right];
  let rows = "";
  for (let r = 0; r < 13; r++) rows += "<tr>" + blocks.map((b, bi) => b[r] ? `<td class="qc qs ${bi === 3 ? "qn29" : "qn30"}">${b[r][0]}</td><td class="qs">${b[r][1]}</td><td class="qc qv">${bi === 3 ? v29(b[r][0]) : v30(b[r][0])}</td>` : `<td></td><td></td><td></td>`).join("") + "</tr>";
  const cg = `<colgroup>${"<col style='width:27px'><col style='width:86px'><col style='width:40px'>".repeat(4)}</colgroup>`;
  const tJuz = `<table class="qtight">${cg}<tr><th colspan="9">JUZ 30</th><th colspan="3">JUZ 29</th></tr><tr class="qh2">${[0, 1, 2, 3].map(i => `<th class="${i === 3 ? "qj29" : ""}">No</th><th class="${i === 3 ? "qj29" : ""}">Nama Surat</th><th class="${i === 3 ? "qj29" : ""}">Nilai</th>`).join("")}</tr>${rows}</table>`;
  let g = ""; for (let r = 0; r < 4; r++) { g += "<tr>"; for (let c = 0; c < 7; c++) { const j = r * 7 + c + 1; g += `<td class="qc qs qjx">Juz ${j}</td><td class="qc qv">${d(nt["j" + j])}</td>`; } g += "</tr>"; }
  const tLain = `<table class="qtight"><tr>${"<th>Juz</th><th>Nilai</th>".repeat(7)}</tr>${g}</table>`;
  const all = Object.values(nt).filter(x => x !== "" && x != null).map(Number), jml = all.reduce((x, y) => x + y, 0), rata = all.length ? Math.round(jml / all.length) : null;
  const tasmi = DATA.urutanJuz.filter(j => h.selesai.includes(j));
  const tSum = `<table><colgroup><col style="width:150px"><col style="width:150px"><col style="width:150px"><col></colgroup>
    <tr><td class="qtot">Jumlah nilai</td><td class="qc qb">${all.length ? jml : ""}</td><td class="qtot">Rata-rata</td><td class="qc qb">${rata ?? ""}</td></tr>
    <tr><td class="qtot">Predikat</td><td class="qc qb">${rata == null ? "" : L.predikat(rata).h + " · " + L.predikat(rata).t}</td><td class="qtot">Total hafalan</td><td class="qc qb">${esc(L.fmtJumlah(h))}</td></tr>
    <tr><td class="qtot">Tasmi' yang telah lulus</td><td colspan="3">${tasmi.length ? "Juz " + tasmi.join(", ") : "—"}</td></tr></table>`;
  const tHadir = `<table><colgroup><col style="width:150px"><col><col><col><col></colgroup><tr><td class="qtot">Kehadiran halaqah</td>${[["Hadir", kh.H], ["Sakit", kh.S], ["Izin", kh.I], ["Alpa", kh.A]].map(([l, v]) => `<td class="qc">${l}: ${v} sesi</td>`).join("")}</tr></table>`;
  const p1 = `<div class="rp-page">${head}<h1>LAPORAN HASIL BELAJAR SANTRI</h1><p class="qsub">Pondok Tahfidz Modern Kampung Qur'an Al Muawanah</p>${ident}
    <div class="qsec">A. PERKEMBANGAN TAHFIDZ AL-QUR'AN</div><p class="qnote">Nilai ujian tahfidz ${periode === "mid" ? "tengah semester" : "semester"}. Juz 30 dan Juz 29 dinilai per surah, juz lainnya dinilai per juz.</p>
    ${tJuz}<div class="qlbl">Juz lainnya (dinilai per juz)</div>${tLain}<div style="height:8px"></div>${tSum}<div style="height:6px"></div>${tHadir}${foot}</div>`;
  // ---------- halaman 2: mapel ----------
  // Bahasa Inggris memakai istilah Inggris; urutan tampil: Reading & Listening, Speaking, Writing, Attitude, Attendance, Final Score
  const mp = id => { const m = L.mapelById(id), nm = get("nilaiMapel", L.nilaiKey(id, s.kelas)) || {}, asp = ((nm.aspek || {})[sid]) || {}, ak = (L.nilaiAkhir(sid, id) || {}).akhir;
    const en = id === "bing", urut = en ? [2, 0, 1, 3].filter(i => i < m.aspek.length) : m.aspek.map((_, i) => i), kh = L.kehadiranKelas(sid, id).pct;
    return { m, en, rows: urut.map(i => [m.aspek[i], asp[i]]), hadir: [en ? "Attendance" : "Kehadiran", kh], ak, lab: en ? ["Aspect", "Score", "Grade", "Final Score"] : ["Aspek", "Nilai", "Predikat", "Nilai Akhir"] }; };
  const pair = ids => { const P = ids.map(mp), n = Math.max(...P.map(p => p.rows.length));
    let body = ""; for (let i = 0; i < n; i++) body += `<tr class="${i % 2 ? "qz" : ""}">` + P.map(p => p.rows[i] ? `<td>${esc(p.rows[i][0])}</td><td class="qc qv">${d(p.rows[i][1])}</td><td class="qc">${p.rows[i][1] === "" || p.rows[i][1] == null ? "" : L.predikat(Number(p.rows[i][1])).h}</td>` : "<td></td><td></td><td></td>").join("") + "</tr>";
    body += `<tr class="${n % 2 ? "qz" : ""}">` + P.map(p => `<td>${p.hadir[0]}</td><td class="qc qv">${p.hadir[1] == null ? "" : p.hadir[1] + "%"}</td><td class="qc">${p.hadir[1] == null ? "" : L.predikatMut(p.hadir[1]).h}</td>`).join("") + "</tr>";
    return `<table><colgroup>${"<col style='width:173px'><col style='width:67px'><col style='width:66px'>".repeat(2)}</colgroup>
      <tr>${ids.map(id => `<th colspan="3">${MAPEL_RAPOR.find(x => x[0] === id)[1]}</th>`).join("")}</tr><tr class="qh2">${P.map(p => `<th>${p.lab[0]}</th><th>${p.lab[1]}</th><th>${p.lab[2]}</th>`).join("")}</tr>${body}
      <tr>${P.map(p => `<td class="qtot">${p.lab[3]}</td><td class="qtot qc">${p.ak ?? ""}</td><td class="qtot qc">${p.ak == null ? "" : L.predikat(p.ak).h}</td>`).join("")}</tr></table>`; };
  const aks = MAPEL_RAPOR.map(([id]) => (L.nilaiAkhir(sid, id) || {}).akhir).filter(x => x != null), jak = aks.reduce((x, y) => x + y, 0);
  const p2 = `<div class="rp-page">${head}<div class="qsec" style="margin-top:0">B. PENILAIAN MATA PELAJARAN</div><p class="qnote">Nilai per aspek diisi guru mapel. Kehadiran dihitung otomatis dari absen kelas. Nilai akhir = 10% kehadiran + 30% projek + 25% PTS + 35% PAS. KKM 70.</p>
    ${pair(["fiqih", "it"])}<div style="height:16px"></div>${pair(["karakter", "bing"])}<div style="height:16px"></div>
    <table><colgroup><col style="width:173px"><col style="width:67px"><col style="width:66px"><col style="width:173px"><col></colgroup><tr><td class="qtot">Jumlah nilai akhir</td><td class="qc qb">${aks.length ? jak : ""}</td><td></td><td class="qtot">Rata-rata</td><td class="qc qb">${aks.length ? Math.round(jak / aks.length) : ""}</td></tr></table>${foot}</div>`;
  // ---------- halaman 3: mutaba'ah ----------
  const mt = (items, pcts) => { const half = Math.ceil(items.length / 2); let b = "";
    for (let r = 0; r < half; r++) b += `<tr class="${r % 2 ? "qz" : ""}">` + [r, r + half].map(i => items[i] ? `<td class="qc qs">${i + 1}</td><td class="qs">${esc(items[i])}</td><td class="qc qv">${pcts[i] == null ? "" : L.predikatMut(pcts[i]).h}</td>` : "<td></td><td></td><td></td>").join("") + "</tr>";
    return `<table><colgroup>${"<col style='width:27px'><col style='width:240px'><col style='width:39px'>".repeat(2)}</colgroup><tr>${"<th>No</th><th>Poin</th><th>Nilai</th>".repeat(2)}</tr>${b}</table>`; };
  const p3 = `<div class="rp-page">${head}<div class="qsec" style="margin-top:0">C. MUTABA'AH IBADAH DAN ADAB</div><p class="qnote">Nilai (A–D) dihitung otomatis dari persentase pelaksanaan selama satu semester${mb.hari ? ` (${mb.hari} hari aktif, ${mb.isi} hari diinput)` : ""}.</p>
    <div class="qlbl" style="margin-top:2px">Ibadah</div>${mt(DATA.ibadah, mb.ibadah)}<div class="qlbl" style="margin-top:14px">Adab</div>${mt(DATA.adab, mb.adab)}${foot}</div>`;
  // ---------- halaman 4: catatan & tanda tangan ----------
  const tgl = new Date(), tg = `${tgl.getDate()} ${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][tgl.getMonth()]} ${tgl.getFullYear()}`;
  const ket = [["A", "Istimewa", "90 – 100", "90 – 100%"], ["B", "Baik", "80 – 89", "75 – 89%"], ["C", "Cukup", "70 – 79", "60 – 74%"], ["D", "Perlu bimbingan", "di bawah 70", "di bawah 60%"]];
  const p4 = `<div class="rp-page">${head}<div class="qsec" style="margin-top:0">D. CATATAN WALI ASRAMA / WALI HALAQAH</div><div class="qbox">${esc(cat)}</div>
    <div class="qsec">E. TANGGAPAN ORANG TUA / WALI</div><div class="qbox" style="min-height:62px"></div>
    <div class="qlbl" style="margin-top:16px">Keterangan predikat</div><table class="qket"><colgroup><col style="width:73px"><col style="width:166px"><col style="width:187px"><col></colgroup><tr><th>Predikat</th><th>Arti</th><th>Nilai (Tahfidz dan Mapel)</th><th>Capaian Mutaba'ah dan Adab</th></tr>
    ${ket.map((r, i) => `<tr>${r.map((v, j) => `<td class="qc ${j === 0 ? "qb" : ""} ${i === 3 && j === 0 ? "qred" : ""}">${v}</td>`).join("")}</tr>`).join("")}</table>
    <div class="qttd" style="margin-top:32px"><div></div><div>Metro, ${tg}</div></div>
    <div class="qttd"><div>Orang Tua / Wali<div class="qg"></div><b>(…………………………………)</b></div><div>Wali Asrama / Wali Halaqah<div class="qg">${ttdImg(mus && mus.id)}</div><b>(${esc(mus.nama)})</b></div></div>
    <div class="qttd" style="margin-top:14px"><div>Mengetahui,<br>Mudir<div class="qg">${ttdImg(mdr().id)}</div><b style="text-decoration:underline">${esc(mdr().nama.replace(/^Ust\.\s*/, ""))}</b></div></div>${foot}</div>`;
  return p1 + p2 + p3 + p4;
}


// ---------- rapor tengah semester: 1 halaman, ringkas ----------
export function raporMidHTML(sid) {
  const s = L.santriById(sid), a = L.asramaById(s.asrama), mus = L.staffById(a.musyrif), cp = L.capaianSemester(s), h = cp.h;
  const rgM = L.periodeRange("mid"), nt = (get("nilaiTahfidz", sid) || {}).mid || {}, kh = L.kehadiranHalaqah(sid, rgM), mp = L.mutPersen(sid, rgM);
  const cat = (get("raporCatatan", `${sid}_mid`) || {}).teks || "";
  const head = `<img class="rp-head" src="${RP_HEAD}" alt="">`, foot = `<img class="rp-foot" src="${RP_FOOT}" alt="">`;
  const idr = [["Nama Santri", s.nama, "Halaqah", (L.guruHalaqah(s) || mus).pendek], ["NIS", s.nis || "—", "Asrama", a.nama], ["Kelas", s.kelas, "Semester", "Ganjil (Tengah Semester)"], ["Wali Asrama", mus.nama, "Tahun Pelajaran", "2026/2027"]];
  const ident = `<table class="qid"><colgroup><col style="width:97px"><col style="width:200px"><col style="width:120px"><col></colgroup>${idr.map(r => `<tr><td class="qk">${r[0]}</td><td>: ${esc(r[1])}</td><td class="qk">${r[2]}</td><td>: ${esc(r[3])}</td></tr>`).join("")}</table>`;
  const uj = Object.values(nt).filter(x => x !== "" && x != null).map(Number), ujR = uj.length ? Math.round(uj.reduce((x, y) => x + y, 0) / uj.length) : null;
    const A = `<div class="qstats"><div class="qstat"><span>Capaian hafalan mid semester</span><b>${esc(L.fmtBaris(cp.baris))}</b><small>${L.capaianJuz(s).juz.toLocaleString("id-ID")} dari target ${L.targetSemester()} juz/semester · ${cp.setor}× setor</small></div>
    <div class="qstat"><span>Total seluruh hafalan</span><b>${esc(L.fmtJumlah(h))}</b><small>${h.khatam ? "Khatam 30 juz" : "Selesai semester ini: " + (cp.juzBaru.length ? "Juz " + cp.juzBaru.join(", ") : "—")}</small></div>
    <div class="qstat"><span>Posisi hafalan sekarang</span><b>${h.khatam ? "Khatam" : "Juz " + h.aktif}</b><small>${h.khatam ? "" : esc(L.posLabel(h.aktif, h.baris).replace(/^Juz \d+ · /, ""))}</small></div></div>
    <table><colgroup><col style="width:150px"><col style="width:150px"><col style="width:130px"><col></colgroup><tr><td class="qtot">Nilai ujian tahfidz</td><td>${ujR == null ? "—" : `<b>${ujR}</b> · ${L.predikat(ujR).h} (${L.predikat(ujR).t})`}</td>
    <td class="qtot">Kehadiran halaqah</td><td>${kh.sesi ? `H ${kh.H} · S ${kh.S} · I ${kh.I} · A ${kh.A} dari ${kh.sesi} sesi` : "—"}</td></tr></table>`;
  const mrows = MAPEL_RAPOR.map(([id, nm], i) => { const n = L.nilaiAkhir(sid, id) || {}, v = n.pts === "" ? null : n.pts;
    return `<tr class="${i % 2 ? "qz" : ""}"><td class="qc">${i + 1}</td><td>${id === "it" ? "Teknologi Informasi (IT)" : esc(L.mapelById(id).nama)}</td><td class="qc">${n.hadir == null ? "—" : n.hadir + "%"}</td><td class="qc qv">${v ?? "—"}</td><td class="qc">${v == null ? "—" : L.predikat(Number(v)).h + " · " + L.predikat(Number(v)).t}</td></tr>`; }).join("");
  const B = `<table><colgroup><col style="width:34px"><col><col style="width:100px"><col style="width:120px"><col style="width:150px"></colgroup><tr><th>No</th><th>Mata Pelajaran</th><th>Kehadiran</th><th>Nilai PTS</th><th>Predikat</th></tr>${mrows}</table>`;
  const mr = (nm, v) => { const p = L.predikatMut(v); return `<td class="qtot">${nm}</td><td class="qc qv">${v == null ? "—" : v + "%"}</td><td class="qc">${v == null ? "—" : p.h + " · " + p.t}</td>`; };
  const C = `<table><colgroup><col style="width:130px"><col style="width:70px"><col style="width:105px"><col style="width:130px"><col style="width:70px"><col></colgroup><tr><th>Aspek</th><th>Capaian</th><th>Predikat</th><th>Aspek</th><th>Capaian</th><th>Predikat</th></tr><tr>${mr(`Ibadah (${DATA.ibadah.length} butir)`, mp.ibadah)}${mr(`Adab (${DATA.adab.length} butir)`, mp.adab)}</tr></table>`;
  const tgl = new Date(), tg = `${tgl.getDate()} ${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][tgl.getMonth()]} ${tgl.getFullYear()}`;
  return `<div class="rp-page rp-mid">${head}<h1>LAPORAN TENGAH SEMESTER</h1><p class="qsub">Pondok Tahfidz Modern Kampung Qur'an Al Muawanah</p>${ident}
    <div class="qsec">A. CAPAIAN TAHFIDZ AL-QUR'AN</div>${A}
    <div class="qsec">B. MATA PELAJARAN</div><p class="qnote">Nilai tengah semester (PTS). Nilai akhir lengkap per aspek ada di rapor akhir semester. KKM 70.</p>${B}
    <div class="qsec">C. MUTABA'AH IBADAH DAN ADAB</div><p class="qnote">Persentase dari ${mp.hari} hari aktif, ${mp.isi || 0} hari diinput (hari tanpa input dihitung 0): A 90–100% · B 75–89% · C 60–74% · D di bawah 60%.</p>${C}
    <div class="qsec">D. CATATAN WALI ASRAMA</div><div class="qbox" style="min-height:50px">${esc(cat)}</div>
    <div class="qttd3" style="margin-top:12px"><div></div><div></div><div>Metro, ${tg}</div></div>
    <div class="qttd3" style="margin-top:2px"><div>Orang Tua / Wali<div class="qg"></div><b>(…………………………)</b></div><div>Wali Asrama<div class="qg">${ttdImg(mus && mus.id)}</div><b>(${esc(mus.nama)})</b></div><div>Mengetahui, Mudir<div class="qg">${ttdImg(mdr().id)}</div><b style="text-decoration:underline">${esc(mdr().nama.replace(/^Ust\.\s*/, ""))}</b></div></div>${foot}</div>`;
}

export function raporDoc(sid, periode) {
  const s = L.santriById(sid);
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rapor ${esc(s.nama)}</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>@page{size:A4;margin:0}body{margin:0;background:#E9ECEF}${RP_CSS}@media print{body{background:#fff}.rp-page{margin:0;box-shadow:none;page-break-after:always}}</style></head>
<body><div class="rp">${periode === "mid" ? raporMidHTML(sid) : raporHTML(sid, periode)}</div></body></html>`;
}

function useWidth() {
  const [w, setW] = useState(() => Math.min(window.innerWidth || 390, 480));
  useEffect(() => { const f = () => setW(Math.min(window.innerWidth || 390, 480)); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}

export function RaporView({ sid }) {
  useApp();
  const s = L.santriById(sid), a = L.asramaById(s.asrama), m = me();
  const [periode, setPeriode] = useState("smt"); const [zoom, setZoom] = useState(false);
  const key = `${sid}_${periode}`, ex = get("raporCatatan", key);
  const [teks, setTeks] = useState(ex ? ex.teks : ""); const [kk, setKk] = useState(key);
  if (kk !== key) { setKk(key); setTeks(ex ? ex.teks : ""); }
  const bolehCatat = m && (a.musyrif === m.id || (L.guruHalaqah(s) || {}).id === m.id);
  const hal = periode === "mid" ? 1 : 4, dlOk = useDownloads(), w = useWidth(), k = zoom ? 1 : (w - 32) / 794;
  const simpan = async () => { if (await put("raporCatatan", key, { santri: sid, periode, teks, oleh: m.id, ts: Date.now() })) toast("Catatan wali asrama tersimpan"); };
  const [aiBusy, aiRun] = useAIRun();
  return html`<${SubHeader} title="Rapor" sub=${s.nama}><${Seg} items=${[["mid", "Tengah semester"], ["smt", "Akhir semester"]]} value=${periode} onChange=${setPeriode} /></${SubHeader}>
    <style>${RP_CSS}</style><div class="wrap">
      ${bolehCatat ? html`<${Card} title=${periode === "mid" ? "Catatan wali asrama · tengah semester" : "D. Catatan wali asrama · akhir semester"}><${Field} label="Catatan untuk rapor"><textarea class="in" maxLength="400" value=${teks} placeholder="Misal: Alhamdulillah hafalan lancar, perlu meningkatkan murojaah." onInput=${e => setTeks(e.target.value)}></textarea></${Field}>
        <${AiBtn} kecil label="Tulis draf dengan AI" busy=${aiBusy} onClick=${() => aiRun(async () => { setTeks(await tulisCatatanRapor(s, periode)); toast("Draf catatan dibuat. Periksa lalu simpan."); })} />
        <${Btn} kind="ghost" onClick=${simpan}>Simpan catatan</${Btn}></${Card}>` : null}
      <div style="display:flex;justify-content:space-between;align-items:center;margin:0 2px 8px"><b style="font-size:14px">Pratinjau rapor · ${hal} halaman</b>
        <button class="link" onClick=${() => setZoom(!zoom)}>${zoom ? "Muat ke layar" : "Perbesar"}</button></div>
      <div style=${`overflow:${zoom ? "auto" : "hidden"};margin:0 -16px;padding:0 16px`}>
        <div style=${`width:${794 * k}px;height:${(1123 + 16) * hal * k}px`}><div class="rp" style=${`width:794px;transform:scale(${k});transform-origin:0 0`} dangerouslySetInnerHTML=${{ __html: periode === "mid" ? raporMidHTML(sid) : raporHTML(sid, periode) }}></div></div></div>
      <div class="sticky-act"><${Btn} icon="download" onClick=${() => unduhPdf(`Rapor ${s.nama} ${periode === "mid" ? "Tengah Semester" : "Semester Ganjil"}`, () => htmlKePdf(raporDoc(sid, periode), ".rp-page"))}>Unduh rapor (PDF)</${Btn}></div>
      <p class="fab-note">Rapor tidak tampil di akun wali santri.</p></div>`;
}
