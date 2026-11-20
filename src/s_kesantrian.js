import { useState, useRef, useEffect } from "preact/hooks";
import { html, nav, useApp, Icon, Tile, Card, SubHeader, Stat, Row, Pill, Btn, Empty, Field, Seg, Section, Sheet, Confirm, SearchBox } from "./ui.js";
import { all, get, put, toast, uid } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { me, SantriPicker, compressImage } from "./common.js";
import { useDownloads, unduh, docHtml, esc } from "./s_system.js";
import { AiBtn, useAIRun } from "./s_ai.js";
import { tanyaAI, SISTEM_DASAR } from "./ai.js";

const inPondok = (p, sid) => { const s = L.santriById(sid); return s && (!p || L.pondokOfSantri(s) === p); };

export function Kesantrian({ pondok }) {
  useApp();
  const p = pondok === "all" ? null : (pondok || me().pondok);
  const iz = L.izinAktif().filter(i => inPondok(p, i.santri));
  const lambat = iz.filter(L.terlambat);
  const bln = L.today().slice(0, 7), bap = all("bap").filter(b => inPondok(p, b.santri) && (b.tanggal || "").startsWith(bln));
  const ro = !p || !me().roles.includes("wadir_kesantrian");
  return html`<${SubHeader} title=${p ? "Kesantrian · Pondok " + p : "Kesantrian · Semua pondok"} sub=${ro ? "Pemantauan" : "Wadir Kesantrian · " + me().pendek} />
    <div class="wrap"><${Card}><div class="stats"><${Stat} label="Izin aktif" value=${iz.length} sub="santri" /><${Stat} label="Belum kembali" value=${lambat.length} sub="terlambat" tone=${lambat.length ? "red" : ""} /><${Stat} label="BAP bulan ini" value=${bap.length} tone="gold" /></div></${Card}>
    <${Card} title="Menu Kesantrian"><div class="tiles">
      ${!ro ? html`<${Tile} icon="file" label="Surat Izin" color="coral" onClick=${() => nav.go("suratIzin")} />
      <${Tile} icon="door" label="Catat Kembali" color="emerald" badge=${iz.length || null} onClick=${() => nav.go("catatKembali")} />
      <${Tile} icon="clipboard" label="Form BAP" color="orange" onClick=${() => nav.go("formBap")} />` : null}
      <${Tile} icon="user" label="Histori Santri" color="blue" onClick=${() => nav.go("histori", { pondok: p })} />
      <${Tile} icon="calendar" label="Rekap Izin" color="teal" onClick=${() => nav.go("rekapIzin", { pondok: p })} />
      <${Tile} icon="alert" label="Rekap Pelanggaran" color="pink" onClick=${() => nav.go("rekapPelanggaran", { pondok: p })} />
</div></${Card}>
    <${Card} title="Santri sedang izin" right=${html`<${Pill} t=${iz.length + " santri"} tone="gold" />`}>${iz.length ? html`<div class="list">${iz.map(i => { const s = L.santriById(i.santri);
      return html`<${Row} name=${s.nama} sub=${`Kelas ${s.kelas} · ${i.jenis} · kembali ${L.fmtDT(i.kembali)}`} right=${html`<${Pill} t=${L.terlambat(i) ? "Terlambat" : i.jenis === "Keluar" ? "Keluar" : "Di rumah"} tone=${L.terlambat(i) ? "red" : "gold"} />`} onClick=${() => nav.go("izinView", { id: i.id })} />`; })}</div>`
      : html`<${Empty} t="Tidak ada santri yang sedang izin." icon="check" />`}</${Card}></div>`;
}

const local = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 16); };
export function SuratIzin() {
  useApp();
  const p = me().pondok, list = L.santriList().filter(s => L.pondokOfSantri(s) === p);
  const now = new Date(), back = new Date(now.getTime() + 2 * 864e5); back.setHours(17, 0, 0, 0);
  const [f, setF] = useState({ santri: "", jenis: "Perpulangan", alasan: "", keluar: local(now), kembali: local(back), penjemput: "", hp: "" });
  const set = (k, v) => setF({ ...f, [k]: v });
  const [ask, setAsk] = useState(false);
  const save = async () => {
    setAsk(false); const id = uid("i");
    if (await put("izin", id, { ...f, keluar: new Date(f.keluar).toISOString(), kembali: new Date(f.kembali).toISOString(), status: "aktif", oleh: me().id, ts: Date.now() })) { toast("Izin tersimpan, langsung tampil di akun wali"); nav.replace("izinView", { id }); }
  };
  const ok = f.santri && f.alasan && f.keluar && f.kembali && f.kembali > f.keluar;
  return html`<${SubHeader} title="Surat Izin" sub=${`Kesantrian Pondok ${p} · ${me().pendek}`} />
    <div class="wrap">
    <${Card} title="Data izin"><${Field} label="Santri"><${SantriPicker} list=${list} value=${f.santri} onChange=${v => set("santri", v)} /></${Field}>
      <${Field} label="Jenis izin"><${Seg} items=${[["Perpulangan", "Perpulangan"], ["Keluar", "Keluar"]]} value=${f.jenis} onChange=${v => set("jenis", v)} /></${Field}>
      <${Field} label="Alasan"><textarea class="in" value=${f.alasan} placeholder="Misal: acara keluarga" onInput=${e => set("alasan", e.target.value)}></textarea></${Field}></${Card}>
    <${Card} title="Waktu dan penjemput"><div class="btn-row"><${Field} label="Keluar"><input type="datetime-local" class="in" value=${f.keluar} onInput=${e => set("keluar", e.target.value)} /></${Field}>
      <${Field} label="Kembali"><input type="datetime-local" class="in" value=${f.kembali} onInput=${e => set("kembali", e.target.value)} /></${Field}></div>
      <${Field} label="Penjemput"><input class="in" value=${f.penjemput} placeholder="Nama dan hubungan" onInput=${e => set("penjemput", e.target.value)} /></${Field}>
      <${Field} label="No. HP penjemput"><input class="in" inputmode="tel" value=${f.hp} onInput=${e => set("hp", e.target.value)} /></${Field}></${Card}>
    <div class="sticky-act"><${Btn} disabled=${!ok} onClick=${() => setAsk(true)} icon="check">Simpan surat izin</${Btn}></div>
    <${Confirm} open=${ask} title="Simpan surat izin?" text=${ok ? `${L.santriById(f.santri).nama} · ${f.jenis} sampai ${L.fmtDT(new Date(f.kembali).toISOString())}.` : ""} yes="Simpan" onYes=${save} onNo=${() => setAsk(false)} /></div>`;
}

export function IzinView({ id }) {
  useApp();
  const i = get("izin", id); if (!i) return html`<${SubHeader} title="Surat Izin" /><div class="wrap"><${Empty} t="Data tidak ditemukan." /></div>`;
  const s = L.santriById(i.santri), a = L.asramaById(s.asrama), dlOk = useDownloads();
  const doc = () => docHtml("Surat Izin " + s.nama, `<h1>SURAT IZIN ${esc(i.jenis.toUpperCase())}</h1><table class="id">
<tr><td>Nama santri</td><td>: <b>${esc(s.nama)}</b></td></tr><tr><td>Kelas / asrama</td><td>: ${esc(s.kelas)} · ${esc(a.nama)} · Pondok ${L.pondokOfSantri(s)}</td></tr>
<tr><td>Alasan</td><td>: ${esc(i.alasan)}</td></tr><tr><td>Keluar</td><td>: ${esc(L.fmtDT(i.keluar))}</td></tr><tr><td>Kembali</td><td>: ${esc(L.fmtDT(i.kembali))}</td></tr>
<tr><td>Penjemput</td><td>: ${esc(i.penjemput || "—")} ${i.hp ? "· " + esc(i.hp) : ""}</td></tr></table>
<div class="ttd"><div>Penjemput<div class="g"></div><b>${esc(i.penjemput || "")}</b></div><div>Wadir Kesantrian<div class="g"></div><b>${esc(L.staffById(i.oleh).nama)}</b></div></div>`);
  return html`<${SubHeader} title="Surat Izin" sub=${i.status === "aktif" ? "Sedang berlaku" : "Sudah kembali"} />
    <div class="wrap"><div class="surat"><h4>SURAT IZIN ${i.jenis.toUpperCase()}</h4><p class="c">Kampung Qur'an Al Muawanah · Pondok ${L.pondokOfSantri(s)}</p>
      <div class="kv"><span>Nama santri</span><b>${s.nama}</b></div><div class="kv"><span>Kelas / asrama</span><b>${s.kelas} · ${a.nama}</b></div>
      <div class="kv"><span>Alasan</span><b>${i.alasan}</b></div><div class="kv"><span>Keluar</span><b>${L.fmtDT(i.keluar)}</b></div><div class="kv"><span>Kembali</span><b>${L.fmtDT(i.kembali)}</b></div>
      <div class="kv"><span>Penjemput</span><b>${i.penjemput || "—"} ${i.hp ? "· " + i.hp : ""}</b></div><div class="kv"><span>Dicatat oleh</span><b>${L.staffById(i.oleh).nama}</b></div>
      ${i.status !== "aktif" ? html`<div class="kv"><span>Kembali pada</span><b>${L.fmtDT(i.kembaliAktual)} ${i.telat ? "· terlambat" : ""}</b></div>` : null}</div>
    ${dlOk ? html`<div class="mt12"><${Btn} kind="outline" icon="download" onClick=${() => unduh(`Surat Izin ${s.nama}.html`, doc())}>Unduh surat untuk dicetak</${Btn}></div>` : null}</div>`;
}

export function CatatKembali() {
  useApp();
  const p = me().pondok, iz = L.izinAktif().filter(i => inPondok(p, i.santri)).sort((a, b) => new Date(a.kembali) - new Date(b.kembali));
  const [sel, setSel] = useState(null);
  const done = async () => { const i = sel; setSel(null); const telat = L.terlambat(i); if (await put("izin", i.id, { ...i, status: "kembali", kembaliAktual: new Date().toISOString(), telat })) toast(telat ? "Tercatat kembali, terlambat" : "Tercatat sudah kembali", telat ? "err" : "ok"); };
  return html`<${SubHeader} title="Catat Kembali" sub=${`Pondok ${p} · ${iz.length} santri sedang izin`} />
    <div class="wrap"><${Card}>${iz.length ? html`<div class="list">${iz.map(i => { const s = L.santriById(i.santri); return html`<div class="row"><span class=${"av " + (L.terlambat(i) ? "red" : "gold")}>${L.initials(s.nama)}</span>
      <span class="row-t"><b>${s.nama}</b><small>${i.jenis} · kembali ${L.fmtDT(i.kembali)}${L.terlambat(i) ? " · terlambat" : ""}</small></span><${Btn} kind="ghost" full=${false} onClick=${() => setSel(i)}>Sudah kembali</${Btn}></div>`; })}</div>`
      : html`<${Empty} t="Tidak ada santri yang sedang izin." icon="check" />`}</${Card}>
    <${Confirm} open=${!!sel} title="Catat sudah kembali?" text=${sel ? `${L.santriById(sel.santri).nama} kembali sekarang (${L.fmtDT(new Date().toISOString())}).` : ""} yes="Catat" onYes=${done} onNo=${() => setSel(null)} /></div>`;
}

function SigPad({ value, onChange, label }) {
  const ref = useRef(null), drawing = useRef(false);
  useEffect(() => {
    const c = ref.current, r = c.getBoundingClientRect(); c.width = r.width * 2; c.height = r.height * 2;
    const g = c.getContext("2d"); g.lineWidth = 4; g.lineCap = "round"; g.strokeStyle = "#14281E";
    if (value) { const im = new Image(); im.onload = () => g.drawImage(im, 0, 0, c.width, c.height); im.src = value; }
  }, []);
  const pos = e => { const r = ref.current.getBoundingClientRect(); return [(e.clientX - r.left) * 2, (e.clientY - r.top) * 2]; };
  const down = e => { drawing.current = true; const g = ref.current.getContext("2d"); g.beginPath(); g.moveTo(...pos(e)); ref.current.setPointerCapture(e.pointerId); };
  const move = e => { if (!drawing.current) return; const g = ref.current.getContext("2d"); g.lineTo(...pos(e)); g.stroke(); };
  const up = () => { if (!drawing.current) return; drawing.current = false; onChange(ref.current.toDataURL("image/png")); };
  const clear = () => { const c = ref.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); onChange(""); };
  return html`<div><canvas ref=${ref} class="sig" aria-label=${"Tanda tangan " + label} onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerLeave=${up}></canvas>
    <div style="display:flex;justify-content:space-between;margin-top:4px"><small class="small">${label}</small><button class="link" onClick=${clear}>Hapus</button></div></div>`;
}

export function FormBap() {
  useApp();
  const p = me().pondok, list = L.santriList().filter(s => L.pondokOfSantri(s) === p);
  const [f, setF] = useState({ santri: "", tanggal: L.today(), tempat: "", pel: "", kronologi: "", saksi: "", sanksi: "", foto: "", ttdSantri: "", ttdPetugas: "" });
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const pel = DATA.pelanggaran.find(x => x.id === f.pel);
  const [ask, setAsk] = useState(false);
  const foto = async e => { const file = e.target.files && e.target.files[0]; if (!file) return; try { set("foto", await compressImage(file)); } catch (err) { toast("Foto tidak bisa dibaca", "err"); } };
  const ok = f.santri && pel && f.kronologi;
  const [aiBusy, aiRun] = useAIRun();
  const rapikan = () => aiRun(async () => {
    const j = await tanyaAI({ sistem: SISTEM_DASAR, json: true, teks: `Rapikan kronologi berita acara pelanggaran santri berikut menjadi kalimat baku, objektif, orang ketiga, urut waktu, maksimal 4 kalimat. Pertahankan semua fakta persis dan jangan menambah fakta atau tuduhan baru. Sebut santri sebagai "santri" saja.
Lalu pilih jenis pelanggaran yang paling sesuai dari daftar (id|nama|tingkat), atau null bila tidak ada yang cocok:
${DATA.pelanggaran.map(x => `${x.id}|${x.nama}|${x.tingkat}`).join("\n")}
Tempat: ${f.tempat || "-"}
Kronologi asli: ${f.kronologi}
Jawab JSON: {"kronologi":"","pelanggaran_id":null}` });
    setF(x => ({ ...x, kronologi: j.kronologi || x.kronologi, pel: x.pel || (DATA.pelanggaran.some(p => p.id === j.pelanggaran_id) ? j.pelanggaran_id : "") }));
    toast(f.pel || !j.pelanggaran_id ? "Kronologi dirapikan. Periksa kembali." : "Kronologi dirapikan dan jenis pelanggaran disarankan. Periksa kembali.");
  });
  const save = async () => {
    setAsk(false); const id = uid("b");
    if (await put("bap", id, { santri: f.santri, tanggal: f.tanggal, tempat: f.tempat, pelanggaran: pel.id, pelanggaranNama: pel.nama, tingkat: pel.tingkat, poin: pel.poin, kronologi: f.kronologi, saksi: f.saksi, sanksi: f.sanksi, foto: f.foto, ttdSantri: f.ttdSantri, ttdPetugas: f.ttdPetugas, oleh: me().id, ts: Date.now() })) {
      toast(`BAP tersimpan, ${pel.poin} poin masuk histori santri`); nav.replace("bapView", { id });
    }
  };
  const s = f.santri ? L.santriById(f.santri) : null, ps = s ? L.poinSantri(s.id) : null;
  return html`<${SubHeader} title="Form BAP" sub=${`Berita acara pelanggaran · Pondok ${p}`} />
    <div class="wrap"><${Card} title="Santri"><${SantriPicker} list=${list} value=${f.santri} onChange=${v => set("santri", v)} />
      ${s ? html`<p class="small mt8">${L.asramaById(s.asrama).nama} · total poin saat ini ${ps.total}</p>` : null}</${Card}>
    <${Card} title="Kejadian"><div class="btn-row"><${Field} label="Tanggal"><input type="date" class="in" value=${f.tanggal} onInput=${e => set("tanggal", e.target.value)} /></${Field}>
      <${Field} label="Tempat"><input class="in" value=${f.tempat} placeholder="Misal: kamar 3" onInput=${e => set("tempat", e.target.value)} /></${Field}></div>
      <${Field} label="Jenis pelanggaran" hint="Daftar contoh sementara, menunggu daftar resmi pondok."><select class="in" value=${f.pel} onChange=${e => set("pel", e.target.value)}><option value="">Pilih pelanggaran</option>
        ${DATA.pelanggaran.map(x => html`<option value=${x.id}>${x.nama} · ${x.tingkat} · ${x.poin} poin</option>`)}</select></${Field}>
      <${Field} label="Kronologi"><textarea class="in" value=${f.kronologi} onInput=${e => set("kronologi", e.target.value)} placeholder="Ceritakan singkat kejadiannya"></textarea></${Field}>
      <${AiBtn} kecil label=${f.pel ? "Rapikan kronologi" : "Rapikan & sarankan jenis pelanggaran"} busy=${aiBusy} onClick=${() => (f.kronologi.trim().length > 10 ? rapikan() : toast("Tulis kronologinya dulu", "err"))} />
      <${Field} label="Saksi"><input class="in" value=${f.saksi} onInput=${e => set("saksi", e.target.value)} placeholder="Misal: Ust. Ugi (wali asrama)" /></${Field}></${Card}>
    <${Card} title="Bukti dan tanda tangan"><${Field} label="Foto bukti"><input type="file" accept="image/*" class="in" onChange=${foto} />${f.foto ? html`<img class="photo" src=${f.foto} alt="Foto bukti" />` : null}</${Field}>
      <div class="btn-row"><${SigPad} label="Santri" value=${f.ttdSantri} onChange=${v => set("ttdSantri", v)} /><${SigPad} label="Petugas" value=${f.ttdPetugas} onChange=${v => set("ttdPetugas", v)} /></div>
      <${Field} label="Sanksi"><textarea class="in" value=${f.sanksi} onInput=${e => set("sanksi", e.target.value)} placeholder="Misal: HP disita sampai perpulangan"></textarea></${Field}></${Card}>
    <div class="sticky-act"><${Btn} disabled=${!ok} onClick=${() => setAsk(true)} icon="check">Simpan BAP</${Btn}></div>
    <${Confirm} open=${ask} title="Simpan BAP?" text=${ok ? `${L.santriById(f.santri).nama}: ${pel.nama} (${pel.poin} poin).` : ""} yes="Simpan" onYes=${save} onNo=${() => setAsk(false)} /></div>`;
}

export function BapView({ id }) {
  useApp();
  const b = get("bap", id); if (!b) return html`<${SubHeader} title="BAP" /><div class="wrap"><${Empty} t="Data tidak ditemukan." /></div>`;
  const s = L.santriById(b.santri);
  return html`<${SubHeader} title="Berita Acara Pelanggaran" sub=${L.fmtTgl(b.tanggal)} />
    <div class="wrap"><div class="surat"><h4>BERITA ACARA PELANGGARAN</h4><p class="c">Kampung Qur'an Al Muawanah · Pondok ${L.pondokOfSantri(s)}</p>
      <div class="kv"><span>Santri</span><b>${s.nama} · ${s.kelas}</b></div><div class="kv"><span>Asrama</span><b>${L.asramaById(s.asrama).nama}</b></div>
      <div class="kv"><span>Tanggal / tempat</span><b>${L.fmtTgl(b.tanggal)} · ${b.tempat || "—"}</b></div><div class="kv"><span>Pelanggaran</span><b>${b.pelanggaranNama} · ${b.tingkat} · ${b.poin} poin</b></div>
      <div class="kv"><span>Kronologi</span><b>${b.kronologi}</b></div><div class="kv"><span>Saksi</span><b>${b.saksi || "—"}</b></div><div class="kv"><span>Sanksi</span><b>${b.sanksi || "—"}</b></div>
      ${b.foto ? html`<img class="photo" src=${b.foto} alt="Foto bukti" />` : null}
      <div class="btn-row mt12">${[["Santri", b.ttdSantri], ["Petugas", b.ttdPetugas]].map(([l, v]) => html`<div class="center"><div style="height:70px;border-bottom:1px solid #9AB0A5">${v ? html`<img src=${v} alt=${"Tanda tangan " + l} style="height:70px" />` : null}</div><small class="small">${l}</small></div>`)}</div>
      <p class="small mt8">Dicatat oleh ${L.staffById(b.oleh).nama}</p></div></div>`;
}

export function Histori({ pondok }) {
  useApp();
  const [q, setQ] = useState("");
  const list = L.santriList().filter(s => (!pondok || L.pondokOfSantri(s) === pondok) && s.nama.toLowerCase().includes(q.toLowerCase()));
  return html`<${SubHeader} title="Histori Santri" sub=${pondok ? "Pondok " + pondok : "Semua pondok"} /><div class="wrap"><${SearchBox} value=${q} onInput=${setQ} />
    <${Card}><div class="list">${list.map(s => { const p = L.poinSantri(s.id); return html`<${Row} name=${s.nama} sub=${`Kelas ${s.kelas} · ${L.asramaById(s.asrama).nama}`} right=${p.total ? html`<${Pill} t=${p.total + " poin"} tone="red" />` : html`<${Pill} t="0 poin" />`} onClick=${() => nav.go("santri", { sid: s.id, tab: "catatan" })} />`; })}</div></${Card}></div>`;
}

export function RekapIzin({ pondok }) {
  useApp();
  const [f, setF] = useState("aktif");
  const l = all("izin").filter(i => inPondok(pondok, i.santri) && (f === "semua" || (f === "aktif" ? i.status === "aktif" : i.status !== "aktif"))).sort((a, b) => b.ts - a.ts);
  return html`<${SubHeader} title="Rekap Izin" sub=${pondok ? "Pondok " + pondok : "Semua pondok"}><${Seg} items=${[["aktif", "Aktif"], ["selesai", "Selesai"], ["semua", "Semua"]]} value=${f} onChange=${setF} /></${SubHeader}>
    <div class="wrap"><${Card}>${l.length ? html`<div class="list">${l.map(i => html`<${Row} name=${L.santriById(i.santri).nama} sub=${`${i.jenis} · ${L.fmtDT(i.keluar)} → ${L.fmtDT(i.kembali)}`} right=${html`<${Pill} t=${i.status === "aktif" ? (L.terlambat(i) ? "Terlambat" : "Aktif") : i.telat ? "Kembali telat" : "Kembali"} tone=${i.status === "aktif" ? (L.terlambat(i) ? "red" : "gold") : i.telat ? "red" : "green"} />`} onClick=${() => nav.go("izinView", { id: i.id })} />`)}</div>` : html`<${Empty} t="Tidak ada data izin." />`}</${Card}></div>`;
}

export function RekapPelanggaran({ pondok }) {
  useApp();
  const rows = L.santriList().filter(s => !pondok || L.pondokOfSantri(s) === pondok).map(s => ({ s, p: L.poinSantri(s.id) })).filter(x => x.p.total).sort((a, b) => b.p.total - a.p.total);
  const bap = all("bap").filter(b => inPondok(pondok, b.santri)).sort((a, b) => b.ts - a.ts).slice(0, 15);
  return html`<${SubHeader} title="Rekap Pelanggaran" sub="BAP dan catatan MOTD otomatis" /><div class="wrap">
    <${Section} t="Poin tertinggi" /><${Card}>${rows.length ? html`<div class="list">${rows.map(({ s, p }) => html`<${Row} name=${s.nama} sub=${`BAP ${p.bap} poin · MOTD ${p.motd} poin`} right=${html`<${Pill} t=${p.total + " poin"} tone="red" />`} onClick=${() => nav.go("santri", { sid: s.id, tab: "catatan" })} />`)}</div>` : html`<${Empty} t="Belum ada pelanggaran tercatat." icon="check" />`}</${Card}>
    <${Section} t="BAP terbaru" /><${Card}>${bap.length ? html`<div class="list">${bap.map(b => html`<${Row} name=${L.santriById(b.santri).nama} sub=${`${b.pelanggaranNama} · ${L.fmtTgl(b.tanggal)}`} right=${html`<${Pill} t=${b.poin + " poin"} tone="red" />`} onClick=${() => nav.go("bapView", { id: b.id })} />`)}</div>` : html`<${Empty} t="Belum ada BAP." />`}</${Card}></div>`;
}

export function RekapMotd({ pondok }) {
  useApp();
  const tgl = L.today(), wk = L.weekStart(tgl);
  const asr = L.ASRAMA.filter(a => !pondok || a.pondok === pondok);
  return html`<${SubHeader} title="Rekap MOTD" sub=${`Hari ini dan pekan ini · ${pondok ? "Pondok " + pondok : "semua pondok"}`} /><div class="wrap">
    ${asr.map(a => { const ids = new Set(L.santriAsrama(a.id).map(s => s.id));
      const today = L.WAKTU.filter(([w]) => get("motd", L.motdKey(a.id, tgl, w))).length;
      let al = 0, mb = 0; all("motd").filter(d => d.asrama === a.id && d.tanggal >= wk).forEach(d => Object.entries(d.status).forEach(([id, v]) => { if (ids.has(id)) { if (v === "A") al++; if (v === "M") mb++; } }));
      return html`<${Card} title=${a.nama} right=${html`<small>${L.staffById(a.musyrif).pendek}</small>`}><div class="stats"><${Stat} label="Diabsen hari ini" value=${`${today}/8`} tone=${today < 8 ? "gold" : ""} /><${Stat} label="Alpa pekan ini" value=${al} tone=${al ? "red" : ""} /><${Stat} label="Masbuq" value=${mb} tone=${mb ? "blue" : ""} /></div></${Card}>`; })}</div>`;
}
