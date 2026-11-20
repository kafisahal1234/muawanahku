import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Card, SubHeader, Stat, Row, Pill, Btn, Empty, Seg, StatusPick, Section, AbsenItem, Counts, Hint, SearchBox } from "./ui.js";
import { all, get, put, toast } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { me } from "./common.js";

const waktuNow = () => { const h = new Date().getHours(); return h < 5 ? "tahajud" : h < 7 ? "subuh" : h < 8 ? "apel" : h < 11 ? "dhuha" : h < 15 ? "dzuhur" : h < 17 ? "ashar" : h < 19 ? "maghrib" : "isya"; };

export function Motd({ tgl: t0, waktu: w0 }) {
  useApp();
  const mine = L.asramaOf(me().id), pondok = mine.pondok, tgl = t0 || L.today();
  const [w, setW] = useState(w0 || waktuNow());
  return html`<${SubHeader} title=${t0 && t0 !== L.today() ? "Koreksi Absen MOTD" : "Absen MOTD"} sub=${`Pondok ${pondok} · semua asrama · ${L.fmtShort(tgl)}`}>
    <${Seg} small items=${L.WAKTU} value=${w} onChange=${setW} /></${SubHeader}><${MotdList} key=${w + tgl} w=${w} pondok=${pondok} mine=${mine.id} tgl=${tgl} />`;
}
function MotdList({ w, pondok, mine, tgl }) {
  useApp();
  const asr = L.ASRAMA.filter(a => a.pondok === pondok);
  const [f, setF] = useState("all"); const [q, setQ] = useState("");
  const docs = asr.map(a => get("motd", L.motdKey(a.id, tgl, w))).filter(Boolean);
  const [st, setSt] = useState(() => { const o = {}; asr.forEach(a => { const ex = get("motd", L.motdKey(a.id, tgl, w)); L.santriAsrama(a.id).forEach(s => (o[s.id] = (ex && ex.status[s.id]) || (L.sedangIzin(s.id) ? "I" : "H"))); }); return o; });
  const label = L.WAKTU.find(x => x[0] === w)[1];
  const last = docs.sort((x, y) => y.ts - x.ts)[0];
  const save = async () => {
    let ok = true;
    for (const a of asr) { const sub = {}; L.santriAsrama(a.id).forEach(s => (sub[s.id] = st[s.id])); ok = (await put("motd", L.motdKey(a.id, tgl, w), { asrama: a.id, pondok, tanggal: tgl, waktu: w, status: sub, guru: me().id, ts: Date.now() })) && ok; }
    if (ok) toast(`Absen ${label} Pondok ${pondok} tersimpan`);
  };
  const shown = asr.filter(a => f === "all" || a.id === f);
  const match = s => !q || s.nama.toLowerCase().includes(q.toLowerCase());
  return html`<div class="wrap">
    ${last ? html`<${Hint}>Terakhir diisi ${L.staffById(last.guru).pendek} pukul ${L.fmtJam(last.ts)}. Alpa & masbuq otomatis jadi pelanggaran ringan.</${Hint}>` : html`<${Hint}>Satu ustadz bertugas mengisi untuk semua santri Pondok ${pondok}. Alpa & masbuq otomatis jadi pelanggaran ringan.</${Hint}>`}
    <div class="seg small mb8">${[["all", "Semua"], ...asr.map(a => [a.id, a.nama.replace("bin Abi ", "b. ").replace("bin ", "b. ")])].map(([k, lab]) => html`<button class=${k === f ? "on" : ""} onClick=${() => setF(k)}>${lab}${k === mine ? " ★" : ""}</button>`)}</div>
    <${SearchBox} value=${q} onInput=${setQ} />
    <${Card}><${Counts} st=${(() => { const ids = new Set(shown.flatMap(a => L.santriAsrama(a.id).map(x => x.id))); return Object.fromEntries(Object.entries(st).filter(([id]) => ids.has(id))); })()} opts=${["H", "M", "S", "I", "A"]} />
      ${shown.map(a => { const l = L.santriAsrama(a.id).filter(match); return l.length ? html`<div class="grp">${a.nama} · ${L.staffById(a.musyrif).pendek}</div>
        ${l.map(s => html`<${AbsenItem} s=${s} sub=${L.sedangIzin(s.id) ? "Sedang izin · otomatis" : null} opts=${["H", "M", "S", "I", "A"]} value=${st[s.id]} onChange=${v => setSt({ ...st, [s.id]: v })} />`)}` : null; })}</${Card}>
    <div class="sticky-act"><${Btn} onClick=${save} icon="check">Simpan absen ${label}</${Btn}></div></div>`;
}

export function Mutabaah({ tgl: t0, sid: s0 }) {
  useApp();
  const a = L.asramaOf(me().id), list = L.santriAsrama(a.id), tgl = t0 || L.today();
  const [sid, setSid] = useState(s0 || (list[0] && list[0].id));
  return html`<${SubHeader} title="Mutaba'ah" sub=${`Asrama ${a.nama} · ${L.fmtTgl(tgl)}`}>
      <div class="seg small" style="margin-top:12px">${list.map(s => { const done = !!get("mutabaah", L.mutKey(s.id, tgl));
        return html`<button class=${s.id === sid ? "on" : ""} onClick=${() => setSid(s.id)}>${done ? "✓ " : ""}${s.panggilan || s.nama.split(" ")[0]}</button>`; })}</div></${SubHeader}>
    ${sid ? html`<${MutForm} key=${sid + tgl} sid=${sid} tgl=${tgl} list=${list} onNext=${id => setSid(id)} />` : null}`;
}
function MutForm({ sid, list, onNext, tgl }) {
  useApp();
  const s = L.santriById(sid), ex = get("mutabaah", L.mutKey(sid, tgl)), auto = L.mutAuto(s, tgl);
  const [ib, setIb] = useState(() => new Set(ex ? ex.ibadah : []));
  const [ad, setAd] = useState(() => new Set(ex ? ex.adab : []));
  const ibFinal = new Set(ib); Object.entries(auto).forEach(([i, v]) => { if (v === true) ibFinal.add(Number(i)); if (v === false) ibFinal.delete(Number(i)); });
  const tog = (set, setter, i) => { const n = new Set(set); n.has(i) ? n.delete(i) : n.add(i); setter(n); };
  const src = i => (DATA.auto[i] ? (DATA.auto[i][0] === "motd" ? "Dari MOTD" : "Dari absen halaqah") : null);
  const save = async () => {
    if (await put("mutabaah", L.mutKey(sid, tgl), { santri: sid, tanggal: tgl, ibadah: [...ibFinal], adab: [...ad], guru: me().id, ts: Date.now() })) {
      toast("Mutaba'ah tersimpan");
      const i = list.findIndex(x => x.id === sid); if (list[i + 1]) onNext(list[i + 1].id);
    }
  };
  return html`<div class="wrap">
    <${Card}><div style="display:flex;justify-content:space-between;align-items:center"><div><b>${s.nama}</b><div class="small">Kelas ${s.kelas}</div></div><${Pill} t=${`${ibFinal.size + ad.size} dari ${DATA.ibadah.length + DATA.adab.length}`} tone="gold" /></div></${Card}>
    <${Card} title="Ibadah" right=${html`<small>${ibFinal.size}/${DATA.ibadah.length}</small>`}>${DATA.ibadah.map((t, i) => {
      const au = auto[i], isAuto = au === true || au === false, on = ibFinal.has(i);
      return html`<button class=${"check " + (on ? "on " : "") + (isAuto ? "auto" : "")} aria-pressed=${on} disabled=${isAuto} onClick=${() => tog(ib, setIb, i)}>
        <span class="box">${on ? html`<${Icon} n="check" s=${16} c="#fff" w=${3} />` : null}</span><span>${t}</span>${src(i) ? html`<em>${isAuto ? src(i) : "Belum diabsen"}</em>` : null}</button>`; })}</${Card}>
    <${Card} title="Adab" right=${html`<small>${ad.size}/${DATA.adab.length}</small>`}>${DATA.adab.map((t, i) => html`<button class=${"check " + (ad.has(i) ? "on" : "")} aria-pressed=${ad.has(i)} onClick=${() => tog(ad, setAd, i)}>
        <span class="box">${ad.has(i) ? html`<${Icon} n="check" s=${16} c="#fff" w=${3} />` : null}</span><span>${t}</span></button>`)}</${Card}>
    <div class="sticky-act"><${Btn} onClick=${save} icon="check">Simpan · santri berikutnya</${Btn}></div></div>`;
}

export function IzinCatatan({ aid }) {
  useApp();
  const a = aid ? L.asramaById(aid) : L.asramaOf(me().id), ids = new Set(L.santriAsrama(a.id).map(s => s.id));
  const iz = all("izin").filter(i => ids.has(i.santri)).sort((x, y) => y.ts - x.ts);
  const bap = all("bap").filter(b => ids.has(b.santri)).sort((x, y) => y.ts - x.ts);
  const motd = [...ids].flatMap(id => L.motdCatatan(id).map(c => ({ ...c, santri: id }))).slice(0, 20);
  return html`<${SubHeader} title="Izin & Catatan" sub=${`Asrama ${a.nama} · hanya melihat`} />
    <div class="wrap">
    <${Section} t="Perizinan" /><${Card}>${iz.length ? html`<div class="list">${iz.map(i => html`<${Row} name=${L.santriById(i.santri).nama} sub=${`${i.jenis} · ${L.fmtDT(i.keluar)} → ${L.fmtDT(i.kembali)}`}
        right=${i.status === "aktif" ? html`<${Pill} t=${L.terlambat(i) ? "Terlambat" : "Sedang izin"} tone=${L.terlambat(i) ? "red" : "gold"} />` : html`<${Pill} t="Kembali" />`} />`)}</div>` : html`<${Empty} t="Belum ada izin." />`}</${Card}>
    <${Section} t="Pelanggaran (BAP)" /><${Card}>${bap.length ? html`<div class="list">${bap.map(b => html`<${Row} name=${L.santriById(b.santri).nama} sub=${`${b.pelanggaranNama} · ${L.fmtTgl(b.tanggal)}`} right=${html`<${Pill} t=${b.poin + " poin"} tone="red" />`} onClick=${() => nav.go("bapView", { id: b.id })} />`)}</div>` : html`<${Empty} t="Belum ada BAP." />`}</${Card}>
    <${Section} t="Catatan MOTD" /><${Card}>${motd.length ? html`<div class="list">${motd.map(c => html`<${Row} name=${L.santriById(c.santri).nama} sub=${`${c.st === "A" ? "Alpa" : "Masbuq"} ${L.WAKTU.find(x => x[0] === c.waktu)[1]} · ${L.fmtShort(c.tanggal)}`} right=${html`<${Pill} t=${c.poin + " poin"} tone=${c.st === "A" ? "red" : "purple"} />`} />`)}</div>` : html`<${Empty} t="Belum ada alpa atau masbuq." />`}</${Card}></div>`;
}
