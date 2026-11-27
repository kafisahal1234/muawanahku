// Pembaca dokumen: Excel (xlsx/xls/ods), CSV/TXT, Word (docx), PDF, dan foto.
// Hasil: { nama, jenis, teks, tabel, berkas } — teks/tabel untuk dibaca langsung, berkas (base64) untuk dibaca AI.
import { aiMesin } from "./ai.js";
import { imp } from "./cloud.js";

const urlLokal = p => new URL(p, location.href).href;
const muatSkrip = (src, glob) => new Promise((ok, no) => {
  if (window[glob]) return ok(window[glob]);
  const s = document.createElement("script"); s.src = src; s.onload = () => (window[glob] ? ok(window[glob]) : no(new Error("Pustaka " + glob + " gagal dimuat")));
  s.onerror = () => no(new Error("Pustaka " + glob + " gagal dimuat")); document.head.appendChild(s);
});
let xlsxP = null, pdfP = null;
function muatXLSX() {
  if (!xlsxP) xlsxP = imp("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs").catch(() => imp(urlLokal("vendor/xlsx.mjs"))).catch(e => { xlsxP = null; throw e; });
  return xlsxP;
}
function muatPDF() {
  if (!pdfP) pdfP = imp(urlLokal("vendor/pdf.min.mjs")).then(m => { m.GlobalWorkerOptions.workerSrc = urlLokal("vendor/pdf.worker.min.mjs"); return m; }).catch(e => { pdfP = null; throw e; });
  return pdfP;
}

export function keBase64(buf) {
  const u = new Uint8Array(buf); let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
// CSV sederhana yang paham tanda kutip; pemisah ditebak (koma, titik koma, tab)
export function parseCSV(t) {
  const baris1 = (t.split(/\r?\n/).find(x => x.trim()) || "");
  const sep = [["\t", (baris1.match(/\t/g) || []).length], [";", (baris1.match(/;/g) || []).length], [",", (baris1.match(/,/g) || []).length]].sort((a, b) => b[1] - a[1])[0];
  const d = sep[1] ? sep[0] : "\u0000", rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"' && !cur) q = true;
    else if (c === d) { row.push(cur.trim()); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cur.trim()); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur.trim()); rows.push(row); }
  return rows.filter(r => r.some(x => x));
}
const keTSV = rows => rows.map(r => r.map(x => String(x == null ? "" : x).replace(/\s+/g, " ").trim()).join("\t")).join("\n");

async function kompresGambar(file, maks = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const k = Math.min(1, maks / Math.max(img.width, img.height)), c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.85));
    return { mime: "image/jpeg", b64: keBase64(await blob.arrayBuffer()), blob };
  } finally { URL.revokeObjectURL(url); }
}

async function bacaPDF(file, buf) {
  // Gemini membaca PDF langsung (termasuk hasil scan). Mesin lain: ambil teks, atau foto halaman bila PDF hasil scan.
  if (aiMesin() === "gemini" && buf.byteLength < 15e6) return { jenis: "pdf", teks: "", berkas: [{ mime: "application/pdf", b64: keBase64(buf) }] };
  const pdfjs = await muatPDF(), doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  let teks = ""; const n = Math.min(doc.numPages, 40);
  for (let i = 1; i <= n; i++) {
    const pg = await doc.getPage(i), tc = await pg.getTextContent(); let y = null, line = [];
    const lines = [];
    tc.items.forEach(it => { const yy = Math.round(it.transform[5]); if (y !== null && Math.abs(yy - y) > 3) { lines.push(line.join(" ")); line = []; } y = yy; if (it.str.trim()) line.push(it.str.trim()); });
    if (line.length) lines.push(line.join(" "));
    teks += `\n--- Halaman ${i} ---\n` + lines.join("\n");
  }
  if (teks.replace(/\s|-|Halaman \d+/g, "").length > 40 * n) return { jenis: "pdf", teks: teks.trim(), berkas: [] };
  const berkas = [];
  for (let i = 1; i <= Math.min(doc.numPages, 6); i++) {
    const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 1.6 }), c = document.createElement("canvas");
    c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext("2d"), viewport: vp, canvas: c }).promise;
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.82));
    berkas.push({ mime: "image/jpeg", b64: keBase64(await blob.arrayBuffer()), blob });
  }
  return { jenis: "pdf", teks: "", berkas };
}

export async function bacaBerkas(file) {
  const nama = file.name || "berkas", ext = (nama.split(".").pop() || "").toLowerCase();
  if (file.size > 25e6) throw new Error("Berkas terlalu besar (maks. 25 MB).");
  if (/^(csv|txt|tsv)$/.test(ext) || file.type === "text/plain" || file.type === "text/csv") {
    const teks = await file.text(); return { nama, jenis: "tabel", teks: teks.slice(0, 80000), tabel: parseCSV(teks), berkas: [] };
  }
  if (/^(xlsx|xlsm|xls|ods)$/.test(ext)) {
    const X = await muatXLSX(), wb = X.read(new Uint8Array(await file.arrayBuffer()), { type: "array", cellNF: true });
    let tabel = null, teks = "";
    // Tanggal Excel ditulis ulang sebagai YYYY-MM-DD langsung dari nilai serialnya (bukan dari format tampilan
    // seperti "1/14/14" yang bisa terbaca terbalik hari/bulan).
    const p2 = n => String(n).padStart(2, "0");
    wb.SheetNames.forEach(sn => { const ws = wb.Sheets[sn]; Object.keys(ws).forEach(a => { const c = ws[a]; if (a[0] === "!" || !c || c.t !== "n" || !c.z || !X.SSF.is_date(c.z)) return; const d = X.SSF.parse_date_code(c.v); if (d && d.y) c.w = `${d.y}-${p2(d.m)}-${p2(d.d)}`; }); });
    wb.SheetNames.forEach(sn => {
      const rows = X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: "", dateNF: "yyyy-mm-dd" }).filter(r => r.some(x => String(x).trim()));
      if (!rows.length) return;
      if (!tabel) tabel = rows;
      teks += `### Lembar: ${sn}\n${keTSV(rows)}\n\n`;
    });
    return { nama, jenis: "tabel", teks: teks.slice(0, 80000), tabel: tabel || [], berkas: [] };
  }
  if (ext === "docx") {
    const m = await muatSkrip(urlLokal("vendor/mammoth.browser.min.js"), "mammoth");
    const r = await m.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    const dom = new DOMParser().parseFromString(r.value, "text/html"); let tabel = null, teks = "";
    dom.querySelectorAll("table").forEach((t, i) => {
      const rows = [...t.querySelectorAll("tr")].map(tr => [...tr.querySelectorAll("td,th")].map(td => td.textContent.trim()));
      if (!tabel) tabel = rows; teks += `### Tabel ${i + 1}\n${keTSV(rows)}\n\n`; t.remove();
    });
    const lain = [...dom.body.querySelectorAll("p,li,h1,h2,h3,h4")].map(x => x.textContent.trim()).filter(Boolean).join("\n");
    return { nama, jenis: tabel ? "tabel" : "teks", teks: (lain + "\n\n" + teks).trim().slice(0, 80000), tabel: tabel || [], berkas: [] };
  }
  if (ext === "doc") throw new Error("Format .doc lama belum bisa dibaca. Simpan ulang sebagai .docx atau PDF.");
  if (ext === "pdf" || file.type === "application/pdf") { const r = await bacaPDF(file, await file.arrayBuffer()); return { nama, tabel: [], ...r }; }
  if (/^image\//.test(file.type) || /^(jpe?g|png|webp|heic|heif)$/.test(ext)) return { nama, jenis: "gambar", teks: "", tabel: [], berkas: [await kompresGambar(file)] };
  throw new Error("Jenis berkas belum didukung. Gunakan Excel, CSV, Word (.docx), PDF, atau foto.");
}
export const TERIMA = ".xlsx,.xls,.xlsm,.ods,.csv,.tsv,.txt,.docx,.pdf,image/*";
