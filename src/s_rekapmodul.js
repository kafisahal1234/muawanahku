// Rekap per modul: Tahfidz, Mapel/Kurikulum, Asrama, Kesantrian — masing-masing berdiri sendiri, tanpa tab campuran
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Card, SubHeader, Btn, Empty, Hint, Sheet, Seg, Angka } from "./ui.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { unduhPdf, tabelKePdf } from "./pdf.js";
import { unduh } from "./s_system.js";
import { ttdUntukPdf } from "./s_ttd.js";
import { usePeriode, lingkup } from "./s_rekap.js";
import { unduhLaporanZiyadah } from "./s_hafalanbulan.js";
import { EvaluasiTunda } from "./s_laporan.js";
import { evTahfidz, evMapel, evAsrama, evKesantrian, denganLalu } from "./evaluasi.js";
// Rekap = evaluasi dulu (angka + perbandingan, kesimpulan, perlu tindak lanjut, kabar baik), lalu rincian per aspek
const EvalRekap = ({ buat, kunci }) => html`<${EvaluasiTunda} buat=${buat} kunci=${kunci} judulLuar=${false} /><p class="rp-sekat">Rincian per aspek</p>`;

const P = v => (v == null ? "—" : v + "%");
const nada = v => (v == null ? "mut" : v >= 90 ? "hijau" : v >= 75 ? "biru" : v >= 60 ? "emas" : "merah");
const rata = xs => { const v = xs.filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
const jml = (xs, f) => xs.reduce((n, x) => n + (f(x) || 0), 0);
const hal = baris => { if (!baris) return "0"; const h = baris / 15; return h >= 20 ? `${(h / 20).toLocaleString("id-ID", { maximumFractionDigits: 1 })} juz` : `${h.toLocaleString("id-ID", { maximumFractionDigits: 1 })} hal`; };
const pendek = n => String(n || "").split(" ").slice(0, 3).join(" ");

// ---------- komponen tampilan ----------

// ---------- tampilan baru: satu aspek = satu kartu (tanpa tab, tanpa kotak campur) ----------
// rows: [{ nama, sub, nilai (angka untuk urut/bar), v (teks), pct (true bila persen), go }]
const NADA_BAR = { hijau: "#1BA46A", biru: "#2E7BD8", emas: "#E09A1F", merah: "#D9483B", ungu: "#7E57C2", mut: "#C9D6CE" };
export function Panel({ ic, warna = "hijau", judul, besar, besarNada, ket, rows: rows0, persen, kosongT, catatan, batas = 0 }) {
  const rows = rows0 || [], ada = rows.filter(r => r.nilai != null), kosong = rows.filter(r => r.nilai == null);
  const maks = persen ? 100 : Math.max(1, ...ada.map(r => r.nilai));
  const urut = [...ada].sort((a, b) => b.nilai - a.nilai || String(a.nama).localeCompare(String(b.nama))).concat(kosong);
  const [semua, setSemua] = useState(false), tampil = batas && !semua ? urut.slice(0, batas) : urut;
  return html`<section class="rp-card">
    <header class="rp-h"><span class=${"rp-ic " + warna}><${Icon} n=${ic} s=${18} /></span>
      <div class="rp-ht"><b>${judul}</b>${ket ? html`<small>${ket}</small>` : null}</div>
      <div class=${"rp-big " + (besar == null ? "nd" : besarNada || "")}>${besar == null ? "Belum ada data" : besar}</div></header>
    ${rows0 == null ? null : rows.length && (persen ? ada.length : ada.some(r => r.nilai > 0)) ? html`<div class="rp-rows">${tampil.map((r, i) => { const t = r.nilai == null ? "mut" : persen ? nada(r.nilai) : r.nada || warna, w = r.nilai == null ? 0 : Math.max(r.nilai ? 3 : 0, Math.min(100, (r.nilai / maks) * 100));
        const isi = html`<em>${r.nilai == null ? "–" : i + 1}</em><span class="rp-n"><span class="rp-nt"><b>${r.nama}</b><span class=${"rp-v " + t}>${r.nilai == null ? "Belum ada data" : r.v}</span></span>
          ${r.sub ? html`<small>${r.sub}</small>` : null}<span class="rp-bar"><i style=${`width:${w}%;background:${NADA_BAR[t] || NADA_BAR.hijau}`}></i></span></span>`;
        return html`<div class="rp-row">${isi}</div>`; })}</div>
      ${batas && urut.length > batas ? html`<button type="button" class="rp-more" onClick=${() => setSemua(!semua)}>${semua ? "Ringkas" : `Lihat semua (${urut.length})`}</button>` : null}`
      : html`<p class="rp-kosong">${kosongT || "Belum ada data pada periode ini."}</p>`}
    ${catatan ? html`<p class="rp-cat">${catatan}</p>` : null}</section>`;
}
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
const halV = baris => (baris ? hal(baris) : "0");

function Unduhan({ judul, rg, tabel, ttd, ekstra = [] }) {
  const [buka, setBuka] = useState(false), nama = `${judul} - ${rg.label}`.replace(/[\/:]/g, "-"), rh = L.rentangHitung(rg);
  const pdf = () => { const t = tabel(); unduhPdf(nama, () => tabelKePdf({ judul, sub: `${rg.label}${rh.kosong ? "" : ` · ${L.fmtTgl(rh.dari, false)} – ${L.fmtTgl(rh.sampai, false)}`}`, catatan: t.catatan,
    oleh: `Dicetak oleh ${me().nama}, ${L.fmtTgl(L.today())} · MuawanahQu`, bagian: t.bagian, ttd: ttdUntukPdf(ttd) })); };
  const csv = () => { const t = tabel(), q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    unduh(nama + ".csv", "﻿" + [q(`${judul} · ${rg.label}`), ...t.bagian.flatMap(b => ["", q(b.judul), b.kol.map(q).join(";"), ...b.rows.map(r => r.map(q).join(";"))])].join("\r\n")); };
  return html`<${Btn} kind="ghost" icon="download" onClick=${() => setBuka(true)}>Unduh rekap</${Btn}>
    <${Sheet} open=${buka} title="Unduh rekap" onClose=${() => setBuka(false)}>
      <p class="small" style="margin-top:0">${judul} · ${rg.label}</p>
      ${ekstra.map(x => html`<button class="menu-row" onClick=${() => { setBuka(false); x.fn(); }}><${Icon} n="award" s=${22} c="#B07A12" /><span>${x.judul}<br /><small class="small">${x.ket}</small></span><${Icon} n="right" s=${18} /></button>`)}
      <button class="menu-row" onClick=${() => { setBuka(false); pdf(); }}><${Icon} n="file" s=${22} c="#0B6B43" /><span>Dokumen PDF<br /><small class="small">Siap dicetak atau dikirim, dengan kop pondok</small></span><${Icon} n="right" s=${18} /></button>
      <button class="menu-row" onClick=${() => { setBuka(false); csv(); }}><${Icon} n="grid" s=${22} c="#1F56B5" /><span>Tabel Excel (CSV)<br /><small class="small">Bisa dibuka di Excel / Google Sheets</small></span><${Icon} n="right" s=${18} /></button></${Sheet}>`;
}
const kosong = (judul, t) => html`<${SubHeader} title=${judul} /><div class="wrap"><${Card}><${Empty} t=${t} icon="chart" /></${Card}></div>`;

// ================= TAHFIDZ =================
const dataTahfidz = (list, rg) => list.map(s => ({ s, x: L.tahfidzDalam(s.id, rg), iq: L.santriIqra(s) }));
function ringkasTahfidz(d) {
  return { kh: rata(d.map(o => o.x.kh.pct)), baris: jml(d, o => o.x.zBaris), zSantri: d.filter(o => o.x.zSetor).length, muroHal: jml(d, o => o.x.muroHal), muro: jml(d, o => o.x.muro),
    manzil: jml(d, o => o.x.manzil), tasmi: jml(d, o => o.x.tasmiLulus.length), tasmiUji: jml(d, o => o.x.tasmiUji), tahsin: jml(d, o => o.x.tahsin) };
}
function tabelTahfidz(hqs, rg) {
  return { catatan: "Ziyadah = hafalan baru yang lulus (15 baris = 1 halaman, 20 halaman = 1 juz). Kehadiran = sesi hadir dibagi sesi halaqah aktif; sesi yang tidak diabsen dihitung 0.",
    bagian: [{ judul: "Per halaqah", kol: ["Halaqah", "Guru", "Santri", "Absen guru terisi", "Kehadiran", "Ziyadah", "Murojaah (hal)", "Manzil", "Tasmi' lulus"],
      rows: hqs.map(h => { const d = dataTahfidz(L.santriHalaqah(h.id), rg), r = ringkasTahfidz(d), k = L.kinerjaHalaqah(h.id, rg); return [h.nama, (L.staffById(h.guru) || {}).nama || "—", d.length, P(k.pct), P(r.kh), hal(r.baris), r.muroHal, r.manzil, r.tasmi]; }) },
    ...hqs.map(h => ({ judul: `${h.nama} · per santri`, kol: ["Santri", "Kelas", "Kehadiran", "Ziyadah", "Hari setor", "Murojaah (hal)", "Manzil", "Tasmi' lulus", "Tahsin"],
      rows: dataTahfidz(L.santriHalaqah(h.id), rg).map(({ s, x, iq }) => [s.nama, s.kelas, P(x.kh.pct), hal(x.zBaris), x.zHari, x.muroHal, x.manzil, x.tasmiLulus.length ? "Juz " + x.tasmiLulus.join(", ") : "—", iq ? `${x.tahsin}× (${x.tahsinHal} hal)` : "—"]) }))] };
}
// target ziyadah per santri untuk periode yang dipilih (baris)
const tgtBaris = jenis => Math.round(L.targetHal(jenis) * 15);
const nadaTarget = (baris, tg) => (!tg ? (baris ? "hijau" : "mut") : baris >= tg ? "hijau" : baris >= tg / 2 ? "emas" : baris ? "merah" : "mut");
export function RekapTahfidz({ hid }) {
  useApp();
  const lk = lingkup(), hqs = hid ? [L.halaqahById(hid)] : lk.hqs, p = usePeriode("bulanan", null, "halaqah");
  if (!hqs.length || !hqs[0]) return kosong("Rekap Tahfidz", "Akun ini belum memegang halaqah.");
  const satu = hqs.length === 1, semua = hqs.flatMap(h => L.santriHalaqah(h.id)), d = dataTahfidz(semua, p.rg), r = ringkasTahfidz(d);
  const tg = tgtBaris(p.jenis), quran = d.filter(o => !o.iq), iqro = d.filter(o => o.iq), capai = quran.filter(o => o.x.zBaris >= tg).length;
  const judul = satu ? "Rekap " + hqs[0].nama : "Rekap Tahfidz";
  // baris per halaqah (banyak halaqah) atau per santri (satu halaqah)
  const perH = f => hqs.map(h => { const dd = dataTahfidz(L.santriHalaqah(h.id), p.rg), k = L.kinerjaHalaqah(h.id, p.rg); return { h, dd, k, ...f(dd, k, h) }; });
  const subS = o => `Kelas ${o.s.kelas}`, subH = (h, dd) => `${(L.staffById(h.guru) || {}).pendek || "—"} · ${dd.length} santri`;
  const kin = satu ? L.kinerjaHalaqah(hqs[0].id, p.rg) : null, kinAll = hqs.map(h => L.kinerjaHalaqah(h.id, p.rg)), absenGuru = pct(jml(kinAll, k => k.isi), jml(kinAll, k => k.sesi));
  const tasmiRows = d.filter(o => o.x.tasmiLulus.length), perJuz = Object.entries(tasmiRows.reduce((m, o) => { o.x.tasmiLulus.forEach(j => { m[j] = (m[j] || 0) + 1; }); return m; }, {})).sort((a, b) => b[0] - a[0]);
  return html`<${SubHeader} title=${judul} sub=${satu ? `${(L.staffById(hqs[0].guru) || {}).pendek || ""} · ${semua.length} santri` : `${hqs.length} halaqah · ${semua.length} santri`} />
    <div class="wrap rp-wrap">${p.bar}
      <${EvalRekap} kunci=${p.jenis + p.rg.dari + 1} buat=${() => denganLalu(x => evTahfidz(semua, x, { jenis: p.jenis, kinerjaHalaqah: hqs.map(h => h.id) }), p.jenis, p.rg)} />
      <${Panel} ic="users" warna="hijau" judul="Kehadiran santri" ket=${absenGuru == null ? "Absen guru belum ada" : `Absen guru terisi ${absenGuru}% sesi`} besar=${r.kh == null ? null : r.kh + "%"} besarNada=${nada(r.kh)} persen
        rows=${satu ? d.map(o => ({ nama: o.s.nama, sub: subS(o), nilai: o.x.kh.pct, v: P(o.x.kh.pct) }))
          : perH(dd => ({ nilai: rata(dd.map(o => o.x.kh.pct)) })).map(x => ({ nama: x.h.nama, sub: subH(x.h, x.dd), nilai: x.nilai, v: P(x.nilai) }))}
        catatan=${satu ? null : "Kehadiran = sesi hadir dibagi sesi halaqah aktif. Sesi yang belum diabsen dihitung tidak hadir."} />
      ${!satu ? html`<${Panel} ic="checksq" warna="biru" judul="Absen guru terisi" ket="Sesi halaqah yang sudah diabsen" besar=${absenGuru == null ? null : absenGuru + "%"} besarNada=${nada(absenGuru)} persen
        rows=${hqs.map((h, i) => ({ nama: h.nama, sub: (L.staffById(h.guru) || {}).pendek || "—", nilai: kinAll[i].pct, v: P(kinAll[i].pct) }))} />` : null}
      ${quran.length ? html`<${Panel} ic="book" warna="hijau" judul="Ziyadah (hafalan baru)" ket=${`Target ${L.fmtHal(L.targetHal(p.jenis))} per santri · ${capai} dari ${quran.length} santri tercapai`} besar=${r.baris ? hal(r.baris) : "0 hal"}
        rows=${satu ? quran.map(o => ({ nama: o.s.nama, sub: o.x.zBaris >= tg ? "Target tercapai ✓" : o.x.zHari ? `${o.x.zHari} hari setor` : "Belum ziyadah", nilai: o.x.zBaris, v: halV(o.x.zBaris), nada: nadaTarget(o.x.zBaris, tg) }))
          : perH(dd => ({ baris: jml(dd, o => o.x.zBaris), cap: dd.filter(o => !o.iq && o.x.zBaris >= tg).length, n: dd.filter(o => !o.iq).length })).map(x => ({ nama: x.h.nama, sub: `${x.cap}/${x.n} santri capai target`, nilai: x.baris, v: halV(x.baris) }))} />` : null}
      ${quran.length ? (() => { const cs = quran.map(o => ({ o, c: L.capaianJuz(o.s) })), tgS = L.targetSemester(), avgC = rata(cs.map(x => x.c.pct));
        return html`<${Panel} ic="target" warna="biru" judul="Capaian target semester" ket=${`Target ${tgS.toLocaleString("id-ID")} juz per santri · ${cs.filter(x => x.c.tercapai).length} dari ${cs.length} santri tercapai`} besar=${avgC == null ? null : avgC + "%"} besarNada=${nada(avgC)} persen
          rows=${satu ? cs.map(x => ({ nama: x.o.s.nama, sub: `${x.c.juz.toLocaleString("id-ID")} dari ${x.c.target} juz · total ${L.fmtJumlah(L.hafalan(x.o.s))}`, nilai: x.c.pct, v: x.c.pct + "%" }))
            : hqs.map(h => { const cc = L.santriHalaqah(h.id).filter(s => !L.santriIqra(s)).map(s => L.capaianJuz(s).pct), v = rata(cc); return { nama: h.nama, sub: (L.staffById(h.guru) || {}).pendek || "—", nilai: v, v: P(v) }; })} />`; })() : null}
      ${quran.length ? html`<${Panel} ic="repeat" warna="emas" judul="Murojaah" ket=${`${r.muro} kali setor`} besar=${`${r.muroHal} hal`}
        rows=${satu ? quran.map(o => ({ nama: o.s.nama, sub: subS(o), nilai: o.x.muroHal, v: `${o.x.muroHal} hal` }))
          : perH(dd => ({ v0: jml(dd, o => o.x.muroHal) })).map(x => ({ nama: x.h.nama, sub: subH(x.h, x.dd), nilai: x.v0, v: `${x.v0} hal` }))} />` : null}
      ${quran.length && r.manzil ? html`<${Panel} ic="layers" warna="ungu" judul="Manzil" ket="Setoran pekanan" besar=${`${r.manzil}×`}
        rows=${satu ? quran.map(o => ({ nama: o.s.nama, sub: o.x.manzil ? `Nilai rata-rata ${o.x.manzilNilai ?? "—"}` : "Belum setor manzil", nilai: o.x.manzil, v: `${o.x.manzil}×` }))
          : perH(dd => ({ v0: jml(dd, o => o.x.manzil) })).map(x => ({ nama: x.h.nama, sub: subH(x.h, x.dd), nilai: x.v0, v: `${x.v0}×` }))} />` : null}
      ${iqro.length ? html`<${Panel} ic="bookopen" warna="biru" judul="Tahsin (Iqro')" ket=${`${iqro.length} santri masih Iqro'${iqro.filter(o => (L.tahsinStatus(o.s) || {}).siapUjian).length ? ` · ${iqro.filter(o => (L.tahsinStatus(o.s) || {}).siapUjian).length} menunggu ujian` : ""}`} besar=${`${jml(iqro, o => o.x.tahsinHal)} hal`}
        rows=${iqro.map(o => ({ nama: o.s.nama, sub: (st => (st && st.jilid ? `Iqro' ${st.jilid}${st.hal ? " · hal. " + st.hal : ""}` : subS(o)))(L.tahsinStatus(o.s)), nilai: o.x.tahsinHal, v: `${o.x.tahsinHal} hal` }))} batas=${satu ? 0 : 10} />` : null}
      <${Panel} ic="award" warna="emas" judul="Tasmi' lulus" ket=${perJuz.length ? perJuz.map(([j, n]) => `Juz ${j}: ${n} santri`).join(" · ") : r.tasmiUji ? `${r.tasmiUji} kali ujian` : "Belum ada ujian tasmi'"} besar=${`${r.tasmi} juz`}
        rows=${tasmiRows.map(o => ({ nama: o.s.nama, sub: `Juz ${o.x.tasmiLulus.join(", ")}`, nilai: o.x.tasmiLulus.length, v: `${o.x.tasmiLulus.length} juz` }))} kosongT="Belum ada santri yang lulus tasmi' pada periode ini." />
      <${Unduhan} judul=${judul} rg=${p.rg} tabel=${() => tabelTahfidz(hqs, p.rg)} ttd="tahfidz"
        ekstra=${[{ judul: `Laporan Ziyadah ${p.jenis === "bulanan" ? "Bulanan" : p.jenis === "mid" ? "Tengah Semester" : "Semester"}`, ket: `Per halaqah: juz, jumlah, dari–sampai surat, keterangan${hqs.length > 1 ? ` · ${hqs.length} halaqah` : ""}`, fn: () => unduhLaporanZiyadah(hqs, p.rg, p.jenis) }]} /></div>`;
}

// ================= MAPEL / KURIKULUM =================
const pengampu = (mp, k) => (L.jadwalAll().find(j => j.mapel === mp && j.kelas === k) || {}).guru || ((L.pengampu(mp, k) || {}).id);
const namaMapel = mp => L.mapelById(mp).nama;
function dataKelas(mp, k, rg) {
  const g = pengampu(mp, k), kj = L.kinerjaMapel(g, rg, k), pj = L.projekDalam(mp, k, rg), list = L.santriKelas(k);
  const d = list.map(s => { const kh = L.kehadiranKelas(s.id, mp, rg), nil = pj.map(p => p.nilai[s.id]).filter(v => v !== "" && v != null).map(Number); return { s, kh, pj: nil.length ? Math.round(nil.reduce((a, b) => a + b, 0) / nil.length) : null }; });
  return { g, kj, pj, d, kh: rata(d.map(o => o.kh.pct)) };
}
export function RekapMapel({ mapel, kelas, modul }) {
  useApp();
  const lk = lingkup(), p = usePeriode("bulanan", null, "kbm");
  const pairs = mapel && kelas ? [[mapel, kelas]] : modul === "mapel" && (lk.m.ajar || []).length ? lk.m.ajar.map(x => [...x]) : lk.pairs;
  if (!pairs.length) return kosong("Rekap Mapel", "Akun ini belum mengajar mapel.");
  if (pairs.length === 1) {
    const [mp, k] = pairs[0], x = dataKelas(mp, k, p.rg), adaPj = x.d.filter(o => o.pj != null);
    return html`<${SubHeader} title=${`${namaMapel(mp)} · Kelas ${k}`} sub=${`${(L.staffById(x.g) || {}).pendek || "—"} · ${x.d.length} santri`} />
      <div class="wrap rp-wrap">${p.bar}
        <${EvalRekap} kunci=${p.jenis + p.rg.dari + 2} buat=${() => denganLalu(x => evMapel([[mp, k]], x, { nilai: p.jenis !== "bulanan" }), p.jenis, p.rg)} />
        <${Panel} ic="users" warna="hijau" judul="Kehadiran santri" ket="Rata-rata kelas" besar=${x.kh == null ? null : x.kh + "%"} besarNada=${nada(x.kh)} persen
          rows=${x.d.map(o => ({ nama: o.s.nama, sub: o.kh.sesi ? `${o.kh.sesi} pertemuan` : "", nilai: o.kh.pct, v: P(o.kh.pct) }))}
        />
        <${Panel} ic="checksq" warna="biru" judul="Pertemuan terlaksana" ket=${`${x.kj.absen} dari ${x.kj.sesi} pertemuan sudah diabsen`} besar=${x.kj.pct == null ? null : x.kj.pct + "%"} besarNada=${nada(x.kj.pct)} />
        <${Panel} ic="edit" warna="ungu" judul="Jurnal mengajar terisi" ket=${`${x.kj.jurnal} dari ${x.kj.sesi} pertemuan ada materinya`} besar=${x.kj.pctJ == null ? null : x.kj.pctJ + "%"} besarNada=${nada(x.kj.pctJ)} />
        ${x.pj.length ? html`<${Panel} ic="award" warna="emas" judul="Nilai projek" ket=${x.pj.map(pj => pj.nama).join(" · ")} besar=${rata(adaPj.map(o => o.pj))} besarNada=${nada(rata(adaPj.map(o => o.pj)))} persen
          rows=${x.d.map(o => ({ nama: o.s.nama, nilai: o.pj, v: o.pj }))} />` : null}
        <${Unduhan} judul=${`Rekap ${namaMapel(mp)} Kelas ${k}`} rg=${p.rg} tabel=${() => tabelMapel([[mp, k]], p.rg)} ttd="mapel" /></div>`;
  }
  const semua = pairs.map(([mp, k]) => ({ mp, k, ...dataKelas(mp, k, p.rg) })), terl = jml(semua, x => x.kj.absen), ses = jml(semua, x => x.kj.sesi), jur = jml(semua, x => x.kj.jurnal);
  const nm = x => `${namaMapel(x.mp)} · Kelas ${x.k}`, sub = x => `${(L.staffById(x.g) || {}).pendek || "—"} · ${x.d.length} santri`;
  const khAll = rata(semua.map(x => x.kh)), pjAll = semua.filter(x => x.pj.length);
  return html`<${SubHeader} title=${modul === "kurikulum" ? "Rekap KBM" : "Rekap Mapel"} sub=${`${pairs.length} kelas · ${new Set(pairs.map(([mp]) => mp)).size} mapel`} />
    <div class="wrap rp-wrap">${p.bar}
      <${EvalRekap} kunci=${p.jenis + p.rg.dari + 3} buat=${() => denganLalu(x => evMapel(pairs, x, { nilai: p.jenis !== "bulanan" }), p.jenis, p.rg)} />
      <${Panel} ic="users" warna="hijau" judul="Kehadiran santri" ket="Rata-rata per mapel & kelas" besar=${khAll == null ? null : khAll + "%"} besarNada=${nada(khAll)} persen
        rows=${semua.map(x => ({ nama: nm(x), sub: sub(x), nilai: x.kh, v: P(x.kh) }))} catatan="Pertemuan yang belum diabsen dihitung tidak hadir." />
      <${Panel} ic="checksq" warna="biru" judul="Pertemuan terlaksana" ket=${`${terl} dari ${ses} pertemuan sudah diabsen`} besar=${pct(terl, ses) == null ? null : pct(terl, ses) + "%"} besarNada=${nada(pct(terl, ses))} persen
        rows=${semua.map(x => ({ nama: nm(x), sub: sub(x), nilai: x.kj.pct, v: P(x.kj.pct) }))} />
      <${Panel} ic="edit" warna="ungu" judul="Jurnal mengajar terisi" ket=${`${jur} dari ${ses} pertemuan ada materinya`} besar=${pct(jur, ses) == null ? null : pct(jur, ses) + "%"} besarNada=${nada(pct(jur, ses))} persen
        rows=${semua.map(x => ({ nama: nm(x), sub: sub(x), nilai: x.kj.pctJ, v: P(x.kj.pctJ) }))} />
      ${pjAll.length ? html`<${Panel} ic="award" warna="emas" judul="Projek" ket="Jumlah projek dalam periode ini" besar=${String(jml(pjAll, x => x.pj.length))}
        rows=${pjAll.map(x => ({ nama: nm(x), sub: sub(x), nilai: x.pj.length, v: `${x.pj.length} projek` }))} />` : null}
      <${Unduhan} judul=${modul === "kurikulum" ? "Rekap KBM" : "Rekap Mapel"} rg=${p.rg} tabel=${() => tabelMapel(pairs, p.rg)} ttd="mapel" /></div>`;
}
function tabelMapel(pairs, rg) {
  return { catatan: "Kehadiran = hadir dibagi pertemuan terjadwal pada hari KBM aktif. Pertemuan yang belum diabsen dihitung tidak hadir.",
    bagian: [{ judul: "Per kelas", kol: ["Mapel", "Kelas", "Guru", "Pertemuan terlaksana", "Jurnal terisi", "Kehadiran santri", "Projek"], rows: pairs.map(([mp, k]) => { const x = dataKelas(mp, k, rg); return [namaMapel(mp), k, (L.staffById(x.g) || {}).nama || "—", P(x.kj.pct), P(x.kj.pctJ), P(x.kh), x.pj.length]; }) },
      ...pairs.map(([mp, k]) => ({ judul: `${namaMapel(mp)} Kelas ${k} · per santri`, kol: ["Santri", "Kehadiran", "Rata projek"],
        rows: dataKelas(mp, k, rg).d.map(o => [o.s.nama, P(o.kh.pct), o.pj ?? "—"]) }))] };
}

// ================= ASRAMA (mutaba'ah ibadah & adab) =================
const dataAsrama = (list, rg) => list.map(s => { const m = L.mutPersen(s.id, rg); return { s, m, mut: m.ibadah == null ? null : Math.round((m.ibadah + m.adab) / 2) }; });
export function RekapAsrama({ aid }) {
  useApp();
  const lk = lingkup(), asr = aid ? [L.asramaById(aid)] : lk.asr, p = usePeriode("bulanan", null, "asrama");
  if (!asr.length || !asr[0]) return kosong("Rekap Asrama", "Akun ini belum memegang asrama.");
  const satu = asr.length === 1, semua = asr.flatMap(a => L.santriAsrama(a.id)), d = dataAsrama(semua, p.rg);
  const ib = rata(d.map(o => o.m.ibadah)), ad = rata(d.map(o => o.m.adab)), kus = asr.map(a => L.kinerjaMut(a.id, p.rg));
  const isi = jml(kus, k => k.isi), tgt = jml(kus, k => k.target), mutPct = pct(isi, tgt), menyusul = jml(kus, k => k.menyusul), libur = jml(kus, k => k.hariLibur);
  const perA = f => asr.map((a, i) => { const dd = dataAsrama(L.santriAsrama(a.id), p.rg); return { a, dd, ku: kus[i], nilai: f(dd, kus[i]) }; });
  const subA = x => `${(L.staffById(x.a.musyrif) || {}).pendek || "—"} · Pondok ${x.a.pondok} · ${x.dd.length} santri`;
  const subS = o => `Kelas ${o.s.kelas}${L.sedangIzin(o.s.id) ? " · sedang izin" : ""}`;
  const judul = satu ? "Rekap Asrama " + asr[0].nama : "Rekap Asrama";
  return html`<${SubHeader} title=${judul} sub=${satu ? `${(L.staffById(asr[0].musyrif) || {}).pendek || ""} · ${semua.length} santri` : `${asr.length} asrama · ${semua.length} santri`} />
    <div class="wrap rp-wrap">${p.bar}
      <${EvalRekap} kunci=${p.jenis + p.rg.dari + 4} buat=${() => denganLalu(x => evAsrama(semua, x, { asrama: asr }), p.jenis, p.rg)} />
      <${Panel} ic="moon" warna="hijau" judul="Ibadah" ket="Rata-rata capaian mutaba'ah ibadah" besar=${ib == null ? null : ib + "%"} besarNada=${nada(ib)} persen
        rows=${satu ? d.map(o => ({ nama: o.s.nama, sub: subS(o), nilai: o.m.ibadah, v: P(o.m.ibadah) })) : perA(dd => rata(dd.map(o => o.m.ibadah))).map(x => ({ nama: "Asrama " + x.a.nama, sub: subA(x), nilai: x.nilai, v: P(x.nilai) }))} />
      <${Panel} ic="heart" warna="biru" judul="Adab" ket="Rata-rata capaian mutaba'ah adab" besar=${ad == null ? null : ad + "%"} besarNada=${nada(ad)} persen
        rows=${satu ? d.map(o => ({ nama: o.s.nama, sub: subS(o), nilai: o.m.adab, v: P(o.m.adab) })) : perA(dd => rata(dd.map(o => o.m.adab))).map(x => ({ nama: "Asrama " + x.a.nama, sub: subA(x), nilai: x.nilai, v: P(x.nilai) }))} />
      <${Panel} ic="checksq" warna="ungu" judul="Mutaba'ah terisi" ket=${`Diisi menyusul ${menyusul}× · ${libur} hari tidak dinilai`} besar=${mutPct == null ? null : mutPct + "%"} besarNada=${nada(mutPct)} persen
        rows=${satu ? null : perA((dd, ku) => ku.pct).map(x => ({ nama: "Asrama " + x.a.nama, sub: subA(x), nilai: x.nilai, v: P(x.nilai) }))}
        catatan=${satu ? null : "Mutaba'ah dihitung Senin–Jumat. Hari terlewat bisa diisi menyusul paling lambat 7 hari; hari wali asrama berhalangan atau santri izin tidak mengurangi nilai."} />
      <${Unduhan} judul=${judul} rg=${p.rg} ttd="asrama" tabel=${() => ({ catatan: "Mutaba'ah dihitung Senin–Jumat. Hari kosong tanpa alasan dihitung 0; hari wali asrama berhalangan atau santri izin tidak dihitung.",
        bagian: [{ judul: "Per asrama", kol: ["Asrama", "Wali asrama", "Santri", "Mutaba'ah terisi", "Menyusul", "Hari tidak dinilai", "Ibadah", "Adab"], rows: asr.map(a => { const dd = dataAsrama(L.santriAsrama(a.id), p.rg), ku = L.kinerjaMut(a.id, p.rg);
          return [a.nama, (L.staffById(a.musyrif) || {}).nama || "—", dd.length, P(ku.pct), ku.menyusul, ku.hariLibur, P(rata(dd.map(o => o.m.ibadah))), P(rata(dd.map(o => o.m.adab)))]; }) },
          ...asr.map(a => ({ judul: `Asrama ${a.nama} · per santri`, kol: ["Santri", "Kelas", "Ibadah", "Adab", "Predikat"],
            rows: dataAsrama(L.santriAsrama(a.id), p.rg).map(o => [o.s.nama, o.s.kelas, P(o.m.ibadah), P(o.m.adab), o.mut == null ? "—" : L.predikatMut(o.mut).h]) }))] })} /></div>`;
}

// ================= KESANTRIAN (izin & pelanggaran) =================
const dataKes = (list, rg) => list.map(s => { const pl = L.pelanggaranDalam(s.id, rg), iz = L.izinDalam(s.id, rg); return { s, pl, iz, poin: pl.poinRingan + pl.poinSB }; });
export function RekapKesantrian({ pondok, aid }) {
  useApp();
  const lk = lingkup(), p = usePeriode("bulanan", null, "asrama");
  const asr = aid ? [L.asramaById(aid)] : lk.pondok.length ? L.ASRAMA.filter(a => (pondok ? a.pondok === pondok : lk.pondok.includes(a.pondok))) : lk.asr;
  if (!asr.length || !asr[0]) return kosong("Rekap Kesantrian", "Tidak ada data kesantrian untuk akun ini.");
  const satu = asr.length === 1, d = dataKes(asr.flatMap(a => L.santriAsrama(a.id)), p.rg);
  const judul = satu ? "Kesantrian · Asrama " + asr[0].nama : pondok ? "Rekap Kesantrian · Pondok " + pondok : "Rekap Kesantrian";
  const izin = jml(d, o => o.iz.n), telat = jml(d, o => o.iz.telat), ri = jml(d, o => o.pl.ringan), se = jml(d, o => o.pl.sedang), be = jml(d, o => o.pl.berat), poin = jml(d, o => o.poin);
  const perA = f => asr.map(a => { const dd = dataKes(L.santriAsrama(a.id), p.rg); return { a, dd, ...f(dd) }; });
  const subS = o => `Kelas ${o.s.kelas} · ${L.asramaAman(o.s.asrama).nama}`, subA = x => `${(L.staffById(x.a.musyrif) || {}).pendek || "—"} · Pondok ${x.a.pondok}`;
  const ALH = "Alhamdulillah, tidak ada catatan pada periode ini.";
  return html`<${SubHeader} title=${judul} sub=${`Izin & pelanggaran · ${d.length} santri`} />
    <div class="wrap rp-wrap">${p.bar}
      <${EvalRekap} kunci=${p.jenis + p.rg.dari + 5} buat=${() => denganLalu(x => evKesantrian(asr.flatMap(a => L.santriAsrama(a.id)), x), p.jenis, p.rg)} />
      <${Panel} ic="door" warna="biru" judul="Izin keluar" ket=${`${d.filter(o => o.iz.n).length} santri izin`} besar=${`${izin}×`}
        rows=${satu ? d.filter(o => o.iz.n).map(o => ({ nama: o.s.nama, sub: subS(o), nilai: o.iz.n, v: `${o.iz.n}×` })) : perA(dd => ({ n: jml(dd, o => o.iz.n) })).map(x => ({ nama: "Asrama " + x.a.nama, sub: subA(x), nilai: x.n, v: `${x.n}×` }))} kosongT=${ALH} />
      <${Panel} ic="clock" warna="merah" judul="Terlambat kembali" ket=${izin ? `${pct(telat, izin)}% dari izin` : "Dari izin keluar"} besar=${`${telat}×`} besarNada=${telat ? "merah" : "hijau"}
        rows=${d.filter(o => o.iz.telat).map(o => ({ nama: o.s.nama, sub: subS(o), nilai: o.iz.telat, v: `${o.iz.telat}×`, nada: "merah" }))} kosongT="Tidak ada santri yang terlambat kembali." />
      <${Panel} ic="alert" warna="emas" judul="Pelanggaran (BAP)" ket=${`Ringan ${ri} · Sedang ${se} · Berat ${be}`} besar=${`${ri + se + be}`} besarNada=${se + be ? "merah" : ri ? "emas" : "hijau"}
        rows=${satu ? d.filter(o => o.pl.ringan + o.pl.sedang + o.pl.berat).map(o => ({ nama: o.s.nama, sub: o.pl.bap.map(b => b.pelanggaranNama).join(", ") || subS(o), nilai: o.pl.ringan + o.pl.sedang + o.pl.berat, v: `${o.pl.ringan + o.pl.sedang + o.pl.berat}×`, nada: o.pl.sedang + o.pl.berat ? "merah" : "emas" }))
          : perA(dd => ({ r: jml(dd, o => o.pl.ringan), s: jml(dd, o => o.pl.sedang), b: jml(dd, o => o.pl.berat) })).map(x => ({ nama: "Asrama " + x.a.nama, sub: `Ringan ${x.r} · Sedang ${x.s} · Berat ${x.b}`, nilai: x.r + x.s + x.b, v: `${x.r + x.s + x.b}×`, nada: x.s + x.b ? "merah" : "emas" }))} kosongT=${ALH} />
      <${Panel} ic="star" warna="merah" judul="Poin pelanggaran" ket=${`${d.filter(o => o.poin).length} santri memiliki poin`} besar=${String(poin)} besarNada=${poin ? "merah" : "hijau"}
        rows=${d.filter(o => o.poin).map(o => ({ nama: o.s.nama, sub: subS(o), nilai: o.poin, v: `${o.poin} poin`, nada: "merah" }))} batas=${10} kosongT=${ALH}
        catatan="Semua pelanggaran (ringan, sedang, berat) berasal dari BAP Kesantrian. Izin dihitung dari tanggal keluar." />
      <${Unduhan} judul=${judul} rg=${p.rg} ttd="kesantrian" tabel=${() => ({ catatan: "Semua pelanggaran berasal dari BAP Kesantrian.",
        bagian: [{ judul: "Per asrama", kol: ["Asrama", "Pondok", "Santri", "Izin", "Terlambat", "Ringan", "Sedang", "Berat", "Total poin"], rows: asr.map(a => { const dd = dataKes(L.santriAsrama(a.id), p.rg);
          return [a.nama, a.pondok, dd.length, jml(dd, o => o.iz.n), jml(dd, o => o.iz.telat), jml(dd, o => o.pl.ringan), jml(dd, o => o.pl.sedang), jml(dd, o => o.pl.berat), jml(dd, o => o.poin)]; }) },
          { judul: "Santri yang tercatat", kol: ["Santri", "Kelas", "Asrama", "Izin", "Terlambat", "Ringan", "Sedang", "Berat", "Poin", "Pelanggaran BAP"],
            rows: d.filter(o => o.poin || o.iz.n).sort((a, b) => b.poin - a.poin).map(o => [o.s.nama, o.s.kelas, L.asramaAman(o.s.asrama).nama, o.iz.n, o.iz.telat, o.pl.ringan, o.pl.sedang, o.pl.berat, o.poin, o.pl.bap.map(b => b.pelanggaranNama).join("; ") || "—"]) }] })} /></div>`;
}

// Pintu masuk lama nav.go("rekap", { modul }) → rekap modul yang sesuai
export function RekapPintu({ modul, tab }) {
  const m = modul || { tahfidz: "tahfidz", halaqah: "tahfidz", mapel: "mapel", kbm: "kurikulum", mut: "asrama", pelanggaran: "kesantrian" }[tab] || "tahfidz";
  if (m === "tahfidz") return html`<${RekapTahfidz} />`;
  if (m === "mapel" || m === "kurikulum") return html`<${RekapMapel} modul=${m} />`;
  if (m === "asrama") return html`<${RekapAsrama} />`;
  return html`<${RekapKesantrian} />`;
}
export function RekapDetailPintu({ jenis, hid, aid, mapel, kelas, pondok }) {
  if (jenis === "tahfidz" || jenis === "halaqah") return html`<${RekapTahfidz} hid=${hid} />`;
  if (jenis === "mapel") return html`<${RekapMapel} mapel=${mapel} kelas=${kelas} />`;
  if (jenis === "mut" || jenis === "motd") return html`<${RekapAsrama} aid=${aid} />`;
  return html`<${RekapKesantrian} aid=${aid} pondok=${pondok} />`;
}
