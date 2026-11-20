// Rekap berbasis hari aktif (harian, pekanan, bulanan, mid, semester, tahunan) + kalender akademik
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Card, SubHeader, Row, Pill, Btn, Empty, Seg, Section, Sheet, Field, Confirm, Bar, Hint, Stat } from "./ui.js";
import { all, get, put, del, toast, uid } from "./store.js";
import { DATA } from "./data.js";
import { LIBUR_NASIONAL } from "./libur.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { logUbah } from "./s_koreksi.js";
import { unduh, docHtml, esc } from "./s_system.js";
import { KartuAI } from "./s_ai.js";
import { tanyaAI, SISTEM_DASAR } from "./ai.js";

const tone = v => (v == null ? "muted" : v >= 90 ? "green" : v >= 75 ? "blue" : v >= 60 ? "gold" : "red");
const P = v => (v == null ? "—" : v + "%");

export function usePeriode(def = "pekanan", izin = null) {
  const [jenis0, setJenis] = useState(def); const [ref, setRef] = useState(L.today());
  const opsi = L.PERIODE.filter(([k]) => !izin || izin.includes(k)), jenis = opsi.some(([k]) => k === jenis0) ? jenis0 : opsi[0][0];
  const rg = L.periodeRange(jenis, ref), geser = ["harian", "pekanan", "bulanan"].includes(jenis);
  const ha = L.hariAktifDalam(rg, "halaqah").length, hk = L.hariAktifDalam(rg, "kbm").length, hs = L.hariAktifDalam(rg, "asrama").length, rh = L.rentangHitung(rg);
  const bar = html`<div class="periode">
    <div class="seg small">${opsi.map(([k, t]) => html`<button type="button" class=${k === jenis ? "on" : ""} onClick=${() => { setJenis(k); setRef(L.today()); }}>${t}</button>`)}</div>
    <div class="per-nav">${geser ? html`<button class="icon-btn" aria-label="Sebelumnya" onClick=${() => setRef(L.geserPeriode(jenis, ref, -1))}><${Icon} n="left" s=${20} /></button>` : null}
      <div class="per-t"><b>${rg.label}</b><small>${rh.kosong ? "Belum ada hari yang dihitung" : `Dihitung ${L.fmtShort(rh.dari)} – ${L.fmtShort(rh.sampai)} · aktif: halaqah ${ha}, KBM ${hk}, asrama ${hs} hari`}</small></div>
      ${geser ? html`<button class="icon-btn" aria-label="Berikutnya" disabled=${rg.sampai >= L.today()} onClick=${() => setRef(L.geserPeriode(jenis, ref, 1))}><${Icon} n="right" s=${20} /></button>` : null}</div></div>`;
  return { jenis, rg, bar };
}

// Kewenangan rekap per peran
function lingkup() {
  const m = me(), r = m.roles, a = L.asramaOf(m.id), hq = L.halaqahOf(m.id), mudir = r.includes("mudir");
  const urut = (arr, mine) => (mine ? [mine, ...arr.filter(x => x.id !== mine.id)] : arr);
  const hqs = mudir || r.includes("wadir_tahfidz") ? urut(L.HALAQAH, hq) : r.includes("guru_tahfidz") && hq ? [hq] : [];
  const asr = mudir ? urut(L.ASRAMA, a) : r.includes("wadir_kesantrian") ? urut(L.ASRAMA.filter(x => x.pondok === m.pondok), a) : r.includes("musyrif") && a ? [a] : [];
  const semuaKls = mudir || r.includes("wadir_kurikulum");
  const kls = semuaKls ? ["7", "8", "9A", "9B"] : r.includes("guru_mapel") ? [...new Set(m.ajar.map(([, k]) => k))] : [];
  const pondok = mudir ? ["29", "21"] : r.includes("wadir_kesantrian") ? [m.pondok] : [];
  const tabs = [];
  if (hqs.length) tabs.push(["halaqah", "Halaqah"], ["hafalan", "Hafalan"]);
  if (asr.length) tabs.push(["motd", "MOTD"], ["mut", "Mutaba'ah"]);
  if (kls.length) tabs.push(["kbm", "KBM"]);
  if (pondok.length) tabs.push(["kes", "Kesantrian"]);
  return { m, asr, hqs, kls, pondok, tabs, semuaKls };
}
const PER_HAFALAN = ["bulanan", "mid", "semester", "tahunan"];
const santriPondok = p => L.santriList().filter(s => L.pondokOfSantri(s) === p);

// Tabel rekap (dipakai untuk unduhan & detail): ringkas per kelompok + rinci per santri
function tabel(tab, lk, rg) {
  const rata = xs => { const v = xs.filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const P2 = v => (v == null ? "—" : v + "%");
  if (tab === "halaqah") return { judul: "Rekap Halaqah", ringkas: { kol: ["Halaqah", "Guru", "Santri", "Sesi aktif", "Absen terisi", "Kehadiran santri"], rows: lk.hqs.map(h => { const k = L.kinerjaHalaqah(h.id, rg), l = L.santriHalaqah(h.id);
      return [h.nama, (L.staffById(h.guru) || {}).nama || "—", l.length, k.sesi, P2(k.pct), P2(rata(l.map(s => L.kehadiranHalaqah(s.id, rg).pct)))]; }) },
    rinci: { kol: ["Santri", "Halaqah", "Asrama", "H", "S", "I", "A", "Belum diabsen", "Kehadiran"], rows: lk.hqs.flatMap(h => L.santriHalaqah(h.id).map(s => { const k = L.kehadiranHalaqah(s.id, rg); return [s.nama, h.nama, L.asramaById(s.asrama).nama, k.H, k.S, k.I, k.A, k.kosong, P2(k.pct)]; })) } };
  if (tab === "hafalan") return { judul: "Perkembangan Hafalan", ringkas: { kol: ["Halaqah", "Santri", "Hafalan baru (total)", "Rata per santri", "Tasmi' lulus", "Santri setor"], rows: lk.hqs.map(h => { const l = L.santriHalaqah(h.id), xs = l.map(s => L.hafalanDalam(s.id, rg)), tot = xs.reduce((n, x) => n + x.baris, 0);
      return [h.nama, l.length, L.fmtBaris(tot), L.fmtBaris(l.length ? Math.round(tot / l.length) : 0), xs.reduce((n, x) => n + x.tasmi.length, 0), `${xs.filter(x => x.setor).length}/${l.length}`]; }) },
    rinci: { kol: ["Santri", "Halaqah", "Hafalan baru", "Baris", "Hari setor", "Tasmi' lulus", "Total hafalan", "Capaian semester"], rows: lk.hqs.flatMap(h => L.santriHalaqah(h.id).map(s => { const x = L.hafalanDalam(s.id, rg), c = L.capaianJuz(s);
      return [s.nama, h.nama, L.fmtBaris(x.baris), x.baris, x.hari, x.tasmi.length ? "Juz " + x.tasmi.join(", ") : "—", L.fmtJumlah(L.hafalan(s)), `${c.juz.toLocaleString("id-ID")}/${c.target} juz`]; })) } };
  if (tab === "motd") return { judul: "Rekap MOTD", ringkas: { kol: ["Asrama", "Wali asrama", "Waktu terabsen", "Alpa", "Masbuq"], rows: lk.asr.map(a => { const k = L.kinerjaMotd(a.id, rg); return [a.nama, (L.staffById(a.musyrif) || {}).nama, `${k.isi}/${k.slot} (${P2(k.pct)})`, k.al, k.mb]; }) },
    rinci: { kol: ["Santri", "Asrama", "Alpa", "Masbuq", "Poin"], rows: lk.asr.flatMap(a => L.santriAsrama(a.id).map(s => { let al = 0, mb = 0, po = 0; L.hariAktifDalam(rg, "asrama").forEach(t => L.WAKTU.forEach(([w]) => { const d = get("motd", L.motdKey(a.id, t, w)), v = d && d.status[s.id]; if (v === "A") al++; if (v === "M") mb++; if (v) po += L.poinMotd(w, v); })); return [s.nama, a.nama, al, mb, po]; })) } };
  if (tab === "mut") return { judul: "Rekap Mutaba'ah", ringkas: { kol: ["Asrama", "Wali asrama", "Input terisi", "Ibadah", "Adab"], rows: lk.asr.map(a => { const k = L.kinerjaMut(a.id, rg), ps = L.santriAsrama(a.id).map(s => L.mutPersen(s.id, rg)); return [a.nama, (L.staffById(a.musyrif) || {}).nama, `${k.isi}/${k.target} (${P2(k.pct)})`, P2(rata(ps.map(x => x.ibadah))), P2(rata(ps.map(x => x.adab)))]; }) },
    rinci: { kol: ["Santri", "Asrama", "Hari aktif", "Hari diinput", "Ibadah", "Adab"], rows: lk.asr.flatMap(a => L.santriAsrama(a.id).map(s => { const k = L.mutPersen(s.id, rg); return [s.nama, a.nama, k.hari, k.isi, P2(k.ibadah), P2(k.adab)]; })) } };
  if (tab === "kbm") { const guru = lk.semuaKls ? L.STAFF.filter(x => x.roles.includes("guru_mapel")) : [lk.m];
    return { judul: "Rekap KBM", ringkas: { kol: ["Guru", "Pertemuan terjadwal", "Terlaksana", "Jurnal", "Izin guru"], rows: guru.map(g => { const k = L.kinerjaMapel(g.id, rg), rh = L.rentangHitung(rg), iz = rh.kosong ? 0 : all("izinGuru").filter(i => i.guru === g.id && i.tanggal >= rh.dari && i.tanggal <= rh.sampai).length; return [g.nama, k.sesi, `${k.absen} (${P2(k.pct)})`, `${k.jurnal} (${P2(k.pctJ)})`, iz]; }) },
      rinci: { kol: ["Santri", "Kelas", "Hadir", "Pertemuan", "Belum diabsen", "Kehadiran"], rows: lk.kls.flatMap(k => L.santriKelas(k).map(s => { const ks = lk.semuaKls ? [L.kehadiranKelas(s.id, null, rg)] : [...new Set(lk.m.ajar.filter(([, kk]) => kk === k).map(([mm]) => mm))].map(mm => L.kehadiranKelas(s.id, mm, rg)); const H = ks.reduce((n, x) => n + x.H, 0), se = ks.reduce((n, x) => n + x.sesi, 0), ko = ks.reduce((n, x) => n + x.kosong, 0); return [s.nama, k, H, se, ko, P2(se ? Math.round((H / se) * 100) : null)]; })) } }; }
  return { judul: "Rekap Kesantrian", ringkas: { kol: ["Pondok", "Santri", "Izin", "Terlambat kembali", "BAP", "Poin BAP", "Poin MOTD"], rows: lk.pondok.map(p => { const xs = santriPondok(p).map(s => L.kesantrianDalam(s.id, rg)), sum = f => xs.reduce((n, x) => n + x[f], 0); return ["Pondok " + p, xs.length, sum("izin"), sum("telat"), sum("bap"), sum("poinBap"), sum("poinMotd")]; }) },
    rinci: { kol: ["Santri", "Pondok", "Asrama", "Izin", "Terlambat", "BAP", "Poin total"], rows: lk.pondok.flatMap(p => santriPondok(p).map(s => { const x = L.kesantrianDalam(s.id, rg); return [s.nama, p, L.asramaById(s.asrama).nama, x.izin, x.telat, x.bap, x.poinBap + x.poinMotd]; }).filter(r => r[3] || r[4] || r[5] || r[6])) } };
}

function unduhRekap(tab, lk, rg, fmt) {
  const t = tabel(tab, lk, rg), nama = `${t.judul} - ${rg.label}`.replace(/[\/:]/g, "-");
  if (fmt === "csv") {
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`, sec = (j, x) => [q(j), x.kol.map(q).join(";"), ...x.rows.map(r => r.map(q).join(";"))].join("\r\n");
    return unduh(nama + ".csv", "﻿" + [q(`${t.judul} · ${rg.label}`), "", sec("Ringkasan", t.ringkas), "", sec("Rincian per santri", t.rinci)].join("\r\n"));
  }
  const tb = x => `<table><tr>${x.kol.map(k => `<th>${esc(k)}</th>`).join("")}</tr>${x.rows.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</table>`;
  const rh = L.rentangHitung(rg);
  const body = `<h1>${esc(t.judul.toUpperCase())}<br><span class="small">${esc(rg.label)}${rh.kosong ? "" : ` · dihitung ${L.fmtTgl(rh.dari, false)} – ${L.fmtTgl(rh.sampai, false)}`}</span></h1>
    <p class="small">Persentase = yang tercatat dibagi hari/sesi aktif. Hari tanpa input dihitung 0. Ahad, libur nasional, dan libur pondok tidak dihitung. Dicetak oleh ${esc(me().nama)}, ${L.fmtTgl(L.today())}.</p>
    <h2>Ringkasan</h2>${tb(t.ringkas)}<h2>Rincian per santri</h2>${t.rinci.rows.length ? tb(t.rinci) : "<p>Tidak ada data.</p>"}`;
  return unduh(nama + ".html", docHtml(t.judul, body));
}

export function RekapHub({ tab: t0 }) {
  useApp();
  const lk = lingkup(); const [tab, setTab] = useState(lk.tabs.find(x => x[0] === t0) ? t0 : (lk.tabs[0] || [""])[0]); const [dl, setDl] = useState(false);
  const p = usePeriode("pekanan", tab === "hafalan" ? PER_HAFALAN : null);
  if (!lk.tabs.length) return html`<${SubHeader} title="Rekap" /><div class="wrap"><${Card}><${Empty} t="Tidak ada data rekap untuk peran ini." icon="chart" /></${Card}></div>`;
  return html`<${SubHeader} title="Rekap" sub="Sesuai kewenangan · berdasarkan hari aktif"><div class="seg rk-tabs">${lk.tabs.map(([k, t]) => html`<button type="button" class=${k === tab ? "on" : ""} onClick=${() => setTab(k)}>${t}</button>`)}</div></${SubHeader}>
    <div class="wrap">${p.bar}
      <div class="btn-row mb8"><${Btn} kind="ghost" icon="download" onClick=${() => setDl(true)}>Unduh rekap ini</${Btn}></div>
      ${tab === "halaqah" ? html`<${RekapHalaqahP} hqs=${lk.hqs} rg=${p.rg} />` : tab === "hafalan" ? html`<${RekapHafalanP} hqs=${lk.hqs} rg=${p.rg} />` : tab === "motd" ? html`<${RekapMotdP} asr=${lk.asr} rg=${p.rg} />`
        : tab === "mut" ? html`<${RekapMutP} asr=${lk.asr} rg=${p.rg} />` : tab === "kbm" ? html`<${RekapKbmP} lk=${lk} rg=${p.rg} />` : html`<${RekapKesP} lk=${lk} rg=${p.rg} />`}
      <${Hint}>${tab === "hafalan" ? "Hafalan baru = ziyadah lulus dalam periode (1 halaman = 15 baris, 1 juz = 20 halaman). Tersedia per bulan, mid, semester, dan tahun." : "Persentase = yang tercatat dibagi hari/sesi aktif pada periode. Hari yang tidak diinput dihitung 0. Ahad, libur nasional, dan libur pondok tidak dihitung."}</${Hint}></div>
    <${Sheet} open=${dl} title="Unduh rekap" onClose=${() => setDl(false)}>
      <p class="small" style="margin-top:0">${(lk.tabs.find(x => x[0] === tab) || [])[1]} · ${p.rg.label}. Berisi ringkasan dan rincian per santri.</p>
      <button class="menu-row" onClick=${() => { setDl(false); unduhRekap(tab, lk, p.rg, "html"); }}><${Icon} n="file" s=${22} c="#0B5D3B" /><span>Siap cetak / simpan PDF<br /><small class="small">Buka file lalu pilih Cetak</small></span><${Icon} n="right" s=${18} /></button>
      <button class="menu-row" onClick=${() => { setDl(false); unduhRekap(tab, lk, p.rg, "csv"); }}><${Icon} n="grid" s=${22} c="#1F56B5" /><span>Tabel Excel (CSV)<br /><small class="small">Bisa dibuka di Excel / Google Sheets</small></span><${Icon} n="right" s=${18} /></button></${Sheet}>`;
}

function Kartu({ title, sub, onClick, stats }) {
  return html`<button class="card rk" onClick=${onClick}><div class="card-h"><h3>${title}</h3><${Icon} n="right" s=${18} c="#9AB0A5" /></div>${sub ? html`<div class="small mb8">${sub}</div>` : null}
    <div class="rk-g">${stats.map(([lab, v, s, teks]) => html`<div><span>${lab}</span>${teks != null ? html`<b class="t-green" style="font-size:17px">${teks}</b>` : html`<b class=${"t-" + tone(v)}>${P(v)}</b><${Bar} v=${v || 0} tone=${tone(v) === "muted" ? "green" : tone(v)} />`}${s ? html`<small>${s}</small>` : null}</div>`)}</div></button>`;
}

function RekapHalaqahP({ hqs, rg }) {
  return html`${hqs.map(a => { const k = L.kinerjaHalaqah(a.id, rg), list = L.santriHalaqah(a.id), kh = list.map(s => L.kehadiranHalaqah(s.id, rg).pct).filter(x => x != null);
    const avg = kh.length ? Math.round(kh.reduce((x, y) => x + y, 0) / kh.length) : null;
    return html`<${Kartu} title=${a.nama} sub=${`${list.length} santri dari ${new Set(list.map(s => s.asrama)).size} asrama · ${k.sesi} sesi aktif`} onClick=${() => nav.go("rekapDetail", { jenis: "halaqah", hid: a.id, pj: rg })}
      stats=${[["Kehadiran santri", avg], ["Absen terisi (guru)", k.pct, `${k.isi}/${k.sesi} sesi`]]} />`; })}`;
}
function RekapHafalanP({ hqs, rg }) {
  return html`${hqs.map(a => { const list = L.santriHalaqah(a.id), xs = list.map(s => L.hafalanDalam(s.id, rg)), tot = xs.reduce((n, x) => n + x.baris, 0), ts = xs.reduce((n, x) => n + x.tasmi.length, 0);
    const cap = list.length ? Math.round(list.reduce((n, s) => n + L.capaianJuz(s).pct, 0) / list.length) : null;
    return html`<${Kartu} title=${a.nama} sub=${`${list.length} santri · ${xs.filter(x => x.setor).length} santri setor ziyadah · ${ts} tasmi' lulus`} onClick=${() => nav.go("rekapDetail", { jenis: "hafalan", hid: a.id, pj: rg })}
      stats=${[["Hafalan baru", null, tot >= 15 ? `${tot} baris` : null, L.fmtBaris(tot)], ["Rata per santri", null, null, L.fmtBaris(list.length ? Math.round(tot / list.length) : 0)], ["Capaian target semester", cap]]} />`; })}`;
}
function RekapMotdP({ asr, rg }) {
  return html`${asr.map(a => { const k = L.kinerjaMotd(a.id, rg);
    return html`<${Kartu} title=${a.nama} sub=${`Pondok ${a.pondok} · alpa ${k.al} · masbuq ${k.mb}`} onClick=${() => nav.go("rekapDetail", { jenis: "motd", aid: a.id, pj: rg })}
      stats=${[["Waktu terabsen", k.pct, `${k.isi}/${k.slot} waktu`], ["Kepatuhan santri", k.isi ? Math.max(0, Math.round(100 - ((k.al + k.mb) / Math.max(1, k.isi * L.santriAsrama(a.id).length)) * 100)) : null]]} />`; })}`;
}
function RekapMutP({ asr, rg }) {
  return html`${asr.map(a => { const k = L.kinerjaMut(a.id, rg), ps = L.santriAsrama(a.id).map(s => L.mutPersen(s.id, rg)).filter(x => x.ibadah != null);
    const av = f => (ps.length ? Math.round(ps.reduce((x, y) => x + y[f], 0) / ps.length) : null);
    return html`<${Kartu} title=${a.nama} sub=${`${(L.staffById(a.musyrif) || {}).pendek} · input ${k.isi}/${k.target}`} onClick=${() => nav.go("rekapDetail", { jenis: "mut", aid: a.id, pj: rg })}
      stats=${[["Ibadah", av("ibadah")], ["Adab", av("adab")], ["Input terisi", k.pct]]} />`; })}`;
}
function RekapKbmP({ lk, rg }) {
  const guru = lk.semuaKls ? L.STAFF.filter(s => s.roles.includes("guru_mapel")) : [lk.m];
  return html`<${Section} t="Kehadiran santri per kelas" />${lk.kls.map(k => { const ps = L.santriKelas(k).map(s => L.kehadiranKelas(s.id, null, rg).pct).filter(x => x != null);
      const avg = ps.length ? Math.round(ps.reduce((x, y) => x + y, 0) / ps.length) : null, kj = L.kinerjaMapel(lk.semuaKls ? null : lk.m.id, rg, k);
      return html`<${Kartu} title=${"Kelas " + k} sub=${`${L.santriKelas(k).length} santri · ${kj.sesi} pertemuan terjadwal`} onClick=${() => nav.go("rekapDetail", { jenis: "kbm", kelas: k, pj: rg, guru: lk.semuaKls ? null : lk.m.id })}
        stats=${[["Kehadiran santri", avg], ["Pertemuan terlaksana", kj.pct, `${kj.absen}/${kj.sesi}`]]} />`; })}
    <${Section} t="Kinerja guru mapel" /><${Card}><div class="list">${guru.map(g => { const k = L.kinerjaMapel(g.id, rg);
      return html`<div class="row"><span class="av">${L.initials(g.pendek.replace(/^Ust(dzh)?\.\s*/, ""))}</span><span class="row-t"><b>${g.nama}</b><small>${k.absen}/${k.sesi} terlaksana · jurnal ${k.jurnal}/${k.sesi}</small>
        <span style="display:block;margin-top:6px"><${Bar} v=${k.pct || 0} tone=${tone(k.pct) === "muted" ? "green" : tone(k.pct)} /></span></span><${Pill} t=${P(k.pct)} tone=${tone(k.pct)} /></div>`; })}</div></${Card}>`;
}
function RekapKesP({ lk, rg }) {
  return html`${lk.pondok.map(p => { const l = santriPondok(p), xs = l.map(s => L.kesantrianDalam(s.id, rg)), sum = f => xs.reduce((n, x) => n + x[f], 0);
    return html`<${Kartu} title=${"Pondok " + p} sub=${`${l.length} santri · ${sum("bap")} BAP · poin ${sum("poinBap") + sum("poinMotd")}`} onClick=${() => nav.go("rekapDetail", { jenis: "kes", pondok: p, pj: rg })}
      stats=${[["Izin", null, `${sum("telat")} terlambat kembali`, String(sum("izin"))], ["Pelanggaran (BAP)", null, `poin ${sum("poinBap")}`, String(sum("bap"))], ["Poin MOTD", null, "alpa & masbuq", String(sum("poinMotd"))]]} />`; })}`;
}

export function RekapDetail({ jenis, aid, hid, kelas, pondok, pj, guru }) {
  useApp();
  const rg = pj || L.periodeRange("pekanan");
  const list = hid ? L.santriHalaqah(hid) : aid ? L.santriAsrama(aid) : pondok ? santriPondok(pondok) : L.santriKelas(kelas);
  const judul = { halaqah: "Kehadiran Halaqah", hafalan: "Perkembangan Hafalan", motd: "Rekap MOTD", mut: "Rekap Mutaba'ah", kbm: "Kehadiran Kelas", kes: "Rekap Kesantrian" }[jenis];
  const mapel = guru ? [...new Set(L.staffById(guru).ajar.filter(([, k]) => k === kelas).map(([m]) => m))] : null;
  const rows = list.map(s => {
    if (jenis === "halaqah") { const k = L.kehadiranHalaqah(s.id, rg); return [s, k.pct, `H ${k.H} · S ${k.S} · I ${k.I} · A ${k.A} · belum diabsen ${k.kosong} dari ${k.sesi} sesi`]; }
    if (jenis === "hafalan") { const x = L.hafalanDalam(s.id, rg), c = L.capaianJuz(s); return [s, null, `${x.hari} hari setor${x.tasmi.length ? " · tasmi' Juz " + x.tasmi.join(", ") : ""} · semester ${c.juz.toLocaleString("id-ID")}/${c.target} juz`, L.fmtBaris(x.baris), x.baris]; }
    if (jenis === "mut") { const k = L.mutPersen(s.id, rg); return [s, k.ibadah == null ? null : Math.round((k.ibadah + k.adab) / 2), `Ibadah ${P(k.ibadah)} · Adab ${P(k.adab)} · diinput ${k.isi}/${k.hari} hari`]; }
    if (jenis === "kes") { const x = L.kesantrianDalam(s.id, rg); return [s, null, `Izin ${x.izin}${x.telat ? ` (${x.telat} terlambat)` : ""} · BAP ${x.bap} · ${L.asramaById(s.asrama).nama}`, `${x.poinBap + x.poinMotd} poin`, -(x.poinBap + x.poinMotd)]; }
    if (jenis === "motd") { let al = 0, mb = 0, n = 0, po = 0; L.hariAktifDalam(rg, "asrama").forEach(t => L.WAKTU.forEach(([w]) => { const d = get("motd", L.motdKey(s.asrama, t, w)); if (d) { n++; const v = d.status[s.id]; if (v === "A") al++; if (v === "M") mb++; po += L.poinMotd(w, v); } }));
      return [s, n ? Math.round(((n - al - mb) / n) * 100) : null, `Alpa ${al} · masbuq ${mb} · ${po} poin · ${n} waktu terabsen`]; }
    const ks = (mapel || [null]).map(m => L.kehadiranKelas(s.id, m, rg)), H = ks.reduce((x, k) => x + k.H, 0), ses = ks.reduce((x, k) => x + k.sesi, 0), kos = ks.reduce((x, k) => x + k.kosong, 0);
    return [s, ses ? Math.round((H / ses) * 100) : null, `Hadir ${H} dari ${ses} pertemuan · belum diabsen ${kos}`];
  }).sort((a, b) => (a[4] != null ? a[4] - b[4] : (a[1] ?? -1) - (b[1] ?? -1)));
  const nm = hid ? L.halaqahById(hid).nama : aid ? L.asramaById(aid).nama : pondok ? "Pondok " + pondok : "Kelas " + kelas;
  return html`<${SubHeader} title=${judul} sub=${`${nm} · ${rg.label}`} />
    <div class="wrap"><${Hint}>${jenis === "hafalan" ? "Diurutkan dari hafalan baru paling sedikit." : jenis === "kes" ? "Diurutkan dari poin terbanyak." : "Diurutkan dari yang paling rendah. Hari/sesi yang tidak diinput ikut dihitung sehingga persentase turun."}</${Hint}>
    <${KartuAI} judul="Analisis AI" tombol="Analisis rekap ini" ket="AI merangkum temuan penting dan saran tindak lanjut dari tabel di bawah."
      buat=${() => tanyaAI({ sistem: SISTEM_DASAR, teks: `Analisis rekap pondok berikut untuk pimpinan.\nJenis: ${judul}\nKelompok: ${nm}\nPeriode: ${rg.label}\nCatatan: hari/sesi tanpa input dihitung tidak terlaksana.\nData per santri (nama: nilai · rincian):\n${rows.map(([s, v, sub, teks]) => `${s.nama}: ${teks != null ? teks : v == null ? "belum ada data" : v + "%"} · ${sub}`).join("\n")}\n\nFormat jawaban: 1 kalimat kesimpulan umum (sebut rata-rata bila relevan), lalu butir "- " berisi: santri yang perlu perhatian (maks. 5 nama), pola yang terlihat (misal input sering kosong), dan 2–3 saran tindak lanjut yang konkret. Maksimal 150 kata.` })} />
    <${Card}><div class="list">${rows.map(([s, v, sub, teks]) => html`<${Row} name=${s.nama} sub=${sub} right=${html`<${Pill} t=${teks != null ? teks : P(v)} tone=${teks != null ? "green" : tone(v)} />`} onClick=${() => nav.go("santri", { sid: s.id })} />`)}</div></${Card}></div>`;
}

// ---------------- Kalender akademik (admin) ----------------
export function Kalender() {
  useApp();
  const st = L.setelan(), lp = L.liburPondok(); const [ed, setEd] = useState(null); const [f, setF] = useState(null); const [th, setTh] = useState(L.today().slice(0, 4));
  const bisa = me().roles.some(r => ["admin", "mudir", "wadir_kurikulum"].includes(r));
  const simpanSet = async () => { if (await put("kalender", "setelan", { ...st, ...f })) { logUbah("ubah", "kalender", "setelan", "Ubah tanggal semester"); toast("Kalender akademik disimpan"); setF(null); } };
  const togAbaikan = async tgl => { const ab = new Set(st.abaikan || []); ab.has(tgl) ? ab.delete(tgl) : ab.add(tgl); await put("kalender", "setelan", { ...st, abaikan: [...ab] }); };
  const fld = (k, lab) => html`<${Field} label=${lab}><input class="in" type="date" value=${(f || st)[k]} onInput=${e => setF({ ...(f || st), [k]: e.target.value })} /></${Field}>`;
  const nas = LIBUR_NASIONAL.filter(l => l.tgl.startsWith(th));
  return html`<${SubHeader} title="Kalender Akademik" sub=${`Tahun pelajaran ${st.tp}`} />
    <div class="wrap">
    <${Card} title="Hari aktif">
      <div class="kv"><span>KBM mapel</span><b>Senin – Jumat</b></div><div class="kv"><span>Halaqah</span><b>Senin – Sabtu (Sabtu Shubuh)</b></div>
      <div class="kv"><span>MOTD & mutaba'ah</span><b>Setiap hari di pondok</b></div><div class="kv"><span>Tidak dihitung</span><b>Ahad, libur nasional, libur pondok</b></div></${Card}>
    <${Card} title="Semester & mulai pakai" right=${bisa && !f ? html`<button class="link" onClick=${() => setF({ ...st })}>Ubah</button>` : null}>
      ${f ? html`<div class="btn-row">${fld("ganjilMulai", "Ganjil mulai")}${fld("ganjilMid", "Akhir mid ganjil")}</div><div class="btn-row">${fld("ganjilSelesai", "Ganjil selesai")}${fld("genapMulai", "Genap mulai")}</div>
          <div class="btn-row">${fld("genapMid", "Akhir mid genap")}${fld("genapSelesai", "Genap selesai")}</div>${fld("mulaiPakai", "Mulai pakai aplikasi")}
          <p class="small">Rekap hanya menghitung hari sejak aplikasi mulai dipakai, supaya hari sebelum ada aplikasi tidak dihitung 0.</p>
          <div class="btn-row"><${Btn} kind="ghost" onClick=${() => setF(null)}>Batal</${Btn}><${Btn} onClick=${simpanSet}>Simpan</${Btn}></div>`
        : html`<div class="kv"><span>Semester ganjil</span><b>${L.fmtTgl(st.ganjilMulai, false)} – ${L.fmtTgl(st.ganjilSelesai, false)}</b></div><div class="kv"><span>Mid ganjil sampai</span><b>${L.fmtTgl(st.ganjilMid, false)}</b></div>
          <div class="kv"><span>Semester genap</span><b>${L.fmtTgl(st.genapMulai, false)} – ${L.fmtTgl(st.genapSelesai, false)}</b></div><div class="kv"><span>Mid genap sampai</span><b>${L.fmtTgl(st.genapMid, false)}</b></div>
          <div class="kv"><span>Mulai pakai aplikasi</span><b>${L.fmtTgl(st.mulaiPakai, false)}</b></div>`}</${Card}>
    <${Card} title="Libur pondok" right=${bisa ? html`<button class="link" onClick=${() => setEd({ baru: true, nama: "", mulai: L.today(), selesai: L.today(), jenis: "pondok" })}>+ Tambah</button>` : null}>
      ${lp.length ? html`<div class="list">${lp.map(l => html`<${Row} name=${l.nama} sub=${`${L.fmtTgl(l.mulai, false)} – ${L.fmtTgl(l.selesai, false)} · ${L.hariRentang(l.mulai, l.selesai).length} hari · ${l.jenis === "kbm" ? "libur KBM saja" : "semua kegiatan libur"}`}
          icon=${html`<${Icon} n="calendar" s=${18} />`} onClick=${bisa ? () => setEd({ ...l }) : null} />`)}</div>` : html`<${Empty} t="Belum ada libur pondok. Tambahkan libur panjang (misal libur semester) agar tidak masuk rekap." icon="calendar" />`}</${Card}>
    <${Card} title="Libur nasional & cuti bersama" right=${html`<div class="seg small" style="width:120px">${["2026", "2027"].map(y => html`<button class=${y === th ? "on" : ""} onClick=${() => setTh(y)}>${y}</button>`)}</div>`}>
      <p class="small" style="margin-top:0">Sesuai SKB 3 Menteri. Pada tanggal ini KBM dan halaqah tidak dihitung. Jika pondok tetap berkegiatan, ketuk untuk menandai "tetap masuk".</p>
      <div class="list">${nas.map(l => { const ab = (st.abaikan || []).includes(l.tgl); return html`<${Row} name=${l.nama} sub=${`${L.fmtTgl(l.tgl)}${l.jenis === "cuti" ? " · cuti bersama" : ""}`}
        icon=${html`<${Icon} n="calendar" s=${18} />`} right=${html`<${Pill} t=${ab ? "Tetap masuk" : "Libur"} tone=${ab ? "green" : "red"} />`} onClick=${bisa ? () => togAbaikan(l.tgl) : null} />`; })}</div></${Card}></div>
    ${ed ? html`<${EditLibur} e=${ed} onClose=${() => setEd(null)} />` : null}`;
}
function EditLibur({ e, onClose }) {
  const [f, setF] = useState(e); const [ask, setAsk] = useState(false);
  const ok = f.nama.trim() && f.mulai && f.selesai && f.selesai >= f.mulai;
  const save = async () => { const id = e.baru ? uid("lb") : e.id; const d = { nama: f.nama.trim(), mulai: f.mulai, selesai: f.selesai, jenis: f.jenis, oleh: me().id, ts: Date.now() };
    if (await put("kalender", id, d)) { logUbah(e.baru ? "tambah" : "ubah", "kalender", id, `Libur pondok: ${d.nama}`); toast("Libur pondok disimpan. Rekap otomatis menyesuaikan."); onClose(); } };
  const hapus = async () => { setAsk(false); await logUbah("hapus", "kalender", e.id, `Libur pondok: ${e.nama}`, e); await del("kalender", e.id); toast("Libur dihapus"); onClose(); };
  return html`<${Sheet} open=${true} title=${e.baru ? "Tambah libur pondok" : "Ubah libur pondok"} onClose=${onClose}>
    <${Field} label="Nama libur"><input class="in" value=${f.nama} placeholder="Misal: Libur akhir semester ganjil" onInput=${x => setF({ ...f, nama: x.target.value })} /></${Field}>
    <div class="btn-row"><${Field} label="Mulai"><input class="in" type="date" value=${f.mulai} onInput=${x => setF({ ...f, mulai: x.target.value })} /></${Field}>
      <${Field} label="Selesai"><input class="in" type="date" value=${f.selesai} onInput=${x => setF({ ...f, selesai: x.target.value })} /></${Field}></div>
    <${Field} label="Jenis"><${Seg} small items=${[["pondok", "Semua libur (santri pulang)"], ["kbm", "Libur KBM saja"]]} value=${f.jenis} onChange=${v => setF({ ...f, jenis: v })} /></${Field}>
    <p class="small">${f.mulai && f.selesai >= f.mulai ? `${L.hariRentang(f.mulai, f.selesai).length} hari tidak dihitung di rekap ${f.jenis === "kbm" ? "KBM" : "halaqah, MOTD, mutaba'ah, dan KBM"}.` : "Tanggal selesai harus sama atau setelah tanggal mulai."}</p>
    <div class="btn-row mt8">${!e.baru ? html`<${Btn} kind="outline" icon="trash" onClick=${() => setAsk(true)}>Hapus</${Btn}>` : null}<${Btn} disabled=${!ok} onClick=${save}>Simpan</${Btn}></div>
    <${Confirm} open=${ask} danger title="Hapus libur ini?" text="Hari-hari ini akan kembali dihitung sebagai hari aktif di rekap." yes="Hapus" onYes=${hapus} onNo=${() => setAsk(false)} /></${Sheet}>`;
}
