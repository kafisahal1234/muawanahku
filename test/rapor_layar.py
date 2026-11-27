# Tangkapan layar rapor (akhir & tengah semester) + unduh PDF & Word → test/out/rapor/
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
from _jalur import URL_DIST, OUT
from _demo import masuk, SEED_KEGIATAN
D = OUT / "rapor"; D.mkdir(exist_ok=True)
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); c = await b.new_context(viewport={"width": 900, "height": 1200}, accept_downloads=True, reduced_motion="reduce")
        pg = await c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL_DIST); await pg.evaluate(SEED_KEGIATAN); await pg.goto(URL_DIST)
        await masuk(pg, "kaafi")
        await pg.click(".tiles >> text=Rapor"); await pg.wait_for_timeout(600)
        await pg.locator(".list .row").first.click(); await pg.wait_for_timeout(1200)
        for nama, seg in [("akhir", "Akhir semester"), ("tengah", "Tengah semester")]:
            await pg.click(f".seg >> text={seg}"); await pg.wait_for_timeout(800)
            await pg.click("text=Perbesar"); await pg.wait_for_timeout(500)
            hal = pg.locator(".rp .rp-page")
            for i in range(await hal.count()): await hal.nth(i).screenshot(path=str(D / f"{nama}_{i+1}.png"))
            await pg.click("text=Muat ke layar"); await pg.wait_for_timeout(300)
            for tombol, ext in [("Unduh PDF", "pdf"), ("Unduh Word", "docx")]:
                try:
                    async with pg.expect_download(timeout=60000) as dl: await pg.click(f"text={tombol}")
                    await (await dl.value).save_as(str(D / f"rapor_{nama}.{ext}"))
                except Exception as e: errs.append(f"{tombol} {nama}: {e}")
                await pg.wait_for_timeout(500)
        print("ERR", errs); await b.close()
asyncio.run(main())
