// Profil (biodata) & Keamanan untuk akun guru/pengurus. Nama tersinkron ke data guru di seluruh aplikasi.
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Card, SubHeader, Btn, Field, Section, Hint, Seg, Confirm, Sheet, PassInput, Pill } from "./ui.js";
import { fbSiap, fbDaftar, fbMasuk, fbLupa, pesanAuth, salahSandi } from "./cloud.js";
import { S, get, put, toast } from "./store.js";
import * as L from "./logic.js";
import { me, FotoAv, fotoPersegi, kunciFoto } from "./common.js";
import { logUbah } from "./s_koreksi.js";

const BIO = [["tempatLahir", "Tempat lahir", "text", "Metro"], ["tglLahir", "Tanggal lahir", "date", ""], ["jk", "Jenis kelamin", "jk", ""], ["hp", "No. HP / WhatsApp", "tel", "08xx"],
  ["email", "Email", "email", "nama@email.com"], ["alamat", "Alamat", "area", "Alamat tinggal"], ["pendidikan", "Pendidikan terakhir", "text", "S1 Pendidikan …"],
  ["hafalan", "Hafalan Al-Qur'an", "text", "Misal: 30 juz / 10 juz"], ["mulaiTugas", "Mulai bertugas di pondok", "date", ""], ["hobi", "Hobi", "text", "Membaca, futsal, …"], ["motto", "Motto hidup", "area", ""]];
const umur = t => { if (!t) return null; const d = new Date(t), n = new Date(); let u = n.getFullYear() - d.getFullYear(); if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) u--; return u; };
const fmtNilai = (k, v) => (!v ? null : k === "tglLahir" || k === "mulaiTugas" ? L.fmtTgl(v, false) + (k === "tglLahir" && umur(v) != null ? ` · ${umur(v)} tahun` : "") : k === "jk" ? (v === "L" ? "Laki-laki" : "Perempuan") : v);

export function Profil() {
  useApp();
  const st = me(), pr = get("profil", st.id) || {}, [ed, setEd] = useState(false);
  const [f, setF] = useState(null);
  const mulai = () => { setF({ nama: st.nama, pendek: st.pendek, ...Object.fromEntries(BIO.map(([k]) => [k, pr[k] || ""])) }); setEd(true); };
  const simpan = async () => {
    if (!f.nama.trim()) return toast("Nama lengkap wajib diisi.", "err");
    const bio = Object.fromEntries(BIO.map(([k]) => [k, (f[k] || "").trim()]));
    let ok = await put("profil", st.id, { ...bio, ts: Date.now() });
    if (ok && (f.nama.trim() !== st.nama || f.pendek.trim() !== st.pendek)) ok = await put("staffEdit", st.id, { ...((S.data.staffEdit || {})[st.id] || {}), nama: f.nama.trim(), pendek: f.pendek.trim() || st.pendek });
    if (ok) { logUbah("ubah", "profil", st.id, `Profil ${f.nama.trim()} diperbarui`); toast("Profil tersimpan"); setEd(false); }
  };
  const isi = BIO.filter(([k]) => pr[k]).length;
  if (ed) return html`<${SubHeader} title="Ubah profil" sub="Biodata diri" />
    <div class="wrap form-page">
      <${Section} t="Identitas" /><${Card}>
        <${Field} label="Nama lengkap dengan gelar"><input class="in" value=${f.nama} onInput=${e => setF({ ...f, nama: e.target.value })} /></${Field}>
        <${Field} label="Nama panggilan" hint="Tampil di jadwal, absen, dan beranda"><input class="in" value=${f.pendek} onInput=${e => setF({ ...f, pendek: e.target.value })} /></${Field}></${Card}>
      <${Section} t="Biodata" /><${Card}>${BIO.map(([k, lab, t, ph]) => html`<${Field} label=${lab}>${t === "area" ? html`<textarea class="in" rows="2" value=${f[k]} placeholder=${ph} onInput=${e => setF({ ...f, [k]: e.target.value })}></textarea>`
        : t === "jk" ? html`<${Seg} small items=${[["L", "Laki-laki"], ["P", "Perempuan"]]} value=${f[k]} onChange=${v => setF({ ...f, [k]: v })} />`
        : html`<input class="in" type=${t} inputmode=${t === "tel" ? "tel" : null} value=${f[k]} placeholder=${ph} onInput=${e => setF({ ...f, [k]: e.target.value })} />`}</${Field}>`)}</${Card}>
      <div class="sticky-act btn-stack"><${Btn} icon="check" onClick=${simpan}>Simpan profil</${Btn}><${Btn} kind="text" onClick=${() => setEd(false)}>Batal</${Btn}></div></div>`;
  return html`<${SubHeader} title="Profil" sub="Biodata diri" />
    <div class="wrap">
      <div class="prof-head"><${FotoEdit} nama=${st.pendek} /><b>${st.nama}</b><small>${st.roles.map(r => L.ROLE_LABEL[r]).join(" · ")}</small>
        <div class="prof-bar"><i style=${`width:${Math.round((isi / BIO.length) * 100)}%`}></i></div><small>Biodata terisi ${isi} dari ${BIO.length}</small></div>
      <${Section} t="Identitas" /><${Card} cls="kv-card"><div class="kv"><span>Nama lengkap</span><b>${st.nama}</b></div><div class="kv"><span>Nama panggilan</span><b>${st.pendek}</b></div>
        <div class="kv"><span>Peran</span><b>${st.roles.map(r => L.ROLE_LABEL[r]).join(", ")}</b></div>${L.asramaOf(st.id) ? html`<div class="kv"><span>Wali asrama</span><b>${L.asramaOf(st.id).nama}</b></div>` : null}
        ${L.halaqahOf(st.id) ? html`<div class="kv"><span>Halaqah</span><b>${L.halaqahOf(st.id).nama}</b></div>` : null}${st.ajar.length ? html`<div class="kv"><span>Mengajar</span><b>${st.ajar.map(([m, k]) => `${L.mapelById(m).nama} ${k}`).join(", ")}</b></div>` : null}</${Card}>
      <${Section} t="Biodata" /><${Card} cls="kv-card">${BIO.map(([k, lab]) => html`<div class="kv"><span>${lab}</span><b class=${pr[k] ? "" : "kosong"}>${fmtNilai(k, pr[k]) || "Belum diisi"}</b></div>`)}</${Card}>
      <${Btn} icon="edit" onClick=${mulai}>Ubah profil</${Btn}></div>`;
}

export function Keamanan() {
  useApp();
  const st = me(), ov = L.akunOv(st.username) || {}; const [ed, setEd] = useState(false); const [ask, setAsk] = useState(false);
  const lepas = async () => { setAsk(false); const o = { ...ov }; delete o.email; delete o.menungguReset; if (await put("akun", st.username, o)) { logUbah("ubah", "akun", st.username, "Email pemulihan dilepas"); toast("Email pemulihan dilepas"); } };
  return html`<${SubHeader} title="Keamanan" sub="Username, kata sandi, email pemulihan" />
    <div class="wrap"><${Section} t="Akun masuk" /><${Card} cls="kv-card">
      <div class="kv"><span>Username</span><b>${st.username}</b></div>
      <div class="kv"><span>Kata sandi</span><b>••••••••</b></div>
      <div class="kv"><span>Terakhir diubah</span><b>${ov.hash && ov.diubah ? L.fmtDT(new Date(ov.diubah).toISOString()) : "Belum pernah (sandi awal)"}</b></div></${Card}>
      <${Btn} icon="lock" onClick=${() => nav.go("ubahSandi")}>Ubah kata sandi</${Btn}>
      <${Section} t="Email pemulihan" /><${Card} cls="kv-card">
        <div class="kv"><span>Email</span><b>${ov.email || "Belum dipasang"}</b></div>
        ${ov.email ? html`<div class="kv"><span>Status</span><b>${ov.menungguReset ? html`<${Pill} t="Menunggu atur sandi" tone="gold" />` : html`<${Pill} t="Aktif" />`}</b></div>` : null}</${Card}>
      <${Btn} kind=${ov.email ? "ghost" : "primary"} icon="mail" onClick=${() => setEd(true)}>${ov.email ? "Ganti email" : "Pasang email pemulihan"}</${Btn}>
      ${ov.email ? html`<div class="mt8"><${Btn} kind="ghost" onClick=${() => setAsk(true)}>Lepas email</${Btn}></div>` : null}
      <div class="mt12"><${Hint}>${ov.email ? "Jika lupa kata sandi, ketuk “Lupa kata sandi?” di halaman masuk. Tautan untuk membuat sandi baru dikirim ke email ini. Anda juga bisa masuk memakai email ini sebagai pengganti username." : "Pasang email agar bisa mengatur ulang kata sandi sendiri saat lupa. Tanpa email, reset sandi hanya bisa lewat Admin."}</${Hint}></div>
      ${ed ? html`<${PasangEmail} st=${st} ov=${ov} onClose=${() => setEd(false)} />` : null}
      <${Confirm} open=${ask} danger title="Lepas email pemulihan?" text="Setelah dilepas, lupa kata sandi hanya bisa direset oleh Admin." yes="Lepas" onYes=${lepas} onNo=${() => setAsk(false)} /></div>`;
}
function PasangEmail({ st, ov, onClose }) {
  const [email, setEmail] = useState(ov.email || ""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [info, setInfo] = useState("");
  const simpan = async () => {
    setErr(""); const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return setErr("Format email tidak benar.");
    const lain = L.staffDariEmail(e); if (lain && lain.username !== st.username) return setErr("Email ini sudah dipakai akun lain.");
    if (!(await L.cekSandi(st.username, pw, st.password))) return setErr("Kata sandi saat ini salah.");
    if (pw.length < 6) return setErr("Kata sandi Anda terlalu pendek untuk email pemulihan. Ubah dulu kata sandi (minimal 8 karakter, huruf dan angka).");
    if (!fbSiap()) return setErr("Butuh koneksi internet.");
    setBusy(true);
    let tunggu = false;
    try { await fbDaftar(e, pw); }
    catch (x) {
      if (!/email-already-in-use/.test(x.code || "")) { setBusy(false); return setErr(pesanAuth(x)); }
      try { await fbMasuk(e, pw); } catch (y) { if (!salahSandi(y)) { setBusy(false); return setErr(pesanAuth(y)); } try { await fbLupa(e); tunggu = true; } catch (z) { setBusy(false); return setErr(pesanAuth(z)); } }
    }
    const o = { ...ov, email: e, emailTs: Date.now() }; if (tunggu) o.menungguReset = true; else delete o.menungguReset;
    await put("akun", st.username, o); logUbah("ubah", "akun", st.username, "Email pemulihan dipasang");
    setBusy(false);
    if (tunggu) setInfo(`Email ${e} sudah pernah terdaftar. Kami kirim tautan ke email itu: buat kata sandi baru lewat tautannya, lalu masuk memakai sandi baru.`);
    else { toast("Email pemulihan terpasang. Cek email untuk verifikasi."); onClose(); }
  };
  return html`<${Sheet} open=${true} title=${ov.email ? "Ganti email pemulihan" : "Pasang email pemulihan"} onClose=${onClose}>${info ? html`<p>${info}</p><${Btn} onClick=${onClose}>Mengerti</${Btn}>` : html`
    <${Field} label="Email aktif (Gmail, dsb.)"><input class="in" type="email" inputmode="email" autocomplete="email" autocapitalize="none" value=${email} placeholder="nama@gmail.com" onInput=${x => setEmail(x.target.value)} /></${Field}>
    <${Field} label="Kata sandi saat ini" hint="Untuk memastikan ini memang Anda"><${PassInput} value=${pw} onInput=${x => setPw(x.target.value)} /></${Field}>
    ${err ? html`<div class="note red"><${Icon} n="alert" s=${18} />${err}</div>` : null}
    <${Btn} disabled=${busy || !email || !pw} onClick=${simpan}>${busy ? "Menyimpan…" : "Simpan email"}</${Btn}>
    <p class="small mt8">Firebase akan mengirim email verifikasi. Email dipakai hanya untuk mengatur ulang kata sandi.</p>`}</${Sheet}>`;
}

// Foto profil: bisa ditambah/diganti oleh pemilik akun (guru maupun wali)
export function FotoEdit({ nama, size = 96 }) {
  useApp();
  const k = kunciFoto(nav.user), pr = get("profil", k) || {}, [busy, setBusy] = useState(false), [ask, setAsk] = useState(false);
  const pilih = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    if (!/^image\//.test(f.type)) return toast("Pilih file gambar (JPG/PNG).", "err");
    setBusy(true); try { const foto = await fotoPersegi(f, 320); if (await put("profil", k, { ...pr, foto, fotoTs: Date.now() })) toast(pr.foto ? "Foto profil diganti" : "Foto profil ditambahkan"); } catch (x) { toast("Foto tidak bisa dibaca. Coba foto lain.", "err"); } setBusy(false); };
  const hapus = async () => { setAsk(false); const o = { ...pr }; delete o.foto; if (await put("profil", k, o)) toast("Foto profil dihapus"); };
  return html`<div class="foto-blk"><label class="foto-edit" aria-label=${pr.foto ? "Ganti foto profil" : "Tambah foto profil"}><${FotoAv} src=${pr.foto} nama=${nama} size=${size} />
      <span class="fe-btn">${busy ? "…" : html`<${Icon} n="camera" s=${16} w=${2.4} />`}</span><input type="file" accept="image/*" onChange=${pilih} /></label>
    <small class="small">${pr.foto ? html`Ketuk foto untuk mengganti · <button class="link" style="min-height:32px" onClick=${() => setAsk(true)}>Hapus foto</button>` : "Ketuk untuk menambahkan foto profil"}</small>
    <${Confirm} open=${ask} danger title="Hapus foto profil?" text="Foto diganti inisial nama." yes="Hapus" onYes=${hapus} onNo=${() => setAsk(false)} /></div>`;
}

// Profil wali: biodata ananda hanya-baca (diisi Admin); yang bisa diubah wali hanya foto profil
const BIO_S = [["panggilan", "Nama panggilan"], ["nis", "NIS"], ["tempatLahir", "Tempat lahir"], ["lahir", "Tanggal lahir"], ["hobi", "Hobi"], ["cita", "Cita-cita"],
  ["alamat", "Alamat"], ["ayah", "Nama ayah"], ["ibu", "Nama ibu"], ["hpWali", "No. HP wali"]];
export function WaliProfil() {
  useApp();
  const s = L.santriById(nav.user.id), a = L.asramaById(s.asrama), lh = L.lahirSantri(s);
  const val = k => (k === "lahir" ? (s.lahir ? L.fmtTgl(s.lahir, false) : null) : s[k]);
  return html`<${SubHeader} title="Profil Ananda" sub="Biodata dari pondok" />
    <div class="wrap"><div class="prof-head"><${FotoEdit} nama=${s.nama} /><b>${s.nama}</b><small>Kelas ${s.kelas} · Asrama ${a.nama} · ${L.namaHalaqah(s)}</small></div>
      <${Section} t="Biodata" /><${Card} cls="kv-card"><div class="kv"><span>Nama lengkap</span><b>${s.nama}</b></div>
        ${BIO_S.map(([k, lab]) => html`<div class="kv"><span>${lab}</span><b class=${val(k) ? "" : "kosong"}>${val(k) || "Belum diisi"}</b></div>`)}</${Card}>
      <${Hint}>Biodata diisi oleh Admin pondok dan tidak bisa diubah dari akun wali. Jika ada yang keliru, hubungi Admin. Foto profil bisa Bapak/Ibu tambahkan atau ganti sendiri.</${Hint}></div>`;
}
