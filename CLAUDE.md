# MuawanahQu — panduan kerja untuk Claude

Aplikasi internal **Pondok Tahfidz Modern Kampung Qur'an Al Muawanah** (Metro, Lampung). Pemilik & pengambil keputusan: **Ust. M. Kafi Sahal Muhtar, S.Pd** (Wadir Kurikulum, "Tim IT Pondok"). Selalu jawab dalam **Bahasa Indonesia**, singkat dan jelas; pengguna bukan programmer.

- Produksi: https://muawanahku.santripay.com (GitHub Pages, `CNAME`). Rencana pindah ke `login.muawanahqu.com` akhir Des 2026 — jangan ubah domain sebelum diminta.
- Database: Firebase Firestore proyek `muawanahku-15687` (koleksi berawalan `mk_`). Kunci localStorage `muawanahku_demo_v1` sengaja tidak diganti.
- Aplikasi **internal**: tidak ada pendaftaran; semua akun dibuat Admin.

## Build, uji, rilis

```bash
npm ci                      # sekali
python3 build.py            # hasil: dist/index.html + dist/vendor/*
# uji (Playwright + Chromium; data CONTOH fiktif dari test/contoh/seed.json)
PYTHONPATH=test/pwseed python3 test/flow.py           # alur utama, akhirnya harus "ERR []"
PYTHONPATH=test/pwseed python3 test/sweep.py          # semua layar semua akun guru × 4 lebar
PYTHONPATH=test/pwseed python3 test/rekap_layar.py    # tangkapan layar rekap  → test/out/rekap/
PYTHONPATH=test/pwseed python3 test/wali_layar.py     # tangkapan layar wali   → test/out/wali/
PYTHONPATH=test/pwseed python3 test/laporan_ziyadah.py
PYTHONPATH=test/pwseed python3 test/puasa_sunnah.py     # butir puasa hanya Senin & Kamis
PYTHONPATH=test/pwseed python3 test/rapor_layar.py      # rapor: gambar + PDF + Word → test/out/rapor/
PYTHONPATH=test/pwseed python3 test/pantauan_layar.py   # Pantauan Santri: Mudir umum vs Mudir Pondok 21
PYTHONPATH=test/pwseed python3 test/cari_layar.py       # menu Cari: daftar santri + rincian (kartu hafalan, peringkat) → test/out/cari/
PYTHONPATH=test/pwseed python3 test/modul_mudir.py      # menu Mudir: Rekap Modul (Tahfidz, Kurikulum, Kesantrian) → test/out/modul/
cd test/aturan && npm install && npm test             # uji firestore.rules di emulator (harus "gagal 0")
```

- Akun uji lokal: guru `<username>` / `<username>123` (mis. `syamsul` / `syamsul123`), admin `admin123` / `contoh123`, wali lewat "Lihat semua akun demo" di layar masuk.
- **Rilis** = push ke `main` → GitHub Actions "Deploy ke GitHub Pages" (`.github/workflows/deploy.yml`). Cek dengan `gh run list --limit 2`.
- Setiap rilis: naikkan `VERSI` di `src/s_system.js` (format pendek `v3.0`, `v3.1`, …) dan perbarui `TGL_PEMBARUAN` bila ada.
- Bila `firestore.rules` berubah, **ingatkan pengguna** untuk menempel isi terbaru di Firebase Console → Firestore Database → Rules → **Publish** (tidak otomatis ikut deploy).
- Lihat hasil secara visual (tangkapan layar) sebelum melapor; pengguna sangat memperhatikan tampilan.

## Struktur kode

Preact + htm, dibundel esbuild; CSS = `theme.css + skin.css + dark.css + dark_manual.css + polish.css` (perubahan tampilan baru → `polish.css`, sertakan versi gelap `html[data-tema=gelap]`). Font Inter (rapor tetap Montserrat).

| File | Isi |
|---|---|
| `src/main.js` | rute layar (`SCREENS`), tab bawah, sesi |
| `src/logic.js` | aturan inti: hafalan, kalender & hari aktif, rekap, kode akses, pondok 21/29 (`kelompokPondok`, `pondokStaff`) |
| `src/store.js`, `src/cloud.js` | data (`S.data.<koleksi>`, `put/del/get/all`), Firestore, sesi `mk_sesi` |
| `src/data.js` | data master (asrama, halaqah, kelas, mapel, jadwal). **Tanpa** data santri/guru asli (semua di database) |
| `src/s_*.js` | layar per modul (tahfidz, asrama, mapel, kurikulum, kesantrian, wadir, admin, rapor, wali, dll.) |
| `src/s_rekapmodul.js` | semua rekap modul — komponen `Panel` (satu aspek = satu kartu) |
| `src/s_rekap.js` | `usePeriode` (pemilih periode: Bulanan / Tengah semester / Semester) |
| `src/s_wali.js` | tampilan akun wali (bahasa orang tua) |
| `src/s_wa.js` | WhatsApp: kontak ustadz untuk wali (`TUPOKSI`), pesan ke wali |
| `src/biodata.js` | kamus kolom biodata + pembaca impor (tabel/teks berlabel) |
| `src/pdf.js`, `src/word.js` | PDF (jsPDF) & Word (docx) — rapor, laporan |
| `firestore.rules` | aturan keamanan (sesi wajib; wali hanya data anaknya) |

## Keputusan yang sudah tetap (jangan diubah tanpa diminta)

**Akun & keamanan**
- Login guru: username + sandi (hash `sha256("u:p")`). Reset Admin = nama panggilan + `123`.
- Kode akses wali = nama panggilan + tanggal lahir `DDMMYY`, huruf kecil (mis. `fulan010112`). Contoh di aplikasi harus **nama fiktif**.
- Form santri di Admin hanya: nama lengkap, panggilan, NIS, tanggal lahir, No. WA wali, kelas/asrama/halaqah. Data ini **terkunci** untuk wali (juga di rules). Biodata lain diisi wali sendiri.
- Jangan pernah menaruh data santri/guru asli, sandi, atau nomor HP pribadi di kode/repo (repo **publik**). Uji memakai `test/contoh/seed.json` (fiktif).
- Jangan menulis ke Firebase produksi saat menguji.

**Peran**: Admin (data master saja, tanpa rekap), Mudir (umum = semua pondok; atau khusus satu pondok lewat field `mudirPondok`, mis. Mudir Pondok 21 — hanya rekap/santri pondoknya; `L.mudirPondok(st)`, penanda tangan rapor/surat per pondok `L.mudirUntuk(p)`; menu **Pantauan Santri** dan satu menu **Rekap Modul** berisi Tahfidz/Kurikulum/Kesantrian, keduanya di `src/s_pantauan.js`), Wadir Tahfidz/Kurikulum/Kesantrian (Kesantrian per pondok 21/29), Wali Asrama (=musyrif), Guru Halaqah, Guru Mapel, Wali santri. Satu akun bisa banyak peran.

**Pondok**: Pondok 29 = kelas 7–8 (asrama a1–a6), Pondok 21 = kelas 9A–9B (a7–a11). Tampilan dikelompokkan per pondok (29 dulu).

**Tahfidz**: 15 baris = 1 halaman, 20 halaman = 1 juz; target 2 juz/semester. Urutan: Juz 30, 29, lalu 1, 2, … Santri Iqro' → Tahsin; ujian kenaikan jilid hanya Wadir Tahfidz (Lulus / Belum lulus).

**Jadwal**: KBM Senin–Jumat; halaqah Senin–Sabtu (Sabtu hanya Shubuh, manzil); mutaba'ah libur Sabtu & Ahad; butir "Puasa sunnah" hanya muncul & dinilai Senin (Puasa sunnah Senin) dan Kamis (Puasa sunnah Kamis) — `L.ibadahHari(tgl)`. Pakai "Ahad", bukan "Minggu".

**Rekap**: hanya **Bulanan, Tengah semester, Semester**. Satu halaman per rekap, tiap aspek kartu sendiri (angka besar + daftar berperingkat + bar), kehadiran **selalu persen**, **tanpa link** ke halaman lain, sederhana per peran. Data kosong = "Belum ada data".

**Menu**: Tahfidz guru = Absen, Ziyadah, Murojaah, Tahsin, Manzil, Tasmi', Nilai Mid/Smt, Rekap Halaqah, Izin Guru, Riwayat. Mutaba'ah & Ceklis Musyrif hanya di dalam **Asrama Saya**. Mapel: Absen Kelas dan Jurnal Mengajar menu terpisah. Menu "Pesan ke Wali" sudah dihapus di semua akun (chat wali lewat rincian santri). Menu Cari = daftar santri; rincian hanya punya tombol "Buka catatan lengkap santri" (tombol WA ada di dalamnya).

**Wali**: bahasa orang tua (tanpa "baris/sesi/H S I A"), kontak ustadz hanya lewat menu Akun → Hubungi ustadz (Wali Asrama, para Wadir, Mudir, Admin — guru mapel tidak tampil). Halaman detail santri tetap bertab.

**Dokumen**: rapor & surat memakai kop/kaki pondok (`src/rapor_assets.js`, `src/surat_assets.js`). Rapor bisa PDF dan Word (Word tanpa proteksi, cukup page break per halaman). Rapor: nilai identitas tebal, keterangan di bawah tabel, kehadiran halaqah hanya persen, nama tanda tangan bergaris bawah tanpa kurung & tanpa "Ust." (`namaTtd`).

## Cara kerja dengan pengguna
- Permintaan revisi teks/format = ubah teks saja, bukan sistem.
- Kerjakan permintaan berurutan dari atas.
- Bila ragu soal tampilan besar, tunjukkan dulu gambaran/mockup singkat.
- Setelah selesai: laporkan singkat apa yang berubah + versi, tanpa jargon teknis.
