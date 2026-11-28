// Pantauan Santri untuk Mudir: satu halaman, tanpa pindah-pindah layar.
// Isi: siapa yang sedang di luar pondok (pulang/izin/skorsing), riwayat izin, pelanggaran (BAP) rinci, dan poin tertinggi.
// Mudir umum melihat semua pondok; Mudir pondok tertentu (mis. Pondok 21) hanya pondoknya.
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, SubHeader, Seg } from "./ui.js";
import { Ikon, WARNA } from "./ikon.js";
import { all, get } from "./store.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { usePeriode } from "./s_rekap.js";
import { namaTindakan } from "./surat.js";

const tglPendek = iso => { if (!iso) return "—"; const d = new Date(iso); return `${d.getDate()} ${L.BULAN[d.getMonth()]}`; };
const lamaHari = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 864e5));
const identitas = s => `Kelas ${s.kelas} · ${L.asramaAman(s.asrama).nama}`;

function Kotak({ ic, warna, judul, ket, jumlah, children }) {
  return html`<section class="rp-card pt-card"><header class="rp-h"><span class=${"rp-ic " + warna}><${Icon} n=${ic} s=${18} /></span>
    <div class="rp-ht"><b>${judul}</b>${ket ? html`<small>${ket}</small>` : null}</div><div class=${"rp-big " + (jumlah ? "" : "nd")}>${jumlah ? jumlah : "0"}</div></header>${children}</section>`;
}
const Kosong = ({ t }) => html`<p class="rp-kosong">${t}</p>`;

export function PantauanSantri() {
  useApp();
  const m = me(), lingkup = L.mudirPondok(m) || ["29", "21"];
  const [pil, setPil] = useState(lingkup.length > 1 ? "all" : lingkup[0]);
  const pondok = pil === "all" ? lingkup : [pil];
  const p = usePeriode("bulanan");
  const masuk = sid => { const s = L.santriById(sid); return s && pondok.includes(L.pondokOfSantri(s)); };
  const dalam = t => t && t.slice(0, 10) >= p.rg.dari && t.slice(0, 10) <= p.rg.sampai;

  // 1. sedang di luar pondok (izin aktif), yang terlambat paling atas
  const luar = L.izinAktif().filter(i => masuk(i.santri)).sort((a, b) => (L.terlambat(b) - L.terlambat(a)) || String(a.kembali).localeCompare(String(b.kembali)));
  const telat = luar.filter(L.terlambat).length;
  // 2. riwayat izin/pulang pada periode (sudah kembali)
  const riwayat = all("izin").filter(i => i.status !== "aktif" && masuk(i.santri) && dalam(i.keluar)).sort((a, b) => String(b.keluar).localeCompare(String(a.keluar)));
  // 3. pelanggaran (BAP) pada periode
  const bap = all("bap").filter(b => masuk(b.santri) && dalam(b.tanggal)).sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)) || b.ts - a.ts);
  const terlibat = new Set(bap.map(b => b.santri)).size;
  // 4. poin pelanggaran tertinggi (akumulasi BAP + catatan MOTD)
  const poin = L.santriList().filter(s => pondok.includes(L.pondokOfSantri(s))).map(s => ({ s, p: L.poinSantri(s.id) })).filter(x => x.p.total).sort((a, b) => b.p.total - a.p.total).slice(0, 10);
  const [semuaBap, setSemuaBap] = useState(false), bapTampil = semuaBap ? bap : bap.slice(0, 8);

  const judulPondok = pil === "all" ? "Semua pondok" : "Pondok " + pil;
  return html`<${SubHeader} title="Pantauan Santri" sub=${judulPondok + " · " + (L.mudirPondok(m) && L.mudirPondok(m).length === 1 ? "Mudir Pondok " + lingkup[0] : "Mudir")}>
      ${lingkup.length > 1 ? html`<${Seg} items=${[["all", "Semua"], ["29", "Pondok 29"], ["21", "Pondok 21"]]} value=${pil} onChange=${setPil} />` : null}</${SubHeader}>
    <div class="wrap">
      <div class="pt-ringkas">
        <div class=${"pt-angka" + (luar.length ? " gold" : "")}><b>${luar.length}</b><span>Di luar pondok</span></div>
        <div class=${"pt-angka" + (telat ? " red" : "")}><b>${telat}</b><span>Belum kembali</span></div>
        <div class=${"pt-angka" + (bap.length ? " red" : "")}><b>${bap.length}</b><span>Pelanggaran</span></div>
      </div>

      <${Kotak} ic="door" warna="emas" judul="Sedang di luar pondok" ket="Pulang, izin keluar, sakit, atau skorsing — saat ini" jumlah=${luar.length}>
        ${luar.length ? html`<div class="pt-list">${luar.map(i => { const s = L.santriAman(i.santri), t = L.terlambat(i);
          return html`<div class=${"pt-row" + (t ? " telat" : "")}><div class="pt-top"><b>${s.nama}</b><span class=${"pill " + (t ? "red" : i.jenis === "Skorsing" ? "red" : "gold")}>${t ? `Terlambat ${lamaHari(i.kembali, new Date())} hari` : i.jenis}</span></div>
            <small>${identitas(s)}</small>
            <div class="pt-det"><span><em>Keluar</em>${L.fmtDT(i.keluar)}</span><span><em>Batas kembali</em>${L.fmtDT(i.kembali)}</span></div>
            ${i.alasan ? html`<p class="pt-ket">${i.jenis !== "Skorsing" && t ? i.jenis + " · " : ""}${i.alasan}</p>` : null}</div>`; })}</div>`
          : html`<${Kosong} t="Semua santri sedang di pondok." />`}</${Kotak}>

      ${p.bar}

      <${Kotak} ic="alert" warna="merah" judul="Pelanggaran" ket=${bap.length ? `${terlibat} santri · dari BAP Kesantrian` : "Dari BAP Kesantrian"} jumlah=${bap.length}>
        ${bap.length ? html`<div class="pt-list">${bapTampil.map(b => { const s = L.santriAman(b.santri);
          return html`<div class="pt-row"><div class="pt-top"><b>${s.nama}</b><span class="pill red">${b.poin || 0} poin</span></div>
            <small>${identitas(s)} · ${L.fmtTgl(b.tanggal)}</small>
            <p class="pt-pel">${b.pelanggaranNama || "Pelanggaran"}${b.tingkat ? html` <span class="pt-tk">${b.tingkat}</span>` : null}</p>
            <div class="pt-det"><span><em>Tindakan</em>${namaTindakan(b.tindakan || { jenis: "teguran" })}</span>${b.tempat ? html`<span><em>Tempat</em>${b.tempat}</span>` : null}</div>
            ${b.kronologi ? html`<p class="pt-ket">${b.kronologi}</p>` : null}</div>`; })}</div>
          ${bap.length > 8 ? html`<button type="button" class="rp-more" onClick=${() => setSemuaBap(!semuaBap)}>${semuaBap ? "Ringkas" : `Lihat semua (${bap.length})`}</button>` : null}`
          : html`<${Kosong} t="Tidak ada pelanggaran pada periode ini." />`}</${Kotak}>

      <${Kotak} ic="calendar" warna="biru" judul="Sudah pulang & kembali" ket="Izin yang selesai pada periode ini" jumlah=${riwayat.length}>
        ${riwayat.length ? html`<div class="pt-list">${riwayat.map(i => { const s = L.santriAman(i.santri);
          return html`<div class="pt-row ringkas"><div class="pt-top"><b>${s.nama}</b><span class=${"pill " + (i.telat ? "red" : "green")}>${i.telat ? "Kembali telat" : "Tepat waktu"}</span></div>
            <small>${identitas(s)} · ${i.jenis} · ${tglPendek(i.keluar)} – ${tglPendek(i.kembaliAktual || i.kembali)}</small></div>`; })}</div>`
          : html`<${Kosong} t="Belum ada izin yang selesai pada periode ini." />`}</${Kotak}>

      <${Kotak} ic="shield" warna="ungu" judul="Poin pelanggaran tertinggi" ket="Akumulasi BAP + catatan MOTD sejak awal" jumlah=${poin.length}>
        ${poin.length ? html`<div class="pt-list">${poin.map(({ s, p: x }, n) => html`<div class="pt-row ringkas"><div class="pt-top"><b><em class="pt-no">${n + 1}</em>${s.nama}</b><span class=${"pill " + (x.total >= 50 ? "red" : "gold")}>${x.total} poin</span></div>
            <small>${identitas(s)} · BAP ${x.bap} · MOTD ${x.motd}</small></div>`)}</div>`
          : html`<${Kosong} t="Belum ada santri dengan poin pelanggaran." />`}</${Kotak}>
    </div>`;
}

// ================= REKAP MODUL (Mudir) =================
// Satu pintu untuk tiga modul: Tahfidz, Kurikulum, Kesantrian. Tiap kartu memuat angka singkat hari ini, ketuk untuk masuk.
export function ModulMudir() {
  useApp();
  const st = me(), mp = L.mudirPondok(st) || ["29", "21"], pk = mp.length === 1 ? mp[0] : "all", tgl = L.today(), hari = L.hariIni();
  const diP = sid => { const s = L.santriById(sid); return !!s && mp.includes(L.pondokOfSantri(s)); }, ss = L.santriList().filter(s => mp.includes(L.pondokOfSantri(s)));
  let h = 0, n = 0; all("absenHalaqah").filter(d => d.tanggal === tgl).forEach(d => Object.entries(d.status || {}).forEach(([sid, v]) => { if (!diP(sid)) return; n++; if (v === "H") h++; }));
  const rata = ss.length ? ss.reduce((x, s) => x + L.hafalan(s).jumlah, 0) / ss.length : 0;
  const pondokKls = k => mp.includes(L.pondokKelas(k)), sl = L.jadwalAll().filter(j => j.hari === hari && pondokKls(j.kelas)), ok = sl.filter(j => get("absenKelas", L.absenKelasKey(j.id, tgl))).length;
  const iz = L.izinAktif().filter(i => diP(i.santri)), wk = L.weekStart(tgl), pel = all("bap").filter(b => b.tanggal >= wk && diP(b.santri)).length;
  const fmt = v => (Math.round(v * 10) / 10).toLocaleString("id-ID");
  const M = [
    { ic: "bookopen", w: "emerald", t: "Tahfidz", d: "Hafalan, kehadiran halaqah, tasmi', peringkat", go: () => nav.go("pengelolaan", { ro: true }),
      a: [[n ? Math.round((h / n) * 100) + "%" : "—", "hadir halaqah hari ini"], [fmt(rata), "rata hafalan (juz)"]] },
    { ic: "calendar", w: "orange", t: "Kurikulum", d: "KBM, jurnal mengajar, nilai mapel, jadwal", go: () => nav.go("kurikulum", { ro: true }),
      a: [[sl.length ? `${ok}/${sl.length}` : "—", sl.length ? "KBM terlaksana hari ini" : "tidak ada KBM hari ini"]] },
    { ic: "shield", w: "coral", t: "Kesantrian", d: "Izin, perpulangan, pelanggaran, asrama", go: () => nav.go("kesantrian", { pondok: pk }),
      a: [[iz.length, "santri sedang izin"], [pel, "pelanggaran pekan ini"]] }];
  return html`<${SubHeader} title="Rekap Modul" sub=${mp.length === 1 ? "Pondok " + mp[0] : "Pondok 29 & Pondok 21"} />
    <div class="wrap mm-wrap">${M.map(m => html`<button class=${"mm-kartu " + m.w} style=${`--mm:${WARNA[m.w][1]};--mm2:${WARNA[m.w][2]}`} onClick=${m.go}>
      <span class="mm-head"><span class="mm-ic"><${Ikon} n=${m.ic} warna=${m.w} s=${30} /></span><span class="mm-t"><b>${m.t}</b><small>${m.d}</small></span><${Icon} n="right" s=${20} /></span>
      <span class="mm-angka">${m.a.map(([v, l]) => html`<span><b>${v}</b><em>${l}</em></span>`)}</span></button>`)}</div>`;
}
