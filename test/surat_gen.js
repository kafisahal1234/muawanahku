import { S } from "../src/store.js";
import { buatSurat, saranTindakan } from "../src/surat.js";
import { DATA } from "../src/data.js";
window.__run = (data, list) => { S.data = data; const out = {}; for (const [j, id] of list) out[j + "_" + id] = buatSurat(j, id).html; return out; };
window.__saran = (data, sid, pid) => { S.data = data; return saranTindakan(sid, DATA.pelanggaran.find(p => p.id === pid)); };
