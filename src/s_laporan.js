// Layar Laporan Berkala + komponen Evaluasi (dipakai juga di semua layar Rekap)
import { useState, useEffect, useMemo } from "preact/hooks";
import { html, nav, useApp, Icon, SubHeader, Btn, Empty, Sheet } from "./ui.js";
import { S } from "./store.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { unduhPdf, tabelKePdf } from "./pdf.js";
import { selisihTeks, selisihBaik, JENIS_LABEL } from "./evaluasi.js";
import { daftarTerbit, cariLaporan, susunLaporan, belumDibaca, sudahDibaca, tandaiDibaca, bolehLaporan, teksLaporan, JENIS_IKON, JADWAL_TEKS, jadwalBerikut, KELOMPOK } from "./laporan.js";
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
export function Evaluasi({ ev, link = false, buka = true, judulLuar, tanpaRinci }) {
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
    ${!tanpaRinci && ev.rinci && ev.rinci.rows.length ? html`<button type="button" class=${"evx-rb" + (rinci ? " on" : "")} aria-expanded=${rinci} onClick=${() => setRinci(!rinci)}>
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
// rinci = true → sertakan tabel rincian per santri/guru (untuk PDF per bagian, bahan analisis)
export function bagianPdf(bagian, { rinci = false } = {}) {
  return bagian.flatMap(b => [
    { judul: bagian.length > 1 ? `${b.judul}${b.lingkup ? " · " + b.lingkup : ""}` : "Angka utama", kol: b.banding ? ["Aspek", "Pondok 29", "Pondok 21"] : ["Aspek", "Nilai", b.laluLabel ? `Dibanding ${b.laluLabel}` : "Keterangan"],
      rows: b.banding ? b.banding.map(x => [x.t, x.f(x.v["29"]), x.f(x.v["21"])]) : b.ringkas.map(r => [r.label, r.teks, [selisihTeks(r, b.laluLabel), r.ket].filter(Boolean).join(" · ")]) },
    { judul: "Kesimpulan", kol: ["No", "Kesimpulan"], rows: b.kesimpulan.map((k, i) => [i + 1, k]) },
    ...(b.perhatian.length ? [{ judul: `${b.labelPerhatian || "Perlu tindak lanjut"} (${b.perhatian.length})`, kol: ["No", "Nama", "Keterangan", "Catatan"], rows: b.perhatian.map((p, i) => [i + 1, p.nama, p.sub || "", p.isu.join("; ")]) }] : []),
    ...(b.baik.length ? [{ judul: `${b.labelBaik || "Kabar baik"} (${b.baik.length})`, kol: ["No", "Nama", "Keterangan", "Capaian"], rows: b.baik.map((p, i) => [i + 1, p.nama, p.sub || "", p.t]) }] : []),
    ...(rinci && b.rinci && b.rinci.rows.length ? [{ judul: "Rincian lengkap", kol: b.rinci.kol, rows: b.rinci.rows }] : []),
  ]);
}
// bagian: satu bagian (PDF per bidang) atau semua (PDF gabungan)
export function unduhLaporan(lap, bagian, { satu = false } = {}) {
  const m = me(), b0 = bagian[0], judul = satu ? `${lap.judul} · ${b0.judul}` : lap.judul, nama = `${judul} - ${lap.label}`.replace(/[\/:·]/g, "-").replace(/\s+-\s+/g, " - ");
  unduhPdf(nama, () => tabelKePdf({ judul, sub: `${satu && b0.lingkup ? b0.lingkup + " · " : ""}${lap.label} · ${rentang(lap.rg)}`,
    catatan: `Laporan disusun otomatis oleh MuawanahQu dari data yang diinput para ustadz; angka mengikuti data terbaru saat diunduh.${satu && b0.catatan ? " " + b0.catatan : ""}`,
    oleh: `Untuk ${m ? m.nama : nav.user && nav.user.kind === "wali" ? "wali santri" : ""}, dicetak ${L.fmtTgl(L.today())}`, bagian: bagianPdf(bagian, { rinci: satu }) }));
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

// ---------- hitung bagian (disimpan sementara agar pindah blok ↔ rincian tidak menghitung ulang) ----------
const _hasil = new Map();
const kunciHasil = (id, i) => `${id}|${nav.user ? nav.user.kind + nav.user.id : ""}|${S.ver}|${i}`;
function hitungBagian(id, tugas, i) {
  const k = kunciHasil(id, i); if (_hasil.has(k)) return _hasil.get(k);
  if (_hasil.size > 80) _hasil.clear();
  const x = tugas[i], e = x ? (x.tunda ? x.tunda() : x) : null; _hasil.set(k, e); return e;
}
const sudahDihitung = (id, i) => _hasil.has(kunciHasil(id, i));
const KEL = Object.fromEntries(KELOMPOK.map(([k, t, ic, w], i) => [k, { t, ic, w, i }]));
function kelompokkan(tugas) {
  const g = new Map(); tugas.forEach((x, i) => { const k = x.kelompok || "lain"; if (!g.has(k)) g.set(k, []); g.get(k).push(i); });
  return [...g.entries()].sort((a, b) => ((KEL[a[0]] || { i: 99 }).i - (KEL[b[0]] || { i: 99 }).i));
}
function useTugas(lap) {
  return useMemo(() => (lap ? susunLaporan(lap.jenis, lap.rg, { tunda: true }) : []), [lap && lap.id, S.ver, nav.user && nav.user.id]);
}
// Satu blok bidang di halaman laporan
function Blok({ x, ev, onBuka }) {
  const kel = KEL[x.kelompok] || { ic: "chart", w: "hijau" }, n = ev ? ev.perhatian.length : null, nb = ev ? ev.baik.length : 0;
  const angka = ev ? (ev.banding ? ev.banding.slice(0, 2).map(b => ({ label: b.t, teks: `${b.f(b.v["29"])} · ${b.f(b.v["21"])}`, nada: "" })) : ev.ringkas.slice(0, 2)) : [];
  const status = !ev ? "" : ev.banding ? "info" : ev.kosong ? "kosong" : n ? "perlu" : "aman";
  return html`<button type="button" class=${"lb " + kel.w + " " + status} onClick=${onBuka} aria-label=${`${x.judul}${n ? `, ${n} perlu tindak lanjut` : ""}`}>
    <span class="lb-top"><span class="lb-ic"><${Icon} n=${kel.ic} s=${19} /></span>
      <span class="lb-t"><b>${x.judul}</b>${x.lingkup ? html`<small>${x.lingkup}</small>` : null}</span><${Icon} n="right" s=${18} c="#9AB0A5" /></span>
    ${ev ? html`<span class="lb-ang">${angka.map(r => { const d = r.lalu != null && r.v != null ? Math.round((r.v - r.lalu) * 10) / 10 : null, baik = selisihBaik(r);
        return html`<span class=${"lb-a " + (r.nada || "")}><b>${r.teks}</b><small>${r.label}</small>${d ? html`<em class=${baik ? "naik" : "turun"}>${d > 0 ? "▲" : "▼"}</em>` : null}</span>`; })}</span>
      <span class="lb-st">${status === "perlu" ? html`<span class="lb-p merah"><i></i>${n} ${x.kelompok === "ananda" ? "perlu perhatian" : "perlu tindak lanjut"}</span>` : status === "aman" ? html`<span class="lb-p hijau"><${Icon} n="check" s=${13} w=${3} />Aman</span>` : status === "kosong" ? html`<span class="lb-p abu">Belum ada data</span>` : html`<span class="lb-p abu">Pondok 29 · Pondok 21</span>`}
        ${nb ? html`<span class="lb-p hijau">${nb} kabar baik</span>` : null}</span>`
      : html`<span class="lb-skel"><i></i><i></i></span>`}
  </button>`;
}
// Lembar unduh: per bagian (PDF terpisah) atau gabungan
function LembarUnduh({ open, onClose, lap, tugas }) {
  const unduhBagian = i => { onClose(); unduhLaporan(lap, [hitungBagian(lap.id, tugas, i)].filter(Boolean), { satu: true }); };
  const semua = () => { onClose(); unduhLaporan(lap, tugas.map((_, i) => hitungBagian(lap.id, tugas, i)).filter(Boolean)); };
  return html`<${Sheet} open=${open} title="Unduh laporan" onClose=${onClose}>
    <p class="small" style="margin-top:0">Pilih bagian. Tiap bagian menjadi satu file PDF lengkap dengan rincian per santri, supaya mudah dianalisis.</p>
    <div class="lu-list">${kelompokkan(tugas).map(([k, idx]) => html`<p class="lu-g">${(KEL[k] || { t: "Lainnya" }).t}</p>
      ${idx.map(i => html`<button type="button" class="menu-row" onClick=${() => unduhBagian(i)}><${Icon} n="file" s=${22} c="#0B6B43" /><span>${tugas[i].judul}<br /><small class="small">PDF bagian ini${tugas[i].lingkup ? " · " + tugas[i].lingkup : ""}</small></span><${Icon} n="download" s=${18} /></button>`)}`)}</div>
    ${tugas.length > 1 ? html`<button type="button" class="menu-row lu-semua" onClick=${semua}><${Icon} n="layers" s=${22} c="#1F56B5" /><span>Semua bagian dalam satu PDF<br /><small class="small">Ringkasan ${tugas.length} bagian, tanpa tabel rincian</small></span><${Icon} n="download" s=${18} /></button>` : null}
  </${Sheet}>`;
}

// ---------- baca satu laporan: blok-blok per bidang ----------
export function LaporanBaca({ id }) {
  useApp();
  const lap = cariLaporan(id), tugas = useTugas(lap), [, paksa] = useState(0), [unduh, setUnduh] = useState(false);
  // hitung blok bertahap setelah layar tampil (perpindahan layar tetap mulus)
  useEffect(() => {
    if (!lap) return; let batal = false, i = 0;
    const lanjut = () => { if (batal) return; const t0 = performance.now(); let ada = false;
      while (i < tugas.length && (performance.now() - t0 < 10 || !ada)) { if (!sudahDihitung(lap.id, i)) { hitungBagian(lap.id, tugas, i); ada = true; } i++; }
      paksa(n => n + 1); if (i < tugas.length) setTimeout(lanjut, 0); };
    const r = requestAnimationFrame(() => setTimeout(lanjut, 0));
    return () => { batal = true; cancelAnimationFrame(r); };
  }, [tugas]);
  useEffect(() => { if (lap) tandaiDibaca(lap.id); }, [id]);
  if (!lap) return html`<${SubHeader} title="Laporan" /><div class="wrap"><${Empty} t="Laporan tidak ditemukan." icon="chart" /></div>`;
  const wali = nav.user && nav.user.kind === "wali", evs = tugas.map((_, i) => (sudahDihitung(lap.id, i) ? hitungBagian(lap.id, tugas, i) : null));
  const siap = evs.filter(Boolean), nPerlu = siap.reduce((n, b) => n + (b.banding ? 0 : b.perhatian.length), 0), nBaik = siap.reduce((n, b) => n + b.baik.length, 0), selesai = siap.length === tugas.length;
  // satu bagian saja (mis. wali santri): langsung tampil utuh
  if (tugas.length === 1) return html`<${LaporanBagian} id=${id} i=${0} tunggal=${true} />`;
  return html`<${SubHeader} title=${lap.judul} sub=${lap.label} right=${html`<button type="button" class="hdr-btn" aria-label="Unduh laporan" onClick=${() => setUnduh(true)} disabled=${!tugas.length}><${Icon} n="download" s=${21} /></button>`} />
    <div class="wrap lap-wrap">
      <div class="lap-head">
        <div class="lap-hd-t"><span class="lap-h-tag">${JENIS_LABEL[lap.jenis]}</span><b>${rentang(lap.rg)}</b>
          <small>${lap.terbit ? `Terbit ${fmtTerbit(lap.terbit)}` : "Belum terbit"}</small></div>
        <div class="lap-hd-n"><span><b>${tugas.length}</b>bagian</span><span class=${nPerlu ? "merah" : ""}><b>${selesai ? nPerlu : "…"}</b>tindak lanjut</span><span class="hijau"><b>${selesai ? nBaik : "…"}</b>kabar baik</span></div>
      </div>
      ${!tugas.length ? html`<${Empty} t="Akun ini belum memegang halaqah, asrama, atau kelas, jadi belum ada isi laporan." icon="chart" />` : null}
      ${kelompokkan(tugas).map(([k, idx]) => html`<section class="lg">
        <h3 class="lg-h"><span class=${"lg-dot " + ((KEL[k] || {}).w || "")}></span>${(KEL[k] || { t: "Lainnya" }).t}<small>${idx.length > 1 ? idx.length + " bagian" : ""}</small></h3>
        <div class="lg-isi">${idx.map(i => html`<${Blok} key=${i} x=${tugas[i]} ev=${evs[i]} onBuka=${() => nav.go("laporanBagian", { id, i })} />`)}</div></section>`)}
      ${tugas.length ? html`<div class="lap-aksi">
        ${aiAda() ? html`<${Btn} icon="sparkle" onClick=${() => nav.go("asisten", { tanya: `Bahas ${lap.judul.toLowerCase()} ${lap.label} ini: apa 3 hal terpenting untuk dievaluasi dan langkah tindak lanjut yang paling tepat?`, lampiran: { nama: `${lap.judul} · ${lap.label}`, teks: teksLaporan(lap, siap) } })} disabled=${!selesai}>Bahas semua dengan Asisten AI</${Btn}>` : null}
        <${Btn} kind="ghost" icon="download" onClick=${() => setUnduh(true)}>Unduh PDF per bagian</${Btn}></div>` : null}
      <${LembarUnduh} open=${unduh} onClose=${() => setUnduh(false)} lap=${lap} tugas=${tugas} />
    </div>`;
}

// ---------- satu bagian: tab Ringkasan · Tindak lanjut · Kabar baik · Rincian ----------
export function LaporanBagian({ id, i, tunggal }) {
  useApp();
  const lap = cariLaporan(id), tugas = useTugas(lap), [tab, setTab] = useState("ringkas");
  const ev = lap && tugas[i] ? hitungBagian(lap.id, tugas, Number(i)) : null;
  useEffect(() => { if (lap) tandaiDibaca(lap.id); setTab("ringkas"); try { document.scrollingElement.scrollTop = 0; } catch (e) { } }, [id, i]);
  if (!lap || !ev) return html`<${SubHeader} title="Laporan" /><div class="wrap"><${Empty} t="Bagian laporan tidak ditemukan." icon="chart" /></div>`;
  const wali = nav.user && nav.user.kind === "wali", kel = KEL[tugas[i].kelompok] || { ic: "chart", w: "hijau" }, ke = Number(i);
  const tabs = [["ringkas", "Ringkasan"], ...(ev.banding ? [] : [["perlu", `${wali ? "Perhatian" : "Tindak lanjut"} ${ev.perhatian.length}`], ["baik", `Kabar baik ${ev.baik.length}`]].filter(([k]) => !wali || (k === "perlu" ? ev.perhatian.length : ev.baik.length))), ...(ev.rinci && ev.rinci.rows.length ? [["rinci", "Rincian"]] : [])];
  const tanyaAI = () => nav.go("asisten", { tanya: wali ? `Tolong jelaskan laporan ${lap.label} ini dan apa yang bisa kami bantu dari rumah.` : `Bahas bagian "${ev.judul}" dari ${lap.judul.toLowerCase()} ${lap.label}: apa yang paling perlu dievaluasi dan apa langkah tindak lanjutnya?`,
    lampiran: { nama: `${lap.judul} · ${ev.judul}`, teks: teksLaporan(lap, [ev]) } });
  const nav2 = d => { const j = ke + d; if (tugas[j]) nav.go("laporanBagian", { id, i: j }); };
  return html`<${SubHeader} title=${tunggal ? lap.judul : ev.judul} sub=${tunggal ? lap.label : `${lap.judul} · ${lap.label}`}>
      ${tabs.length > 1 ? html`<div class="lb-tabs" role="tablist">${tabs.map(([k, t]) => html`<button type="button" role="tab" aria-selected=${tab === k} class=${tab === k ? "on" : ""} onClick=${() => setTab(k)}>${t}</button>`)}</div>` : null}</${SubHeader}>
    <div class="wrap lap-wrap">
      ${tab === "ringkas" ? html`
        <div class=${"lbh " + kel.w}><span class="lb-ic"><${Icon} n=${kel.ic} s=${20} /></span><span class="lbh-t"><b>${tunggal ? ev.judul : ev.lingkup || ev.judul}</b><small>${rentang(lap.rg)}${ev.laluLabel ? ` · dibanding ${ev.laluLabel}` : ""}</small></span></div>
        <${Evaluasi} ev=${ev} judulLuar=${false} buka=${false} tanpaRinci=${true} />
        ${!ev.banding && (ev.perhatian.length || ev.baik.length) ? html`<div class="lb-loncat">
          ${ev.perhatian.length ? html`<button type="button" class="merah" onClick=${() => setTab("perlu")}><b>${ev.perhatian.length}</b><span>${ev.labelPerhatian || "Perlu tindak lanjut"}</span><${Icon} n="right" s=${16} /></button>` : null}
          ${ev.baik.length ? html`<button type="button" class="hijau" onClick=${() => setTab("baik")}><b>${ev.baik.length}</b><span>${ev.labelBaik || "Kabar baik"}</span><${Icon} n="right" s=${16} /></button>` : null}</div>` : null}
        ${!ev.banding && !ev.perhatian.length && !ev.kosong ? html`<p class="evx-aman"><${Icon} n="check" s=${16} /> Tidak ada yang perlu ditindaklanjuti.</p>` : null}`
      : tab === "perlu" ? html`<section class="evx">${ev.perhatian.length ? html`<${Daftar} judul=${ev.labelPerhatian || "Perlu tindak lanjut"} nada="merah" items=${ev.perhatian} link=${!wali} awal=${999} isi=${p => html`<span class="evx-isu">${p.isu.map(t => html`<span>${t}</span>`)}</span>`} />` : html`<p class="evx-aman"><${Icon} n="check" s=${16} /> Tidak ada yang perlu ditindaklanjuti.</p>`}</section>`
      : tab === "baik" ? html`<section class="evx">${ev.baik.length ? html`<${Daftar} judul=${ev.labelBaik || "Kabar baik"} nada="hijau" items=${ev.baik} link=${!wali} awal=${999} isi=${p => html`<span class="evx-isu baik"><span>${p.t}</span></span>`} />` : html`<p class="lap-kosong">Belum ada catatan kabar baik pada periode ini.</p>`}</section>`
      : html`<section class="evx"><div class="evx-tb lb-tb"><table><thead><tr>${ev.rinci.kol.map(k => html`<th>${k}</th>`)}</tr></thead><tbody>${ev.rinci.rows.map(r => html`<tr>${r.map(v => html`<td>${v}</td>`)}</tr>`)}</tbody></table></div>${ev.catatan ? html`<p class="evx-cat">${ev.catatan}</p>` : null}</section>`}
      <div class="lap-aksi">
        ${aiAda() ? html`<${Btn} icon="sparkle" onClick=${tanyaAI}>Bahas bagian ini dengan Asisten AI</${Btn}>` : null}
        <${Btn} kind="ghost" icon="download" onClick=${() => unduhLaporan(lap, [ev], { satu: true })}>${tunggal ? "Unduh PDF" : "Unduh PDF bagian ini"}</${Btn}></div>
      ${!tunggal && tugas.length > 1 ? html`<div class="lb-nav">
        <button type="button" disabled=${!tugas[ke - 1]} onClick=${() => nav2(-1)}><${Icon} n="left" s=${18} /><span><small>Sebelumnya</small><b>${tugas[ke - 1] ? tugas[ke - 1].judul : "—"}</b></span></button>
        <button type="button" disabled=${!tugas[ke + 1]} onClick=${() => nav2(1)}><span><small>Berikutnya</small><b>${tugas[ke + 1] ? tugas[ke + 1].judul : "—"}</b></span><${Icon} n="right" s=${18} /></button></div>` : null}
    </div>`;
}
