// ================= KAMUS BIODATA SANTRI =================
// Satu sumber untuk semua kolom biodata: label, sinonim judul kolom/label di dokumen, dan jenis isian.
// Kolom yang tidak dikenali tetap disimpan di `tambahan` ({ "Ukuran baju": "M", ... }) sehingga tidak ada data yang hilang.
// urutan = urutan tampil. Pola dicocokkan oleh kenaliLabel() dengan urutan prioritasnya sendiri (nomor HP dulu, baru nama orang tua).
export const BIODATA = [
  ["panggilan", "Nama panggilan"], ["nis", "NIS"], ["nisn", "NISN"], ["jk", "Jenis kelamin"], ["tempatLahir", "Tempat lahir"], ["lahir", "Tanggal lahir"],
  ["anakKe", "Anak ke-"], ["asalSekolah", "Asal sekolah"], ["ayah", "Nama ayah"], ["pekerjaanAyah", "Pekerjaan ayah"], ["hpAyah", "No. HP ayah"],
  ["ibu", "Nama ibu"], ["pekerjaanIbu", "Pekerjaan ibu"], ["hpIbu", "No. HP ibu"], ["namaWali", "Nama wali"], ["hpWali", "No. WA wali (utama)"],
  ["alamat", "Alamat"], ["hobi", "Hobi"], ["cita", "Cita-cita"],
];
const POLA = [
  ["nisn", /\bnisn\b|induk siswa nasional/],
  ["nis", /^nis\b|\bnis$|no\.? ?induk|nomor induk|^induk/],
  ["jk", /kelamin|^jk$|^l ?\/ ?p$|gender/],
  ["anakKe", /anak ke/],
  ["asalSekolah", /asal sekolah|sekolah asal|^asal$|lulusan|sekolah sebelum/],
  ["tempatLahir", /^tempat( lahir)?$|^tmp\.? ?lahir|kota lahir/],
  ["lahir", /^(tgl|tanggal)\.? ?lahir|^lahir$|^(tgl|tanggal)$|dob|birth|tanggal kelahiran/],
  ["alamat", /alamat|domisili|tempat tinggal|address/],
  ["hobi", /hobi|hobby|kegemaran|kesukaan/],
  ["cita", /cita/],
];
export const LABEL_BIO = Object.fromEntries(BIODATA.map(([k, l]) => [k, l]));
export const KUNCI_BIO = BIODATA.map(([k]) => k);

const bersih = s => String(s == null ? "" : s).replace(/[*_]/g, "").replace(/\s+/g, " ").trim();
const normLabel = s => bersih(s).toLowerCase().replace(/[:.]+$/, "").replace(/^\d+[.)]\s*/, "").replace(/\s*\(.*?\)\s*/g, " ").trim();

// judul kolom / label → kunci biodata. Hasil: kunci, "nama", "kelas", "asrama", "ttl" (tempat, tanggal lahir), "no" (nomor urut), atau null (kolom tambahan)
export function kenaliLabel(label) {
  const t = normLabel(label); if (!t) return "no";
  if (/^(no|no\. ?urut|no urut|nomor|nomor urut|#)$/.test(t)) return "no";
  if (/^(ttl|t\.?t\.?l|tempat,? ?(\/|dan|&)? ?(tanggal|tgl)\.? lahir|tempat ?\/ ?(tanggal|tgl)\.? ?lahir)$/.test(t)) return "ttl";
  if (/panggil|sapaan|nickname/.test(t)) return "panggilan";
  const ortu = /ayah|bapak|\babi\b/.test(t) ? "Ayah" : /\bibu\b|bunda|\bumi\b|\bmama\b/.test(t) && !/wali/.test(t) ? "Ibu" : "";
  if (/\b(hp|wa|whatsapp|telp|telpon|telepon|kontak|ponsel|handphone|no\.? ?tlp)\b/.test(t)) return ortu ? "hp" + ortu : "hpWali";
  if (/pekerjaan|profesi|\bkerja\b/.test(t)) return ortu ? "pekerjaan" + ortu : null;
  for (const [k, re] of POLA) if (re.test(t)) return k;
  if (/^nama( lengkap)?( santri| siswa| peserta( didik)?| anak)?$|^nama lengkap|^santri$/.test(t)) return "nama";
  if (/^(kelas|kls|rombel)\b/.test(t)) return "kelas";
  if (/asrama|kamar/.test(t)) return /wali|musyrif/.test(t) ? null : "asrama";
  if (ortu) return ortu === "Ayah" ? "ayah" : "ibu";
  if (/^(nama )?wali( santri| murid)?$|^nama (orang tua|ortu)( ?\/ ?wali)?$|orang tua ?\/ ?wali$/.test(t)) return "namaWali";
  return null;
}
export const labelRapi = s => { const t = bersih(s).replace(/[:.]+$/, ""); return t ? t[0].toUpperCase() + t.slice(1) : ""; };
export const keJK = v => { const t = String(v || "").toLowerCase().trim(); return /^(l|lk|laki|putra|pria|ikhwan)/.test(t) ? "Laki-laki" : /^(p|pr|perempuan|putri|wanita|akhwat)/.test(t) ? "Perempuan" : bersih(v); };
export const keHP = v => String(v || "").replace(/[^\d+]/g, "").replace(/^\+/, "");
export const isiKosong = v => /^(\?|-|–|—|\.\.\.|…|tidak ada|belum ada|n\/?a)?$/i.test(bersih(v));
export { bersih };

// ---------- tanggal & nilai ----------
const BULAN = { jan: 1, feb: 2, peb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, nop: 11, des: 12, dec: 12 };
export function keTanggal(v) {
  const t = String(v || "").trim().toLowerCase().replace(/\s*,\s*/g, " ").replace(/\s+/g, " "); if (!t) return "";
  let m = t.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); if (m) return ok(+m[1], +m[2], +m[3]);
  m = t.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/); if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return +m[2] > 12 && +m[1] <= 12 ? ok(y, +m[1], +m[2]) : ok(y, +m[2], +m[1]); } // hari/bulan/tahun; bila "bulan" > 12 berarti format bulan/hari
  m = t.match(/(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})/); if (m && BULAN[m[2].slice(0, 3)]) return ok(+m[3], BULAN[m[2].slice(0, 3)], +m[1]);
  m = t.match(/^(\d{1,2})(\d{2})(\d{2})$/); if (m) return ok(2000 + +m[3], +m[2], +m[1]); // DDMMYY
  return "";
  function ok(y, mo, d) { if (y < 1990 || y > 2030 || mo < 1 || mo > 12 || d < 1 || d > 31) return ""; return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
}
function pecahTTL(v) {
  const t = bersih(v); if (!t) return {};
  const lahir = keTanggal(t);
  const tempat = t.includes(",") ? t.split(",")[0].trim() : t.replace(/\d.*$/, "").replace(/\b(lahir|pada|tgl|tanggal)\b/gi, "").trim();
  return { tempatLahir: /\d/.test(tempat) ? "" : tempat, lahir };
}
const keNomor = v => { let n = keHP(v); if (/^8\d{8,12}$/.test(n)) n = "0" + n; return n; };

// satu baris mentah (label → nilai) menjadi data santri yang rapi
export function rapikanBaris(pasang) {
  const r = { nama: "", kelas: "", asrama: "", tambahan: {} };
  for (const [label, nilai0] of pasang) {
    const nilai = isiKosong(nilai0) ? "" : bersih(nilai0); if (!nilai) continue;
    const k = kenaliLabel(label);
    if (k === "no") continue;
    if (k === "nama") { r.nama = nilai.replace(/^\d+[.)]\s*/, ""); continue; }
    if (k === "ttl") { const x = pecahTTL(nilai); if (x.tempatLahir && !r.tempatLahir) r.tempatLahir = x.tempatLahir; if (x.lahir) r.lahir = x.lahir; continue; }
    if (k === "lahir") { const d = keTanggal(nilai); if (d) r.lahir = d; else { const x = pecahTTL(nilai); if (x.lahir) { r.lahir = x.lahir; if (x.tempatLahir && !r.tempatLahir) r.tempatLahir = x.tempatLahir; } else r.tambahan[labelRapi(label)] = nilai; } continue; }
    if (k === "jk") { r.jk = keJK(nilai); continue; }
    if (k && k.startsWith("hp")) { r[k] = keNomor(nilai); continue; }
    if (k) { r[k] = nilai; continue; }
    r.tambahan[labelRapi(label)] = nilai;
  }
  if (!r.hpWali) r.hpWali = r.hpIbu || r.hpAyah || "";
  return r;
}

// tabel dengan baris judul (Excel/CSV/Word/tempel dari spreadsheet)
function dariTabel(tabel) {
  const dikenal = row => row.filter(c => String(c).trim() && kenaliLabel(c) && kenaliLabel(c) !== "no").length;
  const hi = tabel.slice(0, 12).findIndex(row => row.some(c => kenaliLabel(c) === "nama") && (dikenal(row) >= 2 || row.filter(c => String(c).trim()).length >= 3));
  if (hi < 0) return null;
  const H = tabel[hi].map(h => bersih(h));
  const baris = tabel.slice(hi + 1).filter(row => row.some(c => String(c).trim())).map(row => rapikanBaris(H.map((h, i) => [h, row[i]]).filter(([h]) => h)));
  return { baris: baris.filter(x => x.nama.length > 2), peta: H.filter(Boolean).map(h => ({ label: h, ke: kenaliLabel(h) })).filter(x => x.ke !== "no") };
}

// teks berlabel: "Nama: …", "Hobi: …", format pesan WA (*1. Nama*), formulir satu santri, atau beberapa label dalam satu baris
function dariTeks(teks) {
  const out = [], semuaLabel = new Map(); let cur = null, rekam = false;
  const baru = nama => { cur = { pasang: nama ? [["Nama", nama]] : [] }; out.push(cur); };
  for (let baris of String(teks || "").split(/\r?\n/)) {
    baris = baris.replace(/^\s*[•\-–*>]+\s*/, "").replace(/\t+/g, ": ").trim(); if (!baris) continue;
    if (/^\*?\s*(keterangan|catatan|note)\s*\*?\s*:?\s*$/i.test(baris)) { cur = null; rekam = false; continue; } // bagian keterangan di akhir pesan
    const judul = baris.match(/^\*?\s*(\d{1,3})\s*[.)]\s*([^:]+?)\s*\*?$/);
    if (judul && !/:/.test(baris)) { baru(judul[2].replace(/[*_]/g, "").trim()); rekam = true; continue; }
    // pecah "Nama: A, Panggilan: B | Hobi: C" menjadi beberapa pasangan
    const bagian = baris.split(/\s*[;|]\s*|,\s*(?=[A-Za-z][A-Za-z .\/()'-]{1,32}\s*:)/);
    for (const b of bagian) {
      const m = b.match(/^\*?\s*([^:]{2,40}?)\s*\*?\s*[:=]\s*(.*)$/); if (!m) continue;
      const label = m[1].replace(/^\d+[.)]\s*/, ""), k = kenaliLabel(label);
      if (k === "nama") { if (!cur || cur.pasang.some(([l]) => kenaliLabel(l) === "nama")) baru(""); rekam = true; }
      if (!cur || !rekam) continue;
      cur.pasang.push([label, m[2]]); if (k !== "no") semuaLabel.set(labelRapi(label), k);
    }
  }
  const baris = out.map(x => rapikanBaris(x.pasang)).filter(x => x.nama.length > 2);
  if (!baris.length) return null;
  return { baris, peta: [["Nama", "nama"], ...semuaLabel].filter(([, k], i, a) => k !== "nama" || i === 0).map(([label, ke]) => ({ label, ke })) };
}

// Pembaca utama tanpa AI. Mengembalikan null bila dokumen tidak berlabel (perlu AI).
export function bacaDataSantri({ tabel, teks }) {
  const t = tabel && tabel.length ? dariTabel(tabel) : null; if (t && t.baris.length) return t;
  // tabel dua kolom "Label | Isi" (formulir satu santri di Word/Excel) → jadikan teks berlabel
  if (tabel && tabel.length && tabel.filter(r => r.length >= 2 && String(r[0]).trim()).length >= 2) {
    const tx = dariTeks(tabel.map(r => `${r[0]}: ${r.slice(1).filter(c => String(c).trim()).join(" ")}`).join("\n")); if (tx) return tx;
  }
  return teks ? dariTeks(teks) : null;
}
// gabungkan biodata bawaan + tambahan untuk ditampilkan
export function daftarBiodata(s, kecuali = []) {
  const a = BIODATA.filter(([k]) => !kecuali.includes(k) && s[k]).map(([k, l]) => [l, k === "lahir" ? s[k] : s[k], k]);
  const b = Object.entries(s.tambahan || {}).filter(([, v]) => v).map(([l, v]) => [l, v, "t:" + l]);
  return [...a, ...b];
}
