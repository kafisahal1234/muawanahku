// Tanda tangan digital pejabat & wali asrama (Mudir, Wadir, Wali Asrama).
// Dua cara: tulis langsung di layar penuh (otomatis mendatar agar area lebar) atau foto dari kertas,
// latar dihapus otomatis sehingga yang tersisa hanya goresan tinta (PNG transparan).
// Hasilnya dipakai otomatis di surat kesantrian, rapor, dan rekap PDF sesuai jabatan.
import { useState, useRef, useEffect } from "preact/hooks";
import { createPortal } from "preact/compat";
import { html, nav, useApp, Icon, Card, SubHeader, Btn, Confirm, Hint, Section } from "./ui.js";
import { get, put, del, toast } from "./store.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { logUbah } from "./s_koreksi.js";

const TINTA = { biru: [27, 63, 160], hitam: [17, 24, 39] };
const rgb = a => `rgb(${a.join(",")})`;
const TEBAL = [1.5, 2.3, 3.3];
const kunciLayar = on => { document.body.style.overflow = on ? "hidden" : ""; document.documentElement.classList.toggle("pad-on", on); };

// ---------- jabatan untuk tiap jenis dokumen ----------
export function jabatanTtd(m, modul) {
  const r = (m && m.roles) || [], pilih = (...p) => p.find(([k]) => r.includes(k));
  const map = { tahfidz: [["wadir_tahfidz", "Wakil Mudir Bidang Tahfidz"], ["mudir", "Mudir"], ["guru_tahfidz", "Guru Tahfidz"]],
    mapel: [["wadir_kurikulum", "Wakil Mudir Bidang Kurikulum"], ["mudir", "Mudir"], ["guru_mapel", "Guru Mata Pelajaran"]],
    kesantrian: [["wadir_kesantrian", "Wakil Mudir Bidang Kesantrian"], ["mudir", "Mudir"], ["musyrif", "Wali Asrama"]],
    asrama: [["musyrif", "Wali Asrama"], ["wadir_kesantrian", "Wakil Mudir Bidang Kesantrian"], ["mudir", "Mudir"]] };
  const x = pilih(...(map[modul] || [])) || pilih(["mudir", "Mudir"], ["wadir_tahfidz", "Wakil Mudir Bidang Tahfidz"], ["wadir_kurikulum", "Wakil Mudir Bidang Kurikulum"], ["wadir_kesantrian", "Wakil Mudir Bidang Kesantrian"], ["musyrif", "Wali Asrama"]);
  return x ? x[1] : L.ROLE_LABEL[r[0]] || "";
}
// Blok tanda tangan untuk rekap PDF yang diunduh akun ini (null bila belum punya tanda tangan)
export function ttdUntukPdf(modul) {
  const m = me(); if (!m) return null; const t = get("ttd", m.id); if (!t || !t.img) return null;
  return { img: t.img, w: t.w || 600, h: t.h || 220, nama: m.nama, jabatan: jabatanTtd(m, modul) };
}

// ---------- goresan halus (lebar mengikuti kecepatan) ----------
function gambarGores(g, s) {
  const p = s.pts; if (!p.length) return;
  g.strokeStyle = g.fillStyle = rgb(TINTA[s.warna] || TINTA.biru); g.lineCap = g.lineJoin = "round";
  if (p.length === 1) { g.beginPath(); g.arc(p[0].x, p[0].y, p[0].w / 2, 0, Math.PI * 2); g.fill(); return; }
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], pa = i > 1 ? p[i - 2] : a;
    const m1 = { x: (pa.x + a.x) / 2, y: (pa.y + a.y) / 2 }, m2 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    g.lineWidth = (a.w + b.w) / 2; g.beginPath(); g.moveTo(m1.x, m1.y); g.quadraticCurveTo(a.x, a.y, m2.x, m2.y); g.stroke();
  }
  const z = p[p.length - 1], y = p[p.length - 2]; g.lineWidth = z.w; g.beginPath(); g.moveTo((y.x + z.x) / 2, (y.y + z.y) / 2); g.lineTo(z.x, z.y); g.stroke();
}

function PadTtd({ onSimpan, onBatal }) {
  const [vp, setVp] = useState(() => ({ w: innerWidth, h: innerHeight })), [tegak, setTegak] = useState(false);
  const [warna, setWarna] = useState("biru"), [tebal, setTebal] = useState(1), [n, setN] = useState(0), [busy, setBusy] = useState(false);
  const cv = useRef(null), gores = useRef([]), cur = useRef(null), dim = useRef({ w: 0, h: 0, dpr: 1 });
  const putar = vp.h > vp.w && !tegak; // HP tegak → area tulis diputar mendatar (HP dimiringkan ke samping)
  useEffect(() => { kunciLayar(true); const f = () => setVp({ w: innerWidth, h: innerHeight }); addEventListener("resize", f); addEventListener("orientationchange", f); return () => { kunciLayar(false); removeEventListener("resize", f); removeEventListener("orientationchange", f); }; }, []);
  const ulangGambar = () => { const c = cv.current; if (!c) return; const { dpr } = dim.current, g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(dpr, 0, 0, dpr, 0, 0); gores.current.forEach(s => gambarGores(g, s)); };
  useEffect(() => {
    const c = cv.current; if (!c) return; const box = c.parentElement, w = box.clientWidth, h = box.clientHeight, dpr = Math.min(3, devicePixelRatio || 1);
    const lama = dim.current; c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + "px"; c.style.height = h + "px"; dim.current = { w, h, dpr };
    if (lama.w && (lama.w !== w || lama.h !== h)) { const kx = w / lama.w, ky = h / lama.h, k = Math.min(kx, ky); gores.current.forEach(s => s.pts.forEach(p => { p.x *= k; p.y *= k; p.w *= k; })); }
    ulangGambar();
  }, [putar, vp.w, vp.h]);
  const titik = e => { const r = cv.current.getBoundingClientRect(); return putar ? { x: e.clientY - r.top, y: r.right - e.clientX } : { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const skala = () => Math.max(0.8, Math.min(1.8, Math.min(dim.current.w, dim.current.h) / 260));
  const tambah = (e, awal) => {
    const s = cur.current, q = titik(e), t = e.timeStamp || performance.now(), dasar = TEBAL[tebal] * skala();
    if (awal) { s.pts.push({ ...q, t, w: dasar }); return; }
    const a = s.pts[s.pts.length - 1], d = Math.hypot(q.x - a.x, q.y - a.y); if (d < 0.8) return;
    const v = d / Math.max(1, t - a.t), target = dasar * Math.max(0.55, Math.min(1.35, 1.3 - v * 0.32));
    s.pts.push({ ...q, t, w: a.w * 0.65 + target * 0.35 });
  };
  const down = e => { e.preventDefault(); cv.current.setPointerCapture(e.pointerId); cur.current = { warna, pts: [] }; gores.current.push(cur.current); tambah(e, true); ulangGambar(); };
  const move = e => { if (!cur.current) return; e.preventDefault(); const ev = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; (ev.length ? ev : [e]).forEach(x => tambah(x)); ulangGambar(); };
  const up = () => { if (!cur.current) return; cur.current = null; setN(gores.current.length); };
  const urung = () => { gores.current.pop(); setN(gores.current.length); ulangGambar(); };
  const hapus = () => { gores.current = []; setN(0); ulangGambar(); };
  const simpan = async () => {
    const pts = gores.current.flatMap(s => s.pts); if (!pts.length) return;
    setBusy(true);
    const pad = 10, x0 = Math.min(...pts.map(p => p.x - p.w)), y0 = Math.min(...pts.map(p => p.y - p.w)), x1 = Math.max(...pts.map(p => p.x + p.w)), y1 = Math.max(...pts.map(p => p.y + p.w));
    const W = x1 - x0 + 2 * pad, H = y1 - y0 + 2 * pad, k = Math.min(3, 1200 / W), c = document.createElement("canvas");
    c.width = Math.round(W * k); c.height = Math.round(H * k); const g = c.getContext("2d"); g.scale(k, k); g.translate(pad - x0, pad - y0); gores.current.forEach(s => gambarGores(g, s));
    await onSimpan({ img: c.toDataURL("image/png"), w: c.width, h: c.height }, "tulis"); setBusy(false);
  };
  // gaya kotak: saat diputar, ukurannya kebalikan layar lalu diputar 90°
  const gaya = putar ? `width:${vp.h}px;height:${vp.w}px` : "";
  return createPortal(html`<div class="pad-lb" role="dialog" aria-label="Tulis tanda tangan">
    <div class=${"pad-box" + (putar ? " putar" : "")} style=${gaya}>
      <div class="pad-top"><button type="button" class="pad-tx" onClick=${onBatal}>Batal</button><b>Tulis tanda tangan</b>
        <button type="button" class="pad-ok" disabled=${!n || busy} onClick=${simpan}>${busy ? "Menyimpan…" : "Simpan"}</button></div>
      <div class="pad-area"><canvas ref=${cv} aria-label="Area tanda tangan" onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up}></canvas>
        <div class="pad-garis"><span>×</span></div>${!n ? html`<p class="pad-hint">Tanda tangan di sini${putar ? html`<small>Miringkan HP ke samping agar lebih leluasa</small>` : null}</p>` : null}</div>
      <div class="pad-bawah">
        <div class="pad-grp" role="group" aria-label="Warna tinta">${[["biru", "Biru"], ["hitam", "Hitam"]].map(([k, t]) => html`<button type="button" class=${"pad-chip" + (warna === k ? " on" : "")} aria-pressed=${warna === k} onClick=${() => setWarna(k)}><i style=${`background:${rgb(TINTA[k])}`}></i>${t}</button>`)}</div>
        <div class="pad-grp" role="group" aria-label="Ketebalan">${["Tipis", "Sedang", "Tebal"].map((t, i) => html`<button type="button" class=${"pad-chip" + (tebal === i ? " on" : "")} aria-pressed=${tebal === i} onClick=${() => setTebal(i)}>${t}</button>`)}</div>
        <div class="pad-grp"><button type="button" class="pad-chip" disabled=${!n} onClick=${urung}><${Icon} n="repeat" s=${16} />Urungkan</button><button type="button" class="pad-chip" disabled=${!n} onClick=${hapus}><${Icon} n="trash" s=${16} />Ulangi</button>
          ${vp.h > vp.w ? html`<button type="button" class="pad-chip" onClick=${() => setTegak(!tegak)}>${tegak ? "Mode mendatar" : "Mode tegak"}</button>` : null}</div></div>
    </div></div>`, document.body);
}

// ---------- foto dari kertas: hapus latar, sisakan tinta ----------
async function bacaFoto(file, max = 1400) {
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Foto tidak bisa dibuka. Coba foto JPG/PNG.")); i.src = url; });
    const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
    const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0, c.width, c.height); return g.getImageData(0, 0, c.width, c.height);
  } finally { URL.revokeObjectURL(url); }
}
// Kecerahan kertas diperkirakan per blok (nilai terang setempat) agar bayangan & cahaya tidak rata ikut tertangani
export function siapkanFoto(src) {
  const { width: W, height: H, data } = src, N = W * H, lum = new Float32Array(N);
  for (let i = 0; i < N; i++) lum[i] = 0.299 * data[4 * i] + 0.587 * data[4 * i + 1] + 0.114 * data[4 * i + 2];
  const B = Math.max(10, Math.round(Math.max(W, H) / 60)), gw = Math.ceil(W / B), gh = Math.ceil(H / B), g0 = new Float32Array(gw * gh);
  for (let by = 0; by < gh; by++) for (let bx = 0; bx < gw; bx++) {
    const hist = new Uint32Array(64); let n = 0;
    for (let y = by * B; y < Math.min(H, by * B + B); y++) for (let x = bx * B; x < Math.min(W, bx * B + B); x++) { hist[lum[y * W + x] >> 2]++; n++; }
    let acc = 0, v = 63; for (; v > 0; v--) { acc += hist[v]; if (acc >= n * 0.1) break; } g0[by * gw + bx] = v * 4 + 2; // persentil 90 (terang)
  }
  const g1 = new Float32Array(gw * gh), g2 = new Float32Array(gw * gh), at = (g, x, y) => g[Math.max(0, Math.min(gh - 1, y)) * gw + Math.max(0, Math.min(gw - 1, x))];
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { let m = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m = Math.max(m, at(g0, x + dx, y + dy)); g1[y * gw + x] = m; }
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += at(g1, x + dx, y + dy); g2[y * gw + x] = s / 9; }
  const ratio = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    const fy = Math.min(gh - 1, Math.max(0, y / B - 0.5)), y0 = Math.floor(fy), y1 = Math.min(gh - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < W; x++) {
      const fx = Math.min(gw - 1, Math.max(0, x / B - 0.5)), x0 = Math.floor(fx), x1 = Math.min(gw - 1, x0 + 1), tx = fx - x0;
      const bg = (g2[y0 * gw + x0] * (1 - tx) + g2[y0 * gw + x1] * tx) * (1 - ty) + (g2[y1 * gw + x0] * (1 - tx) + g2[y1 * gw + x1] * tx) * ty;
      ratio[y * W + x] = lum[y * W + x] / Math.max(40, bg);
    }
  }
  return { W, H, data, ratio };
}
export function hasilFoto(pre, { peka = 0.8, warna = "asli" } = {}) {
  const { W, H, data, ratio } = pre, N = W * H, a = new Uint8ClampedArray(N), lebar = 0.17;
  const mx = Math.round(W * 0.02), my = Math.round(H * 0.02);
  for (let y = my; y < H - my; y++) for (let x = mx; x < W - mx; x++) { const i = y * W + x, v = (peka - ratio[i]) / lebar; if (v > 0) a[i] = v >= 1 ? 255 : v * 255; }
  // buang bintik/noda kecil (komponen terhubung yang terlalu kecil)
  const lab = new Int32Array(N), st = new Int32Array(N), minA = Math.max(14, Math.round(N * 0.00003)); let id = 0;
  for (let i = 0; i < N; i++) {
    if (!a[i] || lab[i]) continue; id++; let sp = 0, kuat = 0, cnt = 0; st[sp++] = i; lab[i] = id; const anggota = [];
    while (sp) { const p = st[--sp]; anggota.push(p); cnt++; if (a[p] > 110) kuat++; const x = p % W, y = (p / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (a[q] && !lab[q]) { lab[q] = id; st[sp++] = q; } } }
    if (kuat < minA) for (const p of anggota) a[p] = 0;
  }
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a[y * W + x] > 50) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const pad = 8; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, c = document.createElement("canvas"); c.width = cw; c.height = ch;
  const g = c.getContext("2d"), out = g.createImageData(cw, ch), tetap = TINTA[warna];
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = (y + y0) * W + (x + x0), o = 4 * (y * cw + x);
    if (tetap) { out.data[o] = tetap[0]; out.data[o + 1] = tetap[1]; out.data[o + 2] = tetap[2]; }
    else { out.data[o] = data[4 * i] * 0.78; out.data[o + 1] = data[4 * i + 1] * 0.78; out.data[o + 2] = data[4 * i + 2] * 0.82; }
    out.data[o + 3] = a[i];
  }
  g.putImageData(out, 0, 0);
  if (cw <= 1000) return { img: c.toDataURL("image/png"), w: cw, h: ch };
  const k = 1000 / cw, c2 = document.createElement("canvas"); c2.width = 1000; c2.height = Math.round(ch * k); c2.getContext("2d").drawImage(c, 0, 0, c2.width, c2.height);
  return { img: c2.toDataURL("image/png"), w: c2.width, h: c2.height };
}

function FotoTtd({ file, onSimpan, onBatal, onGanti }) {
  const [pre, setPre] = useState(null), [err, setErr] = useState(""), [peka, setPeka] = useState(0.8), [warna, setWarna] = useState("asli"), [hasil, setHasil] = useState(undefined), [busy, setBusy] = useState(false);
  useEffect(() => { kunciLayar(true); return () => kunciLayar(false); }, []);
  useEffect(() => { let hidup = true; setPre(null); setErr(""); setHasil(undefined); bacaFoto(file).then(d => hidup && setPre(siapkanFoto(d))).catch(e => hidup && setErr(e.message)); return () => (hidup = false); }, [file]);
  useEffect(() => { if (!pre) return; const t = setTimeout(() => setHasil(hasilFoto(pre, { peka, warna })), 60); return () => clearTimeout(t); }, [pre, peka, warna]);
  return createPortal(html`<div class="pad-lb" role="dialog" aria-label="Atur tanda tangan dari foto"><div class="pad-box">
    <div class="pad-top"><button type="button" class="pad-tx" onClick=${onBatal}>Batal</button><b>Tanda tangan dari foto</b>
      <button type="button" class="pad-ok" disabled=${!hasil || busy} onClick=${async () => { setBusy(true); await onSimpan(hasil, "foto"); setBusy(false); }}>${busy ? "Menyimpan…" : "Simpan"}</button></div>
    <div class="pad-area foto">${err ? html`<p class="pad-hint">${err}</p>` : !pre || hasil === undefined ? html`<p class="pad-hint"><i class="spin"></i>Memproses foto…</p>`
      : hasil ? html`<img src=${hasil.img} alt="Hasil tanda tangan tanpa latar" />` : html`<p class="pad-hint">Tinta tidak terdeteksi.<small>Geser "Kepekaan" ke kanan, atau foto ulang lebih dekat dengan cahaya terang.</small></p>`}</div>
    <div class="pad-bawah">
      <label class="pad-slide"><span>Kepekaan tinta</span><input type="range" min="0.6" max="0.95" step="0.01" value=${peka} onInput=${e => setPeka(+e.target.value)} aria-label="Kepekaan tinta" /><small>${peka < 0.74 ? "Hanya tinta pekat" : peka > 0.86 ? "Ikut goresan tipis" : "Seimbang"}</small></label>
      <div class="pad-grp" role="group" aria-label="Warna tinta">${[["asli", "Asli"], ["biru", "Biru"], ["hitam", "Hitam"]].map(([k, t]) => html`<button type="button" class=${"pad-chip" + (warna === k ? " on" : "")} aria-pressed=${warna === k} onClick=${() => setWarna(k)}>${k !== "asli" ? html`<i style=${`background:${rgb(TINTA[k])}`}></i>` : null}${t}</button>`)}
        <button type="button" class="pad-chip" onClick=${onGanti}><${Icon} n="camera" s=${16} />Foto ulang</button></div></div>
  </div></div>`, document.body);
}

const PAKAI = {
  musyrif: "Rapor tengah & akhir semester (Wali Asrama)",
  mudir: "Rapor dan surat pemberitahuan, SP, skorsing, pengembalian (Mengetahui/Memutuskan, Mudir)",
  wadir_kesantrian: "Surat izin keluar/pulang, BAP, surat pemberitahuan, SP, skorsing, pengembalian",
  wadir_kurikulum: "Rekap KBM, rekap kelas, dan rekap nilai (PDF)",
  wadir_tahfidz: "Rekap tahfidz dan perolehan hafalan (PDF)",
};
export function TandaTangan() {
  useApp();
  const m = me(), t = m && get("ttd", m.id), [mode, setMode] = useState(null), [file, setFile] = useState(null), [ask, setAsk] = useState(false), fRef = useRef(null), kRef = useRef(null);
  if (!m) return null;
  const simpan = async (r, cara) => {
    if (!r) return;
    if (await put("ttd", m.id, { img: r.img, w: r.w, h: r.h, cara, ts: Date.now() })) { logUbah("ubah", "ttd", m.id, `Tanda tangan ${m.pendek} ${t ? "diganti" : "ditambahkan"}`, null); toast("Tanda tangan tersimpan. Otomatis dipakai di dokumen."); setMode(null); setFile(null); }
  };
  const hapus = async () => { setAsk(false); await del("ttd", m.id); logUbah("hapus", "ttd", m.id, `Tanda tangan ${m.pendek} dihapus`, null); toast("Tanda tangan dihapus"); };
  const pilih = e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) { setFile(f); setMode("foto"); } };
  const pakai = m.roles.filter(r => PAKAI[r]).map(r => PAKAI[r]);
  return html`<${SubHeader} title="Tanda Tangan" sub="Dipakai otomatis di rapor & surat" />
    <div class="wrap">
      <div class="ttd-kertas">${t ? html`<img src=${t.img} alt=${"Tanda tangan " + m.nama} />` : html`<p><${Icon} n="pen" s=${28} /><b>Belum ada tanda tangan</b><small>Tulis langsung di layar atau foto dari kertas</small></p>`}
        <div class="ttd-nama"><span>( ${m.nama.replace(/^Ust(dzh)?\.\s*/, "")} )</span><small>${jabatanTtd(m)}</small></div></div>
      ${t ? html`<p class="small center" style="margin:6px 0 0">${t.cara === "foto" ? "Dari foto kertas" : "Ditulis di layar"} · diperbarui ${L.fmtTgl(L.ymd(new Date(t.ts)))}</p>` : null}
      <div class="btn-stack mt12">
        <${Btn} icon="pen" onClick=${() => setMode("tulis")}>${t ? "Tulis ulang di layar" : "Tulis di layar"}</${Btn}>
        <${Btn} kind="ghost" icon="camera" onClick=${() => kRef.current.click()}>Foto tanda tangan di kertas</${Btn}>
        <button type="button" class="link center" style="min-height:40px" onClick=${() => fRef.current.click()}>Pilih foto dari galeri</button>
        ${t ? html`<button type="button" class="link center" style="min-height:40px;color:#A8261C" onClick=${() => setAsk(true)}>Hapus tanda tangan</button>` : null}</div>
      <input ref=${kRef} type="file" accept="image/*" capture="environment" hidden onChange=${pilih} />
      <input ref=${fRef} type="file" accept="image/*" hidden onChange=${pilih} />
      <${Hint}>Tips foto: tanda tangani kertas putih polos dengan pulpen, foto lurus dari atas di tempat terang tanpa bayangan. Latar kertas dihapus otomatis.</${Hint}>
      ${pakai.length ? html`<${Section} t="Otomatis dipakai di" /><${Card}><div class="list">${pakai.map(p => html`<div class="row"><span class="av green"><${Icon} n="check" s=${18} /></span><span class="row-t"><b style="font-weight:600">${p}</b></span></div>`)}</div></${Card}>` : null}
      <p class="small center mt8">Tanda tangan hanya bisa diubah dari akun Anda sendiri. Setiap perubahan tercatat di Log perubahan.</p></div>
    ${mode === "tulis" ? html`<${PadTtd} onSimpan=${simpan} onBatal=${() => setMode(null)} />` : null}
    ${mode === "foto" && file ? html`<${FotoTtd} file=${file} onSimpan=${simpan} onBatal=${() => { setMode(null); setFile(null); }} onGanti=${() => kRef.current.click()} />` : null}
    <${Confirm} open=${ask} danger title="Hapus tanda tangan?" text="Dokumen berikutnya akan tampil tanpa tanda tangan sampai Anda menambahkannya lagi." yes="Hapus" onYes=${hapus} onNo=${() => setAsk(false)} />`;
}
