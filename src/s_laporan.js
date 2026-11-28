// Layar Laporan Berkala + komponen Evaluasi (dipakai juga di semua layar Rekap)
import { useState, useEffect } from "preact/hooks";
import { html, nav, useApp, Icon, SubHeader, Btn, Empty } from "./ui.js";
import { S } from "./store.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { unduhPdf, tabelKePdf } from "./pdf.js";
import { selisihTeks, selisihBaik, JENIS_LABEL } from "./evaluasi.js";
import { daftarTerbit, cariLaporan, susunLaporan, belumDibaca, sudahDibaca, tandaiDibaca, bolehLaporan, teksLaporan, JENIS_IKON, JADWAL_TEKS, jadwalBerikut } from "./laporan.js";
import { Banding } from "./s_yayasan.js";
import { aiAda } from "./ai.js";

const HARI = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const fmtTerbit = d => (d ? `${HARI[d.getDay()]}, ${L.fmtTgl(L.ymd(d), false)} pukul ${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}` : "");
const singkatTgl = d => `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][d.getMonth()]}`;
const rentang = rg => { const rh = L.rentangHitung(rg); return rh.kosong ? rg.label : `${L.fmtShort(rh.dari)} – ${L.fmtShort(rh.sampai)}`; };

// ---------- satu angka ringkas + perbandingan ----------
function Angka({ r, laluLabel }) {
  const baik = selisihBaik(r), teks = selisihTeks(r, laluLabel);
  const d = r.lalu != null && r.v != null ? Math.round((r.v - r.lalu) * 10) / 10 : null;
  return html`<div class=${"evx-t " + (r.nada || "")}><small>${r.label}</small><b>${r.teks}</b>
    ${d != null ? html`<em class=${d === 0 ? "sama" : baik ? "naik" : "turun"} title=${teks} aria-label=${teks}>${d === 0 ? "= tetap" : `${d > 0 ? "▲" : "▼"} ${Math.abs(d).toLocaleString("id-ID")}${r.sat === "%" ? " poin" : r.satLalu || ""}`}</em>` : r.ket ? html`<span class="evx-ket">${r.ket}</span>` : null}
    ${d != null && r.ket ? html`<span class="evx-ket">${r.ket}</span>` : null}</div>`;
}
function Daftar({ judul, nada, items, isi, link, awal = 4 }) {
  const [semua, setSemua] = useState(false), tampil = semua ? items : items.slice(0, awal);
  if (!items.length) return null;
  return html`<div class=${"evx-grp " + nada}><div class="evx-gh"><i></i><span>${judul}</span><em>${items.length}</em></div>
    <ul class="evx-ls">${tampil.map(p => { const buka = link && p.id && (p.jenis === "santri" || p.jenis === "guru") ? () => nav.go("profilAkun", { jenis: p.jenis, id: p.id }) : null;
      const dalam = html`<span class="evx-nm"><b>${p.nama}</b>${p.sub ? html`<small>${p.sub}</small>` : null}</span>${isi(p)}`;
      return html`<li>${buka ? html`<button type="button" class="evx-row" onClick=${buka}>${dalam}<${Icon} n="right" s=${16} c="#9AB0A5" /></button>` : html`<div class="evx-row">${dalam}</div>`}</li>`; })}</ul>
    ${items.length > awal ? html`<button type="button" class="evx-more" onClick=${() => setSemua(!semua)}>${semua ? "Ringkas" : `Lihat semua ${items.length}`}</button>` : null}</div>`;
}
// Blok evaluasi: angka → kesimpulan → perlu tindak lanjut → kabar baik → rincian
export function Evaluasi({ ev, link = false, buka = true, judulLuar }) {
  const [rinci, setRinci] = useState(false);
  if (!ev) return null;
  return html`<section class="evx" id=${"evx-" + ev.kunci}>
    ${judulLuar === false ? null : html`<header class="evx-h"><span class="evx-ic"><${Icon} n=${ev.ikon || "chart"} s=${19} /></span><div><h3>${ev.judul}</h3>${ev.lingkup ? html`<small>${ev.lingkup}</small>` : null}</div></header>`}
    ${ev.banding ? html`<div class="evx-bd">${ev.banding.map(b => html`<${Banding} t=${b.t} v=${[b.v["29"], b.v["21"]]} fmt=${b.f} rendahBaik=${b.rendahBaik} maks=${/%|capaian|Kehadiran|Ibadah|Adab|terisi|terlaksana/i.test(b.t) ? 100 : undefined} />`)}</div>`
      : ev.ringkas.length ? html`<div class=${"evx-ang n" + Math.min(4, ev.ringkas.length)}>${ev.ringkas.map(r => html`<${Angka} r=${r} laluLabel=${ev.laluLabel} />`)}</div>` : null}
    ${ev.kesimpulan.length ? html`<div class="evx-kes"><p class="evx-lb">Kesimpulan</p><ul>${ev.kesimpulan.map(k => html`<li>${k}</li>`)}</ul></div>` : null}
    ${buka !== false ? html`
      <${Daftar} judul=${ev.labelPerhatian || "Perlu tindak lanjut"} nada="merah" items=${ev.perhatian} link=${link} isi=${p => html`<span class="evx-isu">${p.isu.map(t => html`<span>${t}</span>`)}</span>`} />
      <${Daftar} judul=${ev.labelBaik || "Kabar baik"} nada="hijau" items=${ev.baik} link=${link} awal=${3} isi=${p => html`<span class="evx-isu baik"><span>${p.t}</span></span>`} />
      ${!ev.perhatian.length && !ev.kosong && !ev.banding && !ev.tanpaAman ? html`<p class="evx-aman"><${Icon} n="check" s=${16} /> Tidak ada yang perlu ditindaklanjuti.</p>` : null}` : null}
    ${ev.rinci && ev.rinci.rows.length ? html`<button type="button" class=${"evx-rb" + (rinci ? " on" : "")} aria-expanded=${rinci} onClick=${() => setRinci(!rinci)}>
        <${Icon} n="grid" s=${16} /><span>${rinci ? "Tutup rincian" : `Rincian lengkap (${ev.rinci.rows.length} baris)`}</span><${Icon} n="down" s=${16} /></button>
      ${rinci ? html`<div class="evx-tb"><table><thead><tr>${ev.rinci.kol.map(k => html`<th>${k}</th>`)}</tr></thead><tbody>${ev.rinci.rows.map(r => html`<tr>${r.map(v => html`<td>${v}</td>`)}</tr>`)}</tbody></table></div>
        ${ev.catatan ? html`<p class="evx-cat">${ev.catatan}</p>` : null}` : null}` : null}
  </section>`;
}

// Evaluasi yang dihitung sesaat setelah layar tampil (layar rekap terbuka tanpa jeda)
export function EvaluasiTunda({ buat, kunci, ...rest }) {
  const [ev, setEv] = useState(null);
  useEffect(() => { let batal = false; const r = requestAnimationFrame(() => setTimeout(() => { if (!batal) { try { setEv(buat()); } catch (e) { console.warn(e); } } }, 0)); return () => { batal = true; cancelAnimationFrame(r); }; }, [kunci, S.ver]);
  return ev ? html`<${Evaluasi} ev=${ev} ...${rest} />` : html`<div class="evx evx-skel" aria-hidden="true"><i></i><i></i><i></i></div>`;
}

// ---------- PDF ----------
export function bagianPdf(bagian) {
  return bagian.flatMap(b => [
    { judul: `${b.judul}${b.lingkup ? " · " + b.lingkup : ""}`, kol: b.banding ? ["Aspek", "Pondok 29", "Pondok 21"] : ["Aspek", "Nilai", b.laluLabel ? `Dibanding ${b.laluLabel}` : "Keterangan"],
      rows: b.banding ? b.banding.map(x => [x.t, x.f(x.v["29"]), x.f(x.v["21"])]) : b.ringkas.map(r => [r.label, r.teks, selisihTeks(r, b.laluLabel) || r.ket || ""]) },
    { judul: "Kesimpulan", kol: ["No", "Kesimpulan"], rows: b.kesimpulan.map((k, i) => [i + 1, k]) },
    ...(b.perhatian.length ? [{ judul: `Perlu tindak lanjut (${b.perhatian.length})`, kol: ["Nama", "Keterangan", "Catatan"], rows: b.perhatian.map(p => [p.nama, p.sub || "", p.isu.join("; ")]) }] : []),
    ...(b.baik.length ? [{ judul: `Kabar baik (${b.baik.length})`, kol: ["Nama", "Keterangan", "Capaian"], rows: b.baik.map(p => [p.nama, p.sub || "", p.t]) }] : []),
  ]);
}
export function unduhLaporan(lap, bagian) {
  const m = me(), nama = `${lap.judul} - ${lap.label}`.replace(/[\/:]/g, "-");
  unduhPdf(nama, () => tabelKePdf({ judul: lap.judul, sub: `${lap.label} · ${rentang(lap.rg)}`,
    catatan: "Laporan disusun otomatis oleh MuawanahQu dari data yang diinput para ustadz. Angka dihitung dari data terbaru saat diunduh.",
    oleh: `Untuk ${m ? m.nama : nav.user && nav.user.kind === "wali" ? "wali santri" : ""}, dicetak ${L.fmtTgl(L.today())}`, bagian: bagianPdf(bagian) }));
}

// ---------- kartu di Beranda ----------
export function KartuLaporan() {
  useApp();
  if (!bolehLaporan()) return null;
  const baru = belumDibaca(), lap = baru[0];
  if (!lap) return null;
  return html`<button type="button" class="lap-kartu" onClick=${() => nav.go("laporanBaca", { id: lap.id })}>
    <span class="lap-k-ic"><${Icon} n=${JENIS_IKON[lap.jenis] || "chart"} s=${22} /></span>
    <span class="lap-k-t"><small>${lap.judul} sudah terbit</small><b>${lap.label}</b><em>${baru.length > 1 ? `${baru.length} laporan belum dibaca` : "Ketuk untuk membaca hasil evaluasi"}</em></span>
    <span class="lap-k-go"><${Icon} n="right" s=${20} /></span></button>`;
}

// ---------- daftar laporan ----------
export function Laporan() {
  useApp();
  const list = daftarTerbit(), baca = sudahDibaca(), [tab, setTab] = useState("semua");
  if (!bolehLaporan()) return html`<${SubHeader} title="Laporan Berkala" /><div class="wrap"><${Empty} t="Laporan berkala untuk ustadz, pimpinan, dan wali santri." icon="chart" /></div>`;
  const pilih = tab === "semua" ? list : list.filter(x => (tab === "lain" ? !["pekanan", "bulanan"].includes(x.jenis) : x.jenis === tab));
  const atas = list[0], berikut = jadwalBerikut();
  const Baris = ({ x }) => html`<button type="button" class=${"lap-row " + x.jenis} onClick=${() => nav.go("laporanBaca", { id: x.id })}>
    <span class="lap-r-ic"><${Icon} n=${JENIS_IKON[x.jenis] || "chart"} s=${19} /></span>
    <span class="lap-r-t"><b>${x.label}</b><small>${JENIS_LABEL[x.jenis]} · terbit ${singkatTgl(x.terbit)}</small></span>
    ${baca.has(x.id) ? null : html`<span class="lap-baru">Baru</span>`}<${Icon} n="right" s=${17} c="#9AB0A5" /></button>`;
  return html`<${SubHeader} title="Laporan Berkala" sub="Bahan evaluasi yang terbit otomatis" />
    <div class="wrap lap-wrap">
      ${atas ? html`<button type="button" class="lap-hero" onClick=${() => nav.go("laporanBaca", { id: atas.id })}>
        <span class="lap-h-tag">${baca.has(atas.id) ? "Terbaru" : "Baru terbit"}</span>
        <b>${atas.judul}</b><span class="lap-h-per">${atas.label}</span>
        <small>Terbit ${fmtTerbit(atas.terbit)}</small>
        <span class="lap-h-go">Baca laporan <${Icon} n="right" s=${18} /></span></button>` : html`<${Empty} t="Belum ada laporan yang terbit." icon="chart" />`}
      <div class="lap-jadwal"><p><${Icon} n="clock" s=${16} /> Laporan pekanan berikutnya: <b>${fmtTerbit(berikut)}</b></p>
        <div class="lap-jd">${JADWAL_TEKS.map(([, t, w]) => html`<span><b>${t}</b>${w}</span>`)}</div></div>
      <div class="lap-tabs" role="tablist">${[["semua", "Semua"], ["pekanan", "Pekanan"], ["bulanan", "Bulanan"], ["lain", "Semester"]].map(([k, t]) => html`<button type="button" role="tab" aria-selected=${tab === k} class=${tab === k ? "on" : ""} onClick=${() => setTab(k)}>${t}</button>`)}</div>
      <div class="lap-list">${pilih.length ? pilih.map(x => html`<${Baris} x=${x} />`) : html`<p class="lap-kosong">Belum ada laporan jenis ini.</p>`}</div>
    </div>`;
}

// ---------- baca satu laporan ----------
export function LaporanBaca({ id }) {
  useApp();
  const lap = cariLaporan(id), [h, setH] = useState({ list: [], total: null });
  // dihitung bertahap per bagian setelah layar tampil, supaya perpindahan layar tetap mulus
  useEffect(() => {
    if (!lap) return; let batal = false, i = 0; const tugas = susunLaporan(lap.jenis, lap.rg, { tunda: true }), out = [];
    setH({ list: [], total: tugas.length });
    const lanjut = () => { if (batal) return; const t0 = performance.now();
      while (i < tugas.length && (performance.now() - t0 < 10 || i === 0)) { const x = tugas[i++], e = x.tunda ? x.tunda() : x; if (e) out.push(e); }
      setH({ list: out.slice(), total: tugas.length }); if (i < tugas.length) setTimeout(lanjut, 0); };
    const r = requestAnimationFrame(() => setTimeout(lanjut, 0));
    return () => { batal = true; cancelAnimationFrame(r); };
  }, [id, S.ver, nav.user && nav.user.id]);
  useEffect(() => { if (lap) tandaiDibaca(lap.id); }, [id]);
  const bagian = h.list, sisa = h.total == null ? 1 : h.total - bagian.length;
  if (!lap) return html`<${SubHeader} title="Laporan" /><div class="wrap"><${Empty} t="Laporan tidak ditemukan." icon="chart" /></div>`;
  const wali = nav.user && nav.user.kind === "wali", nPerlu = bagian.reduce((n, b) => n + b.perhatian.length, 0);
  const tanyaAI = () => nav.go("asisten", { tanya: wali ? `Tolong jelaskan laporan ${lap.label} ini dan apa yang bisa kami bantu dari rumah.` : `Bahas ${lap.judul.toLowerCase()} ${lap.label} ini: apa 3 hal terpenting untuk dievaluasi dan langkah tindak lanjut yang paling tepat?`,
    lampiran: { nama: `${lap.judul} · ${lap.label}`, teks: teksLaporan(lap, bagian) } });
  const loncat = k => { const el = document.getElementById("evx-" + k); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
  return html`<${SubHeader} title=${lap.judul} sub=${lap.label} />
    <div class="wrap lap-wrap">
      <div class="lap-head">
        <div class="lap-hd-t"><span class="lap-h-tag">${JENIS_LABEL[lap.jenis]}</span><b>${rentang(lap.rg)}</b>
          <small>${lap.terbit ? `Terbit ${fmtTerbit(lap.terbit)}` : "Belum terbit"} · angka mengikuti data terbaru</small></div>
        <div class="lap-hd-n">${wali ? null : html`<span><b>${h.total ?? "…"}</b>bagian</span><span class=${nPerlu ? "merah" : ""}><b>${nPerlu}</b>perlu tindak lanjut</span>`}</div>
      </div>
      ${bagian.length > 1 ? html`<div class="lap-loncat">${bagian.map((b, i) => html`<button type="button" onClick=${() => loncat(b.kunci + i)}>${b.judul}</button>`)}</div>` : null}
      ${bagian.map((b, i) => html`<${Evaluasi} key=${i} ev=${{ ...b, kunci: b.kunci + i }} link=${!wali && !b.banding} />`)}
      ${sisa > 0 ? Array.from({ length: Math.min(sisa, 2) }, (_, i) => html`<div class="evx evx-skel" key=${"sk" + i} aria-hidden="true"><i></i><i></i><i></i></div>`) : null}
      ${h.total === 0 ? html`<${Empty} t="Akun ini belum memegang halaqah, asrama, atau kelas, jadi belum ada isi laporan." icon="chart" />` : null}
      ${bagian.length && !sisa ? html`<div class="lap-aksi">
        ${aiAda() ? html`<${Btn} icon="sparkle" onClick=${tanyaAI}>Bahas dengan Asisten AI</${Btn}>` : null}
        <${Btn} kind="ghost" icon="download" onClick=${() => unduhLaporan(lap, bagian)}>Unduh PDF</${Btn}></div>` : null}
    </div>`;
}
