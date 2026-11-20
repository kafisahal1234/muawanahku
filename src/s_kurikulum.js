import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Tile, Card, SubHeader, Stat, Row, Pill, Btn, Empty, Field, Seg, Section, Sheet, Bar } from "./ui.js";
import { S, all, get, put, toast, uid } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { me } from "./common.js";

export function slotStatus(j, tgl) {
  const d = get("absenKelas", L.absenKelasKey(j.id, tgl));
  const iz = all("izinGuru").some(i => i.guru === j.guru && i.tanggal === tgl);
  if (iz && !d) return ["Izin", "muted"];
  if (!d) return ["Belum absen", "red"];
  return d.materi ? ["Lengkap", "green"] : ["Jurnal belum", "gold"];
}

export function Kurikulum({ ro }) {
  useApp();
  const tgl = L.today(), hari = L.hariIni(), slots = L.jadwalAll().filter(j => j.hari === hari).sort((a, b) => a.jam.localeCompare(b.jam) || a.kelas.localeCompare(b.kelas));
  const ok = slots.filter(j => get("absenKelas", L.absenKelasKey(j.id, tgl))).length;
  const kosong = slots.filter(j => { const d = get("absenKelas", L.absenKelasKey(j.id, tgl)); return !d || !d.materi; }).length;
  const izin = all("izinGuru").filter(i => i.tanggal === tgl).length;
  return html`<${SubHeader} title="Kurikulum" sub=${ro ? "Pemantauan Mudir" : `Wadir Kurikulum · ${me().pendek}`} />
    <div class="wrap"><${Card}><div class="stats"><${Stat} label="Terlaksana" value=${`${ok}/${slots.length}`} sub=${hari} /><${Stat} label="Jurnal kosong" value=${kosong} tone=${kosong ? "red" : ""} /><${Stat} label="Guru izin" value=${izin} tone=${izin ? "gold" : ""} /></div></${Card}>
    <${Card} title="Menu Kurikulum"><div class="tiles">
      ${!ro ? html`<${Tile} icon="clock" label="Jam Pelajaran" color="teal" onClick=${() => nav.go("jamPelajaran")} />` : null}
      <${Tile} icon="calendar" label="Jadwal Mengajar" color="orange" onClick=${() => nav.go("jadwal", { ro })} />
      <${Tile} icon="layers" label="Mapel & Pengampu" color="blue" onClick=${() => nav.go("pengampu")} />
      <${Tile} icon="award" label="Rekap Nilai" color="gold" onClick=${() => nav.go("rekapNilai")} />
      <${Tile} icon="briefcase" label="Izin Guru" color="slate" onClick=${() => nav.go("rekapIzinGuru")} /></div></${Card}>
    <${Card} title="Keterlaksanaan hari ini" right=${html`<small>${hari}</small>`}>${slots.length ? html`<div class="list">${slots.map(j => { const [t, tone] = slotStatus(j, tgl), g = L.staffById(j.guru);
      return html`<${Row} name=${`${g.pendek} · ${L.mapelById(j.mapel).nama}`} sub=${`Kelas ${j.kelas} · ${L.jamById(j.jam).nama}`} right=${html`<${Pill} t=${t} tone=${tone} />`} />`; })}</div>` : html`<${Empty} t="Hari ini tidak ada jadwal pelajaran." icon="calendar" />`}</${Card}></div>`;
}

export function JamPelajaran() {
  return html`<${SubHeader} title="Jam Pelajaran" sub="Diatur Wadir Kurikulum" /><div class="wrap">
    <${Card} title="Hari aktif"><div class="kv"><span>KBM mapel</span><b>Senin – Jumat</b></div><div class="kv"><span>Halaqah tahfidz</span><b>Senin – Sabtu</b></div><div class="kv"><span>Sabtu</span><b>Halaqah Shubuh saja</b></div><div class="kv"><span>Ahad</span><b>Libur</b></div>
      <div class="chips mt8">${DATA.hari.map(h => html`<${Pill} t=${h} />`)}</div></${Card}>
    <${Card} title="Jam pelajaran"><div class="list">${DATA.jam.map(j => html`<${Row} name=${j.nama} sub=${`${j.mulai} – ${j.selesai}`} icon=${html`<${Icon} n="clock" s=${18} />`} />`)}</div></${Card}>
    <p class="fab-note">Di versi Base44, hari dan jam bisa diubah. Di demo ini tampil saja.</p></div>`;
}

export function Jadwal({ ro }) {
  useApp();
  const [hari, setHari] = useState(DATA.hari.includes(L.hariIni()) ? L.hariIni() : "Senin");
  const [edit, setEdit] = useState(null);
  const js = L.jadwalAll().filter(j => j.hari === hari);
  const cell = (jam, k) => js.find(j => j.jam === jam && j.kelas === k);
  const kelas = ["7", "8", "9A", "9B"];
  const nB = (() => { const all2 = L.jadwalAll(); return all2.filter(j => L.bentrok(j, j.id).length).length; })();
  return html`<${SubHeader} title="Jadwal Mengajar" sub="Semester ganjil 2026/2027"><${Seg} small items=${DATA.hari.map(h => [h, h.slice(0, 3)])} value=${hari} onChange=${setHari} /></${SubHeader}>
    <div class="wrap">${nB ? html`<div class="note red"><${Icon} n="alert" s=${18} />Ada ${nB} jadwal bentrok. Periksa sel bergaris merah.</div>` : null}
    <${Card} title=${hari} right=${!ro ? html`<small>Ketuk sel untuk ubah</small>` : null}><div class="grid-j"><span class="hd">Jam</span>${kelas.map(k => html`<span class="hd">${k}</span>`)}
      ${DATA.jam.map(jm => html`<span class="hd" style="text-align:left;font-size:10.5px">${jm.nama}<br /><small>${jm.mulai}</small></span>${kelas.map(k => { const c = cell(jm.id, k), b = c && L.bentrok(c, c.id).length;
        return html`<button class=${"cell " + (c ? "c-" + c.mapel : "empty")} style=${b ? "outline:2px solid #D9432F" : ""} disabled=${ro} onClick=${() => setEdit({ hari, jam: jm.id, kelas: k, cur: c })}>
          ${c ? html`${L.mapelById(c.mapel).nama.replace("Pendidikan ", "")}<small>${L.staffById(c.guru).pendek.replace(/^Ust(dzh)?\.\s*/, "")}</small>` : "+"}</button>`; })}`)}</div></${Card}>
    ${edit ? html`<${EditSlot} e=${edit} onClose=${() => setEdit(null)} />` : null}</div>`;
}
function EditSlot({ e, onClose }) {
  const [mapel, setMapel] = useState(e.cur ? e.cur.mapel : "");
  const guru0 = e.cur ? e.cur.guru : "";
  const [guru, setGuru] = useState(guru0);
  const guruOpts = L.STAFF.filter(s => s.roles.includes("guru_mapel"));
  const g = guru || (mapel ? (L.pengampu(mapel, e.kelas) || {}).id : "");
  const slot = { hari: e.hari, jam: e.jam, kelas: e.kelas, mapel, guru: g };
  const id = e.cur ? e.cur.id : `${e.hari.slice(0, 3).toLowerCase()}-${e.jam}-${e.kelas}`;
  const bt = mapel && g ? L.bentrok(slot, id) : [];
  const save = async () => { if (await put("jadwal", id, slot)) { toast("Jadwal diperbarui"); onClose(); } };
  const hapus = async () => { if (await put("jadwal", id, { ...slot, hapus: true })) { toast("Jadwal dikosongkan"); onClose(); } };
  return html`<${Sheet} open=${true} title=${`${e.hari} · ${L.jamById(e.jam).nama} · Kelas ${e.kelas}`} onClose=${onClose}>
    <${Field} label="Mata pelajaran"><select class="in" value=${mapel} onChange=${x => { setMapel(x.target.value); setGuru(""); }}><option value="">Pilih mapel</option>${DATA.mapel.map(m => html`<option value=${m.id}>${m.nama}</option>`)}</select></${Field}>
    <${Field} label="Guru" hint="Otomatis pengampu kelas ini, bisa diganti"><select class="in" value=${g} onChange=${x => setGuru(x.target.value)}><option value="">Pilih guru</option>${guruOpts.map(s => html`<option value=${s.id}>${s.nama}</option>`)}</select></${Field}>
    ${bt.length ? html`<div class="note red"><${Icon} n="alert" s=${18} /><span>Bentrok: ${bt.map(b => `${L.staffById(b.guru).pendek} mengajar ${L.mapelById(b.mapel).nama} di kelas ${b.kelas}`).join("; ")} pada jam yang sama.</span></div>` : null}
    <div class="btn-row">${e.cur ? html`<${Btn} kind="ghost" onClick=${hapus}>Kosongkan</${Btn}>` : null}<${Btn} disabled=${!mapel || !g || bt.length} onClick=${save}>Simpan</${Btn}></div></${Sheet}>`;
}

export function Pengampu() {
  return html`<${SubHeader} title="Mapel & Pengampu" sub="Semester ganjil 2026/2027" /><div class="wrap">${DATA.mapel.map(m => html`<${Card} title=${m.nama}><div class="list">
    ${["7", "8", "9A", "9B"].map(k => { const g = L.pengampu(m.id, k); return html`<${Row} name=${"Kelas " + k} sub=${g ? g.nama : "Belum ada pengampu"} icon=${html`<${Icon} n="users" s=${18} />`} />`; })}</div>
    <div class="chips mt8">${m.aspek.map(a => html`<${Pill} t=${a} tone="blue" />`)}</div></${Card}>`)}</div>`;
}

export function KinerjaGuru() {
  useApp();
  const wk = L.weekStart(L.today()), end = L.addDays(wk, 6);
  const guru = L.STAFF.filter(s => s.roles.includes("guru_mapel"));
  const rows = guru.map(g => {
    const jad = L.jadwalAll().filter(j => j.guru === g.id);
    const ab = all("absenKelas").filter(d => d.guru === g.id && d.tanggal >= wk && d.tanggal <= end);
    const jur = ab.filter(d => d.materi).length; const iz = all("izinGuru").filter(i => i.guru === g.id && i.tanggal >= wk && i.tanggal <= end).length;
    return { g, jad: jad.length, ab: ab.length, jur, iz };
  });
  return html`<${SubHeader} title="Kinerja Guru Mapel" sub=${`Pekan ${L.fmtShort(wk)} – ${L.fmtShort(end)}`} /><div class="wrap"><${Card}><div class="list">
    ${rows.map(r => html`<div class="row"><span class="av">${L.initials(r.g.pendek.replace(/^Ust(dzh)?\.\s*/, ""))}</span><span class="row-t"><b>${r.g.nama}</b>
      <small>${r.jad} jadwal/pekan · ${r.ab} terlaksana · ${r.jur} jurnal · ${r.iz} izin</small><span style="display:block;margin-top:6px"><${Bar} v=${(r.ab / Math.max(1, r.jad)) * 100} /></span></span></div>`)}</div></${Card}></div>`;
}

export function RekapKehadiran() {
  useApp();
  return html`<${SubHeader} title="Rekap Kehadiran Kelas" sub="Dari absen kelas semua mapel" /><div class="wrap"><${Card}><div class="list">
    ${["7", "8", "9A", "9B"].map(k => { const ps = L.santriKelas(k).map(s => L.kehadiranKelas(s.id).pct).filter(x => x != null); const avg = ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : null;
      return html`<${Row} name=${"Kelas " + k} sub=${`${L.santriKelas(k).length} santri · ${all("absenKelas").filter(d => d.kelas === k).length} pertemuan`} right=${avg == null ? html`<${Pill} t="Belum ada" tone="muted" />` : html`<${Pill} t=${avg + "%"} tone=${avg >= 80 ? "green" : "red"} />`} onClick=${() => nav.go("rekapKelas", { kelas: k })} />`; })}</div></${Card}></div>`;
}

export function RekapNilai() {
  useApp();
  return html`<${SubHeader} title="Rekap Nilai" sub="Rata-rata nilai akhir per kelas" /><div class="wrap">${["7", "8", "9A", "9B"].map(k => html`<${Card} title=${"Kelas " + k}><div class="list">
    ${DATA.mapel.map(m => { const v = L.santriKelas(k).map(s => (L.nilaiAkhir(s.id, m.id) || {}).akhir).filter(x => x != null); const avg = v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; const low = v.filter(x => x < 70).length;
      return html`<${Row} name=${m.nama} sub=${v.length ? `${v.length} santri dinilai · ${low} di bawah KKM` : "Belum ada nilai"} icon=${html`<${Icon} n="award" s=${18} />`} right=${avg == null ? "—" : html`<${Pill} t=${avg} tone=${avg >= 70 ? "green" : "red"} />`} />`; })}</div></${Card}>`)}</div>`;
}

export function RekapIzinGuru() {
  useApp();
  const l = all("izinGuru").sort((a, b) => b.ts - a.ts);
  return html`<${SubHeader} title="Izin Guru" sub="Tercatat tanpa persetujuan" /><div class="wrap"><${Card}>${l.length ? html`<div class="list">${l.map(i => html`<${Row} name=${L.staffById(i.guru).nama} sub=${`${i.jenis} · ${L.fmtTgl(i.tanggal)} · ${i.alasan || "—"}`} />`)}</div>` : html`<${Empty} t="Belum ada izin guru." />`}</${Card}></div>`;
}
