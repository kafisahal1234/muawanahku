// Akun Yayasan: garis besar per pondok (tanpa nama santri/guru), dibagi per menu.
// Tiap halaman membandingkan Pondok 29 (kelas 7–8) dan Pondok 21 (kelas 9A–9B) untuk periode Bulan ini / Semester ini.
import { useState } from "preact/hooks";
import { html, useApp, Icon, SubHeader, Seg } from "./ui.js";
import { all, get } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";

export const PONDOK = [["29", "Kelas 7 & 8"], ["21", "Kelas 9A & 9B"]];
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
const rata = l => (l.length ? l.reduce((x, y) => x + y, 0) / l.length : null);
const satuDesimal = v => (v == null ? "—" : (Math.round(v * 10) / 10).toLocaleString("id-ID"));
const persen = v => (v == null ? "—" : v + "%");

function konteks(p, jenis) {
  const rg = L.periodeRange(jenis, L.today()), rh = L.rentangHitung(rg), dalam = t => !rh.kosong && t && t.slice(0, 10) >= rh.dari && t.slice(0, 10) <= rh.sampai;
  const ss = L.santriList().filter(x => L.pondokOfSantri(x) === p), ids = new Set(ss.map(x => x.id));
  return { p, rg, rh, dalam, ss, ids };
}
// ---------- angka per modul ----------
export function angkaTahfidz(p, jenis) {
  const { rg, dalam, ss, ids } = konteks(p, jenis);
  let h = 0, n = 0; all("absenHalaqah").filter(d => dalam(d.tanggal)).forEach(d => Object.entries(d.status || {}).forEach(([sid, v]) => { if (!ids.has(sid)) return; n++; if (v === "H") h++; }));
  const haf = ss.map(x => L.hafalan(x)), baru = ss.map(x => L.hafalanDalam(x.id, rg));
  const sebaran = [["< 1 juz", 0, 1], ["1–2 juz", 1, 3], ["3–5 juz", 3, 6], ["6–10 juz", 6, 11], ["> 10 juz", 11, 99]].map(([l, a, b]) => [l, haf.filter(x => x.jumlah >= a && x.jumlah < b).length]);
  return {
    santri: ss.length, hadir: pct(h, n), rataHafalan: rata(haf.map(x => x.jumlah)),
    hafalanBaru: baru.reduce((a, x) => a + x.baris, 0) / 15 / 20, rataBaruHal: rata(baru.map(x => x.baris / 15)),
    capaian: ss.length ? Math.round(rata(ss.map(x => L.capaianJuz(x).pct))) : null, tercapai: ss.filter(x => L.capaianJuz(x).tercapai).length,
    tasmi: baru.reduce((a, x) => a + x.tasmi.length, 0), iqro: ss.filter(L.santriIqra).length, sebaran,
  };
}
export function angkaKurikulum(p, jenis) {
  const { rg, dalam, ids } = konteks(p, jenis);
  let sl = 0, ok = 0, jurnal = 0, h = 0, n = 0;
  L.hariAktifDalam(rg, "kbm").forEach(t => { const hr = L.HARI_ID[L.parseYmd(t).getDay()];
    L.jadwalAll().filter(j => j.hari === hr && L.pondokKelas(j.kelas) === p).forEach(j => { sl++; const d = get("absenKelas", L.absenKelasKey(j.id, t)); if (!d) return; ok++; if (d.materi) jurnal++;
      Object.entries(d.status || {}).forEach(([sid, v]) => { if (!ids.has(sid)) return; n++; if (v === "H") h++; }); }); });
  const mapel = DATA.mapel.map(m => { const v = [...ids].map(sid => (L.nilaiAkhir(sid, m.id) || {}).akhir).filter(x => x != null); return [m.nama, v.length ? Math.round(rata(v)) : null]; });
  const guru = new Set(L.staffAktif().filter(st => L.pondokStaff(st).includes(p)).map(st => st.id));
  const izinGuru = all("izinGuru").filter(i => dalam(i.tanggal) && guru.has(i.guru)).length;
  return { sesi: sl, kbm: pct(ok, sl), jurnal: pct(jurnal, ok), hadirKelas: pct(h, n), mapel, izinGuru };
}
export function angkaKesantrian(p, jenis) {
  const { rg, dalam, ss, ids } = konteks(p, jenis);
  const iz = all("izin").filter(i => ids.has(i.santri) && dalam(i.keluar));
  const bap = all("bap").filter(b => ids.has(b.santri) && dalam(b.tanggal));
  const tingkat = ["Ringan", "Sedang", "Berat"].map(t => [t, bap.filter(b => (b.tingkat || "Ringan") === t).length]);
  const mut = ss.map(x => L.mutPersen(x.id, rg));
  return {
    izin: iz.length, pulang: iz.filter(i => i.jenis === "Perpulangan").length, telat: iz.filter(i => i.telat || L.terlambat(i)).length,
    luar: L.izinAktif().filter(i => ids.has(i.santri)).length, pel: bap.length, tingkat, santriPel: new Set(bap.map(b => b.santri)).size,
    ibadah: (v => (v == null ? null : Math.round(v)))(rata(mut.map(m => m.ibadah).filter(x => x != null))), adab: (v => (v == null ? null : Math.round(v)))(rata(mut.map(m => m.adab).filter(x => x != null))),
  };
}
export function angkaSdm(p, jenis) {
  const { rg, dalam } = konteks(p, jenis);
  const st = L.staffAktif().filter(x => x.id !== "admin" && L.pondokStaff(x).includes(p));
  const hit = r => st.filter(x => (x.roles || []).includes(r)).length;
  const HQ = L.HALAQAH.filter(h => h.pondok === p); let harus = 0, ada = 0;
  L.hariAktifDalam(rg, "halaqah").forEach(t => { const ses = L.sesiHari(t); HQ.forEach(h => ses.forEach(se => { harus++; if (get("absenHalaqah", L.halaqahKey(h.id, t, se))) ada++; })); });
  const ids = new Set(st.map(x => x.id));
  return { total: st.length, musyrif: hit("musyrif"), halaqah: hit("guru_tahfidz"), mapel: st.filter(x => (x.ajar || []).length).length,
    absenHalaqah: pct(ada, harus), izinGuru: all("izinGuru").filter(i => dalam(i.tanggal) && ids.has(i.guru)).length };
}

// ---------- tampilan ----------
// Satu baris perbandingan: label + dua bar (Pondok 29 & Pondok 21)
export function Banding({ t, ket, v, fmt = persen, maks, rendahBaik }) {
  const m = maks || Math.max(1, ...v.filter(x => x != null));
  return html`<div class="bd"><div class="bd-h"><b>${t}</b>${ket ? html`<small>${ket}</small>` : null}</div>
    ${PONDOK.map(([p], i) => { const x = v[i], w = x == null ? 0 : Math.max(x > 0 ? 3 : 0, Math.min(100, (x / m) * 100));
      return html`<div class=${"bd-r p" + p}><span class="bd-p">${p}</span><span class="bd-bar"><i class=${rendahBaik ? "merah" : ""} style=${`width:${w}%`}></i></span><b>${fmt(x)}</b></div>`; })}</div>`;
}
function Kelompok({ ic, t, children }) {
  return html`<section class="bk"><h3><${Icon} n=${ic} s=${17} /> ${t}</h3><div class="bk-isi">${children}</div></section>`;
}
function Kerangka({ judul, sub, children }) {
  return html`<${SubHeader} title=${judul} sub=${sub}>${children}</${SubHeader}>`;
}
function usePil() { const [j, setJ] = useState("bulanan"); return [j, html`<${Seg} small items=${[["bulanan", "Bulan ini"], ["semester", "Semester ini"]]} value=${j} onChange=${setJ} />`]; }
const Legenda = () => html`<div class="bd-leg">${PONDOK.map(([p, k]) => html`<span class=${"p" + p}><i></i>Pondok ${p} <em>${k}</em></span>`)}</div>`;
const Catatan = ({ rg }) => html`<p class="yy-cat">Periode ${rg.label}. Hanya garis besar per pondok. Rincian per santri, halaqah, dan guru ada pada Mudir dan para Wadir.</p>`;

export function YyTahfidz() {
  useApp();
  const [j, pil] = usePil(), A = PONDOK.map(([p]) => angkaTahfidz(p, j)), rg = L.periodeRange(j, L.today());
  return html`<${Kerangka} judul="Tahfidz" sub="Garis besar per pondok">${pil}</${Kerangka}>
    <div class="wrap bd-wrap"><${Legenda} />
      <${Kelompok} ic="users" t="Kehadiran & hafalan">
        <${Banding} t="Kehadiran halaqah" ket="persen hadir" v=${A.map(a => a.hadir)} maks=${100} />
        <${Banding} t="Rata-rata total hafalan" ket="juz per santri" v=${A.map(a => a.rataHafalan)} fmt=${x => satuDesimal(x) + " juz"} />
        <${Banding} t="Hafalan baru periode ini" ket="rata-rata halaman per santri" v=${A.map(a => a.rataBaruHal)} fmt=${x => satuDesimal(x) + " hal."} /></${Kelompok}>
      <${Kelompok} ic="target" t="Target semester">
        <${Banding} t="Capaian target hafalan" ket=${`target ${L.targetSemester()} juz per semester`} v=${A.map(a => a.capaian)} maks=${100} />
        <${Banding} t="Santri yang sudah mencapai target" v=${A.map(a => a.tercapai)} fmt=${x => x + " santri"} />
        <${Banding} t="Lulus tasmi' periode ini" v=${A.map(a => a.tasmi)} fmt=${x => x + " juz"} /></${Kelompok}>
      <${Kelompok} ic="layers" t="Sebaran total hafalan santri">
        ${A[0].sebaran.map(([l], i) => html`<${Banding} t=${l} v=${A.map(a => a.sebaran[i][1])} fmt=${x => x + " santri"} maks=${Math.max(1, ...A.map(a => a.santri))} />`)}
        <${Banding} t="Masih belajar Iqro' (tahsin)" v=${A.map(a => a.iqro)} fmt=${x => x + " santri"} maks=${Math.max(1, ...A.map(a => a.santri))} /></${Kelompok}>
      <${Catatan} rg=${rg} /></div>`;
}
export function YyKurikulum() {
  useApp();
  const [j, pil] = usePil(), A = PONDOK.map(([p]) => angkaKurikulum(p, j)), rg = L.periodeRange(j, L.today());
  return html`<${Kerangka} judul="Kurikulum" sub="Garis besar per pondok">${pil}</${Kerangka}>
    <div class="wrap bd-wrap"><${Legenda} />
      <${Kelompok} ic="calendar" t="Kegiatan belajar mengajar">
        <${Banding} t="KBM terlaksana" ket="dari jadwal pada hari KBM" v=${A.map(a => a.kbm)} maks=${100} />
        <${Banding} t="Jurnal mengajar terisi" ket="dari KBM yang terlaksana" v=${A.map(a => a.jurnal)} maks=${100} />
        <${Banding} t="Kehadiran santri di kelas" v=${A.map(a => a.hadirKelas)} maks=${100} />
        <${Banding} t="Izin guru tidak mengajar" v=${A.map(a => a.izinGuru)} fmt=${x => x + " kali"} rendahBaik=${true} /></${Kelompok}>
      <${Kelompok} ic="award" t="Rata-rata nilai mapel">
        ${A[0].mapel.map(([nm], i) => html`<${Banding} t=${nm} v=${A.map(a => a.mapel[i][1])} fmt=${x => (x == null ? "—" : String(x))} maks=${100} />`)}</${Kelompok}>
      <${Catatan} rg=${rg} /></div>`;
}
export function YyKesantrian() {
  useApp();
  const [j, pil] = usePil(), A = PONDOK.map(([p]) => angkaKesantrian(p, j)), rg = L.periodeRange(j, L.today());
  return html`<${Kerangka} judul="Kesantrian" sub="Garis besar per pondok">${pil}</${Kerangka}>
    <div class="wrap bd-wrap"><${Legenda} />
      <${Kelompok} ic="door" t="Izin & perpulangan">
        <${Banding} t="Sedang di luar pondok" ket="saat ini" v=${A.map(a => a.luar)} fmt=${x => x + " santri"} />
        <${Banding} t="Izin keluar & pulang" ket="periode ini" v=${A.map(a => a.izin)} fmt=${x => x + " kali"} />
        <${Banding} t="Terlambat kembali" v=${A.map(a => a.telat)} fmt=${x => x + " kali"} rendahBaik=${true} /></${Kelompok}>
      <${Kelompok} ic="alert" t="Pelanggaran">
        <${Banding} t="Jumlah pelanggaran" v=${A.map(a => a.pel)} fmt=${x => x + " kasus"} rendahBaik=${true} />
        ${A[0].tingkat.map(([tk], i) => html`<${Banding} t=${"Tingkat " + tk.toLowerCase()} v=${A.map(a => a.tingkat[i][1])} fmt=${x => x + " kasus"} rendahBaik=${true} maks=${Math.max(1, ...A.map(a => a.pel))} />`)}
        <${Banding} t="Santri yang tercatat melanggar" v=${A.map(a => a.santriPel)} fmt=${x => x + " santri"} rendahBaik=${true} /></${Kelompok}>
      <${Kelompok} ic="moon" t="Ibadah & adab di asrama">
        <${Banding} t="Mutaba'ah ibadah" v=${A.map(a => a.ibadah)} maks=${100} />
        <${Banding} t="Mutaba'ah adab" v=${A.map(a => a.adab)} maks=${100} /></${Kelompok}>
      <${Catatan} rg=${rg} /></div>`;
}
export function YySdm() {
  useApp();
  const [j, pil] = usePil(), A = PONDOK.map(([p]) => angkaSdm(p, j)), rg = L.periodeRange(j, L.today());
  return html`<${Kerangka} judul="Ustadz & Guru" sub="Garis besar per pondok">${pil}</${Kerangka}>
    <div class="wrap bd-wrap"><${Legenda} />
      <${Kelompok} ic="users" t="Jumlah ustadz">
        <${Banding} t="Ustadz & pengurus" v=${A.map(a => a.total)} fmt=${x => x + " orang"} />
        <${Banding} t="Wali asrama" v=${A.map(a => a.musyrif)} fmt=${x => x + " orang"} />
        <${Banding} t="Guru halaqah" v=${A.map(a => a.halaqah)} fmt=${x => x + " orang"} />
        <${Banding} t="Guru mapel" v=${A.map(a => a.mapel)} fmt=${x => x + " orang"} /></${Kelompok}>
      <${Kelompok} ic="check" t="Kedisiplinan">
        <${Banding} t="Absen halaqah tercatat" ket="sesi yang diabsen guru dari seluruh sesi" v=${A.map(a => a.absenHalaqah)} maks=${100} />
        <${Banding} t="Izin guru" v=${A.map(a => a.izinGuru)} fmt=${x => x + " kali"} rendahBaik=${true} /></${Kelompok}>
      <p class="yy-cat">Satu ustadz bisa memegang beberapa tugas, jadi jumlah per tugas tidak harus sama dengan total. Daftar nama ada di menu Tim.</p>
      <${Catatan} rg=${rg} /></div>`;
}
