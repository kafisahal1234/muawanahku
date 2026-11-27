// ================= DAFTAR AKUN (admin, hanya-lihat) =================
// Dua tab: Guru & Pengurus, Wali Santri. Baris = foto + nama akun + jabatan/profesi.
// Ketuk → rincian akun (foto di tengah, data hanya ditampilkan). Mengubah data tetap lewat Data Master.
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, SubHeader, Seg, Sheet, Empty } from "./ui.js";
import * as L from "./logic.js";
import { FotoAv, fotoSantri } from "./common.js";
import { get } from "./store.js";
import { bukaWaWali } from "./s_wa.js";
import { BIODATA } from "./biodata.js";

const fotoStaf = st => (get("profil", st.id) || {}).foto || null;
const hpTampil = v => { let d = String(v || "").replace(/\D/g, ""); if (d.startsWith("62")) d = "0" + d.slice(2); return d ? d.replace(/^(\d{4})(\d{4})(\d+)$/, "$1 $2 $3") : ""; };
const URUT_PERAN = ["mudir", "wadir_kurikulum", "wadir_tahfidz", "wadir_kesantrian", "admin", "musyrif", "guru_tahfidz", "guru_mapel"];

// jabatan/profesi yang mudah dibaca, urut dari jabatan tertinggi
export function jabatanStaf(st) {
  const r = [...(st.roles || [])].sort((a, b) => URUT_PERAN.indexOf(a) - URUT_PERAN.indexOf(b)), out = [];
  r.forEach(k => {
    if (k === "musyrif") { const a = L.asramaOf(st.id); out.push(a ? `Wali Asrama ${a.nama}` : "Wali Asrama"); }
    else if (k === "guru_tahfidz") out.push("Guru Halaqah");
    else if (k === "guru_mapel") { const m = [...new Set((st.ajar || []).map(([id]) => (L.mapelById(id) || {}).nama).filter(Boolean))]; out.push(m.length ? `Guru ${m.join(", ")}` : "Guru Mapel"); }
    else if (k === "wadir_kesantrian") out.push(st.pondok ? `Wadir Kesantrian Pondok ${st.pondok}` : "Wadir Kesantrian");
    else if (k === "admin") out.push("Admin Pondok");
    else out.push(L.ROLE_LABEL[k] || k);
  });
  // guru mapel tanpa peran guru_mapel tapi punya jadwal ajar
  if (!r.includes("guru_mapel") && (st.ajar || []).length) { const m = [...new Set(st.ajar.map(([id]) => (L.mapelById(id) || {}).nama).filter(Boolean))]; if (m.length) out.push(`Guru ${m.join(", ")}`); }
  return out.length ? out : ["Pengurus"];
}
const statusAkun = st => { const o = L.akunOv(st.username) || {}; return o.hapus ? ["Dihapus", "red"] : o.nonaktif ? ["Nonaktif", "gold"] : ["Akun aktif", "green"]; };

// kelengkapan biodata wali (kolom dasar profil ananda)
const DASAR = ["panggilan", "nis", "tempatLahir", "lahir", "hobi", "cita", "alamat", "ayah", "ibu", "hpWali"];
export const persenBiodata = s => Math.round((DASAR.filter(k => s[k]).length / DASAR.length) * 100);

function Baris({ foto, nama, jabatan, kanan, onClick }) {
  return html`<button class="akun-row" onClick=${onClick}>
    <${FotoAv} src=${foto} nama=${nama} size=${48} cls="akun-av" />
    <span class="akun-t"><b>${nama}</b><small>${jabatan}</small></span>
    ${kanan || null}<${Icon} n="right" s=${18} c="#9AB0A5" /></button>`;
}

export function DaftarAkun({ tab: tab0 }) {
  useApp();
  const [tab, setTab] = useState(tab0 || "guru"), [q, setQ] = useState(""), [pilih, setPilih] = useState(null);
  const cocok = t => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
  const staf = L.staffAktif().filter(st => cocok(`${st.nama} ${st.username} ${jabatanStaf(st).join(" ")}`));
  const santri = L.santriList().filter(s => cocok(`${s.nama} ${s.panggilan || ""} ${s.nis || ""} ${s.ibu || ""} ${s.ayah || ""} kelas ${s.kelas} ${L.asramaAman(s.asrama).nama}`));
  const gStaf = L.kelompokPondok(staf, st => { const p = L.pondokStaff(st); return p.length === 1 ? p[0] : "lain"; }).filter(g => g.isi.length);
  const gWali = L.kelompokPondok(santri, s => L.pondokOfSantri(s)).filter(g => g.isi.length);
  const urutStaf = (a, b) => URUT_PERAN.indexOf([...(a.roles || [])].sort((x, y) => URUT_PERAN.indexOf(x) - URUT_PERAN.indexOf(y))[0]) - URUT_PERAN.indexOf([...(b.roles || [])].sort((x, y) => URUT_PERAN.indexOf(x) - URUT_PERAN.indexOf(y))[0]) || a.nama.localeCompare(b.nama);
  return html`<${SubHeader} title="Daftar Akun" sub="Lihat saja · ubah data lewat Data Master" />
    <div class="wrap akun-wrap">
      <${Seg} items=${[["guru", `Guru & Pengurus (${L.staffAktif().length})`], ["wali", `Wali Santri (${L.santriList().length})`]]} value=${tab} onChange=${t => { setTab(t); setQ(""); }} />
      <label class="akun-cari"><${Icon} n="search" s=${18} c="#7F948A" /><input class="in" type="search" placeholder=${tab === "guru" ? "Cari nama atau jabatan" : "Cari nama santri, NIS, atau orang tua"} value=${q} onInput=${e => setQ(e.target.value)} /></label>
      ${tab === "guru"
        ? (gStaf.length ? gStaf.map(g => html`<p class="akun-sec">${g.nama}${g.ket ? html` <span>· ${g.ket}</span>` : null}</p>
            <div class="akun-list">${[...g.isi].sort(urutStaf).map(st => html`<${Baris} foto=${fotoStaf(st)} nama=${st.nama} jabatan=${jabatanStaf(st).join(" · ")}
              kanan=${L.waNomor(st.hp) ? html`<span class="akun-wa" title="No. WA terisi"><${Icon} n="chat" s=${14} /></span>` : null} onClick=${() => setPilih({ jenis: "guru", id: st.id })} />`)}</div>`)
          : html`<${Empty} t="Tidak ada akun yang cocok." icon="users" />`)
        : (gWali.length ? gWali.map(g => html`<p class="akun-sec">${g.nama}${g.ket ? html` <span>· ${g.ket}</span>` : null}</p>
            <div class="akun-list">${[...g.isi].sort((a, b) => L.asramaAman(a.asrama).nama.localeCompare(L.asramaAman(b.asrama).nama) || a.nama.localeCompare(b.nama)).map(s => { const p = persenBiodata(s);
              return html`<${Baris} foto=${fotoSantri(s.id)} nama=${s.nama} jabatan=${`Wali santri · Kelas ${s.kelas} · ${L.asramaAman(s.asrama).nama}`}
                kanan=${html`<span class=${"akun-pct " + (p >= 80 ? "ok" : p >= 50 ? "mid" : "low")} title="Kelengkapan biodata">${p}%</span>`} onClick=${() => setPilih({ jenis: "wali", id: s.id })} />`; })}</div>`)
          : html`<${Empty} t="Tidak ada akun wali yang cocok." icon="users" />`)}
    </div>
    ${pilih ? html`<${RincianAkun} ...${pilih} onClose=${() => setPilih(null)} />` : null}`;
}

const Kv = ({ k, v, kosong = "Belum diisi" }) => html`<div class="kv"><span>${k}</span><b class=${v ? "" : "kosong"}>${v || kosong}</b></div>`;
const Bagian = ({ ic, t, children }) => html`<section class="akun-bag"><h4><${Icon} n=${ic} s=${16} /> ${t}</h4><div class="kv-card">${children}</div></section>`;

function RincianAkun({ jenis, id, onClose }) {
  useApp();
  const [lihatKode, setLihatKode] = useState(false);
  if (jenis === "guru") {
    const st = L.staffById(id); if (!st) return null;
    const [stt, tone] = statusAkun(st), a = L.asramaOf(st.id), h = L.halaqahOf(st.id), pd = L.pondokStaff(st), hp = hpTampil(st.hp);
    const ajar = Object.entries((st.ajar || []).reduce((m, [mp, k]) => { const n = (L.mapelById(mp) || {}).nama || mp; (m[n] = m[n] || []).push(k); return m; }, {})).map(([n, ks]) => `${n} (kelas ${ks.join(", ")})`);
    const relevanWali = (st.roles || []).some(r => ["admin", "mudir", "wadir_tahfidz", "wadir_kurikulum", "wadir_kesantrian", "musyrif"].includes(r));
    return html`<${Sheet} open=${true} title="Rincian akun" onClose=${onClose}>
      <div class="akun-hero"><${FotoAv} src=${fotoStaf(st)} nama=${st.nama} size=${104} cls="akun-av besar" />
        <h3>${st.nama}</h3><p>${jabatanStaf(st).join(" · ")}</p>
        <div class="akun-chips"><span class=${"pill " + tone}>${stt}</span>${pd.length === 1 ? html`<span class="pill muted">Pondok ${pd[0]}</span>` : pd.length > 1 ? html`<span class="pill muted">Lintas pondok</span>` : null}</div></div>
      <${Bagian} ic="user" t="Akun"><${Kv} k="Nama panggilan" v=${st.pendek} /><${Kv} k="Username" v=${st.username} /><${Kv} k="Peran" v=${(st.roles || []).map(r => L.ROLE_LABEL[r] || r).join(", ")} /></${Bagian}>
      <${Bagian} ic="home2" t="Tugas"><${Kv} k="Pondok" v=${pd.map(p => "Pondok " + p).join(", ")} kosong="—" />
        <${Kv} k="Asrama dibina" v=${a ? `${a.nama} · ${L.santriAsrama(a.id).length} santri` : ""} kosong="—" />
        <${Kv} k="Halaqah" v=${h ? `${h.nama} · ${L.santriHalaqah(h.id).length} santri` : ""} kosong="—" />
        <${Kv} k="Mengajar" v=${ajar.join("; ")} kosong="—" /></${Bagian}>
      <${Bagian} ic="chat" t="Kontak"><${Kv} k="No. WhatsApp" v=${hp} />${relevanWali && hp ? html`<${Kv} k="Tampil di akun wali" v=${st.tampilWali === false ? "Tidak" : "Ya"} />` : null}</${Bagian}>
      ${hp ? html`<button class="btn primary full akun-btn-wa" onClick=${() => bukaWaWali(st.hp, `Assalamu'alaikum ${st.pendek || st.nama}, `)}><${Icon} n="chat" s=${19} /> Chat WhatsApp</button>` : null}
    </${Sheet}>`;
  }
  const s = L.santriById(id); if (!s) return null;
  const a = L.asramaAman(s.asrama), h = L.halaqahSantri(s), p = persenBiodata(s), hp = hpTampil(s.hpWali), kode = L.kodeAkses(s);
  const TAMPIL = ["panggilan", "nis", "tempatLahir", "lahir", "ayah", "ibu", "namaWali", "hpWali", "hpAyah", "hpIbu"];
  const lain = BIODATA.filter(([k]) => !TAMPIL.includes(k) && s[k]), tambahan = Object.entries(s.tambahan || {}).filter(([, v]) => v);
  const ortu = [s.ibu && `Ibu ${s.ibu}`, s.ayah && `Ayah ${s.ayah}`].filter(Boolean).join(" · ");
  return html`<${Sheet} open=${true} title="Rincian akun wali" onClose=${onClose}>
    <div class="akun-hero"><${FotoAv} src=${fotoSantri(s.id)} nama=${s.nama} size=${104} cls="akun-av besar" />
      <h3>${s.nama}</h3><p>Wali santri${ortu ? " · " + ortu : ""}</p>
      <div class="akun-chips"><span class="pill muted">Kelas ${s.kelas}</span><span class="pill muted">Pondok ${L.pondokOfSantri(s)}</span><span class=${"pill " + (p >= 80 ? "green" : p >= 50 ? "gold" : "red")}>Biodata ${p}%</span></div></div>
    <${Bagian} ic="lock" t="Akun wali">
      <div class="kv"><span>Kode akses</span><b class="akun-kode">${lihatKode ? kode : "••••••••••"} <button class="icon-btn" aria-label=${lihatKode ? "Sembunyikan kode" : "Tampilkan kode"} onClick=${() => setLihatKode(!lihatKode)}><${Icon} n=${lihatKode ? "eyeoff" : "eye"} s=${17} /></button></b></div>
      <div class="kv"><span>Kelengkapan biodata</span><b class="akun-bar"><span class="bar"><i class=${p >= 80 ? "green" : p >= 50 ? "gold" : "red"} style=${`width:${p}%`}></i></span>${p}%</b></div></${Bagian}>
    <${Bagian} ic="user" t="Ananda"><${Kv} k="Nama panggilan" v=${s.panggilan} /><${Kv} k="NIS" v=${s.nis} />
      <${Kv} k="Tempat, tanggal lahir" v=${[s.tempatLahir, s.lahir ? L.fmtTgl(s.lahir) : ""].filter(Boolean).join(", ")} />
      <${Kv} k="Kelas" v=${"Kelas " + s.kelas} /><${Kv} k="Asrama" v=${a.nama + (a.musyrif && L.staffById(a.musyrif) ? " · " + (L.staffById(a.musyrif).pendek || L.staffById(a.musyrif).nama) : "")} />
      <${Kv} k="Halaqah" v=${h ? h.nama : ""} /></${Bagian}>
    <${Bagian} ic="users" t="Orang tua / wali"><${Kv} k="Nama ayah" v=${s.ayah} /><${Kv} k="Nama ibu" v=${s.ibu} />${s.namaWali ? html`<${Kv} k="Nama wali" v=${s.namaWali} />` : null}
      <${Kv} k="No. WA wali" v=${hp} />${s.hpAyah ? html`<${Kv} k="No. HP ayah" v=${hpTampil(s.hpAyah)} />` : null}${s.hpIbu ? html`<${Kv} k="No. HP ibu" v=${hpTampil(s.hpIbu)} />` : null}</${Bagian}>
    ${lain.length || tambahan.length ? html`<${Bagian} ic="clipboard" t="Biodata dari wali">${lain.map(([k, l]) => html`<${Kv} k=${l} v=${s[k]} />`)}${tambahan.map(([l, v]) => html`<${Kv} k=${l} v=${v} />`)}</${Bagian}>` : null}
    ${hp ? html`<button class="btn primary full akun-btn-wa" onClick=${() => bukaWaWali(s.hpWali, `Assalamu'alaikum Ayah/Bunda dari ananda *${s.nama}*, `)}><${Icon} n="chat" s=${19} /> Chat WhatsApp wali</button>` : null}
  </${Sheet}>`;
}
