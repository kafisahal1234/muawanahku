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
const V = "10.12.2", imp = new Function("u", "return import(u)");
// Firestore tidak menerima array di dalam array (misal ajar: [["it","9A"]]): dibungkus saat simpan, dibuka saat baca
const enc = v => (Array.isArray(v) ? v.map(x => (Array.isArray(x) ? { _arr: enc(x) } : enc(x))) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) : v);
const dec = v => (Array.isArray(v) ? v.map(dec) : v && typeof v === "object" ? (Object.keys(v).length === 1 && Array.isArray(v._arr) ? dec(v._arr) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dec(x)]))) : v);
// Adaptor berbentuk sama dengan db Claude: collection(n).doc(id).set/delete, collection(n).onSnapshot(cb, err)
export async function connectFirestore(cfg) {
  const [{ initializeApp }, fs, au] = await Promise.all([
    imp(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`), imp(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`), imp(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`)]);
  const app = initializeApp(cfg);
  try { await au.signInAnonymously(au.getAuth(app)); } catch (e) { console.warn("Login anonim gagal", e); throw new Error("Login Anonymous belum aktif (" + (e.code || e.message) + ")"); }
  const d = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache() });
  return {
    collection: name => ({
      // saat offline, tulisan diantre di perangkat dan dikirim otomatis begitu online; jangan menunggu server terlalu lama
      doc: id => ({ set: obj => Promise.race([fs.setDoc(fs.doc(d, name, id), enc(obj)), new Promise(r => setTimeout(r, 2500))]),
        delete: () => Promise.race([fs.deleteDoc(fs.doc(d, name, id)), new Promise(r => setTimeout(r, 2500))]) }),
      onSnapshot: (cb, err) => fs.onSnapshot(fs.collection(d, name), { includeMetadataChanges: true }, snap => cb({ docs: snap.docs.map(x => ({ id: x.id, data: () => dec(x.data()) })), metadata: { fromCache: snap.metadata.fromCache } }), err),
    }),
  };
}
