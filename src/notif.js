// Notifikasi HP (push) — Firebase Cloud Messaging untuk web.
// HP mendaftar sekali (izin + alamat notifikasi disimpan di mk_pushToken); pengirimnya jadwal otomatis GitHub Actions (tools/notif).
// Kunci Web Push (VAPID, publik) diisi Admin di layar Notifikasi → disimpan di Kalender/setelan.
import { useState, useEffect } from "preact/hooks";
import { html, nav, useApp, Icon, SubHeader, Btn, Card, Field } from "./ui.js";
import { S, put, tulisLangsung, hapusLangsung, toast, sebelumKeluar } from "./store.js";
import { firebaseApp, V, imp } from "./cloud.js";
import * as L from "./logic.js";
import { me } from "./common.js";

const LS = "mk_push", LS_TUTUP = "mk_push_ajak_tutup";
const baca = () => { try { return JSON.parse(localStorage.getItem(LS) || "null"); } catch (e) { return null; } };
const tulis = v => { try { v ? localStorage.setItem(LS, JSON.stringify(v)) : localStorage.removeItem(LS); } catch (e) { } };
const wali = () => nav.user && nav.user.kind === "wali";
export const vapid = () => String(L.setelan().vapid || "").trim();

export function kategori() {
  if (wali()) return [["harian", "Kabar harian ananda", "Setiap malam: kehadiran halaqah, setoran hafalan, murojaah"], ["izin", "Izin & kepulangan", "Saat ananda izin keluar dan saat sudah kembali ke pondok"],
    ["tasmi", "Kabar gembira", "Lulus tasmi' dan milad ananda"], ["info", "Info pondok", "Pengumuman, libur, dan catatan penting dari pondok"], ["laporan", "Laporan perkembangan", "Laporan pekanan (Sabtu 10.00) dan bulanan"]];
  const m = me() || { roles: [] }, r = m.roles || [], out = [];
  const hq = L.HALAQAH.some(h => h.guru === m.id), asr = L.ASRAMA.some(a => a.musyrif === m.id), mp = (m.ajar || []).length || L.jadwalAll().some(j => j.guru === m.id);
  if (hq) out.push(["hq", "Halaqah", "Absen saat sesi mulai, pengingat bila belum diabsen, santri yang belum setor ziyadah"]);
  if (mp) out.push(["kbm", "KBM mapel", "Absen kelas 15 menit setelah jam masuk, jurnal setelah jam selesai"]);
  if (asr) out.push(["mut", "Mutaba'ah", "Pengingat 20.30 dan sisa santri yang belum diisi (Senin–Jumat)"]);
  if (asr || r.some(x => ["wadir_kesantrian", "mudir"].includes(x))) out.push(["izin", "Kesantrian", "Izin baru, santri melewati batas izin, BAP baru"]);
  if (r.some(x => ["mudir", "wadir_tahfidz", "wadir_kurikulum", "wadir_kesantrian", "yayasan"].includes(x))) out.push(["rh", "Pantauan pimpinan", "Ringkasan harian 21.30, izin guru, santri lulus tasmi'"]);
  out.push(["info", "Info terbaru", "Pengumuman pondok, libur besok, milad santri"], ["laporan", "Laporan terbit", "Laporan pekanan (Sabtu 10.00), bulanan, mid, semester"]);
  return out;
}
const katBawaan = () => Object.fromEntries(kategori().map(([k]) => [k, true]));
const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const terpasang = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
export function statusPush() {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return ios() && !terpasang() ? "ios-pasang" : "tidak-didukung";
  if (!window.isSecureContext) return "tidak-didukung";
  if (Notification.permission === "denied") return "diblokir";
  const x = baca(); if (x && x.uid === (nav.user || {}).id && Notification.permission === "granted") return "aktif";
  if (!vapid()) return "belum-siap";
  return "mati";
}
async function sha(t) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("").slice(0, 40); }
async function daftarSW() { let r = await navigator.serviceWorker.getRegistration(); if (!r) r = await navigator.serviceWorker.register("sw.js"); await navigator.serviceWorker.ready; return r; }
async function messaging() { const m = await imp(`https://www.gstatic.com/firebasejs/${V}/firebase-messaging.js`); return { m, msg: m.getMessaging(firebaseApp()) }; }
const perangkat = () => { const u = navigator.userAgent; return /Android/.test(u) ? "Android" : ios() ? "iPhone/iPad" : /Windows/.test(u) ? "Windows" : /Mac/.test(u) ? "Mac" : "Perangkat lain"; };

export async function aktifkan(kat) {
  if (!firebaseApp()) throw new Error("Notifikasi hanya bisa diaktifkan di versi online.");
  if (!vapid()) throw new Error("Notifikasi belum disiapkan Admin (kunci Web Push belum diisi).");
  const izin = await Notification.requestPermission();
  if (izin !== "granted") throw new Error(izin === "denied" ? "Izin notifikasi ditolak. Buka pengaturan browser/HP untuk mengizinkan." : "Izin notifikasi belum diberikan.");
  const reg = await daftarSW(), { m, msg } = await messaging();
  const token = await m.getToken(msg, { vapidKey: vapid(), serviceWorkerRegistration: reg });
  if (!token) throw new Error("HP ini belum bisa menerima notifikasi. Coba lagi.");
  const id = await sha(token), u = nav.user, k = kat || (baca() || {}).kat || katBawaan();
  await tulisLangsung("pushToken", id, { token, jenis: u.kind === "wali" ? "wali" : "staff", uid: u.id, kat: k, perangkat: perangkat(), ts: Date.now() });
  tulis({ id, token, uid: u.id, kat: k });
  return true;
}
export async function simpanKategori(kat) { const x = baca(); if (!x) return; await tulisLangsung("pushToken", x.id, { token: x.token, jenis: wali() ? "wali" : "staff", uid: x.uid, kat, perangkat: perangkat(), ts: Date.now() }); tulis({ ...x, kat }); }
export async function matikan() {
  const x = baca(); if (!x) return;
  await hapusLangsung("pushToken", x.id);
  try { const { m, msg } = await messaging(); await m.deleteToken(msg); } catch (e) { }
  tulis(null);
}
// saat keluar akun: lepas notifikasi HP ini agar tidak terkirim ke akun berikutnya
sebelumKeluar.add(async () => { if (baca()) await matikan(); });
export async function cobaNotif() {
  const reg = await daftarSW();
  await reg.showNotification("MuawanahQu", { body: "Notifikasi sudah aktif di HP ini. Pengingat akan muncul sesuai jadwal.", icon: "icon-192.png", badge: "icon-192.png", tag: "uji", data: { buka: { s: "notifikasi" } } });
}
// segarkan pendaftaran sesekali (alamat notifikasi bisa berganti) — dipanggil saat aplikasi dibuka
export async function segarkanPush() {
  try { const x = baca(); if (!x || !nav.user || x.uid !== nav.user.id || Notification.permission !== "granted" || !vapid() || !firebaseApp()) return;
    if (Date.now() - (x.segar || 0) < 3 * 864e5) return;
    const reg = await daftarSW(), { m, msg } = await messaging(), token = await m.getToken(msg, { vapidKey: vapid(), serviceWorkerRegistration: reg });
    if (token && token !== x.token) { await hapusLangsung("pushToken", x.id); tulis(null); await aktifkan(x.kat); } else tulis({ ...x, segar: Date.now() });
  } catch (e) { }
}

// ---------- buka layar dari notifikasi ----------
export function bukaDariNotif(b) {
  try { const o = typeof b === "string" ? JSON.parse(decodeURIComponent(b)) : b; if (o && o.s) nav.go(o.s, o.p || {}); } catch (e) { }
}
export function pasangBukaNotif(SCREENS) {
  const cek = () => { const m = location.hash.match(/^#buka=(.+)$/); if (!m || !nav.user) return; history.replaceState(null, "", location.pathname + location.search); try { const o = JSON.parse(decodeURIComponent(m[1])); if (o && SCREENS[o.s]) nav.go(o.s, o.p || {}); } catch (e) { } };
  setTimeout(cek, 600); window.addEventListener("hashchange", cek);
  if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", e => { const o = e.data && e.data.buka; if (o && SCREENS[o.s] && nav.user) nav.go(o.s, o.p || {}); });
}

// ---------- ajakan di Beranda ----------
export function AjakNotif() {
  useApp();
  const [tutup, setTutup] = useState(() => { try { return Number(localStorage.getItem(LS_TUTUP) || 0) > Date.now(); } catch (e) { return false; } });
  const st = statusPush();
  if (tutup || !["mati", "ios-pasang"].includes(st) || !nav.user) return null;
  const sembunyi = e => { e.stopPropagation(); try { localStorage.setItem(LS_TUTUP, String(Date.now() + 14 * 864e5)); } catch (x) { } setTutup(true); };
  return html`<div class="ajak-notif" role="button" tabIndex="0" onClick=${() => nav.go("notifikasi")}>
    <span class="an-ic"><${Icon} n="bell" s=${21} /></span>
    <span class="an-t"><b>${st === "ios-pasang" ? "Pasang aplikasi untuk notifikasi" : "Aktifkan notifikasi"}</b><small>${wali() ? "Kabar harian ananda, pengumuman, dan laporan langsung ke HP." : "Pengingat absen, jurnal, mutaba'ah, dan info terbaru langsung ke HP."}</small></span>
    <button type="button" class="an-x" aria-label="Nanti saja" onClick=${sembunyi}><${Icon} n="x" s=${16} /></button></div>`;
}

// ---------- layar Notifikasi (Akun → Notifikasi) ----------
const JUDUL = { aktif: ["Notifikasi aktif", "HP ini akan menerima pengingat dan info sesuai pilihan di bawah."], mati: ["Notifikasi belum aktif", "Aktifkan agar pengingat input dan info terbaru muncul di HP walau aplikasi ditutup."],
  diblokir: ["Notifikasi diblokir", "Izin notifikasi untuk aplikasi ini ditolak. Buka pengaturan browser/HP → Notifikasi → izinkan MuawanahQu, lalu kembali ke sini."],
  "ios-pasang": ["Pasang aplikasi dulu", "Di iPhone/iPad, notifikasi hanya bisa diterima bila aplikasi dipasang: buka di Safari → tombol Bagikan → \"Tambah ke Layar Utama\", lalu buka dari ikon itu (minimal iOS 16.4)."],
  "tidak-didukung": ["Belum didukung di sini", "Browser ini tidak bisa menerima notifikasi. Pakai Chrome di Android, atau pasang aplikasi di iPhone lewat Safari."],
  "belum-siap": ["Menunggu Admin", "Notifikasi belum disiapkan. Admin perlu mengisi kunci Web Push sekali di halaman ini."] };
export function Notifikasi() {
  useApp();
  const [st, setSt] = useState(statusPush()), [sibuk, setSibuk] = useState(false), kat = katBawaan(), [kunci, setKunci] = useState(vapid());
  useEffect(() => setSt(statusPush()), [S.ver]);
  const admin = !wali() && ((me() || {}).roles || []).includes("admin"), [j, k] = JUDUL[st] || JUDUL.mati, s0 = L.setelan();
  const jalan = async f => { setSibuk(true); try { await f(); } catch (e) { toast(e.message || "Gagal.", "err"); } setSibuk(false); setSt(statusPush()); };
  const simpanKunci = () => jalan(async () => { if (await put("kalender", "setelan", { ...((S.data.kalender || {}).setelan || {}), vapid: kunci.trim() })) toast("Kunci Web Push disimpan"); });
  return html`<${SubHeader} title="Notifikasi" sub="Pengingat & info terbaru di HP" />
    <div class="wrap nt-wrap">
      <div class=${"nt-status " + st}><span class="nt-ic"><${Icon} n="bell" s=${24} /></span><div><b>${j}</b><p>${k}</p></div></div>
      ${st === "mati" ? html`<${Btn} icon="bell" disabled=${sibuk} onClick=${() => jalan(async () => { await aktifkan(kat); toast("Notifikasi aktif"); })}>${sibuk ? "Mengaktifkan…" : "Aktifkan notifikasi di HP ini"}</${Btn}>` : null}
      ${st === "aktif" ? html`<div class="btn-row"><${Btn} kind="ghost" icon="bell" onClick=${() => jalan(cobaNotif)}>Coba notifikasi</${Btn}><${Btn} kind="ghost" disabled=${sibuk} onClick=${() => jalan(async () => { await matikan(); toast("Notifikasi dimatikan di HP ini"); })}>Matikan</${Btn}></div>` : null}
      <${Card} title="Yang akan Anda terima">
        <ul class="nt-daftar">${kategori().map(([key, tt, d]) => html`<li><span class="nt-cek"><${Icon} n="check" s=${14} w=${3} /></span><span><b>${tt}</b><small>${d}</small></span></li>`)}</ul>
        <p class="small" style="margin:10px 0 0">Semua jenis notifikasi dikirim otomatis. Sabtu setelah pukul 10.00 dan Ahad tidak ada pengingat tugas.</p></${Card}>
      ${!wali() ? html`<${Card} title="Jadwal pengingat">
        <div class="nt-jadwal">
          <div><span>Halaqah Shubuh</span><b>${s0.jamHalaqah.Shubuh}</b></div><div><span>Halaqah Dhuha</span><b>${s0.jamHalaqah.Dhuha}</b></div><div><span>Halaqah Malam</span><b>${s0.jamHalaqah.Malam}</b></div>
          <div><span>KBM (bila belum diabsen)</span><b>${s0.kbmTunda} menit setelah masuk</b></div><div><span>Jurnal mengajar</span><b>Setelah jam selesai</b></div>
          <div><span>Mutaba'ah</span><b>${s0.jamMutabaah}</b></div><div><span>Laporan pekanan</span><b>Sabtu 10.00</b></div></div>
        <p class="small" style="margin:10px 0 0">Pengingat hanya dikirim bila input belum diisi, dan tidak dikirim saat hari libur. Jam bisa diubah di Kalender. Notifikasi bisa terlambat beberapa menit.</p></${Card}>` : null}
      ${admin ? html`<${Card} title="Pengaturan Admin">
        <${Field} label="Kunci Web Push (VAPID)" hint="Firebase Console → Project settings → Cloud Messaging → Web Push certificates → Key pair. Kunci ini publik, aman disimpan.">
          <input class="in" value=${kunci} placeholder="B…" onInput=${e => setKunci(e.target.value)} /></${Field}>
        <${Btn} kind="ghost" disabled=${sibuk || kunci.trim() === vapid()} onClick=${simpanKunci}>Simpan kunci</${Btn}></${Card}>` : null}
    </div>`;
}
