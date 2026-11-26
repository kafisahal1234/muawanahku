// Konteks data untuk Asisten AI, dibatasi sesuai hak akses akun yang sedang masuk.
// AI hanya "melihat" apa yang memang bisa dilihat akun itu di aplikasi: santri dalam lingkupnya,
// kinerja guru (untuk Wadir/Mudir), kinerja halaqah, asrama, izin, pelanggaran, nilai, dan jadwal.
import { all, get, S } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { nav } from "./ui.js";
import { me } from "./common.js";
import { dataSantriAI } from "./s_ai.js";
import { slotStatus } from "./s_kurikulum.js";
import { perolehanBulan } from "./s_hafalanbulan.js";

export const PANDUAN = `Panduan aplikasi MuawanahQu (pakai nama menu persis seperti ini bila menunjukkan jalan):
- Navigasi bawah akun ustadz: Beranda, Jadwal, Cari (cari santri), Riwayat (input milik sendiri), Akun (Profil, Keamanan, Log perubahan data milik akun sendiri, Keluar). Navigasi bawah hanya tampil di 5 layar utama; layar lain memakai tombol kembali.
- Guru tahfidz → Beranda → Tahfidz: Absen Halaqah, Ziyadah, Murojaah, Tahsin (Iqro'), Manzil, Tasmi', Siap tasmi', Progres Santri, Nilai Mid/Smt, Rekap Halaqah, Perolehan Bulanan (baris/halaman/juz per bulan, unduh PDF), Izin Guru, Riwayat & Koreksi. Sesi halaqah Shubuh, Dhuha, Malam (Senin–Jumat); Sabtu hanya Shubuh dan khusus manzil (tidak ada ziyadah & murojaah); Ahad libur. Mutaba'ah diisi Senin–Jumat; Sabtu & Ahad libur mutaba'ah dan tidak mengurangi nilai. Hari yang terlewat boleh diisi menyusul paling lambat 7 hari (tombol "Isi menyusul" di layar Mutaba'ah, tercatat "diisi menyusul"). Hari tidak dihitung bila kosong karena: wali asrama izin (Izin Guru) atau ditandai "tidak dinilai" dengan alasan, atau santri sedang izin. Hari yang sudah diisi selalu dihitung; hari aktif lain yang kosong bernilai 0.
- Tahsin (Iqro' KH. As'ad Humam, jilid 1–6 ±32 halaman, lalu Al-Qur'an): santri yang masih Iqro' dicatat bacaannya (halaman, Lancar/Kurang lancar/Ulang) dan ujian kenaikan jilid di menu Tahsin, bukan di Ziyadah hafalan. Rekap Tahsin bisa diunduh PDF.
- Wadir Tahfidz → Pengelolaan Tahfidz: Data Awal Hafalan, Target Hafalan, Kelola Halaqah, Rekap Tahfidz, Perolehan Bulanan, Rekap Tahsin, Peringkat Santri, Rekap Tasmi', Koreksi Input Tahfidz.
- Wadir Kurikulum → Kurikulum: Jam Pelajaran, Jadwal Mengajar, Mapel & Pengampu, Rekap KBM (kinerja guru: pertemuan terlaksana & jurnal, kehadiran kelas, unduh PDF), Rekap Nilai, Izin Guru, Koreksi Input Mapel. Juga Kalender di Beranda.
- Guru mapel → Beranda → Mapel <nama>: Absen & Jurnal, Input Nilai (Projek bisa banyak, PTS, PAS, Aspek), Rekap Kelas, Izin Guru, Riwayat & Koreksi. KBM Senin–Jumat, Jam 1 10.15–11.45, Jam 2 13.00–14.30. Nilai akhir = 10% hadir + 30% projek + 25% PTS + 35% PAS, KKM 70.
- Wali asrama (musyrif): Mutaba'ah dan Ceklis Musyrif di Beranda, serta menu Asrama Saya (Mutaba'ah, Ceklis Musyrif, Izin & Catatan, Rekap Asrama, Perolehan Hafalan, Riwayat & Koreksi).
- Wadir Kesantrian → Kesantrian: Surat Izin, Catat Kembali, Form BAP (surat pemberitahuan/SP/skorsing dibuat otomatis), Rekap Kesantrian, Rekap Izin, Rekap Pelanggaran, Histori Santri, Riwayat & Koreksi.
- Mudir: Tahfidz, Kurikulum, Kesantrian (lihat semua), Rapor, Rekap Ceklis Musyrif (hanya Mudir), Kalender. Admin: Data Master (santri, guru & akun, asrama, kelas, halaqah, Impor Data dengan AI), Pengumuman.
- Menu MOTD sudah dihapus; pelanggaran hanya dari BAP Kesantrian. Target hafalan baru: 2 juz per semester = 8 halaman per bulan = 2 halaman per pekan.
- Setelah absen/mutaba'ah disimpan, layar berubah menjadi ringkasan "sudah diisi". Mengubah/menghapus input lewat menu Riwayat & Koreksi; semua perubahan tercatat.
- Rekap memakai hari aktif; hari tanpa input dihitung 0 sehingga persentase turun. Semua surat, rapor, dan rekap diunduh sebagai PDF.
- Akun wali santri: masuk dengan kode akses; menu Beranda, Hafalan, Ananda (biodata diisi wali, kode akses terkunci), Izin, Akun.`;

const pct = v => (v == null ? "-" : v + "%");
const dalam = (t, rg) => t && t >= rg.dari && t <= rg.sampai;
const tglIso = iso => (iso ? String(iso).slice(0, 10) : "");
const RG = () => ({ pk: L.periodeRange("pekanan"), bl: L.periodeRange("bulanan"), sm: L.periodeRange("semester"), t: L.today() });

function barisSantri(s, bl) {
  const h = L.hafalan(s), c = L.capaianJuz(s), kh = L.kehadiranHalaqah(s.id), mp = L.mutPersen(s.id), po = L.poinSantri(s.id), pb = perolehanBulan(s.id, bl);
  const ts = L.tahsinStatus(s);
  return `${s.nama} | kls ${s.kelas} | ${L.asramaAman(s.asrama).nama} | ${L.namaHalaqah(s)}${ts ? ` | tahsin ${ts.label}${ts.siapUjian ? " (siap ujian)" : ""}` : ""} | hafal ${L.fmtJumlah(h)}${h.khatam ? "" : `, sedang Juz ${h.aktif}`} | ziyadah bulan ini ${pb.baris} baris | semester ${c.juz}/${c.target} juz | hadir halaqah ${pct(kh.pct)} | mutaba'ah ${mp.ibadah == null ? "-" : Math.round((mp.ibadah + mp.adab) / 2) + "%"} | poin ${po.total}${L.sedangIzin(s.id) ? " | sedang izin" : ""}`;
}

function blokGuruMapel(guru, r) {
  if (!guru.length) return "";
  const baris = guru.map(g => {
    const a = L.kinerjaMapel(g.id, r.pk), b = L.kinerjaMapel(g.id, r.bl), c = L.kinerjaMapel(g.id, r.sm);
    const ajar = (g.ajar || []).map(([m, k]) => `${L.mapelById(m).nama} ${k}`).join(", ") || "-";
    const iz = all("izinGuru").filter(i => i.guru === g.id && dalam(i.tanggal, r.bl));
    const nilai = (g.ajar || []).map(([m, k]) => {
      const n = get("nilaiMapel", L.nilaiKey(m, k)) || {}, tot = L.santriKelas(k).length, isi = key => Object.values(n[key] || {}).filter(v => v !== "" && v != null).length;
      return `${L.mapelById(m).nama} ${k}: projek ${isi("projek")}/${tot}${n.projekList ? ` (${n.projekList.length} projek)` : ""}, PTS ${isi("pts")}/${tot}, PAS ${isi("pas")}/${tot}`;
    }).join("; ") || "-";
    const hariIni = L.jadwalHari(r.t).filter(j => j.guru === g.id).map(j => `${L.jamById(j.jam).nama} ${L.mapelById(j.mapel).nama} ${j.kelas}: ${slotStatus(j, r.t)[0]}`).join(", ");
    const akhir = all("absenKelas").filter(d => d.guru === g.id).map(d => d.tanggal).sort().pop();
    return `${g.nama} | mengampu ${ajar} | pekan ini terlaksana ${a.absen}/${a.sesi} (${pct(a.pct)}), jurnal ${a.jurnal}/${a.sesi} | bulan ini terlaksana ${b.absen}/${b.sesi} (${pct(b.pct)}), jurnal ${pct(b.pctJ)} | semester terlaksana ${pct(c.pct)}, jurnal ${pct(c.pctJ)} | izin bulan ini ${iz.length}${iz.length ? ` (${iz.map(i => `${L.fmtShort(i.tanggal)} ${i.jenis}`).join(", ")})` : ""} | absen terakhir ${akhir ? L.fmtTgl(akhir) : "belum pernah"} | nilai terisi: ${nilai} | hari ini: ${hariIni || "tidak ada jadwal"}`;
  });
  return `KINERJA GURU MAPEL (terlaksana = pertemuan yang diabsen dibanding jadwal pada hari aktif KBM; ${r.pk.label}; ${r.bl.label}; ${r.sm.label}):\n${baris.join("\n")}`;
}
function blokKelas(kelas, mapelOk) {
  const out = kelas.map(k => {
    const list = L.santriKelas(k), hd = list.map(s => L.kehadiranKelas(s.id).pct).filter(x => x != null);
    const mp = DATA.mapel.filter(m => !mapelOk || mapelOk(m.id, k)).map(m => { const v = list.map(s => (L.nilaiAkhir(s.id, m.id) || {}).akhir).filter(x => x != null); return v.length ? `${m.nama} rata ${Math.round(v.reduce((a, b) => a + b, 0) / v.length)} (${v.filter(x => x < 70).length} di bawah KKM, ${v.length}/${list.length} dinilai)` : `${m.nama} belum ada nilai akhir`; });
    return `Kelas ${k} (${list.length} santri) | rata kehadiran kelas semester ${hd.length ? Math.round(hd.reduce((a, b) => a + b, 0) / hd.length) + "%" : "-"} | ${mp.join("; ")}`;
  });
  return out.length ? `REKAP KELAS:\n${out.join("\n")}` : "";
}
function blokHalaqah(hqs, r) {
  if (!hqs.length) return "";
  const bulan = r.t.slice(0, 7);
  const baris = hqs.map(h => {
    const g = L.staffAman(h.guru), list = L.santriHalaqah(h.id), a = L.kinerjaHalaqah(h.id, r.pk), b = L.kinerjaHalaqah(h.id, r.bl), c = L.kinerjaHalaqah(h.id, r.sm);
    const per = list.map(s => perolehanBulan(s.id, bulan)), tot = per.reduce((n, p) => n + p.baris, 0);
    const setorHariIni = list.filter(s => L.setoranSantri(s.id).some(x => x.tanggal === r.t)).length;
    const sesi = L.sesiHari(r.t).map(se => `${se} ${get("absenHalaqah", L.halaqahKey(h.id, r.t, se)) ? "sudah" : "belum"}`).join(", ");
    return `${h.nama} (guru ${g.nama}) | ${list.length} santri | absen sesi pekan ini ${a.isi}/${a.sesi} (${pct(a.pct)}) | bulan ini ${b.isi}/${b.sesi} (${pct(b.pct)}) | semester ${pct(c.pct)} | ziyadah bulan ini ${tot} baris (${L.fmtBaris(tot)}), ${per.filter(p => p.baris > 0).length}/${list.length} santri setor | setor hari ini ${setorHariIni}/${list.length} | absen hari ini: ${sesi || "tidak ada halaqah"}`;
  });
  return `KINERJA HALAQAH & GURU TAHFIDZ (${r.pk.label}; ${r.bl.label}; ${r.sm.label}):\n${baris.join("\n")}`;
}
function blokAsrama(asr, r) {
  if (!asr.length) return "";
  const baris = asr.map(a => {
    const g = L.staffAman(a.musyrif), list = L.santriAsrama(a.id), ids = new Set(list.map(s => s.id));
    const u1 = L.kinerjaMut(a.id, r.pk), u2 = L.kinerjaMut(a.id, r.bl);
    const mutHariIni = list.filter(s => get("mutabaah", L.mutKey(s.id, r.t))).length;
    const iz = L.izinAktif().filter(i => ids.has(i.santri)).length;
    return `Asrama ${a.nama} (pondok ${a.pondok}, wali asrama ${g.nama}) | ${list.length} santri | mutaba'ah pekan ini ${u1.isi}/${u1.target} (${pct(u1.pct)}${u1.menyusul ? `, ${u1.menyusul} menyusul` : ""}${u1.hariLibur ? `, ${u1.hariLibur} hari tidak dinilai` : ""}) | bulan ini ${pct(u2.pct)} | hari ini mutaba'ah ${mutHariIni}/${list.length} | sedang izin ${iz}`;
  });
  return `KINERJA ASRAMA & WALI ASRAMA:\n${baris.join("\n")}`;
}
function blokKesantrian(santriOk, r) {
  const ok = i => { const s = L.santriById(i.santri); return s && santriOk(s); };
  const aktif = L.izinAktif().filter(ok).map(i => `${L.santriAman(i.santri).nama} (${i.jenis}, keluar ${L.fmtDT(i.keluar)}, kembali ${L.fmtDT(i.kembali)}${L.terlambat(i) ? ", TERLAMBAT belum kembali" : ""}${i.alasan ? ", alasan: " + i.alasan : ""})`);
  const izBl = all("izin").filter(i => ok(i) && dalam(tglIso(i.keluar), r.bl)), jenis = {}; izBl.forEach(i => (jenis[i.jenis] = (jenis[i.jenis] || 0) + 1));
  const bap = all("bap").filter(b => ok(b) && dalam(b.tanggal, r.bl)).sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || "")).map(b => `${L.fmtShort(b.tanggal)} ${L.santriAman(b.santri).nama}: ${b.pelanggaranNama || b.pelanggaran} (${b.tingkat || "-"}, ${b.poin || 0} poin, tindakan ${(b.tindakan && b.tindakan.jenis) || "-"})`);
  const poin = L.santriList().filter(santriOk).map(s => [s, L.poinSantri(s.id).total]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([s, p]) => `${s.nama} ${p}`);
  return `KESANTRIAN:\nIzin aktif (${aktif.length}): ${aktif.join("; ") || "-"}\nIzin ${r.bl.label}: ${izBl.length} (${Object.entries(jenis).map(([k, v]) => `${k} ${v}`).join(", ") || "-"})\nBAP ${r.bl.label} (${bap.length}): ${bap.join("; ") || "-"}\nPoin pelanggaran tertinggi: ${poin.join(", ") || "-"}`;
}
function blokIzinGuru(r, guruOk) {
  const l = all("izinGuru").filter(i => dalam(i.tanggal, r.bl) && (!guruOk || guruOk(i.guru))).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  return `Izin guru ${r.bl.label} (${l.length}): ${l.map(i => `${L.fmtShort(i.tanggal)} ${L.staffAman(i.guru).nama} ${i.jenis}${i.alasan ? " (" + i.alasan + ")" : ""}`).join("; ") || "-"}`;
}

function santriLingkup(m) {
  const r = m.roles;
  if (r.some(x => ["mudir", "admin", "wadir_tahfidz", "wadir_kurikulum"].includes(x))) return L.santriList();
  const o = new Map(), add = l => l.forEach(s => o.set(s.id, s));
  if (r.includes("wadir_kesantrian")) add(L.santriList().filter(s => !m.pondok || L.pondokOfSantri(s) === m.pondok));
  L.ASRAMA.filter(a => a.musyrif === m.id).forEach(a => add(L.santriAsrama(a.id)));
  L.HALAQAH.filter(h => h.guru === m.id).forEach(h => add(L.santriHalaqah(h.id)));
  (m.ajar || []).forEach(([, k]) => add(L.santriKelas(k)));
  return [...o.values()];
}

// Disimpan sementara: dibangun ulang bila ada data berubah, berganti akun, atau sudah lewat 2 menit (status "hari ini" ikut segar)
let _ktx = { kunci: "", val: null };
export function konteksAkun() {
  const k = `${nav.user && nav.user.kind}:${nav.user && nav.user.id}:${S.ver}:${Math.floor(Date.now() / 12e4)}`;
  if (_ktx.kunci !== k) _ktx = { kunci: k, val: bangunKonteks() };
  return _ktx.val;
}
function bangunKonteks() {
  const r = RG(), peng = all("pengumuman").sort((a, b) => b.ts - a.ts).slice(0, 3).map(p => `- ${p.judul}: ${(p.isi || "").slice(0, 200)}`).join("\n") || "-";
  const umum = `Hari ini: ${L.fmtTgl(r.t)}${L.hariAktif(r.t, "kbm") ? "" : " (bukan hari KBM)"}. Target hafalan: ${L.targetSemester()} juz hafalan baru per semester. 15 baris = 1 halaman, 20 halaman = 1 juz.\nPengumuman terbaru:\n${peng}`;
  if (nav.user && nav.user.kind === "wali") {
    const s = L.santriById(nav.user.id);
    const set = L.setoranSantri(s.id).slice(-10).map(x => `${L.fmtTgl(x.tanggal)}: ${x.jenis}${x.juz ? " juz " + x.juz : ""}${x.baris ? " " + x.baris + " baris" : ""} nilai ${x.nilai}${x.lulus === false ? " (diulang)" : ""}`).join("; ") || "-";
    const iz = all("izin").filter(i => i.santri === s.id).slice(-3).map(i => `${i.jenis} ${L.fmtDT(i.keluar)}–${L.fmtDT(i.kembali)}`).join("; ") || "-";
    const pb = perolehanBulan(s.id, r.t.slice(0, 7));
    return { peran: "wali santri (orang tua)", nama: "Wali dari " + s.nama, wali: true,
      aturan: "Pengguna adalah orang tua santri. Hanya bahas santri ini; jangan menyebut atau mengarang data santri lain, guru lain, atau data internal pondok. Bila ditanya hal yang tidak ada datanya, sarankan menghubungi wali asrama atau kantor pondok.",
      data: `${umum}\n\nDATA ANANDA:\n${dataSantriAI(s)}\nZiyadah bulan ini: ${pb.baris} baris (${L.fmtBaris(pb.baris)}), ${pb.hari} hari setor\nSetoran terakhir: ${set}\nIzin terakhir: ${iz}` };
  }
  const m = me(), rl = m.roles, peran = rl.map(x => L.ROLE_LABEL[x] || x).join(", "), list = santriLingkup(m), bl = r.t.slice(0, 7);
  const semua = rl.some(x => ["mudir", "admin"].includes(x)), blok = [];
  const jad = L.jadwalAll().filter(j => j.guru === m.id).map(j => `${j.hari} ${L.jamById(j.jam).nama} ${L.mapelById(j.mapel).nama} kelas ${j.kelas}`).join("; ") || "-";
  const a = L.asramaOf(m.id), hq = L.halaqahOf(m.id);
  // Kurikulum: seluruh guru mapel & kelas; guru mapel: miliknya sendiri
  if (semua || rl.includes("wadir_kurikulum")) {
    const guru = L.STAFF.filter(s => s.roles.includes("guru_mapel") || (s.ajar || []).length);
    blok.push(blokGuruMapel(guru, r), blokKelas(["7", "8", "9A", "9B"]), blokIzinGuru(r));
    const hariIni = L.jadwalHari(r.t).map(j => `${L.jamById(j.jam).nama} ${L.mapelById(j.mapel).nama} ${j.kelas} (${L.staffAman(j.guru).pendek}): ${slotStatus(j, r.t)[0]}`);
    blok.push(`JADWAL KBM HARI INI: ${hariIni.join("; ") || "tidak ada KBM"}\nMapel & pengampu: ${DATA.mapel.map(mp => `${mp.nama}: ${["7", "8", "9A", "9B"].map(k => `${k} ${(L.pengampu(mp.id, k) || { pendek: "-" }).pendek}`).join(", ")}`).join(" | ")}`);
  } else if (rl.includes("guru_mapel") || (m.ajar || []).length) {
    blok.push(blokGuruMapel([m], r), blokKelas([...new Set((m.ajar || []).map(([, k]) => k))], (mp, k) => (m.ajar || []).some(([x, y]) => x === mp && y === k)));
  }
  // Tahfidz: seluruh halaqah untuk Wadir Tahfidz/Mudir/Admin; guru tahfidz: halaqahnya
  if (semua || rl.includes("wadir_tahfidz")) blok.push(blokHalaqah(L.HALAQAH, r));
  else if (hq) blok.push(blokHalaqah([hq], r));
  // Kesantrian & asrama
  if (semua) blok.push(blokAsrama(L.ASRAMA, r), blokKesantrian(() => true, r));
  else if (rl.includes("wadir_kesantrian")) { const ok = s => !m.pondok || L.pondokOfSantri(s) === m.pondok; blok.push(blokAsrama(L.ASRAMA.filter(x => !m.pondok || x.pondok === m.pondok), r), blokKesantrian(ok, r)); }
  else if (a) { const ids = new Set(L.santriAsrama(a.id).map(s => s.id)); blok.push(blokAsrama([a], r), blokKesantrian(s => ids.has(s.id), r)); }
  if (!semua && !rl.includes("wadir_kurikulum")) blok.push(blokIzinGuru(r, g => g === m.id));
  const lingkup = semua ? "seluruh pondok" : [rl.includes("wadir_kurikulum") && "seluruh guru mapel & kelas", rl.includes("wadir_tahfidz") && "seluruh halaqah", rl.includes("wadir_kesantrian") && `kesantrian pondok ${m.pondok || "semua"}`, a && `asrama ${a.nama}`, hq && hq.nama, (m.ajar || []).length && "kelas yang diampu"].filter(Boolean).join(", ");
  return { peran, nama: m.nama,
    aturan: `Pengguna adalah ustadz/pengurus pondok dengan akses: ${lingkup || "terbatas"}. Jawab memakai data di bawah: data itu adalah isi aplikasi yang memang boleh dilihat akun ini, jadi JANGAN berkata datanya tidak tersedia bila ada di bawah. Saat ditanya siapa yang perlu perhatian (guru atau santri), urutkan dari yang terendah dan sebutkan angkanya beserta periodenya. Bila suatu data benar-benar tidak ada di bawah, katakan terus terang lalu tunjukkan menu aplikasi yang tepat.`,
    data: `${umum}\nAkun: ${m.nama} (${peran}) · Asrama binaan: ${a ? a.nama : "-"} · Halaqah: ${hq ? hq.nama : "-"} · Jadwal mengajar: ${jad}\n\n${blok.filter(Boolean).join("\n\n")}\n\nDATA ${list.length} SANTRI DALAM LINGKUP AKUN (nama | kelas | asrama | halaqah | hafalan | ziyadah bulan ini | capaian semester | hadir halaqah semester | mutaba'ah semester | poin pelanggaran):\n${list.map(s => barisSantri(s, bl)).join("\n")}` };
}
