// Rekap per modul: Tahfidz, Mapel/Kurikulum, Asrama, Kesantrian — masing-masing berdiri sendiri, tanpa tab campuran
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Card, SubHeader, Btn, Empty, Hint, Sheet, Seg } from "./ui.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { unduhPdf, tabelKePdf } from "./pdf.js";
import { unduh } from "./s_system.js";
import { ttdUntukPdf } from "./s_ttd.js";
import { usePeriode, lingkup } from "./s_rekap.js";

const P = v => (v == null ? "—" : v + "%");
const nada = v => (v == null ? "mut" : v >= 90 ? "hijau" : v >= 75 ? "biru" : v >= 60 ? "emas" : "merah");
const rata = xs => { const v = xs.filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
const jml = (xs, f) => xs.reduce((n, x) => n + (f(x) || 0), 0);
const hal = baris => { if (!baris) return "0"; const h = baris / 15; return h >= 20 ? `${(h / 20).toLocaleString("id-ID", { maximumFractionDigits: 1 })} juz` : `${h.toLocaleString("id-ID", { maximumFractionDigits: 1 })} hal`; };
const pendek = n => String(n || "").split(" ").slice(0, 3).join(" ");

// ---------- komponen tampilan ----------
// angka utama: [label, nilai, keterangan, persen-untuk-bar|null, nada]
function Metrik({ items }) {
  return html`<div class="rx-m">${items.filter(Boolean).map(([lab, val, ket, bar, t]) => html`<div class=${"rx-mi " + (t || "")}>
    <span>${lab}</span><b>${val}</b>${bar != null ? html`<i class="rx-bar"><i style=${`width:${Math.max(0, Math.min(100, bar))}%`}></i></i>` : null}${ket ? html`<small>${ket}</small>` : null}</div>`)}</div>`;
}
function Grup({ judul, sub, items, onClick }) {
  return html`<button type="button" class="rx-grp" onClick=${onClick}><div class="rx-grp-h"><div><b>${judul}</b>${sub ? html`<small>${sub}</small>` : null}</div><span class="rx-lihat">Rincian <${Icon} n="right" s=${16} /></span></div>
    <${Metrik} items=${items} /></button>`;
}
// baris santri: nomor, nama, nilai utama, dan 4 angka kecil berlabel
function BarisSantri({ no, s, ket, utama, utamaNada, kolom, tanda }) {
  return html`<button type="button" class="rx-s" onClick=${() => nav.go("santri", { sid: s.id })}>
    <div class="rx-s-h"><em>${no}</em><div class="rx-s-n"><b>${s.nama}</b><small>${ket}</small></div>${utama != null ? html`<span class=${"rx-pill " + (utamaNada || "")}>${utama}</span>` : null}</div>
    ${tanda && tanda.length ? html`<div class="rx-tanda">${tanda.map(t => html`<span>${t}</span>`)}</div>` : null}
    <div class="rx-k">${kolom.map(([lab, val, t]) => html`<div class=${t || ""}><span>${lab}</span><b>${val}</b></div>`)}</div></button>`;
}
function Urut({ opsi, nilai, set }) { return html`<div class="rx-urut"><span>Urutkan</span><div class="seg small">${opsi.map(([k, t]) => html`<button type="button" class=${k === nilai ? "on" : ""} onClick=${() => set(k)}>${t}</button>`)}</div></div>`; }
function Bagian({ t, right }) { return html`<div class="rx-sec"><h4>${t}</h4>${right || null}</div>`; }

function Unduhan({ judul, rg, tabel, ttd }) {
  const [buka, setBuka] = useState(false), nama = `${judul} - ${rg.label}`.replace(/[\/:]/g, "-"), rh = L.rentangHitung(rg);
  const pdf = () => { const t = tabel(); unduhPdf(nama, () => tabelKePdf({ judul, sub: `${rg.label}${rh.kosong ? "" : ` · ${L.fmtTgl(rh.dari, false)} – ${L.fmtTgl(rh.sampai, false)}`}`, catatan: t.catatan,
    oleh: `Dicetak oleh ${me().nama}, ${L.fmtTgl(L.today())} · MuawanahKu`, bagian: t.bagian, ttd: ttdUntukPdf(ttd) })); };
  const csv = () => { const t = tabel(), q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    unduh(nama + ".csv", "﻿" + [q(`${judul} · ${rg.label}`), ...t.bagian.flatMap(b => ["", q(b.judul), b.kol.map(q).join(";"), ...b.rows.map(r => r.map(q).join(";"))])].join("\r\n")); };
  return html`<${Btn} kind="ghost" icon="download" onClick=${() => setBuka(true)}>Unduh rekap</${Btn}>
    <${Sheet} open=${buka} title="Unduh rekap" onClose=${() => setBuka(false)}>
      <p class="small" style="margin-top:0">${judul} · ${rg.label}</p>
      <button class="menu-row" onClick=${() => { setBuka(false); pdf(); }}><${Icon} n="file" s=${22} c="#0B6B43" /><span>Dokumen PDF<br /><small class="small">Siap dicetak atau dikirim, dengan kop pondok</small></span><${Icon} n="right" s=${18} /></button>
      <button class="menu-row" onClick=${() => { setBuka(false); csv(); }}><${Icon} n="grid" s=${22} c="#1F56B5" /><span>Tabel Excel (CSV)<br /><small class="small">Bisa dibuka di Excel / Google Sheets</small></span><${Icon} n="right" s=${18} /></button></${Sheet}>`;
}
const kosong = (judul, t) => html`<${SubHeader} title=${judul} /><div class="wrap"><${Card}><${Empty} t=${t} icon="chart" /></${Card}></div>`;

// ================= TAHFIDZ =================
const dataTahfidz = (list, rg) => list.map(s => ({ s, x: L.tahfidzDalam(s.id, rg), iq: L.santriIqra(s) }));
function ringkasTahfidz(d) {
  return { kh: rata(d.map(o => o.x.kh.pct)), baris: jml(d, o => o.x.zBaris), zSantri: d.filter(o => o.x.zSetor).length, muroHal: jml(d, o => o.x.muroHal), muro: jml(d, o => o.x.muro),
    manzil: jml(d, o => o.x.manzil), tasmi: jml(d, o => o.x.tasmiLulus.length), tasmiUji: jml(d, o => o.x.tasmiUji), tahsin: jml(d, o => o.x.tahsin) };
}
const itemTahfidz = (r, n, kin) => [
  ["Kehadiran santri", P(r.kh), "rata-rata halaqah", r.kh, nada(r.kh)],
  ["Ziyadah", hal(r.baris), `${r.zSantri}/${n} santri setor`, null, "hijau"],
  ["Murojaah", `${r.muroHal} hal`, `${r.muro} kali setor`, null, "biru"],
  ["Tasmi' lulus", `${r.tasmi} juz`, r.tasmiUji ? `${r.tasmiUji} kali ujian` : "belum ada ujian", null, "emas"],
  ["Manzil", `${r.manzil}×`, "setoran pekanan", null, "ungu"],
  kin ? ["Absen guru", `${kin.isi}/${kin.sesi}`, "sesi terisi", kin.pct, nada(kin.pct)] : null];
function SantriTahfidz({ d }) {
  const [urut, setUrut] = useState("ziyadah");
  const f = { ziyadah: o => -(o.x.zBaris + o.x.tahsin), hadir: o => -(o.x.kh.pct ?? -1), murojaah: o => -o.x.muroHal, nama: () => 0 }[urut];
  const rows = [...d].sort((a, b) => f(a) - f(b) || a.s.nama.localeCompare(b.s.nama));
  return html`<${Urut} opsi=${[["ziyadah", "Ziyadah"], ["hadir", "Kehadiran"], ["murojaah", "Murojaah"], ["nama", "Nama"]]} nilai=${urut} set=${setUrut} />
    ${rows.map(({ s, x, iq }, i) => html`<${BarisSantri} no=${i + 1} s=${s} ket=${`Kelas ${s.kelas} · ${L.namaHalaqah(s)}`}
      utama=${iq ? `Tahsin ${x.tahsin}×` : x.zBaris ? hal(x.zBaris) : "Belum ziyadah"} utamaNada=${iq ? "biru" : x.zBaris ? "hijau" : "mut"}
      tanda=${[...x.tasmiLulus.map(j => `Tasmi' Juz ${j} lulus`), x.kh.A ? `Alpa ${x.kh.A}×` : null].filter(Boolean)}
      kolom=${[["Hadir", P(x.kh.pct), nada(x.kh.pct)], iq ? ["Tahsin", `${x.tahsinHal} hal`] : ["Hari setor", `${x.zHari} hari`], ["Murojaah", `${x.muroHal} hal`], ["Manzil", x.manzil ? `${x.manzil}× · ${x.manzilNilai ?? "—"}` : "—"]]} />`)}`;
}
function tabelTahfidz(hqs, rg) {
  return { catatan: "Ziyadah = hafalan baru yang lulus (15 baris = 1 halaman, 20 halaman = 1 juz). Kehadiran = sesi hadir dibagi sesi halaqah aktif; sesi yang tidak diabsen dihitung 0.",
    bagian: [{ judul: "Per halaqah", kol: ["Halaqah", "Guru", "Santri", "Absen guru", "Kehadiran", "Ziyadah", "Murojaah (hal)", "Manzil", "Tasmi' lulus"],
      rows: hqs.map(h => { const d = dataTahfidz(L.santriHalaqah(h.id), rg), r = ringkasTahfidz(d), k = L.kinerjaHalaqah(h.id, rg); return [h.nama, (L.staffById(h.guru) || {}).nama || "—", d.length, `${k.isi}/${k.sesi}`, P(r.kh), hal(r.baris), r.muroHal, r.manzil, r.tasmi]; }) },
    ...hqs.map(h => ({ judul: `${h.nama} · per santri`, kol: ["Santri", "Kelas", "H", "S", "I", "A", "Kehadiran", "Ziyadah", "Hari setor", "Murojaah (hal)", "Manzil", "Tasmi' lulus", "Tahsin"],
      rows: dataTahfidz(L.santriHalaqah(h.id), rg).map(({ s, x, iq }) => [s.nama, s.kelas, x.kh.H, x.kh.S, x.kh.I, x.kh.A, P(x.kh.pct), hal(x.zBaris), x.zHari, x.muroHal, x.manzil, x.tasmiLulus.length ? "Juz " + x.tasmiLulus.join(", ") : "—", iq ? `${x.tahsin}× (${x.tahsinHal} hal)` : "—"]) }))] };
}
export function RekapTahfidz({ hid }) {
  useApp();
  const lk = lingkup(), hqs = hid ? [L.halaqahById(hid)] : lk.hqs, p = usePeriode("pekanan", null, "halaqah");
  if (!hqs.length || !hqs[0]) return kosong("Rekap Tahfidz", "Akun ini belum memegang halaqah.");
  const satu = hqs.length === 1, semua = hqs.flatMap(h => L.santriHalaqah(h.id)), d = dataTahfidz(semua, p.rg), r = ringkasTahfidz(d);
  const kin = satu ? L.kinerjaHalaqah(hqs[0].id, p.rg) : null;
  return html`<${SubHeader} title=${satu ? "Rekap " + hqs[0].nama : "Rekap Tahfidz"} sub=${satu ? `${(L.staffById(hqs[0].guru) || {}).pendek || ""} · ${semua.length} santri` : `${hqs.length} halaqah · ${semua.length} santri`} />
    <div class="wrap">${p.bar}
      <div class="rx-hero"><${Metrik} items=${itemTahfidz(r, semua.length, kin)} /></div>
      ${satu ? html`<${Bagian} t="Per santri" /><${SantriTahfidz} d=${d} />`
        : html`<${Bagian} t="Per halaqah" />${hqs.map(h => { const dd = dataTahfidz(L.santriHalaqah(h.id), p.rg), rr = ringkasTahfidz(dd), k = L.kinerjaHalaqah(h.id, p.rg);
          return html`<${Grup} judul=${h.nama} sub=${`${(L.staffById(h.guru) || {}).pendek || "—"} · ${dd.length} santri · absen ${k.isi}/${k.sesi} sesi`} onClick=${() => nav.go("rekapTahfidz", { hid: h.id })}
            items=${[["Hadir", P(rr.kh), null, rr.kh, nada(rr.kh)], ["Ziyadah", hal(rr.baris), `${rr.zSantri} santri`, null, "hijau"], ["Murojaah", `${rr.muroHal} hal`, null, null, "biru"], ["Tasmi'", `${rr.tasmi} juz`, null, null, "emas"]]} />`; })}`}
      <${Hint}>Ziyadah = hafalan baru yang lulus. 15 baris = 1 halaman, 20 halaman = 1 juz. Kehadiran = sesi hadir dibagi sesi halaqah aktif; sesi yang belum diabsen dihitung 0.</${Hint}>
      <${Unduhan} judul=${satu ? "Rekap " + hqs[0].nama : "Rekap Tahfidz"} rg=${p.rg} tabel=${() => tabelTahfidz(hqs, p.rg)} ttd="tahfidz" /></div>`;
}

// ================= MAPEL / KURIKULUM =================
const pengampu = (mp, k) => (L.jadwalAll().find(j => j.mapel === mp && j.kelas === k) || {}).guru || ((L.pengampu(mp, k) || {}).id);
const namaMapel = mp => L.mapelById(mp).nama;
function dataKelas(mp, k, rg) {
  const g = pengampu(mp, k), kj = L.kinerjaMapel(g, rg, k), pj = L.projekDalam(mp, k, rg), list = L.santriKelas(k);
  const d = list.map(s => { const kh = L.kehadiranKelas(s.id, mp, rg), nil = pj.map(p => p.nilai[s.id]).filter(v => v !== "" && v != null).map(Number); return { s, kh, pj: nil.length ? Math.round(nil.reduce((a, b) => a + b, 0) / nil.length) : null }; });
  return { g, kj, pj, d, kh: rata(d.map(o => o.kh.pct)) };
}
export function RekapMapel({ mapel, kelas, modul }) {
  useApp();
  const lk = lingkup(), p = usePeriode("pekanan", null, "kbm");
  const pairs = mapel && kelas ? [[mapel, kelas]] : modul === "mapel" && (lk.m.ajar || []).length ? lk.m.ajar.map(x => [...x]) : lk.pairs, mps = [...new Set(pairs.map(([mp]) => mp))];
  const milik = (lk.m.ajar || []).map(([mp]) => mp).find(x => mps.includes(x)); const [f, setF] = useState(milik || mps[0]), [urut, setUrut] = useState("hadir");
  if (!pairs.length) return kosong("Rekap Mapel", "Akun ini belum mengajar mapel.");
  if (pairs.length === 1) {
    const [mp, k] = pairs[0], x = dataKelas(mp, k, p.rg);
    const rows = [...x.d].sort((a, b) => (urut === "hadir" ? (a.kh.pct ?? -1) - (b.kh.pct ?? -1) : urut === "projek" ? (b.pj ?? -1) - (a.pj ?? -1) : 0) || a.s.nama.localeCompare(b.s.nama));
    return html`<${SubHeader} title=${`${namaMapel(mp)} · Kelas ${k}`} sub=${`${(L.staffById(x.g) || {}).pendek || "—"} · ${x.d.length} santri`} />
      <div class="wrap">${p.bar}
        <div class="rx-hero"><${Metrik} items=${[["Pertemuan terlaksana", `${x.kj.absen}/${x.kj.sesi}`, "sudah diabsen guru", x.kj.pct, nada(x.kj.pct)], ["Jurnal diisi", `${x.kj.jurnal}/${x.kj.sesi}`, "materi tercatat", x.kj.pctJ, nada(x.kj.pctJ)],
          ["Kehadiran santri", P(x.kh), "rata-rata kelas", x.kh, nada(x.kh)], ["Projek", `${x.pj.length}`, "dalam periode ini", null, "ungu"]]} /></div>
        ${x.pj.length ? html`<${Bagian} t="Projek" /><div class="rx-list">${x.pj.map(pj => html`<div class="rx-pj"><div><b>${pj.nama}</b><small>${L.fmtTgl(pj.tgl)} · ${pj.dinilai}/${x.d.length} dinilai</small></div><span class=${"rx-pill " + (pj.rata == null ? "mut" : pj.rata < 70 ? "merah" : "hijau")}>${pj.rata ?? "—"}</span></div>`)}</div>` : null}
        <${Bagian} t="Per santri" /><${Urut} opsi=${[["hadir", "Kehadiran terendah"], ["projek", "Nilai projek"], ["nama", "Nama"]]} nilai=${urut} set=${setUrut} />
        ${rows.map((o, i) => html`<${BarisSantri} no=${i + 1} s=${o.s} ket=${`Hadir ${o.kh.H || 0} dari ${o.kh.sesi || 0} pertemuan`} utama=${P(o.kh.pct)} utamaNada=${nada(o.kh.pct)}
          kolom=${[["Sakit", o.kh.S || 0], ["Izin", o.kh.I || 0], ["Alpa", o.kh.A || 0, o.kh.A ? "merah" : ""], ["Projek", o.pj ?? "—"]]} />`)}
        <${Hint}>Kehadiran = hadir dibagi pertemuan terjadwal pada hari KBM aktif. Pertemuan yang belum diabsen dihitung tidak hadir.</${Hint}>
        <${Unduhan} judul=${`Rekap ${namaMapel(mp)} Kelas ${k}`} rg=${p.rg} tabel=${() => tabelMapel([[mp, k]], p.rg)} ttd="mapel" /></div>`;
  }
  const tampil = mps.length > 1 ? pairs.filter(([mp]) => mp === f) : pairs;
  const semua = pairs.map(([mp, k]) => dataKelas(mp, k, p.rg)), terl = jml(semua, x => x.kj.absen), ses = jml(semua, x => x.kj.sesi), jur = jml(semua, x => x.kj.jurnal);
  return html`<${SubHeader} title=${modul === "kurikulum" ? "Rekap KBM" : "Rekap Mapel"} sub=${`${pairs.length} kelas · ${mps.length} mapel`} />
    <div class="wrap">${p.bar}
      <div class="rx-hero"><${Metrik} items=${[["Pertemuan terlaksana", `${terl}/${ses}`, "seluruh kelas", ses ? Math.round((terl / ses) * 100) : null, nada(ses ? Math.round((terl / ses) * 100) : null)], ["Jurnal diisi", `${jur}/${ses}`, "materi tercatat", ses ? Math.round((jur / ses) * 100) : null, nada(ses ? Math.round((jur / ses) * 100) : null)],
        ["Kehadiran santri", P(rata(semua.map(x => x.kh))), "rata-rata", rata(semua.map(x => x.kh)), nada(rata(semua.map(x => x.kh)))]]} /></div>
      ${mps.length > 1 ? html`<div class="seg small mb8 rx-mapel">${mps.map(mp => html`<button type="button" class=${mp === f ? "on" : ""} onClick=${() => setF(mp)}>${namaMapel(mp).replace("Pendidikan ", "").replace("Bahasa ", "B. ")}</button>`)}</div>` : null}
      <${Bagian} t="Per kelas" />
      ${tampil.map(([mp, k]) => { const x = dataKelas(mp, k, p.rg);
        return html`<${Grup} judul=${`${namaMapel(mp)} · Kelas ${k}`} sub=${`${(L.staffById(x.g) || {}).pendek || "—"} · ${x.d.length} santri`} onClick=${() => nav.go("rekapMapel", { mapel: mp, kelas: k })}
          items=${[["Terlaksana", `${x.kj.absen}/${x.kj.sesi}`, null, x.kj.pct, nada(x.kj.pct)], ["Jurnal", `${x.kj.jurnal}/${x.kj.sesi}`, null, x.kj.pctJ, nada(x.kj.pctJ)], ["Hadir santri", P(x.kh), null, x.kh, nada(x.kh)], ["Projek", String(x.pj.length), null, null, "ungu"]]} />`; })}
      <${Unduhan} judul=${modul === "kurikulum" ? "Rekap KBM" : "Rekap Mapel"} rg=${p.rg} tabel=${() => tabelMapel(pairs, p.rg)} ttd="mapel" /></div>`;
}
function tabelMapel(pairs, rg) {
  return { catatan: "Kehadiran = hadir dibagi pertemuan terjadwal pada hari KBM aktif. Pertemuan yang belum diabsen dihitung tidak hadir.",
    bagian: [{ judul: "Per kelas", kol: ["Mapel", "Kelas", "Guru", "Terlaksana", "Jurnal diisi", "Kehadiran santri", "Projek"], rows: pairs.map(([mp, k]) => { const x = dataKelas(mp, k, rg); return [namaMapel(mp), k, (L.staffById(x.g) || {}).nama || "—", `${x.kj.absen}/${x.kj.sesi}`, `${x.kj.jurnal}/${x.kj.sesi}`, P(x.kh), x.pj.length]; }) },
      ...pairs.map(([mp, k]) => ({ judul: `${namaMapel(mp)} Kelas ${k} · per santri`, kol: ["Santri", "Hadir", "Sakit", "Izin", "Alpa", "Pertemuan", "Kehadiran", "Rata projek"],
        rows: dataKelas(mp, k, rg).d.map(o => [o.s.nama, o.kh.H || 0, o.kh.S || 0, o.kh.I || 0, o.kh.A || 0, o.kh.sesi || 0, P(o.kh.pct), o.pj ?? "—"]) }))] };
}

// ================= ASRAMA (MOTD & mutaba'ah) =================
const dataAsrama = (list, rg) => list.map(s => { const sh = L.shalatDalam(s.id, rg), m = L.mutPersen(s.id, rg); return { s, sh, m, mut: m.ibadah == null ? null : Math.round((m.ibadah + m.adab) / 2) }; });
function itemAsrama(d, motd, mut) {
  const sh = rata(d.map(o => o.sh.pct)), ib = rata(d.map(o => o.m.ibadah)), ad = rata(d.map(o => o.m.adab));
  return [["Shalat berjamaah", P(sh), `alpa ${jml(d, o => o.sh.A)} · masbuq ${jml(d, o => o.sh.M)}`, sh, nada(sh)], ["Ibadah", P(ib), "mutaba'ah", ib, nada(ib)], ["Adab", P(ad), "mutaba'ah", ad, nada(ad)],
    motd ? ["Absen MOTD", `${motd.isi}/${motd.slot}`, "waktu terisi", motd.pct, nada(motd.pct)] : null, mut ? ["Mutaba'ah diisi", `${mut.isi}/${mut.target}`, mut.menyusul ? `${mut.menyusul} menyusul` : "santri × hari", mut.pct, nada(mut.pct)] : null];
}
export function RekapAsrama({ aid }) {
  useApp();
  const lk = lingkup(), asr = aid ? [L.asramaById(aid)] : lk.asr, p = usePeriode("pekanan", null, "asrama"), [urut, setUrut] = useState("shalat");
  if (!asr.length || !asr[0]) return kosong("Rekap Asrama", "Akun ini belum memegang asrama.");
  const satu = asr.length === 1, semua = asr.flatMap(a => L.santriAsrama(a.id)), d = dataAsrama(semua, p.rg);
  const motd = satu ? L.kinerjaMotd(asr[0].id, p.rg) : null, mut = satu ? L.kinerjaMut(asr[0].id, p.rg) : null;
  const f = { shalat: o => o.sh.pct ?? 101, mut: o => o.mut ?? 101, nama: () => 0 }[urut], rows = [...d].sort((a, b) => f(a) - f(b) || a.s.nama.localeCompare(b.s.nama));
  return html`<${SubHeader} title=${satu ? "Rekap Asrama " + asr[0].nama : "Rekap Asrama"} sub=${satu ? `${(L.staffById(asr[0].musyrif) || {}).pendek || ""} · ${semua.length} santri` : `${asr.length} asrama · ${semua.length} santri`} />
    <div class="wrap">${p.bar}
      <div class="rx-hero"><${Metrik} items=${itemAsrama(d, motd, mut)} /></div>
      ${satu ? html`<${Bagian} t="Per santri" /><${Urut} opsi=${[["shalat", "Shalat terendah"], ["mut", "Mutaba'ah terendah"], ["nama", "Nama"]]} nilai=${urut} set=${setUrut} />
        ${rows.map((o, i) => html`<${BarisSantri} no=${i + 1} s=${o.s} ket=${`Kelas ${o.s.kelas}${L.sedangIzin(o.s.id) ? " · sedang izin" : ""}`} utama=${P(o.sh.pct)} utamaNada=${nada(o.sh.pct)}
          kolom=${[["Alpa", o.sh.A, o.sh.A ? "merah" : ""], ["Masbuq", o.sh.M, o.sh.M ? "emas" : ""], ["Ibadah", P(o.m.ibadah), nada(o.m.ibadah)], ["Adab", P(o.m.adab), nada(o.m.adab)]]} />`)}`
        : html`<${Bagian} t="Per asrama" />${asr.map(a => { const dd = dataAsrama(L.santriAsrama(a.id), p.rg), km = L.kinerjaMotd(a.id, p.rg), ku = L.kinerjaMut(a.id, p.rg), sh = rata(dd.map(o => o.sh.pct));
          return html`<${Grup} judul=${"Asrama " + a.nama} sub=${`${(L.staffById(a.musyrif) || {}).pendek || "—"} · Pondok ${a.pondok} · ${dd.length} santri`} onClick=${() => nav.go("rekapAsrama", { aid: a.id })}
            items=${[["Shalat", P(sh), null, sh, nada(sh)], ["Ibadah", P(rata(dd.map(o => o.m.ibadah))), null, rata(dd.map(o => o.m.ibadah)), nada(rata(dd.map(o => o.m.ibadah)))], ["Absen MOTD", P(km.pct), null, km.pct, nada(km.pct)], ["Mutaba'ah diisi", P(ku.pct), null, ku.pct, nada(ku.pct)]]} />`; })}`}
      <${Hint}>Shalat berjamaah dihitung dari waktu yang sudah diabsen MOTD (masbuq tetap dihitung hadir). Mutaba'ah dihitung Senin–Jumat; hari yang terlewat bisa diisi menyusul paling lambat 7 hari.</${Hint}>
      <${Unduhan} judul=${satu ? "Rekap Asrama " + asr[0].nama : "Rekap Asrama"} rg=${p.rg} ttd="asrama" tabel=${() => ({ catatan: "Shalat berjamaah dihitung dari waktu yang sudah diabsen MOTD (masbuq dihitung hadir). Mutaba'ah dihitung pada hari Senin–Jumat.",
        bagian: [{ judul: "Per asrama", kol: ["Asrama", "Wali asrama", "Santri", "Absen MOTD", "Shalat berjamaah", "Mutaba'ah diisi", "Ibadah", "Adab"], rows: asr.map(a => { const dd = dataAsrama(L.santriAsrama(a.id), p.rg), km = L.kinerjaMotd(a.id, p.rg), ku = L.kinerjaMut(a.id, p.rg);
          return [a.nama, (L.staffById(a.musyrif) || {}).nama || "—", dd.length, `${km.isi}/${km.slot}`, P(rata(dd.map(o => o.sh.pct))), `${ku.isi}/${ku.target}`, P(rata(dd.map(o => o.m.ibadah))), P(rata(dd.map(o => o.m.adab)))]; }) },
          ...asr.map(a => ({ judul: `Asrama ${a.nama} · per santri`, kol: ["Santri", "Kelas", "Shalat hadir", "Alpa", "Masbuq", "Sakit/Izin", "Ibadah", "Adab", "Hari mutaba'ah"],
            rows: dataAsrama(L.santriAsrama(a.id), p.rg).map(o => [o.s.nama, o.s.kelas, P(o.sh.pct), o.sh.A, o.sh.M, o.sh.S + o.sh.I, P(o.m.ibadah), P(o.m.adab), `${o.m.isi}/${o.m.hari}`]) }))] })} /></div>`;
}

// ================= KESANTRIAN (izin & pelanggaran) =================
const dataKes = (list, rg) => list.map(s => { const pl = L.pelanggaranDalam(s.id, rg), iz = L.izinDalam(s.id, rg); return { s, pl, iz, poin: pl.poinRingan + pl.poinSB }; });
function itemKes(d) {
  return [["Izin keluar", `${jml(d, o => o.iz.n)}`, `${d.filter(o => o.iz.n).length} santri`, null, "biru"], ["Terlambat kembali", `${jml(d, o => o.iz.telat)}`, "dari izin", null, jml(d, o => o.iz.telat) ? "merah" : "hijau"],
    ["Pelanggaran ringan", `${jml(d, o => o.pl.ringan)}`, `alpa ${jml(d, o => o.pl.alpa)} · masbuq ${jml(d, o => o.pl.masbuq)}`, null, "emas"], ["Sedang / berat", `${jml(d, o => o.pl.sedang)} / ${jml(d, o => o.pl.berat)}`, "dari BAP", null, "merah"],
    ["Total poin", `${jml(d, o => o.poin)}`, `${d.filter(o => o.poin).length} santri`, null, "merah"]];
}
export function RekapKesantrian({ pondok, aid }) {
  useApp();
  const lk = lingkup(), p = usePeriode("bulanan", null, "asrama"), [semuaSantri, setSemua] = useState(false);
  const asr = aid ? [L.asramaById(aid)] : lk.pondok.length ? L.ASRAMA.filter(a => (pondok ? a.pondok === pondok : lk.pondok.includes(a.pondok))) : lk.asr;
  if (!asr.length || !asr[0]) return kosong("Rekap Kesantrian", "Tidak ada data kesantrian untuk akun ini.");
  const satu = asr.length === 1, d = dataKes(asr.flatMap(a => L.santriAsrama(a.id)), p.rg);
  const ada = d.filter(o => o.poin || o.iz.n).sort((a, b) => b.poin - a.poin || b.iz.n - a.iz.n), tampil = semuaSantri ? [...d].sort((a, b) => b.poin - a.poin || a.s.nama.localeCompare(b.s.nama)) : ada;
  const judul = satu ? "Kesantrian · Asrama " + asr[0].nama : pondok ? "Rekap Kesantrian · Pondok " + pondok : "Rekap Kesantrian";
  return html`<${SubHeader} title=${judul} sub=${`Izin & pelanggaran · ${d.length} santri`} />
    <div class="wrap">${p.bar}
      <div class="rx-hero"><${Metrik} items=${itemKes(d)} /></div>
      ${!satu ? html`<${Bagian} t="Per asrama" />${asr.map(a => { const dd = dataKes(L.santriAsrama(a.id), p.rg);
        return html`<${Grup} judul=${"Asrama " + a.nama} sub=${`${(L.staffById(a.musyrif) || {}).pendek || "—"} · Pondok ${a.pondok} · ${dd.length} santri`} onClick=${() => nav.go("rekapKesantrian", { aid: a.id })}
          items=${[["Izin", String(jml(dd, o => o.iz.n)), null, null, "biru"], ["Ringan", String(jml(dd, o => o.pl.ringan)), null, null, "emas"], ["Sedang/berat", String(jml(dd, o => o.pl.sedang + o.pl.berat)), null, null, "merah"], ["Poin", String(jml(dd, o => o.poin)), null, null, "merah"]]} />`; })}` : null}
      <${Bagian} t=${semuaSantri ? "Semua santri" : "Santri yang tercatat"} right=${html`<button type="button" class="link" onClick=${() => setSemua(!semuaSantri)}>${semuaSantri ? "Hanya yang tercatat" : "Tampilkan semua"}</button>`} />
      ${tampil.length ? tampil.map((o, i) => html`<${BarisSantri} no=${i + 1} s=${o.s} ket=${`Kelas ${o.s.kelas} · ${L.asramaAman(o.s.asrama).nama}`} utama=${`${o.poin} poin`} utamaNada=${o.poin ? "merah" : "hijau"}
          tanda=${o.pl.bap.map(b => b.pelanggaranNama)}
          kolom=${[["Izin", o.iz.n + (o.iz.telat ? ` (${o.iz.telat} telat)` : ""), o.iz.telat ? "merah" : ""], ["Ringan", o.pl.ringan, o.pl.ringan ? "emas" : ""], ["Sedang", o.pl.sedang, o.pl.sedang ? "merah" : ""], ["Berat", o.pl.berat, o.pl.berat ? "merah" : ""]]} />`)
        : html`<${Card}><${Empty} t="Alhamdulillah, tidak ada izin maupun pelanggaran pada periode ini." icon="check" /></${Card}>`}
      <${Hint}>Pelanggaran ringan berasal dari MOTD (alpa/masbuq) dan sifatnya teguran. Sedang dan berat berasal dari BAP Kesantrian.</${Hint}>
      <${Unduhan} judul=${judul} rg=${p.rg} ttd="kesantrian" tabel=${() => ({ catatan: "Pelanggaran ringan dari MOTD (alpa/masbuq). Sedang dan berat dari BAP Kesantrian.",
        bagian: [{ judul: "Per asrama", kol: ["Asrama", "Pondok", "Santri", "Izin", "Terlambat", "Ringan", "Sedang", "Berat", "Total poin"], rows: asr.map(a => { const dd = dataKes(L.santriAsrama(a.id), p.rg);
          return [a.nama, a.pondok, dd.length, jml(dd, o => o.iz.n), jml(dd, o => o.iz.telat), jml(dd, o => o.pl.ringan), jml(dd, o => o.pl.sedang), jml(dd, o => o.pl.berat), jml(dd, o => o.poin)]; }) },
          { judul: "Santri yang tercatat", kol: ["Santri", "Kelas", "Asrama", "Izin", "Terlambat", "Alpa", "Masbuq", "Sedang", "Berat", "Poin", "Pelanggaran BAP"],
            rows: ada.map(o => [o.s.nama, o.s.kelas, L.asramaAman(o.s.asrama).nama, o.iz.n, o.iz.telat, o.pl.alpa, o.pl.masbuq, o.pl.sedang, o.pl.berat, o.poin, o.pl.bap.map(b => b.pelanggaranNama).join("; ") || "—"]) }] })} /></div>`;
}

// Pintu masuk lama nav.go("rekap", { modul }) → rekap modul yang sesuai
export function RekapPintu({ modul, tab }) {
  const m = modul || { tahfidz: "tahfidz", halaqah: "tahfidz", mapel: "mapel", kbm: "kurikulum", mut: "asrama", motd: "asrama", pelanggaran: "kesantrian" }[tab] || "tahfidz";
  if (m === "tahfidz") return html`<${RekapTahfidz} />`;
  if (m === "mapel" || m === "kurikulum") return html`<${RekapMapel} modul=${m} />`;
  if (m === "asrama") return html`<${RekapAsrama} />`;
  return html`<${RekapKesantrian} />`;
}
export function RekapDetailPintu({ jenis, hid, aid, mapel, kelas, pondok }) {
  if (jenis === "tahfidz" || jenis === "halaqah") return html`<${RekapTahfidz} hid=${hid} />`;
  if (jenis === "mapel") return html`<${RekapMapel} mapel=${mapel} kelas=${kelas} />`;
  if (jenis === "mut" || jenis === "motd") return html`<${RekapAsrama} aid=${aid} />`;
  return html`<${RekapKesantrian} aid=${aid} pondok=${pondok} />`;
}
