// Mesin evaluasi: satu sumber angka untuk Laporan Berkala, semua layar Rekap, dan Asisten AI.
// Setiap fungsi ev*() mengembalikan bentuk yang sama:
//   { kunci, judul, ikon, ringkas: [{ k, label, v, teks, sat, lalu, naikBaik, nada }], kesimpulan: [teks],
//     perhatian: [{ id, jenis, nama, sub, isu: [teks], skor }], baik: [{ id, jenis, nama, sub, t }], rinci: { kol, rows }, catatan, kosong }
// Hanya membaca data (tidak menulis). Angka dihitung langsung dari data sehingga koreksi susulan ikut masuk.
import { all, get } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { rekapKhidmah } from "./s_khidmah.js";

export const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
export const rata = xs => { const v = xs.filter(x => x != null && !isNaN(x)); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
const jml = (xs, f) => xs.reduce((n, x) => n + (f(x) || 0), 0);
const P = v => (v == null ? "—" : v + "%");
const hal = baris => L.fmtHal((baris || 0) / 15);
export const nadaPct = v => (v == null ? "mut" : v >= 90 ? "hijau" : v >= 75 ? "biru" : v >= 60 ? "emas" : "merah");
const dowJS = t => L.parseYmd(t).getDay();
const nmPendek = n => String(n || "").split(" ").slice(0, 2).join(" ");
const daftarNama = (xs, n = 3) => xs.slice(0, n).map(x => `${nmPendek(x.nama)} (${x.v})`).join(", ") + (xs.length > n ? `, dan ${xs.length - n} lainnya` : "");

// ---------- periode ----------
export const JENIS_LABEL = { harian: "Harian", pekanan: "Pekanan", bulanan: "Bulanan", mid: "Tengah Semester", semester: "Semester", tahunan: "Tahunan" };
export const LALU_LABEL = { harian: "kemarin", pekanan: "pekan lalu", bulanan: "bulan lalu", mid: "mid semester lalu", semester: "semester lalu" };
export function rgSebelum(jenis, rg) {
  if (!rg || jenis === "tahunan") return null;
  const p = L.periodeRange(jenis, L.addDays(rg.dari, -1));
  if (!p || p.dari === rg.dari || L.rentangHitung(p).kosong) return null;
  return p;
}
// Seberapa jauh periode sudah berjalan (untuk target yang dibagi rata): hari aktif terhitung / hari aktif penuh
function porsiBerjalan(rg, jenis = "halaqah", saring = () => true) {
  const ada = L.hariAktifDalam(rg, jenis).filter(saring).length;
  let penuh = 0; for (let t = rg.dari; t <= rg.sampai; t = L.addDays(t, 1)) if (L.hariAktif(t, jenis) && saring(t)) penuh++;
  return penuh ? Math.min(1, ada / penuh) : 0;
}

// ---------- pembanding dengan periode lalu ----------
function tempelLalu(ev, evLalu) {
  if (!evLalu) return ev;
  const m = new Map(evLalu.ringkas.map(r => [r.k, r]));
  ev.ringkas.forEach(r => { const l = m.get(r.k); if (l && l.v != null && r.v != null) r.lalu = l.v; });
  return ev;
}
export function selisihTeks(r, laluLabel = "periode lalu") {
  if (r.lalu == null || r.v == null) return null;
  const d = Math.round((r.v - r.lalu) * 10) / 10; if (!d) return `sama dengan ${laluLabel}`;
  const sat = r.sat === "%" ? " poin" : r.satLalu || "";
  return `${d > 0 ? "naik" : "turun"} ${Math.abs(d).toLocaleString("id-ID")}${sat} dari ${laluLabel}`;
}
export const selisihBaik = r => (r.lalu == null || r.v == null || r.v === r.lalu ? null : (r.v > r.lalu) === (r.naikBaik !== false));

// ================= TAHFIDZ =================
// Per santri: kehadiran halaqah, hari hadir tanpa setor ziyadah / murojaah, ziyadah vs target, diulang, tasmi'.
// Ziyadah & murojaah diharapkan Senin–Jumat (Sabtu khusus manzil). Hari santri tidak hadir/izin tidak dihitung "tidak setor".
function indeksTahsin() { const m = new Map(); all("tahsin").forEach(x => { if (x.jenis !== "baca") return; let s = m.get(x.santri); if (!s) m.set(x.santri, (s = new Set())); s.add(x.tanggal); }); return m; }
export function tahfidzSantri(s, rg, jenis, ctx = {}) {
  const x = L.tahfidzDalam(s.id, rg), iq = L.santriIqra(s), kh = x.kh;
  const hari = L.hariAktifDalam(rg, "halaqah").filter(t => dowJS(t) !== 6);
  const set = L.setoranSantri(s.id), perHari = new Map();
  set.forEach(r => { if (r.tanggal < (hari[0] || "9") || r.tanggal > (hari[hari.length - 1] || "0")) return; let o = perHari.get(r.tanggal); if (!o) perHari.set(r.tanggal, (o = { z: 0, m: 0, ulang: 0 })); if (r.jenis === "ziyadah") { o.z++; if (!r.lulus) o.ulang++; } if (r.jenis === "murojaah") o.m++; });
  const th = (ctx.tahsin || indeksTahsin()).get(s.id) || new Set();
  let hadir = 0, tanpaZ = 0, tanpaM = 0, tanpaT = 0, ulang = 0; const tglTanpaZ = [];
  hari.forEach(t => {
    const st = L.sesiHari(t).map(se => { const d = get("absenHalaqah", L.halaqahKey(s.halaqah, t, se)); return d && d.status ? d.status[s.id] : null; });
    const o = perHari.get(t), adaSetor = o && (o.z || o.m);
    if (!st.includes("H") && !adaSetor) return; // tidak hadir / izin / belum diabsen tanpa setoran
    hadir++; if (o) ulang += o.ulang;
    if (iq) { if (!th.has(t)) tanpaT++; return; }
    if (!o || !o.z) { tanpaZ++; tglTanpaZ.push(t); }
    if (!o || !o.m) tanpaM++;
  });
  const tg = ctx.tgBaris != null ? ctx.tgBaris : Math.round(L.targetHal(jenis || "pekanan") * 15 * porsiBerjalan(rg, "halaqah", t => dowJS(t) !== 6));
  return { s, x, iq, kh, hadir, tanpaZ, tanpaM, tanpaT, ulang, tglTanpaZ, tg, capai: !iq && tg > 0 && x.zBaris >= tg, pctTarget: !iq && tg ? Math.min(999, Math.round((x.zBaris / tg) * 100)) : null };
}
export function evTahfidz(list, rg, { jenis = "bulanan", judul = "Tahfidz", lalu = true, kinerjaHalaqah = null } = {}) {
  const ctx = { tahsin: indeksTahsin() };
  const tgBaris = Math.round(L.targetHal(jenis) * 15 * porsiBerjalan(rg, "halaqah", t => dowJS(t) !== 6)); ctx.tgBaris = tgBaris;
  const d = list.map(s => tahfidzSantri(s, rg, jenis, ctx)), q = d.filter(o => !o.iq), iqro = d.filter(o => o.iq);
  const kh = rata(d.map(o => o.kh.pct)), baris = jml(q, o => o.x.zBaris), capai = q.filter(o => o.capai).length;
  const tz = jml(q, o => o.tanpaZ), tm = jml(q, o => o.tanpaM), alpa = jml(d, o => o.kh.A), muro = jml(q, o => o.x.muroHal), tasmi = jml(d, o => o.x.tasmiLulus.length);
  const hqs = kinerjaHalaqah || [...new Set(list.map(s => s.halaqah).filter(Boolean))];
  const kin = hqs.map(h => L.kinerjaHalaqah(h, rg)), absenGuru = pct(jml(kin, k => k.isi), jml(kin, k => k.sesi));
  const ev = { kunci: "tahfidz", judul, ikon: "book", kosong: !d.some(o => o.hadir || o.kh.tot),
    ringkas: [
      { k: "kh", label: "Kehadiran halaqah", v: kh, teks: P(kh), sat: "%", nada: nadaPct(kh) },
      q.length ? { k: "zi", label: "Ziyadah", v: Math.round(baris / 15 * 10) / 10, teks: hal(baris), satLalu: " hal", ket: `${capai}/${q.length} santri capai target` , nada: q.length && capai / q.length >= 0.75 ? "hijau" : capai ? "emas" : "merah" } : null,
      q.length ? { k: "tz", label: "Tidak setor ziyadah", v: tz, teks: `${tz}×`, satLalu: "×", naikBaik: false, ket: "hari hadir tanpa ziyadah", nada: tz ? "merah" : "hijau" } : null,
      q.length ? { k: "mu", label: "Murojaah", v: muro, teks: `${muro} hal`, satLalu: " hal", ket: `${tm}× hari tanpa murojaah`, nada: "biru" } : null,
      absenGuru != null ? { k: "ag", label: "Absen guru terisi", v: absenGuru, teks: P(absenGuru), sat: "%", nada: nadaPct(absenGuru) } : null,
    ].filter(Boolean), kesimpulan: [], perhatian: [], baik: [] };
  // perhatian per santri
  d.forEach(o => {
    const isu = [], tgH = L.fmtHal(o.tg / 15); let skor = 0;
    if (o.kh.A) { isu.push(`Alpa ${o.kh.A} sesi`); skor += o.kh.A * 3; }
    if (!o.iq) {
      if (o.tanpaZ >= 2 || (o.hadir >= 3 && o.tanpaZ / o.hadir >= 0.3)) { isu.push(`${o.tanpaZ}× tidak setor ziyadah`); skor += o.tanpaZ * 2; }
      if (o.tanpaM >= 2 && o.tanpaM / Math.max(1, o.hadir) >= 0.4) { isu.push(`${o.tanpaM}× tidak murojaah`); skor += o.tanpaM; }
      if (o.tg > 0 && o.x.zBaris < o.tg / 2) { isu.push(o.x.zBaris ? `Ziyadah ${hal(o.x.zBaris)} dari target ${tgH}` : `Belum ada ziyadah (target ${tgH})`); skor += 3; }
      if (o.ulang >= 2) { isu.push(`Ziyadah diulang ${o.ulang}×`); skor += o.ulang; }
    } else if (o.tanpaT >= 2) { isu.push(`${o.tanpaT}× tidak membaca Iqro'`); skor += o.tanpaT * 2; }
    if (isu.length) ev.perhatian.push({ id: o.s.id, jenis: "santri", nama: o.s.nama, sub: `Kelas ${o.s.kelas} · ${L.namaHalaqah(o.s)}`, isu, skor });
    const bk = [];
    if (o.capai) bk.push(`Ziyadah ${hal(o.x.zBaris)}, target tercapai`);
    if (o.x.tasmiLulus.length) bk.push(`Lulus tasmi' juz ${o.x.tasmiLulus.join(", ")}`);
    if (!o.iq && o.hadir >= 3 && !o.tanpaZ && !o.kh.A) bk.push("Setor ziyadah setiap hari hadir");
    if (bk.length) ev.baik.push({ id: o.s.id, jenis: "santri", nama: o.s.nama, sub: `Kelas ${o.s.kelas} · ${L.namaHalaqah(o.s)}`, t: bk.join(" · "), skor: bk.length * 10 + (o.x.zBaris || 0) / 15 });
  });
  ev.perhatian.sort((a, b) => b.skor - a.skor); ev.baik.sort((a, b) => b.skor - a.skor);
  // kesimpulan
  const K = ev.kesimpulan;
  if (ev.kosong) K.push("Belum ada absen maupun setoran yang tercatat pada periode ini.");
  else {
    K.push(`Kehadiran halaqah ${P(kh)}${alpa ? `, dengan ${alpa} sesi alpa` : ", tanpa alpa"}.`);
    if (q.length) K.push(`${capai} dari ${q.length} santri mencapai target ziyadah ${L.fmtHal(tgBaris / 15)} untuk periode ini; total hafalan baru ${hal(baris)}.`);
    const tidakSetor = q.filter(o => o.tanpaZ >= 2).sort((a, b) => b.tanpaZ - a.tanpaZ).map(o => ({ nama: o.s.nama, v: o.tanpaZ + "×" }));
    if (tidakSetor.length) K.push(`${tidakSetor.length} santri tidak setor ziyadah 2 hari atau lebih: ${daftarNama(tidakSetor)}.`);
    else if (q.length) K.push("Tidak ada santri yang tidak setor ziyadah 2 hari atau lebih.");
    const tanpaMuro = q.filter(o => o.tanpaM >= 2 && o.tanpaM / Math.max(1, o.hadir) >= 0.4).length;
    if (tanpaMuro) K.push(`${tanpaMuro} santri jarang murojaah (lebih dari 40% hari hadir tanpa murojaah).`);
    if (iqro.length) K.push(`${iqro.length} santri masih Iqro'; ${iqro.filter(o => o.tanpaT >= 2).length} di antaranya tidak membaca 2 hari atau lebih.`);
    if (absenGuru != null && absenGuru < 90) K.push(`Absen halaqah oleh guru baru terisi ${absenGuru}% sesi; sesi kosong membuat kehadiran santri tampak lebih rendah.`);
    if (tasmi) K.push(`Alhamdulillah, ${tasmi} juz lulus tasmi' pada periode ini.`);
  }
  ev.rinci = { kol: ["Santri", "Kelas", "Halaqah", "Hadir", "Alpa", "Ziyadah", "Target", "Tidak setor", "Tidak murojaah", "Murojaah", "Diulang", "Tasmi'"],
    rows: d.map(o => [o.s.nama, o.s.kelas, L.namaHalaqah(o.s), P(o.kh.pct), o.kh.A, o.iq ? "Iqro'" : hal(o.x.zBaris), o.iq ? "—" : L.fmtHal(o.tg / 15), o.iq ? `${o.tanpaT}× (Iqro')` : `${o.tanpaZ}×`, o.iq ? "—" : `${o.tanpaM}×`, o.iq ? "—" : `${o.x.muroHal} hal`, o.ulang, o.x.tasmiLulus.length ? "Juz " + o.x.tasmiLulus.join(", ") : "—"]) };
  ev.catatan = "Tidak setor = hari halaqah Senin–Jumat ketika santri hadir tetapi tidak ada setoran ziyadah/murojaah. Hari santri sakit, izin, atau alpa tidak dihitung di sini (alpa dicatat tersendiri). Target dibagi rata sesuai hari aktif yang sudah berjalan. 15 baris = 1 halaman, 20 halaman = 1 juz.";
  ev.data = d;
  return ev;
}

// ================= MUTABA'AH ASRAMA =================
export function mutSantri(s, rg) {
  const m = L.mutPersen(s.id, rg), { dinilai } = L.hariMutSantri(s.id, rg), luput = {};
  dinilai.forEach(t => { const doc = get("mutabaah", L.mutKey(s.id, t)); if (!doc) return; const ada = new Set(doc.ibadah || []);
    L.ibadahHari(t).forEach(([nama, i]) => { if (!ada.has(i)) luput[nama] = (luput[nama] || 0) + 1; }); });
  const sering = Object.entries(luput).sort((a, b) => b[1] - a[1]);
  return { s, m, sering, nilai: m.ibadah == null ? null : Math.round((m.ibadah + m.adab) / 2) };
}
const singkatIbadah = n => n.replace(/^Sholat /, "").replace(/ takbiratul ihram bersama imam/, " berjamaah").replace(/ 2 rakaat sebelum Shubuh/, "Qabliyah Shubuh");
export function evAsrama(list, rg, { judul = "Mutaba'ah asrama", asrama = null } = {}) {
  const d = list.map(s => mutSantri(s, rg)), ib = rata(d.map(o => o.m.ibadah)), ad = rata(d.map(o => o.m.adab));
  const asr = asrama || [...new Set(list.map(s => s.asrama))].map(L.asramaById).filter(Boolean);
  const ku = asr.map(a => L.kinerjaMut(a.id, rg)), terisi = pct(jml(ku, k => k.isi), jml(ku, k => k.target));
  const luput = {}; d.forEach(o => o.sering.forEach(([n, c]) => (luput[n] = (luput[n] || 0) + c)));
  const hariIsi = jml(d, o => o.m.isi), seringAll = Object.entries(luput).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const ev = { kunci: "asrama", judul, ikon: "moon", kosong: !hariIsi,
    ringkas: [
      { k: "ib", label: "Ibadah", v: ib, teks: P(ib), sat: "%", nada: nadaPct(ib) },
      { k: "ad", label: "Adab", v: ad, teks: P(ad), sat: "%", nada: nadaPct(ad) },
      { k: "mt", label: "Mutaba'ah terisi", v: terisi, teks: P(terisi), sat: "%", nada: nadaPct(terisi) },
    ], kesimpulan: [], perhatian: [], baik: [] };
  d.forEach(o => {
    const isu = []; let skor = 0;
    if (o.m.ibadah != null && o.m.ibadah < 75) { isu.push(`Ibadah ${o.m.ibadah}%`); skor += (75 - o.m.ibadah) / 5; }
    if (o.m.adab != null && o.m.adab < 75) { isu.push(`Adab ${o.m.adab}%`); skor += (75 - o.m.adab) / 5; }
    const top = o.sering.filter(([, c]) => o.m.isi && c / o.m.isi >= 0.5).slice(0, 2);
    if (top.length) { isu.push("Sering terlewat: " + top.map(([n, c]) => `${singkatIbadah(n)} ${c}×`).join(", ")); skor += top.length; }
    if (isu.length) ev.perhatian.push({ id: o.s.id, jenis: "santri", nama: o.s.nama, sub: `Kelas ${o.s.kelas} · Asrama ${L.asramaAman(o.s.asrama).nama}`, isu, skor });
    if (o.nilai != null && o.nilai >= 95 && o.m.isi >= 3) ev.baik.push({ id: o.s.id, jenis: "santri", nama: o.s.nama, sub: `Kelas ${o.s.kelas} · Asrama ${L.asramaAman(o.s.asrama).nama}`, t: `Ibadah ${o.m.ibadah}% · adab ${o.m.adab}%`, skor: o.nilai });
  });
  ev.perhatian.sort((a, b) => b.skor - a.skor); ev.baik.sort((a, b) => b.skor - a.skor);
  const K = ev.kesimpulan;
  if (ev.kosong) K.push("Belum ada mutaba'ah yang diisi pada periode ini.");
  else {
    K.push(`Rata-rata ibadah ${P(ib)} dan adab ${P(ad)} (${L.predikatMut(rata([ib, ad])).t.toLowerCase()}).`);
    if (seringAll.length) K.push(`Amalan yang paling sering terlewat: ${seringAll.map(([n, c]) => `${singkatIbadah(n)} (${c}×)`).join(", ")}.`);
    const rendah = d.filter(o => o.m.ibadah != null && o.m.ibadah < 75).length;
    K.push(rendah ? `${rendah} santri ibadahnya di bawah 75%.` : "Semua santri ibadahnya 75% ke atas.");
    if (terisi != null && terisi < 90) K.push(`Mutaba'ah baru terisi ${terisi}% dari hari yang harus diisi; hari kosong menurunkan nilai santri.`);
  }
  ev.rinci = { kol: ["Santri", "Kelas", "Asrama", "Ibadah", "Adab", "Hari diisi", "Hari kosong", "Sering terlewat"],
    rows: d.map(o => [o.s.nama, o.s.kelas, L.asramaAman(o.s.asrama).nama, P(o.m.ibadah), P(o.m.adab), o.m.isi, o.m.kosong, o.sering.slice(0, 2).map(([n, c]) => `${singkatIbadah(n)} ${c}×`).join(", ") || "—"]) };
  ev.catatan = "Mutaba'ah dinilai Senin–Jumat. Hari wali asrama berhalangan atau santri izin tidak dihitung. Sering terlewat = amalan yang tidak dicentang pada setengah atau lebih dari hari yang diisi.";
  ev.data = d;
  return ev;
}

// ================= KESANTRIAN (izin & pelanggaran) =================
export function evKesantrian(list, rg, { judul = "Izin & pelanggaran", rinciBap = true } = {}) {
  const d = list.map(s => { const pl = L.pelanggaranDalam(s.id, rg), iz = L.izinDalam(s.id, rg); return { s, pl, iz, n: pl.ringan + pl.sedang + pl.berat, poin: pl.poinRingan + pl.poinSB, total: L.poinSantri(s.id).total }; });
  const izin = jml(d, o => o.iz.n), telat = jml(d, o => o.iz.telat), pel = jml(d, o => o.n), sb = jml(d, o => o.pl.sedang + o.pl.berat), poin = jml(d, o => o.poin);
  const aktif = L.izinAktif().filter(i => list.some(s => s.id === i.santri)), belumKembali = aktif.filter(L.terlambat);
  const ev = { kunci: "kesantrian", judul, ikon: "shield", kosong: !izin && !pel,
    ringkas: [
      { k: "iz", label: "Izin keluar", v: izin, teks: `${izin}×`, satLalu: "×", naikBaik: false, nada: "biru" },
      { k: "tl", label: "Terlambat kembali", v: telat, teks: `${telat}×`, satLalu: "×", naikBaik: false, nada: telat ? "merah" : "hijau" },
      { k: "pl", label: "Pelanggaran", v: pel, teks: `${pel}`, satLalu: "", naikBaik: false, ket: sb ? `${sb} sedang/berat` : "semua ringan", nada: sb ? "merah" : pel ? "emas" : "hijau" },
      { k: "po", label: "Poin baru", v: poin, teks: String(poin), satLalu: " poin", naikBaik: false, nada: poin ? "merah" : "hijau" },
    ], kesimpulan: [], perhatian: [], baik: [] };
  d.forEach(o => {
    const isu = []; let skor = 0;
    if (o.iz.telat) { isu.push(`Terlambat kembali ${o.iz.telat}×`); skor += o.iz.telat * 3; }
    if (o.pl.berat) { isu.push(`${o.pl.berat} pelanggaran berat`); skor += o.pl.berat * 8; }
    if (o.pl.sedang) { isu.push(`${o.pl.sedang} pelanggaran sedang`); skor += o.pl.sedang * 4; }
    if (o.pl.ringan) { isu.push(`${o.pl.ringan} pelanggaran ringan`); skor += o.pl.ringan; }
    if (rinciBap && o.pl.bap.length) isu.push(o.pl.bap.map(b => b.pelanggaranNama || b.pelanggaran).filter(Boolean).slice(0, 3).join(", "));
    if (o.iz.n >= 3) { isu.push(`Izin ${o.iz.n}× dalam periode ini`); skor += 1; }
    if (o.total >= 50) { isu.push(`Total poin ${o.total}`); skor += 2; }
    if (isu.length) ev.perhatian.push({ id: o.s.id, jenis: "santri", nama: o.s.nama, sub: `Kelas ${o.s.kelas} · Asrama ${L.asramaAman(o.s.asrama).nama}`, isu, skor });
  });
  ev.perhatian.sort((a, b) => b.skor - a.skor);
  const bersih = d.filter(o => !o.n && !o.iz.telat).length;
  if (d.length && bersih === d.length) ev.baik.push({ id: null, jenis: "grup", nama: "Semua santri", sub: `${d.length} santri`, t: "Tidak ada pelanggaran maupun keterlambatan" });
  const K = ev.kesimpulan;
  K.push(`${izin} izin keluar${telat ? `, ${telat} di antaranya terlambat kembali` : ", semuanya kembali tepat waktu"}.`);
  K.push(pel ? `${pel} pelanggaran tercatat dari ${d.filter(o => o.n).length} santri${sb ? `, ${sb} di antaranya sedang/berat` : ""}.` : "Alhamdulillah, tidak ada pelanggaran tercatat.");
  if (belumKembali.length) K.push(`Saat ini ${belumKembali.length} santri melewati batas waktu izin dan belum kembali.`);
  if (aktif.length) K.push(`${aktif.length} santri sedang izin di luar pondok.`);
  ev.rinci = { kol: ["Santri", "Kelas", "Asrama", "Izin", "Terlambat", "Ringan", "Sedang", "Berat", "Poin periode", "Total poin"],
    rows: d.filter(o => o.n || o.iz.n || o.total).sort((a, b) => b.poin - a.poin || b.iz.n - a.iz.n).map(o => [o.s.nama, o.s.kelas, L.asramaAman(o.s.asrama).nama, o.iz.n, o.iz.telat, o.pl.ringan, o.pl.sedang, o.pl.berat, o.poin, o.total]) };
  ev.catatan = "Pelanggaran berasal dari BAP Kesantrian. Izin dihitung dari tanggal keluar. Total poin = akumulasi sejak awal pemakaian aplikasi.";
  ev.data = d;
  return ev;
}

// ================= MAPEL (KBM & nilai) =================
const namaMp = mp => (L.mapelById(mp) || { nama: mp }).nama;
const pengampuDari = (mp, k) => (L.jadwalAll().find(j => j.mapel === mp && j.kelas === k) || {}).guru || ((L.pengampu(mp, k) || {}).id);
export function evMapel(pairs, rg, { judul = "Mapel & KBM", nilai = false } = {}) {
  const per = pairs.map(([mp, k]) => { const g = pengampuDari(mp, k), kj = L.kinerjaMapel(g, rg, k); return { mp, k, g, kj, ss: L.santriKelas(k) }; });
  const santri = new Map(), khMemo = new Map(), khDari = (sid, mp) => { const k = sid + "|" + mp; let v = khMemo.get(k); if (!v) khMemo.set(k, (v = L.kehadiranKelas(sid, mp, rg))); return v; };
  per.forEach(p => p.ss.forEach(s => { const kh = khDari(s.id, p.mp), na = nilai ? L.nilaiAkhir(s.id, p.mp) : null;
    let o = santri.get(s.id); if (!o) santri.set(s.id, (o = { s, alpa: [], kh: [], bawah: [], kosong: [] }));
    if (kh.A) o.alpa.push([namaMp(p.mp), kh.A]); if (kh.pct != null) o.kh.push(kh.pct);
    if (na && na.akhir != null && na.akhir < L.KKM) o.bawah.push([namaMp(p.mp), na.akhir]);
    if (na && (na.uts == null || na.uts === "") ) o.kosong.push(namaMp(p.mp)); }));
  const sesi = jml(per, p => p.kj.sesi), absen = jml(per, p => p.kj.absen), jur = jml(per, p => p.kj.jurnal);
  const khAll = rata([...santri.values()].map(o => rata(o.kh))), alpa = jml([...santri.values()], o => jml(o.alpa, a => a[1]));
  const bawahN = jml([...santri.values()], o => o.bawah.length);
  const ev = { kunci: "mapel", judul, ikon: "clipboard", kosong: !absen,
    ringkas: [
      { k: "kh", label: "Kehadiran kelas", v: khAll, teks: P(khAll), sat: "%", nada: nadaPct(khAll) },
      { k: "tl", label: "Pertemuan terlaksana", v: pct(absen, sesi), teks: P(pct(absen, sesi)), sat: "%", ket: `${absen} dari ${sesi}`, nada: nadaPct(pct(absen, sesi)) },
      { k: "ju", label: "Jurnal terisi", v: pct(jur, sesi), teks: P(pct(jur, sesi)), sat: "%", nada: nadaPct(pct(jur, sesi)) },
      nilai ? { k: "kk", label: "Nilai di bawah KKM", v: bawahN, teks: String(bawahN), satLalu: "", naikBaik: false, nada: bawahN ? "merah" : "hijau" } : null,
    ].filter(Boolean), kesimpulan: [], perhatian: [], baik: [] };
  santri.forEach(o => {
    const isu = []; let skor = 0;
    o.alpa.forEach(([m, n]) => { isu.push(`Alpa ${n}× di ${m}`); skor += n * 2; });
    o.bawah.forEach(([m, v]) => { isu.push(`${m} ${v} (di bawah KKM)`); skor += 3; });
    if (isu.length) ev.perhatian.push({ id: o.s.id, jenis: "santri", nama: o.s.nama, sub: `Kelas ${o.s.kelas}`, isu, skor });
  });
  // pertemuan yang belum diabsen / jurnal kosong per kelas (bahan evaluasi pengampu)
  per.forEach(p => { const kurang = p.kj.sesi - p.kj.absen, jk = p.kj.absen - p.kj.jurnal, isu = [];
    if (kurang > 0) isu.push(`${kurang} pertemuan belum diabsen`); if (jk > 0) isu.push(`${jk} jurnal kosong`);
    if (isu.length && (kurang >= 2 || jk >= 2)) ev.perhatian.push({ id: p.g, jenis: "kelas", nama: `${namaMp(p.mp)} · Kelas ${p.k}`, sub: (L.staffById(p.g) || {}).nama || "Belum ada pengampu", isu, skor: kurang * 2 + jk }); });
  ev.perhatian.sort((a, b) => b.skor - a.skor);
  per.filter(p => p.kj.sesi >= 2 && p.kj.absen === p.kj.sesi && p.kj.jurnal === p.kj.sesi).forEach(p => ev.baik.push({ id: p.g, jenis: "kelas", nama: `${namaMp(p.mp)} · Kelas ${p.k}`, sub: (L.staffById(p.g) || {}).nama || "", t: "Semua pertemuan terlaksana dan jurnal lengkap" }));
  const K = ev.kesimpulan;
  if (ev.kosong) K.push("Belum ada pertemuan yang diabsen pada periode ini.");
  else {
    K.push(`${absen} dari ${sesi} pertemuan terjadwal sudah terlaksana (${P(pct(absen, sesi))}); jurnal terisi ${P(pct(jur, sesi))}.`);
    K.push(`Kehadiran santri di kelas ${P(khAll)}${alpa ? `, dengan ${alpa} kali alpa` : ", tanpa alpa"}.`);
    const sering = [...santri.values()].map(o => ({ nama: o.s.nama, n: jml(o.alpa, a => a[1]) })).filter(x => x.n >= 2).sort((a, b) => b.n - a.n).map(x => ({ nama: x.nama, v: x.n + "×" }));
    if (sering.length) K.push(`Santri yang alpa 2 kali atau lebih: ${daftarNama(sering)}.`);
    if (nilai) K.push(bawahN ? `${bawahN} nilai akhir masih di bawah KKM ${L.KKM}.` : `Semua nilai akhir yang sudah ada mencapai KKM ${L.KKM}.`);
  }
  ev.rinci = { kol: ["Mapel", "Kelas", "Pengampu", "Terlaksana", "Jurnal", "Kehadiran santri", "Alpa"],
    rows: per.map(p => { const ks = p.ss.map(s => khDari(s.id, p.mp)); return [namaMp(p.mp), p.k, (L.staffById(p.g) || {}).nama || "—", `${p.kj.absen}/${p.kj.sesi}`, `${p.kj.jurnal}/${p.kj.sesi}`, P(rata(ks.map(x => x.pct))), jml(ks, x => x.A)]; }) };
  ev.catatan = `Terlaksana = pertemuan yang sudah diabsen dibanding jadwal pada hari KBM aktif. Kehadiran santri hanya dari pertemuan yang diabsen.${nilai ? ` Nilai akhir = 50% PAS + 35% rata-rata aspek + 15% kehadiran; KKM ${L.KKM}.` : ""}`;
  return ev;
}

// ================= KINERJA GURU =================
// Untuk tiap guru: absen halaqah, KBM terlaksana, jurnal, mutaba'ah terisi, ceklis musyrif, izin.
export function kinerjaStaf(g, rg) {
  const tugas = [], hq = L.HALAQAH.filter(h => h.guru === g.id), asr = L.ASRAMA.filter(a => a.musyrif === g.id);
  hq.forEach(h => { const k = L.kinerjaHalaqah(h.id, rg); if (k.sesi) tugas.push({ t: `Absen ${h.nama}`, v: k.pct, ket: `${k.isi}/${k.sesi} sesi` }); });
  if ((g.ajar || []).length || L.jadwalAll().some(j => j.guru === g.id)) { const k = L.kinerjaMapel(g.id, rg); if (k.sesi) { tugas.push({ t: "KBM terlaksana", v: k.pct, ket: `${k.absen}/${k.sesi} pertemuan` }); tugas.push({ t: "Jurnal mengajar", v: k.pctJ, ket: `${k.jurnal}/${k.sesi}` }); } }
  asr.forEach(a => { const k = L.kinerjaMut(a.id, rg); if (k.target) tugas.push({ t: `Mutaba'ah ${a.nama}`, v: k.pct, ket: `${k.isi}/${k.target} santri-hari` });
    const c = rekapKhidmah(g.id, rg); if (c.pct != null) tugas.push({ t: "Ceklis musyrif", v: c.pct, ket: `${c.hariIsi}/${c.hari} hari` }); });
  const rh = L.rentangHitung(rg), izin = rh.kosong ? [] : all("izinGuru").filter(i => i.guru === g.id && i.tanggal >= rh.dari && i.tanggal <= rh.sampai);
  return { g, tugas, izin, skor: rata(tugas.map(x => x.v)) };
}
export function evKinerja(staf, rg, { judul = "Kinerja guru" } = {}) {
  const d = staf.map(g => kinerjaStaf(g, rg)).filter(x => x.tugas.length || x.izin.length);
  const sk = rata(d.map(x => x.skor)), izin = jml(d, x => x.izin.length);
  const ev = { kunci: "kinerja", judul, ikon: "users", kosong: !d.length,
    ringkas: [
      { k: "sk", label: "Rata-rata tugas terisi", v: sk, teks: P(sk), sat: "%", nada: nadaPct(sk) },
      { k: "pn", label: "Guru 90% ke atas", v: d.filter(x => x.skor != null && x.skor >= 90).length, teks: `${d.filter(x => x.skor != null && x.skor >= 90).length}/${d.length}`, satLalu: " guru", nada: "hijau" },
      { k: "iz", label: "Izin guru", v: izin, teks: `${izin}×`, satLalu: "×", naikBaik: false, nada: "biru" },
    ], kesimpulan: [], perhatian: [], baik: [] };
  d.forEach(x => {
    const kurang = x.tugas.filter(t => t.v != null && t.v < 80);
    if (kurang.length) ev.perhatian.push({ id: x.g.id, jenis: "guru", nama: x.g.nama, sub: L.ROLE_LABEL ? (x.g.roles || []).map(r => L.ROLE_LABEL[r] || r).join(", ") : "", isu: kurang.map(t => `${t.t} ${t.v}% (${t.ket})`), skor: jml(kurang, t => 100 - t.v) });
    if (x.tugas.length && x.tugas.every(t => t.v != null && t.v >= 95)) ev.baik.push({ id: x.g.id, jenis: "guru", nama: x.g.nama, sub: x.tugas.map(t => t.t).join(" · "), t: "Semua tugas terisi 95% ke atas", skor: x.skor });
  });
  ev.perhatian.sort((a, b) => b.skor - a.skor); ev.baik.sort((a, b) => b.skor - a.skor);
  const K = ev.kesimpulan;
  if (ev.kosong) K.push("Belum ada tugas guru yang bisa dinilai pada periode ini.");
  else {
    K.push(`Rata-rata tugas input guru terisi ${P(sk)}; ${ev.baik.length} guru menyelesaikan semua tugasnya 95% ke atas.`);
    if (ev.perhatian.length) K.push(`${ev.perhatian.length} guru masih di bawah 80% pada salah satu tugas: ${daftarNama(ev.perhatian.map(p => ({ nama: p.nama, v: p.isu[0].split(" (")[0].replace(/^.* (\d+%)$/, "$1") })))}.`);
    if (izin) K.push(`${izin} izin guru tercatat pada periode ini.`);
  }
  ev.rinci = { kol: ["Guru", "Tugas", "Terisi", "Keterangan", "Izin"], rows: d.flatMap(x => (x.tugas.length ? x.tugas : [{ t: "—", v: null, ket: "" }]).map((t, i) => [i ? "" : x.g.nama, t.t, P(t.v), t.ket, i ? "" : x.izin.length])) };
  ev.catatan = "Terisi = input yang dikerjakan dibanding yang seharusnya pada hari aktif (absen halaqah per sesi, absen & jurnal per pertemuan, mutaba'ah per santri per hari, ceklis musyrif per hari).";
  return ev;
}

// ================= WALI SANTRI (satu ananda) =================
export function evAnanda(s, rg, { jenis = "pekanan" } = {}) {
  const t = tahfidzSantri(s, rg, jenis), m = mutSantri(s, rg), iz = L.izinDalam(s.id, rg), kk = L.kehadiranKelas(s.id, null, rg), h = L.hafalan(s);
  const ev = { kunci: "ananda", judul: "Perkembangan ananda", ikon: "heart", kosong: !t.hadir && !m.m.isi && !kk.tot,
    ringkas: [
      { k: "zi", label: "Hafalan baru", v: Math.round(t.x.zBaris / 15 * 10) / 10, teks: t.iq ? "Iqro'" : hal(t.x.zBaris), satLalu: " hal", ket: t.iq ? "" : `target ${L.fmtHal(t.tg / 15)}`, nada: t.capai ? "hijau" : "emas" },
      { k: "kh", label: "Hadir halaqah", v: t.kh.pct, teks: P(t.kh.pct), sat: "%", nada: nadaPct(t.kh.pct) },
      { k: "ib", label: "Ibadah", v: m.m.ibadah, teks: P(m.m.ibadah), sat: "%", nada: nadaPct(m.m.ibadah) },
      { k: "kk", label: "Hadir kelas", v: kk.pct, teks: P(kk.pct), sat: "%", nada: nadaPct(kk.pct) },
    ], kesimpulan: [], perhatian: [], baik: [] };
  const nm = s.panggilan || s.nama.split(" ")[0], K = ev.kesimpulan;
  if (ev.kosong) K.push("Belum ada catatan pada periode ini.");
  else {
    K.push(t.iq ? `${nm} sedang belajar Iqro'. Total hafalan saat ini ${L.fmtJumlah(h)}.` : `${nm} menambah hafalan ${hal(t.x.zBaris)} (target ${L.fmtHal(t.tg / 15)}). Total hafalan saat ini ${L.fmtJumlah(h)}${h.khatam ? "" : `, sedang Juz ${h.aktif}`}.`);
    if (!t.iq && t.tanpaZ) K.push(`Ada ${t.tanpaZ} hari ${nm} hadir halaqah tetapi belum setor hafalan baru.`);
    if (m.m.ibadah != null) K.push(`Mutaba'ah ibadah ${P(m.m.ibadah)} dan adab ${P(m.m.adab)}.${m.sering[0] && m.m.isi && m.sering[0][1] / m.m.isi >= 0.5 ? ` Yang paling sering terlewat: ${singkatIbadah(m.sering[0][0])}.` : ""}`);
    if (iz.n) K.push(`${iz.n} kali izin keluar${iz.telat ? `, ${iz.telat} kali terlambat kembali` : ""}.`);
  }
  if (t.capai) ev.baik.push({ id: s.id, jenis: "santri", nama: nm, sub: "", t: "Target hafalan periode ini tercapai" });
  if (t.x.tasmiLulus.length) ev.baik.push({ id: s.id, jenis: "santri", nama: nm, sub: "", t: `Lulus tasmi' juz ${t.x.tasmiLulus.join(", ")}` });
  if (m.nilai != null && m.nilai >= 90) ev.baik.push({ id: s.id, jenis: "santri", nama: nm, sub: "", t: "Ibadah dan adab sangat baik" });
  const isu = [];
  if (t.kh.A) isu.push(`Tidak hadir halaqah tanpa keterangan ${t.kh.A} kali`);
  if (!t.iq && t.tg > 0 && t.x.zBaris < t.tg / 2) isu.push("Hafalan baru masih di bawah setengah target");
  if (m.m.ibadah != null && m.m.ibadah < 75) isu.push("Ibadah harian perlu dikuatkan");
  if (kk.A) isu.push(`Tidak hadir di kelas tanpa keterangan ${kk.A}×`);
  if (isu.length && !ev.kosong) ev.perhatian.push({ id: s.id, jenis: "santri", nama: nm, sub: "Mohon doa dan dukungan dari rumah", isu, skor: 1 });
  ev.labelPerhatian = "Perlu perhatian bersama"; ev.labelBaik = "Alhamdulillah";
  ev.catatan = "Ringkasan otomatis dari catatan ustadz di aplikasi. Untuk penjelasan lebih lanjut silakan menghubungi wali asrama.";
  return ev;
}

// ---------- pembungkus: hitung + bandingkan dengan periode lalu ----------
export function denganLalu(fn, jenis, rg) {
  const ev = fn(rg), rl = rgSebelum(jenis, rg);
  if (rl) { try { tempelLalu(ev, fn(rl)); ev.laluLabel = LALU_LABEL[jenis] || "periode lalu"; } catch (e) { } }
  return ev;
}
export { DATA };
