// Rekap berbasis hari aktif (harian, pekanan, bulanan, mid, semester, tahunan) + kalender akademik
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Card, SubHeader, Row, Pill, Btn, Empty, Seg, Section, Sheet, Field, Confirm, Bar, Hint, Stat } from "./ui.js";
import { get, put, del, toast, uid } from "./store.js";
import { DATA } from "./data.js";
import { LIBUR_NASIONAL } from "./libur.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { logUbah } from "./s_koreksi.js";

const tone = v => (v == null ? "muted" : v >= 90 ? "green" : v >= 75 ? "blue" : v >= 60 ? "gold" : "red");
const P = v => (v == null ? "—" : v + "%");

export function usePeriode(def = "pekanan") {
  const [jenis, setJenis] = useState(def); const [ref, setRef] = useState(L.today());
  const rg = L.periodeRange(jenis, ref), geser = ["harian", "pekanan", "bulanan"].includes(jenis);
  const ha = L.hariAktifDalam(rg, "halaqah").length, hk = L.hariAktifDalam(rg, "kbm").length, hs = L.hariAktifDalam(rg, "asrama").length, rh = L.rentangHitung(rg);
  const bar = html`<div class="periode">
    <div class="seg small">${L.PERIODE.map(([k, t]) => html`<button class=${k === jenis ? "on" : ""} onClick=${() => { setJenis(k); setRef(L.today()); }}>${t}</button>`)}</div>
    <div class="per-nav">${geser ? html`<button class="icon-btn" aria-label="Sebelumnya" onClick=${() => setRef(L.geserPeriode(jenis, ref, -1))}><${Icon} n="left" s=${20} /></button>` : null}
      <div class="per-t"><b>${rg.label}</b><small>${rh.kosong ? "Belum ada hari yang dihitung" : `Dihitung ${L.fmtShort(rh.dari)} – ${L.fmtShort(rh.sampai)} · aktif: halaqah ${ha}, KBM ${hk}, asrama ${hs} hari`}</small></div>
      ${geser ? html`<button class="icon-btn" aria-label="Berikutnya" disabled=${rg.sampai >= L.today()} onClick=${() => setRef(L.geserPeriode(jenis, ref, 1))}><${Icon} n="right" s=${20} /></button>` : null}</div></div>`;
  return { jenis, rg, bar };
}

function lingkup() {
  const m = me(), r = m.roles, a = L.asramaOf(m.id);
  const semuaAsr = r.some(x => ["mudir", "wadir_tahfidz", "wadir_kurikulum"].includes(x));
  const asr0 = semuaAsr ? L.ASRAMA : r.includes("wadir_kesantrian") ? L.ASRAMA.filter(x => x.pondok === m.pondok) : a ? [a] : [];
  const asr = a ? [a, ...asr0.filter(x => x.id !== a.id)] : asr0;
  const semuaKls = r.some(x => ["mudir", "wadir_kurikulum"].includes(x));
  const kls = semuaKls ? ["7", "8", "9A", "9B"] : [...new Set(m.ajar.map(([, k]) => k))];
  const tabs = [];
  if (asr.length) tabs.push(["halaqah", "Halaqah"], ["motd", "MOTD"], ["mut", "Mutaba'ah"]);
  if (kls.length) tabs.push(["kbm", "KBM"]);
  return { m, asr, kls, tabs, semuaKls };
}

export function RekapHub({ tab: t0 }) {
  useApp();
  const lk = lingkup(); const [tab, setTab] = useState(lk.tabs.find(x => x[0] === t0) ? t0 : (lk.tabs[0] || [""])[0]);
  const p = usePeriode("pekanan");
  if (!lk.tabs.length) return html`<${SubHeader} title="Rekap" /><div class="wrap"><${Card}><${Empty} t="Tidak ada data rekap untuk peran ini." icon="chart" /></${Card}></div>`;
  return html`<${SubHeader} title="Rekap" sub="Berdasarkan hari aktif"><${Seg} items=${lk.tabs} value=${tab} onChange=${setTab} /></${SubHeader}>
    <div class="wrap">${p.bar}
      ${tab === "halaqah" ? html`<${RekapHalaqahP} asr=${lk.asr} rg=${p.rg} />` : tab === "motd" ? html`<${RekapMotdP} asr=${lk.asr} rg=${p.rg} />` : tab === "mut" ? html`<${RekapMutP} asr=${lk.asr} rg=${p.rg} />` : html`<${RekapKbmP} lk=${lk} rg=${p.rg} />`}
      <${Hint}>Persentase = yang tercatat dibagi hari/sesi aktif pada periode. Hari yang tidak diinput dihitung 0. Ahad, libur nasional, dan libur pondok tidak dihitung (atur di menu Kalender).</${Hint}></div>`;
}

function Kartu({ title, sub, onClick, stats }) {
  return html`<button class="card rk" onClick=${onClick}><div class="card-h"><h3>${title}</h3><${Icon} n="right" s=${18} c="#9AB0A5" /></div>${sub ? html`<div class="small mb8">${sub}</div>` : null}
    <div class="rk-g">${stats.map(([lab, v, s]) => html`<div><span>${lab}</span><b class=${"t-" + tone(v)}>${P(v)}</b><${Bar} v=${v || 0} tone=${tone(v) === "muted" ? "green" : tone(v)} />${s ? html`<small>${s}</small>` : null}</div>`)}</div></button>`;
}

function RekapHalaqahP({ asr, rg }) {
  return html`${asr.map(a => { const k = L.kinerjaHalaqah(a.id, rg), list = L.santriAsrama(a.id), kh = list.map(s => L.kehadiranHalaqah(s.id, rg).pct).filter(x => x != null);
    const avg = kh.length ? Math.round(kh.reduce((x, y) => x + y, 0) / kh.length) : null;
    return html`<${Kartu} title=${a.nama} sub=${`${L.staffById(a.musyrif).pendek} · ${list.length} santri · ${k.sesi} sesi aktif`} onClick=${() => nav.go("rekapDetail", { jenis: "halaqah", aid: a.id, pj: rg })}
      stats=${[["Kehadiran santri", avg], ["Absen terisi (guru)", k.pct, `${k.isi}/${k.sesi} sesi`]]} />`; })}`;
}
function RekapMotdP({ asr, rg }) {
  return html`${asr.map(a => { const k = L.kinerjaMotd(a.id, rg);
    return html`<${Kartu} title=${a.nama} sub=${`Pondok ${a.pondok} · alpa ${k.al} · masbuq ${k.mb}`} onClick=${() => nav.go("rekapDetail", { jenis: "motd", aid: a.id, pj: rg })}
      stats=${[["Waktu terabsen", k.pct, `${k.isi}/${k.slot} waktu`], ["Kepatuhan santri", k.isi ? Math.max(0, Math.round(100 - ((k.al + k.mb) / Math.max(1, k.isi * L.santriAsrama(a.id).length)) * 100)) : null]]} />`; })}`;
}
function RekapMutP({ asr, rg }) {
  return html`${asr.map(a => { const k = L.kinerjaMut(a.id, rg), ps = L.santriAsrama(a.id).map(s => L.mutPersen(s.id, rg)).filter(x => x.ibadah != null);
    const av = f => (ps.length ? Math.round(ps.reduce((x, y) => x + y[f], 0) / ps.length) : null);
    return html`<${Kartu} title=${a.nama} sub=${`${L.staffById(a.musyrif).pendek} · input ${k.isi}/${k.target}`} onClick=${() => nav.go("rekapDetail", { jenis: "mut", aid: a.id, pj: rg })}
      stats=${[["Ibadah", av("ibadah")], ["Adab", av("adab")], ["Input terisi", k.pct]]} />`; })}`;
}
function RekapKbmP({ lk, rg }) {
  const guru = lk.semuaKls ? L.STAFF.filter(s => s.roles.includes("guru_mapel")) : [lk.m];
  return html`<${Section} t="Kehadiran santri per kelas" />${lk.kls.map(k => { const ps = L.santriKelas(k).map(s => L.kehadiranKelas(s.id, null, rg).pct).filter(x => x != null);
      const avg = ps.length ? Math.round(ps.reduce((x, y) => x + y, 0) / ps.length) : null, kj = L.kinerjaMapel(lk.semuaKls ? null : lk.m.id, rg, k);
      return html`<${Kartu} title=${"Kelas " + k} sub=${`${L.santriKelas(k).length} santri · ${kj.sesi} pertemuan terjadwal`} onClick=${() => nav.go("rekapDetail", { jenis: "kbm", kelas: k, pj: rg, guru: lk.semuaKls ? null : lk.m.id })}
        stats=${[["Kehadiran santri", avg], ["Pertemuan terlaksana", kj.pct, `${kj.absen}/${kj.sesi}`]]} />`; })}
    <${Section} t="Kinerja guru mapel" /><${Card}><div class="list">${guru.map(g => { const k = L.kinerjaMapel(g.id, rg);
      return html`<div class="row"><span class="av">${L.initials(g.pendek.replace(/^Ust(dzh)?\.\s*/, ""))}</span><span class="row-t"><b>${g.nama}</b><small>${k.absen}/${k.sesi} terlaksana · jurnal ${k.jurnal}/${k.sesi}</small>
        <span style="display:block;margin-top:6px"><${Bar} v=${k.pct || 0} tone=${tone(k.pct) === "muted" ? "green" : tone(k.pct)} /></span></span><${Pill} t=${P(k.pct)} tone=${tone(k.pct)} /></div>`; })}</div></${Card}>`;
}

export function RekapDetail({ jenis, aid, kelas, pj, guru }) {
  useApp();
  const rg = pj || L.periodeRange("pekanan");
  const list = aid ? L.santriAsrama(aid) : L.santriKelas(kelas);
  const judul = { halaqah: "Kehadiran Halaqah", motd: "Rekap MOTD", mut: "Rekap Mutaba'ah", kbm: "Kehadiran Kelas" }[jenis];
  const mapel = guru ? [...new Set(L.staffById(guru).ajar.filter(([, k]) => k === kelas).map(([m]) => m))] : null;
  const rows = list.map(s => {
    if (jenis === "halaqah") { const k = L.kehadiranHalaqah(s.id, rg); return [s, k.pct, `H ${k.H} · S ${k.S} · I ${k.I} · A ${k.A} · belum diabsen ${k.kosong} dari ${k.sesi} sesi`]; }
    if (jenis === "mut") { const k = L.mutPersen(s.id, rg); return [s, k.ibadah == null ? null : Math.round((k.ibadah + k.adab) / 2), `Ibadah ${P(k.ibadah)} · Adab ${P(k.adab)} · diinput ${k.isi}/${k.hari} hari`]; }
    if (jenis === "motd") { let al = 0, mb = 0, n = 0; L.hariAktifDalam(rg, "asrama").forEach(t => L.WAKTU.forEach(([w]) => { const d = get("motd", L.motdKey(s.asrama, t, w)); if (d) { n++; const v = d.status[s.id]; if (v === "A") al++; if (v === "M") mb++; } }));
      let po = 0; L.hariAktifDalam(rg, "asrama").forEach(t => L.WAKTU.forEach(([w]) => { const d = get("motd", L.motdKey(s.asrama, t, w)); if (d) po += L.poinMotd(w, d.status[s.id]); }));
      return [s, n ? Math.round(((n - al - mb) / n) * 100) : null, `Alpa ${al} · masbuq ${mb} · ${po} poin · ${n} waktu terabsen`]; }
    const ks = (mapel || [null]).map(m => L.kehadiranKelas(s.id, m, rg)), H = ks.reduce((x, k) => x + k.H, 0), ses = ks.reduce((x, k) => x + k.sesi, 0), kos = ks.reduce((x, k) => x + k.kosong, 0);
    return [s, ses ? Math.round((H / ses) * 100) : null, `Hadir ${H} dari ${ses} pertemuan · belum diabsen ${kos}`];
  }).sort((a, b) => (a[1] ?? -1) - (b[1] ?? -1));
  return html`<${SubHeader} title=${judul} sub=${`${aid ? L.asramaById(aid).nama : "Kelas " + kelas} · ${rg.label}`} />
    <div class="wrap"><${Hint}>Diurutkan dari yang paling rendah. Hari/sesi yang tidak diinput ikut dihitung sehingga persentase turun.</${Hint}>
    <${Card}><div class="list">${rows.map(([s, v, sub]) => html`<${Row} name=${s.nama} sub=${sub} right=${html`<${Pill} t=${P(v)} tone=${tone(v)} />`} onClick=${() => nav.go("santri", { sid: s.id })} />`)}</div></${Card}></div>`;
}

// ---------------- Kalender akademik (admin) ----------------
export function Kalender() {
  useApp();
  const st = L.setelan(), lp = L.liburPondok(); const [ed, setEd] = useState(null); const [f, setF] = useState(null); const [th, setTh] = useState(L.today().slice(0, 4));
  const bisa = me().roles.some(r => ["admin", "mudir", "wadir_kurikulum"].includes(r));
  const simpanSet = async () => { if (await put("kalender", "setelan", { ...st, ...f })) { logUbah("ubah", "kalender", "setelan", "Ubah tanggal semester"); toast("Kalender akademik disimpan"); setF(null); } };
  const togAbaikan = async tgl => { const ab = new Set(st.abaikan || []); ab.has(tgl) ? ab.delete(tgl) : ab.add(tgl); await put("kalender", "setelan", { ...st, abaikan: [...ab] }); };
  const fld = (k, lab) => html`<${Field} label=${lab}><input class="in" type="date" value=${(f || st)[k]} onInput=${e => setF({ ...(f || st), [k]: e.target.value })} /></${Field}>`;
  const nas = LIBUR_NASIONAL.filter(l => l.tgl.startsWith(th));
  return html`<${SubHeader} title="Kalender Akademik" sub=${`Tahun pelajaran ${st.tp}`} />
    <div class="wrap">
    <${Card} title="Hari aktif">
      <div class="kv"><span>KBM mapel</span><b>Senin – Jumat</b></div><div class="kv"><span>Halaqah</span><b>Senin – Sabtu (Sabtu Shubuh)</b></div>
      <div class="kv"><span>MOTD & mutaba'ah</span><b>Setiap hari di pondok</b></div><div class="kv"><span>Tidak dihitung</span><b>Ahad, libur nasional, libur pondok</b></div></${Card}>
    <${Card} title="Semester & mulai pakai" right=${bisa && !f ? html`<button class="link" onClick=${() => setF({ ...st })}>Ubah</button>` : null}>
      ${f ? html`<div class="btn-row">${fld("ganjilMulai", "Ganjil mulai")}${fld("ganjilMid", "Akhir mid ganjil")}</div><div class="btn-row">${fld("ganjilSelesai", "Ganjil selesai")}${fld("genapMulai", "Genap mulai")}</div>
          <div class="btn-row">${fld("genapMid", "Akhir mid genap")}${fld("genapSelesai", "Genap selesai")}</div>${fld("mulaiPakai", "Mulai pakai aplikasi")}
          <p class="small">Rekap hanya menghitung hari sejak aplikasi mulai dipakai, supaya hari sebelum ada aplikasi tidak dihitung 0.</p>
          <div class="btn-row"><${Btn} kind="ghost" onClick=${() => setF(null)}>Batal</${Btn}><${Btn} onClick=${simpanSet}>Simpan</${Btn}></div>`
        : html`<div class="kv"><span>Semester ganjil</span><b>${L.fmtTgl(st.ganjilMulai, false)} – ${L.fmtTgl(st.ganjilSelesai, false)}</b></div><div class="kv"><span>Mid ganjil sampai</span><b>${L.fmtTgl(st.ganjilMid, false)}</b></div>
          <div class="kv"><span>Semester genap</span><b>${L.fmtTgl(st.genapMulai, false)} – ${L.fmtTgl(st.genapSelesai, false)}</b></div><div class="kv"><span>Mid genap sampai</span><b>${L.fmtTgl(st.genapMid, false)}</b></div>
          <div class="kv"><span>Mulai pakai aplikasi</span><b>${L.fmtTgl(st.mulaiPakai, false)}</b></div>`}</${Card}>
    <${Card} title="Libur pondok" right=${bisa ? html`<button class="link" onClick=${() => setEd({ baru: true, nama: "", mulai: L.today(), selesai: L.today(), jenis: "pondok" })}>+ Tambah</button>` : null}>
      ${lp.length ? html`<div class="list">${lp.map(l => html`<${Row} name=${l.nama} sub=${`${L.fmtTgl(l.mulai, false)} – ${L.fmtTgl(l.selesai, false)} · ${L.hariRentang(l.mulai, l.selesai).length} hari · ${l.jenis === "kbm" ? "libur KBM saja" : "semua kegiatan libur"}`}
          icon=${html`<${Icon} n="calendar" s=${18} />`} onClick=${bisa ? () => setEd({ ...l }) : null} />`)}</div>` : html`<${Empty} t="Belum ada libur pondok. Tambahkan libur panjang (misal libur semester) agar tidak masuk rekap." icon="calendar" />`}</${Card}>
    <${Card} title="Libur nasional & cuti bersama" right=${html`<div class="seg small" style="width:120px">${["2026", "2027"].map(y => html`<button class=${y === th ? "on" : ""} onClick=${() => setTh(y)}>${y}</button>`)}</div>`}>
      <p class="small" style="margin-top:0">Sesuai SKB 3 Menteri. Pada tanggal ini KBM dan halaqah tidak dihitung. Jika pondok tetap berkegiatan, ketuk untuk menandai "tetap masuk".</p>
      <div class="list">${nas.map(l => { const ab = (st.abaikan || []).includes(l.tgl); return html`<${Row} name=${l.nama} sub=${`${L.fmtTgl(l.tgl)}${l.jenis === "cuti" ? " · cuti bersama" : ""}`}
        icon=${html`<${Icon} n="calendar" s=${18} />`} right=${html`<${Pill} t=${ab ? "Tetap masuk" : "Libur"} tone=${ab ? "green" : "red"} />`} onClick=${bisa ? () => togAbaikan(l.tgl) : null} />`; })}</div></${Card}></div>
    ${ed ? html`<${EditLibur} e=${ed} onClose=${() => setEd(null)} />` : null}`;
}
function EditLibur({ e, onClose }) {
  const [f, setF] = useState(e); const [ask, setAsk] = useState(false);
  const ok = f.nama.trim() && f.mulai && f.selesai && f.selesai >= f.mulai;
  const save = async () => { const id = e.baru ? uid("lb") : e.id; const d = { nama: f.nama.trim(), mulai: f.mulai, selesai: f.selesai, jenis: f.jenis, oleh: me().id, ts: Date.now() };
    if (await put("kalender", id, d)) { logUbah(e.baru ? "tambah" : "ubah", "kalender", id, `Libur pondok: ${d.nama}`); toast("Libur pondok disimpan. Rekap otomatis menyesuaikan."); onClose(); } };
  const hapus = async () => { setAsk(false); await logUbah("hapus", "kalender", e.id, `Libur pondok: ${e.nama}`, e); await del("kalender", e.id); toast("Libur dihapus"); onClose(); };
  return html`<${Sheet} open=${true} title=${e.baru ? "Tambah libur pondok" : "Ubah libur pondok"} onClose=${onClose}>
    <${Field} label="Nama libur"><input class="in" value=${f.nama} placeholder="Misal: Libur akhir semester ganjil" onInput=${x => setF({ ...f, nama: x.target.value })} /></${Field}>
    <div class="btn-row"><${Field} label="Mulai"><input class="in" type="date" value=${f.mulai} onInput=${x => setF({ ...f, mulai: x.target.value })} /></${Field}>
      <${Field} label="Selesai"><input class="in" type="date" value=${f.selesai} onInput=${x => setF({ ...f, selesai: x.target.value })} /></${Field}></div>
    <${Field} label="Jenis"><${Seg} small items=${[["pondok", "Semua libur (santri pulang)"], ["kbm", "Libur KBM saja"]]} value=${f.jenis} onChange=${v => setF({ ...f, jenis: v })} /></${Field}>
    <p class="small">${f.mulai && f.selesai >= f.mulai ? `${L.hariRentang(f.mulai, f.selesai).length} hari tidak dihitung di rekap ${f.jenis === "kbm" ? "KBM" : "halaqah, MOTD, mutaba'ah, dan KBM"}.` : "Tanggal selesai harus sama atau setelah tanggal mulai."}</p>
    <div class="btn-row mt8">${!e.baru ? html`<${Btn} kind="outline" icon="trash" onClick=${() => setAsk(true)}>Hapus</${Btn}>` : null}<${Btn} disabled=${!ok} onClick=${save}>Simpan</${Btn}></div>
    <${Confirm} open=${ask} danger title="Hapus libur ini?" text="Hari-hari ini akan kembali dihitung sebagai hari aktif di rekap." yes="Hapus" onYes=${hapus} onNo=${() => setAsk(false)} /></${Sheet}>`;
}
