// Asisten AI: tanya-jawab untuk semua akun. Konteks data dibatasi sesuai hak akses akun (wali hanya melihat data ananda).
import { useState, useRef, useEffect } from "preact/hooks";
import { html, nav, useApp, Icon, SubHeader } from "./ui.js";
import { all } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { me } from "./common.js";
import { tanyaAI, aiAda, aiNama } from "./ai.js";
import { dataSantriAI, TeksAI } from "./s_ai.js";

const PANDUAN = `Panduan singkat aplikasi MuawanahKu:
- Navigasi bawah akun ustadz: Beranda (modul sesuai peran), Jadwal (jadwal mengajar/halaqah), Cari (cari santri), Riwayat (input milik sendiri, bisa dikoreksi), Akun (Profil, Keamanan, Log, Keluar).
- Tahfidz (guru tahfidz): absen halaqah per sesi (sesi Shubuh, Dhuha, Malam Senin–Jumat; Sabtu hanya Shubuh; Ahad libur), setoran Ziyadah (hafalan baru, baris), Murojaah/Manzil, Tasmi' per juz. Izin guru ada di dalam modul Tahfidz.
- Mapel (guru mapel): absen kelas & jurnal (Senin–Jumat, Jam 1 10.15–11.45, Jam 2 13.00–14.30), nilai Projek (bisa banyak projek, rapor memakai rata-rata), PTS & PAS, Aspek rapor. Nilai akhir = 10% hadir + 30% projek + 25% PTS + 35% PAS, KKM 70. Izin guru ada di modul Mapel.
- Wali asrama (musyrif): MOTD (absen sholat berjamaah, alpa/masbuq jadi poin), Mutaba'ah harian, izin santri, BAP pelanggaran.
- Wadir Tahfidz: Pengelolaan Tahfidz (Data Awal Hafalan, bisa unggah dokumen dibaca AI; Target hafalan per semester, bawaan 2 juz hafalan baru; Kelola Halaqah; Peringkat; Rekap tasmi').
- Wadir Kurikulum: jadwal mengajar, pengampu, kinerja guru, rekap nilai & kehadiran. Wadir Kesantrian: izin, BAP, rekap kesantrian.
- Admin: Data Master (santri, akun ustadz, asrama, kelas, halaqah, Impor Data santri dari dokumen dengan AI), Kalender akademik & libur pondok, Pengumuman.
- Rekap: harian, pekanan, bulanan, mid, semester, tahunan; hari tanpa input dihitung 0 sehingga persentase turun; bisa diunduh.
- Rapor: tengah semester (1 halaman) dan akhir semester (4 halaman); catatan wali asrama bisa dibuat drafnya dengan AI. Rapor tidak tampil di akun wali.
- Kesalahan input: buka Riwayat → pilih entri → Ubah/Hapus; semua perubahan tercatat di Log.
- Akun wali santri: masuk dengan kode akses (nama panggilan wali + tanggal lahir santri DDMMYYYY). Menu: Beranda, Hafalan, Ananda (profil, foto bisa diganti), Izin, Akun.`;

const LINGKUP_SEMUA = ["mudir", "admin", "wadir_tahfidz", "wadir_kurikulum", "wadir_kesantrian"];
function santriLingkup(m) {
  if (m.roles.some(r => LINGKUP_SEMUA.includes(r))) return L.santriList();
  const o = new Map(), add = l => l.forEach(s => o.set(s.id, s));
  L.ASRAMA.filter(a => a.musyrif === m.id).forEach(a => add(L.santriAsrama(a.id)));
  L.HALAQAH.filter(h => h.guru === m.id).forEach(h => add(L.santriHalaqah(h.id)));
  (m.ajar || []).forEach(([, k]) => add(L.santriKelas(k)));
  return [...o.values()];
}
function barisSantri(s) {
  const h = L.hafalan(s), c = L.capaianJuz(s), kh = L.kehadiranHalaqah(s.id), mp = L.mutPersen(s.id), po = L.poinSantri(s.id);
  return `${s.nama} | kls ${s.kelas} | ${L.asramaAman(s.asrama).nama} | ${L.namaHalaqah(s)} | hafal ${L.fmtJumlah(h)}${h.khatam ? "" : `, sedang Juz ${h.aktif}`} | semester ${c.juz}/${c.target} juz | hadir halaqah ${kh.pct == null ? "-" : kh.pct + "%"} | mutaba'ah ${mp.ibadah == null ? "-" : Math.round((mp.ibadah + mp.adab) / 2) + "%"} | poin ${po.total}`;
}
function konteks() {
  const tgl = L.today(), peng = all("pengumuman").sort((a, b) => b.ts - a.ts).slice(0, 3).map(p => `- ${p.judul}: ${(p.isi || "").slice(0, 200)}`).join("\n") || "-";
  const umum = `Hari ini: ${L.fmtTgl(tgl)}. Target hafalan: ${L.targetSemester()} juz hafalan baru per semester.\nPengumuman terbaru:\n${peng}`;
  if (nav.user && nav.user.kind === "wali") {
    const s = L.santriById(nav.user.id);
    const set = L.setoranSantri(s.id).slice(-8).map(r => `${L.fmtTgl(r.tanggal)}: ${r.jenis}${r.juz ? " juz " + r.juz : ""}${r.baris ? " " + r.baris + " baris" : ""} nilai ${r.nilai}${r.lulus === false ? " (diulang)" : ""}`).join("; ") || "-";
    const iz = all("izin").filter(i => i.santri === s.id).slice(-3).map(i => `${i.jenis} ${L.fmtDT(i.keluar)}–${L.fmtDT(i.kembali)}`).join("; ") || "-";
    return { peran: "wali santri (orang tua)", nama: "Wali dari " + s.nama, aturan: "Pengguna adalah orang tua santri. Hanya bahas santri ini; jangan menyebut atau mengarang data santri lain. Bila ditanya hal yang tidak ada datanya, sarankan menghubungi wali asrama atau kantor pondok.",
      data: `${umum}\n\nData ananda:\n${dataSantriAI(s)}\nSetoran terakhir: ${set}\nIzin terakhir: ${iz}` };
  }
  const m = me(), list = santriLingkup(m), peran = m.roles.map(r => L.ROLE_LABEL[r] || r).join(", ");
  const jad = L.jadwalAll().filter(j => j.guru === m.id).map(j => `${j.hari} ${L.jamById(j.jam).nama} ${L.mapelById(j.mapel).nama} kelas ${j.kelas}`).join("; ") || "-";
  const a = L.asramaOf(m.id), hq = L.halaqahOf(m.id);
  return { peran, nama: m.nama, aturan: "Pengguna adalah ustadz/pengurus pondok. Bantu menjawab pertanyaan tentang data santri dalam lingkup akunnya, cara memakai aplikasi, menyusun kalimat (pengumuman, surat, catatan), dan ide pembinaan. Bila menyebut angka, ambil dari data; bila data tidak ada, katakan terus terang.",
    data: `${umum}\nAsrama binaan: ${a ? a.nama : "-"} · Halaqah: ${hq ? hq.nama : "-"} · Jadwal mengajar: ${jad}\n\nData ${list.length} santri dalam lingkup akun ini (nama | kelas | asrama | halaqah | hafalan | capaian semester | hadir halaqah semester | mutaba'ah semester | poin pelanggaran):\n${list.map(barisSantri).join("\n")}` };
}
const SARAN = {
  wali: ["Bagaimana perkembangan hafalan anak saya?", "Apa yang bisa saya lakukan agar hafalannya lebih lancar?", "Bagaimana cara mengajukan izin?"],
  staf: ["Santri mana yang perlu perhatian khusus?", "Siapa yang capaian hafalan semesternya paling rendah?", "Bagaimana cara mengoreksi input yang salah?", "Buatkan kata-kata motivasi untuk santri"],
};

export function Asisten() {
  useApp();
  const wali = nav.user && nav.user.kind === "wali";
  const [msgs, setMsgs] = useState(() => { try { return JSON.parse(sessionStorage.getItem("mk_chat_" + (nav.user && nav.user.id)) || "[]"); } catch (e) { return []; } });
  const [q, setQ] = useState(""); const [busy, setBusy] = useState(false); const ktx = useRef(null), akhir = useRef(null), inp = useRef(null);
  useEffect(() => { try { sessionStorage.setItem("mk_chat_" + (nav.user && nav.user.id), JSON.stringify(msgs.slice(-30))); } catch (e) { } if (akhir.current) akhir.current.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);
  const kirim = async teks => {
    const t = (teks || q).trim(); if (!t || busy) return;
    const baru = [...msgs, { r: "u", t }]; setMsgs(baru); setQ(""); setBusy(true);
    try {
      if (!ktx.current) ktx.current = konteks();
      const k = ktx.current, riwayat = baru.slice(-10, -1).map(x => `${x.r === "u" ? "Pengguna" : "Asisten"}: ${x.t}`).join("\n");
      const jawab = await tanyaAI({ sistem: `Kamu "Asisten MuawanahKu", asisten AI aplikasi Pondok Tahfidz Modern Kampung Qur'an Al Muawanah. Jawab dalam Bahasa Indonesia yang santun, hangat, dan ringkas (biasanya di bawah 150 kata; boleh butir "- "). Pengguna: ${k.nama} (${k.peran}). ${k.aturan} Jangan mengarang data. Untuk pertanyaan agama, jawab umum dan sarankan bertanya kepada ustadz untuk fatwa. Jangan meminta kata sandi.\n\n${PANDUAN}\n\n${k.data}`,
        teks: (riwayat ? `Percakapan sebelumnya:\n${riwayat}\n\n` : "") + `Pertanyaan: ${t}` });
      setMsgs(m => [...m, { r: "a", t: jawab }]);
    } catch (e) { setMsgs(m => [...m, { r: "a", t: e.message || "Maaf, AI sedang tidak bisa menjawab.", err: true }]); }
    finally { setBusy(false); }
  };
  const saran = wali ? SARAN.wali : SARAN.staf;
  return html`<${SubHeader} title="Asisten AI" sub=${aiAda() ? `${aiNama()} · sesuai akses akun Anda` : "Tersedia di versi online"} right=${msgs.length ? html`<button class="link" style="color:#fff" onClick=${() => { setMsgs([]); ktx.current = null; }}>Baru</button>` : null} />
    <div class="wrap chat">${!msgs.length ? html`<div class="chat-intro"><span class="ai-ic big"><${Icon} n="sparkle" s=${26} /></span><b>Assalamu'alaikum, ada yang bisa dibantu?</b>
        <p>${wali ? "Tanyakan perkembangan ananda atau cara memakai aplikasi." : "Tanyakan data santri dalam lingkup akun Anda, cara memakai aplikasi, atau minta dibuatkan kalimat."}</p>
        <div class="chat-saran">${saran.map(s => html`<button type="button" disabled=${!aiAda()} onClick=${() => kirim(s)}>${s}</button>`)}</div></div>` : null}
      ${msgs.map(m => html`<div class=${"bubble " + (m.r === "u" ? "me" : "ai") + (m.err ? " err" : "")}>${m.r === "u" ? m.t : html`<${TeksAI} t=${m.t} />`}</div>`)}
      ${busy ? html`<div class="bubble ai typing"><i></i><i></i><i></i></div>` : null}
      <div ref=${akhir} style="height:4px"></div>
      <p class="ai-catat" style="text-align:center">Jawaban AI bisa keliru. Periksa kembali hal penting.</p></div>
    <form class="chat-bar" onSubmit=${e => { e.preventDefault(); kirim(); }}>
      <textarea ref=${inp} rows="1" class="in" value=${q} placeholder=${aiAda() ? "Tulis pertanyaan…" : "AI belum tersedia"} disabled=${!aiAda()} onInput=${e => { setQ(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(120, e.target.scrollHeight) + "px"; }}
        onKeyDown=${e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); kirim(); } }}></textarea>
      <button type="submit" class="chat-send" aria-label="Kirim" disabled=${!q.trim() || busy}><${Icon} n="send" s=${22} /></button></form>`;
}
export function KartuAsisten() {
  if (!aiAda()) return null;
  const wali = nav.user && nav.user.kind === "wali";
  return html`<button class="asisten-cta" onClick=${() => nav.go("asisten")}><span class="ai-ic"><${Icon} n="sparkle" s=${20} /></span>
    <span><b>Tanya Asisten AI</b><small>${wali ? "Perkembangan ananda & cara pakai aplikasi" : "Data santri, cara pakai aplikasi, bantu menulis"}</small></span><${Icon} n="chev" s=${18} /></button>`;
}
