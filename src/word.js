// Unduh dokumen (rapor) sebagai Word (.docx) yang bisa diedit.
// HTML rapor yang sama dengan pratinjau/PDF diubah menjadi dokumen Word: kop & kaki sebagai gambar halaman,
// judul, tabel (lengkap dengan colspan & warna), kotak catatan, dan blok tanda tangan.
// Supaya tidak berantakan: setiap halaman rapor diawali page break (section baru), baris tabel tidak terpotong
// antarhalaman, dan tabel berukuran tetap. Dokumen tetap biasa (tanpa proteksi/sorotan), bebas diedit.
import { toast } from "./store.js";
import { simpanFile } from "./pdf.js";

let libP = null;
export function muatDocx() {
  if (window.MKDOCX) return Promise.resolve(window.MKDOCX);
  if (!libP) libP = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = "vendor/docxkit.js"; s.async = true;
    s.onload = () => (window.MKDOCX ? res(window.MKDOCX) : rej(new Error("docx")));
    s.onerror = () => { libP = null; s.remove(); rej(new Error("Pembuat Word belum termuat. Periksa koneksi internet lalu coba lagi.")); };
    document.head.appendChild(s);
  });
  return libP;
}

const PX = 15; // 1px CSS (96 dpi) = 15 twip
const EMU = 9525; // 1px = 9525 EMU
const FONT = "Arial";
const hp = px => Math.max(12, Math.round(px * 0.75 * 2)); // ukuran huruf px → setengah-poin
const WARNA_TD = { qn30: "DCE8F0", qn29: "FBEFD9", qjx: "E3F2EA", qtot: "EEF2F5", qz: "F4F7F9" };

function dataUrlBytes(u) {
  const b64 = u.split(",")[1] || "", bin = atob(b64), a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
const jenisGambar = u => (/^data:image\/jpe?g/i.test(u) ? "jpg" : /^data:image\/gif/i.test(u) ? "gif" : "png");
function ukuranGambar(u) { return new Promise(r => { const im = new Image(); im.onload = () => r({ w: im.naturalWidth || 1, h: im.naturalHeight || 1 }); im.onerror = () => r({ w: 1, h: 1 }); im.src = u; }); }

export async function htmlKeDocx(docHtml, pilihHalaman = ".rp-page") {
  const D = await muatDocx();
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, ImageRun, VerticalAlign,
    HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType, TableLayoutType, HeightRule, LineRuleType } = D;
  const dok = new DOMParser().parseFromString(docHtml, "text/html");
  const pages = [...dok.querySelectorAll(pilihHalaman)];
  if (!pages.length) throw new Error("Halaman dokumen tidak ditemukan.");
  const ukur = {};
  for (const im of dok.querySelectorAll("img")) { const s = im.getAttribute("src") || ""; if (s.startsWith("data:") && !ukur[s]) ukur[s] = await ukuranGambar(s); }

  const garis = { style: BorderStyle.SINGLE, size: 4, color: "BFC8D0" }, tanpa = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const BATAS = { top: garis, bottom: garis, left: garis, right: garis }, NOB = { top: tanpa, bottom: tanpa, left: tanpa, right: tanpa, insideHorizontal: tanpa, insideVertical: tanpa };

  // teks sebaris dari sebuah elemen (b/strong → tebal, i → miring, br → baris baru)
  function runs(el, gaya = {}) {
    const out = [];
    const jalan = (n, g) => {
      if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, " "); if (t.trim() || (t === " " && out.length)) out.push(new TextRun({ text: t, font: FONT, size: g.size || 17, bold: !!g.bold, italics: !!g.italic, color: g.color, underline: g.underline ? {} : undefined })); return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (tag === "br") { out.push(new TextRun({ text: "", break: 1 })); return; }
      if (tag === "img") return;
      const st = n.getAttribute("style") || "";
      const g2 = { ...g, bold: g.bold || tag === "b" || tag === "strong" || n.classList.contains("qb") || n.classList.contains("qv") || n.classList.contains("qk") || n.classList.contains("qtot"), italic: g.italic || tag === "i" || tag === "em", underline: g.underline || /underline/.test(st) };
      if (n.classList.contains("qv")) g2.color = "0B5D3B"; if (n.classList.contains("qred")) g2.color = "E2564E";
      n.childNodes.forEach(c => jalan(c, g2));
    };
    jalan(el, gaya);
    while (out.length && out[0] && out[0].root === undefined && false) out.shift();
    return out;
  }
  const par = (el, opt = {}) => new Paragraph({ alignment: opt.align, spacing: { before: opt.before || 0, after: opt.after ?? 60 }, border: opt.border, children: opt.children || runs(el, opt.gaya || {}) });
  const kosong = (h = 6) => new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: "", size: Math.max(2, Math.round(h * 1.5)) })] });

  function gambarTtd(img, maksW, maksH) {
    const s = img.getAttribute("src") || ""; if (!s.startsWith("data:")) return null;
    const u = ukur[s] || { w: 1, h: 1 }, k = Math.min(maksW / u.w, maksH / u.h, 1.5);
    return new ImageRun({ type: jenisGambar(s), data: dataUrlBytes(s), transformation: { width: Math.round(u.w * k), height: Math.round(u.h * k) } });
  }

  // lebar kolom dari <colgroup> (px), diskalakan ke lebar isi halaman
  function lebarKolom(tb, nKol, lebarTotal) {
    const cols = [...tb.querySelectorAll(":scope > colgroup > col")].map(c => parseFloat((c.getAttribute("style") || "").replace(/.*width:\s*([\d.]+)px.*/, "$1")) || 0);
    let w = Array.from({ length: nKol }, (_, i) => cols[i] || 0); const pakai = w.reduce((a, b) => a + b, 0), sisa = w.filter(x => !x).length;
    w = w.map(x => x || Math.max(30, (lebarTotal - pakai) / Math.max(1, sisa)));
    const tot = w.reduce((a, b) => a + b, 0); return w.map(x => Math.round((x / tot) * lebarTotal * PX));
  }

  function tabel(tb, lebarTotal) {
    const trs = [...tb.querySelectorAll(":scope > tbody > tr, :scope > tr, :scope > thead > tr")];
    const nKol = Math.max(1, ...trs.map(tr => [...tr.children].reduce((a, c) => a + (Number(c.getAttribute("colspan")) || 1), 0)));
    const lebar = lebarKolom(tb, nKol, lebarTotal), tanpaGaris = tb.classList.contains("qid");
    const fs = tb.classList.contains("qket") ? 10 : 11.3;
    const rows = trs.map(tr => {
      let ci = 0; const h2 = tr.classList.contains("qh2"), zebra = tr.classList.contains("qz");
      const cells = [...tr.children].map(c => {
        const span = Number(c.getAttribute("colspan")) || 1, w = lebar.slice(ci, ci + span).reduce((a, b) => a + b, 0); ci += span;
        const th = c.tagName === "TH", kls = [...c.classList];
        let fill = th ? (h2 ? (c.classList.contains("qj29") ? "FBEFD9" : "DCE8F0") : "3D5F78") : null;
        if (!th) { const k = kls.find(x => WARNA_TD[x]); if (k) fill = WARNA_TD[k]; else if (zebra) fill = WARNA_TD.qz; }
        const isi = runs(c, { size: hp(kls.includes("qs") ? 10 : fs), bold: th, color: th ? (h2 ? "3D5F78" : "FFFFFF") : undefined });
        return new TableCell({ columnSpan: span > 1 ? span : undefined, width: { size: w, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
          shading: fill ? { type: ShadingType.CLEAR, color: "auto", fill } : undefined, borders: tanpaGaris ? NOB : BATAS,
          margins: { top: 20, bottom: 20, left: 70, right: 70 },
          children: [new Paragraph({ alignment: th || kls.includes("qc") ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { before: 0, after: 0 }, children: isi })] });
      });
      return new TableRow({ cantSplit: true, children: cells });
    });
    return new Table({ width: { size: lebar.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: lebar, layout: TableLayoutType.FIXED, borders: tanpaGaris ? NOB : undefined, rows });
  }

  // blok tanda tangan: tiap kolom = judul, gambar tanda tangan (bila ada), nama
  function blokTtd(div, lebarTotal) {
    const kol = [...div.children], n = Math.max(1, kol.length), tinggi = div.classList.contains("qttd3") ? 54 : 84;
    const w = Math.round((lebarTotal * PX) / n);
    const cells = kol.map(k => {
      const ps = []; let teks = [];
      const flush = () => { if (teks.length) { ps.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: teks })); teks = []; } };
      k.childNodes.forEach(n2 => {
        if (n2.nodeType === 1 && n2.classList.contains("qg")) {
          flush(); const im = n2.querySelector("img"), g = im && gambarTtd(im, (lebarTotal / n) * 0.8, tinggi * 0.92);
          ps.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: g ? [g] : [new TextRun({ text: "", size: 2 })] }));
          if (!g) for (let i = 0; i < Math.round(tinggi / 18); i++) ps.push(kosong(12));
        } else if (n2.nodeType === 1 && n2.tagName === "BR") { flush(); }
        else if (n2.nodeType === 1 && n2.tagName === "B") { flush(); ps.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: runs(n2, { size: hp(12), bold: true }) })); }
        else teks.push(...runs(n2.nodeType === 3 ? (() => { const s = dok.createElement("span"); s.textContent = n2.textContent; return s; })() : n2, { size: hp(12) }));
      });
      flush(); if (!ps.length) ps.push(kosong(4));
      return new TableCell({ width: { size: w, type: WidthType.DXA }, borders: NOB, children: ps });
    });
    return new Table({ width: { size: w * n, type: WidthType.DXA }, columnWidths: cells.map(() => w), layout: TableLayoutType.FIXED, borders: NOB, rows: [new TableRow({ cantSplit: true, children: cells })] });
  }

  function kotak(div, lebarTotal) {
    const tinggi = parseFloat((div.getAttribute("style") || "").replace(/.*min-height:\s*([\d.]+)px.*/, "$1")) || 93;
    const baris = (div.textContent || "").split("\n");
    const ps = baris.map(b => new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: b, font: FONT, size: hp(12) })] }));
    return new Table({ width: { size: lebarTotal * PX, type: WidthType.DXA }, columnWidths: [lebarTotal * PX], rows: [new TableRow({ cantSplit: true, height: { value: Math.round(tinggi * PX), rule: "atLeast" }, children: [new TableCell({ borders: BATAS, margins: { top: 90, bottom: 90, left: 120, right: 120 }, children: ps })] })] });
  }

  function statistik(div, lebarTotal) {
    const kol = [...div.children], w = Math.round((lebarTotal * PX) / Math.max(1, kol.length));
    return new Table({ width: { size: w * kol.length, type: WidthType.DXA }, columnWidths: kol.map(() => w), layout: TableLayoutType.FIXED,
      rows: [new TableRow({ cantSplit: true, children: kol.map(k => new TableCell({ borders: BATAS, shading: { type: ShadingType.CLEAR, color: "auto", fill: "F4F7F9" }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [...k.children].map(c => new Paragraph({ spacing: { before: 0, after: 0 }, children: runs(c, { size: hp(c.tagName === "B" ? 15 : 10.5), bold: c.tagName !== "SMALL", color: c.tagName === "SPAN" ? "3D5F78" : undefined }) })) })) })] });
  }

  function isiHalaman(page) {
    const lebarTotal = 794 - 96 - 85, out = [];
    const olah = el => {
      if (el.nodeType === 3) { if (el.textContent.trim()) out.push(new Paragraph({ children: [new TextRun({ text: el.textContent.trim(), font: FONT, size: hp(12) })] })); return; }
      if (el.nodeType !== 1) return;
      const tag = el.tagName.toLowerCase(), c = el.classList, st = el.getAttribute("style") || "";
      if (tag === "img" || tag === "style" || tag === "script") return;
      if (tag === "h1") return out.push(par(el, { align: AlignmentType.CENTER, after: 20, gaya: { size: hp(18), bold: true, color: "3D5F78" } }));
      if (tag === "table") { out.push(tabel(el, lebarTotal)); out.push(kosong(4)); return; }
      if (c.contains("qsub")) return out.push(par(el, { align: AlignmentType.CENTER, after: 40, gaya: { size: hp(12.5), bold: true, color: "0C9954" } }));
      if (c.contains("qgaris")) return out.push(new Paragraph({ spacing: { before: 60, after: 140 }, border: { top: { style: BorderStyle.SINGLE, size: 12, color: "3D5F78", space: 1 }, bottom: { style: BorderStyle.SINGLE, size: 6, color: "E5AC4C", space: 1 } }, children: [new TextRun({ text: "", size: 2 })] }));
      if (c.contains("qsec")) return out.push(par(el, { before: 160, after: 60, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "E5AC4C", space: 1 } }, gaya: { size: hp(14), bold: true, color: "0C9954" } }));
      if (c.contains("qnote")) return out.push(par(el, { before: 40, after: 60, gaya: { size: hp(10.6), italic: true } }));
      if (c.contains("qlbl")) return out.push(par(el, { before: 100, after: 40, gaya: { size: hp(12), bold: true, color: "3D5F78" } }));
      if (c.contains("qbox")) { out.push(kotak(el, lebarTotal)); out.push(kosong(4)); return; }
      if (c.contains("qstats")) { out.push(statistik(el, lebarTotal)); out.push(kosong(6)); return; }
      if (c.contains("qttd") || c.contains("qttd3")) { const mt = parseFloat(st.replace(/.*margin-top:\s*([\d.]+)px.*/, "$1")); if (mt > 0 && /margin-top/.test(st)) out.push(kosong(mt)); out.push(blokTtd(el, lebarTotal)); return; }
      if (tag === "div" && !el.children.length && /height:\s*\d+px/.test(st)) { out.push(kosong(parseFloat(st.replace(/.*height:\s*([\d.]+)px.*/, "$1")))); return; }
      if (tag === "p") return out.push(par(el, { gaya: { size: hp(12) } }));
      el.childNodes.forEach(olah);
    };
    page.childNodes.forEach(olah);
    return out;
  }

  // penutup tiap halaman: paragraf super tipis agar page break tidak memunculkan halaman kosong
  const mungil = mungilDari(D);

  // kop & kaki halaman sebagai gambar mengambang (posisi sama dengan rapor PDF)
  const gambarMengambang = (img, kiri, atas, lebar) => {
    const s = img.getAttribute("src") || "", u = ukur[s] || { w: 1, h: 1 }, tinggi = Math.round((u.h / u.w) * lebar);
    const top = atas == null ? 1123 - 10 - tinggi : atas;
    return new Paragraph({ children: [new ImageRun({ type: jenisGambar(s), data: dataUrlBytes(s), transformation: { width: lebar, height: tinggi },
      floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: kiri * EMU }, verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: top * EMU }, behindDocument: true, wrap: { type: TextWrappingType.NONE } } })] });
  };
  const contoh = pages[0], head = contoh.querySelector("img.rp-head"), foot = contoh.querySelector("img.rp-foot");
  const { Header, Footer } = D;
  const header = head ? new Header({ children: [gambarMengambang(head, 35, 11, 763)] }) : undefined;
  const footer = foot ? new Footer({ children: [gambarMengambang(foot, 14, null, 785)] }) : undefined;

  const doc = new Document({
    creator: "MuawanahQu", title: "Rapor", styles: { default: { document: { run: { font: FONT, size: 17 } } } },
    sections: pages.map((pg, i) => ({
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 183 * PX, bottom: 120 * PX, left: 96 * PX, right: 85 * PX, header: 0, footer: 0 } } },
      headers: header ? { default: header } : undefined, footers: footer ? { default: footer } : undefined,
      children: [...isiHalaman(pg), mungil()],
    })),
  });
  return Packer.toBlob(doc);
}

// paragraf super tipis (penutup sel/section) agar tidak memicu halaman kosong
function mungilDari(D) { const { Paragraph, TextRun, LineRuleType } = D; return () => new Paragraph({ spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT }, children: [new TextRun({ text: "", size: 2 })] }); }



let sibuk = false;
export async function unduhWord(nama, buat) {
  if (sibuk) return; sibuk = true;
  toast("Menyiapkan file Word…");
  try { const blob = await buat(); await simpanFile(/\.docx$/i.test(nama) ? nama : nama + ".docx", blob); }
  catch (e) { console.error(e); toast((e && e.message && e.message.length < 120 ? e.message : "File Word gagal dibuat. Coba lagi."), "err"); }
  finally { sibuk = false; }
}
