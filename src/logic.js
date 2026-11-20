import { DATA } from "./data.js";
import { LIBUR_NASIONAL, SETELAN_DEFAULT } from "./libur.js";
import { S, all, get, subscribe } from "./store.js";

// ---------------- tanggal ----------------
export const pad = n => String(n).padStart(2, "0");
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
export const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export function parseYmd(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
export function fmtTgl(s, withDay = true) { const d = parseYmd(s); return (withDay ? HARI_ID[d.getDay()] + ", " : "") + d.getDate() + " " + BULAN[d.getMonth()] + " " + d.getFullYear(); }
export function fmtShort(s) { const d = parseYmd(s); return d.getDate() + " " + BULAN[d.getMonth()]; }
export function fmtJam(ts) { const d = new Date(ts); return pad(d.getHours()) + "." + pad(d.getMinutes()); }
export function fmtDT(iso) { if (!iso) return "—"; const d = new Date(iso); return d.getDate() + " " + BULAN[d.getMonth()] + " · " + pad(d.getHours()) + "." + pad(d.getMinutes()); }
export function weekStart(s) { const d = parseYmd(s); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return ymd(d); }
export function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
export const hariIni = () => HARI_ID[new Date().getDay()];

// ---------------- master ----------------
// Data guru & asrama bisa diubah Admin (staffEdit, asramaEdit); array diperbarui di tempat setiap data berubah
export const STAFF = [...DATA.staff];
export const ASRAMA = DATA.asrama.map(a => ({ ...a }));
export const HALAQAH = DATA.halaqah.map(h => ({ ...h }));
function segarkanMaster() {
  const ed = S.data.staffEdit || {}, ae = S.data.asramaEdit || {};
  const base = DATA.staff.map(s => (ed[s.id] ? { ...s, ...ed[s.id] } : s));
  const extra = Object.entries(ed).filter(([id]) => !DATA.staff.find(s => s.id === id)).map(([id, v]) => ({ id, ajar: [], roles: [], ...v }));
  STAFF.splice(0, STAFF.length, ...base, ...extra);
  ASRAMA.splice(0, ASRAMA.length, ...DATA.asrama.map(a => (ae[a.id] ? { ...a, ...ae[a.id] } : { ...a })));
  const he = S.data.halaqahEdit || {};
  const hb = DATA.halaqah.map(h => (he[h.id] ? { ...h, ...he[h.id] } : { ...h })), hx = Object.entries(he).filter(([id]) => !DATA.halaqah.find(h => h.id === id)).map(([id, v]) => ({ id, ...v }));
  HALAQAH.splice(0, HALAQAH.length, ...hb.concat(hx).filter(h => !h.hapus));
}
subscribe(segarkanMaster); segarkanMaster();
export const staffById = id => STAFF.find(s => s.id === id);
export const asramaById = id => ASRAMA.find(a => a.id === id);
export const KELAS = DATA.kelas;
export const MAPEL = DATA.mapel;
export const mapelById = id => MAPEL.find(m => m.id === id);
export const JAM = DATA.jam;
export const jamById = id => JAM.find(j => j.id === id);
export const asramaOf = staffId => ASRAMA.find(a => a.musyrif === staffId);
// Halaqah (kelompok tahfidz) terpisah dari asrama: anggota bisa dari asrama mana pun
export const halaqahById = id => HALAQAH.find(h => h.id === id);
export const halaqahOf = staffId => HALAQAH.find(h => h.guru === staffId);
export const halaqahSantri = s => halaqahById(s.halaqah) || null;
export const namaHalaqah = s => { const h = halaqahSantri(s); return h ? h.nama : "Belum ada halaqah"; };
export const guruHalaqah = s => { const h = halaqahSantri(s); return h ? staffById(h.guru) : null; };
export const ROLE_LABEL = { mudir: "Mudir", wadir_tahfidz: "Wadir Tahfidz", wadir_kurikulum: "Wadir Kurikulum", wadir_kesantrian: "Wadir Kesantrian",
  guru_tahfidz: "Guru Tahfidz", musyrif: "Wali Asrama", guru_mapel: "Guru Mapel", admin: "Admin", wali: "Wali Santri" };

export function santriList() {
  const ed = S.data.santriEdit || {};
  const base = DATA.santri.map(s => (ed[s.id] ? { ...s, ...ed[s.id] } : s));
  const extra = Object.entries(ed).filter(([id]) => !DATA.santri.find(s => s.id === id)).map(([id, v]) => ({ id, awal: { selesai: [], aktif: 30, baris: 0 }, ...v }));
  return base.concat(extra).filter(s => !s.hapus).map(s => (s.halaqah && HALAQAH.some(h => h.id === s.halaqah) ? s : { ...s, halaqah: halaqahAsramaId(s.asrama) })).sort((a, b) => a.nama.localeCompare(b.nama));
}
function halaqahAsramaId(aid) { const a = ASRAMA.find(x => x.id === aid), h = a && HALAQAH.find(x => x.guru === a.musyrif); return h ? h.id : null; }
export const santriById = id => santriList().find(s => s.id === id);
export const santriAsrama = aid => santriList().filter(s => s.asrama === aid);
export const santriHalaqah = hid => santriList().filter(s => s.halaqah === hid);
export const santriKelas = k => santriList().filter(s => s.kelas === k);
export const pondokOfSantri = s => (s.kelas === "7" || s.kelas === "8" ? "29" : "21");
export const initials = n => n.replace(/^(M\.?|Muhammad|Muhamad)\s+/i, "").split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();

// ---------------- akun ----------------
export async function sha(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
export const akunOv = u => (S.data.akun || {})[u] || null;
export async function cekSandi(u, p, def) { const ov = akunOv(u); return ov && ov.hash ? (await sha(u + ":" + p)) === ov.hash : p === def; }
// hasil: {kind,id} | {err}
// Akun guru/pengurus: username + kata sandi. Akun yang dihapus Admin tidak bisa masuk.
export const staffAktif = () => STAFF.filter(s => !(akunOv(s.username) || {}).hapus);
export async function login(username, password) {
  const u = (username || "").trim().toLowerCase(), p = password || "";
  const st = STAFF.find(s => s.username === u);
  if (!st || (akunOv(u) || {}).hapus || (akunOv(u) || {}).nonaktif) return { err: "Username atau kata sandi salah." };
  if (!(await cekSandi(u, p, st.password))) return { err: "Username atau kata sandi salah." };
  return { kind: "staff", id: st.id };
}
// Wali santri: satu kotak kode akses = nama panggilan santri + tanggal lahir (DDMMYYYY), misal adiyatma15082011.
// Akun wali melekat pada data santri: santri dihapus → kode akses otomatis tidak berlaku.
export function lahirSantri(s) {
  if (s.lahir) return { tgl: s.lahir, contoh: false };
  const n = parseInt(String(s.id).replace(/\D/g, ""), 10) || 1, th = s.kelas === "7" ? 2013 : s.kelas === "8" ? 2012 : 2011;
  return { tgl: `${th}-${pad(((n * 5) % 12) + 1)}-${pad(((n * 7) % 28) + 1)}`, contoh: true };
}
export const kodeAkses = s => { const [y, m, d] = lahirSantri(s).tgl.split("-"); return `${s.wali}${d}${m}${y}`; };
const normKode = k => (k || "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function loginWali(kode) {
  const k = normKode(kode); if (!k) return { err: "Isi kode akses." };
  const sa = santriList().find(s => kodeAkses(s) === k);
  return sa ? { kind: "wali", id: sa.id } : { err: "Kode akses tidak dikenal. Periksa nama panggilan dan tanggal lahir santri." };
}
export const usernameOf = user => (user.kind === "staff" ? staffById(user.id).username : santriById(user.id).wali);

// ---------------- mushaf ----------------
export const juzLines = j => (j === 30 ? 345 : 300);
export const juzPages = j => (j === 30 ? 23 : 20);
export function pageOf(juz, hal) { return juz === 30 ? 581 + hal : 20 * (juz - 1) + 1 + hal; }
export function posLabel(juz, baris) {
  if (!baris) return `Juz ${juz} · belum mulai`;
  const hal = Math.ceil(baris / 15), b = ((baris - 1) % 15) + 1;
  return `Juz ${juz} · hal. ${hal} · baris ${b}`;
}
function ayahAt(page, line) {
  const p = DATA.pages[Math.max(0, Math.min(603, page - 1))];
  const [fs, fa, ls, la] = p; const seq = [];
  for (let s = fs; s <= ls; s++) { const a0 = s === fs ? fa : 1, a1 = s === ls ? la : DATA.ayah[s - 1]; for (let a = a0; a <= a1; a++) seq.push([s, a]); }
  const i = Math.min(seq.length - 1, Math.floor(((line - 1) / 15) * seq.length));
  return seq[Math.max(0, i)];
}
export function ayahAtBaris(juz, baris) { const hal = Math.ceil(baris / 15), b = ((baris - 1) % 15) + 1; return ayahAt(pageOf(juz, hal), b); }
export function rangeLabel(juz, dari, sampai) {
  if (!sampai || sampai < dari) return "—";
  const [s1, a1] = ayahAtBaris(juz, dari), [s2, a2] = ayahAtBaris(juz, sampai);
  const n = x => DATA.surah[x - 1];
  return s1 === s2 ? `${n(s1)} ${a1}–${a2}` : `${n(s1)} ${a1} – ${n(s2)} ${a2}`;
}
export const surahName = i => DATA.surah[i - 1];
export const JUZ29 = Array.from({ length: 11 }, (_, i) => 67 + i);
export const JUZ30 = Array.from({ length: 37 }, (_, i) => 78 + i);

// ---------------- nilai ----------------
export const KKM = 70;
export const nilaiDari = salah => Math.max(0, 100 - 3 * (Number(salah) || 0));
export function predikat(v) {
  if (v == null || isNaN(v)) return { h: "—", t: "Belum ada nilai", c: "muted" };
  if (v >= 90) return { h: "A", t: "Istimewa", c: "green" };
  if (v >= 80) return { h: "B", t: "Baik", c: "blue" };
  if (v >= 70) return { h: "C", t: "Cukup", c: "gold" };
  return { h: "D", t: "Perlu bimbingan", c: "red" };
}


// ---------------- kalender & hari aktif ----------------
export const setelan = () => ({ ...SETELAN_DEFAULT, ...((S.data.kalender || {}).setelan || {}) });
export const liburPondok = () => Object.entries(S.data.kalender || {}).filter(([id]) => id !== "setelan").map(([id, v]) => ({ id, ...v })).sort((a, b) => a.mulai.localeCompare(b.mulai));
export function liburPada(tgl) {
  const st = setelan(), out = [];
  LIBUR_NASIONAL.forEach(l => { if (l.tgl === tgl && !(st.abaikan || []).includes(tgl)) out.push({ nama: l.nama, jenis: l.jenis }); });
  liburPondok().forEach(l => { if (tgl >= l.mulai && tgl <= l.selesai) out.push({ nama: l.nama, jenis: l.jenis || "pondok" }); });
  return out;
}
// jenis: "kbm" (Sen–Jum), "halaqah" (Sen–Sab, Sabtu hanya Shubuh), "asrama" (MOTD & mutaba'ah, setiap hari)
export function hariAktif(tgl, jenis) {
  const d = parseYmd(tgl).getDay(), lb = liburPada(tgl);
  if (lb.some(l => l.jenis === "pondok")) return false;
  if (jenis === "asrama") return true;
  if (lb.some(l => l.jenis === "nasional" || l.jenis === "cuti")) return false;
  if (jenis === "kbm") return d >= 1 && d <= 5 && !lb.some(l => l.jenis === "kbm");
  return d >= 1 && d <= 6;
}
export function hariRentang(dari, sampai) { const o = []; for (let t = dari; t <= sampai; t = addDays(t, 1)) o.push(t); return o; }
// rentang hitung: dipotong ke tanggal mulai pakai aplikasi dan hari ini
export function rentangHitung(rg) { const st = setelan(), t = today(); const dari = rg.dari < st.mulaiPakai ? st.mulaiPakai : rg.dari, sampai = rg.sampai > t ? t : rg.sampai; return { dari, sampai, kosong: dari > sampai }; }
export function hariAktifDalam(rg, jenis) { const r = rentangHitung(rg); return r.kosong ? [] : hariRentang(r.dari, r.sampai).filter(t => hariAktif(t, jenis)); }
export function semesterKini(tgl = today()) { const s = setelan(); return tgl >= s.genapMulai ? { nama: "Genap", mulai: s.genapMulai, mid: s.genapMid, selesai: s.genapSelesai } : { nama: "Ganjil", mulai: s.ganjilMulai, mid: s.ganjilMid, selesai: s.ganjilSelesai }; }
const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const PERIODE = [["harian", "Harian"], ["pekanan", "Pekanan"], ["bulanan", "Bulanan"], ["mid", "Mid"], ["semester", "Semester"], ["tahunan", "Tahunan"]];
export function periodeRange(jenis, ref = today()) {
  const s = setelan(), sm = semesterKini(ref), d = parseYmd(ref);
  if (jenis === "harian") return { dari: ref, sampai: ref, label: fmtTgl(ref) };
  if (jenis === "pekanan") { const w = weekStart(ref), e = addDays(w, 6); return { dari: w, sampai: e, label: `Pekan ${fmtShort(w)} – ${fmtShort(e)}` }; }
  if (jenis === "bulanan") { const a = ymd(new Date(d.getFullYear(), d.getMonth(), 1)), b = ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0)); return { dari: a, sampai: b, label: `${BLN[d.getMonth()]} ${d.getFullYear()}` }; }
  if (jenis === "mid") return { dari: sm.mulai, sampai: sm.mid, label: `Tengah semester ${sm.nama.toLowerCase()}` };
  if (jenis === "semester") return { dari: sm.mulai, sampai: sm.selesai, label: `Semester ${sm.nama.toLowerCase()} ${s.tp}` };
  return { dari: s.ganjilMulai, sampai: s.genapSelesai, label: `Tahun pelajaran ${s.tp}` };
}
export function geserPeriode(jenis, ref, n) {
  if (jenis === "harian") return addDays(ref, n);
  if (jenis === "pekanan") return addDays(ref, 7 * n);
  if (jenis === "bulanan") { const d = parseYmd(ref); return ymd(new Date(d.getFullYear(), d.getMonth() + n, 1)); }
  return ref;
}
export const rgSemester = () => periodeRange("semester");
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);

// ---------------- hafalan ----------------
export function dataAwal(s) { const o = (S.data.dataAwal || {})[s.id]; return o ? o : s.awal; }
export function setoranSantri(sid, kecuali) { return all("setoran").filter(r => r.santri === sid && r.id !== kecuali).sort((a, b) => a.ts - b.ts); }
export function hafalan(s, kecuali) {
  const aw = dataAwal(s);
  let selesai = [...(aw.selesai || [])], aktif = aw.aktif, baris = aw.baris || 0, khatam = false;
  for (const r of setoranSantri(s.id, kecuali)) {
    if (r.jenis === "ziyadah" && r.lulus && r.juz === aktif) baris = Math.min(juzLines(aktif), r.sesudah);
    if (r.jenis === "tasmi" && r.lulus && r.juz === aktif) {
      if (!selesai.includes(aktif)) selesai.push(aktif);
      const nx = DATA.urutanJuz.find(j => !selesai.includes(j));
      if (nx) { aktif = nx; baris = 0; } else { khatam = true; }
    }
  }
  const total = juzLines(aktif), siapTasmi = !khatam && baris >= total;
  return { selesai, aktif, baris, total, siapTasmi, khatam, jumlah: selesai.length + (khatam ? 0 : baris / total) };
}
export const barisTotal = h => h.selesai.reduce((a, j) => a + juzLines(j), 0) + (h.khatam ? 0 : h.baris || 0);
export function capaianSemester(s) {
  const aw = dataAwal(s), h = hafalan(s);
  const awH = { selesai: aw.selesai || [], baris: aw.baris || 0, khatam: false };
  const n = Math.max(0, barisTotal(h) - barisTotal(awH));
  const juzBaru = h.selesai.filter(j => !(aw.selesai || []).includes(j));
  const zi = setoranSantri(s.id).filter(r => r.jenis === "ziyadah" && r.lulus).length;
  return { baris: n, juzBaru, setor: zi, h };
}
// Capaian juz semester ini (hafalan baru sejak data awal semester), dalam satuan juz
export const targetSemester = () => Number(((S.data.target || {}).semester || {}).juz) || 2;
export function capaianJuz(s) {
  const aw = dataAwal(s), h = hafalan(s), prog = (sel, akt, br) => j => (sel.includes(j) ? 1 : j === akt ? Math.min(1, (br || 0) / juzLines(j)) : 0);
  const a = prog(aw.selesai || [], aw.aktif, aw.baris), b = prog(h.selesai, h.khatam ? null : h.aktif, h.baris);
  const juz = DATA.urutanJuz.reduce((x, j) => x + Math.max(0, b(j) - a(j)), 0), t = targetSemester();
  return { juz: Math.round(juz * 100) / 100, target: t, pct: Math.min(100, Math.round((juz / t) * 100)), tercapai: juz >= t, kurang: Math.max(0, Math.round((t - juz) * 10) / 10) };
}
export function fmtBaris(n) {
  if (!n) return "0 baris";
  const hal = Math.floor(n / 15), sisa = n % 15, juz = Math.floor(hal / 20), h2 = hal % 20, out = [];
  if (juz) out.push(juz + " juz"); if (h2) out.push(h2 + " hal."); if (sisa && !juz) out.push(sisa + " baris");
  return out.join(" ") || n + " baris";
}
export function fmtJumlah(h) {
  const j = h.selesai.length, hal = Math.floor(h.baris / 15);
  if (h.khatam) return "30 juz (khatam)";
  return hal ? `${j} juz ${hal} hal.` : `${j} juz`;
}
export function ziyadahHari(sid, tgl) { return all("setoran").filter(r => r.santri === sid && r.jenis === "ziyadah" && r.tanggal === tgl); }
export function manzilWeek(s, wk) {
  // rentang ziyadah lulus Senin-Jumat pekan wk
  const end = addDays(wk, 4);
  const z = setoranSantri(s.id).filter(r => r.jenis === "ziyadah" && r.lulus && r.tanggal >= wk && r.tanggal <= end);
  if (!z.length) return null;
  const juz = z[0].juz;
  const zj = z.filter(r => r.juz === juz);
  const dari = zj[0].sebelum + 1, sampai = zj[zj.length - 1].sesudah;
  const done = all("setoran").filter(r => r.santri === s.id && r.jenis === "manzil" && r.pekan === wk).sort((a, b) => a.ts - b.ts);
  const lulus = done.find(r => r.lulus);
  return { juz, dari, sampai, baris: sampai - dari + 1, hari: z.length, setor: done, lulus: !!lulus, nilai: done.length ? done[done.length - 1].nilai : null };
}
export function kunci(s, tgl = today()) {
  const h = hafalan(s);
  if (h.khatam) return { kunci: true, alasan: "Sudah khatam 30 juz" };
  if (h.siapTasmi) return { kunci: true, alasan: `Tasmi' Juz ${h.aktif} dulu` };
  const prev = addDays(weekStart(tgl), -7), m = manzilWeek(s, prev);
  if (m && !m.lulus) return { kunci: true, alasan: "Manzil pekan lalu belum lulus" };
  if (ziyadahHari(s.id, tgl).some(r => r.lulus)) return { kunci: true, sudah: true, alasan: "Sudah setor ziyadah hari ini" };
  return { kunci: false };
}

// ---------------- izin ----------------
export function izinAktif(sid) {
  return all("izin").filter(i => (!sid || i.santri === sid) && i.status === "aktif");
}
export function sedangIzin(sid) { return izinAktif(sid).length > 0; }
export function terlambat(i) { return i.status === "aktif" && i.kembali && new Date(i.kembali).getTime() < Date.now(); }

// ---------------- absen ----------------
export const SESI = ["Shubuh", "Dhuha", "Malam"];
// Halaqah Senin–Sabtu; hari Sabtu hanya Halaqah Shubuh; Ahad libur
export function sesiHari(tgl = today()) { const d = parseYmd(tgl).getDay(); return d === 0 ? [] : d === 6 ? ["Shubuh"] : SESI; }
export const adaHalaqah = (tgl = today()) => sesiHari(tgl).length > 0;
export const sesiHariNama = hari => (hari === "Sabtu" ? ["Shubuh"] : hari === "Minggu" || hari === "Ahad" ? [] : SESI);
export const sesiNow = () => { const ss = sesiHari(); if (ss.length <= 1) return "Shubuh"; const h = new Date().getHours(); return h < 7 ? "Shubuh" : h < 15 ? "Dhuha" : "Malam"; };
export const halaqahKey = (hid, tgl, sesi) => `${hid}_${tgl}_${sesi}`;
export function kehadiranHalaqah(sid, rg = rgSemester()) {
  const s = santriById(sid), c = { H: 0, S: 0, I: 0, A: 0 }, hari = hariAktifDalam(rg, "halaqah");
  let sesi = 0, terisi = 0;
  hari.forEach(t => sesiHari(t).forEach(se => { sesi++; const d = s && get("absenHalaqah", halaqahKey(s.halaqah, t, se)); const v = d && d.status && d.status[sid]; if (v && c[v] != null) { c[v]++; terisi++; } }));
  return { ...c, tot: terisi, sesi, kosong: sesi - terisi, hari: hari.length, pct: pct(c.H, sesi) };
}
// kinerja input guru tahfidz: sesi halaqah yang diabsen / sesi aktif
export function kinerjaHalaqah(hid, rg) {
  let sesi = 0, isi = 0; hariAktifDalam(rg, "halaqah").forEach(t => sesiHari(t).forEach(se => { sesi++; if (get("absenHalaqah", halaqahKey(hid, t, se))) isi++; }));
  return { sesi, isi, pct: pct(isi, sesi) };
}
// ---------------- jadwal & mapel ----------------
export const WAKTU = [["tahajud", "Tahajud"], ["subuh", "Shubuh"], ["apel", "Apel Pagi"], ["dhuha", "Dhuha"], ["dzuhur", "Dhuhur"], ["ashar", "Ashar"], ["maghrib", "Maghrib"], ["isya", "Isya"]];
export const JAMAAH = ["subuh", "dzuhur", "ashar", "maghrib", "isya"];
export const motdKey = (aid, tgl, w) => `${aid}_${tgl}_${w}`;
export function poinMotd(waktu, st) { if (st === "A") return JAMAAH.includes(waktu) ? 3 : 2; if (st === "M") return 1; return 0; }
export function motdCatatan(sid) {
  const out = [];
  all("motd").forEach(d => { const v = d.status && d.status[sid]; if (v === "A" || v === "M") out.push({ tanggal: d.tanggal, waktu: d.waktu, st: v, poin: poinMotd(d.waktu, v), ts: d.ts }); });
  return out.sort((a, b) => (b.tanggal + b.waktu).localeCompare(a.tanggal + a.waktu));
}
export function poinSantri(sid) {
  const bap = all("bap").filter(b => b.santri === sid).reduce((n, b) => n + (b.poin || 0), 0), motd = motdCatatan(sid).reduce((n, x) => n + x.poin, 0);
  return { bap, motd, total: bap + motd };
}
export function jadwalAll() {
  const ov = S.data.jadwal || {};
  const base = DATA.jadwal.filter(j => !(ov[j.id] && ov[j.id].hapus)).map(j => (ov[j.id] ? { ...j, ...ov[j.id] } : j));
  const extra = Object.entries(ov).filter(([id, v]) => !DATA.jadwal.find(j => j.id === id) && !v.hapus).map(([id, v]) => ({ id, ...v }));
  return base.concat(extra).filter(j => DATA.jam.some(x => x.id === j.jam) && DATA.hari.includes(j.hari));
}
export function bentrok(slot, exceptId) {
  return jadwalAll().filter(j => j.id !== exceptId && j.hari === slot.hari && j.jam === slot.jam && (j.kelas === slot.kelas || j.guru === slot.guru));
}
export const pengampu = (mapel, kelas) => STAFF.find(s => s.ajar.some(([m, k]) => m === mapel && k === kelas));
export const absenKelasKey = (jid, tgl) => `${jid}_${tgl}`;
export function jadwalHari(tgl) { const h = HARI_ID[parseYmd(tgl).getDay()]; return jadwalAll().filter(j => j.hari === h); }
export function kehadiranKelas(sid, mapel, rg = rgSemester()) {
  const s = santriById(sid); if (!s) return { pct: null, tot: 0, sesi: 0 };
  const c = { H: 0, S: 0, I: 0, A: 0 }; let sesi = 0, terisi = 0;
  hariAktifDalam(rg, "kbm").forEach(t => jadwalHari(t).filter(j => j.kelas === s.kelas && (!mapel || j.mapel === mapel)).forEach(j => {
    sesi++; const d = get("absenKelas", absenKelasKey(j.id, t)), v = d && d.status && d.status[sid]; if (v && c[v] != null) { c[v]++; terisi++; } }));
  return { ...c, tot: terisi, sesi, kosong: sesi - terisi, pct: pct(c.H, sesi) };
}
// kinerja guru mapel: pertemuan terlaksana (absen) & jurnal / jadwal pada hari aktif KBM
export function kinerjaMapel(guruId, rg, kelas) {
  let sesi = 0, absen = 0, jurnal = 0;
  hariAktifDalam(rg, "kbm").forEach(t => jadwalHari(t).filter(j => (!guruId || j.guru === guruId) && (!kelas || j.kelas === kelas)).forEach(j => { sesi++; const d = get("absenKelas", absenKelasKey(j.id, t)); if (d) { absen++; if (d.materi) jurnal++; } }));
  return { sesi, absen, jurnal, pct: pct(absen, sesi), pctJ: pct(jurnal, sesi) };
}
export const nilaiKey = (mapel, kelas) => `${mapel}_${kelas}`;
export function nilaiAkhir(sid, mapel) {
  const s = santriById(sid); if (!s) return null;
  const n = get("nilaiMapel", nilaiKey(mapel, s.kelas)) || {};
  const pj = n.projek && n.projek[sid], pts = n.pts && n.pts[sid], pas = n.pas && n.pas[sid];
  const kh = kehadiranKelas(sid, mapel).pct;
  const hadir = kh == null ? 100 : kh;
  if (pj == null || pts == null || pas == null || pj === "" || pts === "" || pas === "") return { pj, pts, pas, hadir: kh, akhir: null };
  const akhir = Math.round(hadir * 0.1 + Number(pj) * 0.3 + Number(pts) * 0.25 + Number(pas) * 0.35);
  return { pj, pts, pas, hadir: kh, akhir };
}

// ---------------- mutabaah ----------------
export const mutKey = (sid, tgl) => `${sid}_${tgl}`;
export function mutAuto(s, tgl) {
  // butir yang terisi otomatis dari MOTD/absen halaqah
  const res = {};
  Object.entries(DATA.auto).forEach(([idx, [src, key]]) => {
    if (src === "motd") { const d = get("motd", motdKey(s.asrama, tgl, key)); res[idx] = d ? (d.status[s.id] === "H" || d.status[s.id] === "M") : null; }
    else { const d = get("absenHalaqah", halaqahKey(s.halaqah, tgl, key)); res[idx] = d ? d.status[s.id] === "H" : null; }
  });
  return res;
}
// Mutaba'ah: dihitung terhadap SEMUA hari aktif asrama; hari yang tidak diinput dihitung 0
export function mutPersen(sid, rg = rgSemester()) {
  const hari = hariAktifDalam(rg, "asrama"); if (!hari.length) return { ibadah: null, adab: null, hari: 0, isi: 0 };
  let ib = 0, ad = 0, isi = 0;
  hari.forEach(t => { const d = get("mutabaah", mutKey(sid, t)); if (d) { isi++; ib += (d.ibadah || []).length; ad += (d.adab || []).length; } });
  return { ibadah: pct(ib, hari.length * DATA.ibadah.length), adab: pct(ad, hari.length * DATA.adab.length), hari: hari.length, isi, kosong: hari.length - isi };
}
export function predikatMut(v) {
  if (v == null || isNaN(v)) return { h: "—", t: "Belum ada data", c: "muted" };
  if (v >= 90) return { h: "A", t: "Istimewa", c: "green" };
  if (v >= 75) return { h: "B", t: "Baik", c: "blue" };
  if (v >= 60) return { h: "C", t: "Cukup", c: "gold" };
  return { h: "D", t: "Perlu bimbingan", c: "red" };
}
export function mutPerButir(sid, rg = rgSemester()) {
  const hari = hariAktifDalam(rg, "asrama"), n = hari.length, docs = hari.map(t => get("mutabaah", mutKey(sid, t))).filter(Boolean);
  const f = (key, len) => Array.from({ length: len }, (_, i) => (n ? Math.round((docs.filter(d => (d[key] || []).includes(i)).length / n) * 100) : null));
  return { hari: n, isi: docs.length, ibadah: f("ibadah", DATA.ibadah.length), adab: f("adab", DATA.adab.length) };
}
// MOTD: waktu yang diabsen / (hari aktif × 8 waktu)
export function kinerjaMotd(aid, rg) {
  const hari = hariAktifDalam(rg, "asrama"); let isi = 0, al = 0, mb = 0;
  const ids = new Set(santriAsrama(aid).map(s => s.id));
  hari.forEach(t => WAKTU.forEach(([w]) => { const d = get("motd", motdKey(aid, t, w)); if (d) { isi++; Object.entries(d.status || {}).forEach(([id, v]) => { if (ids.has(id)) { if (v === "A") al++; if (v === "M") mb++; } }); } }));
  return { slot: hari.length * WAKTU.length, isi, al, mb, pct: pct(isi, hari.length * WAKTU.length) };
}
export function kinerjaMut(aid, rg) {
  const hari = hariAktifDalam(rg, "asrama"), list = santriAsrama(aid); let isi = 0;
  hari.forEach(t => list.forEach(s => { if (get("mutabaah", mutKey(s.id, t))) isi++; }));
  return { target: hari.length * list.length, isi, pct: pct(isi, hari.length * list.length) };
}

// ---------------- scope ----------------
export function santriScope(user) {
  if (user.kind === "wali") return [santriById(user.id)];
  const st = staffById(user.id), r = st.roles;
  if (r.includes("mudir") || r.includes("wadir_tahfidz") || r.includes("wadir_kurikulum") || r.includes("admin")) return santriList();
  let out = [];
  if (r.includes("wadir_kesantrian")) out = out.concat(santriList().filter(s => pondokOfSantri(s) === st.pondok));
  if (r.includes("musyrif")) { const a = asramaOf(st.id); if (a) out = out.concat(santriAsrama(a.id)); }
  if (r.includes("guru_tahfidz")) { const h = halaqahOf(st.id); if (h) out = out.concat(santriHalaqah(h.id)); }
  if (r.includes("guru_mapel")) st.ajar.forEach(([m, k]) => (out = out.concat(santriKelas(k))));
  const seen = new Set(); return out.filter(s => (seen.has(s.id) ? false : seen.add(s.id)));
}
