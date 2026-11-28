// ================= TAMPILAN WALI SANTRI (ramah orang tua) =================
// Bahasa sehari-hari, tanpa istilah teknis (baris, sesi, H/S/I/A). Kabar hari ini, perkembangan, hafalan, izin.
import { useState } from "preact/hooks";
import { html, nav, Icon, Card, Empty } from "./ui.js";
import { all, get } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { usePeriode } from "./s_rekap.js";
import { kontakUntukSantri, bukaWaWali } from "./s_wa.js";
import { FotoAv } from "./common.js";

// ---------- kata yang mudah dipahami ----------
export const kata = p => (p == null ? ["Belum ada data", "mut"] : p >= 90 ? ["Sangat baik", "hijau"] : p >= 75 ? ["Baik", "biru"] : p >= 60 ? ["Cukup", "emas"] : ["Perlu perhatian", "merah"]);
const nilaiKata = n => (n == null || n === "" ? "" : n >= 90 ? "Sangat baik" : n >= 80 ? "Baik" : n >= 70 ? "Cukup" : "Perlu diulang");
const STATUS_KATA = { H: ["Hadir", "hijau"], S: ["Sakit", "emas"], I: ["Izin", "biru"], A: ["Tidak hadir", "merah"], M: ["Terlambat", "emas"] };
const hariIni = () => L.fmtTgl(L.today());
const namaS = s => s.panggilan || s.nama.split(" ")[0];
export function posisiSurah(h) {
  if (h.khatam) return "Khatam 30 juz";
  const [su, ay] = L.ayahAtBaris(h.aktif, Math.max(1, h.baris || 1));
  return h.baris ? `Surah ${L.surahName(su)} ayat ${ay}` : `Akan mulai Surah ${L.surahName(su)}`;
}
// teks setoran untuk orang tua
export function teksSetoran(r) {
  const n = r.nilai != null ? ` · nilai ${r.nilai}${nilaiKata(r.nilai) ? " (" + nilaiKata(r.nilai) + ")" : ""}` : "";
  if (r.jenis === "ziyadah") { const b = Math.max(0, (r.sesudah || 0) - (r.sebelum || 0));
    return { ic: "bookopen", warna: "hijau", judul: r.lulus ? "Setor hafalan baru" : "Setor hafalan baru · diulang besok", ket: (b ? `${L.rangeLabel(r.juz, (r.sebelum || 0) + 1, r.sesudah)} · ${L.fmtBaris(b)}` : `Juz ${r.juz}`) + n }; }
  if (r.jenis === "murojaah") return { ic: "repeat", warna: "biru", judul: "Mengulang hafalan (murojaah)", ket: `Juz ${r.juz} · halaman ${r.halDari}${r.halSampai && r.halSampai !== r.halDari ? "–" + r.halSampai : ""}${n}` };
  if (r.jenis === "manzil") return { ic: "layers", warna: "ungu", judul: "Ulangan pekanan (manzil)", ket: `Juz ${r.juz}${n}` };
  if (r.jenis === "tasmi") return { ic: "award", warna: "emas", judul: `Ujian tasmi' Juz ${r.juz}`, ket: (r.lulus ? "Alhamdulillah lulus" : "Belum lulus, akan diulang") + n };
  return { ic: "bookopen", warna: "hijau", judul: r.jenis, ket: n };
}

// ---------- KABAR HARI INI ----------
export function KabarHariIni({ s }) {
  const tgl = L.today(), hq = L.halaqahSantri(s), sesi = L.adaHalaqah(tgl) ? L.sesiHari(tgl) : [];
  const baris = [];
  // izin
  const iz = L.izinAktif(s.id)[0];
  if (iz) baris.push({ ic: "door", warna: "emas", judul: `Sedang ${iz.jenis === "Skorsing" ? "skorsing" : "izin " + String(iz.jenis || "").toLowerCase()}`, ket: `Kembali ke pondok ${L.fmtDT(iz.kembali)}` });
  // halaqah
  if (!sesi.length) baris.push({ ic: "calendar", warna: "mut", judul: "Hari ini tidak ada halaqah", ket: "Waktunya istirahat dan murojaah mandiri" });
  else {
    const st = sesi.map(se => { const d = hq ? get("absenHalaqah", L.halaqahKey(hq.id, tgl, se)) : null; return [se, d && d.status ? d.status[s.id] : null]; }), ada = st.filter(([, v]) => v);
    const buruk = ada.some(([, v]) => v === "A"), kurang = ada.some(([, v]) => v === "S" || v === "I" || v === "M");
    baris.push({ ic: "users", warna: !ada.length ? "mut" : buruk ? "merah" : kurang ? "emas" : "hijau", judul: !ada.length ? "Halaqah hari ini belum diabsen" : buruk ? "Ada sesi halaqah yang tidak dihadiri" : kurang ? "Hadir halaqah, ada catatan" : "Hadir di halaqah",
      ket: st.map(([se, v]) => `${se}: ${v ? STATUS_KATA[v][0] : "belum diabsen"}`).join(" · ") });
  }
  // setoran & tahsin hari ini
  const setor = L.setoranSantri(s.id).filter(r => r.tanggal === tgl);
  setor.forEach(r => { const t = teksSetoran(r); baris.push(t); });
  all("tahsin").filter(r => r.santri === s.id && r.tanggal === tgl && r.jenis === "baca").forEach(r => baris.push({ ic: "bookopen", warna: "hijau", judul: "Belajar membaca (tahsin)", ket: `Iqro' ${r.jilid || ""}${r.dari != null ? ` · halaman ${r.dari}${r.sampai !== r.dari ? "–" + r.sampai : ""}` : ""}` }));
  if (sesi.length && !setor.length && !L.santriIqra(s)) baris.push({ ic: "bookopen", warna: "mut", judul: "Belum ada setoran hafalan hari ini", ket: "Akan tampil di sini begitu ustadz mencatat" });
  // mutaba'ah
  if (L.hariAktif(tgl, "asrama")) { const m = get("mutabaah", L.mutKey(s.id, tgl)); baris.push({ ic: "moon", warna: m ? "hijau" : "mut", judul: m ? "Ibadah & adab hari ini sudah dinilai" : "Ibadah & adab hari ini belum dinilai", ket: m ? "Lihat ringkasannya di menu Ananda" : "Wali asrama menilai setiap sore/malam" }); }
  return html`<section class="wl-card"><header class="wl-h"><div><small>Kabar hari ini</small><b>${hariIni()}</b></div><span class="wl-dot"></span></header>
    <div class="wl-kabar">${baris.map(b => html`<div class="wl-k"><span class=${"wl-ic " + b.warna}><${Icon} n=${b.ic} s=${18} /></span><span class="wl-kt"><b>${b.judul}</b>${b.ket ? html`<small>${b.ket}</small>` : null}</span></div>`)}</div></section>`;
}

// ---------- RINGKAS BULAN INI (beranda) ----------
export function BulanIni({ s }) {
  const rg = L.periodeRange("bulanan"), kh = L.kehadiranHalaqah(s.id, rg).pct, mp = L.mutPersen(s.id, rg), mut = mp.ibadah == null ? null : Math.round((mp.ibadah + mp.adab) / 2);
  const x = L.tahfidzDalam(s.id, rg), pl = L.pelanggaranDalam(s.id, rg), jmlPl = pl.ringan + pl.sedang + pl.berat;
  const tile = (ic, lab, nilai, k) => html`<div class=${"wl-t " + k[1]}><span class="wl-t-ic"><${Icon} n=${ic} s=${17} /></span><small>${lab}</small><b>${nilai}</b><em>${k[0]}</em></div>`;
  return html`<section class="wl-card"><header class="wl-h"><div><small>Bulan ini</small><b>${rg.label}</b></div>
      <button type="button" class="wl-link" onClick=${() => nav.setTab("ananda")}>Selengkapnya <${Icon} n="right" s=${15} /></button></header>
    <div class="wl-tiles">
      ${tile("users", "Kehadiran halaqah", kh == null ? "–" : kh + "%", kata(kh))}
      ${tile("moon", "Ibadah & adab", mut == null ? "–" : mut + "%", kata(mut))}
      ${L.santriIqra(s) ? tile("bookopen", "Tahsin", `${x.tahsinHal} hal`, x.tahsinHal ? ["Iqro'", "hijau"] : ["Belum ada", "mut"]) : tile("bookopen", "Hafalan baru", x.zBaris ? L.fmtBaris(x.zBaris) : "–", x.zBaris >= L.targetHal("bulanan") * 15 ? ["Target tercapai", "hijau"] : x.zBaris ? ["Terus berjalan", "biru"] : ["Belum ada", "mut"])}
      ${tile("shield", "Kedisiplinan", jmlPl ? `${jmlPl} catatan` : "Bersih", jmlPl ? ["Perlu perhatian", "merah"] : ["Alhamdulillah", "hijau"])}</div></section>`;
}

// ---------- PETA 30 JUZ ----------
export function PetaJuz({ s }) {
  const h = L.hafalan(s), pctAktif = h.khatam ? 100 : Math.round((h.baris / h.total) * 100);
  return html`<section class="wl-card"><header class="wl-h"><div><small>Peta hafalan</small><b>${h.khatam ? "Khatam 30 juz" : `${h.selesai.length} juz selesai`}</b></div></header>
    <div class="wl-peta">${DATA.urutanJuz.map(j => { const sel = h.selesai.includes(j), akt = !h.khatam && j === h.aktif;
      return html`<span class=${"wl-j" + (sel ? " ok" : akt ? " now" : "")} title=${`Juz ${j}`}>${akt ? html`<i style=${`height:${pctAktif}%`}></i>` : null}<b>${j}</b></span>`; })}</div>
    <div class="wl-leg"><span><i class="ok"></i>Selesai</span><span><i class="now"></i>Sedang dihafal${h.khatam ? "" : ` (${pctAktif}%)`}</span><span><i></i>Belum</span></div>
    <p class="wl-note">Urutan hafalan di pondok: Juz 30, Juz 29, lalu Juz 1 dan seterusnya.</p></section>`;
}

// ---------- RIWAYAT SETORAN (dikelompokkan per hari) ----------
export function LinimasaSetoran({ s }) {
  const [n, setN] = useState(25);
  const rec = [...L.setoranSantri(s.id)].sort((a, b) => (b.tanggal + String(b.ts || 0)).localeCompare(a.tanggal + String(a.ts || 0)));
  const tampil = rec.slice(0, n), grup = [];
  tampil.forEach(r => { const g = grup[grup.length - 1]; if (g && g.t === r.tanggal) g.l.push(r); else grup.push({ t: r.tanggal, l: [r] }); });
  return html`<section class="wl-card"><header class="wl-h"><div><small>Catatan setoran</small><b>Dari ustadz halaqah</b></div></header>
    ${grup.length ? html`<div class="wl-lini">${grup.map(g => html`<div class="wl-hari"><p>${L.fmtTgl(g.t)}</p>${g.l.map(r => { const t = teksSetoran(r);
        return html`<div class="wl-k"><span class=${"wl-ic " + t.warna}><${Icon} n=${t.ic} s=${18} /></span><span class="wl-kt"><b>${t.judul}</b><small>${t.ket}</small></span></div>`; })}</div>`)}</div>
      ${rec.length > n ? html`<button type="button" class="wl-more" onClick=${() => setN(n + 25)}>Tampilkan lebih banyak</button>` : null}`
      : html`<div class="wl-kosong"><${Empty} t="Belum ada catatan setoran." icon="bookopen" /></div>`}</section>`;
}

// ---------- PERKEMBANGAN (menu Ananda) ----------
function Baris({ lab, nilai, pct, k, ket }) {
  return html`<div class="wl-b"><div class="wl-b-h"><span>${lab}</span><b>${nilai}</b>${k ? html`<em class=${k[1]}>${k[0]}</em>` : null}</div>
    ${pct != null ? html`<span class="wl-bar"><i class=${k ? k[1] : "hijau"} style=${`width:${Math.max(2, Math.min(100, pct))}%`}></i></span>` : null}${ket ? html`<small>${ket}</small>` : null}</div>`;
}
export function Perkembangan({ s }) {
  const p = usePeriode("bulanan"), rg = p.rg;
  const kh = L.kehadiranHalaqah(s.id, rg).pct, kk = L.kehadiranKelas(s.id, undefined, rg).pct, mp = L.mutPersen(s.id, rg), x = L.tahfidzDalam(s.id, rg);
  const tgtBaris = Math.round(L.targetHal(p.jenis) * 15), iz = L.izinDalam(s.id, rg), pl = L.pelanggaranDalam(s.id, rg), jmlPl = pl.ringan + pl.sedang + pl.berat;
  const nilai = DATA.mapel.map(m => { const d = get("nilaiMapel", L.nilaiKey(m.id, s.kelas)), v = d && d.projek ? d.projek[s.id] : null; return { m, v: v === "" || v == null ? null : Number(v) }; });
  const iq = L.santriIqra(s);
  return html`<div class="wl-per">${p.bar}</div>
    <section class="wl-card"><header class="wl-h"><div><small>Kehadiran</small><b>Disiplin hadir</b></div><span class="wl-hic hijau"><${Icon} n="users" s=${18} /></span></header>
      <${Baris} lab="Halaqah tahfidz" nilai=${kh == null ? "–" : kh + "%"} pct=${kh} k=${kata(kh)} />
      <${Baris} lab="Kelas (pelajaran sekolah)" nilai=${kk == null ? "–" : kk + "%"} pct=${kk} k=${kata(kk)} /></section>
    <section class="wl-card"><header class="wl-h"><div><small>Di asrama</small><b>Ibadah & adab</b></div><span class="wl-hic ungu"><${Icon} n="moon" s=${18} /></span></header>
      <${Baris} lab="Ibadah" nilai=${mp.ibadah == null ? "–" : mp.ibadah + "%"} pct=${mp.ibadah} k=${kata(mp.ibadah)} ket="Shalat berjamaah, tilawah, dzikir, dan ibadah harian lainnya" />
      <${Baris} lab="Adab" nilai=${mp.adab == null ? "–" : mp.adab + "%"} pct=${mp.adab} k=${kata(mp.adab)} ket="Sopan santun, kerapian, dan kebersihan" /></section>
    <section class="wl-card"><header class="wl-h"><div><small>Al-Qur'an</small><b>${iq ? "Tahsin & hafalan" : "Hafalan"}</b></div><span class="wl-hic biru"><${Icon} n="bookopen" s=${18} /></span></header>
      ${iq ? html`<${Baris} lab="Belajar membaca (Iqro')" nilai=${`${x.tahsinHal} halaman`} k=${x.tahsinHal ? ["Berjalan", "hijau"] : ["Belum ada", "mut"]} ket=${`${x.tahsin} kali membaca di depan ustadz`} />` : null}
      ${!iq || x.zBaris ? html`<${Baris} lab="Hafalan baru" nilai=${x.zBaris ? L.fmtBaris(x.zBaris) : "–"} pct=${tgtBaris ? Math.round((x.zBaris / tgtBaris) * 100) : null} k=${x.zBaris >= tgtBaris ? ["Target tercapai", "hijau"] : x.zBaris ? ["Belum target", "emas"] : ["Belum ada", "mut"]} ket=${`Target ${L.fmtHal(L.targetHal(p.jenis))} untuk periode ini`} />` : null}
      ${!iq ? html`<${Baris} lab="Mengulang hafalan (murojaah)" nilai=${`${x.muroHal} halaman`} k=${x.muroHal ? ["Rutin", "hijau"] : ["Belum ada", "mut"]} />` : null}
      ${x.tasmiLulus.length ? html`<${Baris} lab="Lulus ujian tasmi'" nilai=${x.tasmiLulus.map(j => "Juz " + j).join(", ")} k=${["Alhamdulillah", "hijau"]} />` : null}</section>
    <section class="wl-card"><header class="wl-h"><div><small>Sekolah</small><b>Nilai tugas projek</b></div><span class="wl-hic emas"><${Icon} n="award" s=${18} /></span></header>
      ${nilai.some(x => x.v != null) ? nilai.map(x => html`<${Baris} lab=${x.m.nama} nilai=${x.v == null ? "–" : x.v} pct=${x.v} k=${x.v == null ? ["Belum dinilai", "mut"] : [nilaiKata(x.v), x.v >= 80 ? "hijau" : x.v >= 70 ? "emas" : "merah"]} />`)
        : html`<p class="wl-note" style="margin:2px 0 6px">Belum ada nilai projek pada periode ini.</p>`}
      <p class="wl-note">Nilai UTS, UAS, dan rapor dibagikan saat pembagian rapor.</p></section>
    <section class="wl-card"><header class="wl-h"><div><small>Kedisiplinan</small><b>${jmlPl ? `${jmlPl} catatan pelanggaran` : "Alhamdulillah, tidak ada catatan"}</b></div><span class=${"wl-hic " + (jmlPl ? "merah" : "hijau")}><${Icon} n="shield" s=${18} /></span></header>
      <${Baris} lab="Izin keluar/pulang" nilai=${iz.n ? `${iz.n} kali` : "Tidak ada"} k=${iz.telat ? [`${iz.telat}× terlambat kembali`, "merah"] : null} />
      ${jmlPl ? html`<${Baris} lab="Catatan pelanggaran" nilai=${`${jmlPl} catatan · ${pl.poinRingan + pl.poinSB} poin`} k=${["Mohon dibimbing", "merah"]} ket="Rinciannya ada di menu Izin" />` : null}</section>`;
}

// ---------- IZIN ----------
export function IzinWali({ s }) {
  const iz = all("izin").filter(i => i.santri === s.id).sort((a, b) => b.ts - a.ts), aktif = iz.find(i => i.status === "aktif");
  const bap = all("bap").filter(b => b.santri === s.id).sort((a, b) => b.ts - a.ts), mt = L.motdCatatan(s.id), p = L.poinSantri(s.id), pd = L.pondokOfSantri(s);
  const kes = (kontakUntukSantri(s).find(g => g.k === "wadir_kesantrian") || { orang: [] }).orang.find(st => L.waNomor(st.hp) && st.tampilWali !== false);
  return html`
    <section class=${"wl-status " + (aktif ? (L.terlambat(aktif) ? "merah" : "emas") : "hijau")}><span class="wl-s-ic"><${Icon} n=${aktif ? "door" : "home"} s=${24} /></span>
      <div><small>Status ananda</small><b>${aktif ? (aktif.jenis === "Skorsing" ? "Sedang skorsing" : `Sedang izin ${String(aktif.jenis).toLowerCase()}`) : "Ada di pondok"}</b>
        <em>${aktif ? (L.terlambat(aktif) ? `Seharusnya kembali ${L.fmtDT(aktif.kembali)}` : `Kembali ${L.fmtDT(aktif.kembali)}`) : `${namaS(s)} sedang mengikuti kegiatan pondok`}</em></div></section>
    <section class="wl-card"><header class="wl-h"><div><small>Mengajukan izin</small><b>Caranya mudah</b></div><span class="wl-hic biru"><${Icon} n="door" s=${18} /></span></header>
      <ol class="wl-step"><li>Hubungi Wadir Kesantrian Pondok ${pd}${kes ? ` (${kes.pendek || kes.nama})` : ""}.</li><li>Sampaikan keperluan, tanggal keluar, dan perkiraan kembali.</li><li>Setelah disetujui, surat izin tampil otomatis di halaman ini.</li></ol>
      ${kes ? html`<button type="button" class="btn primary full" onClick=${() => bukaWaWali(kes.hp, `Assalamu'alaikum ${kes.pendek || kes.nama}, saya Ayah/Bunda dari ananda *${s.nama}* (Kelas ${s.kelas}). Mohon izin untuk ananda: `)}><${Icon} n="chat" s=${19} /> Ajukan izin lewat WhatsApp</button>` : null}</section>
    <section class="wl-card"><header class="wl-h"><div><small>Riwayat</small><b>Izin ananda</b></div></header>
      ${iz.length ? html`<div class="wl-list">${iz.map(i => html`<button type="button" class="wl-row" onClick=${() => nav.go("izinView", { id: i.id })}><span class=${"wl-ic " + (i.status === "aktif" ? "emas" : "hijau")}><${Icon} n="door" s=${18} /></span>
          <span class="wl-kt"><b>${i.jenis === "Skorsing" ? "Skorsing" : `Izin ${String(i.jenis).toLowerCase()}`}</b><small>${L.fmtDT(i.keluar)} sampai ${L.fmtDT(i.kembali)}${i.alasan ? " · " + i.alasan : ""}</small></span>
          <em class=${i.status === "aktif" ? (L.terlambat(i) ? "merah" : "emas") : "hijau"}>${i.status === "aktif" ? (L.terlambat(i) ? "Terlambat" : "Berlangsung") : "Sudah kembali"}</em></button>`)}</div>`
        : html`<p class="wl-note" style="margin:2px 0 4px">Belum pernah izin.</p>`}</section>
    <section class="wl-card"><header class="wl-h"><div><small>Kedisiplinan</small><b>${bap.length || mt.length ? `${p.total} poin catatan` : "Alhamdulillah, bersih"}</b></div><span class=${"wl-hic " + (p.total ? "merah" : "hijau")}><${Icon} n="shield" s=${18} /></span></header>
      ${bap.length || mt.length ? html`<div class="wl-list">${bap.map(b => html`<button type="button" class="wl-row" onClick=${() => nav.go("bapView", { id: b.id })}><span class="wl-ic merah"><${Icon} n="clipboard" s=${18} /></span>
          <span class="wl-kt"><b>${b.pelanggaranNama}</b><small>${L.fmtTgl(b.tanggal)}${b.tingkat ? " · " + b.tingkat : ""} · ketuk untuk penjelasan</small></span><em class="merah">${b.poin} poin</em></button>`)}
        ${mt.slice(0, 10).map(c => html`<div class="wl-row"><span class="wl-ic emas"><${Icon} n="moon" s=${18} /></span><span class="wl-kt"><b>${c.st === "A" ? "Tidak ikut" : "Terlambat"} shalat ${L.WAKTU.find(x => x[0] === c.waktu)[1]}</b><small>${L.fmtTgl(c.tanggal)} · teguran ringan</small></span><em class="emas">${c.poin} poin</em></div>`)}</div>
        <p class="wl-note">Catatan ini bahan pembinaan bersama. Mohon dukung ananda dari rumah.</p>`
        : html`<p class="wl-note" style="margin:2px 0 4px">Tidak ada catatan pelanggaran. Semoga ananda istiqamah.</p>`}</section>`;
}

// ---------- KONTAK USTADZ (di menu Akun) ----------
export function KontakAkun({ s }) {
  const grup = kontakUntukSantri(s).map(g => ({ ...g, orang: g.orang.filter(st => L.waNomor(st.hp) && st.tampilWali !== false) })).filter(g => g.orang.length);
  if (!grup.length) return html`<p class="wl-note" style="margin:0 4px 6px">Nomor ustadz belum diisi oleh pondok.</p>`;
  return html`<div class="group">${grup.flatMap(g => g.orang.map(st => html`<button class="menu-row" onClick=${() => bukaWaWali(st.hp, `Assalamu'alaikum ${st.pendek || st.nama}, saya Ayah/Bunda dari ananda *${s.nama}* (Kelas ${s.kelas}). `)}>
      <${FotoAv} src=${(get("profil", st.id) || {}).foto} nama=${st.nama} size=${38} /><span class="mr-t">${st.pendek || st.nama}<small>${g.judul} · ${g.d.split(",")[0].split(" — ")[0]}</small></span><span class="wl-wa"><${Icon} n="chat" s=${16} /> Chat</span></button>`))}</div>`;
}
