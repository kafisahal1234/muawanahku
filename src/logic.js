import { DATA } from "./data.js";
import { LIBUR_NASIONAL, SETELAN_DEFAULT } from "./libur.js";
import { S, all, get, put, subscribe, ONLINE } from "./store.js";
import { fbSiap, fbMasuk, salahSandi } from "./cloud.js";

// ---------------- tanggal ----------------
export const pad = n => String(n).padStart(2, "0");
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
export const HARI_ID = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
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
  // satu username = satu akun: bila ada username kembar, yang pertama yang dipakai (mencegah akun tampil dobel)
  const dipakai = new Set(), unik = [...base, ...extra].filter(s => { const u = String(s.username || "").toLowerCase(); if (!u) return true; if (dipakai.has(u)) return false; dipakai.add(u); return true; });
  STAFF.splice(0, STAFF.length, ...unik);
  ASRAMA.splice(0, ASRAMA.length, ...DATA.asrama.map(a => (ae[a.id] ? { ...a, ...ae[a.id] } : { ...a })));
  const he = S.data.halaqahEdit || {};
  // nama halaqah bawaan mengikuti nama guru terkini (bila Admin mengganti nama akun), kecuali bernama khusus
  const namaIkut = h => { if (h.namaTetap) return h; const g = STAFF.find(s => s.id === h.guru); return g ? { ...h, nama: "Halaqah " + g.pendek } : h; };
  const hb = DATA.halaqah.map(h => (he[h.id] ? { ...namaIkut(h), ...he[h.id] } : namaIkut(h))), hx = Object.entries(he).filter(([id]) => !DATA.halaqah.find(h => h.id === id)).map(([id, v]) => ({ id, ...v }));
  HALAQAH.splice(0, HALAQAH.length, ...hb.concat(hx).filter(h => !h.hapus));
}
subscribe(segarkanMaster); segarkanMaster();
export const staffById = id => STAFF.find(s => s.id === id);
export const staffAman = id => STAFF.find(s => s.id === id) || { id, nama: "(akun tidak ditemukan)", pendek: "(akun tidak ditemukan)", roles: [], ajar: [] };
export const asramaById = id => ASRAMA.find(a => a.id === id);
// Versi aman: tidak pernah undefined (santri dengan asrama kosong/tidak dikenal)
export const asramaAman = id => ASRAMA.find(a => a.id === id) || { id: id || "", nama: "Belum ada asrama", musyrif: null, pondok: "" };
export const santriAman = id => santriById(id) || { id, nama: "(santri sudah dihapus)", kelas: "", asrama: "", awal: { selesai: [], aktif: 30, baris: 0 } };
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
  const isi = o => Object.fromEntries(Object.entries(o || {}).filter(([k, v]) => !(["kelas", "asrama", "halaqah", "nama", "wali"].includes(k) && (v == null || v === ""))));
  const base = DATA.santri.map(s => (ed[s.id] ? { ...s, ...isi(ed[s.id]) } : s));
  const extra = Object.entries(ed).filter(([id]) => !DATA.santri.find(s => s.id === id)).map(([id, v]) => ({ id, awal: { selesai: [], aktif: 30, baris: 0 }, ...v }));
  return base.concat(extra).filter(s => !s.hapus).map(s => (s.halaqah && HALAQAH.some(h => h.id === s.halaqah) ? s : { ...s, halaqah: halaqahAsramaId(s.asrama) })).map(s => (typeof s.nama === "string" ? s : { ...s, nama: String(s.nama || "(tanpa nama)") })).sort((a, b) => a.nama.localeCompare(b.nama));
}
function halaqahAsramaId(aid) { const a = ASRAMA.find(x => x.id === aid), h = a && HALAQAH.find(x => x.guru === a.musyrif); return h ? h.id : null; }
export const santriById = id => santriList().find(s => s.id === id);
export const santriAsrama = aid => santriList().filter(s => s.asrama === aid);
export const santriHalaqah = hid => santriList().filter(s => s.halaqah === hid);
export const santriKelas = k => santriList().filter(s => s.kelas === k);
export const pondokOfSantri = s => (s && (s.kelas === "7" || s.kelas === "8") ? "29" : "21");
export const initials = n => String(n || "?").replace(/^(M\.?|Muhammad|Muhamad)\s+/i, "").split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();

// ---------------- akun ----------------
export async function sha(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
export const akunOv = u => (S.data.akun || {})[u] || null;
// Kata sandi tidak pernah disimpan apa adanya: yang disimpan hanya sidik acak (hash). Akun tanpa hash tidak bisa masuk.
// st = data akun (memakai st.sandiHash bawaan bila belum ada hash di database) atau string sandi bawaan lama.
export async function cekSandi(u, p, st) { const ov = akunOv(u), h = ov && ov.hash ? ov.hash : st && typeof st === "object" ? st.sandiHash : null; if (h) return (await sha(u + ":" + p)) === h; return typeof st === "string" && !!st && p === st; }
// Sandi bawaan saat Admin mereset: nama panggilan (tanpa gelar Ust./Miss) + 123, contoh Ust. Kafi → kafi123
export const sandiReset = st => { const w = String((st && (st.pendek || st.nama)) || "").replace(/^\s*(ust(adz|adzah|dzh|dz)?|ustazah|miss|mr|mrs|bu|pak)\.?\s+/i, "").trim().split(/\s+/)[0]; return (hurufKode(w) || (st && st.username) || "guru") + "123"; };
export const sandiAcak = () => { const a = "abcdefghjkmnpqrstuvwxyz", b = new Uint32Array(8); crypto.getRandomValues(b); return [...b].map((x, i) => (i < 4 ? a[x % a.length] : String(x % 10))).join(""); };
// hasil: {kind,id} | {err}
// Akun guru/pengurus: username + kata sandi. Akun yang dihapus Admin tidak bisa masuk.
export const staffAktif = () => STAFF.filter(s => !(akunOv(s.username) || {}).hapus);
// Bisa masuk dengan username atau email pemulihan. Bila akun memasang email, sandi diperiksa ke Firebase (agar reset lewat email berlaku);
// saat tidak tersambung internet, dipakai salinan sandi di perangkat.
export const staffDariEmail = e => { const x = String(e || "").trim().toLowerCase(); return x.includes("@") ? STAFF.find(s => ((akunOv(s.username) || {}).email || "") === x) : null; };
export async function login(username, password) {
  const masuk = (username || "").trim().toLowerCase(), p = password || "";
  // data akun guru ada di database: tunggu sinkron selesai dulu (maks. 25 detik) agar tidak salah dikira sandi keliru
  for (let i = 0; i < 100 && ONLINE() && !S.ready; i++) await new Promise(r => setTimeout(r, 250));
  const st = STAFF.find(s => s.username === masuk) || staffDariEmail(masuk);
  if (!st && ONLINE() && !S.ready) return { err: "Data akun belum termuat. Periksa internet lalu coba lagi." };
  const u = st ? st.username : masuk, ov = akunOv(u) || {};
  if (!st || ov.hapus || ov.nonaktif) return { err: "Username atau kata sandi salah." };
  if (ov.email && fbSiap()) {
    try {
      await fbMasuk(ov.email, p);
      const h = await sha(u + ":" + p);
      if (ov.hash !== h || ov.menungguReset) { const o = { ...ov, hash: h }; delete o.menungguReset; await put("akun", u, o); }
      return { kind: "staff", id: st.id };
    } catch (e) {
      if (salahSandi(e) && !(ov.menungguReset && (await cekSandi(u, p, st)))) return { err: "Username atau kata sandi salah." };
      if (salahSandi(e)) return { kind: "staff", id: st.id };
    }
  }
  if (!(await cekSandi(u, p, st))) return { err: "Username atau kata sandi salah." };
  return { kind: "staff", id: st.id };
}
// Wali santri: satu kotak kode akses = nama panggilan santri + tanggal lahir (DDMMYY), huruf kecil semua.
// Contoh: panggilan Atsal, lahir 7 September 2012 → atsal070912.
// Akun wali melekat pada data santri: santri dihapus → kode akses otomatis tidak berlaku.
export function lahirSantri(s) {
  if (s.lahir) return { tgl: s.lahir, contoh: false };
  const n = parseInt(String(s.id).replace(/\D/g, ""), 10) || 1, th = s.kelas === "7" ? 2013 : s.kelas === "8" ? 2012 : 2011;
  return { tgl: `${th}-${pad(((n * 5) % 12) + 1)}-${pad(((n * 7) % 28) + 1)}`, contoh: true };
}
// Kode akses dikunci (s.kode) begitu biodata diubah wali, agar kode tidak ikut berubah saat nama/tanggal lahir diperbaiki
export const hurufKode = x => String(x || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
export const tebakPanggilan = nama => String(nama || "").trim().split(/\s+/).find(x => !/^(m\.?|muh\.?|moh\.?|muhammad|muhamad|mohammad|ahmad)$/i.test(x)) || "";
export const dasarKode = s => hurufKode(s.panggilan) || hurufKode(tebakPanggilan(s.nama)) || hurufKode(s.wali) || "santri";
export const kodeHitung = s => { const [y, m, d] = lahirSantri(s).tgl.split("-"); return `${dasarKode(s)}${d}${m}${y.slice(-2)}`; };
// kode terkunci format lama (tahun 4 digit) diganti format baru; kode lama tetap diterima saat masuk agar wali tidak terkunci
const kodeFormatLama = k => /\d{8}$/.test(k || "");
export const kodeAkses = s => (s.kode && !kodeFormatLama(s.kode) ? s.kode : kodeHitung(s));
const kodeLama = s => { if (kodeFormatLama(s.kode)) return s.kode; const [y, m, d] = lahirSantri(s).tgl.split("-"); return `${s.wali}${d}${m}${y}`; };
const normKode = k => (k || "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function loginWali(kode) {
  const k = normKode(kode); if (!k) return { err: "Isi kode akses." };
  const sa = santriList().find(s => kodeAkses(s) === k) || santriList().find(s => normKode(kodeLama(s)) === k);
  return sa ? { kind: "wali", id: sa.id } : { err: "Kode akses tidak dikenal. Periksa nama panggilan dan tanggal lahir santri." };
}
export const usernameOf = user => (user.kind === "staff" ? staffAman(user.id).username : santriAman(user.id).wali);

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
// Tanda tangan tersimpan (PNG transparan) milik pejabat/ustadz; dipakai otomatis di surat, rapor, dan rekap PDF
export const TTD_ROLES = ["mudir", "wadir_tahfidz", "wadir_kurikulum", "wadir_kesantrian", "musyrif"];
export const ttdOf = id => { const t = id && get("ttd", id); return t && t.img ? t.img : null; };
export const mudirStaff = () => STAFF.find(s => (s.roles || []).includes("mudir")) || null;
// Nomor WhatsApp resmi pondok → tautan wa.me (0812… / +62 812… → 62812…)
export const waNomor = n => { let d = String(n || "").replace(/\D/g, ""); if (d.startsWith("0")) d = "62" + d.slice(1); else if (d.startsWith("8")) d = "62" + d; return d.length >= 10 ? d : ""; };
export const waLink = (n, teks) => { const d = waNomor(n); return d ? `https://wa.me/${d}${teks ? "?text=" + encodeURIComponent(teks) : ""}` : ""; };
export const setelan = () => { const st = (S.data.kalender || {}).setelan || {}; return { ...SETELAN_DEFAULT, ...st, waPondok: st.waPondok || SETELAN_DEFAULT.waPondok }; };
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
  if (jenis === "mutabaah") return d >= 1 && d <= 5; // Sabtu & Ahad libur mutaba'ah
  if (lb.some(l => l.jenis === "nasional" || l.jenis === "cuti")) return false;
  if (jenis === "kbm") return d >= 1 && d <= 5 && !lb.some(l => l.jenis === "kbm");
  return d >= 1 && d <= 6;
}
// Sabtu: halaqah Shubuh khusus manzil (tanpa ziyadah & murojaah); Ahad libur
export const khususManzil = (tgl = today()) => parseYmd(tgl).getDay() === 6;
export const liburMutabaah = (tgl = today()) => !hariAktif(tgl, "mutabaah");
export function hariRentang(dari, sampai) { const o = []; for (let t = dari; t <= sampai; t = addDays(t, 1)) o.push(t); return o; }
// rentang hitung: dipotong ke tanggal mulai pakai aplikasi dan hari ini
export function rentangHitung(rg) { const st = setelan(), t = today(); const dari = rg.dari < st.mulaiPakai ? st.mulaiPakai : rg.dari, sampai = rg.sampai > t ? t : rg.sampai; return { dari, sampai, kosong: dari > sampai }; }
export function hariAktifDalam(rg, jenis) { const r = rentangHitung(rg); return r.kosong ? [] : hariRentang(r.dari, r.sampai).filter(t => hariAktif(t, jenis)); }
export function semesterKini(tgl = today()) { const s = setelan(); return tgl >= s.genapMulai ? { nama: "Genap", mulai: s.genapMulai, mid: s.genapMid, selesai: s.genapSelesai } : { nama: "Ganjil", mulai: s.ganjilMulai, mid: s.ganjilMid, selesai: s.ganjilSelesai }; }
const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const PERIODE = [["harian", "Hari ini"], ["pekanan", "Pekanan"], ["bulanan", "Bulanan"], ["mid", "Mid"], ["semester", "Semester"], ["tahunan", "Tahunan"]];
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
let _idxSet = { ref: null, map: null };
function indeksSetoran() {
  const ref = S.data.setoran;
  if (_idxSet.ref !== ref) { const m = new Map(); all("setoran").forEach(r => { let l = m.get(r.santri); if (!l) m.set(r.santri, (l = [])); l.push(r); }); m.forEach(l => l.sort((a, b) => a.ts - b.ts)); _idxSet = { ref, map: m }; }
  return _idxSet.map;
}
// ---------------- Tahsin (Iqro' KH. As'ad Humam: jilid 1–6, lalu Al-Qur'an) ----------------
export const IQRA_HAL = 32; // tiap jilid ±32 halaman
export const TAHSIN_NILAI = { L: "Lancar", KL: "Kurang lancar", U: "Ulang" };
export function tahsinAwal(s) { const o = (S.data.tahsinAwal || {})[s.id]; if (o) return o.hapus ? null : o; return s.tahsin || null; }
export function tahsinRiwayat(sid) { return all("tahsin").filter(r => r.santri === sid).sort((a, b) => a.ts - b.ts); }
// Posisi tahsin terkini = data awal + seluruh catatan bacaan & ujian
export function tahsinStatus(s) {
  if (!s) return null;
  const aw = tahsinAwal(s), rec = tahsinRiwayat(s.id);
  if (!aw && !rec.length) return null;
  const st = { tingkat: (aw && aw.tingkat) || "iqra", jilid: aw ? aw.jilid || null : 1, hal: (aw && aw.hal) || 0, siapUjian: !!(aw && aw.ujian), ket: (aw && aw.ket) || "", gagal: false, terakhir: null };
  for (const r of rec) {
    if (aw && aw.ts && r.ts && r.ts < aw.ts && aw.awalSem) continue; // posisi impor terbaru sudah mencakup catatan sebelumnya
    st.terakhir = r;
    if (r.jenis === "baca") {
      if (r.tingkat === "quran") { st.tingkat = "quran"; if (r.posisi) st.ket = r.posisi; continue; }
      st.tingkat = "iqra"; st.jilid = r.jilid || st.jilid;
      if (r.nilai !== "U") st.hal = Math.max(r.jilid === st.jilid ? st.hal : 0, Number(r.sampai) || 0);
      if (r.siap || st.hal >= IQRA_HAL) st.siapUjian = true;
    } else if (r.jenis === "ujian") {
      if (r.lulus) { st.gagal = false; st.siapUjian = false; if ((r.jilid || st.jilid) >= 6) { st.tingkat = "quran"; st.ket = ""; } else { st.jilid = (r.jilid || st.jilid) + 1; st.hal = 0; } }
      else { st.gagal = true; st.siapUjian = false; }
    }
  }
  st.quran = st.tingkat === "quran";
  st.label = st.quran ? "Al-Qur'an" + (st.ket ? " · " + st.ket : "") : st.jilid ? `Iqro' ${st.jilid}` + (st.hal ? ` · hal. ${st.hal}` : "") : "Tingkat belum diatur";
  st.pendek = st.quran ? "Lulus Iqro'" : st.jilid ? `Iqro' ${st.jilid}` : "Belum diatur";
  // kemajuan Iqro' semester ini (halaman) dari posisi awal semester bila tercatat
  const posIq = (j, hl) => (Math.max(1, j) - 1) * IQRA_HAL + Math.min(hl || 0, IQRA_HAL);
  st.awalSem = aw && aw.awalSem ? aw.awalSem : null; st.lulus = (aw && aw.lulus) || [];
  st.halSemester = st.awalSem && st.awalSem.jilid ? Math.max(0, (st.quran ? 6 * IQRA_HAL : posIq(st.jilid, st.hal)) - posIq(st.awalSem.jilid, st.awalSem.hal)) : null;
  st.pct = st.quran ? 100 : st.jilid ? Math.min(100, Math.round((((st.jilid - 1) * IQRA_HAL + Math.min(st.hal, IQRA_HAL)) / (6 * IQRA_HAL)) * 100)) : 0;
  return st;
}
export const santriIqra = s => { const t = tahsinStatus(s); return !!t && !t.quran; };
export function setoranSantri(sid, kecuali) { const l = indeksSetoran().get(sid) || []; return kecuali ? l.filter(r => r.id !== kecuali) : l.slice(); }
export function hafalan(s, kecuali) {
  const aw = dataAwal(s);
  let selesai = [...(aw.selesai || [])], aktif = aw.aktif, baris = aw.baris || 0, khatam = false;
  for (const r of setoranSantri(s.id, kecuali)) {
    if (aw.ts && r.ts && r.ts < aw.ts) continue; // data awal yang diisi belakangan sudah mencakup setoran sebelumnya
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
// Halaman hafalan dari sebuah posisi (juz selesai × 20 + halaman di juz yang sedang dihafal)
export const halPosisi = h => (h.selesai || []).length * 20 + (h.khatam ? 0 : (h.baris || 0) / 15);
// Hafalan baru semester ini dalam halaman. Bila data awal mencatat "hafalan awal semester" (awalSemHal),
// hitungan = posisi sekarang − awal semester (termasuk hafalan sebelum aplikasi dipakai). Bila tidak, = setoran sejak data awal.
export function halSemester(s) {
  const aw = dataAwal(s), h = hafalan(s);
  if (aw && aw.awalSemHal != null && !isNaN(aw.awalSemHal)) return Math.max(0, halPosisi(h) - Number(aw.awalSemHal));
  const awH = { selesai: aw.selesai || [], baris: aw.baris || 0, khatam: false };
  return Math.max(0, barisTotal(h) - barisTotal(awH)) / 15;
}
export function capaianSemester(s) {
  const aw = dataAwal(s), h = hafalan(s);
  const n = Math.round(halSemester(s) * 15);
  const juzBaru = h.selesai.filter(j => !(aw.selesai || []).includes(j));
  const zi = setoranSantri(s.id).filter(r => r.jenis === "ziyadah" && r.lulus).length;
  return { baris: n, juzBaru, setor: zi, h };
}
// Capaian juz semester ini (hafalan baru sejak data awal semester), dalam satuan juz
// Target hafalan baru: 2 juz/semester (5 bulan aktif × 4 pekan) = 8 hal/bulan = 2 hal/pekan.
// Pengaturan lama (tanpa v2) diabaikan agar aturan baru berlaku.
export const BULAN_AKTIF = 5, PEKAN_PER_BULAN = 4;
export const targetSemester = () => { const t = (S.data.target || {}).semester; return (t && t.v2 && Number(t.juz)) || 2; };
// target halaman per periode (berdasarkan target semester)
export function targetHal(jenis) { const halSem = targetSemester() * 20, bln = halSem / BULAN_AKTIF, pk = bln / PEKAN_PER_BULAN;
  return { harian: pk / 5, pekanan: pk, bulanan: bln, mid: halSem / 2, semester: halSem, tahunan: halSem * 2 }[jenis] ?? pk; }
export const fmtHal = h => { const r = Math.round(h * 10) / 10; return r >= 20 ? `${(r / 20).toLocaleString("id-ID", { maximumFractionDigits: 2 })} juz` : `${r.toLocaleString("id-ID")} hal`; };
export function capaianJuz(s) {
  const aw = dataAwal(s), h = hafalan(s), prog = (sel, akt, br) => j => (sel.includes(j) ? 1 : j === akt ? Math.min(1, (br || 0) / juzLines(j)) : 0);
  const a = prog(aw.selesai || [], aw.aktif, aw.baris), b = prog(h.selesai, h.khatam ? null : h.aktif, h.baris);
  const juz = aw && aw.awalSemHal != null ? halSemester(s) / 20 : DATA.urutanJuz.reduce((x, j) => x + Math.max(0, b(j) - a(j)), 0), t = targetSemester();
  return { juz: Math.round(juz * 100) / 100, target: t, pct: Math.min(100, Math.round((juz / t) * 100)), tercapai: juz >= t, kurang: Math.max(0, Math.round((t - juz) * 10) / 10) };
}
// Perkembangan hafalan dalam periode: dari setoran ziyadah lulus & tasmi' lulus bertanggal dalam rentang
export function hafalanDalam(sid, rg) {
  const r = rentangHitung(rg); if (r.kosong) return { baris: 0, setor: 0, tasmi: [], hari: 0 };
  const l = setoranSantri(sid).filter(x => x.tanggal >= r.dari && x.tanggal <= r.sampai);
  const z = l.filter(x => x.jenis === "ziyadah" && x.lulus), hariSetor = new Set(z.map(x => x.tanggal)).size;
  return { baris: z.reduce((n, x) => n + Math.max(0, (x.sesudah || 0) - (x.sebelum || 0)), 0), setor: z.length, hari: hariSetor, tasmi: l.filter(x => x.jenis === "tasmi" && x.lulus).map(x => x.juz) };
}
// Kesantrian dalam periode: izin, terlambat kembali, BAP, poin MOTD
export function kesantrianDalam(sid, rg) {
  const r = rentangHitung(rg), inR = t => t && t.slice(0, 10) >= r.dari && t.slice(0, 10) <= r.sampai;
  if (r.kosong) return { izin: 0, telat: 0, bap: 0, poinBap: 0, poinMotd: 0 };
  const iz = all("izin").filter(i => i.santri === sid && inR(i.keluar)), bap = all("bap").filter(b => b.santri === sid && inR(b.tanggal));
  const pm = motdCatatan(sid).filter(c => inR(c.tanggal)).reduce((n, c) => n + c.poin, 0);
  return { izin: iz.length, telat: iz.filter(i => i.telat || terlambat(i)).length, bap: bap.length, poinBap: bap.reduce((n, b) => n + (b.poin || 0), 0), poinMotd: pm };
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
// MOTD dinonaktifkan (menu dihapus): data lama tidak lagi dihitung sebagai pelanggaran/poin
export const MOTD_AKTIF = false;
export function motdCatatan(sid) {
  if (!MOTD_AKTIF) return [];
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
    if (src === "motd") { if (!MOTD_AKTIF) return; const d = get("motd", motdKey(s.asrama, tgl, key)); res[idx] = d ? (d.status[s.id] === "H" || d.status[s.id] === "M") : null; }
    else { const d = get("absenHalaqah", halaqahKey(s.halaqah, tgl, key)); res[idx] = d ? d.status[s.id] === "H" : null; }
  });
  return res;
}
// ---- Mutaba'ah yang adil ----
// (A) Rapel: hari aktif yang terlewat boleh diisi menyusul paling lambat RAPEL_HARI hari kemudian (ditandai "menyusul").
// (B) Hari tidak dinilai: wali asrama izin (dari Izin Guru) atau ditandai manual dengan alasan; hari itu tidak dihitung bila kosong.
// (C) Santri sedang izin pada hari itu: tidak dihitung bila kosong.
// Hari yang sudah diisi selalu dihitung. Hari aktif lain yang kosong tetap bernilai 0.
export const RAPEL_HARI = 7;
export const mutLiburKey = (aid, tgl) => `${aid}_${tgl}`;
export const ALASAN_TIDAK_DINILAI = ["Wali asrama sakit", "Wali asrama izin/pulang", "Kegiatan pondok", "Lainnya"];
export function mutTidakDinilai(aid, tgl) {
  const m = get("mutLibur", mutLiburKey(aid, tgl)); if (m) return { manual: true, alasan: m.alasan, ket: m.ket || "", oleh: m.oleh, ts: m.ts };
  const a = asramaById(aid); if (!a || !a.musyrif) return null;
  const iz = all("izinGuru").find(i => i.guru === a.musyrif && i.tanggal === tgl);
  return iz ? { otomatis: true, alasan: `Wali asrama ${String(iz.jenis || "izin").toLowerCase()} (Izin Guru)` } : null;
}
let _idxIzin = { v: -1, map: null };
function indeksIzin() {
  if (_idxIzin.v !== S.ver || !_idxIzin.map) { const m = new Map(), kini = new Date();
    all("izin").forEach(i => { if (!i.keluar) return; const sampai = i.kembaliAktual ? new Date(i.kembaliAktual) : i.status === "aktif" ? new Date(Math.max(new Date(i.kembali || i.keluar).getTime(), kini.getTime())) : new Date(i.kembali || i.keluar);
      let l = m.get(i.santri); if (!l) m.set(i.santri, (l = [])); l.push([ymd(new Date(i.keluar)), ymd(sampai)]); });
    _idxIzin = { v: S.ver, map: m }; }
  return _idxIzin.map;
}
export const izinPadaTgl = (sid, tgl) => (indeksIzin().get(sid) || []).some(([a, b]) => a <= tgl && tgl <= b);
// alasan sah sebuah hari kosong tidak dihitung untuk santri (null = tetap dihitung)
export function alasanTidakDinilai(sid, tgl) {
  const s = santriById(sid); const b = s && mutTidakDinilai(s.asrama, tgl); if (b) return b.alasan;
  return izinPadaTgl(sid, tgl) ? "Santri sedang izin" : null;
}
export function hariMutSantri(sid, rg) {
  const semua = hariAktifDalam(rg, "mutabaah"), dinilai = semua.filter(t => get("mutabaah", mutKey(sid, t)) || !alasanTidakDinilai(sid, t));
  return { semua, dinilai };
}
// tanggal yang masih boleh diisi menyusul (hari aktif mutaba'ah, sebelum hari ini, dalam batas rapel)
export function tglRapel(tgl = today()) { const o = []; for (let i = 1; i <= RAPEL_HARI; i++) { const t = addDays(tgl, -i); if (t >= setelan().mulaiPakai && hariAktif(t, "mutabaah")) o.push(t); } return o; }
export const bisaRapel = tgl => tglRapel().includes(tgl);
export function mutPersen(sid, rg = rgSemester()) {
  const { semua, dinilai: hari } = hariMutSantri(sid, rg); if (!hari.length) return { ibadah: null, adab: null, hari: 0, isi: 0, kosong: 0, dikecualikan: semua.length, menyusul: 0 };
  let ib = 0, ad = 0, isi = 0, menyusul = 0;
  hari.forEach(t => { const d = get("mutabaah", mutKey(sid, t)); if (d) { isi++; if (d.menyusul) menyusul++; ib += (d.ibadah || []).length; ad += (d.adab || []).length; } });
  return { ibadah: pct(ib, hari.length * DATA.ibadah.length), adab: pct(ad, hari.length * DATA.adab.length), hari: hari.length, isi, kosong: hari.length - isi, dikecualikan: semua.length - hari.length, menyusul };
}
export function predikatMut(v) {
  if (v == null || isNaN(v)) return { h: "—", t: "Belum ada data", c: "muted" };
  if (v >= 90) return { h: "A", t: "Istimewa", c: "green" };
  if (v >= 75) return { h: "B", t: "Baik", c: "blue" };
  if (v >= 60) return { h: "C", t: "Cukup", c: "gold" };
  return { h: "D", t: "Perlu bimbingan", c: "red" };
}
export function mutPerButir(sid, rg = rgSemester()) {
  const hari = hariMutSantri(sid, rg).dinilai, n = hari.length, docs = hari.map(t => get("mutabaah", mutKey(sid, t))).filter(Boolean);
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
  const list = santriAsrama(aid); let isi = 0, target = 0, menyusul = 0, dikecualikan = 0;
  list.forEach(s => { const { semua, dinilai } = hariMutSantri(s.id, rg); target += dinilai.length; dikecualikan += semua.length - dinilai.length;
    dinilai.forEach(t => { const d = get("mutabaah", mutKey(s.id, t)); if (d) { isi++; if (d.menyusul) menyusul++; } }); });
  const hariLibur = hariAktifDalam(rg, "mutabaah").filter(t => mutTidakDinilai(aid, t)).length;
  return { target, isi, pct: pct(isi, target), menyusul, dikecualikan, hariLibur };
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

// ---------- rekap pelanggaran per periode ----------
// Ringan = dari MOTD (alpa/masbuq: teguran & hukuman ringan) + BAP bertingkat ringan; Sedang & Berat = dari BAP kesantrian.
export function pelanggaranDalam(sid, rg) {
  const r = rentangHitung(rg), out = { ringan: 0, sedang: 0, berat: 0, poinRingan: 0, poinSB: 0, alpa: 0, masbuq: 0, bap: [] };
  if (r.kosong) return out;
  motdCatatan(sid).filter(c => c.tanggal >= r.dari && c.tanggal <= r.sampai).forEach(c => { out.ringan++; out.poinRingan += c.poin; if (c.st === "A") out.alpa++; else out.masbuq++; });
  all("bap").filter(b => b.santri === sid && b.tanggal >= r.dari && b.tanggal <= r.sampai).forEach(b => {
    const t = String(b.tingkat || "Sedang").toLowerCase(); out.bap.push(b);
    if (t === "ringan") { out.ringan++; out.poinRingan += b.poin || 0; } else { out[t === "berat" ? "berat" : "sedang"]++; out.poinSB += b.poin || 0; }
  });
  return out;
}
// ---------- projek mapel per periode ----------
export function projekDalam(mapel, kelas, rg) {
  const d = get("nilaiMapel", nilaiKey(mapel, kelas)); if (!d || !d.projekList) return [];
  const r = rentangHitung(rg), tglDok = d.ts ? ymd(new Date(d.ts)) : null;
  return d.projekList.map(p => {
    const tgl = p.tgl || tglDok, nil = Object.values((d.projekNilai || {})[p.id] || {}).filter(x => x !== "" && x != null).map(Number);
    return { ...p, tgl, nilai: (d.projekNilai || {})[p.id] || {}, dinilai: nil.length, rata: nil.length ? Math.round(nil.reduce((a, b) => a + b, 0) / nil.length) : null };
  }).filter(p => !r.kosong && p.tgl && p.tgl >= r.dari && p.tgl <= r.sampai);
}

// ---------------- Rekap per modul ----------------
const rata0 = xs => { const v = xs.filter(x => x != null && !isNaN(x)).map(Number); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
// Tahfidz satu santri dalam periode: kehadiran, ziyadah, murojaah, manzil, tasmi', tahsin
export function tahfidzDalam(sid, rg) {
  const r = rentangHitung(rg), kh = kehadiranHalaqah(sid, rg);
  const o = { kh, zBaris: 0, zHari: 0, zSetor: 0, muro: 0, muroHal: 0, muroNilai: null, manzil: 0, manzilNilai: null, tasmiLulus: [], tasmiUji: 0, tahsin: 0, tahsinHal: 0 };
  if (r.kosong) return o;
  const dlm = x => x.tanggal >= r.dari && x.tanggal <= r.sampai, l = setoranSantri(sid).filter(dlm);
  const z = l.filter(x => x.jenis === "ziyadah" && x.lulus), m = l.filter(x => x.jenis === "murojaah"), n = l.filter(x => x.jenis === "manzil"), t = l.filter(x => x.jenis === "tasmi");
  o.zBaris = z.reduce((a, x) => a + Math.max(0, (x.sesudah || 0) - (x.sebelum || 0)), 0); o.zSetor = z.length; o.zHari = new Set(z.map(x => x.tanggal)).size;
  o.muro = m.length; o.muroHal = m.reduce((a, x) => a + Math.max(1, (Number(x.halSampai) || 0) - (Number(x.halDari) || 0) + 1), 0); o.muroNilai = rata0(m.map(x => x.nilai));
  o.manzil = n.length; o.manzilNilai = rata0(n.map(x => x.nilai));
  o.tasmiUji = t.length; o.tasmiLulus = t.filter(x => x.lulus).map(x => x.juz);
  const th = all("tahsin").filter(x => x.santri === sid && dlm(x) && x.jenis === "baca"); o.tahsin = th.length; o.tahsinHal = th.reduce((a, x) => a + (x.dari != null ? Math.max(1, x.sampai - x.dari + 1) : 0), 0);
  return o;
}
// Shalat berjamaah (MOTD) satu santri: dihitung dari waktu yang sudah diabsen
export function shalatDalam(sid, rg) {
  const s = santriById(sid), c = { H: 0, M: 0, S: 0, I: 0, A: 0 }; let isi = 0;
  if (!s) return { ...c, isi, pct: null };
  hariAktifDalam(rg, "asrama").forEach(t => WAKTU.forEach(([w]) => { const d = get("motd", motdKey(s.asrama, t, w)), v = d && d.status && d.status[sid]; if (v && c[v] != null) { c[v]++; isi++; } }));
  return { ...c, isi, pct: isi ? Math.round(((c.H + c.M) / isi) * 100) : null };
}
export function izinDalam(sid, rg) {
  const r = rentangHitung(rg); if (r.kosong) return { n: 0, telat: 0, list: [] };
  const list = all("izin").filter(i => i.santri === sid && i.keluar && ymd(new Date(i.keluar)) >= r.dari && ymd(new Date(i.keluar)) <= r.sampai);
  return { n: list.length, telat: list.filter(i => i.telat || terlambat(i)).length, list };
}
