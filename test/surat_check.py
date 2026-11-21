import asyncio, json, time
from playwright.async_api import async_playwright
FOTO = open("/tmp/sg/foto.txt").read()
ts = int(time.time() * 1000)
D = {"izin": {
  "i1": {"santri": "s001", "jenis": "Perpulangan", "alasan": "Menghadiri pernikahan kakak", "keluar": "2026-11-21T06:00:00.000Z", "kembali": "2026-11-23T09:00:00.000Z", "penjemput": "Bapak Masril (ayah)", "status": "aktif", "oleh": "yudistira", "ts": ts},
  "i2": {"santri": "s002", "jenis": "Keluar", "alasan": "Berobat gigi di klinik", "keluar": "2026-11-21T06:00:00.000Z", "kembali": "2026-11-21T09:00:00.000Z", "penjemput": "Ust. Ugi (pembina asrama)", "status": "aktif", "oleh": "yudistira", "ts": ts + 1},
  "i3": {"santri": "s003", "jenis": "Skorsing", "alasan": "Skorsing 7 hari", "keluar": "2026-11-21T06:00:00.000Z", "kembali": "2026-11-28T09:00:00.000Z", "penjemput": "Wali", "status": "aktif", "bap": "b2", "oleh": "yudistira", "ts": ts + 2}},
 "bap": {
  "b1": {"santri": "s001", "tanggal": "2026-11-21", "tempat": "Kamar 3 Asrama Sultan Hasanudin", "pelanggaran": "p5", "pelanggaranNama": "Membawa HP tanpa izin", "tingkat": "Sedang", "poin": 10,
         "kronologi": "Pada pukul 21.30 santri kedapatan menggunakan telepon genggam di dalam kamar saat jam istirahat. Telepon genggam diserahkan kepada wali asrama sebagai barang bukti.",
         "saksi": "Ust. Ugi (wali asrama)", "sanksi": "HP disita sampai perpulangan dan membuat surat pernyataan.", "foto": FOTO, "tindakan": {"jenis": "sp1"}, "oleh": "yudistira", "ts": ts},
  "b0": {"santri": "s001", "tanggal": "2026-11-02", "tempat": "Masjid", "pelanggaran": "p6", "pelanggaranNama": "Berkata kasar atau mencaci", "tingkat": "Sedang", "poin": 10, "kronologi": "x", "tindakan": {"jenis": "teguran"}, "oleh": "yudistira", "ts": ts - 99999999},
  "b2": {"santri": "s003", "tanggal": "2026-11-21", "tempat": "Belakang dapur", "pelanggaran": "p8", "pelanggaranNama": "Merokok", "tingkat": "Berat", "poin": 30, "kronologi": "Santri kedapatan merokok di belakang dapur pada pukul 16.10.", "saksi": "Ust. Habib", "sanksi": "Membuat surat pernyataan bermaterai.", "tindakan": {"jenis": "skorsing", "hari": 7, "mulai": "2026-11-21"}, "oleh": "yudistira", "ts": ts + 5},
  "b3": {"santri": "s004", "tanggal": "2026-11-21", "tempat": "Asrama", "pelanggaran": "p9", "pelanggaranNama": "Mencuri", "tingkat": "Berat", "poin": 40, "kronologi": "Santri mengambil uang milik temannya.", "saksi": "Ust. Yudhis", "tindakan": {"jenis": "kembali", "mulai": "2026-11-22"}, "oleh": "yudistira", "ts": ts + 6}}}
D["bap"]["b9"] = dict(D["bap"]["b1"], kronologi=("Pada pukul 21.30 santri kedapatan menggunakan telepon genggam di dalam kamar saat jam istirahat. " * 9), ts=ts + 9)
LIST = [["bap", "b9"], ["izin", "i1"], ["izin", "i2"], ["izin", "i3"], ["bap", "b1"], ["pemberitahuan", "b1"], ["sp", "b1"], ["skorsing", "b2"], ["kembali", "b3"]]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--host-resolver-rules=MAP *.googleapis.com 127.0.0.1, MAP www.gstatic.com 127.0.0.1, MAP *.firebaseio.com 127.0.0.1, MAP *.firebaseapp.com 127.0.0.1, MAP firebase.googleapis.com 127.0.0.1"], executable_path="/usr/bin/google-chrome"); pg = await b.new_page()
        await pg.goto("file:///tmp/sg/index.html")
        out = await pg.evaluate("([d,l]) => window.__run(d,l)", [D, LIST])
        sar = {k: await pg.evaluate("([d,s,p]) => window.__saran(d,s,p)", [D, s, pid]) for k, (s, pid) in {"s001_p5(2 BAP 20poin)": ("s001", "p4"), "s050_p5": ("s050", "p5"), "s050_p8": ("s050", "p8"), "s001_p3": ("s001", "p3")}.items()}
        print(json.dumps(sar, ensure_ascii=False))
        for k, h in out.items():
            open(f"/tmp/sg/{k}.html", "w").write(h)
            q = await b.new_page(); await q.goto(f"file:///tmp/sg/{k}.html"); await q.wait_for_timeout(700)
            over = await q.evaluate("[...document.querySelectorAll('.bd')].map(e=>Math.round((e.getBoundingClientRect().bottom - e.parentElement.getBoundingClientRect().top)/96*25.4))")
            await q.pdf(path=f"/tmp/sg/{k}.pdf", format="A4", print_background=True, prefer_css_page_size=True); await q.close()
            print(k, "bottom_mm", over)
        await b.close()
asyncio.run(main())
