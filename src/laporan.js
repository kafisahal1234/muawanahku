// Laporan Berkala: terbit otomatis (dihitung di perangkat dari data terbaru, tanpa server)
//   Pekanan  : setiap Sabtu pukul 10.00 (Senin–Sabtu pekan itu)
//   Bulanan  : tanggal 29 pukul 10.00 (Februari: tanggal terakhir); angka terus mengikuti data sampai akhir bulan
//   Mid      : tanggal tengah semester pukul 10.00 (Kalender → setelan semester)
//   Semester : tanggal akhir semester pukul 10.00
//   Tahunan  : akhir tahun pelajaran pukul 10.00
// Isi menyesuaikan peran akun (guru halaqah, wali asrama, guru mapel, Wadir, Mudir, Yayasan, wali santri).
import { S } from "./store.js";
import { nav } from "./ui.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { evTahfidz, evAsrama, evKesantrian, evMapel, evKinerja, evAnanda, denganLalu, JENIS_LABEL, rgSebelum, LALU_LABEL } from "./evaluasi.js";
import { angkaTahfidz, angkaKurikulum, angkaKesantrian, angkaSdm } from "./s_yayasan.js";

const JAM = 10;
const jamTerbit = tgl => { const d = L.parseYmd(tgl); d.setHours(JAM, 0, 0, 0); return d; };
const pad = n => String(n).padStart(2, "0");
const akhirBulan = (y, m) => new Date(y, m + 1, 0).getDate();
// Kelompok bidang untuk menyusun blok laporan (urutan tampil)
export const KELOMPOK = [
  ["ananda", "Perkembangan ananda", "heart", "hijau"], ["yayasan", "Garis besar pondok", "chart", "hijau"], ["tahfidz", "Tahfidz", "book", "hijau"],
  ["asrama", "Mutaba'ah asrama", "moon", "ungu"], ["kesantrian", "Kesantrian", "shield", "merah"], ["kbm", "Kurikulum & mapel", "clipboard", "biru"], ["kinerja", "Kinerja ustadz", "users", "emas"],
];
export const JENIS_IKON = { pekanan: "calendar", bulanan: "chart", mid: "target", semester: "award", tahunan: "star" };
export const JADWAL_TEKS = [["pekanan", "Pekanan", "Setiap Sabtu, 10.00"], ["bulanan", "Bulanan", "Tanggal 29, 10.00"], ["mid", "Tengah semester", "Saat mid semester"], ["semester", "Semester", "Akhir semester"], ["tahunan", "Tahunan", "Akhir tahun pelajaran"]];

// Semua laporan yang sudah terbit sampai saat ini (terbaru di atas)
export function daftarTerbit(now = new Date()) {
  const st = L.setelan(), awal = st.mulaiPakai || st.ganjilMulai, hasil = [];
  const tambah = (jenis, ref, tglTerbit) => { const t = jamTerbit(tglTerbit); if (t > now || tglTerbit < awal) return;
    const rg = L.periodeRange(jenis, ref); if (L.rentangHitung(rg).kosong) return;
    hasil.push({ id: `${jenis}:${rg.dari}`, jenis, ref, rg, terbit: t, judul: `Laporan ${JENIS_LABEL[jenis]}`, label: rg.label }); };
  // pekanan: Sabtu tiap pekan (12 pekan terakhir)
  for (let w = L.weekStart(L.ymd(now)), i = 0; i < 12; i++, w = L.addDays(w, -7)) tambah("pekanan", w, L.addDays(w, 5));
  // bulanan: 6 bulan terakhir
  for (let i = 0; i < 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1), y = d.getFullYear(), m = d.getMonth();
    tambah("bulanan", `${y}-${pad(m + 1)}-01`, `${y}-${pad(m + 1)}-${pad(Math.min(29, akhirBulan(y, m)))}`); }
  [[st.ganjilMulai, st.ganjilMid, st.ganjilSelesai], [st.genapMulai, st.genapMid, st.genapSelesai]].forEach(([a, mid, sel]) => {
    if (a && mid) tambah("mid", a, mid);
    if (a && sel) tambah("semester", a, sel);
  });
  if (st.genapSelesai) tambah("tahunan", st.ganjilMulai, st.genapSelesai);
  return hasil.sort((a, b) => b.terbit - a.terbit || a.jenis.localeCompare(b.jenis));
}
export function cariLaporan(id) { const [jenis, dari] = String(id || "").split(":"); return daftarTerbit().find(x => x.id === id) || (jenis && dari ? { id, jenis, ref: dari, rg: L.periodeRange(jenis, dari), terbit: null, judul: `Laporan ${JENIS_LABEL[jenis] || ""}`, label: L.periodeRange(jenis, dari).label } : null); }
export function jadwalBerikut(now = new Date()) {
  const t = L.ymd(now), w = L.weekStart(t), sab = L.addDays(w, 5), dSab = jamTerbit(sab);
  return dSab > now ? dSab : jamTerbit(L.addDays(sab, 7));
}

// ---------- tanda sudah dibaca (per akun, di perangkat) ----------
const kunciBaca = () => `mk_lap_baca_${nav.user ? nav.user.kind + "_" + nav.user.id : "-"}`;
export function sudahDibaca() { try { return new Set(JSON.parse(localStorage.getItem(kunciBaca()) || "[]")); } catch (e) { return new Set(); } }
export function tandaiDibaca(id) { try { const s = sudahDibaca(); if (s.has(id)) return; s.add(id); localStorage.setItem(kunciBaca(), JSON.stringify([...s].slice(-80))); } catch (e) { } }
export function belumDibaca() { if (!bolehLaporan()) return []; const s = sudahDibaca(), awal = L.addDays(L.today(), -21); return daftarTerbit().filter(x => !s.has(x.id) && L.ymd(x.terbit) >= awal); }

// ---------- siapa mendapat apa ----------
const PIMPINAN = ["wadir_tahfidz", "wadir_kurikulum", "wadir_kesantrian", "mudir", "yayasan"];
export const pimpinan = m => !!m && (m.roles || []).some(r => PIMPINAN.includes(r));
export function bolehLaporan() {
  if (!nav.user) return false;
  if (nav.user.kind === "wali") return true;
  const m = me(); return !!m && (m.roles || []).some(r => r !== "admin");
}
const santriPondok = p => L.santriList().filter(s => L.pondokOfSantri(s) === p);
const pasanganSemua = () => [...new Map(L.jadwalAll().map(j => [`${j.mapel}|${j.kelas}`, [j.mapel, j.kelas]])).values()].sort((x, y) => (x[1] + x[0]).localeCompare(y[1] + y[0]));
const stafPondok = p => L.staffAktif().filter(st => st.id !== "admin" && L.pondokStaff(st).includes(p));
const punyaTugas = st => L.HALAQAH.some(h => h.guru === st.id) || L.ASRAMA.some(a => a.musyrif === st.id) || (st.ajar || []).length;
const nilaiIkut = jenis => ["mid", "semester", "tahunan"].includes(jenis);

// Susun bagian laporan untuk akun yang sedang masuk. Setiap bagian = hasil ev* + periode lalu.
// { tunda: true } → kembalikan tugas { judul, tunda() } agar layar bisa menghitung bertahap (tidak membeku)
export function susunLaporan(jenis, rg, { tunda = false } = {}) {
  const B = [], hitung = (fn, meta) => { try { const e = denganLalu(fn, jenis, rg); Object.assign(e, meta); return e; } catch (er) { console.warn("laporan", er); return null; } };
  const ev = (fn, meta = {}) => { if (tunda) B.push({ judul: meta.judul, lingkup: meta.lingkup, kelompok: meta.kelompok, tunda: () => hitung(fn, meta) }); else { const e = hitung(fn, meta); if (e) B.push(e); } };
  if (nav.user && nav.user.kind === "wali") { const s = L.santriById(nav.user.id); if (s) ev(r => evAnanda(s, r, { jenis }), { kelompok: "ananda", judul: `Perkembangan ${s.panggilan || s.nama.split(" ")[0]}` }); return B; }
  const m = me(); if (!m) return B;
  const r = m.roles || [], mp = L.mudirPondok(m), hq = L.HALAQAH.filter(h => h.guru === m.id), asr = L.ASRAMA.filter(a => a.musyrif === m.id);
  const yys = r.includes("yayasan") && r.every(x => x === "yayasan" || x === "admin");
  if (r.includes("yayasan")) { if (tunda) { let yy = null; const ambil = () => (yy = yy || laporanYayasan(jenis, rg)); ["Tahfidz", "Kurikulum", "Kesantrian", "Ustadz & guru"].forEach((j, i) => B.push({ judul: j, kelompok: "yayasan", tunda: () => ambil()[i] })); } else B.push(...laporanYayasan(jenis, rg)); }
  if (yys) return B;
  // tugas pribadi lebih dulu
  hq.forEach(h => ev(x => evTahfidz(L.santriHalaqah(h.id), x, { jenis, kinerjaHalaqah: [h.id] }), { kelompok: "tahfidz", judul: `Halaqah ${h.nama.replace(/^Halaqah\s*/i, "")}`, lingkup: "Halaqah yang Anda ampu" }));
  asr.forEach(a => { const ss = L.santriAsrama(a.id);
    ev(x => evAsrama(ss, x, { asrama: [a] }), { kelompok: "asrama", judul: `Mutaba'ah Asrama ${a.nama}`, lingkup: "Asrama binaan Anda" });
    ev(x => evKesantrian(ss, x), { kelompok: "kesantrian", judul: `Izin & pelanggaran Asrama ${a.nama}`, lingkup: "Asrama binaan Anda" }); });
  if ((m.ajar || []).length) ev(x => evMapel(m.ajar.map(p => [...p]), x, { nilai: nilaiIkut(jenis) }), { kelompok: "kbm", judul: "Kelas yang Anda ajar", lingkup: (m.ajar || []).map(([mp2, k]) => `${(L.mapelById(mp2) || {}).nama} ${k}`).join(", ") });
  // pimpinan
  if (mp) mp.forEach(p => {
    const ss = santriPondok(p), lk = mp.length > 1 ? ` · Pondok ${p}` : "";
    ev(x => evTahfidz(ss, x, { jenis, kinerjaHalaqah: L.HALAQAH.filter(h => L.pondokHalaqah(h) === p).map(h => h.id) }), { kelompok: "tahfidz", judul: `Tahfidz${lk}`, lingkup: `Seluruh halaqah Pondok ${p}` });
    ev(x => evMapel(pasanganSemua().filter(([, k]) => L.pondokKelas(k) === p), x, { nilai: nilaiIkut(jenis) }), { kelompok: "kbm", judul: `KBM & nilai${lk}`, lingkup: `Seluruh kelas Pondok ${p}` });
    ev(x => evAsrama(ss, x, { asrama: L.ASRAMA.filter(a => a.pondok === p) }), { kelompok: "asrama", judul: `Mutaba'ah${lk}`, lingkup: `Seluruh asrama Pondok ${p}` });
    ev(x => evKesantrian(ss, x), { kelompok: "kesantrian", judul: `Kesantrian${lk}`, lingkup: `Seluruh santri Pondok ${p}` });
    ev(x => evKinerja(stafPondok(p).filter(punyaTugas), x), { kelompok: "kinerja", judul: `Kinerja ustadz${lk}`, lingkup: `Seluruh ustadz Pondok ${p}` });
  });
  if (!mp && r.includes("wadir_tahfidz")) {
    ev(x => evTahfidz(L.santriList(), x, { jenis, kinerjaHalaqah: L.HALAQAH.map(h => h.id) }), { kelompok: "tahfidz", judul: "Tahfidz seluruh halaqah", lingkup: `${L.HALAQAH.length} halaqah` });
    ev(x => evKinerja(L.staffAktif().filter(st => L.HALAQAH.some(h => h.guru === st.id)), x), { kelompok: "kinerja", judul: "Kinerja guru halaqah", lingkup: "Absen halaqah per sesi" });
  }
  if (!mp && r.includes("wadir_kurikulum")) {
    ev(x => evMapel(pasanganSemua(), x, { nilai: nilaiIkut(jenis) }), { kelompok: "kbm", judul: "KBM & nilai seluruh kelas", lingkup: "Semua mapel dan kelas" });
    ev(x => evKinerja(L.staffAktif().filter(st => (st.ajar || []).length || L.jadwalAll().some(j => j.guru === st.id)), x), { kelompok: "kinerja", judul: "Kinerja guru mapel", lingkup: "Absen & jurnal per pertemuan" });
  }
  if (!mp && r.includes("wadir_kesantrian")) {
    const p = m.pondok, ss = p ? santriPondok(p) : L.santriList(), as = L.ASRAMA.filter(a => !p || a.pondok === p), lk = p ? ` Pondok ${p}` : "";
    ev(x => evAsrama(ss, x, { asrama: as }), { kelompok: "asrama", judul: `Mutaba'ah seluruh asrama${lk}`, lingkup: `${as.length} asrama` });
    ev(x => evKesantrian(ss, x), { kelompok: "kesantrian", judul: `Kesantrian${lk}`, lingkup: `${ss.length} santri` });
    ev(x => evKinerja(L.staffAktif().filter(st => as.some(a => a.musyrif === st.id)), x), { kelompok: "kinerja", judul: `Kinerja wali asrama${lk}`, lingkup: "Mutaba'ah & ceklis musyrif" });
  }
  // kinerja pribadi untuk ustadz yang bukan pimpinan
  if (!pimpinan(m) && punyaTugas(m)) ev(x => evKinerja([m], x), { kelompok: "kinerja", judul: "Kinerja saya", lingkup: "Input yang menjadi tugas Anda" });
  return B;
}

// ---------- Yayasan: garis besar per pondok, tanpa nama ----------
function laporanYayasan(jenis, rg) {
  const rl = rgSebelum(jenis, rg), laluL = LALU_LABEL[jenis] || "periode lalu";
  const angka = (fn, x) => ({ "29": fn("29", x), "21": fn("21", x) });
  const T = angka(angkaTahfidz, rg), K = angka(angkaKurikulum, rg), Ks = angka(angkaKesantrian, rg), D = angka(angkaSdm, rg);
  const TL = rl ? angka(angkaTahfidz, rl) : null, KL = rl ? angka(angkaKurikulum, rl) : null, KsL = rl ? angka(angkaKesantrian, rl) : null, DL = rl ? angka(angkaSdm, rl) : null;
  const P = v => (v == null ? "—" : v + "%"), dsm = v => (v == null ? "—" : (Math.round(v * 10) / 10).toLocaleString("id-ID"));
  const bagian = (kunci, judul, ikon, baris, kes) => ({ kunci, judul, ikon, kelompok: "yayasan", lingkup: "Pondok 29 (kelas 7–8) dibanding Pondok 21 (kelas 9A–9B)", banding: baris, ringkas: [], kesimpulan: kes, perhatian: [], baik: [], laluLabel: laluL,
    rinci: { kol: ["Aspek", "Pondok 29", "Pondok 21"], rows: baris.map(b => [b.t, b.f(b.v["29"]), b.f(b.v["21"])]) }, catatan: "Garis besar per pondok tanpa nama santri atau ustadz." });
  const row = (t, get, src, srcL, f = P, rendahBaik = false) => ({ t, f, rendahBaik, v: { "29": get(src["29"]), "21": get(src["21"]) }, lalu: srcL ? { "29": get(srcL["29"]), "21": get(srcL["21"]) } : null });
  const unggul = (b, nm) => { const a = b.v["29"], c = b.v["21"]; if (a == null || c == null || a === c) return null; const p29 = b.rendahBaik ? a < c : a > c; return `${nm} lebih baik di Pondok ${p29 ? "29" : "21"} (${b.f(p29 ? a : c)} dibanding ${b.f(p29 ? c : a)}).`; };
  const tr = [row("Kehadiran halaqah", x => x.hadir, T, TL), row("Hafalan baru (juz)", x => x.hafalanBaru, T, TL, dsm), row("Rata-rata capaian target semester", x => x.capaian, T, TL), row("Lulus tasmi' (juz)", x => x.tasmi, T, TL, v => (v == null ? "—" : String(v)))];
  const kr = [row("KBM terlaksana", x => x.kbm, K, KL), row("Jurnal terisi", x => x.jurnal, K, KL), row("Kehadiran kelas", x => x.hadirKelas, K, KL), row("Izin guru", x => x.izinGuru, K, KL, v => String(v ?? 0), true)];
  const kes = [row("Ibadah (mutaba'ah)", x => x.ibadah, Ks, KsL), row("Adab (mutaba'ah)", x => x.adab, Ks, KsL), row("Izin keluar", x => x.izin, Ks, KsL, v => String(v ?? 0), true), row("Terlambat kembali", x => x.telat, Ks, KsL, v => String(v ?? 0), true), row("Pelanggaran", x => x.pel, Ks, KsL, v => String(v ?? 0), true)];
  const sdm = [row("Absen halaqah oleh guru", x => x.absenHalaqah, D, DL), row("Jumlah ustadz", x => x.total, D, DL, v => String(v ?? 0))];
  const naikTurun = (b, p) => (b.lalu && b.lalu[p] != null && b.v[p] != null && b.v[p] !== b.lalu[p] ? `${b.v[p] > b.lalu[p] ? "naik" : "turun"} dari ${b.f(b.lalu[p])}` : null);
  const kalimat = (baris, nm) => [unggul(baris[0], nm), ...["29", "21"].map(p => { const n = naikTurun(baris[0], p); return n ? `${baris[0].t} Pondok ${p} ${n} ${laluL}.` : null; })].filter(Boolean);
  return [
    bagian("yy_tahfidz", "Tahfidz", "book", tr, [...kalimat(tr, "Kehadiran halaqah"), `Hafalan baru: Pondok 29 ${dsm(T["29"].hafalanBaru)} juz, Pondok 21 ${dsm(T["21"].hafalanBaru)} juz.`, `Santri yang sudah mencapai target semester: Pondok 29 ${T["29"].tercapai} dari ${T["29"].santri}, Pondok 21 ${T["21"].tercapai} dari ${T["21"].santri}.`]),
    bagian("yy_kurikulum", "Kurikulum", "clipboard", kr, [...kalimat(kr, "Keterlaksanaan KBM"), `Kehadiran kelas: Pondok 29 ${P(K["29"].hadirKelas)}, Pondok 21 ${P(K["21"].hadirKelas)}.`]),
    bagian("yy_kesantrian", "Kesantrian", "shield", kes, [...kalimat(kes, "Ibadah"), `Pelanggaran: Pondok 29 ${Ks["29"].pel} (${Ks["29"].santriPel} santri), Pondok 21 ${Ks["21"].pel} (${Ks["21"].santriPel} santri).`, `Saat ini di luar pondok: Pondok 29 ${Ks["29"].luar} santri, Pondok 21 ${Ks["21"].luar} santri.`]),
    bagian("yy_sdm", "Ustadz & guru", "users", sdm, [...kalimat(sdm, "Absen halaqah oleh guru")]),
  ];
}

export function yayasanBagian(kunci, jenis) { const b = laporanYayasan(jenis, L.periodeRange(jenis, L.today())).find(x => x.kunci === kunci); return b ? { ...b, banding: null, rinci: null, tanpaAman: true, judul: "Kesimpulan", ikon: "chart" } : null; }
// Ringkasan teks satu laporan (untuk Asisten AI & pesan)
export function teksLaporan(lap, bagian) {
  const baris = [`${lap.judul} · ${lap.label}${lap.rg ? ` (${L.fmtShort(lap.rg.dari)} – ${L.fmtShort(L.rentangHitung(lap.rg).sampai)})` : ""}`];
  bagian.forEach(b => {
    baris.push("", `## ${b.judul}${b.lingkup ? ` (${b.lingkup})` : ""}`);
    if (b.ringkas.length) baris.push("Angka: " + b.ringkas.map(r => `${r.label} ${r.teks}${r.lalu != null ? ` (${b.laluLabel || "lalu"}: ${r.lalu}${r.sat || r.satLalu || ""})` : ""}${r.ket ? `, ${r.ket}` : ""}`).join("; "));
    if (b.banding) baris.push(...b.banding.map(x => `${x.t}: Pondok 29 ${x.f(x.v["29"])}, Pondok 21 ${x.f(x.v["21"])}`));
    b.kesimpulan.forEach(k => baris.push("- " + k));
    if (b.perhatian.length) baris.push(`Perlu tindak lanjut (${b.perhatian.length}):`, ...b.perhatian.slice(0, 25).map(p => `  • ${p.nama} (${p.sub}): ${p.isu.join("; ")}`));
    if (b.baik.length) baris.push(`Kabar baik (${b.baik.length}):`, ...b.baik.slice(0, 10).map(p => `  • ${p.nama}: ${p.t}`));
  });
  return baris.join("\n");
}
export { S };
