// Sinkron antarperangkat di luar Claude (misal GitHub Pages) lewat Firebase Firestore.
// Isi FIREBASE_CONFIG dengan konfigurasi proyek Firebase pondok (Project settings → Your apps → Web app).
// Bila kosong, aplikasi memakai penyimpanan browser (tidak sinkron antarperangkat).
export const FIREBASE_CONFIG = null;
/* contoh:
export const FIREBASE_CONFIG = { apiKey: "…", authDomain: "muawanahku.firebaseapp.com", projectId: "muawanahku", appId: "…" };
*/
const V = "10.12.2", imp = new Function("u", "return import(u)");
// Adaptor berbentuk sama dengan db Claude: collection(n).doc(id).set/delete, collection(n).onSnapshot(cb, err)
export async function connectFirestore(cfg) {
  const [{ initializeApp }, fs, au] = await Promise.all([
    imp(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`), imp(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`), imp(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`)]);
  const app = initializeApp(cfg);
  try { await au.signInAnonymously(au.getAuth(app)); } catch (e) { /* aturan Firestore boleh tanpa auth */ }
  const d = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache() });
  return {
    collection: name => ({
      doc: id => ({ set: obj => fs.setDoc(fs.doc(d, name, id), obj), delete: () => fs.deleteDoc(fs.doc(d, name, id)) }),
      onSnapshot: (cb, err) => fs.onSnapshot(fs.collection(d, name), { includeMetadataChanges: true }, snap => cb({ docs: snap.docs.map(x => ({ id: x.id, data: () => x.data() })), metadata: { fromCache: snap.metadata.fromCache } }), err),
    }),
  };
}
