// Ikon aplikasi berwarna (gaya ikon menu aplikasi mobile): lapisan isi + detail putih + aksen emas.
// a = warna utama, b = warna gelap, w = garis putih, s = garis gelap, g = emas, gs = garis emas, t = isi muda
import { h } from "preact";
import htm from "htm";
const html = htm.bind(h);

const C = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const KAL = [["a", "M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5z"], ["b", "M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V10H3z"], ["s", "M8 3v4M16 3v4"]];
const PAPAN = [["a", "M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v14a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 19.5z"], ["b", "M9 1.8h6a1 1 0 0 1 1 1V5a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V2.8a1 1 0 0 1 1-1z"]];
const KITAB = [["a", "M2.5 6A1.5 1.5 0 0 1 4 4.5h5A3 3 0 0 1 12 7.5V20a2.5 2.5 0 0 0-2.5-2H4A1.5 1.5 0 0 1 2.5 16.5z"], ["b", "M21.5 6A1.5 1.5 0 0 0 20 4.5h-5A3 3 0 0 0 12 7.5V20a2.5 2.5 0 0 1 2.5-2H20a1.5 1.5 0 0 0 1.5-1.5z"]];
export const DUO = {
  quran: [...KITAB, ["w", "M5.5 9h3.5M5.5 12h3.5M15 9h3.5M15 12h3.5"], ["g", "M16 4.5h3v5l-1.5-1.1L16 9.5z"]],
  kalender: [...KAL, ["w", "M7 13.5h2M11 13.5h2M15 13.5h2M7 17h2M11 17h2"]],
  kalender2: [...KAL, ["g", "M12 11.6l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z"]],
  masjid: [["a", "M4.5 21v-6.5a7.5 7.5 0 0 1 15 0V21z"], ["b", "M10 21v-3.5a2 2 0 0 1 4 0V21z"], ["s", "M2.5 21h19"], ["g", "M12.6 2.2a2.6 2.6 0 1 0 2.2 3.9 2 2 0 1 1-2.2-3.9z"]],
  ceklis: [...PAPAN, ["w", "M8.5 12.8l2.4 2.4 4.6-4.9"]],
  bap: [...PAPAN, ["w", "M12 9.5v4.2M12 17h.01"]],
  pintu: [["a", "M5 21V4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5V21z"], ["b", "M8 21V6.2l7-1.6V21z"], ["g", C(12.6, 13, 1.1)], ["s", "M3 21h18"]],
  medali: [["b", "M8.3 13.4L6 21l3-1.6 2 2.6 1.1-6.3zM15.7 13.4L18 21l-3-1.6-2 2.6-1.1-6.3z"], ["a", C(12, 9, 6.6)], ["g", "M12 5.4l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 11.3l-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z"]],
  grafik: [["a", "M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"], ["w", "M7.5 17v-4M12 17V7.5M16.5 17v-6.5"], ["g", C(16.5, 7.5, 1.4)]],
  mapel: [["b", "M3.6 15.9L12 20.1l8.4-4.2 1.1.6-9.5 4.8-9.5-4.8zM3.6 11.6L12 15.8l8.4-4.2 1.1.6-9.5 4.8-9.5-4.8z"], ["a", "M12 2.8l9.5 4.8-9.5 4.8-9.5-4.8z"], ["g", C(12, 7.6, 1.3)]],
  database: [["a", "M4 6c0-1.8 3.6-3.2 8-3.2s8 1.4 8 3.2v12c0 1.8-3.6 3.2-8 3.2s-8-1.4-8-3.2z"], ["b", "M4 6c0 1.8 3.6 3.2 8 3.2S20 7.8 20 6s-3.6-3.2-8-3.2S4 4.2 4 6z"], ["w", "M4 12c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2"]],
  perisai: [["a", "M12 2.5l8 3v6c0 5-3.4 8.8-8 10-4.6-1.2-8-5-8-10v-6z"], ["b", "M12 2.5l8 3v6c0 5-3.4 8.8-8 10z"], ["w", "M8.5 12l2.4 2.4 4.6-4.8"]],
  atur: [["a", "M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"], ["w", "M7 8h10M7 12h10M7 16h10"], ["g", C(10, 8, 1.6) + C(15, 12, 1.6) + C(9, 16, 1.6)]],
  jamaah: [["b", C(16.5, 7.6, 3) + "M12.6 20a5.7 5.7 0 0 1 9.4-4.3V20z"], ["a", C(9, 8, 3.6) + "M2.2 20.5a6.8 6.8 0 0 1 13.6 0z"]],
  mik: [["a", "M9 4.8a3 3 0 0 1 6 0v6.4a3 3 0 0 1-6 0z"], ["s", "M5.6 10.6a6.4 6.4 0 0 0 12.8 0M12 17.4V21M8.5 21h7"], ["w", "M10.6 6.5h2.8M10.6 9h2.8"]],
  ziyadah: [...KITAB, ["g", C(18, 17.5, 4.6)], ["w", "M18 15.4v4.2M15.9 17.5h4.2"]],
  murojaah: [["a", C(12, 12, 9.5)], ["w", "M7.8 10.6a4.6 4.6 0 0 1 7.9-2.3M16.2 13.4a4.6 4.6 0 0 1-7.9 2.3M15.9 5.6v2.9H13M8.1 18.4v-2.9H11"]],
  toa: [["a", "M3 10v4a1 1 0 0 0 1 1h3l8.5 5V4L7 9H4a1 1 0 0 0-1 1z"], ["b", "M7 9v6l8.5 5V4z"], ["gs", "M18.6 8.6a4.8 4.8 0 0 1 0 6.8M20.8 6.4a8 8 0 0 1 0 11.2"]],
  obrolan: [["a", "M3.5 6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6.3L6 21v-4h0a2.5 2.5 0 0 1-2.5-2.5z"], ["w", "M8.4 10h.01M12 10h.01M15.6 10h.01"], ["g", "M20.5 1.2l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z"]],
  unggah: [["a", "M6.5 2.5H14l5.5 5.5v12A1.5 1.5 0 0 1 18 21.5H6.5A1.5 1.5 0 0 1 5 20V4a1.5 1.5 0 0 1 1.5-1.5z"], ["b", "M14 2.5V8h5.5z"], ["w", "M12.2 18v-6.4M9.6 14.2l2.6-2.6 2.6 2.6"]],
  dokumen: [["a", "M6.5 2.5H14l5.5 5.5v12A1.5 1.5 0 0 1 18 21.5H6.5A1.5 1.5 0 0 1 5 20V4a1.5 1.5 0 0 1 1.5-1.5z"], ["b", "M14 2.5V8h5.5z"], ["w", "M8.5 12h7M8.5 15h7M8.5 18h4"]],
  nilai: [["a", "M6.5 2.5h11A1.5 1.5 0 0 1 19 4v16a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V4a1.5 1.5 0 0 1 1.5-1.5z"], ["w", "M8.5 7.5h7M8.5 11h7M8.5 14.5h3.5"], ["g", C(17, 17.5, 4.3)], ["w", "M15.2 17.6l1.3 1.3 2.4-2.6"]],
  absen: [...KAL, ["w", "M8.6 15.2l2.4 2.4 4.6-4.8"]],
  bintang: [["a", "M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"], ["b", "M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3z"]],
  target: [["a", C(12, 12, 9.5)], ["w", C(12, 12, 5.6)], ["g", C(12, 12, 2.4)]],
  orang: [["a", C(12, 8, 4.2)], ["b", "M3.8 21a8.2 8.2 0 0 1 16.4 0z"]],
  gembok: [["b", "M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10h-2V7.5a2.5 2.5 0 0 0-5 0V10z"], ["a", "M4.5 11.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z"], ["g", C(12, 15, 1.8)]],
  lonceng: [["a", "M6 16V11a6 6 0 0 1 12 0v5l1.8 2.2H4.2z"], ["g", "M10 19.8h4a2 2 0 0 1-4 0z"]],
  jam: [["a", C(12, 12, 9.5)], ["w", "M12 7v5.3l3.4 2.1"]],
  hati: [["a", "M12 20.5s-8.5-5.2-8.5-11A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 2.9c0 5.8-8.5 11-8.5 11z"], ["w", "M7.3 9.6a2.2 2.2 0 0 1 2-1.8"]],
  rumah: [["a", "M3.5 10.6L12 3.5l8.5 7.1V20a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 20z"], ["b", "M9.5 21.5v-6a2.5 2.5 0 0 1 5 0v6z"]],
  tas: [["a", "M3 8.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"], ["s", "M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5"], ["b", "M3 12.5h18v1.6H3z"], ["g", "M10.5 12h3v3h-3z"]],
  cetak: [["b", "M6.5 3h11v5h-11z"], ["a", "M3 10a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7h-3.5v-3h-11v3H3z"], ["w", "M7.5 15.5h9V21h-9z"]],
  kunciBuku: [...KITAB],
};
// nama ikon garis lama → ikon berwarna
export const PETA = { bookopen: "quran", book: "quran", calendar: "kalender", cal2: "kalender2", moon: "masjid", checksq: "ceklis", door: "pintu", award: "medali", chart: "grafik", trend: "grafik",
  layers: "mapel", grid: "database", shield: "perisai", sliders: "atur", users: "jamaah", mic: "mik", plus: "ziyadah", repeat: "murojaah", megaphone: "toa", sparkle: "obrolan",
  upload: "unggah", file: "dokumen", edit: "nilai", clipboard: "bap", alert: "bap", star: "bintang", target: "target", user: "orang", lock: "gembok", bell: "lonceng", clock: "jam",
  heart: "hati", home: "rumah", home2: "rumah", briefcase: "tas", printer: "cetak", pen: "nilai" };
// palet ikon: [utama, gelap, latar muda]
export const WARNA = { emerald: ["#2DB673", "#0C7547", "#E5F5EC"], green: ["#36B06A", "#156E3C", "#E6F4EB"], blue: ["#4D8EF5", "#1E59C6", "#E7EFFD"], orange: ["#FF9B42", "#D45F10", "#FFF0E1"],
  coral: ["#FF6F61", "#C63A2D", "#FFEBE8"], gold: ["#F5BC3A", "#B98008", "#FFF5DC"], teal: ["#26B3A5", "#0D7A70", "#E1F5F3"], indigo: ["#7C7DF4", "#4846C6", "#EDEDFD"],
  pink: ["#F26AA4", "#BF2E6C", "#FDE9F1"], purple: ["#A57BF6", "#6C3CD8", "#F1EAFE"], slate: ["#6E8BA3", "#3D5468", "#EAF0F5"] };
export function Ikon({ n, warna = "emerald", s = 32 }) {
  const [a, b] = WARNA[warna] || WARNA.emerald, L = DUO[PETA[n] || n];
  if (!L) return null;
  return html`<svg width=${s} height=${s} viewBox="0 0 24 24" aria-hidden="true">${L.map(([k, d]) => k === "w" ? html`<path d=${d} fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />`
    : k === "s" ? html`<path d=${d} fill="none" stroke=${b} stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />`
    : k === "gs" ? html`<path d=${d} fill="none" stroke="#F2B12B" stroke-width="1.9" stroke-linecap="round" />`
    : html`<path d=${d} fill=${k === "a" ? a : k === "b" ? b : "#F6B92E"} />`)}</svg>`;
}
export const adaIkon = n => !!DUO[PETA[n] || n];
