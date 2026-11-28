import * as L from "./logic.js";
// Tab bawah menyesuaikan peran: posisi 2 & 4 berganti, Beranda – Cari – Akun selalu ada.
export function tabStaf(st) {
  const r = (st && st.roles) || [], tim = ["tim", "Tim", "users"], kal = ["kalender", "Kalender", "cal2"];
  const mengajar = !!L.halaqahOf(st.id) || (st.ajar || []).length > 0;
  const penginput = r.some(x => ["guru_tahfidz", "guru_mapel", "musyrif", "wadir_tahfidz", "wadir_kurikulum", "wadir_kesantrian"].includes(x));
  const jadwal = ["jadwal", "Jadwal", "calendar"];
  let dua, empat;
  if (r.includes("mudir")) { dua = ["pantauan", "Pantauan", "eye"]; empat = mengajar ? jadwal : tim; }
  else if (r.includes("admin") && !mengajar) { dua = ["dataMaster", "Data Master", "grid"]; empat = ["daftarAkun", "Daftar Akun", "users"]; }
  else if (mengajar) { dua = jadwal; empat = penginput ? ["riwayat", "Riwayat", "clock"] : tim; }
  else { dua = tim; empat = penginput ? ["riwayat", "Riwayat", "clock"] : kal; }
  return [["home", "Beranda", "home"], dua, ["cari", "Cari", "search"], empat, ["akun", "Akun", "user"]];
}
