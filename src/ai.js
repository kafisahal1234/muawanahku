// Mesin AI aplikasi.
// - Di GitHub Pages: Gemini lewat Firebase AI Logic (tanpa kunci rahasia di kode; kuota gratis paket Spark).
// - Di artifact Claude: Claude lewat kapabilitas "sample".
// Semua fitur AI memanggil tanyaAI(); hasil AI selalu ditampilkan dulu untuk diperiksa sebelum disimpan.
import { S } from "./store.js";
import { firebaseApp, V, imp } from "./cloud.js";

const MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-2.5-flash"];
const LS = "mk_ai_model";
let sampleP = null, aiMod = null;

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
  const m = String((e && (e.message || e.code)) || e || "");
  if (/api-not-enabled|firebasevertexai|SERVICE_DISABLED|has not been used/i.test(m)) return "AI belum diaktifkan di Firebase. Admin perlu membuka Firebase → AI Logic → Get started (pilih Gemini Developer API).";
  if (/app ?check|appcheck|401|UNAUTHENTICATED/i.test(m)) return "AI ditolak App Check. Di Firebase buka Security → App Check → tab APIs, lalu ubah Firebase AI Logic menjadi Unenforced.";
  if (/429|quota|RESOURCE_EXHAUSTED|rate/i.test(m)) return "Kuota AI gratis sedang penuh. Tunggu 1–2 menit lalu coba lagi.";
  if (/not_granted/i.test(m)) return "Izin memakai AI belum diberikan.";
  if (/fetch|network|Failed to fetch|offline/i.test(m)) return "Tidak tersambung ke internet. Periksa koneksi lalu coba lagi.";
  if (/blocked|SAFETY/i.test(m)) return "AI menolak memproses isi ini. Coba ubah kata-katanya.";
  return m.length > 180 ? m.slice(0, 180) + "…" : m || "AI gagal menjawab.";
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
    try {
      const model = ai.getGenerativeModel(inst, { model: m, ...(sistem ? { systemInstruction: sistem } : {}), generationConfig: json ? { responseMimeType: "application/json", temperature: 0.1 } : { temperature: 0.5 } });
      const r = await model.generateContent(parts);
      try { localStorage.setItem(LS, m); } catch (e) { }
      const t = r.response.text();
      return json ? bersihJSON(t) : t.trim();
    } catch (e) {
      akhir = e; const msg = String(e && e.message);
      if (/\b404\b|not found|is not supported|NOT_FOUND|unknown model|deprecated|retired/i.test(msg)) continue;
      throw e;
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

export const SISTEM_DASAR = "Kamu asisten aplikasi MuawanahKu milik Pondok Tahfidz Modern Kampung Qur'an Al Muawanah (Lampung). Jawab dalam Bahasa Indonesia yang baik, santun, dan ringkas. Jangan mengarang data yang tidak diberikan.";
