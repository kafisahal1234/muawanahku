// Inti pengirim notifikasi (dibundel esbuild untuk Node, memakai aturan yang SAMA dengan aplikasi: logic.js).
// Tidak membaca/menulis database sendiri: runner (kirim.mjs) mengisi data lalu memanggil acara(now).
import { S, segarkanTampilan, all, get } from "../../src/store.js";
import * as L from "../../src/logic.js";
import { daftarTerbit } from "../../src/terbit.js";

export function isiData(cols) { Object.entries(cols).forEach(([c, v]) => (S.data[c] = v || {})); S.mode = "db"; segarkanTampilan(); }
export const setelan = () => L.setelan();
export const hariIni = () => L.today();
const menit = j => { const m = String(j || "").match(/(\d{1,2})[.:](\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const sekarang = d => d.getHours() * 60 + d.getMinutes();
const dalam = (n, a, b) => n >= a && n <= b;
const guruIzin = (gid, T) => all("izinGuru").some(i => i.guru === gid && i.tanggal === T);
const pendekMapel = mp => (L.mapelById(mp) || { nama: mp }).nama;
// Butuh data santri? (mutaba'ah, izin terlambat, kabar harian wali) — supaya tidak membaca data santri tiap 5 menit
export function perluSantri(now) {
  const st = L.setelan(), n = sekarang(now), mt = menit(st.jamMutabaah);
  const zy = menit(st.jamHalaqah.Dhuha) + 75;
  return (mt != null && dalam(n, mt - 5, mt + 130)) || dalam(n, menit("20.45"), menit("22.00")) || dalam(n, menit("06.00"), menit("06.45")) || dalam(n, zy, zy + 40) || L.izinAktif().some(L.terlambat);
}
export const perluSetoran = now => { const n = sekarang(now), zy = menit(L.setelan().jamHalaqah.Dhuha) + 75; return dalam(n, menit("20.45"), menit("21.45")) || dalam(n, zy, zy + 40); };

// Semua notifikasi yang SEHARUSNYA terkirim pada saat ini. Runner menyaring yang sudah pernah terkirim (kunci).
// penerima: [{ jenis: "staff"|"wali", uid }] atau { semua: "staff" | "wali" }
export function acara(now = new Date()) {
  const T = L.today(), n = sekarang(now), st = L.setelan(), out = [];
  const tambah = (kunci, kat, penerima, judul, isi, buka) => out.push({ kunci, kat, penerima, judul, isi, buka: buka || null });
  // 1) Halaqah: saat mulai (bila belum diabsen) dan pengingat kedua 75 menit kemudian
  if (L.hariAktif(T, "halaqah")) L.sesiHari(T).forEach(se => {
    const t0 = menit(st.jamHalaqah[se]); if (t0 == null) return;
    L.HALAQAH.forEach(h => {
      if (!h.guru || guruIzin(h.guru, T) || get("absenHalaqah", L.halaqahKey(h.id, T, se))) return;
      const ke = [{ jenis: "staff", uid: h.guru }], buka = { s: "absenHalaqah", p: { sesi: se } };
      if (dalam(n, t0 - 5, t0 + 30)) tambah(`hq:${h.id}:${T}:${se}`, "kbm", ke, `Halaqah ${se} · ${st.jamHalaqah[se]}`, `Bismillah, saatnya halaqah ${se}. Jangan lupa absen dan catat setoran santri.`, buka);
      else if (dalam(n, t0 + 75, t0 + 120)) tambah(`hq2:${h.id}:${T}:${se}`, "kbm", ke, `Absen halaqah ${se} belum diisi`, `${h.nama}: absen ${se} hari ini belum tercatat. Isi sekarang agar rekap santri tidak berkurang.`, buka);
    });
  });
  // 2) KBM: X menit setelah jam masuk bila kelas belum diabsen; setelah jam selesai bila jurnal kosong
  if (L.hariAktif(T, "kbm")) L.jadwalHari(T).forEach(j => {
    const jm = L.jamById(j.jam); if (!jm || !j.guru || guruIzin(j.guru, T)) return;
    const mulai = menit(jm.mulai), selesai = menit(jm.selesai), tunda = Number(st.kbmTunda) || 15, ab = get("absenKelas", L.absenKelasKey(j.id, T)), ke = [{ jenis: "staff", uid: j.guru }];
    const p = { jid: j.id, kelas: j.kelas, mapel: j.mapel }, nama = `${pendekMapel(j.mapel)} · Kelas ${j.kelas}`;
    if (!ab && dalam(n, mulai + tunda, mulai + tunda + 35)) tambah(`kb:${j.id}:${T}`, "kbm", ke, `${nama} belum diabsen`, `${jm.nama} sudah berjalan ${tunda} menit (${jm.mulai}). Yuk absen kelas sekarang.`, { s: "absenKelas", p });
    if (selesai != null && dalam(n, selesai, selesai + 50) && (!ab || !ab.materi)) tambah(`kj:${j.id}:${T}`, "kbm", ke, ab ? `Jurnal ${nama}` : `${nama}: pertemuan belum diabsen`,
      ab ? `${jm.nama} sudah selesai. Isi jurnal mengajar (materi & target) selagi ingat.` : `${jm.nama} sudah selesai tetapi absen dan jurnal belum diisi.`, ab ? { s: "jurnalKelas", p } : { s: "absenKelas", p });
  });
  // 3) Mutaba'ah asrama (Senin–Jumat)
  const mt = menit(st.jamMutabaah);
  if (mt != null && L.hariAktif(T, "mutabaah") && (dalam(n, mt - 5, mt + 40) || dalam(n, mt + 90, mt + 130))) L.ASRAMA.forEach(a => {
    if (!a.musyrif || guruIzin(a.musyrif, T) || L.mutTidakDinilai(a.id, T)) return;
    const belum = L.santriAsrama(a.id).filter(s => !get("mutabaah", L.mutKey(s.id, T)) && !L.alasanTidakDinilai(s.id, T)).length; if (!belum) return;
    const kedua = n > mt + 60;
    tambah(`${kedua ? "mt2" : "mt"}:${a.id}:${T}`, "kbm", [{ jenis: "staff", uid: a.musyrif }], kedua ? `Mutaba'ah masih ${belum} santri` : `Mutaba'ah Asrama ${a.nama}`,
      kedua ? `Masih ada ${belum} santri yang mutaba'ahnya belum diisi hari ini.` : `Saatnya mengisi mutaba'ah. ${belum} santri belum diisi hari ini.`, { s: "mutabaah" });
  });
  // 4) Santri melewati batas izin (sekali per izin)
  L.izinAktif().filter(L.terlambat).forEach(i => {
    const s = L.santriById(i.santri); if (!s) return; const p = L.pondokOfSantri(s), a = L.asramaById(s.asrama);
    const ke = L.STAFF.filter(g => (a && a.musyrif === g.id) || ((g.roles || []).includes("wadir_kesantrian") && (!g.pondok || g.pondok === p)) || ((L.mudirPondok(g) || []).includes(p))).map(g => ({ jenis: "staff", uid: g.id }));
    if (ke.length) tambah(`iz:${i.id}`, "izin", ke, "Santri belum kembali", `${s.nama} (Kelas ${s.kelas}${a ? ", Asrama " + a.nama : ""}) melewati batas izin ${L.fmtDT(i.kembali)}.`, { s: "izinView", p: { id: i.id } });
  });
  // 5) Pengumuman baru (6 jam terakhir)
  all("pengumuman").filter(x => x.ts && now.getTime() - x.ts < 6 * 3600e3 && now.getTime() >= x.ts).forEach(x =>
    tambah(`pg:${x.id}`, "info", [{ semua: "staff" }, { semua: "wali" }], `Pengumuman: ${x.judul || "Info pondok"}`, String(x.isi || "").replace(/\s+/g, " ").slice(0, 160), { s: "pengumuman" }));
  // 6) Laporan terbit (3 jam setelah jam terbit)
  daftarTerbit(now).filter(x => now - x.terbit < 3 * 3600e3).forEach(x =>
    tambah(`lp:${x.id}`, "laporan", [{ semua: "staff" }, { semua: "wali" }], `${x.judul} sudah terbit`, `${x.label}. Ketuk untuk melihat hasil evaluasi.`, { s: "laporanBaca", p: { id: x.id } }));
  // 7) Kabar harian untuk wali (20.45–21.45)
  if (dalam(n, menit("20.45"), menit("21.45")) && (L.hariAktif(T, "halaqah") || L.hariAktif(T, "kbm"))) L.santriList().forEach(s => {
    const k = kabarHarian(s, T); if (k) tambah(`kw:${s.id}:${T}`, "harian", [{ jenis: "wali", uid: s.id }], `Kabar ${s.panggilan || s.nama.split(" ")[0]} hari ini`, k, null);
  });
  // 8) Ziyadah: setelah halaqah Dhuha, santri yang belum setor hafalan baru hari ini (Senin–Jumat)
  const zy = menit(st.jamHalaqah.Dhuha) + 75;
  if (L.hariAktif(T, "halaqah") && L.parseYmd(T).getDay() !== 6 && dalam(n, zy, zy + 40)) L.HALAQAH.forEach(h => {
    if (!h.guru || guruIzin(h.guru, T)) return;
    const ss = L.santriHalaqah(h.id).filter(s => !L.santriIqra(s) && !L.izinPadaTgl(s.id, T)), belum = ss.filter(s => !L.setoranSantri(s.id).some(x => x.tanggal === T && x.jenis === "ziyadah"));
    if (belum.length) tambah(`zy:${h.id}:${T}`, "kbm", [{ jenis: "staff", uid: h.guru }], `${belum.length} santri belum setor ziyadah`, `${belum.slice(0, 4).map(s => s.nama.split(" ").slice(0, 2).join(" ")).join(", ")}${belum.length > 4 ? `, dan ${belum.length - 4} lainnya` : ""} belum setor hafalan baru hari ini.`, { s: "setorList", p: { jenis: "ziyadah" } });
  });
  // 9) Kejadian baru (sejak pemeriksaan sebelumnya): izin keluar, santri kembali, BAP, izin guru, lulus tasmi'
  const sejak = now.getTime() - 20 * 60e3, baru = x => x && x.ts && x.ts >= sejak && x.ts <= now.getTime() + 60e3;
  const panggil = s => s.panggilan || s.nama.split(" ")[0];
  const pengurusSantri = (s, peran) => { const p = L.pondokOfSantri(s), a = L.asramaById(s.asrama);
    return L.STAFF.filter(g => (a && a.musyrif === g.id) || ((g.roles || []).includes("wadir_kesantrian") && (!g.pondok || g.pondok === p)) || ((L.mudirPondok(g) || []).includes(p)) || (peran && (g.roles || []).includes(peran))).map(g => ({ jenis: "staff", uid: g.id })); };
  all("izin").forEach(i => { const s = L.santriById(i.santri); if (!s) return;
    if (baru(i) && i.status === "aktif") {
      tambah(`izb:${i.id}`, "info", [{ jenis: "wali", uid: s.id }], `Izin ${String(i.jenis || "keluar").toLowerCase()} ananda`, `${panggil(s)} izin ${String(i.jenis || "keluar").toLowerCase()} mulai ${L.fmtDT(i.keluar)}, kembali paling lambat ${L.fmtDT(i.kembali)}.`, null);
      tambah(`izs:${i.id}`, "izin", pengurusSantri(s).filter(x => x.uid !== i.oleh), "Izin santri baru", `${s.nama} (Kelas ${s.kelas}) izin ${String(i.jenis || "keluar").toLowerCase()} sampai ${L.fmtDT(i.kembali)}.`, { s: "izinView", p: { id: i.id } });
    }
    if (i.status === "kembali" && i.kembaliAktual && new Date(i.kembaliAktual).getTime() >= sejak)
      tambah(`izk:${i.id}`, "info", [{ jenis: "wali", uid: s.id }], "Ananda sudah kembali", `Alhamdulillah, ${panggil(s)} sudah kembali ke pondok ${L.fmtDT(i.kembaliAktual)}${i.telat ? " (melewati batas waktu)" : ""}.`, null);
  });
  all("bap").filter(baru).forEach(b => { const s = L.santriById(b.santri); if (!s) return;
    tambah(`bap:${b.id}`, "izin", pengurusSantri(s).filter(x => x.uid !== b.oleh), `BAP: ${s.nama}`, `${b.pelanggaranNama || b.pelanggaran || "Pelanggaran"}${b.tingkat ? ` (${String(b.tingkat).toLowerCase()})` : ""} · Kelas ${s.kelas}, Asrama ${L.asramaAman(s.asrama).nama}.`, { s: "bapView", p: { id: b.id } });
    tambah(`bapw:${b.id}`, "info", [{ jenis: "wali", uid: s.id }], "Catatan kedisiplinan ananda", `Ada catatan kedisiplinan untuk ${panggil(s)}. Silakan buka aplikasi atau hubungi wali asrama untuk penjelasan.`, null);
  });
  all("izinGuru").filter(baru).forEach(i => { const g = L.staffById(i.guru); if (!g) return;
    const halaqah = L.HALAQAH.some(h => h.guru === g.id), mapel = (g.ajar || []).length || L.jadwalAll().some(j => j.guru === g.id), asr = L.ASRAMA.some(a => a.musyrif === g.id), pk = L.pondokStaff(g);
    const ke = L.STAFF.filter(x => x.id !== g.id && ((x.roles || []).includes("mudir") && (L.mudirPondok(x) || []).some(p => !pk.length || pk.includes(p)) || (halaqah && (x.roles || []).includes("wadir_tahfidz")) || (mapel && (x.roles || []).includes("wadir_kurikulum")) || (asr && (x.roles || []).includes("wadir_kesantrian") && (!x.pondok || pk.includes(x.pondok))))).map(x => ({ jenis: "staff", uid: x.id }));
    tambah(`izg:${i.id}`, "info", ke, `${g.nama} izin`, `${i.jenis || "Izin"} · ${L.fmtTgl(i.tanggal)}${i.alasan ? ` · ${i.alasan}` : ""}.`, { s: "rekapIzinGuru" });
  });
  all("setoran").filter(x => baru(x) && x.jenis === "tasmi" && x.lulus).forEach(x => { const s = L.santriById(x.santri); if (!s) return;
    tambah(`tsm:${x.id}`, "info", [{ jenis: "wali", uid: s.id }], "Alhamdulillah, lulus tasmi'", `${panggil(s)} lulus tasmi' Juz ${x.juz}${x.nilai != null ? ` dengan nilai ${x.nilai}` : ""}. Barakallahu fiik.`, null);
    tambah(`tsms:${x.id}`, "info", L.STAFF.filter(g => (g.roles || []).includes("wadir_tahfidz") || (L.mudirPondok(g) || []).includes(L.pondokOfSantri(s))).filter(g => g.id !== x.guru).map(g => ({ jenis: "staff", uid: g.id })), `Lulus tasmi': ${s.nama}`, `Juz ${x.juz}${x.nilai != null ? `, nilai ${x.nilai}` : ""} · ${L.namaHalaqah(s)}.`, null);
  });
  // 10) Pemberitahuan libur baru/diubah (segera) + pengingat libur besok (19.00)
  const rentangT = (a, b) => (a === b ? L.fmtTgl(a) : `${L.fmtTgl(a, false)} – ${L.fmtTgl(b, false)}`);
  const isiLibur = l => (l.jenis === "atur" ? L.teksLiburSebagian(l) : l.jenis === "kbm" ? "KBM mapel libur; halaqah & asrama tetap berjalan" : "Semua kegiatan libur");
  L.liburPondok().filter(l => l.ts && l.ts >= sejak && l.selesai >= T).forEach(l =>
    tambah(`lbr:${l.id}:${l.ts}`, "info", [{ semua: "staff" }, { semua: "wali" }], `Pemberitahuan: ${l.nama}`, `${rentangT(l.mulai, l.selesai)}${(l.hari || []).length ? ` (${l.hari.map(d => ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][d]).join(", ")})` : ""}. ${isiLibur(l)}.`, { s: "kalender" }));
  const besok = L.addDays(T, 1), lb = L.liburPada(besok);
  if (dalam(n, menit("19.00"), menit("19.40")) && lb.length) tambah(`lb:${besok}`, "info", [{ semua: "staff" }, { semua: "wali" }], `Besok: ${lb.map(l => l.nama).join(", ")}`, lb.map(l => (l.jenis === "nasional" || l.jenis === "cuti" ? "Libur nasional" : isiLibur(l))).join(". ") + ".", { s: "kalender" });
  // 11) Ringkasan harian untuk pimpinan (21.30, Senin–Jumat)
  // Sabtu setelah 10.00 & Ahad bebas tugas: ringkasan hanya Senin–Jumat
  if (dalam(n, menit("21.30"), menit("21.59")) && L.parseYmd(T).getDay() >= 1 && L.parseYmd(T).getDay() <= 5 && (L.hariAktif(T, "halaqah") || L.hariAktif(T, "kbm"))) L.STAFF.filter(g => (g.roles || []).some(r => ["mudir", "wadir_tahfidz", "wadir_kurikulum", "wadir_kesantrian", "yayasan"].includes(r))).forEach(g => {
    const pk = L.mudirPondok(g) || ((g.roles || []).includes("wadir_kesantrian") && g.pondok ? [g.pondok] : ["29", "21"]), bag = [];
    if (L.hariAktif(T, "halaqah")) { const hq = L.HALAQAH.filter(h => pk.includes(L.pondokHalaqah(h))), ses = L.sesiHari(T); const isi = hq.reduce((a, h) => a + ses.filter(se => get("absenHalaqah", L.halaqahKey(h.id, T, se))).length, 0); bag.push(`halaqah diabsen ${isi}/${hq.length * ses.length} sesi`); }
    if (L.hariAktif(T, "kbm")) { const jd = L.jadwalHari(T).filter(j => pk.includes(L.pondokKelas(j.kelas))), ab = jd.filter(j => get("absenKelas", L.absenKelasKey(j.id, T))); bag.push(`KBM terlaksana ${ab.length}/${jd.length}`, `jurnal ${ab.filter(j => (get("absenKelas", L.absenKelasKey(j.id, T)) || {}).materi).length}/${jd.length}`); }
    if (L.hariAktif(T, "mutabaah")) { const ss = L.santriList().filter(s => pk.includes(L.pondokOfSantri(s))); bag.push(`mutaba'ah ${ss.filter(s => get("mutabaah", L.mutKey(s.id, T))).length}/${ss.length} santri`); }
    const luar = L.izinAktif().filter(i => { const s = L.santriById(i.santri); return s && pk.includes(L.pondokOfSantri(s)); }).length; if (luar) bag.push(`${luar} santri sedang izin`);
    if (bag.length) tambah(`rh:${g.id}:${T}`, "laporan", [{ jenis: "staff", uid: g.id }], `Ringkasan hari ini${pk.length === 1 ? " · Pondok " + pk[0] : ""}`, bag.join(" · ") + ".", { s: "laporan" });
  });
  // 12) Milad santri (06.00): wali dan wali asrama
  if (dalam(n, menit("06.00"), menit("06.40"))) L.santriList().forEach(s => { const lh = s.lahir; if (!lh || String(lh).slice(5, 10) !== T.slice(5)) return; const a = L.asramaById(s.asrama);
    tambah(`ml:${s.id}:${T}`, "info", [{ jenis: "wali", uid: s.id }, ...(a && a.musyrif ? [{ jenis: "staff", uid: a.musyrif }] : [])], `Hari ini milad ${panggil(s)}`, `Barakallahu fii umrik. Semoga ${panggil(s)} menjadi hafidz yang shalih, berbakti, dan bermanfaat.`, null); });
  return out;
}
const halTeks = baris => { const h = Math.round((baris / 15) * 10) / 10; return h >= 1 ? `${h.toLocaleString("id-ID")} halaman` : `${baris} baris`; };
export function kabarHarian(s, T) {
  const hadir = L.sesiHari(T).map(se => { const d = get("absenHalaqah", L.halaqahKey(s.halaqah, T, se)); return [se, d && d.status ? d.status[s.id] : null]; }).filter(([, v]) => v);
  const set = L.setoranSantri(s.id).filter(x => x.tanggal === T), z = set.filter(x => x.jenis === "ziyadah" && x.lulus), m = set.filter(x => x.jenis === "murojaah");
  if (!hadir.length && !set.length) return null;
  const bag = [], H = hadir.filter(([, v]) => v === "H").map(([se]) => se), tidak = hadir.filter(([, v]) => v !== "H");
  if (H.length) bag.push(`hadir halaqah ${H.join(", ")}`);
  if (tidak.length) bag.push(`tidak hadir halaqah ${tidak.map(([se, v]) => `${se} (${{ S: "sakit", I: "izin", A: "tanpa keterangan" }[v] || v})`).join(", ")}`);
  const baris = z.reduce((a, x) => a + Math.max(0, (x.sesudah || 0) - (x.sebelum || 0)), 0);
  if (z.length) bag.push(`setor hafalan baru ${halTeks(baris)}${z[0].juz ? ` (Juz ${z[0].juz})` : ""}`);
  else if (H.length && L.hariAktif(T, "halaqah") && L.parseYmd(T).getDay() !== 6) bag.push("belum setor hafalan baru");
  if (m.length) bag.push(`murojaah ${m.reduce((a, x) => a + Math.max(1, (Number(x.halSampai) || 0) - (Number(x.halDari) || 0) + 1), 0)} halaman`);
  return bag.length ? `Alhamdulillah, hari ini ananda ${bag.join("; ")}.` : null;
}
