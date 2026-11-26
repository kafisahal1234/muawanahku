import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Tile, Card, SubHeader, Stat, Row, Pill, Btn, Empty, Seg, StatusPick, Section, AbsenItem, Counts, Hint, SearchBox } from "./ui.js";
import { all, get, put, toast } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { logUbah } from "./s_koreksi.js";
import { AbsenSelesai } from "./common.js";
import { me } from "./common.js";

const waktuNow = () => { const h = new Date().getHours(); return h < 5 ? "tahajud" : h < 7 ? "subuh" : h < 8 ? "apel" : h < 11 ? "dhuha" : h < 15 ? "dzuhur" : h < 17 ? "ashar" : h < 19 ? "maghrib" : "isya"; };

export function Motd({ tgl: t0, waktu: w0, ubah }) {
  useApp();
  const mine = L.asramaOf(me().id), pondok = mine.pondok, tgl = t0 || L.today();
  const [w, setW] = useState(w0 || waktuNow());
  const isi = k => L.ASRAMA.some(a => a.pondok === pondok && get("motd", L.motdKey(a.id, tgl, k)));
  return html`<${SubHeader} title=${ubah ? "Koreksi Absen MOTD" : "Absen MOTD"} sub=${`Pondok ${pondok} · semua asrama · ${L.fmtShort(tgl)}`}>
    <${Seg} small items=${L.WAKTU.map(([k, l]) => [k, (isi(k) ? "✓ " : "") + l])} value=${w} onChange=${setW} /></${SubHeader}><${MotdList} key=${w + tgl} w=${w} pondok=${pondok} mine=${mine.id} tgl=${tgl} ubah=${ubah} />`;
}
function MotdList({ w, pondok, mine, tgl, ubah }) {
  useApp();
  const asr = L.ASRAMA.filter(a => a.pondok === pondok);
  const [f, setF] = useState("all"); const [q, setQ] = useState("");
  const docs = asr.map(a => get("motd", L.motdKey(a.id, tgl, w))).filter(Boolean);
  const [st, setSt] = useState(() => { const o = {}; asr.forEach(a => { const ex = get("motd", L.motdKey(a.id, tgl, w)); L.santriAsrama(a.id).forEach(s => (o[s.id] = (ex && ex.status[s.id]) || (L.sedangIzin(s.id) ? "I" : "H"))); }); return o; });
  const label = L.WAKTU.find(x => x[0] === w)[1];
  const last = docs.sort((x, y) => y.ts - x.ts)[0];
  const save = async () => {
    let ok = true;
    for (const a of asr) { const sub = {}, ex = get("motd", L.motdKey(a.id, tgl, w)); L.santriAsrama(a.id).forEach(s => (sub[s.id] = st[s.id]));
      ok = (await put("motd", L.motdKey(a.id, tgl, w), { asrama: a.id, pondok, tanggal: tgl, waktu: w, status: sub, guru: (ex && ex.guru) || me().id, ts: ex ? ex.ts : Date.now(), ...(ex ? { diubah: { oleh: me().id, ts: Date.now() } } : {}) })) && ok; }
    if (!ok) return;
    if (last) { await logUbah("ubah", "motd", L.motdKey(mine, tgl, w), `Absen MOTD ${label} Pondok ${pondok} ${L.fmtTgl(tgl)}`); toast(`Absen ${label} diperbarui`); nav.back(); }
    else toast(`Absen ${label} Pondok ${pondok} tersimpan`);
  };
  if (last && !ubah) { const gab = Object.assign({}, ...docs.map(d => d.status || {}));
    return html`<${AbsenSelesai} judul=${`Absen ${label} sudah diisi`} oleh=${last.guru} ts=${last.ts} st=${gab} opts=${["H", "M", "S", "I", "A"]} modul="asrama"
      grup=${asr.map(a => ({ nama: a.nama, list: L.santriAsrama(a.id) }))} extra=${html`<p class="small center">Alpa & masbuq otomatis tercatat sebagai pelanggaran ringan.</p>`} />`; }
  const shown = asr.filter(a => f === "all" || a.id === f);
  const match = s => !q || s.nama.toLowerCase().includes(q.toLowerCase());
  return html`<div class="wrap">
    ${last ? html`<${Hint}>Mengoreksi absen ${label} yang diisi ${L.staffAman(last.guru).pendek} pukul ${L.fmtJam(last.ts)}.</${Hint}>` : html`<${Hint}>Satu ustadz bertugas mengisi untuk semua santri Pondok ${pondok}. Alpa & masbuq otomatis jadi pelanggaran ringan.</${Hint}>`}
    <div class="seg small mb8">${[["all", "Semua"], ...asr.map(a => [a.id, a.nama.replace("bin Abi ", "b. ").replace("bin ", "b. ")])].map(([k, lab]) => html`<button class=${k === f ? "on" : ""} onClick=${() => setF(k)}>${lab}${k === mine ? " ★" : ""}</button>`)}</div>
    <${SearchBox} value=${q} onInput=${setQ} />
    <${Card}><${Counts} st=${(() => { const ids = new Set(shown.flatMap(a => L.santriAsrama(a.id).map(x => x.id))); return Object.fromEntries(Object.entries(st).filter(([id]) => ids.has(id))); })()} opts=${["H", "M", "S", "I", "A"]} />
      ${shown.map(a => { const l = L.santriAsrama(a.id).filter(match); return l.length ? html`<div class="grp">${a.nama} · ${L.staffAman(a.musyrif).pendek}</div>
        ${l.map(s => html`<${AbsenItem} s=${s} sub=${L.sedangIzin(s.id) ? "Sedang izin · otomatis" : null} opts=${["H", "M", "S", "I", "A"]} value=${st[s.id]} onChange=${v => setSt({ ...st, [s.id]: v })} />`)}` : null; })}</${Card}>
    <div class="sticky-act"><${Btn} onClick=${save} icon="check">Simpan absen ${label}</${Btn}></div></div>`;
}

export function Mutabaah({ tgl: t0, sid: s0, ubah }) {
  useApp();
  const a = L.asramaOf(me().id), list = L.santriAsrama(a.id), tgl = t0 || L.today();
  if (!ubah && L.liburMutabaah(tgl)) return html`<${SubHeader} title="Mutaba'ah" sub=${`Asrama ${a.nama} · ${L.fmtTgl(tgl)}`} />
    <div class="wrap"><${Card}><${Empty} t="Hari Sabtu dan Ahad libur mutaba'ah. Pengisian berjalan Senin–Jumat, dan hari libur tidak mengurangi nilai santri." icon="calendar" /></${Card}></div>`;
  const sudah = s => !!get("mutabaah", L.mutKey(s.id, tgl)), pertamaBelum = (list.find(s => !sudah(s)) || list[0] || {}).id;
  const [sid, setSid] = useState(s0 || pertamaBelum);
  const nBelum = list.filter(s => !sudah(s)).length;
  return html`<${SubHeader} title=${ubah ? "Koreksi Mutaba'ah" : "Mutaba'ah"} sub=${`Asrama ${a.nama} · ${L.fmtTgl(tgl)} · ${list.length - nBelum}/${list.length} sudah diisi`}>
      <div class="seg small" style="margin-top:12px">${list.map(s => { const done = !!get("mutabaah", L.mutKey(s.id, tgl));
        return html`<button class=${s.id === sid ? "on" : ""} onClick=${() => setSid(s.id)}>${done ? "✓ " : ""}${s.panggilan || s.nama.split(" ")[0]}</button>`; })}</div></${SubHeader}>
    ${sid ? html`<${MutForm} key=${sid + tgl} sid=${sid} tgl=${tgl} list=${list} ubah=${ubah} onNext=${id => setSid(id)} />` : null}`;
}
function MutForm({ sid, list, onNext, tgl, ubah }) {
  useApp();
  const s = L.santriById(sid), ex = get("mutabaah", L.mutKey(sid, tgl)), auto = L.mutAuto(s, tgl);
  const [ib, setIb] = useState(() => new Set(ex ? ex.ibadah : []));
  const [ad, setAd] = useState(() => new Set(ex ? ex.adab : []));
  const ibFinal = new Set(ib); Object.entries(auto).forEach(([i, v]) => { if (v === true) ibFinal.add(Number(i)); if (v === false) ibFinal.delete(Number(i)); });
  const tog = (set, setter, i) => { const n = new Set(set); n.has(i) ? n.delete(i) : n.add(i); setter(n); };
  const src = i => (DATA.auto[i] ? (DATA.auto[i][0] === "motd" ? "Dari MOTD" : "Dari absen halaqah") : null);
  const belumLain = list.filter(x => x.id !== sid && !get("mutabaah", L.mutKey(x.id, tgl)));
  const save = async () => {
    const rec = { santri: sid, tanggal: tgl, ibadah: [...ibFinal], adab: [...ad], guru: (ex && ex.guru) || me().id, ts: ex ? ex.ts : Date.now(), ...(ex ? { diubah: { oleh: me().id, ts: Date.now() } } : {}) };
    if (await put("mutabaah", L.mutKey(sid, tgl), rec)) {
      if (ex) { await logUbah("ubah", "mutabaah", L.mutKey(sid, tgl), `Mutaba'ah ${s.nama} ${L.fmtTgl(tgl)}`, ex); toast("Mutaba'ah diperbarui"); nav.back(); return; }
      toast("Mutaba'ah tersimpan");
      const i = list.findIndex(x => x.id === sid), nx = [...list.slice(i + 1), ...list.slice(0, i)].find(x => !get("mutabaah", L.mutKey(x.id, tgl)));
      if (nx) onNext(nx.id);
    }
  };
  if (ex && !ubah) {
    const kurangI = DATA.ibadah.map((t, i) => [t, i]).filter(([, i]) => !ex.ibadah.includes(i)), kurangA = DATA.adab.map((t, i) => [t, i]).filter(([, i]) => !ex.adab.includes(i));
    return html`<div class="wrap">
      <div class="selesai-card"><span class="sc-ic"><${Icon} n="check" s=${26} c="#fff" w=${3} /></span><div><b>Mutaba'ah ${s.panggilan || s.nama.split(" ")[0]} sudah diisi</b><small>Diisi ${L.staffAman(ex.guru).pendek} pukul ${L.fmtJam(ex.ts)}</small></div></div>
      <${Card}><div class="minis"><${Pill} t=${`Ibadah ${ex.ibadah.length}/${DATA.ibadah.length}`} tone="green" /><${Pill} t=${`Adab ${ex.adab.length}/${DATA.adab.length}`} tone="blue" /></div>
        ${kurangI.length + kurangA.length ? html`<div class="grp">Belum dilaksanakan</div><div class="list">${[...kurangI.map(([t]) => ["Ibadah", t]), ...kurangA.map(([t]) => ["Adab", t])].map(([j, t]) => html`<${Row} name=${t} sub=${j} />`)}</div>`
          : html`<p class="small center" style="margin:12px 0 4px">Semua ibadah dan adab terlaksana.</p>`}</${Card}>
      ${belumLain.length ? html`<${Btn} icon="right" onClick=${() => onNext(belumLain[0].id)}>Isi santri berikutnya · ${belumLain.length} belum</${Btn}>` : html`<p class="small center">Semua santri asrama sudah diisi hari ini.</p>`}
      <p class="riwayat-hint">Perlu mengubah atau menghapus? <button type="button" class="link" onClick=${() => nav.go("riwayatModul", { modul: "asrama" })}>Buka Riwayat & Koreksi</button></p></div>`;
  }
  return html`<div class="wrap">
    <${Card}><div style="display:flex;justify-content:space-between;align-items:center"><div><b>${s.nama}</b><div class="small">Kelas ${s.kelas}</div></div><${Pill} t=${`${ibFinal.size + ad.size} dari ${DATA.ibadah.length + DATA.adab.length}`} tone="gold" /></div></${Card}>
    <${Card} title="Ibadah" right=${html`<small>${ibFinal.size}/${DATA.ibadah.length}</small>`}>${DATA.ibadah.map((t, i) => {
      const au = auto[i], isAuto = au === true || au === false, on = ibFinal.has(i);
      return html`<button class=${"check " + (on ? "on " : "") + (isAuto ? "auto" : "")} aria-pressed=${on} disabled=${isAuto} onClick=${() => tog(ib, setIb, i)}>
        <span class="box">${on ? html`<${Icon} n="check" s=${16} c="#fff" w=${3} />` : null}</span><span>${t}</span>${src(i) ? html`<em>${isAuto ? src(i) : "Belum diabsen"}</em>` : null}</button>`; })}</${Card}>
    <${Card} title="Adab" right=${html`<small>${ad.size}/${DATA.adab.length}</small>`}>${DATA.adab.map((t, i) => html`<button class=${"check " + (ad.has(i) ? "on" : "")} aria-pressed=${ad.has(i)} onClick=${() => tog(ad, setAd, i)}>
        <span class="box">${ad.has(i) ? html`<${Icon} n="check" s=${16} c="#fff" w=${3} />` : null}</span><span>${t}</span></button>`)}</${Card}>
    <div class="sticky-act"><${Btn} onClick=${save} icon="check">${ex ? "Simpan perubahan" : "Simpan · santri berikutnya"}</${Btn}></div></div>`;
}

export function IzinCatatan({ aid }) {
  useApp();
  const a = aid ? L.asramaById(aid) : L.asramaOf(me().id), ids = new Set(L.santriAsrama(a.id).map(s => s.id));
  const iz = all("izin").filter(i => ids.has(i.santri)).sort((x, y) => y.ts - x.ts);
  const bap = all("bap").filter(b => ids.has(b.santri)).sort((x, y) => y.ts - x.ts);
  const motd = [...ids].flatMap(id => L.motdCatatan(id).map(c => ({ ...c, santri: id }))).slice(0, 20);
  return html`<${SubHeader} title="Izin & Catatan" sub=${`Asrama ${a.nama} · hanya melihat`} />
    <div class="wrap">
    <${Section} t="Perizinan" /><${Card}>${iz.length ? html`<div class="list">${iz.map(i => html`<${Row} name=${L.santriAman(i.santri).nama} sub=${`${i.jenis} · ${L.fmtDT(i.keluar)} → ${L.fmtDT(i.kembali)}`}
        right=${i.status === "aktif" ? html`<${Pill} t=${L.terlambat(i) ? "Terlambat" : "Sedang izin"} tone=${L.terlambat(i) ? "red" : "gold"} />` : html`<${Pill} t="Kembali" />`} />`)}</div>` : html`<${Empty} t="Belum ada izin." />`}</${Card}>
    <${Section} t="Pelanggaran (BAP)" /><${Card}>${bap.length ? html`<div class="list">${bap.map(b => html`<${Row} name=${L.santriAman(b.santri).nama} sub=${`${b.pelanggaranNama} · ${L.fmtTgl(b.tanggal)}`} right=${html`<${Pill} t=${b.poin + " poin"} tone="red" />`} onClick=${() => nav.go("bapView", { id: b.id })} />`)}</div>` : html`<${Empty} t="Belum ada BAP." />`}</${Card}>
    <${Section} t="Catatan MOTD" /><${Card}>${motd.length ? html`<div class="list">${motd.map(c => html`<${Row} name=${L.santriAman(c.santri).nama} sub=${`${c.st === "A" ? "Alpa" : "Masbuq"} ${L.WAKTU.find(x => x[0] === c.waktu)[1]} · ${L.fmtShort(c.tanggal)}`} right=${html`<${Pill} t=${c.poin + " poin"} tone=${c.st === "A" ? "red" : "purple"} />`} />`)}</div>` : html`<${Empty} t="Belum ada alpa atau masbuq." />`}</${Card}></div>`;
}

// Menu Asrama Saya (wali asrama): izin & catatan, rekap asrama, perolehan hafalan, riwayat koreksi
export function AsramaSaya() {
  useApp();
  const m = me(), a = L.asramaOf(m.id), list = a ? L.santriAsrama(a.id) : [], ids = new Set(list.map(s => s.id)), tgl = L.today();
  if (!a) return html`<${SubHeader} title="Asrama Saya" /><div class="wrap"><${Card}><${Empty} t="Akun ini belum memegang asrama." icon="moon" /></${Card}></div>`;
  const izin = L.izinAktif().filter(i => ids.has(i.santri)).length, mut = list.filter(s => get("mutabaah", L.mutKey(s.id, tgl))).length;
  const motdIsi = L.WAKTU.filter(([k]) => get("motd", L.motdKey(a.id, tgl, k))).length;
  return html`<${SubHeader} title="Asrama Saya" sub=${`Asrama ${a.nama} · Pondok ${a.pondok} · ${list.length} santri`} />
    <div class="wrap"><${Card}><div class="stats"><${Stat} label="MOTD hari ini" value=${`${motdIsi}/${L.WAKTU.length}`} /><${Stat} label="Mutaba'ah" value=${`${mut}/${list.length}`} tone=${mut < list.length ? "gold" : ""} /><${Stat} label="Sedang izin" value=${izin} tone=${izin ? "blue" : ""} /></div></${Card}>
      <${Card} title="Menu Asrama"><div class="tiles">
        <${Tile} icon="moon" label="Absen MOTD" color="indigo" onClick=${() => nav.go("motd")} />
        <${Tile} icon="checksq" label="Mutaba'ah" color="teal" onClick=${() => nav.go("mutabaah")} />
        ${!m.roles.includes("wadir_kesantrian") ? html`<${Tile} icon="door" label="Izin & Catatan" color="coral" badge=${izin || null} onClick=${() => nav.go("izinCatatan")} />` : null}
        <${Tile} icon="chart" label="Rekap Asrama" color="purple" onClick=${() => nav.go("rekap", { modul: "asrama" })} />
        <${Tile} icon="calendar" label="Perolehan Hafalan" color="pink" onClick=${() => nav.go("hafalanBulan")} />
        <${Tile} icon="edit" label="Riwayat & Koreksi" color="slate" onClick=${() => nav.go("riwayatModul", { modul: "asrama" })} /></div></${Card}></div>`;
}
