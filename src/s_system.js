// Fitur sistem standar Google Play & App Store: kata sandi, hapus akun, privasi, bantuan, tentang, unduhan
import { useState, useEffect } from "preact/hooks";
import { html, nav, useApp, Icon, Card, SubHeader, Row, Pill, Btn, Empty, Field, Confirm, Hint, Section, PassInput, Sheet } from "./ui.js";
import { fbSiap, fbUbahSandi, pesanAuth, salahSandi } from "./cloud.js";
import { S, all, get, put, toast, uid } from "./store.js";
import { LOGO } from "./data.js";
import * as L from "./logic.js";
import { me, has } from "./common.js";

export const VERSI = "1.0.0 (" + (typeof __BUILD__ !== "undefined" ? __BUILD__ : "dev") + ")";

// ---------- unduhan ----------
let dlp = null;
export function getDownloads() {
  if (!dlp) dlp = (async () => {
    for (let i = 0; i < 20 && !(window.claude && typeof window.claude.use === "function"); i++) await new Promise(r => setTimeout(r, 100));
    try { return window.claude && typeof window.claude.use === "function" ? await window.claude.use("downloads") : null; } catch (e) { return null; }
  })();
  return dlp;
}
export function useDownloads() {
  const [ok, setOk] = useState(false);
  useEffect(() => { let on = true; getDownloads().then(() => on && setOk(true)); return () => { on = false; }; }, []);
  return ok;
}
export async function unduh(filename, data) {
  const d = await getDownloads();
  if (!d) { // di luar artifact (misal GitHub Pages): unduh langsung lewat browser
    try { const url = URL.createObjectURL(new Blob([data], { type: /\.csv$/i.test(filename) ? "text/csv;charset=utf-8" : "text/html;charset=utf-8" })), a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); toast("File diunduh. Buka file lalu pilih Cetak bila perlu."); }
    catch (e) { toast("File tidak bisa diunduh di perangkat ini.", "err"); }
    return; }
  try { await d.save({ filename, data }); toast("File diunduh. Buka file lalu pilih Cetak bila perlu."); }
  catch (e) { if (e && e.code === "declined") return; if (e && e.code === "rate_limited") toast("Tunggu sebentar, lalu coba lagi.", "err"); else toast("File tidak bisa diunduh di tampilan ini.", "err"); }
}
export const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export function docHtml(title, body) {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#16261D;max-width:760px;margin:24px auto;padding:0 18px;font-size:13px;line-height:1.45}
.kop{display:flex;gap:14px;align-items:center;border-bottom:3px double #0B5D3B;padding-bottom:10px;margin-bottom:12px}.kop img{width:64px;height:auto}
.kop b{display:block;font-size:16px}.kop small{color:#5E7266}h1{font-size:15px;text-align:center;margin:8px 0 12px}
h2{font-size:13px;background:#0B5D3B;color:#fff;padding:6px 10px;margin:16px 0 6px}table{width:100%;border-collapse:collapse;margin-bottom:6px}
td,th{border:1px solid #9AB0A5;padding:6px 8px;text-align:left;vertical-align:top}th{background:#EAF3EE}.c{text-align:center}.id td{border:none;padding:3px 6px}
.ttd{display:flex;justify-content:space-between;margin-top:36px}.ttd div{width:42%;text-align:center}.ttd .g{height:70px}.small{font-size:11px;color:#5E7266}
@media print{body{margin:0 auto}}</style></head><body>
<div class="kop"><img src="${LOGO}" alt="Logo"><div><b>KAMPUNG QUR'AN AL MUAWANAH</b><small>Pondok Tahfidz Modern</small></div></div>${body}</body></html>`;
}

// ---------- ubah kata sandi ----------
export function UbahSandi() {
  useApp();
  const u = L.usernameOf(nav.user);
  const [f, setF] = useState({ lama: "", baru: "", ulang: "" }); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const def = nav.user.kind === "staff" ? me().password : u + "123";
  const save = async () => {
    setErr("");
    if (!(await L.cekSandi(u, f.lama, def))) return setErr("Kata sandi lama salah.");
    if (f.baru.length < 8) return setErr("Kata sandi baru minimal 8 karakter.");
    if (!/[A-Za-z]/.test(f.baru) || !/\d/.test(f.baru)) return setErr("Gunakan gabungan huruf dan angka.");
    if (f.baru !== f.ulang) return setErr("Ulangi kata sandi baru dengan benar.");
    const ov = L.akunOv(u) || {};
    setBusy(true);
    if (ov.email) {
      if (!fbSiap()) { setBusy(false); return setErr("Akun ini memakai email pemulihan, jadi ubah sandi butuh koneksi internet."); }
      try { await fbUbahSandi(ov.email, f.lama, f.baru); }
      catch (e) { setBusy(false); return setErr(salahSandi(e) && ov.menungguReset ? "Sandi di email pemulihan belum diatur. Buka email dari Firebase dan atur sandi lewat tautannya, atau pakai Lupa kata sandi." : pesanAuth(e)); }
    }
    const o = { ...ov, hash: await L.sha(u + ":" + f.baru), diubah: Date.now() }; delete o.menungguReset;
    const ok = await put("akun", u, o);
    setBusy(false); if (ok) { toast("Kata sandi berhasil diubah"); nav.back(); }
  };
  const inp = (k, lab, ac) => html`<${Field} label=${lab}><${PassInput} autocomplete=${ac} label=${lab.toLowerCase()} value=${f[k]} onInput=${e => setF({ ...f, [k]: e.target.value })} /></${Field}>`;
  return html`<${SubHeader} title="Ubah kata sandi" sub=${"Username: " + u} />
    <div class="wrap"><${Card}>${inp("lama", "Kata sandi lama", "current-password")}${inp("baru", "Kata sandi baru", "new-password")}${inp("ulang", "Ulangi kata sandi baru", "new-password")}
      <${Hint}>Minimal 8 karakter, gabungan huruf dan angka.</${Hint}>
      ${err ? html`<div class="note red"><${Icon} n="alert" s=${18} />${err}</div>` : null}
      <${Btn} disabled=${busy || !f.lama || !f.baru} onClick=${save}>${busy ? "Menyimpan…" : "Simpan kata sandi"}</${Btn}></${Card}></div>`;
}

// ---------- permintaan hapus akun (wajib di kedua toko aplikasi) ----------
export function HapusAkun() {
  useApp();
  const u = L.usernameOf(nav.user), nama = nav.user.kind === "staff" ? me().nama : "Wali " + L.santriAman(nav.user.id).nama;
  const ada = all("hapusAkun").filter(r => r.username === u).sort((a, b) => b.ts - a.ts)[0];
  const [alasan, setAlasan] = useState(""); const [ask, setAsk] = useState(false);
  const kirim = async () => { setAsk(false); if (await put("hapusAkun", uid("h"), { username: u, nama, alasan, status: "menunggu", ts: Date.now() })) toast("Permintaan terkirim ke Admin"); };
  return html`<${SubHeader} title="Hapus akun" sub=${nama} />
    <div class="wrap"><${Card}><div class="prose"><p>Anda bisa meminta akun ini dihapus. Setelah diproses Admin, akun tidak bisa dipakai masuk lagi.</p>
      <p>Catatan pendidikan santri (hafalan, absensi, nilai, rapor) adalah arsip resmi pondok dan tetap disimpan sesuai ketentuan pondok. Permintaan penghapusan data santri bisa diajukan wali kepada pondok.</p></div></${Card}>
    ${ada && ada.status === "menunggu" ? html`<div class="note"><${Icon} n="clock" s=${18} />Permintaan dikirim ${L.fmtTgl(L.ymd(new Date(ada.ts)))} dan sedang menunggu Admin.</div>` : html`
    <${Card}><${Field} label="Alasan (opsional)"><textarea class="in" value=${alasan} onInput=${e => setAlasan(e.target.value)}></textarea></${Field}>
      <${Btn} kind="danger" onClick=${() => setAsk(true)}>Kirim permintaan hapus akun</${Btn}></${Card}>`}
    <${Confirm} open=${ask} danger title="Kirim permintaan hapus akun?" text="Admin akan menonaktifkan akun ini. Anda tidak bisa masuk lagi setelah diproses." yes="Kirim" onYes=${kirim} onNo=${() => setAsk(false)} /></div>`;
}

export function AdminHapusAkun() {
  useApp();
  const l = all("hapusAkun").sort((a, b) => b.ts - a.ts); const [sel, setSel] = useState(null);
  const proses = async () => { const r = sel; setSel(null);
    if (await put("akun", r.username, { ...(L.akunOv(r.username) || {}), nonaktif: true })) { await put("hapusAkun", r.id, { ...r, status: "diproses", oleh: me().id, diproses: Date.now() }); toast("Akun dinonaktifkan"); } };
  return html`<${SubHeader} title="Permintaan hapus akun" sub=${`${l.filter(r => r.status === "menunggu").length} menunggu`} />
    <div class="wrap"><${Card}>${l.length ? html`<div class="list">${l.map(r => html`<div class="row"><span class="av">${L.initials(r.nama.replace(/^(Wali|Ust\.|Ustdzh\.)\s*/, ""))}</span>
      <span class="row-t"><b>${r.nama}</b><small>${r.username} · ${L.fmtShort(L.ymd(new Date(r.ts)))}${r.alasan ? " · " + r.alasan : ""}</small></span>
      ${r.status === "menunggu" ? html`<${Btn} kind="ghost" full=${false} onClick=${() => setSel(r)}>Proses</${Btn}>` : html`<${Pill} t="Diproses" />`}</div>`)}</div>` : html`<${Empty} t="Belum ada permintaan." icon="check" />`}</${Card}>
    <${Confirm} open=${!!sel} danger title="Nonaktifkan akun?" text=${sel ? `${sel.nama} (${sel.username}) tidak bisa masuk lagi.` : ""} yes="Nonaktifkan" onYes=${proses} onNo=${() => setSel(null)} /></div>`;
}

// ---------- informasi ----------
export function Privasi() {
  return html`<${SubHeader} title="Kebijakan Privasi" sub="Berlaku sejak 20 November 2026" />
    <div class="wrap"><${Card}><div class="prose">
      <p>MuawanahKu adalah aplikasi internal Pondok Tahfidz Modern Kampung Qur'an Al Muawanah untuk mencatat kegiatan belajar santri. Aplikasi ini hanya dipakai pengurus, guru, dan wali santri yang diberi akun oleh pondok.</p>
      <h4>Data yang dikumpulkan</h4><ul><li>Data akun: nama, username, dan peran.</li><li>Data santri: nama, kelas, asrama, dan halaqah.</li>
      <li>Catatan pendidikan: hafalan, absensi, nilai, mutaba'ah, perizinan, dan pelanggaran, termasuk foto bukti dan tanda tangan pada BAP.</li><li>Tanda tangan Mudir, Wadir, dan wali asrama yang mereka simpan sendiri, khusus untuk dicetak pada surat, rapor, dan rekap resmi pondok.</li></ul>
      <h4>Tujuan</h4><p>Data dipakai hanya untuk administrasi pendidikan dan pembinaan santri: rekap, rapor, dan informasi kepada wali. Data tidak dipakai untuk iklan, tidak dijual, dan tidak dibagikan kepada pihak luar.</p>
      <h4>Data anak</h4><p>Sebagian besar santri berusia di bawah 18 tahun. Datanya dikelola pondok sebagai lembaga pendidikan, dengan sepengetahuan wali. Santri tidak memiliki akun sendiri.</p>
      <h4>Siapa yang bisa melihat</h4><ul><li>Wali santri hanya melihat data anaknya sendiri.</li><li>Guru tahfidz dan wali asrama hanya melihat santri halaqah dan asramanya. Guru mapel hanya melihat kelas yang diajar.</li>
      <li>Wadir melihat bidangnya, Wadir Kesantrian hanya pondoknya. Mudir melihat semua.</li><li>Admin mengelola data master tanpa melihat rekap dan nilai.</li></ul>
      <h4>Izin perangkat</h4><p>Aplikasi hanya meminta akses kamera atau galeri saat Anda mengunggah foto (bukti, profil, tanda tangan, atau lampiran Asisten AI), dan mikrofon hanya saat Anda menekan tombol bicara di Asisten AI. Tidak ada akses lokasi atau kontak.</p>
      <h4>Keamanan dan penyimpanan</h4><p>Setiap akun dilindungi kata sandi dan dibatasi sesuai perannya. Kata sandi yang diubah disimpan dalam bentuk acak (hash), bukan teks asli. Data disimpan selama santri belajar di pondok dan sesuai ketentuan arsip pondok.</p>
      <h4>Hak Anda</h4><ul><li>Melihat data sesuai peran Anda.</li><li>Meminta perbaikan data melalui Admin pondok.</li><li>Akun dibuat dan dihapus oleh Admin pondok. Akun wali otomatis terhapus saat data santri dihapus. Untuk penghapusan akun atau data, hubungi Admin pondok.</li></ul>
      <h4>Kontak</h4><p>Pertanyaan tentang privasi dapat disampaikan kepada Admin resmi pondok melalui WhatsApp di menu Akun → Bantuan, atau langsung ke kantor pondok.</p>
      <p class="small">Draf kebijakan ini perlu ditinjau pondok sebelum aplikasi diterbitkan.</p></div></${Card}></div>`;
}

const FAQ = [
  ["Lupa kata sandi?", "Hubungi Admin resmi pondok lewat tombol WhatsApp di atas. Admin akan mengatur ulang kata sandi akun Anda."],
  ["Bagaimana menyimpan tanda tangan?", "Mudir, Wadir, dan wali asrama: buka Akun → Tanda Tangan. Tulis langsung di layar (layar penuh, bisa dimiringkan) atau foto tanda tangan di kertas putih; latar kertas dihapus otomatis. Tanda tangan langsung terpasang di surat, rapor, dan rekap PDF."],
  ["Kenapa ziyadah santri terkunci?", "Ziyadah terkunci bila santri belum lulus tasmi' juz yang selesai, belum lulus manzil pekan lalu, atau sudah setor ziyadah hari ini."],
  ["Bagaimana menghitung nilai setoran?", "Nilai dimulai dari 100 dan berkurang 3 untuk setiap kesalahan. KKM 70. Di bawah 70, setoran diulang hari itu juga."],
  ["Siapa yang mengisi surat izin dan BAP?", "Wadir Kesantrian di masing-masing pondok. Izin langsung tampil di akun wali asrama dan wali santri."],
  ["Kenapa wali tidak bisa melihat rapor?", "Rapor dibagikan langsung oleh pondok saat pembagian rapor. Di aplikasi, wali melihat hafalan, kehadiran, nilai projek, izin, dan catatan."],
  ["Data saya salah, bagaimana memperbaikinya?", "Sampaikan ke Admin pondok. Data master santri dan akun hanya bisa diubah Admin."],
];
// Kontak resmi pondok: nomor WhatsApp diatur Admin/Mudir (Setelan → waPondok), tombol membuka aplikasi WhatsApp
const nomorTampil = n => { const d = L.waNomor(n); return d ? "+" + d.slice(0, 2) + " " + d.slice(2, 5) + "-" + d.slice(5, 9) + "-" + d.slice(9) : ""; };
function KontakAdmin() {
  useApp();
  const m = me(), bisaAtur = !!m && m.roles.some(r => r === "admin" || r === "mudir"), no = L.setelan().waPondok, [ed, setEd] = useState(false), [v, setV] = useState("");
  const siapa = m ? `${m.nama} (${m.roles.map(r => L.ROLE_LABEL[r]).join(", ")})` : nav.user && nav.user.kind === "wali" ? `wali dari ${L.santriAman(nav.user.id).nama}` : "";
  const link = L.waLink(no, `Assalamu'alaikum, Admin Kampung Qur'an Al Muawanah. Saya ${siapa} ingin bertanya tentang aplikasi MuawanahKu: `);
  const simpan = async () => {
    if (v.trim() && !L.waNomor(v)) return toast("Nomor belum benar. Contoh: 0812 3456 7890", "err");
    const lama = (S.data.kalender || {}).setelan || {};
    if (await put("kalender", "setelan", { ...lama, waPondok: L.waNomor(v) })) { toast(v.trim() ? "Nomor WhatsApp pondok tersimpan" : "Nomor WhatsApp pondok dikosongkan"); setEd(false); }
  };
  return html`<div class="card wa-card"><div class="wa-h"><span class="wa-ic" aria-hidden="true"><${Icon} n="chat" s=${24} c="#fff" w=${2.2} /></span>
      <span><b>Admin Resmi Pondok</b><small>${no ? nomorTampil(no) : "Kampung Qur'an Al Muawanah"}</small></span></div>
    ${no ? html`<a class="wa-btn" href=${link} target="_blank" rel="noopener">Chat WhatsApp Admin</a><p class="small" style="margin:8px 0 0">Membuka aplikasi WhatsApp dengan pesan pembuka. Jam layanan mengikuti jam kerja kantor pondok.</p>`
      : html`<p class="small" style="margin:10px 0 0">Nomor WhatsApp resmi pondok belum diatur.${bisaAtur ? "" : " Silakan datang ke kantor pondok pada jam kerja."}</p>`}
    ${bisaAtur ? html`<button type="button" class="link" style="min-height:40px;margin-top:4px" onClick=${() => { setV(no ? "0" + L.waNomor(no).slice(2) : ""); setEd(true); }}>${no ? "Ubah nomor WhatsApp pondok" : "Atur nomor WhatsApp pondok"}</button>` : null}
    <${Sheet} open=${ed} title="Nomor WhatsApp resmi pondok" onClose=${() => setEd(false)}>
      <${Field} label="Nomor WhatsApp admin pondok"><input class="in" type="tel" inputmode="tel" placeholder="0812 3456 7890" value=${v} onInput=${e => setV(e.target.value)} /></${Field}>
      <p class="small" style="margin:0 0 12px">Tampil di menu Bantuan semua akun (ustadz dan wali). Pakai nomor resmi pondok, bukan nomor pribadi.</p>
      <${Btn} icon="check" onClick=${simpan}>Simpan nomor</${Btn}></${Sheet}></div>`;
}
export function Bantuan() {
  const [o, setO] = useState(-1);
  return html`<${SubHeader} title="Bantuan" sub="Kontak admin & pertanyaan yang sering diajukan" />
    <div class="wrap"><${KontakAdmin} /><${Section} t="Pertanyaan yang sering diajukan" /><${Card}>${FAQ.map(([q, a], i) => html`<button class="menu-row" aria-expanded=${o === i} onClick=${() => setO(o === i ? -1 : i)}><span><b style="font-weight:600">${q}</b>${o === i ? html`<p class="small" style="margin:6px 0 4px;line-height:1.5">${a}</p>` : null}</span><${Icon} n=${o === i ? "down" : "right"} s=${18} /></button>`)}</${Card}>
    <${Card} title="Butuh bantuan lain?"><p class="small" style="margin:0">Hubungi Admin resmi pondok lewat tombol WhatsApp di atas, atau datang ke kantor pondok pada jam kerja.</p></${Card}></div>`;
}

export function Tentang() {
  return html`<${SubHeader} title="Tentang aplikasi" />
    <div class="wrap"><${Card}><div class="center" style="padding:8px 0 4px"><img src=${LOGO} alt="Logo MuawanahKu" style="width:72px;height:72px;object-fit:contain" />
      <h3 style="margin:8px 0 2px;font-size:18px">Muawanah<span style="color:#E2A93B">Ku</span></h3><p class="small" style="margin:0">Versi ${VERSI}</p></div>
      <div class="kv mt12"><span>Pemilik</span><b>Kampung Qur'an Al Muawanah</b></div><div class="kv"><span>Pengembang</span><b>Tim IT pondok</b></div>
      <div class="kv"><span>Penyimpanan data</span><b>${S.mode === "db" ? "Tersinkron antarperangkat" : "Perangkat ini"}</b></div></${Card}>
    <p class="fab-note">© 2026 Kampung Qur'an Al Muawanah</p></div>`;
}
