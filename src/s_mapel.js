import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Tile, Card, SubHeader, Stat, Row, Pill, Btn, Empty, Field, Seg, StatusPick, Section, Sheet, Bar, AbsenItem, Counts, Hint } from "./ui.js";
import { S, all, get, put, toast } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { AbsenSelesai } from "./common.js";
import { logUbah } from "./s_koreksi.js";
import { me } from "./common.js";
import { ImporNilai } from "./s_ai.js";

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
          return html`<button class="sched" onClick=${() => nav.go(d && !d.materi ? "jurnalKelas" : "absenKelas", { jid: j.id, kelas: j.kelas, mapel })}><span class="tm">${jm.nama}<small>${jm.mulai}–${jm.selesai}</small></span>
            <span style="flex:1"><b>${m.nama} · ${j.kelas}</b><div class="small">${L.santriKelas(j.kelas).length} santri · Pondok ${j.kelas.startsWith("9") ? "21" : "29"}</div></span>
            ${d ? html`<${Pill} t=${d.materi ? "Selesai" : "Isi jurnal"} tone=${d.materi ? "green" : "gold"} />` : html`<${Pill} t="Isi absen" tone="blue" />`}</button>`; })
        : html`<${Empty} t=${`Tidak ada jadwal ${m.nama} hari ${hari}.`} icon="calendar" />`}
        <div class="mt8"><${Btn} kind="ghost" icon="plus" onClick=${() => nav.go("absenKelasPilih", { mapel })}>Absen di luar jadwal</${Btn}></div></${Card}>
      <${Card} title="Menu"><div class="tiles">
        <${Tile} icon="checksq" label="Absen Kelas" color="blue" onClick=${() => nav.go("absenKelasPilih", { mapel })} />
        <${Tile} icon="bookopen" label="Jurnal Mengajar" color="green" badge=${jurnalKosong(st, mapel).length || null} onClick=${() => nav.go("jurnalPilih", { mapel })} />
        <${Tile} icon="edit" label="Input Nilai" color="orange" onClick=${() => nav.go("nilaiPilih", { mapel })} />
        <${Tile} icon="chart" label="Rekap Kelas" color="teal" onClick=${() => nav.go("rekapMapel", { modul: "mapel" })} />
        <${Tile} icon="briefcase" label="Izin Guru" color="slate" onClick=${() => nav.go("izinGuru")} />
        <${Tile} icon="clock" label="Riwayat & Koreksi" color="coral" onClick=${() => nav.go("riwayatModul", { modul: "mapel" })} />
</div></${Card}>
      </div>`;
}

export function AbsenKelasPilih({ mapel }) {
  const st = me(), m = L.mapelById(mapel);
  return html`<${SubHeader} title="Pilih kelas" sub=${"Absen kelas " + m.nama} /><div class="wrap"><${Card}><div class="list">
    ${kelasAjar(st, mapel).map(k => html`<${Row} name=${"Kelas " + k} sub=${L.santriKelas(k).length + " santri"} icon=${html`<${Icon} n="users" s=${18} />`} onClick=${() => nav.go("absenKelas", { jid: `luar-${mapel}-${k}`, kelas: k, mapel })} />`)}</div></${Card}></div>`;
}

export function AbsenKelas({ jid, kelas, mapel, tgl: t0, ubah }) {
  useApp();
  const tgl = t0 || L.today(), key = L.absenKelasKey(jid, tgl), ex = get("absenKelas", key), list = L.santriKelas(kelas), m = L.mapelById(mapel);
  const [st, setSt] = useState(() => { const o = {}; list.forEach(s => (o[s.id] = (ex && ex.status[s.id]) || (L.sedangIzin(s.id) ? "I" : "H"))); return o; });
  const save = async () => {
    const rec = { jadwal: jid, kelas, mapel, guru: (ex && ex.guru) || me().id, tanggal: tgl, status: st, materi: ex ? ex.materi || "" : "", target: ex ? ex.target || "" : "", ts: ex ? ex.ts : Date.now(), ...(ex ? { diubah: { oleh: me().id, ts: Date.now() } } : {}) };
    if (await put("absenKelas", key, rec)) {
      if (ex) { await logUbah("ubah", "absenKelas", key, `Absen kelas ${kelas} ${m.nama} ${L.fmtTgl(tgl)}`, ex); toast("Absen kelas diperbarui"); nav.back(); return; }
      toast("Absen kelas tersimpan. Jurnal bisa diisi di menu Jurnal Mengajar.");
    }
  };
  if (ex && !ubah) return html`<${SubHeader} title=${"Absen Kelas " + kelas} sub=${`${m.nama} · ${L.fmtTgl(tgl)}`} />
    <${AbsenSelesai} judul=${`Absen kelas ${kelas} sudah diisi`} oleh=${ex.guru} ts=${ex.ts} st=${ex.status} grup=${[{ nama: "Kelas " + kelas, list }]} modul="mapel"
      extra=${html`<${Card} title="Jurnal mengajar" cls="kv-card" right=${html`<button class="link" onClick=${() => nav.go("jurnalKelas", { jid, kelas, mapel, tgl })}>${ex.materi ? "Ubah" : "Isi jurnal"}</button>`}><div class="kv"><span>Materi</span><b class=${ex.materi ? "" : "kosong"}>${ex.materi || "Belum diisi"}</b></div><div class="kv"><span>Target</span><b class=${ex.target ? "" : "kosong"}>${ex.target || "Belum diisi"}</b></div></${Card}>`} />`;
  return html`<${SubHeader} title=${(ex ? "Koreksi Absen Kelas " : "Absen Kelas ") + kelas} sub=${`${m.nama} · ${L.fmtTgl(tgl)}`} />
    <div class="wrap"><div class="mb8"><${Counts} st=${st} /></div>
    <${Card} title=${`${list.length} santri`}>${list.map(s => html`<${AbsenItem} s=${s} sub=${L.sedangIzin(s.id) ? "Sedang izin · otomatis" : null} value=${st[s.id]} onChange=${v => setSt({ ...st, [s.id]: v })} />`)}</${Card}>
    <div class="sticky-act"><${Btn} onClick=${save} icon="check">${ex ? "Simpan perubahan" : "Simpan absen"}</${Btn}></div></div>`;
}

// ---------- Jurnal Mengajar (menu terpisah dari absen; disimpan pada pertemuan yang sama) ----------
const HARI_JURNAL = 14;
const pertemuanSaya = (st, mapel) => { const batas = L.ymd(new Date(Date.now() - HARI_JURNAL * 864e5)); return all("absenKelas").filter(d => d.guru === st.id && d.mapel === mapel && d.tanggal >= batas).sort((a, b) => (b.tanggal + b.jadwal).localeCompare(a.tanggal + a.jadwal)); };
export const jurnalKosong = (st, mapel) => pertemuanSaya(st, mapel).filter(d => !d.materi);
const labelPertemuan = d => { const j = L.jadwalAll().find(x => x.id === d.jadwal), jm = j ? L.jamById(j.jam) : null; return `${L.fmtTgl(d.tanggal)}${jm ? " · " + jm.nama : " · di luar jadwal"}`; };

export function JurnalPilih({ mapel }) {
  useApp();
  const st = me(), m = L.mapelById(mapel), tgl = L.today(), hari = L.hariIni(), semua = pertemuanSaya(st, mapel), kosong = semua.filter(d => !d.materi), isi = semua.filter(d => d.materi);
  const belumAbsen = L.jadwalAll().filter(j => j.guru === st.id && j.mapel === mapel && j.hari === hari && !get("absenKelas", L.absenKelasKey(j.id, tgl)));
  const baris = d => html`<${Row} name=${`Kelas ${d.kelas}`} sub=${d.materi ? `${labelPertemuan(d)} · ${d.materi}` : labelPertemuan(d)} icon=${html`<${Icon} n="bookopen" s=${18} />`}
    right=${html`<${Pill} t=${d.materi ? "Terisi" : "Isi jurnal"} tone=${d.materi ? "green" : "gold"} />`} onClick=${() => nav.go("jurnalKelas", { jid: d.jadwal, kelas: d.kelas, mapel, tgl: d.tanggal })} />`;
  return html`<${SubHeader} title="Jurnal Mengajar" sub=${`${m.nama} · ${HARI_JURNAL} hari terakhir`} /><div class="wrap">
    <${Card} title=${`Belum diisi (${kosong.length})`}>${kosong.length ? html`<div class="list">${kosong.map(baris)}</div>` : html`<${Empty} t="Semua jurnal sudah diisi." icon="check" />`}</${Card}>
    ${belumAbsen.length ? html`<${Card} title="Jadwal hari ini — absen dulu"><p class="small" style="margin:-4px 0 6px">Jurnal diisi setelah absen kelas pada pertemuan tersebut.</p><div class="list">${belumAbsen.map(j => { const jm = L.jamById(j.jam); return html`<${Row} name=${`Kelas ${j.kelas}`} sub=${`${hari} · ${jm.nama} ${jm.mulai}–${jm.selesai}`} icon=${html`<${Icon} n="checksq" s=${18} />`} right=${html`<${Pill} t="Isi absen" tone="blue" />`} onClick=${() => nav.go("absenKelas", { jid: j.id, kelas: j.kelas, mapel })} />`; })}</div></${Card}>` : null}
    ${isi.length ? html`<${Card} title=${`Sudah diisi (${isi.length})`}><div class="list">${isi.map(baris)}</div></${Card}>` : null}
  </div>`;
}

export function JurnalKelas({ jid, kelas, mapel, tgl: t0 }) {
  useApp();
  const tgl = t0 || L.today(), key = L.absenKelasKey(jid, tgl), ex = get("absenKelas", key), m = L.mapelById(mapel);
  const [materi, setMateri] = useState(ex ? ex.materi || "" : ""); const [target, setTarget] = useState(ex ? ex.target || "" : "");
  if (!ex) return html`<${SubHeader} title=${"Jurnal Kelas " + kelas} sub=${`${m.nama} · ${L.fmtTgl(tgl)}`} /><div class="wrap"><${Card}><${Empty} t="Absen kelas untuk pertemuan ini belum diisi. Isi absen dulu, lalu jurnal." icon="checksq" />
    <${Btn} onClick=${() => nav.go("absenKelas", { jid, kelas, mapel, tgl })} icon="checksq">Isi absen kelas</${Btn}></${Card}></div>`;
  const save = async () => {
    if (!materi.trim()) { toast("Materi wajib diisi", "err"); return; }
    if (await put("absenKelas", key, { ...ex, materi: materi.trim(), target: target.trim(), ...(ex.materi ? { diubah: { oleh: me().id, ts: Date.now() } } : {}) })) {
      if (ex.materi) await logUbah("ubah", "absenKelas", key, `Jurnal kelas ${kelas} ${m.nama} ${L.fmtTgl(tgl)}`, ex);
      toast(ex.materi ? "Jurnal diperbarui" : "Jurnal tersimpan"); nav.back();
    }
  };
  return html`<${SubHeader} title=${(ex.materi ? "Ubah Jurnal Kelas " : "Jurnal Kelas ") + kelas} sub=${`${m.nama} · ${L.fmtTgl(tgl)}`} />
    <div class="wrap"><${Card} title="Jurnal mengajar"><${Field} label="Materi yang diajarkan"><input class="in" value=${materi} placeholder="Misal: Descriptive text" onInput=${e => setMateri(e.target.value)} /></${Field}>
      <${Field} label="Target untuk siswa"><textarea class="in" value=${target} placeholder="Misal: siswa mampu menyusun 1 paragraf" onInput=${e => setTarget(e.target.value)}></textarea></${Field}></${Card}>
    <div class="sticky-act"><${Btn} onClick=${save} icon="check">${ex.materi ? "Simpan perubahan" : "Simpan jurnal"}</${Btn}></div></div>`;
}

export function NilaiPilih({ mapel }) {
  useApp();
  const st = me(), m = L.mapelById(mapel);
  return html`<${SubHeader} title="Input Nilai" sub=${m.nama} /><div class="wrap"><${Card}><div class="list">
    ${kelasAjar(st, mapel).map(k => { const d = get("nilaiMapel", L.nilaiKey(mapel, k)); const n = d ? Object.keys(d.pas || {}).length : 0;
      return html`<${Row} name=${"Kelas " + k} sub=${`${L.santriKelas(k).length} santri`} icon=${html`<${Icon} n="edit" s=${18} />`} right=${html`<${Pill} t=${n ? n + " terisi" : "Belum"} tone=${n ? "green" : "muted"} />`} onClick=${() => nav.go("nilaiMapel", { mapel, kelas: k })} />`; })}</div></${Card}></div>`;
}

// Nilai projek bisa lebih dari satu: guru menambah projek (nama), nilai projek di rapor = rata-rata semua projek yang sudah dinilai
export function NilaiMapel({ mapel, kelas }) {
  useApp();
  const m = L.mapelById(mapel), list = L.santriKelas(kelas), key = L.nilaiKey(mapel, kelas), ex = get("nilaiMapel", key) || {};
  const [tab, setTab] = useState("projek");
  const [pl, setPl] = useState(() => ex.projekList ? ex.projekList.map(x => ({ ...x })) : ex.projek && Object.keys(ex.projek).length ? [{ id: "p1", nama: "Projek 1" }] : [{ id: "p1", nama: "Projek 1" }]);
  const [pn, setPn] = useState(() => JSON.parse(JSON.stringify(ex.projekNilai || (ex.projek ? { p1: ex.projek } : {}))));
  const [pa, setPa] = useState(pl[0] ? pl[0].id : null); const [ed, setEd] = useState(null);
  const [v, setV] = useState(() => ({ pts: { ...(ex.pts || {}) }, pas: { ...(ex.pas || {}) } }));
  const [asp, setAsp] = useState(() => JSON.parse(JSON.stringify(ex.aspek || {})));
  const clamp = val => (val === "" ? "" : Math.max(0, Math.min(100, Number(val))));
  const set = (f, id, val) => setV({ ...v, [f]: { ...v[f], [id]: clamp(val) } });
  const setP = (pid, id, val) => setPn({ ...pn, [pid]: { ...(pn[pid] || {}), [id]: clamp(val) } });
  const setA = (id, i, val) => setAsp({ ...asp, [id]: { ...(asp[id] || {}), [i]: clamp(val) } });
  const rataProjek = id => { const xs = pl.map(p => (pn[p.id] || {})[id]).filter(x => x !== "" && x != null).map(Number); return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null; };
  const hitung = id => L.rumusNilai({ pj: rataProjek(id), uts: v.pts[id], uas: v.pas[id], aspek: m.aspek.map((_, i) => (asp[id] || {})[i]), hadir: L.kehadiranKelas(id, mapel).pct });
  const akhir = id => hitung(id).akhir;
  const save = async () => { const projek = {}; list.forEach(s => { const r = rataProjek(s.id); if (r != null) projek[s.id] = r; });
    if (await put("nilaiMapel", key, { mapel, kelas, projekList: pl.map(x => (x.tgl ? x : { ...x, tgl: L.today() })), projekNilai: pn, projek, ...v, aspek: asp, guru: me().id, ts: Date.now() })) { toast("Nilai tersimpan"); nav.back(); } };
  const tambah = () => { const id = "p" + (Math.max(0, ...pl.map(p => Number(p.id.slice(1)) || 0)) + 1); setEd({ id, nama: `Projek ${pl.length + 1}`, tgl: L.today(), baru: true }); };
  const simpanP = () => { if (!ed.nama.trim()) return; const tgl = ed.tgl || L.today(); if (ed.baru) { setPl([...pl, { id: ed.id, nama: ed.nama.trim(), tgl }]); setPa(ed.id); } else setPl(pl.map(p => (p.id === ed.id ? { ...p, nama: ed.nama.trim(), tgl } : p))); setEd(null); };
  const hapusP = () => { const np = pl.filter(p => p.id !== ed.id), nn = { ...pn }; delete nn[ed.id]; setPl(np); setPn(nn); setPa(np[0] ? np[0].id : null); setEd(null); };
  const num = (val, lab, on) => html`<input type="number" min="0" max="100" inputmode="numeric" value=${val ?? ""} aria-label=${lab} onInput=${e => on(e.target.value)} />`;
  const nm = s => html`<td style="min-width:120px;position:sticky;left:0;background:#fff;z-index:1"><b style="font-size:12.5px">${s.nama}</b></td>`;
  const cur = pl.find(p => p.id === pa);
  const [imp, setImp] = useState(false);
  const pakaiImpor = (h, info) => {
    let npl = [...pl], npn = JSON.parse(JSON.stringify(pn));
    h.projekNama.forEach((nama, i) => { if (!h.projek[i]) return; let p = npl.find(x => x.nama.toLowerCase() === nama.toLowerCase());
      if (!p) { const kosong = npl.find(x => !Object.keys(npn[x.id] || {}).length); if (kosong && npl.length === 1 && /^projek 1$/i.test(kosong.nama)) { kosong.nama = nama; p = kosong; } else { p = { id: "p" + (Math.max(0, ...npl.map(x => Number(x.id.slice(1)) || 0)) + 1), nama, tgl: L.today() }; npl.push(p); } }
      npn[p.id] = { ...(npn[p.id] || {}), ...h.projek[i] }; });
    setPl(npl); setPn(npn); if (npl[0]) setPa(npl[0].id);
    setV({ pts: { ...v.pts, ...h.pts }, pas: { ...v.pas, ...h.pas } });
    const na = { ...asp }; Object.entries(h.aspek).forEach(([sid, o]) => { na[sid] = { ...(na[sid] || {}), ...o }; }); setAsp(na);
    setImp(false);
    toast(`Nilai ${info.cocok} santri terisi dari ${info.dok}${info.lewat.length ? ` · ${info.lewat.length} nama tidak dikenali` : ""}. Periksa lalu Simpan nilai.`);
  };
  return html`<${SubHeader} title=${`Nilai ${m.nama} · ${kelas}`} sub="Kehadiran dihitung otomatis dari absen kelas"><${Seg} items=${[["projek", `Projek (${pl.length})`], ["komponen", "UTS, UAS & PAS"], ["aspek", "Aspek rapor"]]} value=${tab} onChange=${setTab} /></${SubHeader}>
    <div class="wrap"><button class="up-cta" onClick=${() => setImp(true)}><span class="up-ic"><${Icon} n="upload" s=${22} /></span><span><b>Isi nilai dari dokumen</b><small>Excel, foto daftar nilai, PDF · dibaca AI</small></span><${Icon} n="chev" s=${18} /></button>
    ${imp ? html`<${ImporNilai} mapel=${mapel} kelas=${kelas} onClose=${() => setImp(false)} onHasil=${pakaiImpor} />` : null}
    ${tab === "projek" ? html`<${Hint}>Tambahkan setiap projek yang diberikan semester ini. Nilai projek di rapor = rata-rata semua projek yang sudah dinilai.</${Hint}>
      <div class="proj-chips">${pl.map(p => html`<button type="button" class=${"pchip " + (p.id === pa ? "on" : "")} aria-pressed=${p.id === pa} onClick=${() => (p.id === pa ? setEd({ ...p }) : setPa(p.id))}>${p.nama}${p.tgl ? html` <small style="opacity:.7">${L.fmtShort(p.tgl)}</small>` : null}${p.id === pa ? html` <${Icon} n="edit" s=${14} />` : null}</button>`)}
        <button type="button" class="pchip add" onClick=${tambah}><${Icon} n="plus" s=${16} /> Projek</button></div>
      ${cur ? html`<${Card} title=${cur.nama} right=${html`<small>${Object.values(pn[cur.id] || {}).filter(x => x !== "" && x != null).length}/${list.length} dinilai</small>`}><div class="scroll-x"><table class="tbl"><thead><tr><th>Santri</th><th class="c">Nilai</th><th class="c">Rata projek</th></tr></thead><tbody>
        ${list.map(s => { const r = rataProjek(s.id); return html`<tr>${nm(s)}<td class="c">${num((pn[cur.id] || {})[s.id], cur.nama + " " + s.nama, x => setP(cur.id, s.id, x))}</td><td class="c"><b class=${r == null ? "" : r < 70 ? "t-red" : "t-green"}>${r ?? "—"}</b></td></tr>`; })}</tbody></table></div></${Card}>`
        : html`<${Card}><${Empty} t="Belum ada projek. Ketuk + Projek." icon="layers" /></${Card}>`}`
    : tab === "komponen" ? html`<${Hint}>PAS = 30% projek + 30% UTS + 40% UAS. Nilai akhir = 50% PAS + 35% rata-rata aspek + 15% kehadiran · KKM 70</${Hint}>
    <${Card}><div class="scroll-x"><table class="tbl"><thead><tr><th>Santri</th><th class="c">Hadir</th><th class="c">Projek</th><th class="c">UTS</th><th class="c">UAS</th><th class="c">PAS</th><th class="c">Akhir</th></tr></thead><tbody>
      ${list.map(s => { const hs = hitung(s.id), a = hs.akhir, kh = L.kehadiranKelas(s.id, mapel).pct, r = rataProjek(s.id);
        return html`<tr>${nm(s)}<td class="c">${kh == null ? "—" : kh + "%"}</td><td class="c"><b>${r ?? "—"}</b></td><td class="c">${num(v.pts[s.id], "UTS " + s.nama, x => set("pts", s.id, x))}</td><td class="c">${num(v.pas[s.id], "UAS " + s.nama, x => set("pas", s.id, x))}</td><td class="c">${hs.pas ?? "—"}</td>
          <td class="c"><b class=${a == null ? "" : a < 70 ? "t-red" : "t-green"}>${a ?? "—"}</b></td></tr>`; })}</tbody></table></div></${Card}>`
    : html`<${Hint}>Nilai tiap aspek tampil di rapor bagian B beserta predikatnya. ${m.aspek.map((t, i) => `A${i + 1} = ${t}`).join(" · ")}</${Hint}>
    <${Card}><div class="scroll-x"><table class="tbl"><thead><tr><th>Santri</th>${m.aspek.map((t, i) => html`<th class="c" title=${t}>A${i + 1}</th>`)}</tr></thead><tbody>
      ${list.map(s => html`<tr>${nm(s)}${m.aspek.map((_, i) => html`<td class="c">${num((asp[s.id] || {})[i], m.aspek[i] + " " + s.nama, x => setA(s.id, i, x))}</td>`)}</tr>`)}</tbody></table></div></${Card}>`}
    <div class="sticky-act"><${Btn} onClick=${save} icon="check">Simpan nilai</${Btn}></div></div>
    <${Sheet} open=${!!ed} title=${ed && ed.baru ? "Tambah projek" : "Ubah projek"} onClose=${() => setEd(null)}>${ed ? html`
      <${Field} label="Nama projek"><input class="in" value=${ed.nama} placeholder="Misal: Poster tata cara wudhu" onInput=${e => setEd({ ...ed, nama: e.target.value })} /></${Field}>
      <${Field} label="Tanggal projek" hint="Dipakai untuk rekap projek per pekan/bulan"><input class="in" type="date" value=${ed.tgl || ""} onInput=${e => setEd({ ...ed, tgl: e.target.value })} /></${Field}>
      <div class="btn-row">${!ed.baru ? html`<${Btn} kind="outline" icon="trash" onClick=${hapusP}>Hapus projek</${Btn}>` : null}<${Btn} disabled=${!ed.nama.trim()} onClick=${simpanP}>${ed.baru ? "Tambah" : "Simpan"}</${Btn}></div>
      ${!ed.baru ? html`<p class="small mt8">Menghapus projek juga menghapus nilainya. Perubahan tersimpan setelah menekan Simpan nilai.</p>` : null}` : null}</${Sheet}>`;
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
      return html`<${Row} name=${s.nama} sub=${k.tot ? `${k.tot} pertemuan` : "Belum ada data"} right=${k.pct == null ? "—" : html`<${Pill} t=${k.pct + "%"} tone=${k.pct >= 80 ? "green" : "red"} />`} />`; })}</div></${Card}></div>`;
}
