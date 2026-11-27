// Komunikasi dengan wali santri lewat WhatsApp (nomor Bunda/Wali di biodata santri).
// Semua pesan dikirim dari WhatsApp ustadz yang menekan tombol: aplikasi hanya menyiapkan teksnya.
import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Card, SubHeader, Row, Pill, Btn, Empty, Field, Seg, Sheet } from "./ui.js";
import { all, toast } from "./store.js";
import * as L from "./logic.js";
import { me } from "./common.js";

const SITUS = "https://muawanahku.santripay.com";
const PONDOK = "Pondok Tahfidz Modern Kampung Qur'an Al Muawanah";
export const adaWa = s => !!(s && L.waNomor(s.hpWali));
const panggil = s => (s.panggilan || L.tebakPanggilan(s.nama) || s.nama).trim();
const pengirim = () => { const m = me(); return m ? m.pendek : "Ustadz"; };
const salam = s => `Assalamu'alaikum warahmatullahi wabarakatuh, Ayah/Bunda dari ananda *${s.nama}*.\nSaya ${pengirim()}, ${PONDOK}.`;
const penutup = "\n\nJazakumullahu khairan.\nWassalamu'alaikum warahmatullahi wabarakatuh.";

// Buka WhatsApp: di HP langsung ke aplikasi, cadangannya wa.me
export function bukaWaWali(no, teks) {
  const d = L.waNomor(no); if (!d) return toast("Nomor WA wali belum diisi.", "err");
  const web = L.waLink(no, teks);
  if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { window.open(web, "_blank", "noopener"); return; }
  let pergi = false; const f = () => { if (document.visibilityState === "hidden") pergi = true; };
  document.addEventListener("visibilitychange", f);
  location.href = `whatsapp://send?phone=${d}&text=${encodeURIComponent(teks)}`;
  setTimeout(() => { document.removeEventListener("visibilitychange", f); if (!pergi) window.open(web, "_blank", "noopener"); }, 1600);
}

// ---------- Template pesan ----------
export const pesan = {
  sapa: s => `${salam(s)}\n\n`,
  kode: s => `${salam(s)}\n\nBerikut kode akses aplikasi *MuawanahQu* untuk memantau hafalan, kehadiran, dan kabar ananda ${panggil(s)} di pondok:\n\nKode akses: *${L.kodeAkses(s)}*\n\nCara masuk:\n1. Buka ${SITUS}\n2. Pilih *Wali Santri*\n3. Masukkan kode akses di atas, lalu *Masuk*\n\nAgar mudah dibuka lagi, tambahkan ke layar utama HP (Chrome: menu ⋮ → Tambahkan ke layar utama · iPhone: tombol Bagikan → Tambah ke Layar Utama).\nMohon kode ini tidak dibagikan ke orang lain.${penutup}`,
  setoran: (s, info) => `${salam(s)}\n\nKami ingin mengabarkan bahwa ananda ${panggil(s)} ${info.terakhir ? `belum menyetorkan hafalan baru sejak ${L.fmtTgl(info.terakhir)}` : "belum menyetorkan hafalan baru"}. Hafalan saat ini: ${info.posisi}.\nMohon doa dan dukungan Ayah/Bunda agar ananda kembali semangat menambah dan menjaga hafalannya.${penutup}`,
  izin: (s, i) => `${salam(s)}\n\nIzin ${String(i.jenis || "").toLowerCase()} ananda ${panggil(s)} sudah dicatat pondok:\n• Alasan: ${i.alasan || "—"}\n• Keluar: ${L.fmtDT(i.keluar)}\n• Kembali paling lambat: *${L.fmtDT(i.kembali)}*\n• ${i.jenis === "Keluar" ? "Pendamping" : "Penjemput"}: ${i.penjemput || "—"}\n\nMohon ananda diantar kembali ke pondok tepat waktu.${penutup}`,
  telat: (s, i) => `${salam(s)}\n\nIzin ananda ${panggil(s)} berakhir pada *${L.fmtDT(i.kembali)}*, namun sampai saat ini ananda belum tercatat kembali di pondok.\nMohon kabar dari Ayah/Bunda mengenai keberadaan ananda dan perkiraan waktu kembali.${penutup}`,
  kembali: (s, i) => `${salam(s)}\n\nAlhamdulillah, ananda ${panggil(s)} sudah kembali ke pondok pada ${L.fmtDT(i.kembaliAktual)}${i.telat ? " (melewati batas waktu izin)" : ""}.${penutup}`,
  bap: (s, b) => `${salam(s)}\n\nKami sampaikan bahwa ananda ${panggil(s)} tercatat melakukan pelanggaran *${b.pelanggaranNama || "tata tertib pondok"}* pada ${L.fmtTgl(b.tanggal)}. Pondok sudah melakukan pembinaan sesuai ketentuan.\nMohon Ayah/Bunda ikut menasihati ananda dari rumah. Bila berkenan, Ayah/Bunda dapat menghubungi kami untuk berdiskusi.${penutup}`,
};

// info setoran ziyadah terakhir untuk pesan "setoran tertinggal"
export function infoSetoran(s) {
  const z = all("setoran").filter(r => r.santri === s.id && r.jenis === "ziyadah").map(r => r.tanggal).sort();
  const h = L.hafalan(s);
  return { terakhir: z.length ? z[z.length - 1] : null, posisi: h ? `${h.selesai.length} juz selesai${h.aktif && !h.khatam ? `, sedang Juz ${h.aktif}` : ""}` : "—" };
}

// ---------- Kartu kontak wali (halaman santri) ----------
export function bolehKodeWali(s) {
  const m = me(); if (!m) return false;
  if (m.roles.some(r => ["admin", "mudir", "wadir_kesantrian", "wadir_tahfidz", "wadir_kurikulum"].includes(r))) return true;
  const a = L.asramaById(s.asrama), h = L.halaqahSantri(s);
  return (a && a.musyrif === m.id) || (h && h.guru === m.id);
}
export function KontakWali({ s }) {
  useApp();
  const [pilih, setPilih] = useState(false);
  const no = s.hpWali, ada = adaWa(s), m = me();
  if (!m) return null;
  const kirim = teks => { setPilih(false); bukaWaWali(no, teks); };
  return html`<${Card} title="Wali santri" right=${ada ? html`<${Pill} t="WhatsApp" tone="green" />` : null}>
    ${ada ? html`<p class="small" style="margin:0 0 10px">No. WA Bunda/Wali: <b>${no}</b></p>
      <div class="btn-row"><${Btn} icon="chat" onClick=${() => kirim(pesan.sapa(s))}>Chat wali</${Btn}>
        <${Btn} kind="outline" icon="send" onClick=${() => setPilih(true)}>Kirim kabar</${Btn}></div>`
      : html`<p class="small" style="margin:0">Nomor WA Bunda/Wali belum diisi. ${m.roles.includes("admin") ? "Isi di Data Master → Santri, atau impor dari pesan pendataan." : "Minta Admin mengisinya di Data Master → Santri."}</p>`}
    <${Sheet} open=${pilih} title="Kirim kabar ke wali" onClose=${() => setPilih(false)}>
      <p class="small" style="margin:0 0 10px">Pilih pesan. WhatsApp terbuka dengan teks siap kirim; bisa diubah dulu sebelum dikirim.</p>
      <div class="list">
        ${bolehKodeWali(s) ? html`<${Row} name="Kode akses aplikasi" sub=${`Kode: ${L.kodeAkses(s)} · beserta cara masuk`} icon=${html`<${Icon} n="lock" s=${18} />`} onClick=${() => kirim(pesan.kode(s))} />` : null}
        <${Row} name="Setoran hafalan tertinggal" sub="Kabar belum setor hafalan baru" icon=${html`<${Icon} n="book" s=${18} />`} onClick=${() => kirim(pesan.setoran(s, infoSetoran(s)))} />
        <${Row} name="Pesan bebas" sub="Hanya salam pembuka" icon=${html`<${Icon} n="chat" s=${18} />`} onClick=${() => kirim(pesan.sapa(s))} />
      </div></${Sheet}></${Card}>`;
}

// Tombol kabar ke wali untuk izin / BAP (dipasang di halaman detailnya)
export function TombolKabarIzin({ i }) {
  const s = L.santriById(i.santri); if (!s || !me()) return null;
  if (!adaWa(s)) return html`<p class="small mt8">Nomor WA Bunda/Wali belum diisi, jadi kabar izin belum bisa dikirim lewat WhatsApp.</p>`;
  const telat = i.status === "aktif" && new Date(i.kembali) < new Date();
  const teks = i.status !== "aktif" ? pesan.kembali(s, i) : telat ? pesan.telat(s, i) : pesan.izin(s, i);
  return html`<div class="mt12"><${Btn} kind=${telat ? "danger" : "outline"} icon="chat" onClick=${() => bukaWaWali(s.hpWali, teks)}>${i.status !== "aktif" ? "Kabari wali: sudah kembali" : telat ? "Tanyakan wali: belum kembali" : "Kabari wali tentang izin ini"}</${Btn}></div>`;
}
export function TombolKabarBap({ b }) {
  const s = L.santriById(b.santri); if (!s || !me() || !adaWa(s)) return null;
  return html`<div class="mt12"><${Btn} kind="outline" icon="chat" onClick=${() => bukaWaWali(s.hpWali, pesan.bap(s, b))}>Kabari wali tentang pelanggaran ini</${Btn}></div>`;
}

// ---------- Pesan ke semua wali (satu asrama / halaqah / kelas) ----------
const CONTOH = {
  rapor: "Kami mengundang Ayah/Bunda untuk menghadiri *pembagian rapor semester ganjil* pada hari Ahad, 13 Desember 2026 di pondok. Mohon hadir tepat waktu.",
  libur: "Kami sampaikan jadwal libur semester: santri dapat dijemput mulai tanggal … dan kembali ke pondok paling lambat tanggal ….",
  bebas: "",
};
export function PesanWali() {
  useApp();
  const m = me(), semua = m && m.roles.some(r => ["admin", "mudir", "wadir_kesantrian", "wadir_tahfidz", "wadir_kurikulum"].includes(r));
  const aSaya = m && L.asramaOf(m.id), hSaya = m && L.HALAQAH.find(h => h.guru === m.id);
  const pilihan = [...(aSaya ? [["a:" + aSaya.id, `Asrama ${aSaya.nama}`]] : []), ...(hSaya ? [["h:" + hSaya.id, hSaya.nama]] : []), ...(semua ? L.ASRAMA.filter(a => !aSaya || a.id !== aSaya.id).map(a => ["a:" + a.id, `Asrama ${a.nama}`]) : [])];
  const [grup, setGrup] = useState(pilihan[0] ? pilihan[0][0] : ""); const [jenis, setJenis] = useState("rapor");
  const [isi, setIsi] = useState(CONTOH.rapor); const [terkirim, setTerkirim] = useState({});
  if (!pilihan.length) return html`<${SubHeader} title="Pesan ke wali" /><div class="wrap"><${Card}><${Empty} t="Fitur ini untuk musyrif, guru halaqah, dan pimpinan." icon="chat" /></${Card}></div>`;
  const [k, id] = grup.split(":"), list = k === "a" ? L.santriAsrama(id) : L.santriList().filter(s => (L.halaqahSantri(s) || {}).id === id);
  const adaNo = list.filter(adaWa), tanpa = list.filter(s => !adaWa(s));
  const gantiJenis = j => { setJenis(j); setIsi(CONTOH[j]); };
  const teks = s => `${salam(s)}\n\n${isi.trim()}${penutup}`;
  const kirim = s => { bukaWaWali(s.hpWali, teks(s)); setTerkirim({ ...terkirim, [s.id]: true }); };
  const n = Object.keys(terkirim).filter(x => list.some(s => s.id === x)).length;
  return html`<${SubHeader} title="Pesan ke wali" sub="Satu pesan untuk semua wali, dikirim satu per satu lewat WhatsApp" />
    <div class="wrap">
      <${Card}><${Field} label="Kirim ke"><select class="in" value=${grup} onChange=${e => { setGrup(e.target.value); setTerkirim({}); }}>${L.kelompokPondok(pilihan, ([v]) => (v[0] === "a" ? L.pondokAsrama(v.slice(2)) : L.pondokHalaqah(L.HALAQAH.find(h => h.id === v.slice(2))))).filter(g => g.isi.length).map(g => html`<optgroup label=${g.nama}>${g.isi.map(([v, l]) => html`<option value=${v}>${l}</option>`)}</optgroup>`)}</select></${Field}>
        <${Seg} small items=${[["rapor", "Undangan rapor"], ["libur", "Info libur"], ["bebas", "Pesan bebas"]]} value=${jenis} onChange=${gantiJenis} />
        <${Field} label="Isi pesan (salam & nama santri ditambahkan otomatis)"><textarea class="in" style="min-height:120px" value=${isi} placeholder="Tulis pesan untuk wali…" onInput=${e => setIsi(e.target.value)}></textarea></${Field}>
        <p class="small" style="margin:0">Ketuk <b>Kirim</b> pada tiap nama: WhatsApp terbuka dengan pesan siap kirim, lalu kembali ke sini untuk nama berikutnya. ${n ? html`<b>${n} dari ${adaNo.length}</b> sudah dibuka.` : ""}</p></${Card}>
      <${Card} title=${`Wali dengan nomor WA (${adaNo.length})`}>${adaNo.length ? html`<div class="list">${adaNo.map(s => html`<${Row} name=${s.nama} sub=${`${panggil(s)} · ${s.hpWali}`}
          right=${terkirim[s.id] ? html`<${Pill} t="Dibuka ✓" tone="green" />` : html`<button type="button" class="link" style="min-height:40px;font-weight:700" disabled=${!isi.trim()} onClick=${e => { e.stopPropagation(); kirim(s); }}>Kirim</button>`} onClick=${() => isi.trim() && kirim(s)} />`)}</div>`
        : html`<${Empty} t="Belum ada nomor WA wali di kelompok ini." icon="chat" />`}</${Card}>
      ${tanpa.length ? html`<${Card} title=${`Belum ada nomor WA (${tanpa.length})`}><p class="small" style="margin:0 0 8px">Nomor diisi Admin di Data Master → Santri, atau lewat impor pesan pendataan.</p><div class="list">${tanpa.map(s => html`<${Row} name=${s.nama} sub=${`Kelas ${s.kelas}`} />`)}</div></${Card}>` : null}
    </div>`;
}

// ---------- Kontak ustadz untuk wali santri ----------
// Hanya pimpinan & pembina langsung: Wali Asrama, para Wadir, Mudir, Admin pondok — diurutkan menurut tupoksi.
// Guru mapel & guru halaqah TIDAK ditampilkan walau nomornya terisi di biodata.
export const TUPOKSI = [
  { k: "musyrif", t: "Wali Asrama", d: "Keseharian ananda di asrama, kesehatan, kunjungan & kabar harian" },
  { k: "wadir_kesantrian", t: "Wadir Kesantrian", d: "Perizinan pulang/keluar, kedisiplinan & tata tertib santri" },
  { k: "wadir_tahfidz", t: "Wadir Tahfidz", d: "Hafalan Al-Qur'an, tahsin/Iqro', ujian & tasmi'" },
  { k: "wadir_kurikulum", t: "Wadir Kurikulum", d: "Pelajaran sekolah, nilai & rapor" },
  { k: "mudir", t: "Mudir", d: "Pimpinan pondok — kebijakan & hal yang belum terselesaikan" },
  { k: "admin", t: "Admin Pondok", d: "Administrasi, data santri, akun & kode akses aplikasi" },
];
export const PERAN_KONTAK = TUPOKSI.map(x => x.k);
export function kontakUntukSantri(s) {
  if (!s) return [];
  const p = L.pondokOfSantri(s), a = L.asramaById(s.asrama), aktif = st => st && !(L.akunOv(st.username) || {}).hapus;
  return TUPOKSI.map(tp => {
    let orang = [];
    if (tp.k === "musyrif") orang = a ? [L.staffById(a.musyrif)] : [];
    else orang = L.STAFF.filter(st => (st.roles || []).includes(tp.k) && (tp.k !== "wadir_kesantrian" || !st.pondok || st.pondok === p));
    const judul = tp.k === "musyrif" && a ? `Wali Asrama ${a.nama}` : tp.k === "wadir_kesantrian" ? `Wadir Kesantrian Pondok ${p}` : tp.t;
    return { ...tp, judul, orang: orang.filter(aktif) };
  });
}
const pesanKeUstadz = (st, s) => `Assalamu'alaikum ${st.pendek || st.nama}, saya Ayah/Bunda dari ananda *${s.nama}* (Kelas ${s.kelas}, Asrama ${L.asramaAman(s.asrama).nama}). `;
const bisaDihubungi = st => !!L.waNomor(st.hp) && st.tampilWali !== false;
const barisKontak = (st, s, sub, pill) => html`<${Row} name=${st.pendek || st.nama} sub=${sub} icon=${html`<${Icon} n="chat" s=${18} />`} right=${html`<${Pill} t=${pill} tone="green" />`} onClick=${() => bukaWaWali(st.hp, pesanKeUstadz(st, s))} />`;

export function KontakUstadz() {
  useApp();
  const s = nav.user && nav.user.kind === "wali" ? L.santriById(nav.user.id) : null;
  if (!s) return html`<${SubHeader} title="Kontak ustadz" /><div class="wrap"><${Empty} t="Halaman ini untuk wali santri." /></div>`;
  const grup = kontakUntukSantri(s).map(g => ({ ...g, orang: g.orang.filter(bisaDihubungi) })).filter(g => g.orang.length);
  return html`<${SubHeader} title="Kontak ustadz" sub=${`Hubungi sesuai keperluan · ananda ${s.nama}`} />
    <div class="wrap">
      ${grup.length ? html`${grup.map(g => html`<${Card} title=${g.judul}><p class="small" style="margin:-4px 0 6px">${g.d}</p><div class="list">${g.orang.map(st => barisKontak(st, s, st.nama !== st.pendek ? st.nama : g.judul, "WhatsApp"))}</div></${Card}>`)}
        <p class="small" style="margin:4px 4px 0">Ketuk nama untuk membuka WhatsApp dengan salam pembuka. Mohon menghubungi sesuai keperluan dan pada jam yang wajar; untuk hal sehari-hari hubungi Wali Asrama terlebih dahulu.</p>`
        : html`<${Card}><${Empty} t="Nomor WhatsApp ustadz belum diisi oleh pondok." icon="chat" /></${Card}>`}
    </div>`;
}
// Ringkas di Beranda wali: Wali Asrama lebih dulu (kontak pertama untuk urusan harian)
export function KontakUtamaWali({ s }) {
  const grup = kontakUntukSantri(s).map(g => ({ ...g, orang: g.orang.filter(bisaDihubungi) })).filter(g => g.orang.length);
  if (!grup.length) return null;
  const total = grup.reduce((n, g) => n + g.orang.length, 0), utama = grup[0];
  return html`<${Card} title="Kontak ustadz" right=${html`<button class="link" onClick=${() => nav.go("kontakUstadz")}>Semua (${total})</button>`}><div class="list">
    ${utama.orang.slice(0, 1).map(st => barisKontak(st, s, `${utama.judul} · ${utama.d.split(",")[0]}`, "Chat"))}</div></${Card}>`;
}
