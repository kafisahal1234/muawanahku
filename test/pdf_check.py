import asyncio, subprocess, json, os
from playwright.async_api import async_playwright
srv = subprocess.Popen(["python3", "-m", "http.server", "8798", "-d", "/home/claude/webapp/dist"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
U = "http://localhost:8798/index.html"; O = "/tmp/pdfout"
async def main():
    errs, got = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome")
        async def sesi(u):
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True); pg = await ctx.new_page()
            pg.on("pageerror", lambda e: errs.append((u, str(e))))
            await pg.goto(U); await pg.evaluate("localStorage.clear()"); await pg.goto(U); await pg.wait_for_timeout(500)
            await pg.fill("input[autocomplete=username]", u); await pg.fill(".pass-in input", u + "123"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(900)
            return ctx, pg
        async def dl(pg, click, nama):
            async with pg.expect_download(timeout=60000) as d:
                await click()
            dd = await d.value; path = f"{O}/{nama}.pdf"; await dd.save_as(path); got.append((nama, dd.suggested_filename, os.path.getsize(path)))
        async def tile(pg, t): await pg.locator(f".tile:has-text(\"{t}\")").first.click(); await pg.wait_for_timeout(600)
        async def yes(pg): await pg.locator(".dialog .btn.primary").last.click(); await pg.wait_for_timeout(900)
        # surat
        ctx, pg = await sesi("yudistira")
        await tile(pg, "Kesantrian"); await tile(pg, "Surat Izin")
        await pg.click(".pick"); await pg.locator(".sheet .row").first.click(); await pg.wait_for_timeout(200)
        await pg.fill("textarea", "Menghadiri pernikahan kakak"); await pg.locator("input[placeholder^='Nama dan hubungan']").fill("Bapak Hasan (ayah)")
        await pg.click("text=Simpan surat izin"); await yes(pg)
        await pg.click("text=Lihat & cetak surat izin"); await pg.wait_for_timeout(1200)
        await dl(pg, lambda: pg.click("text=Unduh PDF"), "surat_izin")
        await pg.go_back(); await pg.wait_for_timeout(500); await pg.go_back(); await pg.wait_for_timeout(500)
        await tile(pg, "Form BAP"); await pg.click(".pick"); await pg.locator(".sheet .row").nth(2).click(); await pg.wait_for_timeout(200)
        await pg.select_option("select >> nth=0", "p8"); await pg.fill("textarea >> nth=0", "Santri kedapatan merokok di belakang dapur pada pukul 16.10, rokok diserahkan ke wali asrama.")
        await pg.click("text=Simpan BAP"); await yes(pg)
        for nm, key in [("bap", "Berita Acara"), ("pemberitahuan", "Pemberitahuan"), ("skorsing", "Skorsing")]:
            await pg.locator(f".card:has-text('Surat otomatis') .row:has-text('{key}')").first.click(); await pg.wait_for_timeout(1000)
            await dl(pg, lambda: pg.click("text=Unduh PDF"), "surat_" + nm); await pg.go_back(); await pg.wait_for_timeout(600)
        await ctx.close()
        # rapor
        ctx, pg = await sesi("kaafi")
        for per, nm in [("semester", "rapor_semester"), ("mid", "rapor_mid")]:
            await pg.goto(U); await pg.wait_for_timeout(700)
            await tile(pg, "Rapor"); await pg.wait_for_timeout(300)
            if per == "mid":
                seg = pg.locator("button:has-text('Tengah')")
                if await seg.count(): await seg.first.click(); await pg.wait_for_timeout(300)
            await pg.locator(".card .row").first.click(); await pg.wait_for_timeout(1000)
            await dl(pg, lambda: pg.click("text=Unduh rapor (PDF)"), nm)
        # rekap
        await pg.goto(U); await pg.wait_for_timeout(700); await tile(pg, "Rekap")
        for tab in ["tahfidz", "pelanggaran"]:
            t = pg.locator(f".seg button:has-text('{tab.capitalize()}')")
            if await t.count(): await t.first.click(); await pg.wait_for_timeout(500)
            await pg.click("text=Unduh rekap ini"); await pg.wait_for_timeout(400)
            await dl(pg, lambda: pg.click("text=Dokumen PDF"), "rekap_" + tab)
        await ctx.close()
        ctx, pg = await sesi("syamsul"); await tile(pg, "Rekap")
        await pg.click("text=Unduh rekap ini"); await pg.wait_for_timeout(400)
        await dl(pg, lambda: pg.click("text=Dokumen PDF"), "rekap_mudir")
        await ctx.close(); await b.close()
    print(json.dumps(got, ensure_ascii=False)); print("ERRORS:", errs)
asyncio.run(main()); srv.terminate()
