// Rekap perolehan hafalan per bulan (guru tahfidz / wali asrama; Wadir Tahfidz & Mudir: semua halaqah) + unduh PDF
import { useState } from "preact/hooks";
import { html, nav, useApp, Card, SubHeader, Row, Pill, Btn, Empty, Hint, Stat } from "./ui.js";
import { all } from "./store.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { unduhPdf, tabelKePdf } from "./pdf.js";

const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const namaBulan = b => { const [y, m] = b.split("-"); return `${BLN[+m - 1]} ${y}`; };
const dk = (n, d) => n.toFixed(d).replace(".", ",");
export function perolehanBulan(sid, bulan) {
  const recs = all("setoran").filter(r => r.santri === sid && r.tanggal && r.tanggal.startsWith(bulan));
  const z = recs.filter(r => r.jenis === "ziyadah" && r.lulus !== false), baris = z.reduce((n, r) => n + (Number(r.baris) || 0), 0);
  return { baris, hal: baris / 15, juz: baris / 300, hari: new Set(z.map(r => r.tanggal)).size, muro: recs.filter(r => r.jenis === "murojaah").length,
    tasmi: recs.filter(r => r.jenis === "tasmi" && r.lulus).map(r => r.juz) };
}
function kelompok() {
  const m = me(), r = m.roles, hq = L.halaqahOf(m.id), a = L.asramaOf(m.id);
  const semua = r.includes("mudir") || r.includes("wadir_tahfidz");
  const g = (semua ? L.HALAQAH : hq ? [hq] : []).map(h => ({ nama: h.nama, sub: "Guru tahfidz", list: L.santriHalaqah(h.id) }));
  if (a && !semua) { const ids = new Set(g.flatMap(x => x.list.map(s => s.id))), la = L.santriAsrama(a.id); if (la.some(s => !ids.has(s.id))) g.push({ nama: "Asrama " + a.nama, sub: "Wali asrama", list: la }); }
  return g.filter(x => x.list.length);
}
export function RekapHafalanBulan() {
  useApp();
  const now = new Date(), bulanList = Array.from({ length: 12 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); return `${d.getFullYear()}-${L.pad(d.getMonth() + 1)}`; });
  const [bulan, setBulan] = useState(bulanList[0]);
  const grup = kelompok();
  if (!grup.length) return html`<${SubHeader} title="Perolehan Hafalan" /><div class="wrap"><${Card}><${Empty} t="Akun ini belum memegang halaqah atau asrama." icon="bookopen" /></${Card}></div>`;
  const data = grup.map(g => ({ ...g, rows: g.list.map(s => ({ s, p: perolehanBulan(s.id, bulan) })).sort((x, y) => y.p.baris - x.p.baris) }));
  const semuaRows = data.flatMap(g => g.rows), tot = semuaRows.reduce((n, x) => n + x.p.baris, 0), aktif = semuaRows.filter(x => x.p.baris > 0).length;
  const unduh = () => unduhPdf(`Perolehan Hafalan ${namaBulan(bulan)}`, () => tabelKePdf({
    judul: "Rekap Perolehan Hafalan", sub: `${namaBulan(bulan)} · ${data.length > 2 ? data.length + " kelompok · " + semuaRows.length + " santri" : data.map(g => g.nama).join(", ")}`,
    catatan: "Perolehan = ziyadah yang lulus dalam bulan ini. 15 baris = 1 halaman, 20 halaman = 1 juz (300 baris).",
    oleh: `Dicetak oleh ${me().nama}, ${L.fmtTgl(L.today())} · MuawanahKu`,
    bagian: data.map(g => ({ judul: `${g.nama} · ${g.rows.length} santri`, kol: ["No", "Nama santri", "Baris", "Halaman", "Juz", "Setara", "Hari setor", "Murojaah", "Tasmi' lulus", "Total hafalan"],
      rows: g.rows.map(({ s, p }, i) => [i + 1, s.nama, p.baris, dk(p.hal, 1), dk(p.juz, 2), L.fmtBaris(p.baris), p.hari, p.muro, p.tasmi.length ? "Juz " + p.tasmi.join(", ") : "—", L.fmtJumlah(L.hafalan(s))]) })),
  }));
  return html`<${SubHeader} title="Perolehan Hafalan" sub="Rekap per bulan · baris, halaman, juz">
      <select class="in rk-bulan" value=${bulan} onChange=${e => setBulan(e.target.value)} aria-label="Pilih bulan">${bulanList.map(b => html`<option value=${b}>${namaBulan(b)}</option>`)}</select></${SubHeader}>
    <div class="wrap">
      <${Card}><div class="stats"><${Stat} label="Total baris" value=${tot} /><${Stat} label="Setara" value=${tot ? L.fmtBaris(tot) : "—"} tone="blue" /><${Stat} label="Santri setor" value=${`${aktif}/${semuaRows.length}`} tone="gold" /></div></${Card}>
      ${data.map(g => html`<${Card} title=${g.nama} right=${html`<small>${g.rows.length} santri</small>`}><div class="list">${g.rows.map(({ s, p }) => html`<${Row} name=${s.nama}
          sub=${p.baris ? `${p.baris} baris · ${dk(p.hal, 1)} hal · ${dk(p.juz, 2)} juz · ${p.hari} hari setor` : "Belum ada ziyadah bulan ini"}
          right=${html`<${Pill} t=${p.baris ? L.fmtBaris(p.baris) : "0"} tone=${p.baris >= 300 ? "green" : p.baris ? "blue" : "muted"} />`} onClick=${() => nav.go("santri", { sid: s.id })} />`)}</div></${Card}>`)}
      <${Hint}>Perolehan dihitung dari ziyadah yang lulus pada ${namaBulan(bulan)}. 15 baris = 1 halaman, 20 halaman = 1 juz.</${Hint}>
      <div class="sticky-act"><${Btn} icon="download" onClick=${unduh}>Unduh PDF ${namaBulan(bulan)}</${Btn}></div></div>`;
}
