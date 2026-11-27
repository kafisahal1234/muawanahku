import { useState } from "preact/hooks";
import { html, nav, useApp, Icon, Tile, Card, SubHeader, Stat, Row, Pill, Btn, Empty, Field, Seg, Section, Sheet, SearchBox, Confirm, Hint, PassInput } from "./ui.js";
import { S, all, get, put, del, toast, uid } from "./store.js";
import { DATA } from "./data.js";
import * as L from "./logic.js";
import { logUbah } from "./s_koreksi.js";
import { me, has } from "./common.js";
import { AiBtn, useAIRun } from "./s_ai.js";
import { tanyaAI, SISTEM_DASAR } from "./ai.js";

export function DataMaster() {
  useApp();
  const ss = L.santriList();
  return html`<${SubHeader} title="Data Master" sub=${`Admin · ${me().nama}`} />
    <div class="wrap">
    <${Card}><div class="stats"><${Stat} label="Santri" value=${ss.length} /><${Stat} label="Asrama" value=${L.ASRAMA.length} /><${Stat} label="Akun guru" value=${L.STAFF.length} /></div></${Card}>
    <${Card} title="Menu Data Master"><div class="tiles">
      <${Tile} icon="users" label="Santri" color="emerald" onClick=${() => nav.go("santriAdmin")} />
      <${Tile} icon="user" label="Guru & Akun" color="blue" onClick=${() => nav.go("akunAdmin")} />
      <${Tile} icon="home2" label="Asrama" color="orange" onClick=${() => nav.go("asramaAdmin")} />
      <${Tile} icon="bookopen" label="Halaqah" color="teal" onClick=${() => nav.go("halaqahAdmin")} />
      <${Tile} icon="grid" label="Kelas" color="indigo" onClick=${() => nav.go("kelasAdmin")} />
      <${Tile} icon="upload" label="Impor Data" color="purple" onClick=${() => nav.go("impor")} />
</div></${Card}>
    </div>`;
}

export function SantriAdmin({ asrama, kelas }) {
  useApp();
  const [q, setQ] = useState(""); const [k, setK] = useState(kelas || "all"); const [ed, setEd] = useState(null);
  const list = L.santriList().filter(s => (!asrama || s.asrama === asrama) && (k === "all" || s.kelas === k) && s.nama.toLowerCase().includes(q.toLowerCase()));
  return html`<${SubHeader} title="Data Santri" sub=${asrama ? "Asrama " + L.asramaAman(asrama).nama : `${list.length} santri`}><${Seg} small items=${[["all", "Semua"], ["7", "Kls 7"], ["8", "Kls 8"], ["9A", "9A"], ["9B", "9B"]]} value=${k} onChange=${setK} /></${SubHeader}>
    <div class="wrap"><${SearchBox} value=${q} onInput=${setQ} />
    <button class="up-cta" onClick=${() => nav.go("impor")}><span class="up-ic"><${Icon} n="upload" s=${22} /></span><span><b>Impor / lengkapi dari dokumen</b><small>Tgl lahir, NIS, orang tua · dibaca AI</small></span><${Icon} n="chev" s=${18} /></button>
    <${Btn} kind="ghost" icon="plus" onClick=${() => setEd({ baru: true, nama: "", kelas: "7", asrama: asrama || "a1" })}>Tambah santri</${Btn}>
    <div class="mt12">${L.kelompokPondok(list, s => L.pondokOfSantri(s)).filter(g => g.isi.length).map(g => html`<${Section} t=${`${g.nama} · ${g.ket} (${g.isi.length})`} />
      ${L.ASRAMA.filter(a => g.isi.some(s => s.asrama === a.id)).map(a => { const ls = g.isi.filter(s => s.asrama === a.id); return html`<${Card} title=${`Asrama ${a.nama} (${ls.length})`}><div class="list">${ls.map(s => html`<${Row} name=${s.nama} sub=${`Kelas ${s.kelas}${s.panggilan ? " · " + s.panggilan : ""}${s.hpWali ? " · WA ✓" : ""}`} onClick=${() => setEd({ ...s })} />`)}</div></${Card}>`; })}
      ${g.isi.some(s => !L.ASRAMA.some(a => a.id === s.asrama)) ? html`<${Card} title="Tanpa asrama"><div class="list">${g.isi.filter(s => !L.ASRAMA.some(a => a.id === s.asrama)).map(s => html`<${Row} name=${s.nama} sub=${`Kelas ${s.kelas}`} onClick=${() => setEd({ ...s })} />`)}</div></${Card}>` : null}`)}
      ${!list.length ? html`<${Card}><${Empty} t="Tidak ada santri yang cocok." /></${Card}>` : null}</div>
    ${ed ? html`<${EditSantri} e=${ed} onClose=${() => setEd(null)} />` : null}</div>`;
}
function EditSantri({ e, onClose }) {
  const [f, setF] = useState({ ...e, panggilan: e.panggilan || L.tebakPanggilan(e.nama) }); const [ask, setAsk] = useState(false);
  const [pgTulis, setPgTulis] = useState(!!e.panggilan);
  const set = (k, v) => setF({ ...f, [k]: v });
  const setNama = v => setF({ ...f, nama: v, ...(pgTulis ? {} : { panggilan: L.tebakPanggilan(v) }) });
  const panggilan = String(f.panggilan || "").trim() || L.tebakPanggilan(f.nama);
  const kode = L.kodeHitung({ ...e, ...f, panggilan, kode: undefined });
  const kembar = f.lahir && L.santriList().find(s => s.id !== e.id && L.kodeAkses(s) === kode);
  const save = async () => {
    const id = e.baru ? uid("s") : e.id;
    const asalLama = e.baru ? null : L.HALAQAH.find(h => h.guru === (L.asramaById(e.asrama) || {}).musyrif), asalBaru = L.HALAQAH.find(h => h.guru === (L.asramaById(f.asrama) || {}).musyrif);
    const hq = f.halaqah && !(asalLama && f.halaqah === asalLama.id && f.asrama !== e.asrama) ? f.halaqah : asalBaru ? asalBaru.id : null;
    const bio = Object.fromEntries(["tempatLahir", "hobi", "cita", "alamat", "ayah", "ibu", "hpWali"].map(k => [k, (f[k] || "").trim()]));
    const base = { nama: f.nama.trim(), kelas: f.kelas || e.kelas || "", asrama: f.asrama || e.asrama || "", halaqah: hq || undefined, nis: (f.nis || "").trim(), ...bio, ...(f.lahir ? { lahir: f.lahir } : {}) };
    base.panggilan = panggilan;
    if (e.baru) base.wali = (L.hurufKode(panggilan) || "santri") + Math.floor(10 + Math.random() * 89);
    // kode akses dibuat otomatis: panggilan + tanggal lahir (DDMMYY), huruf kecil
    if (f.lahir) base.kode = kode; else delete base.kode;
    const lama = { ...((S.data.santriEdit || {})[id] || {}) }; if (!f.lahir) delete lama.kode;
    if (await put("santriEdit", id, { ...lama, ...base })) { toast(e.baru ? `Santri ditambahkan. Kode akses wali: ${kode}` : `Data santri disimpan. Kode akses wali: ${kode}`); onClose(); }
  };
  const hapus = async () => { setAsk(false); if (await put("santriEdit", e.id, { ...((S.data.santriEdit || {})[e.id] || {}), hapus: true })) { logUbah("hapus", "santriEdit", e.id, `Santri ${e.nama} dan akun walinya dihapus`); toast("Santri dan akun walinya dihapus"); onClose(); } };
  return html`<${Sheet} open=${true} title=${e.baru ? "Tambah santri" : "Ubah data santri"} onClose=${onClose}>
    <${Field} label="Nama lengkap"><input class="in" value=${f.nama} onInput=${x => setNama(x.target.value)} /></${Field}>
    <${Field} label="Nama panggilan" hint="Dipakai untuk kode akses wali. Contoh: Ahmad Fulan bin Fulan → Fulan"><input class="in" value=${f.panggilan || ""} placeholder=${L.tebakPanggilan(f.nama) || "Nama panggilan"} onInput=${x => { setPgTulis(true); set("panggilan", x.target.value); }} /></${Field}>
    <div class="btn-row"><${Field} label="NIS" hint="Tampil di rapor"><input class="in" inputmode="numeric" value=${f.nis || ""} onInput=${x => set("nis", x.target.value)} /></${Field}>
    <${Field} label="Tanggal lahir" hint=${f.lahir ? "Untuk kode akses wali" : "Belum diisi · sementara pakai tanggal contoh"}><input class="in" type="date" value=${f.lahir || ""} onInput=${x => set("lahir", x.target.value)} /></${Field}></div>
    <details class="bio-det"><summary>Biodata lain (tampil di profil wali)</summary>
      ${[["tempatLahir", "Tempat lahir"], ["hobi", "Hobi"], ["cita", "Cita-cita"], ["alamat", "Alamat"], ["ayah", "Nama ayah"], ["ibu", "Nama ibu"], ["hpWali", "No. HP wali"]].map(([k, lab]) => html`<${Field} label=${lab}><input class="in" value=${f[k] || ""} inputmode=${k === "hpWali" ? "tel" : null} onInput=${x => set(k, x.target.value)} /></${Field}>`)}</details>
    ${f.nama.trim() ? html`<div class="pos" style="margin:0 0 12px"><span>Kode akses wali${f.lahir ? "" : " (tanggal lahir belum diisi)"}</span><b>${f.lahir ? kode : "—"}</b></div>` : null}
    ${kembar ? html`<div class="note red"><${Icon} n="alert" s=${18} />Kode ${kode} sudah dipakai ${kembar.nama}. Bedakan nama panggilannya.</div>` : null}
    <div class="btn-row"><${Field} label="Kelas"><select class="in" value=${f.kelas} onChange=${x => set("kelas", x.target.value)}>${L.KELAS.map(k => html`<option value=${k.id}>${k.nama}</option>`)}</select></${Field}>
    <${Field} label="Asrama"><select class="in" value=${f.asrama} onChange=${x => set("asrama", x.target.value)}>${L.ASRAMA.map(a => html`<option value=${a.id}>${a.nama}</option>`)}</select></${Field}></div>
    <${Field} label="Halaqah tahfidz" hint="Bawaan ikut wali asrama; bisa dipindah ke halaqah guru lain"><select class="in" value=${f.halaqah || ""} onChange=${x => set("halaqah", x.target.value)}><option value="">Ikut halaqah asrama</option>${L.HALAQAH.map(h => html`<option value=${h.id}>${h.nama}</option>`)}</select></${Field}>
    <p class="small">Saat santri pindah asrama, halaqah, atau kelas, datanya ikut pindah dan riwayat tetap tersimpan.</p>
    <div class="btn-row mt8">${!e.baru ? html`<${Btn} kind="ghost" onClick=${() => setAsk(true)}>Hapus</${Btn}>` : null}<${Btn} disabled=${!f.nama.trim() || !!kembar} onClick=${save}>Simpan</${Btn}></div>
    <${Confirm} open=${ask} danger title="Hapus santri?" text=${`${e.nama} akan dihapus dari daftar santri. Akun wali santri ini otomatis ikut terhapus dan kode aksesnya tidak bisa dipakai lagi.`} yes="Hapus" onYes=${hapus} onNo=${() => setAsk(false)} /></${Sheet}>`;
}

export function AkunAdmin() {
  useApp();
  const [ask, setAsk] = useState(null); const [ed, setEd] = useState(null); const [baruSandi, setBaruSandi] = useState(null);
  const hapusAkun = async st => { setAsk(null); if (await put("akun", st.username, { ...(L.akunOv(st.username) || {}), hapus: true, oleh: me().id, ts: Date.now() })) { logUbah("hapus", "akun", st.username, `Akun ${st.nama} dihapus`); toast(`Akun ${st.username} dihapus. Tidak bisa masuk lagi.`); } };
  const pulihkan = async st => { const o = { ...(L.akunOv(st.username) || {}) }; delete o.hapus; delete o.nonaktif; if (await put("akun", st.username, o)) { logUbah("ubah", "akun", st.username, `Akun ${st.nama} dipulihkan`); toast("Akun dipulihkan"); } };
  return html`<${SubHeader} title="Guru & Akun" sub=${`${L.staffAktif().length} akun guru dan pengurus aktif`} /><div class="wrap">
    <${Hint}>Ketuk akun untuk mengubah nama, username, peran, mapel yang diajar, atau asrama binaan. Akun hanya dibuat dan dihapus oleh Admin.</${Hint}>
    <${Btn} kind="ghost" icon="plus" onClick=${() => setEd({ baru: true, nama: "", pendek: "", username: "", roles: ["guru_mapel"], ajar: [], pondok: "29" })}>Tambah akun guru</${Btn}>
    <div class="mt12">${L.kelompokPondok(L.STAFF, s => { const p = L.pondokStaff(s); return p.length === 1 ? p[0] : "lain"; }).filter(g => g.isi.length).map(g => html`<${Section} t=${`${g.nama}${g.ket ? " · " + g.ket : ""} (${g.isi.length})`} /><${Card}><div class="list">${g.isi.map(s => { const del0 = (L.akunOv(s.username) || {}).hapus, saya = s.id === me().id, a = L.asramaOf(s.id);
      return html`<div class="row" style="align-items:flex-start;${del0 ? "opacity:.55" : ""}"><button class="row-t" style="text-align:left;display:flex;gap:12px;align-items:flex-start;min-height:44px" onClick=${() => !del0 && setEd({ ...s, asrama: a ? a.id : "" })}>
        <span class="av">${L.initials((s.pendek || s.nama).replace(/^Ust(dzh)?\.\s*/, ""))}</span><span style="min-width:0;flex:1"><b style="display:block;font-size:15px">${s.nama}</b>
        <small style="display:block;font-size:13px;color:var(--mut)">username <b style="display:inline">${s.username}</b>${del0 ? " · akun dihapus" : ""}${a ? ` · asrama ${a.nama}` : ""}</small>
        <span class="chips" style="margin-top:6px">${s.roles.map(r => html`<${Pill} t=${L.ROLE_LABEL[r] + (r === "wadir_kesantrian" ? " " + s.pondok : "")} tone="blue" />`)}${s.ajar.length ? html`<${Pill} t=${s.ajar.map(([m, k]) => `${L.mapelById(m).nama.replace("Pendidikan ", "").replace("Bahasa ", "B. ")} ${k}`).join(", ")} tone="muted" />` : null}</span></span></button>
      ${saya ? null : del0 ? html`<button class="link" onClick=${() => pulihkan(s)}>Pulihkan</button>` : html`<button class="icon-btn" aria-label=${"Hapus akun " + s.username} onClick=${() => setAsk(s)}><${Icon} n="trash" s=${20} c="#B3261E" /></button>`}</div>`; })}</div></${Card}>`)}</div>
    <${Card} title="Akun wali santri"><p class="small" style="margin:0">Setiap santri punya satu akun wali. Wali masuk dengan satu kotak <b>kode akses</b>: nama panggilan santri + tanggal lahir (tanggal, bulan, tahun), contoh <b>fulan010112</b> (Fulan, lahir 1 Januari 2012). Kode dibuat otomatis, huruf kecil semua. Tanggal lahir diisi di Data Santri. Akun wali otomatis terhapus saat santri dihapus dari Data Santri.</p>
      <div class="mt8"><${Btn} kind="ghost" icon="users" onClick=${() => nav.go("santriAdmin")}>Buka Data Santri</${Btn}></div></${Card}>
    ${ed ? html`<${EditStaff} e=${ed} onClose=${() => setEd(null)} onSandi=${(u, pw) => setBaruSandi({ u, pw })} />` : null}
    <${Confirm} open=${!!baruSandi} title="Kata sandi awal" text=${baruSandi ? `Username ${baruSandi.u}, kata sandi awal ${baruSandi.pw}. Catat dan sampaikan langsung ke pemilik akun, lalu minta ia menggantinya lewat Akun → Ubah kata sandi. Sandi ini tidak bisa dilihat lagi setelah jendela ditutup.` : ""} yes="Sudah dicatat" onYes=${() => setBaruSandi(null)} onNo=${() => setBaruSandi(null)} />
    <${Confirm} open=${!!ask} danger title="Hapus akun ini?" text=${ask ? `${ask.nama} (${ask.username}) tidak akan bisa masuk lagi. Data yang pernah dicatatnya tetap tersimpan. Admin bisa memulihkannya.` : ""} yes="Hapus akun" onYes=${() => hapusAkun(ask)} onNo=${() => setAsk(null)} /></div>`;
}
const PERAN = ["mudir", "wadir_tahfidz", "wadir_kurikulum", "wadir_kesantrian", "guru_tahfidz", "musyrif", "guru_mapel", "admin"];
function EditStaff({ e, onClose, onSandi }) {
  const [f, setF] = useState({ ...e, ajar: [...(e.ajar || [])], roles: [...(e.roles || [])], asrama: e.asrama || "" }); const [busy, setBusy] = useState(false);
  const set = (k, v) => setF({ ...f, [k]: v });
  const togR = r => set("roles", f.roles.includes(r) ? f.roles.filter(x => x !== r) : [...f.roles, r]);
  const togA = (m, k) => set("ajar", f.ajar.some(([a, b]) => a === m && b === k) ? f.ajar.filter(([a, b]) => !(a === m && b === k)) : [...f.ajar, [m, k]]);
  const un = (f.username || "").trim().toLowerCase(), saya = !e.baru && e.id === me().id;
  const dupe = L.STAFF.some(s => s.username === un && s.id !== e.id) || L.santriList().some(s => s.wali === un);
  const oldA = e.baru ? null : L.asramaOf(e.id), newA = f.roles.includes("musyrif") ? f.asrama : "";
  const sandiBaru = String(f.sandi || ""), bawaan = L.sandiReset({ ...f, pendek: (f.pendek || "").trim() || f.nama });
  const err = !f.nama.trim() ? "Nama wajib diisi." : f.hp && String(f.hp).trim() && !L.waNomor(f.hp) ? "Nomor WhatsApp belum benar. Contoh: 0812 3456 7890" : sandiBaru && sandiBaru.length < 6 ? "Kata sandi minimal 6 karakter." : !/^[a-z0-9]{3,20}$/.test(un) ? "Username 3–20 huruf kecil/angka tanpa spasi." : dupe ? "Username sudah dipakai." : !f.roles.length ? "Pilih minimal satu peran."
    : saya && e.roles.includes("admin") && !f.roles.includes("admin") ? "Anda tidak bisa mencabut peran Admin dari akun sendiri." : oldA && newA !== oldA.id && !newA ? `${oldA.nama} akan tanpa wali asrama. Pilih asrama pengganti, atau tetapkan guru lain untuk ${oldA.nama} dulu.` : "";
  const pindah = newA && (!oldA || newA !== oldA.id) ? L.asramaById(newA) : null, ganti = pindah ? L.staffById(pindah.musyrif) : null;
  const save = async () => {
    setBusy(true);
    const id = e.baru ? uid("g").toLowerCase() : e.id, rename = !e.baru && un !== e.username;
    const d = { nama: f.nama.trim(), pendek: (f.pendek || "").trim() || f.nama.trim().split(",")[0].split(" ").slice(0, 2).join(" "), username: un, roles: f.roles, hp: L.waNomor(f.hp) ? L.waNomor(f.hp) : "", tampilWali: f.tampilWali !== false, ajar: f.roles.includes("guru_mapel") ? f.ajar : [], ...(f.roles.includes("wadir_kesantrian") ? { pondok: f.pondok || "29" } : {}),
    };
    const pw = sandiBaru || (e.baru || rename ? L.sandiReset(d) : null), lama = { ...((S.data.staffEdit || {})[id] || {}) }; delete lama.password; delete lama.sandiHash;
    let ok = await put("staffEdit", id, { ...lama, ...d });
    if (ok && pw) { const ov = { ...(rename ? L.akunOv(e.username) || {} : {}) }; delete ov.email; delete ov.menungguReset; L.mulaiGantiSandi(un); ok = await put("akun", un, { ...ov, hash: await L.sha(un + ":" + pw), diubah: Date.now() }); if (ok) await L.sesiSandiBaru(un, await L.sha(un + ":" + pw)); if (ok && rename) await del("akun", e.username); }
    if (ok && pindah) { const AE = S.data.asramaEdit || {}; await put("asramaEdit", pindah.id, { ...(AE[pindah.id] || {}), musyrif: id }); if (oldA && ganti) await put("asramaEdit", oldA.id, { ...(AE[oldA.id] || {}), musyrif: ganti.id }); }
    setBusy(false);
    if (ok) { logUbah(e.baru ? "tambah" : "ubah", "staffEdit", id, `${e.baru ? "Akun baru" : "Ubah akun"} ${d.nama}${rename ? ` (username ${e.username} → ${un})` : ""}${pindah ? ` · asrama ${pindah.nama}` : ""}`);
      toast(e.baru ? "Akun dibuat" : sandiBaru ? "Disimpan. Kata sandi baru berlaku" : rename ? "Disimpan. Username baru, kata sandi direset" : "Data akun disimpan"); if (pw && !sandiBaru && onSandi) onSandi(un, pw); onClose(); }
  };
  const reset = async () => { const pw = L.sandiReset(e), ov = { ...(L.akunOv(e.username) || {}) }; delete ov.email; delete ov.menungguReset; L.mulaiGantiSandi(e.username); if (!(await put("akun", e.username, { ...ov, hash: await L.sha(e.username + ":" + pw), diubah: Date.now() }))) return; await L.sesiSandiBaru(e.username, await L.sha(e.username + ":" + pw)); const se = { ...((S.data.staffEdit || {})[e.id] || {}) }; if (se.password) { delete se.password; await put("staffEdit", e.id, se); } logUbah("ubah", "akun", e.username, `Reset sandi ${e.nama}`); toast("Kata sandi direset"); if (onSandi) onSandi(e.username, pw); onClose(); };
  return html`<${Sheet} open=${true} title=${e.baru ? "Tambah akun guru" : "Ubah akun guru"} onClose=${onClose}>
    <${Field} label="Nama lengkap dengan gelar"><input class="in" value=${f.nama} placeholder="Ust. Nama Lengkap, S.Pd" onInput=${x => set("nama", x.target.value)} /></${Field}>
    <div class="btn-row"><${Field} label="Nama panggilan"><input class="in" value=${f.pendek} placeholder="Ust. Nama" onInput=${x => set("pendek", x.target.value)} /></${Field}>
      <${Field} label="Username"><input class="in" autocapitalize="none" value=${f.username} onInput=${x => set("username", x.target.value.toLowerCase().replace(/\s/g, ""))} /></${Field}></div>
    <${Field} label="No. WhatsApp" hint="Tampil sebagai kontak di akun wali santri yang terkait (wali asrama, guru halaqah, guru mapel, pimpinan)."><input class="in" type="tel" inputmode="tel" placeholder="0812 3456 7890" value=${f.hp ? (String(f.hp).startsWith("62") ? "0" + String(f.hp).slice(2) : f.hp) : ""} onInput=${x => set("hp", x.target.value)} /></${Field}>
    <label class="cek-row" style="display:flex;gap:10px;align-items:center;margin:-4px 0 12px;font-size:14px"><input type="checkbox" checked=${f.tampilWali !== false} onChange=${x => set("tampilWali", x.target.checked)} /> Tampilkan nomor ini di akun wali</label>
    <${Field} label=${e.baru ? "Kata sandi" : "Kata sandi baru"} hint=${e.baru ? `Kosongkan untuk memakai sandi bawaan: ${bawaan}` : un !== e.username ? `Username berubah: bila dikosongkan, sandi menjadi ${bawaan}` : "Kosongkan bila tidak diganti"}><${PassInput} value=${f.sandi || ""} autocomplete="new-password" placeholder=${e.baru ? bawaan : "tidak diganti"} onInput=${x => set("sandi", x.target.value)} /></${Field}>
    <${Field} label="Peran"><div class="chips">${PERAN.map(r => html`<button type="button" class=${"pill " + (f.roles.includes(r) ? "green" : "muted")} style="min-height:36px;padding:0 12px" aria-pressed=${f.roles.includes(r)} onClick=${() => togR(r)}>${f.roles.includes(r) ? "✓ " : ""}${L.ROLE_LABEL[r]}</button>`)}</div></${Field}>
    ${f.roles.includes("wadir_kesantrian") ? html`<${Field} label="Wadir kesantrian untuk"><${Seg} small items=${[["29", "Pondok 29"], ["21", "Pondok 21"]]} value=${f.pondok || "29"} onChange=${v => set("pondok", v)} /></${Field}>` : null}
    ${f.roles.includes("musyrif") ? html`<${Field} label="Asrama binaan (wali asrama)"><select class="in" value=${f.asrama} onChange=${x => set("asrama", x.target.value)}><option value="">— belum ada —</option>
      ${L.ASRAMA.map(a => html`<option value=${a.id}>${a.nama} · ${a.musyrif === e.id ? "saat ini" : L.staffAman(a.musyrif).pendek}</option>`)}</select></${Field}>
      ${pindah && ganti && ganti.id !== e.id ? html`<p class="small" style="margin-top:-6px">${oldA ? `Ditukar: ${ganti.pendek} pindah ke ${oldA.nama}.` : `${ganti.pendek} tidak lagi membina ${pindah.nama}.`}</p>` : null}` : null}
    ${f.roles.includes("guru_tahfidz") && !e.baru ? html`<div class="pos" style="margin:0 0 12px"><span>Halaqah tahfidz</span><b>${(L.halaqahOf(e.id) || {}).nama || "Belum ada · buat di menu Halaqah"}</b></div>` : null}
    ${f.roles.includes("guru_mapel") ? html`<${Field} label="Mapel yang diajar"><div style="display:grid;gap:6px">${DATA.mapel.map(m => html`<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><b style="font-size:13px;width:110px">${m.nama.replace("Pendidikan ", "P. ")}</b>
      ${L.KELAS.map(k => { const on = f.ajar.some(([a, b]) => a === m.id && b === k.id); return html`<button type="button" class=${"pill " + (on ? "green" : "muted")} style="min-height:36px;min-width:44px" aria-pressed=${on} onClick=${() => togA(m.id, k.id)}>${k.id}</button>`; })}</div>`)}</div></${Field}>
      <p class="small" style="margin-top:-6px">Jadwal mengajar disesuaikan di menu Kurikulum → Jadwal Mengajar.</p>` : null}
    ${err ? html`<div class="note red"><${Icon} n="alert" s=${18} />${err}</div>` : null}
    <div class="btn-row mt8">${!e.baru ? html`<${Btn} kind="outline" icon="lock" onClick=${reset}>Reset sandi</${Btn}>` : null}<${Btn} disabled=${!!err || busy} onClick=${save}>${busy ? "Menyimpan…" : "Simpan"}</${Btn}></div></${Sheet}>`;
}

export function AsramaAdmin({ halaqah }) {
  useApp();
  return html`<${SubHeader} title=${halaqah ? "Halaqah" : "Asrama"} sub="11 asrama di 2 pondok" /><div class="wrap">
    ${["29", "21"].map(p => html`<${Card} title=${"Pondok " + p}><div class="list">${L.ASRAMA.filter(a => a.pondok === p).map(a => html`<${Row} name=${(halaqah ? "Halaqah " : "") + (halaqah ? L.staffAman(a.musyrif).pendek : a.nama)} sub=${halaqah ? `Asrama ${a.nama} · ${L.santriAsrama(a.id).length} santri` : `${L.staffAman(a.musyrif).nama} · ${L.santriAsrama(a.id).length} santri`} onClick=${() => nav.go("santriAdmin", { asrama: a.id })} />`)}</div></${Card}>`)}</div>`;
}

export function KelasAdmin() {
  useApp();
  return html`<${SubHeader} title="Kelas" sub="Semester ganjil 2026/2027" /><div class="wrap">${L.kelompokPondok(L.KELAS, k => k.pondok).map(g => html`<${Card} title=${g.nama}><div class="list">
    ${g.isi.map(k => html`<${Row} name=${k.nama} sub=${`${L.santriKelas(k.id).length} santri`} icon=${html`<${Icon} n="grid" s=${18} />`} onClick=${() => nav.go("santriAdmin", { kelas: k.id })} />`)}</div></${Card}>`)}</div>`;
}

export function Pengumuman() {
  useApp();
  const can = has("admin") || has("mudir");
  const [f, setF] = useState({ judul: "", isi: "", lampiran: "" }); const [ask, setAsk] = useState(null);
  const l = all("pengumuman").sort((a, b) => b.ts - a.ts);
  const [aiBusy, aiRun] = useAIRun();
  const rapikan = () => aiRun(async () => {
    const j = await tanyaAI({ sistem: SISTEM_DASAR, json: true, teks: `Rapikan pengumuman pondok berikut agar jelas, sopan, dan mudah dibaca ustadz serta wali santri. Pertahankan semua fakta (tanggal, jam, tempat, nama) persis; jangan menambah fakta baru. Boleh memakai butir "- " untuk rincian. Awali isi dengan salam bila cocok. Judul maksimal 70 karakter.\nJudul: ${f.judul}\nIsi/poin: ${f.isi}\nJawab JSON: {"judul":"","isi":""}` });
    setF({ ...f, judul: (j.judul || f.judul).slice(0, 90), isi: j.isi || f.isi }); toast("Pengumuman dirapikan. Periksa sebelum dikirim.");
  });
  const save = async () => { if (await put("pengumuman", uid("p"), { ...f, oleh: me() ? me().id : "", ts: Date.now() })) { toast("Pengumuman terkirim ke semua akun"); setF({ judul: "", isi: "", lampiran: "" }); } };
  return html`<${SubHeader} title="Pengumuman" sub=${can ? "Tampil di semua akun" : "Dari Admin dan Mudir"} />
    <div class="wrap">${can ? html`<${Card} title="Buat pengumuman"><${Field} label="Judul"><input class="in" value=${f.judul} onInput=${e => setF({ ...f, judul: e.target.value })} placeholder="Misal: Jadwal perpulangan akhir semester" /></${Field}>
      <${Field} label="Isi"><textarea class="in" style="min-height:110px" value=${f.isi} placeholder="Boleh tulis poin-poinnya saja, lalu rapikan dengan AI" onInput=${e => setF({ ...f, isi: e.target.value })}></textarea></${Field}>
      <${AiBtn} kecil label="Rapikan dengan AI" busy=${aiBusy} onClick=${() => (f.judul.trim() || f.isi.trim() ? rapikan() : toast("Tulis judul atau poin isinya dulu", "err"))} />
      <${Field} label="Lampiran PDF (nama file saja di demo)"><input type="file" accept="application/pdf" class="in" onChange=${e => setF({ ...f, lampiran: e.target.files[0] ? e.target.files[0].name : "" })} /></${Field}>
      <${Btn} disabled=${!f.judul.trim()} onClick=${save} icon="megaphone">Kirim pengumuman</${Btn}></${Card}>` : null}
    <${Section} t="Semua pengumuman" /><${Card}>${l.length ? html`<div class="list">${l.map(p => html`<div class="row" style="align-items:flex-start"><span class="row-ic"><${Icon} n="megaphone" s=${18} /></span><span class="row-t"><b style="white-space:normal">${p.judul}</b>
      <small>${p.oleh ? L.staffAman(p.oleh).nama : "Pondok"} · ${L.fmtTgl(L.ymd(new Date(p.ts)))}${p.lampiran ? " · 📎 " + p.lampiran : ""}</small>${p.isi ? html`<p style="margin:6px 0 0;font-size:13.5px;line-height:1.5;white-space:pre-line">${p.isi}</p>` : null}</span>
      ${can ? html`<button class="icon-btn" aria-label="Hapus pengumuman" onClick=${() => setAsk(p)}><${Icon} n="x" s=${16} /></button>` : null}</div>`)}</div>` : html`<${Empty} t="Belum ada pengumuman." icon="megaphone" />`}</${Card}>
    <${Confirm} open=${!!ask} danger title="Hapus pengumuman?" text=${ask ? ask.judul : ""} yes="Hapus" onYes=${() => { del("pengumuman", ask.id); setAsk(null); }} onNo=${() => setAsk(null)} /></div>`;
}
