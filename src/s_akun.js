// ================= DAFTAR AKUN (admin, hanya-lihat) =================
// Dua tab: Guru & Pengurus, Wali Santri. Baris = foto + nama akun + jabatan/profesi.
// Ketuk → rincian akun (foto di tengah, data hanya ditampilkan). Mengubah data tetap lewat Data Master.
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, SubHeader, Seg, Sheet, Empty } from "./ui.js";
import * as L from "./logic.js";
import { FotoAv, FotoLihat, fotoSantri, me } from "./common.js";
import { get } from "./store.js";
import { bukaWaWali } from "./s_wa.js";
import { BIODATA } from "./biodata.js";

const fotoStaf = st => (get("profil", st.id) || {}).foto || null;
const hpTampil = v => { let d = String(v || "").replace(/\D/g, ""); if (d.startsWith("62")) d = "0" + d.slice(2); return d ? d.replace(/^(\d{4})(\d{4})(\d+)$/, "$1 $2 $3") : ""; };
const URUT_PERAN = ["yayasan", "mudir", "wadir_kurikulum", "wadir_tahfidz", "wadir_kesantrian", "admin", "musyrif", "guru_tahfidz", "guru_mapel"];

// jabatan/profesi yang mudah dibaca, urut dari jabatan tertinggi
export function jabatanStaf(st) {
  const r = [...(st.roles || [])].sort((a, b) => URUT_PERAN.indexOf(a) - URUT_PERAN.indexOf(b)), out = [];
  r.forEach(k => {
    if (k === "musyrif") { const a = L.asramaOf(st.id); out.push(a ? `Wali Asrama ${a.nama}` : "Wali Asrama"); }
    else if (k === "guru_tahfidz") out.push("Guru Halaqah");
    else if (k === "guru_mapel") { const m = [...new Set((st.ajar || []).map(([id]) => (L.mapelById(id) || {}).nama).filter(Boolean))]; out.push(m.length ? `Guru ${m.join(", ")}` : "Guru Mapel"); }
    else if (k === "wadir_kesantrian") out.push(st.pondok ? `Wadir Kesantrian Pondok ${st.pondok}` : "Wadir Kesantrian");
    else if (k === "mudir") out.push(st.mudirPondok ? `Mudir Pondok ${st.mudirPondok}` : "Mudir");
    else if (k === "admin") out.push("Admin Pondok");
    else if (k === "yayasan") out.push("Pengurus Yayasan");
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

export function Baris({ foto, nama, jabatan, kanan, onClick }) {
  return html`<button class="akun-row" onClick=${onClick}>
    <${FotoAv} src=${foto} nama=${nama} size=${48} cls="akun-av" />
    <span class="akun-t"><b>${nama}</b><small>${jabatan}</small></span>
    ${kanan || null}<${Icon} n="right" s=${18} c="#9AB0A5" /></button>`;
}

export function DaftarAkun({ tab: tab0 }) {
  useApp();
  const [tab, setTab] = useState(tab0 || "guru"), [q, setQ] = useState("");
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
              kanan=${L.waNomor(st.hp) ? html`<span class="akun-wa" title="No. WA terisi"><${Icon} n="chat" s=${14} /></span>` : null} onClick=${() => nav.go("profilAkun", { jenis: "guru", id: st.id })} />`)}</div>`)
          : html`<${Empty} t="Tidak ada akun yang cocok." icon="users" />`)
        : (gWali.length ? gWali.map(g => html`<p class="akun-sec">${g.nama}${g.ket ? html` <span>· ${g.ket}</span>` : null}</p>
            <div class="akun-list">${[...g.isi].sort((a, b) => L.asramaAman(a.asrama).nama.localeCompare(L.asramaAman(b.asrama).nama) || a.nama.localeCompare(b.nama)).map(s => { const p = persenBiodata(s);
              return html`<${Baris} foto=${fotoSantri(s.id)} nama=${s.nama} jabatan=${`Wali santri · Kelas ${s.kelas} · ${L.asramaAman(s.asrama).nama}`}
                kanan=${html`<span class=${"akun-pct " + (p >= 80 ? "ok" : p >= 50 ? "mid" : "low")} title="Kelengkapan biodata">${p}%</span>`} onClick=${() => nav.go("profilAkun", { jenis: "santri", id: s.id })} />`; })}</div>`)
          : html`<${Empty} t="Tidak ada akun wali yang cocok." icon="users" />`)}
    </div>`;
}

const Kv = ({ k, v, kosong = "Belum diisi" }) => html`<div class="kv"><span>${k}</span><b class=${v ? "" : "kosong"}>${v || kosong}</b></div>`;
const Bagian = ({ ic, t, children }) => html`<section class="akun-bag"><h4><${Icon} n=${ic} s=${16} /> ${t}</h4><div class="kv-card">${children}</div></section>`;

// ================= RINCIAN SANTRI (menu Cari, akun pengurus) =================
// Foto + nama, kartu hijau hafalan (total, juz selesai, peringkat kelas & umum), data ananda, orang tua, WA wali paling bawah.
export function peringkatHafalan(s) {
  const semua = L.santriList().map(x => ({ x, j: L.hafalan(x).jumlah })), saya = (semua.find(o => o.x.id === s.id) || { j: 0 }).j;
  const kls = semua.filter(o => o.x.kelas === s.kelas), urut = l => 1 + l.filter(o => o.j > saya + 1e-9).length;
  return { kelas: urut(kls), nKelas: kls.length, umum: urut(semua), nUmum: semua.length };
}
const medali = n => (n === 1 ? "emas" : n === 2 ? "perak" : n === 3 ? "perunggu" : "");

// ================= PROFIL (layar penuh) =================
// Dipakai menu Tim, menu Cari, dan Daftar Akun (Admin). Paling atas kartu hijau berisi foto & identitas;
// informasi yang sudah ada di kartu tidak diulang di bagian bawah.
const lihatAdmin = () => { const m = me(); return !!m && (m.roles || []).includes("admin"); };
function KartuAtas({ foto, nama, sub, chips, children, cls = "" }) {
  return html`<div class=${"pf-kartu hf " + cls}>
    <div class="pf-id"><${FotoLihat} src=${foto} nama=${nama} size=${92} cls="pf-av" />
      <h2>${nama}</h2>${sub ? html`<p>${sub}</p>` : null}
      ${chips && chips.length ? html`<div class="pf-chips">${chips.map(c => html`<span>${c}</span>`)}</div>` : null}</div>
    ${children || null}</div>`;
}
function ProfilStaf({ id }) {
  const st = L.staffById(id); if (!st) return html`<${SubHeader} title="Profil" /><div class="wrap"><${Empty} t="Akun tidak ditemukan." /></div>`;
  const a = L.asramaOf(st.id), h = L.halaqahOf(st.id), pd = L.pondokStaff(st), hp = hpTampil(st.hp), adm = lihatAdmin(), saya = me() && me().id === st.id;
  const ajarMap = (st.ajar || []).reduce((m, [mp, k]) => { const n = (L.mapelById(mp) || {}).nama || mp; (m[n] = m[n] || []).push(k); return m; }, {});
  const kelasAjar = [...new Set((st.ajar || []).map(([, k]) => k))];
  const angka = [a && [L.santriAsrama(a.id).length, "santri asrama"], h && [L.santriHalaqah(h.id).length, "santri halaqah"], kelasAjar.length && [kelasAjar.length, "kelas diajar"]].filter(Boolean);
  const [stt, tone] = statusAkun(st);
  const sub = st.pendek && st.pendek !== st.nama ? `Dipanggil ${st.pendek}` : "";
  return html`<${SubHeader} title="Profil ustadz" />
    <div class="wrap pf-wrap">
      <${KartuAtas} foto=${fotoStaf(st)} nama=${st.nama} sub=${sub} chips=${jabatanStaf(st).map(j => j.replace(/^Wali Asrama .+/, "Wali Asrama"))}>
        ${angka.length ? html`<div class="pf-angka">${angka.map(([n, l]) => html`<span><b>${n}</b><em>${l}</em></span>`)}</div>` : null}</${KartuAtas}>
      ${pd.length || a || h || Object.keys(ajarMap).length ? html`<${Bagian} ic="home2" t="Tugas">
        ${pd.length ? html`<${Kv} k="Pondok" v=${pd.map(p => "Pondok " + p).join(" & ")} />` : null}
        ${a ? html`<${Kv} k="Asrama dibina" v=${a.nama} />` : null}${h ? html`<${Kv} k="Halaqah" v=${h.nama} />` : null}
        ${Object.entries(ajarMap).map(([n, ks]) => html`<${Kv} k=${"Mengajar " + n} v=${"Kelas " + ks.join(", ")} />`)}</${Bagian}>` : null}
      <${Bagian} ic="chat" t="Kontak"><${Kv} k="No. WhatsApp" v=${hp} /></${Bagian}>
      ${adm ? html`<${Bagian} ic="lock" t="Akun (hanya Admin)"><${Kv} k="Username" v=${st.username} /><div class="kv"><span>Status</span><b><span class=${"pill " + tone}>${stt}</span></b></div>
        ${hp ? html`<${Kv} k="Nomor tampil di akun wali" v=${st.tampilWali === false ? "Tidak" : "Ya"} />` : null}</${Bagian}>` : null}
      ${hp && !saya ? html`<button class="btn full pf-btn" onClick=${() => bukaWaWali(st.hp, `Assalamu'alaikum ${st.pendek || st.nama}, `)}><${Icon} n="chat" s=${19} /> Chat WhatsApp</button>` : null}
    </div>`;
}
function ProfilSantri({ id }) {
  const s = L.santriById(id); if (!s) return html`<${SubHeader} title="Profil santri" /><div class="wrap"><${Empty} t="Santri tidak ditemukan." /></div>`;
  const a = L.asramaAman(s.asrama), hq = L.halaqahSantri(s), mus = a.musyrif && L.staffById(a.musyrif), gh = hq && L.staffById(hq.guru), hp = hpTampil(s.hpWali), adm = lihatAdmin();
  const h = L.hafalan(s), r = peringkatHafalan(s), R = 44, K = 2 * Math.PI * R, persen = Math.min(1, h.jumlah / 30), hal = Math.floor(h.baris / 15);
  const juz = [...h.selesai].sort((x, y) => x - y), jml = (Math.round(h.jumlah * 10) / 10).toLocaleString("id-ID");
  const TAMPIL = ["panggilan", "nis", "tempatLahir", "lahir", "ayah", "ibu", "namaWali", "hpWali", "hpAyah", "hpIbu"];
  const lain = BIODATA.filter(([k]) => !TAMPIL.includes(k) && s[k]), tambahan = Object.entries(s.tambahan || {}).filter(([, v]) => v);
  const p = persenBiodata(s), kode = L.kodeAkses(s);
  const Pk = ({ t, n, dari }) => html`<div class=${"rs-pk " + medali(n)}><span class="rs-pk-ic"><${Icon} n="star" s=${15} /></span><small>${t}</small><b>#${n}</b><em>dari ${dari} santri</em></div>`;
  return html`<${SubHeader} title="Profil santri" />
    <div class="wrap pf-wrap">
      <${KartuAtas} foto=${fotoSantri(s.id)} nama=${s.nama} sub=${[s.panggilan && `Panggilan ${s.panggilan}`, s.nis && `NIS ${s.nis}`].filter(Boolean).join(" · ")} chips=${[`Kelas ${s.kelas}`, `Pondok ${L.pondokOfSantri(s)}`]}>
        <div class="pf-hf">
          <div class="hf-ring pf-ring" role="img" aria-label=${`${jml} dari 30 juz`}>
            <svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="pfg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE08A" /><stop offset="1" stop-color="#E0A52A" /></linearGradient></defs>
              <circle cx="50" cy="50" r=${R} class="hf-trk" /><circle cx="50" cy="50" r=${R} class="hf-val" style="stroke:url(#pfg)" stroke-dasharray=${`${K * persen} ${K}`} transform="rotate(-90 50 50)" /></svg>
            <span><b>${jml}</b><small>dari 30</small></span></div>
          <div class="hf-main"><small class="hf-lbl">Total hafalan</small>
            <div class="hf-big">${h.khatam ? html`30 <em>juz</em>` : html`${h.selesai.length} <em>juz</em>${hal ? html` ${hal} <em>hal.</em>` : null}`}</div>
            ${h.khatam ? html`<span class="hf-pill">Khatam 30 juz</span>` : html`<div class="hf-pos"><b>Juz ${h.aktif}</b><span>sedang dihafal</span></div>`}</div></div>
        <div class="hf-sec"><div class="hf-row"><span>Juz yang sudah dihafal</span><b>${juz.length} juz</b></div>
          ${juz.length ? html`<div class="hf-chips">${juz.map(j => html`<span>${j}</span>`)}</div>` : html`<p class="hf-kosong">Belum ada juz yang selesai.</p>`}</div>
        <div class="rs-pks"><${Pk} t=${"Peringkat kelas " + s.kelas} n=${r.kelas} dari=${r.nKelas} /><${Pk} t="Peringkat umum" n=${r.umum} dari=${r.nUmum} /></div>
      </${KartuAtas}>
      ${adm ? html`<${Bagian} ic="lock" t="Akun wali (hanya Admin)">
        <${KodeAkses} kode=${kode} />
        <div class="kv"><span>Kelengkapan biodata</span><b class="akun-bar"><span class="bar"><i class=${p >= 80 ? "green" : p >= 50 ? "gold" : "red"} style=${`width:${p}%`}></i></span>${p}%</b></div></${Bagian}>` : null}
      <${Bagian} ic="user" t="Ananda">
        <${Kv} k="Tempat, tanggal lahir" v=${[s.tempatLahir, s.lahir ? L.fmtTgl(s.lahir) : ""].filter(Boolean).join(", ")} />
        <${Kv} k="Asrama" v=${a.nama + (mus ? " · " + (mus.pendek || mus.nama) : "")} />
        <${Kv} k="Halaqah" v=${hq ? hq.nama : ""} /></${Bagian}>
      <${Bagian} ic="users" t="Orang tua / wali"><${Kv} k="Nama ayah" v=${s.ayah} /><${Kv} k="Nama ibu" v=${s.ibu} />${s.namaWali ? html`<${Kv} k="Nama wali" v=${s.namaWali} />` : null}
        <${Kv} k="No. WA wali" v=${hp} />${s.hpAyah ? html`<${Kv} k="No. HP ayah" v=${hpTampil(s.hpAyah)} />` : null}${s.hpIbu ? html`<${Kv} k="No. HP ibu" v=${hpTampil(s.hpIbu)} />` : null}</${Bagian}>
      ${lain.length || tambahan.length ? html`<${Bagian} ic="clipboard" t="Biodata dari wali">${lain.map(([k, l]) => html`<${Kv} k=${l} v=${s[k]} />`)}${tambahan.map(([l, v]) => html`<${Kv} k=${l} v=${v} />`)}</${Bagian}>` : null}
      <button class="btn full pf-btn" onClick=${() => nav.go("santri", { sid: s.id })}><${Icon} n="clipboard" s=${19} /> Buka catatan lengkap santri<${Icon} n="right" s=${18} /></button>
    </div>`;
}
function KodeAkses({ kode }) {
  const [lihat, setLihat] = useState(false);
  return html`<div class="kv"><span>Kode akses</span><b class="akun-kode">${lihat ? kode : "••••••••••"} <button class="icon-btn" aria-label=${lihat ? "Sembunyikan kode" : "Tampilkan kode"} onClick=${() => setLihat(!lihat)}><${Icon} n=${lihat ? "eyeoff" : "eye"} s=${17} /></button></b></div>`;
}
export function ProfilAkun({ jenis, id }) {
  useApp();
  return jenis === "guru" ? html`<${ProfilStaf} id=${id} />` : html`<${ProfilSantri} id=${id} />`;
}

// ================= TIM =================
// Semua ustadz & pengurus, dikelompokkan per jabatan tertinggi (tiap orang hanya muncul sekali).
const KELOMPOK = [["yayasan", "Yayasan", st => st.roles.includes("yayasan")], ["mudir", "Mudir", st => st.roles.includes("mudir")],
  ["wadir", "Wakil Direktur", st => st.roles.some(r => r.startsWith("wadir_"))], ["admin", "Admin Pondok", st => st.roles.includes("admin")],
  ["musyrif", "Wali Asrama", st => st.roles.includes("musyrif")], ["halaqah", "Guru Halaqah", st => st.roles.includes("guru_tahfidz")],
  ["mapel", "Guru Mapel", st => st.roles.includes("guru_mapel") || (st.ajar || []).length], ["lain", "Lainnya", () => true]];
export function Tim() {
  useApp();
  const [q, setQ] = useState(""), k = q.trim().toLowerCase();
  const staf = L.staffAktif().filter(st => st.id !== "admin" && (!k || `${st.nama} ${st.pendek || ""} ${jabatanStaf(st).join(" ")}`.toLowerCase().includes(k)));
  const grup = KELOMPOK.map(([id, nama, cocok]) => ({ id, nama, isi: [] }));
  staf.forEach(st => { const i = KELOMPOK.findIndex(([, , c]) => c(st)); grup[i].isi.push(st); });
  return html`<${SubHeader} title="Tim" sub=${`${L.staffAktif().filter(st => st.id !== "admin").length} ustadz & pengurus pondok`} />
    <div class="wrap akun-wrap"><label class="akun-cari"><${Icon} n="search" s=${18} c="#7F948A" /><input class="in" type="search" placeholder="Cari nama atau jabatan" value=${q} onInput=${e => setQ(e.target.value)} /></label>
      ${staf.length ? grup.filter(g => g.isi.length).map(g => html`<p class="akun-sec">${g.nama} <span>(${g.isi.length})</span></p>
        <div class="akun-list">${g.isi.sort((x, y) => x.nama.localeCompare(y.nama)).map(st => html`<${Baris} foto=${fotoStaf(st)} nama=${st.nama} jabatan=${jabatanStaf(st).join(" · ")} onClick=${() => nav.go("profilAkun", { jenis: "guru", id: st.id })} />`)}</div>`)
        : html`<${Empty} t="Tidak ada yang cocok." icon="users" />`}</div>`;
}
