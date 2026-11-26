// Sinkron antarperangkat di luar Claude (misal GitHub Pages) lewat Firebase Firestore.
// Isi FIREBASE_CONFIG dengan konfigurasi proyek Firebase pondok (Project settings → Your apps → Web app).
// Bila kosong, aplikasi memakai penyimpanan browser (tidak sinkron antarperangkat).
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAlbrPGcntByPXrXrT9IYZNs58R3p61bZ8",
  authDomain: "muawanahku-15687.firebaseapp.com",
  projectId: "muawanahku-15687",
  storageBucket: "muawanahku-15687.firebasestorage.app",
  messagingSenderId: "520791575014",
  appId: "1:520791575014:web:a051c5bc28993ebb9dae27",
};
/* contoh:
export const FIREBASE_CONFIG = { apiKey: "…", authDomain: "muawanahku.firebaseapp.com", projectId: "muawanahku", appId: "…" };
*/
// Kunci situs reCAPTCHA v3 untuk App Check (kunci publik, aman ditaruh di kode). Kosong = App Check tidak dipakai.
export const RECAPTCHA_SITE_KEY = "6Lf_niouAAAAAKFfLbbhqqlEmbb_8rvdO5eSYM4K";
export const APPCHECK_TOKEN = "72009629-81FB-43D2-A284-B1A3E565E378";
export const V = "13.4.0", imp = new Function("u", "return import(u)");
let APP = null, FS = null, DB = null, AUTH = null;
// ---- Sesi masuk (mk_sesi/{uid}) ----
// Aturan database hanya membuka data pondok untuk perangkat yang punya sesi sah: dibuat saat ustadz/wali masuk dan
// diperiksa di server (sidik kata sandi / kode akses). Penulisan sesi menunggu konfirmasi server, bukan antrean HP.
const batasWaktu = (p, ms, pesan) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(Object.assign(new Error(pesan), { code: "timeout" })), ms))]);
const uidKu = () => (AUTH && AUTH.currentUser ? AUTH.currentUser.uid : null);
async function pastikanAuth() {
  for (let i = 0; i < 40 && AUTH && !AUTH.currentUser; i++) await new Promise(r => setTimeout(r, 250));
  if (!uidKu()) throw Object.assign(new Error("Belum tersambung ke database pondok. Periksa internet lalu coba lagi."), { code: "offline" });
}
export async function bacaSesi() {
  if (!DB) return null; await pastikanAuth();
  const ref = FS.doc(DB, "mk_sesi", uidKu());
  try { const s = await batasWaktu(FS.getDocFromServer(ref), 9000, "timeout"); return s.exists() ? s.data() : null; }
  catch (e) { if (/permission/i.test(String(e && e.code))) return null; try { const s = await FS.getDocFromCache(ref); return s.exists() ? s.data() : null; } catch (e2) { return null; } }
}
export async function tulisSesi(data) {
  if (!DB) throw Object.assign(new Error("Belum tersambung ke database pondok."), { code: "offline" });
  await pastikanAuth();
  await batasWaktu(FS.setDoc(FS.doc(DB, "mk_sesi", uidKu()), { ...data, ts: Date.now() }), 15000, "Koneksi lambat. Coba lagi saat sinyal lebih baik.");
}
export async function hapusSesi() { try { if (DB && uidKu()) await batasWaktu(FS.deleteDoc(FS.doc(DB, "mk_sesi", uidKu())), 6000, "timeout"); } catch (e) { } }
// Daftar kode akses wali di server (mk_kodeWali/{kode} = {santri}); diselaraskan dari akun staf
export async function selaraskanKodeWali(peta) {
  if (!DB) return 0;
  const snap = await FS.getDocsFromServer(FS.collection(DB, "mk_kodeWali")), ada = {};
  snap.docs.forEach(x => { ada[x.id] = (x.data() || {}).santri; });
  let n = 0;
  for (const [k, sid] of Object.entries(peta)) if (ada[k] !== sid) { await FS.setDoc(FS.doc(DB, "mk_kodeWali", k), { santri: sid }); n++; }
  for (const k of Object.keys(ada)) if (!(k in peta)) { await FS.deleteDoc(FS.doc(DB, "mk_kodeWali", k)); n++; }
  return n;
}
export const firebaseApp = () => APP;
// Firestore tidak menerima array di dalam array (misal ajar: [["it","9A"]]): dibungkus saat simpan, dibuka saat baca
const enc = v => (Array.isArray(v) ? v.map(x => (Array.isArray(x) ? { _arr: enc(x) } : enc(x))) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) : v);
const dec = v => (Array.isArray(v) ? v.map(dec) : v && typeof v === "object" ? (Object.keys(v).length === 1 && Array.isArray(v._arr) ? dec(v._arr) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dec(x)]))) : v);
// Adaptor berbentuk sama dengan db Claude: collection(n).doc(id).set/delete, collection(n).onSnapshot(cb, err)
export async function connectFirestore(cfg) {
  const [{ initializeApp }, fs, au] = await Promise.all([
    imp(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`), imp(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`), imp(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`)]);
  const app = initializeApp(cfg);
  if (RECAPTCHA_SITE_KEY && !(typeof self !== "undefined" && self.__MQ_EMU)) {
    // Token debug App Check (didaftarkan di Firebase → App Check → Apps → Kelola token debug) agar AI Logic menerima permintaan
    if (APPCHECK_TOKEN) self.FIREBASE_APPCHECK_DEBUG_TOKEN = APPCHECK_TOKEN;
    try { const ac = await imp(`https://www.gstatic.com/firebasejs/${V}/firebase-app-check.js`);
      ac.initializeAppCheck(app, { provider: new ac.ReCaptchaV3Provider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true }); }
    catch (e) { console.warn("App Check gagal dimuat", e); }
  }
  const auth = au.getAuth(app);
  const EMU = typeof self !== "undefined" && self.__MQ_EMU; // hanya untuk uji otomatis dengan Firebase Emulator
  if (EMU) au.connectAuthEmulator(auth, "http://" + EMU.auth, { disableWarnings: true });
  try { await Promise.race([auth.authStateReady(), new Promise(r => setTimeout(r, 4000))]); } catch (e) { }
  if (!auth.currentUser) {
    const masuk = () => au.signInAnonymously(auth);
    try { await masuk(); }
    catch (e) {
      // sinyal lemah/putus: tetap jalan memakai data tersimpan di HP; masuk ulang otomatis begitu sinyal kembali
      if (!/network|unavailable|timeout|internal/i.test(String(e && (e.code || e.message)))) { console.warn("Login anonim gagal", e); throw new Error("Login Anonymous belum aktif (" + (e.code || e.message) + ")"); }
      const ulang = () => { if (auth.currentUser) return; masuk().catch(() => setTimeout(ulang, 15000)); };
      addEventListener("online", ulang); setTimeout(ulang, 8000);
    }
  }
  const d = fs.initializeFirestore(app, EMU ? {} : { localCache: fs.persistentLocalCache() });
  if (EMU) fs.connectFirestoreEmulator(d, EMU.fsHost, EMU.fsPort);
  APP = app; FS = fs; DB = d; AUTH = auth;
  return {
    collection: name => ({
      // saat offline, tulisan diantre di perangkat dan dikirim otomatis begitu online; jangan menunggu server terlalu lama
      doc: id => ({ set: obj => Promise.race([fs.setDoc(fs.doc(d, name, id), enc(obj)), new Promise(r => setTimeout(r, 2500))]),
        delete: () => Promise.race([fs.deleteDoc(fs.doc(d, name, id)), new Promise(r => setTimeout(r, 2500))]) }),
      onSnapshot: (cb, err) => fs.onSnapshot(fs.collection(d, name), { includeMetadataChanges: true }, snap => cb({ docs: snap.docs.map(x => ({ id: x.id, data: () => dec(x.data()) })), metadata: { fromCache: snap.metadata.fromCache } }), err),
    }),
  };
}

// ---- Email pemulihan (Firebase Authentication email/sandi) ----
// Dipakai di instans terpisah agar sesi anonim database tidak terganggu.
let AUTH2 = null;
async function authSandi() {
  if (!APP) throw Object.assign(new Error("Butuh koneksi internet dan database tersambung."), { code: "offline" });
  if (!AUTH2) AUTH2 = (async () => {
    const [{ initializeApp }, au] = await Promise.all([imp(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`), imp(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`)]);
    const a = au.initializeAuth(initializeApp(APP.options, "sandi"), { persistence: au.inMemoryPersistence }); a.languageCode = "id";
    return { au, a };
  })().catch(e => { AUTH2 = null; throw e; });
  return AUTH2;
}
export const fbSiap = () => !!APP;
export async function fbMasuk(email, pw) { const { au, a } = await authSandi(); const c = await au.signInWithEmailAndPassword(a, email, pw); return c.user; }
export async function fbDaftar(email, pw) { const { au, a } = await authSandi(); const c = await au.createUserWithEmailAndPassword(a, email, pw); try { await au.sendEmailVerification(c.user); } catch (e) { } return c.user; }
export async function fbUbahSandi(email, lama, baru) { const { au } = await authSandi(); const u = await fbMasuk(email, lama); await au.updatePassword(u, baru); }
export async function fbLupa(email) {
  const { au, a } = await authSandi();
  try { await au.sendPasswordResetEmail(a, email, { url: location.origin + location.pathname }); }
  catch (e) { if (/continue-uri|unauthorized-domain/.test(e.code || "")) await au.sendPasswordResetEmail(a, email); else throw e; }
}
export function pesanAuth(e) {
  const c = (e && (e.code || e.message)) || "";
  if (/invalid-credential|wrong-password|invalid-login|user-not-found/.test(c)) return "Kata sandi salah.";
  if (/email-already-in-use/.test(c)) return "Email ini sudah dipakai.";
  if (/invalid-email/.test(c)) return "Format email tidak benar.";
  if (/weak-password/.test(c)) return "Kata sandi terlalu lemah (minimal 8 karakter, huruf dan angka).";
  if (/operation-not-allowed|configuration-not-found/.test(c)) return "Login Email/Password belum diaktifkan di Firebase (Authentication → Sign-in method).";
  if (/too-many-requests/.test(c)) return "Terlalu banyak percobaan. Tunggu beberapa menit.";
  if (/network|offline/.test(c)) return "Butuh koneksi internet.";
  if (/requires-recent-login/.test(c)) return "Silakan keluar lalu masuk lagi, kemudian ulangi.";
  return "Gagal: " + String(c).replace(/^auth\//, "");
}
const salahSandi = e => /invalid-credential|wrong-password|invalid-login|user-not-found|user-disabled/.test((e && e.code) || "");
export { salahSandi };
