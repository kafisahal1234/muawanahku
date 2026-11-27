// Surat resmi Kesantrian yang dibuat otomatis oleh sistem: izin keluar/pulang, BAP, pemberitahuan pelanggaran,
// surat peringatan (SP-1..3), skorsing, dan pengembalian santri. Kop & ornamen mengikuti surat edaran pondok.
import { all, get } from "./store.js";
import * as L from "./logic.js";
import { SURAT_HEAD, SURAT_FOOT } from "./surat_assets.js";

const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ROM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const toD = x => (x instanceof Date ? x : typeof x === "number" ? new Date(x) : /^\d{4}-\d{2}-\d{2}$/.test(x) ? L.parseYmd(x) : new Date(x));
export const tglPanjang = (x, hari = true) => { const d = toD(x); return (hari ? HARI[d.getDay()] + ", " : "") + d.getDate() + " " + BLN[d.getMonth()] + " " + d.getFullYear(); };
const jam = x => { const d = toD(x); return "pukul " + L.pad(d.getHours()) + "." + L.pad(d.getMinutes()) + " WIB"; };
const waktu = x => tglPanjang(x) + " · " + jam(x);
const KOTA = "Metro";

// ---------------- tindakan (sanksi) ----------------
export const TINDAKAN = [
  { id: "teguran", nama: "Teguran & pembinaan", surat: null },
  { id: "edukatif", nama: "Hukuman edukatif", surat: null },
  { id: "sp1", nama: "Surat Peringatan 1 (SP-1)", pendek: "SP-1", surat: "sp", ke: 1 },
  { id: "sp2", nama: "Surat Peringatan 2 (SP-2)", pendek: "SP-2", surat: "sp", ke: 2 },
  { id: "sp3", nama: "Surat Peringatan 3 (SP-3)", pendek: "SP-3", surat: "sp", ke: 3 },
  { id: "skorsing", nama: "Skorsing", surat: "skorsing" },
  { id: "kembali", nama: "Dikembalikan kepada orang tua", surat: "kembali" },
];
export const tindakanById = id => TINDAKAN.find(t => t.id === id) || TINDAKAN[0];
export const namaTindakan = t => (!t ? "—" : t.jenis === "skorsing" ? `Skorsing ${t.hari} hari` : tindakanById(t.jenis).nama);
// Ambang poin bawaan (bisa disesuaikan pondok)
export const AMBANG = [[100, "kembali"], [75, "sp3"], [50, "sp2"], [25, "sp1"]];
export function saranTindakan(sid, pel) {
  if (!pel) return null;
  const now = L.poinSantri(sid).total, tot = now + pel.poin;
  const spAda = all("bap").filter(b => b.santri === sid && b.tindakan && /^sp\d$/.test(b.tindakan.jenis)).map(b => +b.tindakan.jenis[2]);
  const maxSp = spAda.length ? Math.max(...spAda) : 0;
  let jenis = (AMBANG.find(([n]) => tot >= n) || [0, pel.tingkat === "Sedang" ? "edukatif" : "teguran"])[1], alasan = `total poin jadi ${tot}`;
  if (jenis !== "kembali" && pel.tingkat === "Berat") { jenis = "skorsing"; alasan = `pelanggaran berat, total poin jadi ${tot}`; }
  else if (/^sp\d$/.test(jenis) && +jenis[2] <= maxSp) { jenis = maxSp >= 3 ? "kembali" : "sp" + (maxSp + 1); alasan = `sudah pernah SP-${maxSp}, total poin jadi ${tot}`; }
  else if (!/^sp|kembali/.test(jenis) && maxSp && pel.tingkat !== "Ringan") { jenis = maxSp >= 3 ? "kembali" : "sp" + (maxSp + 1); alasan = `mengulang setelah SP-${maxSp}`; }
  return { jenis, hari: jenis === "skorsing" ? 7 : 0, alasan, total: tot };
}

// ---------------- nomor surat otomatis ----------------
const bulanDari = r => (r.tanggal ? r.tanggal.slice(0, 7) : L.ymd(new Date(r.ts)).slice(0, 7));
function urut(col, id, cocok = () => true) {
  const r = get(col, id); if (!r) return 1;
  const b = bulanDari(r), l = all(col).filter(x => cocok(x) && bulanDari(x) === b).sort((x, y) => (x.ts || 0) - (y.ts || 0));
  return Math.max(1, l.findIndex(x => x.id === id) + 1);
}
const nomor = (n, kode, r) => { const d = toD(r.tanggal || r.ts); return `${String(n).padStart(3, "0")}/${kode}/KS-KQM/${ROM[d.getMonth()]}/${d.getFullYear()}`; };
const KODE_IZIN = { Keluar: "IZK", Perpulangan: "IZP", Skorsing: "SKR" };
export const nomorIzin = i => nomor(urut("izin", i.id, x => (x.jenis || "") === (i.jenis || "")), KODE_IZIN[i.jenis] || "IZ", i);
export const nomorBap = (b, kode = "BAP") => nomor(urut("bap", b.id), kode, b);

// ---------------- kerangka halaman ----------------
const CSS = `@page{size:A4;margin:0}*{box-sizing:border-box}
body{margin:0;background:#E7EAEE;font-family:Montserrat,Arial,sans-serif;color:#33343F;font-size:10pt;line-height:1.42;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:210mm;height:297mm;position:relative;overflow:hidden;background:#fff;margin:0 auto 8mm;box-shadow:0 2mm 8mm rgba(0,0,0,.12)}
.hd{position:absolute;left:4.48mm;top:.14mm;width:201.7mm}.ft{position:absolute;left:-4.55mm;top:254.1mm;width:214.5mm}
.bd{position:absolute;left:20mm;right:20mm;top:39mm}
.tag{text-align:center;font-size:7.6pt;font-weight:700;letter-spacing:.22em;color:#3D6178}
h1{text-align:center;font-size:15.5pt;font-weight:800;margin:.5mm 0 0;letter-spacing:.03em}
.bar{width:26mm;height:1.3mm;border-radius:1mm;background:#E5A848;margin:1.4mm auto 1.2mm}
.no{text-align:center;font-size:8.8pt;font-weight:600;color:#3D6178;margin-bottom:3.2mm}
p{margin:0 0 2.4mm;text-align:justify}.salam{font-style:italic;margin-bottom:1.6mm}
.meta{display:grid;grid-template-columns:22mm 4mm 1fr;margin-bottom:3mm;font-size:9.8pt}.meta b{font-weight:700}
.kpd{margin-bottom:3mm}.kpd b{display:block}
.form{border:.35mm solid #D3DAE2;border-radius:3mm;overflow:hidden;margin-bottom:3mm}
.fh{background:#33343F;color:#fff;font-size:7pt;font-weight:800;letter-spacing:.2em;text-transform:uppercase;padding:.8mm 4mm}
.rw{display:flex;align-items:baseline;padding:.8mm 4mm;border-bottom:.25mm dashed #DCE2E8;font-size:9.8pt}.rw:last-child{border-bottom:0}
.rw .l{width:36mm;flex:none;color:#3D6178;font-weight:600}.rw .c{width:4mm;flex:none;color:#3D6178;font-weight:700}.rw .v{flex:1;font-weight:500}
.rw.hl{background:#FCEFD6;box-shadow:inset 1.2mm 0 0 #E5A848}.rw.hl .l{color:#9A6510;font-weight:700}.rw.rd{background:#FBE7E4;box-shadow:inset 1.2mm 0 0 #C4402F}.rw.rd .l{color:#A3301F;font-weight:700}
.kt{font-weight:800;font-size:10.3pt;margin:0 0 1.2mm}
.ket{list-style:none;margin:0 0 2.4mm;padding:0}.ket li{display:flex;gap:2.4mm;margin-bottom:.55mm}
.ket li>span{flex:none;width:4.6mm;height:4.6mm;border-radius:50%;background:#33343F;color:#fff;font-size:7.4pt;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:.3mm}
.note{display:flex;gap:3mm;align-items:flex-start;background:#33343F;color:#fff;border-radius:2.6mm;padding:2mm 3.5mm;font-size:9.3pt;margin-bottom:2mm}
.note b{color:#FFD58A}.note .i{flex:none;width:6mm;height:6mm;border-radius:50%;background:#E5A848;color:#33343F;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:11pt}
.stmt{border-left:1mm solid #E5A848;background:#FCF6EA;padding:1.8mm 3.5mm;font-size:9.3pt;margin-bottom:2mm;border-radius:0 2mm 2mm 0}
.box{border:.35mm solid #D3DAE2;border-radius:3mm;padding:2.2mm 4mm;margin-bottom:3mm}.box .bt{font-size:7pt;font-weight:800;letter-spacing:.2em;color:#3D6178;text-transform:uppercase;margin-bottom:.8mm}
.box.sm{font-size:9pt}.kr{display:flex;gap:4mm}.kr .box{flex:1}.kr .ph{width:52mm;flex:none;border-radius:3mm;overflow:hidden;border:.35mm solid #D3DAE2;margin-bottom:3mm;position:relative}
.kr .ph img{width:100%;height:100%;object-fit:cover;display:block;max-height:58mm}.kr .ph span{position:absolute;left:0;top:0;background:#33343F;color:#fff;font-size:6.6pt;font-weight:800;letter-spacing:.14em;padding:.6mm 2mm;border-bottom-right-radius:2mm}
.tnd{background:#FCEFD6;border:.35mm solid #EBC98B;border-radius:3mm;padding:2mm 4mm;margin-bottom:3mm}.tnd .bt{font-size:7pt;font-weight:800;letter-spacing:.2em;color:#9A6510}.tnd b{font-size:11pt}
.tgl{text-align:right;font-weight:600;margin:1.4mm 0 1mm}
.ttd{display:grid;gap:5mm;text-align:center;font-size:9.3pt}.ttd .r{height:9.8mm}.ttd .sp{height:15mm;display:flex;align-items:center;justify-content:center}.ttd .sp img{max-height:15mm;max-width:40mm}
.ttd .n{font-weight:700;white-space:nowrap}.ttd .j{font-size:7.6pt;color:#3D6178}
.cut{margin:2.6mm 0 1.4mm;border-top:.35mm dashed #8C96A3;font-size:7.4pt;color:#6E7887;padding-top:.6mm;text-align:center}
.slip{display:flex;border:.35mm solid #C9D1DA;border-radius:2.6mm;overflow:hidden;font-size:8.8pt}
.st{background:#3D6178;color:#fff;font-weight:800;font-size:8.2pt;padding:1.8mm 3mm;width:33mm;display:flex;flex-direction:column;justify-content:center;line-height:1.25}
.st small{font-weight:500;font-size:6.6pt;opacity:.85;margin-top:1mm}
.sg{flex:1;padding:1.8mm 3mm;white-space:nowrap;display:flex;flex-direction:column;gap:1.2mm;justify-content:center}.sg i{font-style:normal;color:#3D6178;font-weight:700;margin-right:1.5mm}.sg .gap{margin-left:5mm}
.ck{display:flex;align-items:center;gap:1.4mm}.bx{display:inline-block;width:3mm;height:3mm;border:.35mm solid #33343F;border-radius:.6mm;margin-left:1mm}
.par{width:26mm;border-left:.35mm dashed #C9D1DA;padding:2mm;font-size:7.4pt;color:#3D6178;font-weight:700;text-align:center}
.auto{position:absolute;right:20mm;bottom:1.6mm;font-size:6pt;color:#98A1AC}
@media print{body{background:#fff}.pg{margin:0;box-shadow:none;page-break-after:always}.pg:last-child{page-break-after:auto}}`;
export function suratDoc(judul, pages) {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(judul)}</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet"><style>${CSS}</style></head>
<body>${pages.map(b => `<section class="pg"><img class="hd" src="${SURAT_HEAD}" alt=""><img class="ft" src="${SURAT_FOOT}" alt=""><div class="bd">${b}</div><div class="auto">Dibuat otomatis oleh sistem MuawanahQu</div></section>`).join("")}
<script>(function(){function fit(){document.querySelectorAll(".pg").forEach(function(p){var b=p.querySelector(".bd"),max=p.getBoundingClientRect().top+251*96/25.4,z=1;
b.style.transform="";b.style.left=b.style.right="20mm";while(b.getBoundingClientRect().bottom>max&&z>0.74){z-=0.02;b.style.transformOrigin="top center";b.style.transform="scale("+z+")";b.style.left=b.style.right=(20-85*(1/z-1))+"mm";}});}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);addEventListener("load",fit);fit();})();</script></body></html>`;
}
const row = (l, v, cls = "") => `<div class="rw ${cls}"><span class="l">${l}</span><span class="c">:</span><span class="v">${v}</span></div>`;
const grp = t => `<div class="fh">${t}</div>`;
const ket = items => `<ol class="ket">${items.map((t, i) => `<li><span>${i + 1}</span><div>${t}</div></li>`).join("")}</ol>`;
const judul = (tag, t, no) => `<div class="tag">${tag}</div><h1>${t}</h1><div class="bar"></div><div class="no">Nomor: ${no}</div>`;
const ttd = cols => `<div class="ttd" style="grid-template-columns:repeat(${cols.length},1fr)">${cols.map(c => `<div><div class="r">${c.r}</div><div class="sp">${c.img ? `<img src="${c.img}" alt="">` : ""}</div><div class="n">${c.n ? `( ${esc(String(c.n).replace(/\s*\([^)]*\)\s*$/, ""))} )` : "( ................................ )"}</div>${c.j ? `<div class="j">${c.j}</div>` : ""}</div>`).join("")}</div>`;
const TELAT = siapa => `<div class="note"><div class="i">!</div><div><b>Terlambat datang?</b> Wajib <b>langsung lapor ke Kesantrian</b> sebelum masuk asrama, didampingi ${siapa}. Terlambat tanpa kabar dicatat sebagai pelanggaran.</div></div>`;
const slip = (jenis, nama) => `<div class="cut">✂ potong di sini · diserahkan ke Kesantrian saat santri tiba</div>
<div class="slip"><div class="st">BUKTI LAPOR KEMBALI<small>${jenis}</small></div><div class="sg"><div><i>Nama</i><b>${esc(nama)}</b><i class="gap">Tiba</i>Tgl ......... Jam ....... WIB</div>
<div class="ck"><span class="bx"></span>Tepat waktu<span class="bx"></span>Terlambat ...... menit<i class="gap">Alasan</i>................................</div></div><div class="par">Paraf Kesantrian</div></div>`;

// ---------------- data bantu ----------------
const mudir = p => (p && L.mudirUntuk(p)) || L.mudirStaff();
const nm = id => (L.staffById(id) || {}).nama || "";
const dataSantri = s => { s = s || { nama: "", kelas: "" }; const a = L.asramaAman(s.asrama); return { s, a, pondok: L.pondokOfSantri(s), musyrif: nm(a.musyrif) }; };
const yth = s => (s.ayah ? `Bapak ${esc(s.ayah)}${s.ibu ? " / Ibu " + esc(s.ibu) : ""}` : "Bapak/Ibu Wali Santri");
const tindakanBap = b => b.tindakan || { jenis: "teguran" };
const kembaliSkorsing = b => { const t = tindakanBap(b), d = L.parseYmd(t.mulai || b.tanggal); d.setDate(d.getDate() + (+t.hari || 0)); d.setHours(16, 0, 0, 0); return d; };
export const selesaiSkorsing = kembaliSkorsing;

// ---------------- SURAT IZIN ----------------
export function suratIzin(i) {
  const { s, a, pondok } = dataSantri(L.santriAman(i.santri)), no = nomorIzin(i), wadir = nm(i.oleh);
  if (i.jenis === "Skorsing" && i.bap && get("bap", i.bap)) return suratSkorsing(get("bap", i.bap));
  const keluar = i.jenis === "Keluar";
  const body = judul(`KESANTRIAN · PONDOK ${pondok}`, keluar ? "SURAT IZIN KELUAR PONDOK" : "SURAT IZIN PULANG SANTRI", no)
    + `<p>Yang bertanda tangan di bawah ini, Wakil Mudir Bidang Kesantrian Kampung Qur'an Al Muawanah, memberikan izin ${keluar ? "keluar pondok" : "pulang"} kepada santri berikut:</p>
<div class="form">${grp("Data santri")}${row("Nama santri", `<b>${esc(s.nama)}</b>`)}${row("Kelas / asrama", `${esc(s.kelas)} · ${esc(a.nama)}`)}
${grp("Rincian izin")}${row(keluar ? "Keperluan" : "Alasan", esc(i.alasan))}${row(keluar ? "Pendamping" : "Penjemput", esc(i.penjemput || "—"))}
${row(keluar ? "Keluar" : "Pulang", waktu(i.keluar))}${row("Batas kembali", `<b>${waktu(i.kembali)}</b>`, "hl")}</div>
<div class="kt">Ketentuan</div>${ket(keluar
      ? ["Kembali ke pondok paling lambat pada batas waktu yang tertulis.", "Melapor kepada wali asrama saat berangkat.", "Berpakaian rapi, menjaga adab, dan tidak mampir ke tempat lain di luar keperluan.", "Tidak membawa masuk HP atau barang yang dilarang pondok."]
      : ["Santri kembali ke pondok paling lambat pada batas waktu yang tertulis, diantar wali.", "Bila sakit atau ada halangan, wali mengabari wali asrama sebelum batas kembali.", "Santri menjaga sholat berjamaah dan murojaah minimal 1 halaman setiap hari di rumah."])}
${TELAT(keluar ? "pendamping" : "wali yang mengantar")}${keluar ? "" : `<div class="stmt"><b>Pernyataan wali:</b> saya bertanggung jawab atas ananda selama izin dan mengantarnya kembali tepat waktu.</div>`}
<div class="tgl">${KOTA}, ${tglPanjang(i.ts || Date.now(), false)}</div>
${ttd(keluar ? [{ r: "Santri", n: s.nama }, { r: "Pendamping", n: i.penjemput }, { r: "Wadir Kesantrian,<br>pemberi izin", n: wadir, img: L.ttdOf(i.oleh) }]
      : [{ r: "Wali santri / penjemput", n: i.penjemput }, { r: "Mengetahui,<br>Wali Asrama", n: nm(a.musyrif), img: L.ttdOf(a.musyrif) }, { r: "Wadir Kesantrian,<br>pemberi izin", n: wadir, img: L.ttdOf(i.oleh) }])}
${slip(`${keluar ? "Izin Keluar" : "Izin Pulang"} · ${no}`, s.nama)}`;
  return { judul: `${keluar ? "Surat Izin Keluar" : "Surat Izin Pulang"} ${s.nama}`, html: suratDoc(`Surat Izin ${s.nama}`, [body]) };
}

// ---------------- BERITA ACARA PELANGGARAN ----------------
export function suratBap(b) {
  const { s, a, pondok, musyrif } = dataSantri(L.santriAman(b.santri)), t = tindakanBap(b), no = nomorBap(b);
  const totalSaatItu = all("bap").filter(x => x.santri === b.santri && (x.ts || 0) <= (b.ts || 0)).reduce((n, x) => n + (x.poin || 0), 0) + L.motdCatatan(b.santri).filter(c => c.tanggal <= b.tanggal).reduce((n, c) => n + c.poin, 0);
  const kronCls = (b.kronologi || "").length > 520 ? "box sm" : "box";
  const body = judul(`KESANTRIAN · PONDOK ${pondok}`, "BERITA ACARA PELANGGARAN", no)
    + `<p>Pada hari ini ${tglPanjang(b.tanggal)}, bertempat di ${esc(b.tempat || "lingkungan pondok")}, telah dibuat berita acara atas pelanggaran tata tertib pondok oleh santri berikut:</p>
<div class="form">${grp("Data santri")}${row("Nama santri", `<b>${esc(s.nama)}</b>`)}${row("Kelas / asrama", `${esc(s.kelas)} · ${esc(a.nama)}`)}${row("Wali asrama", esc(musyrif))}
${grp("Pelanggaran")}${row("Jenis pelanggaran", `<b>${esc(b.pelanggaranNama)}</b>`)}${row("Tingkat · poin", `${esc(b.tingkat)} · ${b.poin} poin`, "rd")}${row("Total poin santri", `${totalSaatItu} poin`)}${row("Saksi", esc(b.saksi || "—"))}</div>
<div class="kr"><div class="${kronCls}"><div class="bt">Kronologi kejadian</div>${esc(b.kronologi)}</div>${b.foto ? `<div class="ph"><img src="${b.foto}" alt=""><span>BUKTI</span></div>` : ""}</div>
<div class="tnd"><div class="bt">TINDAKAN</div><b>${esc(namaTindakan(t))}</b>${t.jenis === "skorsing" ? ` · ${tglPanjang(t.mulai || b.tanggal, false)} s.d. ${tglPanjang(new Date(kembaliSkorsing(b).getTime() - 864e5), false)}` : ""}${b.sanksi ? `<div>${esc(b.sanksi)}</div>` : ""}</div>
<div class="stmt"><b>Pernyataan santri:</b> saya mengakui pelanggaran di atas dan berjanji tidak akan mengulanginya.</div>
<div class="tgl">${KOTA}, ${tglPanjang(b.tanggal, false)}</div>
${ttd([{ r: "Santri pelanggar", n: s.nama, img: b.ttdSantri }, { r: "Saksi", n: b.saksi ? b.saksi.replace(/\s*\(.*\)\s*$/, "") : "" }, { r: "Wadir Kesantrian,<br>pembuat berita acara", n: nm(b.oleh), img: b.ttdPetugas || L.ttdOf(b.oleh) }])}`;
  return { judul: `BAP ${s.nama}`, html: suratDoc(`Berita Acara Pelanggaran ${s.nama}`, [body]) };
}

// ---------------- PEMBERITAHUAN PELANGGARAN (ke wali) ----------------
export function suratPemberitahuan(b) {
  const { s, a, pondok } = dataSantri(L.santriAman(b.santri)), t = tindakanBap(b), no = nomorBap(b, "PP"), md = mudir(pondok);
  const riwayat = all("bap").filter(x => x.santri === b.santri && (x.ts || 0) <= (b.ts || 0));
  const total = riwayat.reduce((n, x) => n + (x.poin || 0), 0) + L.motdCatatan(b.santri).filter(c => c.tanggal <= b.tanggal).reduce((n, c) => n + c.poin, 0);
  const body = `<div class="tag" style="text-align:left">KESANTRIAN · PONDOK ${pondok}</div><div style="height:2mm"></div>
<div class="meta"><span>Nomor</span><span>:</span><span>${no}</span><span>Perihal</span><span>:</span><b>Pemberitahuan Pelanggaran Santri</b><span>Lampiran</span><span>:</span><span>-</span></div>
<div class="kpd">Kepada Yth.<b>${yth(s)}</b>Wali santri dari ananda ${esc(s.nama)}<br>di Tempat</div>
<p class="salam">Assalamu'alaikum warahmatullahi wabarakatuh</p>
<p>Segala puji bagi Allah Ta'ala. Bersama surat ini kami memberitahukan bahwa ananda telah melakukan pelanggaran tata tertib pondok dengan rincian sebagai berikut:</p>
<div class="form">${row("Nama santri", `<b>${esc(s.nama)}</b>`)}${row("Kelas / asrama", `${esc(s.kelas)} · ${esc(a.nama)}`)}${row("Tanggal kejadian", tglPanjang(b.tanggal))}
${row("Pelanggaran", `<b>${esc(b.pelanggaranNama)}</b> · ${esc(b.tingkat)} · ${b.poin} poin`, "rd")}${row("Tindakan pondok", `<b>${esc(namaTindakan(t))}</b>`, "hl")}${row("Total poin saat ini", `${total} poin · ${riwayat.length} kali BAP`)}</div>
<p>Kami memohon kerja sama Bapak/Ibu untuk menasihati dan mendampingi ananda agar tidak mengulangi pelanggaran serta kembali bersemangat dalam menghafal Al-Qur'an dan menjaga adab. Rincian kronologi dan bukti dapat dilihat pada akun wali di aplikasi MuawanahQu.</p>
<p>Demikian pemberitahuan ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan jazakumullahu khairan.</p>
<p class="salam">Wassalamu'alaikum warahmatullahi wabarakatuh</p>
<div class="tgl">${KOTA}, ${tglPanjang(b.tanggal, false)}</div>
${ttd([{ r: "Mengetahui,<br>Mudir", n: md ? md.nama : "", img: md ? L.ttdOf(md.id) : null }, { r: "<br>Wadir Kesantrian", n: nm(b.oleh), img: L.ttdOf(b.oleh) }])}`;
  return { judul: `Pemberitahuan Pelanggaran ${s.nama}`, html: suratDoc(`Pemberitahuan Pelanggaran ${s.nama}`, [body]) };
}

// ---------------- SURAT PERINGATAN ----------------
export function suratPeringatan(b) {
  const { s, a, pondok } = dataSantri(L.santriAman(b.santri)), t = tindakanBap(b), td = tindakanById(t.jenis), k = td.ke || 1, md = mudir(pondok);
  const no = nomorBap(b, "SP-" + k), sampai = new Date(L.parseYmd(b.tanggal).getTime()); sampai.setMonth(sampai.getMonth() + 3);
  const lanjut = k < 3 ? `Surat Peringatan ${k + 1} (SP-${k + 1})` : "pengembalian santri kepada orang tua";
  const body = judul(`KESANTRIAN · PONDOK ${pondok}`, `SURAT PERINGATAN ${k} (SP-${k})`, no)
    + `<p>Yang bertanda tangan di bawah ini, Wakil Mudir Bidang Kesantrian Kampung Qur'an Al Muawanah, dengan ini memberikan <b>Surat Peringatan ${k}</b> kepada santri:</p>
<div class="form">${grp("Data santri")}${row("Nama santri", `<b>${esc(s.nama)}</b>`)}${row("Kelas / asrama", `${esc(s.kelas)} · ${esc(a.nama)}`)}
${grp("Dasar peringatan")}${row("Berita acara", `${nomorBap(b)} · ${tglPanjang(b.tanggal, false)}`)}${row("Pelanggaran", `<b>${esc(b.pelanggaranNama)}</b> · ${esc(b.tingkat)} · ${b.poin} poin`, "rd")}
${row("Total poin", `${L.poinSantri(b.santri).total} poin`)}${row("Masa berlaku", `<b>${tglPanjang(b.tanggal, false)} s.d. ${tglPanjang(sampai, false)}</b>`, "hl")}</div>
<div class="kt">Isi peringatan</div>${ket([`Santri diperingatkan dengan tegas agar tidak mengulangi pelanggaran tersebut dan menaati seluruh tata tertib pondok.`,
      `Santri wajib mengikuti pembinaan dari wali asrama${b.sanksi ? ": " + esc(b.sanksi) : "."}`,
      `Apabila dalam masa berlaku peringatan santri kembali melakukan pelanggaran sedang atau berat, pondok akan memberikan <b>${lanjut}</b>.`,
      "Surat ini disampaikan kepada wali santri sebagai pemberitahuan dan bahan pembinaan di rumah."])}
<div class="tgl">${KOTA}, ${tglPanjang(b.tanggal, false)}</div>
${ttd([{ r: "Santri", n: s.nama }, { r: "Wali santri", n: s.ayah || "" }, { r: "Wadir Kesantrian", n: nm(b.oleh), img: L.ttdOf(b.oleh) }, { r: "Mengetahui,<br>Mudir", n: md ? md.nama : "", img: md ? L.ttdOf(md.id) : null }])}`;
  return { judul: `SP-${k} ${s.nama}`, html: suratDoc(`Surat Peringatan ${k} ${s.nama}`, [body]) };
}

// ---------------- SKORSING ----------------
export function suratSkorsing(b) {
  const { s, a, pondok } = dataSantri(L.santriAman(b.santri)), t = tindakanBap(b), md = mudir(pondok), no = nomorBap(b, "SKR");
  const mulai = t.mulai || b.tanggal, back = kembaliSkorsing(b), akhir = new Date(back.getTime() - 864e5);
  const body = judul(`KESANTRIAN · PONDOK ${pondok}`, "SURAT KEPUTUSAN SKORSING", no)
    + `<p>Berdasarkan Berita Acara Pelanggaran Nomor ${nomorBap(b)} tanggal ${tglPanjang(b.tanggal, false)}, pimpinan Kampung Qur'an Al Muawanah memutuskan memberikan sanksi <b>skorsing</b> kepada santri:</p>
<div class="form">${grp("Data santri")}${row("Nama santri", `<b>${esc(s.nama)}</b>`)}${row("Kelas / asrama", `${esc(s.kelas)} · ${esc(a.nama)}`)}
${grp("Keputusan")}${row("Pelanggaran", `<b>${esc(b.pelanggaranNama)}</b> · ${esc(b.tingkat)} · ${b.poin} poin`, "rd")}${row("Lama skorsing", `<b>${t.hari} hari</b>`)}
${row("Masa skorsing", `${tglPanjang(mulai)} s.d. ${tglPanjang(akhir)}`)}${row("Wajib kembali", `<b>${waktu(back)}</b>`, "hl")}</div>
<div class="kt">Ketentuan selama skorsing</div>${ket(["Santri dipulangkan dan berada dalam pengawasan penuh wali selama masa skorsing.",
      "Santri tidak mengikuti kegiatan pondok, tetapi wajib menjaga sholat berjamaah dan murojaah minimal 1 halaman setiap hari.",
      `Wali mengantar santri kembali pada waktu yang ditentukan dan melapor kepada Kesantrian. Pelanggaran berat berikutnya dapat berujung pada pengembalian santri kepada orang tua.${b.sanksi ? " " + esc(b.sanksi) : ""}`])}
${TELAT("wali")}
<div class="tgl">${KOTA}, ${tglPanjang(b.tanggal, false)}</div>
${ttd([{ r: "Wali santri,<br>yang menerima", n: s.ayah || "" }, { r: "<br>Wadir Kesantrian", n: nm(b.oleh), img: L.ttdOf(b.oleh) }, { r: "Memutuskan,<br>Mudir", n: md ? md.nama : "", img: md ? L.ttdOf(md.id) : null }])}
${slip(`Skorsing · ${no}`, s.nama)}`;
  return { judul: `Skorsing ${s.nama}`, html: suratDoc(`Surat Skorsing ${s.nama}`, [body]) };
}

// ---------------- PENGEMBALIAN SANTRI ----------------
export function suratPengembalian(b) {
  const { s, a, pondok } = dataSantri(L.santriAman(b.santri)), md = mudir(pondok), no = nomorBap(b, "PSO"), riwayat = all("bap").filter(x => x.santri === b.santri);
  const body = judul(`KESANTRIAN · PONDOK ${pondok}`, "SURAT PENGEMBALIAN SANTRI", no)
    + `<p>Berdasarkan Berita Acara Pelanggaran Nomor ${nomorBap(b)} tanggal ${tglPanjang(b.tanggal, false)} serta catatan pembinaan sebelumnya, pimpinan Kampung Qur'an Al Muawanah memutuskan <b>mengembalikan santri kepada orang tua/wali</b>:</p>
<div class="form">${grp("Data santri")}${row("Nama santri", `<b>${esc(s.nama)}</b>`)}${row("Kelas / asrama", `${esc(s.kelas)} · ${esc(a.nama)}`)}
${grp("Dasar keputusan")}${row("Pelanggaran", `<b>${esc(b.pelanggaranNama)}</b> · ${esc(b.tingkat)}`, "rd")}${row("Riwayat", `${riwayat.length} kali BAP · total ${L.poinSantri(b.santri).total} poin`)}
${row("Berlaku sejak", `<b>${tglPanjang((b.tindakan && b.tindakan.mulai) || b.tanggal)}</b>`, "hl")}</div>
<div class="kt">Ketentuan</div>${ket(["Santri dijemput oleh orang tua/wali dan tidak lagi mengikuti kegiatan pondok sejak tanggal berlaku.",
      "Barang pribadi santri diambil bersama wali asrama dan dicatat serah terimanya.", "Urusan administrasi diselesaikan bersama bagian administrasi pondok.",
      "Pondok tetap mendoakan kebaikan ananda dan terbuka untuk silaturahim."])}
<div class="tgl">${KOTA}, ${tglPanjang(b.tanggal, false)}</div>
${ttd([{ r: "Orang tua / wali,<br>yang menerima", n: s.ayah || "" }, { r: "<br>Wadir Kesantrian", n: nm(b.oleh), img: L.ttdOf(b.oleh) }, { r: "Memutuskan,<br>Mudir", n: md ? md.nama : "", img: md ? L.ttdOf(md.id) : null }])}`;
  return { judul: `Pengembalian ${s.nama}`, html: suratDoc(`Surat Pengembalian Santri ${s.nama}`, [body]) };
}

// Daftar surat yang otomatis tersedia untuk satu BAP
export function suratUntukBap(b, wali = false) {
  const t = tindakanBap(b), td = tindakanById(t.jenis), out = [];
  if (!wali) out.push({ jenis: "bap", nama: "Berita Acara Pelanggaran", ket: "Untuk arsip Kesantrian" });
  out.push({ jenis: "pemberitahuan", nama: "Surat Pemberitahuan Pelanggaran", ket: "Kepada wali santri" });
  if (td.surat === "sp") out.push({ jenis: "sp", nama: `Surat Peringatan ${td.ke} (SP-${td.ke})`, ket: "Berlaku 3 bulan" });
  if (td.surat === "skorsing") out.push({ jenis: "skorsing", nama: `Surat Keputusan Skorsing ${t.hari} hari`, ket: "Dengan bukti lapor kembali" });
  if (td.surat === "kembali") out.push({ jenis: "kembali", nama: "Surat Pengembalian Santri", ket: "Keputusan Mudir" });
  return out;
}
export function buatSurat(jenis, id) {
  if (jenis === "izin") { const i = get("izin", id); return i ? suratIzin(i) : null; }
  const b = get("bap", id); if (!b) return null;
  return ({ bap: suratBap, pemberitahuan: suratPemberitahuan, sp: suratPeringatan, skorsing: suratSkorsing, kembali: suratPengembalian })[jenis](b);
}
