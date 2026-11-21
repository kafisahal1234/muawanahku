import asyncio, subprocess, json
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3", "-m", "http.server", "8793", "-d", "/home/claude/webapp/dist"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
U = "http://localhost:8793/index.html"
SEED = {"santriEdit": {"sx1": {"nama": 12345, "kelas": "8", "asrama": ""}, "sx2": {"nama": "Santri Tanpa Asrama", "kelas": "8", "asrama": "a99", "wali": "tanpaasrama"}, "s005": {"hapus": True}, "s060": {"hapus": True}},
 "staffEdit": {"yudistira": {"pondok": ""}},
 "izin": {"iz1": {"santri": "s005", "jenis": "Perpulangan", "alasan": "x", "keluar": "2026-11-20T06:00:00.000Z", "kembali": "2026-11-21T01:00:00.000Z", "status": "aktif", "oleh": "yudistira", "ts": 1},
          "iz2": {"santri": "sx2", "jenis": "Keluar", "alasan": "y", "keluar": "2026-11-21T06:00:00.000Z", "kembali": "2026-11-29T09:00:00.000Z", "status": "aktif", "oleh": "orangbaru", "ts": 2}},
 "bap": {"bp1": {"santri": "s005", "tanggal": "2026-11-20", "pelanggaran": "p5", "pelanggaranNama": "Membawa HP tanpa izin", "tingkat": "Sedang", "poin": 10, "kronologi": "k", "oleh": "yudistira", "ts": 3},
         "bp3": {"santri": "s060", "tanggal": "2026-11-21", "pelanggaran": "p6", "pelanggaranNama": "Berkata kasar", "tingkat": "Sedang", "poin": 10, "kronologi": "k", "oleh": "yudistira", "ts": 5},
         "bp2": {"santri": "sx2", "tanggal": "2026-11-21", "pelanggaran": "p6", "pelanggaranNama": "Berkata kasar", "tingkat": "Sedang", "poin": 10, "kronologi": "k", "oleh": "orangbaru", "ts": 4}}}
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome")
        async def sesi(user, steps):
            ctx = await b.new_context(viewport={"width": 390, "height": 844}); pg = await ctx.new_page()
            pg.on("pageerror", lambda e: errs.append((user, str(e))))
            await pg.goto(U); await pg.evaluate("d=>{localStorage.clear();localStorage.setItem('muawanahku_demo_v1',JSON.stringify(d))}", SEED); await pg.goto(U); await pg.wait_for_timeout(600)
            await pg.fill("input[autocomplete=username]", user); await pg.fill(".pass-in input", user + "123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(900)
            await steps(pg); await ctx.close()
        async def bad(pg, where):
            t = await pg.locator(".note.red").count()
            if t: errs.append((where, await pg.locator(".note.red").first.inner_text()))
        async def yud(pg):
            await bad(pg, "home")
            await pg.locator(".tile:has-text('Kesantrian')").first.click(); await pg.wait_for_timeout(500); await bad(pg, "kesantrian")
            for sub in ["Surat Izin", "Form BAP"]:
                await pg.locator(f".tile:has-text('{sub}')").first.click(); await pg.wait_for_timeout(400)
                await pg.click(".pick"); await pg.wait_for_timeout(300)
                await pg.locator(".sheet input").fill("tanpa"); await pg.wait_for_timeout(200)
                await pg.locator(".sheet .row").first.click(); await pg.wait_for_timeout(300); await bad(pg, sub)
                if sub == "Form BAP":
                    await pg.select_option("select", "p4"); await pg.wait_for_timeout(300); await bad(pg, "bap-pel")
                    await pg.screenshot(path="/tmp/ui/robust_bap.png")
                await pg.go_back(); await pg.wait_for_timeout(300)
            for sub in ["Catat Kembali", "Histori Santri", "Rekap Izin", "Rekap Pelanggaran"]:
                await pg.locator(f".tile:has-text('{sub}')").first.click(); await pg.wait_for_timeout(400); await bad(pg, sub)
                if sub in ("Rekap Izin", "Rekap Pelanggaran"):
                    rows = pg.locator(".card .row"); n = await rows.count()
                    for k in range(min(n, 3)):
                        await rows.nth(k).click(); await pg.wait_for_timeout(400); await bad(pg, sub + f" row{k}")
                        sr = pg.locator(".card:has-text('Surat otomatis') .row, button:has-text('Lihat')")
                        if await sr.count(): await sr.first.click(); await pg.wait_for_timeout(900); await bad(pg, sub + " surat"); await pg.go_back(); await pg.wait_for_timeout(300)
                        await pg.go_back(); await pg.wait_for_timeout(300)
                await pg.go_back(); await pg.wait_for_timeout(300)
            await pg.screenshot(path="/tmp/ui/robust_kes.png")
        await sesi("yudistira", yud)
        async def mudir(pg):
            await bad(pg, "mudir home")
            await pg.locator(".tile:has-text('Kesantrian')").first.click(); await pg.wait_for_timeout(500); await bad(pg, "mudir kesantrian")
            for sub in ["Histori Santri", "Rekap Izin", "Rekap Pelanggaran"]:
                await pg.locator(f".tile:has-text('{sub}')").first.click(); await pg.wait_for_timeout(400); await bad(pg, "mudir " + sub); await pg.go_back(); await pg.wait_for_timeout(300)
        await sesi("syamsul", mudir)
        async def umum(pg):
            await bad(pg, "home")
            tiles = await pg.locator(".tile").all_inner_texts()
            for t in tiles[:12]:
                t1 = t.strip().split("\n")[0]
                if not t1: continue
                await pg.locator(".tile", has_text=t1).first.click(); await pg.wait_for_timeout(450); await bad(pg, "tile " + t1)
                sub = await pg.locator(".tile").all_inner_texts()
                for u in sub[:8]:
                    u1 = u.strip().split("\n")[0]
                    if not u1 or u1 == t1: continue
                    loc = pg.locator(".tile", has_text=u1)
                    if await loc.count():
                        await loc.first.click(); await pg.wait_for_timeout(400); await bad(pg, t1 + " > " + u1); await pg.go_back(); await pg.wait_for_timeout(250)
                await pg.go_back(); await pg.wait_for_timeout(300)
        for u in ["kaafi", "hidayat", "khanza"]: await sesi(u, umum)
        await b.close()
    print("ERRORS:", json.dumps(errs, ensure_ascii=False))
asyncio.run(main()); srv.terminate()
