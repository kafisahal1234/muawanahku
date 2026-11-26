// Tahsin: kemampuan membaca Al-Qur'an dengan metode Iqro' (KH. As'ad Humam, jilid 1–6) sampai lulus ke Al-Qur'an.
// Ziyadah bacaan Iqro' dicatat di sini (bukan di Ziyadah hafalan): halaman yang dibaca + penilaian, ujian kenaikan jilid.
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Card, SubHeader, Stat, Row, Pill, Btn, Empty, Seg, Stepper, Field, Sheet, Hint, Confirm, Bar } from "./ui.js";
import { all, get, put, uid, toast, S } from "./store.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { logUbah } from "./s_koreksi.js";
import { unduhPdf, tabelKePdf } from "./pdf.js";
import { ttdUntukPdf } from "./s_ttd.js";

const NILAI_TONE = { L: "green", KL: "gold", U: "red" };
const bolehSemua = () => { const m = me(); return !!m && m.roles.some(r => ["mudir", "wadir_tahfidz", "admin"].includes(r)); };
const halaqahSaya = () => { const m = me(); return m ? L.halaqahOf(m.id) : null; };
const bacaHariIni = (sid, tgl) => all("tahsin").filter(r => r.santri === sid && r.tanggal === tgl).sort((a, b) => a.ts - b.ts).pop() || null;

// Jalur Iqro' 1–6 → Al-Qur'an (visual)
export function JalurIqra({ t, kecil }) {
  const j = t.quran ? 7 : t.jilid || 0;
  return html`<div class=${"iq-jalur" + (kecil ? " kecil" : "")} role="img" aria-label=${t.label}>
    ${[1, 2, 3, 4, 5, 6].map(n => html`<span class=${n < j ? "ok" : n === j ? "kini" : ""}><i style=${n === j && !t.quran ? `width:${Math.min(100, (t.hal / L.IQRA_HAL) * 100)}%` : ""}></i><b>${n}</b></span>`)}
    <span class=${"qr" + (t.quran ? " ok" : "")}><b>Al-Qur'an</b></span></div>`;
}

export function TahsinCard({ s, aksi }) {
  const t = L.tahsinStatus(s); if (!t) return null;
  const n = L.tahsinRiwayat(s.id).filter(r => r.jenis === "baca"), akhir = n[n.length - 1];
  return html`<${Card} title="Tahsin (Iqro')" right=${t.siapUjian ? html`<${Pill} t="Siap ujian" tone="gold" />` : t.quran ? html`<${Pill} t="Lulus Iqro'" tone="green" />` : null}>
    <div class="iq-kepala"><b>${t.quran ? "Al-Qur'an" : t.jilid ? `Iqro' ${t.jilid}` : "Belum diatur"}</b><span>${t.quran ? t.ket || "Sudah lulus Iqro' 6" : t.jilid ? `Halaman ${t.hal || 0} dari ${L.IQRA_HAL}` : "Guru tahfidz perlu mengatur tingkat Iqro'"}</span></div>
    <${JalurIqra} t=${t} />
    ${t.halSemester != null ? html`<div class="imp-cap ok" style="margin:8px 0 0"><span>Kemajuan semester ini (dari Iqro' ${t.awalSem.jilid} hal. ${t.awalSem.hal || 0})</span><b>+${t.halSemester} halaman</b></div>` : null}
    ${t.gagal ? html`<p class="small" style="margin:8px 0 0;color:#A8261C;font-weight:700">Ujian terakhir belum lulus, mengulang Iqro' ${t.jilid}.</p>` : null}
    ${akhir ? html`<p class="small" style="margin:8px 0 0">Terakhir membaca ${L.fmtTgl(akhir.tanggal)}${akhir.tingkat === "quran" ? ` · ${akhir.posisi || "Al-Qur'an"}` : ` · hal. ${akhir.dari}–${akhir.sampai}`} · ${L.TAHSIN_NILAI[akhir.nilai] || "-"}</p>` : null}
    ${aksi || null}</${Card}>`;
}

export function TahsinList({ hid }) {
  useApp();
  const semua = bolehSemua(), hq = hid ? L.halaqahById(hid) : halaqahSaya(), tgl = L.today(), [tambah, setTambah] = useState(false);
  if (!hq) return html`<${SubHeader} title="Tahsin" /><div class="wrap"><${Card}><${Empty} t="Akun ini belum memegang halaqah." icon="bookopen" /></${Card}></div>`;
  const anggota = L.santriHalaqah(hq.id), data = anggota.map(s => ({ s, t: L.tahsinStatus(s), r: bacaHariIni(s.id, tgl) })).filter(x => x.t);
  const belum = data.filter(x => !x.r), sudah = data.filter(x => x.r), siap = data.filter(x => x.t.siapUjian).length;
  const per = [1, 2, 3, 4, 5, 6].map(j => data.filter(x => !x.t.quran && x.t.jilid === j).length), lulus = data.filter(x => x.t.quran).length;
  const bisaInput = !hid || (me() && hq.guru === me().id) || semua;
  const baris = ({ s, t, r }) => html`<${Row} name=${s.nama} sub=${r ? (r.jenis === "ujian" ? `Ujian Iqro' ${r.jilid} · ${r.lulus ? "lulus" : "belum lulus"} · kini ${t.label}` : `${r.tingkat === "quran" ? r.posisi || "Al-Qur'an" : `Iqro' ${r.jilid} hal. ${r.dari}–${r.sampai}`} · ${L.TAHSIN_NILAI[r.nilai] || ""}`) : t.label}
    right=${t.siapUjian ? html`<${Pill} t="Siap ujian" tone="gold" />` : t.quran ? html`<${Pill} t="Al-Qur'an" tone="green" />` : html`<span class="iq-mini"><b>${t.jilid || "?"}</b><small>${t.hal || 0}/${L.IQRA_HAL}</small></span>`}
    onClick=${bisaInput ? () => nav.go("tahsin", { sid: s.id }) : () => nav.go("santri", { sid: s.id })} />`;
  return html`<${SubHeader} title="Tahsin (Iqro')" sub=${`${hq.nama} · ${L.fmtTgl(tgl)} · ${sudah.length}/${data.length} sudah membaca`} />
    <div class="wrap">
      <${Card}><div class="iq-ringkas">${per.map((n, i) => html`<span class=${n ? "ada" : ""}><b>${n}</b><small>Iqro' ${i + 1}</small></span>`)}<span class=${"qr" + (lulus ? " ada" : "")}><b>${lulus}</b><small>Al-Qur'an</small></span></div>
        ${siap ? html`<p class="small" style="margin:10px 0 0"><b style="color:#8A5A00">${siap} santri siap ujian kenaikan jilid.</b> Buka namanya untuk mencatat hasil ujian.</p>` : null}</${Card}>
      ${data.length ? null : html`<${Card}><${Empty} t="Belum ada santri tahsin di halaqah ini." icon="bookopen" /></${Card}>`}
      ${belum.length ? html`<${Card} title=${`Belum membaca hari ini (${belum.length})`}><div class="list">${belum.map(baris)}</div></${Card}>` : data.length ? html`<div class="selesai-card"><span class="sc-ic"><${Icon} n="check" s=${24} c="#fff" w=${3} /></span><div><b>Semua santri tahsin sudah membaca hari ini</b><small>Alhamdulillah</small></div></div>` : null}
      ${sudah.length ? html`<${Card} title=${`Sudah hari ini (${sudah.length})`}><div class="list">${sudah.map(baris)}</div>
        <p class="riwayat-hint">Salah input? <button type="button" class="link" onClick=${() => nav.go("riwayatModul", { modul: "tahfidz" })}>Koreksi lewat Riwayat & Koreksi</button></p></${Card}>` : null}
      ${bisaInput ? html`<${Btn} kind="ghost" icon="plus" onClick=${() => setTambah(true)}>Tambah santri ke Tahsin</${Btn}>` : null}
      <${Hint}>Metode Iqro' karya KH. As'ad Humam: jilid 1–6 (±${L.IQRA_HAL} halaman tiap jilid). Setelah lulus ujian Iqro' 6, santri naik ke bacaan Al-Qur'an. Ziyadah Iqro' dicatat di sini, tidak di Ziyadah hafalan.</${Hint}></div>
    ${tambah ? html`<${TambahTahsin} list=${anggota.filter(s => !L.tahsinStatus(s))} onClose=${() => setTambah(false)} />` : null}`;
}

function TambahTahsin({ list, onClose }) {
  const [pilih, setPilih] = useState(null), [jilid, setJilid] = useState(1);
  const simpan = async () => { const s = pilih; if (await put("tahsinAwal", s.id, { tingkat: "iqra", jilid, hal: 0, oleh: me().id, ts: Date.now() })) { logUbah("ubah", "tahsinAwal", s.id, `${s.nama} masuk Tahsin (Iqro' ${jilid})`, null); toast(`${s.nama} masuk Tahsin`); onClose(); } };
  return html`<${Sheet} open title="Tambah santri ke Tahsin" onClose=${onClose}>
    ${!pilih ? (list.length ? html`<div class="list">${list.map(s => html`<${Row} name=${s.nama} sub=${`Kelas ${s.kelas} · hafalan ${L.fmtJumlah(L.hafalan(s))}`} onClick=${() => setPilih(s)} />`)}</div>` : html`<${Empty} t="Semua santri halaqah ini sudah tercatat di Tahsin." icon="check" />`)
      : html`<p style="margin:0 0 10px"><b>${pilih.nama}</b> mulai dari:</p><div class="iq-pilih">${[1, 2, 3, 4, 5, 6].map(n => html`<button type="button" class=${jilid === n ? "on" : ""} onClick=${() => setJilid(n)}>Iqro' ${n}</button>`)}</div>
        <div class="btn-stack mt12"><${Btn} icon="check" onClick=${simpan}>Masukkan ke Tahsin</${Btn}><${Btn} kind="text" onClick=${() => setPilih(null)}>Pilih santri lain</${Btn}></div>`}</${Sheet}>`;
}

function AturTahsin({ s, t, onClose }) {
  const [ting, setTing] = useState(t.quran ? "quran" : "iqra"), [jilid, setJilid] = useState(t.jilid || 1), [hal, setHal] = useState(t.hal || 0), [ujian, setUjian] = useState(!!t.siapUjian), [ket, setKet] = useState(t.ket || ""), [ask, setAsk] = useState(false);
  const adaCatatan = L.tahsinRiwayat(s.id).length > 0;
  const simpan = async () => {
    const v = ting === "quran" ? { tingkat: "quran", ket: ket.trim() } : { tingkat: "iqra", jilid, hal: Number(hal) || 0, ujian };
    if (await put("tahsinAwal", s.id, { ...v, oleh: me().id, ts: Date.now() })) { logUbah("ubah", "tahsinAwal", s.id, `Posisi tahsin ${s.nama} diatur: ${ting === "quran" ? "Al-Qur'an" : `Iqro' ${jilid} hal. ${hal}`}`, null); toast("Posisi tahsin disimpan"); onClose(); }
  };
  const keluar = async () => { setAsk(false); if (await put("tahsinAwal", s.id, { hapus: true, oleh: me().id, ts: Date.now() })) { logUbah("hapus", "tahsinAwal", s.id, `${s.nama} dikeluarkan dari Tahsin`, null); toast("Santri dikeluarkan dari Tahsin"); onClose(); nav.back(); } };
  return html`<${Sheet} open title="Atur posisi tahsin" onClose=${onClose}>
    ${adaCatatan ? html`<p class="small" style="margin:0 0 10px">Posisi ini menjadi titik awal; catatan bacaan & ujian yang sudah ada tetap dihitung sesudahnya.</p>` : null}
    <${Seg} items=${[["iqra", "Masih Iqro'"], ["quran", "Lulus · Al-Qur'an"]]} value=${ting} onChange=${setTing} />
    ${ting === "iqra" ? html`<${Field} label="Jilid"><div class="iq-pilih">${[1, 2, 3, 4, 5, 6].map(n => html`<button type="button" class=${jilid === n ? "on" : ""} onClick=${() => setJilid(n)}>Iqro' ${n}</button>`)}</div></${Field}>
      <${Field} label="Halaman terakhir"><${Stepper} value=${hal} onChange=${setHal} min=${0} max=${40} label="Halaman terakhir" /></${Field}>
      <label class="iq-chk"><input type="checkbox" checked=${ujian} onChange=${e => setUjian(e.target.checked)} /> Sudah selesai jilid ini, menunggu ujian</label>`
      : html`<${Field} label="Posisi bacaan Al-Qur'an (boleh kosong)"><input class="in" placeholder="Contoh: Juz 30 · Al-Fajr" value=${ket} onInput=${e => setKet(e.target.value)} /></${Field}>`}
    <div class="btn-stack mt12"><${Btn} icon="check" onClick=${simpan}>Simpan posisi</${Btn}>
      <button type="button" class="link center" style="min-height:40px;color:#A8261C" onClick=${() => setAsk(true)}>Keluarkan dari Tahsin</button></div>
    <${Confirm} open=${ask} danger title="Keluarkan dari Tahsin?" text=${`${s.nama} tidak lagi tampil di daftar Tahsin. Catatan bacaan yang sudah ada tetap tersimpan.`} yes="Keluarkan" onYes=${keluar} onNo=${() => setAsk(false)} /></${Sheet}>`;
}

export function Tahsin({ sid, edit }) {
  useApp();
  const s = L.santriById(sid), ed = edit ? get("tahsin", edit) : null, tgl = ed ? ed.tanggal : L.today();
  const t0 = s && L.tahsinStatus(s);
  // saat mengoreksi, posisi dihitung tanpa catatan yang sedang dikoreksi
  const t = ed && s ? (() => { const d = S.data.tahsin; S.data.tahsin = { ...d }; delete S.data.tahsin[ed.id]; const x = L.tahsinStatus(s); S.data.tahsin = d; return x; })() : t0;
  const [mode, setMode] = useState(ed ? ed.jenis : t && t.siapUjian ? "ujian" : "baca");
  const [dari, setDari] = useState(ed && ed.dari != null ? ed.dari : Math.min(L.IQRA_HAL, ((t && t.hal) || 0) + 1));
  const [sampai, setSampai] = useState(ed && ed.sampai != null ? ed.sampai : Math.min(L.IQRA_HAL, ((t && t.hal) || 0) + 1));
  const [nilai, setNilai] = useState(ed ? ed.nilai || "L" : "L"), [posisi, setPosisi] = useState(ed ? ed.posisi || "" : (t && t.ket) || ""), [cat, setCat] = useState(ed ? ed.catatan || "" : "");
  const [lulus, setLulus] = useState(ed && ed.jenis === "ujian" ? !!ed.lulus : true), [skor, setSkor] = useState(ed && ed.skor != null ? ed.skor : ""), [atur, setAtur] = useState(false);
  if (!s || !t) return html`<${SubHeader} title="Tahsin" /><div class="wrap"><${Card}><${Empty} t="Santri belum tercatat di Tahsin." icon="bookopen" /></${Card}></div>`;
  const quran = t.quran, sudah = !ed && bacaHariIni(s.id, tgl);
  const simpan = async () => {
    if (!quran && !t.jilid) return toast("Atur dulu tingkat Iqro' santri ini.", "err");
    let rec;
    if (mode === "ujian") rec = { jenis: "ujian", tingkat: "iqra", jilid: t.jilid, lulus, skor: skor === "" ? null : Number(skor), nilai: lulus ? "L" : "U", catatan: cat.trim() };
    else if (quran) rec = { jenis: "baca", tingkat: "quran", posisi: posisi.trim(), nilai, catatan: cat.trim() };
    else { if (Number(sampai) < Number(dari)) return toast("Halaman sampai tidak boleh lebih kecil dari halaman awal.", "err"); rec = { jenis: "baca", tingkat: "iqra", jilid: t.jilid, dari: Number(dari), sampai: Number(sampai), nilai, catatan: cat.trim(), siap: Number(sampai) >= L.IQRA_HAL && nilai !== "U" }; }
    const id = ed ? ed.id : uid("t"), base = ed ? { santri: ed.santri, tanggal: ed.tanggal, guru: ed.guru, ts: ed.ts, diubah: { oleh: me().id, ts: Date.now() } } : { santri: s.id, tanggal: tgl, guru: me().id, ts: Date.now() };
    if (await put("tahsin", id, { ...base, ...rec })) {
      if (ed) logUbah("ubah", "tahsin", id, `Tahsin ${s.nama} ${L.fmtTgl(tgl)} dikoreksi`, ed);
      toast(mode === "ujian" ? (lulus ? (t.jilid >= 6 ? `${s.nama} lulus Iqro' 6 · naik ke Al-Qur'an` : `${s.nama} lulus · naik ke Iqro' ${t.jilid + 1}`) : "Hasil ujian disimpan · mengulang jilid ini") : "Bacaan tahsin disimpan");
      nav.back();
    }
  };
  return html`<${SubHeader} title=${ed ? "Koreksi Tahsin" : "Tahsin"} sub=${`${s.nama} · ${L.fmtTgl(tgl)}`} />
    <div class="wrap form-page">
      <${TahsinCard} s=${s} aksi=${!ed ? html`<button type="button" class="link" style="min-height:40px;margin-top:6px" onClick=${() => setAtur(true)}>Atur posisi / tingkat</button>` : null} />
      ${sudah ? html`<div class="note mt8"><${Icon} n="check" s=${18} />Sudah ada catatan hari ini (${sudah.jenis === "ujian" ? "ujian" : sudah.tingkat === "quran" ? "Al-Qur'an" : `hal. ${sudah.dari}–${sudah.sampai}`}). Menyimpan lagi menambah catatan baru; untuk memperbaiki pakai Riwayat & Koreksi.</div>` : null}
      ${!quran && t.jilid && !ed ? html`<${Seg} items=${[["baca", "Bacaan harian"], ["ujian", `Ujian Iqro' ${t.jilid}`]]} value=${mode} onChange=${setMode} />` : null}
      ${mode === "ujian" ? html`<${Card} title=${`Ujian kenaikan Iqro' ${t.jilid}`}>
          <div class="iq-pilih dua"><button type="button" class=${lulus ? "on" : ""} onClick=${() => setLulus(true)}>Lulus${t.jilid >= 6 ? " · ke Al-Qur'an" : ` · ke Iqro' ${t.jilid + 1}`}</button><button type="button" class=${!lulus ? "on merah" : ""} onClick=${() => setLulus(false)}>Belum lulus</button></div>
          <${Field} label="Nilai ujian (boleh kosong)"><input class="in" type="number" inputmode="numeric" min="0" max="100" value=${skor} onInput=${e => setSkor(e.target.value)} placeholder="0–100" /></${Field}></${Card}>`
        : quran ? html`<${Card} title="Bacaan Al-Qur'an"><${Field} label="Posisi bacaan"><input class="in" placeholder="Contoh: Juz 30 · Al-Fajr ayat 1–15" value=${posisi} onInput=${e => setPosisi(e.target.value)} /></${Field}></${Card}>`
        : html`<${Card} title=${`Bacaan Iqro' ${t.jilid || "?"}`}><div class="iq-dua"><${Field} label="Dari halaman"><${Stepper} value=${dari} onChange=${setDari} min=${1} max=${40} label="Dari halaman" /></${Field}>
            <${Field} label="Sampai halaman"><${Stepper} value=${sampai} onChange=${setSampai} min=${1} max=${40} label="Sampai halaman" /></${Field}></div>
            ${Number(sampai) >= L.IQRA_HAL ? html`<p class="small" style="margin:6px 0 0;color:#8A5A00;font-weight:700">Sampai halaman terakhir jilid: santri ditandai siap ujian kenaikan jilid.</p>` : null}</${Card}>`}
      ${mode !== "ujian" ? html`<${Card} title="Penilaian"><div class="iq-pilih tiga">${Object.entries(L.TAHSIN_NILAI).map(([k, v]) => html`<button type="button" class=${(nilai === k ? "on " : "") + (k === "U" ? "merah" : k === "KL" ? "emas" : "")} onClick=${() => setNilai(k)}>${v}</button>`)}</div>
          ${nilai === "U" ? html`<p class="small" style="margin:8px 0 0">"Ulang": halaman ini belum dihitung maju, dibaca lagi di pertemuan berikutnya.</p>` : null}</${Card}>` : null}
      <${Card}><${Field} label="Catatan untuk santri/wali (boleh kosong)"><textarea class="in" rows="2" value=${cat} onInput=${e => setCat(e.target.value)} placeholder="Contoh: makhraj ح masih tertukar dengan ه"></textarea></${Field}></${Card}>
      <div class="sticky-act"><${Btn} icon="check" onClick=${simpan}>${ed ? "Simpan koreksi" : mode === "ujian" ? "Simpan hasil ujian" : "Simpan bacaan"}</${Btn}></div></div>
    ${atur ? html`<${AturTahsin} s=${s} t=${t} onClose=${() => setAtur(false)} />` : null}`;
}

// Rekap tahsin: guru (halaqahnya), Wadir Tahfidz/Mudir (semua halaqah) + unduh PDF
export function RekapTahsin() {
  useApp();
  const semua = bolehSemua(), hq = halaqahSaya(), hqs = semua ? L.HALAQAH : hq ? [hq] : [], bulan = L.today().slice(0, 7);
  const grup = hqs.map(h => ({ h, rows: L.santriHalaqah(h.id).map(s => ({ s, t: L.tahsinStatus(s), n: all("tahsin").filter(r => r.santri === s.id && r.jenis === "baca" && (r.tanggal || "").startsWith(bulan)) })).filter(x => x.t) })).filter(g => g.rows.length);
  const rows = grup.flatMap(g => g.rows), per = [1, 2, 3, 4, 5, 6].map(j => rows.filter(x => !x.t.quran && x.t.jilid === j).length), lulus = rows.filter(x => x.t.quran).length, siap = rows.filter(x => x.t.siapUjian).length;
  const unduh = () => unduhPdf("Rekap Tahsin " + L.fmtTgl(L.today()), () => tabelKePdf({ judul: "Rekap Tahsin (Iqro')", sub: `Per ${L.fmtTgl(L.today())} · ${rows.length} santri`,
    catatan: `Metode Iqro' KH. As'ad Humam, jilid 1–6 (±${L.IQRA_HAL} hal./jilid). Sebaran: ${per.map((n, i) => `Iqro' ${i + 1}: ${n}`).join(", ")}, Al-Qur'an: ${lulus}. Siap ujian: ${siap}.`,
    oleh: `Dicetak oleh ${me().nama}, ${L.fmtTgl(L.today())} · MuawanahQu`, ttd: ttdUntukPdf("tahfidz"),
    bagian: grup.map(g => ({ judul: `${g.h.nama} · ${g.rows.length} santri`, kol: ["No", "Nama santri", "Tingkat", "Halaman", "Status", "Bacaan bulan ini", "Terakhir"],
      rows: g.rows.map(({ s, t, n }, i) => [i + 1, s.nama, t.quran ? "Al-Qur'an" : t.jilid ? `Iqro' ${t.jilid}` : "-", t.quran ? t.ket || "-" : `${t.hal || 0}/${L.IQRA_HAL}`, t.siapUjian ? "Siap ujian" : t.gagal ? "Mengulang" : t.quran ? "Lulus Iqro'" : "Belajar", n.length + "x", n.length ? L.fmtTgl(n[n.length - 1].tanggal) : "-"]) })) }));
  return html`<${SubHeader} title="Rekap Tahsin" sub=${semua ? "Semua halaqah" : hq ? hq.nama : ""} />
    <div class="wrap">${rows.length ? html`
      <${Card}><div class="iq-ringkas">${per.map((n, i) => html`<span class=${n ? "ada" : ""}><b>${n}</b><small>Iqro' ${i + 1}</small></span>`)}<span class=${"qr" + (lulus ? " ada" : "")}><b>${lulus}</b><small>Al-Qur'an</small></span></div>
        <div class="stats mt8"><${Stat} label="Santri tahsin" value=${rows.length} /><${Stat} label="Siap ujian" value=${siap} tone=${siap ? "gold" : ""} /><${Stat} label="Lulus Iqro'" value=${lulus} tone="green" /></div></${Card}>
      ${grup.map(g => html`<${Card} title=${g.h.nama} right=${html`<small>${g.rows.length} santri</small>`}><div class="list">${g.rows.map(({ s, t, n }) => html`<${Row} name=${s.nama} sub=${`${t.label} · ${n.length}x membaca bulan ini`}
        right=${t.siapUjian ? html`<${Pill} t="Siap ujian" tone="gold" />` : t.quran ? html`<${Pill} t="Al-Qur'an" tone="green" />` : html`<span class="iq-mini"><b>${t.jilid || "?"}</b><small>${t.hal || 0}/${L.IQRA_HAL}</small></span>`} onClick=${() => nav.go("santri", { sid: s.id })} />`)}</div></${Card}>`)}
      <div class="sticky-act"><${Btn} icon="download" onClick=${unduh}>Unduh rekap tahsin (PDF)</${Btn}></div>` : html`<${Card}><${Empty} t="Belum ada santri tahsin." icon="bookopen" /></${Card}>`}</div>`;
}
