import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Tile, Card, SubHeader, Stat, Row, Pill, Btn, Empty, Field, Seg, Section, Sheet, Bar, SearchBox, Stepper, Hint } from "./ui.js";
import { S, all, get, put, toast } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { me, MenuEvaluasi } from "./common.js";
import { AwalSheet } from "./s_ai.js";
import { usePeriode } from "./s_rekap.js";
import { Evaluasi } from "./s_laporan.js";
import { evKinerja, denganLalu } from "./evaluasi.js";

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
  // Mudir pondok tertentu hanya melihat halaqah & santri pondoknya
  const mp = ro ? L.mudirPondok(me()) : null, HQ = mp ? L.HALAQAH.filter(h => !h.pondok || mp.includes(h.pondok)) : L.HALAQAH;
  const sudah = HQ.filter(h => get("absenHalaqah", L.halaqahKey(h.id, tgl, sesi))).length;
  const dipP = sid => { if (!mp) return true; const x = L.santriById(sid); return !!x && mp.includes(L.pondokOfSantri(x)); };
  const all2 = L.santriList().filter(s => dipP(s.id)).map(s => L.hafalan(s)); const avg = all2.reduce((x, h) => x + h.jumlah, 0) / all2.length;
  const siap = all2.filter(h => h.siapTasmi).length;
  const gagal = all("setoran").filter(r => r.tanggal === tgl && !r.lulus && dipP(r.santri)).length;
  return html`<${SubHeader} title="Pengelolaan Tahfidz" sub=${ro ? (mp && mp.length === 1 ? "Pemantauan Mudir · Pondok " + mp[0] : "Pemantauan Mudir") : `Wadir Tahfidz · ${me().pendek}`} />
    <div class="wrap"><${Card}><div class="stats">${L.adaHalaqah(tgl) ? html`<${Stat} label=${"Absen " + sesi} value=${`${sudah}/${HQ.length}`} sub="halaqah" tone=${sudah < HQ.length ? "gold" : ""} />` : html`<${Stat} label="Halaqah" value="Libur" sub="Ahad" />`}<${Stat} label="Rata hafalan" value=${avg.toFixed(1)} sub="juz" /><${Stat} label="Siap tasmi'" value=${siap} tone="gold" /></div></${Card}>
    ${ro ? html`<${MenuEvaluasi} ket="Pilih yang ingin dievaluasi" items=${[
      { ic: "chart", w: "teal", t: "Rekap Tahfidz", d: "Kehadiran halaqah, ziyadah, murojaah per halaqah & per santri. Bulanan, tengah semester, semester.", go: () => nav.go("rekapTahfidz") },
      { ic: "star", w: "gold", t: "Peringkat & Tasmi'", d: "Urutan hafalan santri per kelas, dan hasil ujian tasmi' (lulus / ulang).", n: all("setoran").filter(r => r.jenis === "tasmi" && r.lulus && dipP(r.santri)).length, nl: "lulus tasmi'", go: () => nav.go("gabung", { jenis: "peringkatTasmi" }) },
      { ic: "iqro", w: "emerald", t: "Tahsin (Iqro')", d: "Santri yang masih belajar Iqro': jilid, halaman, dan yang siap ujian kenaikan.", n: L.santriList().filter(x => L.santriIqra(x) && dipP(x.id)).length, nl: "santri", go: () => nav.go("rekapTahsin") },
      { ic: "alert", w: "coral", t: "Perlu perhatian", d: "Setoran hari ini yang nilainya di bawah KKM.", n: gagal, nl: "hari ini", tone: gagal ? "red" : "", go: () => nav.go("bawahKkm") }]} />`
    : html`<${Card} title="Menu Pengelolaan"><div class="tiles">
      ${!ro ? html`<${Tile} icon="edit" label="Data Awal Hafalan" color="emerald" onClick=${() => nav.go("dataAwal")} />
      <${Tile} icon="target" label="Target Hafalan" color="orange" onClick=${() => nav.go("targetHafalan")} />
      <${Tile} icon="users" label="Kelola Halaqah" color="teal" onClick=${() => nav.go("halaqahAdmin")} />` : null}
      <${Tile} icon="chart" label="Rekap Tahfidz" color="teal" onClick=${() => nav.go("rekapTahfidz")} />
      <${Tile} icon="iqro" label="Rekap Tahsin" color="emerald" onClick=${() => nav.go("rekapTahsin")} />
      <${Tile} icon="star" label="Peringkat Santri" color="gold" onClick=${() => nav.go("peringkat")} />
      <${Tile} icon="mic" label="Rekap Tasmi'" color="teal" onClick=${() => nav.go("rekapTasmi")} />
      <${Tile} icon="alert" label="Di bawah KKM" color="coral" badge=${gagal || null} onClick=${() => nav.go("bawahKkm")} />
      ${!ro ? html`<${Tile} icon="clock" label="Koreksi Input Tahfidz" color="slate" onClick=${() => nav.go("riwayatModul", { modul: "tahfidz" })} />` : null}</div></${Card}>`}
    <${Card} title="Capaian per halaqah" right=${html`<small>vs target semester</small>`}><div class="list">${HQ.map(a => { const st = halaqahStat(a), g = L.staffById(a.guru) || { pendek: "—" };
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
      const c = a.awalSemHal != null ? L.capaianJuz(s) : null;
      return html`<${Row} name=${s.nama} sub=${`Hafal: ${a.selesai.length ? a.selesai.join(", ") : "—"} · ${L.posLabel(a.aktif, a.baris)}${c ? ` · semester ini +${c.juz.toLocaleString("id-ID")} juz${c.tercapai ? " ✓" : ""}` : ""}`} right=${(S.data.dataAwal || {})[s.id] ? html`<${Pill} t="Diubah" tone="blue" />` : null} onClick=${() => setSel(s.id)} />`; })}</div></${Card}>
    ${sel ? html`<${EditAwal} sid=${sel} onClose=${() => setSel(null)} />` : null}</div>`;
}
function EditAwal({ sid, onClose }) {
  const s = L.santriById(sid);
  // bila hafalan awal semester diisi, data ini menjadi potret posisi SEKARANG (setoran sebelumnya sudah tercakup)
  const save = async a => { const v = { ...a, oleh: me().id, ...(a.awalSemHal != null ? { ts: Date.now(), tgl: L.today() } : {}) }; if (a.awalSemHal == null) { delete v.ts; delete v.tgl; }
    if (await put("dataAwal", sid, v)) { toast("Data awal hafalan disimpan"); onClose(); } };
  return html`<${AwalSheet} judul=${s.nama} awal=${L.dataAwal(s)} onClose=${onClose} onSimpan=${save} tombol="Simpan" />`;
}

export function TargetHafalan() {
  useApp();
  const [v, setV] = useState(L.targetSemester());
  const save = async () => { await put("target", "semester", { juz: Number(v) || 2, v2: true }); toast("Target hafalan disimpan"); nav.back(); };
  const hs = (Number(v) || 2) * 20, bl = hs / L.BULAN_AKTIF, pk = bl / L.PEKAN_PER_BULAN, f = x => (Math.round(x * 10) / 10).toLocaleString("id-ID");
  const cs = L.santriList().map(s => L.capaianJuz(s)), ok = cs.filter(c => c.tercapai).length;
  return html`<${SubHeader} title="Target Hafalan" sub="Hafalan baru per semester" /><div class="wrap">
    <${Hint}>Target dihitung dari hafalan BARU sejak awal semester (dari data awal hafalan), bukan total semua hafalan. Berlaku untuk semua santri.</${Hint}>
    <${Card}><${Field} label="Target hafalan baru per semester (juz)"><${Stepper} value=${v} onChange=${x => setV(Math.round(x * 2) / 2)} min=${0.5} max=${10} step=${0.5} label="target juz per semester" /></${Field}>
      <div class="kv"><span>Per bulan (${L.BULAN_AKTIF} bulan aktif)</span><b>${f(bl)} halaman</b></div><div class="kv"><span>Per pekan</span><b>${f(pk)} halaman</b></div><div class="kv"><span>Per hari halaqah</span><b>±1 halaman tiap ${f(5 / pk)} hari</b></div>
      <div class="stats two"><${Stat} label="Sudah mencapai" value=${ok} sub="santri" /><${Stat} label="Rata capaian" value=${(cs.reduce((x, c) => x + c.juz, 0) / Math.max(1, cs.length)).toFixed(2)} sub="juz baru" /></div></${Card}>
    <${Btn} onClick=${save} icon="check">Simpan target</${Btn}></div>`;
}

export function KinerjaTahfidz() {
  useApp();
  const tgl = L.today(), p = usePeriode("bulanan", null, "halaqah"), guru = L.staffAktif().filter(s => L.HALAQAH.some(h => h.guru === s.id));
  return html`<${SubHeader} title="Kinerja Guru Tahfidz" sub=${`${L.HALAQAH.length} halaqah · absen per sesi`} />
    <div class="wrap rp-wrap">
      ${L.adaHalaqah(tgl) ? html`<${Card} title="Hari ini" right=${html`<small>${L.fmtShort(tgl)}</small>`}><div class="list">
        ${L.HALAQAH.map(h => { const g = L.staffAman(h.guru), ss = L.sesiHari(tgl).map(s => !!get("absenHalaqah", L.halaqahKey(h.id, tgl, s))), set = all("setoran").filter(r => r.tanggal === tgl && L.santriHalaqah(h.id).some(s => s.id === r.santri)).length;
          return html`<div class="row"><span class="av">${L.initials(String(g.pendek || g.nama).replace(/^Ust(dzh)?\.\s*/, ""))}</span><span class="row-t"><b>${h.nama}</b><small>${g.nama} · ${set} setoran hari ini</small>
            <span style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">${L.sesiHari(tgl).map((s, i) => html`<${Pill} t=${(ss[i] ? "✓ " : "") + s} tone=${ss[i] ? "green" : "muted"} />`)}</span></span></div>`; })}</div></${Card}>` : null}
      ${p.bar}
      <${Evaluasi} judulLuar=${false} ev=${denganLalu(x => evKinerja(guru, x, { judul: "Kinerja guru halaqah" }), p.jenis, p.rg)} /></div>`;
}

export function RekapHalaqah() {
  useApp();
  return html`<${SubHeader} title="Rekap Halaqah" sub="11 halaqah · 103 santri" /><div class="wrap">
    ${L.ASRAMA.map(a => { const st = halaqahStat(a); return html`<${Card} title=${a.nama} right=${html`<button class="link" onClick=${() => nav.go("progres", { aid: a.id })}>Detail</button>`}>
      <div class="small mb8">${L.staffAman(a.musyrif).nama} · Pondok ${a.pondok}</div>
      <div class="stats"><${Stat} label="Santri" value=${st.n} /><${Stat} label="Rata hafalan" value=${st.avg.toFixed(1)} sub="juz" /><${Stat} label="Hadir" value=${st.hadir == null ? "—" : st.hadir + "%"} /></div></${Card}>`; })}</div>`;
}

export function Peringkat({ gabung: g }) {
  useApp();
  const [k, setK] = useState("all");
  const list = L.santriList().filter(s => k === "all" || s.kelas === k).map(s => ({ s, h: L.hafalan(s) })).sort((a, b) => b.h.jumlah - a.h.jumlah).slice(0, 30);
  return html`<${SubHeader} title=${g ? g.t : "Peringkat Santri"} sub="Berdasarkan total hafalan">${g ? g.seg : null}<${Seg} small items=${[["all", "Semua"], ["7", "Kls 7"], ["8", "Kls 8"], ["9A", "9A"], ["9B", "9B"]]} value=${k} onChange=${setK} /></${SubHeader}>
    <div class="wrap"><${Card}><div class="list">${list.map(({ s, h }, i) => html`<button class="row" onClick=${() => nav.go("santri", { sid: s.id })}><span class=${"av " + (i < 3 ? "gold" : "")}>${i + 1}</span>
      <span class="row-t"><b>${s.nama}</b><small>Kelas ${s.kelas} · sedang Juz ${h.aktif}</small></span><b style="color:#0B5D3B">${L.fmtJumlah(h)}</b></button>`)}</div></${Card}></div>`;
}

export function RekapTasmi({ gabung: g }) {
  useApp();
  const l = all("setoran").filter(r => r.jenis === "tasmi").sort((a, b) => b.ts - a.ts);
  return html`<${SubHeader} title=${g ? g.t : "Rekap Tasmi'"} sub=${`${l.filter(r => r.lulus).length} lulus · ${l.filter(r => !r.lulus).length} ulang`}>${g ? g.seg : null}</${SubHeader}><div class="wrap"><${Card}>
    ${l.length ? html`<div class="list">${l.map(r => html`<${Row} name=${L.santriAman(r.santri).nama} sub=${`Juz ${r.juz} · ${L.fmtTgl(r.tanggal)} · penguji ${r.penguji || "—"}`} right=${html`<${Pill} t=${(r.lulus ? "Lulus " : "Ulang ") + r.nilai} tone=${r.lulus ? "green" : "red"} />`} />`)}</div>` : html`<${Empty} t="Belum ada tasmi'." icon="mic" />`}</${Card}></div>`;
}

export function BawahKkm() {
  useApp();
  const tgl = L.today(), l = all("setoran").filter(r => r.tanggal === tgl && !r.lulus).sort((a, b) => b.ts - a.ts);
  return html`<${SubHeader} title="Di bawah KKM" sub=${"Setoran hari ini · " + L.fmtTgl(tgl)} /><div class="wrap"><${Card}>
    ${l.length ? html`<div class="list">${l.map(r => html`<${Row} name=${L.santriAman(r.santri).nama} sub=${`${r.jenis} · Juz ${r.juz} · ${L.staffAman(r.guru).pendek}`} right=${html`<${Pill} t=${r.nilai} tone="red" />`} />`)}</div>` : html`<${Empty} t="Tidak ada setoran di bawah KKM hari ini." icon="check" />`}</${Card}></div>`;
}
