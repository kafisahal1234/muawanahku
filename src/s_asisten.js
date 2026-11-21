// Asisten AI bergaya Gemini: percakapan berlanjut, jawaban mengalir, lampiran foto/berkas, salin/bagikan/ulangi,
// dan riwayat percakapan tersimpan di perangkat (per akun). Data yang dibaca AI dibatasi sesuai hak akses akun.
import { useState, useRef, useEffect } from "preact/hooks";
import { html, nav, useApp, Icon, SubHeader, Sheet, Confirm, SearchBox } from "./ui.js";
import { toast, uid } from "./store.js";
import * as L from "./logic.js";
import { me, compressImage, FotoBesar } from "./common.js";
import { ngobrolAI, aiAda, aiNama } from "./ai.js";
import { TeksAI, teksPolos } from "./s_ai.js";
import { bacaBerkas, TERIMA } from "./berkas.js";
import { konteksAkun, PANDUAN } from "./ai_konteks.js";

// ---------- penyimpanan riwayat percakapan (localStorage, per akun) ----------
const kunci = () => "mk_ai_chat_" + (nav.user ? (nav.user.kind === "wali" ? "s_" : "") + nav.user.id : "x");
export function muatChat() { try { const v = JSON.parse(localStorage.getItem(kunci()) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function tulisChat(list) {
  let l = list.slice(0, 60);
  for (let n = 0; n < 8; n++) {
    try { localStorage.setItem(kunci(), JSON.stringify(l)); return; } catch (e) {
      // penuh: buang foto pada percakapan terlama dulu, lalu percakapan terlama
      const i = [...l].reverse().findIndex(c => c.msgs.some(m => m.img && m.img.length));
      if (i >= 0) { const k = l.length - 1 - i; l[k] = { ...l[k], msgs: l[k].msgs.map(m => (m.img ? { ...m, img: [], imgHilang: m.img.length } : m)) }; }
      else l = l.slice(0, Math.max(1, l.length - 5));
    }
  }
}
function simpanPercakapan(id, msgs) {
  const list = muatChat().filter(c => c.id !== id), pertama = msgs.find(m => m.r === "u");
  if (!pertama) return tulisChat(list);
  const judul = (pertama.t || (pertama.img && pertama.img.length ? "Foto" : pertama.file ? pertama.file[0].nama : "Percakapan")).replace(/\s+/g, " ").slice(0, 70);
  tulisChat([{ id, judul, ts: Date.now(), msgs: msgs.filter(m => !m.stream) }, ...list]);
}
const sesiKey = () => "mk_ai_buka_" + (nav.user && nav.user.id);

// ---------- saran pertanyaan sesuai peran ----------
function saranPeran() {
  if (nav.user && nav.user.kind === "wali") return ["Bagaimana perkembangan hafalan anak saya bulan ini?", "Apa yang bisa saya lakukan agar hafalannya lebih lancar?", "Bagaimana cara mengajukan izin?", "Bantu saya menulis pesan untuk wali asrama"];
  const r = (me() || { roles: [] }).roles, s = [];
  if (r.some(x => ["mudir", "admin"].includes(x))) s.push("Ringkas kondisi pondok pekan ini: guru, halaqah, asrama, kesantrian");
  if (r.includes("wadir_kurikulum")) s.push("Guru mana yang perlu perhatian khusus pekan ini?", "Kelas dan mapel mana yang nilainya banyak di bawah KKM?", "Apakah KBM hari ini sudah terlaksana semua?");
  if (r.includes("wadir_tahfidz")) s.push("Halaqah mana yang absennya paling rendah bulan ini?", "Siapa santri yang ziyadah bulan ini paling sedikit?");
  if (r.includes("wadir_kesantrian")) s.push("Santri mana yang terlambat kembali dari izin?", "Rangkum pelanggaran bulan ini");
  if (r.includes("guru_tahfidz")) s.push("Siapa santri halaqah saya yang belum setor hari ini?", "Rangkum perolehan hafalan halaqah saya bulan ini");
  if (r.includes("musyrif")) s.push("Bagaimana MOTD dan mutaba'ah asrama saya pekan ini?", "Siapa santri asrama saya yang sering alpa atau masbuq?");
  if (r.includes("guru_mapel")) s.push("Nilai kelas saya yang belum lengkap apa saja?");
  s.push("Bantu buatkan pengumuman untuk wali santri", "Bagaimana cara mengoreksi input yang salah?");
  return [...new Set(s)].slice(0, 6);
}

// ---------- utilitas ----------
async function salin(t) {
  const x = teksPolos(t);
  try { await navigator.clipboard.writeText(x); } catch (e) { const a = document.createElement("textarea"); a.value = x; a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); } catch (e2) { } a.remove(); }
  toast("Disalin");
}
const bisaBagikan = () => typeof navigator !== "undefined" && !!navigator.share;
const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const jamPendek = ts => new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");
function tglRiwayat(ts) {
  const d = new Date(ts), t = L.today(), y = L.ymd(d);
  if (y === t) return "Hari ini " + jamPendek(ts);
  if (y === L.addDays(t, -1)) return "Kemarin " + jamPendek(ts);
  return L.fmtShort(y) + " " + jamPendek(ts);
}

function Pesan({ m, akhirAI, akhirUser, onUlang, onUbah }) {
  const [besar, setBesar] = useState(null);
  if (m.r === "u") return html`<div class="cm cm-u">
      ${m.img && m.img.length ? html`<div class="cm-img">${m.img.map(src => html`<button type="button" onClick=${() => setBesar(src)}><img src=${src} alt="Foto terlampir" /></button>`)}</div>` : null}
      ${m.imgHilang ? html`<small class="cm-note">${m.imgHilang} foto tidak disimpan (memori penuh)</small>` : null}
      ${m.file && m.file.length ? html`<div class="cm-files">${m.file.map(f => html`<span class="cm-file"><${Icon} n="file" s=${16} />${f.nama}</span>`)}</div>` : null}
      ${m.t ? html`<div class="bubble me">${m.t}</div>` : null}
      <div class="cm-act right">${m.t ? html`<button type="button" aria-label="Salin pertanyaan" onClick=${() => salin(m.t)}><${Icon} n="copy" s=${16} /></button>` : null}
        ${akhirUser && onUbah ? html`<button type="button" aria-label="Ubah pertanyaan" onClick=${onUbah}><${Icon} n="pen" s=${16} /></button>` : null}</div>
      ${besar ? html`<${FotoBesar} src=${besar} onClose=${() => setBesar(null)} />` : null}</div>`;
  return html`<div class="cm cm-a"><span class="cm-av"><${Icon} n="sparkle" s=${18} /></span><div class="cm-body">
      ${m.err ? html`<div class="bubble ai err">${m.t}</div>` : html`<div class=${"ai-jawab" + (m.stream ? " mengalir" : "")}><${TeksAI} t=${m.t} /></div>`}
      ${m.stream ? null : html`<div class="cm-act">
        ${m.err ? null : html`<button type="button" onClick=${() => salin(m.t)}><${Icon} n="copy" s=${16} /><span>Salin</span></button>`}
        ${!m.err && bisaBagikan() ? html`<button type="button" onClick=${() => navigator.share({ text: teksPolos(m.t) }).catch(() => { })}><${Icon} n="share" s=${16} /><span>Bagikan</span></button>` : null}
        ${akhirAI && onUlang ? html`<button type="button" onClick=${onUlang}><${Icon} n="repeat" s=${16} /><span>${m.err ? "Coba lagi" : "Ulangi"}</span></button>` : null}
        ${m.berhenti ? html`<small class="cm-note">Dihentikan</small>` : null}</div>`}</div></div>`;
}

function RiwayatChat({ open, onClose, aktif, onBuka }) {
  const [q, setQ] = useState(""), [hapus, setHapus] = useState(null), [, ulang] = useState(0);
  if (!open) return null;
  const list = muatChat().filter(c => !q || (c.judul + " " + c.msgs.map(m => m.t).join(" ")).toLowerCase().includes(q.toLowerCase()));
  const lakukan = () => { if (hapus === "semua") tulisChat([]); else tulisChat(muatChat().filter(c => c.id !== hapus)); if (hapus === "semua" || hapus === aktif) onBuka(null); setHapus(null); ulang(x => x + 1); toast("Riwayat dihapus"); };
  return html`<${Sheet} open title="Riwayat percakapan" onClose=${onClose}>
    <button type="button" class="rc-baru" onClick=${() => onBuka(null)}><${Icon} n="newchat" s=${20} /><span>Percakapan baru</span></button>
    ${muatChat().length > 3 ? html`<${SearchBox} value=${q} onInput=${setQ} ph="Cari di riwayat" />` : null}
    ${list.length ? html`<div class="rc-list">${list.map(c => html`<div class=${"rc-row" + (c.id === aktif ? " on" : "")}>
        <button type="button" class="rc-buka" onClick=${() => onBuka(c.id)}><${Icon} n="chat" s=${18} /><span><b>${c.judul}</b><small>${tglRiwayat(c.ts)} · ${c.msgs.filter(m => m.r === "u").length} pertanyaan</small></span></button>
        <button type="button" class="rc-del" aria-label=${"Hapus " + c.judul} onClick=${() => setHapus(c.id)}><${Icon} n="trash" s=${18} /></button></div>`)}</div>
      <button type="button" class="link rc-all" onClick=${() => setHapus("semua")}>Hapus semua riwayat</button>`
      : html`<p class="small center" style="padding:18px 0">${q ? "Tidak ditemukan." : "Belum ada percakapan tersimpan."}</p>`}
    <p class="small center" style="margin:10px 0 0">Riwayat tersimpan di perangkat ini, khusus akun Anda.</p>
    <${Confirm} open=${!!hapus} danger title=${hapus === "semua" ? "Hapus semua riwayat?" : "Hapus percakapan ini?"} text="Percakapan yang dihapus tidak bisa dikembalikan." yes="Hapus" onYes=${lakukan} onNo=${() => setHapus(null)} /></${Sheet}>`;
}

export function Asisten() {
  useApp();
  const wali = nav.user && nav.user.kind === "wali", ada = aiAda();
  const [cid, setCid] = useState(() => { const id = sessionStorage.getItem(sesiKey()); return id && muatChat().some(c => c.id === id) ? id : null; });
  const [msgs, setMsgs] = useState(() => (cid && (muatChat().find(c => c.id === cid) || {}).msgs) || []);
  const [q, setQ] = useState(""), [busy, setBusy] = useState(false), [lamp, setLamp] = useState([]), [baca, setBaca] = useState(0);
  const [menu, setMenu] = useState(false), [riw, setRiw] = useState(false), [dengar, setDengar] = useState(false);
  const stopRef = useRef(false), akhir = useRef(null), inp = useRef(null), fKam = useRef(null), fGal = useRef(null), fDok = useRef(null), rec = useRef(null), ikuti = useRef(true);
  useEffect(() => { try { cid ? sessionStorage.setItem(sesiKey(), cid) : sessionStorage.removeItem(sesiKey()); } catch (e) { } }, [cid]);
  useEffect(() => { if (akhir.current && ikuti.current) akhir.current.scrollIntoView({ behavior: busy ? "auto" : "smooth", block: "end" }); }, [msgs, busy]);
  useEffect(() => { const f = () => { ikuti.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160; }; addEventListener("scroll", f, { passive: true }); return () => { removeEventListener("scroll", f); if (rec.current) try { rec.current.stop(); } catch (e) { } }; }, []);
  const tinggi = el => { if (!el) return; el.style.height = "auto"; el.style.height = Math.min(140, el.scrollHeight) + "px"; };
  useEffect(() => tinggi(inp.current), [q]);

  const tambahBerkas = async files => {
    setMenu(false);
    const arr = [...(files || [])].slice(0, Math.max(0, 6 - lamp.length)); if (!arr.length) return;
    if (files.length > arr.length) toast("Maksimal 6 lampiran per pesan.", "err");
    setBaca(n => n + arr.length);
    for (const f of arr) {
      try {
        const b = await bacaBerkas(f), gambar = /^image\//.test(f.type) || b.jenis === "gambar";
        const thumb = gambar ? await compressImage(f, 360, 0.7) : null;
        setLamp(l => [...l, { id: uid("f"), nama: b.nama, gambar, thumb, teks: b.teks || "", berkas: b.berkas || [] }]);
      } catch (e) { toast(e.message || "Berkas tidak bisa dibaca.", "err"); }
      finally { setBaca(n => n - 1); }
    }
  };
  const tempel = e => { const fs = [...((e.clipboardData && e.clipboardData.files) || [])].filter(f => /^image\//.test(f.type)); if (fs.length) { e.preventDefault(); tambahBerkas(fs); } };

  const jalankan = async (riwayatMsgs, userMsg, lampiran) => {
    const id = cid || uid("c"); if (!cid) setCid(id);
    const awal = [...riwayatMsgs, userMsg], idA = uid("m");
    setMsgs([...awal, { id: idA, r: "a", t: "", stream: true, ts: Date.now() }]); setBusy(true); stopRef.current = false; ikuti.current = true;
    let hasil;
    try {
      const k = konteksAkun();
      const sistem = `Kamu "Asisten MuawanahKu", asisten AI (seperti Gemini) di aplikasi Pondok Tahfidz Modern Kampung Qur'an Al Muawanah, Kota Metro, Lampung. Jawab dalam Bahasa Indonesia yang santun dan hangat. Jawaban jelas dan langsung ke inti; rapikan dengan **tebal**, butir "- ", daftar bernomor, dan tabel Markdown bila membandingkan beberapa orang/angka. Pengguna: ${k.nama} (${k.peran}). ${k.aturan} Jangan mengarang data. Bila pengguna melampirkan foto atau berkas, baca isinya dengan teliti (misalnya jadwal, daftar nilai, surat, tulisan tangan) lalu kerjakan permintaannya. Untuk pertanyaan agama, jawab secara umum dan sarankan bertanya kepada ustadz untuk fatwa. Jangan meminta kata sandi.\n\n${PANDUAN}\n\n=== DATA YANG BISA DILIHAT AKUN INI (dibaca langsung dari aplikasi, ${L.fmtTgl(L.today())} pukul ${jamPendek(Date.now())}) ===\n${k.data}`;
      const riwayat = riwayatMsgs.filter(m => !m.err && (m.t || m.img || m.file)).slice(-16).map(m => ({ r: m.r, t: (m.t || "") + (m.img && m.img.length ? `\n[melampirkan ${m.img.length} foto]` : "") + (m.file && m.file.length ? `\n[melampirkan berkas: ${m.file.map(f => f.nama).join(", ")}]` : "") }));
      const teksBerkas = lampiran.filter(x => x.teks).map(x => `\n\n[Isi berkas "${x.nama}"]\n${x.teks.slice(0, 40000)}`).join("");
      const teks = (userMsg.t || (lampiran.length ? "Tolong baca lampiran ini dan jelaskan isinya." : "")) + teksBerkas;
      const t = await ngobrolAI({ sistem, riwayat, teks, berkas: lampiran.flatMap(x => x.berkas), berhenti: () => stopRef.current,
        onTeks: s => setMsgs(ms => ms.map(m => (m.id === idA ? { ...m, t: s } : m))) });
      hasil = { id: idA, r: "a", t: t || (stopRef.current ? "" : "Maaf, AI tidak memberi jawaban. Coba ubah pertanyaannya."), ts: Date.now(), ...(stopRef.current ? { berhenti: true } : {}), ...(!t && !stopRef.current ? { err: true } : {}) };
    } catch (e) { hasil = { id: idA, r: "a", t: e.message || "Maaf, AI sedang tidak bisa menjawab.", err: true, ts: Date.now() }; }
    if (stopRef.current && !hasil.t) hasil = { ...hasil, t: "_Jawaban dihentikan._" };
    const akhirMsgs = [...awal, hasil];
    setMsgs(akhirMsgs); setBusy(false); simpanPercakapan(id, akhirMsgs);
  };
  const kirim = async teks => {
    const t = (teks != null ? teks : q).trim();
    if ((!t && !lamp.length) || busy || baca) return;
    if (dengar && rec.current) try { rec.current.stop(); } catch (e) { }
    const lampiran = lamp, userMsg = { id: uid("m"), r: "u", t, ts: Date.now(), ...(lampiran.some(x => x.thumb) ? { img: lampiran.filter(x => x.thumb).map(x => x.thumb) } : {}), ...(lampiran.some(x => !x.gambar) ? { file: lampiran.filter(x => !x.gambar).map(x => ({ nama: x.nama })) } : {}) };
    setQ(""); setLamp([]);
    await jalankan(msgs, userMsg, lampiran);
  };
  const ulangi = () => { const i = msgs.map(m => m.r).lastIndexOf("u"); if (i < 0 || busy) return; jalankan(msgs.slice(0, i), msgs[i], []); };
  const ubah = () => { const i = msgs.map(m => m.r).lastIndexOf("u"); if (i < 0 || busy) return; setQ(msgs[i].t || ""); const sisa = msgs.slice(0, i); setMsgs(sisa); if (cid) simpanPercakapan(cid, sisa); setTimeout(() => inp.current && inp.current.focus(), 50); };
  const baru = () => { if (busy) stopRef.current = true; setCid(null); setMsgs([]); setLamp([]); setQ(""); setRiw(false); };
  const buka = id => { if (!id) return baru(); const c = muatChat().find(x => x.id === id); if (c) { setCid(id); setMsgs(c.msgs); setLamp([]); setRiw(false); ikuti.current = true; } };
  const mic = () => {
    if (dengar && rec.current) { try { rec.current.stop(); } catch (e) { } return; }
    const r = new SR(); rec.current = r; r.lang = "id-ID"; r.interimResults = true; r.continuous = false;
    const dasar = q ? q.replace(/\s*$/, " ") : "";
    r.onresult = e => setQ(dasar + [...e.results].map(x => x[0].transcript).join(""));
    r.onerror = e => { if (e.error !== "aborted" && e.error !== "no-speech") toast("Mikrofon tidak bisa dipakai.", "err"); };
    r.onend = () => setDengar(false);
    try { r.start(); setDengar(true); } catch (e) { toast("Mikrofon tidak bisa dipakai.", "err"); }
  };

  const m0 = me(), sapa = wali ? "Bapak/Ibu" : (m0 ? m0.pendek : "");
  const iU = msgs.map(m => m.r).lastIndexOf("u"), iA = msgs.map(m => m.r).lastIndexOf("a"), adaIsi = q.trim() || lamp.length;
  return html`<${SubHeader} title="Asisten AI" sub=${ada ? `${aiNama()} · membaca data sesuai akun Anda` : "Tersedia di versi online"}
      right=${html`<div class="ch-act"><button type="button" class="hdr-btn" aria-label="Riwayat percakapan" onClick=${() => setRiw(true)}><${Icon} n="clock" s=${21} /></button>
        <button type="button" class="hdr-btn" aria-label="Percakapan baru" onClick=${baru} disabled=${!msgs.length && !busy}><${Icon} n="newchat" s=${21} /></button></div>`} />
    <div class="wrap chat">
      ${!msgs.length ? html`<div class="chat-hero"><span class="ai-ic big"><${Icon} n="sparkle" s=${26} /></span>
          <h2><span>Assalamu'alaikum${sapa ? ", " + sapa : ""}</span>Ada yang bisa dibantu?</h2>
          <p>${wali ? "Tanyakan perkembangan ananda, cara memakai aplikasi, atau kirim foto untuk dibaca." : "Saya membaca data yang bisa dilihat akun Anda: santri, guru, halaqah, asrama, nilai, izin, dan lainnya. Bisa juga membaca foto dan dokumen."}</p>
          <div class="chat-saran">${saranPeran().map(s => html`<button type="button" disabled=${!ada} onClick=${() => kirim(s)}><${Icon} n="sparkle" s=${16} /><span>${s}</span></button>`)}</div>
          ${muatChat().length ? html`<button type="button" class="link" style="margin-top:6px" onClick=${() => setRiw(true)}>Lihat riwayat percakapan (${muatChat().length})</button>` : null}</div>` : null}
      ${msgs.map((m, i) => html`<${Pesan} key=${m.id || i} m=${m} akhirAI=${i === iA && i === msgs.length - 1 && !busy} akhirUser=${i === iU && !busy} onUlang=${ulangi} onUbah=${ubah} />`)}
      ${busy && msgs[msgs.length - 1] && msgs[msgs.length - 1].stream && !msgs[msgs.length - 1].t ? html`<div class="cm cm-a"><span class="cm-av muter"><${Icon} n="sparkle" s=${18} /></span><div class="bubble ai typing"><i></i><i></i><i></i></div></div>` : null}
      <div ref=${akhir} style="height:4px"></div>
      ${msgs.length ? html`<p class="ai-catat" style="text-align:center">Jawaban AI bisa keliru. Periksa kembali hal penting.</p>` : null}</div>
    <div class="chat-dock">
      ${lamp.length || baca ? html`<div class="lamp-row">${lamp.map(x => html`<span class=${"lamp" + (x.thumb ? " foto" : "")}>${x.thumb ? html`<img src=${x.thumb} alt="" />` : html`<${Icon} n="file" s=${18} /><em>${x.nama}</em>`}
          <button type="button" aria-label=${"Hapus lampiran " + x.nama} onClick=${() => setLamp(l => l.filter(y => y.id !== x.id))}><${Icon} n="x" s=${14} w=${2.6} /></button></span>`)}
          ${baca ? html`<span class="lamp baca"><i class="spin"></i><em>Membaca…</em></span>` : null}</div>` : null}
      ${menu ? html`<div class="lamp-menu" role="menu">
          <button type="button" role="menuitem" onClick=${() => fKam.current.click()}><${Icon} n="camera" s=${20} /><span>Kamera</span></button>
          <button type="button" role="menuitem" onClick=${() => fGal.current.click()}><${Icon} n="image" s=${20} /><span>Foto</span></button>
          <button type="button" role="menuitem" onClick=${() => fDok.current.click()}><${Icon} n="file" s=${20} /><span>Dokumen (PDF, Word, Excel)</span></button></div>` : null}
      <form class="chat-bar" onSubmit=${e => { e.preventDefault(); kirim(); }}>
        <button type="button" class=${"cb-plus" + (menu ? " on" : "")} aria-label="Tambah foto atau berkas" aria-expanded=${menu} disabled=${!ada || busy} onClick=${() => setMenu(!menu)}><${Icon} n="plus" s=${22} w=${2.2} /></button>
        <textarea ref=${inp} rows="1" class="in" value=${q} placeholder=${!ada ? "AI belum tersedia" : dengar ? "Mendengarkan…" : "Tanya Asisten AI"} disabled=${!ada} onPaste=${tempel} onFocus=${() => setMenu(false)}
          onInput=${e => { setQ(e.target.value); tinggi(e.target); }} onKeyDown=${e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && matchMedia("(pointer:fine)").matches) { e.preventDefault(); kirim(); } }}></textarea>
        ${busy ? html`<button type="button" class="chat-send stop" aria-label="Hentikan jawaban" onClick=${() => (stopRef.current = true)}><${Icon} n="stop" s=${18} w=${2.6} /></button>`
          : !adaIsi && SR && ada ? html`<button type="button" class=${"chat-send mic" + (dengar ? " on" : "")} aria-label=${dengar ? "Berhenti mendengarkan" : "Bicara"} onClick=${mic}><${Icon} n="mic" s=${21} /></button>`
          : html`<button type="submit" class="chat-send" aria-label="Kirim" disabled=${!adaIsi || !!baca || !ada}><${Icon} n="send" s=${21} /></button>`}
      </form>
      <input ref=${fKam} type="file" accept="image/*" capture="environment" hidden onChange=${e => { tambahBerkas(e.target.files); e.target.value = ""; }} />
      <input ref=${fGal} type="file" accept="image/*" multiple hidden onChange=${e => { tambahBerkas(e.target.files); e.target.value = ""; }} />
      <input ref=${fDok} type="file" accept=${TERIMA} multiple hidden onChange=${e => { tambahBerkas(e.target.files); e.target.value = ""; }} />
    </div>
    <${RiwayatChat} open=${riw} aktif=${cid} onClose=${() => setRiw(false)} onBuka=${buka} />`;
}
export function KartuAsisten() {
  if (!aiAda()) return null;
  const wali = nav.user && nav.user.kind === "wali";
  return html`<button class="asisten-cta" onClick=${() => nav.go("asisten")}><span class="ai-ic"><${Icon} n="sparkle" s=${20} /></span>
    <span><b>Tanya Asisten AI</b><small>${wali ? "Perkembangan ananda, kirim foto, cara pakai aplikasi" : "Baca data akun Anda, kirim foto/dokumen, bantu menulis"}</small></span><${Icon} n="chev" s=${18} /></button>`;
}
