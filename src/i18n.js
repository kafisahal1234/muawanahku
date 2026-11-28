// Tema (terang/gelap) & bahasa (Indonesia/English/العربية) — disimpan di HP ini
import { KAMUS as K1, HARI, BULAN } from "./kamus.js";
import { KAMUS2 } from "./kamus2.js";
const KAMUS = { ...KAMUS2, ...K1 };
const LS = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
const akar = () => document.documentElement;

// ---------- tema ----------
let mqGelap = null;
export const temaSaatIni = () => LS("mk_tema", "terang");
export function terapkanTema(t = temaSaatIni()) {
  try {
    if (!mqGelap) { mqGelap = matchMedia("(prefers-color-scheme: dark)"); if (mqGelap.addEventListener) mqGelap.addEventListener("change", () => { if (temaSaatIni() === "sistem") terapkanTema(); }); }
    const gelap = t === "gelap" || (t === "sistem" && mqGelap.matches);
    akar().dataset.tema = gelap ? "gelap" : "terang";
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", gelap ? "#07402A" : "#0B6B43");
  } catch (e) { }
}
export function setTema(t) { try { localStorage.setItem("mk_tema", t); } catch (e) { } terapkanTema(t); }

// ---------- bahasa ----------
export const BAHASA = [["id", "Bahasa Indonesia"], ["en", "English"], ["ar", "العربية"]];
export const bahasa = () => LS("mk_bahasa", "id");
const IX = { en: 0, ar: 1 };
const REX_BLN = /^(, ?)(\d{1,2}) (Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Agt|Sep|Okt|Nov|Des)( \d{4})?$/;
const REX_TGL = /^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Ahad)(, ?)(\d{1,2}) (Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Agt|Sep|Okt|Nov|Des)( \d{4})?$/;
// Satuan setelah angka ("12 santri" → "12 students")
const SATUAN = { santri: ["students", "طلاب"], juz: ["juz", "جزء"], "hal.": ["pp.", "ص"], halaman: ["pages", "صفحات"], baris: ["lines", "أسطر"], poin: ["points", "نقاط"],
  kali: ["times", "مرات"], kasus: ["cases", "حالات"], orang: ["people", "أشخاص"], hari: ["days", "أيام"], sesi: ["sessions", "جلسات"], pekan: ["weeks", "أسابيع"], bulan: ["months", "أشهر"],
  menit: ["minutes", "دقائق"], detik: ["seconds", "ثوانٍ"], jilid: ["volumes", "مجلدات"], asrama: ["dorms", "سكنات"], halaqah: ["halaqah", "حلقات"], guru: ["teachers", "معلمون"],
  ustadz: ["ustadz", "أساتذة"], mapel: ["subjects", "مواد"], kelas: ["classes", "فصول"], projek: ["projects", "مشاريع"], setoran: ["deposits", "تسميع"], jam: ["hours", "ساعات"],
  "santri halaqah": ["halaqah students", "طلاب الحلقة"], "santri asrama": ["dorm students", "طلاب السكن"], "kelas diajar": ["classes taught", "فصول يدرّسها"], "juz baru": ["new juz", "أجزاء جديدة"],
  "santri tercapai": ["students reached", "طلاب بلغوا"], "ustadz & pengurus": ["ustadz & staff", "أساتذة وإداريون"], "ustadz & pengurus pondok": ["ustadz & pondok staff", "أساتذة وإداريو المعهد"],
  "santri ditemukan": ["students found", "طلاب"], "santri belum setor ziyadah": ["students haven't deposited ziyadah", "طلاب لم يسمّعوا الزيادة"],
  "santri siap tasmi'": ["students ready for tasmi'", "طلاب جاهزون للتسميع"], "santri izin": ["students on permission", "طلاب مستأذنون"], "santri sedang izin": ["students on permission", "طلاب مستأذنون"],
  "santri memiliki poin": ["students with points", "طلاب لديهم نقاط"], "santri menunggu ujian kenaikan jilid": ["students waiting for the volume exam", "طلاب ينتظرون اختبار المستوى"],
  "hari setor": ["deposit days", "أيام تسميع"], "wali asrama": ["dorm supervisors", "مشرفو السكن"], "santri capai target": ["students reached target", "طلاب بلغوا الهدف"],
  "pertemuan": ["meetings", "لقاءات"], "pertemuan ada materinya": ["meetings have material", "لقاءات فيها مادة"], "pertemuan sudah diabsen": ["meetings checked", "لقاءات مسجلة"],
  "santri tercapai": ["students reached", "طلاب بلغوا"], "hari aktif": ["active days", "أيام فعلية"], "hari KBM": ["lesson days", "أيام الدروس"], "hari halaqah": ["halaqah days", "أيام الحلقة"] };
const BLN_PANJANG = { Januari: 0, Februari: 1, Maret: 2, April: 3, Mei: 4, Juni: 5, Juli: 6, Agustus: 7, September: 8, Oktober: 9, November: 10, Desember: 11 };
const BLN_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const BLN_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
// Pola dengan bagian yang berubah: [regex, Inggris, Arab]; $1.. diisi dari teks asli (diterjemahkan lagi bila bisa)
const POLA = [
  [/^Kelas (\w+)$/, "Class $1", "الصف $1"], [/^Kls (\w+)$/, "Gr $1", "ص $1"], [/^Pondok (\d+)$/, "Pondok $1", "المعهد $1"], [/^Juz (\d+)$/, "Juz $1", "الجزء $1"],
  [/^Iqro' (\d)$/, "Iqro' $1", "إقرأ $1"], [/^Hal\. (\d+)$/, "Page $1", "صفحة $1"], [/^Halaman (\d+)$/, "Page $1", "صفحة $1"], [/^Jilid (\d)$/, "Volume $1", "المجلد $1"],
  [/^dari (\d+) santri$/, "of $1 students", "من $1 طلاب"], [/^dari (\d+) juz$/, "of $1 juz", "من $1 جزءًا"], [/^dari (\d+)$/, "of $1", "من $1"],
  [/^Peringkat kelas (\w+)$/, "Class $1 ranking", "ترتيب الصف $1"], [/^Mudir Pondok (\d+)$/, "Mudir of Pondok $1", "مدير المعهد $1"],
  [/^Wadir Kesantrian Pondok (\d+)$/, "Student Affairs Vice Mudir, Pondok $1", "وكيل شؤون الطلاب، المعهد $1"], [/^Kesantrian · Pondok (\d+)$/, "Student Affairs · Pondok $1", "شؤون الطلاب · المعهد $1"],
  [/^Wali Asrama ([^·]+?)$/, "Dorm Supervisor, $1", "مشرف سكن $1"], [/^Mengajar ([^·]+?)$/, "Teaching $1", "يدرّس $1"], [/^Guru (Fiqih|IT|Bahasa Inggris|B\. Inggris|Pendidikan Karakter|Karakter)$/, "$1 Teacher", "معلم $1"],
  [/^Dipanggil ([^·]+?)$/, "Called $1", "يُنادى $1"], [/^Panggilan ([^·]+?)$/, "Nickname $1", "اللقب $1"], [/^Tingkat (ringan|sedang|berat)$/i, "$1 level", "مستوى $1"],
  [/^Sedang menghafal Juz (\d+)$/, "Memorizing Juz $1", "يحفظ الجزء $1"], [/^Kelas (\w+) & (\w+)$/, "Grades $1 & $2", "الصفان $1 و$2"],
  [/^Semua santri$/, "All students", "جميع الطلاب"], [/^Periode ([^·]+?)\.?$/, "Period $1", "الفترة $1"], [/^Pemantauan Mudir · Pondok (\d+)$/, "Mudir monitoring · Pondok $1", "متابعة المدير · المعهد $1"],
  [/^(Hadir|Alpa|Izin|Sakit|Terlambat|Masbuq) untuk ([^·]+?)$/, "$1 for $2", "$1 لـ $2"], [/^Hafal: ([^·]+?)$/, "Memorized: $1", "المحفوظ: $1"], [/^hal\. (\d+)$/, "p. $1", "ص $1"],
  [/^baris (\d+)$/, "line $1", "سطر $1"], [/^nilai (\d+)$/, "score $1", "الدرجة $1"], [/^Juz (\d+) hal\. ([\d–-]+)$/, "Juz $1 pp. $2", "الجزء $1 ص $2"], [/^Juz (\d+): (\d+) santri$/, "Juz $1: $2 students", "الجزء $1: $2 طلاب"],
  [/^total ([\d,]+) juz( \d+ hal\.)?$/, "total $1 juz$2", "المجموع $1 جزءًا$2"], [/^([\d,]+) dari (\d+) juz$/, "$1 of $2 juz", "$1 من $2 جزءًا"], [/^(\d+) dari (\d+) (santri tercapai|pertemuan ada materinya|pertemuan sudah diabsen|hari)$/, "$1 of $2 $3", "$1 من $2 $3"],
  [/^(\d+)\/(\d+) santri capai target$/, "$1/$2 students reached target", "$1/$2 طلاب بلغوا الهدف"], [/^(\d+) di bawah (\d+%)$/, "$1 below $2", "$1 دون $2"],
  [/^(\d+) guru tahfidz belum absen (Shubuh|Dhuha|Malam)$/, "$1 tahfidz teachers haven't checked in for $2", "$1 معلمي تحفيظ لم يسجلوا حضور $2"], [/^Absen guru terisi (\d+%) sesi$/, "Teacher attendance filled in $1 of sessions", "حضور المعلم في $1 من الجلسات"],
  [/^Absen kelas ([^·]+?)$/, "Class attendance: $1", "حضور الفصل: $1"], [/^Kelas ([\w]+(?:, [\w]+)+)$/, "Grades $1", "الصفوف $1"], [/^Asrama ([^·]+?)$/, "$1 Dorm", "سكن $1"],
  [/^Rekap Asrama ([^·]+?)$/, "$1 Dorm report", "تقرير سكن $1"], [/^Rekap Halaqah ([^·]+?)$/, "Halaqah $1 report", "تقرير حلقة $1"], [/^Kesantrian Pondok (\d+)$/, "Student Affairs Pondok $1", "شؤون الطلاب المعهد $1"],
  [/^Target (\d+) (juz|hal) per santri$/, "Target $1 $2 per student", "الهدف $1 $2 لكل طالب"], [/^Pekan ([^·]+?)$/, "Week $1", "الأسبوع $1"], [/^Tahun pelajaran ([^·]+?)$/, "School year $1", "العام الدراسي $1"],
  [/^Tidak ada jadwal ([^·]+?) hari Sabtu\.$/, "No $1 lessons on Saturday.", "لا دروس $1 يوم السبت"], [/^(\d+) santri dari (\d+) asrama$/, "$1 students from $2 dorms", "$1 طلاب من $2 سكنات"],
  [/^diisi (\d+) dari (\d+) hari$/, "filled $1 of $2 days", "مُعبأ $1 من $2 أيام"], [/^Nilai rata-rata (\d+)$/, "Average score $1", "متوسط الدرجة $1"],
  [/^Diisi menyusul (\d+)×$/, "Filled late $1×", "تعبئة متأخرة $1×"], [/^(\d+) hari tidak dinilai$/, "$1 days not assessed", "$1 أيام غير مُقيَّمة"],
  [/^Mapel ([^·]+?)$/, "$1 Subject", "مادة $1"], [/^Rapor ([^·]+?)$/, "Report card $1", "شهادة $1"], [/^Halaqah Ust\. ([^·]+?)$/, "Halaqah Ust. $1", "حلقة أ. $1"], [/^Ringkasan Pondok (\d+)$/, "Pondok $1 summary", "ملخص المعهد $1"],
];
const ARTI_TINGKAT = { ringan: ["Minor", "خفيفة"], sedang: ["Moderate", "متوسطة"], berat: ["Heavy", "ثقيلة"] };
function dasar(k, i) {
  const v = KAMUS[k]; if (v) return v[i] || null;
  const m = REX_TGL.exec(k); if (m) return i === 1 ? `${HARI[m[1]][i]}، ${m[3]} ${BULAN[m[4]][i]}${m[5] || ""}` : `${HARI[m[1]][i]}${m[2]}${m[3]} ${BULAN[m[4]][i]}${m[5] || ""}`;
  const b = REX_BLN.exec(k); if (b) return `${i === 1 ? "، " : b[1]}${b[2]} ${BULAN[b[3]][i]}${b[4] || ""}`;
  const jm = /^(\d{1,2}) (Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Agt|Sep|Okt|Nov|Des)( \d{4})?( \d{2}[.:]\d{2})?$/.exec(k);
  if (jm) return `${jm[1]} ${BULAN[jm[2]][i]}${jm[3] || ""}${jm[4] || ""}`;
  const bp = /^(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember) (\d{4})$/.exec(k);
  if (bp) return `${(i === 1 ? BLN_AR : BLN_EN)[BLN_PANJANG[bp[1]]]} ${bp[2]}`;
  const tg = /^(\d{1,2}) (Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember) (\d{4})$/.exec(k);
  if (tg) return `${tg[1]} ${(i === 1 ? BLN_AR : BLN_EN)[BLN_PANJANG[tg[2]]]} ${tg[3]}`;
  for (const [re, en, ar] of POLA) {
    const p = re.exec(k); if (!p) continue;
    const t = i === 1 ? ar : en;
    return t.replace(/\$(\d)/g, (_, n) => { const x = p[+n] || ""; const tk = ARTI_TINGKAT[x.toLowerCase()]; if (tk) return tk[i]; const d = x.length > 2 && (KAMUS[x] || SATUAN[x]); return d && d[i] ? d[i] : x; });
  }
  // angka + satuan / angka + frasa
  const a = /^([#+−-]?[\d.,]+%?|\d+[–-]\d+) (.+)$/.exec(k);
  if (a) { const s = SATUAN[a[2]]; if (s) return `${a[1]} ${s[i]}`; const r = KAMUS[a[2]]; if (r && r[i]) return `${a[1]} ${r[i]}`; }
  // kata + angka ("Izin 0", "Nilai rata-rata 88")
  const z = /^(.+?) ([\d.,]+%?)$/.exec(k); if (z) { const r = KAMUS[z[1]]; if (r && r[i]) return `${r[i]} ${z[2]}`; }
  // jumlah dalam kurung di ujung ("Guru & Pengurus (17)", "Pondok 21 (6 halaqah)")
  const kr = /^([^·]+?) \((\d+(?: [a-z]+)?)\)$/.exec(k);
  if (kr) { const x = dasar(kr[1], i) ?? pecah(kr[1], i); if (x != null) return `${x} (${dasar(kr[2], i) ?? kr[2]})`; }
  // huruf awal kecil/besar ("hari ini" ↔ "Hari ini")
  const alt = k[0] === k[0].toLowerCase() ? k[0].toUpperCase() + k.slice(1) : null;
  if (alt && KAMUS[alt] && KAMUS[alt][i]) { const v2 = KAMUS[alt][i]; return i === 0 ? v2[0].toLowerCase() + v2.slice(1) : v2; }
  return null;
}
export function terjemah(teks, i) {
  const k = teks.trim(); if (!k || k.length > 220 || !/[A-Za-z]/.test(k)) return null;
  const iso = x => (i === 1 ? "⁨" + x + "⁩" : x); // teks Arab diisolasi agar urutan kalimat tetap kiri-ke-kanan
  let t = dasar(k, i);
  if (t == null) {
    // tanda baca di ujung: "Kode akses:" / "(…)"
    const u = /^(.*?)([:.…]|\s·)$/.exec(k); if (u && u[1]) { const x = dasar(u[1].trim(), i); if (x != null) t = x + u[2]; }
  }
  if (t == null) t = pecah(k, i);
  if (t == null) return null;
  return teks.replace(k, iso(t));
}
// kalimat bersambung "A · B · C" atau "A — B": terjemahkan per bagian (bagian yang tak dikenal, mis. nama, dibiarkan)
function pecah(k, i) {
  const kk = k.replace(/^· /, ""), depan = kk !== k ? "· " : "";
  if (depan) { const d = dasar(kk, i); if (d != null) return depan + d; }
  for (const sep of [" · ", " — ", " → "]) {
    if (!kk.includes(sep)) continue;
    let ada = false; const bag = kk.split(sep).map(x => { const y = x.trim(); const z = dasar(y, i) ?? terjemahBagian(y, i); if (z != null) { ada = true; return z; } return y; });
    if (ada) return depan + bag.join(sep);
  }
  return null;
}
function terjemahBagian(y, i) { const u = /^(.*?)([:.])$/.exec(y); return u && u[1] ? (dasar(u[1], i) != null ? dasar(u[1], i) + u[2] : null) : null; }
const ATR = ["placeholder", "aria-label", "title"];
const lewati = el => !el || el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "TEXTAREA" || el.isContentEditable || (el.closest && el.closest("[data-asli]"));
function teksNode(x, i) { if (lewati(x.parentNode)) return; const t = terjemah(x.data, i); if (t != null && t !== x.data) x.data = t; }
function atrNode(el, i) { ATR.forEach(a => { const v = el.getAttribute(a); if (v) { const t = terjemah(v, i); if (t != null && t !== v) el.setAttribute(a, t); } }); }
function prosesNode(n, i) {
  if (n.nodeType === 3) return teksNode(n, i);
  if (n.nodeType !== 1 || lewati(n)) return;
  atrNode(n, i);
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let x;
  while ((x = w.nextNode())) x.nodeType === 3 ? teksNode(x, i) : atrNode(x, i);
}
export function terapkanBahasa() {
  const b = bahasa(); try { akar().lang = b; akar().dir = "ltr"; /* tata letak tidak dibalik untuk bahasa Arab */ } catch (e) { }
  if (b === "id" || typeof MutationObserver === "undefined") return;
  const i = IX[b];
  const mulai = () => {
    prosesNode(document.body, i);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === "childList") m.addedNodes.forEach(n => prosesNode(n, i)); else prosesNode(m.target, i); } })
      .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATR });
  };
  document.body ? mulai() : addEventListener("DOMContentLoaded", mulai);
}
export function setBahasa(b) { try { localStorage.setItem("mk_bahasa", b); } catch (e) { } location.reload(); }
