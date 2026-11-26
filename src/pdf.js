// Semua unduhan dokumen berbentuk PDF.
// - Surat & rapor: tiap halaman A4 dirender tajam (2x) lalu disusun jadi PDF, tampilan sama persis dengan pratinjau.
// - Rekap: tabel PDF asli (teks bisa dicari/disalin), kop pondok di tiap halaman, nomor halaman.
import { toast } from "./store.js";
import { getDownloads } from "./s_system.js";
import { SURAT_HEAD } from "./surat_assets.js";

let libP = null;
export function muatPdf() {
  if (window.MKPDF) return Promise.resolve(window.MKPDF);
  if (!libP) libP = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = "vendor/pdfkit.js"; s.async = true;
    s.onload = () => (window.MKPDF ? res(window.MKPDF) : rej(new Error("pdf")));
    s.onerror = () => { libP = null; s.remove(); rej(new Error("Pembuat PDF belum termuat. Periksa koneksi internet lalu coba lagi.")); };
    document.head.appendChild(s);
  });
  return libP;
}
const tunggu = ms => new Promise(r => setTimeout(r, ms));

// Render halaman-halaman A4 dari sebuah dokumen HTML (surat/rapor) menjadi PDF
export async function htmlKePdf(docHtml, pilihHalaman) {
  const { jsPDF, html2canvas, FONT_CSS } = await muatPdf();
  const fr = document.createElement("iframe");
  fr.setAttribute("aria-hidden", "true"); fr.setAttribute("tabindex", "-1");
  fr.style.cssText = "position:fixed;left:-12000px;top:0;width:820px;height:1200px;border:0;pointer-events:none";
  document.body.appendChild(fr);
  try {
    const html = docHtml.replace(/<link[^>]+fonts\.googleapis[^>]+>/g, "").replace("</head>", `<style>${FONT_CSS}</style></head>`);
    await new Promise(r => { fr.onload = r; fr.srcdoc = html; });
    const d = fr.contentDocument;
    try { await Promise.all(["400", "500", "600", "700", "800"].map(w => d.fonts.load(`${w} 12px Montserrat`))); await d.fonts.ready; } catch (e) { }
    await Promise.all([...d.images].map(im => (im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; }))));
    await tunggu(150); // beri waktu skrip penyesuai ukuran halaman
    const pages = [...d.querySelectorAll(pilihHalaman)];
    if (!pages.length) throw new Error("Halaman dokumen tidak ditemukan.");
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    for (let i = 0; i < pages.length; i++) {
      const c = await html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff", logging: false, useCORS: true, windowWidth: 820 });
      if (i) pdf.addPage();
      pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297, undefined, "FAST");
    }
    return pdf.output("blob");
  } finally { fr.remove(); }
}

// Gambar kop (webp) → JPEG berlatar putih untuk jsPDF; versi utuh (tegak) dan potongan logo + ornamen (mendatar)
let kopP = null;
function kopJpeg() {
  if (!kopP) kopP = new Promise(res => {
    const im = new Image();
    im.onload = () => {
      const w = im.naturalWidth, h = im.naturalHeight;
      const potong = (x0, x1) => { const c = document.createElement("canvas"); c.width = Math.round((x1 - x0) * w); c.height = h; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, -x0 * w, 0); return { src: c.toDataURL("image/jpeg", 0.92), r: h / c.width }; };
      res({ utuh: potong(0, 1), kiri: potong(0, 0.42), kanan: potong(0.6, 1) });
    };
    im.onerror = () => res(null); im.src = SURAT_HEAD;
  });
  return kopP;
}
// Rekap / tabel → PDF asli. bagian: [{ judul, kol: [...], rows: [[...]] }]
export async function tabelKePdf({ judul, sub, catatan, bagian, oleh, ttd }) {
  const { jsPDF, autoTable } = await muatPdf();
  const kop = await kopJpeg();
  const lebar = Math.max(...bagian.map(b => b.kol.length)) > 8;
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: lebar ? "landscape" : "portrait", compress: true });
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), M = 14;
  const NAVY = [51, 52, 63], SLATE = [61, 97, 120], GOLD = [229, 168, 72];
  const kopH = kop ? (lebar ? 27 : Math.min(30, (W - 8) * kop.utuh.r)) : 0;
  const kepala = () => {
    if (kop && !lebar) pdf.addImage(kop.utuh.src, "JPEG", 4.5, 0, kopH / kop.utuh.r, kopH, "kop", "FAST");
    else if (kop) { pdf.addImage(kop.kiri.src, "JPEG", 4.5, 0, kopH / kop.kiri.r, kopH, "kopL", "FAST"); const wr = kopH / kop.kanan.r; pdf.addImage(kop.kanan.src, "JPEG", W - wr, 0, wr, kopH, "kopR", "FAST"); }
    else { pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(...NAVY); pdf.text("Kampung Qur'an Al Muawanah", M, 14); }
  };
  const kaki = () => {
    const n = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      pdf.setPage(i); pdf.setDrawColor(...GOLD); pdf.setLineWidth(0.8); pdf.line(M, H - 11, W - M, H - 11);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor(110, 120, 135);
      pdf.text(`Kampung Qur'an Al Muawanah · ${judul}${sub ? " · " + sub : ""}`, M, H - 6.5);
      pdf.text(`Halaman ${i} dari ${n}`, W - M, H - 6.5, { align: "right" });
    }
  };
  kepala();
  let y = kopH + 8;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(15); pdf.setTextColor(...NAVY); pdf.text(judul.toUpperCase(), W / 2, y, { align: "center" });
  pdf.setFillColor(...GOLD); pdf.roundedRect(W / 2 - 13, y + 2.2, 26, 1.3, 0.6, 0.6, "F"); y += 8;
  if (sub) { pdf.setFont("helvetica", "bold"); pdf.setFontSize(9.5); pdf.setTextColor(...SLATE); pdf.text(sub, W / 2, y, { align: "center" }); y += 5.5; }
  if (catatan) { pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.3); pdf.setTextColor(80, 90, 100); const ls = pdf.splitTextToSize(catatan, W - 2 * M); pdf.text(ls, M, y + 1); y += ls.length * 3.8 + 2; }
  if (oleh) { pdf.setFontSize(8); pdf.setTextColor(120, 128, 140); pdf.text(oleh, M, y + 1); y += 4.5; }
  for (const b of bagian) {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10.5); pdf.setTextColor(...NAVY); pdf.text(b.judul, M, y + 4); y += 6;
    autoTable(pdf, {
      startY: y, head: [b.kol], body: b.rows.length ? b.rows.map(r => r.map(v => (v == null ? "" : String(v)))) : [[{ content: "Tidak ada data pada periode ini.", colSpan: b.kol.length, styles: { halign: "center", textColor: [120, 128, 140] } }]],
      margin: { left: M, right: M, top: kopH + 6, bottom: 16 }, theme: "grid",
      styles: { font: "helvetica", fontSize: lebar ? 7.6 : 8.3, cellPadding: 1.6, lineColor: [214, 220, 226], lineWidth: 0.15, textColor: NAVY, valign: "middle", overflow: "linebreak" },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", fontSize: lebar ? 7.4 : 8 },
      alternateRowStyles: { fillColor: [245, 247, 249] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: lebar ? 42 : "auto" } },
      didDrawPage: d => { if (d.pageNumber > 1 || pdf.internal.getNumberOfPages() > 1) kepala(); },
    });
    y = pdf.lastAutoTable.finalY + 8;
    if (y > H - 30) { pdf.addPage(); kepala(); y = kopH + 8; }
  }
  if (ttd && ttd.img) {
    // Metro, tanggal · jabatan · tanda tangan · nama (rata kanan)
    if (y > H - 54) { pdf.addPage(); kepala(); y = kopH + 10; } else y -= 2;
    const bw = 70, cx = W - M - bw / 2, d = new Date(), BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(...NAVY);
    pdf.text(`Metro, ${d.getDate()} ${BLN[d.getMonth()]} ${d.getFullYear()}`, cx, y + 2, { align: "center" });
    pdf.text(ttd.jabatan || "", cx, y + 6.5, { align: "center" });
    const r = (ttd.h || 1) / (ttd.w || 1), iw = Math.min(46, 20 / r), ih = iw * r;
    try { pdf.addImage(ttd.img, "PNG", cx - iw / 2, y + 8 + (20 - ih) / 2, iw, ih, "ttd", "FAST"); } catch (e) { }
    pdf.setFont("helvetica", "bold"); pdf.text(String(ttd.nama || "").replace(/^Ust(dzh)?\.\s*/, ""), cx, y + 33, { align: "center" });
    const tw = pdf.getTextWidth(String(ttd.nama || "").replace(/^Ust(dzh)?\.\s*/, "")); pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.25); pdf.line(cx - tw / 2, y + 34, cx + tw / 2, y + 34);
  }
  kaki();
  return pdf.output("blob");
}

// Simpan file ke perangkat: unduhan biasa; di iPhone/iPad (aplikasi terpasang) memakai menu Bagikan → Simpan ke File
export async function simpanFile(nama, blob) {
  const word = /\.docx$/i.test(nama), jenis = word ? "File Word" : "PDF", mime = word ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf";
  const d = await getDownloads();
  if (d) { try { await d.save({ filename: nama, data: blob }); toast(`${jenis} diunduh.`); return; } catch (e) { if (e && e.code === "declined") return; } }
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const file = typeof File === "function" ? new File([blob], nama, { type: mime }) : null;
  if (ios && file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: nama }); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  try {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = nama; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000); toast(`${jenis} diunduh. Cek folder Unduhan.`);
  } catch (e) { toast("File tidak bisa diunduh di perangkat ini.", "err"); }
}
// Satu pintu: siapkan PDF lalu simpan, dengan pesan proses
let sibuk = false;
export async function unduhPdf(nama, buat) {
  if (sibuk) return; sibuk = true;
  toast("Menyiapkan PDF…");
  try { const blob = await buat(); await simpanFile(/\.pdf$/i.test(nama) ? nama : nama + ".pdf", blob); }
  catch (e) { toast((e && e.message && e.message.length < 120 ? e.message : "PDF gagal dibuat. Coba lagi."), "err"); }
  finally { sibuk = false; }
}
