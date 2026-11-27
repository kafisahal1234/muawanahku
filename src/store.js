// Penyimpanan: db bersama Claude (artifact) → Firebase (bila dikonfigurasi) → localStorage browser.
import { FIREBASE_CONFIG, connectFirestore, bacaSesi, tulisSesi, hapusSesi } from "./cloud.js";
export const COLS = ["setoran", "absenHalaqah", "motd", "mutabaah", "izin", "bap", "absenKelas", "nilaiMapel", "nilaiTahfidz",
  "jadwal", "izinGuru", "pengumuman", "dataAwal", "santriEdit", "target", "akun", "hapusAkun", "raporCatatan", "kalender", "log", "staffEdit", "asramaEdit", "halaqahEdit", "profil", "ttd", "tahsin", "tahsinAwal", "mutLibur", "khidmah"];
const LSKEY = "muawanahku_demo_v1"; // nama lama sengaja dipertahankan (aplikasi kini MuawanahQu) agar data lokal & antrean tidak hilang
export const S = { ready: false, mode: "local", note: "", data: {}, ver: 0, readonly: false };
COLS.forEach(c => (S.data[c] = {}));
const subs = new Set();
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
function emit() { S.ver++; subs.forEach(f => { try { f(S.ver); } catch (e) { console.error(e); } }); }
let db = null;
const toastFns = new Set();
export function onToast(fn) { toastFns.add(fn); return () => toastFns.delete(fn); }
export function toast(msg, kind = "ok") { toastFns.forEach(f => f(msg, kind)); }

function loadLocal() {
  try { const raw = localStorage.getItem(LSKEY); if (raw) { const d = JSON.parse(raw); COLS.forEach(c => (S.data[c] = d[c] || {})); } } catch (e) { }
}
function saveLocal() { try { localStorage.setItem(LSKEY, JSON.stringify(S.data)); } catch (e) { } }

// Versi online (situs pondok): data hanya dari database. Bila belum tersambung, input disimpan sementara
// di HP (antrean) dan dikirim otomatis begitu tersambung — tidak pernah diam-diam memakai data lokal/bawaan.
export const ONLINE = () => !!FIREBASE_CONFIG && /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const OUTBOX = "mk_antrean_v1";
const bacaAntrean = () => { try { return JSON.parse(localStorage.getItem(OUTBOX) || "[]"); } catch (e) { return []; } };
const tulisAntrean = l => { try { l.length ? localStorage.setItem(OUTBOX, JSON.stringify(l)) : localStorage.removeItem(OUTBOX); } catch (e) { } };
function antre(op) { const l = bacaAntrean().filter(x => !(x.col === op.col && x.id === op.id)); l.push(op); tulisAntrean(l); S.antrean = l.length; }
async function kirimAntrean() {
  const l = bacaAntrean(); if (!l.length || !db) return;
  let ok = 0; const sisa = [];
  for (const x of l) { try { if (x.hapus) await db.collection("mk_" + x.col).doc(x.id).delete(); else await db.collection("mk_" + x.col).doc(x.id).set(x.obj); ok++; } catch (e) { sisa.push(x); } }
  tulisAntrean(sisa); S.antrean = sisa.length; emit();
  if (ok) toast(`${ok} data yang tertunda sudah tersimpan ke database pondok`);
}
let mencoba = false;
export async function sambungUlang() {
  if (mencoba || S.mode === "db") return; mencoba = true; S.menyambung = true; emit();
  try { const got = await connectFirestore(FIREBASE_CONFIG); mulaiDb(got, true); S.terputus = false; S.cloudErr = ""; }
  catch (e) { S.cloudErr = String((e && (e.code || e.message)) || e).slice(0, 160); S.terputus = true; }
  mencoba = false; S.menyambung = false; emit();
  if (S.terputus) setTimeout(sambungUlang, navigator.onLine ? 20000 : 8000);
}
// Tarik-untuk-segarkan: sambung ulang bila terputus, kirim input tertunda, lalu gambar ulang layar
export async function segarkan() {
  if (S.terputus || (ONLINE() && S.mode !== "db")) await sambungUlang();
  else if (bacaAntrean().length && db) await kirimAntrean();
  emit();
}
export async function initStore() {
  if (!ONLINE()) loadLocal();
  else bacaAntrean().forEach(x => { if (x.hapus) { const o = { ...S.data[x.col] }; delete o[x.id]; S.data[x.col] = o; } else S.data[x.col] = { ...S.data[x.col], [x.id]: x.obj }; });
  S.antrean = bacaAntrean().length; emit();
  S.mode = "local"; S.note = "Data tersimpan di browser ini saja.";
  let got = null;
  try {
    for (let i = 0; i < 20 && !(window.claude && typeof window.claude.use === "function"); i++) await new Promise(r => setTimeout(r, 100));
    if (window.claude && typeof window.claude.use === "function") got = await window.claude.use("db");
  } catch (e) { got = null; }
  let cloud = false;
  // Uji lokal (localhost) tidak pernah tersambung ke data asli pondok
  if (!got && FIREBASE_CONFIG && /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) { try { got = await connectFirestore(FIREBASE_CONFIG); cloud = true; } catch (e) { got = null; S.cloudErr = String((e && (e.code || e.message)) || e).slice(0, 160); } }
  if (!got && ONLINE()) { S.terputus = true; S.ready = true; emit(); addEventListener("online", () => sambungUlang()); setTimeout(sambungUlang, 5000); return; }
  if (!got) { S.ready = true; emit(); return; }
  mulaiDb(got, cloud);
}
function mulaiDb(got, cloud) {
  db = got; S.mode = "db"; S.cloud = cloud; S.note = cloud ? "Data tersinkron antarperangkat (Firebase)." : "Data tersimpan bersama (semua akun demo melihat data yang sama).";
  setTimeout(kirimAntrean, 1500); addEventListener("online", () => setTimeout(kirimAntrean, 1500));
  if (!cloud) { dengar(null); return; }
  // Database pondok hanya terbuka untuk perangkat yang punya sesi masuk sah (lihat firestore.rules)
  S.ready = false; emit();
  bacaSesi().then(s => {
    S.sesi = s;
    if (s) dengar(s.jenis);
    else { COLS.forEach(c => (S.data[c] = {})); S.perluMasuk = true; S.ready = true; emit(); }
  });
}
// koleksi yang hanya boleh dibaca staf (sidik kata sandi, permintaan hapus akun)
const KHUSUS_STAF = ["akun", "hapusAkun"];
let unsubs = [];
function berhentiDengar() { unsubs.forEach(f => { try { f(); } catch (e) { } }); unsubs = []; }
function dengar(jenis) {
  berhentiDengar();
  const cols = jenis === "wali" ? COLS.filter(c => !KHUSUS_STAF.includes(c)) : COLS;
  COLS.forEach(c => (S.data[c] = {}));
  S.ready = false;
  let pending = new Set(cols);
  const timer = setTimeout(() => { if (!S.ready) { S.ready = true; S.note = "Data bersama belum terjangkau, mungkin belum terbaru."; emit(); } }, 10000);
  cols.forEach(c => {
    const u = db.collection("mk_" + c).onSnapshot(snap => {
      const o = {};
      snap.docs.forEach(d => { o[d.id] = d.data(); });
      S.data[c] = o;
      if (!snap.metadata.fromCache) pending.delete(c);
      bacaAntrean().filter(x => x.col === c).forEach(x => { if (x.hapus) { const o2 = { ...S.data[c] }; delete o2[x.id]; S.data[c] = o2; } else S.data[c] = { ...S.data[c], [x.id]: x.obj }; });
      if (pending.size === 0 && !S.ready) { S.ready = true; clearTimeout(timer); }
      emit();
    }, err => {
      pending.delete(c);
      if (pending.size === 0) { S.ready = true; clearTimeout(timer); }
      if (err && err.code === "revoked") S.readonly = true;
      if (err) S.cloudErr = String(err.code || err.message || err).slice(0, 160);
      if (err && err.code === "permission-denied") { if (S.cloud && S.sesi && Date.now() - (S.jedaSesi || 0) < 30000) S.dengarUlang = true; else if (S.cloud && S.sesi) S.sesiHabis = true; else S.note = "Database menolak akses. Periksa aturan Firestore."; }
      emit();
    });
    if (typeof u === "function") unsubs.push(u);
  });
}
const tungguSiap = async (ms = 25000) => { for (let i = 0; i < ms / 250 && !S.ready; i++) await new Promise(r => setTimeout(r, 250)); };
const tungguDb = async (ms = 20000) => { for (let i = 0; i < ms / 250 && !(S.mode === "db" && db); i++) await new Promise(r => setTimeout(r, 250)); return S.mode === "db" && !!db; };
// Dipakai saat masuk: buat sesi di server (ditolak bila sandi/kode salah), lalu muat data pondok
export async function masukSesi(data) {
  if (!(await tungguDb())) throw Object.assign(new Error("Belum tersambung ke database pondok. Periksa internet lalu coba lagi."), { code: "offline" });
  await tulisSesi(data);
  S.sesi = data; S.perluMasuk = false; S.sesiHabis = false; dengar(data.jenis); emit();
  await tungguSiap();
}
// sesudah sandi sendiri diganti: sesi diperbarui lalu data didengar ulang (pendengar lama sempat ditolak server)
export function dengarUlang() { if (S.cloud && S.sesi) { S.dengarUlang = false; dengar(S.sesi.jenis); } }
export async function perbaruiSesi(extra) { if (!S.cloud || !S.sesi) return; const d = { ...S.sesi, ...extra }; await tulisSesi(d); S.sesi = d; }
export async function keluarSesi() {
  if (!S.cloud) return;
  berhentiDengar(); await hapusSesi();
  S.sesi = null; S.perluMasuk = true; S.sesiHabis = false; COLS.forEach(c => (S.data[c] = {})); S.ready = true; emit();
}
export const pakaiSesi = () => S.mode === "db" && !!S.cloud;

export function all(col) { return Object.entries(S.data[col] || {}).map(([id, v]) => ({ id, ...v })); }
export function get(col, id) { const v = (S.data[col] || {})[id]; return v ? { id, ...v } : null; }

export async function put(col, id, obj) {
  const clean = JSON.parse(JSON.stringify(obj)); delete clean.id;
  S.data[col] = { ...S.data[col], [id]: clean }; emit();
  if (S.mode !== "db" && ONLINE()) { antre({ col, id, obj: clean, ts: Date.now() }); emit(); if (!S._peringatan) { S._peringatan = true; toast("Belum tersambung ke database. Data disimpan sementara di HP dan dikirim otomatis saat tersambung.", "err"); } sambungUlang(); return true; }
  if (S.mode === "db" && db) {
    try { await db.collection("mk_" + col).doc(id).set(clean); }
    catch (e) {
      if (e && e.code === "unavailable") { try { await new Promise(r => setTimeout(r, 600 + Math.random() * 600)); await db.collection("mk_" + col).doc(id).set(clean); return true; } catch (e2) { } }
      if (e && e.code === "quota_exceeded") toast("Penyimpanan demo penuh. Hapus data demo lewat menu Akun.", "err");
      else if (e && e.code === "invalid_argument") { S.readonly = true; toast("Akun Anda hanya bisa melihat, tidak bisa menyimpan.", "err"); }
      else toast("Gagal menyimpan ke server. Coba lagi.", "err");
      return false;
    }
  } else saveLocal();
  return true;
}
export async function del(col, id) {
  const o = { ...S.data[col] }; delete o[id]; S.data[col] = o; emit();
  if (S.mode !== "db" && ONLINE()) { antre({ col, id, hapus: true, ts: Date.now() }); emit(); sambungUlang(); return; }
  if (S.mode === "db" && db) { try { await db.collection("mk_" + col).doc(id).delete(); } catch (e) { toast("Gagal menghapus.", "err"); } }
  else saveLocal();
}
export async function resetAll() {
  for (const c of COLS) {
    const ids = Object.keys(S.data[c] || {});
    for (const id of ids) {
      if (S.mode === "db" && db) { try { await db.collection("mk_" + c).doc(id).delete(); } catch (e) { } }
    }
    S.data[c] = {};
  }
  saveLocal(); emit();
}
export function uid(p = "r") { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
