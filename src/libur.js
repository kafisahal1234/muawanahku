// Libur nasional & cuti bersama — SKB 3 Menteri 2026 (No. 1497/2/5 Th 2025) dan 2027 (No. 1205/3/2 Th 2026)
export const LIBUR_NASIONAL = [
  ["2026-01-01", "Tahun Baru 2026 Masehi", "nasional"], ["2026-01-16", "Isra Mikraj Nabi Muhammad SAW", "nasional"], ["2026-02-16", "Cuti bersama Imlek", "cuti"],
  ["2026-02-17", "Tahun Baru Imlek 2577", "nasional"], ["2026-03-18", "Cuti bersama Nyepi", "cuti"], ["2026-03-19", "Hari Suci Nyepi 1948", "nasional"],
  ["2026-03-20", "Cuti bersama Idul Fitri", "cuti"], ["2026-03-21", "Idul Fitri 1447 H", "nasional"], ["2026-03-22", "Idul Fitri 1447 H", "nasional"],
  ["2026-03-23", "Cuti bersama Idul Fitri", "cuti"], ["2026-03-24", "Cuti bersama Idul Fitri", "cuti"], ["2026-04-03", "Wafat Yesus Kristus", "nasional"],
  ["2026-04-05", "Paskah", "nasional"], ["2026-05-01", "Hari Buruh Internasional", "nasional"], ["2026-05-14", "Kenaikan Yesus Kristus", "nasional"],
  ["2026-05-15", "Cuti bersama Kenaikan Yesus Kristus", "cuti"], ["2026-05-27", "Idul Adha 1447 H", "nasional"], ["2026-05-28", "Cuti bersama Idul Adha", "cuti"],
  ["2026-05-31", "Hari Raya Waisak 2570", "nasional"], ["2026-06-01", "Hari Lahir Pancasila", "nasional"], ["2026-06-16", "Tahun Baru Islam 1448 H", "nasional"],
  ["2026-08-17", "Hari Kemerdekaan RI", "nasional"], ["2026-08-25", "Maulid Nabi Muhammad SAW", "nasional"], ["2026-12-24", "Cuti bersama Natal", "cuti"],
  ["2026-12-25", "Hari Raya Natal", "nasional"],
  ["2027-01-01", "Tahun Baru 2027 Masehi", "nasional"], ["2027-01-05", "Isra Mikraj Nabi Muhammad SAW 1448 H", "nasional"], ["2027-02-05", "Cuti bersama Imlek", "cuti"],
  ["2027-02-06", "Tahun Baru Imlek 2578", "nasional"], ["2027-03-08", "Hari Suci Nyepi 1949", "nasional"], ["2027-03-09", "Cuti bersama Idul Fitri", "cuti"],
  ["2027-03-10", "Idul Fitri 1448 H", "nasional"], ["2027-03-11", "Idul Fitri 1448 H", "nasional"], ["2027-03-12", "Cuti bersama Idul Fitri", "cuti"],
  ["2027-03-15", "Cuti bersama Idul Fitri", "cuti"], ["2027-03-25", "Cuti bersama Wafat Yesus Kristus", "cuti"], ["2027-03-26", "Wafat Yesus Kristus", "nasional"],
  ["2027-03-28", "Paskah", "nasional"], ["2027-05-01", "Hari Buruh Internasional", "nasional"], ["2027-05-06", "Kenaikan Yesus Kristus", "nasional"],
  ["2027-05-17", "Idul Adha 1448 H", "nasional"], ["2027-05-18", "Cuti bersama Idul Adha", "cuti"], ["2027-05-19", "Cuti bersama Waisak", "cuti"],
  ["2027-05-20", "Hari Raya Waisak 2571", "nasional"], ["2027-06-01", "Hari Lahir Pancasila", "nasional"], ["2027-06-06", "Tahun Baru Islam 1449 H", "nasional"],
  ["2027-08-15", "Maulid Nabi Muhammad SAW", "nasional"], ["2027-08-17", "Hari Kemerdekaan RI", "nasional"], ["2027-12-24", "Cuti bersama Natal", "cuti"],
  ["2027-12-25", "Hari Raya Natal", "nasional"], ["2027-12-26", "Isra Mikraj Nabi Muhammad SAW 1449 H", "nasional"],
].map(([tgl, nama, jenis]) => ({ tgl, nama, jenis }));
// Default tahun pelajaran (bisa diubah admin di menu Kalender)
export const SETELAN_DEFAULT = { waPondok: "6289636117171", tp: "2026/2027", ganjilMulai: "2026-07-13", ganjilMid: "2026-09-26", ganjilSelesai: "2026-12-19",
  genapMulai: "2027-01-04", genapMid: "2027-03-27", genapSelesai: "2027-06-19", mulaiPakai: "2026-11-16", abaikan: [] };
