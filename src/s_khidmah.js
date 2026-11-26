// Ceklis Musyrif: ceklis harian musyrif / wali asrama (ringkasan dari "Ceklis Harian Musyrif", 58 poin → 16 butir)
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Tile, Card, SubHeader, Stat, Row, Pill, Btn, Empty, Seg, Hint } from "./ui.js";
import { all, get, put, toast } from "./store.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { unduhPdf, tabelKePdf } from "./pdf.js";
import { ttdUntukPdf } from "./s_ttd.js";

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
export function autoKhidmah(gid, tgl) {
  const a = L.asramaOf(gid), hq = L.halaqahOf(gid), res = {};
  unitKhidmah(tgl).forEach(u => {
    const k = u.b.auto; if (!k) return;
    if (k === "halaqah") res[u.id] = hq ? (get("absenHalaqah", L.halaqahKey(hq.id, tgl, u.label)) ? true : false) : null;
    if (k === "setoran") res[u.id] = hq ? all("setoran").some(r => r.tanggal === tgl && (r.guru === gid || L.santriHalaqah(hq.id).some(s => s.id === r.santri))) : null;
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
  const hari = L.hariAktifDalam(rg, "asrama"); let total = 0, isi = 0, hariIsi = 0, dikecualikan = 0; const perButir = {};
  hari.forEach(t => {
    const h = hasilKhidmah(gid, t);
    if (!h.doc && all("izinGuru").some(i => i.guru === gid && i.tanggal === t)) { dikecualikan++; return; }
    if (h.doc) hariIsi++;
    total += h.units.length; isi += h.selesai.size;
    h.units.forEach(u => { const k = u.b.id, o = perButir[k] || (perButir[k] = { t: u.b.t, n: 0, ok: 0 }); o.n++; if (h.selesai.has(u.id)) o.ok++; });
  });
  return { hari: hari.length - dikecualikan, hariIsi, dikecualikan, pct: total ? Math.round((isi / total) * 100) : null, perButir };
}
export const musyrifList = (pondok) => L.ASRAMA.filter(a => a.musyrif && (!pondok || a.pondok === pondok)).map(a => ({ a, g: L.staffById(a.musyrif) })).filter(x => x.g);

const nada = v => (v == null ? "muted" : v >= 90 ? "green" : v >= 75 ? "blue" : v >= 60 ? "gold" : "red");

export function Khidmah({ tgl: t0, gid: g0 }) {
  useApp();
  const tgl = t0 || L.today(), gid = g0 || me().id, milik = gid === me().id, g = L.staffAman(gid), a = L.asramaOf(gid);
  const boleh = milik && (tgl === L.today() || tgl === L.addDays(L.today(), -1));
  const h = hasilKhidmah(gid, tgl);
  const [cek, setCek] = useState(() => new Set(h.cek));
  if (!L.hariAktif(tgl, "asrama")) return html`<${SubHeader} title="Ceklis Musyrif" sub=${L.fmtTgl(tgl)} /><div class="wrap"><${Card}><${Empty} t="Hari ini libur pondok. Tidak ada ceklis musyrif." icon="calendar" /></${Card}></div>`;
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
      <div class="kh-hero"><div class="kh-ring" style=${`--p:${pct}`}><b>${pct}%</b></div><div><b>${selesai.size} dari ${h.units.length} terlaksana</b>
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
  const gid = g0 || me().id, g = L.staffAman(gid), [per, setPer] = useState("pekanan"), rg = L.periodeRange(per), rk = rekapKhidmah(gid, rg);
  const hari = Array.from({ length: 14 }, (_, i) => L.addDays(L.today(), -i)).filter(t => L.hariAktif(t, "asrama") && t >= L.setelan().mulaiPakai);
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
  const [per, setPer] = useState("harian"), rg = L.periodeRange(per), p = pondok === "all" ? null : pondok;
  const rows = musyrifList(p).map(({ a, g }) => ({ a, g, rk: per === "harian" ? null : rekapKhidmah(g.id, rg), h: hasilKhidmah(g.id, L.today()) }))
    .map(x => ({ ...x, v: x.rk ? x.rk.pct : x.h.pct })).sort((x, y) => (x.v ?? -1) - (y.v ?? -1));
  const rata = rows.filter(x => x.v != null), avg = rata.length ? Math.round(rata.reduce((n, x) => n + x.v, 0) / rata.length) : null;
  const unduh = () => unduhPdf(`Rekap Ceklis Musyrif ${rg.label || L.fmtTgl(L.today())}`, () => tabelKePdf({
    judul: "Rekap Ceklis Harian Musyrif", sub: `${per === "harian" ? L.fmtTgl(L.today()) : rg.label}${p ? " · Pondok " + p : ""} · ${rows.length} wali asrama`,
    catatan: "Persentase = tugas terlaksana dibanding tugas yang berlaku pada hari itu. Sebagian tugas terisi otomatis dari absen halaqah, setoran dan mutaba'ah. Hari wali asrama izin tidak dihitung bila kosong.",
    oleh: `Dicetak oleh ${me().nama}, ${L.fmtTgl(L.today())} · MuawanahKu`, ttd: ttdUntukPdf("kesantrian"),
    bagian: [{ judul: "Per wali asrama", kol: ["No", "Wali asrama", "Asrama", "Pondok", "Terlaksana", "Hari diisi", "Tidak dinilai"],
      rows: rows.map((x, i) => [i + 1, x.g.nama, x.a.nama, x.a.pondok, x.v == null ? "—" : x.v + "%", x.rk ? `${x.rk.hariIsi}/${x.rk.hari}` : x.h.doc ? "Ya" : "Belum", x.rk ? x.rk.dikecualikan : "—"]) }],
  }));
  return html`<${SubHeader} title="Rekap Ceklis Musyrif" sub=${`Ceklis harian wali asrama${p ? " · Pondok " + p : ""}`}><${Seg} small items=${L.PERIODE.filter(([k]) => ["harian", "pekanan", "bulanan", "semester"].includes(k))} value=${per} onChange=${setPer} /></${SubHeader}>
    <div class="wrap">
      <${Card}><div class="stats"><${Stat} label="Rata-rata" value=${avg == null ? "—" : avg + "%"} /><${Stat} label="Wali asrama" value=${rows.length} /><${Stat} label=${per === "harian" ? "Sudah mengisi" : "Di bawah 75%"} value=${per === "harian" ? `${rows.filter(x => x.h.doc).length}/${rows.length}` : rows.filter(x => x.v != null && x.v < 75).length} tone="gold" /></div></${Card}>
      <${Card}><div class="list">${rows.map(x => html`<${Row} name=${x.g.nama} sub=${`Asrama ${x.a.nama} · Pondok ${x.a.pondok}${x.rk ? ` · diisi ${x.rk.hariIsi}/${x.rk.hari} hari` : x.h.doc ? ` · ${x.h.selesai.size}/${x.h.units.length} tugas` : " · belum mengisi hari ini"}`}
        right=${html`<${Pill} t=${x.v == null ? "—" : x.v + "%"} tone=${nada(x.v)} />`} onClick=${() => nav.go(per === "harian" ? "khidmah" : "khidmahRiwayat", { gid: x.g.id })} />`)}</div></${Card}>
      <${Hint}>Sebagian tugas terisi otomatis dari data aplikasi (absen halaqah, setoran, mutaba'ah), jadi tidak bisa dicentang tanpa bukti.</${Hint}>
      <div class="sticky-act"><${Btn} icon="download" onClick=${unduh}>Unduh PDF</${Btn}></div></div>`;
}
