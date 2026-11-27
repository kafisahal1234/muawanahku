# MuawanahQu

Aplikasi pondok untuk **Pondok Tahfidz Modern Kampung Qur'an Al Muawanah** (Metro, Lampung): tahfidz, absen halaqah, tahsin, mutaba'ah, ceklis musyrif, KBM mapel, kesantrian (izin & BAP), rapor, rekap berbasis hari aktif, dan portal wali santri.

> Status: **purwarupa / demo** sebelum dibangun di Base44 (Des 2026, uji coba Jan 2027, penerapan Feb 2027).

## Isi repo

| Folder / file | Isi |
|---|---|
| `src/main.js` | Kerangka aplikasi, navigasi, daftar layar |
| `src/logic.js` | Aturan inti: hafalan (1 juz = 300 baris, Juz 30 = 345), KKM 70, nilai = 100 − 3×salah, manzil, tasmi', kalender & hari aktif, rekap |
| `src/libur.js` | Libur nasional & cuti bersama 2026–2027 (SKB 3 Menteri) + setelan semester default |
| `src/store.js` | Penyimpanan data (db bersama artifact, cadangan localStorage) |
| `src/s_*.js` | Layar per modul: tahfidz, asrama (MOTD/mutaba'ah), mapel, kurikulum, kesantrian, wadir, admin, rapor, rekap, koreksi data |
| `src/theme.css`, `src/skin.css` | Tampilan (Material Design 3 / Apple HIG) |
| `src/data.js` | Data master (guru, asrama, santri, mapel, jadwal) — **berisi nama asli, jangan dibuat publik** |
| `build.py` | Build menjadi satu file `dist/index.html` |
| `test/*.py` | Uji alur dengan Playwright |

## Menjalankan

```bash
npm install          # preact, htm, esbuild
python3 build.py     # hasil: dist/index.html (buka langsung di browser)
python3 test/flow.py # uji alur (perlu playwright + chrome)
```

## Deploy (GitHub Pages)

Setiap push ke `main` otomatis dibangun dan dipasang oleh `.github/workflows/deploy.yml`.
Aktifkan sekali: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Alamat: `https://login.muawanahqu.com` (domain kustom, diatur di Settings → Pages → Custom domain; sebelumnya `muawanahku.santripay.com`).

Catatan nama: tampilan aplikasi bernama **MuawanahQu**. Kunci penyimpanan lokal (`muawanahku_demo_v1`) dan ID proyek Firebase (`muawanahku-15687`) sengaja tidak diubah agar data dan sesi lama tetap terbaca.

### Sinkron data antarperangkat

- Di tautan demo Claude: data otomatis bersama dan sinkron untuk semua akun.
- Di GitHub Pages: tanpa konfigurasi, data hanya di browser masing-masing. Untuk sinkron, isi `FIREBASE_CONFIG` di `src/cloud.js`:
  1. Buat proyek di console.firebase.google.com → tambah **Web app** → salin konfigurasinya.
  2. **Build → Firestore Database → Create database** (lokasi asia-southeast2 / Jakarta).
  3. **Build → Authentication → Sign-in method → Anonymous → Enable**.
  4. Aturan Firestore minimal: `allow read, write: if request.auth != null;`
  5. Tempel konfigurasi ke `src/cloud.js`, commit, tunggu deploy.

## Aturan penting

- KBM mapel Senin–Jumat (Jam 1 10.15–11.45, Jam 2 13.00–14.30); halaqah Senin–Sabtu, Sabtu hanya Shubuh; Ahad libur.
- Rekap = tercatat ÷ hari/sesi aktif (hari tanpa input dihitung 0); libur nasional & libur pondok tidak dihitung.
- Target hafalan: 2 juz hafalan baru per semester.
- Nilai akhir mapel = 10% kehadiran + 30% projek + 25% PTS + 35% PAS.
- Wali masuk dengan kode akses = nama panggilan santri + tanggal lahir (DDMMYYYY). Akun hanya dibuat/dihapus Admin.

## Privasi

Repo ini memuat nama santri dan guru serta sandi demo. Simpan sebagai **repo privat**.
