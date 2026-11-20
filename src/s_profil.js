// Profil (biodata) & Keamanan untuk akun guru/pengurus. Nama tersinkron ke data guru di seluruh aplikasi.
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Card, SubHeader, Btn, Field, Section, Hint, Seg } from "./ui.js";
import { S, get, put, toast } from "./store.js";
import * as L from "./logic.js";
import { me } from "./common.js";
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
      <div class="prof-head"><span class="prof-av">${L.initials(st.pendek.replace(/^(Ust\.|Ustdzh\.)\s*/, ""))}</span><b>${st.nama}</b><small>${st.roles.map(r => L.ROLE_LABEL[r]).join(" · ")}</small>
        <div class="prof-bar"><i style=${`width:${Math.round((isi / BIO.length) * 100)}%`}></i></div><small>Biodata terisi ${isi} dari ${BIO.length}</small></div>
      <${Section} t="Identitas" /><${Card} cls="kv-card"><div class="kv"><span>Nama lengkap</span><b>${st.nama}</b></div><div class="kv"><span>Nama panggilan</span><b>${st.pendek}</b></div>
        <div class="kv"><span>Peran</span><b>${st.roles.map(r => L.ROLE_LABEL[r]).join(", ")}</b></div>${L.asramaOf(st.id) ? html`<div class="kv"><span>Wali asrama</span><b>${L.asramaOf(st.id).nama}</b></div>` : null}
        ${L.halaqahOf(st.id) ? html`<div class="kv"><span>Halaqah</span><b>${L.halaqahOf(st.id).nama}</b></div>` : null}${st.ajar.length ? html`<div class="kv"><span>Mengajar</span><b>${st.ajar.map(([m, k]) => `${L.mapelById(m).nama} ${k}`).join(", ")}</b></div>` : null}</${Card}>
      <${Section} t="Biodata" /><${Card} cls="kv-card">${BIO.map(([k, lab]) => html`<div class="kv"><span>${lab}</span><b class=${pr[k] ? "" : "kosong"}>${fmtNilai(k, pr[k]) || "Belum diisi"}</b></div>`)}</${Card}>
      <${Btn} icon="edit" onClick=${mulai}>Ubah profil</${Btn}></div>`;
}

export function Keamanan() {
  useApp();
  const st = me(), ov = L.akunOv(st.username) || {};
  return html`<${SubHeader} title="Keamanan" sub="Username dan kata sandi" />
    <div class="wrap"><${Section} t="Akun masuk" /><${Card} cls="kv-card">
      <div class="kv"><span>Username</span><b>${st.username}</b></div>
      <div class="kv"><span>Kata sandi</span><b>••••••••</b></div>
      <div class="kv"><span>Terakhir diubah</span><b>${ov.hash && ov.diubah ? L.fmtDT(new Date(ov.diubah).toISOString()) : "Belum pernah (sandi awal)"}</b></div></${Card}>
      <${Btn} icon="lock" onClick=${() => nav.go("ubahSandi")}>Ubah kata sandi</${Btn}>
      <div class="mt12"><${Hint}>Username dibuat dan diubah oleh Admin pondok. Jika lupa kata sandi, minta Admin melakukan reset sandi.</${Hint}></div></div>`;
}
