// Pengirim notifikasi MuawanahQu — dijalankan GitHub Actions tiap 5 menit (04.00–22.00 WIB).
// Rahasia: FIREBASE_SA (isi JSON service account Firebase) di GitHub → Settings → Secrets → Actions.
// Mode uji (tanpa Firebase): node tools/notif/kirim.mjs --uji data.json "2026-11-30T05:16:00"
import { build } from "esbuild";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";

const DIR = dirname(fileURLToPath(import.meta.url)), BUNDEL = join(DIR, ".inti.mjs");
const SHIM = `globalThis.window ??= globalThis; globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
try { if (!globalThis.navigator) globalThis.navigator = { onLine: true, userAgent: "node" }; } catch (e) {}
globalThis.location ??= { hostname: "server", protocol: "https:", origin: "", pathname: "/" };`;
await build({ entryPoints: [join(DIR, "inti.js")], bundle: true, platform: "node", format: "esm", outfile: BUNDEL, banner: { js: SHIM }, logLevel: "error" });
const I = await import(pathToFileURL(BUNDEL).href + "?v=" + Date.now());

// dekode format penyimpanan aplikasi (array bersarang disimpan sebagai { _arr: [...] })
const dec = v => (Array.isArray(v) ? v.map(dec) : v && typeof v === "object" ? (Object.keys(v).length === 1 && Array.isArray(v._arr) ? dec(v._arr) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dec(x)]))) : v);
const KECIL = ["staffEdit", "asramaEdit", "halaqahEdit", "jadwal", "kalender", "mutLibur"];

const args = process.argv.slice(2);
if (args[0] === "--uji") {
  // uji lokal: data JSON (format S.data aplikasi) + waktu; cetak notifikasi yang akan dikirim
  const data = JSON.parse(readFileSync(args[1], "utf8")), now = args[2] ? new Date(args[2]) : new Date();
  const FIX = now.getTime(), D = Date; globalThis.Date = class extends D { constructor(...a) { super(...(a.length ? a : [FIX])); } static now() { return FIX; } };
  I.isiData(data);
  const ev = I.acara(now);
  console.log(JSON.stringify({ waktu: now.toString(), hariIni: I.hariIni(), jumlah: ev.length, acara: ev }, null, 1));
  process.exit(0);
}

if (!process.env.FIREBASE_SA) { console.log("FIREBASE_SA belum diisi di GitHub Secrets — notifikasi dilewati."); process.exit(0); }
const { initializeApp, cert } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
const { getMessaging } = await import("firebase-admin/messaging");
let SA; try { SA = JSON.parse(process.env.FIREBASE_SA.trim()); if (SA.type !== "service_account" || !SA.private_key) throw new Error("bukan service account"); }
catch (e) { console.log("FIREBASE_SA keliru: harus berisi SELURUH isi file .json service account (diawali tanda { dan berisi \"type\": \"service_account\"). Notifikasi dilewati."); process.exit(0); }
initializeApp({ credential: cert(SA) });
const db = getFirestore(), fcm = getMessaging(), now = new Date();
const ambil = async (col, q) => { const snap = await (q ? q(db.collection("mk_" + col)) : db.collection("mk_" + col)).get(); const o = {}; snap.forEach(d => (o[d.id] = dec(d.data()))); return o; };

// 1) data: koleksi kecil penuh + data hari ini saja
const cols = {};
for (const c of KECIL) cols[c] = await ambil(c);
I.isiData(cols);
const T = I.hariIni();
try { const jml = (await db.collection("mk_pushToken").count().get()).data().count; console.log(`Terhubung ke database. HP terdaftar: ${jml}. Kunci Web Push: ${(cols.kalender.setelan || {}).vapid ? "sudah diisi" : "BELUM diisi"}. Hari ${T}.`); } catch (e) { console.log("Cek pendaftaran HP gagal:", e.message); }
for (const c of ["absenHalaqah", "absenKelas", "izinGuru"]) cols[c] = await ambil(c, r => r.where("tanggal", "==", T));
cols.izin = await ambil("izin", r => r.where("status", "==", "aktif"));
// kejadian baru 20 menit terakhir (izin, santri kembali, BAP, izin guru, setoran tasmi')
const sejak = now.getTime() - 20 * 60e3, sejakIso = new Date(sejak).toISOString();
const baruIzin = await ambil("izin", r => r.where("ts", ">=", sejak)), kembali = await ambil("izin", r => r.where("kembaliAktual", ">=", sejakIso));
cols.izin = { ...cols.izin, ...baruIzin, ...kembali };
cols.bap = await ambil("bap", r => r.where("ts", ">=", sejak));
cols.izinGuru = { ...cols.izinGuru, ...(await ambil("izinGuru", r => r.where("ts", ">=", sejak))) };
cols.setoran = await ambil("setoran", r => r.where("ts", ">=", sejak));
const adaBaru = Object.keys(baruIzin).length + Object.keys(kembali).length + Object.keys(cols.bap).length + Object.keys(cols.setoran).length > 0;
cols.pengumuman = await ambil("pengumuman", r => r.orderBy("ts", "desc").limit(5));
I.isiData(cols);
if (adaBaru || I.perluSantri(now)) { cols.santriEdit = await ambil("santriEdit"); cols.mutabaah = await ambil("mutabaah", r => r.where("tanggal", "==", T)); }
if (I.perluSetoran(now)) cols.setoran = { ...cols.setoran, ...(await ambil("setoran", r => r.where("tanggal", "==", T))) };
I.isiData(cols);

// 2) notifikasi yang seharusnya terkirim, dikurangi yang sudah pernah terkirim
let ev = I.acara(now);
if (!ev.length) { console.log("Tidak ada notifikasi saat ini."); process.exit(0); }
const idLog = k => k.replace(/[\/]/g, "_");
const sudah = await db.getAll(...ev.map(e => db.collection("mk_notifLog").doc(idLog(e.kunci))));
ev = ev.filter((e, i) => !sudah[i].exists);
if (!ev.length) { console.log("Semua sudah terkirim sebelumnya."); process.exit(0); }

// 3) alamat HP + pilihan kategori
const tok = []; (await db.collection("mk_pushToken").get()).forEach(d => tok.push({ id: d.id, ...d.data() }));
const cocok = (t, p) => (p.semua ? t.jenis === p.semua : t.jenis === p.jenis && t.uid === p.uid);
const pesan = [];
// semua notifikasi dikirim (tanpa pilihan kategori)
ev.forEach(e => tok.filter(t => e.penerima.some(p => cocok(t, p))).forEach(t => pesan.push({ e, t })));
console.log(`${ev.length} notifikasi baru, ${pesan.length} kiriman ke HP.`);

// 4) kirim (data saja: tampilan diatur service worker aplikasi)
const gagalHapus = new Set();
for (let i = 0; i < pesan.length; i += 400) {
  const potong = pesan.slice(i, i + 400);
  const r = await fcm.sendEach(potong.map(({ e, t }) => ({ token: t.token,
    data: { judul: e.judul, isi: e.isi, tag: e.kunci.split(":").slice(0, 2).join(":"), buka: e.buka ? JSON.stringify(e.buka) : "" },
    webpush: { headers: { Urgency: "high", TTL: String(e.kat === "kbm" ? 3 * 3600 : 24 * 3600) } } })));
  r.responses.forEach((x, j) => { if (!x.success) { const kode = (x.error && x.error.code) || ""; console.log("gagal:", kode); if (/registration-token-not-registered|invalid-registration-token|invalid-argument/.test(kode)) gagalHapus.add(potong[j].t.id); } });
}
// 5) catat terkirim (anti dobel) + bersihkan alamat HP yang sudah tidak berlaku
const b = db.batch(); ev.forEach(e => b.set(db.collection("mk_notifLog").doc(idLog(e.kunci)), { ts: now.getTime(), kat: e.kat }));
gagalHapus.forEach(id => b.delete(db.collection("mk_pushToken").doc(id)));
await b.commit();
// bersihkan catatan lama (> 3 hari) sesekali
if (now.getMinutes() < 5 && now.getHours() === 4) { const lama = await db.collection("mk_notifLog").where("ts", "<", now.getTime() - 3 * 864e5).limit(400).get(); const bb = db.batch(); lama.forEach(d => bb.delete(d.ref)); if (!lama.empty) await bb.commit(); }
console.log("Selesai.", gagalHapus.size ? `${gagalHapus.size} alamat HP lama dihapus.` : "");
process.exit(0);
