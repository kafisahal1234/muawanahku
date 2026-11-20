import { render, Component } from "preact";
import { useEffect, useState } from "preact/hooks";
import { html, nav, useApp, Icon, ToastHost } from "./ui.js";
import { S, initStore } from "./store.js";
import * as L from "./logic.js";
import * as T from "./s_tahfidz.js";
import * as A from "./s_asrama.js";
import * as M from "./s_mapel.js";
import * as K from "./s_kurikulum.js";
import * as KS from "./s_kesantrian.js";
import * as W from "./s_wadir.js";
import * as AD from "./s_admin.js";
import * as SA from "./s_santri.js";
import * as HM from "./s_home.js";
import * as SY from "./s_system.js";
import * as RK from "./s_rekap.js";
import * as HQ from "./s_halaqah.js";
import * as PF from "./s_profil.js";
import * as KO from "./s_koreksi.js";
import { me } from "./common.js";
import { LOGO } from "./data.js";

const SCREENS = {
  tahfidz: T.Tahfidz, absenHalaqah: T.AbsenHalaqah, setorList: T.SetorList, ziyadah: T.Ziyadah, murojaah: T.Murojaah, manzilList: T.ManzilList, manzil: T.Manzil,
  tasmiList: T.TasmiList, tasmi: T.Tasmi, ujianList: T.UjianList, ujian: T.Ujian, progres: T.Progres, izinGuru: T.IzinGuru,
  motd: A.Motd, mutabaah: A.Mutabaah, izinCatatan: A.IzinCatatan,
  mapel: M.Mapel, absenKelasPilih: M.AbsenKelasPilih, absenKelas: M.AbsenKelas, nilaiPilih: M.NilaiPilih, nilaiMapel: M.NilaiMapel, rekapKelasPilih: M.RekapKelasPilih, rekapKelas: M.RekapKelas,
  kurikulum: K.Kurikulum, jamPelajaran: K.JamPelajaran, jadwal: K.Jadwal, pengampu: K.Pengampu, kinerjaGuru: K.KinerjaGuru, rekapKehadiran: K.RekapKehadiran, rekapNilai: K.RekapNilai, rekapIzinGuru: K.RekapIzinGuru,
  kesantrian: KS.Kesantrian, suratIzin: KS.SuratIzin, izinView: KS.IzinView, catatKembali: KS.CatatKembali, formBap: KS.FormBap, bapView: KS.BapView, histori: KS.Histori, rekapIzin: KS.RekapIzin, rekapPelanggaran: KS.RekapPelanggaran, rekapMotd: KS.RekapMotd,
  pengelolaan: W.Pengelolaan, dataAwal: W.DataAwal, targetHafalan: W.TargetHafalan, kinerjaTahfidz: W.KinerjaTahfidz, rekapHalaqah: W.RekapHalaqah, peringkat: W.Peringkat, rekapTasmi: W.RekapTasmi, bawahKkm: W.BawahKkm,
  dataMaster: AD.DataMaster, santriAdmin: AD.SantriAdmin, akunAdmin: AD.AkunAdmin, asramaAdmin: AD.AsramaAdmin, kelasAdmin: AD.KelasAdmin, impor: AD.Impor, pengumuman: AD.Pengumuman,
  ubahSandi: SY.UbahSandi, privasi: SY.Privasi, bantuan: SY.Bantuan, tentang: SY.Tentang,
  santri: SA.SantriDetail, raporList: SA.RaporList, raporView: SA.RaporView, motdAll: SA.MotdRekapAll, kinerjaAll: SA.KinerjaAll,
  profil: PF.Profil, keamanan: PF.Keamanan,
  halaqahAdmin: HQ.HalaqahAdmin, halaqahEdit: HQ.HalaqahEdit,
  rekap: RK.RekapHub, rekapDetail: RK.RekapDetail, kalender: RK.Kalender, logUbah: KO.LogPerubahan,
};
// rekap lama diarahkan ke rekap berbasis hari aktif
Object.assign(SCREENS, {
  rekapHalaqah: () => RK.RekapHub({ tab: "halaqah" }), kinerjaTahfidz: () => RK.RekapHub({ tab: "halaqah" }), kinerjaGuru: () => RK.RekapHub({ tab: "kbm" }),
  rekapKehadiran: () => RK.RekapHub({ tab: "kbm" }), rekapMotd: () => RK.RekapHub({ tab: "motd" }), motdAll: () => RK.RekapHub({ tab: "motd" }),
  rekapKelas: ({ kelas }) => RK.RekapDetail({ jenis: "kbm", kelas, guru: me() && !me().roles.some(r => ["mudir", "wadir_kurikulum"].includes(r)) ? me().id : null }),
});
const STAFF_TABS = { home: HM.Beranda, jadwal: HM.JadwalSaya, cari: HM.CariSantri, riwayat: HM.RiwayatSaya, akun: HM.Akun };
const WALI_TABS = { home: HM.WaliBeranda, hafalan: HM.WaliHafalan, ananda: HM.WaliAnanda, izin: HM.WaliIzin, akun: HM.Akun };

function BottomNav({ wali }) {
  const items = wali ? [["home", "Beranda", "home"], ["hafalan", "Hafalan", "bookopen"], ["ananda", "Ananda", "heart"], ["izin", "Izin", "door"], ["akun", "Akun", "user"]]
    : [["home", "Beranda", "home"], ["jadwal", "Jadwal", "calendar"], ["cari", "Cari", "search"], ["riwayat", "Riwayat", "clock"], ["akun", "Akun", "user"]];
  return html`<nav class="bnav" aria-label="Navigasi utama">${items.map(([k, lab, ic]) => html`<button class=${nav.tab === k ? "on" : ""} aria-current=${nav.tab === k ? "page" : null} onClick=${() => nav.setTab(k)}><i><${Icon} n=${ic} s=${24} /></i>${lab}</button>`)}</nav>`;
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
    if (this.state.err) return html`<div class="wrap"><div class="note red"><${Icon} n="alert" s=${18} /><span>Halaman ini mengalami kesalahan: ${String(this.state.err.message || this.state.err)}</span></div>
      <button class="btn primary full" onClick=${() => { this.setState({ err: null }); nav.home(); }}>Kembali ke beranda</button></div>`;
    return this.props.children;
  }
}

function Splash({ nama }) {
  useEffect(() => { const t = setTimeout(() => nav.endSplash(), 1700); return () => clearTimeout(t); }, []);
  return html`<div class="splash" role="status" aria-live="polite"><div class="sp-ring"><span class="sp-orbit"></span><span class="sp-logo"><img src=${LOGO} alt="" /></span></div>
    <b>Assalamu'alaikum</b><small>${nama}</small><i class="sp-bar"><em></em></i></div>`;
}
function App() {
  useApp(); const online = useOnline();
  useEffect(() => { initStore(); try { const u = JSON.parse(sessionStorage.getItem("mk_user") || "null"); if (u) nav.setUser(u); } catch (e) { } }, []);
  const u = nav.user;
  if (!u) return html`<div class="app nonav"><${HM.Login} /><${ToastHost} /></div>`;
  const hilang = (u.kind === "staff" && (!L.staffById(u.id) || (L.akunOv(L.staffById(u.id).username) || {}).hapus)) || (u.kind === "wali" && !L.santriById(u.id));
  if (hilang && S.ready) { nav.setUser(null); return null; }
  if (hilang) return html`<div class="app nonav"><div class="loadpill" role="status">Memuat data…</div></div>`;
  const wali = u.kind === "wali", top = nav.top;
  const Screen = top ? SCREENS[top.screen] : (wali ? WALI_TABS : STAFF_TABS)[nav.tab];
  const key = top ? top.screen + JSON.stringify(top.params) + nav.depth : "tab-" + nav.tab;
  return html`<div class="app"><div class=${"scr dir-" + nav.dir} key=${key}><${Boundary}>${Screen ? html`<${Screen} ...${top ? top.params : {}} />` : null}</${Boundary}></div>
    ${nav.splash ? html`<${Splash} nama=${wali ? "Wali " + L.santriById(u.id).nama : L.staffById(u.id).pendek} />` : null}
    ${!online ? html`<div class="loadpill" role="status" style="color:#A8261C">Tidak ada koneksi. Perubahan dikirim saat online lagi.</div>` : !S.ready ? html`<div class="loadpill" role="status">Menyambungkan data…</div>` : null}<${BottomNav} wali=${wali} /><${ToastHost} /></div>`;
}
// Rasa aplikasi asli: tanpa zoom cubit/ketuk-ganda, efek sentuh (ripple), service worker di hosting sendiri
try {
  ["gesturestart", "gesturechange"].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  document.addEventListener("touchmove", e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
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
render(html`<${App} />`, document.getElementById("root"));
