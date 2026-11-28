// Halaman gabungan: dua rekap yang mirip dijadikan satu halaman bertab (dipakai di menu Mudir).
import { useState } from "preact/hooks";
import { html, useApp, Seg } from "./ui.js";
import { Peringkat, RekapTasmi } from "./s_wadir.js";
import { Jadwal, Pengampu } from "./s_kurikulum.js";
import { RekapIzin, RekapPelanggaran } from "./s_kesantrian.js";

const JENIS = {
  peringkatTasmi: { t: "Peringkat & Tasmi'", tabs: [["peringkat", "Peringkat hafalan", Peringkat], ["tasmi", "Hasil tasmi'", RekapTasmi]] },
  jadwalPengampu: { t: "Jadwal & Pengampu", tabs: [["jadwal", "Jadwal mengajar", Jadwal], ["pengampu", "Guru pengampu", Pengampu]] },
  izinPelanggaran: { t: "Izin & Pelanggaran", tabs: [["izin", "Izin & pulang", RekapIzin], ["pel", "Pelanggaran", RekapPelanggaran]] },
};
export function Gabung({ jenis, tab, ...props }) {
  useApp();
  const J = JENIS[jenis] || JENIS.peringkatTasmi, [k, setK] = useState(tab || J.tabs[0][0]);
  const T = J.tabs.find(x => x[0] === k) || J.tabs[0], C = T[2];
  const seg = html`<div class="gb-seg"><${Seg} items=${J.tabs.map(([id, l]) => [id, l])} value=${k} onChange=${setK} /></div>`;
  return html`<${C} key=${k} ...${props} ro=${true} gabung=${{ t: J.t, seg }} />`;
}
