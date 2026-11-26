// Fitur AI: unggah dokumen (Data Awal Hafalan & Impor Santri), tombol AI, ringkasan.
import { useState, useRef } from "preact/hooks";
import { html, nav, useApp, Icon, Card, SubHeader, Stat, Pill, Btn, Empty, Field, Sheet, Hint, Stepper, Seg } from "./ui.js";
import { S, put, toast, uid } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { logUbah } from "./s_koreksi.js";
import { tanyaAI, aiAda, aiNama, SISTEM_DASAR } from "./ai.js";
import { bacaBerkas, parseCSV, TERIMA } from "./berkas.js";
import { bacaFormatHafalan, cocokFormat, keHalaman, keIqro, fmt as fmtHal } from "./baca_hafalan.js";

// ---------- alat bantu ----------
const norm = s => String(s || "").toLowerCase().replace(/\b(muhammad|muhamad|moh|muh|mohammad|m)\b\.?/g, " ").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
export function mirip(a, b) {
  a = norm(a); b = norm(b); if (!a || !b) return 0; if (a === b) return 1;
  const bg = s => { const o = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); o.set(k, (o.get(k) || 0) + 1); } return o; };
  const A = bg(a), B = bg(b); let inter = 0; A.forEach((v, k) => (inter += Math.min(v, B.get(k) || 0)));
  const dice = (2 * inter) / Math.max(1, a.length - 1 + b.length - 1);
  const ta = a.split(" "), tb = b.split(" "), tok = ta.filter(t => tb.includes(t)).length / Math.max(ta.length, tb.length);
  return Math.max(dice, tok);
}
function cocokkan(nama, list) { let best = null, sc = 0; list.forEach(s => { const v = mirip(nama, s.nama); if (v > sc) { sc = v; best = s; } }); return { best, sc }; }
const daftarSantri = () => L.santriList().map(s => `${s.id}|${s.nama}|${s.kelas}|${L.asramaAman(s.asrama).nama}`).join("\n");

export function useAIRun() {
  const [busy, setBusy] = useState(false);
  const run = async fn => { if (busy) return; setBusy(true); try { return await fn(); } catch (e) { toast(e.message || "AI gagal", "err"); } finally { setBusy(false); } };
  return [busy, run];
}
export function AiBtn({ label = "Bantu dengan AI", busy, onClick, kecil }) {
  if (!aiAda()) return null;
  return html`<button type="button" class=${"ai-btn" + (kecil ? " kecil" : "") + (busy ? " busy" : "")} disabled=${busy} onClick=${onClick}>
    <${Icon} n="sparkle" s=${kecil ? 15 : 17} /><span>${busy ? "AI sedang bekerja…" : label}</span></button>`;
}
// teks AI sederhana: baris "- " jadi butir, **tebal** jadi tebal
// Penampil jawaban AI (Markdown ringan: tebal, miring, kode, judul, butir, daftar bernomor, tabel, garis)
const inlineAI = s => {
  const out = [], re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s](?:[^*]*[^*\s])?\*)/g; let last = 0, m;
  while ((m = re.exec(s))) { if (m.index > last) out.push(s.slice(last, m.index)); const x = m[0]; out.push(x.startsWith("**") ? html`<b>${x.slice(2, -2)}</b>` : x.startsWith("`") ? html`<code>${x.slice(1, -1)}</code>` : html`<i>${x.slice(1, -1)}</i>`); last = re.lastIndex; }
  if (last < s.length) out.push(s.slice(last)); return out;
};
export function TeksAI({ t }) {
  const lines = String(t || "").replace(/\r/g, "").split("\n"), out = []; let i = 0;
  const sel = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
  while (i < lines.length) {
    const raw = lines[i], l = raw.trim();
    if (!l) { i++; continue; }
    if (/^```/.test(l)) { const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i].trim())) buf.push(lines[i++]); i++; out.push(html`<pre class="ai-pre">${buf.join("\n")}</pre>`); continue; }
    if (/^\|.*\|$/.test(l)) {
      const rows = []; while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) rows.push(lines[i++].trim());
      const body = rows.filter(r => !/^\|[\s:|-]+\|$/.test(r)).map(sel);
      if (body.length) out.push(html`<div class="ai-tbl"><table><thead><tr>${body[0].map(c => html`<th>${inlineAI(c)}</th>`)}</tr></thead><tbody>${body.slice(1).map(r => html`<tr>${r.map(c => html`<td>${inlineAI(c)}</td>`)}</tr>`)}</tbody></table></div>`);
      continue;
    }
    const sub = /^\s{2,}/.test(raw) ? " li2" : "";
    if (/^#{1,6}\s/.test(l)) out.push(html`<h5>${inlineAI(l.replace(/^#+\s/, "").replace(/^\*\*(.*)\*\*$/, "$1"))}</h5>`);
    else if (/^(-{3,}|\*{3,})$/.test(l)) out.push(html`<hr />`);
    else if (/^[-•*]\s+/.test(l)) out.push(html`<p class=${"li" + sub}>${inlineAI(l.replace(/^[-•*]\s+/, ""))}</p>`);
    else if (/^\d+[.)]\s+/.test(l)) out.push(html`<p class=${"li num" + sub} data-n=${l.match(/^\d+/)[0] + "."}>${inlineAI(l.replace(/^\d+[.)]\s+/, ""))}</p>`);
    else out.push(html`<p>${inlineAI(l)}</p>`);
    i++;
  }
  return html`<div class="ai-teks">${out}</div>`;
}
// Teks polos untuk disalin (tanpa tanda Markdown)
export const teksPolos = t => String(t || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/^#+\s*/gm, "").replace(/^\s*[-*]\s+/gm, "• ").replace(/^\|[\s:|-]+\|$/gm, "").replace(/^\|(.*)\|$/gm, (_, x) => x.split("|").map(c => c.trim()).join(" · ")).replace(/\n{3,}/g, "\n\n").trim();
export function KartuAI({ judul = "Analisis AI", tombol = "Buat analisis", buat, ket }) {
  const [busy, run] = useAIRun(); const [t, setT] = useState("");
  if (!aiAda()) return null;
  return html`<div class="card ai-card"><div class="ai-card-h"><span class="ai-ic"><${Icon} n="sparkle" s=${16} /></span><b>${judul}</b>${t ? html`<button class="link" onClick=${() => run(async () => setT(await buat()))}>Ulangi</button>` : null}</div>
    ${t ? html`<${TeksAI} t=${t} /><p class="ai-catat">Dibuat ${aiNama()} dari data aplikasi. Periksa kembali sebelum dipakai.</p>` : html`${ket ? html`<p class="small" style="margin:0 0 10px">${ket}</p>` : null}<${AiBtn} label=${tombol} busy=${busy} onClick=${() => run(async () => setT(await buat()))} />`}</div>`;
}

// ---------- ringkasan data santri untuk AI ----------
export function dataSantriAI(s) {
  const h = L.hafalan(s), c = L.capaianJuz(s), rg = L.periodeRange("semester"), kh = L.kehadiranHalaqah(s.id, rg), mp = L.mutPersen(s.id, rg), po = L.poinSantri(s.id);
  const nilai = DATA.mapel.map(m => { const n = L.nilaiAkhir(s.id, m.id) || {}; return n.akhir == null ? null : `${m.nama} ${n.akhir}`; }).filter(Boolean);
  const bulan = L.hafalanDalam(s.id, L.periodeRange("bulanan"));
  return [`Nama: ${s.nama} (panggilan ${s.panggilan || "-"}), kelas ${s.kelas}, asrama ${L.asramaAman(s.asrama).nama}, ${L.namaHalaqah(s)}`,
    `Total hafalan: ${L.fmtJumlah(h)}${h.khatam ? " (khatam)" : `, sedang menghafal Juz ${h.aktif} (${L.posLabel(h.aktif, h.baris)})`}${h.siapTasmi ? ", siap tasmi'" : ""}`,
    `Hafalan baru semester ini: ${c.juz} dari target ${c.target} juz (${c.pct}%)`,
    `Hafalan baru bulan ini: ${L.fmtBaris(bulan.baris)} dalam ${bulan.hari} hari setor`,
    `Kehadiran halaqah semester: ${kh.pct == null ? "belum ada data" : kh.pct + "%"} (sakit ${kh.S || 0}, izin ${kh.I || 0}, alpa ${kh.A || 0})`,
    `Mutaba'ah ibadah ${mp.ibadah == null ? "-" : mp.ibadah + "%"}, adab ${mp.adab == null ? "-" : mp.adab + "%"}`,
    `Poin pelanggaran: ${po.total}`, nilai.length ? `Nilai mapel: ${nilai.join(", ")}` : "Nilai mapel: belum ada"].join("\n");
}
export const tulisCatatanRapor = (s, periode) => tanyaAI({ sistem: SISTEM_DASAR, teks: `Tulis catatan wali asrama untuk rapor ${periode === "mid" ? "tengah semester" : "akhir semester"} santri berikut.
Syarat: 2–3 kalimat, maksimal 380 karakter, hangat dan islami, sebut 1 kekuatan dan 1 hal yang perlu ditingkatkan berdasarkan data, tanpa angka persen yang kaku, tanpa salam pembuka, tanpa tanda kutip.
Data:
${dataSantriAI(s)}` }).then(t => t.replace(/\*\*/g, "").replace(/^["“]|["”]$/g, "").trim().slice(0, 400));
export const ringkasWali = s => tanyaAI({ sistem: SISTEM_DASAR, teks: `Buat ringkasan perkembangan ananda untuk orang tua (wali santri) dari data berikut.
Syarat: sapa "Ayah/Bunda", 1 paragraf pendek (maks. 90 kata) lalu 2–3 butir saran sederhana yang bisa dilakukan orang tua (awali tiap butir dengan "- "). Nada lembut, memotivasi, jujur. Jangan menyebut data yang kosong.
Data:
${dataSantriAI(s)}` });
export const ringkasStaf = s => tanyaAI({ sistem: SISTEM_DASAR, teks: `Buat ringkasan kondisi santri ini untuk ustadz/pengurus pondok.
Format: 1 kalimat kesimpulan, lalu 3–4 butir (awali "- ") berisi kekuatan, hal yang perlu perhatian, dan saran tindak lanjut yang konkret. Ringkas.
Data:
${dataSantriAI(s)}` });

// ---------- Unggah dokumen (dipakai Data Awal & Impor Santri) ----------
function PilihDokumen({ onBaca, contoh, busy, langkah }) {
  const [teks, setTeks] = useState(""); const [mode, setMode] = useState("berkas"); const inp = useRef(null);
  const pilih = e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) onBaca({ file: f }); };
  return html`<${Card}>
    <${Seg} small items=${[["berkas", "Unggah berkas"], ["tempel", "Tempel teks"]]} value=${mode} onChange=${setMode} />
    ${mode === "berkas" ? html`<button type="button" class=${"drop" + (busy ? " busy" : "")} disabled=${busy} onClick=${() => inp.current && inp.current.click()}>
        <span class="drop-ic"><${Icon} n=${busy ? "sparkle" : "upload"} s=${26} /></span>
        <b>${busy ? langkah || "Memproses…" : "Pilih berkas"}</b><small>${busy ? "Mohon tunggu, jangan tutup halaman ini" : "Excel, CSV, Word, PDF, atau foto dokumen"}</small></button>
      <input ref=${inp} type="file" accept=${TERIMA} style="display:none" onChange=${pilih} />`
    : html`<${Field} label="Tempel isi dokumen"><textarea class="in" style="min-height:150px" value=${teks} placeholder=${contoh} onInput=${e => setTeks(e.target.value)}></textarea></${Field}>
      <${Btn} icon="sparkle" disabled=${!teks.trim() || busy} onClick=${() => onBaca({ teks })}>${busy ? langkah || "Memproses…" : "Baca data"}</${Btn}>`}
    <p class="small" style="margin:10px 2px 0">${aiAda() ? html`Format boleh berantakan: ${aiNama()} akan membaca dan merapikannya. Hasilnya ditampilkan dulu untuk diperiksa sebelum disimpan.` : "AI hanya aktif di versi online. Tanpa AI, gunakan tabel rapi dengan judul kolom (misal: Nama, Juz selesai, Juz sedang, Halaman)."}</p>
  </${Card}>`;
}
async function siapkanDokumen({ file, teks }, setLangkah) {
  if (teks) return { nama: "teks tempelan", teks, tabel: parseCSV(teks), berkas: [] };
  setLangkah("Membaca berkas…");
  return await bacaBerkas(file);
}
const isiDok = d => (d.teks ? `\nIsi dokumen "${d.nama}":\n${d.teks}` : `\n(Dokumen "${d.nama}" terlampir sebagai berkas/gambar.)`);
function cariKolom(header, pola) { return header.findIndex(h => pola.test(String(h).toLowerCase())); }
function barisJudul(tabel) { const i = tabel.slice(0, 10).findIndex(r => r.some(c => /nama/i.test(String(c)))); return i; }

// ================= DATA AWAL HAFALAN =================
const U = DATA.urutanJuz;
export function keAwal(r) {
  let sel = [...new Set((r.juz_selesai || []).map(Number).filter(j => j >= 1 && j <= 30))], aktif = Number(r.juz_aktif) || null, baris = 0;
  if (!sel.length && Number(r.jumlah_juz) > 0) {
    const n = Math.min(30, Number(r.jumlah_juz)), full = Math.floor(n + 1e-9); sel = U.slice(0, full);
    if (n - full > 0.01 && full < 30) { aktif = U[full]; baris = Math.round((n - full) * L.juzLines(aktif)); }
  }
  sel = U.filter(j => sel.includes(j));
  if (!aktif || sel.includes(aktif)) aktif = U.find(j => !sel.includes(j)) || 30;
  if (r.baris_aktif != null && r.baris_aktif !== "") baris = Number(r.baris_aktif) || 0; else if (r.halaman_aktif != null && r.halaman_aktif !== "") baris = Math.round(Number(r.halaman_aktif) * 15) || 0;
  const o = { selesai: sel, aktif, baris: Math.max(0, Math.min(L.juzLines(aktif), baris)) };
  const as = keHalaman(r.awal_semester); if (as != null) o.awalSemHal = as;
  return o;
}
// baris AI untuk santri Iqro' → data tahsin
function keTahsin(r) {
  const now = keIqro(r.iqro_sekarang); if (!now) return null;
  return { tingkat: "iqra", jilid: now.jilid, hal: now.hal, awalSem: keIqro(r.iqro_awal_semester), lulus: (r.iqro_lulus || []).map(Number).filter(n => n >= 1 && n <= 6) };
}
const angkaJuz = t => { const out = []; String(t || "").replace(/(\d{1,2})\s*(?:-|–|s\.?d\.?|sampai)\s*(\d{1,2})|(\d{1,2})/gi, (m, a, b, c) => { if (a) { a = +a; b = +b; for (let j = Math.min(a, b); j <= Math.max(a, b); j++) out.push(j); } else out.push(+c); return m; }); return out.filter(j => j >= 1 && j <= 30); };
// Pembaca tanpa AI: tabel dengan judul kolom
function awalLokal(tabel) {
  const hi = barisJudul(tabel); if (hi < 0) throw new Error("Tidak menemukan kolom Nama. Tanpa AI, dokumen perlu tabel dengan judul kolom.");
  const H = tabel[hi], cN = cariKolom(H, /nama/), cS = cariKolom(H, /selesai|sudah|hafal|juz yang/), cJ = cariKolom(H, /jumlah|total/), cA = cariKolom(H, /sedang|aktif|proses|berjalan/), cH = cariKolom(H, /halaman|hal\b/), cB = cariKolom(H, /baris/);
  return tabel.slice(hi + 1).filter(r => String(r[cN] || "").trim().length > 2).map(r => {
    const txt = H.map((h, i) => (i === cN ? "" : `${h}: ${r[i]}`)).join("; ");
    const jum = cJ >= 0 ? parseFloat(String(r[cJ]).replace(",", ".")) : null;
    return { nama: String(r[cN]).trim(), santri_id: null, juz_selesai: cS >= 0 ? angkaJuz(r[cS]) : [], jumlah_juz: isNaN(jum) ? null : jum, juz_aktif: cA >= 0 ? angkaJuz(r[cA])[0] : null,
      halaman_aktif: cH >= 0 ? parseFloat(String(r[cH]).replace(",", ".")) || 0 : null, baris_aktif: cB >= 0 ? parseInt(r[cB]) || 0 : null, catatan: "", asal: txt };
  });
}
const PROMPT_AWAL = `Tugas: baca dokumen data hafalan Al-Qur'an santri di bawah dan ubah ke JSON.
Daftar santri di aplikasi (id|nama|kelas|asrama):
{SANTRI}

Aturan:
- Satu objek untuk tiap santri yang disebut di dokumen. Abaikan judul, baris kosong, nomor urut, dan baris total.
- santri_id: id dari daftar di atas untuk orang yang sama (ejaan boleh sedikit beda; M./Muh./Moh. = Muhammad; boleh nama panggilan bila jelas). Bila ragu atau tidak ada di daftar, isi null.
- juz_selesai: nomor juz yang sudah hafal penuh. Rentang "1-5" berarti 1,2,3,4,5. Urutan hafalan pondok: Juz 30, 29, lalu 1, 2, 3, dst.
- Bila dokumen hanya menyebut jumlah juz (misal "5 juz" atau "3,5 juz") tanpa nomor juz, isi jumlah_juz (angka) dan biarkan juz_selesai kosong.
- juz_aktif: juz yang sedang dihafal bila disebut. halaman_aktif: berapa halaman sudah dihafal di juz itu (1 juz = 20 halaman). baris_aktif hanya bila disebut dalam baris. Bila disebut surah/ayat, perkirakan halamannya.
- awal_semester: hafalan santri saat awal semester bila disebut (misal "Hafalan Awal Semester : 7 Juz" atau "2 juz 5 halaman"), tulis sebagai teks aslinya. Angka saja ("7") berarti juz.
- total: total hafalan sekarang bila disebut, tulis teks aslinya.
- "Hal"/"Hlm" = halaman. "Juz 8 Halaman 14" berarti sedang di juz 8 dan sudah 14 halaman.
- Santri yang masih Iqro' (buku Iqro' jilid 1–6): isi iqro_sekarang & iqro_awal_semester seperti "jilid 3 halaman 32" dan iqro_lulus = daftar jilid yang sudah lulus. Bila tertulis "3 jilid 3 halaman 3", artinya jilid 3 halaman 3. Untuk santri Iqro', kosongkan juz.
- catatan: keterangan singkat bila ada yang janggal atau perlu dicek; kosongkan bila tidak ada.
Jawab hanya JSON: {"baris":[{"nama":"","santri_id":null,"juz_selesai":[],"jumlah_juz":null,"juz_aktif":null,"halaman_aktif":null,"baris_aktif":null,"awal_semester":null,"total":null,"iqro_sekarang":null,"iqro_awal_semester":null,"iqro_lulus":[],"catatan":""}]}`;

export function ImporAwal() {
  useApp();
  const [langkah, setLangkah] = useState(""); const [busy, setBusy] = useState(false); const [rows, setRows] = useState(null); const [dok, setDok] = useState("");
  const [ed, setEd] = useState(null); const [simpanBusy, setSB] = useState(false);
  const semua = L.santriList();
  // cocokkan nama; utamakan santri di halaqah yang disebut di pesan ("Halaqah Ust. Kafi")
  const cariSantri = (r, dipakai) => {
    let s = r.santri_id && semua.find(x => x.id === r.santri_id), sc = s ? mirip(r.nama, s.nama) : 0;
    if (r.halaqah) {
      const hq = L.HALAQAH.find(h => mirip(r.halaqah, h.nama.replace(/^Halaqah\s+/i, "")) >= 0.7 || mirip(r.halaqah, (L.staffById(h.guru) || {}).pendek || "") >= 0.7);
      if (hq) { const c = cocokkan(r.nama, L.santriHalaqah(hq.id)); if (c.sc >= 0.55 && c.sc >= sc) { s = c.best; sc = Math.max(c.sc, 0.8); } }
    }
    if (!s || sc < 0.35) { const c = cocokkan(r.nama, semua); if (c.sc >= 0.6) { s = c.best; sc = c.sc; } else if (!s) s = null; }
    const ganda = s && dipakai.has(s.id); if (s) dipakai.add(s.id);
    return { sid: s ? s.id : "", st: !s ? "tidak" : ganda ? "ganda" : sc >= 0.8 ? "cocok" : "cek" };
  };
  const baca = async inp => {
    setBusy(true);
    try {
      const d = await siapkanDokumen(inp, setLangkah); setDok(d.nama);
      let hasil;
      if (d.teks && cocokFormat(d.teks)) {
        setLangkah("Membaca format pendataan…");
        hasil = bacaFormatHafalan(d.teks).map(r => ({ nama: r.nama, halaqah: r.halaqah, iqra: r.iqra, awal: r.awal, tahsin: r.tahsin, catatan: r.catatan.join(" · ") }));
      } else if (aiAda()) {
        setLangkah(`${aiNama()} sedang membaca isi dokumen…`);
        const j = await tanyaAI({ sistem: SISTEM_DASAR, json: true, berkas: d.berkas, teks: PROMPT_AWAL.replace("{SANTRI}", daftarSantri()) + isiDok(d) });
        hasil = (Array.isArray(j) ? j : j.baris || []).filter(r => r && r.nama).map(r => { const t = keTahsin(r); return { nama: r.nama, santri_id: r.santri_id, iqra: !!t, tahsin: t, awal: t ? null : keAwal(r), catatan: r.catatan || "" }; });
      } else hasil = awalLokal(d.tabel || []).map(r => ({ nama: r.nama, awal: keAwal(r), catatan: "" }));
      hasil = hasil.filter(r => r.awal || r.tahsin);
      if (!hasil.length) throw new Error("Tidak ada data santri yang terbaca dari dokumen ini.");
      const dipakai = new Set();
      setRows(hasil.map((r, i) => { const m = cariSantri(r, dipakai); return { k: i, ...r, ...m, ikut: m.st === "cocok" || m.st === "cek" }; })); setLangkah("");
    } catch (e) { toast(e.message || "Gagal membaca dokumen", "err"); }
    finally { setBusy(false); setLangkah(""); }
  };
  const ubah = (k, o) => setRows(rows.map(r => (r.k === k ? { ...r, ...o } : r)));
  const n = st => rows.filter(r => r.st === st).length, ikut = rows ? rows.filter(r => r.ikut && r.sid) : [];
  const simpan = async () => {
    setSB(true); let ok = 0, iq = 0; const ts = Date.now(), oleh = me().id;
    for (const r of ikut) {
      if (r.tahsin) { if (await put("tahsinAwal", r.sid, { ...r.tahsin, ujian: r.tahsin.hal >= L.IQRA_HAL, oleh, ts, tgl: L.today() })) iq++; }
      else if (await put("dataAwal", r.sid, { ...r.awal, oleh, ts, tgl: L.today() })) ok++;
    }
    logUbah("ubah", "dataAwal", "impor", `Impor data awal: ${ok} santri Al-Qur'an, ${iq} santri Iqro' dari ${dok}`);
    setSB(false); toast(`Tersimpan: ${ok} santri Al-Qur'an${iq ? `, ${iq} santri Iqro'` : ""}`); nav.back();
  };
  // ringkasan capaian semester sebelum disimpan
  const tg = L.targetSemester() * 20;
  const capai = a => { if (a.awalSemHal == null) return null; const now = a.selesai.length * 20 + a.baris / 15, g = Math.max(0, now - a.awalSemHal); return { now, g, ok: g >= tg }; };
  const posIq = (j, h) => (j - 1) * L.IQRA_HAL + (h || 0);
  return html`<${SubHeader} title="Unggah Data Awal" sub="Dari pesan, dokumen, atau foto" />
    <div class="wrap">${!rows ? html`<${Hint}>Tempel pesan pendataan hafalan dari WhatsApp (bisa beberapa halaqah sekaligus), atau unggah Excel, Word, PDF, foto. Santri Al-Qur'an masuk ke Data Awal Hafalan, santri Iqro' masuk ke Tahsin.</${Hint}>
      <${PilihDokumen} onBaca=${baca} busy=${busy} langkah=${langkah} contoh=${"Tempel pesan pendataan, contoh:\n*1. Adiyatma Wiryateja*\nHafalan Awal Semester : 7 Juz\nTotal Hafalan : 9 Juz 13 Halaman\nJuz Yang Sudah di Hafal : 29,30,1,2,3,4,5,6,7\nHafalan Sekarang : Juz 8 Halaman 14"} />`
    : html`<${Card}><div class="stats"><${Stat} label="Cocok" value=${n("cocok")} /><${Stat} label="Perlu dicek" value=${rows.filter(r => r.st === "cek" || r.st === "ganda" || r.catatan).length} tone="gold" /><${Stat} label="Tidak ditemukan" value=${n("tidak")} tone="blue" /></div>
        <p class="small" style="margin:8px 0 0">Dari <b>${dok}</b> · ${rows.filter(r => !r.tahsin).length} santri Al-Qur'an, ${rows.filter(r => r.tahsin).length} santri Iqro'. Periksa yang bertanda kuning sebelum menyimpan.</p></${Card}>
      <div class="imp-list">${rows.map(r => { const c = r.awal && capai(r.awal), t = r.tahsin;
        const gIq = t && t.awalSem ? Math.max(0, posIq(t.jilid, t.hal) - posIq(t.awalSem.jilid, t.awalSem.hal)) : null;
        return html`<div class=${"imp-row " + r.st + (r.ikut && r.sid ? "" : " off")}>
          <div class="imp-top"><label class="imp-cek"><input type="checkbox" checked=${r.ikut && !!r.sid} disabled=${!r.sid} onChange=${e => ubah(r.k, { ikut: e.target.checked })} /></label>
            <div class="imp-t"><small>${r.halaqah ? `Halaqah ${r.halaqah} · ` : ""}Di pesan: ${r.nama}</small>
              <select class="in" value=${r.sid} onChange=${e => ubah(r.k, { sid: e.target.value, st: e.target.value ? "cocok" : "tidak", ikut: !!e.target.value })}><option value="">— Tidak dipakai —</option>${semua.map(x => html`<option value=${x.id}>${x.nama} · ${x.kelas}</option>`)}</select></div>
            <${Pill} t=${{ cocok: "Cocok", cek: "Cek nama", ganda: "Ganda", tidak: "Tak ada" }[r.st]} tone=${{ cocok: "green", cek: "gold", ganda: "red", tidak: "muted" }[r.st]} /></div>
          ${t ? html`<div class="imp-isi"><span><b>Iqro' ${t.jilid}</b> hal. ${t.hal}${t.awalSem ? ` · awal semester Iqro' ${t.awalSem.jilid} hal. ${t.awalSem.hal}` : ""}${t.lulus.length ? ` · lulus jilid ${t.lulus.join(", ")}` : ""}</span></div>
              ${gIq != null ? html`<div class="imp-cap"><span>Kemajuan semester ini</span><b>+${gIq} halaman Iqro'</b></div>` : null}`
            : html`<div class="imp-isi"><span>Hafal <b>${r.awal.selesai.length} juz</b>${r.awal.selesai.length ? ` (${r.awal.selesai.join(", ")})` : ""} · sedang ${L.posLabel(r.awal.aktif, r.awal.baris)}</span><button class="link" onClick=${() => setEd(r)}>Ubah</button></div>
              ${c ? html`<div class=${"imp-cap " + (c.ok ? "ok" : "")}><span>Awal semester ${fmtHal(r.awal.awalSemHal)} → sekarang ${fmtHal(c.now)}</span><b>+${fmtHal(c.g)}${c.ok ? " · target tercapai ✓" : ` dari ${L.targetSemester()} juz`}</b></div>` : null}`}
          ${r.catatan ? html`<small class="imp-cat">${r.catatan}</small>` : null}</div>`; })}</div>
      <div class="sticky-act"><div class="btn-row"><${Btn} kind="ghost" onClick=${() => setRows(null)}>Ulangi</${Btn}><${Btn} icon="check" disabled=${!ikut.length || simpanBusy} onClick=${simpan}>${simpanBusy ? "Menyimpan…" : `Simpan ${ikut.length} santri`}</${Btn}></div></div>
      ${ed ? html`<${AwalSheet} judul=${ed.nama} awal=${ed.awal} onClose=${() => setEd(null)} onSimpan=${a => { ubah(ed.k, { awal: a }); setEd(null); }} />` : null}`}</div>`;
}
export function AwalSheet({ judul, awal, onSimpan, onClose, tombol = "Pakai" }) {
  const [sel, setSel] = useState(new Set(awal.selesai)); const [aktif, setAktif] = useState(awal.aktif); const [baris, setBaris] = useState(awal.baris);
  const as0 = awal.awalSemHal == null ? null : Number(awal.awalSemHal); const [asJ, setAsJ] = useState(as0 == null ? 0 : Math.floor(as0 / 20)), [asH, setAsH] = useState(as0 == null ? 0 : Math.round(as0 % 20)), [adaAs, setAdaAs] = useState(as0 != null);
  const tog = j => { const n = new Set(sel); n.has(j) ? n.delete(j) : n.add(j); setSel(n); if (n.has(aktif)) setAktif(U.find(x => !n.has(x)) || 30); };
  return html`<${Sheet} open=${true} title=${judul} onClose=${onClose}>
    <${Field} label="Juz yang sudah hafal (ketuk untuk memilih)"><div class="chips">${U.map(j => html`<button type="button" class=${"pill " + (sel.has(j) ? "green" : "muted")} style="padding:7px 10px;font-size:12.5px" onClick=${() => tog(j)}>${j}</button>`)}</div></${Field}>
    <${Field} label="Juz yang sedang dihafal"><select class="in" value=${aktif} onChange=${e => setAktif(Number(e.target.value))}>${U.filter(j => !sel.has(j)).map(j => html`<option value=${j}>Juz ${j}</option>`)}</select></${Field}>
    <${Field} label="Baris yang sudah dihafal di juz ini" hint=${`Maksimal ${L.juzLines(Number(aktif))} baris · ${L.posLabel(Number(aktif), Number(baris) || 0)}`}><${Stepper} value=${baris} onChange=${setBaris} max=${L.juzLines(Number(aktif))} step=${15} label="baris" /></${Field}>
    <${Field} label="Hafalan awal semester" hint=${adaAs ? `${asJ} juz ${asH} halaman · untuk menghitung capaian target semester` : "Opsional: isi bila hafalan saat awal semester diketahui"}>
      ${adaAs ? html`<div class="btn-row"><${Stepper} value=${asJ} onChange=${setAsJ} max=${30} label="juz" /><${Stepper} value=${asH} onChange=${v => setAsH(Math.min(19, v))} max=${19} label="halaman" /></div>` : html`<button type="button" class="link" onClick=${() => setAdaAs(true)}>+ Isi hafalan awal semester</button>`}</${Field}>
    <${Btn} icon="check" onClick=${() => onSimpan({ ...awal, selesai: U.filter(j => sel.has(j)), aktif: Number(aktif), baris: Math.min(L.juzLines(Number(aktif)), Number(baris) || 0), awalSemHal: adaAs ? asJ * 20 + asH : null })}>${tombol}</${Btn}></${Sheet}>`;
}

// ================= IMPOR BIODATA SANTRI =================
const BIO = [["nis", "NIS"], ["lahir", "Tgl lahir"], ["tempatLahir", "Tempat lahir"], ["ayah", "Ayah"], ["ibu", "Ibu"], ["hpWali", "HP wali"], ["alamat", "Alamat"], ["hobi", "Hobi"], ["cita", "Cita-cita"]];
const BULAN = { jan: 1, feb: 2, peb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, nop: 11, des: 12, dec: 12 };
export function keTanggal(v) {
  const t = String(v || "").trim().toLowerCase(); if (!t) return "";
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); if (m) return ok(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/); if (m) return ok(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  m = t.match(/(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})/); if (m && BULAN[m[2].slice(0, 3)]) return ok(+m[3], BULAN[m[2].slice(0, 3)], +m[1]);
  return "";
  function ok(y, mo, d) { if (y < 1990 || y > 2030 || mo < 1 || mo > 12 || d < 1 || d > 31) return ""; return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
}
const keKelas = v => { const t = String(v || "").toUpperCase().replace(/\s|KELAS|KLS/g, ""); return L.KELAS.some(k => k.id === t) ? t : ""; };
const keAsrama = v => { const t = String(v || "").toLowerCase().trim(); if (!t) return ""; const a = L.ASRAMA.find(x => x.id === t || x.nama.toLowerCase() === t) || L.ASRAMA.find(x => x.nama.toLowerCase().includes(t) || t.includes(x.nama.toLowerCase())); return a ? a.id : ""; };
function santriLokal(tabel) {
  const hi = barisJudul(tabel);
  if (hi < 0) return tabel.map(r => ({ nama: String(r[0] || "").replace(/^\s*\d+[.)]?\s*/, "").trim() })).filter(r => r.nama.length > 2);
  const H = tabel[hi], c = { nama: cariKolom(H, /nama( lengkap| santri)?$|^nama/), nis: cariKolom(H, /nis|induk/), kelas: cariKolom(H, /kelas/), asrama: cariKolom(H, /asrama|kamar/),
    tanggal_lahir: cariKolom(H, /tgl|tanggal/), tempat_lahir: cariKolom(H, /tempat/), ayah: cariKolom(H, /ayah|bapak/), ibu: cariKolom(H, /ibu/), hp_wali: cariKolom(H, /hp|telp|telepon|wa\b|whatsapp|no\.? ?hp/),
    alamat: cariKolom(H, /alamat/), hobi: cariKolom(H, /hobi/), cita: cariKolom(H, /cita/) };
  return tabel.slice(hi + 1).map(r => Object.fromEntries(Object.entries(c).map(([k, i]) => [k, i >= 0 ? String(r[i] || "").trim() : ""]))).filter(r => r.nama.length > 2);
}
const PROMPT_SANTRI = `Tugas: baca dokumen data santri di bawah dan ubah ke JSON.
Santri yang sudah ada di aplikasi (id|nama|kelas|asrama):
{SANTRI}
Kelas yang ada: {KELAS}. Asrama yang ada: {ASRAMA}.

Aturan:
- Satu objek untuk tiap santri di dokumen. Abaikan judul, nomor urut, baris kosong.
- santri_id: id santri yang sama dari daftar di atas (ejaan boleh sedikit beda; M./Muh. = Muhammad). Bila santri baru/tidak ada, isi null.
- tanggal_lahir dalam format YYYY-MM-DD (ubah dari format apa pun, misal "12 Januari 2013" atau "12/01/2013" = hari/bulan/tahun). Bila ada "Tempat, tanggal" pisahkan ke tempat_lahir.
- kelas hanya salah satu dari daftar kelas; asrama hanya nama dari daftar asrama; bila tidak jelas, kosongkan.
- hp_wali hanya angka (boleh diawali 0 atau 62).
- Kosongkan ("") data yang tidak ada di dokumen. Jangan mengarang.
Jawab hanya JSON: {"baris":[{"nama":"","santri_id":null,"nis":"","kelas":"","asrama":"","tanggal_lahir":"","tempat_lahir":"","ayah":"","ibu":"","hp_wali":"","alamat":"","hobi":"","cita":"","catatan":""}]}`;

function waliBaru(nama) { const w = nama.trim().split(/\s+/).find(x => !/^(m\.?|muh\.?|muhammad|muhamad|ahmad)$/i.test(x)) || "santri"; return { wali: (w.toLowerCase().replace(/[^a-z]/g, "") || "santri") + Math.floor(10 + Math.random() * 89), panggilan: w }; }
export function ImporSantri() {
  useApp();
  const [langkah, setLangkah] = useState(""); const [busy, setBusy] = useState(false); const [rows, setRows] = useState(null); const [dok, setDok] = useState("");
  const [kelas, setKelas] = useState("7"); const [asr, setAsr] = useState(L.ASRAMA[0].id); const [sb, setSB] = useState(false);
  const semua = L.santriList();
  const baca = async inp => {
    setBusy(true);
    try {
      const d = await siapkanDokumen(inp, setLangkah); setDok(d.nama);
      let hasil;
      if (aiAda()) {
        setLangkah(`${aiNama()} sedang membaca isi dokumen…`);
        const j = await tanyaAI({ sistem: SISTEM_DASAR, json: true, berkas: d.berkas, teks: PROMPT_SANTRI.replace("{SANTRI}", daftarSantri()).replace("{KELAS}", L.KELAS.map(k => k.id).join(", ")).replace("{ASRAMA}", L.ASRAMA.map(a => a.nama).join(", ")) + isiDok(d) });
        hasil = (Array.isArray(j) ? j : j.baris || []).filter(r => r && r.nama);
      } else hasil = santriLokal(d.tabel || []);
      if (!hasil.length) throw new Error("Tidak ada data santri yang terbaca dari dokumen ini.");
      const dipakai = new Set();
      setRows(hasil.map((r, i) => {
        let s = r.santri_id && semua.find(x => x.id === r.santri_id); if (s && mirip(r.nama, s.nama) < 0.35) s = null;
        if (!s) { const c = cocokkan(r.nama, semua); if (c.sc >= 0.82) s = c.best; }
        const f = { nama: String(r.nama).trim(), nis: String(r.nis || "").trim(), lahir: keTanggal(r.tanggal_lahir), tempatLahir: String(r.tempat_lahir || "").trim(), ayah: String(r.ayah || "").trim(), ibu: String(r.ibu || "").trim(),
          hpWali: String(r.hp_wali || "").replace(/[^\d+]/g, ""), alamat: String(r.alamat || "").trim(), hobi: String(r.hobi || "").trim(), cita: String(r.cita || "").trim(), kelas: keKelas(r.kelas), asrama: keAsrama(r.asrama) };
        if (s && dipakai.has(s.id)) s = null; if (s) dipakai.add(s.id);
        const beda = s ? BIO.filter(([k]) => f[k] && f[k] !== (s[k] || "")).map(([k]) => k) : [];
        if (s && f.kelas && f.kelas !== s.kelas) beda.push("kelas"); if (s && f.asrama && f.asrama !== s.asrama) beda.push("asrama");
        const st = s ? (beda.length ? "perbarui" : "sama") : "baru";
        return { k: i, sid: s ? s.id : "", f, beda, st, ikut: st !== "sama", catatan: r.catatan || "" };
      }));
    } catch (e) { toast(e.message || "Gagal membaca dokumen", "err"); }
    finally { setBusy(false); setLangkah(""); }
  };
  const ubah = (k, o) => setRows(rows.map(r => (r.k === k ? { ...r, ...o } : r)));
  const n = st => rows.filter(r => r.st === st).length, ikut = rows ? rows.filter(r => r.ikut && r.st !== "sama") : [];
  const simpan = async () => {
    setSB(true); let b = 0, u = 0;
    for (const r of ikut) {
      const ex = (S.data.santriEdit || {});
      if (r.st === "perbarui") { const o = Object.fromEntries(r.beda.map(k => [k, r.f[k]])); if (await put("santriEdit", r.sid, { ...(ex[r.sid] || {}), ...o })) u++; }
      else { const o = Object.fromEntries(Object.entries(r.f).filter(([k, v]) => v && k !== "kelas" && k !== "asrama"));
        if (await put("santriEdit", uid("s"), { ...o, ...waliBaru(r.f.nama), kelas: r.f.kelas || kelas, asrama: r.f.asrama || asr })) b++; }
    }
    logUbah("ubah", "santriEdit", "impor", `Impor data santri dari ${dok}: ${u} diperbarui, ${b} baru`);
    setSB(false); toast(`${u} santri diperbarui, ${b} santri baru`); nav.back();
  };
  const lab = Object.fromEntries([...BIO, ["kelas", "Kelas"], ["asrama", "Asrama"]]);
  return html`<${SubHeader} title="Impor Data Santri" sub="Biodata dari dokumen apa pun" />
    <div class="wrap">${!rows ? html`<${Hint}>Unggah daftar santri (Excel, Word, PDF, foto, atau teks). Bisa untuk menambah santri baru sekaligus melengkapi data yang sudah ada: NIS, tanggal lahir, nama orang tua, HP wali, alamat.</${Hint}>
      <${PilihDokumen} onBaca=${baca} busy=${busy} langkah=${langkah} contoh=${"Contoh:\n1. Ahmad Fauzi, NIS 2301, Bandar Lampung 12-03-2013, Ayah: Budi\n2. M Raya Anugrah lahir 5 Mei 2012 kelas 8"} />`
    : html`<${Card}><div class="stats"><${Stat} label="Diperbarui" value=${n("perbarui")} /><${Stat} label="Baru" value=${n("baru")} tone="blue" /><${Stat} label="Tanpa perubahan" value=${n("sama")} tone="gold" /></div>
        <p class="small" style="margin:8px 0 0">Dari <b>${dok}</b>. Hanya kolom yang terisi di dokumen yang diperbarui. Bila tanggal lahir berubah, kode akses wali ikut berubah.</p></${Card}>
      ${rows.some(r => r.st === "baru" && (!r.f.kelas || !r.f.asrama)) ? html`<${Card} title="Untuk santri baru yang kelas/asramanya tidak tertulis"><div class="btn-row"><${Field} label="Kelas"><select class="in" value=${kelas} onChange=${e => setKelas(e.target.value)}>${L.KELAS.map(k => html`<option value=${k.id}>${k.nama}</option>`)}</select></${Field}>
        <${Field} label="Asrama"><select class="in" value=${asr} onChange=${e => setAsr(e.target.value)}>${L.ASRAMA.map(a => html`<option value=${a.id}>${a.nama}</option>`)}</select></${Field}></div></${Card}>` : null}
      <div class="imp-list">${rows.map(r => { const s = r.sid && L.santriById(r.sid);
        return html`<div class=${"imp-row " + (r.st === "baru" ? "tidak" : r.st === "sama" ? "cek" : "cocok") + (r.ikut && r.st !== "sama" ? "" : " off")}>
          <div class="imp-top"><label class="imp-cek"><input type="checkbox" checked=${r.ikut && r.st !== "sama"} disabled=${r.st === "sama"} onChange=${e => ubah(r.k, { ikut: e.target.checked })} /></label>
            <div class="imp-t"><b>${s ? s.nama : r.f.nama}</b><small>${s ? (s.nama !== r.f.nama ? `Di dokumen: ${r.f.nama} · ` : "") + `Kelas ${s.kelas} · ${L.asramaAman(s.asrama).nama}` : `Santri baru · kelas ${r.f.kelas || kelas} · ${L.asramaAman(r.f.asrama || asr).nama}`}</small></div>
            <${Pill} t=${{ perbarui: "Perbarui", baru: "Baru", sama: "Sama" }[r.st]} tone=${{ perbarui: "green", baru: "blue", sama: "muted" }[r.st]} /></div>
          ${r.st === "perbarui" ? html`<div class="imp-beda">${r.beda.map(k => html`<span><i>${lab[k]}</i> ${k === "asrama" ? L.asramaAman(r.f[k]).nama : k === "lahir" ? L.fmtTgl(r.f[k]) : r.f[k]}</span>`)}</div>` : null}
          ${r.st === "baru" ? html`<div class="imp-beda">${BIO.filter(([k]) => r.f[k]).map(([k, l]) => html`<span><i>${l}</i> ${k === "lahir" ? L.fmtTgl(r.f[k]) : r.f[k]}</span>`)}</div>` : null}
          ${r.catatan ? html`<small class="imp-cat">${r.catatan}</small>` : null}</div>`; })}</div>
      <div class="sticky-act"><div class="btn-row"><${Btn} kind="ghost" onClick=${() => setRows(null)}>Ulangi</${Btn}><${Btn} icon="check" disabled=${!ikut.length || sb} onClick=${simpan}>${sb ? "Menyimpan…" : `Simpan ${ikut.length} santri`}</${Btn}></div></div>`}</div>`;
}

// ================= IMPOR NILAI MAPEL (mengisi tabel nilai; disimpan lewat tombol Simpan nilai) =================
const angka = v => { if (v === null || v === undefined || v === "") return null; let n = parseFloat(String(v).replace(",", ".")); if (isNaN(n)) return null; return Math.max(0, Math.min(100, Math.round(n))); };
function nilaiLokal(tabel, m) {
  const hi = barisJudul(tabel); if (hi < 0) throw new Error("Tidak menemukan kolom Nama. Tanpa AI, dokumen perlu tabel dengan judul kolom.");
  const H = tabel[hi].map(x => String(x).toLowerCase()), cN = H.findIndex(h => /nama/.test(h));
  const cP = H.map((h, i) => (/projek|project|proyek|tugas/.test(h) ? i : -1)).filter(i => i >= 0), cT = H.findIndex(h => /pts|uts|tengah/.test(h)), cA = H.findIndex(h => /pas|uas|akhir semester/.test(h));
  const cAs = m.aspek.map((a, i) => H.findIndex(h => h === "a" + (i + 1) || h.includes(a.toLowerCase().split(/[ (/]/)[0])));
  return { projek_nama: cP.map(i => tabel[hi][i]), baris: tabel.slice(hi + 1).filter(r => String(r[cN] || "").trim().length > 2).map(r => ({ nama: String(r[cN]).trim(), santri_id: null,
    projek: cP.map(i => r[i]), pts: cT >= 0 ? r[cT] : null, pas: cA >= 0 ? r[cA] : null, aspek: cAs.map(i => (i >= 0 ? r[i] : null)) })) };
}
export function ImporNilai({ mapel, kelas, onHasil, onClose }) {
  const m = L.mapelById(mapel), list = L.santriKelas(kelas);
  const [busy, setBusy] = useState(false); const [langkah, setLangkah] = useState("");
  const baca = async inp => {
    setBusy(true);
    try {
      const d = await siapkanDokumen(inp, setLangkah); let j;
      if (aiAda()) {
        setLangkah(`${aiNama()} sedang membaca nilai…`);
        j = await tanyaAI({ sistem: SISTEM_DASAR, json: true, berkas: d.berkas, teks: `Tugas: baca dokumen nilai mapel ${m.nama} kelas ${kelas} dan ubah ke JSON.
Santri kelas ini (id|nama):
${list.map(s => `${s.id}|${s.nama}`).join("\n")}
Komponen yang dicari: nilai projek (bisa lebih dari satu projek/tugas, beri nama sesuai dokumen), PTS (UTS/tengah semester), PAS (UAS/akhir semester), dan aspek rapor: ${m.aspek.map((a, i) => `A${i + 1}=${a}`).join(", ")}.
Aturan: santri_id dari daftar (ejaan boleh beda), null bila tidak ada. Nilai skala 0–100; bila dokumen memakai skala 0–10, kalikan 10. Kolom yang tidak ada diisi null. Jangan mengarang nilai.
Jawab hanya JSON: {"projek_nama":["Projek 1"],"baris":[{"nama":"","santri_id":null,"projek":[null],"pts":null,"pas":null,"aspek":[${m.aspek.map(() => "null").join(",")}]}]}` + isiDok(d) });
      } else j = nilaiLokal(d.tabel || [], m);
      const rows = (j.baris || []).filter(r => r && r.nama); if (!rows.length) throw new Error("Tidak ada nilai yang terbaca dari dokumen ini.");
      let cocok = 0, lewat = [];
      const hasil = { projekNama: (j.projek_nama || []).map((x, i) => String(x || `Projek ${i + 1}`).trim()), projek: {}, pts: {}, pas: {}, aspek: {} };
      rows.forEach(r => {
        let s = r.santri_id && list.find(x => x.id === r.santri_id); if (!s) { const c = cocokkan(r.nama, list); if (c.sc >= 0.6) s = c.best; }
        if (!s) { lewat.push(r.nama); return; } cocok++;
        (r.projek || []).forEach((v, i) => { const n = angka(v); if (n != null) { hasil.projek[i] = hasil.projek[i] || {}; hasil.projek[i][s.id] = n; } });
        const t = angka(r.pts), a = angka(r.pas); if (t != null) hasil.pts[s.id] = t; if (a != null) hasil.pas[s.id] = a;
        (r.aspek || []).forEach((v, i) => { const n = angka(v); if (n != null && i < m.aspek.length) { hasil.aspek[s.id] = hasil.aspek[s.id] || {}; hasil.aspek[s.id][i] = n; } });
      });
      onHasil(hasil, { cocok, lewat, dok: d.nama });
    } catch (e) { toast(e.message || "Gagal membaca dokumen", "err"); }
    finally { setBusy(false); setLangkah(""); }
  };
  return html`<${Sheet} open=${true} title="Isi nilai dari dokumen" onClose=${onClose}>
    <p class="small" style="margin:0 0 4px">Unggah daftar nilai ${m.nama} kelas ${kelas} (Excel, foto daftar nilai, PDF, Word). Nilai masuk ke tabel dulu; periksa lalu tekan <b>Simpan nilai</b>.</p>
    <${PilihDokumen} onBaca=${baca} busy=${busy} langkah=${langkah} contoh=${"Nama | Projek Poster | PTS | PAS\nAdiyatma | 85 | 78 | 80"} /></${Sheet}>`;
}

// ================= IMPOR JADWAL MENGAJAR =================
function jadwalLokal(tabel) {
  const hi = tabel.slice(0, 10).findIndex(r => r.some(c => /hari/i.test(String(c)))); if (hi < 0) throw new Error("Tanpa AI, dokumen perlu tabel dengan kolom Hari, Jam, Kelas, Mapel, Guru.");
  const H = tabel[hi].map(x => String(x).toLowerCase()), c = k => H.findIndex(h => k.test(h));
  const ch = c(/hari/), cj = c(/jam|waktu/), ck = c(/kelas/), cm = c(/mapel|pelajaran/), cg = c(/guru|pengajar|ustadz/);
  return tabel.slice(hi + 1).map(r => ({ hari: r[ch], jam: r[cj], kelas: r[ck], mapel: r[cm], guru: cg >= 0 ? r[cg] : "" })).filter(r => r.hari && r.kelas && r.mapel);
}
const keHari = v => { const t = String(v || "").toLowerCase().slice(0, 3); return DATA.hari.find(h => h.toLowerCase().startsWith(t)) || ""; };
const keJam = v => { const t = String(v || "").toLowerCase().replace(/\s/g, ""); if (DATA.jam.some(j => j.id === t)) return t; if (/^(jam)?1|10[.:]15|^1$/.test(t)) return "j1"; if (/^(jam)?2|13[.:]00|^2$/.test(t)) return "j2"; return ""; };
const keMapel = v => { const t = String(v || "").toLowerCase(); return (DATA.mapel.find(m => m.id === t || m.nama.toLowerCase() === t) || DATA.mapel.find(m => t.includes(m.id) || t.includes(m.nama.toLowerCase().split(" ").pop()) || (m.id === "bing" && /inggris|english/.test(t)) || (m.id === "it" && /informatika|tik|komputer/.test(t))) || {}).id || ""; };
const keGuru = v => { const t = String(v || "").trim(); if (!t) return ""; const g = L.STAFF.filter(s => s.roles.includes("guru_mapel")); const x = g.find(s => s.id === t); if (x) return x.id; const c = cocokkan(t.replace(/^(ust(adz|dzah|zah)?|ustdzh)\.?\s*/i, ""), g.map(s => ({ ...s, nama: s.nama.replace(/^Ust(dzh)?\.\s*/, "").replace(/,.*$/, "") }))); return c.sc >= 0.5 ? c.best.id : ""; };
export function ImporJadwal() {
  useApp();
  const [busy, setBusy] = useState(false); const [langkah, setLangkah] = useState(""); const [rows, setRows] = useState(null); const [dok, setDok] = useState(""); const [kosongkan, setKos] = useState(false); const [sb, setSB] = useState(false);
  const guruList = L.STAFF.filter(s => s.roles.includes("guru_mapel"));
  const baca = async inp => {
    setBusy(true);
    try {
      const d = await siapkanDokumen(inp, setLangkah); setDok(d.nama); let l;
      if (aiAda()) {
        setLangkah(`${aiNama()} sedang membaca jadwal…`);
        const j = await tanyaAI({ sistem: SISTEM_DASAR, json: true, berkas: d.berkas, teks: `Tugas: baca jadwal pelajaran (mapel) pondok di bawah dan ubah ke JSON, satu objek per sel jadwal.
Hari KBM: ${DATA.hari.join(", ")}. Jam: ${DATA.jam.map(j => `${j.id}=${j.nama} ${j.mulai}-${j.selesai}`).join(", ")}. Kelas: ${L.KELAS.map(k => k.id).join(", ")}.
Mapel (id|nama): ${DATA.mapel.map(m => `${m.id}|${m.nama}`).join(", ")}.
Guru (id|nama): ${guruList.map(s => `${s.id}|${s.nama}`).join(", ")}.
Aturan: hari persis dari daftar; jam berupa id (j1/j2) sesuai urutan/jamnya; kelas & mapel berupa id dari daftar; guru berupa id atau null bila tidak tertulis. Abaikan kegiatan selain mapel di daftar (misal halaqah, istirahat) dan sebutkan di catatan.
Jawab hanya JSON: {"jadwal":[{"hari":"Senin","jam":"j1","kelas":"7","mapel":"fiqih","guru":null}],"catatan":""}` + isiDok(d) });
        l = j.jadwal || []; if (j.catatan) toast(String(j.catatan).slice(0, 140));
      } else l = jadwalLokal(d.tabel || []);
      const rs = l.map((r, i) => { const hari = keHari(r.hari), jam = keJam(r.jam), kelas = keKelas(r.kelas), mapel = keMapel(r.mapel);
        let guru = keGuru(r.guru); if (!guru && mapel && kelas) guru = (L.pengampu(mapel, kelas) || {}).id || "";
        return { k: i, hari, jam, kelas, mapel, guru, ok: !!(hari && jam && kelas && mapel && guru), asal: [r.hari, r.jam, r.kelas, r.mapel, r.guru].filter(Boolean).join(" · ") }; });
      if (!rs.length) throw new Error("Tidak ada jadwal yang terbaca."); setRows(rs);
    } catch (e) { toast(e.message || "Gagal membaca dokumen", "err"); }
    finally { setBusy(false); setLangkah(""); }
  };
  const valid = rows ? rows.filter(r => r.ok) : [];
  const simpan = async () => {
    setSB(true); const lama = L.jadwalAll(), kunci = new Set(valid.map(r => `${r.hari}|${r.jam}|${r.kelas}`)); let n = 0;
    for (const r of valid) { const ex = lama.find(j => j.hari === r.hari && j.jam === r.jam && j.kelas === r.kelas), id = ex ? ex.id : `${r.hari.slice(0, 3).toLowerCase()}-${r.jam}-${r.kelas}`;
      if (await put("jadwal", id, { hari: r.hari, jam: r.jam, kelas: r.kelas, mapel: r.mapel, guru: r.guru })) n++; }
    if (kosongkan) for (const j of lama.filter(j => !kunci.has(`${j.hari}|${j.jam}|${j.kelas}`))) await put("jadwal", j.id, { hari: j.hari, jam: j.jam, kelas: j.kelas, mapel: j.mapel, guru: j.guru, hapus: true });
    logUbah("ubah", "jadwal", "impor", `Impor jadwal mengajar dari ${dok}: ${n} sel`); setSB(false); toast(`${n} jadwal disimpan`); nav.back();
  };
  const bentrok = r => { const lain = valid.filter(x => x !== r && x.hari === r.hari && x.jam === r.jam && x.guru === r.guru); return lain.length; };
  return html`<${SubHeader} title="Impor Jadwal" sub="Jadwal mengajar dari dokumen" />
    <div class="wrap">${!rows ? html`<${Hint}>Unggah jadwal pelajaran (Excel, Word, PDF, atau foto jadwal di papan). Jam 1 = 10.15–11.45, Jam 2 = 13.00–14.30, Senin–Jumat.</${Hint}>
      <${PilihDokumen} onBaca=${baca} busy=${busy} langkah=${langkah} contoh=${"Hari | Jam | Kelas | Mapel | Guru\nSenin | 1 | 7 | Fiqih | Ust. Syamsul"} />`
    : html`<${Card}><div class="stats"><${Stat} label="Siap disimpan" value=${valid.length} /><${Stat} label="Perlu dilengkapi" value=${rows.length - valid.length} tone="gold" /></div>
      <label class="small" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" checked=${kosongkan} onChange=${e => setKos(e.target.checked)} style="width:20px;height:20px;accent-color:#0B5D3B" />Kosongkan sel jadwal lama yang tidak ada di dokumen</label></${Card}>
      ${DATA.hari.map(h => { const l = rows.filter(r => r.hari === h); return l.length ? html`<h4 class="imp-h">${h}</h4><div class="imp-list">${l.map(r => html`<div class=${"imp-row " + (r.ok ? (bentrok(r) ? "ganda" : "cocok") : "cek")}>
        <div class="imp-top"><div class="imp-t"><b>${r.jam ? L.jamById(r.jam).nama : "Jam ?"} · Kelas ${r.kelas || "?"}</b><small>${r.mapel ? L.mapelById(r.mapel).nama : "Mapel belum dikenali"} · ${r.guru ? L.staffAman(r.guru).pendek : "guru belum dikenali"}${bentrok(r) ? " · bentrok guru" : ""}</small></div>
        <${Pill} t=${r.ok ? "Siap" : "Lengkapi"} tone=${r.ok ? "green" : "gold"} /></div>
        ${!r.ok ? html`<div class="btn-row mt8"><select class="in" value=${r.mapel} onChange=${e => setRows(rows.map(x => x === r ? { ...x, mapel: e.target.value, ok: !!(x.hari && x.jam && x.kelas && e.target.value && x.guru) } : x))}><option value="">Mapel</option>${DATA.mapel.map(m => html`<option value=${m.id}>${m.nama}</option>`)}</select>
          <select class="in" value=${r.guru} onChange=${e => setRows(rows.map(x => x === r ? { ...x, guru: e.target.value, ok: !!(x.hari && x.jam && x.kelas && x.mapel && e.target.value) } : x))}><option value="">Guru</option>${guruList.map(s => html`<option value=${s.id}>${s.pendek}</option>`)}</select></div><small class="imp-cat" style="margin-left:0">Dokumen: ${r.asal}</small>` : null}</div>`)}</div>` : null; })}
      ${rows.some(r => !r.hari) ? html`<p class="small">${rows.filter(r => !r.hari).length} baris tanpa hari yang dikenali dilewati.</p>` : null}
      <div class="sticky-act"><div class="btn-row"><${Btn} kind="ghost" onClick=${() => setRows(null)}>Ulangi</${Btn}><${Btn} icon="check" disabled=${!valid.length || sb} onClick=${simpan}>${sb ? "Menyimpan…" : `Simpan ${valid.length} jadwal`}</${Btn}></div></div>`}</div>`;
}
