// Ceklis Musyrif: ceklis harian musyrif / wali asrama (ringkasan dari "Ceklis Harian Musyrif", 58 poin → 16 butir)
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Tile, Card, SubHeader, Stat, Row, Pill, Btn, Empty, Seg, Hint, Angka } from "./ui.js";
import { S, all, get, put, toast } from "./store.js";
import * as L from "./logic.js";
import { usePeriode } from "./s_rekap.js";
import { Panel } from "./s_rekapmodul.js";
import { me } from "./common.js";
import { unduhPdf, tabelKePdf } from "./pdf.js";
import { ttdUntukPdf } from "./s_ttd.js";
import { Evaluasi } from "./s_laporan.js";
import { evKinerja, denganLalu } from "./evaluasi.js";

const sesiAda = (tgl, se) => L.sesiHari(tgl).includes(se);
const kerja = tgl => L.parseYmd(tgl).getDay() >= 1 && L.parseYmd(tgl).getDay() <= 5;
// butir: id, teks, sub (pilihan per waktu), hari (berlaku pada tanggal itu?), auto (dari data aplikasi), wajibAuto (hanya bisa dari data)
export const KHIDMAH = [
  { id: "pagi", judul: "Subuh & pagi", ic: "sun", butir: [
    { id: "bangun", t: "Bangun lebih awal, membangunkan santri dengan baik sampai siap shalat" },
    { id: "aman", t: "Asrama aman ditinggal", ket: "AC & lampu mati, kamar dikunci, kamar mandi dicek" },
    { id: "dzikir", t: "Memimpin / mengawasi dzikir pagi" },
    { id: "bersih1", t: "Kebersihan & piket pagi dikontrol, laporan dikirim ke grup" },
    { id: "apel", t: "Santri diarahkan mandi, sarapan & apel pagi" }] },
  { id: "halaqah", judul: "Halaqah", ic: "bookopen", hari: t => L.adaHalaqah(t), butir: [
    { id: "hadir", t: "Hadir halaqah tepat waktu", sub: t => L.sesiHari(t), auto: "halaqah" },
    { id: "simak", t: "Menyimak setoran, koreksi tajwid & makhraj, memotivasi santri" },
    { id: "catat", t: "Progres hafalan dicatat di aplikasi", auto: "setoran", wajibAuto: true, hari: t => !L.khususManzil(t) },
    { id: "literasi", t: "Mendampingi program literasi", ket: "Musyrif membaca buku atau murajaah pribadi", hari: t => sesiAda(t, "Dhuha") || sesiAda(t, "Malam") },
    { id: "malam", t: "Wirid Al-Mulk & sharing session bersama santri", ket: "Bercerita, ngobrol, mendengar keluh kesah santri", hari: t => sesiAda(t, "Malam") }] },
  { id: "shalat", judul: "Shalat berjamaah", ic: "moon", butir: [
    { id: "santri", t: "Santri hadir shalat berjamaah dengan tertib", sub: () => ["Shubuh", "Dhuhur", "Ashar", "Maghrib", "Isya"] },
    { id: "takbir", t: "Takbiratul ihram bersama imam", sub: () => ["Dhuhur", "Ashar", "Maghrib", "Isya"] }] },
  { id: "malam", judul: "Sore & malam", ic: "home", butir: [
    { id: "bersih2", t: "Kebersihan & piket sore dikontrol" },
    { id: "kamar", t: "Kamar dikontrol, santri tidur tepat waktu, keamanan & ketertiban terjaga" },
    { id: "mut", t: "Mutaba'ah ibadah & adab santri diisi", auto: "mutabaah", wajibAuto: true, hari: t => !L.liburMutabaah(t) },
    { id: "rehat", t: "Istirahat tidak larut malam" }] },
  { id: "pribadi", judul: "Amal pribadi", ic: "star", butir: [
    { id: "amal", t: "Produktivitas spiritual musyrif", sub: () => ["Qiyamul lail", "Tilawah 1 juz", "Istighfar 100×", "Murajaah pribadi", "Shalat Dhuha"] }] },
];
const WAKTU_MOTD = { Shubuh: "subuh", Dhuhur: "dzuhur", Ashar: "ashar", Maghrib: "maghrib", Isya: "isya" };
export const khKey = (gid, tgl) => `${gid}_${tgl}`;

// daftar unit yang berlaku pada tanggal itu: [{ id: "hadir:Shubuh", butir, label }]
export function unitKhidmah(tgl) {
  const out = [];
  KHIDMAH.forEach(g => { if (g.hari && !g.hari(tgl)) return; g.butir.forEach(b => { if (b.hari && !b.hari(tgl)) return;
    if (b.sub) b.sub(tgl).forEach(x => out.push({ id: `${b.id}:${x}`, b, g, label: x })); else out.push({ id: b.id, b, g }); }); });
  return out;
}
// nilai otomatis dari data aplikasi: true (tercatat), false (belum), null (tidak bisa dicek → manual)
// indeks setoran per tanggal & izin guru, dibangun sekali per perubahan data (rekap sebulan jadi ringan)
let _ix = { set: null, iz: null, perTgl: null, izin: null };
function indeks() {
  if (_ix.set !== S.data.setoran || _ix.iz !== S.data.izinGuru) {
    const perTgl = new Map(); all("setoran").forEach(r => { let o = perTgl.get(r.tanggal); if (!o) perTgl.set(r.tanggal, (o = { guru: new Set(), santri: new Set() })); o.guru.add(r.guru); o.santri.add(r.santri); });
    const izin = new Set(all("izinGuru").map(i => i.guru + "|" + i.tanggal));
    _ix = { set: S.data.setoran, iz: S.data.izinGuru, perTgl, izin };
  }
  return _ix;
}
export function autoKhidmah(gid, tgl) {
  const a = L.asramaOf(gid), hq = L.halaqahOf(gid), res = {};
  unitKhidmah(tgl).forEach(u => {
    const k = u.b.auto; if (!k) return;
    if (k === "halaqah") res[u.id] = hq ? (get("absenHalaqah", L.halaqahKey(hq.id, tgl, u.label)) ? true : false) : null;
    if (k === "setoran") { const o = indeks().perTgl.get(tgl); res[u.id] = hq ? !!o && (o.guru.has(gid) || L.santriHalaqah(hq.id).some(s => o.santri.has(s.id))) : null; }
    if (k === "motd") res[u.id] = a ? (get("motd", L.motdKey(a.id, tgl, WAKTU_MOTD[u.label])) ? true : false) : null;
    if (k === "mutabaah") res[u.id] = a ? L.santriAsrama(a.id).every(s => get("mutabaah", L.mutKey(s.id, tgl)) || L.alasanTidakDinilai(s.id, tgl)) : null;
  });
  return res;
}
// unit yang dianggap terlaksana = centang manual ∪ otomatis-true (otomatis-false mengunci butir wajib-otomatis)
export function hasilKhidmah(gid, tgl) {
  const units = unitKhidmah(tgl), doc = get("khidmah", khKey(gid, tgl)), cek = new Set((doc && doc.cek) || []), au = autoKhidmah(gid, tgl);
  const selesai = new Set(units.filter(u => au[u.id] === true || (!u.b.wajibAuto && cek.has(u.id))).map(u => u.id));
  return { units, doc, cek, au, selesai, pct: units.length ? Math.round((selesai.size / units.length) * 100) : null };
}
// rekap periode: hari berlaku = hari aktif asrama; hari wali asrama izin (Izin Guru) tidak dihitung bila kosong
export function rekapKhidmah(gid, rg) {
  const hari = L.hariAktifDalam(rg, "mutabaah"); let total = 0, isi = 0, hariIsi = 0, dikecualikan = 0; const perButir = {};
  hari.forEach(t => {
    const h = hasilKhidmah(gid, t);
    if (!h.doc && indeks().izin.has(gid + "|" + t)) { dikecualikan++; return; }
    if (h.doc) hariIsi++;
    total += h.units.length; isi += h.selesai.size;
    h.units.forEach(u => { const k = u.b.id, o = perButir[k] || (perButir[k] = { t: u.b.t, n: 0, ok: 0 }); o.n++; if (h.selesai.has(u.id)) o.ok++; });
  });
  return { hari: hari.length - dikecualikan, hariIsi, dikecualikan, pct: total ? Math.round((isi / total) * 100) : null, perButir };
}
export const musyrifList = (pondok) => L.ASRAMA.filter(a => a.musyrif && (!pondok || a.pondok === pondok)).map(a => ({ a, g: L.staffById(a.musyrif) })).filter(x => x.g);

// taburan bintang & kertas warna saat ceklis lengkap 100%
export function Konfeti() {
  const W = ["#E2A93B", "#F2C55E", "#22B573", "#4B8DF0", "#F06A55", "#fff"];
  return html`<div class="konfeti" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => html`<i style=${`--x:${(i * 37) % 100}%;--d:${(i % 7) * 70}ms;--r:${(i * 53) % 360}deg;--c:${W[i % W.length]};--s:${0.7 + (i % 4) * 0.15}`}></i>`)}</div>`;
}
const nada = v => (v == null ? "muted" : v >= 90 ? "green" : v >= 75 ? "blue" : v >= 60 ? "gold" : "red");

export function Khidmah({ tgl: t0, gid: g0 }) {
  useApp();
  const tgl = t0 || L.today(), gid = g0 || me().id, milik = gid === me().id, g = L.staffAman(gid), a = L.asramaOf(gid);
  const boleh = milik && (tgl === L.today() || tgl === L.addDays(L.today(), -1));
  const h = hasilKhidmah(gid, tgl);
  const [cek, setCek] = useState(() => new Set(h.cek));
  if (!L.hariAktif(tgl, "mutabaah")) return html`<${SubHeader} title="Ceklis Musyrif" sub=${L.fmtTgl(tgl)} /><div class="wrap"><${Card}><${Empty} t=${[0, 6].includes(L.parseYmd(tgl).getDay()) ? "Sabtu & Ahad libur. Tidak ada ceklis musyrif." : "Hari ini libur pondok. Tidak ada ceklis musyrif."} icon="calendar" /></${Card}></div>`;
  const selesai = new Set(h.units.filter(u => h.au[u.id] === true || (!u.b.wajibAuto && cek.has(u.id))).map(u => u.id));
  const pct = h.units.length ? Math.round((selesai.size / h.units.length) * 100) : 0;
  const simpan = async n => {
    const ex = get("khidmah", khKey(gid, tgl));
    await put("khidmah", khKey(gid, tgl), { musyrif: gid, asrama: a ? a.id : null, tanggal: tgl, cek: [...n], ts: ex ? ex.ts : Date.now(), ubah: Date.now(), ...(tgl < L.today() ? { menyusul: true } : {}) });
  };
  const tog = id => { if (!boleh) return; const n = new Set(cek); n.has(id) ? n.delete(id) : n.add(id); setCek(n); simpan(n); };
  const semuaButir = (b, ids) => { if (!boleh) return; const n = new Set(cek), on = ids.every(i => selesai.has(i)); ids.forEach(i => { if (h.au[i] !== true) on ? n.delete(i) : n.add(i); }); setCek(n); simpan(n); };
  const grup = KHIDMAH.map(gr => ({ gr, units: h.units.filter(u => u.g.id === gr.id) })).filter(x => x.units.length);
  return html`<${SubHeader} title="Ceklis Musyrif" sub=${`${milik ? "" : g.pendek + " · "}${a ? "Asrama " + a.nama + " · " : ""}${L.fmtTgl(tgl)}`} />
    <div class="wrap">
      <div class="kh-hero"><div class="kh-ring" style=${`--p:${pct}`}><b><${Angka} v=${pct + "%"} /></b></div>${pct >= 100 ? html`<${Konfeti} />` : null}<div><b>${selesai.size} dari ${h.units.length} terlaksana</b>
        <small>${pct >= 100 ? "MasyaAllah, ceklis hari ini lengkap." : boleh ? "Centang setiap tugas begitu selesai. Tersimpan otomatis." : milik ? "Hanya hari ini dan kemarin yang bisa diisi." : "Hanya melihat."}</small></div></div>
      ${grup.map(({ gr, units }) => { const ok = units.filter(u => selesai.has(u.id)).length;
        const butir = [...new Set(units.map(u => u.b))];
        return html`<${Card} title=${gr.judul} right=${html`<small>${ok}/${units.length}</small>`}>${butir.map(b => {
          const us = units.filter(u => u.b === b), single = !b.sub, u0 = us[0], src = b.auto ? { halaqah: "absen halaqah", setoran: "setoran ziyadah", motd: "absen MOTD", mutabaah: "mutaba'ah" }[b.auto] : null;
          if (single) { const on = selesai.has(u0.id), au = h.au[u0.id], kunci = au === true || b.wajibAuto;
            return html`<button class=${"check " + (on ? "on " : "") + (kunci ? "auto" : "")} aria-pressed=${on} disabled=${kunci || !boleh} onClick=${() => tog(u0.id)}>
              <span class="box">${on ? html`<${Icon} n="check" s=${16} c="#fff" w=${3} />` : null}</span><span>${b.t}${b.ket ? html`<small class="kh-ket">${b.ket}</small>` : null}</span>${src ? html`<em>${au === true ? "Otomatis" : au === false ? "Belum tercatat" : "Manual"}</em>` : null}</button>`; }
          const semua = us.every(u => selesai.has(u.id));
          return html`<div class="kh-multi"><button type="button" class=${"check " + (semua ? "on" : "")} aria-pressed=${semua} disabled=${!boleh} onClick=${() => semuaButir(b, us.map(u => u.id))}>
              <span class="box">${semua ? html`<${Icon} n="check" s=${16} c="#fff" w=${3} />` : null}</span><span>${b.t}${src ? html`<small class="kh-ket">Terisi otomatis dari ${src}</small>` : null}</span></button>
            <div class="kh-chips">${us.map(u => { const on = selesai.has(u.id), au = h.au[u.id] === true;
              return html`<button type="button" class=${(on ? "on " : "") + (au ? "auto" : "")} disabled=${au || !boleh} onClick=${() => tog(u.id)}>${on ? "✓ " : ""}${u.label}</button>`; })}</div></div>`;
        })}</${Card}>`; })}
      ${milik ? html`<${Btn} kind="ghost" icon="chart" onClick=${() => nav.go("khidmahRiwayat", { gid })}>Riwayat & rekap saya</${Btn}>` : null}
    </div>`;
}

// Riwayat satu musyrif: 14 hari terakhir + rekap periode
export function KhidmahRiwayat({ gid: g0 }) {
  useApp();
  const gid = g0 || me().id, g = L.staffAman(gid), [per, setPer] = useState("bulanan"), rg = L.periodeRange(per), rk = rekapKhidmah(gid, rg);
  const hari = Array.from({ length: 14 }, (_, i) => L.addDays(L.today(), -i)).filter(t => L.hariAktif(t, "mutabaah") && t >= L.setelan().mulaiPakai);
  const lemah = Object.values(rk.perButir).filter(o => o.n).map(o => ({ ...o, p: Math.round((o.ok / o.n) * 100) })).sort((x, y) => x.p - y.p).slice(0, 4);
  return html`<${SubHeader} title="Riwayat Ceklis" sub=${g.nama}><${Seg} small items=${L.PERIODE.filter(([k]) => ["pekanan", "bulanan", "semester"].includes(k))} value=${per} onChange=${setPer} /></${SubHeader}>
    <div class="wrap">
      <${Card}><div class="stats"><${Stat} label="Terlaksana" value=${rk.pct == null ? "—" : rk.pct + "%"} tone=${nada(rk.pct) === "red" ? "red" : ""} sub=${rg.label || ""} /><${Stat} label="Hari diisi" value=${`${rk.hariIsi}/${rk.hari}`} /><${Stat} label="Tidak dinilai" value=${rk.dikecualikan} sub="izin" /></div></${Card}>
      ${lemah.length ? html`<${Card} title="Perlu ditingkatkan"><div class="list">${lemah.map(o => html`<${Row} icon=${html`<${Icon} n="alert" s=${18} />`} name=${o.t} right=${html`<${Pill} t=${o.p + "%"} tone=${nada(o.p)} />`} />`)}</div></${Card}>` : null}
      <${Card} title="14 hari terakhir"><div class="list">${hari.map(t => { const h = hasilKhidmah(gid, t);
        return html`<${Row} icon=${html`<${Icon} n="cal2" s=${18} />`} name=${L.fmtTgl(t)} sub=${h.doc ? `${h.selesai.size}/${h.units.length} terlaksana${h.doc.menyusul ? " · menyusul" : ""}` : h.selesai.size ? `${h.selesai.size}/${h.units.length} dari data otomatis` : "Belum diisi"}
          right=${html`<${Pill} t=${h.pct + "%"} tone=${nada(h.pct)} />`} onClick=${() => nav.go("khidmah", { tgl: t, gid })} />`; })}</div></${Card}></div>`;
}

// Rekap semua musyrif (Mudir, Wadir Kesantrian)
export function RekapKhidmah({ pondok }) {
  useApp();
  const pr = usePeriode("bulanan"), per = pr.jenis, rg = pr.rg, p = pondok === "all" ? null : pondok;
  const rows = musyrifList(p).map(({ a, g }) => ({ a, g, rk: rekapKhidmah(g.id, rg) })).map(x => ({ ...x, v: x.rk ? x.rk.pct : null }));
  const rata = rows.filter(x => x.v != null), avg = rata.length ? Math.round(rata.reduce((n, x) => n + x.v, 0) / rata.length) : null, kurang = rows.filter(x => x.v != null && x.v < 75).length;
  const unduh = () => unduhPdf(`Rekap Ceklis Musyrif ${rg.label}`, () => tabelKePdf({
    judul: "Rekap Ceklis Harian Musyrif", sub: `${rg.label}${p ? " · Pondok " + p : ""} · ${rows.length} wali asrama`,
    catatan: "Persentase = tugas terlaksana dibanding tugas yang berlaku pada hari itu. Sebagian tugas terisi otomatis dari absen halaqah, setoran dan mutaba'ah. Hari wali asrama izin tidak dihitung bila kosong.",
    oleh: `Dicetak oleh ${me().nama}, ${L.fmtTgl(L.today())} · MuawanahQu`, ttd: ttdUntukPdf("kesantrian"),
    bagian: [{ judul: "Per wali asrama", kol: ["No", "Wali asrama", "Asrama", "Pondok", "Terlaksana", "Hari diisi"],
      rows: [...rows].sort((x, y) => (y.v ?? -1) - (x.v ?? -1)).map((x, i) => [i + 1, x.g.nama, x.a.nama, x.a.pondok, x.v == null ? "—" : x.v + "%", x.rk ? `${x.rk.hariIsi} dari ${x.rk.hari} hari` : "—"]) }],
  }));
  return html`<${SubHeader} title="Rekap Ceklis Musyrif" sub=${`Ceklis harian wali asrama${p ? " · Pondok " + p : ""}`} />
    <div class="wrap rp-wrap">${pr.bar}
      <${Evaluasi} judulLuar=${false} ev=${denganLalu(x => evKinerja(rows.map(r => r.g), x, { judul: "Kinerja wali asrama" }), per, rg)} /><p class="rp-sekat">Rincian per wali asrama</p>
      <${Panel} ic="checksq" warna="hijau" judul="Tugas harian terlaksana" ket=${`${rows.length} wali asrama${avg != null ? ` · ${kurang} di bawah 75%` : ""}`} besar=${avg == null ? null : avg + "%"} besarNada=${avg == null ? "" : avg >= 90 ? "hijau" : avg >= 75 ? "biru" : avg >= 60 ? "emas" : "merah"} persen
        rows=${rows.map(x => ({ nama: x.g.nama, sub: `Asrama ${x.a.nama} · Pondok ${x.a.pondok}${x.rk ? ` · diisi ${x.rk.hariIsi} dari ${x.rk.hari} hari` : ""}`, nilai: x.v, v: x.v == null ? "" : x.v + "%" }))}
        catatan="Sebagian tugas terisi otomatis dari data aplikasi (absen halaqah, setoran, mutaba'ah), jadi tidak bisa dicentang tanpa bukti." />
      <div class="sticky-act"><${Btn} icon="download" onClick=${unduh}>Unduh PDF</${Btn}></div></div>`;
}
