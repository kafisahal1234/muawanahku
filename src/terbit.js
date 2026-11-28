// Jadwal terbit Laporan Berkala (murni: dipakai aplikasi dan pengirim notifikasi di server)
import * as L from "./logic.js";
export const JENIS_LABEL = { harian: "Harian", pekanan: "Pekanan", bulanan: "Bulanan", mid: "Tengah Semester", semester: "Semester", tahunan: "Tahunan" };
const JAM = 10;
const jamTerbit = tgl => { const d = L.parseYmd(tgl); d.setHours(JAM, 0, 0, 0); return d; };
export const pad = n => String(n).padStart(2, "0");
const akhirBulan = (y, m) => new Date(y, m + 1, 0).getDate();
// Semua laporan yang sudah terbit sampai saat ini (terbaru di atas)
export function daftarTerbit(now = new Date()) {
  const st = L.setelan(), awal = st.mulaiPakai || st.ganjilMulai, hasil = [];
  const tambah = (jenis, ref, tglTerbit) => { const t = jamTerbit(tglTerbit); if (t > now || tglTerbit < awal) return;
    const rg = L.periodeRange(jenis, ref); if (L.rentangHitung(rg).kosong) return;
    hasil.push({ id: `${jenis}:${rg.dari}`, jenis, ref, rg, terbit: t, judul: `Laporan ${JENIS_LABEL[jenis]}`, label: rg.label }); };
  // pekanan: Sabtu tiap pekan (12 pekan terakhir)
  for (let w = L.weekStart(L.ymd(now)), i = 0; i < 12; i++, w = L.addDays(w, -7)) tambah("pekanan", w, L.addDays(w, 5));
  // bulanan: 6 bulan terakhir
  for (let i = 0; i < 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1), y = d.getFullYear(), m = d.getMonth();
    tambah("bulanan", `${y}-${pad(m + 1)}-01`, `${y}-${pad(m + 1)}-${pad(Math.min(29, akhirBulan(y, m)))}`); }
  [[st.ganjilMulai, st.ganjilMid, st.ganjilSelesai], [st.genapMulai, st.genapMid, st.genapSelesai]].forEach(([a, mid, sel]) => {
    if (a && mid) tambah("mid", a, mid);
    if (a && sel) tambah("semester", a, sel);
  });
  if (st.genapSelesai) tambah("tahunan", st.ganjilMulai, st.genapSelesai);
  return hasil.sort((a, b) => b.terbit - a.terbit || a.jenis.localeCompare(b.jenis));
}
export function jadwalBerikut(now = new Date()) {
  const t = L.ymd(now), w = L.weekStart(t), sab = L.addDays(w, 5), dSab = jamTerbit(sab);
  return dSab > now ? dSab : jamTerbit(L.addDays(sab, 7));
}
