import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Tile, Card, SubHeader, Stat, Row, Pill, Btn, Empty, Seg, Section, Bar, SearchBox, Logo } from "./ui.js";
import { S, all, get } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { KoreksiSheet } from "./s_koreksi.js";
import { me } from "./common.js";
import { target } from "./s_wadir.js";
import { useDownloads, unduh, docHtml, esc } from "./s_system.js";

export function HafalanCard({ s }) {
  const h = L.hafalan(s), cj = L.capaianJuz(s);
  return html`<${Card} title="Hafalan"><div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px"><div><div class="small">Total hafalan</div><div class="big">${h.selesai.length}<small>juz${h.baris >= 15 ? ` ${Math.floor(h.baris / 15)} hal.` : ""}</small></div></div>
    <div style="text-align:right"><div class="small">Juz selesai</div><b>${h.selesai.length ? h.selesai.join(" · ") : "—"}</b></div></div>
    <div class="mt12 small">${h.khatam ? "Khatam 30 juz" : `Sedang menghafal Juz ${h.aktif} · hal. ${Math.max(1, Math.ceil(h.baris / 15))} dari ${L.juzPages(h.aktif)}`}</div>
    <div style="margin-top:6px"><${Bar} v=${(h.baris / h.total) * 100} /></div>
    <div class="tgt mt12"><div><span>Hafalan baru semester ini</span><b>${cj.juz.toLocaleString("id-ID")} <small>/ ${cj.target} juz</small></b></div><${Pill} t=${cj.tercapai ? "Target tercapai" : `Kurang ${cj.kurang.toLocaleString("id-ID")} juz`} tone=${cj.tercapai ? "green" : "gold"} /></div>
    <div style="margin-top:6px"><${Bar} v=${cj.pct} tone=${cj.tercapai ? "green" : "gold"} /></div>
    ${h.siapTasmi ? html`<div class="mt8"><${Pill} t=${`Juz ${h.aktif} selesai · menunggu tasmi'`} tone="gold" /></div>` : null}</${Card}>`;
}

const JENIS = { ziyadah: "Ziyadah", murojaah: "Murojaah", manzil: "Manzil", tasmi: "Tasmi'" };
export function RiwayatSetoran({ sid, n = 12, koreksi }) {
  const [sel, setSel] = useState(null);
  const l = L.setoranSantri(sid).reverse().slice(0, n);
  return l.length ? html`${sel ? html`<${KoreksiSheet} item=${sel} onClose=${() => setSel(null)} />` : null}<div class="list">${l.map(r => html`<${Row} onClick=${koreksi ? () => setSel({ col: "setoran", list: [r] }) : null} name=${`${JENIS[r.jenis]} · ${r.jenis === "ziyadah" ? r.baris + " baris" : r.jenis === "murojaah" ? `hal. ${r.halDari}–${r.halSampai}` : "Juz " + r.juz}`}
    sub=${`${L.fmtTgl(r.tanggal)}${r.jenis === "ziyadah" ? " · " + L.posLabel(r.juz, r.sesudah) : r.jenis === "murojaah" ? " · Juz " + r.juz : ""}`} icon=${html`<${Icon} n=${r.jenis === "tasmi" ? "mic" : r.jenis === "manzil" ? "layers" : r.jenis === "murojaah" ? "repeat" : "bookopen"} s=${18} />`}
    right=${html`<${Pill} t=${(r.lulus ? "" : "Ulang · ") + r.nilai} tone=${r.lulus ? "green" : "red"} />`} />`)}</div>` : html`<${Empty} t="Belum ada setoran." icon="bookopen" />`;
}

export function KehadiranCard({ s }) {
  const [j, setJ] = useState("semester"), rg = L.periodeRange(j);
  const kh = L.kehadiranHalaqah(s.id, rg), kk = L.kehadiranKelas(s.id, null, rg), mp = L.mutPersen(s.id, rg);
  const sub = k => (k.sesi ? `H${k.H} S${k.S} I${k.I} A${k.A} · ${k.sesi} sesi${k.kosong ? `, ${k.kosong} belum diabsen` : ""}` : "belum ada hari aktif");
  return html`<${Card} title="Kehadiran & mutaba'ah" right=${html`<small>${rg.label}</small>`}>
    <div class="seg small mb8">${[["pekanan", "Pekan"], ["bulanan", "Bulan"], ["mid", "Mid"], ["semester", "Semester"], ["tahunan", "Tahun"]].map(([k, t]) => html`<button class=${k === j ? "on" : ""} onClick=${() => setJ(k)}>${t}</button>`)}</div>
    <div class="stats"><${Stat} label="Halaqah" value=${kh.pct == null ? "—" : kh.pct + "%"} sub=${sub(kh)} /><${Stat} label="Kelas" value=${kk.pct == null ? "—" : kk.pct + "%"} sub=${sub(kk)} />
    <${Stat} label="Mutaba'ah" value=${mp.ibadah == null ? "—" : Math.round((mp.ibadah + mp.adab) / 2) + "%"} sub=${mp.hari ? `diinput ${mp.isi}/${mp.hari} hari` : "belum ada hari aktif"} /></div></${Card}>`;
}

export function CatatanCard({ s }) {
  const iz = all("izin").filter(i => i.santri === s.id).sort((a, b) => b.ts - a.ts);
  const bap = all("bap").filter(b => b.santri === s.id).sort((a, b) => b.ts - a.ts), mt = L.motdCatatan(s.id), p = L.poinSantri(s.id);
  return html`<${Card} title="Izin & catatan" right=${html`<${Pill} t=${p.total + " poin"} tone=${p.total ? "red" : "green"} />`}>
    ${!iz.length && !bap.length && !mt.length ? html`<${Empty} t="Tidak ada izin atau catatan pelanggaran." icon="check" />` : null}
    <div class="list">${iz.map(i => html`<${Row} name=${`Izin ${i.jenis}`} sub=${`${L.fmtDT(i.keluar)} → ${L.fmtDT(i.kembali)} · ${i.alasan}`} icon=${html`<${Icon} n="door" s=${18} />`} right=${html`<${Pill} t=${i.status === "aktif" ? (L.terlambat(i) ? "Terlambat" : "Aktif") : "Kembali"} tone=${i.status === "aktif" ? "gold" : "green"} />`} />`)}
    ${bap.map(b => html`<${Row} name=${b.pelanggaranNama} sub=${`${L.fmtTgl(b.tanggal)} · BAP`} icon=${html`<${Icon} n="clipboard" s=${18} />`} right=${html`<${Pill} t=${b.poin + " poin"} tone="red" />`} />`)}
    ${mt.slice(0, 10).map(c => html`<${Row} name=${`${c.st === "A" ? "Alpa" : "Masbuq"} ${L.WAKTU.find(x => x[0] === c.waktu)[1]}`} sub=${L.fmtTgl(c.tanggal) + " · dari MOTD"} icon=${html`<${Icon} n="moon" s=${18} />`} right=${html`<${Pill} t=${c.poin + " poin"} tone="purple" />`} />`)}</div></${Card}>`;
}

export function SantriDetail({ sid, tab: t0 }) {
  useApp();
  const s = L.santriById(sid); const [tab, setTab] = useState(t0 || "hafalan");
  if (!s) return html`<${SubHeader} title="Santri" /><div class="wrap"><${Empty} t="Santri tidak ditemukan." /></div>`;
  const m = me(), canNilai = m && !m.roles.every(r => r === "admin");
  return html`<${SubHeader} title=${s.nama} sub=${`Kelas ${s.kelas} · ${L.asramaById(s.asrama).nama} · Halaqah ${L.staffById(L.asramaById(s.asrama).musyrif).pendek}`}>
    <${Seg} small items=${[["hafalan", "Hafalan"], ["hadir", "Kehadiran"], ...(canNilai ? [["nilai", "Nilai"]] : []), ["catatan", "Catatan"]]} value=${tab} onChange=${setTab} /></${SubHeader}>
    <div class="wrap">${tab === "hafalan" ? html`<${HafalanCard} s=${s} /><${Section} t="Riwayat setoran" /><${Card}><${RiwayatSetoran} sid=${s.id} koreksi=${!!me()} /></${Card}>`
      : tab === "hadir" ? html`<${KehadiranCard} s=${s} />` : tab === "nilai" ? html`<${NilaiCard} s=${s} />` : html`<${CatatanCard} s=${s} />`}</div>`;
}

function NilaiCard({ s }) {
  return html`<${Card} title="Nilai mapel"><div class="list">${DATA.mapel.map(m => { const n = L.nilaiAkhir(s.id, m.id) || {}; const p = L.predikat(n.akhir);
    return html`<${Row} name=${m.nama} sub=${`Projek ${n.pj ?? "—"} · PTS ${n.pts ?? "—"} · PAS ${n.pas ?? "—"} · hadir ${n.hadir == null ? "—" : n.hadir + "%"}`} icon=${html`<${Icon} n="award" s=${18} />`} right=${n.akhir == null ? "—" : html`<${Pill} t=${`${n.akhir} · ${p.h}`} tone=${p.c} />`} />`; })}</div></${Card}>`;
}

export function RaporList() {
  useApp();
  const m = me(); const a = L.asramaOf(m.id);
  const lihatSemua = m.roles.some(r => ["mudir", "wadir_tahfidz", "wadir_kurikulum"].includes(r));
  const [scope, setScope] = useState(a && !lihatSemua ? a.id : (a ? a.id : "all")); const [q, setQ] = useState("");
  const list = (scope === "all" ? L.santriList() : L.santriAsrama(scope)).filter(s => s.nama.toLowerCase().includes(q.toLowerCase()));
  return html`<${SubHeader} title="Rapor" sub="Semester ganjil 2026/2027 · tersusun otomatis">${lihatSemua ? html`<${Seg} small items=${[...(a ? [[a.id, "Asrama saya"]] : []), ["all", "Semua santri"]]} value=${scope} onChange=${setScope} />` : null}</${SubHeader}>
    <div class="wrap"><${SearchBox} value=${q} onInput=${setQ} /><${Card}><div class="list">${list.map(s => html`<${Row} name=${s.nama} sub=${`Kelas ${s.kelas} · ${L.asramaById(s.asrama).nama}`} onClick=${() => nav.go("raporView", { sid: s.id })} />`)}</div></${Card}></div>`;
}

export { RaporView } from "./s_rapor.js";

export function MotdRekapAll() {
  useApp();
  const [t, setT] = useState("motd");
  return html`<${SubHeader} title="MOTD & Mutaba'ah" sub="Semua asrama"><${Seg} items=${[["motd", "MOTD"], ["mut", "Mutaba'ah"]]} value=${t} onChange=${setT} /></${SubHeader}>
    ${t === "motd" ? html`<${MotdAllInner} />` : html`<div class="wrap"><${Card}><div class="list">${L.ASRAMA.map(a => { const ps = L.santriAsrama(a.id).map(s => L.mutPersen(s.id)).filter(x => x.ibadah != null);
      const ib = ps.length ? Math.round(ps.reduce((x, y) => x + y.ibadah, 0) / ps.length) : null, ad = ps.length ? Math.round(ps.reduce((x, y) => x + y.adab, 0) / ps.length) : null;
      return html`<${Row} name=${a.nama} sub=${ps.length ? `Ibadah ${ib}% · Adab ${ad}% · ${ps.length} santri terisi` : "Belum ada mutaba'ah"} icon=${html`<${Icon} n="checksq" s=${18} />`} right=${ib == null ? "—" : html`<${Pill} t=${L.predikat(Math.round((ib + ad) / 2)).h} tone=${L.predikat(Math.round((ib + ad) / 2)).c} />`} />`; })}</div></${Card}></div>`}`;
}
function MotdAllInner() {
  const tgl = L.today(), wk = L.weekStart(tgl);
  return html`<div class="wrap">${["29", "21"].map(p => html`<${Section} t=${"Pondok " + p} /><${Card}><div class="list">${L.ASRAMA.filter(a => a.pondok === p).map(a => {
    const n = L.WAKTU.filter(([w]) => get("motd", L.motdKey(a.id, tgl, w))).length; let al = 0;
    all("motd").filter(d => d.asrama === a.id && d.tanggal >= wk).forEach(d => Object.values(d.status).forEach(v => { if (v === "A") al++; }));
    return html`<${Row} name=${a.nama} sub=${`${L.staffById(a.musyrif).pendek} · ${n}/8 waktu diabsen hari ini · ${al} alpa pekan ini`} icon=${html`<${Icon} n="moon" s=${18} />`} right=${html`<${Pill} t=${n + "/8"} tone=${n === 8 ? "green" : n ? "gold" : "muted"} />`} />`; })}</div></${Card}>`)}</div>`;
}

export function KinerjaAll() {
  return html`<${SubHeader} title="Kinerja Guru" sub="Tahfidz dan mapel" /><div class="wrap"><${Card}><div class="tiles">
    <${Tile} icon="bookopen" label="Guru Tahfidz" color="emerald" onClick=${() => nav.go("kinerjaTahfidz")} />
    <${Tile} icon="layers" label="Guru Mapel" color="blue" onClick=${() => nav.go("kinerjaGuru")} />
    <${Tile} icon="briefcase" label="Izin Guru" color="slate" onClick=${() => nav.go("rekapIzinGuru")} /></div></${Card}></div>`;
}
