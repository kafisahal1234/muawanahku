// Mesin AI aplikasi.
// - Di GitHub Pages: Gemini lewat Firebase AI Logic (tanpa kunci rahasia di kode; kuota gratis paket Spark).
// - Di artifact Claude: Claude lewat kapabilitas "sample".
// Semua fitur AI memanggil tanyaAI(); hasil AI selalu ditampilkan dulu untuk diperiksa sebelum disimpan.
import { S } from "./store.js";
import { firebaseApp, V, imp } from "./cloud.js";

const MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-2.5-flash"];
const LS = "mk_ai_model";
let sampleP = null, aiMod = null;
// Kecepatan: model Gemini Flash bawaannya "berpikir" tingkat MEDIUM sebelum menjawab (bisa belasan detik).
// Tanya-jawab & ringkasan cukup tingkat LOW; Gemini 2.5 Flash berpikirnya dimatikan. Impor data (JSON) tetap bawaan agar teliti.
const LS_TOLAK = "mk_ai_pikir_tolak";
const ditolak = m => { try { return (localStorage.getItem(LS_TOLAK) || "").split(",").includes(m); } catch (e) { return false; } };
const catatTolak = m => { try { const l = (localStorage.getItem(LS_TOLAK) || "").split(",").filter(Boolean); if (!l.includes(m)) localStorage.setItem(LS_TOLAK, [...l, m].join(",")); } catch (e) { } };
function cfgPikir(ai, m) {
  if (ditolak(m)) return null;
  const TL = ai.ThinkingLevel || {};
  if (m === "gemini-2.5-flash") return { thinkingBudget: 0 };
  if (/^gemini-3\.\d+-flash$/.test(m)) return { thinkingLevel: TL.LOW || "LOW" };
  return null;
}
const galatPikir = e => /think/i.test(String(e && e.message)) && /\b400\b|INVALID_ARGUMENT|not supported|invalid/i.test(String(e && e.message));
// Muat SDK AI lebih awal (saat layar Asisten dibuka) supaya pertanyaan pertama tidak menunggu unduhan
export function siapkanAI() { try { if (!aiMod && firebaseApp() && !(typeof window !== "undefined" && window.__AI_MOCK)) aiMod = imp(`https://www.gstatic.com/firebasejs/${V}/firebase-ai.js`); } catch (e) { } }

export function aiMesin() {
  if (typeof window !== "undefined" && window.__AI_MOCK) return "mock";
  if (S.mode === "db" && !S.cloud) return "claude";
  if (firebaseApp()) return "gemini";
  return null;
}
export const aiAda = () => !!aiMesin();
export const aiNama = () => ({ claude: "Claude", gemini: "Gemini", mock: "AI" }[aiMesin()] || "AI");

function bersihJSON(t) {
  let s = String(t || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try { return JSON.parse(s); } catch (e) { }
  const a = s.indexOf("{"), b = s.indexOf("["), i = a < 0 ? b : b < 0 ? a : Math.min(a, b);
  const j = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (i >= 0 && j > i) { try { return JSON.parse(s.slice(i, j + 1)); } catch (e) { } }
  throw new Error("Jawaban AI tidak terbaca. Coba ulangi.");
}

function pesanGalat(e) {
  const m = String((e && (e.message || e.code)) || e || ""), st = (m.match(/\[(\d{3})/) || [])[1] || "";
  const kode = st ? ` (kode ${st})` : "";
  if (/app ?check|appcheck|UNAUTHENTICATED/i.test(m) || st === "401") return "AI ditolak App Check" + kode + ". Tutup aplikasi lalu buka lagi; bila masih, tunggu 10 menit (kunci reCAPTCHA baru perlu waktu).";
  if (/api-not-enabled|SERVICE_DISABLED|has not been used|is disabled/i.test(m)) return "AI belum diaktifkan di Firebase" + kode + ". Admin perlu membuka Firebase → AI Logic → Get started (pilih Gemini Developer API).";
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(m)) return "Kuota AI gratis sedang penuh. Tunggu 1–2 menit lalu coba lagi.";
  if (/not_granted/i.test(m)) return "Izin memakai AI belum diberikan.";
  if (st === "403") return "AI ditolak server" + kode + ": " + m.replace(/^.*\]\s*/, "").slice(0, 160);
  if (/Failed to fetch|NetworkError|network|offline/i.test(m)) return "Tidak tersambung ke internet. Periksa koneksi lalu coba lagi.";
  if (/blocked|SAFETY/i.test(m)) return "AI menolak memproses isi ini. Coba ubah kata-katanya.";
  return (m.replace(/https?:\/\/\S+/g, "").slice(0, 200)) || "AI gagal menjawab.";
}

async function viaClaude({ teks, sistem, gambar, json }) {
  if (!sampleP) sampleP = Promise.resolve(window.claude && window.claude.use ? window.claude.use("sample") : null).catch(() => null);
  const sample = await sampleP;
  if (!sample) throw new Error("AI tidak tersedia di tampilan ini.");
  const input = (sistem ? sistem + "\n\n" : "") + teks;
  let imgs = (gambar || []).map(g => g.blob).filter(Boolean);
  if (imgs.length) { try { const lim = await sample.limits(); if (!lim || !lim.images) imgs = []; } catch (e) { imgs = []; } }
  const opts = { modelTier: json ? "default" : "quick", ...(imgs.length ? { images: imgs } : {}) };
  if (json) { const v = await sample.json(input, opts); return typeof v === "string" ? bersihJSON(v) : v; }
  const r = await sample(input, opts); return r.text;
}

async function viaGemini({ teks, sistem, berkas, json }) {
  const app = firebaseApp(); if (!app) throw new Error("Database belum tersambung, AI belum bisa dipakai.");
  if (!aiMod) aiMod = imp(`https://www.gstatic.com/firebasejs/${V}/firebase-ai.js`);
  const ai = await aiMod, inst = ai.getAI(app, { backend: new ai.GoogleAIBackend() });
  const suka = localStorage.getItem(LS), urut = suka ? [suka, ...MODELS.filter(m => m !== suka)] : MODELS;
  const parts = [{ text: teks }, ...(berkas || []).map(b => ({ inlineData: { mimeType: b.mime, data: b.b64 } }))];
  let akhir = null;
  for (const m of urut) {
    const pk = json ? null : cfgPikir(ai, m);
    for (const pakai of pk ? [true, false] : [false]) {
      try {
        const gc = json ? { responseMimeType: "application/json", temperature: 0.1 } : { temperature: 0.5, ...(pakai ? { thinkingConfig: pk } : {}) };
        const model = ai.getGenerativeModel(inst, { model: m, ...(sistem ? { systemInstruction: sistem } : {}), generationConfig: gc });
        const r = await model.generateContent(parts);
        try { localStorage.setItem(LS, m); } catch (e) { }
        const t = r.response.text();
        return json ? bersihJSON(t) : t.trim();
      } catch (e) {
        akhir = e;
        if (pakai && galatPikir(e)) { catatTolak(m); continue; } // model menolak pengaturan berpikir → ulangi tanpa pengaturan
        if (/\b404\b|not found|is not supported|NOT_FOUND|unknown model|deprecated|retired/i.test(String(e && e.message))) break;
        throw e;
      }
    }
  }
  throw akhir || new Error("Model AI tidak ditemukan.");
}

// berkas: [{ mime, b64, blob? }] — dokumen/gambar yang ikut dibaca AI
export async function tanyaAI({ teks, sistem = "", berkas = [], json = false }) {
  const mesin = aiMesin();
  try {
    if (mesin === "mock") { const v = await window.__AI_MOCK({ teks, sistem, berkas, json }); return json && typeof v === "string" ? bersihJSON(v) : v; }
    if (mesin === "claude") return await viaClaude({ teks, sistem, gambar: berkas.filter(b => /^image\//.test(b.mime)), json });
    if (mesin === "gemini") return await viaGemini({ teks, sistem, berkas, json });
    throw new Error("AI hanya tersedia saat aplikasi tersambung ke database (versi online).");
  } catch (e) { console.warn("AI gagal", e); const err = new Error(pesanGalat(e)); err.asli = e; throw err; }
}

// ---------- Percakapan bergaya Gemini: multi-giliran, jawaban mengalir (streaming), bisa dihentikan ----------
// riwayat: [{ r: "u" | "a", t }] (tanpa pesan galat); berkas: lampiran giliran ini; onTeks(teksSejauhIni); berhenti() → true untuk menghentikan
async function chatGemini({ sistem, riwayat, teks, berkas, onTeks, berhenti }) {
  const app = firebaseApp(); if (!app) throw new Error("Database belum tersambung, AI belum bisa dipakai.");
  if (!aiMod) aiMod = imp(`https://www.gstatic.com/firebasejs/${V}/firebase-ai.js`);
  const ai = await aiMod, inst = ai.getAI(app, { backend: new ai.GoogleAIBackend() });
  const contents = [];
  riwayat.forEach(x => { const role = x.r === "u" ? "user" : "model", last = contents[contents.length - 1]; if (last && last.role === role) last.parts[0].text += "\n\n" + x.t; else contents.push({ role, parts: [{ text: x.t }] }); });
  while (contents.length && contents[0].role !== "user") contents.shift();
  const parts = [{ text: teks }, ...(berkas || []).map(b => ({ inlineData: { mimeType: b.mime, data: b.b64 } }))], last = contents[contents.length - 1];
  if (last && last.role === "user") last.parts.push(...parts); else contents.push({ role: "user", parts });
  const suka = localStorage.getItem(LS), urut = suka ? [suka, ...MODELS.filter(m => m !== suka)] : MODELS;
  let akhir = null;
  for (const m of urut) {
    const pk = cfgPikir(ai, m);
    for (const pakai of pk ? [true, false] : [false]) {
      let out = "";
      try {
        const model = ai.getGenerativeModel(inst, { model: m, ...(sistem ? { systemInstruction: sistem } : {}), generationConfig: { temperature: 0.6, ...(pakai ? { thinkingConfig: pk } : {}) } });
        const r = await model.generateContentStream({ contents });
        for await (const ch of r.stream) { if (berhenti && berhenti()) break; let d = ""; try { d = ch.text(); } catch (e) { } if (d) { out += d; onTeks && onTeks(out); } }
        try { localStorage.setItem(LS, m); } catch (e) { }
        return out.trim();
      } catch (e) {
        akhir = e;
        if (out) return out.trim();
        if (pakai && galatPikir(e)) { catatTolak(m); continue; }
        if (/\b404\b|not found|is not supported|NOT_FOUND|unknown model|deprecated|retired/i.test(String(e && e.message))) break;
        throw e;
      }
    }
  }
  throw akhir || new Error("Model AI tidak ditemukan.");
}
export async function ngobrolAI({ sistem = "", riwayat = [], teks, berkas = [], onTeks, berhenti }) {
  const mesin = aiMesin();
  try {
    if (mesin === "gemini") return await chatGemini({ sistem, riwayat, teks, berkas, onTeks, berhenti });
    const datar = riwayat.length ? `Percakapan sebelumnya:\n${riwayat.map(x => `${x.r === "u" ? "Pengguna" : "Asisten"}: ${x.t}`).join("\n")}\n\n` : "";
    let t;
    if (mesin === "mock") t = await window.__AI_MOCK({ teks: datar + "Pertanyaan: " + teks, sistem, berkas, json: false });
    else if (mesin === "claude") t = await viaClaude({ teks: datar + "Pertanyaan: " + teks, sistem, gambar: berkas.filter(b => /^image\//.test(b.mime)) });
    else throw new Error("AI hanya tersedia saat aplikasi tersambung ke database (versi online).");
    onTeks && onTeks(t); return t;
  } catch (e) { console.warn("AI gagal", e); const err = new Error(pesanGalat(e)); err.asli = e; throw err; }
}

export const SISTEM_DASAR = "Kamu asisten aplikasi MuawanahKu milik Pondok Tahfidz Modern Kampung Qur'an Al Muawanah (Lampung). Jawab dalam Bahasa Indonesia yang baik, santun, dan ringkas. Jangan mengarang data yang tidak diberikan.";
