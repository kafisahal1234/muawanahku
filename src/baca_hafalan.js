// Pembaca format pesan WA "Pendataan Hafalan / Iqro' Santri" (tanpa AI, cepat & pasti).
// Mengembalikan baris per santri: { nama, halaqah, asrama, iqra, awal, tahsin, catatan[] }
//   awal   (santri Al-Qur'an): { selesai[], aktif, baris, awalSemHal, totalLapor }  — posisi SEKARANG + hafalan awal semester (halaman)
//   tahsin (santri Iqro')     : { jilid, hal, awalSem:{jilid,hal}, lulus[] }
const URUT = [30, 29, ...Array.from({ length: 28 }, (_, i) => i + 1)];
const KUNCI = [
  ["awalSem", /^hafalan\s*awal\s*semester/],
  ["total", /^total\s*hafalan/],
  ["juz", /^juz\s*yang\s*sudah/],
  ["sekarang", /^hafalan\s*sekarang/],
  ["iqAwal", /^iqro'?\s*awal/],
  ["iqNow", /^iqro'?\s*sekarang/],
  ["iqLulus", /^jilid\s*yang\s*sudah\s*lulus/],
];
const bersih = t => String(t || "").replace(/[*_~]/g, "").replace(/\s+/g, " ").trim();
const kosong = v => !v || /^(\?|-|–|…|\.\.\.|belum|tidak tahu)$/i.test(v.trim()) || /^(jilid|juz)\s*…/i.test(v.trim());

// "9 Juz 13 Halaman", "7 Juz", "7", "1 juz (30)", "8 Juz 10 Halaman", "Juz 30" → jumlah halaman
export function keHalaman(v) {
  const t = bersih(v).toLowerCase(); if (kosong(t)) return null;
  let m = t.match(/(\d+(?:[.,]\d+)?)\s*juz(?:\s*(\d+)\s*(?:hal|halaman|hlm))?/);
  if (m) return Math.round(parseFloat(m[1].replace(",", ".")) * 20 + (m[2] ? +m[2] : 0));
  m = t.match(/^juz\s*(\d+)$/); if (m) return 20; // "Juz 30" sebagai awal = hafal 1 juz (ditandai untuk dicek)
  m = t.match(/^(\d+(?:[.,]\d+)?)$/); if (m) return Math.round(parseFloat(m[1].replace(",", ".")) * 20); // angka saja = juz
  m = t.match(/(\d+)\s*(?:hal|halaman|hlm)/); if (m) return +m[1];
  return null;
}
export function daftarJuz(v) {
  const out = []; String(v || "").replace(/(\d{1,2})\s*(?:-|–|s\.?d\.?|sampai)\s*(\d{1,2})|(\d{1,2})/gi, (m, a, b, c) => {
    if (a) { a = +a; b = +b; for (let j = Math.min(a, b); j <= Math.max(a, b); j++) out.push(j); } else out.push(+c); return m; });
  return URUT.filter(j => out.includes(j));
}
// "Juz 8 Halaman 14", "Juz 7 Hal 19", "Juz 1 halaman 18 baris 15", "Juz 30 surat Al lail"
export function kePosisi(v) {
  const t = bersih(v).toLowerCase(); if (kosong(t)) return null;
  const j = t.match(/juz\s*(\d{1,2})/), h = t.match(/(?:hal|halaman|hlm)\.?\s*(\d{1,2})/), b = t.match(/baris\s*(\d{1,2})/), s = t.match(/sur(?:at|ah)\s+([a-z' -]+)/);
  return { juz: j ? +j[1] : null, hal: h ? +h[1] : null, baris: b ? +b[1] : null, surah: s ? s[1].trim() : null };
}
// "jilid 3 halaman 32", "3 jilid 3 halaman 3" (angka di depan diabaikan, dipakai angka setelah kata jilid)
export function keIqro(v) {
  const t = bersih(v).toLowerCase(); if (kosong(t)) return null;
  const j = t.match(/jilid\s*(\d)/) || t.match(/^(\d)\b/), h = t.match(/(?:hal|halaman|hlm)\.?\s*(\d{1,2})/);
  return j ? { jilid: Math.min(6, +j[1]), hal: h ? Math.min(32, +h[1]) : 0 } : null;
}
export const cocokFormat = teks => /hafalan\s*awal\s*semester|iqro'?\s*sekarang|hafalan\s*sekarang/i.test(teks || "");

export function bacaFormatHafalan(teks) {
  const hasil = []; let hq = "", asr = "", cur = null;
  const tutup = () => { if (cur) { hasil.push(olah(cur)); cur = null; } };
  for (const raw of String(teks || "").split(/\r?\n/)) {
    const ln = bersih(raw); if (!ln) continue;
    let m;
    if ((m = ln.match(/^halaqah\s+(.+?)(?:\s+[—–-]\s+.*)?$/i))) { tutup(); hq = m[1].trim(); continue; }
    if ((m = ln.match(/^asrama\s*:\s*(.+)$/i))) { asr = m[1].trim(); continue; }
    if ((m = ln.match(/^(\d{1,3})\s*[.)]\s*(.+)$/)) && !/:/.test(m[2])) {
      tutup(); const nm = m[2].replace(/\s*\(([^)]*)\)\s*$/, (x, a) => { cur_asr = a; return ""; }).trim();
      cur = { nama: nm, halaqah: hq, asrama: cur_asr || asr, f: {} }; cur_asr = ""; continue;
    }
    if (cur && (m = ln.match(/^([^:]{3,40}):\s*(.*)$/))) {
      const k = m[1].toLowerCase().replace(/\s+/g, " ").trim(), kk = KUNCI.find(([, re]) => re.test(k));
      if (kk) cur.f[kk[0]] = m[2].trim();
      continue;
    }
    if (/^keterangan/i.test(ln)) tutup();
  }
  tutup();
  return hasil.filter(r => r.nama && (r.awal || r.tahsin));
}
let cur_asr = "";

function olah(c) {
  const f = c.f, cat = [], r = { nama: c.nama, halaqah: c.halaqah, asrama: c.asrama, iqra: false, awal: null, tahsin: null, catatan: cat };
  // ---------- santri Iqro' ----------
  if (f.iqAwal != null || f.iqNow != null || f.iqLulus != null) {
    const now = keIqro(f.iqNow), aw = keIqro(f.iqAwal), lulus = [...new Set((String(f.iqLulus || "").match(/\d/g) || []).map(Number).filter(n => n >= 1 && n <= 6))].sort();
    if (!now) { cat.push("Posisi Iqro' sekarang belum diisi"); return r; }
    if (aw && (aw.jilid > now.jilid || (aw.jilid === now.jilid && aw.hal > now.hal))) cat.push("Posisi awal semester lebih jauh dari posisi sekarang");
    if (lulus.some(j => j >= now.jilid)) cat.push(`Jilid lulus (${lulus.join(", ")}) tidak sesuai dengan jilid sekarang ${now.jilid}`);
    r.iqra = true; r.tahsin = { tingkat: "iqra", jilid: now.jilid, hal: now.hal, awalSem: aw, lulus };
    return r;
  }
  // ---------- santri Al-Qur'an ----------
  let sel = daftarJuz(f.juz), pos = kePosisi(f.sekarang), awalSemHal = keHalaman(f.awalSem), totalLapor = keHalaman(f.total);
  if (f.awalSem && /^\s*juz\s*\d+\s*$/i.test(f.awalSem)) cat.push(`Awal semester "${bersih(f.awalSem)}" dibaca 1 juz`);
  if (f.awalSem && /^\s*\d+(?:[.,]\d+)?\s*$/.test(f.awalSem)) cat.push(`Awal semester "${bersih(f.awalSem)}" dibaca ${bersih(f.awalSem)} juz`);
  if (!sel.length && totalLapor != null) sel = URUT.slice(0, Math.floor(totalLapor / 20)); // hanya total yang diisi
  let aktif = pos && pos.juz, baris = 0;
  if (pos) baris = (pos.hal != null ? pos.hal * 15 : 0) + (pos.baris != null && pos.hal != null ? 0 : pos.baris || 0);
  if (pos && pos.baris != null && pos.hal != null) baris = (pos.hal - 1) * 15 + pos.baris; // "halaman 18 baris 15" = 17 halaman penuh + 15 baris
  if (pos && pos.surah && pos.hal == null) cat.push(`Posisi ditulis nama surah ("${pos.surah}"), halaman perlu dicek`);
  if (aktif && sel.includes(aktif)) { cat.push(`Hafalan sekarang menyebut juz ${aktif} yang sudah selesai; dianggap mulai juz berikutnya`); aktif = null; baris = 0; }
  if (!aktif) aktif = URUT.find(j => !sel.includes(j)) || 30;
  const posHal = sel.length * 20 + baris / 15;
  if (totalLapor != null && Math.abs(totalLapor - posHal) > 3) cat.push(`Total tertulis ${fmt(totalLapor)}, sedangkan juz & posisi menunjukkan ${fmt(posHal)}`);
  if (awalSemHal != null && awalSemHal > posHal + 1) cat.push("Hafalan awal semester lebih banyak dari hafalan sekarang");
  if (!f.sekarang && !f.juz && !f.total) { cat.push("Data hafalan belum diisi"); return r; }
  r.awal = { selesai: sel, aktif, baris: Math.round(baris), awalSemHal: awalSemHal == null ? null : awalSemHal, totalLapor };
  return r;
}
export const fmt = hal => { const j = Math.floor(hal / 20), h = Math.round(hal - j * 20); return (j ? `${j} juz` : "") + (h ? `${j ? " " : ""}${h} hal` : j ? "" : "0 hal"); };
