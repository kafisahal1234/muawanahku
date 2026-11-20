// Penyimpanan: db bersama Claude (artifact) → Firebase (bila dikonfigurasi) → localStorage browser.
import { FIREBASE_CONFIG, connectFirestore } from "./cloud.js";
export const COLS = ["setoran", "absenHalaqah", "motd", "mutabaah", "izin", "bap", "absenKelas", "nilaiMapel", "nilaiTahfidz",
  "jadwal", "izinGuru", "pengumuman", "dataAwal", "santriEdit", "target", "akun", "hapusAkun", "raporCatatan", "kalender", "log", "staffEdit", "asramaEdit", "halaqahEdit", "profil"];
const LSKEY = "muawanahku_demo_v1";
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

export async function initStore() {
  loadLocal(); emit();
  S.mode = "local"; S.note = "Data tersimpan di browser ini saja.";
  let got = null;
  try {
    for (let i = 0; i < 20 && !(window.claude && typeof window.claude.use === "function"); i++) await new Promise(r => setTimeout(r, 100));
    if (window.claude && typeof window.claude.use === "function") got = await window.claude.use("db");
  } catch (e) { got = null; }
  let cloud = false;
  if (!got && FIREBASE_CONFIG && /^https?:$/.test(location.protocol)) { try { got = await connectFirestore(FIREBASE_CONFIG); cloud = true; } catch (e) { got = null; S.cloudErr = String((e && (e.code || e.message)) || e).slice(0, 160); } }
  if (!got) { S.ready = true; emit(); return; }
  db = got; S.mode = "db"; S.note = cloud ? "Data tersinkron antarperangkat (Firebase)." : "Data tersimpan bersama (semua akun demo melihat data yang sama).";
  COLS.forEach(c => (S.data[c] = {}));
  let pending = new Set(COLS);
  const timer = setTimeout(() => { if (!S.ready) { S.ready = true; S.note = "Data bersama belum terjangkau, mungkin belum terbaru."; emit(); } }, 10000);
  COLS.forEach(c => {
    db.collection("mk_" + c).onSnapshot(snap => {
      const o = {};
      snap.docs.forEach(d => { o[d.id] = d.data(); });
      S.data[c] = o;
      if (!snap.metadata.fromCache) pending.delete(c);
      if (pending.size === 0 && !S.ready) { S.ready = true; clearTimeout(timer); }
      emit();
    }, err => {
      pending.delete(c);
      if (pending.size === 0) { S.ready = true; clearTimeout(timer); }
      if (err && err.code === "revoked") S.readonly = true;
      if (err) S.cloudErr = String(err.code || err.message || err).slice(0, 160);
      if (err && err.code === "permission-denied") S.note = "Database menolak akses. Periksa aturan Firestore & login Anonymous.";
      emit();
    });
  });
}

export function all(col) { return Object.entries(S.data[col] || {}).map(([id, v]) => ({ id, ...v })); }
export function get(col, id) { const v = (S.data[col] || {})[id]; return v ? { id, ...v } : null; }

export async function put(col, id, obj) {
  const clean = JSON.parse(JSON.stringify(obj)); delete clean.id;
  S.data[col] = { ...S.data[col], [id]: clean }; emit();
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
