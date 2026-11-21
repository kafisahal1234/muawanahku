import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Tile, Card, SubHeader, Stat, Row, Pill, Btn, Empty, Field, Seg, Section, Sheet, Bar, SearchBox, Stepper, Hint } from "./ui.js";
import { S, all, get, put, toast } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { AwalSheet } from "./s_ai.js";

export const target = () => L.targetSemester();
export function halaqahStat(a) {
  const list = L.santriHalaqah(a.id), hs = list.map(s => L.hafalan(s));
  const avg = hs.length ? hs.reduce((x, h) => x + h.jumlah, 0) / hs.length : 0;
  const cap = list.length ? list.reduce((x, s) => x + L.capaianJuz(s).pct, 0) / list.length : 0;
  const kh = list.map(s => L.kehadiranHalaqah(s.id).pct).filter(x => x != null);
  return { n: list.length, avg, cap: Math.round(cap), hadir: kh.length ? Math.round(kh.reduce((a, b) => a + b, 0) / kh.length) : null, siap: hs.filter(h => h.siapTasmi).length };
}

export function Pengelolaan({ ro }) {
  useApp();
  const tgl = L.today(), sesi = L.sesiNow();
  const sudah = L.HALAQAH.filter(h => get("absenHalaqah", L.halaqahKey(h.id, tgl, sesi))).length;
  const all2 = L.santriList().map(s => L.hafalan(s)); const avg = all2.reduce((x, h) => x + h.jumlah, 0) / all2.length;
  const siap = all2.filter(h => h.siapTasmi).length;
  const gagal = all("setoran").filter(r => r.tanggal === tgl && !r.lulus).length;
  return html`<${SubHeader} title="Pengelolaan Tahfidz" sub=${ro ? "Pemantauan Mudir" : `Wadir Tahfidz · ${me().pendek}`} />
    <div class="wrap"><${Card}><div class="stats">${L.adaHalaqah(tgl) ? html`<${Stat} label=${"Absen " + sesi} value=${`${sudah}/${L.HALAQAH.length}`} sub="halaqah" tone=${sudah < L.HALAQAH.length ? "gold" : ""} />` : html`<${Stat} label="Halaqah" value="Libur" sub="Ahad" />`}<${Stat} label="Rata hafalan" value=${avg.toFixed(1)} sub="juz" /><${Stat} label="Siap tasmi'" value=${siap} tone="gold" /></div></${Card}>
    <${Card} title="Menu Pengelolaan"><div class="tiles">
      ${!ro ? html`<${Tile} icon="edit" label="Data Awal Hafalan" color="emerald" onClick=${() => nav.go("dataAwal")} />
      <${Tile} icon="target" label="Target Hafalan" color="orange" onClick=${() => nav.go("targetHafalan")} />
      <${Tile} icon="users" label="Kelola Halaqah" color="teal" onClick=${() => nav.go("halaqahAdmin")} />` : null}
      <${Tile} icon="star" label="Peringkat Santri" color="gold" onClick=${() => nav.go("peringkat")} />
      <${Tile} icon="mic" label="Rekap Tasmi'" color="teal" onClick=${() => nav.go("rekapTasmi")} />
      <${Tile} icon="alert" label="Di bawah KKM" color="coral" badge=${gagal || null} onClick=${() => nav.go("bawahKkm")} />
      ${!ro ? html`<${Tile} icon="clock" label="Koreksi Input Tahfidz" color="slate" onClick=${() => nav.go("riwayatModul", { modul: "tahfidz" })} />` : null}</div></${Card}>
    <${Card} title="Capaian per halaqah" right=${html`<small>vs target semester</small>`}><div class="list">${L.HALAQAH.map(a => { const st = halaqahStat(a), g = L.staffById(a.guru) || { pendek: "—" };
      return html`<button class="row" onClick=${() => nav.go("progres", { hid: a.id })}><span class="av">${L.initials(g.pendek.replace(/^Ust\.\s*/, ""))}</span><span class="row-t"><b>${a.nama}</b>
        <small>${st.n} santri · capaian target semester ${st.cap}% · rata total ${st.avg.toFixed(1)} juz${st.hadir != null ? " · hadir " + st.hadir + "%" : ""}</small><span style="display:block;margin-top:6px"><${Bar} v=${st.cap} tone=${st.cap >= 75 ? "green" : st.cap >= 50 ? "gold" : "red"} /></span></span><b style="font-size:13px;color:#0B5D3B">${st.cap}%</b></button>`; })}</div></${Card}></div>`;
}

export function DataAwal() {
  useApp();
  const [q, setQ] = useState(""); const [sel, setSel] = useState(null);
  const list = L.santriList().filter(s => s.nama.toLowerCase().includes(q.toLowerCase()));
  return html`<${SubHeader} title="Data Awal Hafalan" sub="Diisi Wadir Tahfidz, jadi titik mulai hitungan" />
    <div class="wrap"><${Hint}>Isi posisi hafalan setiap santri di awal semester. Ketuk santri untuk mengubahnya, atau unggah rekap hafalan sekaligus.</${Hint}>
    <button class="up-cta" onClick=${() => nav.go("imporAwal")}><span class="up-ic"><${Icon} n="upload" s=${22} /></span><span><b>Unggah dari dokumen</b><small>Excel, Word, PDF, atau foto · dibaca AI</small></span><${Icon} n="chev" s=${18} /></button>
    <${SearchBox} value=${q} onInput=${setQ} /><${Card}><div class="list">${list.map(s => { const a = L.dataAwal(s);
      return html`<${Row} name=${s.nama} sub=${`Hafal: ${a.selesai.length ? a.selesai.join(", ") : "—"} · ${L.posLabel(a.aktif, a.baris)}`} right=${(S.data.dataAwal || {})[s.id] ? html`<${Pill} t="Diubah" tone="blue" />` : null} onClick=${() => setSel(s.id)} />`; })}</div></${Card}>
    ${sel ? html`<${EditAwal} sid=${sel} onClose=${() => setSel(null)} />` : null}</div>`;
}
function EditAwal({ sid, onClose }) {
  const s = L.santriById(sid);
  const save = async a => { if (await put("dataAwal", sid, a)) { toast("Data awal hafalan disimpan"); onClose(); } };
  return html`<${AwalSheet} judul=${s.nama} awal=${L.dataAwal(s)} onClose=${onClose} onSimpan=${save} tombol="Simpan" />`;
}

export function TargetHafalan() {
  useApp();
  const [v, setV] = useState(L.targetSemester());
  const save = async () => { await put("target", "semester", { juz: Number(v) || 1 }); toast("Target hafalan disimpan"); nav.back(); };
  const cs = L.santriList().map(s => L.capaianJuz(s)), ok = cs.filter(c => c.tercapai).length;
  return html`<${SubHeader} title="Target Hafalan" sub="Hafalan baru per semester" /><div class="wrap">
    <${Hint}>Target dihitung dari hafalan BARU sejak awal semester (dari data awal hafalan), bukan total semua hafalan. Berlaku untuk semua santri.</${Hint}>
    <${Card}><${Field} label="Target hafalan baru per semester (juz)"><${Stepper} value=${v} onChange=${setV} min=${1} max=${10} label="target juz per semester" /></${Field}>
      <div class="stats two"><${Stat} label="Sudah mencapai" value=${ok} sub="santri" /><${Stat} label="Rata capaian" value=${(cs.reduce((x, c) => x + c.juz, 0) / Math.max(1, cs.length)).toFixed(2)} sub="juz baru" /></div></${Card}>
    <${Btn} onClick=${save} icon="check">Simpan target</${Btn}></div>`;
}

export function KinerjaTahfidz() {
  useApp();
  const tgl = L.today();
  return html`<${SubHeader} title="Kinerja Guru Tahfidz" sub=${L.fmtTgl(tgl)} /><div class="wrap"><${Card}><div class="list">
    ${L.ASRAMA.map(a => { const g = L.staffById(a.musyrif), ss = L.sesiHari(tgl).map(s => !!get("absenHalaqah", L.halaqahKey(a.id, tgl, s)));
      const set = all("setoran").filter(r => r.guru === g.id && r.tanggal === tgl).length, iz = all("izinGuru").some(i => i.guru === g.id && i.tanggal === tgl);
      return html`<div class="row"><span class="av">${L.initials(g.pendek.replace(/^Ust\.\s*/, ""))}</span><span class="row-t"><b>${g.pendek} · ${a.nama}</b><small>${set} setoran dicatat hari ini${iz ? " · izin" : ""}</small>
        <span style="display:flex;gap:4px;margin-top:6px">${L.sesiHari(tgl).map((s, i) => html`<${Pill} t=${(ss[i] ? "✓ " : "") + s} tone=${ss[i] ? "green" : "muted"} />`)}</span></span></div>`; })}</div></${Card}>
    <p class="fab-note">Sesi yang tidak diabsen tercatat "tidak terlaksana" untuk kinerja guru.</p></div>`;
}

export function RekapHalaqah() {
  useApp();
  return html`<${SubHeader} title="Rekap Halaqah" sub="11 halaqah · 103 santri" /><div class="wrap">
    ${L.ASRAMA.map(a => { const st = halaqahStat(a); return html`<${Card} title=${a.nama} right=${html`<button class="link" onClick=${() => nav.go("progres", { aid: a.id })}>Detail</button>`}>
      <div class="small mb8">${L.staffAman(a.musyrif).nama} · Pondok ${a.pondok}</div>
      <div class="stats"><${Stat} label="Santri" value=${st.n} /><${Stat} label="Rata hafalan" value=${st.avg.toFixed(1)} sub="juz" /><${Stat} label="Hadir" value=${st.hadir == null ? "—" : st.hadir + "%"} /></div></${Card}>`; })}</div>`;
}

export function Peringkat() {
  useApp();
  const [k, setK] = useState("all");
  const list = L.santriList().filter(s => k === "all" || s.kelas === k).map(s => ({ s, h: L.hafalan(s) })).sort((a, b) => b.h.jumlah - a.h.jumlah).slice(0, 30);
  return html`<${SubHeader} title="Peringkat Santri" sub="Berdasarkan total hafalan"><${Seg} small items=${[["all", "Semua"], ["7", "Kls 7"], ["8", "Kls 8"], ["9A", "9A"], ["9B", "9B"]]} value=${k} onChange=${setK} /></${SubHeader}>
    <div class="wrap"><${Card}><div class="list">${list.map(({ s, h }, i) => html`<button class="row" onClick=${() => nav.go("santri", { sid: s.id })}><span class=${"av " + (i < 3 ? "gold" : "")}>${i + 1}</span>
      <span class="row-t"><b>${s.nama}</b><small>Kelas ${s.kelas} · sedang Juz ${h.aktif}</small></span><b style="color:#0B5D3B">${L.fmtJumlah(h)}</b></button>`)}</div></${Card}></div>`;
}

export function RekapTasmi() {
  useApp();
  const l = all("setoran").filter(r => r.jenis === "tasmi").sort((a, b) => b.ts - a.ts);
  return html`<${SubHeader} title="Rekap Tasmi'" sub=${`${l.filter(r => r.lulus).length} lulus · ${l.filter(r => !r.lulus).length} ulang`} /><div class="wrap"><${Card}>
    ${l.length ? html`<div class="list">${l.map(r => html`<${Row} name=${L.santriAman(r.santri).nama} sub=${`Juz ${r.juz} · ${L.fmtTgl(r.tanggal)} · penguji ${r.penguji || "—"}`} right=${html`<${Pill} t=${(r.lulus ? "Lulus " : "Ulang ") + r.nilai} tone=${r.lulus ? "green" : "red"} />`} />`)}</div>` : html`<${Empty} t="Belum ada tasmi'." icon="mic" />`}</${Card}></div>`;
}

export function BawahKkm() {
  useApp();
  const tgl = L.today(), l = all("setoran").filter(r => r.tanggal === tgl && !r.lulus).sort((a, b) => b.ts - a.ts);
  return html`<${SubHeader} title="Di bawah KKM" sub=${"Setoran hari ini · " + L.fmtTgl(tgl)} /><div class="wrap"><${Card}>
    ${l.length ? html`<div class="list">${l.map(r => html`<${Row} name=${L.santriAman(r.santri).nama} sub=${`${r.jenis} · Juz ${r.juz} · ${L.staffAman(r.guru).pendek}`} right=${html`<${Pill} t=${r.nilai} tone="red" />`} />`)}</div>` : html`<${Empty} t="Tidak ada setoran di bawah KKM hari ini." icon="check" />`}</${Card}></div>`;
}
