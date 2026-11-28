import { render, Component } from "preact";
import * as PT from "./s_pantauan.js";
import { pasangTarik } from "./tarik.js";
import { pasangZoom } from "./zoom.js";
import { pasangHitung } from "./hitung.js";
import { useEffect, useState } from "preact/hooks";
import { html, nav, useApp, Icon, ToastHost } from "./ui.js";
import { S, initStore, sambungUlang, toast } from "./store.js";
import { selaraskanKodeWali } from "./cloud.js";
import * as L from "./logic.js";
import * as T from "./s_tahfidz.js";
import * as A from "./s_asrama.js";
import * as M from "./s_mapel.js";
import * as K from "./s_kurikulum.js";
import * as KS from "./s_kesantrian.js";
import * as W from "./s_wadir.js";
import * as AD from "./s_admin.js";
import * as SA from "./s_santri.js";
import * as WA from "./s_wa.js";
import * as AK from "./s_akun.js";
import * as HM from "./s_home.js";
import * as SY from "./s_system.js";
import * as RK from "./s_rekap.js";
import * as RM from "./s_rekapmodul.js";
import * as HQ from "./s_halaqah.js";
import * as PF from "./s_profil.js";
import * as KO from "./s_koreksi.js";
import * as AI from "./s_ai.js";
import * as AS from "./s_asisten.js";
import * as HB from "./s_hafalanbulan.js";
import * as TT from "./s_ttd.js";
import * as TS from "./s_tahsin.js";
import * as KH from "./s_khidmah.js";
import { me } from "./common.js";
import { LOGO } from "./data.js";
import { APP_LOGO } from "./logo_app.js";
import { FotoAv, fotoUser } from "./common.js";
import { aiAda } from "./ai.js";
import { LOGO as LOGO2 } from "./data.js";
import { all } from "./store.js";
import { terapkanTema, terapkanBahasa } from "./i18n.js";

const SCREENS = {
  tahfidz: T.Tahfidz, absenHalaqah: T.AbsenHalaqah, setorList: T.SetorList, ziyadah: T.Ziyadah, murojaah: T.Murojaah, manzilList: T.ManzilList, manzil: T.Manzil,
  tasmiList: T.TasmiList, tasmi: T.Tasmi, ujianList: T.UjianList, ujian: T.Ujian, progres: T.Progres, izinGuru: T.IzinGuru,
  mutabaah: A.Mutabaah, izinCatatan: A.IzinCatatan, asramaSaya: A.AsramaSaya, khidmah: KH.Khidmah, khidmahRiwayat: KH.KhidmahRiwayat, rekapKhidmah: KH.RekapKhidmah, hafalanBulan: HB.RekapHafalanBulan, tandaTangan: TT.TandaTangan, ujianIqra: TS.UjianIqra, pesanWali: WA.PesanWali, daftarAkun: AK.DaftarAkun, kontakUstadz: WA.KontakUstadz, tahsinList: TS.TahsinList, tahsin: TS.Tahsin, rekapTahsin: TS.RekapTahsin,
  mapel: M.Mapel, absenKelasPilih: M.AbsenKelasPilih, absenKelas: M.AbsenKelas, jurnalPilih: M.JurnalPilih, jurnalKelas: M.JurnalKelas, nilaiPilih: M.NilaiPilih, nilaiMapel: M.NilaiMapel, rekapKelasPilih: M.RekapKelasPilih, rekapKelas: M.RekapKelas,
  kurikulum: K.Kurikulum, jamPelajaran: K.JamPelajaran, jadwal: K.Jadwal, pengampu: K.Pengampu, kinerjaGuru: K.KinerjaGuru, rekapKehadiran: K.RekapKehadiran, rekapNilai: K.RekapNilai, rekapIzinGuru: K.RekapIzinGuru,
  kesantrian: KS.Kesantrian, suratIzin: KS.SuratIzin, izinView: KS.IzinView, catatKembali: KS.CatatKembali, formBap: KS.FormBap, bapView: KS.BapView, surat: KS.SuratView, histori: KS.Histori, rekapIzin: KS.RekapIzin, rekapPelanggaran: KS.RekapPelanggaran, rekapMotd: KS.RekapMotd,
  pengelolaan: W.Pengelolaan, dataAwal: W.DataAwal, targetHafalan: W.TargetHafalan, kinerjaTahfidz: W.KinerjaTahfidz, rekapHalaqah: W.RekapHalaqah, peringkat: W.Peringkat, rekapTasmi: W.RekapTasmi, bawahKkm: W.BawahKkm,
  dataMaster: AD.DataMaster, santriAdmin: AD.SantriAdmin, akunAdmin: AD.AkunAdmin, asramaAdmin: AD.AsramaAdmin, kelasAdmin: AD.KelasAdmin, impor: AI.ImporSantri, imporAwal: AI.ImporAwal, asisten: AS.Asisten, imporJadwal: AI.ImporJadwal, pengumuman: AD.Pengumuman,
  ubahSandi: SY.UbahSandi, privasi: SY.Privasi, bantuan: SY.Bantuan, tentang: SY.Tentang,
  pantauan: PT.PantauanSantri, modulMudir: PT.ModulMudir, santri: SA.SantriDetail, raporList: SA.RaporList, raporView: SA.RaporView, kinerjaAll: SA.KinerjaAll,
  profil: PF.Profil, keamanan: PF.Keamanan, waliProfil: PF.WaliProfil,
  halaqahAdmin: HQ.HalaqahAdmin, halaqahEdit: HQ.HalaqahEdit,
  rekap: RM.RekapPintu, waliRekap: RK.WaliRekap, rekapDetail: RM.RekapDetailPintu, rekapTahfidz: RM.RekapTahfidz, rekapMapel: RM.RekapMapel, rekapAsrama: RM.RekapAsrama, rekapKesantrian: RM.RekapKesantrian, kalender: RK.Kalender, logUbah: KO.LogPerubahan, riwayatModul: KO.RiwayatModul,
};
// rekap lama diarahkan ke rekap berbasis hari aktif
Object.assign(SCREENS, {
  rekapHalaqah: () => html`<${RM.RekapTahfidz} />`, kinerjaTahfidz: () => html`<${RM.RekapTahfidz} />`, kinerjaGuru: () => html`<${RM.RekapMapel} modul="kurikulum" />`,
  rekapKehadiran: () => html`<${RM.RekapMapel} modul="kurikulum" />`, rekapMotd: () => html`<${RM.RekapAsrama} />`, motdAll: () => html`<${RM.RekapAsrama} />`,
  rekapKelas: () => html`<${RM.RekapMapel} modul="mapel" />`,
});
const STAFF_TABS = { home: HM.Beranda, jadwal: HM.JadwalSaya, cari: HM.CariSantri, riwayat: HM.RiwayatSaya, akun: HM.Akun };
const WALI_TABS = { home: HM.WaliBeranda, hafalan: HM.WaliHafalan, ananda: HM.WaliAnanda, izin: HM.WaliIzin, akun: HM.Akun };

function BottomNav({ wali }) {
  // 5 tab; tab tengah tampil sebagai tombol bulat menonjol (pola aplikasi dompet/santri)
  const items = wali ? [["home", "Beranda", "home"], ["hafalan", "Hafalan", "bookopen"], ["ananda", "Ananda", "heart"], ["izin", "Izin", "door"], ["akun", "Akun", "user"]]
    : [["home", "Beranda", "home"], ["jadwal", "Jadwal", "calendar"], ["cari", "Cari", "search"], ["riwayat", "Riwayat", "clock"], ["akun", "Akun", "user"]];
  return html`<nav class="bnav" aria-label="Navigasi utama">${items.map(([k, lab, ic], i) => i === 2
    ? html`<button class=${"fab-tab " + (nav.tab === k ? "on" : "")} aria-current=${nav.tab === k ? "page" : null} onClick=${() => nav.setTab(k)}><span class="fab"><${Icon} n=${ic} s=${28} w=${2.4} /></span><em>${lab}</em></button>`
    : html`<button class=${nav.tab === k ? "on" : ""} aria-current=${nav.tab === k ? "page" : null} onClick=${() => nav.setTab(k)}><i><${Icon} n=${ic} s=${26} /></i><em>${lab}</em></button>`)}</nav>`;
}
// Navigasi samping khusus layar laptop/PC (di HP/tablet disembunyikan lewat CSS)
function SideNav({ wali }) {
  const u = nav.user, nama = wali ? "Wali " + L.santriAman(u.id).nama : L.staffAman(u.id).nama;
  const peran = wali ? "Wali santri" : L.staffAman(u.id).roles.map(r => L.ROLE_LABEL[r]).join(" · ");
  const items = wali ? [["home", "Beranda", "home"], ["hafalan", "Hafalan", "bookopen"], ["ananda", "Ananda", "heart"], ["izin", "Izin", "door"], ["akun", "Akun", "user"]]
    : [["home", "Beranda", "home"], ["jadwal", "Jadwal", "calendar"], ["cari", "Cari santri", "search"], ["riwayat", "Riwayat", "clock"], ["akun", "Akun", "user"]];
  const baru = all("pengumuman").filter(p => Date.now() - p.ts < 7 * 864e5).length, aktif = !nav.top;
  return html`<aside class="side" aria-label="Navigasi">
    <div class="side-brand"><span class="ht-logo applogo"><img src=${APP_LOGO} alt="" /></span><div><b>Muawanah<i>Qu</i></b><small>Kampung Qur'an Al Muawanah</small></div></div>
    <button class="side-user" onClick=${() => nav.setTab("akun")}><${FotoAv} src=${fotoUser(u)} nama=${nama} size=${44} /><span><b>${nama}</b><small>${peran}</small></span></button>
    <nav class="side-nav">${items.map(([k, lab, ic]) => html`<button class=${aktif && nav.tab === k ? "on" : ""} onClick=${() => nav.setTab(k)}><${Icon} n=${ic} s=${21} w=${2.2} /><span>${lab}</span></button>`)}
      <hr />
      <button class=${nav.top && nav.top.screen === "pengumuman" ? "on" : ""} onClick=${() => nav.go("pengumuman")}><${Icon} n="bell" s=${21} w=${2.2} /><span>Pengumuman</span>${baru ? html`<b class="side-badge">${baru}</b>` : null}</button>
      ${aiAda() ? html`<button class=${nav.top && nav.top.screen === "asisten" ? "on" : ""} onClick=${() => nav.go("asisten")}><${Icon} n="chat" s=${21} w=${2.2} /><span>Asisten AI</span></button>` : null}</nav>
    <small class="side-foot">MuawanahQu ${"1.0.0"}</small></aside>`;
}
function useOnline() {
  const [on, setOn] = useState(typeof navigator === "undefined" || navigator.onLine !== false);
  useEffect(() => { const a = () => setOn(true), b = () => setOn(false); window.addEventListener("online", a); window.addEventListener("offline", b); return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); }; }, []);
  return on;
}

class Boundary extends Component {
  constructor() { super(); this.state = { err: null }; }
  componentDidCatch(e) { console.error(e); this.setState({ err: e }); }
  render() {
    if (this.state.err) return html`<div class="wrap"><div class="note red"><${Icon} n="alert" s=${18} /><span>Halaman ini mengalami kesalahan${nav.top ? " (" + nav.top.screen + ")" : ""}: ${String(this.state.err.message || this.state.err)}</span></div>
      <button class="btn primary full" onClick=${() => { this.setState({ err: null }); nav.home(); }}>Kembali ke beranda</button></div>`;
    return this.props.children;
  }
}

function Splash({ nama }) {
  const kb = nav.kembali, dur = kb ? 1500 : 2200, j = new Date().getHours();
  const salam = j < 11 ? "Selamat pagi" : j < 15 ? "Selamat siang" : j < 18 ? "Selamat sore" : "Selamat malam";
  useEffect(() => { const t = setTimeout(() => nav.endSplash(), dur); return () => clearTimeout(t); }, []);
  return html`<div class=${"splash sp2" + (kb ? " kb" : "")} style=${`--dur:${dur}ms`} role="status" aria-live="polite">
    <div class="sp-stage"><svg class="sp-svg" viewBox="0 0 200 200" aria-hidden="true"><circle class="sp-c0" cx="100" cy="100" r="92" /><circle class="sp-c1" cx="100" cy="100" r="92" /><circle class="sp-c2" cx="100" cy="100" r="80" /></svg>
      <span class="sp-glow"></span>${Array.from({ length: 8 }, (_, i) => html`<i class="sp-star" style=${`--i:${i}`}></i>`)}
      <span class="sp-logo applogo"><img src=${APP_LOGO} alt="" /><i class="sp-shine"></i></span></div>
    <b class="sp-t">${"Assalamu'alaikum".split("").map((c, i) => html`<span style=${`--k:${i}`}>${c}</span>`)}</b><small>${nama}</small>
    <em class="sp-waktu">${kb ? "Selamat datang kembali" : salam} · ${L.fmtTgl(L.today())}</em><i class="sp-bar"><em></em></i></div>`;
}
function App() {
  useApp(); const online = useOnline();
  // Daftarkan kode akses wali ke server (dipakai aturan database untuk sesi wali); hanya dari akun staf, saat data santri berubah
  useEffect(() => { if (!(S.ready && S.cloud && S.sesi && S.sesi.jenis === "staff")) return; const tm = setTimeout(() => {
    const peta = L.petaKodeWali(), sig = JSON.stringify(peta); if (sig === App._kw) return; App._kw = sig;
    selaraskanKodeWali(peta).catch(e => { App._kw = ""; console.warn("Kode wali belum terdaftar", e); }); }, 2500); return () => clearTimeout(tm); }, [S.ver]);
  useEffect(() => { initStore(); try { const u = JSON.parse(localStorage.getItem("mk_user") || sessionStorage.getItem("mk_user") || "null"); if (u) nav.setUser(u, { splash: true, kembali: true }); } catch (e) { } }, []);
  const u = nav.user;
  // Database terkunci per sesi: pengguna lama tanpa sesi / sesi yang tidak lagi sah diminta masuk ulang
  const sesiBeda = u && S.sesi && ((u.kind === "staff") !== (S.sesi.jenis === "staff") || (S.sesi.sid && u.kind === "staff" && S.sesi.sid !== u.id));
  if (u && (S.perluMasuk || S.sesiHabis || sesiBeda)) {
    const habis = S.sesiHabis; nav.setUser(null); L.keluarAkun();
    toast(habis ? "Sesi berakhir (kata sandi diubah atau akun dinonaktifkan). Silakan masuk lagi." : "Demi keamanan data pondok, silakan masuk sekali lagi.");
    return null;
  }
  if (!u) return html`<div class="app nonav"><${HM.Login} /><${ToastHost} /></div>`;
  const hilang = (u.kind === "staff" && (!L.staffById(u.id) || (L.akunOv(L.staffAman(u.id).username) || {}).hapus)) || (u.kind === "wali" && !L.santriById(u.id));
  if (hilang && S.ready) { nav.setUser(null); L.keluarAkun(); return null; }
  if (hilang) return html`<div class="app nonav"><div class="loadpill" role="status">Memuat data…</div></div>`;
  const wali = u.kind === "wali", top = nav.top;
  const Screen = top ? SCREENS[top.screen] : (wali ? WALI_TABS : STAFF_TABS)[nav.tab];
  const key = top ? top.screen + JSON.stringify(top.params) + nav.depth : "tab-" + nav.tab;
  return html`<div class=${"app" + (top ? " sub" : "")}><${SideNav} wali=${wali} /><div class=${"scr dir-" + nav.dir} key=${key}><${Boundary}>${Screen ? html`<${Screen} ...${top ? top.params : {}} />` : null}</${Boundary}></div>
    ${nav.splash ? html`<${Splash} nama=${wali ? "Wali " + L.santriAman(u.id).nama : L.staffAman(u.id).pendek} />` : null}
    ${S.terputus ? html`<div class="sync-bar" role="alert"><span><b>Belum tersambung ke database pondok.</b> ${S.antrean ? `${S.antrean} input tersimpan sementara di HP, dikirim otomatis saat tersambung.` : "Data yang tampil mungkin belum terbaru."}</span><button type="button" onClick=${() => sambungUlang()} disabled=${S.menyambung}>${S.menyambung ? "Menyambung…" : "Coba lagi"}</button></div>`
      : !online ? html`<div class="loadpill" role="status" style="color:#A8261C">Tidak ada sinyal. Data yang tampil dari HP; input dikirim saat online lagi.</div>`
      : !S.ready ? html`<div class="loadpill" role="status">Menyambungkan data…</div>`
      : S.antrean ? html`<div class="loadpill" role="status">Mengirim ${S.antrean} input tertunda…</div>` : null}${top ? null : html`<${BottomNav} wali=${wali} />`}<${ToastHost} /></div>`;
}
// iOS (mode aplikasi/PWA): setelah keyboard ditutup, tinggi layar kadang tidak kembali sehingga navigasi bawah
// (position:fixed) ikut terangkat ke tengah layar. Paksa browser menghitung ulang tata letak setelah keyboard tertutup.
try {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) {
    let tm = 0;
    const isian = () => { const e = document.activeElement; return !!e && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) || e.isContentEditable); };
    const rapikan = () => { clearTimeout(tm); tm = setTimeout(() => { if (isian()) return; const y = window.scrollY; window.scrollTo(window.scrollX, y + 1); window.scrollTo(window.scrollX, y);
      document.documentElement.style.height = "100.1%"; requestAnimationFrame(() => { document.documentElement.style.height = ""; }); }, 250); };
    document.addEventListener("focusout", rapikan, true);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", rapikan);
    window.addEventListener("orientationchange", rapikan); window.addEventListener("pageshow", rapikan);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) rapikan(); });
    document.addEventListener("click", e => { if (e.target && e.target.closest && e.target.closest(".bnav")) rapikan(); }, true);
  }
} catch (e) { }
// Rasa aplikasi asli: tanpa zoom cubit/ketuk-ganda, efek sentuh (ripple), service worker di hosting sendiri
try {
  // cubit-perbesar dikunci di zoom.js (ketuk 3 kali untuk mode perbesar); ketuk-ganda tidak memperbesar (touch-action: manipulation)
  document.addEventListener("pointerdown", e => {
    const el = e.target.closest && e.target.closest(".btn,button.row,.menu-row,.sched,.demo-acc,.rk,.pchip");
    if (!el || el.disabled) return;
    const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, sp = document.createElement("span");
    sp.className = "rpl"; sp.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.overflow = "hidden"; el.appendChild(sp); setTimeout(() => sp.remove(), 600);
  }, { passive: true });
  if ("serviceWorker" in navigator && location.protocol === "https:" && window.top === window && !/claude|anthropic/.test(location.hostname)) navigator.serviceWorker.register("sw.js").catch(() => {});
} catch (e) { }
terapkanTema(); terapkanBahasa(); try { pasangTarik(); } catch (e) { } try { pasangZoom(); } catch (e) { } try { pasangHitung(); } catch (e) { }
render(html`<${App} />`, document.getElementById("root"));
