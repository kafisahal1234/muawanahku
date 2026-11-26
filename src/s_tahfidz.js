import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Tile, Card, SubHeader, Stat, Row, Pill, Btn, Empty, Bar, Field, Seg, Stepper, StatusPick, Section, Confirm, AbsenItem, Counts, Hint } from "./ui.js";
import { S, all, get, put, toast, uid } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { logUbah, KoreksiSheet } from "./s_koreksi.js";
import { AbsenSelesai } from "./common.js";
import { me, StatusPill } from "./common.js";

const myHalaqah = () => L.halaqahOf(me().id);

export function Tahfidz() {
  useApp();
  const st = me(), a = myHalaqah(); const list = L.santriHalaqah(a.id);
  const tgl = L.today();
  const sudah = x => !!get("absenHalaqah", L.halaqahKey(a.id, tgl, x));
  const hafal = list.filter(s => !L.santriIqra(s)), zDone = hafal.filter(s => L.ziyadahHari(s.id, tgl).some(r => r.lulus)).length;
  const tahsin = list.filter(s => L.tahsinStatus(s)), tBelum = tahsin.filter(s => !all("tahsin").some(r => r.santri === s.id && r.tanggal === tgl && r.jenis === "baca")).length;
  const mDone = list.filter(s => all("setoran").some(r => r.santri === s.id && r.jenis === "murojaah" && r.tanggal === tgl)).length;
  const siap = list.filter(s => L.hafalan(s).siapTasmi).length;
  const wk = L.weekStart(tgl);
  const manzil = list.filter(s => { const m = L.manzilWeek(s, wk); const p = L.manzilWeek(s, L.addDays(wk, -7)); return (m && !m.lulus) || (p && !p.lulus); }).length;
  const belum = hafal.filter(s => !L.kunci(s).sudah);
  return html`<${SubHeader} title="Tahfidz" sub=${`Halaqah ${st.pendek} · ${list.length} santri`} />
    <div class="wrap">
      <${Card}><div class="stats">
        <${Stat} label="Ziyadah" value=${`${zDone}/${hafal.length}`} />
        <${Stat} label="Murojaah" value=${`${mDone}/${list.length}`} />
        <${Stat} label="Siap tasmi'" value=${siap} /></div>
        <div class="minis mt8">${L.adaHalaqah() ? L.sesiHari().map(x => html`<${Pill} t=${(sudah(x) ? "✓ " : "") + "Absen " + x} tone=${sudah(x) ? "green" : "muted"} />`) : html`<${Pill} t="Ahad · tidak ada halaqah" tone="muted" />`}${L.khususManzil() ? html`<${Pill} t="Sabtu: Shubuh, khusus manzil" tone="gold" />` : null}</div></${Card}>
      <${Card} title="Menu Tahfidz"><div class="tiles">
        <${Tile} icon="checksq" label="Absen Halaqah" color="emerald" onClick=${() => nav.go("absenHalaqah", { sesi: L.sesiNow() })} />
        <${Tile} icon="bookopen" label="Ziyadah" color="blue" badge=${(!L.khususManzil() && L.adaHalaqah() && belum.length) || null} onClick=${() => nav.go("setorList", { jenis: "ziyadah" })} />
        <${Tile} icon="repeat" label="Murojaah" color="teal" onClick=${() => nav.go("setorList", { jenis: "murojaah" })} />
        ${tahsin.length ? html`<${Tile} icon="iqro" label="Tahsin (Iqro')" color="emerald" badge=${tBelum || null} onClick=${() => nav.go("tahsinList")} />` : null}
        <${Tile} icon="layers" label="Manzil" color="indigo" badge=${manzil || null} onClick=${() => nav.go("manzilList")} />
        <${Tile} icon="mic" label="Tasmi'" color="orange" badge=${siap || null} onClick=${() => nav.go("tasmiList")} />
        <${Tile} icon="award" label="Nilai Mid/Smt" color="gold" onClick=${() => nav.go("ujianList")} />
        <${Tile} icon="trend" label="Progres Santri" color="purple" onClick=${() => nav.go("progres", { hid: a.id })} />
        <${Tile} icon="chart" label="Rekap Halaqah" color="teal" onClick=${() => nav.go("rekapTahfidz")} />
        <${Tile} icon="calendar" label="Perolehan Bulanan" color="pink" onClick=${() => nav.go("hafalanBulan")} />
        ${tahsin.length ? html`<${Tile} icon="clipboard" label="Rekap Tahsin" color="indigo" onClick=${() => nav.go("rekapTahsin")} />` : null}
        <${Tile} icon="briefcase" label="Izin Guru" color="slate" onClick=${() => nav.go("izinGuru")} />
        <${Tile} icon="edit" label="Riwayat & Koreksi" color="coral" onClick=${() => nav.go("riwayatModul", { modul: "tahfidz" })} />
</div></${Card}>
      ${L.khususManzil() ? html`<${Card} title="Sabtu · khusus manzil"><p class="small" style="margin:0 0 10px">Hari Sabtu halaqah hanya Shubuh dan khusus setoran manzil. Tidak ada ziyadah dan murojaah.</p><${Btn} icon="layers" onClick=${() => nav.go("manzilList")}>Buka Manzil</${Btn}></${Card}>` : !L.adaHalaqah() ? null : html`<${Card} title=${`Belum setor ziyadah · ${belum.length}`} right=${belum.length > 4 ? html`<button class="link" onClick=${() => nav.go("setorList", { jenis: "ziyadah" })}>Lihat semua</button>` : null}>
        ${belum.length ? html`<div class="list">${belum.slice(0, 4).map(s => { const h = L.hafalan(s), k = L.kunci(s);
          return html`<${Row} name=${s.nama} sub=${L.posLabel(h.aktif, h.baris)} right=${k.kunci ? html`<${Pill} t="Terkunci" tone="gold" />` : html`<${Pill} t="Input" tone="green" />`} onClick=${() => nav.go("ziyadah", { sid: s.id })} />`; })}</div>`
          : html`<${Empty} t="Alhamdulillah, semua santri sudah setor ziyadah hari ini." icon="check" />`}
      </${Card}>`}</div>`;
}

export function AbsenHalaqah({ sesi: s0, tgl: t0, ubah }) {
  useApp();
  const tgl = t0 || L.today(), ss = L.sesiHari(tgl);
  const [sesi, setSesi] = useState(ss.includes(s0) ? s0 : ss.includes(L.sesiNow()) ? L.sesiNow() : ss[0]);
  const a = myHalaqah();
  if (!ss.length) return html`<${SubHeader} title="Absen Halaqah" sub=${`${me().pendek} · ${L.fmtTgl(tgl)}`} />
    <div class="wrap"><${Card}><${Empty} t="Hari Ahad tidak ada halaqah. Halaqah berjalan Senin–Sabtu (Sabtu hanya Shubuh)." icon="calendar" /></${Card}></div>`;
  const isi = x => !!get("absenHalaqah", L.halaqahKey(a.id, tgl, x));
  return html`<${SubHeader} title=${ubah ? "Koreksi Absen Halaqah" : "Absen Halaqah"} sub=${`${me().pendek} · ${L.fmtTgl(tgl)}${ss.length === 1 ? " · Sabtu hanya Shubuh" : ""}`}>
    ${ss.length > 1 ? html`<${Seg} items=${ss.map(x => [x, (isi(x) ? "✓ " : "") + x])} value=${sesi} onChange=${setSesi} />` : null}</${SubHeader}>
    <${AbsenList} key=${sesi + tgl} sesi=${sesi} a=${a} tgl=${tgl} ubah=${ubah} />`;
}
function AbsenList({ sesi, a, tgl, ubah }) {
  useApp();
  const key = L.halaqahKey(a.id, tgl, sesi), list = L.santriHalaqah(a.id);
  const ex = get("absenHalaqah", key);
  const [st, setSt] = useState(() => { const o = {}; list.forEach(s => (o[s.id] = (ex && ex.status[s.id]) || (L.sedangIzin(s.id) ? "I" : "H"))); return o; });
  const cnt = k => Object.values(st).filter(v => v === k).length;
  const save = async () => {
    const rec = { halaqah: a.id, tanggal: tgl, sesi, status: st, guru: (ex && ex.guru) || me().id, ts: ex ? ex.ts : Date.now(), ...(ex ? { diubah: { oleh: me().id, ts: Date.now() } } : {}) };
    if (await put("absenHalaqah", key, rec)) { if (ex) { await logUbah("ubah", "absenHalaqah", key, `Absen halaqah ${sesi} ${L.fmtTgl(tgl)}`, ex); toast(`Absen ${sesi} diperbarui`); nav.back(); } else toast(`Absen ${sesi} tersimpan`); }
  };
  if (ex && !ubah) return html`<${AbsenSelesai} judul=${`Absen ${sesi} sudah diisi`} oleh=${ex.guru} ts=${ex.ts} st=${ex.status} grup=${[{ nama: a.nama, list }]} modul="tahfidz" />`;
  return html`<div class="wrap">
    <${Card} title=${`${list.length} santri`} right=${html`<button class="link" onClick=${() => { const o = {}; list.forEach(s => (o[s.id] = L.sedangIzin(s.id) ? "I" : "H")); setSt(o); }}>Semua hadir</button>`}>
      <${Counts} st=${st} />
      ${list.map(s => html`<${AbsenItem} s=${s} sub=${L.sedangIzin(s.id) ? "Sedang izin · otomatis" : null} value=${st[s.id]} onChange=${v => setSt({ ...st, [s.id]: v })} />`)}
    </${Card}>
    <div class="sticky-act"><${Btn} onClick=${save} icon="check">Simpan absen ${sesi}</${Btn}></div></div>`;
}

function TidakAdaSetor({ title, tgl }) {
  const sabtu = L.khususManzil(tgl);
  return html`<${SubHeader} title=${title} sub=${L.fmtTgl(tgl)} />
    <div class="wrap"><${Card}><${Empty} t=${sabtu ? `Hari Sabtu tidak ada ${title.toLowerCase()}. Halaqah Sabtu hanya Shubuh dan khusus setoran manzil.` : `Hari Ahad libur halaqah, tidak ada ${title.toLowerCase()}.`} icon="calendar" />
      ${sabtu ? html`<${Btn} icon="layers" onClick=${() => nav.go("manzilList")}>Buka Manzil</${Btn}>` : null}</${Card}></div>`;
}
export function SetorList({ jenis }) {
  useApp();
  const a = myHalaqah(), list = L.santriHalaqah(a.id), tgl = L.today();
  const title = jenis === "ziyadah" ? "Ziyadah" : "Murojaah";
  if (L.khususManzil(tgl) || !L.adaHalaqah()) return html`<${TidakAdaSetor} title=${title} tgl=${tgl} />`;
  // santri yang sudah setor (lulus) hari ini pindah ke bagian "Sudah setor" dan tidak bisa diinput ulang; koreksi lewat Riwayat
  const iqra = jenis === "ziyadah" ? list.filter(s => L.santriIqra(s) && !all("setoran").some(r => r.santri === s.id && r.jenis === jenis && r.tanggal === tgl)) : [];
  const data = list.filter(s => !iqra.includes(s)).map(s => { const recs = all("setoran").filter(r => r.santri === s.id && r.jenis === jenis && r.tanggal === tgl).sort((x, y) => x.ts - y.ts); return { s, last: recs[recs.length - 1] }; });
  const selesai = d => d.last && (jenis === "murojaah" || d.last.lulus !== false);
  const belum = data.filter(d => !selesai(d)), sudah = data.filter(selesai);
  return html`<${SubHeader} title=${title} sub=${`${a.nama} · ${L.fmtTgl(tgl)} · ${sudah.length}/${list.length} sudah setor`} />
    <div class="wrap">
      <${Card} title=${`Belum setor (${belum.length})`}>${belum.length ? html`<div class="list">${belum.map(({ s, last }) => {
        const h = L.hafalan(s), k = L.kunci(s);
        const right = last ? html`<${StatusPill} r=${last} />` : (jenis === "ziyadah" && k.kunci && !k.sudah ? html`<${Pill} t="Terkunci" tone="gold" />` : html`<${Pill} t="Belum" tone="muted" />`);
        return html`<${Row} name=${s.nama} sub=${jenis === "ziyadah" ? L.posLabel(h.aktif, h.baris) : `Hafal ${L.fmtJumlah(h)}`} right=${right} onClick=${() => nav.go(jenis, { sid: s.id })} />`;
      })}</div>` : html`<div class="selesai-card" style="margin:4px 0"><span class="sc-ic"><${Icon} n="check" s=${24} c="#fff" w=${3} /></span><div><b>Semua santri sudah setor ${title.toLowerCase()} hari ini</b><small>Alhamdulillah</small></div></div>`}</${Card}>
      ${sudah.length ? html`<${Card} title=${`Sudah setor hari ini (${sudah.length})`}><div class="list">${sudah.map(({ s, last }) => html`<${Row} name=${s.nama}
        sub=${jenis === "ziyadah" ? `${last.baris} baris · ${L.posLabel(last.juz, last.sesudah)} · ${L.fmtJam(last.ts)}` : `Juz ${last.juz} · ${L.fmtJam(last.ts)}`} right=${html`<${StatusPill} r=${last} />`} />`)}</div>
        <p class="riwayat-hint">Salah input? <button type="button" class="link" onClick=${() => nav.go("riwayatModul", { modul: "tahfidz" })}>Koreksi lewat Riwayat & Koreksi</button></p></${Card}>` : null}
      ${iqra.length ? html`<${Card} title=${`Masih belajar Iqro' (${iqra.length})`}><p class="small" style="margin:0 0 6px">Ziyadah Iqro' dicatat di menu Tahsin. Bila santri ini juga menghafal (talaqqi), ketuk namanya untuk mencatat setoran hafalan.</p>
        <div class="list">${iqra.map(s => { const t = L.tahsinStatus(s); return html`<${Row} name=${s.nama} sub=${`${t.label} · hafalan ${L.fmtJumlah(L.hafalan(s))}`} right=${html`<${Pill} t=${t.pendek} tone="blue" />`} onClick=${() => nav.go("ziyadah", { sid: s.id })} />`; })}</div>
        <${Btn} kind="ghost" icon="book" onClick=${() => nav.go("tahsinList")}>Buka Tahsin (Iqro')</${Btn}></${Card}>` : null}</div>`;
}

function SantriHead({ s, h }) {
  return html`<${Card}><div style="display:flex;gap:12px;align-items:center"><span class="av" style="width:48px;height:48px;font-size:15px">${L.initials(s.nama)}</span>
    <div style="flex:1;min-width:0"><b style="font-size:15.5px">${s.nama}</b><div class="small">Kelas ${s.kelas} · total hafalan ${L.fmtJumlah(h)}</div></div><${Pill} t=${"Juz " + h.aktif} tone="gold" /></div></${Card}>`;
}

export function Ziyadah({ sid, edit }) {
  useApp();
  const [kor, setKor] = useState(null);
  const ed = edit ? get("setoran", edit) : null;
  if (!ed && (L.khususManzil() || !L.adaHalaqah())) return html`<${TidakAdaSetor} title="Ziyadah" tgl=${L.today()} />`;
  const s = L.santriById(sid), h = L.hafalan(s, ed && ed.id), k = ed ? { kunci: false } : L.kunci(s);
  const sisa = h.total - h.baris;
  const [baris, setBaris] = useState(ed ? ed.baris : ""); const [salah, setSalah] = useState(ed ? ed.salah : 0);
  const n = Math.min(sisa, Number(baris) || 0), nilai = L.nilaiDari(salah), lulus = nilai >= L.KKM, sesudah = Math.min(h.total, h.baris + n);
  const hist = L.setoranSantri(sid).filter(r => r.jenis === "ziyadah").reverse().slice(0, 6);
  const [ask, setAsk] = useState(false);
  const save = async () => {
    setAsk(false);
    const rec = { santri: sid, jenis: "ziyadah", tanggal: ed ? ed.tanggal : L.today(), sesi: ed ? ed.sesi : L.sesiNow(), juz: h.aktif, sebelum: h.baris, sesudah: lulus ? sesudah : h.baris, baris: n, salah: Number(salah) || 0, nilai, lulus, guru: ed ? ed.guru : me().id, ts: ed ? ed.ts : Date.now(), ...(ed ? { diubah: { oleh: me().id, ts: Date.now() } } : {}) };
    if (await put("setoran", ed ? ed.id : uid("z"), rec)) {
      if (ed) logUbah("ubah", "setoran", ed.id, `Koreksi ziyadah ${s.nama}: ${ed.baris}→${n} baris, salah ${ed.salah}→${rec.salah}`);
      if (!lulus) toast(`Nilai ${nilai}, di bawah KKM. Ulang hari ini.`, "err");
      else if (sesudah >= h.total) toast(`Juz ${h.aktif} selesai! Nama santri masuk menu Tasmi'.`);
      else toast(`Tersimpan. Posisi baru ${L.posLabel(h.aktif, sesudah)}`);
      nav.back();
    }
  };
  return html`<${SubHeader} title=${ed ? "Koreksi Ziyadah" : "Input Ziyadah"} sub=${ed ? `Setoran ${L.fmtTgl(ed.tanggal)} · ${ed.sesi || ""}` : `${me().pendek} · ${L.sesiNow()} · ${L.fmtTgl(L.today())}`} />
    <div class="wrap"><${SantriHead} s=${s} h=${h} />
    ${k.kunci ? html`<div class="lockbox"><${Icon} n=${k.sudah ? "check" : "lock"} s=${20} />${k.alasan}</div>
        ${h.siapTasmi ? html`<${Btn} kind="gold" icon="mic" onClick=${() => nav.replace("tasmi", { sid })}>Buka Tasmi' Juz ${h.aktif}</${Btn}>` : null}
        ${!h.siapTasmi && !k.sudah ? html`<${Btn} kind="gold" icon="layers" onClick=${() => nav.replace("manzilList")}>Buka Manzil</${Btn}>` : null}` : html`
    <${Card} title="Setoran hari ini">
      <div class="kv"><span>Posisi terakhir</span><b>${L.posLabel(h.aktif, h.baris)}</b></div>
      <${Field} label="Jumlah baris ziyadah" hint=${`Ketik langsung angkanya. Sisa Juz ${h.aktif}: ${sisa} baris (1 halaman = 15 baris).`}>
        <${Stepper} value=${baris} onChange=${setBaris} max=${sisa} label="jumlah baris" />
        <div class="quick">${[5, 10, 15, 30, 50].filter(x => x <= sisa).map(x => html`<button onClick=${() => setBaris(x)}>${x} baris</button>`)}<button onClick=${() => setBaris(sisa)}>Sampai akhir juz</button></div></${Field}>
      <div class="pos"><span>Posisi baru</span><b>${n ? (lulus ? L.posLabel(h.aktif, sesudah) : "Tidak maju") : "—"}</b></div>
      ${n ? html`<p class="small mt8">Hafalan: ${L.rangeLabel(h.aktif, h.baris + 1, h.baris + n)}</p>` : null}
    </${Card}>
    <${Card} title="Penilaian" right=${html`<small>tiap salah −3</small>`}>
      <${Field} label="Jumlah kesalahan"><${Stepper} value=${salah} onChange=${setSalah} max=${34} label="jumlah kesalahan" /></${Field}>
      <div class=${"nilai-box " + (lulus ? "" : "red")}><span>Nilai · KKM ${L.KKM}<br />${lulus ? "Lulus, posisi maju" : "Di bawah KKM, ulang hari ini"}</span><b>${nilai}</b></div>
    </${Card}>
    <div class="sticky-act"><${Btn} disabled=${!n} onClick=${() => setAsk(true)} icon="check">Simpan setoran</${Btn}></div>`}
    ${kor ? html`<${KoreksiSheet} item=${kor} onClose=${() => setKor(null)} />` : null}<${Section} t="Riwayat ziyadah · ketuk untuk koreksi" />
    <${Card}>${hist.length ? html`<div class="list">${hist.map(r => html`<${Row} onClick=${() => setKor({ col: "setoran", list: [r] })} name=${`${r.baris} baris · ${L.fmtShort(r.tanggal)}`} sub=${L.posLabel(r.juz, r.sesudah)} icon=${html`<${Icon} n="bookopen" s=${18} />`} right=${html`<${StatusPill} r=${r} />`} />`)}</div>` : html`<${Empty} t="Belum ada setoran ziyadah." />`}</${Card}>
    <${Confirm} open=${ask} title="Simpan setoran?" text=${`${s.nama}: ${n} baris, ${salah || 0} kesalahan, nilai ${nilai}.`} yes="Simpan" onYes=${save} onNo=${() => setAsk(false)} />
    </div>`;
}

export function Murojaah({ sid, edit }) {
  useApp();
  const [kor, setKor] = useState(null);
  const ed = edit ? get("setoran", edit) : null;
  if (!ed && (L.khususManzil() || !L.adaHalaqah())) return html`<${TidakAdaSetor} title="Murojaah" tgl=${L.today()} />`;
  const s = L.santriById(sid), h = L.hafalan(s);
  const opsi = [...h.selesai, ...(h.baris > 0 ? [h.aktif] : [])];
  const [juz, setJuz] = useState(ed ? ed.juz : opsi[0] || h.aktif); const [dari, setDari] = useState(ed ? ed.halDari : 1); const [sampai, setSampai] = useState(ed ? ed.halSampai : 5); const [salah, setSalah] = useState(ed ? ed.salah : 0);
  const maxHal = L.juzPages(juz), nilai = L.nilaiDari(salah), lulus = nilai >= L.KKM;
  const d = Math.min(Number(dari) || 1, maxHal), sp = Math.max(d, Math.min(Number(sampai) || d, maxHal));
  const hist = L.setoranSantri(sid).filter(r => r.jenis === "murojaah").reverse().slice(0, 6);
  const save = async () => {
    if (await put("setoran", ed ? ed.id : uid("m"), { santri: sid, jenis: "murojaah", tanggal: ed ? ed.tanggal : L.today(), sesi: ed ? ed.sesi : L.sesiNow(), juz, halDari: d, halSampai: sp, salah: Number(salah) || 0, nilai, lulus, guru: ed ? ed.guru : me().id, ts: ed ? ed.ts : Date.now(), ...(ed ? { diubah: { oleh: me().id, ts: Date.now() } } : {}) })) {
      if (ed) logUbah("ubah", "setoran", ed.id, `Koreksi murojaah ${s.nama}`);
      toast(lulus ? "Murojaah tersimpan" : `Nilai ${nilai}, ulang murojaah`, lulus ? "ok" : "err"); nav.back();
    }
  };
  return html`<${SubHeader} title=${ed ? "Koreksi Murojaah" : "Input Murojaah"} sub=${ed ? `Setoran ${L.fmtTgl(ed.tanggal)}` : `${me().pendek} · ${L.fmtTgl(L.today())}`} />
    <div class="wrap"><${SantriHead} s=${s} h=${h} />
    ${opsi.length ? html`<${Card} title="Hafalan yang disetor">
      <${Field} label="Juz"><select class="in" value=${juz} onChange=${e => { setJuz(Number(e.target.value)); setDari(1); setSampai(5); }}>${opsi.map(j => html`<option value=${j}>Juz ${j}</option>`)}</select></${Field}>
      <div class="btn-row"><${Field} label="Dari halaman"><${Stepper} value=${dari} onChange=${setDari} min=${1} max=${maxHal} label="halaman awal" /></${Field}>
      <${Field} label="Sampai halaman"><${Stepper} value=${sampai} onChange=${setSampai} min=${1} max=${maxHal} label="halaman akhir" /></${Field}></div>
      <p class="small">${sp - d + 1} halaman · ${L.rangeLabel(juz, (d - 1) * 15 + 1, sp * 15)}</p></${Card}>
    <${Card} title="Penilaian"><${Field} label="Jumlah kesalahan"><${Stepper} value=${salah} onChange=${setSalah} max=${34} label="jumlah kesalahan" /></${Field}>
      <div class=${"nilai-box " + (lulus ? "" : "red")}><span>Nilai · KKM ${L.KKM}</span><b>${nilai}</b></div></${Card}>
    <${Btn} onClick=${save} icon="check">Simpan murojaah</${Btn}>` : html`<${Card}><${Empty} t="Santri belum punya hafalan lama untuk dimurojaah." /></${Card}>`}
    ${kor ? html`<${KoreksiSheet} item=${kor} onClose=${() => setKor(null)} />` : null}<${Section} t="Riwayat murojaah · ketuk untuk koreksi" /><${Card}>${hist.length ? html`<div class="list">${hist.map(r => html`<${Row} onClick=${() => setKor({ col: "setoran", list: [r] })} name=${`Juz ${r.juz} · hal. ${r.halDari}–${r.halSampai}`} sub=${L.fmtTgl(r.tanggal)} icon=${html`<${Icon} n="repeat" s=${18} />`} right=${html`<${StatusPill} r=${r} />`} />`)}</div>` : html`<${Empty} t="Belum ada murojaah." />`}</${Card}></div>`;
}

export function ManzilList() {
  useApp();
  const a = myHalaqah(), list = L.santriHalaqah(a.id), wk = L.weekStart(L.today()), prev = L.addDays(wk, -7);
  const rows = [];
  list.forEach(s => { const p = L.manzilWeek(s, prev); if (p && !p.lulus) rows.push({ s, m: p, wk: prev, wajib: true }); const m = L.manzilWeek(s, wk); if (m) rows.push({ s, m, wk }); });
  return html`<${SubHeader} title="Manzil" sub=${`Pekan ${L.fmtShort(wk)} – ${L.fmtShort(L.addDays(wk, 5))} · rekap ziyadah Senin–Jumat`} />
    <div class="wrap"><${Hint}>Rentang manzil otomatis dari ziyadah Senin–Jumat. Belum lulus = ziyadah pekan depan terkunci.</${Hint}>
    <${Card} title="Daftar manzil">${rows.length ? html`<div class="list">${rows.map(({ s, m, wk: w, wajib }) => html`<${Row} name=${s.nama}
        sub=${`Juz ${m.juz} · ${L.rangeLabel(m.juz, m.dari, m.sampai)} · ${m.baris} baris`}
        right=${m.lulus ? html`<${Pill} t=${"Lulus " + m.nilai} />` : m.setor.length ? html`<${Pill} t=${"Ulang " + m.nilai} tone="red" />` : html`<${Pill} t=${wajib ? "Pekan lalu" : "Setor"} tone=${wajib ? "red" : "gold"} />`}
        onClick=${() => nav.go("manzil", { sid: s.id, wk: w })} />`)}</div>` : html`<${Empty} t="Belum ada ziyadah pekan ini, jadi belum ada manzil." icon="layers" />`}</${Card}></div>`;
}

export function Manzil({ sid, wk }) {
  useApp();
  const s = L.santriById(sid), m = L.manzilWeek(s, wk); const [salah, setSalah] = useState(0);
  const nilai = L.nilaiDari(salah), lulus = nilai >= L.KKM;
  if (!m) return html`<${SubHeader} title="Manzil" /><div class="wrap"><${Empty} t="Tidak ada data manzil." /></div>`;
  const save = async () => {
    if (await put("setoran", uid("n"), { santri: sid, jenis: "manzil", tanggal: L.today(), pekan: wk, juz: m.juz, dari: m.dari, sampai: m.sampai, salah: Number(salah) || 0, nilai, lulus, guru: me().id, ts: Date.now() })) {
      toast(lulus ? "Manzil lulus, ziyadah pekan depan terbuka" : `Nilai ${nilai}, manzil diulang`, lulus ? "ok" : "err"); nav.back();
    }
  };
  return html`<${SubHeader} title="Setor Manzil" sub=${`Pekan ${L.fmtShort(wk)} – ${L.fmtShort(L.addDays(wk, 5))}`} />
    <div class="wrap"><${SantriHead} s=${s} h=${L.hafalan(s)} />
    <${Card} title="Rekap ziyadah pekan ini">
      <div class="kv"><span>Juz</span><b>${m.juz}</b></div><div class="kv"><span>Surah dan ayat</span><b>${L.rangeLabel(m.juz, m.dari, m.sampai)}</b></div>
      <div class="kv"><span>Dari</span><b>${L.posLabel(m.juz, m.dari)}</b></div><div class="kv"><span>Sampai</span><b>${L.posLabel(m.juz, m.sampai)}</b></div>
      <div class="kv"><span>Jumlah</span><b>${m.baris} baris · ${m.hari} kali setor</b></div></${Card}>
    ${m.lulus ? html`<div class="note green"><${Icon} n="check" s=${18} />Manzil pekan ini sudah lulus.</div>` : html`
    <${Card} title="Penilaian"><${Field} label="Jumlah kesalahan"><${Stepper} value=${salah} onChange=${setSalah} max=${34} label="jumlah kesalahan" /></${Field}>
      <div class=${"nilai-box " + (lulus ? "" : "red")}><span>Nilai · KKM ${L.KKM}<br />${lulus ? "Lulus, ziyadah terbuka" : "Belum lulus, ziyadah terkunci"}</span><b>${nilai}</b></div></${Card}>
    <${Btn} onClick=${save} icon="check">Simpan manzil</${Btn}>`}</div>`;
}

export function TasmiList() {
  useApp();
  const [kor, setKor] = useState(null);
  const a = myHalaqah(), list = L.santriHalaqah(a.id);
  const siap = list.filter(s => L.hafalan(s).siapTasmi);
  const hist = all("setoran").filter(r => r.jenis === "tasmi" && list.some(s => s.id === r.santri)).sort((x, y) => y.ts - x.ts).slice(0, 15);
  return html`<${SubHeader} title="Tasmi'" sub=${`Halaqah ${me().pendek} · ${siap.length} santri siap tasmi'`} />
    <div class="wrap">
    <${Card} title="Siap tasmi'">${siap.length ? html`<div class="list">${siap.map(s => { const h = L.hafalan(s); return html`<${Row} name=${s.nama} sub=${`Selesai Juz ${h.aktif} · ${h.total} dari ${h.total} baris`} right=${html`<${Pill} t="Siap" tone="gold" />`} onClick=${() => nav.go("tasmi", { sid: s.id })} />`; })}</div>`
      : html`<${Empty} t="Belum ada santri yang menyelesaikan juz. Coba input ziyadah sampai akhir juz." icon="mic" />`}</${Card}>
    ${kor ? html`<${KoreksiSheet} item=${kor} onClose=${() => setKor(null)} />` : null}<${Section} t="Riwayat tasmi' halaqah · ketuk untuk koreksi" /><${Card}>${hist.length ? html`<div class="list">${hist.map(r => html`<${Row} onClick=${() => setKor({ col: "setoran", list: [r] })} name=${L.santriAman(r.santri).nama} sub=${`Juz ${r.juz} · ${L.fmtTgl(r.tanggal)}`} right=${html`<${StatusPill} r=${r} />`} />`)}</div>` : html`<${Empty} t="Belum ada tasmi'." />`}</${Card}></div>`;
}

export function Tasmi({ sid, edit }) {
  useApp();
  const ed = edit ? get("setoran", edit) : null;
  const s = L.santriById(sid), h = L.hafalan(s, ed && ed.id);
  const [salah, setSalah] = useState(ed ? ed.salah : 0); const [penguji, setPenguji] = useState(ed ? ed.penguji : me().pendek); const [cat, setCat] = useState(ed ? ed.catatan || "" : "");
  const nilai = L.nilaiDari(salah), lulus = nilai >= L.KKM;
  const nx = DATA.urutanJuz.find(j => !h.selesai.includes(j) && j !== h.aktif);
  const save = async () => {
    if (await put("setoran", ed ? ed.id : uid("t"), { santri: sid, jenis: "tasmi", tanggal: ed ? ed.tanggal : L.today(), juz: h.aktif, salah: Number(salah) || 0, nilai, lulus, penguji, catatan: cat, guru: ed ? ed.guru : me().id, ts: ed ? ed.ts : Date.now(), ...(ed ? { diubah: { oleh: me().id, ts: Date.now() } } : {}) })) {
      if (ed) logUbah("ubah", "setoran", ed.id, `Koreksi tasmi' ${s.nama} Juz ${h.aktif}`);
      toast(lulus ? (nx ? `Lulus! Lanjut ke Juz ${nx}` : "Lulus! Khatam 30 juz") : `Nilai ${nilai}, tasmi' diulang`, lulus ? "ok" : "err"); nav.back();
    }
  };
  return html`<${SubHeader} title="Tasmi'" sub=${`Juz ${h.aktif} · ${L.fmtTgl(L.today())}`} />
    <div class="wrap"><${SantriHead} s=${s} h=${h} />
    ${!h.siapTasmi ? html`<div class="lockbox"><${Icon} n="lock" s=${20} />Juz ${h.aktif} belum selesai (${h.baris} dari ${h.total} baris).</div>` : html`
    <div class="lockbox"><${Icon} n="lock" s=${20} />Pindah ke juz berikutnya terkunci sampai tasmi' lulus.</div>
    <${Card} title="Nilai tasmi'"><${Field} label="Jumlah kesalahan"><${Stepper} value=${salah} onChange=${setSalah} max=${34} label="jumlah kesalahan" /></${Field}>
      <div class=${"nilai-box " + (lulus ? "" : "red")}><span>Nilai otomatis: 100 − (${salah || 0} × 3)<br />${lulus ? (nx ? `Lulus, lanjut Juz ${nx}` : "Lulus, khatam") : "Belum lulus, ulang"}</span><b>${nilai}</b></div>
      <${Field} label="Penguji"><input class="in" value=${penguji} onInput=${e => setPenguji(e.target.value)} /></${Field}>
      <${Field} label="Catatan"><textarea class="in" value=${cat} placeholder="Misal: lancar, perhatikan mad" onInput=${e => setCat(e.target.value)}></textarea></${Field}></${Card}>
    <${Btn} onClick=${save} icon="check">Simpan nilai tasmi'</${Btn}>`}</div>`;
}

export function UjianList() {
  useApp();
  const a = myHalaqah(), list = L.santriHalaqah(a.id); const [jenis, setJenis] = useState("mid");
  return html`<${SubHeader} title="Nilai Mid/Semester" sub=${`Ujian tahfidz · ${a.nama}`}><${Seg} items=${[["mid", "Mid semester"], ["smt", "Akhir semester"]]} value=${jenis} onChange=${setJenis} /></${SubHeader}>
    <div class="wrap"><${Hint}>Juz 29–30 dinilai per surah, juz lain per juz. Nilai masuk rapor otomatis.</${Hint}>
    <${Card}><div class="list">${list.map(s => { const d = get("nilaiTahfidz", s.id), v = d && d[jenis] ? Object.values(d[jenis]).filter(x => x !== "" && x != null) : [];
      const avg = v.length ? Math.round(v.reduce((x, y) => x + Number(y), 0) / v.length) : null;
      return html`<${Row} name=${s.nama} sub=${`Hafal ${L.fmtJumlah(L.hafalan(s))}`} right=${avg == null ? html`<${Pill} t="Belum" tone="muted" />` : html`<${Pill} t=${"Rata " + avg} tone=${avg >= 70 ? "green" : "red"} />`} onClick=${() => nav.go("ujian", { sid: s.id, jenis })} />`; })}</div></${Card}></div>`;
}

export function Ujian({ sid, jenis }) {
  useApp();
  const s = L.santriById(sid), h = L.hafalan(s), d = get("nilaiTahfidz", sid) || {};
  const [v, setV] = useState(() => ({ ...(d[jenis] || {}) }));
  const juzList = DATA.urutanJuz.filter(j => h.selesai.includes(j));
  const inp = (k, lab) => html`<tr><td>${lab}</td><td class="c"><input type="number" min="0" max="100" inputmode="numeric" value=${v[k] ?? ""} aria-label=${"Nilai " + lab}
    onInput=${e => setV({ ...v, [k]: e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))) })} /></td><td class="c">${v[k] === "" || v[k] == null ? "—" : L.predikat(Number(v[k])).h}</td></tr>`;
  const save = async () => { if (await put("nilaiTahfidz", sid, { ...d, [jenis]: v, santri: sid, ts: Date.now() })) { toast("Nilai ujian tersimpan"); nav.back(); } };
  return html`<${SubHeader} title=${jenis === "mid" ? "Nilai Mid Semester" : "Nilai Akhir Semester"} sub=${s.nama} />
    <div class="wrap">${juzList.length ? juzList.map(j => html`<${Card} title=${"Juz " + j}><table class="tbl"><thead><tr><th>${j >= 29 ? "Surah" : "Materi"}</th><th class="c">Nilai</th><th class="c">Pred.</th></tr></thead><tbody>
        ${j === 30 ? L.JUZ30.map(i => inp(`30:${i}`, L.surahName(i))) : j === 29 ? L.JUZ29.map(i => inp(`29:${i}`, L.surahName(i))) : inp(`j${j}`, `Juz ${j} (1 juz penuh)`)}</tbody></table></${Card}>`)
      : html`<${Card}><${Empty} t="Santri belum menyelesaikan satu juz pun." /></${Card}>`}
      ${juzList.length ? html`<${Btn} onClick=${save} icon="check">Simpan nilai</${Btn}>` : null}</div>`;
}

export function Progres({ hid, aid }) {
  useApp();
  const list = (hid ? L.santriHalaqah(hid) : aid ? L.santriAsrama(aid) : L.santriList()).map(s => ({ s, h: L.hafalan(s), c: L.capaianJuz(s) })).sort((a, b) => b.c.juz - a.c.juz);
  return html`<${SubHeader} title="Progres Santri" sub=${hid ? L.halaqahById(hid).nama : aid ? L.asramaAman(aid).nama : "Semua santri"} />
    <div class="wrap"><${Card}><div class="list">${list.map(({ s, h, c }) => html`<button class="row" onClick=${() => nav.go("santri", { sid: s.id })}>
      <span class="av">${L.initials(s.nama)}</span><span class="row-t"><b>${s.nama}</b><small>Baru semester ini ${c.juz.toLocaleString("id-ID")} dari ${c.target} juz · total ${L.fmtJumlah(h)} · sedang Juz ${h.aktif}</small>
      <span style="display:block;margin-top:6px"><${Bar} v=${c.pct} tone=${c.tercapai ? "green" : "gold"} /></span></span></button>`)}</div></${Card}></div>`;
}

export function IzinGuru({ edit }) {
  useApp();
  const ed = edit ? get("izinGuru", edit) : null;
  const [tgl, setTgl] = useState(ed ? ed.tanggal : L.today()); const [jenis, setJenis] = useState(ed ? ed.jenis : "Sakit"); const [alasan, setAlasan] = useState(ed ? ed.alasan || "" : ""); const [sel, setSel] = useState(null);
  const mine = all("izinGuru").filter(i => i.guru === me().id).sort((a, b) => b.ts - a.ts);
  const save = async () => {
    if (ed) { if (await put("izinGuru", edit, { ...ed, tanggal: tgl, jenis, alasan, diubah: { oleh: me().id, ts: Date.now() } })) { await logUbah("ubah", "izinGuru", edit, `Izin guru ${jenis} ${L.fmtTgl(tgl)}`, ed); toast("Izin guru diperbarui"); nav.back(); } return; }
    if (await put("izinGuru", uid("g"), { guru: me().id, tanggal: tgl, jenis, alasan, ts: Date.now() })) { toast("Izin tercatat, tanpa perlu persetujuan"); setAlasan(""); } };
  return html`${sel ? html`<${KoreksiSheet} item=${sel} onClose=${() => setSel(null)} />` : null}<${SubHeader} title=${ed ? "Ubah Izin Guru" : "Izin Guru"} sub="Langsung tercatat, tanpa persetujuan" />
    <div class="wrap"><${Card} title=${ed ? "Ubah izin" : "Ajukan izin"}>
      <${Field} label="Tanggal"><input type="date" class="in" value=${tgl} onInput=${e => setTgl(e.target.value)} /></${Field}>
      <${Field} label="Jenis"><${Seg} items=${[["Sakit", "Sakit"], ["Izin", "Izin"], ["Dinas", "Dinas luar"]]} value=${jenis} onChange=${setJenis} /></${Field}>
      <${Field} label="Keterangan"><textarea class="in" value=${alasan} onInput=${e => setAlasan(e.target.value)} placeholder="Misal: demam, ada acara keluarga"></textarea></${Field}>
      <${Btn} onClick=${save} icon="check">${ed ? "Simpan perubahan" : "Simpan izin"}</${Btn}></${Card}>
    <${Section} t="Riwayat izin saya" /><${Card}>${mine.length ? html`<div class="list">${mine.map(i => html`<${Row} name=${i.jenis + " · " + L.fmtTgl(i.tanggal)} sub=${(i.alasan || "—") + " · ketuk untuk ubah/hapus"} icon=${html`<${Icon} n="briefcase" s=${18} />`} onClick=${() => setSel({ col: "izinGuru", list: [i] })} />`)}</div>` : html`<${Empty} t="Belum ada izin." />`}</${Card}></div>`;
}
