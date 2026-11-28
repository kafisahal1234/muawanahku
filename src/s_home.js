import { TIM_IT } from "./libur.js";
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Tile, Card, Stat, Row, Pill, Btn, Empty, Field, Seg, Section, Sheet, SearchBox, Logo, Confirm, PassInput } from "./ui.js";
import { fbSiap, fbLupa, pesanAuth } from "./cloud.js";
import { S, all, get, resetAll, toast, ONLINE } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import * as KH from "./s_khidmah.js";
import * as TSH from "./s_tahsin.js";
import * as WA from "./s_wa.js";
import * as WL from "./s_wali.js";
import { kumpulRiwayat, entriRiwayat, KoreksiSheet } from "./s_koreksi.js";
import { me, FotoAv, FotoLihat, fotoUser, fotoSantri } from "./common.js";
import { Baris } from "./s_akun.js";
import { HafalanCard, RiwayatSetoran, KehadiranCard, CatatanCard } from "./s_santri.js";
import { slotStatus } from "./s_kurikulum.js";
import { VERSI } from "./s_system.js";
import { tabStaf } from "./tab_peran.js";
import { KartuAI, ringkasWali } from "./s_ai.js";
import { KartuAsisten } from "./s_asisten.js";
import { Ikon, WARNA } from "./ikon.js";
import { LOGO } from "./data.js";
import { APP_LOGO } from "./logo_app.js";
import { temaSaatIni, setTema, BAHASA, bahasa, setBahasa } from "./i18n.js";
import { aiAda } from "./ai.js";
import { TahsinCard, JalurIqra } from "./s_tahsin.js";
import { KartuLaporan } from "./s_laporan.js";
import { AjakNotif, statusPush } from "./notif.js";
import { bolehLaporan, belumDibaca } from "./laporan.js";
const PrivasiIsi = () => html`<div class="prose"><p>Data dipakai hanya untuk administrasi pendidikan pondok: hafalan, absensi, nilai, perizinan, dan pembinaan santri. Data tidak dijual, tidak untuk iklan, dan tidak dibagikan ke pihak luar. Setiap pengguna hanya melihat data sesuai perannya; wali hanya melihat anaknya sendiri. Kebijakan lengkap ada di menu Akun setelah masuk.</p></div>`;

// ---------------- lupa kata sandi (lewat email pemulihan) ----------------
const samarkan = e => e.replace(/^(.{2})[^@]*(@.*)$/, (m, a, b) => a + "•••" + b);
function LupaSandi({ awal, onClose }) {
  const [v, setV] = useState(awal || ""); const [busy, setBusy] = useState(false); const [hasil, setHasil] = useState(null); const [err, setErr] = useState("");
  const kirim = async () => {
    setErr(""); const x = v.trim().toLowerCase(); if (!x) return setErr("Isi username atau email.");
    if (ONLINE()) return setErr("Demi keamanan, kata sandi direset oleh Admin pondok. Hubungi Admin; sandi akan dikembalikan ke nama panggilan + 123, lalu ganti sendiri di Akun → Keamanan.");
    const st = L.STAFF.find(s => s.username === x) || L.staffDariEmail(x), ov = st ? L.akunOv(st.username) || {} : {};
    if (!st || ov.hapus) return setErr("Akun tidak ditemukan. Periksa username atau email.");
    if (!ov.email) return setErr("Akun ini belum memasang email pemulihan. Minta Admin pondok melakukan reset sandi, lalu pasang email di Akun → Keamanan.");
    if (!fbSiap()) return setErr("Butuh koneksi internet. Coba lagi saat online.");
    setBusy(true); try { await fbLupa(ov.email); setHasil(samarkan(ov.email)); } catch (e) { setErr(pesanAuth(e)); } setBusy(false);
  };
  return html`<${Sheet} open=${true} title="Lupa kata sandi" onClose=${onClose}>${hasil ? html`<div class="lupa-ok"><span class="lupa-ic"><${Icon} n="check" s=${28} w=${2.6} /></span>
      <b>Tautan terkirim ke ${hasil}</b><p>Buka email tersebut (cek juga folder Spam), ketuk tautannya, lalu buat kata sandi baru. Setelah itu masuk di aplikasi dengan kata sandi baru.</p>
      <${Btn} onClick=${onClose}>Mengerti</${Btn}></div>`
    : html`<p class="small" style="margin-top:0">Masukkan username atau email pemulihan. Kami kirim tautan untuk membuat kata sandi baru ke email yang terpasang di akun.</p>
      <${Field} label="Username atau email"><input class="in" autocapitalize="none" value=${v} placeholder="username" onInput=${e => setV(e.target.value)} /></${Field}>
      ${err ? html`<div class="note red"><${Icon} n="alert" s=${18} />${err}</div>` : null}
      <${Btn} disabled=${busy} onClick=${kirim}>${busy ? "Mengirim…" : "Kirim tautan atur ulang"}</${Btn}>
      <p class="small mt8">Wali santri tidak memakai kata sandi: kode akses = nama panggilan + tanggal lahir santri.</p>`}</${Sheet}>`;
}

// ---------------- login ----------------
const LOCK = { fails: 0, until: 0 };
export function Login() {
  useApp();
  const [mode, setMode] = useState("staff"); const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(""); const [demo, setDemo] = useState(false); const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false); const [lupa, setLupa] = useState(false); const [priv, setPriv] = useState(false);
  const kunciCek = () => { if (LOCK.until > Date.now()) { setErr(`Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((LOCK.until - Date.now()) / 1000)} detik.`); return true; } return false; };
  const gagal = e => { LOCK.fails++; if (LOCK.fails >= 5) { LOCK.fails = 0; LOCK.until = Date.now() + 60000; setErr("5 kali salah. Demi keamanan, coba lagi 60 detik lagi."); } else setErr(e); };
  const masuk = async (uu = u, pp = p) => {
    if (!uu.trim() || !pp) { setErr("Isi username dan kata sandi."); return; }
    if (kunciCek()) return;
    setBusy(true); const r = await L.login(uu, pp); setBusy(false);
    if (r.err) return gagal(r.err);
    LOCK.fails = 0; setErr(""); nav.setUser(r, { splash: true });
  };
  const masukWali = async (kk = u) => {
    if (!kk.trim()) { setErr("Isi kode akses."); return; }
    if (kunciCek()) return;
    setBusy(true); const r = await L.loginWali(kk); setBusy(false); if (r.err) return gagal(r.err);
    LOCK.fails = 0; setErr(""); nav.setUser(r, { splash: true });
  };
  const walis = L.santriList().filter(s => s.nama.toLowerCase().includes(q.toLowerCase()) || String(s.wali || L.kodeAkses(s) || "").includes(q.toLowerCase())).slice(0, 40);
  return html`<div class="login"><div class="lg">${Array.from({ length: 7 }, (_, i) => html`<i class="lg-dot" style=${`--i:${i}`}></i>`)}<${Logo} s=${150} /><h1 class="sr-only">MuawanahQu</h1><p>Pondok Tahfidz Modern Kampung Qur'an Al Muawanah</p></div>
    <form class="card" onSubmit=${e => { e.preventDefault(); mode === "wali" ? masukWali() : masuk(); }}>
      <${Seg} items=${[["staff", "Ustadz / Staf"], ["wali", "Wali Santri"]]} value=${mode} onChange=${m => { setMode(m); setErr(""); setU(""); setP(""); }} />
      ${mode === "wali" ? html`<div class="mt12"><${Field} label="Kode akses" hint="Nama panggilan santri + tanggal lahir (tanggal, bulan, tahun). Contoh: fulan010112">
        <input class="in" autocomplete="off" autocapitalize="none" spellcheck="false" value=${u} placeholder="namatanggallahir" onInput=${e => setU(e.target.value)} /></${Field}></div>` : html`
      <div class="mt12"><${Field} label=${ONLINE() ? "Username" : "Username atau email"}>
        <input class="in" autocomplete="username" autocapitalize="none" value=${u} placeholder="username" onInput=${e => setU(e.target.value)} /></${Field}>
      <${Field} label="Kata sandi"><${PassInput} value=${p} placeholder="kata sandi" onInput=${e => setP(e.target.value)} /></${Field}>
      <div class="lupa-row"><button type="button" class="link" onClick=${() => setLupa(true)}>Lupa kata sandi?</button></div></div>`}
      ${err ? html`<div class="note red"><${Icon} n="alert" s=${18} />${err}</div>` : null}
      <${Btn} type="submit" disabled=${busy}>${busy ? "Memeriksa…" : "Masuk"}</${Btn}>
      ${!ONLINE() ? html`<div class="mt8"><${Btn} kind="ghost" icon="users" onClick=${() => setDemo(true)}>Lihat semua akun demo</${Btn}></div>` : null}</form>
    <p class="mode">MuawanahQu ${VERSI} ${S.mode === "db" ? (S.ready ? "· data tersinkron" : "· menyambungkan database…") : "· data tersimpan di perangkat ini"}${S.cloudErr ? html`<br /><small style="color:#B3261E">Database: ${S.cloudErr}</small>` : null}<br /><span class="mode-it">${TIM_IT.label} · ${TIM_IT.nama}</span><br /><button class="link" style="min-height:44px" onClick=${() => setPriv(true)}>Kebijakan Privasi</button></p>
    ${lupa ? html`<${LupaSandi} awal=${u} onClose=${() => setLupa(false)} />` : null}
    <${Sheet} open=${priv} title="Kebijakan Privasi" onClose=${() => setPriv(false)}><${PrivasiIsi} /></${Sheet}>
    <${Sheet} open=${demo} title="Akun demo" onClose=${() => setDemo(false)}>
      <p class="small" style="margin-top:0">Mode uji di perangkat ini. Ketuk wali untuk langsung masuk; guru masuk dengan username dan kata sandinya.</p>
      <${Section} t=${`Wali santri (${L.santriList().length} akun)`} /><${SearchBox} value=${q} onInput=${setQ} ph="Cari nama santri" />
      ${walis.map(s => html`<button class="demo-acc" onClick=${() => { setDemo(false); masukWali(L.kodeAkses(s)); }}><span class="av gold">${L.initials(s.nama)}</span>
        <span style="flex:1;min-width:0"><b style="font-size:14px">Wali ${s.nama}</b><div class="small">Kelas ${s.kelas} · ${L.asramaAman(s.asrama).nama}</div><div style="margin-top:4px"><code>${L.kodeAkses(s)}</code>${L.lahirSantri(s).contoh ? html` <span class="small">· tgl lahir contoh</span>` : null}</div></span></button>`)}
    </${Sheet}></div>`;
}

// ---------------- beranda guru ----------------
const MAPEL_COLOR = { fiqih: "green", it: "blue", bing: "orange", karakter: "purple" };
const yayasanSaja = st => st.roles.includes("yayasan") && st.roles.every(r => r === "yayasan");
function tilesFor(st) {
  const r = st.roles, t = [], add = (icon, label, color, go, badge) => { if (!t.find(x => x.label === label)) t.push({ icon, label, color, go, badge }); };
  const a = L.asramaOf(st.id), hq = L.halaqahOf(st.id);
  if (r.includes("yayasan") && !r.includes("mudir")) {
    add("bookopen", "Tahfidz", "emerald", () => nav.go("yyTahfidz")); add("calendar", "Kurikulum", "orange", () => nav.go("yyKurikulum"));
    add("shield", "Kesantrian", "coral", () => nav.go("yyKesantrian")); add("users", "Ustadz & Guru", "blue", () => nav.go("yySdm"));
  }
  if (r.includes("mudir")) {
    const mp = L.mudirPondok(st), pk = mp.length === 1 ? mp[0] : "all";
    const luar = L.izinAktif().filter(i => { const s = L.santriById(i.santri); return s && mp.includes(L.pondokOfSantri(s)); }).length;
    add("users", "Pantauan Santri", "coral", () => nav.go("pantauan"), luar || null);
    add("bookopen", "Tahfidz", "emerald", () => nav.go("pengelolaan", { ro: true })); add("calendar", "Kurikulum", "orange", () => nav.go("kurikulum", { ro: true }));
    add("shield", "Kesantrian", "coral", () => nav.go("kesantrian", { pondok: pk })); add("award", "Rapor", "gold", () => nav.go("raporList"));
    add("clipboard", "Ceklis Musyrif", "emerald", () => nav.go("rekapKhidmah", { pondok: pk }));
  }
  if (r.includes("wadir_tahfidz")) add("award", "Ujian Iqro'", "gold", () => nav.go("ujianIqra"), TSH.siapUjianSemua().length || null);
  if (r.includes("wadir_tahfidz")) { add("sliders", "Pengelolaan Tahfidz", "emerald", () => nav.go("pengelolaan")); add("award", "Rapor", "gold", () => nav.go("raporList")); }
  if (r.includes("wadir_kurikulum")) add("calendar", "Kurikulum", "orange", () => nav.go("kurikulum"));
  if (r.includes("wadir_kesantrian")) add("shield", "Kesantrian", "coral", () => nav.go("kesantrian"), L.izinAktif().filter(i => L.pondokOfSantri(L.santriById(i.santri)) === st.pondok).length || null);
  if (r.includes("admin")) { add("grid", "Data Master", "slate", () => nav.go("dataMaster")); add("users", "Daftar Akun", "teal", () => nav.go("daftarAkun")); }
  if (r.includes("guru_tahfidz") && hq) {
    const belum = L.adaHalaqah() && !L.khususManzil() ? L.santriHalaqah(hq.id).filter(s => !L.kunci(s).sudah).length : 0;
    add("bookopen", r.includes("mudir") || r.includes("wadir_tahfidz") ? "Halaqah Saya" : "Tahfidz", "emerald", () => nav.go("tahfidz"), belum || null);
  }
  if (r.includes("musyrif") && a) {
    const ids = new Set(L.santriAsrama(a.id).map(s => s.id));
    // Mutaba'ah & Ceklis Musyrif ada di dalam Asrama Saya; lencana = tugas ceklis yang belum + izin aktif
    const kh = KH.hasilKhidmah(st.id, L.today()), sisaCeklis = L.hariAktif(L.today(), "mutabaah") && kh.pct < 100 ? kh.units.length - kh.selesai.size : 0;
    add("home", "Asrama Saya", "coral", () => nav.go("asramaSaya"), (sisaCeklis + (!r.includes("wadir_kesantrian") ? L.izinAktif().filter(i => ids.has(i.santri)).length : 0)) || null);
    add("award", "Rapor", "gold", () => nav.go("raporList"));
  }
  if (r.some(x => ["mudir", "admin", "wadir_kurikulum", "yayasan"].includes(x))) add("cal2", "Kalender", "pink", () => nav.go("kalender"));
  if (r.some(x => x !== "admin")) add("grafik", "Laporan", "indigo", () => nav.go("laporan"), belumDibaca().length || null);
  if (aiAda()) add("obrolan", "Asisten AI", "purple", () => nav.go("asisten"));
  add("users", "Tim", "teal", () => nav.go("tim"));
  if (r.includes("guru_mapel")) [...new Set(st.ajar.map(([m]) => m))].forEach(m => add("layers", "Mapel " + L.mapelById(m).nama.replace("Pendidikan ", "").replace("Bahasa ", "B. "), MAPEL_COLOR[m], () => nav.go("mapel", { mapel: m })));
  return t;
}

function Summary({ st }) {
  const r = st.roles, tgl = L.today(), sesi = L.sesiNow(), hari = L.hariIni();
  if (yayasanSaja(st)) {
    const ss = L.santriList(); let h = 0, n = 0; all("absenHalaqah").filter(d => d.tanggal === tgl).forEach(d => Object.values(d.status || {}).forEach(v => { n++; if (v === "H") h++; }));
    const luar = L.izinAktif().length;
    return html`<${Card} title="Ringkasan pondok" right=${html`<small>${L.fmtShort(tgl)}</small>`}><div class="stats"><${Stat} label="Santri" value=${ss.length} sub="Pondok 29 & 21" /><${Stat} label="Hadir halaqah" value=${n ? Math.round((h / n) * 100) + "%" : "—"} sub="hari ini" /><${Stat} label="Di luar pondok" value=${luar} sub="saat ini" tone=${luar ? "gold" : ""} /></div></${Card}>`;
  }
  if (r.includes("mudir")) {
    const mp = L.mudirPondok(st), diP = sid => { const s = L.santriById(sid); return !!s && mp.includes(L.pondokOfSantri(s)); }, ss = L.santriList().filter(s => mp.includes(L.pondokOfSantri(s)));
    const docs = all("absenHalaqah").filter(d => d.tanggal === tgl); let h = 0, n = 0; docs.forEach(d => Object.entries(d.status).forEach(([sid, v]) => { if (!diP(sid)) return; n++; if (v === "H") h++; }));
    const avg = ss.length ? ss.reduce((x, s) => x + L.hafalan(s).jumlah, 0) / ss.length : 0;
    const wk = L.weekStart(tgl), pel = all("bap").filter(b => b.tanggal >= wk && diP(b.santri)).length;
    return html`<${Card} title=${mp.length === 1 ? "Ringkasan Pondok " + mp[0] : "Ringkasan pondok"} right=${html`<small>${L.fmtShort(tgl)}</small>`}><div class="stats"><${Stat} label="Hadir halaqah" value=${n ? Math.round((h / n) * 100) + "%" : "—"} sub="hari ini" /><${Stat} label="Rata hafalan" value=${avg.toFixed(1)} sub="juz" /><${Stat} label="Pelanggaran" value=${pel} sub="pekan ini" tone=${pel ? "red" : ""} /></div></${Card}>`;
  }
  if (r.includes("wadir_tahfidz")) {
    const sudah = L.HALAQAH.filter(h => get("absenHalaqah", L.halaqahKey(h.id, tgl, sesi))).length, siap = L.santriList().filter(s => L.hafalan(s).siapTasmi).length;
    return html`<${Card} title="Tahfidz hari ini" right=${html`<small>Halaqah ${sesi}</small>`}><div class="stats"><${Stat} label="Guru sudah absen" value=${`${sudah}/${L.HALAQAH.length}`} tone=${sudah < L.HALAQAH.length ? "gold" : ""} /><${Stat} label="Siap tasmi'" value=${siap} /><${Stat} label="Setoran" value=${all("setoran").filter(x => x.tanggal === tgl).length} sub="hari ini" /></div></${Card}>`;
  }
  if (r.includes("wadir_kurikulum") || r.includes("wadir_kesantrian") || r.includes("admin") || r.includes("guru_tahfidz") || r.includes("guru_mapel")) {
    if (r.includes("wadir_kurikulum")) {
      const sl = L.jadwalAll().filter(j => j.hari === hari), ok = sl.filter(j => get("absenKelas", L.absenKelasKey(j.id, tgl))).length, ko = sl.filter(j => slotStatus(j, tgl)[0] !== "Lengkap").length;
      return html`<${Card} title="Kurikulum hari ini" right=${html`<small>${hari}, ${L.fmtShort(tgl)}</small>`}><div class="stats"><${Stat} label="Terlaksana" value=${`${ok}/${sl.length}`} /><${Stat} label="Jurnal kosong" value=${ko} tone=${ko ? "red" : ""} /><${Stat} label="Guru izin" value=${all("izinGuru").filter(i => i.tanggal === tgl).length} /></div></${Card}>`;
    }
    if (r.includes("wadir_kesantrian")) {
      const iz = L.izinAktif().filter(i => L.pondokOfSantri(L.santriById(i.santri)) === st.pondok);
      return html`<${Card} title=${"Kesantrian Pondok " + st.pondok} right=${html`<small>${L.fmtShort(tgl)}</small>`}><div class="stats"><${Stat} label="Izin aktif" value=${iz.length} /><${Stat} label="Belum kembali" value=${iz.filter(L.terlambat).length} tone="red" /><${Stat} label="BAP bulan ini" value=${all("bap").filter(b => (b.tanggal || "").startsWith(tgl.slice(0, 7)) && L.pondokOfSantri(L.santriById(b.santri)) === st.pondok).length} tone="gold" /></div></${Card}>`;
    }
    if (r.includes("admin")) return html`<${Card} title="Data pondok" right=${html`<small>2026/2027 · Ganjil</small>`}><div class="stats"><${Stat} label="Santri" value=${L.santriList().length} /><${Stat} label="Asrama" value=${L.ASRAMA.length} /><${Stat} label="Akun guru" value=${L.STAFF.length} /></div></${Card}>`;
    if (r.includes("guru_tahfidz") && L.halaqahOf(st.id)) {
      const a = L.halaqahOf(st.id), list = L.santriHalaqah(a.id), ab = get("absenHalaqah", L.halaqahKey(a.id, tgl, sesi));
      return html`<${Card} title="Halaqah hari ini" right=${html`<small>${a.nama}</small>`}><div class="stats"><${Stat} label=${"Absen " + sesi} value=${ab ? "✓" : "Belum"} tone=${ab ? "" : "gold"} /><${Stat} label="Ziyadah" value=${`${list.filter(s => L.ziyadahHari(s.id, tgl).some(x => x.lulus)).length}/${list.length}`} /><${Stat} label="Siap tasmi'" value=${list.filter(s => L.hafalan(s).siapTasmi).length} /></div></${Card}>`;
    }
    const sl = L.jadwalAll().filter(j => j.guru === st.id && j.hari === hari);
    return html`<${Card} title="Hari ini" right=${html`<small>${hari}, ${L.fmtShort(tgl)}</small>`}><div class="stats"><${Stat} label="Jadwal" value=${sl.length} /><${Stat} label="Absen kelas" value=${`${sl.filter(j => get("absenKelas", L.absenKelasKey(j.id, tgl))).length}/${sl.length}`} /><${Stat} label="Jurnal" value=${`${sl.filter(j => (get("absenKelas", L.absenKelasKey(j.id, tgl)) || {}).materi).length}/${sl.length}`} /></div></${Card}>`;
  }
  return null;
}

function tasksFor(st) {
  const r = st.roles, tgl = L.today(), out = [];
  if (r.includes("guru_tahfidz") && L.halaqahOf(st.id)) { const a = L.halaqahOf(st.id), l = L.santriHalaqah(a.id); const b = L.adaHalaqah() && !L.khususManzil() ? l.filter(s => !L.kunci(s).sudah).length : 0; const ts = l.filter(s => L.hafalan(s).siapTasmi).length;
    if (b) out.push([`${b} santri belum setor ziyadah`, `Halaqah ${st.pendek} · hari ini`, "coral", () => nav.go("setorList", { jenis: "ziyadah" })]);
    if (ts) out.push([`${ts} santri siap tasmi'`, "Selesai satu juz", "gold", () => nav.go("tasmiList")]); }
  if (r.includes("guru_mapel")) { const sl = L.jadwalAll().filter(j => j.guru === st.id && j.hari === L.hariIni() && !(get("absenKelas", L.absenKelasKey(j.id, tgl)) || {}).materi);
    if (sl.length) out.push([`${sl.length} jurnal belum diisi hari ini`, sl.map(j => `${L.mapelById(j.mapel).nama} ${j.kelas}`).join(" · "), "blue", () => nav.go("jurnalPilih", { mapel: sl[0].mapel })]); }
  if (r.includes("wadir_kurikulum") || r.includes("mudir")) { const sl = L.jadwalAll().filter(j => j.hari === L.hariIni() && slotStatus(j, tgl)[0] !== "Lengkap");
    if (sl.length) out.push([`${sl.length} jadwal belum lengkap`, "Absen atau jurnal kelas", "gold", () => nav.go("kurikulum", { ro: !r.includes("wadir_kurikulum") })]); }
  if (r.includes("wadir_kesantrian") || r.includes("mudir")) { const mp = L.mudirPondok(st) || [], pk = new Set([...mp, ...(r.includes("wadir_kesantrian") ? [st.pondok] : [])]);
    const l = L.izinAktif().filter(i => { const s = L.santriById(i.santri); return L.terlambat(i) && s && pk.has(L.pondokOfSantri(s)); });
    if (l.length) out.push([`${l.length} santri belum kembali`, "Izin melewati batas waktu", "coral", () => (r.includes("mudir") ? nav.go("pantauan") : nav.go("kesantrian", { pondok: st.pondok }))]); }
  if ((r.includes("wadir_tahfidz") || r.includes("mudir")) && L.adaHalaqah(tgl)) { const sesi = L.sesiNow(); const bl = L.HALAQAH.filter(h => !get("absenHalaqah", L.halaqahKey(h.id, tgl, sesi)));
    if (bl.length) out.push([`${bl.length} guru tahfidz belum absen ${sesi}`, bl.slice(0, 3).map(h => (L.staffById(h.guru) || {}).pendek).join(" · ") + (bl.length > 3 ? " …" : ""), "coral", () => nav.go("kinerjaTahfidz")]); }
  return out.slice(0, 3);
}

// tanggal hari ini + Hijriah (kalender Ummul Qura bawaan HP), mis. "Jumat, 17 Jumadilakhir 1448 H"
function tglHijriah() {
  const d = new Date();
  try { const h = new Intl.DateTimeFormat("id-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }).format(d);
    return L.HARI_ID[d.getDay()] + ", " + h; } catch (e) { return ""; }
}
// ---------- kepala beranda (gaya aplikasi: header solid, kartu ringkasan menimpa header) ----------
function HomeTop({ nama, sub, bell, foto, children, cls }) {
  return html`<header class="ht"><div class="ht-row"><span class="ht-logo applogo"><img src=${APP_LOGO} alt="Logo MuawanahQu" /></span>
      <div class="ht-hi"><small>Assalamu'alaikum,</small><b>${nama}</b></div>
      <button class="ht-btn ab-btn" aria-label=${bell ? `Pengumuman, ${bell} baru` : "Pengumuman"} onClick=${() => nav.go("pengumuman")}><${Icon} n="bell" s=${23} w=${2.2} />${bell ? html`<b>${bell}</b>` : null}</button>

      <button class="ht-foto" aria-label="Akun saya" onClick=${() => nav.setTab("akun")}><${FotoAv} src=${foto} nama=${nama} size=${42} /></button></div>
      ${sub ? html`<div class="ht-sub">${sub}</div>` : html`<div class="ht-tgl"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="#F2C14E"/></svg>${tglHijriah()}</div>`}</header>
    <section class=${"hc" + (cls ? " " + cls : "")}>${children}</section>`;
}
const newPeng = () => all("pengumuman").filter(p => Date.now() - p.ts < 7 * 864e5).length;

function chipsFor(st) {
  const a = L.asramaOf(st.id), c = [];
  const hq = L.halaqahOf(st.id);
  st.roles.forEach(r => { if (r === "musyrif" && a) c.push("Wali Asrama " + a.nama); else if (r === "guru_tahfidz" && hq) c.push("Guru Tahfidz · " + L.santriHalaqah(hq.id).length + " santri"); else if (r === "guru_mapel") c.push(st.ajar.length ? `Guru ${[...new Set(st.ajar.map(([m]) => L.mapelById(m).nama))].join(", ")} · ${[...new Set(st.ajar.map(([, k]) => k))].join(" ")}` : "Guru Mapel"); else c.push(L.ROLE_LABEL[r] + (r === "wadir_kesantrian" ? " · Pondok " + st.pondok : "")); });
  return c;
}

export function Beranda() {
  useApp();
  const st = me(), diNav = new Set(tabStaf(st).map(x => x[0])), TAB_MENU = { Tim: "tim", Kalender: "kalender", "Daftar Akun": "daftarAkun", "Data Master": "dataMaster" };
  const tiles = tilesFor(st).filter(t => !diNav.has(TAB_MENU[t.label])), tasks = tasksFor(st), peng = all("pengumuman").sort((a, b) => b.ts - a.ts)[0];
  const strip = tasks[0] ? { t: tasks[0][0], s: tasks[0][1], go: tasks[0][3], ic: "bap", w: tasks[0][2] === "coral" ? "coral" : "gold" } : peng ? { t: peng.judul, s: "Pengumuman terbaru", go: () => nav.go("pengumuman"), ic: "toa", w: "gold" } : null;
  return html`<${HomeTop} nama=${st.pendek || st.nama} bell=${newPeng()} foto=${fotoUser(nav.user)}>
      <div class="sum"><${Summary} st=${st} /></div></${HomeTop}>
    <div class="wrap">
    ${strip ? html`<button class="strip" onClick=${strip.go}><span class="strip-ic" style=${`background:${WARNA[strip.w][2]}`}><${Ikon} n=${strip.ic} warna=${strip.w} s=${28} /></span><span class="strip-t"><b>${strip.t}</b><small>${strip.s}</small></span><span class="strip-go">Lihat <${Icon} n="right" s=${16} w=${2.4} /></span></button>` : null}
    <${AjakNotif} />
    <${KartuLaporan} />
    <${Card} title="Menu"><div class="tiles">${tiles.map(t => html`<${Tile} icon=${t.icon} label=${t.label} color=${t.color} badge=${t.badge} onClick=${t.go} />`)}</div></${Card}>
    ${tasks.length > 1 ? html`<${Card} title="Perlu diperhatikan"><div class="list">${tasks.slice(1).map(([t, s, c, go]) => html`<button class="row" onClick=${go}><span class="row-ic" style=${`background:${c === "coral" ? "#FDE7E3" : c === "gold" ? "#FDF0D3" : "#E6EEFC"};color:${c === "coral" ? "#B3261E" : c === "gold" ? "#8A5A00" : "#1F56B5"}`}><${Icon} n="alert" s=${18} /></span>
      <span class="row-t"><b style="white-space:normal">${t}</b><small>${s}</small></span><${Icon} n="right" s=${18} c="#9AB0A5" /></button>`)}</div></${Card}>` : null}
    </div>`;
}

export function JadwalSaya() {
  useApp();
  const st = me(), a = L.halaqahOf(st.id), days = a ? DATA.hariHalaqah : DATA.hari; const [hari, setHari] = useState(days.includes(L.hariIni()) ? L.hariIni() : "Senin");
  const sl = L.jadwalAll().filter(j => j.guru === st.id && j.hari === hari).sort((x, y) => x.jam.localeCompare(y.jam));
  return html`<div class="sub-h bigt"><div class="sub-row"><div class="sub-t"><h1>Jadwal Saya</h1><p>${st.nama}</p></div></div><${Seg} small items=${days.map(h => [h, h.slice(0, 3)])} value=${hari} onChange=${setHari} /></div>
    <div class="wrap">${a ? html`<${Card} title=${hari === "Sabtu" ? "Halaqah · Sabtu hanya Shubuh" : "Halaqah"}><div class="list">${L.sesiHariNama(hari).map(s => html`<${Row} name=${"Halaqah " + s} sub=${`${a.nama} · ${L.santriHalaqah(a.id).length} santri`} icon=${html`<${Icon} n=${s === "Malam" ? "moon" : "sun"} s=${18} />`} onClick=${hari === L.hariIni() ? () => nav.go("absenHalaqah", { sesi: s }) : null} />`)}</div></${Card}>` : null}
    ${st.roles.includes("guru_mapel") ? html`<${Card} title="Mengajar">${sl.length ? sl.map(j => { const jm = L.jamById(j.jam); return html`<button class="sched" onClick=${() => hari === L.hariIni() && nav.go("absenKelas", { jid: j.id, kelas: j.kelas, mapel: j.mapel })}><span class="tm">${jm.nama}<small>${jm.mulai}–${jm.selesai}</small></span><span style="flex:1"><b>${L.mapelById(j.mapel).nama} · ${j.kelas}</b><div class="small">${L.santriKelas(j.kelas).length} santri</div></span></button>`; })
      : html`<${Empty} t=${hari === "Sabtu" ? "Tidak ada KBM mapel hari Sabtu. KBM berjalan Senin–Jumat." : `Tidak ada jadwal mengajar hari ${hari}.`} icon="calendar" />`}</${Card}>` : null}
    ${!a && !st.roles.includes("guru_mapel") ? html`<${Card}><${Empty} t="Akun ini tidak punya jadwal mengajar atau halaqah." icon="calendar" /></${Card}>` : null}</div>`;
}

export function CariSantri() {
  useApp();
  const [q, setQ] = useState(""), k = q.trim().toLowerCase();
  const list = L.santriList().filter(s => !k || `${s.nama} ${s.panggilan || ""} ${s.nis || ""}`.toLowerCase().includes(k));
  return html`<div class="sub-h bigt"><div class="sub-row"><div class="sub-t"><h1>Cari Santri</h1><p>${k ? `${list.length} santri ditemukan` : `Semua santri · ${list.length} santri`}</p></div></div></div>
    <div class="wrap akun-wrap"><${SearchBox} value=${q} onInput=${setQ} ph="Cari nama santri atau NIS" />
      ${list.length ? L.kelompokPondok(list.slice(0, 200), s => L.pondokOfSantri(s)).filter(g => g.isi.length).map(g => html`<p class="akun-sec">${g.nama}${g.ket ? html` <span>· ${g.ket} (${g.isi.length})</span>` : null}</p>
        <div class="akun-list">${[...g.isi].sort((a, b) => String(a.kelas).localeCompare(String(b.kelas)) || a.nama.localeCompare(b.nama)).map(s => { const h = L.hafalan(s);
          return html`<${Baris} foto=${fotoSantri(s.id)} nama=${s.nama} jabatan=${`Kelas ${s.kelas} · ${L.asramaAman(s.asrama).nama}`}
            kanan=${html`<span class="akun-pct ok rs-juz" title="Total hafalan">${L.fmtJumlah(h).replace(" (khatam)", "")}</span>`} onClick=${() => nav.go("profilAkun", { jenis: "santri", id: s.id })} />`; })}</div>`)
        : html`<${Card}><${Empty} t="Tidak ada santri yang cocok." icon="users" /></${Card}>`}</div>`;
}

export function RiwayatSaya() {
  useApp();
  const m = me(); const [sel, setSel] = useState(null); const [n, setN] = useState(40);
  const ev = kumpulRiwayat(m.id, false);
  return html`<div class="sub-h bigt"><div class="sub-row"><div class="sub-t"><h1>Riwayat</h1><p>Hanya yang Anda catat · ketuk untuk ubah atau hapus</p></div></div></div>
    <div class="wrap"><${Card}>${ev.length ? html`<div class="list">${ev.slice(0, n).map(x => { const e = entriRiwayat(x.col, x.list), r = x.list[0];
      return html`<${Row} name=${e.jud} sub=${`${e.det} · ${L.fmtShort(L.ymd(new Date(x.ts)))} ${L.fmtJam(x.ts)}`} icon=${html`<${Icon} n=${e.ic} s=${18} />`}
        right=${r.diubah ? html`<${Pill} t="Dikoreksi" tone="blue" />` : null} onClick=${() => setSel(x)} />`; })}</div>
      ${ev.length > n ? html`<${Btn} kind="ghost" onClick=${() => setN(n + 40)}>Tampilkan lebih banyak</${Btn}>` : null}` : html`<${Empty} t="Belum ada catatan. Coba isi absen atau setoran." icon="clock" />`}</${Card}></div>
    ${sel ? html`<${KoreksiSheet} item=${sel} onClose=${() => setSel(null)} />` : null}`;
}

export function Akun() {
  useApp();
  const u = nav.user, st = u.kind === "staff" ? me() : null, sa = u.kind === "wali" ? L.santriById(u.id) : null;
  const [ask, setAsk] = useState(false), [pilih, setPilih] = useState(null), [tema, setTemaS] = useState(temaSaatIni());
  const item = (ic, t, sub, go, tone) => html`<button class="menu-row" onClick=${go}><span class=${"mr-ic " + (tone || "")}><${Icon} n=${ic} s=${20} /></span><span class="mr-t">${t}${sub ? html`<small>${sub}</small>` : null}</span><${Icon} n="right" s=${18} /></button>`;
  const pengawas = st && st.roles.some(r => ["mudir", "admin", "wadir_tahfidz", "wadir_kurikulum", "wadir_kesantrian"].includes(r)), pr = st ? get("profil", st.id) : null;
  return html`<div class="sub-h bigt"><div class="sub-row"><div class="sub-t"><h1>Akun</h1></div></div></div>
    <div class="wrap">
      <div class="acc-head"><${FotoLihat} src=${fotoUser(u)} nama=${st ? st.pendek : sa.nama} size=${58} />
        <span class="acc-t"><b>${st ? st.nama : "Wali " + sa.nama}</b><small>${st ? st.roles.map(r => L.ROLE_LABEL[r]).join(" · ") : `Kelas ${sa.kelas} · ${L.asramaAman(sa.asrama).nama}`}</small></span></div>
      ${st ? html`<${Section} t="Akun saya" /><div class="group">${item("user", "Profil", pr ? "Biodata & foto profil" : "Lengkapi biodata & foto profil", () => nav.go("profil"), "green")}${item("lock", "Keamanan", "Username & kata sandi", () => nav.go("keamanan"), "blue")}${item("bell", "Notifikasi", { aktif: "Aktif di HP ini", diblokir: "Diblokir di pengaturan HP", "ios-pasang": "Pasang aplikasi dulu", "tidak-didukung": "Tidak didukung browser ini", "belum-siap": "Menunggu Admin" }[statusPush()] || "Belum aktif", () => nav.go("notifikasi"), "gold")}${!tabStaf(st).some(x => x[0] === "riwayat") && st.roles.some(r => !["yayasan", "admin"].includes(r)) ? item("clock", "Riwayat input saya", "Absen, setoran & catatan yang Anda input", () => nav.go("riwayatSaya"), "slate") : null}${st.roles.some(r => L.TTD_ROLES.includes(r)) ? item("pen", "Tanda Tangan", get("ttd", st.id) ? "Tersimpan · otomatis di rapor & surat" : "Belum ada · tulis di layar atau foto dari kertas", () => nav.go("tandaTangan"), "purple") : null}</div>`
        : html`<${Section} t="Akun saya" /><div class="group">${item("user", "Profil Ananda", fotoUser(u) ? "Biodata & foto profil" : "Biodata · tambahkan foto profil", () => nav.go("waliProfil"), "green")}${item("bell", "Notifikasi", { aktif: "Aktif di HP ini", diblokir: "Diblokir di pengaturan HP", "ios-pasang": "Pasang aplikasi dulu", "tidak-didukung": "Tidak didukung browser ini", "belum-siap": "Menunggu Admin" }[statusPush()] || "Belum aktif", () => nav.go("notifikasi"), "gold")}${item("chat", "Hubungi ustadz", "Wali Asrama, para Wadir, Mudir, Admin", () => nav.go("kontakUstadz"), "teal")}</div>`}
      <div class="group mt8">${item("clipboard", "Log perubahan data", st ? "Koreksi & penghapusan oleh akun ini" : "Perubahan biodata ananda", () => nav.go("logUbah"), "gold")}</div>
      <${Section} t="Tampilan & bahasa" /><div class="group">${item(tema === "gelap" ? "moon" : "sun", "Tema", { terang: "Mode terang", gelap: "Mode gelap", sistem: "Ikuti pengaturan HP" }[tema], () => setPilih("tema"), "indigo")}${item("globe", "Bahasa", (BAHASA.find(x => x[0] === bahasa()) || BAHASA[0])[1], () => setPilih("bahasa"), "teal")}</div>
      <${Section} t="Informasi" /><div class="group">${item("bookopen", "Bantuan", null, () => nav.go("bantuan"), "teal")}${item("shield", "Kebijakan Privasi", null, () => nav.go("privasi"), "purple")}${item("settings", "Tentang aplikasi", VERSI, () => nav.go("tentang"), "slate")}</div>
      <div class="group mt12"><button class="menu-row out" onClick=${() => setAsk(true)}><span class="mr-ic red"><${Icon} n="logout" s=${20} /></span><span class="mr-t">Keluar</span></button></div>
      <p class="fab-note">Muawanah<b style="color:#E2A93B">Qu</b> ${VERSI} · Pondok Tahfidz Modern Kampung Qur'an Al Muawanah</p>
    <${Sheet} open=${!!pilih} title=${pilih === "tema" ? "Tema" : "Bahasa"} onClose=${() => setPilih(null)}>
      ${pilih === "tema" ? [["terang", "sun", "Mode terang", "Latar putih, cocok di siang hari"], ["gelap", "moon", "Mode gelap", "Latar gelap, nyaman di malam hari & hemat baterai"], ["sistem", "settings", "Ikuti pengaturan HP", "Berganti otomatis mengikuti HP"]].map(([k, ic, t, sub]) =>
        html`<button class=${"menu-row pilih " + (tema === k ? "on" : "")} onClick=${() => { setTema(k); setTemaS(k); setPilih(null); }}><span class="mr-ic indigo"><${Icon} n=${ic} s=${20} /></span><span class="mr-t">${t}<small>${sub}</small></span>${tema === k ? html`<${Icon} n="check" s=${20} c="#0E8F52" />` : null}</button>`)
      : BAHASA.map(([k, t]) => html`<button class=${"menu-row pilih " + (bahasa() === k ? "on" : "")} onClick=${() => { if (k !== bahasa()) setBahasa(k); else setPilih(null); }}><span class="mr-ic teal"><${Icon} n="globe" s=${20} /></span><span class="mr-t" dir=${k === "ar" ? "rtl" : "ltr"}>${t}<small>${{ id: "Tampilan aplikasi dalam Bahasa Indonesia", en: "Menus and buttons in English", ar: "القوائم والأزرار باللغة العربية" }[k]}</small></span>${bahasa() === k ? html`<${Icon} n="check" s=${20} c="#0E8F52" />` : null}</button>`)}
      ${pilih === "bahasa" ? html`<p class="small" style="margin:10px 4px 0">Seperti pengaturan bahasa di HP: menu, tombol, judul, dan pesan aplikasi berganti bahasa. Isi data (nama, catatan, pengumuman, rapor, dan surat resmi) tetap Bahasa Indonesia.</p>` : null}</${Sheet}>
    <${Confirm} open=${ask} danger title="Keluar dari akun?" text=${st ? "Anda perlu memasukkan username dan kata sandi lagi untuk masuk." : "Anda perlu memasukkan kode akses lagi untuk masuk."} yes="Keluar" onYes=${async () => { setAsk(false); await L.keluarAkun(); nav.setUser(null); }} onNo=${() => setAsk(false)} /></div>`;
}

// ---------------- wali ----------------
// Kartu hafalan ananda (beranda wali): total hafalan, yang sedang dihafal, juz selesai, target semester
const angka = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString("id-ID");
function KartuTahsinUtama({ h, c, t }) {
  const R = 50, K = 2 * Math.PI * R, persen = t.pct / 100;
  return html`<div class="hf">
    <div class="hf-top">
      <div class="hf-ring" role="img" aria-label=${`Iqro' ${t.jilid || "-"} dari 6 jilid`}>
        <svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="hfg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE08A" /><stop offset="1" stop-color="#E0A52A" /></linearGradient></defs>
          <circle cx="60" cy="60" r=${R} class="hf-trk" /><circle cx="60" cy="60" r=${R} class="hf-val" stroke-dasharray=${`${K * persen} ${K}`} transform="rotate(-90 60 60)" /></svg>
        <span><b>${t.jilid || "–"}</b><small>dari 6 jilid</small></span></div>
      <div class="hf-main"><small class="hf-lbl">Tahsin ananda</small>
        <div class="hf-big">Iqro' <em>${t.jilid || "–"}</em></div>
        ${t.siapUjian ? html`<span class="hf-pill">Siap ujian kenaikan jilid</span>` : html`<small class="hf-lbl hf-now"><i></i>Sedang belajar membaca</small>
          <div class="hf-pos">${t.jilid ? html`<b>Hal. ${t.hal || 0}</b><span>dari ${L.IQRA_HAL} halaman</span>` : html`<span>tingkat sedang diatur ustadz</span>`}</div>`}</div></div>
    <div class="hf-juz"><div class="hf-row"><span>Perjalanan Iqro' 1–6 menuju Al-Qur'an</span><b>${t.pct}%</b></div><${JalurIqra} t=${t} kecil=${true} /></div>
    <div class="hf-target"><div class="hf-row"><span>Hafalan Al-Qur'an</span><b>${h.jumlah > 0 ? L.fmtJumlah(h) : "Belum ada"}</b></div>
      <small class="hf-ket">Setelah lulus Iqro' 6, ananda mulai membaca Al-Qur'an. Hafalan tetap bisa ditambah lewat talaqqi.</small></div>
  </div>`;
}
function KartuHafalan({ h, c, t }) {
  if (t && !t.quran && h.jumlah === 0) return html`<${KartuTahsinUtama} h=${h} c=${c} t=${t} />`;
  const R = 50, K = 2 * Math.PI * R, persen = Math.min(1, h.jumlah / 30), hal = Math.floor(h.baris / 15), sisaBaris = h.baris % 15;
  const halTotal = Math.max(1, Math.round(h.total / 15)), pAktif = h.khatam ? 100 : Math.min(100, Math.round((h.baris / h.total) * 100));
  return html`<div class="hf">
    <div class="hf-top">
      <div class="hf-ring" role="img" aria-label=${`${angka(h.jumlah)} dari 30 juz`}>
        <svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="hfg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE08A" /><stop offset="1" stop-color="#E0A52A" /></linearGradient></defs>
          <circle cx="60" cy="60" r=${R} class="hf-trk" /><circle cx="60" cy="60" r=${R} class="hf-val" stroke-dasharray=${`${K * persen} ${K}`} transform="rotate(-90 60 60)" /></svg>
        <span><b>${angka(h.jumlah)}</b><small>dari 30 juz</small></span></div>
      <div class="hf-main"><small class="hf-lbl">Total hafalan ananda</small>
        <div class="hf-big">${h.khatam ? html`30 <em>juz · khatam</em>` : html`${h.selesai.length} <em>juz</em>${hal ? html` ${hal} <em>hal.</em>` : null}`}</div>
        ${h.khatam ? html`<span class="hf-pill">Khatam 30 juz</span>` : html`<small class="hf-lbl hf-now"><i></i>Sedang menghafal</small>
          <div class="hf-pos"><b>Juz ${h.aktif}</b><span>${WL.posisiSurah(h).replace(/^Surah /, "")}</span></div>`}</div></div>
    ${h.khatam ? null : html`<div class="hf-juz"><div class="hf-row"><span>Progres Juz ${h.aktif} · ${hal} dari ${halTotal} hal.</span><b>${pAktif}%</b></div>
      <div class="hf-bar"><i style=${`width:${pAktif}%`}></i></div></div>`}
    ${t ? html`<div class="hf-tahsin"><div class="hf-row"><span>Tahsin · ${t.quran ? "lulus Iqro', membaca Al-Qur'an" : "membaca Iqro'"}</span><b>${t.quran ? (t.ket || "Al-Qur'an") : t.jilid ? `Iqro' ${t.jilid} · hal. ${t.hal || 0}/${L.IQRA_HAL}` : "Belum diatur"}</b></div>
      <${JalurIqra} t=${t} kecil=${true} /></div>` : null}
    <div class="hf-target"><div class="hf-row"><span>Target hafalan baru semester ini</span><b>${angka(c.juz, 2)} / ${c.target} juz</b></div>
      <div class="hf-bar emas"><i style=${`width:${Math.max(c.pct, c.juz > 0 ? 3 : 0)}%`}></i></div>
      <small class=${"hf-ket" + (c.tercapai ? " ok" : "")}>${c.tercapai ? "Alhamdulillah, target semester tercapai" : `Kurang ${angka(c.kurang)} juz lagi untuk mencapai target`}</small></div>
  </div>`;
}
export function WaliBeranda() {
  useApp();
  const s = L.santriById(nav.user.id), a = L.asramaAman(s.asrama), h = L.hafalan(s), c = L.capaianJuz(s);
  const peng = all("pengumuman").sort((x, y) => y.ts - x.ts)[0];
  return html`<${HomeTop} cls="hc-hf" nama=${"Ayah/Bunda " + (s.panggilan || s.nama.split(" ")[0])} sub=${`${s.nama} · Kelas ${s.kelas} · Asrama ${a.nama}`} bell=${newPeng()} foto=${fotoUser(nav.user)}>
      <${KartuHafalan} h=${h} c=${c} t=${L.tahsinStatus(s)} /></${HomeTop}>
    <div class="wrap wl-wrap">
      <${WL.KabarHariIni} s=${s} />
      <${AjakNotif} />
      <${KartuLaporan} />
      ${peng ? html`<button type="button" class="wl-peng" onClick=${() => nav.go("pengumuman")}><span class="wl-ic emas"><${Icon} n="megaphone" s=${18} /></span><span class="wl-kt"><small>Pengumuman pondok · ${L.fmtTgl(L.ymd(new Date(peng.ts)))}</small><b>${peng.judul || "Pengumuman"}</b></span><${Icon} n="right" s=${18} /></button>` : null}
      <${WL.BulanIni} s=${s} />
      ${aiAda() ? html`<button type="button" class="wl-peng lap-wl ai-wl" onClick=${() => nav.go("asisten")}><span class="wl-ic"><${Icon} n="sparkle" s=${18} /></span><span class="wl-kt"><small>Tanya perkembangan ananda kapan saja</small><b>Asisten AI</b></span><${Icon} n="right" s=${18} c="#9AB0A5" /></button>` : null}
      <button type="button" class="wl-peng lap-wl" onClick=${() => nav.go("laporan")}><span class="wl-ic"><${Icon} n="chart" s=${18} /></span><span class="wl-kt"><small>Terbit setiap Sabtu dan akhir bulan</small><b>Laporan perkembangan ananda</b></span><${Icon} n="right" s=${18} c="#9AB0A5" /></button>
      <${KartuAI} judul="Ringkasan untuk Ayah/Bunda" tombol="Buat ringkasan perkembangan" ket="AI merangkum perkembangan ananda dari data pondok dalam bahasa yang mudah dipahami." buat=${() => ringkasWali(s)} />
    </div>`;
}
export function WaliHafalan() {
  useApp(); const s = L.santriById(nav.user.id);
  return html`<div class="sub-h bigt"><div class="sub-row"><div class="sub-t"><h1>Hafalan Ananda</h1><p>${s.nama}</p></div></div></div>
    <div class="wrap wl-wrap">${L.tahsinStatus(s) ? html`<${TahsinCard} s=${s} />` : null}<${WL.PetaJuz} s=${s} /><${WL.LinimasaSetoran} s=${s} /></div>`;
}
export function WaliAnanda() {
  useApp(); const s = L.santriById(nav.user.id);
  return html`<div class="sub-h bigt"><div class="sub-row"><div class="sub-t"><h1>Perkembangan Ananda</h1><p>${s.nama} · Kelas ${s.kelas}</p></div></div></div>
    <div class="wrap wl-wrap"><${WL.Perkembangan} s=${s} /></div>`;
}
export function WaliIzin() {
  useApp(); const s = L.santriById(nav.user.id);
  return html`<div class="sub-h bigt"><div class="sub-row"><div class="sub-t"><h1>Izin & Kedisiplinan</h1><p>${s.nama}</p></div></div></div>
    <div class="wrap wl-wrap"><${WL.IzinWali} s=${s} /></div>`;
}
