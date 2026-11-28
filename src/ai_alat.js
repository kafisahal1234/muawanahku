// Alat (function calling) Asisten AI: AI boleh mencari sendiri ke database aplikasi, lintas modul & lintas akun.
// Hak baca (keputusan pengguna):
//   - Semua ustadz: data santri mana pun lintas modul (hafalan, setoran, absen, mutaba'ah, kelas, nilai, izin, jumlah pelanggaran).
//   - Kinerja guru lain & rincian BAP: hanya pimpinan (Wadir, Mudir, Yayasan, Admin). Wali asrama boleh rincian BAP santri asramanya.
//   - Wali santri: hanya ananda sendiri.
// Semua alat hanya MEMBACA. Hasil dipotong agar ringkas.
import { all, get } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { nav } from "./ui.js";
import { me } from "./common.js";
import { evTahfidz, evAsrama, evKesantrian, evMapel, evKinerja, evAnanda, denganLalu, mutSantri, tahfidzSantri } from "./evaluasi.js";
import { daftarTerbit, susunLaporan, teksLaporan } from "./laporan.js";

const PIMPINAN = ["wadir_tahfidz", "wadir_kurikulum", "wadir_kesantrian", "mudir", "yayasan", "admin"];
const wali = () => nav.user && nav.user.kind === "wali";
const pimpinan = () => { const m = me(); return !!m && (m.roles || []).some(r => PIMPINAN.includes(r)); };
const norm = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const P = v => (v == null ? null : v + "%");

// ---------- periode ----------
export function bacaPeriode(p) {
  const t = L.today(), s = String(p || "bulan_ini").trim().toLowerCase();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})\s*(?:\.\.|s\/d|sampai|-|–)\s*(\d{4}-\d{2}-\d{2})$/);
  if (m) return { jenis: "bulanan", rg: { dari: m[1], sampai: m[2], label: `${L.fmtShort(m[1])} – ${L.fmtShort(m[2])}` } };
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { jenis: "harian", rg: L.periodeRange("harian", s) };
  if (/^\d{4}-\d{2}$/.test(s)) return { jenis: "bulanan", rg: L.periodeRange("bulanan", s + "-01") };
  const peta = { hari_ini: ["harian", t], kemarin: ["harian", L.addDays(t, -1)], pekan_ini: ["pekanan", t], pekan_lalu: ["pekanan", L.addDays(t, -7)], bulan_ini: ["bulanan", t],
    bulan_lalu: ["bulanan", L.addDays(L.periodeRange("bulanan", t).dari, -1)], mid: ["mid", t], semester: ["semester", t], tahun: ["tahunan", t], tahunan: ["tahunan", t] };
  const [jenis, ref] = peta[s] || peta.bulan_ini;
  return { jenis, rg: L.periodeRange(jenis, ref) };
}
const labelRg = rg => { const rh = L.rentangHitung(rg); return `${rg.label}${rh.kosong ? " (belum ada hari yang dihitung)" : ` (${rh.dari} s/d ${rh.sampai})`}`; };

// ---------- pencarian santri / guru ----------
function cariSantriNama(q) {
  const list = L.santriList();
  if (!q) return [];
  const byId = list.find(s => s.id === q || s.nis === q); if (byId) return [byId];
  const n = norm(q), kata = n.split(" ").filter(Boolean);
  const pas = list.filter(s => norm(s.nama) === n || norm(s.panggilan) === n);
  if (pas.length) return pas;
  return list.filter(s => { const h = norm(`${s.nama} ${s.panggilan || ""}`); return kata.every(k => h.includes(k)); });
}
function satuSantri(q) {
  if (wali()) { const s = L.santriById(nav.user.id); return { s }; }
  const h = cariSantriNama(q);
  if (!h.length) return { galat: `Santri "${q}" tidak ditemukan. Pakai cari_santri untuk mencari dengan kata lain.` };
  if (h.length > 1) return { galat: "Ada beberapa santri yang cocok; sebutkan yang mana.", kandidat: h.slice(0, 12).map(ringkasSantri) };
  return { s: h[0] };
}
function cariStaf(q) {
  const n = norm(q).replace(/^(ust|ustadz|ustadzah|ustdzh|ustz)\s+/, ""); if (!n) return [];
  return L.staffAktif().filter(st => st.id !== "admin" && norm(`${st.nama} ${st.pendek || ""} ${st.id}`).includes(n));
}
const ringkasSantri = s => { const h = L.hafalan(s); return { id: s.id, nama: s.nama, panggilan: s.panggilan || null, kelas: s.kelas, pondok: L.pondokOfSantri(s), asrama: L.asramaAman(s.asrama).nama, halaqah: L.namaHalaqah(s), total_hafalan: L.fmtJumlah(h), juz_aktif: h.khatam ? "khatam" : h.aktif }; };
const jabatan = st => (st.roles || []).map(r => L.ROLE_LABEL[r] || r).join(", ");

// ---------- evaluasi ringkas untuk AI ----------
const kemas = (ev, maks = 30) => ({ judul: ev.judul, periode_lalu: ev.laluLabel || null,
  angka: ev.ringkas.map(r => ({ aspek: r.label, nilai: r.teks, periode_lalu: r.lalu ?? null, keterangan: r.ket || null })), kesimpulan: ev.kesimpulan,
  perlu_tindak_lanjut: ev.perhatian.slice(0, maks).map(p => ({ nama: p.nama, keterangan: p.sub, masalah: p.isu })), jumlah_perlu_tindak_lanjut: ev.perhatian.length,
  kabar_baik: ev.baik.slice(0, 15).map(p => ({ nama: p.nama, capaian: p.t })), cara_hitung: ev.catatan });

function lingkupSantri(a) {
  let l = L.santriList();
  if (a.pondok) l = l.filter(s => L.pondokOfSantri(s) === String(a.pondok));
  if (a.kelas) l = l.filter(s => norm(s.kelas) === norm(a.kelas));
  if (a.halaqah) { const n = norm(a.halaqah).replace(/^halaqah /, ""); const hq = L.HALAQAH.filter(h => norm(h.nama).includes(n) || norm((L.staffById(h.guru) || {}).nama).includes(n)); l = l.filter(s => hq.some(h => h.id === s.halaqah)); }
  if (a.asrama) { const n = norm(a.asrama).replace(/^asrama /, ""); const as = L.ASRAMA.filter(x => norm(x.nama).includes(n) || norm((L.staffById(x.musyrif) || {}).nama).includes(n)); l = l.filter(s => as.some(x => x.id === s.asrama)); }
  return l;
}
const bapBoleh = s => { if (pimpinan()) return true; const m = me(); return !!m && L.ASRAMA.some(a => a.musyrif === m.id && a.id === s.asrama); };

// ---------- pelaksana ----------
const ALAT = {
  cari_santri(a) {
    if (wali()) return { santri: [ringkasSantri(L.santriById(nav.user.id))] };
    const ok = new Set(lingkupSantri(a).map(s => s.id)); let l = (a.kata ? cariSantriNama(a.kata) : L.santriList()).filter(s => ok.has(s.id));
    return { jumlah: l.length, santri: l.slice(0, 60).map(ringkasSantri), dipotong: l.length > 60 };
  },
  rincian_santri(a) {
    const r = satuSantri(a.santri); if (!r.s) return r; const s = r.s, { jenis, rg } = bacaPeriode(a.periode);
    const t = tahfidzSantri(s, rg, jenis), m = mutSantri(s, rg), iz = L.izinDalam(s.id, rg), pl = L.pelanggaranDalam(s.id, rg), h = L.hafalan(s), c = L.capaianJuz(s), ts = L.tahsinStatus(s);
    const kelas = DATA.mapel.map(mp => { const k = L.kehadiranKelas(s.id, mp.id, rg), n = L.nilaiAkhir(s.id, mp.id) || {}; return { mapel: mp.nama, kehadiran: P(k.pct), alpa: k.A, pertemuan_diabsen: k.tot, nilai_akhir: n.akhir ?? null, uts: n.uts ?? null, uas: n.uas ?? null, pas: n.pas ?? null }; }).filter(x => x.pertemuan_diabsen || x.nilai_akhir != null);
    const setoran = L.setoranSantri(s.id).slice(-12).reverse().map(x => ({ tanggal: x.tanggal, jenis: x.jenis, juz: x.juz || null, baris: x.jenis === "ziyadah" ? Math.max(0, (x.sesudah || 0) - (x.sebelum || 0)) : null, halaman: x.jenis === "murojaah" ? `${x.halDari}-${x.halSampai}` : null, nilai: x.nilai ?? null, lulus: x.lulus !== false }));
    return { santri: ringkasSantri(s), periode: labelRg(rg),
      tahfidz: { tahsin: ts ? ts.label : null, capaian_target_semester: `${c.juz} dari ${c.target} juz (${c.pct}%)`, kehadiran_halaqah: P(t.kh.pct), hadir: t.kh.H, sakit: t.kh.S, izin: t.kh.I, alpa: t.kh.A, sesi_belum_diabsen: t.kh.kosong,
        ziyadah_periode: L.fmtHal(t.x.zBaris / 15), target_periode: t.iq ? null : L.fmtHal(t.tg / 15), hari_hadir: t.hadir, hari_tidak_setor_ziyadah: t.iq ? null : t.tanpaZ, tanggal_tidak_setor: t.tglTanpaZ.slice(-10),
        hari_tanpa_murojaah: t.iq ? null : t.tanpaM, murojaah_halaman: t.x.muroHal, ziyadah_diulang: t.ulang, manzil: t.x.manzil, tasmi_lulus_juz: t.x.tasmiLulus, setoran_terakhir: setoran },
      mutabaah: { ibadah: P(m.m.ibadah), adab: P(m.m.adab), hari_diisi: m.m.isi, hari_kosong: m.m.kosong, sering_terlewat: m.sering.slice(0, 5).map(([n, k]) => `${n} (${k}x)`) },
      kelas, kesantrian: { izin_keluar: iz.n, terlambat_kembali: iz.telat, sedang_izin: L.sedangIzin(s.id), pelanggaran: { ringan: pl.ringan, sedang: pl.sedang, berat: pl.berat, poin_periode: pl.poinRingan + pl.poinSB, total_poin: L.poinSantri(s.id).total },
        rincian_bap: !wali() && bapBoleh(s) ? pl.bap.map(b => ({ tanggal: b.tanggal, pelanggaran: b.pelanggaranNama || b.pelanggaran, tingkat: b.tingkat || null, poin: b.poin || 0, tindakan: b.tindakan || null })) : "hanya untuk pimpinan / wali asrama santri ini" },
      total_hafalan: L.fmtJumlah(h) };
  },
  evaluasi(a) {
    const { jenis, rg } = bacaPeriode(a.periode), b = a.bidang;
    if (wali()) { const s = L.santriById(nav.user.id); return { periode: labelRg(rg), ...kemas(denganLalu(x => evAnanda(s, x, { jenis }), jenis, rg)) }; }
    const ss = lingkupSantri(a);
    let ev;
    if (b === "tahfidz") ev = denganLalu(x => evTahfidz(ss, x, { jenis }), jenis, rg);
    else if (b === "mutabaah") ev = denganLalu(x => evAsrama(ss, x), jenis, rg);
    else if (b === "kesantrian") ev = denganLalu(x => evKesantrian(ss, x, { rinciBap: pimpinan() }), jenis, rg);
    else if (b === "kbm") {
      let pairs = [...new Map(L.jadwalAll().map(j => [`${j.mapel}|${j.kelas}`, [j.mapel, j.kelas]])).values()];
      if (a.kelas) pairs = pairs.filter(([, k]) => norm(k) === norm(a.kelas)); if (a.pondok) pairs = pairs.filter(([, k]) => L.pondokKelas(k) === String(a.pondok));
      if (a.mapel) { const n = norm(a.mapel); pairs = pairs.filter(([mp]) => norm((L.mapelById(mp) || {}).nama).includes(n)); }
      ev = denganLalu(x => evMapel(pairs, x, { nilai: ["mid", "semester", "tahunan"].includes(jenis) || !!a.dengan_nilai }), jenis, rg);
    } else if (b === "kinerja_guru") {
      let st = L.staffAktif().filter(x => x.id !== "admin");
      if (!pimpinan()) st = st.filter(x => x.id === (me() || {}).id);
      if (a.guru) st = st.filter(x => cariStaf(a.guru).includes(x));
      if (a.pondok) st = st.filter(x => L.pondokStaff(x).includes(String(a.pondok)));
      ev = denganLalu(x => evKinerja(st, x), jenis, rg);
      if (!pimpinan()) ev.catatan_akses = "Akun ini hanya boleh melihat kinerjanya sendiri.";
    } else return { galat: "bidang harus salah satu: tahfidz, mutabaah, kesantrian, kbm, kinerja_guru" };
    return { periode: labelRg(rg), lingkup: { santri: ss.length, pondok: a.pondok || "semua", kelas: a.kelas || null, halaqah: a.halaqah || null, asrama: a.asrama || null }, ...kemas(ev, a.maks || 30), ...(ev.catatan_akses ? { catatan_akses: ev.catatan_akses } : {}) };
  },
  riwayat_setoran(a) {
    const { rg } = bacaPeriode(a.periode || "pekan_ini"), rh = L.rentangHitung(rg);
    let ss = wali() ? [L.santriById(nav.user.id)] : a.santri ? cariSantriNama(a.santri) : lingkupSantri(a);
    const ids = new Set(ss.map(s => s.id));
    const l = all("setoran").filter(x => ids.has(x.santri) && x.tanggal >= rh.dari && x.tanggal <= rh.sampai && (!a.jenis || x.jenis === a.jenis)).sort((x, y) => (y.tanggal || "").localeCompare(x.tanggal || ""));
    return { periode: labelRg(rg), jumlah: l.length, dipotong: l.length > 150, setoran: l.slice(0, 150).map(x => ({ santri: L.santriAman(x.santri).nama, tanggal: x.tanggal, sesi: x.sesi || null, jenis: x.jenis, juz: x.juz || null, baris: x.jenis === "ziyadah" ? Math.max(0, (x.sesudah || 0) - (x.sebelum || 0)) : null, halaman: x.jenis === "murojaah" ? `${x.halDari}-${x.halSampai}` : null, nilai: x.nilai ?? null, lulus: x.lulus !== false, guru: (L.staffById(x.guru) || {}).nama || null })) };
  },
  absensi(a) {
    const { rg } = bacaPeriode(a.periode || "pekan_ini"), rh = L.rentangHitung(rg); if (rh.kosong) return { galat: "Periode belum berjalan." };
    let ss = wali() ? [L.santriById(nav.user.id)] : a.santri ? cariSantriNama(a.santri) : lingkupSantri(a); ss = ss.slice(0, 40);
    const jenis = a.jenis || "halaqah", hari = L.hariRentang(rh.dari, rh.sampai);
    if (jenis === "kelas") return { periode: labelRg(rg), absen: ss.map(s => ({ santri: s.nama, kelas: s.kelas, catatan: hari.flatMap(t => L.jadwalHari(t).filter(j => j.kelas === s.kelas).map(j => { const d = get("absenKelas", L.absenKelasKey(j.id, t)); const v = d && d.status && d.status[s.id]; return v && v !== "H" ? `${t} ${(L.mapelById(j.mapel) || {}).nama}: ${v}` : null; })).filter(Boolean) })), kode: "S=sakit, I=izin, A=alpa (hanya yang tidak hadir ditampilkan)" };
    return { periode: labelRg(rg), absen: ss.map(s => ({ santri: s.nama, halaqah: L.namaHalaqah(s), catatan: hari.flatMap(t => L.sesiHari(t).map(se => { const d = get("absenHalaqah", L.halaqahKey(s.halaqah, t, se)); const v = d && d.status ? d.status[s.id] : null; return d ? (v && v !== "H" ? `${t} ${se}: ${v}` : null) : `${t} ${se}: belum diabsen guru`; })).filter(Boolean) })), kode: "S=sakit, I=izin, A=alpa (hanya sesi tidak hadir / belum diabsen yang ditampilkan)" };
  },
  data_guru(a) {
    if (wali()) return { galat: "Tidak tersedia untuk akun wali." };
    const l = a.nama ? cariStaf(a.nama) : L.staffAktif().filter(x => x.id !== "admin");
    return { jumlah: l.length, guru: l.slice(0, 60).map(st => ({ nama: st.nama, jabatan: jabatan(st), pondok: L.pondokStaff(st).join(", ") || null, halaqah: L.HALAQAH.filter(h => h.guru === st.id).map(h => `${h.nama} (${L.santriHalaqah(h.id).length} santri)`), asrama_binaan: L.ASRAMA.filter(x => x.musyrif === st.id).map(x => x.nama), mengajar: (st.ajar || []).map(([mp, k]) => `${(L.mapelById(mp) || {}).nama} ${k}`) })),
      catatan: pimpinan() ? "Untuk kinerja pakai evaluasi bidang kinerja_guru." : "Kinerja guru lain hanya bisa dilihat pimpinan." };
  },
  jadwal(a) {
    let l = L.jadwalAll(); if (a.hari) l = l.filter(j => norm(j.hari) === norm(a.hari)); if (a.kelas) l = l.filter(j => norm(j.kelas) === norm(a.kelas)); if (a.guru) { const g = cariStaf(a.guru).map(x => x.id); l = l.filter(j => g.includes(j.guru)); }
    return { jumlah: l.length, jadwal: l.slice(0, 120).map(j => ({ hari: j.hari, jam: (L.jamById(j.jam) || {}).nama, mapel: (L.mapelById(j.mapel) || {}).nama, kelas: j.kelas, guru: L.staffAman(j.guru).nama })) };
  },
  nilai(a) {
    if (wali()) { const s = L.santriById(nav.user.id); return { nilai: DATA.mapel.map(mp => ({ mapel: mp.nama, ...(L.nilaiAkhir(s.id, mp.id) || {}) })) }; }
    const ss = L.santriList().filter(s => !a.kelas || norm(s.kelas) === norm(a.kelas)), mps = DATA.mapel.filter(mp => !a.mapel || norm(mp.nama).includes(norm(a.mapel)));
    return { kkm: L.KKM, rumus: "PAS = 30% projek + 30% UTS + 40% UAS; nilai akhir = 50% PAS + 35% rata-rata aspek + 15% kehadiran", nilai: ss.slice(0, 60).map(s => ({ santri: s.nama, kelas: s.kelas, mapel: Object.fromEntries(mps.map(mp => { const n = L.nilaiAkhir(s.id, mp.id) || {}; return [mp.nama, { uts: n.uts ?? null, uas: n.uas ?? null, pas: n.pas ?? null, aspek: n.rataAspek ?? null, hadir: n.hadir ?? null, akhir: n.akhir ?? null }]; })) })) };
  },
  izin_pelanggaran(a) {
    const { rg } = bacaPeriode(a.periode || "bulan_ini"), rh = L.rentangHitung(rg);
    let ss = wali() ? [L.santriById(nav.user.id)] : a.santri ? cariSantriNama(a.santri) : lingkupSantri(a); const ids = new Set(ss.map(s => s.id));
    const izin = all("izin").filter(i => ids.has(i.santri) && i.keluar && L.ymd(new Date(i.keluar)) >= rh.dari && L.ymd(new Date(i.keluar)) <= rh.sampai).map(i => ({ santri: L.santriAman(i.santri).nama, jenis: i.jenis, keluar: L.fmtDT(i.keluar), kembali: L.fmtDT(i.kembali), status: i.status, terlambat: !!(i.telat || L.terlambat(i)), alasan: i.alasan || null }));
    const bap = all("bap").filter(b => ids.has(b.santri) && b.tanggal >= rh.dari && b.tanggal <= rh.sampai);
    const bapOut = bap.map(b => { const s = L.santriById(b.santri); return s && bapBoleh(s) && !wali() ? { santri: s.nama, tanggal: b.tanggal, pelanggaran: b.pelanggaranNama || b.pelanggaran, tingkat: b.tingkat || null, poin: b.poin || 0 } : { santri: L.santriAman(b.santri).nama, tanggal: b.tanggal, tingkat: b.tingkat || null, catatan: "rincian hanya untuk pimpinan / wali asrama" }; });
    return { periode: labelRg(rg), izin_aktif_sekarang: L.izinAktif().filter(i => ids.has(i.santri)).length, izin, pelanggaran: bapOut };
  },
  laporan_berkala(a) {
    const l = daftarTerbit().filter(x => !a.jenis || x.jenis === a.jenis);
    const x = l[Math.min(l.length - 1, Math.max(0, Number(a.ke) || 0))]; if (!x) return { galat: "Belum ada laporan yang terbit." };
    return { laporan: teksLaporan(x, susunLaporan(x.jenis, x.rg)).slice(0, 20000), tersedia: l.slice(0, 8).map(y => `${y.jenis}: ${y.label}`) };
  },
};

// ---------- deklarasi untuk Gemini ----------
const PERIODE_KET = "Periode: hari_ini, kemarin, pekan_ini, pekan_lalu, bulan_ini, bulan_lalu, mid, semester, tahun, YYYY-MM (satu bulan), YYYY-MM-DD, atau YYYY-MM-DD..YYYY-MM-DD.";
export function deklarasiAlat(ai) {
  const S = ai.Schema, str = d => S.string({ description: d }), num = d => S.number({ description: d });
  const ob = (props, wajib = []) => S.object({ properties: props, optionalProperties: Object.keys(props).filter(k => !wajib.includes(k)) });
  const saring = { pondok: str('"29" (kelas 7–8) atau "21" (kelas 9A–9B)'), kelas: str("7, 8, 9A, atau 9B"), halaqah: str("nama halaqah atau nama guru halaqah"), asrama: str("nama asrama atau nama wali asrama") };
  const d = [
    ["cari_santri", "Mencari santri berdasarkan nama/panggilan/NIS dan/atau saringan pondok, kelas, halaqah, asrama. Mengembalikan daftar santri dengan total hafalan.", ob({ kata: str("nama, panggilan, atau NIS"), ...saring })],
    ["rincian_santri", "Rincian lengkap SATU santri lintas modul: hafalan & capaian target, kehadiran halaqah (hadir/sakit/izin/alpa), hari tidak setor ziyadah, murojaah, setoran terakhir, mutaba'ah (ibadah, adab, amalan sering terlewat), kehadiran & nilai tiap mapel, izin, pelanggaran.", ob({ santri: str("nama atau NIS santri"), periode: str(PERIODE_KET) }, ["santri"])],
    ["evaluasi", "Evaluasi siap pakai (angka, perbandingan dengan periode lalu, kesimpulan, daftar perlu tindak lanjut, kabar baik) untuk satu bidang dan lingkup. bidang: tahfidz | mutabaah | kesantrian | kbm | kinerja_guru.", ob({ bidang: str("tahfidz, mutabaah, kesantrian, kbm, atau kinerja_guru"), periode: str(PERIODE_KET), ...saring, mapel: str("nama mapel (untuk kbm)"), guru: str("nama guru (untuk kinerja_guru)"), dengan_nilai: S.boolean({ description: "sertakan nilai akhir (kbm)" }), maks: num("jumlah maksimal daftar perlu tindak lanjut, bawaan 30") }, ["bidang"])],
    ["riwayat_setoran", "Daftar setoran hafalan (ziyadah, murojaah, manzil, tasmi) dalam periode, untuk satu santri atau satu lingkup.", ob({ santri: str("nama santri"), jenis: str("ziyadah, murojaah, manzil, atau tasmi"), periode: str(PERIODE_KET), ...saring })],
    ["absensi", "Catatan ketidakhadiran per sesi (halaqah) atau per pertemuan (kelas) beserta tanggalnya, termasuk sesi yang belum diabsen guru.", ob({ jenis: str("halaqah atau kelas"), santri: str("nama santri"), periode: str(PERIODE_KET), ...saring })],
    ["data_guru", "Daftar ustadz/guru: jabatan, pondok, halaqah, asrama binaan, mapel yang diajar.", ob({ nama: str("nama guru (opsional)") })],
    ["jadwal", "Jadwal mengajar (KBM) per hari/kelas/guru.", ob({ hari: str("Senin..Jumat"), kelas: str("7, 8, 9A, 9B"), guru: str("nama guru") })],
    ["nilai", "Nilai mapel per santri (UTS, UAS, PAS, rata aspek, kehadiran, nilai akhir).", ob({ kelas: str("7, 8, 9A, 9B"), mapel: str("nama mapel") })],
    ["izin_pelanggaran", "Daftar izin keluar dan pelanggaran (BAP) dalam periode.", ob({ santri: str("nama santri"), periode: str(PERIODE_KET), ...saring })],
    ["laporan_berkala", "Isi Laporan Berkala yang sudah terbit untuk akun ini (pekanan tiap Sabtu 10.00, bulanan tgl 29, mid, semester, tahunan).", ob({ jenis: str("pekanan, bulanan, mid, semester, atau tahunan"), ke: num("0 = terbaru, 1 = sebelumnya, dst.") })],
  ];
  const boleh = wali() ? ["rincian_santri", "evaluasi", "riwayat_setoran", "absensi", "nilai", "izin_pelanggaran", "laporan_berkala"] : d.map(x => x[0]);
  return [{ functionDeclarations: d.filter(x => boleh.includes(x[0])).map(([name, description, parameters]) => ({ name, description, parameters })) }];
}
export const TAHAP_ALAT = { cari_santri: "Mencari santri…", rincian_santri: "Membaca catatan santri…", evaluasi: "Menghitung evaluasi…", riwayat_setoran: "Membaca riwayat setoran…", absensi: "Membaca absensi…", data_guru: "Membaca data ustadz…", jadwal: "Membaca jadwal…", nilai: "Membaca nilai…", izin_pelanggaran: "Membaca izin & pelanggaran…", laporan_berkala: "Membuka laporan berkala…" };
export function jalankanAlat(nama, args) {
  const f = ALAT[nama]; if (!f) return { galat: "Alat tidak dikenal." };
  try { const r = f(args || {}); return JSON.parse(JSON.stringify(r)); } catch (e) { console.warn("alat AI", nama, e); return { galat: "Gagal membaca data: " + (e && e.message ? e.message : e) }; }
}
export const ATURAN_ALAT = `Kamu punya ALAT untuk membaca database aplikasi secara langsung (lintas modul dan lintas akun sesuai hak akses). Gunakan alat bila: data di konteks tidak cukup, ditanya santri/halaqah/asrama/kelas/guru lain, periode lain (pekan lalu, bulan lalu, mid, semester, tanggal tertentu), atau butuh rincian (tanggal tidak setor, sesi alpa, nilai per mapel, isi laporan berkala). Boleh memanggil beberapa alat berturut-turut. Jangan mengarang: bila alat mengembalikan galat atau kosong, katakan apa adanya. Saat menyajikan evaluasi: mulai dari kesimpulan, lalu tabel ringkas, lalu saran tindak lanjut yang konkret (siapa, apa, kapan). Sebut periode dan cara hitung bila penting. Jangan menampilkan ID internal.`;
