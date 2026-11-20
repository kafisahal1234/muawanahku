import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Tile, Card, SubHeader, Stat, Row, Pill, Btn, Empty, Field, Seg, StatusPick, Section, Sheet, Bar, AbsenItem, Counts, Hint } from "./ui.js";
import { S, all, get, put, toast } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { me } from "./common.js";

const kelasAjar = (st, mapel) => st.ajar.filter(([m]) => m === mapel).map(([, k]) => k);

export function Mapel({ mapel }) {
  useApp();
  const st = me(), m = L.mapelById(mapel), kelas = kelasAjar(st, mapel), tgl = L.today(), hari = L.hariIni();
  const slots = L.jadwalAll().filter(j => j.guru === st.id && j.mapel === mapel && j.hari === hari).sort((a, b) => a.jam.localeCompare(b.jam));
  const done = slots.filter(j => get("absenKelas", L.absenKelasKey(j.id, tgl))).length;
  const jurnal = slots.filter(j => { const d = get("absenKelas", L.absenKelasKey(j.id, tgl)); return d && d.materi; }).length;
  return html`<${SubHeader} title=${"Mapel " + m.nama} sub=${`${st.pendek} · Kelas ${kelas.join(", ")}`} />
    <div class="wrap">
      <${Card}><div class="stats"><${Stat} label="Jadwal hari ini" value=${slots.length} sub=${hari} /><${Stat} label="Absen kelas" value=${`${done}/${slots.length}`} tone=${done < slots.length ? "gold" : ""} /><${Stat} label="Jurnal" value=${`${jurnal}/${slots.length}`} tone=${jurnal < slots.length ? "gold" : ""} /></div></${Card}>
      <${Card} title="Jadwal mengajar hari ini" right=${html`<small>${hari}</small>`}>
        ${slots.length ? slots.map(j => { const d = get("absenKelas", L.absenKelasKey(j.id, tgl)), jm = L.jamById(j.jam);
          return html`<button class="sched" onClick=${() => nav.go("absenKelas", { jid: j.id, kelas: j.kelas, mapel })}><span class="tm">${jm.nama}<small>${jm.mulai}–${jm.selesai}</small></span>
            <span style="flex:1"><b>${m.nama} · ${j.kelas}</b><div class="small">${L.santriKelas(j.kelas).length} santri · Pondok ${j.kelas.startsWith("9") ? "21" : "29"}</div></span>
            ${d ? html`<${Pill} t=${d.materi ? "Selesai" : "Jurnal belum"} tone=${d.materi ? "green" : "gold"} />` : html`<${Pill} t="Isi absen" tone="blue" />`}</button>`; })
        : html`<${Empty} t=${`Tidak ada jadwal ${m.nama} hari ${hari}.`} icon="calendar" />`}
        <div class="mt8"><${Btn} kind="ghost" icon="plus" onClick=${() => nav.go("absenKelasPilih", { mapel })}>Absen di luar jadwal</${Btn}></div></${Card}>
      <${Card} title="Menu"><div class="tiles">
        <${Tile} icon="checksq" label="Absen & Jurnal" color="blue" onClick=${() => nav.go("absenKelasPilih", { mapel })} />
        <${Tile} icon="edit" label="Input Nilai" color="orange" onClick=${() => nav.go("nilaiPilih", { mapel })} />
        <${Tile} icon="chart" label="Rekap Kehadiran" color="teal" onClick=${() => nav.go("rekapKelasPilih", { mapel })} />
        <${Tile} icon="briefcase" label="Izin Guru" color="slate" onClick=${() => nav.go("izinGuru")} /></div></${Card}>
      </div>`;
}

export function AbsenKelasPilih({ mapel }) {
  const st = me(), m = L.mapelById(mapel);
  return html`<${SubHeader} title="Pilih kelas" sub=${"Absen & jurnal " + m.nama} /><div class="wrap"><${Card}><div class="list">
    ${kelasAjar(st, mapel).map(k => html`<${Row} name=${"Kelas " + k} sub=${L.santriKelas(k).length + " santri"} icon=${html`<${Icon} n="users" s=${18} />`} onClick=${() => nav.go("absenKelas", { jid: `luar-${mapel}-${k}`, kelas: k, mapel })} />`)}</div></${Card}></div>`;
}

export function AbsenKelas({ jid, kelas, mapel, tgl: t0 }) {
  useApp();
  const tgl = t0 || L.today(), key = L.absenKelasKey(jid, tgl), ex = get("absenKelas", key), list = L.santriKelas(kelas), m = L.mapelById(mapel);
  const [st, setSt] = useState(() => { const o = {}; list.forEach(s => (o[s.id] = (ex && ex.status[s.id]) || (L.sedangIzin(s.id) ? "I" : "H"))); return o; });
  const [materi, setMateri] = useState(ex ? ex.materi || "" : ""); const [target, setTarget] = useState(ex ? ex.target || "" : "");
  const c = k => Object.values(st).filter(v => v === k).length;
  const save = async () => {
    if (await put("absenKelas", key, { jadwal: jid, kelas, mapel, guru: me().id, tanggal: tgl, status: st, materi, target, ts: Date.now() })) { toast(materi ? "Absen dan jurnal tersimpan" : "Absen tersimpan, jurnal belum diisi", materi ? "ok" : "err"); nav.back(); }
  };
  return html`<${SubHeader} title=${"Absen Kelas " + kelas} sub=${`${m.nama} · ${L.fmtTgl(tgl)}`} />
    <div class="wrap"><div class="mb8"><${Counts} st=${st} /></div>
    <${Card} title=${`${list.length} santri`}>${list.map(s => html`<${AbsenItem} s=${s} sub=${L.sedangIzin(s.id) ? "Sedang izin · otomatis" : null} value=${st[s.id]} onChange=${v => setSt({ ...st, [s.id]: v })} />`)}</${Card}>
    <${Card} title="Jurnal mengajar"><${Field} label="Materi hari ini"><input class="in" value=${materi} placeholder="Misal: Descriptive text" onInput=${e => setMateri(e.target.value)} /></${Field}>
      <${Field} label="Target untuk siswa"><textarea class="in" value=${target} placeholder="Misal: siswa mampu menyusun 1 paragraf" onInput=${e => setTarget(e.target.value)}></textarea></${Field}></${Card}>
    <div class="sticky-act"><${Btn} onClick=${save} icon="check">Simpan absen & jurnal</${Btn}></div></div>`;
}

export function NilaiPilih({ mapel }) {
  useApp();
  const st = me(), m = L.mapelById(mapel);
  return html`<${SubHeader} title="Input Nilai" sub=${m.nama} /><div class="wrap"><${Card}><div class="list">
    ${kelasAjar(st, mapel).map(k => { const d = get("nilaiMapel", L.nilaiKey(mapel, k)); const n = d ? Object.keys(d.pas || {}).length : 0;
      return html`<${Row} name=${"Kelas " + k} sub=${`${L.santriKelas(k).length} santri`} icon=${html`<${Icon} n="edit" s=${18} />`} right=${html`<${Pill} t=${n ? n + " terisi" : "Belum"} tone=${n ? "green" : "muted"} />`} onClick=${() => nav.go("nilaiMapel", { mapel, kelas: k })} />`; })}</div></${Card}></div>`;
}

export function NilaiMapel({ mapel, kelas }) {
  useApp();
  const m = L.mapelById(mapel), list = L.santriKelas(kelas), key = L.nilaiKey(mapel, kelas), ex = get("nilaiMapel", key) || {};
  const [tab, setTab] = useState("komponen");
  const [v, setV] = useState(() => ({ projek: { ...(ex.projek || {}) }, pts: { ...(ex.pts || {}) }, pas: { ...(ex.pas || {}) } }));
  const [asp, setAsp] = useState(() => JSON.parse(JSON.stringify(ex.aspek || {})));
  const clamp = val => (val === "" ? "" : Math.max(0, Math.min(100, Number(val))));
  const set = (f, id, val) => setV({ ...v, [f]: { ...v[f], [id]: clamp(val) } });
  const setA = (id, i, val) => setAsp({ ...asp, [id]: { ...(asp[id] || {}), [i]: clamp(val) } });
  const akhir = id => { const pj = v.projek[id], pts = v.pts[id], pas = v.pas[id]; if ([pj, pts, pas].some(x => x === "" || x == null)) return null;
    const kh = L.kehadiranKelas(id, mapel).pct; return Math.round((kh == null ? 100 : kh) * 0.1 + pj * 0.3 + pts * 0.25 + pas * 0.35); };
  const save = async () => { if (await put("nilaiMapel", key, { mapel, kelas, ...v, aspek: asp, guru: me().id, ts: Date.now() })) { toast("Nilai tersimpan"); nav.back(); } };
  const inp = (f, s) => html`<input type="number" min="0" max="100" inputmode="numeric" value=${v[f][s.id] ?? ""} aria-label=${f + " " + s.nama} onInput=${e => set(f, s.id, e.target.value)} />`;
  const inpA = (s, i) => html`<input type="number" min="0" max="100" inputmode="numeric" value=${(asp[s.id] || {})[i] ?? ""} aria-label=${m.aspek[i] + " " + s.nama} onInput=${e => setA(s.id, i, e.target.value)} />`;
  return html`<${SubHeader} title=${`Nilai ${m.nama} · ${kelas}`} sub="Kehadiran dihitung otomatis dari absen kelas"><${Seg} items=${[["komponen", "Nilai akhir"], ["aspek", "Nilai per aspek"]]} value=${tab} onChange=${setTab} /></${SubHeader}>
    <div class="wrap">${tab === "komponen" ? html`<${Hint}>Nilai akhir = 10% hadir + 30% projek + 25% PTS + 35% PAS · KKM 70</${Hint}>
    <${Card}><div class="scroll-x"><table class="tbl"><thead><tr><th>Santri</th><th class="c">Hadir</th><th class="c">Projek</th><th class="c">PTS</th><th class="c">PAS</th><th class="c">Akhir</th></tr></thead><tbody>
      ${list.map(s => { const a = akhir(s.id), kh = L.kehadiranKelas(s.id, mapel).pct;
        return html`<tr><td style="min-width:120px"><b style="font-size:12.5px">${s.nama}</b></td><td class="c">${kh == null ? "—" : kh + "%"}</td><td class="c">${inp("projek", s)}</td><td class="c">${inp("pts", s)}</td><td class="c">${inp("pas", s)}</td>
          <td class="c"><b style=${a != null && a < 70 ? "color:#B3261E" : "color:#0B5D3B"}>${a ?? "—"}</b></td></tr>`; })}</tbody></table></div></${Card}>`
    : html`<${Hint}>Nilai tiap aspek tampil di rapor bagian B beserta predikatnya. ${m.aspek.map((t, i) => `A${i + 1} = ${t}`).join(" · ")}</${Hint}>
    <${Card}><div class="scroll-x"><table class="tbl"><thead><tr><th>Santri</th>${m.aspek.map((t, i) => html`<th class="c" title=${t}>A${i + 1}</th>`)}</tr></thead><tbody>
      ${list.map(s => html`<tr><td style="min-width:120px;position:sticky;left:0;background:#fff;z-index:1"><b style="font-size:12.5px">${s.nama}</b></td>${m.aspek.map((_, i) => html`<td class="c">${inpA(s, i)}</td>`)}</tr>`)}</tbody></table></div></${Card}>`}
    <${Btn} onClick=${save} icon="check">Simpan nilai</${Btn}></div>`;
}

export function RekapKelasPilih({ mapel }) {
  const st = me();
  return html`<${SubHeader} title="Rekap Kehadiran" sub=${L.mapelById(mapel).nama} /><div class="wrap"><${Card}><div class="list">
    ${kelasAjar(st, mapel).map(k => html`<${Row} name=${"Kelas " + k} sub=${L.santriKelas(k).length + " santri"} icon=${html`<${Icon} n="chart" s=${18} />`} onClick=${() => nav.go("rekapKelas", { mapel, kelas: k })} />`)}</div></${Card}></div>`;
}
export function RekapKelas({ mapel, kelas }) {
  useApp();
  const list = L.santriKelas(kelas), pert = all("absenKelas").filter(d => d.kelas === kelas && (!mapel || d.mapel === mapel)).length;
  return html`<${SubHeader} title=${`Kehadiran Kelas ${kelas}`} sub=${(mapel ? L.mapelById(mapel).nama : "Semua mapel") + ` · ${pert} pertemuan tercatat`} />
    <div class="wrap"><${Card}><div class="list">${list.map(s => { const k = L.kehadiranKelas(s.id, mapel);
      return html`<${Row} name=${s.nama} sub=${k.tot ? `H ${k.H} · S ${k.S} · I ${k.I} · A ${k.A}` : "Belum ada data"} right=${k.pct == null ? "—" : html`<${Pill} t=${k.pct + "%"} tone=${k.pct >= 80 ? "green" : "red"} />`} />`; })}</div></${Card}></div>`;
}
